import React, { useState, useEffect, useRef } from 'react';
import { useBackgroundTask } from '../../context/BackgroundTaskContext'; // Added
import { Content, User } from '../../types';
import { useApi } from '../../hooks/useApi';
import * as api from '../../services/api';
import { BookIcon } from '../icons/ResourceTypeIcons';
import { TrashIcon, UploadCloudIcon, ExpandIcon, XIcon, SaveIcon, LinkIcon, CheckCircleIcon, EyeIcon } from '../icons/AdminIcons';
import { PublishToggle } from '../common/PublishToggle';
import { UnpublishedContentMessage } from '../common/UnpublishedContentMessage';
import { ContentStatusBanner } from '../common/ContentStatusBanner';
import { ConfirmModal } from '../ConfirmModal';
import { PdfViewer } from './PdfViewer';
import { useToast } from '../../context/ToastContext';
import { formatCount } from '../../utils/formatUtils';
import { useContentUpdate } from '../../context/ContentUpdateContext';

interface BookViewProps {
    lessonId: string;
    user: User;
}

// Utility to convert Base64 to Blob URL for faster PDF rendering (Legacy support)
const useBase64ToBlobUrl = (base64String: string | undefined) => {
    const [blobUrl, setBlobUrl] = useState<string | null>(null);

    useEffect(() => {
        if (!base64String || !base64String.startsWith('data:application/pdf')) {
            setBlobUrl(null);
            return;
        }

        let url: string | null = null;
        const timer = setTimeout(() => {
            try {
                const parts = base64String.split(',');
                const base64 = parts[1];
                const binaryStr = atob(base64);
                const len = binaryStr.length;
                const bytes = new Uint8Array(len);
                for (let i = 0; i < len; i++) {
                    bytes[i] = binaryStr.charCodeAt(i);
                }
                const blob = new Blob([bytes], { type: 'application/pdf' });
                url = URL.createObjectURL(blob);
                setBlobUrl(url);
            } catch (e) {
                setBlobUrl(base64String);
            }
        }, 0);

        return () => {
            clearTimeout(timer);
            if (url) URL.revokeObjectURL(url);
        };
    }, [base64String]);

    return blobUrl;
};

const SavedBookViewer: React.FC<{ content: Content; onRemove: () => void; isAdmin: boolean; onExpand: (url: string) => void; onTogglePublish?: () => void; }> = ({ content, onRemove, isAdmin, onExpand, onTogglePublish }) => {
    // Determine source: prefer valid URL, fallback to body (legacy base64 or URL)
    const fileUrl = content.file?.url;
    // Check if body is base64
    const bodyUrl = content.body || '';
    const isBase64 = bodyUrl.startsWith('data:application/pdf');
    const blobUrl = useBase64ToBlobUrl(isBase64 ? bodyUrl : undefined);

    // Increment view count on mount
    React.useEffect(() => {
        // View count increment removed
    }, [content._id]);

    // Final display URL
    let displayUrl = fileUrl || (isBase64 ? blobUrl : bodyUrl);

    // If using an external link (not Cloudinary, not Base64, not local), route via proxy to avoid CORS
    if (displayUrl && displayUrl.startsWith('http') &&
        !displayUrl.includes('cloudinary.com') &&
        !displayUrl.includes(window.location.hostname)) {

        // Use the API base from env or default
        const API_BASE = (import.meta as any).env.VITE_API_URL || 'http://localhost:5001';
        displayUrl = `${API_BASE}/api/proxy/pdf?url=${encodeURIComponent(displayUrl)}`;
    }

    // Responsive initial scale
    const [isMobile, setIsMobile] = React.useState(false);
    React.useEffect(() => {
        const checkMobile = () => { setIsMobile(window.innerWidth < 768); };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);
    const initialScale = isMobile ? 0.65 : 1.5;

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-2 relative h-full flex flex-col">
            <div className="absolute top-4 right-4 flex gap-2 z-20">
                <button onClick={() => displayUrl && onExpand(displayUrl)} className={`${isMobile ? 'p-3' : 'p-2'} rounded-full bg-white/50 dark:bg-black/50 hover:bg-white/80 dark:hover:bg-black/80 backdrop-blur-sm shadow-md`} title="View Fullscreen">
                    <ExpandIcon className={`${isMobile ? 'w-6 h-6' : 'w-5 h-5'} text-gray-600 dark:text-gray-300`} />
                </button>
                {isAdmin && onTogglePublish && (
                    <div className="" onClick={e => e.stopPropagation()}>
                        <PublishToggle
                            isPublished={!!content.isPublished}
                            onToggle={onTogglePublish}
                        />
                    </div>
                )}
                {isAdmin && (
                    <button onClick={onRemove} className={`${isMobile ? 'p-3' : 'p-2'} rounded-full bg-white/50 dark:bg-black/50 hover:bg-white/80 dark:hover:bg-black/80 backdrop-blur-sm shadow-md`} title="Remove Book">
                        <TrashIcon className={`${isMobile ? 'w-6 h-6' : 'w-5 h-5'} text-gray-600 dark:text-gray-300`} />
                    </button>
                )}
            </div>

            <h2 className="text-lg font-semibold mb-4 pr-24 shrink-0 text-gray-800 dark:text-white truncate" title={content.title}>{content.title}</h2>

            <div className="flex-1 overflow-hidden rounded border dark:border-gray-700 bg-gray-100 dark:bg-gray-900 relative">
                {displayUrl ? (
                    <PdfViewer
                        url={displayUrl}
                        initialScale={initialScale}
                    />
                ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                        Preparing PDF...
                    </div>
                )}
            </div>
        </div>
    );
};

