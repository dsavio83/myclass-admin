import React, { useState, useEffect } from 'react';
import { Content, ResourceType } from '../../types';
import * as api from '../../services/api';
import { useApi } from '../../hooks/useApi';
import { XIcon, CheckCircleIcon, PlusIcon } from '../icons/AdminIcons';

interface StandardContentPickerProps {
    isOpen: boolean;
    onClose: () => void;
    onImport: (selectedItems: Content[]) => void;
    lessonId: string;
    resourceType: ResourceType;
}

export const StandardContentPicker: React.FC<StandardContentPickerProps> = ({
    isOpen,
    onClose,
    onImport,
    lessonId,
    resourceType
}) => {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // Fetch standard content only
    const { data: groupedContent, isLoading } = useApi(
        () => api.getContentsByLessonId(lessonId, [resourceType], false, 'standard'),
        [lessonId, resourceType, isOpen],
        isOpen // Only fetch when open
    );

    const contentList = groupedContent?.[0]?.docs || [];

    useEffect(() => {
        if (!isOpen) {
            setSelectedIds(new Set());
        }
    }, [isOpen]);

    const toggleSelection = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedIds(newSet);
    };

    const handleImport = () => {
        const selectedItems = contentList.filter(c => selectedIds.has(c._id));
        onImport(selectedItems);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[80vh] border border-gray-200 dark:border-gray-700">

                {/* Header */}
                <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800 dark:text-white">
                            Link Existing Content
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Select standard content to copy to Below Average [D+]
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                        <XIcon className="w-6 h-6" />
                    </button>
                </div>

                {/* Content List */}
                <div className="flex-1 overflow-y-auto p-5">
                    {isLoading ? (
                        <div className="flex justify-center items-center h-40">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        </div>
                    ) : contentList.length === 0 ? (
                        <div className="text-center py-10 text-gray-500 dark:text-gray-400">
                            No standard content found for this lesson.
                        </div>
                    ) : (
                        <div className="grid gap-3">
                            {contentList.map(item => (
                                <div
                                    key={item._id}
                                    onClick={() => toggleSelection(item._id)}
                                    className={`
                                        group relative p-4 rounded-lg border-2 cursor-pointer transition-all duration-200
                                        ${selectedIds.has(item._id)
                                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                            : 'border-transparent bg-gray-50 dark:bg-gray-700/50 hover:border-gray-300 dark:hover:border-gray-600'}
                                    `}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className={`
                                            w-5 h-5 rounded-full border flex items-center justify-center mt-0.5 shrink-0 transition-colors
                                            ${selectedIds.has(item._id)
                                                ? 'bg-blue-600 border-blue-600 text-white'
                                                : 'border-gray-400 group-hover:border-blue-400'}
                                        `}>
                                            {selectedIds.has(item._id) && <CheckCircleIcon className="w-3.5 h-3.5" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-semibold text-gray-800 dark:text-gray-200 truncate">
                                                {item.title || '(Untitled)'}
                                            </h3>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
                                                {item.body ? item.body.substring(0, 100) : (item.originalFileName || 'No description')}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-5 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3 bg-gray-50 dark:bg-gray-800/50 rounded-b-xl">
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleImport}
                        disabled={selectedIds.size === 0}
                        className="px-5 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                    >
                        <PlusIcon className="w-4 h-4" />
                        Link Selected ({selectedIds.size})
                    </button>
                </div>
            </div>
        </div>
    );
};
