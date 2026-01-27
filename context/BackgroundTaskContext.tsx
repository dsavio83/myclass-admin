import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import { useContentUpdate } from './ContentUpdateContext';
import { useToast } from './ToastContext';

export type TaskType = 'upload';
export type ContentType = 'worksheet' | 'book' | 'video' | 'audio' | 'slide' | 'questionPaper';

export interface UploadTask {
    id: string;
    type: TaskType;
    contentType: ContentType;
    file: File;
    status: 'pending' | 'uploading' | 'completed' | 'error';
    progress: number;
    error?: string;

    // Metadata for the upload
    lessonId: string;
    title: string;
    folder?: string; // For local strategy (Book, Worksheet, Slide)
    extraData?: Record<string, any>; // For extra props like examCategory

    // For Cloudinary strategy (Video, Audio)
    mimeType?: string;
}

interface BackgroundTaskContextType {
    tasks: UploadTask[];
    addTask: (task: Omit<UploadTask, 'id' | 'status' | 'progress'>) => void;
    cancelTask: (id: string) => void;
    clearCompleted: () => void;
}

const BackgroundTaskContext = createContext<BackgroundTaskContextType | undefined>(undefined);

export const BackgroundTaskProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [tasks, setTasks] = useState<UploadTask[]>([]);
    const processingRef = useRef<boolean>(false);
    const { triggerContentUpdate } = useContentUpdate();
    const { showToast } = useToast();

    // Add a new task to the queue
    const addTask = useCallback((taskData: Omit<UploadTask, 'id' | 'status' | 'progress'>) => {
        const newTask: UploadTask = {
            ...taskData,
            id: crypto.randomUUID(),
            status: 'pending',
            progress: 0
        };
        setTasks(prev => [...prev, newTask]);
    }, []);

    const cancelTask = useCallback((id: string) => {
        // Implementation for cancellation would need AbortController support in the task logic
        // For now, we just remove it if pending
        setTasks(prev => prev.filter(t => t.id !== id));
    }, []);

    const clearCompleted = useCallback(() => {
        setTasks(prev => prev.filter(t => t.status !== 'completed'));
    }, []);

    // Update a task's state in the array
    const updateTask = useCallback((id: string, updates: Partial<UploadTask>) => {
        setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    }, []);

    // The Queue Processor
    useEffect(() => {
        const processQueue = async () => {
            if (processingRef.current) return;

            // Find next pending task
            const nextTask = tasks.find(t => t.status === 'pending');
            if (!nextTask) return;

            processingRef.current = true;
            updateTask(nextTask.id, { status: 'uploading', progress: 0 });

            try {
                if (['worksheet', 'book', 'slide', 'questionPaper'].includes(nextTask.contentType)) {
                    await processLocalUpload(nextTask);
                } else if (['video', 'audio'].includes(nextTask.contentType)) {
                    await processCloudinaryUpload(nextTask);
                }

                updateTask(nextTask.id, { status: 'completed', progress: 100 });
                triggerContentUpdate(); // Refresh the views!
                showToast(`${nextTask.title} uploaded successfully`, 'success');

            } catch (error: any) {
                console.error("Task failed:", error);
                updateTask(nextTask.id, { status: 'error', error: error.message || 'Upload failed' });
                showToast(`Upload failed: ${nextTask.title}`, 'error');
            } finally {
                processingRef.current = false;
            }
        };

        processQueue();
    }, [tasks, updateTask, triggerContentUpdate, showToast]);


    // Strategy: Local Upload (Worksheet, Book, Slide, QuestionPaper)
    const processLocalUpload = (task: UploadTask): Promise<void> => {
        return new Promise((resolve, reject) => {
            const formData = new FormData();
            formData.append('file', task.file);
            formData.append('lessonId', task.lessonId);
            formData.append('type', task.contentType);
            formData.append('title', task.title);

            if (task.folder) {
                formData.append('folder', task.folder);
            }

            if (task.extraData) {
                Object.entries(task.extraData).forEach(([key, value]) => {
                    formData.append(key, value);
                });
            }

            const xhr = new XMLHttpRequest();

            xhr.upload.addEventListener('progress', e => {
                if (e.lengthComputable) {
                    // Normalize Local upload to 0-95%, save step happens after
                    const percent = Math.round(((e.loaded / e.total) * 100) * 0.95);
                    updateTask(task.id, { progress: percent });
                }
            });

            xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    resolve();
                } else {
                    reject(new Error(xhr.responseText || 'Upload failed'));
                }
            };

            xhr.onerror = () => reject(new Error('Network error'));

            xhr.open('POST', '/api/upload');
            xhr.send(formData);
        });
    };

    // Strategy: Cloudinary Upload (Video, Audio)
    const processCloudinaryUpload = async (task: UploadTask): Promise<void> => {
        // Step 1: Get Signature
        const sigRes = await fetch('/api/upload/signature', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                lessonId: task.lessonId,
                type: task.contentType,
                title: task.title,
                mimeType: task.file.type
            })
        });

        if (!sigRes.ok) throw new Error('Failed to get upload signature');
        const { signature, timestamp, cloudName, apiKey, folder, public_id } = await sigRes.json();

        // Step 2: Upload to Cloudinary
        const formData = new FormData();
        formData.append('file', task.file);
        formData.append('api_key', apiKey);
        formData.append('timestamp', timestamp.toString());
        formData.append('signature', signature);
        formData.append('folder', folder);
        formData.append('public_id', public_id);
        formData.append('use_filename', 'true');
        formData.append('unique_filename', 'true');

        await new Promise<any>((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable) {
                    // Normalize Cloudinary upload to 0-90%, save step is 90-100%
                    const percent = Math.round(((e.loaded / e.total) * 100) * 0.9);
                    updateTask(task.id, { progress: percent });
                }
            });

            xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    resolve(JSON.parse(xhr.responseText));
                } else {
                    reject(new Error(`Cloudinary error: ${xhr.statusText}`));
                }
            };
            xhr.onerror = () => reject(new Error('Network error during cloud upload'));

            const cloudUrl = `https://api.cloudinary.com/v1_1/${cloudName}/video/upload`;
            xhr.open('POST', cloudUrl);
            xhr.send(formData);
        }).then(async (result) => {
            // Step 3: Save Metadata
            updateTask(task.id, { progress: 95 }); // Saving state

            const saveRes = await fetch('/api/content/cloudinary-save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    lessonId: task.lessonId,
                    title: task.title,
                    type: task.contentType,
                    fileUrl: result.secure_url,
                    publicId: result.public_id,
                    size: result.bytes,
                    mimeType: task.file.type,
                    resourceType: 'video' // Cloudinary usually treats audio as video
                })
            });

            if (!saveRes.ok) {
                const err = await saveRes.json();
                throw new Error(err.message || 'Failed to save metadata');
            }
        });
    };

    return (
        <BackgroundTaskContext.Provider value={{ tasks, addTask, cancelTask, clearCompleted }}>
            {children}
        </BackgroundTaskContext.Provider>
    );
};

export const useBackgroundTask = () => {
    const context = useContext(BackgroundTaskContext);
    if (!context) throw new Error('useBackgroundTask must be used within a BackgroundTaskProvider');
    return context;
};
