import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Content, User } from '../../types';
import { useApi } from '../../hooks/useApi';
import * as api from '../../services/api';
import { SlideIcon } from '../icons/ResourceTypeIcons';
import { TrashIcon, UploadCloudIcon, ExpandIcon, SaveIcon, ChevronLeftIcon, ChevronRightIcon, EyeIcon, CheckCircleIcon } from '../icons/AdminIcons';
import { CloseIcon } from '../icons/ToastIcons';
import { ConfirmModal } from '../ConfirmModal';
import { PdfViewer } from './PdfViewer';
import { useToast } from '../../context/ToastContext';
import { ContentStatusBanner } from '../common/ContentStatusBanner';
import { formatCount } from '../../utils/formatUtils';
import { useContentUpdate } from '../../context/ContentUpdateContext';
import * as pdfjsLib from 'pdfjs-dist';

// Configure worker - using local worker file with CDN fallback
const CDN_WORKER_URL = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
const LOCAL_WORKER_URL = '/pdf.worker.min.js';

// Set up worker configuration with fallbacks
pdfjsLib.GlobalWorkerOptions.workerSrc = LOCAL_WORKER_URL;

interface SlideViewProps {
    lessonId: string;
    user: User;
}

// Utility to convert Base64 to Blob URL for faster PDF rendering
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

