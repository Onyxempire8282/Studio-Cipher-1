// Claim Summary DOCX Generator
// Typography: Times New Roman throughout. Section headers carry a 1pt solid underline rule.
// Layout: Claim block → [pg break] → Narrative block → Estimates → Appraiser Statement

import { buildClaimSummarySections } from "../summaryEngine.js";
import { TOKEN_META } from "../bcifPayloadBuilder.js";

let _lib = null;

async function _getLib() {
    if (_lib) return _lib;
    _lib = await import('https://esm.sh/docx@9');
    return _lib;
}

// =========================================
//  MAIN EXPORT
// =========================================

export async function generateClaimSummaryDocx(state) {
    const lib = await _getLib();
    const {
        Document, Paragraph, TextRun, Table, TableRow, TableCell,
        WidthType, AlignmentType, Packer, PageBreak,
        BorderStyle, TableLayoutType
    } = lib;

    const payload = state.bcifPayload    || {};
    const parsed  = state.parsedEstimate  || {};

    // POI — strip leading numeric code
    const poiRaw      = parsed.pointOfImpact || '';
    const poiCode     = parseInt(poiRaw, 10);
    const poiLabel    = poiRaw.replace(/^\d+\s*/, '').trim();

    // Total loss detection — POI 15 OR cost-to-ACV ratio >= 75%
    const estimateTotal = _toNumber(parsed.estimateTotal);
    const acv = _toNumber(parsed.acv);
    const isTotalLoss = poiCode === 15
        || (acv > 0 && estimateTotal > 0 && (estimateTotal / acv) >= 0.75);

    // ─── Typography / spacing constants ─────────────────────────────────────────
    const FONT = 'Times New Roman';

    // Font sizes (half-points: 1pt = 2 units)
    const SZ_TITLE = 48;  // 24pt — main document title
    const SZ_HEAD  = 36;  // 18pt — section headers
    const SZ_BODY  = 24;  // 12pt — body text and sub-headers

    // Paragraph spacing (twips: 1pt = 20 units)
    const SP_BEFORE_HEAD  = 240;  // 12pt gap above section header
    const SP_LINE_SPACE   = 6;    // 6pt from header text to underline rule (points, not twips)
    const SP_AFTER_RULE   = 240;  // 12pt below underline rule to first field row
    const SP_BODY         = 100;  // ~5pt between body lines
    const SP_BULLET       = 120;  // 6pt between bullet items
    const SP_TITLE_BELOW  = 600;  // 30pt gap below title block

    // Borders
    const RULE_1PT = { style: BorderStyle.SINGLE, size: 8, color: '000000', space: SP_LINE_SPACE };
    const NO_BORDER  = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
    const CELL_NONE  = { top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER };
    const TABLE_NONE = { ...CELL_NONE, insideHorizontal: NO_BORDER, insideVertical: NO_BORDER };

    // ─── Primitive builders ──────────────────────────────────────────────────────

    // Base text run — Times New Roman 12pt unless overridden
    function run(text, opts = {}) {
        return new TextRun({ text: String(text ?? ''), font: FONT, size: SZ_BODY, ...opts });
    }

    function para(children, paraOpts = {}) {
        const nodes = Array.isArray(children) ? children : [run(children)];
        return new Paragraph({ children: nodes, ...paraOpts });
    }

    function pageBreak() {
        return new Paragraph({ children: [new PageBreak()] });
    }

    // Section header: 18pt bold + 1pt solid underline rule + spacing
    function sectionHeader(text) {
        return new Paragraph({
            children: [new TextRun({ text, font: FONT, size: SZ_HEAD, bold: true })],
            spacing: { before: SP_BEFORE_HEAD, after: SP_AFTER_RULE },
            border:  { bottom: RULE_1PT },
        });
    }

    // 12pt bold label — for emphasis within a section, no underline
    function subLabel(text) {
        return para([run(text, { bold: true })], { spacing: { before: 80, after: 40 } });
    }

    // No-border 2-column label : value table — blank rows are silently skipped
    function fieldTable(fields) {
        const rows = fields.filter(([, v]) => v !== null && v !== undefined && String(v).trim() !== '');
        if (!rows.length) return null;

        return new Table({
            width:   { size: 100, type: WidthType.PERCENTAGE },
            layout:  TableLayoutType.FIXED,
            borders: TABLE_NONE,
            rows: rows.map(([label, value]) =>
                new TableRow({
                    children: [
                        new TableCell({
                            width:    { size: 33, type: WidthType.PERCENTAGE },
                            borders:  CELL_NONE,
                            children: [para([run(label, { bold: true })], { spacing: { after: 40 } })],
                        }),
                        new TableCell({
                            width:    { size: 67, type: WidthType.PERCENTAGE },
                            borders:  CELL_NONE,
                            children: [para([run(String(value))], { spacing: { after: 40 } })],
                        }),
                    ],
                })
            ),
        });
    }

    function bodyPara(text) {
        return para([run(text)], { spacing: { after: SP_BODY } });
    }

    function bulletPara(text) {
        return new Paragraph({
            children: [run(text)],
            bullet:   { level: 0 },
            spacing:  { after: SP_BULLET },
        });
    }

    // ─── Section builders ────────────────────────────────────────────────────────

    function docTitle() {
        const subtitle = isTotalLoss
            ? 'Total Loss Evaluation \u2013 Automobile'
            : 'Vehicle Damage Assessment \u2013 Automobile';

        return [
            new Paragraph({
                children:  [new TextRun({ text: 'CLAIM SUMMARY REPORT', font: FONT, size: SZ_TITLE, bold: true })],
                alignment: AlignmentType.CENTER,
                spacing:   { before: 0, after: 80 },
            }),
            new Paragraph({
                children:  [new TextRun({ text: subtitle, font: FONT, size: SZ_BODY, italics: true })],
                alignment: AlignmentType.CENTER,
                spacing:   { after: SP_TITLE_BELOW },
            }),
        ];
    }

    function insuranceCompanyInformation() {
        const table = fieldTable([
            ['Insurance Company:', payload.claim?.carrier],
        ]);
        if (!table) return [];
        return [sectionHeader('Insurance Company Information'), table];
    }

    function carrierClaimRepresentatives() {
        const table = fieldTable([
            ['Adjuster:',      payload.claim?.adjuster],
            ['Loss Location:', payload.claim?.lossLocation],
        ]);
        if (!table) return [];
        return [sectionHeader('Carrier / Claim Representatives'), table];
    }

    function claimInformation() {
        const table = fieldTable([
            ['Claim Number:',  payload.claim?.claimNumber],
            ['Policy Number:', payload.claim?.policyNumber],
            ['Date of Loss:',  payload.claim?.dateOfLoss || parsed.dateOfLoss],
            ['Loss Type:',     payload.claim?.lossType   || parsed.lossType],
            ['Coverage:',      payload.claim?.coverage],
        ]);
        if (!table) return [];
        return [sectionHeader('Claim Information'), table];
    }

    function customerInsuredInformation() {
        const table = fieldTable([
            ['Owner Name:', payload.claim?.ownerName || parsed.ownerName],
            ['Phone:',      payload.claim?.ownerPhone || parsed.ownerPhone],
        ]);
        if (!table) return [];
        return [sectionHeader('Customer / Insured Information'), table];
    }

    function appraiserInformation() {
        const writer = (payload.claim?.writer || '').trim();
        const table  = fieldTable([['Appraiser:', writer]]);
        if (!table) return [];
        return [sectionHeader('Appraiser Information'), table];
    }

    function vehicleInformation() {
        const vehicle  = [payload.vehicle?.year, payload.vehicle?.make, payload.vehicle?.model]
                            .filter(Boolean).join(' ');
        const odometer = payload.vehicle?.odometer
                            ? _formatCommas(payload.vehicle.odometer) + ' mi' : '';
        const table = fieldTable([
            ['Vehicle:',    vehicle],
            ['VIN:',        payload.vehicle?.vin],
            ['Odometer:',   odometer],
            ['Body Style:', payload.vehicle?.bodyStyle],
            ['Engine:',     payload.vehicle?.engine],
        ]);
        if (!table) return [];
        return [sectionHeader('Vehicle Information'), table];
    }

    function lossDescription() {
        const blocks = [sectionHeader('Loss Description')];

        // Line 1: cleaned POI label (numeric code already stripped)
        if (poiLabel) {
            blocks.push(bodyPara(poiLabel));
        }

        // Line 2: damage areas — sourced from POI label, not the full summary textarea
        const damageAreas = poiLabel || 'documented areas per estimate';
        blocks.push(bodyPara(`Visible damage includes: ${damageAreas}.`));

        // Line 3: one professional loss statement
        if (isTotalLoss) {
            blocks.push(bodyPara(
                'Based on documented damage severity, this vehicle meets the total loss threshold ' +
                'under current claim handling guidelines.'
            ));
        } else {
            blocks.push(bodyPara(
                'Based on current documentation, the vehicle appears repairable within economic guidelines.'
            ));
        }

        return blocks;
    }

    function damageBreakdown() {
        const blocks = [sectionHeader('Damage Breakdown')];

        // Extract damage areas from POI label
        const damageAreas = poiLabel || 'documented areas per estimate';
        blocks.push(bodyPara(`Primary impact area: ${damageAreas}.`));

        // Cost breakdown if available
        const laborTotal = _toNumber(parsed.laborTotal);
        const partsTotal = _toNumber(parsed.partsTotal);
        const paintTotal = _toNumber(parsed.paintTotal);
        const hasCostBreakdown = laborTotal > 0 || partsTotal > 0 || paintTotal > 0;

        if (hasCostBreakdown) {
            blocks.push(subLabel('Cost Summary'));
            if (laborTotal > 0) blocks.push(bulletPara(`Labor: ${_formatCurrency(laborTotal)}`));
            if (partsTotal > 0) blocks.push(bulletPara(`Parts: ${_formatCurrency(partsTotal)}`));
            if (paintTotal > 0) blocks.push(bulletPara(`Paint / Refinish: ${_formatCurrency(paintTotal)}`));
        }

        if (estimateTotal > 0) {
            blocks.push(bodyPara(`Estimate Total: ${_formatCurrency(estimateTotal)}`));
        }

        return blocks;
    }

    function repairAssessment() {
        const blocks = [sectionHeader('Repair Assessment')];
        const repairDays = parsed.repairDays || 0;

        if (isTotalLoss) {
            let text = 'Repair costs exceed the economic threshold for this vehicle.';
            if (estimateTotal > 0) {
                text += ` Estimate total: ${_formatCurrency(estimateTotal)}.`;
            }
            if (acv > 0 && estimateTotal > 0) {
                const ratio = ((estimateTotal / acv) * 100).toFixed(1);
                text += ` The repair-to-value ratio is ${ratio}% of the actual cash value (${_formatCurrency(acv)}).`;
            }
            blocks.push(bodyPara(text));
        } else {
            let text = 'Vehicle is repairable within economic guidelines.';
            if (repairDays > 0) {
                text += ` Estimated repair time: ${repairDays} day${repairDays !== 1 ? 's' : ''}.`;
            }
            // Structural assessment
            const hasStructural = /structural|frame|rail|apron|pillar/i.test(poiLabel);
            text += hasStructural
                ? ' Structural repairs are indicated based on the documented point of impact.'
                : ' No structural repairs are indicated at this time.';
            text += ' A supplement may be required following teardown.';
            blocks.push(bodyPara(text));
        }

        return blocks;
    }

    function vehicleConditionEquipment() {
        const blocks = [sectionHeader('Vehicle Condition & Equipment')];

        // Condition ratings
        const cond = payload.condition || {};
        const ratingLabels = ['Excellent', 'Normal', 'Fair', 'Poor'];
        const conditionComponents = [
            ['Paint',        cond.paint],
            ['Sheet Metal',  cond.sheetMetal],
            ['Glass',        cond.glass],
            ['Trim',         cond.trim],
            ['Seats',        cond.seats],
            ['Carpet',       cond.carpet],
            ['Dashboard',    cond.dashboard],
            ['Headliner',    cond.headliner],
            ['Front Tires',  cond.frontTires],
            ['Rear Tires',   cond.rearTires],
            ['Engine',       cond.engine],
            ['Transmission', cond.transmission],
        ];

        const hasAnyRating = conditionComponents.some(([, c]) => c && c.rating !== null && c.rating !== undefined);
        if (hasAnyRating) {
            blocks.push(subLabel('Condition Ratings'));
            for (const [label, comp] of conditionComponents) {
                if (!comp || comp.rating === null || comp.rating === undefined) continue;
                const ratingText = ratingLabels[comp.rating] || `Rating ${comp.rating}`;
                const commentText = comp.comment ? ` - ${comp.comment}` : '';
                blocks.push(bulletPara(`${label}: ${ratingText}${commentText}`));
            }
        }

        // Equipment list from options
        const options = payload.options || [];
        if (options.length > 0) {
            blocks.push(subLabel('Vehicle Equipment'));
            const labels = options
                .map(code => {
                    const meta = TOKEN_META[code];
                    return meta ? meta.label : code;
                })
                .sort();
            // Group into comma-separated lines by category or just list
            const chunkSize = 4;
            for (let i = 0; i < labels.length; i += chunkSize) {
                const chunk = labels.slice(i, i + chunkSize);
                blocks.push(bulletPara(chunk.join(', ')));
            }
        }

        return blocks;
    }

    function priorDamageRecalls() {
        const priorDamage = parsed.priorDamage || '';
        if (!priorDamage) return [];

        const blocks = [sectionHeader('Prior Damage')];

        const normalized = priorDamage.toUpperCase().trim();
        if (normalized === 'NO UPD VISIBLE' || normalized === 'NONE') {
            blocks.push(bodyPara('No unrelated prior damage was observed during inspection.'));
        } else {
            blocks.push(bodyPara(`Prior damage noted: ${priorDamage}.`));
        }

        return blocks;
    }

    function renderSummarySections(sections) {
        return (sections || []).flatMap((section) => {
            const content = String(section?.content || '').trim();
            if (!content) return [];
            return [sectionHeader(section.title), bodyPara(content)];
        });
    }

    function estimateTotalSection() {
        const total = _toNumber(parsed.estimateTotal);
        if (!total) return [];
        return [sectionHeader('Estimate Total'), bodyPara(_formatCurrency(total))];
    }

    function appraiserStatement() {
        const writer = (payload.claim?.writer || '').trim();

        const statementText = isTotalLoss
            ? 'This report was prepared based on physical inspection of the referenced vehicle and ' +
              'review of the associated estimate documentation. The information contained herein is ' +
              'submitted in accordance with standard total loss evaluation guidelines.'
            : 'This report was prepared based on physical inspection of the referenced vehicle and ' +
              'review of the associated estimate documentation. The information contained herein is ' +
              'submitted in accordance with standard vehicle damage assessment guidelines.';

        const blocks = [
            sectionHeader('Appraiser Statement'),
            bodyPara(statementText),
        ];
        if (writer) {
            blocks.push(bodyPara(`Prepared by: ${writer}`));
        }
        return blocks;
    }

    // ─── Assemble ────────────────────────────────────────────────────────────────

    const summarySections = buildClaimSummarySections(parsed, payload);
    const additionalSections = summarySections.filter((section) => section.title === 'ADDITIONAL NOTES');

    const children = [
        ...docTitle(),
        ...insuranceCompanyInformation(),
        ...carrierClaimRepresentatives(),
        ...claimInformation(),
        ...customerInsuredInformation(),
        ...appraiserInformation(),
        ...vehicleInformation(),
        pageBreak(),
        ...lossDescription(),
        ...damageBreakdown(),
        ...repairAssessment(),
        ...vehicleConditionEquipment(),
        ...priorDamageRecalls(),
        ...renderSummarySections(additionalSections),
        ...estimateTotalSection(),
        ...appraiserStatement(),
    ].filter(Boolean);

    const description = isTotalLoss
        ? 'Claim Summary Report \u2014 Total Loss Evaluation'
        : 'Claim Summary Report \u2014 Vehicle Damage Assessment';

    const doc = new Document({
        creator:     'Claim Cipher',
        description,
        sections:    [{ properties: {}, children }],
    });

    return Packer.toBlob(doc);
}

// =========================================
//  FORMAT HELPERS
// =========================================

function _toNumber(value) {
    if (value == null || value === '') return 0;
    const num = Number(String(value).replace(/[$,]/g, ''));
    return isNaN(num) ? 0 : num;
}

function _formatCurrency(value) {
    const num = Number(value);
    if (isNaN(num)) return '';
    return '$' + num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function _formatCommas(value) {
    const num = Number(value);
    if (isNaN(num)) return String(value);
    return Math.round(num).toLocaleString('en-US');
}
