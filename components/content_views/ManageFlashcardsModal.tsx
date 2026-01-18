import React, { useState, useEffect } from 'react';
import { Content } from '../../types';
import { TrashIcon } from '../icons/AdminIcons';
import { processContentForHTML } from '../../utils/htmlUtils';

interface ManageFlashcardsModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentFlashcards: Content[];
    onDelete: (ids: string[]) => Promise<void>;
}

export const ManageFlashcardsModal: React.FC<ManageFlashcardsModalProps> = ({ isOpen, onClose, currentFlashcards, onDelete }) => {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setSelectedIds(new Set());
            setIsDeleting(false);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const toggleSelection = (id: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === currentFlashcards.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(currentFlashcards.map(c => c._id)));
        }
    };

    const handleDelete = async () => {
        if (selectedIds.size === 0) return;
        if (!confirm(`Are you sure you want to delete ${selectedIds.size} flashcards?`)) return;

        setIsDeleting(true);
        try {
            await onDelete(Array.from(selectedIds));
            onClose();
        } catch (error) {
            console.error("Failed to delete", error);
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex justify-center items-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl flex flex-col max-h-[90vh]">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white">Manage Flashcards</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                        <span className="text-2xl">&times;</span>
                    </button>
                </div>

                <div className="p-4 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                checked={currentFlashcards.length > 0 && selectedIds.size === currentFlashcards.length}
                                onChange={toggleSelectAll}
                            />
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Select All ({currentFlashcards.length})</span>
                        </label>
                        <span className="text-sm text-gray-500 ml-4">
                            {selectedIds.size} selected
                        </span>
                    </div>
                    <div>
                        {selectedIds.size > 0 && (
                            <button
                                onClick={handleDelete}
                                disabled={isDeleting}
                                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shadow-sm disabled:opacity-50"
                            >
                                <TrashIcon className="w-4 h-4" />
                                <span>Delete Selected</span>
                            </button>
                        )}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 bg-white dark:bg-gray-800 space-y-2">
                    {currentFlashcards.map((card, index) => (
                        <div
                            key={card._id}
                            className={`flex items-start gap-4 p-4 border rounded-lg cursor-pointer transition-colors ${selectedIds.has(card._id) ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800' : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}
                            onClick={() => toggleSelection(card._id)}
                        >
                            <div className="pt-1">
                                <input
                                    type="checkbox"
                                    className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    checked={selectedIds.has(card._id)}
                                    onChange={() => toggleSelection(card._id)}
                                    onClick={(e) => e.stopPropagation()}
                                />
                            </div>
                            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 block">Front</span>
                                    <div className="text-sm text-gray-800 dark:text-gray-200 prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: processContentForHTML(card.title) }} />
                                </div>
                                <div>
                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 block">Back</span>
                                    <div className="text-sm text-gray-600 dark:text-gray-400 prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: processContentForHTML(card.body) }} />
                                </div>
                            </div>
                        </div>
                    ))}

                    {currentFlashcards.length === 0 && (
                        <div className="text-center py-10 text-gray-500">No flashcards found.</div>
                    )}
                </div>

                <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600">Close</button>
                </div>
            </div>
        </div>
    );
};
