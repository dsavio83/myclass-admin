import React, { useState, useEffect, useMemo, useRef } from 'react';
import { User, QuizQuestion, AnswerOption, Content } from '../../types';
import { useApi } from '../../hooks/useApi';
import * as api from '../../services/api';
import { QuizIcon } from '../icons/ResourceTypeIcons';
import { ChevronRightIcon, EyeIcon, CheckCircleIcon, DownloadIcon, XIcon, LinkIcon, PlusIcon } from '../icons/AdminIcons';
import { StandardContentPicker } from '../common/StandardContentPicker';
import { QuizConfiguration } from '../QuizConfiguration';
import { PublishToggle } from '../common/PublishToggle';
import { ContentStatusBanner } from '../common/ContentStatusBanner';
import { useToast } from '../../context/ToastContext';
import { Fireworks } from './Fireworks';
import { processContentForHTML } from '../../utils/htmlUtils';
import { formatCount } from '../../utils/formatUtils';


interface QuizViewProps {
    lessonId: string;
    user: User;
    category?: string;
}

// --- Components for the Result Screen ---

const StatCard: React.FC<{ label: string; value: number; colorClass: string; bgClass: string }> = ({ label, value, colorClass, bgClass }) => (
    <div className={`${bgClass} p-4 rounded-xl flex flex-col items-center justify-center shadow-sm border border-opacity-10 transition-transform hover:scale-105`}>
        <span className={`text-3xl font-bold ${colorClass}`}>{value}</span>
        <span className="text-xs uppercase font-semibold text-gray-500 dark:text-gray-400 mt-1 tracking-wider">{label}</span>
    </div>
);

const CircularProgress: React.FC<{ percentage: number; color: string }> = ({ percentage, color }) => {
    const radius = 50;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
        <div className="relative w-32 h-32 flex items-center justify-center group">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r={radius} fill="none" stroke="currentColor" strokeWidth="10" className="text-gray-200 dark:text-gray-700 opacity-30" />
                <circle cx="60" cy="60" r={radius} fill="none" stroke={color} strokeWidth="10" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" className="transition-all duration-1000 ease-out drop-shadow-md" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-gray-800 dark:text-white group-hover:scale-110 transition-transform">{Math.round(percentage)}%</span>
                <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium uppercase">Accuracy</span>
            </div>
        </div>
    );
};

