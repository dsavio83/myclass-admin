import React, { useEffect, useState } from 'react';

interface ExitBottomSheetProps {
    visible: boolean;
    onDismiss: () => void;
}

export const ExitBottomSheet: React.FC<ExitBottomSheetProps> = ({ visible, onDismiss }) => {
    const [progress, setProgress] = useState(100);
    const [rendered, setRendered] = useState(false);
    const [animIn, setAnimIn] = useState(false);

    useEffect(() => {
        if (visible) {
            setRendered(true);
            setProgress(100);
            // Trigger animation after mount
            requestAnimationFrame(() => {
                requestAnimationFrame(() => setAnimIn(true));
            });

            const duration = 3000;
            const interval = 30;
            const step = (interval / duration) * 100;
            let current = 100;

            const timer = setInterval(() => {
                current -= step;
                if (current <= 0) {
                    clearInterval(timer);
                    setProgress(0);
                    // Animate out then dismiss
                    setAnimIn(false);
                    setTimeout(() => {
                        setRendered(false);
                        onDismiss();
                    }, 350);
                } else {
                    setProgress(current);
                }
            }, interval);

            return () => clearInterval(timer);
        } else {
            setAnimIn(false);
            const t = setTimeout(() => setRendered(false), 350);
            return () => clearTimeout(t);
        }
    }, [visible, onDismiss]);

    if (!rendered) return null;

    return (
        <>
            {/* Backdrop - subtle */}
            <div
                className="fixed inset-0 z-[9998]"
                style={{
                    pointerEvents: animIn ? 'auto' : 'none',
                    background: 'transparent',
                }}
                onClick={onDismiss}
            />

            {/* Bottom sheet */}
            <div
                className="fixed bottom-0 left-0 right-0 z-[9999] flex justify-center pb-safe"
                style={{
                    transform: animIn ? 'translateY(0)' : 'translateY(110%)',
                    transition: 'transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)',
                    paddingBottom: 'env(safe-area-inset-bottom, 16px)',
                }}
            >
                <div
                    className="mx-4 mb-4 w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl"
                    style={{
                        background: 'rgba(15, 15, 15, 0.92)',
                        backdropFilter: 'blur(24px)',
                        WebkitBackdropFilter: 'blur(24px)',
                        border: '1px solid rgba(255,255,255,0.12)',
                    }}
                >
                    {/* Progress bar on top */}
                    <div className="h-1 w-full bg-white/10 rounded-t-3xl overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-blue-400 to-purple-400 rounded-full"
                            style={{
                                width: `${progress}%`,
                                transition: 'width 30ms linear',
                            }}
                        />
                    </div>

                    <div className="px-5 py-4 flex items-center gap-4">
                        {/* Icon */}
                        <div className="flex-shrink-0 w-11 h-11 rounded-2xl bg-white/10 flex items-center justify-center">
                            <svg className="w-6 h-6 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                        </div>

                        {/* Text */}
                        <div className="flex-1 min-w-0">
                            <p className="text-white font-black text-[17px] font-sans leading-tight tracking-tight uppercase">
                                Double tap to exit app
                            </p>
                            <p className="text-white/50 text-[12px] font-sans mt-1 tracking-widest uppercase opacity-70">
                                Press back again
                            </p>
                        </div>

                        {/* Tap indicator dots */}
                        <div className="flex-shrink-0 flex gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-ping-slow" />
                            <span className="w-2.5 h-2.5 rounded-full bg-purple-400/50" />
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes pingSlow {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.4; transform: scale(0.75); }
                }
                .animate-ping-slow {
                    animation: pingSlow 1s ease-in-out infinite;
                }
            `}</style>
        </>
    );
};
