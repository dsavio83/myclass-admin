import React, { useState, useEffect, useRef } from 'react';
import { useContentUpdate } from '../../context/ContentUpdateContext';
import { useBackgroundTask } from '../../context/BackgroundTaskContext';
import { useBackgroundMedia } from '../../context/BackgroundMediaContext';
import { Content, User } from '../../types';
import { useApi } from '../../hooks/useApi';
import * as api from '../../services/api';
import { trackView } from '../../services/api';
import { VideoIcon } from '../icons/ResourceTypeIcons';
import { TrashIcon, UploadCloudIcon, PlusIcon, LinkIcon, XIcon } from '../icons/AdminIcons';
import { StandardContentPicker } from '../common/StandardContentPicker';
import { ConfirmModal } from '../ConfirmModal';
import { useToast } from '../../context/ToastContext';
import { ContentStatusBanner } from '../common/ContentStatusBanner';

interface VideoViewProps {
    lessonId: string;
    user: User;
    category?: string;
}

const getYouTubeEmbedUrl = (raw: string | undefined | null): string | null => {
    if (!raw) return null;
    const url = raw.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) return null;
    if (url.includes('youtube.com/embed/')) return url;
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
        return null;
    }
};

const SavedVideoViewer: React.FC<{ content: Content; onRemove: () => void; isAdmin: boolean; onTogglePublish?: (item: Content) => void; lessonId: string }> = ({ content, onRemove, isAdmin, onTogglePublish, lessonId }) => {
    const [videoError, setVideoError] = useState<string | null>(null);
    const [videoLoading, setVideoLoading] = useState(true);
    const [videoSrc, setVideoSrc] = useState<string>('');
    const videoRef = useRef<HTMLVideoElement>(null);
    const { playMedia, closeMedia, mediaState } = useBackgroundMedia();

    const getVideoSrc = () => {
        const body = (content.body || '').trim();
        const youtubeEmbed = getYouTubeEmbedUrl(body);
        if (youtubeEmbed) return youtubeEmbed;
        if (content.file?.url) return content.file.url;
        if (content.filePath && content.filePath.trim() !== '') {
            if (content.filePath.startsWith('http')) return content.filePath;
            return `/api/content/${content._id}/file`;
        }
        if (body && (body.startsWith('http') || body.startsWith('data:video/'))) return body;
        return '';
    };

    useEffect(() => {
        const src = getVideoSrc();
        setVideoSrc(src);
        setVideoLoading(false); // Don't hide the video element — let browser load naturally
        setVideoError(null);
    }, [content]);

    // Restore background media state once on mount
    useEffect(() => {
        if (mediaState && mediaState.id === content._id) {
            const videoEl = videoRef.current;
            if (videoEl) {
                videoEl.currentTime = mediaState.currentTime;
                if (mediaState.isPlaying) videoEl.play().catch(() => { });
            }
            closeMedia();
        }
        // Save media state to background context only when unmounting
        return () => {
            const vid = videoRef.current;
            if (vid && !vid.paused && !vid.ended && vid.currentTime > 0) {
                playMedia({
                    id: content._id,
                    url: vid.src || vid.currentSrc,
                    title: content.title,
                    type: 'video',
                    currentTime: vid.currentTime,
                    duration: vid.duration,
                    isPlaying: true
                });
            } else {
                const src = getVideoSrc();
                if (src && src.includes('youtube.com/embed/')) {
                    playMedia({
                        id: content._id,
                        url: src,
                        title: content.title,
                        type: 'video',
                        currentTime: 0,
                        duration: 0,
                        isPlaying: true
                    });
                }
            }
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (content._id && lessonId) {
            trackView(lessonId, 'video', content._id).catch(() => { });
        }
    }, [content._id, lessonId]);

    const handleVideoError = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
        const error = e.currentTarget.error;
        let msg = 'Playback error';
        if (error) {
            if (error.code === MediaError.MEDIA_ERR_NETWORK) msg = 'Network error';
            else if (error.code === MediaError.MEDIA_ERR_DECODE) msg = 'Decoding error';
            else if (error.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED) msg = 'Unsupported format';
        }
        setVideoLoading(false);
        setVideoError(msg);
    };

    return (
        <div className="group relative bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden transition-all hover:shadow-2xl">
            {isAdmin && (
                <div className="absolute top-4 right-4 z-20 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                    {onTogglePublish && (
                        <button
                            onClick={() => onTogglePublish(content)}
                            className={`p-2 rounded-full backdrop-blur-sm shadow-md transition-all ${content.isPublished ? 'bg-green-500 text-white shadow-green-500/20' : 'bg-white/80 dark:bg-black/50 text-gray-400'}`}
                            title={content.isPublished ? "Published (Click to Unpublish)" : "Draft (Click to Publish)"}
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                        </button>
                    )}
                    <button onClick={onRemove} className="p-2 rounded-full bg-white/80 dark:bg-black/50 hover:bg-red-500 hover:text-white backdrop-blur-sm shadow-md transition-all text-gray-400" title="Remove Video">
                        <TrashIcon className="w-4 h-4" />
                    </button>
                </div>
            )}

            <div className="aspect-video w-full bg-black relative">
                {videoSrc && videoSrc.includes('youtube.com/embed/') ? (
                    <iframe src={videoSrc} className="w-full h-full" title={content.title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen />
                ) : videoSrc ? (
                    <video
                        controls
                        className="w-full h-full"
                        src={videoSrc}
                        onError={handleVideoError}
                        ref={videoRef}
                    />
                ) : null}

                {videoError && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-950/20 backdrop-blur-md p-6 text-center">
                        <svg className="w-12 h-12 text-red-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        <p className="text-red-400 font-medium mb-4">{videoError}</p>
                        <button onClick={() => { setVideoError(null); setVideoLoading(true); setVideoSrc(getVideoSrc()); }} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-bold shadow-lg shadow-red-500/20">Retry</button>
                    </div>
                )}
            </div>

            <div className="p-4">
                <h3 className="text-lg font-bold text-gray-800 dark:text-white truncate" title={content.title}>{content.title}</h3>
                <div className="mt-2 flex items-center gap-2">
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase ${videoSrc.includes('youtube.com') ? 'bg-red-100 text-red-600 dark:bg-red-900/30' : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30'}`}>
                        {videoSrc.includes('youtube.com') ? 'YouTube' : 'Upload'}
                    </span>
                </div>
            </div>
        </div>
    );
};

