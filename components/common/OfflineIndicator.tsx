import React, { useState, useEffect } from 'react';

export const OfflineIndicator: React.FC = () => {
    const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    if (isOnline) {
        return null;
    }

    return (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-[100] bg-red-600 text-white text-center py-3 px-6 rounded-lg shadow-xl flex items-center gap-3 animate-fade-in-up">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636a9 9 0 011.4 10.3M15.536 8.464a5 5 0 011.4 5.3M2 12h2M6 8a5.978 5.978 0 00-1.4 5.3M4 18l1.4-1.4M2 12a10 10 0 0010 10c1.6 0 3.11-.375 4.475-1.025m-2.91-9.91A1.996 1.996 0 0112 10a2 2 0 00-2 2c0 .356.094.69.255.98m1.272-3.134A2.001 2.001 0 0012 14v4M12.004 2h-.008A10 10 0 002 12" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18" />
            </svg>
            <span className="font-semibold" style={{ fontFamily: 'TAU-Pallai', fontSize: '14px' }}>இணையத் தொடர்பு துண்டிக்கப்பட்டுள்ளது</span>
        </div>
    );
};
