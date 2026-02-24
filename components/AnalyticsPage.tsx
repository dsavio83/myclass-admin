import React, { useState, useEffect } from 'react';
import * as api from '../services/api';
import { AnalyticsData } from '../types';
import {
    EyeIcon,
    ChevronDownIcon,
    DownloadIcon,
    PlusIcon,
    CheckCircleIcon as CalendarIcon,
    CollectionIcon as FolderIcon,
    XIcon as SearchIcon
} from './icons/AdminIcons';
import {
    VideoIcon,
    NotesIcon,
    QuizIcon,
    FlashcardIcon,
    SlideIcon
} from './icons/ResourceTypeIcons';
import { formatCount } from '../utils/formatUtils';

const AnalyticsPage: React.FC = () => {
    const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [timeframe, setTimeframe] = useState<'day' | 'week' | 'month' | 'all'>('week');
    const [searchTerm, setSearchTerm] = useState('');

    const fetchAnalytics = async () => {
        setIsLoading(true);
        try {
            const data = await api.getViewAnalytics();
            setAnalytics(data);
        } catch (error) {
            console.error('Failed to fetch analytics:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchAnalytics();
    }, [timeframe]);

    const getIconForType = (type: string) => {
        const iconClass = "w-5 h-5";
        switch (type) {
            case 'video': return <VideoIcon className={iconClass} />;
            case 'notes': return <NotesIcon className={iconClass} />;
            case 'quiz': return <QuizIcon className={iconClass} />;
            case 'flashcard': return <FlashcardIcon className={iconClass} />;
            case 'slide': return <SlideIcon className={iconClass} />;
            default: return <FolderIcon className={iconClass} />;
        }
    };

    if (isLoading && !analytics) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    const filteredLessons = analytics?.topLessons.filter(lesson =>
        lesson.name.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                        <EyeIcon className="w-8 h-8 text-blue-600" />
                        View Analytics
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Track content engagement across your classroom.</p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search lessons..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                        />
                    </div>
                    <button
                        onClick={fetchAnalytics}
                        className="p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        title="Refresh Data"
                    >
                        <PlusIcon className={`w-5 h-5 text-gray-600 dark:text-gray-400 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Overview Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-blue-600">
                            <EyeIcon className="w-6 h-6" />
                        </div>
                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Views</span>
                    </div>
                    <div className="text-3xl font-bold text-gray-900 dark:text-white">
                        {analytics?.totalViews ? formatCount(analytics.totalViews) : 0}
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-xl text-green-600">
                            <FolderIcon className="w-6 h-6" />
                        </div>
                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Chapters Tracked</span>
                    </div>
                    <div className="text-3xl font-bold text-gray-900 dark:text-white">
                        {analytics?.topLessons.length || 0}
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl text-purple-600">
                            <DownloadIcon className="w-6 h-6" />
                        </div>
                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Most Popular Type</span>
                    </div>
                    <div className="text-lg font-bold text-gray-900 dark:text-white capitalize">
                        {analytics?.byType ?
                            Object.entries(analytics.byType).sort((a, b) => (b[1] as number) - (a[1] as number))[0]?.[0] || 'N/A'
                            : 'N/A'
                        }
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-xl text-orange-600">
                            <CalendarIcon className="w-6 h-6" />
                        </div>
                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Last View</span>
                    </div>
                    <div className="text-sm font-semibold text-gray-900 dark:text-white">
                        {analytics?.recentViews[0] ? new Date(analytics.recentViews[0].viewedAt).toLocaleDateString() : 'Never'}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Top Lessons Table */}
                <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                    <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Most Viewed Chapters</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50 dark:bg-gray-900/50">
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Chapter Name</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">Total Views</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Activity</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {filteredLessons.map((lesson, idx) => (
                                    <tr key={lesson._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-semibold text-gray-900 dark:text-white">{lesson.name}</div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="text-lg font-bold text-blue-600">{formatCount(lesson.count)}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-1 text-green-500 font-medium">
                                                Active
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredLessons.length === 0 && (
                                    <tr>
                                        <td colSpan={3} className="px-6 py-10 text-center text-gray-500">No data available for the current filters.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Right Column */}
                <div className="space-y-8">
                    {/* Views by Type Card */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Views by Type</h2>
                        <div className="space-y-4">
                            {analytics?.byType && Object.entries(analytics.byType).map(([type, count]) => (
                                <div key={type} className="group">
                                    <div className="flex items-center justify-between text-sm mb-2">
                                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                                            {getIconForType(type)}
                                            <span className="capitalize">{type}s</span>
                                        </div>
                                        <span className="font-bold text-gray-900 dark:text-white">{formatCount(count as number)}</span>
                                    </div>
                                    <div className="w-full bg-gray-100 dark:bg-gray-700 h-2 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-blue-500 group-hover:bg-blue-400 transition-all duration-500"
                                            style={{ width: `${((count as number) / analytics.totalViews) * 100}%` }}
                                        ></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Recent Views Card */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Recent Activity</h2>
                            <span className="text-xs text-blue-600 font-bold px-2 py-1 bg-blue-50 dark:bg-blue-900/20 rounded-md">Live</span>
                        </div>
                        <div className="space-y-6">
                            {analytics?.recentViews.map((log, idx) => (
                                <div key={idx} className="flex gap-4">
                                    <div className="mt-1">
                                        {getIconForType(log.contentType)}
                                    </div>
                                    <div>
                                        <div className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">
                                            {log.contentType.charAt(0).toUpperCase() + log.contentType.slice(1)} viewed
                                        </div>
                                        <div className="text-xs text-gray-500 mt-0.5">
                                            {new Date(log.viewedAt).toLocaleTimeString()} • {log.ipAddress.replace('::ffff:', '')}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AnalyticsPage;
