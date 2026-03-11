/**
 * demoWatermark.js
 * Injects aggressive, multi-layer watermarks into DOCX files for demo mode.
 * Called only when demo_mode === 'true'.
 *
 * Layers:
 *  1. Repeating diagonal "DEMO — NOT FOR PROFESSIONAL USE" text (5 instances
 *     tiled vertically across each page, rendered IN FRONT of content)
 *  2. Semi-opaque amber overlay rectangle covering the full page
 *  3. Header + footer text marks
 *  4. Document protection (readOnly) to block copy/paste
 */

const WATERMARK_TEXT = 'DEMO \u2014 NOT FOR PROFESSIONAL USE';
const WATERMARK_COLOR = 'D4A017';   // amber / gold
const WATERMARK_ALPHA = '40000';    // 40 % opacity for text
const OVERLAY_COLOR  = 'FFF3CD';    // pale amber
const OVERLAY_ALPHA  = '18000';     // ~18 % opacity for overlay rect

// Unique IDs for docPr — stagger to avoid collisions with template shapes
let _nextDocPrId = 900;
function nextId() { return _nextDocPrId++; }

// ─────────────────────────────────────────
//  Builders
// ─────────────────────────────────────────

/**
 * Build a single diagonal text-box watermark <w:p> at a given vertical offset.
 * behindDoc="0" places the shape IN FRONT of body text so it obscures content.
 */
function buildWatermarkAt(verticalOffsetEmu, relHeight) {
    const id = nextId();
    return `<w:p xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"
       xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
       xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape">
  <w:pPr><w:pStyle w:val="Header"/></w:pPr>
  <w:r>
    <w:rPr><w:noProof/></w:rPr>
    <mc:AlternateContent>
      <mc:Choice Requires="wps">
        <w:drawing>
          <wp:anchor distT="0" distB="0" distL="0" distR="0"
                     simplePos="0" relativeHeight="${relHeight}"
                     behindDoc="0" locked="0" layoutInCell="1"
                     allowOverlap="1">
            <wp:simplePos x="0" y="0"/>
            <wp:positionH relativeFrom="page">
              <wp:align>center</wp:align>
            </wp:positionH>
            <wp:positionV relativeFrom="page">
              <wp:posOffset>${verticalOffsetEmu}</wp:posOffset>
            </wp:positionV>
            <wp:extent cx="8200000" cy="900000"/>
            <wp:effectExtent l="0" t="1800000" r="0" b="1800000"/>
            <wp:wrapNone/>
            <wp:docPr id="${id}" name="DemoWatermark${id}"/>
            <wp:cNvGraphicFramePr/>
            <a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
              <a:graphicData uri="http://schemas.microsoft.com/office/word/2010/wordprocessingShape">
                <wps:wsp>
                  <wps:cNvSpPr txBox="1"/>
                  <wps:spPr>
                    <a:xfrm rot="19200000">
                      <a:off x="0" y="0"/>
                      <a:ext cx="8200000" cy="900000"/>
                    </a:xfrm>
                    <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
                    <a:noFill/>
                    <a:ln><a:noFill/></a:ln>
                  </wps:spPr>
                  <wps:txbx>
                    <w:txbxContent>
                      <w:p>
                        <w:pPr><w:jc w:val="center"/></w:pPr>
                        <w:r>
                          <w:rPr>
                            <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
                            <w:b/>
                            <w:sz w:val="72"/>
                            <w:szCs w:val="72"/>
                            <w:color w:val="${WATERMARK_COLOR}"/>
                          </w:rPr>
                          <w:t>${WATERMARK_TEXT}</w:t>
                        </w:r>
                      </w:p>
                    </w:txbxContent>
                  </wps:txbx>
                  <wps:bodyPr rot="0" vert="horz" wrap="square"
                              lIns="91440" tIns="45720" rIns="91440" bIns="45720"
                              anchor="ctr" anchorCtr="1">
                    <a:spAutoFit xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"/>
                  </wps:bodyPr>
                </wps:wsp>
              </a:graphicData>
            </a:graphic>
          </wp:anchor>
        </w:drawing>
      </mc:Choice>
      <mc:Fallback>
        <w:r><w:rPr><w:color w:val="${WATERMARK_COLOR}"/><w:sz w:val="72"/></w:rPr>
        <w:t>${WATERMARK_TEXT}</w:t></w:r>
      </mc:Fallback>
    </mc:AlternateContent>
  </w:r>
</w:p>`;
}

