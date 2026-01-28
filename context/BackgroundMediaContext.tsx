import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';

export type MediaType = 'video' | 'audio';

export interface MediaState {
    id: string; // Unique ID (content ID)
    url: string;
    title: string;
    type: MediaType;
    currentTime: number;
    duration: number;
    isPlaying: boolean;
}

interface BackgroundMediaContextType {
    mediaState: MediaState | null;
    isFloating: boolean;
    playMedia: (media: MediaState) => void;
    closeMedia: () => void;
    updateMediaState: (updates: Partial<MediaState>) => void;
    setFloating: (floating: boolean) => void;
}

const BackgroundMediaContext = createContext<BackgroundMediaContextType | undefined>(undefined);

export const BackgroundMediaProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [mediaState, setMediaState] = useState<MediaState | null>(null);
    const [isFloating, setIsFloating] = useState(false);

    const playMedia = useCallback((media: MediaState) => {
        setMediaState(media);
        setIsFloating(true); // Default to floating when "sent to background"
    }, []);

    const closeMedia = useCallback(() => {
        setMediaState(null);
        setIsFloating(false);
    }, []);

    const updateMediaState = useCallback((updates: Partial<MediaState>) => {
        setMediaState(prev => prev ? { ...prev, ...updates } : null);
    }, []);

    const setFloating = useCallback((floating: boolean) => {
        setIsFloating(floating);
    }, []);

    return (
        <BackgroundMediaContext.Provider value={{ mediaState, isFloating, playMedia, closeMedia, updateMediaState, setFloating }}>
            {children}
        </BackgroundMediaContext.Provider>
    );
};

export const useBackgroundMedia = () => {
    const context = useContext(BackgroundMediaContext);
    if (!context) throw new Error('useBackgroundMedia must be used within a BackgroundMediaProvider');
    return context;
};
