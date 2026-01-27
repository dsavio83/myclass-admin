import React, { useState, useEffect } from 'react';
import { useContentUpdate } from '../../context/ContentUpdateContext';
import { useBackgroundTask } from '../../context/BackgroundTaskContext'; // Added
import { Content, User } from '../../types';
import { useApi } from '../../hooks/useApi';
import * as api from '../../services/api';
import { VideoIcon } from '../icons/ResourceTypeIcons';
import { TrashIcon, UploadCloudIcon, PlusIcon, EyeIcon } from '../icons/AdminIcons';
import { PublishToggle } from '../common/PublishToggle';
import { UnpublishedContentMessage } from '../common/UnpublishedContentMessage';
import { ConfirmModal } from '../ConfirmModal';
import { useToast } from '../../context/ToastContext';
import { formatCount } from '../../utils/formatUtils';
import { ContentStatusBanner } from '../common/ContentStatusBanner';

interface VideoViewProps {
    lessonId: string;
    user: User;
}

// ... (getYouTubeEmbedUrl and SavedVideoViewer remain same)
const getYouTubeEmbedUrl = (raw: string | undefined | null): string | null => {
    if (!raw) return null;
    const url = raw.trim();

    // Quick check to avoid parsing non-URLs (like file paths)
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        return null;
    }

    if (url.includes('youtube.com/embed/')) {
        return url;
    }
    try {
        const u = new URL(url);
        const host = u.hostname.replace(/^www\./, '');
        let videoId: string | null = null;
        if (host === 'youtu.be') {
            videoId = u.pathname.split('/')[1] || null;
            if (videoId) videoId = videoId.split('?')[0].split('/')[0];
        }
        else if (host.includes('youtube.com')) {
            if (u.pathname === '/watch') videoId = u.searchParams.get('v');
            else if (u.pathname.startsWith('/shorts/')) videoId = u.pathname.split('/')[2] || null;
            else if (u.pathname.startsWith('/embed/')) videoId = u.pathname.split('/')[2] || null;
            else if (u.pathname.startsWith('/v/')) videoId = u.pathname.split('/')[2] || null;
        }

        if (videoId) {
            videoId = videoId.replace(/[^a-zA-Z0-9_-]/g, '');
            return `https://www.youtube.com/embed/${videoId}?rel=0`;
        }
        return null;
    } catch (error) {
        // Silent failure for invalid URLs
        return null;
    }
};

