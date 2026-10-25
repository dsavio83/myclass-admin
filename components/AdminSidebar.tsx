import React from 'react';
import { UserRole } from '../types';
import { BookIcon, DPlusIcon } from './icons/ResourceTypeIcons';
import { DownloadIcon, SettingsIcon, UsersIcon } from './icons/AdminIcons';

interface AdminSidebarProps {
    isOpen: boolean;
    activePage: string;
    setActivePage: (page: string) => void;
    userRole: UserRole;
}

const StructureIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="3" width="6" height="5" rx="1" /><rect x="15" y="16" width="6" height="5" rx="1" /><rect x="3" y="16" width="6" height="5" rx="1" />
        <path d="M6 8v4m0 0h12m0 0v4M6 12v4" />
    </svg>
);

const DatabaseIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <ellipse cx="12" cy="5" rx="8" ry="3" /><path d="M4 5v14c0 1.66 3.58 3 8 3s8-1.34 8-3V5M4 12c0 1.66 3.58 3 8 3s8-1.34 8-3" />
    </svg>
);

const UserRequestIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 5.5a3.5 3.5 0 0 1 0 6.8M18 16l1.5 1.5L22 15" />
    </svg>
);

const ReportIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M6 3h8l4 4v14H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" /><path d="M14 3v5h5M8 16l2.5-2.5 2 1.5 3.5-4" />
    </svg>
);

const AnalyticsIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 20h18" /><rect x="5" y="11" width="3" height="7" rx=".5" /><rect x="11" y="7" width="3" height="11" rx=".5" /><rect x="17" y="3" width="3" height="15" rx=".5" />
    </svg>
);

const allManagementLinks = [
    { id: 'browser', label: 'Content Browser', icon: BookIcon, roles: ['admin', 'teacher'] },
    { id: 'below-average', label: 'Below Average [D+]', icon: DPlusIcon, roles: ['admin', 'teacher'] },
    { id: 'course-structure', label: 'Course Structure Management', icon: StructureIcon, roles: ['admin'] },
    { id: 'quiz-configuration', label: 'Quiz Configuration', icon: SettingsIcon, roles: ['admin', 'teacher'] },
    { id: 'user-management', label: 'User Management', icon: UsersIcon, roles: ['admin'] },
    { id: 'collections-management', label: 'Database Management', icon: DatabaseIcon, roles: ['admin'] },
    { id: 'downloads', label: 'Download Logs', icon: DownloadIcon, roles: ['admin'] },
    { id: 'teacher-requests', label: 'Teacher Requests', icon: UserRequestIcon, roles: ['admin'] },
    { id: 'reports', label: 'Reports', icon: ReportIcon, roles: ['admin', 'teacher'] },
    { id: 'analytics', label: 'Analytics', icon: AnalyticsIcon, roles: ['admin', 'teacher'] },
];

export const AdminSidebar: React.FC<AdminSidebarProps> = ({ isOpen, activePage, setActivePage, userRole }) => {

    const visibleLinks = allManagementLinks.filter(link => link.roles.includes(userRole));

    return (
        <aside className={`flex flex-col bg-white dark:bg-black border-l border-gray-200 dark:border-gray-700 transition-all duration-300 ease-in-out ${isOpen ? 'w-72' : 'w-0'} overflow-hidden shrink-0`}>
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
                    {userRole === 'admin' ? 'Admin Panel' : 'Editor Panel'}
                </h2>
            </div>
            <nav className="flex-1 p-4 space-y-2">
                {visibleLinks.map(link => {
                    const Icon = link.icon;
                    return (
                    <button
                        key={link.id}
                        onClick={() => setActivePage(link.id)}
                        className={`w-full flex items-center gap-2 text-left px-3 py-2 text-sm font-medium rounded-md transition-colors ${activePage === link.id
                            ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                            : 'hover:bg-gray-100 dark:hover:bg-gray-900 text-gray-600 dark:text-white'
                            }`}
                    >
                        <Icon className="w-5 h-5 shrink-0" />
                        <span>{link.label}</span>
                    </button>
                    );
                })}
            </nav>
        </aside>
    );
};