// Enhanced Cloudinary Upload Service with Progress Tracking
// Implements two-step upload: Cloudinary first, then MongoDB save

interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

interface CloudinaryUploadResult {
  url: string;
  publicId: string;
  secureUrl: string;
  bytes: number;
  resourceType: string;
}

interface UploadConfig {
  file: File;
  onProgress?: (progress: UploadProgress) => void;
  timeout?: number;
  retries?: number;
}

class CloudinaryUploadService {
  private cloudName: string;
  private uploadPreset: string;
  private timeout: number;

  constructor() {
    this.cloudName = process.env.REACT_APP_CLOUDINARY_CLOUD_NAME || '';
    this.uploadPreset = process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET || '';
    this.timeout = 300000; // 5 minutes default timeout
    
    // Log configuration for debugging
    console.log('[CloudinaryUpload] Configuration:', {
      cloudName: this.cloudName ? 'SET' : 'MISSING',
      uploadPreset: this.uploadPreset ? 'SET' : 'MISSING',
      timeout: this.timeout
    });
  }

  /**
   * Upload file to Cloudinary with progress tracking
   */
  async uploadFile(config: UploadConfig): Promise<CloudinaryUploadResult> {
    const { file, onProgress, timeout = this.timeout, retries = 3 } = config;

    // Validate configuration before upload
    if (!this.cloudName) {
      throw new Error('Cloudinary cloud name is not configured. Please set REACT_APP_CLOUDINARY_CLOUD_NAME environment variable.');
    }
    if (!this.uploadPreset) {
      throw new Error('Cloudinary upload preset is not configured. Please set REACT_APP_CLOUDINARY_UPLOAD_PRESET environment variable.');
    }

    console.log('[CloudinaryUpload] Starting upload:', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      timeout: timeout,
      retries: retries
    });

    return new Promise((resolve, reject) => {
      let attempt = 0;
      
      const attemptUpload = () => {
        attempt++;
        
        const xhr = new XMLHttpRequest();
        const formData = new FormData();
        
        // Set timeout
        xhr.timeout = timeout;

        // Add file and upload preset
        formData.append('file', file);
        formData.append('upload_preset', this.uploadPreset);

        // Progress tracking
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable && onProgress) {
            const percentage = Math.round((e.loaded / e.total) * 100);
            onProgress({
              loaded: e.loaded,
              total: e.total,
              percentage
            });
          }
        };

        // Success handler
        xhr.onload = () => {
          console.log('[CloudinaryUpload] Upload response:', {
            status: xhr.status,
            statusText: xhr.statusText,
            responseLength: xhr.responseText.length
          });
          
          if (xhr.status === 200) {
            try {
              const response = JSON.parse(xhr.responseText);
              console.log('[CloudinaryUpload] Upload successful:', {
                publicId: response.public_id,
                url: response.secure_url,
                bytes: response.bytes
              });
              resolve({
                url: response.url,
                publicId: response.public_id,
                secureUrl: response.secure_url,
                bytes: response.bytes,
                resourceType: response.resource_type
              });
            } catch (parseError) {
              console.error('[CloudinaryUpload] Failed to parse response:', xhr.responseText);
              reject(new Error('Failed to parse Cloudinary response'));
            }
          } else {
            const error = new Error(`Cloudinary upload failed: ${xhr.statusText} (${xhr.status})`);
            console.error('[CloudinaryUpload] Upload failed:', {
              status: xhr.status,
              statusText: xhr.statusText,
              response: xhr.responseText
            });
            if (attempt < retries) {
              console.warn(`Upload attempt ${attempt} failed, retrying...`);
              setTimeout(attemptUpload, 1000 * attempt); // Exponential backoff
            } else {
              reject(error);
            }
          }
        };

        // Error handlers
        xhr.onerror = () => {
          const error = new Error('Network error during upload');
          if (attempt < retries) {
            console.warn(`Upload attempt ${attempt} failed, retrying...`);
            setTimeout(attemptUpload, 1000 * attempt);
          } else {
            reject(error);
          }
        };

        xhr.ontimeout = () => {
          const error = new Error('Upload timeout - file too large or network slow');
          if (attempt < retries) {
            console.warn(`Upload attempt ${attempt} timed out, retrying...`);
            setTimeout(attemptUpload, 1000 * attempt);
          } else {
            reject(error);
          }
        };

        // Start upload
        xhr.open('POST', `https://api.cloudinary.com/v1_1/${this.cloudName}/auto/upload`);
        xhr.send(formData);
      };

      attemptUpload();
    });
  }

  /**
   * Clean up Cloudinary file if needed
   */
  async cleanupFile(publicId: string, resourceType: string = 'auto'): Promise<boolean> {
    try {
      const response = await fetch('/api/cloudinary/cleanup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          publicId,
          resourceType
        })
      });

      return response.ok;
    } catch (error) {
      console.error('Cleanup failed:', error);
      return false;
    }
  }

  /**
   * Validate file before upload
   */
  validateFile(file: File): { isValid: boolean; error?: string } {
    // Check file size (15MB limit)
    const maxSize = 15 * 1024 * 1024;
    if (file.size > maxSize) {
      return {
        isValid: false,
        error: `File too large. Maximum size is 15MB. Current size: ${(file.size / (1024 * 1024)).toFixed(2)}MB`
      };
    }

    // Check file type
    const allowedTypes = [
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
    ];

    if (!allowedTypes.includes(file.type)) {
      return {
        isValid: false,
        error: 'Invalid file type. Only PDF, images, documents, videos, and audio files are allowed.'
      };
    }

    return { isValid: true };
  }
}

export const cloudinaryUploadService = new CloudinaryUploadService();