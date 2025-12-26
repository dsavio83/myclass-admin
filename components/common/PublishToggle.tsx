import React from 'react';
import { CheckCircleIcon } from '../icons/AdminIcons';

export const PublishToggle: React.FC<{
    isPublished: boolean;
    onToggle: () => void;
    className?: string;
}> = ({ isPublished, onToggle, className }) => (
    <button
        onClick={(e) => { e.stopPropagation(); onToggle(); }}
        className={`p-1 rounded-full backdrop-blur-sm shadow-sm transition-all duration-200 hover:scale-110 active:scale-95 ${isPublished
                ? 'bg-blue-600/90 hover:bg-blue-700 text-white ring-1 ring-blue-400/50'
                : 'bg-white/90 hover:bg-gray-100 text-gray-500 dark:bg-gray-700/90 dark:hover:bg-gray-600 dark:text-gray-400 ring-1 ring-gray-300/50 dark:ring-gray-600/50'
            } ${className || ''}`}
        title={isPublished ? "Published (Click to Unpublish)" : "Draft (Click to Publish)"}
    >
        {isPublished ? (
            <CheckCircleIcon className="w-3.5 h-3.5" />
        ) : (
            <div className="w-3.5 h-3.5 rounded-full border-2 border-current" />
        )}
    </button>
);