// Full-screen slide viewer with navigation controls
const FullscreenSlideViewer: React.FC<{
    content: Content;
    onClose: () => void;
}> = ({ content, onClose }) => {
    const [isMobile, setIsMobile] = useState(false);
    const [isLandscape, setIsLandscape] = useState(true);

    useEffect(() => {
        const checkOrientation = () => {
            setIsMobile(window.innerWidth < 768);
            setIsLandscape(window.innerWidth > window.innerHeight);
        };

        checkOrientation();
        window.addEventListener('resize', checkOrientation);
        window.addEventListener('orientationchange', checkOrientation);

        return () => {
            window.removeEventListener('resize', checkOrientation);
            window.removeEventListener('orientationchange', checkOrientation);
        };
    }, []);
    // Handle both base64 content and file-based content
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [currentSlide, setCurrentSlide] = useState(1);
    const [totalSlides, setTotalSlides] = useState(1);

    const [touchStart, setTouchStart] = useState<number | null>(null);
    const [touchEnd, setTouchEnd] = useState<number | null>(null);
    const viewerRef = useRef<any>(null);
    const [lastClickTime, setLastClickTime] = useState(0);
    const [showControls, setShowControls] = useState(false);

    useEffect(() => {
        const loadPdfFromFile = async () => {
            try {
                console.log('[FullscreenSlideViewer] Loading PDF for content:', content._id);

                // If content has a filePath, construct the URL to load the file
                if (content.file?.url) {
                    console.log('[FullscreenSlideViewer] Using Cloudinary URL:', content.file.url);
                    setPdfUrl(content.file.url);
                } else if (content.filePath) {
                    // For uploaded files, construct URL from file path
                    const url = `/api/content/${content._id}/file`;
                    console.log('[FullscreenSlideViewer] Using file URL:', url);
                    setPdfUrl(url);
                } else if (content.body && content.body.startsWith('data:application/pdf')) {
                    // Fallback for base64 content
                    const blobUrl = useBase64ToBlobUrl(content.body);
                    setPdfUrl(blobUrl);
                } else {
                    console.log('[FullscreenSlideViewer] No filePath or base64 data found');
                }
            } catch (error) {
                console.error('[FullscreenSlideViewer] Error loading PDF:', error);
            }
        };

        loadPdfFromFile();
    }, [content]);

    // Touch gesture handling for mobile
    const minSwipeDistance = 50;
    const onTouchStart = (e: React.TouchEvent) => {
        setTouchEnd(null);
        setTouchStart(e.targetTouches[0].clientX);
    };

    const onTouchMove = (e: React.TouchEvent) => {
        setTouchEnd(e.targetTouches[0].clientX);
    };

    const onTouchEnd = () => {
        if (!touchStart || !touchEnd) return;

        const distance = touchStart - touchEnd;
        const isLeftSwipe = distance > minSwipeDistance;
        const isRightSwipe = distance < -minSwipeDistance;

        if (isLeftSwipe && currentSlide < totalSlides) {
            // Swipe left - next slide
            setCurrentSlide(prev => prev + 1);
        }
        if (isRightSwipe && currentSlide > 1) {
            // Swipe right - previous slide
            setCurrentSlide(prev => prev - 1);
        }
    };

    // Handle keyboard navigation and ESC key
    useEffect(() => {
        const handleKeyPress = (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                e.preventDefault();
                // Arrow left/up - go to previous slide
                setCurrentSlide(prev => Math.max(1, prev - 1));
            } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                e.preventDefault();
                // Arrow right/down - go to next slide
                setCurrentSlide(prev => Math.min(totalSlides, prev + 1));
            } else if (e.key === 'Escape') {
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [totalSlides, onClose]);

    // Native Fullscreen handling with orientation lock
    const containerRef = useRef<HTMLDivElement>(null);

    const toggleNativeFullscreen = useCallback(async () => {
        if (!containerRef.current) return;

        if (!document.fullscreenElement) {
            try {
                await containerRef.current.requestFullscreen();
                // Attempt to lock to landscape on mobile
                const screenObj = window.screen as any;
                if (screenObj && screenObj.orientation && screenObj.orientation.lock) {
                    await screenObj.orientation.lock('landscape').catch((e: any) => {
                        console.log('Orientation lock failed:', e);
                    });
                }
            } catch (err: any) {
                console.error(`Error entering fullscreen: ${err.message}`);
            }
        } else {
            document.exitFullscreen().catch(() => { });
        }
    }, []);

    // Simplified double-click to just toggle native fullscreen - Mobile only
    const handleDoubleClick = useCallback((e: React.MouseEvent) => {
        if (!isMobile) return;
        toggleNativeFullscreen();
    }, [toggleNativeFullscreen, isMobile]);

    // Sync component closure with native fullscreen exit
    useEffect(() => {
        const handleFullscreenChange = () => {
            if (!document.fullscreenElement) {
                onClose();
            }
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            // Ensure orientation is unlocked when leaving
            const screenObj = window.screen as any;
            if (screenObj && screenObj.orientation && screenObj.orientation.unlock) {
                screenObj.orientation.unlock();
            }
        };
    }, [onClose]);

    // Handle click navigation (left/right sides - only 25% zones)
    const handleClickNavigation = useCallback((e: React.MouseEvent) => {
        if (!viewerRef.current) return;

        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickPercentage = (clickX / rect.width) * 100;

        // Left 25% for previous slide
        if (clickPercentage <= 25) {
            setCurrentSlide(prev => Math.max(1, prev - 1));
        }
        // Right 25% for next slide  
        else if (clickPercentage >= 75) {
            setCurrentSlide(prev => Math.min(totalSlides, prev + 1));
        }
        else {
            const clickY = e.clientY - rect.top;
            const clickYPercentage = (clickY / rect.height) * 100;
            if (clickYPercentage <= 30) {
                setShowControls(prev => !prev);
            }
        }
    }, [totalSlides]);

    // Update total slides when PDF loads
    const handlePdfLoad = useCallback((pdf: any) => {
        setTotalSlides(pdf.numPages);
        setCurrentSlide(1);
    }, []);

    // Enter native fullscreen automatically when component mounts
    useEffect(() => {
        // Delay slightly to ensure browser allows fullscreen request
        const timer = setTimeout(() => {
            toggleNativeFullscreen();
        }, 100);
        return () => clearTimeout(timer);
    }, [toggleNativeFullscreen]);

    return (
        <div
            ref={containerRef}
            className="fixed inset-0 bg-black z-50 flex flex-col"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
        >
            {/* Slide content area - True fullscreen Slide by Slide */}
            <div
                className="w-full h-full relative cursor-pointer select-none"
                onClick={handleClickNavigation}
                onDoubleClick={handleDoubleClick}
                ref={viewerRef}
            >
                {pdfUrl ? (
                    <SlidePdfViewer
                        url={pdfUrl}
                        currentSlide={currentSlide}
                        onSlideChange={setCurrentSlide}
                        onPdfLoad={handlePdfLoad}
                        isMobile={isMobile}
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-white">
                        <div className="text-center">
                            <SlideIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
                            <p>Loading slides...</p>
                        </div>
                    </div>
                )}

                {/* Top area with close button - shows on hover or click */}
                <div
                    className={`absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-black/70 to-transparent transition-opacity duration-300 z-30 ${showControls ? 'opacity-100' : 'opacity-0'}`}
                >
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 bg-black/70 backdrop-blur-sm hover:bg-black/90 text-white p-2 rounded-full transition-all duration-200 hover:scale-110"
                    >
                        <CloseIcon className="w-5 h-5" />
                    </button>

                    <button
                        onClick={toggleNativeFullscreen}
                        className="absolute top-4 right-16 bg-black/70 backdrop-blur-sm hover:bg-black/90 text-white p-2 rounded-full transition-all duration-200"
                        title="Toggle Fullscreen"
                    >
                        <ExpandIcon className="w-5 h-5" />
                    </button>
                </div>

                {/* Page counter */}
                <div className={`absolute bottom-4 left-4 bg-black/70 backdrop-blur-sm px-4 py-2 rounded-lg text-white text-sm font-medium transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
                    {currentSlide} / {totalSlides}
                </div>
            </div>
        </div>
    );
};

// --- Sequential Scroll Viewer (Running PDF) ---
const PdfPage: React.FC<{ pdfDoc: any; pageNum: number; scale: number; rotation?: number }> = ({ pdfDoc, pageNum, scale, rotation = 0 }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const renderTaskRef = useRef<any>(null);

    useEffect(() => {
        const renderPage = async () => {
            if (!pdfDoc || !canvasRef.current) return;
            try {
                if (renderTaskRef.current) renderTaskRef.current.cancel();
                const page = await pdfDoc.getPage(pageNum);
                const viewport = page.getViewport({ scale, rotation });
                const canvas = canvasRef.current;
                const context = canvas.getContext('2d');
                if (context) {
                    canvas.height = viewport.height;
                    canvas.width = viewport.width;
                    const renderContext = { canvasContext: context, viewport: viewport };
                    const renderTask = page.render(renderContext);
                    renderTaskRef.current = renderTask;
                    await renderTask.promise;
                }
            } catch (error: any) {
                if (error.name !== 'RenderingCancelledException') console.error('Error rendering page:', error);
            }
        };
        renderPage();
        return () => { if (renderTaskRef.current) renderTaskRef.current.cancel(); };
    }, [pdfDoc, pageNum, scale, rotation]);

    return (
        <div className="mb-0 flex justify-center bg-black">
            <canvas ref={canvasRef} className="max-w-full" />
        </div>
    );
};

const RunningPdfViewer: React.FC<{ url: string; onPdfLoad: (pdf: any) => void; isMobile?: boolean }> = ({ url, onPdfLoad, isMobile = false }) => {
    const [pdfDoc, setPdfDoc] = useState<any>(null);
    const [scale, setScale] = useState(1.0);
    const containerRef = useRef<HTMLDivElement>(null);
    const rotation = isMobile ? 90 : 0;

    useEffect(() => {
        if (!url) return;
        pdfjsLib.getDocument(url).promise.then(pdf => {
            setPdfDoc(pdf);
            onPdfLoad(pdf);
        }).catch(console.error);
    }, [url]);

    useEffect(() => {
        const calculateScale = () => {
            if (!pdfDoc || !containerRef.current) return;
            pdfDoc.getPage(1).then((page: any) => {
                const viewport = page.getViewport({ scale: 1.0, rotation });
                const containerWidth = containerRef.current?.clientWidth || window.innerWidth;
                setScale(containerWidth / viewport.width);
            });
        };
        calculateScale();
        window.addEventListener('resize', calculateScale);
        return () => window.removeEventListener('resize', calculateScale);
    }, [pdfDoc, rotation]);

    if (!pdfDoc) return null;

    return (
        <div ref={containerRef} className="w-full h-full overflow-y-auto scroll-smooth bg-black">
            {Array.from({ length: pdfDoc.numPages }, (_, i) => (
                <PdfPage key={i + 1} pdfDoc={pdfDoc} pageNum={i + 1} scale={scale} rotation={rotation} />
            ))}
        </div>
    );
};

// --- Single Slide Viewer (Old Format) ---
const SlidePdfViewer: React.FC<{
    url: string;
    currentSlide: number;
    onSlideChange: (slide: number) => void;
    onPdfLoad: (pdf: any) => void;
    isMobile: boolean;
}> = ({ url, currentSlide, onSlideChange, onPdfLoad, isMobile }) => {
    const [pdfDoc, setPdfDoc] = useState<any>(null);
    const [scale, setScale] = useState(1.0);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const renderTaskRef = useRef<any>(null);

    useEffect(() => {
        if (!url) return;
        pdfjsLib.getDocument(url).promise.then(pdf => {
            setPdfDoc(pdf);
            onPdfLoad(pdf);
        }).catch(console.error);
    }, [url]);

    useEffect(() => {
        const calculateOptimalScale = () => {
            if (!pdfDoc || !containerRef.current) return;
            const container = containerRef.current;
            pdfDoc.getPage(currentSlide).then((page: any) => {
                const unscaledViewport = page.getViewport({ scale: 1.0 });
                const scaleX = container.clientWidth / unscaledViewport.width;
                const scaleY = container.clientHeight / unscaledViewport.height;
                setScale(Math.min(scaleX, scaleY));
            });
        };
        calculateOptimalScale();
        window.addEventListener('resize', calculateOptimalScale);
        return () => window.removeEventListener('resize', calculateOptimalScale);
    }, [pdfDoc, currentSlide]);

    useEffect(() => {
        if (!pdfDoc || !canvasRef.current) return;
        const renderPage = async () => {
            try {
                if (renderTaskRef.current) renderTaskRef.current.cancel();
                const page = await pdfDoc.getPage(currentSlide);
                const viewport = page.getViewport({ scale });
                const canvas = canvasRef.current;
                const context = canvas.getContext('2d');
                if (context) {
                    canvas.height = viewport.height;
                    canvas.width = viewport.width;
                    const renderContext = { canvasContext: context, viewport: viewport };
                    const renderTask = page.render(renderContext);
                    renderTaskRef.current = renderTask;
                    await renderTask.promise;
                }
            } catch (error: any) {
                if (error.name !== 'RenderingCancelledException') console.error('Error rendering page:', error);
            }
        };
        renderPage();
    }, [pdfDoc, currentSlide, scale]);

    return (
        <div ref={containerRef} className="w-full h-full flex items-center justify-center bg-black overflow-hidden select-none">
            <canvas ref={canvasRef} className="shadow-2xl max-w-full max-h-full object-contain" />
        </div>
    );
};

const SavedSlideViewer: React.FC<{ content: Content; onRemove: () => void; isAdmin: boolean; onExpand: () => void; onTogglePublish?: () => void }> = ({
    content,
    onRemove,
    isAdmin,
    onExpand,
    onTogglePublish
}) => {
    // Handle both base64 content and file-based content
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [isMobile, setIsMobile] = useState(false);
    const [isLandscape, setIsLandscape] = useState(true);
    const [lastClickTime, setLastClickTime] = useState(0);

    useEffect(() => {
        const loadPdfFromFile = async () => {
            try {
                console.log('[SavedSlideViewer] Loading content:', content._id);
                console.log('[SavedSlideViewer] Content has filePath:', !!content.filePath);
                console.log('[SavedSlideViewer] Content body:', content.body);

                // If content has a file object (new model) or filePath (legacy), construct the URL
                // If content has a file object (new model) or filePath (legacy), construct the URL
                let url = '';
                if (content.file?.url) {
                    console.log('[SavedSlideViewer] Using Cloudinary URL:', content.file.url);
                    url = content.file.url;
                } else if (content.filePath) {
                    // For uploaded files, construct URL from content ID
                    url = `/api/content/${content._id}/file`;
                    console.log('[SavedSlideViewer] Using file URL:', url);
                } else if (content.body && content.body.startsWith('data:application/pdf')) {
                    // Fallback for base64 content
                    const blobUrl = useBase64ToBlobUrl(content.body);
                    if (blobUrl) url = blobUrl;
                }

                // Apply Proxy for external links
                if (url && url.startsWith('http') &&
                    !url.includes('cloudinary.com') &&
                    !url.includes(window.location.hostname)) {

                    const API_BASE = (import.meta as any).env.VITE_API_URL || 'http://localhost:5001';
                    url = `${API_BASE}/api/proxy/pdf?url=${encodeURIComponent(url)}`;
                }

                setPdfUrl(url);
            } catch (error) {
                console.error('Error loading PDF:', error);
            }
        };

        loadPdfFromFile();
    }, [content]);

    // View count increment removed as per request
    useEffect(() => {
        // logic removed
    }, [content._id]);

    // Handle double-click to enter fullscreen
    // Handle double-click to enter fullscreen - Mobile only
    const handleDoubleClick = useCallback((e: React.MouseEvent) => {
        if (!isMobile) return;

        const currentTime = new Date().getTime();
        if (currentTime - lastClickTime < 300) {
            onExpand();
        }
        setLastClickTime(currentTime);
    }, [lastClickTime, onExpand, isMobile]);

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
            setIsLandscape(window.innerWidth > window.innerHeight);
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);
        window.addEventListener('orientationchange', checkMobile);
        return () => {
            window.removeEventListener('resize', checkMobile);
            window.removeEventListener('orientationchange', checkMobile);
        };
    }, []);

    return (
        <div className={`bg-white dark:bg-gray-800 ${isMobile ? 'rounded-none shadow-none' : 'rounded-lg shadow-md'} relative h-full flex flex-col`}>
            <div className="absolute top-4 right-4 flex gap-2 z-20">
                {onTogglePublish && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onTogglePublish(); }}
                        className={`${isMobile ? 'p-3' : 'p-2'} rounded-full backdrop-blur-sm shadow-md transition-all ${content.isPublished ? 'bg-white/90 dark:bg-black/80 text-green-600' : 'bg-white/50 dark:bg-black/50 text-gray-500'}`}
                        title={content.isPublished ? "Published" : "Draft"}
                    >
                        <CheckCircleIcon className={`${isMobile ? 'w-6 h-6' : 'w-5 h-5'}`} />
                    </button>
                )}
                <button
                    onClick={onExpand}
                    className={`${isMobile ? 'p-3' : 'p-2'} rounded-full bg-white/50 dark:bg-black/50 hover:bg-white/80 dark:hover:bg-black/80 backdrop-blur-sm shadow-md`}
                    title="View Fullscreen"
                >
                    <ExpandIcon className={`${isMobile ? 'w-6 h-6' : 'w-5 h-5'} text-gray-600 dark:text-gray-300`} />
                </button>
                {isAdmin && (
                    <button
                        onClick={onRemove}
                        className={`${isMobile ? 'p-3' : 'p-2'} rounded-full bg-white/50 dark:bg-black/50 hover:bg-white/80 dark:hover:bg-black/80 backdrop-blur-sm shadow-md`}
                        title="Remove Slides"
                    >
                        <TrashIcon className={`${isMobile ? 'w-6 h-6' : 'w-5 h-5'} text-gray-600 dark:text-gray-300`} />
                    </button>
                )}
            </div>

            <h2 className={`text-lg p-3 font-semibold pr-24 shrink-0 text-gray-800 dark:text-white truncate ${isMobile ? 'hidden' : ''}`} title={content.title}>
                {content.title}
            </h2>

            {pdfUrl ? (
                <div
                    className={`flex-1 overflow-hidden ${isMobile ? '' : 'rounded border dark:border-gray-700'} bg-black relative cursor-pointer`}
                    onDoubleClick={handleDoubleClick}
                    title={isMobile ? "Double-click to view in fullscreen" : "View in Fullscreen"}
                >
                    <RunningPdfViewer url={pdfUrl} onPdfLoad={() => { }} />

                    {/* Hover hint - Mobile only */}
                    {isMobile && (
                        <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 bg-black/70 text-white text-xs px-2 py-1 rounded opacity-0 hover:opacity-100 transition-opacity pointer-events-none">
                            Double-click for Fullscreen Slides
                        </div>
                    )}
                </div>
            ) : (
                <div className="flex-1 aspect-[16/9] w-full bg-gray-200 dark:bg-gray-700 rounded border dark:border-gray-600 flex flex-col items-center justify-center text-center p-4">
                    <SlideIcon className="w-16 h-16 text-gray-400 dark:text-gray-500 mb-4" />
                    <p className="text-gray-600 dark:text-gray-300 font-semibold">Cannot display PDF</p>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">This slide deck cannot be opened.</p>
                </div>
            )}
        </div>
    );
};

const UploadForm: React.FC<{ lessonId: string; onUpload: () => void; onExpand: (url: string) => void; }> = ({ lessonId, onUpload, onExpand }) => {
    const [activeTab, setActiveTab] = useState<'upload' | 'link'>('upload');
    const [file, setFile] = useState<File | null>(null);
    const [title, setTitle] = useState('');
    const [folderPath, setFolderPath] = useState('');
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [linkUrl, setLinkUrl] = useState('');

    const { showToast } = useToast();

    // Optimized Title & Path Logic (Matching BookView)
    useEffect(() => {
        const fetchDefaults = async () => {
            setTitle('New Slides');
            setFolderPath('Default/Slides');

            try {
                const hierarchy = await api.getHierarchy(lessonId);

                if (hierarchy) {
                    const { className, subjectName, unitName, subUnitName, lessonName } = hierarchy;

                    const extractNum = (str: string) => {
                        if (!str) return '0';
                        const match = str.match(/\d+/);
                        return match ? match[0] : '0';
                    };

                    const unitNum = extractNum(unitName);
                    const subUnitNum = extractNum(subUnitName);
                    const lessonNum = extractNum(lessonName);

                    // Format: Unit.SubUnit.Lesson.pdf (Same as Book)
                    const formattedTitle = `${unitNum}.${subUnitNum}.${lessonNum}.pdf`;

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
                    setFolderPath(`${hierarchyPath}/Slides`);
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
                setUploadedUrl(null);
                setUploadProgress(0);
            } else {
                showToast("Please select a valid PDF file.", 'error');
                setFile(null);
            }
        }
    };

    const handleUploadToCloud = async () => {
        if (!file || !lessonId) return;

        setIsUploading(true);
        setUploadProgress(0);
        setUploadedUrl(null);

        // Refs for tracking actual state to decouple from React renders
        let actualProgress = 0;
        let isXhrDone = false;
        let xhrResponse: any = null;
        let xhrStatus = 0;

        const formData = new FormData();
        formData.append('file', file);
        formData.append('lessonId', lessonId);
        formData.append('type', 'slide');
        formData.append('title', title);

        let cleanFolder = folderPath.replace(/^(\.\.\/)?uploads\//, '');
        formData.append('folder', cleanFolder);

        const xhr = new XMLHttpRequest();

        // Animation Loop
        const progressInterval = setInterval(() => {
            setUploadProgress(prev => {
                let step = 5;

                if (isXhrDone) step = 10;

                const nextProgress = prev + step;

                // For "fast" uploads, actual jumps to 100. So we effectively animate to 100.
                const ceiling = isXhrDone ? 100 : (actualProgress > 0 ? actualProgress : 5); // Fake at least 5% start

                if (nextProgress >= 100 && isXhrDone) {
                    clearInterval(progressInterval);

                    if (xhrStatus >= 200 && xhrStatus < 300) {
                        try {
                            const result = typeof xhrResponse === 'string' ? JSON.parse(xhrResponse) : xhrResponse;
                            const url = result.file?.url || result.secure_url || result.url;
                            setUploadedUrl(url);
                            showToast('Slides uploaded and saved successfully!', 'success');
                            onUpload();
                        } catch (e) {
                            showToast('Upload succeeded but response was invalid.', 'warning');
                        }
                    } else {
                        try {
                            const errorResponse = typeof xhrResponse === 'string' ? JSON.parse(xhrResponse) : {};
                            showToast(`Upload failed: ${errorResponse.message || 'Unknown error'}`, 'error');
                        } catch (e) {
                            showToast(`Upload failed.`, 'error');
                        }
                    }
                    setIsUploading(false);
                    return 100;
                }

                return Math.min(nextProgress, ceiling);
            });
        }, 100);

        xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
                actualProgress = Math.round((e.loaded / e.total) * 100);
            }
        });

        xhr.addEventListener('load', () => {
            isXhrDone = true;
            xhrStatus = xhr.status;
            xhrResponse = xhr.responseText;
            actualProgress = 100;
        });

        xhr.addEventListener('error', () => {
            clearInterval(progressInterval);
            showToast('Network error during upload.', 'error');
            setIsUploading(false);
        });

        xhr.open('POST', '/api/upload');
        xhr.send(formData);
    };

    const handleSaveLink = async () => {
        if (!linkUrl || !title) return;
        setIsSaving(true);
        try {
            await api.addContent({
                title,
                body: linkUrl,
                lessonId,
                type: 'slide',
                metadata: { category: 'External', subCategory: 'Link' } as any
            });
            showToast('Slide link saved successfully!', 'success');
            onUpload();
        } catch (e) {
            showToast('Failed to save link.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="w-full max-w-4xl mx-auto bg-white dark:bg-gray-800/50 p-6 sm:p-8 rounded-lg shadow-md h-full flex flex-col overflow-hidden">
            <h3 className="text-lg font-bold text-center mb-6 text-gray-800 dark:text-white shrink-0">Add New Slides</h3>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6 shrink-0">
                <button
                    onClick={() => setActiveTab('upload')}
                    className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'upload'
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}
                >
                    PDF Upload
                </button>
                <button
                    onClick={() => setActiveTab('link')}
                    className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'link'
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}
                >
                    Direct Link
                </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-2">
                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Slide Title</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    {activeTab === 'upload' && (
                        <div className="space-y-6 animate-fade-in">
                            {!uploadedUrl ? (
                                <>
                                    <div className="mt-1 flex items-center justify-center px-6 pt-10 pb-10 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                        <div className="space-y-2 text-center">
                                            <UploadCloudIcon className="mx-auto h-12 w-12 text-gray-400" />
                                            <div className="flex text-sm text-gray-600 dark:text-gray-400 justify-center">
                                                <label htmlFor="slideFile" className="relative cursor-pointer rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none">
                                                    <span>Select Slide PDF</span>
                                                    <input id="slideFile" name="slideFile" type="file" className="sr-only" onChange={handleFileChange} accept=".pdf" />
                                                </label>
                                            </div>
                                            <p className="text-xs text-gray-500 dark:text-gray-500">{file ? file.name : 'PDF up to 10MB'}</p>
                                        </div>
                                    </div>

                                    {file && (
                                        <div className="space-y-4">
                                            {isUploading ? (
                                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden relative">
                                                    <div
                                                        className={`h-4 rounded-full transition-all duration-300 relative overflow-hidden ${uploadProgress === 100 ? 'bg-green-500' : 'bg-blue-600'}`}
                                                        style={{ width: `${uploadProgress === 100 ? 100 : uploadProgress}%` }}
                                                    >
                                                        <div className="absolute inset-0 bg-white/30 animate-[shimmer_2s_infinite]"></div>
                                                    </div>
                                                    <div className="text-center mt-2 flex items-center justify-center gap-2">
                                                        {uploadProgress === 100 ? (
                                                            <>
                                                                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                                                <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">Processing on Server (Please wait)...</p>
                                                            </>
                                                        ) : (
                                                            <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">{uploadProgress}% Uploading...</p>
                                                        )}
                                                    </div>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={handleUploadToCloud}
                                                    className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all"
                                                >
                                                    Upload & Save
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="text-center space-y-4 py-6 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                                    <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 dark:bg-green-900">
                                        {/* Success Icon */}
                                        <svg className="h-6 w-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">Upload Complete!</h3>
                                    <button
                                        onClick={onUpload}
                                        className="mt-4 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors"
                                    >
                                        Done & View Slides
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'link' && (
                        <div className="space-y-6 animate-fade-in">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Slide PDF URL</label>
                                <input
                                    type="url"
                                    value={linkUrl}
                                    onChange={(e) => setLinkUrl(e.target.value)}
                                    placeholder="https://example.com/slides.pdf"
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <button
                                onClick={handleSaveLink}
                                disabled={isSaving || !linkUrl}
                                className="w-full py-3 px-4 bg-gray-800 dark:bg-gray-700 text-white rounded-lg font-semibold shadow hover:bg-gray-700 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                {isSaving ? 'Saving...' : 'Save Link'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export const SlideView: React.FC<SlideViewProps> = ({ lessonId, user }) => {
    const [version, setVersion] = useState(0);
    const { triggerContentUpdate } = useContentUpdate();

    useEffect(() => {
        console.log('[SlideView] LessonId changed:', lessonId);
    }, [lessonId]);

    const { data: groupedContent, isLoading } = useApi(
        () => api.getContentsByLessonId(lessonId, ['slide'], (user.role !== 'admin' && !user.canEdit)),
        [lessonId, version, user]
    );

    const [stats, setStats] = useState<{ count: number } | null>(null);



    useEffect(() => {
        console.log('[SlideView] Content loaded:', groupedContent);
    }, [groupedContent]);

    const [confirmModalState, setConfirmModalState] = useState<{ isOpen: boolean; onConfirm: (() => void) | null }>({ isOpen: false, onConfirm: null });
    const [fullscreenMode, setFullscreenMode] = useState(false);
    const { showToast } = useToast();

    const slideContent = groupedContent?.[0]?.docs[0];
    const canEdit = user.role === 'admin' || !!user.canEdit;

    const handleDelete = (contentId: string) => {
        const confirmAction = async () => {
            await api.deleteContent(contentId);
            setVersion(v => v + 1);
            triggerContentUpdate(); // Update sidebar counts
            showToast('Slides deleted successfully.', 'success');
            setConfirmModalState({ isOpen: false, onConfirm: null });
        };
        setConfirmModalState({ isOpen: true, onConfirm: confirmAction });
    };

    const handleTogglePublish = async () => {
        if (!slideContent) return;
        try {
            const newStatus = !slideContent.isPublished;
            await api.updateContent(slideContent._id, { isPublished: newStatus });
            setVersion(v => v + 1);
            triggerContentUpdate(); // Update sidebar counts
            showToast(`Slides ${newStatus ? 'published' : 'unpublished'} successfully`, 'success');
        } catch (error) {
            console.error('Failed to toggle publish status:', error);
            showToast('Failed to update publish status', 'error');
        }
    };

    return (
        <div className="h-full overflow-hidden flex flex-col">
            {slideContent && canEdit && (
                <ContentStatusBanner isPublished={!!slideContent.isPublished} />
            )}

            <div className="flex-1 overflow-hidden flex flex-col p-0 sm:p-6 lg:p-8 min-h-0">
                {/* <div className="hidden sm:flex justify-between items-center mb-6 shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-3">
                            <SlideIcon className="w-8 h-8 text-orange-500" />
                            <h1 className="text-lg sm:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-orange-500 dark:from-white dark:to-orange-400">Slides</h1>
                        </div>

                    </div>
                </div> */}

                <div className="flex-1 p-0 overflow-hidden min-h-0 flex flex-col">
                    {isLoading && <div className="text-center py-10">Loading slides...</div>}

                    {!isLoading && slideContent && (
                        <SavedSlideViewer
                            content={slideContent}
                            onRemove={() => handleDelete(slideContent._id)}
                            isAdmin={canEdit}
                            onExpand={() => setFullscreenMode(true)}
                            onTogglePublish={canEdit ? handleTogglePublish : undefined}
                        />
                    )}

                    {!isLoading && !slideContent && (
                        canEdit ? (
                            <UploadForm lessonId={lessonId} onUpload={() => {
                                setVersion(v => v + 1);
                                triggerContentUpdate();
                            }} onExpand={() => { }} />
                        ) : (
                            <div className="text-center py-20 bg-white dark:bg-gray-800/50 rounded-lg">
                                <SlideIcon className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600" />
                                <p className="mt-4 text-gray-500">No slides available.</p>
                            </div>
                        )
                    )}
                </div>
            </div>

            <ConfirmModal
                isOpen={confirmModalState.isOpen}
                onClose={() => setConfirmModalState({ isOpen: false, onConfirm: null })}
                onConfirm={confirmModalState.onConfirm}
                title="Remove Slides"
                message="Are you sure you want to remove these slides? This action cannot be undone."
            />

            {fullscreenMode && slideContent && (
                <FullscreenSlideViewer
                    content={slideContent}
                    onClose={() => setFullscreenMode(false)}
                />
            )}
        </div>
    );
};
