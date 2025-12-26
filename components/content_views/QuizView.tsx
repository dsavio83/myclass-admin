import React, { useState, useEffect, useMemo, useRef } from 'react';
import { User, QuizQuestion, AnswerOption, Content } from '../../types';
import { useApi } from '../../hooks/useApi';
import * as api from '../../services/api';
import { QuizIcon } from '../icons/ResourceTypeIcons';
import { ChevronRightIcon, EyeIcon, CheckCircleIcon, DownloadIcon, XIcon } from '../icons/AdminIcons';
import { PublishToggle } from '../common/PublishToggle';
import { ContentStatusBanner } from '../common/ContentStatusBanner';
import { useToast } from '../../context/ToastContext';
import { Fireworks } from './Fireworks';
import { processContentForHTML } from '../../utils/htmlUtils';
import { formatCount } from '../../utils/formatUtils';


interface QuizViewProps {
    lessonId: string;
    user: User;
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

export const QuizView: React.FC<QuizViewProps> = ({ lessonId, user }) => {
    const [version, setVersion] = useState(0);
    const { data: groupedContent, isLoading } = useApi(() => api.getContentsByLessonId(lessonId, ['quiz'], (user.role !== 'admin' && !user.canEdit)), [lessonId, version, user]);
    const { showToast } = useToast();

    const canEdit = user.role === 'admin' || !!user.canEdit;

    const [quizzes, setQuizzes] = useState<Content[]>([]);
    const [selectedQuiz, setSelectedQuiz] = useState<Content | null>(null);
    const [questions, setQuestions] = useState<QuizQuestion[]>([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [userAnswers, setUserAnswers] = useState<(number | null)[]>([]);
    const [viewMode, setViewMode] = useState<'list' | 'question' | 'result' | 'review'>('list');
    const [viewStats, setViewStats] = useState<{ count: number; downloads: number } | null>(null);

    // Export state
    const [exportModalOpen, setExportModalOpen] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
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
        setViewMode('list');
        setSelectedQuiz(null);
    }, [groupedContent]);

    const selectQuiz = (quiz: Content) => {
        setSelectedQuiz(quiz);
        setViewStats(prev => ({ ...prev!, count: 0 })); // Reset view stats for the new quiz session
        if (quiz.body) {
            try {
                const parsedQuestions = JSON.parse(quiz.body.replace(/&quot;/g, '"'));
                setQuestions(parsedQuestions);
                setUserAnswers(new Array(parsedQuestions.length).fill(null));
                setCurrentQuestionIndex(0);
                setViewMode('question');
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
        setSelectedQuiz(null);
    };

    const handleTogglePublish = async (quiz: Content) => {
        try {
            const newStatus = !quiz.isPublished;
            await api.updateContent(quiz._id, { isPublished: newStatus });
            setVersion(v => v + 1);
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
                </div>
                <div className="text-center py-20 bg-white dark:bg-gray-800/50 rounded-lg shadow-inner">
                    <QuizIcon className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600" />
                    <p className="mt-4 text-gray-500">No quiz available for this chapter.</p>
                </div>
            </div >
        );
    }

    // --- Quiz Selection List ---
    if (viewMode === 'list') {
        return (
            <div className="flex flex-col h-full overflow-hidden">
                {canEdit && quizzes.length > 0 && (
                    <ContentStatusBanner
                        publishedCount={quizzes.filter(q => q.isPublished).length}
                        unpublishedCount={quizzes.filter(q => !q.isPublished).length}
                    />
                )}

                <div className="p-4 sm:p-6 lg:p-8 flex-1 overflow-y-auto">
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-3">
                                <QuizIcon className="w-8 h-8 text-rose-600" />
                                <h1 className="text-lg sm:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-rose-600 dark:from-white dark:to-rose-400">Select a Quiz</h1>
                            </div>
                        </div>

                        {!isLoading && quizzes.length > 0 && (
                            <button
                                onClick={handleExportInitiate}
                                className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm"
                                title="Export all Quizzes to PDF"
                            >
                                <DownloadIcon className="w-5 h-5" />
                                <span className="hidden sm:inline">PDF</span>
                                <span className="bg-white/20 px-1.5 py-0.5 rounded text-xs font-semibold ml-1">
                                    {formatCount(viewStats?.downloads || 0)}
                                </span>
                            </button>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {quizzes.map((quiz) => (
                            <button
                                key={quiz._id}
                                onClick={() => selectQuiz(quiz)}
                                className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md hover:shadow-lg transition-all border border-gray-100 dark:border-gray-700 text-left group relative"
                            >
                                {canEdit && (
                                    <div
                                        className="absolute top-4 right-4 z-10"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <PublishToggle
                                            isPublished={!!quiz.isPublished}
                                            onToggle={() => handleTogglePublish(quiz)}
                                        />
                                    </div>
                                )}
                                <div className="flex items-center justify-between mb-4">
                                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
                                        <QuizIcon className="w-8 h-8" />
                                    </div>
                                    <div className="flex items-center gap-1.5 px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded-md">
                                        <EyeIcon className="w-3 h-3 text-gray-500 dark:text-gray-400" />
                                        <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                                            {formatCount(quiz.viewCount || 0)}
                                        </span>
                                    </div>
                                </div>
                                <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2">{quiz.title}</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Click to start this quiz.</p>
                            </button>
                        ))}
                    </div>
                </div>

                <ExportEmailModal
                    isOpen={exportModalOpen}
                    onClose={() => setExportModalOpen(false)}
                    onExport={handleExportConfirm}
                    isLoading={isExporting}
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
            </div >
        );
    }

    // --- Result View ---
    if (viewMode === 'result') {
        const isPassed = stats.accuracy >= 80;
        const accuracyColor = isPassed ? '#22c55e' : (stats.accuracy >= 50 ? '#eab308' : '#ef4444');

        return (
            <div className="p-4 sm:p-6 lg:p-8 flex items-center justify-center h-full overflow-y-auto">
                <div className="max-w-4xl w-full bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-2xl text-center relative overflow-hidden animate-fade-in">
                    {isPassed && <Fireworks />}
                    <h2 className="text-3xl font-extrabold mb-2 text-gray-800 dark:text-white">{isPassed ? "🎉 Outstanding Performance!" : "Quiz Completed!"}</h2>
                    <p className="text-gray-500 dark:text-gray-400 mb-8">Here is the summary of your results.</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                        <div className="flex flex-col items-center justify-center space-y-6 bg-gray-50 dark:bg-gray-900/50 p-6 rounded-xl">
                            <div className="flex justify-around w-full items-center">
                                <CircularProgress percentage={stats.accuracy} color={accuracyColor} />
                                <PieChart correct={stats.correct} wrong={stats.wrong} skipped={stats.skipped} />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 content-center">
                            <StatCard label="Total" value={stats.total} bgClass="bg-blue-50 dark:bg-blue-900/20" colorClass="text-blue-600 dark:text-blue-400" />
                            <StatCard label="Correct" value={stats.correct} bgClass="bg-green-50 dark:bg-green-900/20" colorClass="text-green-600 dark:text-green-400" />
                            <StatCard label="Wrong" value={stats.wrong} bgClass="bg-red-50 dark:bg-red-900/20" colorClass="text-red-600 dark:text-red-400" />
                            <StatCard label="Skipped" value={stats.skipped} bgClass="bg-gray-100 dark:bg-gray-700/40" colorClass="text-gray-600 dark:text-gray-400" />
                        </div>
                    </div>
                    <div className="flex flex-col sm:flex-row justify-center gap-4">
                        <button onClick={handleReview} className="px-8 py-3 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white font-semibold rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">Review Answers</button>
                        <button onClick={handleRetry} className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1">Try Again</button>
                        {quizzes.length > 1 && (
                            <button onClick={handleBackToList} className="px-8 py-3 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-semibold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                                Other Quizzes
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // --- Review Mode (Scrollable List) ---
    if (viewMode === 'review') {
        return (
            <div className="p-4 sm:p-6 lg:p-8 flex flex-col h-full">
                <div className="flex justify-between items-center mb-1 shrink-0 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
                    <h1 className="text-lg sm:text-2xl font-bold text-gray-800 dark:text-white">Review Answers</h1>
                    <button onClick={handleBackToList} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors">
                        Back to Quiz List
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto max-w-4xl mx-auto w-full pb-10">
                    {questions.map((question, index) => (
                        <QuestionCard
                            key={index}
                            question={question}
                            index={index}
                            totalQuestions={questions.length}
                            userAnswerIndex={userAnswers[index]}
                            onAnswerSelect={() => { }}
                            readOnly={true}
                            showRationale={true}
                        />
                    ))}
                    <div className="flex justify-center mt-8">
                        <button onClick={handleBackToList} className="px-8 py-3 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white font-semibold rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600">
                            Back to Quiz List
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // --- Active Quiz Mode ---
    return (
        <div className="p-4 sm:p-6 lg:p-8 flex flex-col h-full">
            {/* Header */}
            <div className="flex justify-between items-center mb-1 shrink-0">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3">
                        {quizzes.length > 1 && (
                            <button onClick={handleBackToList} className="mr-4 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors" title="Back to Quiz List">
                                <ChevronRightIcon className="w-5 h-5 transform rotate-180 text-gray-500" />
                            </button>
                        )}
                        <QuizIcon className="w-8 h-8 text-rose-600" />
                        <h1 className="text-lg sm:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-rose-600 dark:from-white dark:to-rose-400">{selectedQuiz?.title || 'Quiz'}</h1>

                        {/* View Count for Active Quiz */}
                        {selectedQuiz && (
                            <div className="flex items-center gap-1.5 px-3 py-1 bg-gray-100 dark:bg-gray-700/50 rounded-full ml-2">
                                <EyeIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                                <span className="text-sm font-bold text-gray-600 dark:text-gray-300 animate-slide-up">
                                    {formatCount(selectedQuiz.viewCount || 0)}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Question Card Container */}
            <div className="flex-1 overflow-y-auto">
                <div className="max-w-4xl mx-auto">
                    <QuestionCard
                        question={questions[currentQuestionIndex]}
                        index={currentQuestionIndex}
                        totalQuestions={questions.length}
                        userAnswerIndex={userAnswers[currentQuestionIndex]}
                        onAnswerSelect={handleAnswerSelect}
                        readOnly={false}
                        showRationale={true} // Always show rationale after answering in strict mode
                    />

                    {/* Navigation Buttons */}
                    <div className="flex justify-between items-center pt-2 pb-10">
                        <button
                            onClick={handlePrev}
                            disabled={currentQuestionIndex === 0}
                            className="px-6 py-2.5 rounded-xl text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors shadow-sm"
                        >
                            Previous
                        </button>

                        <button
                            onClick={async () => {
                                // Increment view count if first question and not already counted in this session
                                if (currentQuestionIndex === 0 && selectedQuiz && !viewStats?.count) {
                                    try {
                                        const res = await api.incrementViewCount(selectedQuiz._id);
                                        if (res.success) {
                                            setViewStats(prev => ({ ...prev!, count: 1 })); // Mark as counted locally

                                            // Update local state immediately so list reflects it
                                            setQuizzes(prevQuizzes => prevQuizzes.map(q =>
                                                q._id === selectedQuiz._id
                                                    ? { ...q, viewCount: (q.viewCount || 0) + 1 }
                                                    : q
                                            ));

                                            // Update selectedQuiz as well for header
                                            setSelectedQuiz(prev => prev ? { ...prev, viewCount: (prev.viewCount || 0) + 1 } : null);
                                        }
                                    } catch (e) {
                                        console.error("Failed to increment quiz view", e);
                                    }
                                }
                                handleNext();
                            }}
                            className={`flex items-center gap-2 px-8 py-2.5 rounded-xl text-white font-semibold transition-all shadow-md hover:shadow-lg transform active:scale-95 ${userAnswers[currentQuestionIndex] !== null
                                ? "bg-blue-600 hover:bg-blue-700"
                                : "bg-gray-500 hover:bg-gray-600"
                                }`}
                        >
                            <span>{currentQuestionIndex === questions.length - 1 ? 'Finish Quiz' : 'Next Question'}</span>
                            <ChevronRightIcon className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div >
    );
};