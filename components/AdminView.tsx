import React, { useState, useCallback, useEffect } from 'react';
import { CascadeSelectors } from './CascadeSelectors';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { AdminSidebar } from './AdminSidebar';
import { ManagementPage } from './ManagementPage';
import { ClassManagement } from './ClassManagement';
import { UserManagement } from './UserManagement';
import { QuizConfiguration } from './QuizConfiguration';
import { ReportsPage } from './ReportsPage';
import { ProfilePage } from './ProfilePage';
import { AdminCollectionsPanel } from './AdminCollectionsPanel';
import { ResourceType } from '../types';
import { ContentDisplay } from './ContentDisplay';
import { useSession } from '../context/SessionContext';
import { AdminState } from '../types';
import { useScrollPersistence } from '../hooks/useScrollPersistence';
import { SelectionRestorationIndicator } from './SelectionRestorationIndicator';
import { DownloadLogsPage } from './admin/DownloadLogsPage';
import { TeacherRequests } from './TeacherRequests';

export const AdminView: React.FC = () => {
    // ... (rest of imports are fine, just adding TeacherRequests at top and switch case below)
    // I will use multi_replace for this to be clean or just split standard replace.
    // Actually, I can just add the import at the top first, then the case.
    // Wait, replace_file_content only works for contiguous blocks. I'll use multi_replace.

    const { session, logout, updateAdminState } = useSession();
    const { user, adminState: state } = session;

    // Check if device is mobile
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;

    const [sidebarOpen, setSidebarOpen] = useState(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('sidebarOpen');
            if (saved !== null) return JSON.parse(saved);
        }
        return !isMobile;
    });
    const [adminSidebarOpen, setAdminSidebarOpen] = useState(false); // Default to closed

    const [isProfilePageOpen, setIsProfilePageOpen] = useState(false);

    // Handle window resize to update sidebar states for mobile view
    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth < 640;
            if (mobile) {
                setSidebarOpen(false);
            } else {
                setSidebarOpen(true);
            }
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Persist sidebar state
    useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('sidebarOpen', JSON.stringify(sidebarOpen));
        }
    }, [sidebarOpen]);

    // Use scroll persistence hook
    const { scrollElementRef, handleScroll } = useScrollPersistence(
        state.scrollPosition,
        (position) => updateAdminState({ scrollPosition: position }),
        [state.classId, state.subjectId, state.unitId, state.subUnitId, state.lessonId, state.selectedResourceType, state.activePage]
    );

    // Reset scroll position when navigation state changes (but not scroll itself)
    const updateStateAndResetScroll = useCallback((updates: Partial<AdminState>) => {
        updateAdminState({ ...updates, scrollPosition: 0 });
    }, [updateAdminState]);

    const handleClassChange = useCallback((id: string | null) => {
        updateStateAndResetScroll({ classId: id, subjectId: null, unitId: null, subUnitId: null, lessonId: null, selectedResourceType: null });
        // Auto-hide regular sidebar on mobile when selection changes, but keep admin sidebar open
        if (isMobile) {
            setSidebarOpen(false);
            // Keep admin sidebar open for better UX
        }
    }, [updateStateAndResetScroll, isMobile]);

    const handleSubjectChange = useCallback((id: string | null) => {
        updateStateAndResetScroll({ subjectId: id, unitId: null, subUnitId: null, lessonId: null, selectedResourceType: null });
        // Auto-hide regular sidebar on mobile when selection changes, but keep admin sidebar open
        if (isMobile) {
            setSidebarOpen(false);
            // Keep admin sidebar open for better UX
        }
    }, [updateStateAndResetScroll, isMobile]);

    const handleUnitChange = useCallback((id: string | null) => {
        updateStateAndResetScroll({ unitId: id, subUnitId: null, lessonId: null, selectedResourceType: null });
        // Auto-hide regular sidebar on mobile when selection changes, but keep admin sidebar open
        if (isMobile) {
            setSidebarOpen(false);
            // Keep admin sidebar open for better UX
        }
    }, [updateStateAndResetScroll, isMobile]);

    const handleSubUnitChange = useCallback((id: string | null) => {
        updateStateAndResetScroll({ subUnitId: id, lessonId: null, selectedResourceType: null });
        // Auto-hide regular sidebar on mobile when selection changes, but keep admin sidebar open
        if (isMobile) {
            setSidebarOpen(false);
            // Keep admin sidebar open for better UX
        }
    }, [updateStateAndResetScroll, isMobile]);

    const handleLessonChange = useCallback((id: string | null) => {
        updateStateAndResetScroll({ lessonId: id, selectedResourceType: id ? 'book' : null });
        // Auto-hide regular sidebar on mobile when selection changes, but keep admin sidebar open
        if (isMobile) {
            setSidebarOpen(false);
            // Keep admin sidebar open for better UX
        }
    }, [updateStateAndResetScroll, isMobile]);

    const handleSelectResourceType = useCallback((resourceType: ResourceType) => {
        updateStateAndResetScroll({ selectedResourceType: resourceType });
        // Auto-hide regular sidebar on mobile when menu item is selected, but keep admin sidebar open
        if (isMobile) {
            setSidebarOpen(false);
            // Keep admin sidebar open for better UX
        }
    }, [updateStateAndResetScroll, isMobile]);

    const handleSetActivePage = useCallback((page: string) => {
        updateStateAndResetScroll({ activePage: page });
        // Auto-hide regular sidebar on mobile when page changes, but keep admin sidebar open
        if (isMobile) {
            setSidebarOpen(false);
            // Keep admin sidebar open for better UX
        }
    }, [updateStateAndResetScroll, isMobile]);

    const handleProfile = useCallback(() => {
        setIsProfilePageOpen(!isProfilePageOpen);
    }, [isProfilePageOpen]);

    if (!user) {
        return null;
    }

    // Determine if user has full admin access
    const isFullAdmin = user.role === 'admin';

    const renderContent = () => {
        if (isProfilePageOpen) {
            return (
                <div className="h-full overflow-y-auto">
                    <ProfilePage
                        user={user}
                        onBack={() => setIsProfilePageOpen(false)}
                    />
                </div>
            );
        }

        switch (state.activePage) {
            case 'browser':
                return (
                    <div className="flex flex-col h-full">
                        <CascadeSelectors
                            classId={state.classId}
                            subjectId={state.subjectId}
                            unitId={state.unitId}
                            subUnitId={state.subUnitId}
                            lessonId={state.lessonId}
                            onClassChange={handleClassChange}
                            onSubjectChange={handleSubjectChange}
                            onUnitChange={handleUnitChange}
                            onSubUnitChange={handleSubUnitChange}
                            onLessonChange={handleLessonChange}
                            onlyPublished={user.role !== 'admin' && !user.canEdit}
                        />
                        <div className="flex-1 overflow-hidden">
                            <ContentDisplay
                                lessonId={state.lessonId}
                                selectedResourceType={state.selectedResourceType}
                                user={user}
                            />
                        </div>
                    </div>
                );
            case 'course-structure':
                return isFullAdmin ? <ClassManagement /> : <div className="p-8 text-center">Access Denied</div>;
            case 'quiz-configuration':
                return <QuizConfiguration />;
            case 'user-management':
                return isFullAdmin ? <UserManagement /> : <div className="p-8 text-center">Access Denied</div>;
            case 'collections-management':
                return isFullAdmin ? <AdminCollectionsPanel /> : <div className="p-8 text-center">Access Denied</div>;
            case 'downloads':
                return isFullAdmin ? <DownloadLogsPage user={user} /> : <div className="p-8 text-center">Access Denied</div>;
            case 'teacher-requests':
                return isFullAdmin ? <TeacherRequests /> : <div className="p-8 text-center">Access Denied</div>;
            case 'reports':
                return <ReportsPage />;
            default:
                return <ManagementPage title={state.activePage} />;
        }
    };

    return (
        <div className="flex flex-col h-screen overflow-hidden">
            <Header
                user={user}
                onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
                onToggleAdminSidebar={() => setAdminSidebarOpen(!adminSidebarOpen)}
                onLogout={logout}
                onProfile={handleProfile}
            />
            <SelectionRestorationIndicator />
            <div className="flex flex-1 overflow-hidden">
                {state.activePage === 'browser' && (
                    <Sidebar
                        lessonId={state.lessonId}
                        selectedResourceType={state.selectedResourceType}
                        onSelectResourceType={handleSelectResourceType}
                        isOpen={sidebarOpen}
                        isMobile={isMobile}
                    />
                )}
                <main
                    ref={scrollElementRef}
                    onScroll={handleScroll}
                    className="flex-1 flex flex-col bg-gray-100 dark:bg-gray-800 overflow-y-auto relative transition-all duration-300 border-l border-gray-200 dark:border-gray-700 h-full">
                    {renderContent()}
                </main>
                <AdminSidebar
                    isOpen={adminSidebarOpen}
                    activePage={state.activePage}
                    setActivePage={handleSetActivePage}
                    userRole={user.role}
                />
            </div>
        </div>
    );
};