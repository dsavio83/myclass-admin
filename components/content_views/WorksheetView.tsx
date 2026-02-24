import React, { useState, useEffect } from 'react';
import { Content, User } from '../../types';
import { useApi } from '../../hooks/useApi';
import { useBackgroundTask } from '../../context/BackgroundTaskContext';
import * as api from '../../services/api';
import { trackView } from '../../services/api';
import { WorksheetIcon } from '../icons/ResourceTypeIcons';
import { TrashIcon, UploadCloudIcon, PlusIcon, DownloadIcon, LinkIcon, XIcon, CheckCircleIcon } from '../icons/AdminIcons';
import { ConfirmModal } from '../ConfirmModal';
import { PdfViewer } from './PdfViewer';
import { useToast } from '../../context/ToastContext';
import { useContentUpdate } from '../../context/ContentUpdateContext';
import { formatCount } from '../../utils/formatUtils';
import { ContentStatusBanner } from '../common/ContentStatusBanner';

interface WorksheetViewProps {
    lessonId: string;
    user: User;
    category?: string;
}

const BeautifulWorksheetCard: React.FC<{
    content: Content;
    onRemove: () => void;
    isAdmin: boolean;
    onExpand: (url: string) => void;
    onDownloadClick: () => void;
    index: number;
    downloading: boolean;
    onTogglePublish?: (item: Content) => void;
}> = ({ content, onRemove, isAdmin, onExpand, onDownloadClick, index, downloading, onTogglePublish }) => {
    const displayUrl = content.file?.url || content.filePath || content.body;
    const downloadCount = content.downloadCount || 0;

    const colorSchemes = [
        { bg: 'from-blue-400 to-indigo-600', icon: 'bg-white/20' },
        { bg: 'from-emerald-400 to-teal-600', icon: 'bg-white/20' },
        { bg: 'from-violet-400 to-purple-600', icon: 'bg-white/20' },
        { bg: 'from-rose-400 to-pink-600', icon: 'bg-white/20' },
        { bg: 'from-amber-400 to-orange-600', icon: 'bg-white/20' },
        { bg: 'from-cyan-400 to-blue-600', icon: 'bg-white/20' }
    ];

    const colorScheme = colorSchemes[index % colorSchemes.length];

    return (
        <div className="group relative bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100 dark:border-gray-700 flex flex-col h-full">
            <div className={`h-32 bg-gradient-to-br ${colorScheme.bg} relative overflow-hidden cursor-pointer`} onClick={() => onExpand(displayUrl)}>
                <div className="absolute inset-0 bg-black/5 group-hover:bg-black/10 transition-colors"></div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                    <div className={`p-4 ${colorScheme.icon} rounded-2xl backdrop-blur-md shadow-inner group-hover:scale-110 transition-transform duration-300`}>
                        <WorksheetIcon className="w-8 h-8 text-white" />
                    </div>
                </div>

                {isAdmin && (
                    <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-all z-10">
                        {onTogglePublish && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onTogglePublish(content); }}
                                className={`p-2 rounded-xl backdrop-blur-md shadow-md transition-all ${content.isPublished ? 'bg-green-500 text-white' : 'bg-white/90 text-gray-500'}`}
                                title={content.isPublished ? "Published" : "Draft"}
                            >
                                <CheckCircleIcon className="w-4 h-4" />
                            </button>
                        )}
                        <button
                            onClick={(e) => { e.stopPropagation(); onRemove(); }}
                            className="p-2 rounded-xl bg-white/90 hover:bg-red-500 hover:text-white text-gray-500 transition-all backdrop-blur-sm"
                            title="Delete"
                        >
                            <TrashIcon className="w-4 h-4" />
                        </button>
                    </div>
                )}
            </div>

            <div className="p-5 flex flex-col flex-1">
                <h3 className="font-bold text-gray-800 dark:text-white mb-4 line-clamp-2 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors" onClick={() => onExpand(displayUrl)}>
                    {content.title}
                </h3>

                <div className="mt-auto flex items-center justify-between">
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-lg text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        PDF Document
                    </div>
                    <button
                        onClick={(e) => { e.stopPropagation(); onDownloadClick(); }}
                        disabled={downloading}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-all shadow-md shadow-blue-500/20 disabled:opacity-50"
                    >
                        {downloading ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <DownloadIcon className="w-3 h-3" />}
                        <span>{formatCount(downloadCount)}</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

