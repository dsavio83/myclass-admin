import React, { useState } from 'react';
import { User, ResourceType } from '../types';
import { ContentDisplay } from './ContentDisplay';
import { NotesIcon, QAIcon, VideoIcon, AudioIcon, QuizIcon } from './icons/ResourceTypeIcons';
import { MenuIcon, XIcon, ChevronDownIcon } from './icons/AdminIcons'; // Assuming generic icons exist or use svgs

interface BelowAveragePageProps {
    lessonId: string | null;
    user: User;
    readOnly?: boolean;
}

export const BelowAveragePage: React.FC<BelowAveragePageProps> = ({ lessonId, user, readOnly = false }) => {
    const [activeTab, setActiveTab] = useState<ResourceType>('notes');
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const tabs: { id: ResourceType; label: string; icon: React.FC<any> }[] = [
        { id: 'notes', label: 'Notes', icon: NotesIcon },
        { id: 'qa', label: 'Questions', icon: QAIcon },
        { id: 'video', label: 'Video', icon: VideoIcon },
        { id: 'audio', label: 'Audio', icon: AudioIcon },
        { id: 'quiz', label: 'Quiz', icon: QuizIcon },
    ];

    const activeTabLabel = tabs.find(t => t.id === activeTab)?.label;

    return (
        <div className="h-full flex flex-col bg-gray-50 dark:bg-black">
            {/* Header / Tabs */}
            <div className="shrink-0 bg-white dark:bg-black border-b border-gray-200 dark:border-gray-700 shadow-sm z-20 relative">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        {/* Title */}
                        <div className="flex items-center gap-3">
                            <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-rose-600 to-orange-600 dark:from-rose-400 dark:to-orange-400">
                                D+ Content
                            </h2>
                            <span className="hidden sm:inline-block h-6 w-px bg-gray-300 dark:bg-gray-600 mx-2"></span>
                            <span className="hidden sm:inline-block text-sm font-medium text-gray-500 dark:text-white">
                                {activeTabLabel}
                            </span>
                        </div>

                        {/* Desktop Tabs (Inline) */}
                        <div className="hidden md:flex items-center gap-2">
                            {tabs.map(tab => {
                                const Icon = tab.icon;
                                const isActive = activeTab === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`
                                            flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold transition-all duration-200
                                            ${isActive
                                                ? 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 shadow-sm'
                                                : 'text-gray-600 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-900 hover:text-gray-900 dark:hover:text-white border border-transparent'}
                                        `}
                                    >
                                        <Icon className={`w-4 h-4 ${isActive ? 'text-rose-600 dark:text-rose-400' : 'text-gray-400'}`} />
                                        {tab.label}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Mobile Menu Button */}
                        <div className="flex md:hidden">
                            <button
                                onClick={() => setIsMenuOpen(!isMenuOpen)}
                                className="p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-white dark:hover:bg-gray-800 focus:outline-none"
                            >
                                <span className="sr-only">Open menu</span>
                                {/* Hamburger / Close Icon */}
                                {isMenuOpen ? (
                                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                ) : (
                                    <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                                        <span className="text-sm font-semibold text-gray-700 dark:text-white">{activeTabLabel}</span>
                                        <ChevronDownIcon className="w-4 h-4 text-gray-500" />
                                    </div>
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile Collapsible Menu */}
                {isMenuOpen && (
                    <div className="md:hidden border-t border-gray-200 dark:border-gray-700 animate-fade-in-down absolute w-full bg-white dark:bg-black shadow-lg">
                        <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 grid grid-cols-2 gap-2">
                            {tabs.map(tab => {
                                const Icon = tab.icon;
                                const isActive = activeTab === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => {
                                            setActiveTab(tab.id);
                                            setIsMenuOpen(false);
                                        }}
                                        className={`
                                            flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium w-full transition-colors
                                            ${isActive
                                                ? 'bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300 border border-rose-100 dark:border-rose-800'
                                                : 'text-gray-600 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-900 hover:text-gray-900 dark:hover:text-white border border-transparent'}
                                        `}
                                    >
                                        <div className={`p-2 rounded-lg ${isActive ? 'bg-white dark:bg-rose-900/40' : 'bg-gray-100 dark:bg-gray-800'}`}>
                                            <Icon className={`w-5 h-5 ${isActive ? 'text-rose-600 dark:text-rose-400' : 'text-gray-500'}`} />
                                        </div>
                                        {tab.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* Content Display Area */}
            <div className="flex-1 overflow-hidden relative">
                <ContentDisplay
                    lessonId={lessonId}
                    selectedResourceType={activeTab}
                    user={readOnly ? { ...user, role: 'student', canEdit: false } : user}
                    category="below_average_d_plus"
                />
            </div>
        </div>
    );
};
