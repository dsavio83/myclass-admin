import React from 'react';
import { EyeOffIcon } from '../icons/AdminIcons';

interface UnpublishedContentMessageProps {
    contentType?: string;
}

export const UnpublishedContentMessage: React.FC<UnpublishedContentMessageProps> = ({ contentType = 'content' }) => (
    <div className="p-8 text-center bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-200 dark:border-amber-800 rounded-xl">
        <div className="w-16 h-16 mx-auto mb-4 bg-amber-100 dark:bg-amber-900/40 rounded-full flex items-center justify-center">
            <EyeOffIcon className="w-8 h-8 text-amber-600 dark:text-amber-400" />
        </div>
        <h3 className="text-lg font-bold text-amber-900 dark:text-amber-100 mb-2">
            இந்த உள்ளடக்கம் இன்னும் வெளியிடப்படவில்லை
        </h3>
        <p className="text-amber-700 dark:text-amber-300">
            This {contentType} is not yet published
        </p>
    </div>
);