const UploadForm: React.FC<{ lessonId: string; onUpload: () => void; onExpand: (url: string) => void; }> = ({ lessonId, onUpload, onExpand }) => {
    const [activeTab, setActiveTab] = useState<'upload' | 'link'>('upload');
    const [file, setFile] = useState<File | null>(null);
    const [title, setTitle] = useState('');
    const [folderPath, setFolderPath] = useState('');
    const [isSaving, setIsSaving] = useState(false); // MongoDB save state
    const [linkUrl, setLinkUrl] = useState(''); // For Link tab
    const { addTask } = useBackgroundTask(); // Added

    const { showToast } = useToast();
    const [isMobile, setIsMobile] = React.useState(false);

    useEffect(() => {
        const checkMobile = () => { setIsMobile(window.innerWidth < 768); };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Optimized Title & Path Logic
    useEffect(() => {
        const fetchDefaults = async () => {
            // Basic default
            setTitle('New Book');
            setFolderPath('Default/Book');

            try {
                // Try hierarchy for accurate naming
                const hierarchy = await api.getHierarchy(lessonId);

                if (hierarchy) {
                    const { className, subjectName, unitName, subUnitName, lessonName } = hierarchy;

                    // Helper to extract numbers
                    const extractNum = (str: string) => {
                        if (!str) return '0';
                        const match = str.match(/\d+/);
                        return match ? match[0] : '0';
                    };

                    const unitNum = extractNum(unitName);
                    const subUnitNum = extractNum(subUnitName);
                    const lessonNum = extractNum(lessonName);

                    // Required Format: Unit.SubUnit.Lesson.pdf
                    // Example: 4.2.3.pdf
                    const formattedTitle = `${unitNum}.${subUnitNum}.${lessonNum}.pdf`;

                    // Folder Path
                    const cleanPart = (str: string) => str.replace(/[^a-zA-Z0-9]/g, '');
                    const hierarchyParts = [
                        cleanPart(className),
                        cleanPart(subjectName),
                        cleanPart(unitName),
                        subUnitName ? cleanPart(subUnitName) : '',
                        cleanPart(lessonName)
                    ].filter(p => p);

                    const hierarchyPath = hierarchyParts.join('/');

                    setTitle(formattedTitle);
                    setFolderPath(`${hierarchyPath}/Books`);
                }
            } catch (e) {
                console.log('Error fetching defaults', e);
            }
        };
        if (lessonId) fetchDefaults();
    }, [lessonId]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            if (selectedFile.type === "application/pdf") {
                setFile(selectedFile);
            } else {
                showToast("Please select a valid PDF file.", 'error');
                setFile(null);
            }
        }
    };

    // Step 1: Upload to Background Queue
    const handleUploadToCloud = async () => {
        if (!file || !lessonId) return;

        let cleanFolder = folderPath.replace(/^(\.\.\/)?uploads\//, '');

        addTask({
            type: 'upload',
            contentType: 'book',
            title: title,
            file: file,
            lessonId: lessonId,
            folder: cleanFolder,
            mimeType: file.type
        });

        showToast('Book upload started in background', 'info');
        onUpload();
    };

    // Handle Save for the Link Tab
    const handleSaveLink = async () => {
        if (!linkUrl || !title) return;
        setIsSaving(true);
        try {
            await api.addContent({
                title,
                body: linkUrl, // Use body for URL
                lessonId,
                type: 'book',
                metadata: { category: 'External', subCategory: 'Link' } as any
            });
            showToast('Book link saved successfully!', 'success');
            onUpload();
        } catch (e) {
            showToast('Failed to save link.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="w-full max-w-5xl mx-auto bg-white dark:bg-gray-800/80 backdrop-blur-md rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden min-h-[500px] flex flex-col md:flex-row animate-scale-in">
            {/* Left Panel: Settings & Info */}
            <div className="w-full md:w-5/12 p-6 sm:p-8 bg-gray-50/50 dark:bg-gray-900/30 border-r border-gray-100 dark:border-gray-700 flex flex-col">
                <div className="mb-8">
                    <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Configure Content</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Set the title and choose your upload method for the new book.</p>
                </div>

                <div className="space-y-6 flex-1">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Book Title</label>
                        <div className="relative group">
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full pl-4 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                                placeholder="Enter book title..."
                            />
                        </div>
                    </div>

                    <div className="space-y-3">
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Upload Strategy</label>
                        <div className="grid grid-cols-2 gap-2 p-1 bg-gray-200/50 dark:bg-gray-700/50 rounded-xl">
                            <button
                                onClick={() => setActiveTab('upload')}
                                className={`py-2.5 text-xs font-bold rounded-lg transition-all ${activeTab === 'upload'
                                        ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                                        : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                    }`}
                            >
                                <div className="flex items-center justify-center gap-2">
                                    <UploadCloudIcon className="w-4 h-4" />
                                    PDF UPLOAD
                                </div>
                            </button>
                            <button
                                onClick={() => setActiveTab('link')}
                                className={`py-2.5 text-xs font-bold rounded-lg transition-all ${activeTab === 'link'
                                        ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                                        : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                    }`}
                            >
                                <div className="flex items-center justify-center gap-2">
                                    <LinkIcon className="w-4 h-4" />
                                    DIRECT LINK
                                </div>
                            </button>
                        </div>
                    </div>
                </div>

                <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-700 group">
                    <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400 italic">
                        <p>Target Folder: <span className="font-mono text-xs font-semibold text-blue-600 dark:text-blue-400">{folderPath}</span></p>
                    </div>
                </div>
            </div>

            {/* Right Panel: Actions */}
            <div className="w-full md:w-7/12 p-6 sm:p-10 flex flex-col justify-center items-center bg-white dark:bg-gray-800 relative group">
                <div className="w-full max-w-sm">
                    {activeTab === 'upload' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div
                                className={`relative group/drop cursor-pointer transition-all duration-300 ${file ? 'bg-blue-50/50 dark:bg-blue-900/20 border-blue-400' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50 border-gray-300'
                                    } border-2 border-dashed rounded-3xl p-10 text-center flex flex-col items-center justify-center`}
                            >
                                <input id="pdfFile" name="pdfFile" type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileChange} accept=".pdf" />

                                <div className={`p-5 rounded-2xl mb-4 transition-transform group-hover/drop:scale-110 ${file ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-400'}`}>
                                    <UploadCloudIcon className="w-10 h-10" />
                                </div>

                                {file ? (
                                    <div className="animate-in fade-in zoom-in duration-300">
                                        <p className="font-bold text-gray-800 dark:text-white truncate max-w-[200px] mb-1">{file.name}</p>
                                        <p className="text-xs text-blue-500 font-medium">Click to change file</p>
                                    </div>
                                ) : (
                                    <>
                                        <p className="text-lg font-bold text-gray-700 dark:text-gray-200">Drop PDF here</p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">or click to browse</p>
                                    </>
                                )}
                            </div>

                            <button
                                disabled={!file}
                                onClick={handleUploadToCloud}
                                className="w-full py-4 px-6 bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-2xl font-bold shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:grayscale disabled:scale-100 flex items-center justify-center gap-3"
                            >
                                <SaveIcon className="w-6 h-6" />
                                <span>START UPLOAD</span>
                            </button>
                        </div>
                    )}

                    {activeTab === 'link' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Resource Link</label>
                                <input
                                    type="url"
                                    value={linkUrl}
                                    onChange={(e) => setLinkUrl(e.target.value)}
                                    placeholder="https://example.com/file.pdf"
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                />
                                <p className="text-xs text-gray-500 mt-2">Provide a direct link to a hosted PDF file.</p>
                            </div>

                            <button
                                disabled={!linkUrl || isSaving}
                                onClick={handleSaveLink}
                                className="w-full py-4 px-6 bg-gray-900 dark:bg-gray-700 text-white rounded-2xl font-bold shadow-xl hover:shadow-2xl hover:bg-black dark:hover:bg-gray-600 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                            >
                                {isSaving ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        <span>SAVING...</span>
                                    </>
                                ) : (
                                    <>
                                        <LinkIcon className="w-6 h-6" />
                                        <span>SAVE DIRECT LINK</span>
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export const BookView: React.FC<BookViewProps> = ({ lessonId, user }) => {
    const [version, setVersion] = useState(0);
    const { triggerContentUpdate, updateVersion } = useContentUpdate(); // Added updateVersion

    const { data: groupedContent, isLoading } = useApi(
        () => api.getContentsByLessonId(lessonId, ['book'], (user.role !== 'admin' && !user.canEdit)),
        [lessonId, version, user, updateVersion]
    );

    const [confirmModalState, setConfirmModalState] = useState<{ isOpen: boolean; onConfirm: (() => void) | null }>({ isOpen: false, onConfirm: null });
    const [fullscreenPdfUrl, setFullscreenPdfUrl] = useState<string | null>(null);
    const [stats, setStats] = useState<{ count: number } | null>(null);
    const { showToast } = useToast();

    useEffect(() => {
        const updateStats = async () => {
            // Removed view increment calling
        };
        updateStats();
    }, [lessonId]);

    const bookContent = groupedContent?.[0]?.docs[0];
    const canEdit = user.role === 'admin' || !!user.canEdit;

    const handleDelete = (contentId: string) => {
        const confirmAction = async () => {
            await api.deleteContent(contentId);
            setVersion(v => v + 1);
            triggerContentUpdate(); // Update sidebar counts
            showToast('Book deleted successfully.', 'success');
            setConfirmModalState({ isOpen: false, onConfirm: null });
        };
        setConfirmModalState({ isOpen: true, onConfirm: confirmAction });
    };

    const handleTogglePublish = async () => {
        if (!bookContent) return;
        try {
            const newStatus = !bookContent.isPublished;
            await api.updateContent(bookContent._id, { isPublished: newStatus });
            setVersion(v => v + 1);
            triggerContentUpdate(); // Update sidebar counts
            showToast(`Book ${newStatus ? 'published' : 'unpublished'} successfully`, 'success');
        } catch (error) {
            console.error('Failed to toggle publish status:', error);
            showToast('Failed to update publish status', 'error');
        }
    };

    return (
        <div className="h-full overflow-hidden flex flex-col relative">
            {/* Content Status Banner */}
            {bookContent && canEdit && (
                <ContentStatusBanner isPublished={!!bookContent.isPublished} />
            )}

            <div className="p-4 sm:p-6 lg:p-8 flex-1 overflow-hidden flex flex-col min-h-0">
                <div className="hidden sm:flex justify-between items-center mb-6 shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-3">
                            <BookIcon className="w-8 h-8 text-blue-600" />
                            <h1 className="text-lg sm:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-blue-600 dark:from-white dark:to-blue-400">Book</h1>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-hidden min-h-0 flex flex-col">
                    {isLoading && <div className="text-center py-10">Loading book...</div>}

                    {!isLoading && bookContent && (
                        <>
                            {!bookContent.isPublished && !canEdit ? (
                                <UnpublishedContentMessage contentType="book" />
                            ) : (
                                <SavedBookViewer
                                    content={bookContent}
                                    onRemove={() => handleDelete(bookContent._id)}
                                    isAdmin={canEdit}
                                    onExpand={setFullscreenPdfUrl}
                                    onTogglePublish={handleTogglePublish}
                                />
                            )}
                        </>
                    )}

                    {!isLoading && !bookContent && (
                        canEdit ? (
                            <UploadForm lessonId={lessonId} onUpload={() => {
                                setVersion(v => v + 1);
                                triggerContentUpdate();
                            }} onExpand={setFullscreenPdfUrl} />
                        ) : (
                            <div className="text-center py-20 bg-white dark:bg-gray-800/50 rounded-lg">
                                <BookIcon className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600" />
                                <p className="mt-4 text-gray-500">No book available.</p>
                            </div>
                        )
                    )}
                </div>
            </div>

            <ConfirmModal
                isOpen={confirmModalState.isOpen}
                onClose={() => setConfirmModalState({ isOpen: false, onConfirm: null })}
                onConfirm={confirmModalState.onConfirm}
                title="Remove Book"
                message="Are you sure you want to remove this book? This action cannot be undone."
            />
            {fullscreenPdfUrl && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex flex-col animate-fade-in h-screen w-screen">
                    <div className="hidden md:flex justify-end p-2 bg-black/50 absolute top-0 right-0 z-50 rounded-bl-lg">
                        <button
                            onClick={() => setFullscreenPdfUrl(null)}
                            className="p-2 rounded-full bg-red-600/80 hover:bg-red-500 text-white transition-colors"
                            aria-label="Close fullscreen PDF viewer"
                        >
                            <XIcon className="w-6 h-6" />
                        </button>
                    </div>
                    <div className="md:hidden fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50">
                        <button
                            onClick={() => setFullscreenPdfUrl(null)}
                            className="p-3 rounded-full bg-red-600/80 hover:bg-red-500 text-white transition-colors backdrop-blur-sm shadow-lg"
                            aria-label="Close fullscreen PDF viewer"
                        >
                            <XIcon className="w-6 h-6" />
                        </button>
                    </div>
                    <div className="w-full h-full pt-12 md:pt-0">
                        <PdfViewer
                            url={fullscreenPdfUrl}
                            initialScale={2.5}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};