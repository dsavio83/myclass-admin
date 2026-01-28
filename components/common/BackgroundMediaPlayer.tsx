import React, { useRef, useEffect } from 'react';
import { useBackgroundMedia } from '../../context/BackgroundMediaContext';
import { XIcon } from '../icons/AdminIcons';

export const BackgroundMediaPlayer: React.FC = () => {
    const { mediaState, isFloating, closeMedia, updateMediaState } = useBackgroundMedia();
    const videoRef = useRef<HTMLVideoElement>(null);
    const audioRef = useRef<HTMLAudioElement>(null);

    // Sync state with local player
    useEffect(() => {
        if (!mediaState || !isFloating) return;

        const player = mediaState.type === 'video' ? videoRef.current : audioRef.current;
        if (player) {
            // Restore time if just mounted
            if (Math.abs(player.currentTime - mediaState.currentTime) > 1) {
                player.currentTime = mediaState.currentTime;
            }
            if (mediaState.isPlaying) {
                player.play().catch(e => console.log("Background autoplay prevented:", e));
            } else {
                player.pause();
            }
        }
    }, [mediaState?.id, isFloating]); // Depend on ID change to reset source/time

    if (!mediaState || !isFloating) return null;

    const handleTimeUpdate = (e: React.SyntheticEvent<HTMLMediaElement>) => {
        updateMediaState({ currentTime: e.currentTarget.currentTime });
    };

    const handlePlay = () => updateMediaState({ isPlaying: true });
    const handlePause = () => updateMediaState({ isPlaying: false });

    // YouTube handling?
    const isYouTube = mediaState.url.includes('youtube.com/embed/');

    return (
        <div className="fixed bottom-4 right-4 z-[10000] w-80 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col animate-slide-up">
            <div className="flex items-center justify-between p-2 bg-gray-900 text-white cursor-move handle">
                <span className="text-xs font-semibold truncate max-w-[200px]">{mediaState.title}</span>
                <button
                    onClick={closeMedia}
                    className="p-1 hover:bg-gray-700 rounded text-gray-300 hover:text-white"
                >
                    <XIcon className="w-4 h-4" />
                </button>
            </div>

            <div className="relative bg-black aspect-video">
                {mediaState.type === 'video' ? (
                    isYouTube ? (
                        <iframe
                            src={`${mediaState.url}?autoplay=1&start=${Math.floor(mediaState.currentTime)}`}
                            className="w-full h-full"
                            title={mediaState.title}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        />
                    ) : (
                        <video
                            ref={videoRef}
                            src={mediaState.url}
                            className="w-full h-full object-contain"
                            controls
                            onTimeUpdate={handleTimeUpdate}
                            onPlay={handlePlay}
                            onPause={handlePause}
                        />
                    )
                ) : (
                    // Audio Mode
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gray-900 text-white p-4">
                        <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center mb-2 animate-pulse">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" /></svg>
                        </div>
                        <audio
                            ref={audioRef}
                            src={mediaState.url}
                            controls
                            className="w-full mt-2"
                            onTimeUpdate={handleTimeUpdate}
                            onPlay={handlePlay}
                            onPause={handlePause}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};