/**
 * Build a semi-opaque amber rectangle that covers the full page.
 * Placed IN FRONT of text (behindDoc="0") so it tints everything.
 */
function buildOverlayRect() {
    const id = nextId();
    return `<w:p xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"
       xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
       xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape">
  <w:pPr><w:pStyle w:val="Header"/></w:pPr>
  <w:r>
    <w:rPr><w:noProof/></w:rPr>
    <mc:AlternateContent>
      <mc:Choice Requires="wps">
        <w:drawing>
          <wp:anchor distT="0" distB="0" distL="0" distR="0"
                     simplePos="0" relativeHeight="251659000"
                     behindDoc="0" locked="0" layoutInCell="1"
                     allowOverlap="1">
            <wp:simplePos x="0" y="0"/>
            <wp:positionH relativeFrom="page">
              <wp:posOffset>0</wp:posOffset>
            </wp:positionH>
            <wp:positionV relativeFrom="page">
              <wp:posOffset>0</wp:posOffset>
            </wp:positionV>
            <wp:extent cx="7772400" cy="10058400"/>
            <wp:effectExtent l="0" t="0" r="0" b="0"/>
            <wp:wrapNone/>
            <wp:docPr id="${id}" name="DemoOverlay${id}"/>
            <wp:cNvGraphicFramePr/>
            <a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
              <a:graphicData uri="http://schemas.microsoft.com/office/word/2010/wordprocessingShape">
                <wps:wsp>
                  <wps:cNvSpPr/>
                  <wps:spPr>
                    <a:xfrm>
                      <a:off x="0" y="0"/>
                      <a:ext cx="7772400" cy="10058400"/>
                    </a:xfrm>
                    <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
                    <a:solidFill>
                      <a:srgbClr val="${OVERLAY_COLOR}">
                        <a:alpha val="${OVERLAY_ALPHA}"/>
                      </a:srgbClr>
                    </a:solidFill>
                    <a:ln><a:noFill/></a:ln>
                  </wps:spPr>
                  <wps:bodyPr/>
                </wps:wsp>
              </a:graphicData>
            </a:graphic>
          </wp:anchor>
        </w:drawing>
      </mc:Choice>
      <mc:Fallback/>
    </mc:AlternateContent>
  </w:r>
</w:p>`;
}

/**
 * Build all repeating watermark paragraphs (5 diagonal bands + 1 overlay).
 * Returns a single concatenated XML string to inject into a header.
 */
function buildAllWatermarkParagraphs() {
    // 5 diagonal text bands spaced evenly across a ~10 inch page
    const offsets = [
        { emu: 500000,   z: 251660001 },   // ~0.5 in from top
        { emu: 2700000,  z: 251660002 },   // ~2.8 in
        { emu: 4900000,  z: 251660003 },   // ~5.1 in
        { emu: 7100000,  z: 251660004 },   // ~7.3 in
        { emu: 9300000,  z: 251660005 },   // ~9.6 in
    ];

    let xml = '';
    for (const { emu, z } of offsets) {
        xml += buildWatermarkAt(emu, z);
    }
    xml += buildOverlayRect();
    return xml;
}

/**
 * Build a simple text paragraph for footer watermark.
 */
function buildFooterWatermarkParagraph() {
    return `<w:p>
  <w:pPr><w:jc w:val="center"/></w:pPr>
  <w:r>
    <w:rPr>
      <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
      <w:b/>
      <w:sz w:val="20"/>
      <w:szCs w:val="20"/>
      <w:color w:val="${WATERMARK_COLOR}"/>
    </w:rPr>
    <w:t xml:space="preserve">DEMO \u2014 NOT FOR PROFESSIONAL USE  \u2022  claimcipherhq.com  \u2022  Subscribe for clean reports</w:t>
  </w:r>
</w:p>`;
}


// ─────────────────────────────────────────
//  Main injection
// ─────────────────────────────────────────

/**
 * Inject heavy watermarks into a filled DOCX JSZip instance.
 *
 * @param {JSZip} zip - filled DOCX zip instance
 * @returns {JSZip} - same zip, watermarked + protected
 */
