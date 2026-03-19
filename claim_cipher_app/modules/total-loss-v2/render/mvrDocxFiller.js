// MVR (Market Value Report) DOCX Generator — Template Fill Approach
// Loads MVR_TEMPLATE.docx, fills {{TOKEN}} placeholders via JSZip, returns Blob.
// Same pattern as bcifDocxFiller.js and claimSummaryDocx.js.
// Requires JSZip loaded globally (window.JSZip).

import { fillTokensInXml } from './bcifDocxFiller.js';

const TEMPLATE_PATH = 'forms/mvr/MVR_TEMPLATE.docx';

// =========================================
//  TEMPLATE FETCH + CACHE
// =========================================

let templateCache = null;

async function fetchTemplate() {
    if (templateCache) return templateCache;

    const url = new URL(TEMPLATE_PATH, window.location.href).href;
    console.log('[MVR-DOCX] Fetching template:', url);

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch MVR template: ${response.status} ${response.statusText}`);
    }

    templateCache = await response.arrayBuffer();
    console.log('[MVR-DOCX] Template loaded, size:', templateCache.byteLength);
    return templateCache;
}

// =========================================
//  PUBLIC API
// =========================================

/**
 * Fill MVR_TEMPLATE.docx with tokenMap values.
 * Returns a Blob containing the filled DOCX.
 *
 * @param {Object} tokenMap - Flat { TOKEN_NAME: value } map
 * @param {boolean} isDemoMode - Whether to inject demo watermark
 * @returns {Promise<Blob>} Filled DOCX as a Blob
 */
export async function generateMVRDocx(tokenMap, isDemoMode = false) {
    if (typeof window.JSZip === 'undefined') {
        throw new Error('JSZip is not loaded. Add JSZip CDN to the page.');
    }

    const templateBytes = await fetchTemplate();

    const zip = await JSZip.loadAsync(templateBytes);

    const docXmlEntry = zip.file('word/document.xml');
    if (!docXmlEntry) {
        throw new Error('Template missing word/document.xml');
    }

    const docXml = await docXmlEntry.async('string');
    const { xml: filledXml, fillCount } = fillTokensInXml(docXml, tokenMap);

    console.log(`[MVR-DOCX] Filled ${fillCount} tokens in word/document.xml`);

    zip.file('word/document.xml', filledXml);

    // Fill header and footer (HEADER_BUSINESS, MVR_INSPECTION_DATE, etc.)
    for (const part of ['word/header1.xml', 'word/footer1.xml']) {
        const entry = zip.file(part);
        if (entry) {
            const partXml = await entry.async('string');
            if (partXml.includes('{{')) {
                const { xml: filledPart } = fillTokensInXml(partXml, tokenMap);
                zip.file(part, filledPart);
            }
        }
    }

    // Inject demo watermark if in demo mode
    if (isDemoMode && window.DemoWatermark) {
        await window.DemoWatermark.injectDemoWatermark(zip);
        console.log('[MVR-DOCX] Demo watermark injected');
    }

    const blob = await zip.generateAsync({
        type: 'blob',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
    });

    console.log('[MVR-DOCX] Generated DOCX, size:', blob.size);
    return blob;
}
