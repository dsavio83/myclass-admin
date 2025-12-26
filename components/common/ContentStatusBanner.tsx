import React from 'react';

interface ContentStatusBannerProps {
    isPublished?: boolean;
    publishedCount?: number;
    unpublishedCount?: number;
}

export const ContentStatusBanner: React.FC<ContentStatusBannerProps> = ({ isPublished, publishedCount, unpublishedCount }) => {
    // List View Mode
    if (publishedCount !== undefined && unpublishedCount !== undefined) {
        if (unpublishedCount > 0) {
            return (
                <div className="bg-amber-100 dark:bg-amber-900/40 border-b border-amber-200 dark:border-amber-700/50 px-4 py-2 flex items-center justify-center shrink-0 w-full mb-2">
                    <span className="text-amber-800 dark:text-amber-200 text-xs font-semibold uppercase tracking-wider flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                        Draft Mode — {unpublishedCount} Unpublished {unpublishedCount === 1 ? 'Item' : 'Items'} ({publishedCount} Published)
                    </span>
                </div>
            );
        } else if (publishedCount > 0) {
            return (
                <div className="bg-green-100 dark:bg-green-900/40 border-b border-green-200 dark:border-green-700/50 px-4 py-2 flex items-center justify-center shrink-0 w-full mb-2">
                    <span className="text-green-800 dark:text-green-200 text-xs font-semibold uppercase tracking-wider flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        All {publishedCount} Items Published
                    </span>
                </div>
            );
        }
        return null; // No items
    }

    // Single Item Mode (Legacy)
    if (isPublished) {
        return (
            <div className="bg-green-100 dark:bg-green-900/40 border-b border-green-200 dark:border-green-700/50 px-4 py-1.5 flex items-center justify-center shrink-0 w-full mb-2">
                <span className="text-green-800 dark:text-green-200 text-xs font-semibold uppercase tracking-wider flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    Published Content
                </span>
            </div>
        );
    }

    return (
        <div className="bg-amber-100 dark:bg-amber-900/40 border-b border-amber-200 dark:border-amber-700/50 px-4 py-1.5 flex items-center justify-center shrink-0 w-full mb-2">
            <span className="text-amber-800 dark:text-amber-200 text-xs font-semibold uppercase tracking-wider flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                Draft Mode – Unpublished Content
            </span>
        </div>
    );
};
