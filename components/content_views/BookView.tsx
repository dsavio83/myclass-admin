import React, { useState, useEffect, useRef } from 'react';
import { Content, User } from '../../types';
import { useApi } from '../../hooks/useApi';
import * as api from '../../services/api';
import { BookIcon } from '../icons/ResourceTypeIcons';
import { TrashIcon, UploadCloudIcon, ExpandIcon, XIcon, SaveIcon, LinkIcon, CheckCircleIcon, EyeIcon } from '../icons/AdminIcons';
import { PublishToggle } from '../common/PublishToggle';
import { UnpublishedContentMessage } from '../common/UnpublishedContentMessage';
import { ContentStatusBanner } from '../common/ContentStatusBanner';
import { ConfirmModal } from '../ConfirmModal';
import { PdfViewer } from './PdfViewer';
import { useToast } from '../../context/ToastContext';
import { formatCount } from '../../utils/formatUtils';
import { useContentUpdate } from '../../context/ContentUpdateContext';

interface BookViewProps {
    lessonId: string;
    user: User;
}

// Utility to convert Base64 to Blob URL for faster PDF rendering (Legacy support)
const useBase64ToBlobUrl = (base64String: string | undefined) => {
    const [blobUrl, setBlobUrl] = useState<string | null>(null);

    useEffect(() => {
        if (!base64String || !base64String.startsWith('data:application/pdf')) {
            setBlobUrl(null);
            return;
        }

        let url: string | null = null;
        const timer = setTimeout(() => {
            try {
                const parts = base64String.split(',');
                const base64 = parts[1];
                const binaryStr = atob(base64);
                const len = binaryStr.length;
                const bytes = new Uint8Array(len);
                for (let i = 0; i < len; i++) {
                    bytes[i] = binaryStr.charCodeAt(i);
                }
                const blob = new Blob([bytes], { type: 'application/pdf' });
                url = URL.createObjectURL(blob);
                setBlobUrl(url);
            } catch (e) {
                setBlobUrl(base64String);
            }
        }, 0);

        return () => {
            clearTimeout(timer);
            if (url) URL.revokeObjectURL(url);
        };
    }, [base64String]);

    return blobUrl;
};

const SavedBookViewer: React.FC<{ content: Content; onRemove: () => void; isAdmin: boolean; onExpand: (url: string) => void; onTogglePublish?: () => void; }> = ({ content, onRemove, isAdmin, onExpand, onTogglePublish }) => {
    // Determine source: prefer valid URL, fallback to body (legacy base64 or URL)
    const fileUrl = content.file?.url;
    // Check if body is base64
    const bodyUrl = content.body || '';
    const isBase64 = bodyUrl.startsWith('data:application/pdf');
    const blobUrl = useBase64ToBlobUrl(isBase64 ? bodyUrl : undefined);

    // Increment view count on mount
    React.useEffect(() => {
        // View count increment removed
    }, [content._id]);

    // Final display URL
    let displayUrl = fileUrl || (isBase64 ? blobUrl : bodyUrl);

    // If using an external link (not Cloudinary, not Base64, not local), route via proxy to avoid CORS
    if (displayUrl && displayUrl.startsWith('http') &&
        !displayUrl.includes('cloudinary.com') &&
        !displayUrl.includes(window.location.hostname)) {

        // Use the API base from env or default
        const API_BASE = (import.meta as any).env.VITE_API_URL || 'http://localhost:5001';
        displayUrl = `${API_BASE}/api/proxy/pdf?url=${encodeURIComponent(displayUrl)}`;
    }

    // Responsive initial scale
    const [isMobile, setIsMobile] = React.useState(false);
    React.useEffect(() => {
        const checkMobile = () => { setIsMobile(window.innerWidth < 768); };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);
    const initialScale = isMobile ? 0.65 : 1.5;

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-2 relative h-full flex flex-col">
            <div className="absolute top-4 right-4 flex gap-2 z-20">
                <button onClick={() => displayUrl && onExpand(displayUrl)} className={`${isMobile ? 'p-3' : 'p-2'} rounded-full bg-white/50 dark:bg-black/50 hover:bg-white/80 dark:hover:bg-black/80 backdrop-blur-sm shadow-md`} title="View Fullscreen">
                    <ExpandIcon className={`${isMobile ? 'w-6 h-6' : 'w-5 h-5'} text-gray-600 dark:text-gray-300`} />
                </button>
                {isAdmin && onTogglePublish && (
                    <div className="" onClick={e => e.stopPropagation()}>
                        <PublishToggle
                            isPublished={!!content.isPublished}
                            onToggle={onTogglePublish}
                        />
                    </div>
                )}
                {isAdmin && (
                    <button onClick={onRemove} className={`${isMobile ? 'p-3' : 'p-2'} rounded-full bg-white/50 dark:bg-black/50 hover:bg-white/80 dark:hover:bg-black/80 backdrop-blur-sm shadow-md`} title="Remove Book">
                        <TrashIcon className={`${isMobile ? 'w-6 h-6' : 'w-5 h-5'} text-gray-600 dark:text-gray-300`} />
                    </button>
                )}
            </div>

            <h2 className="text-lg font-semibold mb-4 pr-24 shrink-0 text-gray-800 dark:text-white truncate" title={content.title}>{content.title}</h2>

            <div className="flex-1 overflow-hidden rounded border dark:border-gray-700 bg-gray-100 dark:bg-gray-900 relative">
                {displayUrl ? (
                    <PdfViewer
                        url={displayUrl}
                        initialScale={initialScale}
                    />
                ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                        Preparing PDF...
                    </div>
                )}
            </div>
        </div>
    );
};

