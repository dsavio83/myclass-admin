import React, { useState, useEffect, useRef } from 'react';
import { useContentUpdate } from '../../context/ContentUpdateContext';
import { useBackgroundTask } from '../../context/BackgroundTaskContext';
import { useBackgroundMedia } from '../../context/BackgroundMediaContext';
import { Content, User } from '../../types';
import { useApi } from '../../hooks/useApi';
import * as api from '../../services/api';
import { AudioIcon } from '../icons/ResourceTypeIcons';
import { TrashIcon, UploadCloudIcon, PlusIcon, PlayIcon, PauseIcon, SpeakerIcon, SpeakerMuteIcon, EyeIcon, CheckCircleIcon } from '../icons/AdminIcons';
import { ConfirmModal } from '../ConfirmModal';
import { useToast } from '../../context/ToastContext';
import { formatCount } from '../../utils/formatUtils';
import { ContentStatusBanner } from '../common/ContentStatusBanner';

interface AudioViewProps {
    lessonId: string;
    user: User;
}

// Custom Audio Player with Visualizer
const CustomAudioPlayer: React.FC<{ src: string; title: string; id: string }> = ({ src, title, id }) => {
    const audioRef = useRef<HTMLAudioElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
    const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
    const animationRef = useRef<number | null>(null);
    const { playMedia, closeMedia, mediaState } = useBackgroundMedia();

    // Initialize Audio Context and Visualizer
    useEffect(() => {
        if (!src || !audioRef.current) return;

        // Restore State Logic
        if (mediaState && mediaState.id === id) {
            const aud = audioRef.current;
            aud.currentTime = mediaState.currentTime;
            closeMedia(); // Close floating player
            if (mediaState.isPlaying) {
                aud.play().catch(e => console.warn("Audio restore autoplay failed", e));
            }
        }

        const initAudio = () => {
            // ... existing initAudio logic
            if (!audioContext) {
                try {
                    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
                    const ctx = new AudioContextClass();
                    const anal = ctx.createAnalyser();
                    anal.fftSize = 256;
                    const srcNode = ctx.createMediaElementSource(audioRef.current!);
                    srcNode.connect(anal);
                    anal.connect(ctx.destination);
                    setAudioContext(ctx);
                    setAnalyser(anal);
                } catch (e) { console.error("Audio Context Init Error:", e); }
            } else if (audioContext.state === 'suspended') {
                audioContext.resume();
            }
        };

        const handlePlay = () => {
            setIsPlaying(true);
            closeMedia(); // Ensure external media stops
            initAudio();
        };

        const handlePause = () => setIsPlaying(false);
        const handleTimeUpdate = () => setCurrentTime(audioRef.current?.currentTime || 0);
        const handleLoadedMetadata = () => setDuration(audioRef.current?.duration || 0);
        const handleEnded = () => setIsPlaying(false);

        const audio = audioRef.current;
        audio.addEventListener('play', handlePlay);
        audio.addEventListener('pause', handlePause);
        audio.addEventListener('timeupdate', handleTimeUpdate);
        audio.addEventListener('loadedmetadata', handleLoadedMetadata);
        audio.addEventListener('ended', handleEnded);

        // Cleanup: Send to background
        return () => {
            if (audio && !audio.paused && !audio.ended && audio.currentTime > 0) {
                playMedia({
                    id: id,
                    url: audio.src,
                    title: title,
                    type: 'audio',
                    currentTime: audio.currentTime,
                    duration: audio.duration,
                    isPlaying: true
                });
            }

            audio.removeEventListener('play', handlePlay);
            audio.removeEventListener('pause', handlePause);
            audio.removeEventListener('timeupdate', handleTimeUpdate);
            audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
            audio.removeEventListener('ended', handleEnded);
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
        };
    }, [src, audioContext]);

    // Visualizer Loop
    useEffect(() => {
        if (!analyser || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const draw = () => {
            animationRef.current = requestAnimationFrame(draw);
            analyser.getByteFrequencyData(dataArray);

            const width = canvas.width;
            const height = canvas.height;

            ctx.clearRect(0, 0, width, height);

            const barWidth = (width / bufferLength) * 2.5;
            let barHeight;
            let x = 0;

            for (let i = 0; i < bufferLength; i++) {
                barHeight = dataArray[i] / 2; // Scale down

                // Gradient color based on frequency
                const gradient = ctx.createLinearGradient(0, height - barHeight, 0, height);
                gradient.addColorStop(0, '#60A5FA'); // Light blue
                gradient.addColorStop(1, '#2563EB'); // Blue

                ctx.fillStyle = gradient;

                // Rounded tops
                ctx.beginPath();
                ctx.roundRect(x, height - barHeight, barWidth, barHeight, [4, 4, 0, 0]);
                ctx.fill();

                x += barWidth + 1;
            }
        };

        if (isPlaying) {
            draw();
        } else {
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }

        return () => {
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
        };
    }, [analyser, isPlaying]);

    const togglePlay = () => {
        if (!audioRef.current) return;
        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play();
        }
    };

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const time = Number(e.target.value);
        if (audioRef.current) {
            audioRef.current.currentTime = time;
            setCurrentTime(time);
        }
    };

    const toggleMute = () => {
        if (audioRef.current) {
            audioRef.current.muted = !isMuted;
            setIsMuted(!isMuted);
        }
    };

    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = Number(e.target.value);
        if (audioRef.current) {
            audioRef.current.volume = val;
            setVolume(val);
        }
    };

    const changeSpeed = () => {
        const speeds = [0.5, 1, 1.25, 1.5, 2];
        const currentIndex = speeds.indexOf(playbackRate);
        const nextSpeed = speeds[(currentIndex + 1) % speeds.length];
        if (audioRef.current) {
            audioRef.current.playbackRate = nextSpeed;
            setPlaybackRate(nextSpeed);
        }
    };

    const formatTime = (time: number) => {
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-100 dark:border-gray-700">
            {/* Visualizer Area */}
            <div className="relative h-32 bg-gray-900 flex items-center justify-center overflow-hidden">
                <canvas
                    ref={canvasRef}
                    width={600}
                    height={128}
                    className="absolute bottom-0 w-full h-full opacity-80"
                />
                {!isPlaying && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-sm transition-opacity z-10">
                        <button
                            onClick={togglePlay}
                            className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-lg hover:scale-110 transition-transform"
                        >
                            <PlayIcon className="w-8 h-8 ml-1" />
                        </button>
                    </div>
                )}
                <div className="absolute top-4 left-4 right-4 text-white text-shadow-md truncate font-medium z-10 pointer-events-none">
                    {title}
                </div>
            </div>

            {/* Controls Area */}
            <div className="p-4 space-y-4">
                {/* Progress Bar */}
                <div className="flex items-center gap-3 text-xs font-mono text-gray-500 dark:text-gray-400">
                    <span className="w-10 text-right">{formatTime(currentTime)}</span>
                    <input
                        type="range"
                        min="0"
                        max={duration || 0}
                        value={currentTime}
                        onChange={handleSeek}
                        className="flex-1 h-1 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600 hover:accent-blue-500"
                    />
                    <span className="w-10">{formatTime(duration)}</span>
                </div>

                {/* Main Controls */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={togglePlay}
                            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-800 dark:text-white transition-colors"
                        >
                            {isPlaying ? <PauseIcon className="w-6 h-6" /> : <PlayIcon className="w-6 h-6" />}
                        </button>

                        <div className="flex items-center gap-2 group relative">
                            <button onClick={toggleMute} className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">
                                {isMuted || volume === 0 ? <SpeakerMuteIcon className="w-5 h-5" /> : <SpeakerIcon className="w-5 h-5" />}
                            </button>
                            <div className="w-0 overflow-hidden group-hover:w-24 transition-all duration-300 ease-in-out">
                                <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.01"
                                    value={isMuted ? 0 : volume}
                                    onChange={handleVolumeChange}
                                    className="w-20 h-1 accent-blue-600 cursor-pointer"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={changeSpeed}
                            className="px-2 py-1 text-xs font-bold text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        >
                            {playbackRate}x
                        </button>
                    </div>
                </div>
            </div>

            <audio
                ref={audioRef}
                src={src}
                crossOrigin="anonymous"
                preload="metadata"
                className="hidden"
            />
        </div>
    );
};

