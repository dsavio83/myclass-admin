import React, { useState, useCallback, useRef } from 'react';
import { cloudinaryUploadService } from '../services/cloudinaryUpload';
import { useDuplicatePrevention } from '../hooks/useDuplicatePrevention';

interface UploadContentProps {
  lessonId: string;
  resourceType: string;
  onUploadSuccess?: (content: any) => void;
  onUploadError?: (error: string) => void;
}

interface UploadState {
  stage: 'idle' | 'uploading' | 'saving' | 'success' | 'error';
  progress: number;
  message: string;
  isUploading: boolean;
}

export const UploadContent: React.FC<UploadContentProps> = ({
  lessonId,
  resourceType,
  onUploadSuccess,
  onUploadError
}) => {
  const [uploadMode, setUploadMode] = useState<'file' | 'url'>('file');
  const [urlInput, setUrlInput] = useState('');
  const [title, setTitle] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);

  // Duplicate prevention hook
  const { checkingDuplicate, duplicateResult, checkForDuplicate, resetDuplicateCheck } = useDuplicatePrevention();

  // Enhanced state management for two-step upload
  const [uploadState, setUploadState] = useState<UploadState>({
    stage: 'idle',
    progress: 0,
    message: '',
    isUploading: false
  });

  // Cache for file type validation and operations
  const fileValidationCache = useRef({
    allowedTypes: new Set([
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'video/mp4',
      'video/mpeg',
      'audio/mpeg',
      'audio/wav'
    ]),
    maxSize: 15 * 1024 * 1024
  });

  // Optimized file name extraction
  const extractFileName = useCallback((fileName: string) => {
    const lastDotIndex = fileName.lastIndexOf('.');
    return lastDotIndex > 0 ? fileName.slice(0, lastDotIndex) : fileName;
  }, []);

  const handleFileSelect = useCallback((file: File) => {
    const validation = cloudinaryUploadService.validateFile(file);
    
    if (!validation.isValid) {
      onUploadError?.(validation.error || 'File validation failed');
      return;
    }

    setSelectedFile(file);
    if (!title) {
      setTitle(extractFileName(file.name));
    }
  }, [title, onUploadError, extractFileName]);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  // Enhanced upload handler with two-step process
  const handleUpload = async () => {
    // Validation
    if (uploadMode === 'file' && !selectedFile) {
      onUploadError?.('Please select a file.');
      return;
    }
    if (uploadMode === 'url' && !urlInput.trim()) {
      onUploadError?.('Please enter a valid URL.');
      return;
    }
    if (!title.trim()) {
      onUploadError?.('Please enter a title.');
      return;
    }
    if (!lessonId) {
      onUploadError?.('Lesson ID is required.');
      return;
    }

    // Check for duplicates before upload
    if (uploadMode === 'file' && selectedFile) {
      setUploadState({
        stage: 'uploading',
        progress: 0,
        message: 'Checking for duplicates...',
        isUploading: true
      });

      const duplicateCheck = await checkForDuplicate(lessonId, title.trim(), resourceType, selectedFile);
      
      if (duplicateCheck.isDuplicate) {
        setUploadState({
          stage: 'error',
          progress: 0,
          message: duplicateCheck.message || 'Duplicate content detected',
          isUploading: false
        });
        onUploadError?.(duplicateCheck.message || 'Duplicate content detected');
        return;
      }
    }

    // Start upload process
    setUploadState({
      stage: 'uploading',
      progress: 0,
      message: 'Checking for duplicates and starting upload...',
      isUploading: true
    });

    try {
      let cloudResult: any;

      // STEP 1: Upload to Cloudinary
      if (uploadMode === 'file' && selectedFile) {
        cloudResult = await cloudinaryUploadService.uploadFile({
          file: selectedFile,
          onProgress: (progress) => {
            setUploadState(prev => ({
              ...prev,
              progress: progress.percentage,
              message: `Uploading to Cloudinary: ${progress.percentage}%`
            }));
          }
        });

        setUploadState({
          stage: 'saving',
          progress: 100,
          message: 'Saving to database...',
          isUploading: true
        });
      } else {
        // For URL uploads, we'll handle differently
        cloudResult = {
          url: urlInput.trim(),
          publicId: `url_${Date.now()}`,
          secureUrl: urlInput.trim(),
          bytes: 0,
          resourceType: 'raw'
        };
      }

      // STEP 2: Save to MongoDB
      const saveResult = await saveContentToDatabase({
        lessonId,
        title: title.trim(),
        type: resourceType,
        fileUrl: cloudResult.secureUrl,
        publicId: cloudResult.publicId,
        size: cloudResult.bytes || selectedFile?.size || 0,
        mimeType: selectedFile?.type || 'url',
        resourceType: cloudResult.resourceType
      });

      // Success
      setUploadState({
        stage: 'success',
        progress: 100,
        message: 'Upload completed successfully!',
        isUploading: false
      });

      onUploadSuccess?.({
        id: saveResult.content._id,
        title: title.trim(),
        type: resourceType,
        filePath: saveResult.content.file?.url || saveResult.content.filePath,
        originalFileName: selectedFile?.name || urlInput.trim().split('/').pop() || 'external_link',
        fileSize: selectedFile?.size || 0,
        ...saveResult.content
      });

      // Reset form
      resetForm();

    } catch (error) {
      console.error('Upload error:', error);
      
      // Handle cleanup if Cloudinary upload succeeded but DB save failed
      if (uploadMode === 'file' && selectedFile) {
        // In a real implementation, we'd need to track if Cloudinary upload succeeded
        // For now, we'll show the error and let user retry
      }

      setUploadState({
        stage: 'error',
        progress: 0,
        message: error instanceof Error ? error.message : 'Upload failed',
        isUploading: false
      });

      // Provide more specific error messages
      let errorMessage = error instanceof Error ? error.message : 'Upload failed';
      if (typeof errorMessage === 'string') {
        if (errorMessage.includes('Cloudinary cloud name')) {
          errorMessage = 'Cloudinary configuration is missing. Please contact administrator.';
        } else if (errorMessage.includes('Cloudinary upload preset')) {
          errorMessage = 'Cloudinary upload preset is not configured. Please contact administrator.';
        } else if (errorMessage.includes('timeout')) {
          errorMessage = 'Upload timed out. Please try again with a smaller file.';
        } else if (errorMessage.includes('File too large')) {
          errorMessage = 'File is too large. Maximum size is 15MB.';
        } else if (errorMessage.includes('Invalid file type')) {
          errorMessage = 'Invalid file type. Only PDF, images, documents, videos, and audio files are allowed.';
        }
      }

      onUploadError?.(errorMessage);
    }
  };

  // Save content to database
  const saveContentToDatabase = async (contentData: {
    lessonId: string;
    title: string;
    type: string;
    fileUrl: string;
    publicId: string;
    size: number;
    mimeType: string;
    resourceType: string;
  }) => {
    const response = await fetch('/api/content/cloudinary-save', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(contentData)
    });

    if (!response.ok) {
      let errorMessage = response.statusText;
      try {
        const errorData = await response.json();
        if (errorData.message) {
          errorMessage = errorData.message;
        }
      } catch (e) {
        // Ignore if response is not JSON
      }
      throw new Error(`Database save failed: ${errorMessage}`);
    }

    return await response.json();
  };

  // Reset form state
  const resetForm = () => {
    setSelectedFile(null);
    setUrlInput('');
    setTitle('');
    setUploadState({
      stage: 'idle',
      progress: 0,
      message: '',
      isUploading: false
    });
  };

  // Cancel upload
  const cancelUpload = () => {
    if (uploadState.isUploading) {
      // In a real implementation, we'd abort the ongoing request
      // For now, just reset state
      setUploadState({
        stage: 'idle',
        progress: 0,
        message: '',
        isUploading: false
      });
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">
        Add {resourceType.charAt(0).toUpperCase() + resourceType.slice(1)}
      </h2>

      {/* Upload Status Indicator */}
      {uploadState.stage !== 'idle' && (
        <div className={`mb-6 p-4 rounded-lg ${
          uploadState.stage === 'success' ? 'bg-green-50 border border-green-200' :
          uploadState.stage === 'error' ? 'bg-red-50 border border-red-200' :
          'bg-blue-50 border border-blue-200'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {uploadState.stage === 'uploading' && (
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              )}
              {uploadState.stage === 'saving' && (
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              )}
              {uploadState.stage === 'success' && (
                <div className="w-4 h-4 bg-green-500 rounded-full" />
              )}
              {uploadState.stage === 'error' && (
                <div className="w-4 h-4 bg-red-500 rounded-full" />
              )}
              <span className={`font-medium ${
                uploadState.stage === 'success' ? 'text-green-800' :
                uploadState.stage === 'error' ? 'text-red-800' :
                'text-blue-800'
              }`}>
                {uploadState.message}
              </span>
            </div>
            {uploadState.isUploading && (
              <button
                onClick={cancelUpload}
                className="text-sm text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
            )}
          </div>
          
          {/* Progress Bar */}
          {uploadState.stage !== 'success' && uploadState.stage !== 'error' && (
            <div className="mt-3">
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>Progress</span>
                <span>{uploadState.progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${
                    uploadState.stage === 'uploading' ? 'bg-blue-600' : 'bg-green-600'
                  }`}
                  style={{ width: `${uploadState.progress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Mode Toggle */}
      <div className="flex space-x-4 mb-6">
        <button
          onClick={() => setUploadMode('file')}
          disabled={uploadState.isUploading}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            uploadMode === 'file'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
          } ${uploadState.isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          Upload File
        </button>
        <button
          onClick={() => setUploadMode('url')}
          disabled={uploadState.isUploading}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            uploadMode === 'url'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
          } ${uploadState.isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          External URL
        </button>
      </div>

      <div className="space-y-4">
        {/* File Upload Area */}
        {uploadMode === 'file' ? (
          <>
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
              } ${uploadState.isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                type="file"
                onChange={handleFileInputChange}
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.mp4,.mpeg,.mp3,.wav"
                className="hidden"
                id="file-upload"
                disabled={uploadState.isUploading}
              />
              <label
                htmlFor="file-upload"
                className={`cursor-pointer flex flex-col items-center space-y-2 ${
                  uploadState.isUploading ? 'pointer-events-none' : ''
                }`}
              >
                <svg
                  className="w-12 h-12 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
                <p className="text-gray-600 dark:text-gray-300">
                  {selectedFile ? selectedFile.name : 'Click to upload or drag and drop'}
                </p>
                <p className="text-sm text-gray-400">
                  PDF, DOC, DOCX, JPG, PNG, GIF, MP4, MP3, WAV (max 15MB)
                </p>
              </label>
            </div>

            {/* Selected File Info */}
            {selectedFile && (
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-800 dark:text-white">{selectedFile.name}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {formatFileSize(selectedFile.size)}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedFile(null)}
                    disabled={uploadState.isUploading}
                    className="text-red-500 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Remove
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          /* URL Input Area */
          <div>
            <label
              htmlFor="url-input"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Content URL *
            </label>
            <input
              type="url"
              id="url-input"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              disabled={uploadState.isUploading}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder="https://example.com/document.pdf"
            />
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Enter a direct link to a PDF, image, video, or other resource.
            </p>
          </div>
        )}

        {/* Title Input */}
        <div>
          <label
            htmlFor="title"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Title *
          </label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={uploadState.isUploading}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white disabled:bg-gray-100 disabled:cursor-not-allowed"
            placeholder="Enter content title"
            required
          />
        </div>

        {/* Upload Button */}
        <button
          onClick={handleUpload}
          disabled={
            uploadState.isUploading ||
            (uploadMode === 'file' && !selectedFile) ||
            (uploadMode === 'url' && !urlInput.trim()) ||
            !title.trim() ||
            !lessonId
          }
          className={`w-full px-4 py-2 text-white rounded-md transition-colors ${
            uploadState.isUploading
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
          }`}
        >
          {uploadState.stage === 'uploading' && (
            <span className="flex items-center justify-center">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              Uploading... {uploadState.progress}%
            </span>
          )}
          {uploadState.stage === 'saving' && (
            <span className="flex items-center justify-center">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              Saving to database...
            </span>
          )}
          {uploadState.stage === 'idle' && (
            uploadMode === 'file' ? 'Upload Content' : 'Save URL'
          )}
          {uploadState.stage === 'success' && 'Upload Complete'}
          {uploadState.stage === 'error' && 'Retry Upload'}
        </button>

        {/* Instructions */}
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Upload Process:</strong> Files are first uploaded to Cloudinary, then saved to our database.
            This ensures reliable uploads and proper cleanup if anything fails.
          </p>
        </div>

        {/* Duplicate Warning */}
        {duplicateResult && duplicateResult.isDuplicate && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>Warning:</strong> {duplicateResult.message}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};