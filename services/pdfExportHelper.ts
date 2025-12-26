import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

interface HierarchyInfo {
    className?: string;
    subjectName?: string;
    unitName?: string;
    subUnitName?: string;
    lessonName?: string;
}

interface PdfExportOptions {
    fileName: string;
    hierarchy: HierarchyInfo;
    contentHTML: string;
    user: { name: string; role: string };
    isAdmin: boolean;
    email?: string;
    onProgress?: (msg: string) => void;
}

export class PdfExportHelper {
    private static async loadImage(url: string): Promise<string> {
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Failed to load ${url}`);
            const blob = await response.blob();
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.readAsDataURL(blob);
            });
        } catch (error) {
            console.error('Error loading image:', url, error);
            return '';
        }
    }

    private static isHeading(el: HTMLElement): boolean {
        return /^H[1-6]$/i.test(el.tagName);
    }

    private static splitContentIntoPages(htmlContent: string): string[] {
        const pages: string[] = [];
        const contentContainer = document.createElement('div');
        contentContainer.innerHTML = htmlContent;

        // Flatten content strategy
        let blockElements: HTMLElement[] = [];

        // Check if we are dealing with QA pairs (which shouldn't be flattened internally)
        const hasQaPairs = contentContainer.querySelector('.qa-pair-container');

        if (hasQaPairs) {
            blockElements = Array.from(contentContainer.children) as HTMLElement[];
        } else {
            // Un-wrap section containers first to get raw flow
            const rawNodes: Node[] = [];
            Array.from(contentContainer.children).forEach(child => {
                if (child.classList.contains('note-section')) {
                    // Unwrap note-section
                    Array.from(child.childNodes).forEach(n => rawNodes.push(n));
                } else {
                    rawNodes.push(child);
                }
            });

            // If empty (no note-sections?), just use direct children
            if (rawNodes.length === 0 && contentContainer.childNodes.length > 0) {
                Array.from(contentContainer.childNodes).forEach(n => rawNodes.push(n));
            }

            // Group Layout:
            let inlineBuffer: Node[] = [];

            const flushBuffer = () => {
                if (inlineBuffer.length === 0) return;

                // Create a wrapper for this inline sequence
                const wrapper = document.createElement('div');
                wrapper.className = 'text-block-wrapper';
                inlineBuffer.forEach(n => wrapper.appendChild(n.cloneNode(true)));

                // Check if it's just empty whitespace
                if (wrapper.textContent?.trim() || wrapper.querySelector('img') || wrapper.querySelector('table')) {
                    blockElements.push(wrapper);
                }
                inlineBuffer = [];
            };

            const isBlockLevel = (node: Node): boolean => {
                if (node.nodeType !== Node.ELEMENT_NODE) return false;
                const el = node as HTMLElement;
                const blockTags = ['DIV', 'P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'UL', 'OL', 'LI', 'TABLE', 'BLOCKQUOTE', 'PRE', 'HR', 'FIGURE'];
                return blockTags.includes(el.tagName);
            };

            rawNodes.forEach(node => {
                if (isBlockLevel(node)) {
                    flushBuffer();
                    blockElements.push(node.cloneNode(true) as HTMLElement);
                } else {
                    inlineBuffer.push(node);
                }
            });
            flushBuffer();
        }

        const tempDiv = document.createElement('div');
        tempDiv.style.cssText = `
            position: absolute;
            visibility: hidden;
            left: -9999px;
            top: -9999px;
            width: 714px; /* Exact content inner width (794px - 40px - 40px) */
            font-family: 'TAU-Paalai', 'TAU-Marutham Bold','TAU-Kabilar', 'Nirmala UI', Arial, sans-serif;
            font-size: 14pt;
            line-height: 1.6;
            padding: 0;
            margin: 0;
            word-wrap: break-word;
        `;
        document.body.appendChild(tempDiv);

        // A4 Height: 1123px
        // Header ~70px, Footer ~50px
        // Margins: Top 85px, Bottom 50px -> Avail: ~988px
        const maxHeightPerPage = 985;
        const headingThreshold = 100;

        let currentPageHTML = '';
        let currentHeight = 0;

        for (let i = 0; i < blockElements.length; i++) {
            const element = blockElements[i];

            // Measure Element
            tempDiv.innerHTML = '';
            tempDiv.appendChild(element.cloneNode(true));
            let elementHeight = tempDiv.offsetHeight;
            if (elementHeight === 0 && element.textContent?.trim()) elementHeight = 24;

            // 1. Heading Logic
            if (this.isHeading(element)) {
                const spaceLeft = maxHeightPerPage - currentHeight;
                if (spaceLeft < headingThreshold && currentPageHTML !== '') {
                    pages.push(currentPageHTML);
                    currentPageHTML = '';
                    currentHeight = 0;
                }
            }

            // 2. Fit Check
            const spaceLeft = maxHeightPerPage - currentHeight;

            if (elementHeight <= spaceLeft) {
                // FITS perfectly
                currentPageHTML += element.outerHTML;
                currentHeight += elementHeight;
            } else {
                // DOES NOT FIT
                const tagName = element.tagName;
                const isTextWrapper = element.classList.contains('text-block-wrapper') || tagName === 'P' || tagName === 'DIV';

                // If text block, > spaceLeft, and no images, try split:
                if (isTextWrapper && spaceLeft > 60 && !element.querySelector('img') && !element.querySelector('table')) {
                    const clone = element.cloneNode(true) as HTMLElement;
                    let part1Content = document.createElement(tagName);
                    if (element.className) part1Content.className = element.className;
                    part1Content.style.cssText = element.style.cssText;

                    let part2Content = document.createElement(tagName);
                    if (element.className) part2Content.className = element.className;
                    part2Content.style.cssText = element.style.cssText;

                    let splitOccurred = false;
                    const childNodes = Array.from(clone.childNodes);

                    for (let node of childNodes) {
                        if (splitOccurred) {
                            part2Content.appendChild(node.cloneNode(true));
                            continue;
                        }

                        // Try adding whole node to Part 1
                        part1Content.appendChild(node.cloneNode(true));
                        tempDiv.innerHTML = '';
                        tempDiv.appendChild(part1Content);
                        const newHeight = tempDiv.offsetHeight;

                        if (newHeight <= spaceLeft) {
                            // Fits
                        } else {
                            part1Content.removeChild(part1Content.lastChild!); // Remove it

                            // Split Text
                            if (node.nodeType === Node.TEXT_NODE) {
                                const text = node.textContent || '';
                                const words = text.split(' ');
                                let validText = '';

                                const tempTextNode = document.createTextNode('');
                                part1Content.appendChild(tempTextNode);

                                for (let w = 0; w < words.length; w++) {
                                    const testStr = validText + (validText ? ' ' : '') + words[w];
                                    tempTextNode.textContent = testStr;

                                    // Measure
                                    tempDiv.innerHTML = '';
                                    tempDiv.appendChild(part1Content);

                                    if (tempDiv.offsetHeight <= spaceLeft) {
                                        validText = testStr;
                                    } else {
                                        // Overflow
                                        tempTextNode.textContent = validText;

                                        // Rest to Part 2
                                        const remainingText = words.slice(w).join(' ');
                                        part2Content.appendChild(document.createTextNode(remainingText));
                                        splitOccurred = true;
                                        break;
                                    }
                                }
                                if (!splitOccurred) {
                                    // Should not usually reach here if logic holds, but implies even first word didn't fit?
                                    // Just push word to Part 2 if empty
                                    if (!validText) {
                                        part1Content.removeChild(tempTextNode);
                                        part2Content.appendChild(document.createTextNode(text));
                                        splitOccurred = true;
                                    }
                                }
                            } else {
                                // Element node - just push to Part 2
                                part2Content.appendChild(node.cloneNode(true));
                                splitOccurred = true;
                            }
                        }
                    }

                    if (part1Content.childNodes.length > 0) {
                        currentPageHTML += part1Content.outerHTML;
                        pages.push(currentPageHTML);
                        currentPageHTML = '';
                        currentHeight = 0;
                    } else {
                        pages.push(currentPageHTML);
                        currentPageHTML = '';
                        currentHeight = 0;
                    }

                    if (part2Content.childNodes.length > 0) {
                        // Add Part 2 to new page
                        currentPageHTML += part2Content.outerHTML;

                        // Measure Part 2 height correctly for next iteration check
                        tempDiv.innerHTML = '';
                        tempDiv.appendChild(part2Content);
                        currentHeight += tempDiv.offsetHeight;
                    }

                } else {
                    // Cannot split. Push to next page.
                    if (currentPageHTML !== '') {
                        pages.push(currentPageHTML);
                        currentPageHTML = '';
                        currentHeight = 0;
                    }
                    currentPageHTML += element.outerHTML;
                    currentHeight += elementHeight;
                }
            }

            // Spacing
            if (i < blockElements.length - 1 && currentHeight > 0) {
                const spacing = 10;
                if (currentHeight + spacing <= maxHeightPerPage) {
                    currentHeight += spacing;
                }
            }
        }

        if (currentPageHTML !== '') {
            pages.push(currentPageHTML);
        }

        document.body.removeChild(tempDiv);
        if (pages.length === 0) {
            pages.push('<div style="text-align: center; padding: 100px; color: #666; font-style: italic;">No content available.</div>');
        }

        return pages;
    }

    public static async generateAndExport(
        container: HTMLElement,
        options: PdfExportOptions
    ): Promise<Blob> {
        const { hierarchy, contentHTML, user, isAdmin, onProgress } = options;

        onProgress && onProgress('Preparing content...');

        // 1. Load Resources
        const logoImage = await this.loadImage('/top_logo.png');

        // 2. Split Pages
        const pages = this.splitContentIntoPages(contentHTML);
        console.log(`Generated ${pages.length} pages for PDF`);

        // 3. Clear container
        container.innerHTML = '';

        // 4. Inject Styles
        const styleElement = document.createElement('style');
        styleElement.textContent = `
            .pdf-page {
                width: 794px;
                min-height: 1123px;
                background: white;
                position: relative;
                font-family: 'TAU-Paalai', 'Nirmala UI', Arial, sans-serif;
                page-break-after: always;
                box-sizing: border-box;
                overflow: hidden;
            }
            .pdf-header {
                position: absolute;
                top: 25px;
                left: 40px;
                right: 40px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-bottom: 2px solid #333;
                padding-bottom: 8px;
                height: 50px;
            }
            .logo-container img { width: 159px; height: 22px; object-fit: contain; } /* Exact dimensions requested */
            .header-info {
                text-align: right;
                font-size: 10pt;
                color: #333;
                line-height: 1.2;
            }
            .header-info .class-info { font-weight: bold; color: #000; font-size: 11pt; }
            .header-info .lesson-name { font-size: 11pt; font-weight: bold; margin-top: 2px; color: #000; }
            
            .pdf-content {
                position: absolute;
                top: 85px; /* Top margin reduced */
                left: 40px;
                right: 40px;
                bottom: 35px;
                font-size: 13pt;
                line-height: 1.5;
                color: #000;
                text-align: justify; 
            }
            
            .pdf-footer {
                position: absolute;
                bottom: 20px;
                left: 40px;
                right: 40px;
                border-top: 1px solid #aaa;
                padding-top: 8px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                font-size: 9pt;
                color: #444;
            }
            .page-number { font-weight: bold; }
            
            /* --- CONTENT STYLING --- */
            h1 { font-size: 20pt; font-weight: bold; margin-top: 10px; margin-bottom: 10px; color: #000; line-height: 1.2; text-align: left; }
            h2 { font-size: 18pt; font-weight: bold; margin-top: 10px; margin-bottom: 8px; color: #000; line-height: 1.2; text-align: left; }
            h3 { font-size: 16pt; font-weight: bold; margin-top: 10px; margin-bottom: 8px; color: #000; line-height: 1.2; text-align: left; }
            h4, h5, h6 { font-size: 14pt; font-weight: bold; margin-top: 8px; margin-bottom: 5px; text-align: left; }
            
            p { margin-bottom: 10px; display: block; }

            /* Rich Text Support */
            strong, b { font-weight: bold; }
            em, i { font-style: italic; }
            u { text-decoration: underline; }
            s, strike { text-decoration: line-through; }
            sub { vertical-align: sub; font-size: smaller; }
            sup { vertical-align: super; font-size: smaller; }
            blockquote { border-left: 4px solid #ccc; margin: 10px 0; padding-left: 15px; font-style: italic; color: #555; }

            /* Lists */
            ul { list-style-type: disc; margin: 5px 0 10px 25px; padding: 0; }
            ol { list-style-type: decimal; margin: 5px 0 10px 25px; padding: 0; }
            li { margin-bottom: 4px; padding-left: 5px; }

            .text-block-wrapper { margin-bottom: 0px; } 

            table {
                width: 100% !important;
                border-collapse: collapse !important;
                margin: 10px 0 !important;
                border: 1px solid #000;
                table-layout: auto !important; /* Allow auto layout for better fit */
            }
            td, th {
                border: 1px solid #000 !important;
                padding: 4px 6px !important;
                vertical-align: top !important;
                word-wrap: break-word !important;
            }
            th { background-color: #eee; font-weight: bold; }
            
            img { max-width: 100%; height: auto; display: block; margin: 5px auto; }
            
            mjx-container { 
                font-size: 110% !important; 
                display: inline-block !important; 
                margin: 0 1px;
            }
            
            .qa-pair-container {
                border: 1px solid #ccc;
                border-radius: 6px;
                padding: 10px;
                margin-bottom: 10px;
                background-color: #fff;
            }
            .question-part { font-weight: bold; font-size: 15pt; margin-bottom: 5px; color: #000; text-align: left; }
            .answer-part { font-size: 14pt; color: #222; text-align: justify; }
        `;
        container.appendChild(styleElement);

        // 5. Render Pages to DOM
        pages.forEach((pageContent, index) => {
            const pageDiv = document.createElement('div');
            pageDiv.className = 'pdf-page';

            // Header
            const headerDiv = document.createElement('div');
            headerDiv.className = 'pdf-header';
            const logoDiv = document.createElement('div');
            logoDiv.className = 'logo-container';
            if (logoImage) {
                const logoImg = document.createElement('img');
                logoImg.src = logoImage;
                logoDiv.appendChild(logoImg);
            }
            headerDiv.appendChild(logoDiv);

            const infoDiv = document.createElement('div');
            infoDiv.className = 'header-info';
            infoDiv.innerHTML = `
                 <div class="class-info">${hierarchy?.className || ''}${hierarchy?.subjectName ? ' - ' + hierarchy.subjectName : ''}</div>
                 <div class="lesson-name">${hierarchy?.lessonName || options.fileName}</div>
             `;
            headerDiv.appendChild(infoDiv);
            pageDiv.appendChild(headerDiv);

            // Content
            const contentDiv = document.createElement('div');
            contentDiv.className = 'pdf-content';
            contentDiv.innerHTML = pageContent;
            pageDiv.appendChild(contentDiv);

            // Footer
            const footerDiv = document.createElement('div');
            footerDiv.className = 'pdf-footer';
            footerDiv.innerHTML = `
                <div class="footer-quote">நினைவு சக்தி பிறக்கும்; செய் வெற்றி கிடைக்கும்</div>
                <div class="page-number">பக்கம் ${index + 1} / ${pages.length}</div>
             `;
            pageDiv.appendChild(footerDiv);

            container.appendChild(pageDiv);
        });

        // 6. Wait for rendering
        await new Promise(resolve => setTimeout(resolve, 800));

        // 7. Generate PDF
        onProgress && onProgress('Generating pages...');
        const doc = new jsPDF('p', 'mm', 'a4');
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const pageElements = container.querySelectorAll('.pdf-page');

        for (let i = 0; i < pageElements.length; i++) {
            if (i > 0) doc.addPage();

            const page = pageElements[i] as HTMLElement;
            const canvas = await html2canvas(page, {
                scale: 2,
                backgroundColor: '#ffffff',
                logging: false,
                useCORS: true,
                allowTaint: true,
                width: 794,
                height: 1123,
                windowWidth: 794,
                onclone: (clonedDoc, element) => {
                    element.style.opacity = '1';
                    element.style.visibility = 'visible';
                    element.style.display = 'block';

                    const all = element.querySelectorAll('*');
                    all.forEach((el: any) => {
                        if (!el.style.fontFamily) {
                            el.style.fontFamily = "'TAU-Paalai', 'Nirmala UI', sans-serif";
                        }
                    });
                }
            });

            const imgData = canvas.toDataURL('image/png');
            doc.addImage(imgData, 'PNG', 0, 0, pageWidth, pageHeight, undefined, 'FAST');

            onProgress && onProgress(`Processed page ${i + 1}/${pageElements.length}`);
        }

        return doc.output('blob');
    }
}
