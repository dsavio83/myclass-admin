import React, { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react';
import { Content, User, ResourceType, QAMetadata, QuestionType, CognitiveProcess, SaveFormat } from '../../types';
import { RichTextEditor } from '../common/RichTextEditor';
import { useApi } from '../../hooks/useApi';
import * as api from '../../services/api';
import { QAIcon } from '../icons/ResourceTypeIcons';
import { PlusIcon, EditIcon, TrashIcon, ChevronRightIcon, DownloadIcon, XIcon, EyeIcon, UploadCloudIcon, CollectionIcon } from '../icons/AdminIcons';
import { PublishToggle } from '../common/PublishToggle';
import { UnpublishedContentMessage } from '../common/UnpublishedContentMessage';
import { ConfirmModal } from '../ConfirmModal';
import { useSession } from '../../context/SessionContext';
import { useContentUpdate } from '../../context/ContentUpdateContext';
import { useToast } from '../../context/ToastContext';
import { FontSizeControl } from '../FontSizeControl';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

import { ManageQAModal } from './ManageQAModal';

import {
    processContentForHTML
} from '../../utils/htmlUtils';
import { formatCount } from '../../utils/formatUtils';
import { ContentStatusBanner } from '../common/ContentStatusBanner';

declare const Quill: any;

declare global {
    interface Window {
        MathJax: any;
    }
}

interface QAViewProps {
    lessonId: string;
    user: User;
}

// --- Constants & Helpers ---
const COGNITIVE_PROCESSES: { [key in CognitiveProcess]: { label: string, color: string } } = {
    'CP1': { label: 'Conceptual Clarity', color: 'bg-blue-100 text-blue-800 border-blue-200' },
    'CP2': { label: 'Application Skill', color: 'bg-green-100 text-green-800 border-green-200' },
    'CP3': { label: 'Computational Thinking', color: 'bg-purple-100 text-purple-800 border-purple-200' },
    'CP4': { label: 'Analytical Thinking', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
    'CP5': { label: 'Critical Thinking', color: 'bg-red-100 text-red-800 border-red-200' },
    'CP6': { label: 'Creative Thinking', color: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
    'CP7': { label: 'Values/Attitudes', color: 'bg-pink-100 text-pink-800 border-pink-200' },
};

const getMarksColor = (marks: number): string => {
    switch (marks) {
        case 2: return 'bg-teal-100 text-teal-800 border-teal-200';
        case 3: return 'bg-sky-100 text-sky-800 border-sky-200';
        case 5: return 'bg-orange-100 text-orange-800 border-orange-200';
        case 6: return 'bg-rose-100 text-rose-800 border-rose-200';
        default: return 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
    }
};

const getQuestionTypeColor = (type: QuestionType): string => {
    switch (type) {
        case 'Basic': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
        case 'Average': return 'bg-amber-100 text-amber-800 border-amber-200';
        case 'Profound': return 'bg-violet-100 text-violet-800 border-violet-200';
        default: return 'bg-gray-100 text-gray-600 border-gray-200';
    }
};

// Function to check if an element is a heading
const isHeading = (el: HTMLElement): boolean => {
    return /^H[1-6]$/i.test(el.tagName);
};


// --- Components ---

interface QAEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: { title: string; body: string; metadata: QAMetadata; isPublished: boolean }) => Promise<void>;
    contentToEdit: Content | null;
}

const QAEditorModal: React.FC<QAEditorModalProps> = ({ isOpen, onClose, onSave, contentToEdit }) => {
    const [activeTab, setActiveTab] = useState<'question' | 'answer'>('question');
    const meta = contentToEdit?.metadata as QAMetadata | undefined;
    const [questionHtml, setQuestionHtml] = useState(contentToEdit?.title || '');
    const [answerHtml, setAnswerHtml] = useState(contentToEdit?.body || '');
    const [marks, setMarks] = useState<number>(meta?.marks || 2);
    const [qType, setQType] = useState<QuestionType>(meta?.questionType || 'Basic');
    const [cogProcess, setCogProcess] = useState<CognitiveProcess>(meta?.cognitiveProcess || 'CP1');
    const [isPublished, setIsPublished] = useState(contentToEdit?.isPublished || false);
    const [isSaving, setIsSaving] = useState(false);

    // Initialize content
    useEffect(() => {
        if (!isOpen) return;

        // Reset all state variables when opening modal
        if (!contentToEdit) {
            // "Add New" mode - reset all fields to defaults
            setQuestionHtml('');
            setAnswerHtml('');
            setMarks(2);
            setQType('Basic');
            setCogProcess('CP1');
            setIsPublished(false);
        } else {
            // "Edit" mode - load existing content
            setQuestionHtml(contentToEdit.title);
            setAnswerHtml(contentToEdit.body);
            const meta = contentToEdit.metadata as QAMetadata | undefined;
            setMarks(meta?.marks || 2);
            setQType(meta?.questionType || 'Basic');
            setCogProcess(meta?.cognitiveProcess || 'CP1');
            setIsPublished(!!contentToEdit.isPublished);
        }
        setActiveTab('question');
    }, [isOpen, contentToEdit]);

    const handleSaveClick = async () => {
        if (isSaving) return;

        if (!questionHtml.trim() || !answerHtml.trim()) {
            // Basic validation
            return;
        }

        setIsSaving(true);
        try {
            await onSave({
                title: questionHtml,
                body: answerHtml,
                metadata: {
                    marks,
                    questionType: qType,
                    cognitiveProcess: cogProcess
                },
                isPublished
            });
        } catch (e) {
            console.error(e);
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-gray-800 w-full max-w-6xl h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
                <div className="px-6 py-4 border-b dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                        {contentToEdit ? <EditIcon className="w-5 h-5 text-blue-500" /> : <PlusIcon className="w-5 h-5 text-green-500" />}
                        {contentToEdit ? 'Edit Q&A' : 'Add New Q&A'}
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors">
                        <XIcon className="w-6 h-6 text-gray-500 dark:text-gray-400" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 bg-gray-50 dark:bg-gray-900/50">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
                        {/* Left Column: Metadata */}
                        <div className="lg:col-span-1 space-y-6">
                            <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Metadata</h3>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Marks</label>
                                        <select
                                            value={marks}
                                            onChange={(e) => setMarks(Number(e.target.value))}
                                            className="w-full rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 transition-all py-2"
                                        >   <option value={1}>1 Marks</option>
                                            <option value={2}>2 Marks</option>
                                            <option value={3}>3 Marks</option>
                                            <option value={4}>4 Marks</option>
                                            <option value={5}>5 Marks</option>
                                            <option value={6}>6 Marks</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Question Type</label>
                                        <select
                                            value={qType}
                                            onChange={(e) => setQType(e.target.value as QuestionType)}
                                            className="w-full rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 transition-all py-2"
                                        >
                                            <option value="Basic">Basic</option>
                                            <option value="Average">Average</option>
                                            <option value="Profound">Profound</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Cognitive Process</label>
                                        <select
                                            value={cogProcess}
                                            onChange={(e) => setCogProcess(e.target.value as CognitiveProcess)}
                                            className="w-full rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 transition-all py-2"
                                        >
                                            {Object.entries(COGNITIVE_PROCESSES).map(([key, value]) => (
                                                <option key={key} value={key}>{value.label}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="pt-2">
                                        <label className="flex items-center gap-3 p-3 border dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                            <PublishToggle isPublished={isPublished} onToggle={() => setIsPublished(!isPublished)} />
                                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                {isPublished ? 'Published' : 'Draft (Unpublished)'}
                                            </span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Editor */}
                        <div className="lg:col-span-2 flex flex-col h-full bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                            <div className="flex border-b dark:border-gray-700">
                                <button
                                    onClick={() => setActiveTab('question')}
                                    className={`flex-1 py-3 text-sm font-semibold transition-colors relative ${activeTab === 'question' ? 'text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-900/10' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                                >
                                    Question
                                    {activeTab === 'question' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400" />}
                                </button>
                                <button
                                    onClick={() => setActiveTab('answer')}
                                    className={`flex-1 py-3 text-sm font-semibold transition-colors relative ${activeTab === 'answer' ? 'text-green-600 dark:text-green-400 bg-green-50/50 dark:bg-green-900/10' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                                >
                                    Answer
                                    {activeTab === 'answer' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-600 dark:bg-green-400" />}
                                </button>
                            </div>

                            <div className="flex-1 overflow-hidden relative">
                                <div className={`absolute inset-0 transition-opacity duration-200 ${activeTab === 'question' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
                                    <RichTextEditor
                                        initialContent={questionHtml}
                                        onChange={setQuestionHtml}
                                        placeholder="Type the question here..."
                                        // allowImageUpload={true} - Removed as not in props
                                        onPublish={() => { }} // Editor handles it externally now
                                    />
                                </div>
                                <div className={`absolute inset-0 transition-opacity duration-200 ${activeTab === 'answer' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
                                    <RichTextEditor
                                        initialContent={answerHtml}
                                        onChange={setAnswerHtml}
                                        placeholder="Type the answer here..."
                                        // allowImageUpload={true} - Removed
                                        onPublish={() => { }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t dark:border-gray-700 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 rounded-lg text-gray-600 dark:text-gray-300 font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSaveClick}
                        disabled={isSaving}
                        className="px-5 py-2.5 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-all shadow-md  disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {isSaving ? <span className="animate-pulse">Saving...</span> : 'Save Q&A'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- Import Modal Interface & Component ---
interface ParsedQA {
    id: number;
    question: string;
    answer: string;
    isValid: boolean;
}

const QAImportModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onImport: (items: any[]) => Promise<void>;
}> = ({ isOpen, onClose, onImport }) => {
    const [text, setText] = useState('');
    const [parsedItems, setParsedItems] = useState<ParsedQA[]>([]);
    const [step, setStep] = useState<'input' | 'preview'>('input');
    const [isImporting, setIsImporting] = useState(false);

    // Default Metadata for import
    const [defaultMarks, setDefaultMarks] = useState(2);
    const [defaultType, setDefaultType] = useState<QuestionType>('Basic');
    const [defaultCP, setDefaultCP] = useState<CognitiveProcess>('CP1');

    const parseText = () => {
        if (!text.trim()) return;

        // Pre-process text to handle inline breaks
        // Ensure Questions start on new line
        let processedText = text
            // Handle "Question 1 :", "Q1 :", "கேள்வி 1 :", "வினா 1 :" (allowing space before delimiter)
            .replace(/([^\n])\s*((?:Q|Question|கேள்வி|வினா|கே|வி)\s*\d*\s*[\.\)\:])/gi, '$1\n$2')
            // Handle plain numbers "1 :", "1 )" if they look like start of question
            .replace(/([^\n])\s+(\d+\s*[\.\)\:])/g, '$1\n$2')
            // Handle Answers "Ans :", "Answer :", "பதில் :", "விடை :"
            .replace(/([^\n])\s*((?:A|Ans|Answer|பதில்|விடை|வி)\s*[\.\)\:])/gi, '$1\n$2');

        const items: ParsedQA[] = [];
        const lines = processedText.split('\n');
        let currentQ = '';
        let currentA = '';
        let currentId = 0;
        let isCollectingQ = false;
        let isCollectingA = false;

        const finalizeItem = () => {
            if (currentQ && currentA) {
                items.push({
                    id: ++currentId,
                    question: currentQ.trim(),
                    answer: currentA.trim(),
                    isValid: true
                });
            }
            currentQ = '';
            currentA = '';
        };

        // Regex to identify start of a Question
        // Supports: Q1, Question 1, 1., வினா 1, கேள்வி 1, etc. (with optional space before punctuation)
        const qStartRegex = /^(?:Q|Question|கேள்வி|வினா)?\s*\d+\s*[\.\)\:]|^(?:Q|Question|கேள்வி|வினா)\s*[\.\)\:]/i;

        // Regex to identify start of an Answer
        // Supports: Ans, Answer, A, பதில், விடை (with optional space before punctuation)
        const aStartRegex = /^(?:A|Ans|Answer|பதில்|விடை)\s*[\.\)\:]/i;

        for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine) continue;

            if (qStartRegex.test(trimmedLine)) {
                finalizeItem();
                // Check if it's strictly just a number which might be a list inside an answer
                // However, our pre-processing tries to force newlines for potential questions. 
                // We assume if it matches qStartRegex at the start of a trimmed line, it's a new question.

                // Remove the prefix (e.g. "Q1 :", "கேள்வி 1 :") to get the content
                const cleanLine = trimmedLine.replace(/^(?:Q|Question|கேள்வி|வினா)?\s*\d*\s*[\.\)\:]\s*/i, '').trim();
                currentQ = cleanLine;
                isCollectingQ = true;
                isCollectingA = false;
            } else if (aStartRegex.test(trimmedLine)) {
                // Remove prefix (e.g. "Ans:", "பதில்:")
                const cleanLine = trimmedLine.replace(/^(?:A|Ans|Answer|பதில்|விடை)\s*[\.\)\:]\s*/i, '').trim();
                currentA = cleanLine;
                isCollectingQ = false;
                isCollectingA = true;
            } else {
                if (isCollectingA) {
                    currentA += '<br>' + trimmedLine;
                } else if (isCollectingQ) {
                    currentQ += '<br>' + trimmedLine;
                }
            }
        }
        finalizeItem();

        setParsedItems(items);
        setStep('preview');
    };

    const handleImport = async () => {
        setIsImporting(true);
        try {
            const contentData = parsedItems.map(item => ({
                title: item.question,
                body: item.answer,
                metadata: {
                    marks: defaultMarks,
                    questionType: defaultType,
                    cognitiveProcess: defaultCP
                },
                isPublished: true
            }));

            await onImport(contentData);
            onClose();
            setText('');
            setParsedItems([]);
            setStep('input');
        } catch (e) {
            console.error(e);
            // Error handling usually in parent
        } finally {
            setIsImporting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-gray-800 w-full max-w-4xl h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
                <div className="px-6 py-4 border-b dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                        <UploadCloudIcon className="w-5 h-5 text-indigo-500" />
                        Import Q&A
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors">
                        <XIcon className="w-6 h-6 text-gray-500 dark:text-gray-400" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 bg-gray-50 dark:bg-gray-900/50">
                    {step === 'input' ? (
                        <div className="space-y-4 h-full flex flex-col">
                            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800 text-sm text-blue-800 dark:text-blue-200">
                                <strong>Instructions:</strong> Paste your Q&A text below. Supports English and Tamil formats.<br />
                                Examples:<br />
                                <code>Q1. What is React?</code> ... <code>Ans: A library...</code><br />
                                Auto-splits text based on markers: Q, Question, Ans, Answer, கேள்வி, வினா, பதில், விடை.
                            </div>
                            <textarea
                                value={text}
                                onChange={e => setText(e.target.value)}
                                className="flex-1 w-full p-4 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-indigo-500 font-mono text-sm leading-relaxed"
                                placeholder={`Q1. Question 1 text here...\nAns: Answer text here...\n\nQ2. Question 2 text here...\nAns: Answer text here...`}
                            />
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                                <h3 className="text-sm font-bold text-gray-500 uppercase mb-3">Default Metadata (Applied to all)</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="text-xs font-medium text-gray-500 mb-1 block">Marks</label>
                                        <select value={defaultMarks} onChange={e => setDefaultMarks(Number(e.target.value))} className="w-full text-sm rounded border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-gray-900">
                                            {[1, 2, 3, 4, 5, 6].map(m => <option key={m} value={m}>{m} Marks</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-gray-500 mb-1 block">Type</label>
                                        <select value={defaultType} onChange={e => setDefaultType(e.target.value as any)} className="w-full text-sm rounded border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-gray-900">
                                            <option value="Basic">Basic</option>
                                            <option value="Average">Average</option>
                                            <option value="Profound">Profound</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-gray-500 mb-1 block">Cognitive Process</label>
                                        <select value={defaultCP} onChange={e => setDefaultCP(e.target.value as any)} className="w-full text-sm rounded border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-gray-900">
                                            {Object.entries(COGNITIVE_PROCESSES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 flex justify-between">
                                    <span>Parsed Items ({parsedItems.length})</span>
                                    <button onClick={() => setStep('input')} className="text-indigo-600 dark:text-indigo-400 text-xs hover:underline">Edit Input</button>
                                </h3>
                                {parsedItems.map((item, idx) => (
                                    <div key={idx} className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                                        <div className="font-semibold text-gray-900 dark:text-gray-100 mb-2 flex gap-2">
                                            <span className="text-indigo-500 shrink-0">Q{idx + 1}:</span>
                                            <span dangerouslySetInnerHTML={{ __html: processContentForHTML(item.question) }} />
                                        </div>
                                        <div className="text-gray-600 dark:text-gray-300 ml-4 flex gap-2">
                                            <span className="text-green-600 font-medium shrink-0">Ans:</span>
                                            <span dangerouslySetInnerHTML={{ __html: processContentForHTML(item.answer) }} />
                                        </div>
                                    </div>
                                ))}
                                {parsedItems.length === 0 && <div className="text-center text-gray-500">No items parsed. Check your format.</div>}
                            </div>
                        </div>
                    )}
                </div>

                <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t dark:border-gray-700 flex justify-end gap-3">
                    {step === 'input' ? (
                        <>
                            <button onClick={onClose} className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors">Cancel</button>
                            <button onClick={parseText} disabled={!text.trim()} className="px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm">
                                Parse & Preview
                            </button>
                        </>
                    ) : (
                        <>
                            <button onClick={onClose} className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors">Cancel</button>
                            <button onClick={handleImport} disabled={isImporting || parsedItems.length === 0} className="px-5 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors shadow-sm flex items-center gap-2">
                                {isImporting ? 'Importing...' : `Import ${parsedItems.length} Items`}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};


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
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">Export Q&A to PDF</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                        <XIcon className="w-6 h-6" />
                    </button>
                </div>

                <p className="text-sm text-gray-600 dark:text-gray-300 mb-6 font-medium">
                    Enter your email address to receive the PDF copy of these Q&A.
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

const QACard: React.FC<{
    item: Content;
    isOpen: boolean;
    onToggle: () => void;
    onEdit: (c: Content) => void;
    onDelete: (id: string) => void;
    isAdmin: boolean;
    onTogglePublish?: (item: Content) => void;
}> = ({ item, isOpen, onToggle, onEdit, onDelete, isAdmin, onTogglePublish }) => {

    const { session } = useSession();
    const meta = item.metadata as QAMetadata | undefined;
    const cp = meta?.cognitiveProcess ? COGNITIVE_PROCESSES[meta.cognitiveProcess] : null;

    const fontStyle = { fontSize: `${session.fontSize}px` };

    return (
        <div className={`
            group bg-white dark:bg-gray-800 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 
            border-l-4 ${item.isPublished ? 'border-l-green-500' : 'border-l-gray-300'}
            border-y border-r border-gray-100 dark:border-gray-700 overflow-hidden mb-5 transform hover:-translate-y-1
            ${isOpen ? 'ring-2 ring-blue-100 dark:ring-blue-900 shadow-md' : ''}
        `}>
            <div onClick={onToggle} className="relative w-full text-left p-5 sm:p-6 cursor-pointer bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-800/50">

                {/* Decorative left border accent based on question type or default */}
                <div className={`absolute left-0 top-0 bottom-0 w-1.5 transition-colors duration-300 ${meta?.questionType === 'Profound' ? 'bg-violet-500' :
                    meta?.questionType === 'Average' ? 'bg-amber-500' :
                        meta?.questionType === 'Basic' ? 'bg-emerald-500' : 'bg-blue-500'
                    }`}></div>

                <div className="flex flex-wrap items-center gap-2 mb-3 pl-2">
                    {meta?.marks && (
                        <span className={`px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-widest shadow-sm ${getMarksColor(meta.marks)}`}>
                            {meta.marks} Marks
                        </span>
                    )}
                    {meta?.questionType && (
                        <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest shadow-sm border ${getQuestionTypeColor(meta.questionType)}`}>
                            {meta.questionType}
                        </span>
                    )}
                    {cp && (
                        <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest shadow-sm border ${cp.color}`}>
                            {cp.label}
                        </span>
                    )}
                </div>

                <div className="flex justify-between items-start w-full pl-2">
                    <div className="flex-1 pr-6">
                        <div className="prose dark:prose-invert max-w-none text-lg font-semibold text-gray-800 dark:text-gray-100 qa-content tamil-text font-tau-paalai leading-relaxed" style={fontStyle} dangerouslySetInnerHTML={{ __html: processContentForHTML(item.title) }} />
                    </div>

                    <div className="flex items-center shrink-0 gap-3">
                        {isAdmin && (
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200 transform translate-x-2 group-hover:translate-x-0" onClick={e => e.stopPropagation()}>
                                {onTogglePublish && (
                                    <PublishToggle
                                        isPublished={!!item.isPublished}
                                        onToggle={() => onTogglePublish(item)}
                                    />
                                )}
                                <button onClick={(e) => { e.stopPropagation(); onEdit(item); }} className="p-2 rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/30 text-gray-400 hover:text-blue-600 transition-colors shadow-sm border border-transparent hover:border-blue-100 dark:hover:border-blue-800" title="Edit Q&A">
                                    <EditIcon className="w-4 h-4" />
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); onDelete(item._id); }} className="p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-600 transition-colors shadow-sm border border-transparent hover:border-red-100 dark:hover:border-red-800" title="Delete Q&A">
                                    <TrashIcon className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                        <div className={`p-2 rounded-full bg-white dark:bg-gray-700 shadow-sm border border-gray-100 dark:border-gray-600 transition-all duration-300 ${isOpen ? 'rotate-90 bg-blue-50 dark:bg-blue-900/30 text-blue-600' : 'text-gray-400'}`}>
                            <ChevronRightIcon className="w-5 h-5" />
                        </div>
                    </div>
                </div>
            </div>

            <div className={`grid transition-all duration-300 ease-in-out ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                <div className="overflow-hidden">
                    <div className="p-6 pt-2 bg-gradient-to-b from-white to-gray-50/50 dark:from-gray-800 dark:to-gray-900/50 border-t border-dashed border-gray-200 dark:border-gray-700">
                        <div className="flex gap-4">
                            <div className="shrink-0 pt-1">
                                <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400 font-bold text-sm shadow-sm">
                                    A
                                </div>
                            </div>
                            <div className="flex-1">
                                <div className="prose dark:prose-invert max-w-none text-gray-700 dark:text-gray-300 qa-content tamil-text font-tau-paalai leading-relaxed text-base" style={fontStyle} dangerouslySetInnerHTML={{ __html: processContentForHTML(item.body) }} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const QAView: React.FC<QAViewProps> = ({ lessonId, user }) => {
    const [version, setVersion] = useState(0);
    const { data: groupedContent, isLoading } = useApi(() => api.getContentsByLessonId(lessonId, ['qa'], (user.role !== 'admin' && !user.canEdit)), [lessonId, version, user]);
    const [modalState, setModalState] = useState<{ isOpen: boolean; content: Content | null }>({ isOpen: false, content: null });
    const [confirmModalState, setConfirmModalState] = useState<{ isOpen: boolean; onConfirm: (() => void) | null }>({ isOpen: false, onConfirm: null });
    const [openCardId, setOpenCardId] = useState<string | null>(null);
    const [stats, setStats] = useState<{ downloads: number } | null>(null);
    const [importModalOpen, setImportModalOpen] = useState(false);
    const [manageModalOpen, setManageModalOpen] = useState(false);

    // Export state
    const [exportModalOpen, setExportModalOpen] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const { showToast } = useToast();
    const exportContainerRef = useRef<HTMLDivElement>(null);

    // SweetAlert state
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

    useEffect(() => {
        const updateStats = async () => {
            try {
                const h = await api.getHierarchy(lessonId);
                setStats({ downloads: h.qaDownloadCount || 0 });
            } catch (e) {
                console.error('Failed to fetch stats', e);
            }
        };
        updateStats();
    }, [lessonId]);

    const qaItems = groupedContent?.[0]?.docs || [];
    const resourceType: ResourceType = 'qa';
    const canEdit = user.role === 'admin' || !!user.canEdit;

    // Scroll persistence
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const savedScrollTop = useRef<number>(0);

    // Reset scroll when changing lessons
    useEffect(() => {
        savedScrollTop.current = 0;
        if (scrollContainerRef.current) scrollContainerRef.current.scrollTop = 0;
    }, [lessonId]);

    // Restore scroll position after data refresh
    useLayoutEffect(() => {
        if (!isLoading && scrollContainerRef.current) {
            if (savedScrollTop.current > 0) {
                scrollContainerRef.current.scrollTop = savedScrollTop.current;
            }
        }
    }, [isLoading, qaItems]);

    const { triggerContentUpdate } = useContentUpdate();

    // Trigger MathJax rendering when content changes
    useEffect(() => {
        if (typeof window !== 'undefined' && window.MathJax && window.MathJax.typesetPromise) {
            setTimeout(() => {
                window.MathJax.typesetPromise();
            }, 50);
        }
    }, [qaItems, openCardId, version]); // Re-run when items list changes, a card is opened, or manual version update

    const handleSave = async (contentData: { title: string; body: string; metadata: QAMetadata; isPublished: boolean }) => {
        if (modalState.content) {
            await api.updateContent(modalState.content._id, contentData);
        } else {
            await api.addContent({ ...contentData, lessonId, type: resourceType });
        }
        setVersion(v => v + 1);
        triggerContentUpdate(); // Update sidebar counts
        setModalState({ isOpen: false, content: null });
    };

    const handleBulkImport = async (items: any[]) => {
        try {
            await api.addMultipleContent(items.map(i => ({ ...i, lessonId, type: resourceType })));
            setVersion(v => v + 1);
            triggerContentUpdate(); // Update sidebar counts
            showToast(`Successfully imported ${items.length} Q&A items!`, 'success');
        } catch (e) {
            console.error(e);
            showToast('Failed to import Q&A items', 'error');
            throw e;
        }
    };

    const handleBulkDelete = async (ids: string[]) => {
        try {
            const result = await api.deleteMultipleContent(ids);
            showToast(result.message, 'success');
            setVersion(v => v + 1);
            triggerContentUpdate(); // Update sidebar counts
        } catch (e) {
            console.error("Bulk delete failed", e);
            showToast('Failed to delete selected items', 'error');
            throw e;
        }
    };

    const handleDelete = (contentId: string) => {
        const confirmAction = async () => {
            await api.deleteContent(contentId);
            setVersion(v => v + 1);
            triggerContentUpdate(); // Update sidebar counts
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
            showToast(`Q&A ${newStatus ? 'published' : 'unpublished'} successfully`, 'success');
        } catch (error) {
            console.error('Failed to toggle publish status:', error);
            showToast('Failed to update publish status', 'error');
        }
    };

    const handleToggleCard = (id: string) => {
        const isExpanding = openCardId !== id;
        setOpenCardId(prev => prev === id ? null : id);
    };

    // Export PDF Logic
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
            const lessonName = hierarchy?.lessonName || 'QA';

            // 2. Prepare all QA content
            let allQAHTML = '';

            // Helper to strip manual numbering from user content
            const cleanTitleText = (text: string) => {
                return text.replace(/^(\s*(?:<[^>]+>\s*)*)\d+[\.\)\-\s]\s*/, '$1');
            };

            qaItems.forEach((item, index) => {
                allQAHTML += `
                    <div class="qa-pair-container" style="border: 1px solid #eee; border-radius: 8px; padding: 15px; margin-bottom: 20px; background-color: #fcfcfc;">
                        <div class="question-part" style="font-weight: bold; font-size: 15pt; margin-bottom: 8px; color: #111; line-height: 1.4;">
                            <span style="color: #2563eb; margin-right: 5px;">Q${index + 1}.</span>
                            ${processContentForHTML(cleanTitleText(item.title))}
                        </div>
                        <div class="answer-part" style="font-size: 14pt; margin-left: 0px; color: #374151; line-height: 1.5;">
                            <span style="font-weight: bold; color: #16a34a; margin-right: 5px;">Ans:</span>
                            ${processContentForHTML(item.body)}
                        </div>
                    </div>
                `;
            });

            if (qaItems.length === 0) {
                throw new Error('இந்த அத்தியாயத்தில் வினா-விடைகள் இல்லை | No Q&A available for this chapter');
            }

            // 3. Generate PDF using Helper
            if (!exportContainerRef.current) throw new Error('Export container missing');

            const { PdfExportHelper } = await import('../../services/pdfExportHelper');

            const pdfBlob = await PdfExportHelper.generateAndExport(exportContainerRef.current, {
                fileName: lessonName,
                hierarchy: hierarchy,
                contentHTML: allQAHTML,
                user: user,
                isAdmin: isAdmin,
                email: email,
                onProgress: (msg) => setSweetAlert(prev => ({ ...prev, message: msg + '\n\nPlease wait...' }))
            });

            // 4. Handle PDF distribution
            if (isAdmin) {
                // ADMIN: Direct download
                const url = URL.createObjectURL(pdfBlob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `${lessonName.replace(/[^a-zA-Z0-9\u0B80-\u0BFF]/g, '_')}_QA_${new Date().toISOString().slice(0, 10)}.pdf`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);

                // Update download count (Optional)
                try {
                    await api.incrementLessonDownload(lessonId, 'qa');
                } catch (e) {
                    console.error("Failed to increment download count", e);
                }

                setSweetAlert({
                    show: true,
                    type: 'success',
                    title: 'வெற்றி! | Success!',
                    message: 'கோப்பு பதிவிறக்கம் தொடங்கியது!\n\nDownload started successfully!'
                });
            } else {
                setSweetAlert({
                    show: true,
                    type: 'loading',
                    title: 'மின்னஞ்சல் அனுப்பப்படுகிறது | Sending Email',
                    message: 'PDF மின்னஞ்சலுக்கு அனுப்பப்படுகிறது...\n\nSending PDF to email...'
                });

                const formData = new FormData();
                formData.append('file', pdfBlob, `${lessonName}_QA.pdf`);
                formData.append('email', email);
                formData.append('title', `Q&A: ${lessonName}`);
                formData.append('lessonId', lessonId);
                formData.append('type', 'qa');
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
            if (exportContainerRef.current) exportContainerRef.current.innerHTML = '';
        }
    };

    const handleExportInitiate = () => {
        if (canEdit) {
            handleExportConfirm(user.email || 'admin@example.com');
        } else {
            if (user.email) {
                handleExportConfirm(user.email);
            } else {
                setExportModalOpen(true);
            }
        }
    };

    return (
        <div className="h-full flex flex-col overflow-hidden">
            {canEdit && qaItems.length > 0 && (
                <ContentStatusBanner
                    publishedCount={qaItems.filter(i => i.isPublished).length}
                    unpublishedCount={qaItems.filter(i => !i.isPublished).length}
                />
            )}

            <div className="p-4 sm:p-6 lg:p-8 flex-1 overflow-hidden flex flex-col">
                <div className="flex justify-between items-center mb-6 shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-3">
                            <QAIcon className="w-8 h-8 text-indigo-600" />
                            <h1 className="text-lg sm:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-indigo-600 dark:from-white dark:to-indigo-400">
                                Q&A
                            </h1>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        {!isLoading && qaItems.length > 0 && (
                            <button
                                onClick={handleExportInitiate}
                                className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm"
                                title="Export to PDF"
                            >
                                <DownloadIcon className="w-5 h-5" />
                                <span className="hidden sm:inline">PDF</span>
                                <span className="bg-white/20 px-1.5 py-0.5 rounded text-xs font-semibold ml-1">
                                    {formatCount(stats?.downloads || 0)}
                                </span>
                            </button>
                        )}

                        {canEdit && (
                            <>
                                <button
                                    onClick={() => setImportModalOpen(true)}
                                    className="flex items-center gap-2 px-3 py-2 bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 rounded-lg hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-colors shadow-sm"
                                    title="Import Q&A"
                                >
                                    <UploadCloudIcon className="w-5 h-5" />
                                    <span className="hidden sm:inline">Import</span>
                                </button>
                                <button
                                    onClick={() => setManageModalOpen(true)}
                                    className="flex items-center gap-2 px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors shadow-sm"
                                    title="Manage Q&A"
                                >
                                    <CollectionIcon className="w-5 h-5" />
                                    <span className="hidden sm:inline">Manage</span>
                                </button>
                                <button
                                    onClick={() => setModalState({ isOpen: true, content: null })}
                                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                                >
                                    <PlusIcon className="w-5 h-5 mr-1" />
                                    <span className="hidden sm:inline">Add New</span>
                                </button>
                            </>
                        )}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar">
                    {isLoading && <div className="text-center py-12 text-gray-500">Loading Q&A...</div>}

                    {!isLoading && qaItems.length === 0 && (
                        <div className="text-center py-20 bg-gray-50 dark:bg-gray-800/50 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                            <QAIcon className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                            <p className="text-gray-500">No Q&A items found.</p>
                        </div>
                    )}

                    {!isLoading && qaItems.length > 0 && (
                        <div className="space-y-4 pb-8">
                            {qaItems.map((item) => (
                                <QACard
                                    key={item._id}
                                    item={item}
                                    isOpen={openCardId === item._id}
                                    onToggle={() => handleToggleCard(item._id)}
                                    onEdit={(c) => setModalState({ isOpen: true, content: c })}
                                    onDelete={handleDelete}
                                    isAdmin={canEdit}
                                    onTogglePublish={handleTogglePublish}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {modalState.isOpen && (
                <QAEditorModal
                    isOpen={modalState.isOpen}
                    onClose={() => setModalState({ isOpen: false, content: null })}
                    onSave={handleSave}
                    contentToEdit={modalState.content}
                />
            )}

            <QAImportModal
                isOpen={importModalOpen}
                onClose={() => setImportModalOpen(false)}
                onImport={handleBulkImport}
            />

            <ManageQAModal
                isOpen={manageModalOpen}
                onClose={() => setManageModalOpen(false)}
                currentQA={qaItems}
                onDelete={handleBulkDelete}
            />

            <ConfirmModal
                isOpen={confirmModalState.isOpen}
                onClose={() => setConfirmModalState({ isOpen: false, onConfirm: null })}
                onConfirm={confirmModalState.onConfirm}
                title="Delete Q&A"
                message="Are you sure you want to delete this Q&A item?"
            />

            {/* SweetAlert Modal */}
            {sweetAlert.show && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 max-w-sm w-full text-center transform scale-100 transition-all">
                        {sweetAlert.type === 'loading' && (
                            <div className="mx-auto w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                        )}
                        {sweetAlert.type === 'success' && (
                            <div className="mx-auto w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4 text-green-600 dark:text-green-400">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                            </div>
                        )}
                        {sweetAlert.type === 'error' && (
                            <div className="mx-auto w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4 text-red-600 dark:text-red-400">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                            </div>
                        )}

                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 whitespace-pre-line">{sweetAlert.title}</h3>
                        <p className="text-gray-600 dark:text-gray-300 text-sm whitespace-pre-line leading-relaxed mb-6">{sweetAlert.message}</p>

                        {sweetAlert.type !== 'loading' && (
                            <button
                                onClick={() => setSweetAlert(prev => ({ ...prev, show: false }))}
                                className="w-full py-2.5 bg-gray-900 dark:bg-gray-700 text-white rounded-lg hover:bg-gray-800 dark:hover:bg-gray-600 font-medium transition-colors"
                            >
                                சரி | OK
                            </button>
                        )}
                    </div>
                </div>
            )}

            <ExportEmailModal
                isOpen={exportModalOpen}
                onClose={() => setExportModalOpen(false)}
                onExport={handleExportConfirm}
                isLoading={isExporting}
            />

            {/* Hidden Export Container */}
            <div style={{ position: 'absolute', left: '-9999px', top: 0, width: '800px' }}>
                <div ref={exportContainerRef} id="export-container"></div>
            </div>
        </div>
    );
};