const UploadForm: React.FC<{ lessonId: string; onUpload: () => void; onExpand: (url: string) => void; }> = ({ lessonId, onUpload, onExpand }) => {
    const [activeTab, setActiveTab] = useState<'upload' | 'link'>('upload');
    const [file, setFile] = useState<File | null>(null);
    const [title, setTitle] = useState('');
    const [folderPath, setFolderPath] = useState('');
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isUploading, setIsUploading] = useState(false); // Cloudinary upload state
    const [uploadedUrl, setUploadedUrl] = useState<string | null>(null); // Cloudinary URL after upload
    const [isSaving, setIsSaving] = useState(false); // MongoDB save state
    const [linkUrl, setLinkUrl] = useState(''); // For Link tab

    const { showToast } = useToast();
    const [isMobile, setIsMobile] = React.useState(false);

    useEffect(() => {
        const checkMobile = () => { setIsMobile(window.innerWidth < 768); };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Optimized Title & Path Logic
    useEffect(() => {
        const fetchDefaults = async () => {
            // Basic default
            setTitle('New Book');
            setFolderPath('Default/Book');

            try {
                // Try hierarchy for accurate naming
                const hierarchy = await api.getHierarchy(lessonId);

                if (hierarchy) {
                    const { className, subjectName, unitName, subUnitName, lessonName } = hierarchy;

                    // Helper to extract numbers
                    const extractNum = (str: string) => {
                        if (!str) return '0';
                        const match = str.match(/\d+/);
                        return match ? match[0] : '0';
                    };

                    const unitNum = extractNum(unitName);
                    const subUnitNum = extractNum(subUnitName);
                    const lessonNum = extractNum(lessonName);

                    // Required Format: Unit.SubUnit.Lesson.pdf
                    // Example: 4.2.3.pdf
                    const formattedTitle = `${unitNum}.${subUnitNum}.${lessonNum}.pdf`;

                    // Folder Path
                    const cleanPart = (str: string) => str.replace(/[^a-zA-Z0-9]/g, '');
                    const hierarchyParts = [
                        cleanPart(className),
                        cleanPart(subjectName),
                        cleanPart(unitName),
                        subUnitName ? cleanPart(subUnitName) : '',
                        cleanPart(lessonName)
                    ].filter(p => p);

                    const hierarchyPath = hierarchyParts.join('/');

                    setTitle(formattedTitle);
                    setFolderPath(`${hierarchyPath}/Books`);
                }
            } catch (e) {
                console.log('Error fetching defaults', e);
            }
        };
        if (lessonId) fetchDefaults();
    }, [lessonId]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            if (selectedFile.type === "application/pdf") {
                setFile(selectedFile);
                setUploadedUrl(null); // Reset upload state on new file
                setUploadProgress(0);
            } else {
                showToast("Please select a valid PDF file.", 'error');
                setFile(null);
            }
        }
    };

    // Step 1: Upload to Cloudinary with Smoother Progress
    const handleUploadToCloud = async () => {
        if (!file || !lessonId) return;

        setIsUploading(true);
        setUploadProgress(0);
        setUploadedUrl(null);

        // Refs for tracking actual state to decouple from React renders
        let actualProgress = 0;
        let isXhrDone = false;
        let xhrResponse: any = null;
        let xhrStatus = 0;

        const formData = new FormData();
        formData.append('file', file);
        formData.append('lessonId', lessonId);
        formData.append('type', 'book');
        formData.append('title', title);

        let cleanFolder = folderPath.replace(/^(\.\.\/)?uploads\//, '');
        formData.append('folder', cleanFolder);

        const xhr = new XMLHttpRequest();

        // Animation Loop
        const progressInterval = setInterval(() => {
            setUploadProgress(prev => {
                // If we are significantly behind actual progress, catch up smoothly
                // but if actual is 100, we still want to move incrementally
                let step = 5;

                // If actual is completed, we can accelerate slightly but still keep it visible
                if (isXhrDone) step = 10;

                const nextProgress = prev + step;

                // Don't exceed actual progress (unless actual is smaller, which shouldn't happen usually)
                // But for "fast" uploads, actual jumps to 100. So we effectively animate to 100.
                const ceiling = isXhrDone ? 100 : (actualProgress > 0 ? actualProgress : 5); // Fake at least 5% start

                if (nextProgress >= 100 && isXhrDone) {
                    clearInterval(progressInterval);

                    // Finalize upload (Success or Fail)
                    if (xhrStatus >= 200 && xhrStatus < 300) {
                        try {
                            const result = typeof xhrResponse === 'string' ? JSON.parse(xhrResponse) : xhrResponse;
                            const url = result.file?.url || result.secure_url || result.url;
                            setUploadedUrl(url);
                            showToast('Book uploaded and saved successfully!', 'success');
                            onUpload();
                        } catch (e) {
                            showToast('Upload succeeded but response was invalid.', 'warning');
                        }
                    } else {
                        try {
                            const errorResponse = typeof xhrResponse === 'string' ? JSON.parse(xhrResponse) : {};
                            showToast(`Upload failed: ${errorResponse.message || 'Unknown error'}`, 'error');
                        } catch (e) {
                            showToast(`Upload failed.`, 'error');
                        }
                    }
                    setIsUploading(false);
                    return 100;
                }

                // Cap at ceiling (which is actualProgress)
                // If nextProgress (prev+step) > ceiling, just go to ceiling
                return Math.min(nextProgress, ceiling);
            });
        }, 100); // Update every 100ms ~ 10fps for smooth enough look

        xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
                // Just update the target, don't set state directly
                actualProgress = Math.round((e.loaded / e.total) * 100);
            }
        });

        xhr.addEventListener('load', () => {
            isXhrDone = true;
            xhrStatus = xhr.status;
            xhrResponse = xhr.responseText;
            actualProgress = 100; // Ensure target is 100
        });

        xhr.addEventListener('error', () => {
            clearInterval(progressInterval);
            showToast('Network error during upload.', 'error');
            setIsUploading(false);
        });

        xhr.open('POST', '/api/upload');
        xhr.send(formData);
    };

    // Handle Save for the Link Tab
    const handleSaveLink = async () => {
        if (!linkUrl || !title) return;
        setIsSaving(true);
        try {
            await api.addContent({
                title,
                body: linkUrl, // Use body for URL
                lessonId,
                type: 'book',
                metadata: { category: 'External', subCategory: 'Link' } as any
            });
            showToast('Book link saved successfully!', 'success');
            onUpload();
        } catch (e) {
            showToast('Failed to save link.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="w-full max-w-4xl mx-auto bg-white dark:bg-gray-800/50 p-6 sm:p-8 rounded-lg shadow-md h-full flex flex-col overflow-hidden">
            <h3 className="text-lg font-bold text-center mb-6 text-gray-800 dark:text-white shrink-0">Add New Book</h3>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6 shrink-0">
                <button
                    onClick={() => setActiveTab('upload')}
                    className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'upload'
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}
                >
                    PDF Upload
                </button>
                <button
                    onClick={() => setActiveTab('link')}
                    className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'link'
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}
                >
                    Direct Link
                </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-2">
                <div className="space-y-6">
                    {/* Common Title Input */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Book Title</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    {activeTab === 'upload' && (
                        <div className="space-y-6 animate-fade-in">
                            {!uploadedUrl ? (
                                <>
                                    {/* File Input */}
                                    <div className="mt-1 flex items-center justify-center px-6 pt-10 pb-10 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                        <div className="space-y-2 text-center">
                                            <UploadCloudIcon className="mx-auto h-12 w-12 text-gray-400" />
                                            <div className="flex text-sm text-gray-600 dark:text-gray-400 justify-center">
                                                <label htmlFor="pdfFile" className="relative cursor-pointer rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none">
                                                    <span>Select PDF File</span>
                                                    <input id="pdfFile" name="pdfFile" type="file" className="sr-only" onChange={handleFileChange} accept=".pdf" />
                                                </label>
                                            </div>
                                            <p className="text-xs text-gray-500 dark:text-gray-500">{file ? file.name : 'PDF up to 10MB'}</p>
                                        </div>
                                    </div>

                                    {/* Upload Button & Progress */}
                                    {file && (
                                        <div className="space-y-4">
                                            {isUploading ? (
                                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden relative">
                                                    <div
                                                        className={`h-4 rounded-full transition-all duration-300 relative overflow-hidden ${uploadProgress === 100 ? 'bg-green-500' : 'bg-blue-600'}`}
                                                        style={{ width: `${uploadProgress === 100 ? 100 : uploadProgress}%` }}
                                                    >
                                                        <div className="absolute inset-0 bg-white/30 animate-[shimmer_2s_infinite]"></div>
                                                    </div>
                                                    <div className="text-center mt-2 flex items-center justify-center gap-2">
                                                        {uploadProgress === 100 ? (
                                                            <>
                                                                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                                                <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">Processing on Server (Please wait)...</p>
                                                            </>
                                                        ) : (
                                                            <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">{uploadProgress}% Uploading...</p>
                                                        )}
                                                    </div>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={handleUploadToCloud}
                                                    className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all"
                                                >
                                                    Upload & Save
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="text-center space-y-4 py-6 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                                    <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 dark:bg-green-900">
                                        <CheckCircleIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
                                    </div>
                                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">Upload Complete!</h3>
                                    <div className="px-4">
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Cloudinary URL:</p>
                                        <div className="flex items-center gap-2 bg-white dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-700">
                                            <input
                                                readOnly
                                                value={uploadedUrl}
                                                className="flex-1 text-xs text-gray-600 dark:text-gray-300 bg-transparent border-none focus:ring-0 truncate"
                                            />
                                            <a href={uploadedUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-500">
                                                <LinkIcon className="w-4 h-4" />
                                            </a>
                                        </div>
                                    </div>
                                    <button
                                        onClick={onUpload}
                                        className="mt-4 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors"
                                    >
                                        Done & View Book
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'link' && (
                        <div className="space-y-6 animate-fade-in">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">PDF URL</label>
                                <input
                                    type="url"
                                    value={linkUrl}
                                    onChange={(e) => setLinkUrl(e.target.value)}
                                    placeholder="https://example.com/file.pdf"
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                />
                                <p className="mt-1 text-xs text-gray-500">Paste a direct link to a PDF file.</p>
                            </div>
                            <button
                                onClick={handleSaveLink}
                                disabled={isSaving || !linkUrl}
                                className="w-full py-3 px-4 bg-gray-800 dark:bg-gray-700 text-white rounded-lg font-semibold shadow hover:bg-gray-700 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                {isSaving ? 'Saving...' : 'Save Link'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export const BookView: React.FC<BookViewProps> = ({ lessonId, user }) => {
    const [version, setVersion] = useState(0);
    const { triggerContentUpdate } = useContentUpdate();

    const { data: groupedContent, isLoading } = useApi(
        () => api.getContentsByLessonId(lessonId, ['book'], (user.role !== 'admin' && !user.canEdit)),
        [lessonId, version, user]
    );

    const [confirmModalState, setConfirmModalState] = useState<{ isOpen: boolean; onConfirm: (() => void) | null }>({ isOpen: false, onConfirm: null });
    const [fullscreenPdfUrl, setFullscreenPdfUrl] = useState<string | null>(null);
    const [stats, setStats] = useState<{ count: number } | null>(null);
    const { showToast } = useToast();

    useEffect(() => {
        const updateStats = async () => {
            // Removed view increment calling
        };
        updateStats();
    }, [lessonId]);

    const bookContent = groupedContent?.[0]?.docs[0];
    const canEdit = user.role === 'admin' || !!user.canEdit;

    const handleDelete = (contentId: string) => {
        const confirmAction = async () => {
            await api.deleteContent(contentId);
            setVersion(v => v + 1);
            triggerContentUpdate(); // Update sidebar counts
            showToast('Book deleted successfully.', 'success');
            setConfirmModalState({ isOpen: false, onConfirm: null });
        };
        setConfirmModalState({ isOpen: true, onConfirm: confirmAction });
    };

    const handleTogglePublish = async () => {
        if (!bookContent) return;
        try {
            const newStatus = !bookContent.isPublished;
            await api.updateContent(bookContent._id, { isPublished: newStatus });
            setVersion(v => v + 1);
            triggerContentUpdate(); // Update sidebar counts
            showToast(`Book ${newStatus ? 'published' : 'unpublished'} successfully`, 'success');
        } catch (error) {
            console.error('Failed to toggle publish status:', error);
            showToast('Failed to update publish status', 'error');
        }
    };

    return (
        <div className="h-full overflow-hidden flex flex-col relative">
            {/* Content Status Banner */}
            {bookContent && canEdit && (
                <ContentStatusBanner isPublished={!!bookContent.isPublished} />
            )}

            <div className="p-4 sm:p-6 lg:p-8 flex-1 overflow-hidden flex flex-col min-h-0">
                <div className="hidden sm:flex justify-between items-center mb-6 shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-3">
                            <BookIcon className="w-8 h-8 text-blue-600" />
                            <h1 className="text-lg sm:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-blue-600 dark:from-white dark:to-blue-400">Book</h1>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-hidden min-h-0 flex flex-col">
                    {isLoading && <div className="text-center py-10">Loading book...</div>}

                    {!isLoading && bookContent && (
                        <>
                            {!bookContent.isPublished && !canEdit ? (
                                <UnpublishedContentMessage contentType="book" />
                            ) : (
                                <SavedBookViewer
                                    content={bookContent}
                                    onRemove={() => handleDelete(bookContent._id)}
                                    isAdmin={canEdit}
                                    onExpand={setFullscreenPdfUrl}
                                    onTogglePublish={handleTogglePublish}
                                />
                            )}
                        </>
                    )}

                    {!isLoading && !bookContent && (
                        canEdit ? (
                            <UploadForm lessonId={lessonId} onUpload={() => {
                                setVersion(v => v + 1);
                                triggerContentUpdate();
                            }} onExpand={setFullscreenPdfUrl} />
                        ) : (
                            <div className="text-center py-20 bg-white dark:bg-gray-800/50 rounded-lg">
                                <BookIcon className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600" />
                                <p className="mt-4 text-gray-500">No book available.</p>
                            </div>
                        )
                    )}
                </div>
            </div>

            <ConfirmModal
                isOpen={confirmModalState.isOpen}
                onClose={() => setConfirmModalState({ isOpen: false, onConfirm: null })}
                onConfirm={confirmModalState.onConfirm}
                title="Remove Book"
                message="Are you sure you want to remove this book? This action cannot be undone."
            />
            {fullscreenPdfUrl && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex flex-col animate-fade-in h-screen w-screen">
                    <div className="hidden md:flex justify-end p-2 bg-black/50 absolute top-0 right-0 z-50 rounded-bl-lg">
                        <button
                            onClick={() => setFullscreenPdfUrl(null)}
                            className="p-2 rounded-full bg-red-600/80 hover:bg-red-500 text-white transition-colors"
                            aria-label="Close fullscreen PDF viewer"
                        >
                            <XIcon className="w-6 h-6" />
                        </button>
                    </div>
                    <div className="md:hidden fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50">
                        <button
                            onClick={() => setFullscreenPdfUrl(null)}
                            className="p-3 rounded-full bg-red-600/80 hover:bg-red-500 text-white transition-colors backdrop-blur-sm shadow-lg"
                            aria-label="Close fullscreen PDF viewer"
                        >
                            <XIcon className="w-6 h-6" />
                        </button>
                    </div>
                    <div className="w-full h-full pt-12 md:pt-0">
                        <PdfViewer
                            url={fullscreenPdfUrl}
                            initialScale={2.5}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};