const PieChart: React.FC<{ correct: number; wrong: number; skipped: number }> = ({ correct, wrong, skipped }) => {
    const total = correct + wrong + skipped;
    if (total === 0) return null;
    const correctDeg = (correct / total) * 360;
    const wrongDeg = (wrong / total) * 360;
    const gradient = `conic-gradient(#22c55e 0deg ${correctDeg}deg, #ef4444 ${correctDeg}deg ${correctDeg + wrongDeg}deg, #9ca3af ${correctDeg + wrongDeg}deg 360deg)`;

    return (
        <div className="flex flex-col items-center">
            <div className="w-32 h-32 rounded-full shadow-inner border-4 border-white dark:border-gray-800 transition-transform hover:scale-105" style={{ background: gradient }}></div>
            <div className="mt-4 flex gap-3 text-xs font-medium text-gray-600 dark:text-gray-300">
                <div className="flex items-center gap-1"><div className="w-3 h-3 bg-green-500 rounded-full"></div> Correct</div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 bg-red-500 rounded-full"></div> Wrong</div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 bg-gray-400 rounded-full"></div> Skipped</div>
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
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">Export Quiz to PDF</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                        <XIcon className="w-6 h-6" />
                    </button>
                </div>

                <p className="text-sm text-gray-600 dark:text-gray-300 mb-6 font-medium">
                    Enter your email address to receive the PDF copy of these Quizzes.
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

// --- Single Question Card Component (Reused for Quiz and Review) ---

interface QuestionCardProps {
    question: QuizQuestion;
    index: number;
    totalQuestions: number;
    userAnswerIndex: number | null;
    onAnswerSelect: (optionIndex: number) => void;
    readOnly: boolean;
    showRationale: boolean;
}

const QuestionCard: React.FC<QuestionCardProps> = ({ question, index, totalQuestions, userAnswerIndex, onAnswerSelect, readOnly, showRationale }) => {
    const [showHint, setShowHint] = useState(false);

    const getOptionClass = (optIndex: number, isCorrect: boolean) => {
        const baseClass = "w-full text-left p-4 rounded-lg border-2 transition-all duration-200 relative group ";

        if (userAnswerIndex !== null) {
            if (isCorrect) {
                return baseClass + "bg-green-100 dark:bg-green-900/40 border-green-500 text-green-800 dark:text-green-100";
            }
            if (userAnswerIndex === optIndex && !isCorrect) {
                return baseClass + "bg-red-100 dark:bg-red-900/40 border-red-500 text-red-800 dark:text-red-100 opacity-90";
            }
            return baseClass + "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 opacity-50";
        } else {
            return baseClass + "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-gray-700";
        }
    };

    return (
        <div className="bg-white dark:bg-gray-800 p-6 md:p-8 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 mb-6">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    Question {index + 1} <span className="text-gray-300 dark:text-gray-600">/</span> {totalQuestions}
                </span>
                {userAnswerIndex !== null && (
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${question.answerOptions[userAnswerIndex].isCorrect
                        ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                        : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                        }`}>
                        {question.answerOptions[userAnswerIndex].isCorrect ? "Correct" : "Incorrect"}
                    </span>
                )}
            </div>

            {/* Question */}
            <h2 className="text-xl md:text-2xl font-semibold text-black dark:text-white mb-8 leading-relaxed font-tau-paalai" dangerouslySetInnerHTML={{ __html: processContentForHTML(question.question) }} />

            {/* Options */}
            <div className="space-y-4 mb-6">
                {question.answerOptions.map((option, optIndex) => (
                    <div key={optIndex}>
                        <button
                            onClick={() => !readOnly && userAnswerIndex === null && onAnswerSelect(optIndex)}
                            disabled={readOnly || userAnswerIndex !== null}
                            className={getOptionClass(optIndex, option.isCorrect)}
                        >
                            <div className="flex items-start gap-3">
                                <div className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center mt-0.5 transition-colors ${userAnswerIndex !== null
                                    ? (option.isCorrect ? "border-green-500 text-green-500" : (userAnswerIndex === optIndex ? "border-red-500 text-red-500" : "border-gray-300 dark:border-gray-600"))
                                    : "border-gray-300 dark:border-gray-600 group-hover:border-blue-500"
                                    }`}>
                                    {userAnswerIndex !== null && option.isCorrect && <div className="w-3 h-3 rounded-full bg-green-500"></div>}
                                    {userAnswerIndex === optIndex && !option.isCorrect && <div className="w-3 h-3 rounded-full bg-red-500"></div>}
                                </div>
                                <div className="flex-1 font-tau-paalai text-xl" dangerouslySetInnerHTML={{ __html: processContentForHTML(option.text) }} />
                            </div>
                        </button>
                    </div>
                ))}
            </div>

            {/* Rationale (Immediate Feedback) */}
            {showRationale && userAnswerIndex !== null && (
                <div className={`mt-4 p-4 rounded-lg text-sm animate-fade-in ${question.answerOptions[userAnswerIndex].isCorrect
                    ? 'bg-green-50 border border-green-100 text-green-800 dark:bg-green-900/20 dark:border-green-900 dark:text-green-300'
                    : 'bg-red-50 border border-red-100 text-red-800 dark:bg-red-900/20 dark:border-red-900 dark:text-red-300'
                    }`}>
                    <strong className="block mb-2">{question.answerOptions[userAnswerIndex].isCorrect ? "✅ Good job!" : "❌ Not quite right."}</strong>
                    <div dangerouslySetInnerHTML={{ __html: processContentForHTML(question.answerOptions.find(o => o.isCorrect)?.rationale || "No explanation provided.") }} />
                </div>
            )}

            {/* Hint */}
            <div className="min-h-[2rem]">
                {(userAnswerIndex === null && question.hint) && (
                    <>
                        <button onClick={() => setShowHint(!showHint)} className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 transition-colors">
                            <span className="text-lg">💡</span> {showHint ? 'Hide Hint' : 'Show Hint'}
                        </button>
                        {showHint && (
                            <div className="mt-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-100 dark:border-yellow-900/50 rounded-lg animate-fade-in">
                                <p className="text-sm text-yellow-800 dark:text-yellow-200" dangerouslySetInnerHTML={{ __html: processContentForHTML(question.hint) }} />
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

// --- Main View ---
import { useContentUpdate } from '../../context/ContentUpdateContext';

export const QuizView: React.FC<QuizViewProps> = ({ lessonId, user, category }) => {
    const [version, setVersion] = useState(0);
    const { triggerContentUpdate } = useContentUpdate();
    const { data: groupedContent, isLoading } = useApi(() => api.getContentsByLessonId(lessonId, ['quiz'], (user.role !== 'admin' && !user.canEdit), category), [lessonId, version, user, category]);
    const { showToast } = useToast();

    const canEdit = user.role === 'admin' || !!user.canEdit;

    const [quizzes, setQuizzes] = useState<Content[]>([]);
    const [selectedQuiz, setSelectedQuiz] = useState<Content | null>(null);
    const [questions, setQuestions] = useState<QuizQuestion[]>([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [userAnswers, setUserAnswers] = useState<(number | null)[]>([]);
    const [viewMode, setViewMode] = useState<'list' | 'question' | 'result' | 'review'>('list');
    const [viewStats, setViewStats] = useState<{ count: number; downloads: number } | null>(null);
    const [selectedQuestionIndices, setSelectedQuestionIndices] = useState<Set<number>>(new Set());

    const toggleQuestionSelection = (index: number) => {
        const newSet = new Set(selectedQuestionIndices);
        if (newSet.has(index)) {
            newSet.delete(index);
        } else {
            newSet.add(index);
        }
        setSelectedQuestionIndices(newSet);
    };

    const handleSaveQuestionSelection = async () => {
        if (!selectedQuiz) return;

        try {
            const filteredQuestions = questions.filter((_, index) => selectedQuestionIndices.has(index));

            await api.updateContent(selectedQuiz._id, {
                body: JSON.stringify(filteredQuestions)
            });

            setQuestions(filteredQuestions);
            // Reset indices to match new length (all selected)
            const newIndices = new Set<number>();
            for (let i = 0; i < filteredQuestions.length; i++) newIndices.add(i);
            setSelectedQuestionIndices(newIndices);

            showToast('Question selection updated successfully', 'success');
            setVersion(v => v + 1);
            triggerContentUpdate();
        } catch (error) {
            console.error('Failed to update questions:', error);
            showToast('Failed to update questions', 'error');
        }
    };

    // Export state
    const [exportModalOpen, setExportModalOpen] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const exportContainerRef = useRef<HTMLDivElement>(null);
    const [pickerOpen, setPickerOpen] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [isQuizConfigOpen, setIsQuizConfigOpen] = useState(false); // Helper if needed, but QuizConfig is separate usually. Wait, QuizView renders the list to PLAY. Adding is usually done via a separate tab or Config.
    // The previous implementation used QuizConfiguration component separate from QuizView.
    // However, the requested flow is to add/link from THIS page if we are in admin mode.
    // Standard 'standard' QuizView typically only lists quizzes.
    // But in D+ context, we want to Link.

    // Note: QuizView.tsx is for TAKING quizzes usually. QuizConfiguration is for EDITING/ADDING.
    // BUT the user interaction implies we are seeing this "Below Average" page which uses ContentDisplay -> QuizView.
    // And users want to "Add New" here.
    // The previous summary mentioned QuizConfiguration was updated.
    // Let's check how "Add New" is normally surfaced. 
    // Usually it's in QuizConfiguration.tsx. But here we are in QuizView.tsx.
    // If QuizView is just for display, where is the "Add" button?
    // In other views (Video, Audio), the Add button IS in the View.
    // In QuizView, it seems there is NO "Add" button in the standard view, only Select.
    // The "Add" functionality for Quizzes is usually in a separate "Quiz Configuration" tab/page.
    // HOWEVER, for "Below Average" page, we want everything in one place?
    // The BelowAveragePage uses ContentDisplay which renders QuizView.
    // So if I want to "Link" a quiz, I should probably add the button here in QuizView when in List mode.


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
                setViewStats({ count: 0, downloads: h.quizDownloadCount || 0 });
            } catch (e) {
                console.error('Failed to fetch stats', e);
            }
        };
        updateStats();
    }, [lessonId]);

    useEffect(() => {
        const quizList = groupedContent?.[0]?.docs || [];
        setQuizzes(quizList);

        // Auto-select first quiz ONLY for Admin/Editors
        if (canEdit && quizList.length > 0) {
            const firstQuiz = quizList[0];
            setSelectedQuiz(firstQuiz);
            if (firstQuiz.body) {
                try {
                    const parsedQuestions = JSON.parse(firstQuiz.body.replace(/&quot;/g, '"'));
                    setQuestions(parsedQuestions);
                    setUserAnswers(new Array(parsedQuestions.length).fill(null));

                    // Init selection set with all indices for first quiz
                    const indices = new Set<number>();
                    parsedQuestions.forEach((_: any, i: number) => indices.add(i));
                    setSelectedQuestionIndices(indices);
                } catch (e) {
                    console.error("Failed to parse quiz JSON:", e);
                    setQuestions([]);
                }
            }
        } else {
            // For students, start with no selection (Card View)
            setSelectedQuiz(null);
            setQuestions([]);
        }

        setViewMode('list');
    }, [groupedContent, canEdit]);

    const selectQuiz = (quiz: Content) => {
        setSelectedQuiz(quiz);
        setViewStats(prev => ({ ...prev!, count: 0 })); // Reset view stats for the new quiz session
        if (quiz.body) {
            try {
                const parsedQuestions = JSON.parse(quiz.body.replace(/&quot;/g, '"'));
                setQuestions(parsedQuestions);
                setUserAnswers(new Array(parsedQuestions.length).fill(null));

                // Init selection set with all indices
                const indices = new Set<number>();
                parsedQuestions.forEach((_: any, i: number) => indices.add(i));
                setSelectedQuestionIndices(indices);

                setCurrentQuestionIndex(0);
                // Student -> Game Mode immediately. Admin -> Study List View.
                setViewMode(canEdit ? 'list' : 'question');
            } catch (e) {
                console.error("Failed to parse quiz JSON:", e);
                setQuestions([]);
            }
        } else {
            setQuestions([]);
        }
    };

    const handleAnswerSelect = (optionIndex: number) => {
        if (userAnswers[currentQuestionIndex] !== null) return;

        const newAnswers = [...userAnswers];
        newAnswers[currentQuestionIndex] = optionIndex;
        setUserAnswers(newAnswers);
    };

    const handleNext = () => {
        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(i => i + 1);
        } else {
            setViewMode('result');
        }
    };

    const handlePrev = () => {
        if (currentQuestionIndex > 0) {
            setCurrentQuestionIndex(i => i - 1);
        }
    };

    const handleRetry = () => {
        setCurrentQuestionIndex(0);
        setUserAnswers(new Array(questions.length).fill(null));
        setViewMode('question');
    };

    const handleReview = () => {
        setViewMode('review');
    };

    const handleBackToList = () => {
        setViewMode('list');
        // If student, clear selection (go back to Grid).
        // If admin, keep selection (go back to Tabs/Study View).
        if (!canEdit) {
            setSelectedQuiz(null);
        }
    };

    const handleLinkContent = async (selectedItems: Content[]) => {
        try {
            await Promise.all(selectedItems.map(item => {
                // Copy the quiz
                // Quizzes are stored in 'body' as JSON string
                return api.addContent({
                    lessonId,
                    type: 'quiz',
                    title: item.title,
                    body: item.body,
                    isPublished: false,
                    category: category,
                    metadata: item.metadata
                });
            }));
            setVersion(v => v + 1);
            triggerContentUpdate();
            showToast(`Successfully linked ${selectedItems.length} quizzes`, 'success');
        } catch (e) {
            console.error(e);
            showToast('Failed to link content', 'error');
        }
    };


    const handleTogglePublish = async (quiz: Content) => {
        try {
            const newStatus = !quiz.isPublished;
            await api.updateContent(quiz._id, { isPublished: newStatus });
            setVersion(v => v + 1);
            triggerContentUpdate(); // Update sidebar counts
            showToast(`Quiz ${newStatus ? 'published' : 'unpublished'} successfully`, 'success');
        } catch (error) {
            console.error('Failed to toggle publish status:', error);
            showToast('Failed to update publish status', 'error');
        }
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
            const hierarchy = await api.getHierarchy(lessonId);
            const lessonName = hierarchy?.lessonName || 'Quiz';

            let allContentHTML = '';

            quizzes.forEach((quiz, quizIndex) => {
                let quizQuestions: QuizQuestion[] = [];
                try {
                    quizQuestions = JSON.parse(quiz.body.replace(/&quot;/g, '"'));
                } catch (e) { return; }

                allContentHTML += `<h2 style="margin-top: 30px; font-size: 18pt; color: #b91c1c; border-bottom: 2px solid #b91c1c; padding-bottom: 5px;">Quiz ${quizIndex + 1}: ${quiz.title}</h2>`;

                quizQuestions.forEach((q, qIndex) => {
                    let optionsHTML = '';
                    q.answerOptions.forEach((opt, optIndex) => {
                        const isCorrect = opt.isCorrect;
                        const colorStyle = isCorrect ? 'color: #15803d; font-weight: bold;' : 'color: #374151;';
                        const icon = isCorrect ? '✅' : '○';

                        optionsHTML += `
                            <div style="margin-bottom: 5px; ${colorStyle} page-break-inside: avoid;">
                                <span style="display: inline-block; width: 25px;">${icon}</span>
                                ${processContentForHTML(opt.text)}
                            </div>
                        `;
                    });

                    allContentHTML += `
                        <div class="question-container" style="page-break-inside: avoid; margin-bottom: 20px; border-bottom: 1px dashed #eee; padding-bottom: 15px;">
                            <div style="font-weight: bold; font-size: 14pt; margin-bottom: 10px; color: #111;">
                                <span style="color: #b91c1c; margin-right: 5px;">Q${qIndex + 1}.</span>
                                ${processContentForHTML(q.question)}
                            </div>
                            <div style="margin-left: 15px; font-size: 12pt;">
                                ${optionsHTML}
                            </div>
                            ${q.answerOptions.find(o => o.isCorrect)?.rationale ? `
                                <div style="margin-top: 8px; font-size: 11pt; color: #555; font-style: italic; background: #f9f9f9; padding: 5px; border-left: 3px solid #ddd;">
                                    <strong>Explanation:</strong> ${processContentForHTML(q.answerOptions.find(o => o.isCorrect)?.rationale || '')}
                                </div>
                            ` : ''}
                        </div>
                     `;
                });
            });

            if (!allContentHTML) throw new Error("No quiz content available to export.");

            if (!exportContainerRef.current) throw new Error('Export container missing');

            const { PdfExportHelper } = await import('../../services/pdfExportHelper');

            const pdfBlob = await PdfExportHelper.generateAndExport(exportContainerRef.current, {
                fileName: lessonName,
                hierarchy: hierarchy,
                contentHTML: allContentHTML,
                user: user,
                isAdmin: isAdmin,
                email: email,
                onProgress: (msg) => setSweetAlert(prev => ({ ...prev, message: msg + '\n\nPlease wait...' }))
            });

            if (isAdmin) {
                const url = URL.createObjectURL(pdfBlob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `${lessonName.replace(/[^a-zA-Z0-9\u0B80-\u0BFF]/g, '_')}_Quiz_${new Date().toISOString().slice(0, 10)}.pdf`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);

                api.incrementLessonDownload(lessonId, 'quiz').catch(console.error);
                setViewStats(prev => prev ? { ...prev, downloads: prev.downloads + 1 } : { count: 0, downloads: 1 });

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
                formData.append('file', pdfBlob, `${lessonName}_Quiz.pdf`);
                formData.append('email', email);
                formData.append('title', `Quiz: ${lessonName}`);
                formData.append('lessonId', lessonId);
                formData.append('type', 'quiz');
                formData.append('userName', user.name || 'User');

                const res = await fetch('/api/export/send-pdf', {
                    method: 'POST',
                    body: formData,
                });

                const responseData = await res.json();

                if (res.ok && responseData.success) {
                    api.incrementLessonDownload(lessonId, 'quiz').catch(console.error);
                    setViewStats(prev => prev ? { ...prev, downloads: prev.downloads + 1 } : { count: 0, downloads: 1 });

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


    const stats = useMemo(() => {
        let correct = 0, wrong = 0, skipped = 0;
        userAnswers.forEach((ansIndex, qIndex) => {
            if (ansIndex === null) skipped++;
            else if (questions[qIndex].answerOptions[ansIndex].isCorrect) correct++;
            else wrong++;
        });
        const total = questions.length;
        const accuracy = total > 0 ? (correct / total) * 100 : 0;
        return { correct, wrong, skipped, total, accuracy };
    }, [userAnswers, questions]);

    if (isLoading) return <div className="text-center p-8 text-gray-500">Loading Quiz...</div>;

    if (isCreating) {
        return (
            <QuizConfiguration
                lessonIdProp={lessonId}
                categoryProp={category}
                embedded={true}
                onBack={() => {
                    setIsCreating(false);
                    setVersion(v => v + 1);
                    triggerContentUpdate();
                }}
            />
        );
    }

    if (quizzes.length === 0) {
        return (
            <div className="p-8">
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-3">
                            <QuizIcon className="w-8 h-8 text-rose-600" />
                            <h1 className="text-lg sm:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-rose-600 dark:from-white dark:to-rose-400">Quiz</h1>
                        </div>
                    </div>
                    {canEdit && category === 'below_average_d_plus' && (
                        <div className="flex gap-2">
                            <button
                                onClick={() => setPickerOpen(true)}
                                className="flex items-center gap-2 px-3 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors shadow-sm"
                                title="Link Existing Standard Quiz"
                            >
                                <LinkIcon className="w-5 h-5" />
                                <span className="hidden sm:inline">Link Existing</span>
                            </button>
                            <button
                                onClick={() => setIsCreating(true)}
                                className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                                title="Create New Quiz"
                            >
                                <PlusIcon className="w-5 h-5" />
                                <span className="hidden sm:inline">Create New</span>
                            </button>
                        </div>
                    )}
                </div>
                <div className="text-center py-20 bg-white dark:bg-gray-800/50 rounded-lg shadow-inner">
                    <QuizIcon className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600" />
                    <p className="mt-4 text-gray-500">No quiz available for this chapter.</p>
                </div>

                <StandardContentPicker
                    isOpen={pickerOpen}
                    onClose={() => setPickerOpen(false)}
                    onImport={handleLinkContent}
                    lessonId={lessonId}
                    resourceType="quiz"
                />
            </div >
        );
    }

    // --- Game View (Full Screen) ---
    if (viewMode === 'question' && selectedQuiz) {
        return (
            <div className="fixed inset-0 z-50 bg-gray-50 dark:bg-gray-900 flex flex-col animate-fade-in">
                {/* Game Header */}
                <div className="bg-white dark:bg-gray-800 p-4 shadow-sm border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                    <button onClick={handleBackToList} className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-rose-600 transition-colors">
                        <ChevronRightIcon className="w-5 h-5 rotate-180" />
                        <span className="font-bold">Exit Quiz</span>
                    </button>
                    <div className="text-lg font-bold text-gray-800 dark:text-white truncate max-w-md">
                        {selectedQuiz.title}
                    </div>
                    <div className="text-sm font-medium text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 px-3 py-1 rounded-full">
                        {currentQuestionIndex + 1} / {questions.length}
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-gray-200 dark:bg-gray-700 h-1.5">
                    <div
                        className="bg-rose-500 h-1.5 transition-all duration-300"
                        style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
                    ></div>
                </div>

                {/* Game Content */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-8 flex justify-center">
                    <div className="w-full max-w-3xl">
                        <QuestionCard
                            question={questions[currentQuestionIndex]}
                            index={currentQuestionIndex}
                            totalQuestions={questions.length}
                            userAnswerIndex={userAnswers[currentQuestionIndex]}
                            onAnswerSelect={handleAnswerSelect}
                            readOnly={false}
                            showRationale={!!userAnswers[currentQuestionIndex]}
                        />

                        {/* Navigation Actions */}
                        <div className="flex justify-between mt-8">
                            <button
                                onClick={handlePrev}
                                disabled={currentQuestionIndex === 0}
                                className="px-6 py-3 rounded-xl bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold border border-gray-200 dark:border-gray-700 disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
                            >
                                Previous
                            </button>

                            {currentQuestionIndex < questions.length - 1 ? (
                                <button
                                    onClick={handleNext}
                                    className="px-8 py-3 rounded-xl bg-gradient-to-r from-rose-500 to-orange-500 text-white font-bold shadow-lg hover:shadow-rose-500/30 transform hover:-translate-y-1 transition-all flex items-center gap-2"
                                >
                                    Next Question
                                    <ChevronRightIcon className="w-5 h-5" />
                                </button>
                            ) : (
                                <button
                                    onClick={() => setViewMode('result')}
                                    className="px-8 py-3 rounded-xl bg-gradient-to-r from-green-500 to-teal-500 text-white font-bold shadow-lg hover:shadow-green-500/30 transform hover:-translate-y-1 transition-all flex items-center gap-2 animate-pulse"
                                >
                                    Finish Quiz
                                    <CheckCircleIcon className="w-5 h-5" />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // --- Result View ---
    if (viewMode === 'result' && selectedQuiz) {
        return (
            <div className="fixed inset-0 z-50 bg-gray-50 dark:bg-gray-900 flex flex-col animate-fade-in overflow-y-auto">
                <div className="min-h-screen flex items-center justify-center p-4">
                    <div className="max-w-4xl w-full bg-white dark:bg-gray-800 rounded-3xl shadow-2xl overflow-hidden">
                        {/* Result Header */}
                        <div className="bg-gradient-to-br from-rose-600 to-orange-600 p-8 sm:p-12 text-center text-white relative overflow-hidden">
                            <h1 className="text-3xl sm:text-4xl font-extrabold mb-2 relative z-10">Quiz Completed!</h1>
                            <p className="text-rose-100 text-lg relative z-10">{selectedQuiz.title}</p>
                            {stats.accuracy > 70 && <Fireworks />}
                        </div>

                        {/* Stats Grid */}
                        <div className="p-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                                <div className="flex justify-center items-center p-6 bg-gray-50 dark:bg-gray-700/30 rounded-2xl">
                                    <CircularProgress percentage={stats.accuracy} color={stats.accuracy >= 80 ? '#22c55e' : stats.accuracy >= 50 ? '#eab308' : '#ef4444'} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <StatCard label="Total" value={stats.total} colorClass="text-gray-700 dark:text-gray-200" bgClass="bg-gray-50 dark:bg-gray-700/30" />
                                    <StatCard label="Correct" value={stats.correct} colorClass="text-green-600 dark:text-green-400" bgClass="bg-green-50 dark:bg-green-900/20" />
                                    <StatCard label="Wrong" value={stats.wrong} colorClass="text-red-600 dark:text-red-400" bgClass="bg-red-50 dark:bg-red-900/20" />
                                    <StatCard label="Skipped" value={stats.skipped} colorClass="text-gray-500 dark:text-gray-400" bgClass="bg-gray-100 dark:bg-gray-700/50" />
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex flex-col sm:flex-row justify-center gap-4">
                                <button onClick={handleRetry} className="flex-1 py-4 px-6 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-white font-bold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center justify-center gap-2">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                                    Try Again
                                </button>
                                <button onClick={handleBackToList} className="flex-1 py-4 px-6 rounded-xl bg-rose-600 text-white font-bold hover:bg-rose-700 shadow-lg shadow-rose-500/30 transition-all flex items-center justify-center gap-2">
                                    <ChevronRightIcon className="w-5 h-5 rotate-180" />
                                    Back to Quiz List
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }


    // --- Standard User: Card Grid View ---
    if (!canEdit && viewMode === 'list') {
        return (
            <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900 overflow-y-auto p-4 sm:p-8 animate-fade-in custom-scrollbar">
                <div className="max-w-7xl mx-auto w-full">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-gradient-to-br from-rose-500 to-orange-500 rounded-2xl shadow-lg shadow-rose-500/20">
                                <QuizIcon className="w-8 h-8 text-white" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">Quizzes</h1>
                                <p className="text-gray-500 dark:text-gray-400 font-medium">{quizzes.length} {quizzes.length === 1 ? 'Quiz' : 'Quizzes'} Available</p>
                            </div>
                        </div>
                    </div>

                    {quizzes.length === 0 ? (
                        <div className="text-center py-32 bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-dashed border-gray-200 dark:border-gray-700">
                            <div className="w-20 h-20 bg-gray-50 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-6">
                                <QuizIcon className="w-10 h-10 text-gray-300 dark:text-gray-500" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No quizzes yet</h3>
                            <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto">Check back later for new study materials.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {quizzes.map((quiz) => {
                                let qCount = 0;
                                try { qCount = JSON.parse(quiz.body?.replace(/&quot;/g, '"') || '[]').length } catch (e) { }

                                return (
                                    <button
                                        key={quiz._id}
                                        onClick={() => selectQuiz(quiz)}
                                        className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 text-left group flex flex-col h-full"
                                    >
                                        <div className="flex justify-between items-start mb-6">
                                            <div className="p-3 rounded-xl bg-orange-50 dark:bg-orange-900/20 text-orange-500 dark:text-orange-400 group-hover:bg-rose-500 group-hover:text-white transition-colors duration-300">
                                                <QuizIcon className="w-6 h-6" />
                                            </div>
                                            <span className="px-3 py-1 rounded-full bg-gray-50 dark:bg-gray-700 text-xs font-bold text-gray-500 dark:text-gray-400 border border-gray-100 dark:border-gray-600">{qCount} Qs</span>
                                        </div>
                                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3 line-clamp-2 leading-tight group-hover:text-rose-600 transition-colors">{quiz.title}</h3>
                                        <div className="mt-auto pt-4 border-t border-gray-50 dark:border-gray-700 flex items-center justify-between text-sm font-bold text-gray-400 group-hover:text-rose-600 transition-colors">
                                            <span>Start Quiz</span>
                                            <div className="w-8 h-8 rounded-full bg-gray-50 dark:bg-gray-700 group-hover:bg-rose-100 dark:group-hover:bg-rose-900/30 flex items-center justify-center transition-colors">
                                                <ChevronRightIcon className="w-4 h-4" />
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // --- Admin: Tabbed Quiz View (List Mode) ---
    return (
        <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900 overflow-y-auto custom-scrollbar relative">
            {/* Header Section (Scrolls Away) */}
            <div className="bg-white dark:bg-gray-800 p-4 sm:px-6 shadow-sm z-10 relative">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-rose-100 dark:bg-rose-900/30 rounded-lg">
                            <QuizIcon className="w-6 h-6 text-rose-600 dark:text-rose-400" />
                        </div>
                        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                            Quizzes
                        </h1>
                        {quizzes.length > 0 && (
                            <span className="px-2.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-xs font-medium text-gray-600 dark:text-gray-300">
                                {quizzes.length}
                            </span>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        {!isLoading && quizzes.length > 0 && (
                            <button
                                onClick={handleExportInitiate}
                                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm text-sm font-medium"
                                title="Export all Quizzes to PDF"
                            >
                                <DownloadIcon className="w-4 h-4" />
                                <span className="hidden sm:inline">PDF</span>
                            </button>
                        )}

                        {canEdit && category === 'below_average_d_plus' && (
                            <>
                                <button
                                    onClick={() => setPickerOpen(true)}
                                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors shadow-sm text-sm font-medium"
                                >
                                    <LinkIcon className="w-4 h-4" />
                                    <span>Link</span>
                                </button>
                                <button
                                    onClick={() => setIsCreating(true)}
                                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm text-sm font-medium"
                                >
                                    <PlusIcon className="w-4 h-4" />
                                    <span>Create</span>
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Tabs (Sticky) */}
            {quizzes.length > 0 && (
                <div className="sticky top-0 z-20 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm px-4 sm:px-6 py-2 transition-all">
                    <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
                        {quizzes.map((quiz) => (
                            <button
                                key={quiz._id}
                                onClick={() => selectQuiz(quiz)}
                                className={`
                                    whitespace-nowrap px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 border flex-shrink-0
                                    ${selectedQuiz?._id === quiz._id
                                        ? 'bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-900/20 dark:border-rose-800 dark:text-rose-300 shadow-sm'
                                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-750 dark:hover:text-gray-200'
                                    }
                                `}
                            >
                                {quiz.title}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Content Area (Natural Flow) */}
            <div className="flex-1 bg-gray-50 dark:bg-gray-900/50 p-4 sm:p-6 pb-20">
                {isLoading ? (
                    <div className="flex justify-center items-center h-full text-gray-500">Loading...</div>
                ) : quizzes.length === 0 ? (
                    <div className="h-full flex flex-col justify-center items-center text-center p-8">
                        <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-sm border border-dashed border-gray-300 dark:border-gray-700 max-w-md">
                            <QuizIcon className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Quizzes Available</h3>
                            <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm">
                                Get started by creating a new quiz or linking an existing one.
                            </p>
                            {canEdit && category === 'below_average_d_plus' && (
                                <div className="flex gap-3 justify-center">
                                    <button
                                        onClick={() => setPickerOpen(true)}
                                        className="px-4 py-2 bg-teal-50 text-teal-700 hover:bg-teal-100 rounded-lg text-sm font-medium transition-colors"
                                    >
                                        Link Existing
                                    </button>
                                    <button
                                        onClick={() => setIsCreating(true)}
                                        className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors border border-transparent shadow-sm"
                                    >
                                        Create New
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                ) : selectedQuiz && questions.length > 0 ? (
                    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
                        {/* Quiz Info / Header in content */}
                        <div className="flex justify-between items-center bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={() => setViewMode('question')}
                                    className="px-4 py-2 bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600 text-white font-bold rounded-lg shadow-md transition-all flex items-center gap-2 transform hover:scale-105"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                                    </svg>
                                    Play Quiz
                                </button>
                                <div>
                                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">{selectedQuiz.title}</h2>
                                    <p className="text-sm text-gray-500">{questions.length} Questions</p>
                                </div>
                            </div>
                            {canEdit && (
                                <div className="flex gap-2 items-center">
                                    {/* Selection Controls for D+ Category */}
                                    {category === 'below_average_d_plus' && (
                                        <div className="flex items-center gap-2 mr-4 border-r border-gray-200 dark:border-gray-700 pr-4">
                                            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                                                Selected: {selectedQuestionIndices.size} / {questions.length}
                                            </span>
                                            {selectedQuestionIndices.size !== questions.length && (
                                                <button
                                                    onClick={handleSaveQuestionSelection}
                                                    className="px-3 py-1.5 bg-rose-600 text-white text-xs font-bold rounded-lg hover:bg-rose-700 transition-colors shadow-sm animate-pulse"
                                                >
                                                    Save Changes
                                                </button>
                                            )}
                                        </div>
                                    )}
                                    <PublishToggle
                                        isPublished={!!selectedQuiz.isPublished}
                                        onToggle={() => handleTogglePublish(selectedQuiz)}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Questions List */}
                        {questions.map((question, index) => (
                            <div key={index} className="relative group">
                                {canEdit && category === 'below_average_d_plus' && (
                                    <div className="absolute top-6 left-[-40px] z-10">
                                        <input
                                            type="checkbox"
                                            checked={selectedQuestionIndices.has(index)}
                                            onChange={() => toggleQuestionSelection(index)}
                                            className="w-6 h-6 text-rose-600 rounded border-gray-300 focus:ring-rose-500 cursor-pointer shadow-sm transition-transform hover:scale-110"
                                        />
                                    </div>
                                )}
                                <div className={`transition-opacity duration-300 ${canEdit && category === 'below_average_d_plus' && !selectedQuestionIndices.has(index) ? 'opacity-40 grayscale' : 'opacity-100'
                                    }`}>
                                    <QuestionCard
                                        question={question}
                                        index={index}
                                        totalQuestions={questions.length}
                                        userAnswerIndex={null}
                                        onAnswerSelect={() => { }}
                                        readOnly={true}
                                        showRationale={true}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : selectedQuiz ? (
                    <div className="text-center py-20 text-gray-500">
                        This quiz has no questions.
                    </div>
                ) : null}
            </div>

            <ExportEmailModal
                isOpen={exportModalOpen}
                onClose={() => setExportModalOpen(false)}
                onExport={handleExportConfirm}
                isLoading={isExporting}
            />

            <StandardContentPicker
                isOpen={pickerOpen}
                onClose={() => setPickerOpen(false)}
                onImport={handleLinkContent}
                lessonId={lessonId}
                resourceType="quiz"
            />

            <div
                ref={exportContainerRef}
                style={{
                    position: 'fixed',
                    top: '-10000px',
                    left: '-10000px',
                    width: '794px',
                    visibility: 'visible',
                    pointerEvents: 'none',
                    zIndex: -9999,
                }}
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
                    </div>
                </div>
            )}
        </div >
    );
};
