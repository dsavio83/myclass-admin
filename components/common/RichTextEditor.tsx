import React, { useEffect, useRef, useState } from 'react';
import Quill from 'quill';
import 'quill/dist/quill.snow.css';
import { SaveFormat } from '../../types';
import { EDITOR_FONTS } from '../fonts';

interface RichTextEditorProps {
    initialContent: string;
    onChange: (content: string) => void;
    onDownload?: (format: SaveFormat) => void;
    onSave?: (content: string) => void;
    onCancel?: () => void;
    onPublish?: () => void;
    isPublished?: boolean;
    placeholder?: string;
    height?: string;
    hideHeader?: boolean;
}

// --- Constants ---
const FONT_SIZES = Array.from({ length: 43 }, (_, i) => i + 8); // 8 to 50

// --- Insert Table Modal ---
const InsertTableModal = ({ isOpen, onClose, onInsert }: any) => {
    const [rows, setRows] = useState(3);
    const [cols, setCols] = useState(3);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-sm animate-fade-in">
                <h3 className="text-lg font-bold mb-4">Insert Table</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Rows</label>
                        <input type="number" min="1" max="50" value={rows} onChange={e => setRows(Number(e.target.value))} className="w-full border rounded p-2 focus:ring-2 focus:ring-indigo-500" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Columns</label>
                        <input type="number" min="1" max="20" value={cols} onChange={e => setCols(Number(e.target.value))} className="w-full border rounded p-2 focus:ring-2 focus:ring-indigo-500" />
                    </div>
                    <div className="flex justify-end gap-2 mt-4">
                        <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
                        <button onClick={() => { onInsert(rows, cols); onClose(); }} className="px-4 py-2 text-sm text-white bg-indigo-600 hover:bg-indigo-700 rounded">Insert</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- HTML Input Modal ---
const HtmlInputModal = ({ isOpen, onClose, onInsert }: any) => {
    const [htmlCode, setHtmlCode] = useState('');

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-2xl h-[500px] flex flex-col animate-fade-in">
                <h3 className="text-lg font-bold mb-2 font-tamil">Paste HTML Code (HTML மூலத்தை உள்ளிடவும்)</h3>
                <p className="text-xs text-gray-500 mb-4">Paste your HTML table or content here to convert it into the editor.</p>

                <textarea
                    className="flex-1 w-full border border-gray-300 rounded-lg p-4 font-mono text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none bg-gray-50"
                    placeholder="<table>...</table> or <tr>...</tr>"
                    value={htmlCode}
                    onChange={(e) => setHtmlCode(e.target.value)}
                />

                <div className="flex justify-end gap-2 mt-4">
                    <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
                    <button
                        onClick={() => { onInsert(htmlCode); onClose(); setHtmlCode(''); }}
                        className="px-6 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded shadow"
                    >
                        Insert HTML
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- Advanced Table Properties Modal (Tabbed & Resizable) ---
const TablePropertiesModal = ({ isOpen, onClose, onSave, initialProps, targetElements }: any) => {
    const [activeTab, setActiveTab] = useState<'table' | 'row' | 'cell'>('table');
    const [props, setProps] = useState(initialProps);

    useEffect(() => {
        if (isOpen) {
            setProps(initialProps);
            setActiveTab('table');
        }
    }, [isOpen, initialProps]);

    if (!isOpen) return null;

    const handleChange = (key: string, value: string) => {
        setProps((prev: any) => ({ ...prev, [key]: value }));
    };

    const handleReset = () => {
        setProps({
            width: '100%',
            borderStyle: 'solid',
            borderWidth: '1',
            borderColor: '#000000',
            borderCollapse: 'collapse',
            backgroundColor: '#ffffff',
            rowHeight: '',
            rowBackgroundColor: '',
            cellWidth: '',
            cellPadding: '8',
            textAlign: 'left',
            verticalAlign: 'top',
            fontSize: '16px',
            cellBackgroundColor: ''
        });
    };

    const TabButton = ({ id, label }: { id: string, label: string }) => (
        <button
            onClick={() => setActiveTab(id as any)}
            className={`flex-1 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === id ? 'border-indigo-600 text-indigo-700 bg-indigo-50' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
        >
            {label}
        </button>
    );

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-hidden">
            <div
                className="bg-white rounded-xl shadow-2xl flex flex-col animate-fade-in relative resize overflow-auto min-w-[350px] min-h-[400px]"
                style={{ width: '600px', height: '500px', maxWidth: '95vw', maxHeight: '90vh' }}
            >
                <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50 flex-shrink-0">
                    <h3 className="text-lg font-bold text-gray-800">Table Properties</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-red-500">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="flex border-b border-gray-200 flex-shrink-0">
                    <TabButton id="table" label="Table" />
                    <TabButton id="row" label="Row" />
                    <TabButton id="cell" label="Cell" />
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    {activeTab === 'table' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <label className="block text-sm font-semibold mb-1">Total Width</label>
                                <div className="flex gap-2">
                                    <input type="range" min="10" max="100" className="flex-1" value={parseInt(props.width)} onChange={e => handleChange('width', e.target.value + '%')} />
                                    <span className="text-sm w-12 text-right">{props.width}</span>
                                </div>
                            </div>

                            <div className="bg-gray-50 p-4 rounded-lg col-span-2 border border-gray-200">
                                <h4 className="font-semibold text-indigo-600 mb-3 text-sm">Borders</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs mb-1 text-gray-600">Style</label>
                                        <select className="w-full border rounded p-1.5 text-sm" value={props.borderStyle} onChange={e => handleChange('borderStyle', e.target.value)}>
                                            <option value="solid">Solid</option>
                                            <option value="dashed">Dashed</option>
                                            <option value="dotted">Dotted</option>
                                            <option value="double">Double</option>
                                            <option value="none">None</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs mb-1 text-gray-600">Width (px)</label>
                                        <input type="number" className="w-full border rounded p-1.5 text-sm" value={props.borderWidth} onChange={e => handleChange('borderWidth', e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="block text-xs mb-1 text-gray-600">Color</label>
                                        <input type="color" className="w-full h-8 cursor-pointer border rounded" value={props.borderColor} onChange={e => handleChange('borderColor', e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="block text-xs mb-1 text-gray-600">Collapse</label>
                                        <select className="w-full border rounded p-1.5 text-sm" value={props.borderCollapse} onChange={e => handleChange('borderCollapse', e.target.value)}>
                                            <option value="collapse">Collapse</option>
                                            <option value="separate">Separate</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold mb-1">Background Color</label>
                                <input type="color" className="w-full h-10 border rounded cursor-pointer" value={props.backgroundColor} onChange={e => handleChange('backgroundColor', e.target.value)} />
                            </div>
                        </div>
                    )}

                    {activeTab === 'row' && (
                        <div className="space-y-4">
                            <div className="p-3 bg-yellow-50 text-yellow-800 text-xs rounded border border-yellow-200">
                                Settings apply to the selected row.
                            </div>
                            <div>
                                <label className="block text-sm font-semibold mb-1">Row Height (px)</label>
                                <input type="text" placeholder="auto" className="w-full border rounded p-2" value={props.rowHeight || ''} onChange={e => handleChange('rowHeight', e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold mb-1">Row Background</label>
                                <input type="color" className="w-full h-10 border rounded cursor-pointer" value={props.rowBackgroundColor || '#ffffff'} onChange={e => handleChange('rowBackgroundColor', e.target.value)} />
                            </div>
                        </div>
                    )}

                    {activeTab === 'cell' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded border border-blue-200 col-span-2">
                                Settings apply to the selected cell(s).
                            </div>
                            <div>
                                <label className="block text-sm font-semibold mb-1">Cell Width (px/%)</label>
                                <input type="text" className="w-full border rounded p-2" value={props.cellWidth || ''} onChange={e => handleChange('cellWidth', e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold mb-1">Padding (px)</label>
                                <input type="number" className="w-full border rounded p-2" value={props.cellPadding} onChange={e => handleChange('cellPadding', e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold mb-1">Text Align</label>
                                <select className="w-full border rounded p-2" value={props.textAlign} onChange={e => handleChange('textAlign', e.target.value)}>
                                    <option value="left">Left</option>
                                    <option value="center">Center</option>
                                    <option value="right">Right</option>
                                    <option value="justify">Justify</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold mb-1">Vertical Align</label>
                                <select className="w-full border rounded p-2" value={props.verticalAlign || 'top'} onChange={e => handleChange('verticalAlign', e.target.value)}>
                                    <option value="top">Top</option>
                                    <option value="middle">Middle</option>
                                    <option value="bottom">Bottom</option>
                                </select>
                            </div>

                            <div className="col-span-2">
                                <label className="block text-sm font-semibold mb-1">Font Size (px)</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        list="font-sizes"
                                        className="w-full border rounded p-2"
                                        value={props.fontSize}
                                        onChange={e => handleChange('fontSize', e.target.value)}
                                        placeholder="Select or type..."
                                    />
                                    <datalist id="font-sizes">
                                        {FONT_SIZES.map(size => (
                                            <option key={size} value={`${size}px`}>{size}px</option>
                                        ))}
                                    </datalist>
                                </div>
                            </div>

                            <div className="col-span-2">
                                <label className="block text-sm font-semibold mb-1">Cell Background</label>
                                <input type="color" className="w-full h-10 border rounded cursor-pointer" value={props.cellBackgroundColor || '#ffffff'} onChange={e => handleChange('cellBackgroundColor', e.target.value)} />
                            </div>
                        </div>
                    )}

                </div>

                <div className="px-6 py-4 border-t border-gray-200 flex justify-between gap-3 bg-gray-50 rounded-b-xl flex-shrink-0">
                    <button onClick={handleReset} className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded border border-transparent hover:border-red-200">
                        Reset Default
                    </button>
                    <div className="flex gap-2">
                        <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50">Cancel</button>
                        <button onClick={() => { onSave(props, activeTab); onClose(); }} className="px-4 py-2 text-sm font-bold text-white bg-indigo-600 rounded hover:bg-indigo-700 shadow">Apply</button>
                    </div>
                </div>

                <div className="absolute bottom-1 right-1 pointer-events-none opacity-50">
                    <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 19l-7-7 7 0v7z" /></svg>
                </div>
            </div>
        </div>
    );
};

// --- Context Menu Component ---
const ContextMenu = ({ x, y, onAction, onClose }: any) => {
    useEffect(() => {
        const handleClick = () => onClose();
        document.addEventListener('click', handleClick);
        return () => document.removeEventListener('click', handleClick);
    }, [onClose]);

    const MenuItem = ({ icon, label, onClick, textClass = "text-gray-700 hover:text-indigo-600", isLast = false }: any) => (
        <button onClick={onClick} className={`w-full text-left px-4 py-2 text-sm ${textClass} hover:bg-indigo-50 flex items-center gap-2 ${isLast ? 'border-b border-gray-100 mb-1 pb-2' : ''}`}>
            {icon}
            {label}
        </button>
    );

    return (
        <div
            className="fixed z-[110] bg-white rounded-lg shadow-xl border border-gray-200 py-1 w-56 animate-fade-in"
            style={{ top: y, left: x }}
        >
            <div className="px-3 py-1.5 text-xs font-bold text-gray-400 uppercase tracking-wider">Rows</div>
            <MenuItem
                label="Insert Row Above"
                onClick={() => onAction('insertRowAbove')}
                icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>}
            />
            <MenuItem
                label="Insert Row Below"
                onClick={() => onAction('insertRowBelow')}
                icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>}
            />
            <MenuItem
                label="Delete Row"
                onClick={() => onAction('deleteRow')}
                icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>}
                isLast
            />

            <div className="px-3 py-1.5 text-xs font-bold text-gray-400 uppercase tracking-wider">Columns</div>
            <MenuItem
                label="Insert Column Left"
                onClick={() => onAction('insertColLeft')}
                icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>}
            />
            <MenuItem
                label="Insert Column Right"
                onClick={() => onAction('insertColRight')}
                icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>}
            />
            <MenuItem
                label="Delete Column"
                onClick={() => onAction('deleteCol')}
                icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
                isLast
            />

            <MenuItem
                label="Delete Table"
                onClick={() => onAction('deleteTable')}
                icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                textClass="text-red-600 hover:bg-red-50"
            />
            <MenuItem
                label="Table Properties..."
                onClick={() => onAction('properties')}
                textClass="text-indigo-700 hover:bg-indigo-50 font-bold"
            />
        </div>
    );
};

export const RichTextEditor: React.FC<RichTextEditorProps & { hideHeader?: boolean }> = ({ initialContent, onChange, onDownload, onSave, onCancel, onPublish, isPublished, placeholder, height = 'h-full', hideHeader = false }) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const quillInstance = useRef<any>(null);
    const onChangeRef = useRef(onChange);

    // Keep onChangeRef updated with the latest callback
    useEffect(() => {
        onChangeRef.current = onChange;
    }, [onChange]);

    // States
    const [showInsertTable, setShowInsertTable] = useState(false);
    const [showTableProps, setShowTableProps] = useState(false);
    const [showHtmlInput, setShowHtmlInput] = useState(false);

    // Context Menu State
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number } | null>(null);

    const [targetElements, setTargetElements] = useState<{ table: HTMLElement | null, row: HTMLElement | null, cell: HTMLElement | null }>({ table: null, row: null, cell: null });
    const [selectedFont, setSelectedFont] = useState(EDITOR_FONTS[0].value);

    // Default Table Props
    const [tableProps, setTableProps] = useState({
        width: '100%',
        borderStyle: 'solid',
        borderWidth: '1',
        borderColor: '#000000',
        borderCollapse: 'collapse',
        backgroundColor: '#ffffff',
        rowHeight: '',
        rowBackgroundColor: '',
        cellWidth: '',
        cellPadding: '8',
        textAlign: 'left',
        verticalAlign: 'top',
        fontSize: '16px',
        cellBackgroundColor: ''
    });

    useEffect(() => {
        if (editorRef.current && !quillInstance.current) {

            const toolbarOptions = [
                [{ 'header': [1, 2, 3, false] }],
                ['bold', 'italic', 'underline', 'strike'],
                [{ 'color': [] }, { 'background': [] }],
                [{ 'script': 'sub' }, { 'script': 'super' }],
                [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                [{ 'align': [] }],
                ['image', 'video', 'formula'],
                ['table_custom'],
                ['clean']
            ];

            quillInstance.current = new Quill(editorRef.current, {
                theme: 'snow',
                modules: {
                    table: true,
                    toolbar: {
                        container: toolbarOptions,
                        handlers: {
                            'table_custom': () => setShowInsertTable(true)
                        }
                    },
                    keyboard: {
                        bindings: {
                            linebreak: {
                                key: 13,
                                shiftKey: true,
                                handler: function (range: any) {
                                    this.quill.clipboard.dangerouslyPasteHTML(range.index, '<br>');
                                }
                            }
                        }
                    }
                },
                placeholder: placeholder || 'Type code or text here...'
            });

            // Add Custom Table Icon
            const toolbar = quillInstance.current.getModule('toolbar');
            const customButton = toolbar.container.querySelector('.ql-table_custom');
            if (customButton) {
                customButton.innerHTML = `<svg viewBox="0 0 18 18"><rect class="ql-stroke" height="12" width="12" x="3" y="3"></rect><rect class="ql-fill" height="2" width="3" x="5" y="5"></rect><rect class="ql-fill" height="2" width="4" x="9" y="5"></rect><line class="ql-stroke" x1="9" x2="9" y1="11" y2="15"></line></svg>`;
                customButton.title = "Insert Table";
            }

            // Add Font Picker
            const fontSpan = document.createElement('span');
            fontSpan.className = 'ql-formats';
            const fontSelect = document.createElement('select');
            fontSelect.className = 'ql-font-custom px-2 py-1 border rounded text-sm text-gray-700 bg-white ml-2';
            fontSelect.style.width = '120px';

            EDITOR_FONTS.forEach(font => {
                const option = document.createElement('option');
                option.value = font.value;
                option.text = font.name;
                option.style.fontFamily = font.value;
                fontSelect.appendChild(option);
            });

            fontSelect.addEventListener('change', function (this: HTMLSelectElement) {
                const value = this.value;
                setSelectedFont(value);
                if (quillInstance.current) {
                    const range = quillInstance.current.getSelection();
                    if (range) {
                        quillInstance.current.formatText(range.index, range.length, 'font', value);
                    }
                }
            });

            toolbar.container.insertBefore(fontSpan, toolbar.container.firstChild);
            fontSpan.appendChild(fontSelect);

            quillInstance.current.on('text-change', () => {
                // Use Ref to call the latest onChange handler without needing to rebind the event listener
                onChangeRef.current(quillInstance.current.root.innerHTML);
            });

            // Handle Right Click for Context Menu
            if (editorRef.current) {
                editorRef.current.addEventListener('contextmenu', (e) => {
                    const target = e.target as HTMLElement;
                    const cell = target.closest('td, th') as HTMLElement;
                    const row = target.closest('tr') as HTMLElement;
                    const table = target.closest('table') as HTMLElement;

                    if (table) {
                        e.preventDefault();
                        setTargetElements({ table, row, cell });
                        setContextMenu({ x: e.clientX, y: e.clientY });
                    }
                });
            }
        }
    }, []);

    // Sync content
    useEffect(() => {
        if (quillInstance.current && initialContent !== undefined) {
            // Check against current content to prevent cursor jumping or loops
            if (quillInstance.current.root.innerHTML !== initialContent) {
                // Optimization: if initialContent is empty but editor has <p><br></p>, treat as invalid sync
                if (initialContent === '' && quillInstance.current.root.innerHTML === '<p><br></p>') {
                    return;
                }
                quillInstance.current.root.innerHTML = initialContent;
            }
        }
    }, [initialContent]);

    const handleInsertTable = (rows: number, cols: number) => {
        if (!quillInstance.current) return;
        let tableHtml = `<table style="width: 100%; border-collapse: collapse; border: 1px solid black; margin-bottom: 10px;">`;
        for (let r = 0; r < rows; r++) {
            tableHtml += `<tr>`;
            for (let c = 0; c < cols; c++) {
                tableHtml += `<td style="border: 1px solid black; padding: 8px; min-width: 50px;">&nbsp;</td>`;
            }
            tableHtml += `</tr>`;
        }
        tableHtml += `</table><p><br/></p>`;
        const range = quillInstance.current.getSelection(true);
        quillInstance.current.clipboard.dangerouslyPasteHTML(range ? range.index : 0, tableHtml);
    };

    const handleInsertHtml = (html: string) => {
        if (!quillInstance.current) return;

        let cleanHtml = html.trim();

        // Auto-fix partial table structures (rows/cells without table tag)
        // Checks if the content has <tr> or <th> or <td> but NO <table> tag.
        const lower = cleanHtml.toLowerCase();
        if ((lower.includes('<tr') || lower.includes('<th') || lower.includes('<td')) && !lower.includes('<table')) {

            // Ensure that if we have orphaned cells (th/td) without a row (tr), we wrap them in a tr
            if (!lower.includes('<tr')) {
                cleanHtml = `<tr>${cleanHtml}</tr>`;
            }

            // AUTO-INJECT BORDERS:
            // Regular expression to find <td> or <th> tags and inject basic border styles if not present.
            // This ensures the "line" (border) appears correctly for pasted partial tables.
            // Matches <td ... > or <th ... > and adds style="border: 1px solid #000; padding: 8px;"
            cleanHtml = cleanHtml.replace(/<(td|th)(?![^>]*style=)([^>]*)>/gi, '<$1 style="border: 1px solid #000; padding: 8px;"$2>');

            // Wrap in full table structure
            cleanHtml = `<table style="width: 100%; border-collapse: collapse; border: 1px solid #000;"><tbody>${cleanHtml}</tbody></table><br/>`;
        }

        const range = quillInstance.current.getSelection(true);
        quillInstance.current.clipboard.dangerouslyPasteHTML(range ? range.index : 0, cleanHtml);
    };

    // --- Context Menu Actions ---
    const handleContextAction = (action: string) => {
        setContextMenu(null);
        const { table, row, cell } = targetElements;

        if (!table || !row) return;

        if (action === 'deleteRow') {
            row.remove();
        } else if (action === 'deleteCol' && cell) {
            const cellIndex = Array.from(row.children).indexOf(cell);
            if (cellIndex > -1) {
                table.querySelectorAll('tr').forEach((r) => {
                    if (r.children[cellIndex]) r.children[cellIndex].remove();
                });
            }
        } else if (action === 'deleteTable') {
            table.remove();
        } else if (action === 'properties') {
            openProperties();
            return; // Don't trigger change yet
        } else if (action === 'insertRowAbove') {
            const newRow = row.cloneNode(true) as HTMLElement;
            Array.from(newRow.children).forEach((c: any) => c.innerHTML = '<br>');
            row.parentNode?.insertBefore(newRow, row);
        } else if (action === 'insertRowBelow') {
            const newRow = row.cloneNode(true) as HTMLElement;
            Array.from(newRow.children).forEach((c: any) => c.innerHTML = '<br>');
            row.parentNode?.insertBefore(newRow, row.nextSibling);
        } else if (action === 'insertColLeft' && cell) {
            const cellIndex = Array.from(row.children).indexOf(cell);
            table.querySelectorAll('tr').forEach((r) => {
                if (r.children[cellIndex]) {
                    const newCell = r.children[cellIndex].cloneNode(true) as HTMLElement;
                    newCell.innerHTML = '<br>';
                    r.insertBefore(newCell, r.children[cellIndex]);
                }
            });
        } else if (action === 'insertColRight' && cell) {
            const cellIndex = Array.from(row.children).indexOf(cell);
            table.querySelectorAll('tr').forEach((r) => {
                if (r.children[cellIndex]) {
                    const newCell = r.children[cellIndex].cloneNode(true) as HTMLElement;
                    newCell.innerHTML = '<br>';
                    r.insertBefore(newCell, r.children[cellIndex].nextSibling);
                }
            });
        }

        onChange(quillInstance.current.root.innerHTML);
    };

    const openProperties = () => {
        const { table, row, cell } = targetElements;
        // Pre-fill props
        setTableProps({
            width: table?.style.width || '100%',
            borderStyle: table?.style.borderStyle || 'solid',
            borderWidth: table?.style.borderWidth?.replace('px', '') || '1',
            borderColor: table?.style.borderColor || '#000000',
            borderCollapse: table?.style.borderCollapse || 'collapse',
            backgroundColor: table?.style.backgroundColor || '#ffffff',
            rowHeight: row ? row.style.height?.replace('px', '') : '',
            rowBackgroundColor: row ? row.style.backgroundColor : '',
            cellWidth: cell ? (cell.style.width || '') : '',
            cellPadding: cell ? cell.style.padding?.replace('px', '') || '8' : '8',
            textAlign: cell ? (cell.style.textAlign || 'left') : 'left',
            verticalAlign: cell ? (cell.style.verticalAlign || 'top') : 'top',
            fontSize: cell ? (cell.style.fontSize || '16px') : '16px',
            cellBackgroundColor: cell ? (cell.style.backgroundColor || '') : ''
        });
        setShowTableProps(true);
    };

    const handleApplyTableProps = (newProps: any, activeTab: string) => {
        const { table, row, cell } = targetElements;

        if (activeTab === 'table' && table) {
            table.style.width = newProps.width;
            table.style.borderCollapse = newProps.borderCollapse;
            table.style.backgroundColor = newProps.backgroundColor;
            table.style.border = `${newProps.borderWidth}px ${newProps.borderStyle} ${newProps.borderColor}`;

            const cells = table.querySelectorAll('td, th');
            cells.forEach((c: any) => {
                c.style.border = `${newProps.borderWidth}px ${newProps.borderStyle} ${newProps.borderColor}`;
            });
        }

        if (activeTab === 'row' && row) {
            if (newProps.rowHeight) row.style.height = `${newProps.rowHeight}px`;
            else row.style.height = '';
            if (newProps.rowBackgroundColor) row.style.backgroundColor = newProps.rowBackgroundColor;
        }

        if (activeTab === 'cell' && cell) {
            if (newProps.cellWidth) cell.style.width = newProps.cellWidth.includes('%') ? newProps.cellWidth : `${newProps.cellWidth}px`;
            cell.style.padding = `${newProps.cellPadding}px`;
            cell.style.textAlign = newProps.textAlign;
            cell.style.verticalAlign = newProps.verticalAlign;
            cell.style.fontSize = newProps.fontSize;
            if (newProps.cellBackgroundColor) cell.style.backgroundColor = newProps.cellBackgroundColor;
            else cell.style.backgroundColor = '';
        }

        onChange(quillInstance.current.root.innerHTML);
    };

    return (
        <div className={`flex flex-col ${height} bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden relative`}>
            {!hideHeader && (
                <div className="bg-indigo-50 px-6 py-2 border-b border-indigo-100 flex justify-between items-center flex-shrink-0">
                    <h3 className="text-lg font-bold text-indigo-900 font-tamil">
                        Advanced Editor
                    </h3>
                    <div className="flex items-center gap-2">
                        <button onClick={() => setShowHtmlInput(true)} className="px-3 py-1.5 text-xs font-semibold text-teal-700 bg-white border border-teal-200 rounded-lg hover:bg-teal-50 flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
                            Paste HTML
                        </button>
                        {onDownload && (
                            <>
                                <button onClick={() => onDownload(SaveFormat.HTML)} className="px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-white border border-indigo-200 rounded-lg hover:bg-indigo-50 flex items-center gap-1">
                                    HTML
                                </button>
                                <button onClick={() => onDownload(SaveFormat.DOC)} className="px-3 py-1.5 text-xs font-semibold text-blue-700 bg-white border border-blue-200 rounded-lg hover:bg-blue-50 flex items-center gap-1">
                                    DOC
                                </button>
                            </>
                        )}

                        {onCancel && (
                            <button onClick={onCancel} className="ml-2 px-4 py-1.5 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-1">
                                Cancel
                            </button>
                        )}

                        {onPublish && (
                            <button
                                onClick={onPublish}
                                className={`px-3 py-1.5 text-xs font-bold border rounded-lg flex items-center gap-1 transition-colors ${isPublished
                                    ? 'text-green-700 bg-green-50 border-green-200 hover:bg-green-100'
                                    : 'text-gray-500 bg-gray-50 border-gray-200 hover:bg-gray-100'
                                    }`}
                                title={isPublished ? "Unpublish" : "Publish"}
                            >
                                <div className={`w-2 h-2 rounded-full ${isPublished ? 'bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]' : 'bg-gray-400'}`}></div>
                                {isPublished ? 'Published' : 'Draft'}
                            </button>
                        )}

                        {onSave && (
                            <button
                                onClick={() => onSave(quillInstance.current ? quillInstance.current.root.innerHTML : '')}
                                className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 border border-indigo-600 rounded-lg hover:bg-indigo-700 flex items-center gap-1 shadow-sm"
                            >
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                Save
                            </button>
                        )}
                    </div>
                </div>
            )}

            <div className="flex-1 bg-white overflow-hidden flex flex-col relative h-full">
                <div ref={editorRef} className="flex-1 overflow-y-auto h-full" style={{ border: 'none' }}></div>

                <InsertTableModal
                    isOpen={showInsertTable}
                    onClose={() => setShowInsertTable(false)}
                    onInsert={handleInsertTable}
                />

                <HtmlInputModal
                    isOpen={showHtmlInput}
                    onClose={() => setShowHtmlInput(false)}
                    onInsert={handleInsertHtml}
                />

                <TablePropertiesModal
                    isOpen={showTableProps}
                    onClose={() => setShowTableProps(false)}
                    onSave={handleApplyTableProps}
                    initialProps={tableProps}
                    targetElements={targetElements}
                />

                {contextMenu && (
                    <ContextMenu
                        x={contextMenu.x}
                        y={contextMenu.y}
                        onAction={handleContextAction}
                        onClose={() => setContextMenu(null)}
                    />
                )}
            </div>
        </div>
    );
};
