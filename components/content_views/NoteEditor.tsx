import React, { useState } from 'react';
import { RichTextEditor } from '../common/RichTextEditor';

interface NoteEditorProps {
    initialValue: string;
    onSave: (html: string) => Promise<void>;
    onCancel: () => void;
}

export const NoteEditor: React.FC<NoteEditorProps> = ({ initialValue, onSave, onCancel }) => {
    const [content, setContent] = useState(initialValue);
    const [isPublished, setIsPublished] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const handleSaveClick = async (htmlContent?: string) => {
        if (isSaving) return;
        setIsSaving(true);
        try {
            // Use provided html or fallback to state
            let finalContent = htmlContent !== undefined ? htmlContent : content;

            // If content is empty or just whitespace, create basic content
            if (!finalContent || finalContent.trim() === '' || finalContent === '<p><br></p>') {
                finalContent = '<p>New note content...</p>';
            }
            await onSave(finalContent);
        } catch (e) {
            console.error("Failed to save note", e);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-5 w-full note-editor-container h-[600px] flex flex-col">
            <div className="flex-1 overflow-hidden mb-4">
                <RichTextEditor
                    initialContent={initialValue}
                    onChange={setContent}
                    onSave={handleSaveClick}
                    onCancel={onCancel}
                    onPublish={() => setIsPublished(!isPublished)}
                    isPublished={isPublished}
                    placeholder="Start writing your notes here..."
                />
            </div>
        </div>
    );
};