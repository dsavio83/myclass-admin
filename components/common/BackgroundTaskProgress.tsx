import React, { useState } from 'react';
import { useBackgroundTask, UploadTask } from '../../context/BackgroundTaskContext';
import { formatCount } from '../../utils/formatUtils'; // Assuming exists, otherwise remove
import { UploadCloudIcon, CheckCircleIcon, XIcon, TrashIcon } from '../icons/AdminIcons'; // Reusing icons

export const BackgroundTaskProgress: React.FC = () => {
    const { tasks, clearCompleted } = useBackgroundTask();
    const [isExpanded, setIsExpanded] = useState(true);

    if (tasks.length === 0) return null;

    const activeTask = tasks.find(t => t.status === 'uploading');
    const completedTasks = tasks.filter(t => t.status === 'completed');
    const pendingTasks = tasks.filter(t => t.status === 'pending');
    const errorTasks = tasks.filter(t => t.status === 'error');

    // If only completed tasks exist, auto-hide after a timeout? 
    // For now, let's keep them visible until user clears or navigates (if we wanted).
    // Better: Allow user to clear.

    const totalCount = tasks.length;
    const completedCount = completedTasks.length;

    // Toggle expand/collapse
    const toggleExpand = () => setIsExpanded(!isExpanded);

    return (
        <div className={`fixed bottom-4 right-4 z-[9999] transition-all duration-300 ${isExpanded ? 'w-80' : 'w-auto'}`}>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col">

                {/* Header */}
                <div
                    className="p-3 bg-gray-900 text-white flex items-center justify-between cursor-pointer"
                    onClick={toggleExpand}
                >
                    <div className="flex items-center gap-2">
                        {activeTask ? (
                            <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                        ) : (
                            <UploadCloudIcon className="w-5 h-5 text-gray-300" />
                        )}
                        <span className="font-semibold text-sm">
                            {activeTask ? 'Uploading...' : 'Background Tasks'}
                        </span>
                        <span className="bg-gray-700 text-xs px-2 py-0.5 rounded-full">
                            {completedCount}/{totalCount}
                        </span>
                    </div>
                    <div className="flex items-center gap-1">
                        {/* Chevron Logic could be here */}
                    </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                    <div className="max-h-60 overflow-y-auto p-0">
                        {/* Active Task */}
                        {activeTask && (
                            <div className="p-3 border-b border-gray-100 dark:border-gray-700 bg-blue-50 dark:bg-blue-900/10">
                                <div className="flex justify-between mb-1">
                                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate pr-2">{activeTask.title}</span>
                                    <span className="text-xs text-blue-600 dark:text-blue-400 font-bold">{activeTask.progress}%</span>
                                </div>
                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                    <div
                                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                        style={{ width: `${activeTask.progress}%` }}
                                    />
                                </div>
                                <div className="text-xs text-gray-500 mt-1 flex justify-between">
                                    <span>{activeTask.contentType}</span>
                                </div>
                            </div>
                        )}

                        {/* Queue List */}
                        <div className="divide-y divide-gray-100 dark:divide-gray-700">
                            {/* Pending */}
                            {pendingTasks.map(task => (
                                <div key={task.id} className="p-3 flex items-center gap-3 opacity-70">
                                    <div className="w-8 h-8 rounded bg-gray-100 dark:bg-gray-700 flex items-center justify-center shrink-0">
                                        <UploadCloudIcon className="w-4 h-4 text-gray-400" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{task.title}</p>
                                        <p className="text-xs text-gray-500">Pending...</p>
                                    </div>
                                </div>
                            ))}

                            {/* Completed */}
                            {completedTasks.map(task => (
                                <div key={task.id} className="p-3 flex items-center gap-3 bg-white dark:bg-gray-800">
                                    <div className="w-8 h-8 rounded bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
                                        <CheckCircleIcon className="w-4 h-4 text-green-600 dark:text-green-400" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{task.title}</p>
                                        <p className="text-xs text-green-600 dark:text-green-400">Completed</p>
                                    </div>
                                </div>
                            ))}

                            {/* Errors */}
                            {errorTasks.map(task => (
                                <div key={task.id} className="p-3 flex items-center gap-3 bg-red-50 dark:bg-red-900/10">
                                    <div className="w-8 h-8 rounded bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
                                        <XIcon className="w-4 h-4 text-red-600 dark:text-red-400" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-medium text-gray-900 dark:text-red-200 truncate">{task.title}</p>
                                        <p className="text-xs text-red-500 truncate">{task.error}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Footer Actions */}
                {isExpanded && (completedTasks.length > 0 || errorTasks.length > 0) && (
                    <div className="p-2 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700 flex justify-end">
                        <button
                            onClick={clearCompleted}
                            className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 px-2 py-1 flex items-center gap-1"
                        >
                            <TrashIcon className="w-3 h-3" />
                            Clear Completed
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