const UploadForm: React.FC<{ lessonId: string; existingTitles: string[]; onUploadSuccess: () => void; onCancel: () => void; category?: string; }> = ({ lessonId, existingTitles, onUploadSuccess, onCancel, category }) => {
    const [activeTab, setActiveTab] = useState<'upload' | 'youtube'>('upload');
    const [title, setTitle] = useState('');
    const [folderPath, setFolderPath] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [url, setUrl] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const { showToast } = useToast();
    const { addTask } = useBackgroundTask();

    useEffect(() => {
        const fetchTitleAndPath = async () => {
            try {
                const hierarchy = await api.getHierarchy(lessonId);
                if (hierarchy) {
                    const { className, subjectName, unitName, subUnitName, lessonName } = hierarchy;
                    const extractNum = (str: string) => (str.match(/\d+/) || ['0'])[0];
                    const unitNum = extractNum(unitName);
                    const subUnitNum = extractNum(subUnitName);
                    const lessonNum = extractNum(lessonName);

                    const baseTitle = `${unitNum}-${subUnitNum}-${lessonNum} ${lessonName}`;
                    const extension = '.mp4';
                    let formattedTitle = `${baseTitle}${extension}`;

                    let counter = 1;
                    while (existingTitles.some(t => t.toLowerCase() === formattedTitle.toLowerCase())) {
                        formattedTitle = `${baseTitle} (${counter})${extension}`;
                        counter++;
                    }

                    const clean = (str: string) => str.replace(/[^a-zA-Z0-9]/g, '');
                    const path = [clean(className), clean(subjectName), clean(unitName), subUnitName ? clean(subUnitName) : '', clean(lessonName)].filter(Boolean).join('/');

                    setTitle(formattedTitle);
                    setFolderPath(`${path}/Videos`);
                } else {
                    setTitle('New Video');
                    setFolderPath('Default/Videos');
                }
            } catch (error) {
                console.error('Error fetching defaults', error);
                setTitle('New Video');
                setFolderPath('Default/Videos');
            }
        };
        if (lessonId) fetchTitleAndPath();
    }, [lessonId]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (f && f.type.startsWith('video/')) {
            setFile(f);
        } else {
            showToast('Please select a valid video file.', 'error');
            setFile(null);
        }
    };

    const handleUpload = async () => {
        if (!file || !lessonId) return;
        addTask({
            type: 'upload',
            contentType: 'video',
            title: title,
            file: file,
            lessonId: lessonId,
            mimeType: file.type,
            category: category
        });
        showToast('Video upload started in background', 'info');
        onCancel();
    };

    const handleSaveYouTube = async () => {
        if (!url || !title) return;
        const embed = getYouTubeEmbedUrl(url);
        if (!embed) {
            showToast('Please enter a valid YouTube URL', 'error');
            return;
        }
        setIsSaving(true);
        try {
            await api.addContent({
                title: title.trim(),
                body: url,
                lessonId,
                type: 'video',
                category: category || 'standard',
                metadata: { category: 'External', subCategory: 'YouTube', videoUrl: url } as any
            });
            showToast('Video saved successfully!', 'success');
            onUploadSuccess();
        } catch (e) {
            showToast('Failed to save YouTube video.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="w-full max-w-5xl mx-auto bg-white dark:bg-gray-800/80 backdrop-blur-md rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden min-h-[500px] flex flex-col md:flex-row animate-scale-in mb-8 relative">
            <button onClick={onCancel} className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 z-10 transition-colors">
                <XIcon className="w-6 h-6" />
            </button>

            {/* Left Panel: Settings & Info */}
            <div className="w-full md:w-5/12 p-6 sm:p-8 bg-gray-50/50 dark:bg-gray-900/30 border-r border-gray-100 dark:border-gray-700 flex flex-col">
                <div className="mb-8">
                    <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-xl flex items-center justify-center mb-4">
                        <VideoIcon className="w-6 h-6 text-red-600 dark:text-red-400" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Configure Video</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Set the title and choose your storage strategy for this video track.</p>
                </div>

                <div className="space-y-6 flex-1">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Video Title</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 outline-none transition-all"
                            placeholder="Enter video title..."
                        />
                    </div>

                    <div className="space-y-3">
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Source Strategy</label>
                        <div className="grid grid-cols-2 gap-2 p-1 bg-gray-200/50 dark:bg-gray-700/50 rounded-xl">
                            <button
                                onClick={() => setActiveTab('upload')}
                                className={`py-2.5 text-xs font-bold rounded-lg transition-all ${activeTab === 'upload' ? 'bg-white dark:bg-gray-600 text-red-600 dark:text-red-400 shadow-sm' : 'text-gray-500'}`}
                            >
                                <div className="flex items-center justify-center gap-2">
                                    <UploadCloudIcon className="w-4 h-4" />
                                    UPLOAD
                                </div>
                            </button>
                            <button
                                onClick={() => setActiveTab('youtube')}
                                className={`py-2.5 text-xs font-bold rounded-lg transition-all ${activeTab === 'youtube' ? 'bg-white dark:bg-gray-600 text-red-600 dark:text-red-400 shadow-sm' : 'text-gray-500'}`}
                            >
                                <div className="flex items-center justify-center gap-2">
                                    <LinkIcon className="w-4 h-4" />
                                    YOUTUBE
                                </div>
                            </button>
                        </div>
                    </div>
                </div>

                <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-700">
                    <p className="text-xs text-gray-500 italic">Target folder: <span className="font-mono text-red-600 dark:text-red-400">{folderPath}</span></p>
                </div>
            </div>

            {/* Right Panel: Actions */}
            <div className="w-full md:w-7/12 p-6 sm:p-10 flex flex-col justify-center items-center bg-white dark:bg-gray-800 relative group">
                <div className="w-full max-w-sm">
                    {activeTab === 'upload' ? (
                        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className={`relative group/drop cursor-pointer transition-all duration-300 ${file ? 'bg-red-50/50 dark:bg-red-900/20 border-red-400' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50 border-gray-300'} border-2 border-dashed rounded-3xl p-10 text-center flex flex-col items-center justify-center`}>
                                <input id="videoFile" name="videoFile" type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileChange} accept="video/*" />
                                <div className={`p-5 rounded-2xl mb-4 transition-transform group-hover/drop:scale-110 ${file ? 'bg-red-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-400'}`}>
                                    <UploadCloudIcon className="w-10 h-10" />
                                </div>
                                {file ? (
                                    <>
                                        <p className="font-bold text-gray-800 dark:text-white truncate max-w-[200px] mb-1">{file.name}</p>
                                        <p className="text-xs text-red-500 font-medium">Click to change file</p>
                                    </>
                                ) : (
                                    <>
                                        <p className="text-lg font-bold text-gray-700 dark:text-gray-200">Drop Video here</p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">or click to browse</p>
                                    </>
                                )}
                            </div>
                            <button
                                disabled={!file}
                                onClick={handleUpload}
                                className="w-full py-4 px-6 bg-gradient-to-br from-red-600 to-pink-700 text-white rounded-2xl font-bold shadow-lg shadow-red-500/30 hover:shadow-red-500/50 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                            >
                                <UploadCloudIcon className="w-6 h-6" />
                                <span>START UPLOAD</span>
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">YouTube URL</label>
                                <input
                                    type="url"
                                    value={url}
                                    onChange={(e) => setUrl(e.target.value)}
                                    placeholder="https://www.youtube.com/watch?v=..."
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 outline-none transition-all"
                                />
                                <p className="text-xs text-gray-500 mt-2">Paste the share link or browser URL from YouTube.</p>
                            </div>
                            <button
                                disabled={!url || isSaving}
                                onClick={handleSaveYouTube}
                                className="w-full py-4 px-6 bg-gray-900 dark:bg-gray-700 text-white rounded-2xl font-bold shadow-xl hover:shadow-2xl hover:bg-black dark:hover:bg-gray-600 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                            >
                                {isSaving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <LinkIcon className="w-6 h-6" />}
                                <span>{isSaving ? 'SAVING...' : 'SAVE YOUTUBE VIDEO'}</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Preview Panel (Hidden on mobile) */}
            <div className="hidden lg:flex lg:w-4/12 p-8 bg-gray-50 dark:bg-gray-900/10 border-l border-gray-100 dark:border-gray-700 flex-col justify-center">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Live Preview</label>
                <div className="aspect-video w-full bg-black rounded-2xl border dark:border-gray-700 overflow-hidden shadow-2xl relative">
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
                        <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 dark:text-gray-400 w-full p-6">
                            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                                <VideoIcon className="w-8 h-8 text-gray-300 dark:text-gray-600" />
                            </div>
                            <p className="text-sm font-medium">Video preview will appear here once selected.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export const VideoView: React.FC<VideoViewProps> = ({ lessonId, user, category }) => {
    const [version, setVersion] = useState(0);
    const { triggerContentUpdate, updateVersion } = useContentUpdate();
    const { data: groupedContent, isLoading } = useApi(() => api.getContentsByLessonId(lessonId, ['video'], (user.role !== 'admin' && !user.canEdit), category), [lessonId, version, user, updateVersion, category]);
    const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; onConfirm: (() => void) | null }>({ isOpen: false, onConfirm: null });
    const [showAddForm, setShowAddForm] = useState(false);
    const [pickerOpen, setPickerOpen] = useState(false);
    const { showToast } = useToast();

    const videoContents = groupedContent?.[0]?.docs || [];
    const canEdit = user.role === 'admin' || !!user.canEdit;

    const handleDelete = (contentId: string) => {
        const action = async () => {
            try {
                await api.deleteContent(contentId);
                setVersion(v => v + 1);
                triggerContentUpdate();
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
            triggerContentUpdate();
            showToast(`Video ${newStatus ? 'published' : 'unpublished'} successfully`, 'success');
        } catch (error) {
            console.error('Failed to toggle publish status:', error);
            showToast('Failed to update publish status', 'error');
        }
    };

    const handleLinkContent = async (selectedItems: Content[]) => {
        try {
            await Promise.all(selectedItems.map(item =>
                api.addContent({
                    lessonId,
                    type: 'video',
                    title: item.title,
                    body: item.body,
                    isPublished: false,
                    category: category,
                    filePath: item.filePath,
                    file: item.file,
                    metadata: item.metadata || {}
                })
            ));
            setVersion(v => v + 1);
            triggerContentUpdate();
            showToast(`Successfully linked ${selectedItems.length} videos`, 'success');
        } catch (e) {
            console.error(e);
            showToast('Failed to link content', 'error');
        }
    };

    return (
        <div className="h-full flex flex-col overflow-hidden bg-gray-50/30 dark:bg-gray-900/30">
            {canEdit && videoContents.length > 0 && (
                <ContentStatusBanner
                    publishedCount={videoContents.filter(a => a.isPublished).length}
                    unpublishedCount={videoContents.filter(a => !a.isPublished).length}
                />
            )}

            <div className="p-4 sm:p-6 lg:p-8 flex-1 overflow-hidden flex flex-col">
                <div className="flex justify-between items-center mb-6 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                            <VideoIcon className="w-6 h-6 sm:w-8 sm:h-8 text-red-600 dark:text-red-400" />
                        </div>
                        <h1 className="text-xl sm:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-red-600 dark:from-white dark:to-red-400">Videos</h1>
                    </div>

                    {canEdit && (
                        <div className="flex items-center gap-2">
                            {category === 'below_average_d_plus' && (
                                <button
                                    onClick={() => setPickerOpen(true)}
                                    className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl transition-all shadow-md hover:shadow-teal-500/20"
                                >
                                    <LinkIcon className="w-5 h-5" />
                                    <span className="hidden sm:inline">Link Existing</span>
                                </button>
                            )}
                            <button
                                onClick={() => setShowAddForm(!showAddForm)}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all shadow-md ${showAddForm ? 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20'}`}
                            >
                                <PlusIcon className={`w-5 h-5 transition-transform ${showAddForm ? 'rotate-45' : ''}`} />
                                <span className="hidden sm:inline">{showAddForm ? 'Cancel' : 'Add New'}</span>
                            </button>
                        </div>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar pr-2">
                    {isLoading && (
                        <div className="flex flex-col items-center justify-center py-20">
                            <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                            <p className="text-gray-500 font-medium">Loading amazing video content...</p>
                        </div>
                    )}

                    {!isLoading && showAddForm && (
                        <UploadForm
                            lessonId={lessonId}
                            existingTitles={videoContents.map(a => a.title)}
                            onUploadSuccess={() => { setVersion(v => v + 1); setShowAddForm(false); triggerContentUpdate(); }}
                            onCancel={() => setShowAddForm(false)}
                            category={category}
                        />
                    )}

                    {!isLoading && !showAddForm && videoContents.length > 0 && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-2 gap-8 pb-10">
                            {videoContents.map(video => (
                                <SavedVideoViewer key={video._id} content={video} onRemove={() => handleDelete(video._id)} isAdmin={canEdit} onTogglePublish={handleTogglePublish} lessonId={lessonId} />
                            ))}
                        </div>
                    )}

                    {!isLoading && !showAddForm && videoContents.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-32 bg-white dark:bg-gray-800/30 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-700/50">
                            <div className="p-6 bg-gray-50 dark:bg-gray-800 rounded-full mb-6">
                                <VideoIcon className="w-16 h-16 text-gray-300 dark:text-gray-600" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-700 dark:text-gray-300 mb-2">No videos yet</h3>
                            <p className="text-gray-500 dark:text-gray-400 max-w-sm text-center">
                                {canEdit ? "Ready to add some visuals? Click 'Add New' to get started with your first video content." : "Check back later for video content related to this lesson."}
                            </p>
                            {canEdit && (
                                <button onClick={() => setShowAddForm(true)} className="mt-8 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-bold transition-all shadow-lg shadow-red-500/30">
                                    Upload First Video
                                </button>
                            )}
                        </div>
                    )}
                </div>

                <ConfirmModal isOpen={confirmModal.isOpen} onClose={() => setConfirmModal({ isOpen: false, onConfirm: null })} onConfirm={confirmModal.onConfirm} title="Remove Video" message="Are you sure you want to remove this video?" />

                <StandardContentPicker
                    isOpen={pickerOpen}
                    onClose={() => setPickerOpen(false)}
                    onImport={handleLinkContent}
                    lessonId={lessonId}
                    resourceType="video"
                />
            </div>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
                .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
                @keyframes scale-in {
                    0% { transform: scale(0.95); opacity: 0; }
                    100% { transform: scale(1); opacity: 1; }
                }
                .animate-scale-in { animation: scale-in 0.3s ease-out forwards; }
            `}</style>
        </div>
    );
};