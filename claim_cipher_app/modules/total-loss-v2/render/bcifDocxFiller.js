// Client-side BCIF DOCX generator — loads v4 template, fills {{TOKEN}} placeholders.
// Produces the same output as bcif_fill_test.py (table-based layout with checkboxes).
// Requires JSZip loaded globally (window.JSZip).

const TEMPLATE_PATH = 'forms/bcif/BCIF_AUTOMATION_TEMPLATE_v4.docx';

// =========================================
//  XML ESCAPE
// =========================================

function xmlEscape(text) {
    return String(text)
        .replace(/&/g,  '&amp;')
        .replace(/</g,  '&lt;')
        .replace(/>/g,  '&gt;')
        .replace(/"/g,  '&quot;')
        .replace(/'/g,  '&apos;');
}

// =========================================
//  SPLIT-RUN-AWARE TOKEN REPLACEMENT
// =========================================
// Word often splits {{TOKEN}} across multiple <w:r> runs within a <w:p>.
// E.g.  <w:r><w:t>{{CLAIM</w:t></w:r><w:r><w:t>_NUMBER}}</w:t></w:r>
//
// Strategy (same as bcif_fill_test.py fill_tokens_in_xml):
//   1. For each <w:p>, concatenate ALL <w:t> text content
//   2. If no {{ found, skip
//   3. Replace all {{TOKEN}} with values from tokenMap
//   4. Put ALL replaced text into the FIRST <w:t>, clear the rest

function fillTokensInXml(xml, tokenMap) {
    let fillCount = 0;

    // Match each paragraph: <w:p ...>...</w:p>
    const paraPattern = /(<w:p\b[^>]*>)([\s\S]*?)(<\/w:p>)/g;

    xml = xml.replace(paraPattern, (fullMatch, pOpen, pInner, pClose) => {
        // Find all <w:t> or <w:t xml:space="preserve"> elements (NOT <w:tab/>, <w:tabs>)
        const tPattern = /(<w:t(?=[\s>])[^>]*>)([\s\S]*?)(<\/w:t>)/g;
        const tMatches = [];
        let m;
        while ((m = tPattern.exec(pInner)) !== null) {
            tMatches.push({
                fullMatch: m[0],
                openTag:   m[1],
                text:      m[2],
                closeTag:  m[3],
                start:     m.index,
                end:       m.index + m[0].length
            });
        }

        if (tMatches.length === 0) return fullMatch;

        // Concatenate all text
        const fullText = tMatches.map(t => t.text).join('');

        // Quick check: does this paragraph contain any placeholders?
        if (!fullText.includes('{{')) return fullMatch;

        // Perform replacements
        let replacedText = fullText;
        for (const [tokenName, value] of Object.entries(tokenMap)) {
            const placeholder = '{{' + tokenName + '}}';
            if (replacedText.includes(placeholder)) {
                replacedText = replacedText.split(placeholder).join(xmlEscape(value));
                fillCount++;
            }
        }

        // If nothing changed, return as-is
        if (replacedText === fullText) return fullMatch;

        // Rebuild pInner: first <w:t> gets ALL text, rest get cleared
        let newInner = pInner;
        // Process in REVERSE order to maintain string positions
        for (let i = tMatches.length - 1; i >= 0; i--) {
            const tm = tMatches[i];
            let replacement;
            if (i === 0) {
                // First <w:t>: put full replaced text with space preservation
                replacement = `<w:t xml:space="preserve">${replacedText}</w:t>`;
            } else {
                // Subsequent <w:t>s: keep tags but clear content
                replacement = `${tm.openTag}${tm.closeTag}`;
            }
            newInner = newInner.slice(0, tm.start) + replacement + newInner.slice(tm.end);
        }

        return pOpen + newInner + pClose;
    });

    return { xml, fillCount };
}

// =========================================
//  TEMPLATE FETCH + CACHE
// =========================================

let templateCache = null;

async function fetchTemplate() {
    if (templateCache) return templateCache;

    // Resolve template path relative to the page (total-loss-studio.html)
    const url = new URL(TEMPLATE_PATH, window.location.href).href;
    console.log('[BCIF-DOCX] Fetching template:', url);

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch BCIF template: ${response.status} ${response.statusText}`);
    }

    templateCache = await response.arrayBuffer();
    console.log('[BCIF-DOCX] Template loaded, size:', templateCache.byteLength);
    return templateCache;
}

// =========================================
//  PUBLIC API
// =========================================

/**
 * Fill BCIF_AUTOMATION_TEMPLATE_v4.docx with tokenMap values.
 * Returns a Blob containing the filled DOCX.
 *
 * @param {Object} tokenMap - Flat { TOKEN_NAME: value } map from bcifRenderer.js
 * @returns {Promise<Blob>} Filled DOCX as a Blob
 */
export async function generateBCIFDocx(tokenMap) {
    if (typeof window.JSZip === 'undefined') {
        throw new Error('JSZip is not loaded. Add JSZip CDN to the page.');
    }

    const templateBytes = await fetchTemplate();

    // Open template as zip
    const zip = await JSZip.loadAsync(templateBytes);

    // Extract and fill word/document.xml
    const docXmlEntry = zip.file('word/document.xml');
    if (!docXmlEntry) {
        throw new Error('Template missing word/document.xml');
    }

    const docXml = await docXmlEntry.async('string');
    const { xml: filledXml, fillCount } = fillTokensInXml(docXml, tokenMap);

    console.log(`[BCIF-DOCX] Filled ${fillCount} tokens in word/document.xml`);

    // Replace the document XML in the zip
    zip.file('word/document.xml', filledXml);

    // Generate the filled DOCX as a Blob
    const blob = await zip.generateAsync({
        type: 'blob',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
    });

    console.log('[BCIF-DOCX] Generated DOCX, size:', blob.size);
    return blob;
}
