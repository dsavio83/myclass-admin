import React, { useState, useEffect } from 'react';

interface ImportFlashcardsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onImport: (cards: { title: string; body: string }[]) => Promise<void>;
}

export const ImportFlashcardsModal: React.FC<ImportFlashcardsModalProps> = ({ isOpen, onClose, onImport }) => {
    const [text, setText] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [importMode, setImportMode] = useState<'json' | 'csv'>('json');
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            setText('');
            setError(null);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    // Parse CSV content
    const parseCSV = (csvText: string): { title: string; body: string }[] => {
        const lines = csvText.split('\n').filter(line => line.trim());
        const cards: { title: string; body: string }[] = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            // Simple CSV parsing - split by comma but handle quoted fields
            const parts = parseCSVLine(line);
            if (parts.length >= 2) {
                cards.push({
                    title: parts[0].trim(),
                    body: parts[1].trim()
                });
            }
        }
        return cards;
    };

    // Helper function to parse CSV line with proper quote handling
    const parseCSVLine = (line: string): string[] => {
        const result: string[] = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            const nextChar = line[i + 1];

            if (char === '"' && nextChar === '"') {
                current += '"';
                i++; // Skip next quote
            } else if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current);
                current = '';
            } else {
                current += char;
            }
        }
        result.push(current);
        return result;
    };

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const content = e.target?.result as string;
                setText(content);
                setImportMode('csv');
                setError(null);
            };
            reader.readAsText(file);
        } else {
            setError('Please select a CSV file.');
        }
    };

    const sanitizeAndParse = (raw: string): any[] | null => {
        try {
            // Sanitize the input by replacing HTML entities for quotes with actual quotes.
            let sanitizedText = raw.trim().replace(/&quot;/g, '"');
            // Handle smart quotes
            sanitizedText = sanitizedText.replace(/[\u201C\u201D]/g, '"');

            const parsedJson = JSON.parse(sanitizedText);
            if (Array.isArray(parsedJson)) {
                return parsedJson;
            }
            return null;
        } catch (e) {
            return null;
        }
    };

    // Check if text contains HTML entities that need to be replaced
    const hasUnformattedQuotes = () => {
        return text.includes('&quot;') || text.includes('&#39;') || text.includes('&amp;') || text.includes('&lt;') || text.includes('&gt;');
    };

    // Helper to fix unescaped quotes in values for known schema {"f": "...", "b": "..."}
    const fixUnescapedQuotes = (jsonStr: string): string => {
        const lines = jsonStr.split('\n');
        const fixedLines = lines.map(line => {
            // Match lines like: "f": "Start content... end content",
            // We capture everything between the first "f": " and the last " (before optional comma)

            // Regex explanation:
            // ^(\s*)          -> indent
            // "([fb])"        -> key "f" or "b"
            // \s*:\s*         -> separator
            // "               -> opening quote of value
            // (.*)            -> content (greedy, captures until last possible quote)
            // "               -> closing quote of value
            // (\s*,?)         -> optional comma and trailing space
            // \s*$            -> end of line
            const match = line.match(/^(\s*)"([fb])"\s*:\s*"(.*)"(\s*,?)\s*$/);

            if (match) {
                const prefix = match[1];
                const key = match[2];
                const content = match[3];
                const suffix = match[4];

                // Scan content and escape any unescaped quotes
                let fixedContent = "";
                for (let i = 0; i < content.length; i++) {
                    const char = content[i];
                    if (char === '"') {
                        // Check if already escaped
                        if (i > 0 && content[i - 1] === '\\') {
                            fixedContent += char;
                        } else {
                            // Escape it
                            fixedContent += '\\"';
                        }
                    } else {
                        fixedContent += char;
                    }
                }
                return `${prefix}"${key}": "${fixedContent}"${suffix}`;
            }
            return line;
        });
        return fixedLines.join('\n');
    };

    // Unified helper for cleaning and parsing
    const robustParse = (input: string): any[] | null => {
        // 1. Clean HTML entities and common garbage
        let cleaned = input.trim()
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&#34;/g, '"')
            .replace(/&#38;/g, '&')
            .replace(/&#60;/g, '<')
            .replace(/&#62;/g, '>')
            .replace(/[\u201C\u201D]/g, '"')
            .replace(/[\u2018\u2019]/g, "'")
            .replace(/`/g, ""); // Remove backticks

        const tryParse = (str: string) => {
            try {
                const parsed = JSON.parse(str);
                if (Array.isArray(parsed)) return parsed;
            } catch (e) { return null; }
            return null;
        };

        // 2. Try direct parse
        let result = tryParse(cleaned);
        if (result) return result;

        // 3. Try fixing unescaped quotes (Common user error)
        const fixedQuotes = fixUnescapedQuotes(cleaned);
        result = tryParse(fixedQuotes);
        if (result) return result;

        try {
            // 4. Handle "Unexpected non-whitespace character" / Multiple Root Objects
            // This happens if user pastes: {...} {...} or {...}\n{...}
            try {
                // If it starts with { and ends with }, and has multiple objects
                // Try to split objects and wrap in array
                // A simple heuristic: replace "}{" with "},{"
                // taking into account whitespace
                const fixed = `[${cleaned.replace(/}\s*\{/g, '},{')}]`;
                const parsed = JSON.parse(fixed);
                if (Array.isArray(parsed)) return parsed;
            } catch (e2) {
                // Ignore
            }

            // 5. Fallback: Try extracting all JSON objects using regex
            // This is useful if there is weird garbage text around valid JSON objects
            try {
                const matches = cleaned.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g);
                if (matches && matches.length > 0) {
                    const combined = `[${matches.join(',')}]`;
                    const parsed = JSON.parse(combined);
                    if (Array.isArray(parsed)) return parsed;
                }
            } catch (e3) {
                // Ignore
            }

            // If we are here, everything failed.
            // Throw the original error from the first parse attempt or a generic one
            JSON.parse(cleaned); // rebuild error
        } catch (e) {
            throw e;
        }
    };

    const handleFormat = () => {
        setError(null);
        console.log('[Format] Original text length:', text.length);

        try {
            const parsed = robustParse(text);
            if (parsed) {
                const formattedText = JSON.stringify(parsed, null, 2);
                console.log('[Format] Successfully formatted JSON');
                setText(formattedText);
                return;
            } else {
                setError("JSON must be an array of objects.");
            }
        } catch (e) {
            console.log('[Format] Parse error:', e.message);
            setError(`Invalid JSON syntax: ${e.message}`);
        }
    };

    const handleImport = async () => {
        if (isSaving || !text.trim()) return;

        setIsSaving(true);
        setError(null);
        let cards: { title: string; body: string }[] = [];

        if (importMode === 'csv') {
            cards = parseCSV(text);
        } else {
            try {
                // Use the same robust parser
                let parsedJson = robustParse(text);

                if (parsedJson) {
                    // Check for nested arrays (e.g. if robustParse wrapped an existing array)
                    if (parsedJson.length > 0 && Array.isArray(parsedJson[0])) {
                        parsedJson = parsedJson.flat();
                    }

                    cards = parsedJson
                        .filter(item => {
                            if (!item) return false;
                            // Relaxed check: Accept if we can find ANY property that looks like a Question/Answer
                            // Or if distinct 'f'/'b' keys exist.
                            const keys = Object.keys(item).map(k => k.toLowerCase());
                            const hasFront = item.f || item.front || item.title || item.question || item.q || keys.some(k => k.includes('question') || k === 'f' || k === 'q');
                            const hasBack = item.b || item.back || item.body || item.answer || item.a || keys.some(k => k.includes('answer') || k === 'b' || k === 'a');

                            const valid = hasFront && hasBack;
                            return valid;
                        })
                        .map(item => {
                            // Helper to find value case-insensitively
                            const getValue = (keys: string[]) => {
                                for (const key of keys) {
                                    if (item[key]) return item[key];
                                }
                                // Search by partial key match
                                for (const key of Object.keys(item)) {
                                    const lower = key.toLowerCase();
                                    if (keys.some(k => lower.includes(k) || lower === k)) return item[key];
                                }
                                return '';
                            };

                            return {
                                title: (item.f || item.front || item.title || getValue(['question', 'q', 'f']) || '').trim(),
                                body: (item.b || item.back || item.body || getValue(['answer', 'a', 'b']) || '').trim()
                            };
                        });
                }
            } catch (e) {
                console.error(e);
                // Final fallback: semicolon separated values
                // Only try this if robust parsing completely failed
                const lines = text.trim().replace(/`/g, "").split('\n'); // Clean backticks here too
                const fallbackCards = lines
                    .map(line => line.split(';'))
                    .filter(parts => parts.length >= 2 && parts[0].trim() && parts[1].trim())
                    .map(parts => ({
                        title: parts[0].trim(),
                        body: parts.slice(1).join(';').trim(),
                    }));

                if (fallbackCards.length > 0) {
                    cards = fallbackCards;
                } else {
                    // Re-throw original error to show user if fallback also failed
                    setError(`Could not parse JSON: ${e.message}. For text mode, use "Question;Answer" per line.`);
                    setIsSaving(false);
                    return;
                }
            }
        }

        if (cards.length > 0) {
            await onImport(cards);
            onClose();
        } else {
            setError(importMode === 'csv'
                ? 'Could not parse any cards from CSV. Please ensure the format is: Question,Answer'
                : 'Could not parse any cards. Please ensure JSON is an array of objects (e.g., [{"f":"Question", "b":"Answer"}]) or use "Question;Answer" format per line.'
            );
        }

        setIsSaving(false);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex justify-center items-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-3xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">Import Flashcards</h2>

                {/* Import Mode Selection */}
                <div className="mb-4 flex gap-2">
                    <button
                        onClick={() => setImportMode('json')}
                        className={`px-3 py-1 text-sm rounded-md ${importMode === 'json' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300'}`}
                    >
                        JSON/Text
                    </button>
                    <button
                        onClick={() => setImportMode('csv')}
                        className={`px-3 py-1 text-sm rounded-md ${importMode === 'csv' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300'}`}
                    >
                        CSV File
                    </button>
                </div>

                <div className="text-sm text-gray-500 dark:text-gray-400 mb-4 space-y-2">
                    {importMode === 'json' ? (
                        <>
                            {/* <p>Paste your JSON content below. Supported formats:</p> */}
                            <ul className="list-disc list-inside text-xs space-y-1">
                                <li><b>JSON Array:</b> <code className="bg-gray-100 dark:bg-gray-700 p-1 rounded-sm select-all">{`[{"f":"Question HTML","b":"Answer HTML"}]`}</code> (Use 'Format' button to clean quotes).</li>
                                {/* <li><b>Plain Text:</b> Each line: <code className="bg-gray-100 dark:bg-gray-700 p-1 rounded-sm select-all">{`Question;Answer`}</code></li> */}
                            </ul>
                        </>
                    ) : (
                        <>
                            {/* <p>Upload a CSV file or paste CSV content. Format:</p> */}
                            <ul className="list-disc list-inside text-xs space-y-1">
                                {/* <li><b>CSV Format:</b> <code className="bg-gray-100 dark:bg-gray-700 p-1 rounded-sm select-all">{`Question,Answer`}</code></li> */}
                                <li><b>First column:</b> Front - <b>Second column:</b> Back</li>
                            </ul>
                        </>
                    )}
                </div>

                {/* File Upload for CSV */}
                {importMode === 'csv' && (
                    <div className="mb-4">
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".csv"
                            onChange={handleFileUpload}
                            className="hidden"
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="px-4 py-2 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded-md hover:bg-green-200 dark:hover:bg-green-800 text-sm font-medium"
                        >
                            Choose CSV File
                        </button>
                    </div>
                )}
                <textarea
                    value={text}
                    rows={15}
                    onChange={e => { setText(e.target.value); setError(null); }}
                    placeholder={importMode === 'json'
                        ? `[\n  {\n    "f": "What is <b>HTML</b>?",\n    "b": "HyperText Markup Language"\n  }\n]`
                        : `Question 1,Answer 1\nQuestion 2,Answer 2\nQuestion 3,Answer 3`
                    }
                    className="flex-1 w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 font-mono text-xs resize-none"
                    autoFocus
                />
                {error && <p className="text-sm text-red-500 dark:text-red-400 mt-2">{error}</p>}
                {hasUnformattedQuotes() && (
                    <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
                        {/* <p className="text-sm text-yellow-800 dark:text-yellow-200">
                            ⚠️ JSON contains HTML entities (&amp;quot;, &amp;#39;, etc.) that need to be fixed. Click "Fix HTML Entities" to format.
                        </p> */}
                    </div>
                )}
                <div className="mt-4 flex justify-end gap-3">
                    {importMode === 'json' && (
                        <button onClick={handleFormat} className="px-4 py-2 bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 rounded-md hover:bg-yellow-200 dark:hover:bg-yellow-800 font-medium text-sm">
                            {hasUnformattedQuotes() ? 'Fix HTML Entities' : 'Format & Preview'}
                        </button>
                    )}
                    <button type="button" onClick={onClose} className="px-4 py-2 rounded-md text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-sm" disabled={isSaving}>
                        Cancel
                    </button>
                    <button onClick={handleImport} className="px-4 py-2 rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-wait text-sm font-medium" disabled={isSaving || !text.trim()}>
                        {isSaving ? 'Importing...' : `Import ${importMode === 'csv' ? 'from CSV' : 'Cards'}`}
                    </button>
                </div>
            </div>
        </div>
    );
};