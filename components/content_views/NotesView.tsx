import React, { useState, useEffect, useRef } from 'react';
// Force rebuild
import { formatCount } from '../../utils/formatUtils';
import { Content, User, ResourceType } from '../../types';
import { useApi } from '../../hooks/useApi';
import * as api from '../../services/api';
import { NotesIcon } from '../icons/ResourceTypeIcons';
import { PlusIcon, EditIcon, TrashIcon, DownloadIcon, XIcon, EyeIcon } from '../icons/AdminIcons';
import { PublishToggle } from '../common/PublishToggle';
import { UnpublishedContentMessage } from '../common/UnpublishedContentMessage';
import { ContentStatusBanner } from '../common/ContentStatusBanner';
import { ConfirmModal } from '../ConfirmModal';
import { NoteEditor } from './NoteEditor';
import { useToast } from '../../context/ToastContext';
import { useSession } from '../../context/SessionContext';
import { FontSizeControl } from '../FontSizeControl';
import { processContentForHTML } from '../../utils/htmlUtils';


declare global {
    interface Window {
        MathJax: any;
    }
}

interface NotesViewProps {
    lessonId: string;
    user: User;
}

const ExportEmailModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onExport: (email: string) => void;
    isLoading: boolean;
}> = ({ isOpen, onClose, onExport, isLoading }) => {
    const [email, setEmail] = useState('');

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onExport(email);
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md p-6 transform transition-all scale-100">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">Export Notes to PDF</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                        <XIcon className="w-6 h-6" />
                    </button>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-6 font-medium">
                    Enter your email address to receive the PDF copy of these notes.
                </p>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email Address</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="your@email.com"
                            required
                            className="w-full px-4 py-2 border rounded-lg bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 dark:text-white"
                        />
                    </div>
                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full px-4 py-3 bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-lg hover:from-green-700 hover:to-teal-700 transition-all font-bold shadow-md flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <span>Generating PDF...</span>
                            ) : (
                                <>
                                    <span>Export & Send Mail</span>
                                    <DownloadIcon className="w-5 h-5" />
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const NoteCard: React.FC<{
    item: Content;
    onEdit: (c: Content) => void;
    onDelete: (id: string) => void;
    isAdmin: boolean;
    onTogglePublish?: (item: Content) => void;
}> = ({ item, onEdit, onDelete, isAdmin, onTogglePublish }) => {
    const { session } = useSession();
    const fontStyle = { fontSize: `${session.fontSize}px` };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 sm:px-8 relative group">
            <div
                className="tau-body prose prose-sm dark:prose-invert max-w-none text-black dark:text-white break-words font-tau-paalai"
                style={{
                    fontSize: `${fontStyle.fontSize}`,
                }}
                dangerouslySetInnerHTML={{ __html: processContentForHTML(item.body) }}
            />
            {isAdmin && (
                <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity sm:opacity-0 md:group-hover:opacity-100">
                    {onTogglePublish && (
                        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-full shadow-sm">
                            <PublishToggle
                                isPublished={!!item.isPublished}
                                onToggle={() => onTogglePublish(item)}
                            />
                        </div>
                    )}
                    <button onClick={() => onEdit(item)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-sm" title="Edit Note">
                        <EditIcon className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                    </button>
                    <button onClick={() => onDelete(item._id)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-sm" title="Delete Note">
                        <TrashIcon className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                    </button>
                </div>
            )}
        </div>
    );
};

// Function to remove unformatted duplicate content
const removeUnformattedDuplicates = (html: string): string => {
    // Look for the first proper HTML heading tag
    const headingMatch = html.match(/<h[1-6][^>]*>/i);

    if (headingMatch && headingMatch.index) {
        return html.substring(headingMatch.index);
    }

    // Alternative: Look for the first div with note-section class
    const noteSectionMatch = html.match(/<div class="note-section" /i);
    if (noteSectionMatch && noteSectionMatch.index) {
        return html.substring(noteSectionMatch.index);
    }

    return html;
};


import { useContentUpdate } from '../../context/ContentUpdateContext';
// ... previous imports

export const NotesView: React.FC<NotesViewProps> = ({ lessonId, user }) => {
    const [version, setVersion] = useState(0);
    const { triggerContentUpdate } = useContentUpdate();
    const { data: groupedContent, isLoading } = useApi(() => api.getContentsByLessonId(lessonId, ['notes'], (user.role !== 'admin' && !user.canEdit)), [lessonId, version, user]);
    const [editingNote, setEditingNote] = useState<Content | boolean | null>(null);
    const [confirmModalState, setConfirmModalState] = useState<{ isOpen: boolean; onConfirm: (() => void) | null }>({ isOpen: false, onConfirm: null });
    const [exportModalOpen, setExportModalOpen] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [stats, setStats] = useState<{ downloads: number } | null>(null);
    const { showToast } = useToast();
    const [sweetAlert, setSweetAlert] = useState<{
        show: boolean;
        type: 'loading' | 'success' | 'error';
        title: string;
        message: string;
        phone?: string
    }>({
        show: false,
        type: 'loading',
        title: '',
        message: ''
    });

    const exportContainerRef = useRef<HTMLDivElement>(null);
    const notes = groupedContent?.[0]?.docs || [];
    const resourceType: ResourceType = 'notes';
    const canEdit = user.role === 'admin' || !!user.canEdit;

    useEffect(() => {
        if (window.MathJax && !isLoading && notes.length > 0 && editingNote === null) {
            window.MathJax.typesetPromise();
        }
    }, [notes, isLoading, editingNote]);

    useEffect(() => {
        const updateStats = async () => {
            try {
                const h = await api.getHierarchy(lessonId);
                // Only keep download count
                setStats({ downloads: h.notesDownloadCount || 0 });
            } catch (e) {
                console.error('Failed to fetch stats', e);
            }
        };
        updateStats();
    }, [lessonId]);

    const handleSave = async (body: string, isPublished: boolean) => {
        try {
            if (typeof editingNote === 'object' && editingNote !== null) {
                await api.updateContent(editingNote._id, { body, isPublished });
            } else {
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = body;
                const textContent = tempDiv.textContent || tempDiv.innerText || '';
                const title = textContent.trim().substring(0, 50) || `Note - ${new Date().toLocaleDateString()}`;
                await api.addContent({ title, body, lessonId, type: resourceType, isPublished });
            }
            setVersion(v => v + 1);
            triggerContentUpdate(); // Update sidebar counts
            showToast('Note saved successfully.', 'success');
        } catch (e) {
            showToast('Failed to save note.', 'error');
        }
        setEditingNote(null);
    };

    const handleDelete = (contentId: string) => {
        const confirmAction = async () => {
            try {
                await api.deleteContent(contentId);
                setVersion(v => v + 1);
                triggerContentUpdate(); // Update sidebar counts
                showToast('Note deleted.', 'error');
            } catch (e) {
                showToast('Failed to delete note.', 'error');
            }
            setConfirmModalState({ isOpen: false, onConfirm: null });
        };
        setConfirmModalState({ isOpen: true, onConfirm: confirmAction });
    };

    const handleTogglePublish = async (item: Content) => {
        try {
            const newStatus = !item.isPublished;
            await api.updateContent(item._id, { isPublished: newStatus });
            setVersion(v => v + 1);
            triggerContentUpdate(); // Update sidebar counts
            showToast(`Note ${newStatus ? 'published' : 'unpublished'} successfully`, 'success');
        } catch (error) {
            console.error('Failed to toggle publish status:', error);
            showToast('Failed to update publish status', 'error');
        }
    };

    const handleCancelEdit = () => {
        setEditingNote(null);
    };

    // PDF Export Logic
    const handleExportConfirm = async (email: string) => {
        setIsExporting(true);
        const isAdmin = user.role === 'admin' || user.canEdit;

        setSweetAlert({
            show: true,
            type: 'loading',
            title: 'PDF உருவாக்கப்படுகிறது | Generating PDF',
            message: 'PDF தயாரிக்கப்படுகிறது... தயவுசெய்து காத்திருக்கவும்\n\nGenerating PDF... Please wait'
        });

        try {
            // 1. Fetch Hierarchy details
            const hierarchy = await api.getHierarchy(lessonId);
            const lessonName = hierarchy?.lessonName || 'Notes';

            // 2. Prepare all notes content
            let allNotesHTML = '';
            notes.forEach(note => {
                allNotesHTML += `<div class="note-section" style="margin-bottom: 15px;">${processContentForHTML(note.body)}</div>`;
            });

            if (notes.length === 0) {
                throw new Error('இந்த அத்தியாயத்தில் குறிப்புகள் இல்லை | No notes available for this chapter');
            }

            // Remove unformatted duplicates
            allNotesHTML = removeUnformattedDuplicates(allNotesHTML);

            // Additional cleanup: Remove any leading plain text before the first HTML tag
            const firstHtmlTag = allNotesHTML.match(/<[^>]+>/);
            if (firstHtmlTag && firstHtmlTag.index && firstHtmlTag.index > 0) {
                allNotesHTML = allNotesHTML.substring(firstHtmlTag.index);
            }

            // 3. Generate PDF using Helper
            if (!exportContainerRef.current) throw new Error('Export container missing');

            // Import Helper dynamically or use if imported at top (I will add import)
            const { PdfExportHelper } = await import('../../services/pdfExportHelper');

            const pdfBlob = await PdfExportHelper.generateAndExport(exportContainerRef.current, {
                fileName: lessonName,
                hierarchy: hierarchy,
                contentHTML: allNotesHTML,
                user: user,
                isAdmin: isAdmin,
                email: email,
                onProgress: (msg) => setSweetAlert(prev => ({ ...prev, message: msg + '\n\nPlease wait...' }))
            });

            // 4. Handle PDF distribution based on user role
            if (isAdmin) {
                // ADMIN: Direct download
                const url = URL.createObjectURL(pdfBlob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `${lessonName.replace(/[^a-zA-Z0-9\u0B80-\u0BFF]/g, '_')}_Notes_${new Date().toISOString().slice(0, 10)}.pdf`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);

                // Update download count
                try {
                    const downloadKey = `downloaded_${lessonId}_notes`;
                    if (!sessionStorage.getItem(downloadKey)) {
                        await api.incrementLessonDownload(lessonId, 'notes');
                        sessionStorage.setItem(downloadKey, 'true');
                    }
                } catch (e) {
                    console.error('Failed to update download count:', e);
                }

                setSweetAlert({
                    show: true,
                    type: 'success',
                    title: 'வெற்றி! | Success!',
                    message: 'கோப்பு பதிவிறக்கம் தொடங்கியது!\n\nDownload started successfully!'
                });
            } else {
                // USER: Send via email logic (remains same)
                setSweetAlert({
                    show: true,
                    type: 'loading',
                    title: 'மின்னஞ்சல் அனுப்பப்படுகிறது | Sending Email',
                    message: 'PDF மின்னஞ்சலுக்கு அனுப்பப்படுகிறது...\n\nSending PDF to email...'
                });

                const formData = new FormData();
                formData.append('file', pdfBlob, `${lessonName}_Notes.pdf`);
                formData.append('email', email);
                formData.append('title', `Notes: ${lessonName}`);
                formData.append('lessonId', lessonId);
                formData.append('type', 'notes');
                formData.append('userName', user.name || 'User');

                const res = await fetch('/api/export/send-pdf', {
                    method: 'POST',
                    body: formData,
                });

                const responseData = await res.json();

                if (res.ok && responseData.success) {
                    setSweetAlert({
                        show: true,
                        type: 'success',
                        title: 'வெற்றி! | Success!',
                        message: `PDF உங்கள் மின்னஞ்சலுக்கு அனுப்பப்பட்டது!\n📧 ${email}\n\nSuccess!`
                    });
                } else {
                    throw new Error(responseData.message || 'Error sending email');
                }
            }


            setExportModalOpen(false);
        } catch (error: any) {
            console.error('Export Error:', error);
            const adminPhone = '7904838296';
            setSweetAlert({
                show: true,
                type: 'error',
                title: user.role === 'admin' || user.canEdit ? 'பிழை | Error' : 'மின்னஞ்சல் தோல்வி | Email Failed',
                message: (user.role === 'admin' || user.canEdit)
                    ? `Export தோல்வியடைந்தது: ${error.message}\n\nதொடர்புக்கு: ${adminPhone}`
                    : `PDF மின்னஞ்சலுக்கு அனுப்ப முடியவில்லை.\n(${error.message})\n\nதயவு செய்து நிர்வாகியை தொடர்பு கொள்ளவும்:\n📞 ${adminPhone}`,
                phone: adminPhone
            });
        } finally {
            setIsExporting(false);
            if (exportContainerRef.current) {
                exportContainerRef.current.innerHTML = '';
            }
            // Clean up style if needed (optional)
        }
    };

    const handleExportInitiate = () => {
        if (canEdit) {
            handleExportConfirm(user.email || '');
        } else {
            if (user.email) {
                handleExportConfirm(user.email);
            } else {
                setExportModalOpen(true);
            }
        }
    };

    return (
        <div className="h-full overflow-hidden flex flex-col">
            {canEdit && notes.length > 0 && (
                <ContentStatusBanner
                    publishedCount={notes.filter(n => n.isPublished).length}
                    unpublishedCount={notes.filter(n => !n.isPublished).length}
                />
            )}

            <div className="p-4 sm:p-6 lg:p-8 flex-1 overflow-hidden flex flex-col">
                <div className="flex justify-between items-center mb-6 shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-3">
                            <NotesIcon className="w-8 h-8 text-amber-500" />
                            <h1 className="text-lg sm:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-amber-500 dark:from-white dark:to-amber-400">Notes</h1>
                        </div>
                        {/* View Count next to Title */}
                        {/* View Count Removed */}
                    </div>

                    <div className="flex items-center gap-2">
                        {!editingNote && notes.length > 0 && (
                            <button
                                onClick={handleExportInitiate}
                                className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm"
                                title="Export to PDF"
                            >
                                <DownloadIcon className="w-5 h-5" />
                                <span className="hidden sm:inline">PDF</span>
                                {/* Download Count inside button */}
                                <span className="bg-white/20 px-1.5 py-0.5 rounded text-xs font-semibold ml-1">
                                    {formatCount(stats?.downloads || 0)}
                                </span>
                            </button>
                        )}

                        <FontSizeControl />

                        {canEdit && !editingNote && (
                            <button onClick={() => setEditingNote(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors" title="Add New Note">
                                <PlusIcon className="w-5 h-5" />
                                <span className="hidden sm:inline">Add New</span>
                            </button>
                        )}
                    </div>
                </div>

                {editingNote ? (
                    <div className="tau-body flex-1 overflow-y-auto min-h-0 pb-3 no-scrollbar" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                        <NoteEditor
                            initialValue={typeof editingNote === 'object' && editingNote !== null ? editingNote.body : ''}
                            initialIsPublished={typeof editingNote === 'object' && editingNote !== null ? !!editingNote.isPublished : false}
                            onSave={handleSave}
                            onCancel={handleCancelEdit}
                        />
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto min-h-0 pb-6 no-scrollbar" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                        {isLoading && <div className="text-center py-10">Loading notes...</div>}

                        {!isLoading && notes.length > 0 && (
                            <div className="space-y-[30px] px-2">
                                {notes.map(note => <NoteCard key={note._id} item={note} onEdit={setEditingNote} onDelete={handleDelete} isAdmin={canEdit} onTogglePublish={handleTogglePublish} />)}
                            </div>
                        )}

                        {!isLoading && notes.length === 0 && (
                            <div className="text-center py-20 bg-white dark:bg-gray-800/50 rounded-lg">
                                <NotesIcon className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600" />
                                <p className="mt-4 text-gray-500">No notes available for this chapter.</p>
                            </div>
                        )}
                    </div>
                )}

                <ConfirmModal isOpen={confirmModalState.isOpen} onClose={() => setConfirmModalState({ isOpen: false, onConfirm: null })} onConfirm={confirmModalState.onConfirm} title="Delete Note" message="Are you sure you want to delete this note?" />

                <ExportEmailModal
                    isOpen={exportModalOpen}
                    onClose={() => setExportModalOpen(false)}
                    onExport={handleExportConfirm}
                    isLoading={isExporting}
                />

                {sweetAlert.show && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-8 transform transition-all scale-100 flex flex-col items-center text-center">
                            {sweetAlert.type === 'loading' && (
                                <div className="w-16 h-16 mb-4">
                                    <svg className="animate-spin h-16 w-16 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                </div>
                            )}
                            {sweetAlert.type === 'success' && (
                                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/50 rounded-full flex items-center justify-center mb-4">
                                    <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                                    </svg>
                                </div>
                            )}
                            {sweetAlert.type === 'error' && (
                                <div className="w-16 h-16 bg-red-100 dark:bg-red-900/50 rounded-full flex items-center justify-center mb-4">
                                    <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                                    </svg>
                                </div>
                            )}

                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">{sweetAlert.title}</h3>
                            <p className="text-gray-600 dark:text-gray-300 mb-6 whitespace-pre-line">{sweetAlert.message}</p>

                            {sweetAlert.type !== 'loading' && (
                                <button
                                    onClick={() => setSweetAlert(prev => ({ ...prev, show: false }))}
                                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
                                >
                                    சரி (OK)
                                </button>
                            )}

                            {sweetAlert.phone && sweetAlert.type === 'error' && (
                                <a
                                    href={`tel:${sweetAlert.phone}`}
                                    className="mt-3 w-full py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path>
                                    </svg>
                                    அழை | Call Admin
                                </a>
                            )}
                        </div>
                    </div>
                )}

                <div
                    ref={exportContainerRef}
                    style={{
                        position: 'fixed',
                        top: '-10000px',
                        left: '-10000px',
                        width: '790px',
                        visibility: 'visible',
                        pointerEvents: 'none',
                        zIndex: -9999,
                    }}
                />
            </div>
        </div>
    );
};