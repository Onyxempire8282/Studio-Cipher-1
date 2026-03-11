/**
 * demoWatermark.js
 * Injects a diagonal "DEMO ONLY" watermark into every page of a DOCX JSZip instance.
 * Called only when demo_mode === 'true'.
 * Does not modify templates or affect paid user downloads in any way.
 */

const WATERMARK_TEXT =
    'DEMO ONLY \u2014 NOT FOR DISTRIBUTION \u2014 claimcipherhq.com';

/**
 * Build the header XML string containing the diagonal watermark shape.
 * Uses DrawingML wordprocessingShape (wps).
 * Rotation: 20000000 EMUs = ~333deg visual (diagonal bottom-left to top-right).
 */
function buildWatermarkHeaderXml() {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:hdr xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas"
       xmlns:mo="http://schemas.microsoft.com/office/mac/office/2008/main"
       xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"
       xmlns:mv="urn:schemas-microsoft-com:mac:vml"
       xmlns:o="urn:schemas-microsoft-com:office:office"
       xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
       xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"
       xmlns:v="urn:schemas-microsoft-com:vml"
       xmlns:wp14="http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing"
       xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
       xmlns:w10="urn:schemas-microsoft-com:office:word"
       xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
       xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml"
       xmlns:wpg="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup"
       xmlns:wpi="http://schemas.microsoft.com/office/word/2010/wordprocessingInk"
       xmlns:wne="http://schemas.microsoft.com/office/word/2006/wordml"
       xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape"
       mc:Ignorable="w14 wp14">
  <w:p>
    <w:pPr>
      <w:jc w:val="center"/>
    </w:pPr>
    <w:r>
      <w:rPr>
        <w:noProof/>
      </w:rPr>
      <mc:AlternateContent>
        <mc:Choice Requires="wps">
          <w:drawing>
            <wp:anchor distT="0" distB="0" distL="0" distR="0"
                       simplePos="0" relativeHeight="251658240"
                       behindDoc="1" locked="0" layoutInCell="1"
                       allowOverlap="1">
              <wp:simplePos x="0" y="0"/>
              <wp:positionH relativeFrom="margin">
                <wp:align>center</wp:align>
              </wp:positionH>
              <wp:positionV relativeFrom="margin">
                <wp:align>center</wp:align>
              </wp:positionV>
              <wp:extent cx="5400000" cy="1800000"/>
              <wp:effectExtent l="0" t="0" r="0" b="0"/>
              <wp:wrapNone/>
              <wp:docPr id="1" name="WatermarkDemo"/>
              <wp:cNvGraphicFramePr/>
              <a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
                <a:graphicData uri="http://schemas.microsoft.com/office/word/2010/wordprocessingShape">
                  <wps:wsp>
                    <wps:cNvSpPr>
                      <a:spLocks noChangeArrowheads="1"/>
                    </wps:cNvSpPr>
                    <wps:spPr>
                      <a:xfrm rot="20000000">
                        <a:off x="0" y="0"/>
                        <a:ext cx="5400000" cy="1800000"/>
                      </a:xfrm>
                      <a:prstGeom prst="rect">
                        <a:avLst/>
                      </a:prstGeom>
                      <a:noFill/>
                    </wps:spPr>
                    <wps:txbx>
                      <w:txbxContent>
                        <w:p>
                          <w:pPr>
                            <w:jc w:val="center"/>
                          </w:pPr>
                          <w:r>
                            <w:rPr>
                              <w:rFonts w:ascii="DM Mono"
                                        w:hAnsi="DM Mono"
                                        w:cs="DM Mono"/>
                              <w:b/>
                              <w:sz w:val="52"/>
                              <w:szCs w:val="52"/>
                              <w:color w:val="C0392B"/>
                              <w:alpha w:val="35000"/>
                            </w:rPr>
                            <w:t>${WATERMARK_TEXT}</w:t>
                          </w:r>
                        </w:p>
                      </w:txbxContent>
                    </wps:txbx>
                    <wps:bodyPr rot="0" vert="horz"
                                wrap="square" lIns="91440"
                                tIns="45720" rIns="91440"
                                bIns="45720" anchor="ctr"
                                anchorCtr="1"/>
                  </wps:wsp>
                </a:graphicData>
              </a:graphic>
            </wp:anchor>
          </w:drawing>
        </mc:Choice>
      </mc:AlternateContent>
    </w:r>
  </w:p>
</w:hdr>`;
}

/**
 * Main export. Takes a JSZip instance that has already had tokens replaced.
 * Injects the watermark header into every section.
 *
 * @param {JSZip} zip - filled DOCX zip instance
 * @returns {JSZip} - same zip with watermark injected
 */
async function injectDemoWatermark(zip) {

    const HEADER_FILENAME = 'word/headerDEMO.xml';
    const HEADER_REL_ID   = 'rIdDemoWatermarkHdr';

    // 1. Add the watermark header XML file
    zip.file(HEADER_FILENAME, buildWatermarkHeaderXml());

    // 2. Patch word/_rels/document.xml.rels to register the new header relationship
    const relsPath = 'word/_rels/document.xml.rels';
    let relsXml = await zip.file(relsPath).async('string');

    // Only add if not already present
    if (!relsXml.includes(HEADER_REL_ID)) {
        const relEntry = `<Relationship Id="${HEADER_REL_ID}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="headerDEMO.xml"/>`;
        relsXml = relsXml.replace(
            '</Relationships>',
            `${relEntry}</Relationships>`
        );
        zip.file(relsPath, relsXml);
    }

    // 3. Patch word/document.xml — inject headerReference into every <w:sectPr>
    let docXml = await zip.file('word/document.xml').async('string');

    const headerRef = `<w:headerReference w:type="default" r:id="${HEADER_REL_ID}"/>`;

    // Remove any existing demo header ref to prevent duplicates
    docXml = docXml.replace(
        /<w:headerReference[^>]*rIdDemoWatermarkHdr[^>]*\/>/g,
        ''
    );

    // Inject before every </w:sectPr>
    docXml = docXml.replace(
        /<\/w:sectPr>/g,
        `${headerRef}</w:sectPr>`
    );

    zip.file('word/document.xml', docXml);

    return zip;
}

// Export for use in bcifDocxFiller.js and claimSummaryDocx.js
window.DemoWatermark = { injectDemoWatermark };
