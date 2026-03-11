/**
 * demoWatermark.js
 * Injects a diagonal "DEMO ONLY" watermark into every page of a DOCX JSZip instance.
 * Called only when demo_mode === 'true'.
 * Does not modify templates or affect paid user downloads in any way.
 *
 * Strategy: Append the watermark drawing into the EXISTING header XML files
 * (header1.xml, header2.xml, etc.) so it layers on top of whatever header
 * content the template already has (logos, text, borders). This avoids the
 * duplicate type="default" headerReference problem.
 */

const WATERMARK_TEXT =
    'DEMO ONLY \u2014 NOT FOR DISTRIBUTION \u2014 claimcipherhq.com';

/**
 * Build a <w:p> paragraph containing the diagonal watermark shape.
 * This gets appended inside an existing <w:hdr> element.
 */
function buildWatermarkParagraph() {
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
                     simplePos="0" relativeHeight="251658240"
                     behindDoc="1" locked="0" layoutInCell="1"
                     allowOverlap="1">
            <wp:simplePos x="0" y="0"/>
            <wp:positionH relativeFrom="page">
              <wp:align>center</wp:align>
            </wp:positionH>
            <wp:positionV relativeFrom="page">
              <wp:align>center</wp:align>
            </wp:positionV>
            <wp:extent cx="7200000" cy="1800000"/>
            <wp:effectExtent l="0" t="1500000" r="0" b="1500000"/>
            <wp:wrapNone/>
            <wp:docPr id="99" name="DemoWatermark"/>
            <wp:cNvGraphicFramePr/>
            <a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
              <a:graphicData uri="http://schemas.microsoft.com/office/word/2010/wordprocessingShape">
                <wps:wsp>
                  <wps:cNvSpPr txBox="1"/>
                  <wps:spPr>
                    <a:xfrm rot="19200000">
                      <a:off x="0" y="0"/>
                      <a:ext cx="7200000" cy="1800000"/>
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
                            <w:sz w:val="56"/>
                            <w:szCs w:val="56"/>
                            <w:color w:val="C0392B"/>
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
        <w:r><w:rPr><w:color w:val="C0392B"/><w:sz w:val="56"/></w:rPr>
        <w:t>${WATERMARK_TEXT}</w:t></w:r>
      </mc:Fallback>
    </mc:AlternateContent>
  </w:r>
</w:p>`;
}

/**
 * Main export. Takes a JSZip instance that has already had tokens replaced.
 * Injects the watermark paragraph into every existing header XML file.
 *
 * @param {JSZip} zip - filled DOCX zip instance
 * @returns {JSZip} - same zip with watermark injected
 */
async function injectDemoWatermark(zip) {

    const watermarkPara = buildWatermarkParagraph();

    // Find all header XML files in the ZIP (header1.xml, header2.xml, etc.)
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
  ${watermarkPara}
</w:hdr>`;

        zip.file('word/headerDEMO.xml', fullHeaderXml);

        // Register in rels
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

        // Add headerReference to sectPr
        let docXml = await zip.file('word/document.xml').async('string');
        const headerRef = `<w:headerReference w:type="default" r:id="${relId}"/>`;
        docXml = docXml.replace(/<\/w:sectPr>/g, `${headerRef}</w:sectPr>`);
        zip.file('word/document.xml', docXml);

    } else {
        // Append watermark paragraph into each existing header file
        for (const headerFile of headerFiles) {
            let headerXml = await zip.file(headerFile).async('string');

            // Skip if watermark already injected
            if (headerXml.includes('DemoWatermark')) continue;

            // Insert the watermark <w:p> just before the closing </w:hdr>
            headerXml = headerXml.replace(
                /<\/w:hdr>/,
                `${watermarkPara}</w:hdr>`
            );

            zip.file(headerFile, headerXml);
        }
    }

    console.log('[DemoWatermark] Watermark injected into', headerFiles.length || 1, 'header(s)');
    return zip;
}

// Export for use in bcifDocxFiller.js and claimSummaryDocx.js
window.DemoWatermark = { injectDemoWatermark };
