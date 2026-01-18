import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';

interface ContentUpdateContextType {
    updateVersion: number;
    triggerContentUpdate: () => void;
}

const ContentUpdateContext = createContext<ContentUpdateContextType | undefined>(undefined);

export const ContentUpdateProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [updateVersion, setUpdateVersion] = useState(0);

    const triggerContentUpdate = useCallback(() => {
        setUpdateVersion(v => v + 1);
        console.log('[ContentUpdateContext] Content update triggered, new version:', updateVersion + 1);
    }, [updateVersion]);

    return (
        <ContentUpdateContext.Provider value={{ updateVersion, triggerContentUpdate }}>
            {children}
        </ContentUpdateContext.Provider>
    );
};

export const useContentUpdate = (): ContentUpdateContextType => {
    const context = useContext(ContentUpdateContext);
    if (context === undefined) {
        throw new Error('useContentUpdate must be used within a ContentUpdateProvider');
    }
    return context;
};