const SavedAudioViewer: React.FC<{ content: Content; onRemove: () => void; isAdmin: boolean; onTogglePublish?: (item: Content) => void }> = ({ content, onRemove, isAdmin, onTogglePublish }) => {
    const [audioError, setAudioError] = useState<string | null>(null);
    const [audioSrc, setAudioSrc] = useState<string>('');

    // Enhanced audio source detection
    const getAudioSrc = () => {
        if (content.file?.url) return content.file.url;
        if (content.filePath) {
            // If it's a full URL, use it
            if (content.filePath.startsWith('http')) return content.filePath;
            // Otherwise use the proxy endpoint
            return `/api/content/${content._id}/file`;
        }
        if (content.body && content.body.startsWith('http')) return content.body;
        return '';
    };

    useEffect(() => {
        const src = getAudioSrc();
        setAudioSrc(src);
    }, [content]);

    // Increment view count on mount
    useEffect(() => {
        // View count increment logic removed
    }, [content._id]);

    return (
        <div className="relative group">
            {isAdmin && (
                <div className="absolute top-2 right-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                    {onTogglePublish && (
                        <button
                            onClick={() => onTogglePublish(content)}
                            className={`p-2 rounded-full backdrop-blur-sm shadow-sm transition-all ${content.isPublished ? 'bg-white/80 dark:bg-black/80 text-green-600' : 'bg-white/50 dark:bg-black/50 text-gray-500'}`}
                            title={content.isPublished ? "Published (Click to Unpublish)" : "Draft (Click to Publish)"}
                        >
                            <CheckCircleIcon className="w-4 h-4" />
                        </button>
                    )}
                    <button onClick={onRemove} className="p-2 rounded-full bg-white/80 dark:bg-black/80 hover:bg-red-500 hover:text-white backdrop-blur-sm shadow-sm transition-all text-gray-600 dark:text-gray-300" title="Remove Audio">
                        <TrashIcon className="w-4 h-4" />
                    </button>
                </div>
            )}

            {audioSrc ? (
                <CustomAudioPlayer src={audioSrc} title={content.title} id={content._id} />
            ) : (
                <div className="p-4 bg-red-50 text-red-500 rounded-lg text-sm">
                    Audio source not found.
                </div>
            )}
        </div>
    );
};