const SavedVideoViewer: React.FC<{ content: Content; onRemove: () => void; isAdmin: boolean; onTogglePublish?: (item: Content) => void }> = ({ content, onRemove, isAdmin, onTogglePublish }) => {
    const [videoError, setVideoError] = useState<string | null>(null);
    const [videoLoading, setVideoLoading] = useState(true);
    const [videoSrc, setVideoSrc] = useState<string>('');

    // Enhanced video source detection with comprehensive debugging - simplified like AudioView
    const getVideoSrc = () => {
        console.log('[VideoView] Getting video source for content:', {
            id: content._id,
            type: content.type,
            title: content.title,
            hasFilePath: !!content.filePath,
            filePath: content.filePath,
            hasBody: !!content.body,
            bodyLength: content.body?.length || 0,
            bodyPreview: content.body?.substring(0, 100) + (content.body?.length > 100 ? '...' : ''),
            bodyStartsWith: content.body?.substring(0, 50)
        });

        const body = (content.body || '').trim();

        // Priority 1: YouTube URL (must be valid URL) - Check this FIRST for YouTube videos
        const youtubeEmbed = getYouTubeEmbedUrl(body);
        if (youtubeEmbed) {
            console.log('[VideoView] YouTube video detected:', youtubeEmbed);
            return youtubeEmbed;
        }

        // Priority 1.5: Content Object (Cloudinary Unified Model)
        if (content.file?.url) {
            console.log('[VideoView] Using Cloudinary URL from file object:', content.file.url);
            return content.file.url;
        }

        // Priority 2: Local file upload with valid filePath (HIGHEST PRIORITY for uploaded files)
        if (content.filePath && content.filePath.trim() !== '') {
            // Check if it's a direct URL (Cloudinary/External)
            if (content.filePath.startsWith('http://') || content.filePath.startsWith('https://')) {
                console.log('[VideoView] Using direct URL from filePath:', content.filePath);
                return content.filePath;
            }
            // Otherwise assume local file and use proxy
            const fileSrc = `/api/content/${content._id}/file`;
            console.log('[VideoView] Using uploaded file (proxy):', fileSrc);
            return fileSrc;
        }

        // Priority 3: External video URL (must be valid URL and not JSON)
        if (body && body !== '') {
            // Check if it's a valid external URL
            if (body.startsWith('http://') || body.startsWith('https://')) {
                console.log('[VideoView] Using external URL:', body);
                return body;
            }

            // Check if it's base64 video data
            if (body.startsWith('data:video/')) {
                console.log('[VideoView] Using base64 video data');
                return body;
            }

            // If body contains JSON metadata (common issue), don't use it as source
            try {
                const parsed = JSON.parse(body);
                if (parsed && typeof parsed === 'object') {
                    console.log('[VideoView] Body contains JSON metadata, not using as video source:', parsed);
                    return '';
                }
            } catch (e) {
                // Not JSON, could be a plain text URL or other content
                console.log('[VideoView] Body is not JSON, checking if it might be a direct URL');
            }
        }

        // No valid source found
        console.warn('[VideoView] No valid video source found for content:', content._id);
        return '';
    };

    // Update video source when content changes
    useEffect(() => {
        const src = getVideoSrc();
        setVideoSrc(src);

        // Don't set loading for YouTube videos - they don't use video element events
        const isYouTubeVideo = src && src.includes('youtube.com/embed/');
        setVideoLoading(isYouTubeVideo ? false : (src ? true : false));
        setVideoError(null);
    }, [content]);

    // Increment view count on mount
    useEffect(() => {
        // View count increment removed
    }, [content._id]);

    const handleVideoLoad = () => {
        console.log('[VideoView] Video loading started');
        setVideoLoading(true);
        setVideoError(null);
    };

    const handleVideoCanPlay = () => {
        console.log('[VideoView] Video can play');
        setVideoLoading(false);
        setVideoError(null);
    };

    const handleVideoError = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
        const error = e.currentTarget.error;
        const videoElement = e.currentTarget;
        let errorMessage = 'Unknown video error';

        console.error('[VideoView] Video playback error details:', {
            error: error,
            src: videoSrc,
            currentSrc: videoElement.currentSrc,
            networkState: videoElement.networkState,
            readyState: videoElement.readyState,
            duration: videoElement.duration,
            errorCode: error?.code,
            errorMessage: error?.message
        });

        if (error) {
            switch (error.code) {
                case MediaError.MEDIA_ERR_ABORTED:
                    errorMessage = 'Video loading was aborted';
                    break;
                case MediaError.MEDIA_ERR_NETWORK:
                    errorMessage = 'Network error while loading video. Please check your internet connection.';
                    break;
                case MediaError.MEDIA_ERR_DECODE:
                    errorMessage = 'Video file is corrupted or unsupported format. Please try converting to MP4 or WebM.';
                    break;
                case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
                    errorMessage = 'Video format not supported or file not found. Supported formats: MP4, WebM, OGV, AVI, MOV.';
                    break;
                default:
                    errorMessage = `Video error: ${error.message}`;
            }
        }

        // Additional debugging for specific issues
        if (videoSrc.includes('/api/content/') && !videoSrc.endsWith('/file')) {
            errorMessage += ' (Invalid API endpoint format)';
        }

        console.error('[VideoView] Final error message:', errorMessage);

        setVideoLoading(false);
        setVideoError(errorMessage);
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 relative w-full">
            {isAdmin && (
                <div className="absolute top-4 right-4 z-10 flex gap-2">
                    {onTogglePublish && (
                        <div className="">
                            <PublishToggle
                                isPublished={!!content.isPublished}
                                onToggle={() => onTogglePublish(content)}
                            />
                        </div>
                    )}
                    <button onClick={onRemove} className="p-2 rounded-full bg-white/50 dark:bg-black/50 hover:bg-white/80 dark:hover:bg-black/80 backdrop-blur-sm shadow-md" title="Remove Video">
                        <TrashIcon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                    </button>
                </div>
            )}
            <h2 className="text-xl font-semibold mb-4 pr-12 truncate">{content.title}</h2>

            <div className="w-full">
                {/* Loading state */}
                {videoLoading && (
                    <div className="flex items-center justify-center py-4">
                        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-2"></div>
                        <span className="text-sm text-gray-600 dark:text-gray-400">Loading video...</span>
                    </div>
                )}

                {/* YouTube video */}
                {videoSrc && videoSrc.includes('youtube.com/embed/') && (
                    <div className="aspect-video w-full bg-black rounded-lg overflow-hidden">
                        <iframe
                            key={videoSrc}
                            src={videoSrc}
                            className="w-full h-full"
                            title={content.title}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                            referrerPolicy="strict-origin-when-cross-origin"
                            allowFullScreen
                            onError={() => setVideoError('YouTube playback error')}
                        />
                    </div>
                )}

                {/* Video player with enhanced error handling */}
                {videoSrc && !videoSrc.includes('youtube.com/embed/') && (
                    <div className="aspect-video w-full bg-black rounded-lg overflow-hidden">
                        <video
                            controls
                            className="w-full h-full"
                            src={videoSrc}
                            onLoadStart={handleVideoLoad}
                            onCanPlay={handleVideoCanPlay}
                            onError={handleVideoError}
                            style={{ display: videoLoading ? 'none' : 'block' }}
                        >
                            Your browser does not support the video element.
                        </video>
                    </div>
                )}

                {/* Error state */}
                {videoError && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                        <div className="flex items-start">
                            <div className="flex-shrink-0">
                                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="ml-3">
                                <h3 className="text-sm font-medium text-red-800 dark:text-red-200">Video Playback Error</h3>
                                <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                                    <p>{videoError}</p>
                                    <p className="mt-1 text-xs">
                                        <strong>Debug Info:</strong> Source: {videoSrc || 'None'} | File Path: {content.filePath || 'None'}
                                    </p>
                                </div>
                                <div className="mt-3">
                                    <button
                                        onClick={() => {
                                            setVideoError(null);
                                            setVideoLoading(true);
                                            const src = getVideoSrc();
                                            setVideoSrc(src);
                                        }}
                                        className="text-xs bg-red-100 dark:bg-red-800 text-red-800 dark:text-red-200 px-2 py-1 rounded hover:bg-red-200 dark:hover:bg-red-700"
                                    >
                                        Retry
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* No source state */}
                {!videoSrc && !videoError && !videoLoading && (
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                        <div className="flex items-start">
                            <div className="flex-shrink-0">
                                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="ml-3">
                                <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">No Video Source</h3>
                                <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
                                    <p>No valid video source found for this content.</p>
                                    <p className="mt-1 text-xs">
                                        <strong>Content Info:</strong> ID: {content._id} | Type: {content.type} | File Path: {content.filePath || 'None'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const AddVideoForm: React.FC<{ lessonId: string; existingTitles: string[]; onAdd: () => void; onCancel: () => void; }> = ({ lessonId, existingTitles, onAdd, onCancel }) => {
    const [activeTab, setActiveTab] = useState<'upload' | 'youtube'>('upload');
    const [title, setTitle] = useState('');
    const [folderPath, setFolderPath] = useState('');
    const [fileName, setFileName] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [file, setFile] = useState<File | null>(null);
    const [url, setUrl] = useState('');
    const { showToast } = useToast();
    const { addTask } = useBackgroundTask(); // Added

    // Optimized Path and Title Logic - Fast loading with getHierarchy
    useEffect(() => {
        const fetchTitleAndPath = async () => {
            try {
                // Use new hierarchy endpoint
                const hierarchy = await api.getHierarchy(lessonId);

                if (hierarchy) {
                    const { className, subjectName, unitName, subUnitName, lessonName } = hierarchy;

                    const extractNum = (str: string) => {
                        if (!str) return '0';
                        const match = str.match(/\d+/);
                        return match ? match[0] : '0';
                    };

                    const unitNum = extractNum(unitName);
                    const subUnitNum = extractNum(subUnitName);
                    const lessonNum = extractNum(lessonName);

                    // Required Format: Unit-SubUnit-Lesson LessonName.mp4
                    const baseTitle = `${unitNum}-${subUnitNum}-${lessonNum} ${lessonName}`;
                    const extension = '.mp4';
                    let formattedTitle = `${baseTitle}${extension}`;

                    // Ensure title uniqueness
                    let counter = 1;
                    while (existingTitles.some(t => t.toLowerCase() === formattedTitle.toLowerCase())) {
                        formattedTitle = `${baseTitle} (${counter})${extension}`;
                        counter++;
                    }

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
                    setFileName(formattedTitle);
                    setFolderPath(`${hierarchyPath}/Videos`);
                } else {
                    setTitle('New Video');
                    setFolderPath('Default/Videos');
                }
            } catch (error) {
                console.error('Error in fetchTitleAndPath:', error);
                setTitle('New Video');
                setFolderPath('Default/Videos');
            }
        };

        if (lessonId) {
            fetchTitleAndPath();
        }
    }, [lessonId]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile && selectedFile.type.startsWith('video/')) {
            setFile(selectedFile);
            setError(null);
        } else {
            showToast('Please select a valid video file.', 'error');
            setFile(null);
        }
    };

    const handleUploadToCloud = async () => {
        if (!file || !lessonId) return;

        addTask({
            type: 'upload',
            contentType: 'video',
            title: title,
            file: file,
            lessonId: lessonId,
            mimeType: file.type
        });

        showToast('Video upload started in background', 'info');
        onAdd();
    };

    const handleSaveYouTube = async () => {
        if (!url || !title) return;

        const embed = getYouTubeEmbedUrl(url);
        if (!embed) {
            setError("Please enter a valid YouTube URL.");
            showToast('Invalid YouTube URL', 'error');
            return;
        }

        setIsSaving(true);
        try {
            await api.addContent({
                title: title.trim(),
                body: url,
                lessonId,
                type: 'video',
                metadata: {
                    category: 'External',
                    subCategory: 'YouTube',
                    videoUrl: url
                } as any
            });
            showToast('Video saved successfully!', 'success');
            onAdd();
        } catch (e) {
            showToast('Failed to save video.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="w-full max-w-4xl mx-auto bg-white dark:bg-gray-800/50 p-6 sm:p-8 rounded-lg shadow-md mt-6">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-center text-gray-800 dark:text-white">Add New Video</h3>
                <button onClick={onCancel} className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                    <span className="sr-only">Close</span>
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
            </div>

            <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6 overflow-x-auto">
                <button
                    onClick={() => setActiveTab('upload')}
                    className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'upload' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                >
                    Video Upload
                </button>
                <button
                    onClick={() => setActiveTab('youtube')}
                    className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'youtube' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                >
                    YouTube URL
                </button>
            </div>

            <div className="grid md:grid-cols-2 gap-8 items-start">
                <div className="space-y-6">
                    <div>
                        <label htmlFor="videoTitle" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Video Title</label>
                        <input
                            id="videoTitle"
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            required
                            className="mt-1 w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-gray-100"
                        />
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 font-mono truncate" title={folderPath}>
                            Path: {folderPath}
                        </p>
                    </div>

                    {activeTab === 'upload' && (
                        <div className="space-y-4">
                            <>
                                <div className="mt-1 flex items-center justify-center px-6 pt-5 pb-6 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-md hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                    <div className="space-y-1 text-center">
                                        <UploadCloudIcon className="mx-auto h-12 w-12 text-gray-400" />
                                        <div className="flex text-sm text-gray-600 dark:text-gray-400 justify-center">
                                            <label htmlFor="videoFile" className="relative cursor-pointer bg-transparent rounded-md font-medium text-blue-600 hover:text-blue-500">
                                                <span>{file ? 'Change file' : 'Upload a file'}</span>
                                                <input
                                                    id="videoFile"
                                                    name="videoFile"
                                                    type="file"
                                                    className="sr-only"
                                                    onChange={handleFileChange}
                                                    accept="video/*"
                                                />
                                            </label>
                                        </div>
                                        <p className="text-xs text-gray-500 dark:text-gray-500">
                                            {file ? file.name : 'MP4, WebM, etc.'}
                                        </p>
                                    </div>
                                </div>
                                {file && (
                                    <button
                                        onClick={handleUploadToCloud}
                                        className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                                    >
                                        Upload in Background
                                    </button>
                                )}
                            </>
                        </div>
                    )}

                    {activeTab === 'youtube' && (
                        <div className="space-y-4">
                            <div>
                                <label htmlFor="youtubeUrl" className="block text-sm font-medium text-gray-700 dark:text-gray-300">YouTube URL</label>
                                <input
                                    id="youtubeUrl"
                                    type="url"
                                    value={url}
                                    onChange={(e) => setUrl(e.target.value)}
                                    required
                                    placeholder="https://www.youtube.com/watch?v=..."
                                    className="mt-1 w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-gray-100"
                                />
                            </div>
                            <button
                                onClick={handleSaveYouTube}
                                disabled={isSaving}
                                className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
                            >
                                {isSaving ? 'Saving...' : 'Save Video'}
                            </button>
                        </div>
                    )}

                    {error && <p className="text-sm text-red-500 dark:text-red-400">{error}</p>}
                </div>

                <div className="h-full flex flex-col">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Preview</label>
                    <div className="aspect-video w-full bg-black rounded-lg border dark:border-gray-600 overflow-hidden shadow-inner relative">
                        {activeTab === 'upload' && file ? (
                            <video src={URL.createObjectURL(file)} controls className="w-full h-full" />
                        ) : activeTab === 'youtube' && url && getYouTubeEmbedUrl(url) ? (
                            <iframe
                                src={getYouTubeEmbedUrl(url) || ''}
                                className="w-full h-full"
                                title="YouTube Preview"
                                allowFullScreen
                            />
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 dark:text-gray-400 w-full">
                                <VideoIcon className="w-12 h-12 mb-2" />
                                <p>Video preview will appear here</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export const VideoView: React.FC<VideoViewProps> = ({ lessonId, user }) => {
    const [version, setVersion] = useState(0);
    const { triggerContentUpdate, updateVersion } = useContentUpdate();
    const { data: groupedContent, isLoading } = useApi(() => api.getContentsByLessonId(lessonId, ['video'], (user.role !== 'admin' && !user.canEdit)), [lessonId, version, user, updateVersion]);
    const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; onConfirm: (() => void) | null; }>({ isOpen: false, onConfirm: null, });
    const [showAddForm, setShowAddForm] = useState(false);
    const [stats, setStats] = useState<{ count: number } | null>(null);
    const { showToast } = useToast();

    useEffect(() => {
        const updateStats = async () => {
            // Removed view increment calling
        };
        updateStats();
    }, [lessonId]);

    const videoContents: Content[] = groupedContent?.[0]?.docs || [];
    const canEdit = user.role === 'admin' || !!user.canEdit;

    const handleDelete = (contentId: string) => {
        const action = async () => {
            try {
                await api.deleteContent(contentId);
                setVersion((v) => v + 1);
                triggerContentUpdate(); // Update sidebar counts
                showToast('Video deleted successfully', 'success');
            } catch (e) {
                showToast('Failed to delete video', 'error');
            }
            setConfirmModal({ isOpen: false, onConfirm: null });
        };
        setConfirmModal({ isOpen: true, onConfirm: action });
    };

    const handleTogglePublish = async (item: Content) => {
        try {
            const newStatus = !item.isPublished;
            await api.updateContent(item._id, { isPublished: newStatus });
            setVersion(v => v + 1);
            triggerContentUpdate(); // Update sidebar counts
            showToast(`Video ${newStatus ? 'published' : 'unpublished'} successfully`, 'success');
        } catch (error) {
            console.error('Failed to toggle publish status:', error);
            showToast('Failed to update publish status', 'error');
        }
    };

    const handleAddSuccess = () => {
        setVersion(v => v + 1);
        triggerContentUpdate(); // Update sidebar counts
        setShowAddForm(false);
    };

    return (
        <div className="h-full flex flex-col overflow-hidden">
            {canEdit && videoContents.length > 0 && (
                <ContentStatusBanner
                    publishedCount={videoContents.filter(v => v.isPublished).length}
                    unpublishedCount={videoContents.filter(v => !v.isPublished).length}
                />
            )}

            <div className="p-4 sm:p-6 lg:p-8 flex-1 overflow-hidden flex flex-col">
                <div className="flex justify-between items-center mb-6 shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-3">
                            <VideoIcon className="w-8 h-8 text-red-600" />
                            <h1 className="text-lg sm:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-red-600 dark:from-white dark:to-red-400">Video</h1>
                        </div>
                        {/* View Count next to Title */}
                        {/* View Count Removed */}
                    </div>

                    {canEdit && !showAddForm && (
                        <button
                            onClick={() => setShowAddForm(true)}
                            className="flex items-center justify-center p-2.5 w-10 h-10 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors sm:px-4 sm:w-auto sm:h-auto"
                            title="Add New Video"
                        >
                            <PlusIcon className="w-5 h-5" />
                            <span className="hidden sm:inline sm:ml-2">Add New</span>
                        </button>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto min-h-0">
                    {isLoading && <div className="text-center py-10">Loading videos...</div>}

                    {!isLoading && showAddForm && (
                        <AddVideoForm
                            lessonId={lessonId}
                            existingTitles={videoContents.map(v => v.title)}
                            onAdd={handleAddSuccess}
                            onCancel={() => setShowAddForm(false)}
                        />
                    )}

                    {!isLoading && !showAddForm && videoContents.length > 0 && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-6">
                            {videoContents.map(video => (
                                <React.Fragment key={video._id}>
                                    {!video.isPublished && !canEdit ? (
                                        <UnpublishedContentMessage contentType="video" />
                                    ) : (
                                        <SavedVideoViewer
                                            content={video}
                                            onRemove={() => handleDelete(video._id)}
                                            isAdmin={canEdit}
                                            onTogglePublish={handleTogglePublish}
                                        />
                                    )}
                                </React.Fragment>
                            ))}
                        </div>
                    )}

                    {!isLoading && !showAddForm && videoContents.length === 0 && (
                        <div className="text-center py-20 bg-white dark:bg-gray-800/50 rounded-lg">
                            <VideoIcon className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600" />
                            <p className="mt-4 text-gray-500">
                                No videos available for this chapter.
                                {canEdit && " Click 'Add New Video' to get started."}
                            </p>
                        </div>
                    )}
                </div>

                <ConfirmModal
                    isOpen={confirmModal.isOpen}
                    onClose={() => setConfirmModal({ isOpen: false, onConfirm: null })}
                    onConfirm={confirmModal.onConfirm}
                    title="Remove Video"
                    message="Are you sure you want to remove this video?"
                />
            </div>
        </div>
    );
};