async function injectDemoWatermark(zip) {

    const watermarkXml = buildAllWatermarkParagraphs();
    const footerWatermarkXml = buildFooterWatermarkParagraph();

    // ── 1. HEADER INJECTION ──────────────────────
    const headerFiles = Object.keys(zip.files).filter(
        name => /^word\/header\d+\.xml$/i.test(name)
    );

    if (headerFiles.length === 0) {
        // No existing headers — create one and link it
        const fullHeaderXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
       xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"
       xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
       xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape"
       mc:Ignorable="w14 wp14">
  ${watermarkXml}
</w:hdr>`;

        zip.file('word/headerDEMO.xml', fullHeaderXml);

        const relsPath = 'word/_rels/document.xml.rels';
        let relsXml = await zip.file(relsPath).async('string');
        const relId = 'rIdDemoWatermark';
        if (!relsXml.includes(relId)) {
            relsXml = relsXml.replace(
                '</Relationships>',
                `<Relationship Id="${relId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="headerDEMO.xml"/></Relationships>`
            );
            zip.file(relsPath, relsXml);
        }

        let docXml = await zip.file('word/document.xml').async('string');
        const headerRef = `<w:headerReference w:type="default" r:id="${relId}"/>`;
        docXml = docXml.replace(/<\/w:sectPr>/g, `${headerRef}</w:sectPr>`);
        zip.file('word/document.xml', docXml);

    } else {
        for (const headerFile of headerFiles) {
            let headerXml = await zip.file(headerFile).async('string');
            if (headerXml.includes('DemoWatermark')) continue;
            headerXml = headerXml.replace(/<\/w:hdr>/, `${watermarkXml}</w:hdr>`);
            zip.file(headerFile, headerXml);
        }
    }

    // ── 2. FOOTER INJECTION ─────────────────────
    const footerFiles = Object.keys(zip.files).filter(
        name => /^word\/footer\d+\.xml$/i.test(name)
    );

    if (footerFiles.length === 0) {
        const fullFooterXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  ${footerWatermarkXml}
</w:ftr>`;

        zip.file('word/footerDEMO.xml', fullFooterXml);

        // Register in rels
        const relsPath = 'word/_rels/document.xml.rels';
        let relsXml = await zip.file(relsPath).async('string');
        const relId = 'rIdDemoFooter';
        if (!relsXml.includes(relId)) {
            relsXml = relsXml.replace(
                '</Relationships>',
                `<Relationship Id="${relId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footerDEMO.xml"/></Relationships>`
            );
            zip.file(relsPath, relsXml);
        }

        // Register in [Content_Types].xml
        let ctXml = await zip.file('[Content_Types].xml').async('string');
        if (!ctXml.includes('footerDEMO.xml')) {
            ctXml = ctXml.replace(
                '</Types>',
                `<Override PartName="/word/footerDEMO.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/></Types>`
            );
            zip.file('[Content_Types].xml', ctXml);
        }

        // Add footerReference to sectPr
        let docXml = await zip.file('word/document.xml').async('string');
        const footerRef = `<w:footerReference w:type="default" r:id="${relId}"/>`;
        docXml = docXml.replace(/<\/w:sectPr>/g, `${footerRef}</w:sectPr>`);
        zip.file('word/document.xml', docXml);

    } else {
        for (const footerFile of footerFiles) {
            let footerXml = await zip.file(footerFile).async('string');
            if (footerXml.includes('DemoWatermark') || footerXml.includes('NOT FOR PROFESSIONAL USE')) continue;
            footerXml = footerXml.replace(/<\/w:ftr>/, `${footerWatermarkXml}</w:ftr>`);
            zip.file(footerFile, footerXml);
        }
    }

    // ── 3. DOCUMENT PROTECTION (block copy/paste) ──
    const settingsFile = zip.file('word/settings.xml');
    if (settingsFile) {
        let settingsXml = await settingsFile.async('string');
        if (!settingsXml.includes('w:documentProtection')) {
            settingsXml = settingsXml.replace(
                /<\/w:settings>/,
                `<w:documentProtection w:edit="readOnly" w:enforcement="1"/></w:settings>`
            );
            zip.file('word/settings.xml', settingsXml);
        }
    }

    console.log('[DemoWatermark] Heavy watermark injected — headers:', headerFiles.length || 1, '| footers:', footerFiles.length || 1, '| protection: enabled');
    return zip;
}

// Export for use in bcifDocxFiller.js and claimSummaryDocx.js
window.DemoWatermark = { injectDemoWatermark };