const UploadForm: React.FC<{ lessonId: string; existingTitles: string[]; onUploadSuccess: () => void; onCancel: () => void; category?: string; }> = ({ lessonId, existingTitles, onUploadSuccess, onCancel, category }) => {
    const [activeTab, setActiveTab] = useState<'upload' | 'link'>('upload');
    const [title, setTitle] = useState('');
    const [folderPath, setFolderPath] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [url, setUrl] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const { showToast } = useToast();
    const { addTask } = useBackgroundTask();

    useEffect(() => {
        const fetchDefaults = async () => {
            try {
                const hierarchy = await api.getHierarchy(lessonId);
                if (hierarchy) {
                    const { className, subjectName, unitName, subUnitName, lessonName } = hierarchy;
                    const extractNum = (str: string) => (str.match(/\d+/) || ['0'])[0];
                    const uN = extractNum(unitName);
                    const suN = extractNum(subUnitName);
                    const lN = extractNum(lessonName);

                    const baseTitle = `${uN}-${suN}-${lN} Worksheet`;
                    let formattedTitle = baseTitle;
                    let counter = 1;
                    while (existingTitles.some(t => t.toLowerCase() === formattedTitle.toLowerCase())) {
                        formattedTitle = `${baseTitle} (${counter})`;
                        counter++;
                    }

                    const clean = (s: string) => s.replace(/[^a-zA-Z0-9]/g, '');
                    const path = [clean(className), clean(subjectName), clean(unitName), subUnitName ? clean(subUnitName) : '', clean(lessonName)].filter(Boolean).join('/');

                    setTitle(formattedTitle);
                    setFolderPath(`${path}/Worksheets`);
                }
            } catch (e) { console.error(e); }
        };
        if (lessonId) fetchDefaults();
    }, [lessonId]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (f && f.type === 'application/pdf') {
            setFile(f);
        } else {
            showToast('Please select a valid PDF', 'error');
            setFile(null);
        }
    };

    const handleUpload = () => {
        if (!file || !lessonId) return;
        addTask({
            type: 'upload',
            contentType: 'worksheet',
            title: title,
            file: file,
            lessonId: lessonId,
            mimeType: file.type,
            category: category
        });
        showToast('Worksheet upload started in background', 'info');
        onCancel();
    };

    const handleLinkSave = async () => {
        if (!url || !title) return;
        setIsSaving(true);
        try {
            await api.addContent({
                title, body: url, lessonId, type: 'worksheet', category: category || 'standard',
                metadata: { category: 'External', subCategory: 'Link', isExternal: true } as any
            });
            showToast('Link saved successfully', 'success');
            onUploadSuccess();
        } catch (e) { showToast('Failed to save link', 'error'); }
        setIsSaving(false);
    };

    return (
        <div className="w-full max-w-5xl mx-auto bg-white dark:bg-gray-800/80 backdrop-blur-md rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden min-h-[500px] flex flex-col md:flex-row animate-scale-in mb-8 relative">
            <button onClick={onCancel} className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 z-10 transition-colors">
                <XIcon className="w-6 h-6" />
            </button>

            <div className="w-full md:w-5/12 p-6 sm:p-8 bg-gray-50/50 dark:bg-gray-900/30 border-r border-gray-100 dark:border-gray-700 flex flex-col">
                <div className="mb-8">
                    <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center mb-4">
                        <WorksheetIcon className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Configure Worksheet</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Set the title and choose your storage strategy for this worksheet.</p>
                </div>

                <div className="space-y-6 flex-1">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Worksheet Title</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                            placeholder="Enter worksheet title..."
                        />
                    </div>

                    <div className="space-y-3">
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Source Strategy</label>
                        <div className="grid grid-cols-2 gap-2 p-1 bg-gray-200/50 dark:bg-gray-700/50 rounded-xl">
                            <button
                                onClick={() => setActiveTab('upload')}
                                className={`py-2.5 text-xs font-bold rounded-lg transition-all ${activeTab === 'upload' ? 'bg-white dark:bg-gray-600 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-gray-500'}`}
                            >
                                <div className="flex items-center justify-center gap-2">
                                    <UploadCloudIcon className="w-4 h-4" />
                                    UPLOAD
                                </div>
                            </button>
                            <button
                                onClick={() => setActiveTab('link')}
                                className={`py-2.5 text-xs font-bold rounded-lg transition-all ${activeTab === 'link' ? 'bg-white dark:bg-gray-600 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-gray-500'}`}
                            >
                                <div className="flex items-center justify-center gap-2">
                                    <LinkIcon className="w-4 h-4" />
                                    LINK
                                </div>
                            </button>
                        </div>
                    </div>
                </div>

                <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-700">
                    <p className="text-xs text-gray-500 italic">Target folder: <span className="font-mono text-emerald-600 dark:text-emerald-400">{folderPath}</span></p>
                </div>
            </div>

            <div className="w-full md:w-7/12 p-6 sm:p-10 flex flex-col justify-center items-center bg-white dark:bg-gray-800 relative">
                <div className="w-full max-w-sm">
                    {activeTab === 'upload' ? (
                        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className={`relative group cursor-pointer transition-all duration-300 ${file ? 'bg-emerald-50/50 dark:bg-emerald-900/20 border-emerald-400' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50 border-gray-300'} border-2 border-dashed rounded-3xl p-10 text-center flex flex-col items-center justify-center`}>
                                <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileChange} accept=".pdf" />
                                <div className={`p-5 rounded-2xl mb-4 transition-transform group-hover:scale-110 ${file ? 'bg-emerald-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-400'}`}>
                                    <UploadCloudIcon className="w-10 h-10" />
                                </div>
                                {file ? (
                                    <>
                                        <p className="font-bold text-gray-800 dark:text-white truncate max-w-[200px] mb-1">{file.name}</p>
                                        <p className="text-xs text-emerald-500 font-medium">Click to change file</p>
                                    </>
                                ) : (
                                    <>
                                        <p className="text-lg font-bold text-gray-700 dark:text-gray-200">Drop PDF here</p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">or click to browse</p>
                                    </>
                                )}
                            </div>
                            <button
                                disabled={!file}
                                onClick={handleUpload}
                                className="w-full py-4 px-6 bg-gradient-to-br from-emerald-600 to-green-700 text-white rounded-2xl font-bold shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 hover:scale-[1.02] transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                            >
                                <UploadCloudIcon className="w-6 h-6" />
                                <span>START UPLOAD</span>
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Direct PDF Link</label>
                                <input
                                    type="url"
                                    value={url}
                                    onChange={(e) => setUrl(e.target.value)}
                                    placeholder="https://example.com/worksheet.pdf"
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                                />
                                <p className="text-xs text-gray-500 mt-2">Paste the direct link to a PDF file.</p>
                            </div>
                            <button
                                disabled={!url || isSaving}
                                onClick={handleLinkSave}
                                className="w-full py-4 px-6 bg-gray-900 dark:bg-gray-700 text-white rounded-2xl font-bold shadow-xl hover:shadow-2xl hover:bg-black dark:hover:bg-gray-600 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                            >
                                {isSaving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <LinkIcon className="w-6 h-6" />}
                                <span>{isSaving ? 'SAVING...' : 'SAVE DIRECT LINK'}</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export const WorksheetView: React.FC<WorksheetViewProps> = ({ lessonId, user, category }) => {
    const [version, setVersion] = useState(0);
    const { triggerContentUpdate, updateVersion } = useContentUpdate();
    const [showUploadForm, setShowUploadForm] = useState(false);
    const { data: grouped, isLoading } = useApi(() => api.getContentsByLessonId(lessonId, ['worksheet'], (user.role !== 'admin' && !user.canEdit), category), [lessonId, version, user, updateVersion, category]);
    const worksheets = grouped?.[0]?.docs || [];
    const canEdit = user.role === 'admin' || !!user.canEdit;

    const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; onConfirm: (() => void) | null }>({ isOpen: false, onConfirm: null });
    const [fullscreenUrl, setFullscreenUrl] = useState<string | null>(null);
    const { showToast } = useToast();
    const [downloading, setDownloading] = useState(false);
    const [sweetAlert, setSweetAlert] = useState<{ show: boolean; type: 'loading' | 'success' | 'error'; title: string; message: string; phone?: string }>({
        show: false,
        type: 'loading',
        title: '',
        message: ''
    });

    const handleDelete = (id: string) => {
        setConfirmModal({
            isOpen: true,
            onConfirm: async () => {
                await api.deleteContent(id);
                setVersion(v => v + 1);
                triggerContentUpdate();
                showToast('Worksheet deleted', 'success');
                setConfirmModal({ isOpen: false, onConfirm: null });
            }
        });
    };

    const handleTogglePublish = async (item: Content) => {
        try {
            const newStatus = !item.isPublished;
            await api.updateContent(item._id, { isPublished: newStatus });
            setVersion(v => v + 1);
            triggerContentUpdate();
            showToast(`Worksheet ${newStatus ? 'published' : 'unpublished'}`, 'success');
        } catch (error) {
            showToast('Failed to update status', 'error');
        }
    };

    const executeDownloadRequest = async (id: string, title: string) => {
        setDownloading(true);
        setSweetAlert({
            show: true,
            type: 'loading',
            title: 'பதிவிறக்கம் | Downloading',
            message: 'PDF அனுப்பப்படுகிறது... தயவுசெய்து காத்திருக்கவும்\n\nSending PDF... Please wait'
        });

        try {
            const response = await api.downloadContent(id, user._id, user.email);
            if (response.success) {
                if (response.isAdmin && response.fileUrl) {
                    const link = document.createElement('a');
                    link.href = response.fileUrl;
                    link.download = title || 'worksheet.pdf';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    setSweetAlert({ show: true, type: 'success', title: 'வெற்றி! | Success!', message: 'கோப்பு பதிவிறக்கம் தொடங்கியது!\n\nDownload started!' });
                } else if (response.emailSent) {
                    setSweetAlert({ show: true, type: 'success', title: 'வெற்றி! | Success!', message: `உங்கள் மின்னஞ்சலுக்கு PDF அனுப்பப்பட்டது!\n📧 ${user.email}\n\nPDF sent to your email successfully!` });
                }
                setVersion(v => v + 1);
                setTimeout(() => setSweetAlert(prev => ({ ...prev, show: false })), 3000);
            } else {
                setSweetAlert({ show: true, type: 'error', title: 'தோல்வி | Failed', message: `${response.message}\n\nContact Admin:\n📞 ${response.adminPhone || '7904838296'}` });
            }
        } catch (error: any) {
            setSweetAlert({ show: true, type: 'error', title: 'பிழை | Error', message: `Download failed. Contact Admin:\n📞 7904838296` });
        } finally {
            setDownloading(false);
        }
    };

    const handleView = async (url: string, id: string) => {
        let finalUrl = url;
        if (url && url.includes('cloudinary') && !url.toLowerCase().endsWith('.pdf')) {
            if (!url.includes('?')) finalUrl = `${url}.pdf`;
        }
        setFullscreenUrl(finalUrl);
        trackView(lessonId, 'worksheet', id).catch(() => { });
    };

    return (
        <div className="h-full flex flex-col overflow-hidden bg-gray-50/30 dark:bg-gray-900/30">
            {canEdit && worksheets.length > 0 && (
                <ContentStatusBanner
                    publishedCount={worksheets.filter(a => a.isPublished).length}
                    unpublishedCount={worksheets.filter(a => !a.isPublished).length}
                />
            )}

            <div className="p-4 sm:p-6 lg:p-8 flex-1 overflow-hidden flex flex-col">
                <div className="flex justify-between items-center mb-6 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                            <WorksheetIcon className="w-6 h-6 sm:w-8 sm:h-8 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <h1 className="text-xl sm:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-emerald-600 dark:from-white dark:to-emerald-400">Worksheets</h1>
                    </div>

                    {canEdit && (
                        <button
                            onClick={() => setShowUploadForm(!showUploadForm)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all shadow-md ${showUploadForm ? 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20'}`}
                        >
                            <PlusIcon className={`w-5 h-5 transition-transform ${showUploadForm ? 'rotate-45' : ''}`} />
                            <span className="hidden sm:inline">{showUploadForm ? 'Cancel' : 'Add New'}</span>
                        </button>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar pr-2">
                    {isLoading && (
                        <div className="flex flex-col items-center justify-center py-20">
                            <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                            <p className="text-gray-500 font-medium">Fetching worksheets...</p>
                        </div>
                    )}

                    {!isLoading && showUploadForm && (
                        <UploadForm
                            lessonId={lessonId}
                            existingTitles={worksheets.map(a => a.title)}
                            onUploadSuccess={() => { setVersion(v => v + 1); setShowUploadForm(false); triggerContentUpdate(); }}
                            onCancel={() => setShowUploadForm(false)}
                            category={category}
                        />
                    )}

                    {!isLoading && !showUploadForm && worksheets.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-10">
                            {worksheets.map((item, idx) => (
                                <BeautifulWorksheetCard
                                    key={item._id}
                                    content={item}
                                    index={idx}
                                    isAdmin={canEdit}
                                    onRemove={() => handleDelete(item._id)}
                                    onExpand={(url) => handleView(url, item._id)}
                                    onDownloadClick={() => executeDownloadRequest(item._id, item.title)}
                                    downloading={downloading}
                                    onTogglePublish={handleTogglePublish}
                                />
                            ))}
                        </div>
                    )}

                    {!isLoading && !showUploadForm && worksheets.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-32 bg-white dark:bg-gray-800/30 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-700/50">
                            <div className="p-6 bg-gray-50 dark:bg-gray-800 rounded-full mb-6">
                                <WorksheetIcon className="w-16 h-16 text-gray-300 dark:text-gray-600" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-700 dark:text-gray-300 mb-2">No worksheets yet</h3>
                            <p className="text-gray-500 dark:text-gray-400 max-w-sm text-center">
                                {canEdit ? "Ready to add some exercises? Click 'Add New' to upload your first worksheet." : "Check back later for worksheets related to this lesson."}
                            </p>
                            {canEdit && (
                                <button onClick={() => setShowUploadForm(true)} className="mt-8 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold transition-all shadow-lg shadow-emerald-500/30">
                                    Upload First Worksheet
                                </button>
                            )}
                        </div>
                    )}
                </div>

                <ConfirmModal isOpen={confirmModal.isOpen} onClose={() => setConfirmModal({ isOpen: false, onConfirm: null })} onConfirm={confirmModal.onConfirm} title="Remove Worksheet" message="Are you sure you want to remove this worksheet?" />

                {fullscreenUrl && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95 backdrop-blur-sm animate-in fade-in duration-300">
                        <div className="absolute top-4 right-4 z-[70] flex gap-2">
                            <button
                                onClick={() => setFullscreenUrl(null)}
                                className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all backdrop-blur-md"
                            >
                                <XIcon className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="w-full h-full max-w-6xl max-h-[90vh] p-4">
                            <PdfViewer url={fullscreenUrl} />
                        </div>
                    </div>
                )}

                {sweetAlert.show && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-8 transform scale-100 flex flex-col items-center text-center animate-in zoom-in duration-300">
                            {sweetAlert.type === 'loading' && <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />}
                            {sweetAlert.type === 'success' && <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4"><CheckCircleIcon className="w-10 h-10 text-green-600" /></div>}
                            {sweetAlert.type === 'error' && <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4"><XIcon className="w-10 h-10 text-red-600" /></div>}
                            <h4 className="text-xl font-bold mb-2 text-gray-800 dark:text-white">{sweetAlert.title}</h4>
                            <p className="text-gray-600 dark:text-gray-300 whitespace-pre-wrap">{sweetAlert.message}</p>
                            {sweetAlert.type !== 'loading' && (
                                <button onClick={() => setSweetAlert(prev => ({ ...prev, show: false }))} className="mt-6 px-6 py-2 bg-gray-900 dark:bg-gray-700 text-white rounded-xl font-bold">Close</button>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
                .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; }
                @keyframes scale-in {
                    0% { transform: scale(0.95); opacity: 0; }
                    100% { transform: scale(1); opacity: 1; }
                }
                .animate-scale-in { animation: scale-in 0.3s ease-out forwards; }
            `}</style>
        </div>
    );
};
