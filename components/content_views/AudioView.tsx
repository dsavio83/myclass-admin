import React, { useState, useEffect, useRef } from 'react';
import { useContentUpdate } from '../../context/ContentUpdateContext';
import { useBackgroundTask } from '../../context/BackgroundTaskContext';
import { useBackgroundMedia } from '../../context/BackgroundMediaContext';
import { Content, User } from '../../types';
import { useApi } from '../../hooks/useApi';
import * as api from '../../services/api';
import { trackView } from '../../services/api';
import { AudioIcon } from '../icons/ResourceTypeIcons';
import { TrashIcon, UploadCloudIcon, PlusIcon, PlayIcon, PauseIcon, SpeakerIcon, SpeakerMuteIcon, CheckCircleIcon, LinkIcon, XIcon } from '../icons/AdminIcons';
import { StandardContentPicker } from '../common/StandardContentPicker';
import { ConfirmModal } from '../ConfirmModal';
import { useToast } from '../../context/ToastContext';
import { formatCount } from '../../utils/formatUtils';
import { ContentStatusBanner } from '../common/ContentStatusBanner';

interface AudioViewProps {
    lessonId: string;
    user: User;
    category?: string;
}

// Custom Audio Player with Visualizer
const CustomAudioPlayer: React.FC<{ src: string; title: string; id: string; colorScheme: any }> = ({ src, title, id, colorScheme }) => {
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
            closeMedia();
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
    }, [src, audioContext, id, title, playMedia, closeMedia, mediaState]);

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
                barHeight = dataArray[i] / 2;

                const gradient = ctx.createLinearGradient(0, height - barHeight, 0, height);
                gradient.addColorStop(0, colorScheme.accent);
                gradient.addColorStop(1, colorScheme.primary);

                ctx.fillStyle = gradient;
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
    }, [analyser, isPlaying, colorScheme]);

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
        <div className="w-full flex flex-col">
            <div className={`relative h-28 bg-gray-900 rounded-t-xl overflow-hidden`}>
                <div className={`absolute inset-0 bg-gradient-to-br ${colorScheme.gradient} opacity-20`}></div>
                <canvas ref={canvasRef} width={600} height={112} className="absolute bottom-0 w-full h-full opacity-60" />

                <div className="absolute inset-0 flex items-center justify-center bg-black/10 backdrop-blur-[1px] group-hover:bg-black/20 transition-all">
                    {!isPlaying && (
                        <button onClick={togglePlay} className={`w-14 h-14 rounded-full flex items-center justify-center text-white shadow-xl hover:scale-110 transition-transform ${colorScheme.button}`}>
                            <PlayIcon className="w-7 h-7 ml-1" />
                        </button>
                    )}
                </div>
            </div>

            <div className="p-4 bg-white dark:bg-gray-800 rounded-b-xl border-x border-b border-gray-100 dark:border-gray-700 space-y-3">
                <div className="flex items-center gap-3 text-[10px] font-bold font-mono text-gray-400">
                    <span className="w-10 text-right">{formatTime(currentTime)}</span>
                    <input type="range" min="0" max={duration || 0} value={currentTime} onChange={handleSeek}
                        className="flex-1 h-1 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                    <span className="w-10">{formatTime(duration)}</span>
                </div>

                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <button onClick={togglePlay} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors">
                            {isPlaying ? <PauseIcon className="w-5 h-5" /> : <PlayIcon className="w-5 h-5" />}
                        </button>
                        <div className="flex items-center gap-2 group/vol relative">
                            <button onClick={toggleMute} className="text-gray-500 hover:text-blue-500 transition-colors">
                                {isMuted || volume === 0 ? <SpeakerMuteIcon className="w-5 h-5" /> : <SpeakerIcon className="w-5 h-5" />}
                            </button>
                            <div className="w-0 group-hover/vol:w-16 transition-all duration-300 overflow-hidden">
                                <input type="range" min="0" max="1" step="0.01" value={isMuted ? 0 : volume} onChange={handleVolumeChange} className="w-14 h-1 accent-blue-600" />
                            </div>
                        </div>
                    </div>

                    <button onClick={changeSpeed} className="px-2 py-0.5 text-[10px] font-black text-gray-500 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 transition-colors">
                        {playbackRate}X
                    </button>
                </div>
            </div>

            <audio ref={audioRef} src={src} crossOrigin="anonymous" preload="metadata" className="hidden" />
        </div>
    );
};