const AddAudioForm: React.FC<{ lessonId: string; existingTitles: string[]; onAdd: () => void; onCancel: () => void; }> = ({ lessonId, existingTitles, onAdd, onCancel }) => {
    const [activeTab, setActiveTab] = useState<'upload' | 'link'>('upload');
    const [title, setTitle] = useState('');
    const [folderPath, setFolderPath] = useState('');
    const [fileName, setFileName] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [file, setFile] = useState<File | null>(null);
    const [url, setUrl] = useState('');
    const { showToast } = useToast();
    const { addTask } = useBackgroundTask(); // Added

    useEffect(() => {
        const fetchTitleAndPath = async () => {
            try {
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

                    const baseTitle = `${unitNum}-${subUnitNum}-${lessonNum} ${lessonName}`;
                    const extension = '.mp3';
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
                    setFolderPath(`${hierarchyPath}/Audios`);
                } else {
                    setTitle('New Audio');
                    setFolderPath('Default/Audios');
                }
            } catch (error) {
                console.error('Error in fetchTitleAndPath:', error);
                setTitle('New Audio');
                setFolderPath('Default/Audios');
            }
        };

        if (lessonId) {
            fetchTitleAndPath();
        }
    }, [lessonId]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile && selectedFile.type.startsWith('audio/')) {
            setFile(selectedFile);
            setError(null);
        } else {
            showToast('Please select a valid audio file.', 'error');
            setFile(null);
        }
    };

    const handleUploadToCloud = async () => {
        if (!file || !lessonId) return;

        addTask({
            type: 'upload',
            contentType: 'audio',
            title: title,
            file: file,
            lessonId: lessonId,
            mimeType: file.type
        });

        showToast('Audio upload started in background', 'info');
        onAdd();
    };

    const handleSaveLink = async () => {
        if (!url || !title) return;

        setIsSaving(true);
        try {
            await api.addContent({
                title: title.trim(),
                body: url,
                lessonId,
                type: 'audio',
                metadata: {
                    category: 'External',
                    audioUrl: url
                } as any
            });
            showToast('Audio link saved successfully!', 'success');
            onAdd();
        } catch (e) {
            showToast('Failed to save audio link.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="w-full max-w-4xl mx-auto bg-white dark:bg-gray-800/50 p-6 sm:p-8 rounded-lg shadow-md mt-6">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-center text-gray-800 dark:text-white">Add New Audio</h3>
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
                    Audio Upload
                </button>
                <button
                    onClick={() => setActiveTab('link')}
                    className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'link' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                >
                    Audio Link
                </button>
            </div>

            <div className="grid md:grid-cols-2 gap-8 items-start">
                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Audio Title</label>
                        <input
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
                                            <label className="relative cursor-pointer bg-transparent rounded-md font-medium text-blue-600 hover:text-blue-500">
                                                <span>{file ? 'Change file' : 'Upload a file'}</span>
                                                <input
                                                    type="file"
                                                    className="sr-only"
                                                    onChange={handleFileChange}
                                                    accept="audio/*"
                                                />
                                            </label>
                                        </div>
                                        <p className="text-xs text-gray-500 dark:text-gray-500">
                                            {file ? file.name : 'MP3, WAV, etc.'}
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

                    {activeTab === 'link' && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Audio URL</label>
                                <input
                                    type="url"
                                    value={url}
                                    onChange={(e) => setUrl(e.target.value)}
                                    required
                                    placeholder="https://example.com/audio.mp3"
                                    className="mt-1 w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-gray-100"
                                />
                            </div>
                            <button
                                onClick={handleSaveLink}
                                disabled={isSaving}
                                className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
                            >
                                {isSaving ? 'Saving...' : 'Save Audio Link'}
                            </button>
                        </div>
                    )}

                    {error && <p className="text-sm text-red-500 dark:text-red-400">{error}</p>}
                </div>

                <div className="h-full flex flex-col">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Preview & Info</label>
                    <div className="flex-1 bg-gray-50 dark:bg-gray-800 rounded-lg border dark:border-gray-700 p-6 flex flex-col items-center justify-center text-center">
                        <AudioIcon className="w-16 h-16 text-blue-500 mb-4" />
                        <h4 className="text-lg font-medium text-gray-800 dark:text-white mb-2">Audio Enhancement</h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
                            Uploaded audio will feature an interactive visualizer, speed controls, and a modern playback interface.
                        </p>
                        {file && (
                            <div className="mt-6 w-full">
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Selected File</p>
                                <div className="bg-white dark:bg-gray-700 p-3 rounded border dark:border-gray-600 text-sm truncate">
                                    {file.name}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export const AudioView: React.FC<AudioViewProps> = ({ lessonId, user }) => {
    const [version, setVersion] = useState(0);
    const { triggerContentUpdate, updateVersion } = useContentUpdate();
    const { data: groupedContent, isLoading } = useApi(() => api.getContentsByLessonId(lessonId, ['audio'], (user.role !== 'admin' && !user.canEdit)), [lessonId, version, user, updateVersion]);
    const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; onConfirm: (() => void) | null }>({ isOpen: false, onConfirm: null });
    const [showAddForm, setShowAddForm] = useState(false);
    const [stats, setStats] = useState<{ count: number } | null>(null);
    const { showToast } = useToast();

    useEffect(() => {
        const updateStats = async () => {
            try {
                const h = await api.getHierarchy(lessonId);
                setStats({ count: 0 });
            } catch (e) {
                console.error('Failed to fetch stats', e);
            }
        };
        updateStats();
    }, [lessonId]);

    const audioContents = groupedContent?.[0]?.docs || [];
    const canEdit = user.role === 'admin' || !!user.canEdit;

    const handleDelete = (contentId: string) => {
        const action = async () => {
            try {
                await api.deleteContent(contentId);
                setVersion(v => v + 1);
                triggerContentUpdate(); // Update sidebar counts
                showToast('Audio deleted successfully', 'success');
            } catch (e) {
                showToast('Failed to delete audio', 'error');
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
            showToast(`Audio ${newStatus ? 'published' : 'unpublished'} successfully`, 'success');
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
            {canEdit && audioContents.length > 0 && (
                <ContentStatusBanner
                    publishedCount={audioContents.filter(a => a.isPublished).length}
                    unpublishedCount={audioContents.filter(a => !a.isPublished).length}
                />
            )}

            <div className="p-4 sm:p-6 lg:p-8 flex-1 overflow-hidden flex flex-col">
                <div className="flex justify-between items-center mb-6 shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-3">
                            <AudioIcon className="w-8 h-8 text-purple-600" />
                            <h1 className="text-lg sm:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-purple-600 dark:from-white dark:to-purple-400">Audio</h1>
                        </div>
                    </div>

                    {canEdit && !showAddForm && (
                        <button onClick={() => setShowAddForm(true)} className="flex items-center justify-center p-2.5 w-10 h-10 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors sm:px-4 sm:w-auto sm:h-auto" title="Add New Audio">
                            <PlusIcon className="w-5 h-5" />
                            <span className="hidden sm:inline sm:ml-2">Add New</span>
                        </button>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto min-h-0">
                    {isLoading && <div className="text-center py-10">Loading audio...</div>}

                    {!isLoading && showAddForm && (
                        <AddAudioForm lessonId={lessonId} existingTitles={audioContents.map(a => a.title)} onAdd={handleAddSuccess} onCancel={() => setShowAddForm(false)} />
                    )}

                    {!isLoading && !showAddForm && audioContents.length > 0 && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-6">
                            {audioContents.map(audio => (
                                <SavedAudioViewer key={audio._id} content={audio} onRemove={() => handleDelete(audio._id)} isAdmin={canEdit} onTogglePublish={handleTogglePublish} />
                            ))}
                        </div>
                    )}

                    {!isLoading && !showAddForm && audioContents.length === 0 && (
                        <div className="text-center py-20 bg-white dark:bg-gray-800/50 rounded-lg">
                            <AudioIcon className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600" />
                            <p className="mt-4 text-gray-500">
                                No audio available for this chapter.
                                {canEdit && " Click 'Add New Audio' to get started."}
                            </p>
                        </div>
                    )}
                </div>

                <ConfirmModal isOpen={confirmModal.isOpen} onClose={() => setConfirmModal({ isOpen: false, onConfirm: null })} onConfirm={confirmModal.onConfirm} title="Remove Audio" message="Are you sure you want to remove this audio file?" />
            </div>
        </div>
    );
};