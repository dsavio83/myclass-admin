import React, { useState, useEffect } from 'react';
import * as api from '../../services/api';
import { DownloadIcon, EyeIcon, XIcon } from '../icons/AdminIcons';

interface DownloadLogsPageProps {
    user: any;
}

export const DownloadLogsPage: React.FC<DownloadLogsPageProps> = ({ user }) => {
    const [activeTab, setActiveTab] = useState<'success' | 'failed'>('success');
    const [downloads, setDownloads] = useState<api.DownloadLog[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState<any>(null);

    useEffect(() => {
        fetchStats();
    }, []);

    useEffect(() => {
        fetchDownloads();
    }, [activeTab, page]);

    const fetchStats = async () => {
        try {
            const response = await api.getDownloadStats();
            setStats(response.stats);
        } catch (error) {
            console.error('Failed to fetch stats:', error);
        }
    };

    const fetchDownloads = async () => {
        setLoading(true);
        try {
            const response = await api.getDownloadLogs(activeTab, page, 50);
            setDownloads(response.downloads);
            setPagination(response.pagination);
        } catch (error) {
            console.error('Failed to fetch downloads:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString: string) => {
        try {
            const date = new Date(dateString);
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            return `${day}/${month}/${year} ${hours}:${minutes}`;
        } catch {
            return dateString;
        }
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 h-full flex flex-col overflow-hidden bg-gray-50 dark:bg-gray-900">
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center">
                    <DownloadIcon className="w-8 h-8 mr-3 text-blue-500" />
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Download Logs</h1>
                </div>
            </div>

            {/* Stats Cards */}
            {stats && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Total Downloads</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
                            </div>
                            <DownloadIcon className="w-10 h-10 text-blue-500" />
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Successful</p>
                                <p className="text-2xl font-bold text-green-600">{stats.success}</p>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Failed</p>
                                <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                                <XIcon className="w-6 h-6 text-red-600" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Success Rate</p>
                                <p className="text-2xl font-bold text-blue-600">{stats.successRate}%</p>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Tabs */}
            <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6 bg-white dark:bg-gray-800 rounded-t-lg">
                <button
                    onClick={() => { setActiveTab('success'); setPage(1); }}
                    className={`flex-1 py-3 px-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'success'
                        ? 'border-green-500 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20'
                        : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}
                >
                    <span className="flex items-center justify-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Success Downloads ({stats?.success || 0})
                    </span>
                </button>
                <button
                    onClick={() => { setActiveTab('failed'); setPage(1); }}
                    className={`flex-1 py-3 px-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'failed'
                        ? 'border-red-500 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20'
                        : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}
                >
                    <span className="flex items-center justify-center gap-2">
                        <XIcon className="w-5 h-5" />
                        Failed Downloads ({stats?.failed || 0})
                    </span>
                </button>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto bg-white dark:bg-gray-800 rounded-lg shadow">
                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="text-gray-500">Loading...</div>
                    </div>
                ) : downloads.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64">
                        <DownloadIcon className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" />
                        <p className="text-gray-500">No downloads found</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Date & Time</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">User</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Content</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Class</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Subject</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Type</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Email Status</th>
                                    {activeTab === 'failed' && (
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Error</th>
                                    )}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {downloads.map((log) => (
                                    <tr key={log._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                                            {formatDate(log.downloadedAt)}
                                        </td>
                                        <td className="px-4 py-3 text-sm">
                                            <div className="font-medium text-gray-900 dark:text-gray-100">{log.userName}</div>
                                            <div className="text-gray-500 dark:text-gray-400 text-xs">{log.userEmail}</div>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 max-w-xs truncate" title={log.contentTitle}>
                                            {log.contentTitle}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                                            {log.className || '-'}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                                            {log.subjectName || '-'}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                                            <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                                                {log.contentType}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                                            {log.emailSent ? (
                                                <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 flex items-center gap-1 w-fit">
                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                    Sent
                                                </span>
                                            ) : (
                                                <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400">
                                                    Not Sent
                                                </span>
                                            )}
                                        </td>
                                        {activeTab === 'failed' && (
                                            <td className="px-4 py-3 text-sm text-red-600 dark:text-red-400 max-w-xs truncate" title={log.errorMessage}>
                                                {log.errorMessage || 'Unknown error'}
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {pagination && pagination.pages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700">
                        <div className="text-sm text-gray-700 dark:text-gray-300">
                            Page {pagination.page} of {pagination.pages} ({pagination.total} total)
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Previous
                            </button>
                            <button
                                onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
                                disabled={page === pagination.pages}
                                className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