const BeautifulAudioCard: React.FC<{ content: Content; index: number; onRemove: () => void; isAdmin: boolean; onTogglePublish?: (item: Content) => void; lessonId: string }> = ({ content, index, onRemove, isAdmin, onTogglePublish, lessonId }) => {
    const audioSrc = content.file?.url || (content.filePath?.startsWith('http') ? content.filePath : `/api/content/${content._id}/file`) || content.body || '';

    const colorSchemes = [
        { gradient: 'from-blue-500 to-indigo-600', primary: '#2563EB', accent: '#60A5FA', button: 'bg-blue-600 hover:bg-blue-700' },
        { gradient: 'from-purple-500 to-fuchsia-600', primary: '#9333EA', accent: '#C084FC', button: 'bg-purple-600 hover:bg-purple-700' },
        { gradient: 'from-emerald-500 to-teal-600', primary: '#059669', accent: '#34D399', button: 'bg-emerald-600 hover:bg-emerald-700' },
        { gradient: 'from-orange-500 to-rose-600', primary: '#EA580C', accent: '#FB923C', button: 'bg-orange-600 hover:bg-orange-700' },
        { gradient: 'from-pink-500 to-rose-600', primary: '#DB2777', accent: '#F472B6', button: 'bg-pink-600 hover:bg-pink-700' },
        { gradient: 'from-cyan-500 to-blue-600', primary: '#0891B2', accent: '#22D3EE', button: 'bg-cyan-600 hover:bg-cyan-700' },
    ];

    const scheme = colorSchemes[index % colorSchemes.length];

    useEffect(() => {
        if (content._id && lessonId) {
            trackView(lessonId, 'audio', content._id).catch(() => { });
        }
    }, [content._id, lessonId]);

    return (
        <div className="group relative bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden hover:shadow-2xl transition-all h-full flex flex-col">
            {isAdmin && (
                <div className="absolute top-3 right-3 z-30 opacity-0 group-hover:opacity-100 transition-all flex gap-2">
                    {onTogglePublish && (
                        <button onClick={() => onTogglePublish(content)} className={`p-2 rounded-xl backdrop-blur-md shadow-md transition-all ${content.isPublished ? 'bg-green-500 text-white' : 'bg-white/90 text-gray-500'}`}>
                            <CheckCircleIcon className="w-4 h-4" />
                        </button>
                    )}
                    <button onClick={onRemove} className="p-2 rounded-xl bg-white/90 hover:bg-red-500 hover:text-white text-gray-500 shadow-md backdrop-blur-sm transition-all">
                        <TrashIcon className="w-4 h-4" />
                    </button>
                </div>
            )}

            <div className="p-4 flex flex-col flex-1">
                <h3 className="font-bold text-gray-800 dark:text-white mb-4 line-clamp-1 group-hover:text-blue-600 transition-colors" title={content.title}>
                    {content.title}
                </h3>

                <div className="mt-auto">
                    {audioSrc ? (
                        <CustomAudioPlayer src={audioSrc} title={content.title} id={content._id} colorScheme={scheme} />
                    ) : (
                        <div className="p-6 flex flex-col items-center justify-center text-red-500 bg-red-50 dark:bg-red-900/10 rounded-xl border border-dashed border-red-200">
                            <SpeakerMuteIcon className="w-8 h-8 mb-2" />
                            <p className="text-xs font-bold">Audio source unavailable</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const UploadForm: React.FC<{ lessonId: string; existingTitles: string[]; onUploadSuccess: () => void; onCancel: () => void; category?: string; }> = ({ lessonId, existingTitles, onUploadSuccess, onCancel, category }) => {
    const [activeTab, setActiveTab] = useState<'upload' | 'link'>('upload');
    const [title, setTitle] = useState('');
    const [folderPath, setFolderPath] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [url, setUrl] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const { showToast } = useToast();
    const { addTask } = useBackgroundTask();

    useEffect(() => {
        const fetchDefaults = async () => {
            try {
                const h = await api.getHierarchy(lessonId);
                if (h) {
                    const ext = (s: string) => (s.match(/\d+/) || ['0'])[0];
                    const base = `${ext(h.unitName)}-${ext(h.subUnitName)}-${ext(h.lessonName)} ${h.lessonName}`;
                    let t = base + '.mp3';
                    let c = 1;
                    while (existingTitles.some(et => et.toLowerCase() === t.toLowerCase())) t = `${base} (${c++}).mp3`;
                    const cl = (s: string) => s.replace(/[^a-zA-Z0-9]/g, '');
                    const p = [cl(h.className), cl(h.subjectName), cl(h.unitName), h.subUnitName ? cl(h.subUnitName) : '', cl(h.lessonName)].filter(Boolean).join('/');
                    setTitle(t);
                    setFolderPath(`${p}/Audios`);
                }
            } catch (e) { setTitle('New Audio'); setFolderPath('Default/Audios'); }
        };
        if (lessonId) fetchDefaults();
    }, [lessonId, existingTitles]);

    const handleUpload = () => {
        if (!file || !lessonId) return;
        addTask({ type: 'upload', contentType: 'audio', title, file, lessonId, mimeType: file.type, category });
        showToast('Upload started in background', 'info');
        onCancel();
    };

    const handleLinkSave = async () => {
        if (!url || !title) return;
        setIsSaving(true);
        try {
            await api.addContent({ title: title.trim(), body: url, lessonId, type: 'audio', category: category || 'standard', metadata: { isExternal: true, audioUrl: url } as any });
            showToast('Link saved successfully', 'success');
            onUploadSuccess();
        } catch (e) { showToast('Save failed', 'error'); }
        setIsSaving(false);
    };

    return (
        <div className="w-full max-w-5xl mx-auto bg-white dark:bg-gray-800/80 backdrop-blur-md rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden min-h-[500px] flex flex-col md:flex-row animate-scale-in mb-8 relative">
            <button onClick={onCancel} className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 z-10 transition-colors"><XIcon className="w-6 h-6" /></button>
            <div className="w-full md:w-5/12 p-6 sm:p-8 bg-gray-50/50 dark:bg-gray-900/30 border-r border-gray-100 dark:border-gray-700 flex flex-col">
                <div className="mb-8">
                    <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center mb-4"><AudioIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" /></div>
                    <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Configure Audio</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Set the title and choose your storage strategy.</p>
                </div>
                <div className="space-y-6 flex-1">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Track Title</label>
                        <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none transition-all" />
                    </div>
                    <div className="space-y-3">
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Source Strategy</label>
                        <div className="grid grid-cols-2 gap-2 p-1 bg-gray-200/50 dark:bg-gray-700/50 rounded-xl">
                            <button onClick={() => setActiveTab('upload')} className={`py-2.5 text-xs font-bold rounded-lg transition-all ${activeTab === 'upload' ? 'bg-white dark:bg-gray-600 text-purple-600 dark:text-purple-400 shadow-sm' : 'text-gray-500'}`}>UPLOAD</button>
                            <button onClick={() => setActiveTab('link')} className={`py-2.5 text-xs font-bold rounded-lg transition-all ${activeTab === 'link' ? 'bg-white dark:bg-gray-600 text-purple-600 dark:text-purple-400 shadow-sm' : 'text-gray-500'}`}>LINK</button>
                        </div>
                    </div>
                </div>
                <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-700">
                    <p className="text-xs text-gray-500 italic">Target: <span className="font-mono text-purple-600 dark:text-purple-400">{folderPath}</span></p>
                </div>
            </div>
            <div className="w-full md:w-7/12 p-6 sm:p-10 flex flex-col justify-center items-center bg-white dark:bg-gray-800 relative">
                <div className="w-full max-w-sm">
                    {activeTab === 'upload' ? (
                        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className={`relative group/drop cursor-pointer transition-all duration-300 ${file ? 'bg-purple-50/50 dark:bg-purple-900/20 border-purple-400' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50 border-gray-300'} border-2 border-dashed rounded-3xl p-10 text-center flex flex-col items-center justify-center`}>
                                <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => { const f = e.target.files?.[0]; if (f?.type.startsWith('audio/')) setFile(f); else showToast('Invalid audio file', 'error'); }} accept="audio/*" />
                                <div className={`p-5 rounded-2xl mb-4 transition-transform group-hover/drop:scale-110 ${file ? 'bg-purple-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-400'}`}><UploadCloudIcon className="w-10 h-10" /></div>
                                {file ? (<><p className="font-bold text-gray-800 dark:text-white truncate max-w-[200px] mb-1">{file.name}</p><p className="text-xs text-purple-500 font-medium">Click to change</p></>) : (<><p className="text-lg font-bold text-gray-700 dark:text-gray-200">Drop Audio here</p><p className="text-sm text-gray-500 dark:text-gray-400 mt-1">or click to browse</p></>)}
                            </div>
                            <button disabled={!file} onClick={handleUpload} className="w-full py-4 px-6 bg-gradient-to-br from-purple-600 to-indigo-700 text-white rounded-2xl font-bold shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 hover:scale-[1.02] transition-all disabled:opacity-50 flex items-center justify-center gap-3">
                                <UploadCloudIcon className="w-6 h-6" /><span>START UPLOAD</span>
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Direct Audio Link</label>
                                <input type="url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://example.com/audio.mp3" className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none transition-all" />
                                <p className="text-xs text-gray-500 mt-2">Provide a direct link to an MP3 or WAV file.</p>
                            </div>
                            <button disabled={!url || isSaving} onClick={handleLinkSave} className="w-full py-4 px-6 bg-gray-900 dark:bg-gray-700 text-white rounded-2xl font-bold shadow-xl hover:shadow-2xl hover:bg-black dark:hover:bg-gray-600 transition-all disabled:opacity-50 flex items-center justify-center gap-3">
                                {isSaving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <LinkIcon className="w-6 h-6" />}
                                <span>{isSaving ? 'SAVING...' : 'SAVE DIRECT LINK'}</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export const AudioView: React.FC<AudioViewProps> = ({ lessonId, user, category }) => {
    const [version, setVersion] = useState(0);
    const { triggerContentUpdate, updateVersion } = useContentUpdate();
    const { data: grouped, isLoading } = useApi(() => api.getContentsByLessonId(lessonId, ['audio'], (user.role !== 'admin' && !user.canEdit), category), [lessonId, version, user, updateVersion, category]);
    const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; onConfirm: (() => void) | null }>({ isOpen: false, onConfirm: null });
    const [showAddForm, setShowAddForm] = useState(false);
    const [pickerOpen, setPickerOpen] = useState(false);
    const { showToast } = useToast();

    const audios = grouped?.[0]?.docs || [];
    const isAdmin = user.role === 'admin' || !!user.canEdit;

    const handleDelete = (id: string) => {
        setConfirmModal({
            isOpen: true, onConfirm: async () => {
                try { await api.deleteContent(id); setVersion(v => v + 1); triggerContentUpdate(); showToast('Audio deleted', 'success'); } catch (e) { showToast('Delete failed', 'error'); }
                setConfirmModal({ isOpen: false, onConfirm: null });
            }
        });
    };

    const handleTogglePublish = async (item: Content) => {
        try {
            const newStatus = !item.isPublished;
            await api.updateContent(item._id, { isPublished: newStatus });
            setVersion(v => v + 1); triggerContentUpdate();
            showToast(`Audio ${newStatus ? 'published' : 'unpublished'}`, 'success');
        } catch (e) { showToast('Failed to update status', 'error'); }
    };

    const handleLinkContent = async (items: Content[]) => {
        try {
            await Promise.all(items.map(i => api.addContent({ lessonId, type: 'audio', title: i.title, body: i.body, isPublished: false, category, filePath: i.filePath, file: i.file, metadata: i.metadata || {} })));
            setVersion(v => v + 1); triggerContentUpdate();
            showToast(`Linked ${items.length} files`, 'success');
        } catch (e) { showToast('Link failed', 'error'); }
    };

    return (
        <div className="h-full flex flex-col overflow-hidden bg-gray-50/30 dark:bg-gray-900/30">
            {isAdmin && audios.length > 0 && <ContentStatusBanner publishedCount={audios.filter(a => a.isPublished).length} unpublishedCount={audios.filter(a => !a.isPublished).length} />}
            <div className="p-4 sm:p-6 lg:p-8 flex-1 overflow-hidden flex flex-col">
                <div className="flex justify-between items-center mb-6 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg"><AudioIcon className="w-6 h-6 sm:w-8 sm:h-8 text-purple-600 dark:text-purple-400" /></div>
                        <h1 className="text-xl sm:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-purple-600 dark:from-white dark:to-purple-400">Audio Tracks</h1>
                    </div>
                    {isAdmin && (
                        <div className="flex items-center gap-2">
                            {category === 'below_average_d_plus' && <button onClick={() => setPickerOpen(true)} className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl transition-all shadow-md"><LinkIcon className="w-5 h-5" /><span className="hidden sm:inline">Link</span></button>}
                            <button onClick={() => setShowAddForm(!showAddForm)} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all shadow-md ${showAddForm ? 'bg-gray-100' : 'bg-blue-600 border-none text-white'}`}>
                                <PlusIcon className={`w-5 h-5 transition-transform ${showAddForm ? 'rotate-45' : ''}`} />
                                <span className="hidden sm:inline">{showAddForm ? 'Cancel' : 'Add New'}</span>
                            </button>
                        </div>
                    )}
                </div>
                <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar pr-2">
                    {isLoading ? <div className="flex flex-col items-center justify-center py-20"><div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mb-4"></div><p className="text-gray-500">Loading audio...</p></div> : (
                        <>
                            {showAddForm && <UploadForm lessonId={lessonId} existingTitles={audios.map(a => a.title)} onUploadSuccess={() => { setVersion(v => v + 1); setShowAddForm(false); triggerContentUpdate(); }} onCancel={() => setShowAddForm(false)} category={category} />}
                            {audios.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pb-10">
                                    {audios.map((a, i) => <BeautifulAudioCard key={a._id} content={a} index={i} onRemove={() => handleDelete(a._id)} isAdmin={isAdmin} onTogglePublish={handleTogglePublish} lessonId={lessonId} />)}
                                </div>
                            ) : !showAddForm && (
                                <div className="flex flex-col items-center justify-center py-32 bg-white dark:bg-gray-800/30 rounded-3xl border-2 border-dashed border-gray-200">
                                    <AudioIcon className="w-16 h-16 text-gray-300 mb-6" />
                                    <h3 className="text-xl font-bold text-gray-700 mb-2">No audio tracks</h3>
                                    <p className="text-gray-500 text-center max-w-xs">{isAdmin ? "Ready to add sound? Click 'Add New' to start." : "Check back later for audio."}</p>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
            <ConfirmModal isOpen={confirmModal.isOpen} onClose={() => setConfirmModal({ isOpen: false, onConfirm: null })} onConfirm={confirmModal.onConfirm} title="Remove Audio" message="Are you sure?" />
            <StandardContentPicker isOpen={pickerOpen} onClose={() => setPickerOpen(false)} onImport={handleLinkContent} lessonId={lessonId} resourceType="audio" />
            <style>{`.custom-scrollbar::-webkit-scrollbar { width: 4px; } .custom-scrollbar::-webkit-scrollbar-track { background: transparent; } .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; } .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; }`}</style>
        </div>
    );
};
