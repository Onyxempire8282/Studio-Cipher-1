// Claim Summary DOCX Generator — Navy/Gold Professional Design
// Typography: Arial throughout. Table-based sections with alternating row shading.
//
// TWO MODES — same visual design, sections toggled by isTotalLoss:
//   Repairable: Title → Claim/Insured → Vehicle → Loss → Damage → Costs →
//               Prior Damage → [break] → Certification → Notice → Signature
//   Total Loss: Title → Claim/Insured → Vehicle → Options → Condition → Loss →
//               Damage → Costs → Prior Damage → [break] → Certification → Notice → Signature

let _lib = null;

async function _getLib() {
    if (_lib) return _lib;
    _lib = await import('https://esm.sh/docx@9');
    return _lib;
}

// =========================================
//  COLOR PALETTE
// =========================================

const NAVY       = '1B2A4A';
const GOLD       = 'C8A951';
const LIGHT_GRAY = 'F5F6F8';
const MED_GRAY   = 'E8EAED';
const BODY_COLOR = '333333';
const WHITE      = 'FFFFFF';
const AMBER_SHADE = 'E8D5A3';
const CALLOUT_BG  = 'FFF8E7';

// =========================================
//  MAIN EXPORT
// =========================================

export async function generateClaimSummaryDocx(state, userProfile = {}) {
    const lib = await _getLib();
    const {
        Document, Paragraph, TextRun, Table, TableRow, TableCell,
        WidthType, AlignmentType, Packer, PageBreak,
        BorderStyle, TableLayoutType,
        Header, Footer, PageNumber, TabStopType, TabStopPosition,
        ShadingType, VerticalAlign
    } = lib;

    const payload = state.bcifPayload    || {};
    const parsed  = state.parsedEstimate || {};

    // POI — strip leading numeric code
    const poiRaw   = parsed.pointOfImpact || '';
    const poiCode  = parseInt(poiRaw, 10);
    const poiLabel = poiRaw.replace(/^\d+\s*/, '').trim();

    // Total loss detection — POI 15 OR cost-to-ACV ratio >= 75%
    const estimateTotal = _toNumber(parsed.estimateTotal);
    const acv = _toNumber(parsed.acv);
    const isTotalLoss = poiCode === 15
        || (acv > 0 && estimateTotal > 0 && (estimateTotal / acv) >= 0.75);

    // User profile
    const businessName  = (userProfile.businessName  || '').trim();
    const fullName      = (userProfile.fullName      || '').trim();
    const licenseNumber = (userProfile.licenseNumber || '').trim();

    // ─── Typography constants ────────────────────────────────────────────────
    const FONT      = 'Arial';
    const FONT_SIG  = 'Brush Script MT';
    const SZ_BODY   = 20;   // 10pt
    const SZ_SMALL  = 16;   // 8pt
    const SZ_HEAD   = 24;   // 12pt
    const SZ_TITLE  = 40;   // 20pt
    const SZ_SUB    = 24;   // 12pt
    const SZ_SIG    = 28;   // 14pt

    // Borders
    const NO_BORDER  = { style: BorderStyle.NONE, size: 0, color: WHITE };
    const CELL_NONE  = { top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER };
    const TABLE_NONE = { ...CELL_NONE, insideHorizontal: NO_BORDER, insideVertical: NO_BORDER };
    const NAVY_BORDER = { style: BorderStyle.SINGLE, size: 6, color: NAVY };
    const GOLD_BORDER = { style: BorderStyle.SINGLE, size: 4, color: GOLD };
    const GRAY_BORDER = { style: BorderStyle.SINGLE, size: 2, color: MED_GRAY };

    // ─── Primitive builders ──────────────────────────────────────────────────

    function run(text, opts = {}) {
        return new TextRun({ text: String(text ?? ''), font: FONT, size: SZ_BODY, color: BODY_COLOR, ...opts });
    }

    function para(children, paraOpts = {}) {
        const nodes = Array.isArray(children) ? children : [run(children)];
        return new Paragraph({ children: nodes, ...paraOpts });
    }

    function emptyPara(spacing = 80) {
        return new Paragraph({ children: [], spacing: { after: spacing } });
    }

    // Navy section header row (single-cell table acting as a banner)
    function sectionHeaderTable(text) {
        return new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            layout: TableLayoutType.FIXED,
            borders: TABLE_NONE,
            rows: [
                new TableRow({
                    children: [
                        new TableCell({
                            width: { size: 100, type: WidthType.PERCENTAGE },
                            shading: { type: ShadingType.CLEAR, fill: NAVY },
                            borders: CELL_NONE,
                            children: [
                                para([run(text, { bold: true, color: WHITE, size: SZ_HEAD, font: FONT })], {
                                    spacing: { before: 60, after: 60 },
                                    indent: { left: 120 },
                                }),
                            ],
                        }),
                    ],
                }),
            ],
        });
    }

    // Key-value row for field tables
    function kvRow(label, value, shaded = false) {
        const bgFill = shaded ? LIGHT_GRAY : WHITE;
        return new TableRow({
            children: [
                new TableCell({
                    width: { size: 35, type: WidthType.PERCENTAGE },
                    shading: { type: ShadingType.CLEAR, fill: bgFill },
                    borders: { top: GRAY_BORDER, bottom: GRAY_BORDER, left: GRAY_BORDER, right: GRAY_BORDER },
                    children: [para([run(label, { bold: true })], { spacing: { before: 40, after: 40 }, indent: { left: 80 } })],
                }),
                new TableCell({
                    width: { size: 65, type: WidthType.PERCENTAGE },
                    shading: { type: ShadingType.CLEAR, fill: bgFill },
                    borders: { top: GRAY_BORDER, bottom: GRAY_BORDER, left: GRAY_BORDER, right: GRAY_BORDER },
                    children: [para([run(String(value))], { spacing: { before: 40, after: 40 }, indent: { left: 80 } })],
                }),
            ],
        });
    }

    // ─── Page Header ─────────────────────────────────────────────────────────

    function buildHeader() {
        const headerChildren = [];

        // Business name + report title line
        const leftText = businessName ? businessName.toUpperCase() : '';
        const rightText = 'CLAIM SUMMARY REPORT';

        if (leftText) {
            headerChildren.push(
                new Paragraph({
                    children: [
                        run(leftText, { bold: true, color: NAVY, size: SZ_SMALL }),
                        run('\t'),
                        run(rightText, { color: '888888', size: SZ_SMALL }),
                    ],
                    tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
                    spacing: { after: 40 },
                })
            );
        } else {
            headerChildren.push(
                para([run(rightText, { color: '888888', size: SZ_SMALL })], {
                    alignment: AlignmentType.RIGHT,
                    spacing: { after: 40 },
                })
            );
        }

        // Gold accent line
        headerChildren.push(
            new Paragraph({
                children: [],
                border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: GOLD } },
                spacing: { after: 120 },
            })
        );

        return new Header({ children: headerChildren });
    }

    // ─── Page Footer ─────────────────────────────────────────────────────────

    function buildFooter() {
        const today = new Date().toLocaleDateString('en-US', {
            year: 'numeric', month: 'long', day: 'numeric',
        });

        return new Footer({
            children: [
                new Paragraph({
                    children: [],
                    border: { top: { style: BorderStyle.SINGLE, size: 2, color: MED_GRAY } },
                    spacing: { after: 40 },
                }),
                new Paragraph({
                    children: [
                        run('Generated by Claim Cipher\u2122', { size: SZ_SMALL, color: '888888', italics: true }),
                        run('  |  ', { size: SZ_SMALL, color: '888888' }),
                        run(today, { size: SZ_SMALL, color: '888888' }),
                        run('\t'),
                        run('Page ', { size: SZ_SMALL, color: '888888' }),
                        new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: SZ_SMALL, color: '888888' }),
                    ],
                    tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
                }),
            ],
        });
    }

    // ─── 1. Title Block ──────────────────────────────────────────────────────

    function titleBlock() {
        const title = isTotalLoss ? 'TOTAL LOSS EVALUATION' : 'VEHICLE DAMAGE ASSESSMENT';
        const subtitleText = isTotalLoss
            ? 'Claim Summary Report  |  Total Loss'
            : 'Claim Summary Report  |  Repairable Vehicle';

        return new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            layout: TableLayoutType.FIXED,
            borders: TABLE_NONE,
            rows: [
                new TableRow({
                    children: [
                        new TableCell({
                            width: { size: 100, type: WidthType.PERCENTAGE },
                            shading: { type: ShadingType.CLEAR, fill: NAVY },
                            borders: CELL_NONE,
                            verticalAlign: VerticalAlign.CENTER,
                            children: [
                                para([run(title, { bold: true, color: WHITE, size: SZ_TITLE, font: FONT })], {
                                    alignment: AlignmentType.CENTER,
                                    spacing: { before: 200, after: 60 },
                                }),
                                para([run(subtitleText, { color: GOLD, size: SZ_SUB, font: FONT })], {
                                    alignment: AlignmentType.CENTER,
                                    spacing: { after: 200 },
                                }),
                            ],
                        }),
                    ],
                }),
            ],
        });
    }

    // ─── 2. Claim / Insured Side-by-Side ─────────────────────────────────────

    function claimInsuredSideBySide() {
        const claimNumber = payload.claim?.claimNumber || parsed.claimNumber || '';
        const dateOfLoss  = payload.claim?.dateOfLoss  || parsed.dateOfLoss  || '';
        const lossType    = payload.claim?.lossType    || parsed.lossType    || '';
        const carrier     = payload.claim?.carrier     || parsed.insuredName || '';
        const ownerName   = payload.claim?.ownerName   || parsed.ownerName  || '';
        const ownerPhone  = payload.claim?.ownerPhone  || parsed.ownerPhone || '';
        const lossLoc     = payload.claim?.lossLocation || '';

        function headerCell(text, width) {
            return new TableCell({
                width: { size: width, type: WidthType.PERCENTAGE },
                shading: { type: ShadingType.CLEAR, fill: NAVY },
                borders: { top: NAVY_BORDER, bottom: NAVY_BORDER, left: NAVY_BORDER, right: NAVY_BORDER },
                children: [
                    para([run(text, { bold: true, color: WHITE, size: SZ_BODY })], {
                        spacing: { before: 40, after: 40 }, indent: { left: 80 },
                    }),
                ],
            });
        }

        function dataCell(label, value, width, shaded = false) {
            const bgFill = shaded ? LIGHT_GRAY : WHITE;
            return new TableCell({
                width: { size: width, type: WidthType.PERCENTAGE },
                shading: { type: ShadingType.CLEAR, fill: bgFill },
                borders: { top: GRAY_BORDER, bottom: GRAY_BORDER, left: GRAY_BORDER, right: GRAY_BORDER },
                children: [
                    para([
                        run(label + '  ', { bold: true, size: SZ_BODY }),
                        run(String(value || ''), { size: SZ_BODY }),
                    ], { spacing: { before: 30, after: 30 }, indent: { left: 80 } }),
                ],
            });
        }

        // Build rows — left column = claim info, right column = insured info
        const leftFields = [
            ['Claim #:', claimNumber],
            ['Date of Loss:', dateOfLoss],
            ['Loss Type:', lossType],
            ['Carrier:', carrier],
        ];
        const rightFields = [
            ['Owner:', ownerName],
            ['Phone:', ownerPhone],
            ['Location:', lossLoc],
            ['', ''],  // empty to balance
        ];

        const rows = [
            new TableRow({
                children: [headerCell('CLAIM INFORMATION', 50), headerCell('INSURED INFORMATION', 50)],
            }),
        ];

        for (let i = 0; i < leftFields.length; i++) {
            const shaded = i % 2 === 0;
            rows.push(new TableRow({
                children: [
                    dataCell(leftFields[i][0], leftFields[i][1], 50, shaded),
                    dataCell(rightFields[i][0], rightFields[i][1], 50, shaded),
                ],
            }));
        }

        return new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            layout: TableLayoutType.FIXED,
            borders: TABLE_NONE,
            rows,
        });
    }

    // ─── 3. Vehicle Information ──────────────────────────────────────────────

    function vehicleInformation() {
        const vehicle  = [payload.vehicle?.year, payload.vehicle?.make, payload.vehicle?.model]
                            .filter(Boolean).join(' ');

        // Odometer: if 0 or missing, show "Not Available" instead of "0 mi"
        const rawOdo = payload.vehicle?.odometer || parsed.mileage || '';
        const odoNum = Number(String(rawOdo).replace(/,/g, ''));
        const odometer = (odoNum > 0) ? _formatCommas(odoNum) + ' mi' : 'Not Available';

        // Engine description from vehicle desc line
        const engineSize = parsed.engineSize || '';
        const cylinders  = (parsed.cylinders || '').replace('CYL_', '');
        const engineDesc = payload.vehicle?.engine
            || [cylinders ? cylinders + '-Cyl' : '', engineSize].filter(Boolean).join(' ')
            || 'N/A';

        // Transmission
        const transRaw = parsed.transmission || '';
        const TRANS_LABELS = {
            'TRANS_AUTO': 'Automatic', 'TRANS_OD': 'Overdrive', 'TRANS_S3': '3-Speed Manual',
            'TRANS_S4': '4-Speed Manual', 'TRANS_S5': '5-Speed Manual', 'TRANS_S6': '6-Speed Manual',
            'TRANS_4W': '4WD/AWD', 'TRANS_PO': 'Power',
        };
        const transmission = TRANS_LABELS[transRaw] || transRaw || 'N/A';

        // Exterior color — extract from vehicle description line
        const descLine = parsed._vehicleDescLine || '';
        const colorMatch = descLine.match(/\b(BLACK|WHITE|SILVER|GRAY|GREY|RED|BLUE|GREEN|BROWN|GOLD|BEIGE|TAN|ORANGE|YELLOW|PURPLE|MAROON|BURGUNDY|CHARCOAL|PEARL|BRONZE|COPPER|CREAM|IVORY)\b/i);
        const extColor = colorMatch
            ? colorMatch[1].charAt(0).toUpperCase() + colorMatch[1].slice(1).toLowerCase()
            : 'N/A';

        // Always show all 7 rows — use N/A if data is missing
        const fields = [
            ['Vehicle',          vehicle || 'N/A'],
            ['VIN',              payload.vehicle?.vin || parsed.vin || 'N/A'],
            ['Odometer',         odometer],
            ['Engine',           engineDesc],
            ['Transmission',     transmission],
            ['Exterior Color',   extColor],
            ['Overall Condition', isTotalLoss ? 'Total Loss' : 'Repairable'],
        ];

        const rows = fields.map(([label, value], i) => kvRow(label, value, i % 2 === 0));

        return [
            emptyPara(120),
            sectionHeaderTable('VEHICLE INFORMATION'),
            new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                layout: TableLayoutType.FIXED,
                borders: TABLE_NONE,
                rows,
            }),
        ];
    }

    // ─── 4. Loss Description ─────────────────────────────────────────────────

    function lossDescription() {
        const blocks = [
            emptyPara(120),
            sectionHeaderTable('LOSS DESCRIPTION'),
        ];

        const vehicle = [parsed.year || payload.vehicle?.year,
                         parsed.make || payload.vehicle?.make,
                         parsed.model || payload.vehicle?.model].filter(Boolean).join(' ');
        const vehicleRef = vehicle ? `The ${vehicle}` : 'The vehicle';
        const lossType = (payload.claim?.lossType || parsed.lossType || 'collision').toLowerCase();
        const shopName = parsed.shopName || '';
        const workfileId = parsed.workfileId || '';
        const repairDays = parsed.repairDays || 0;

        // Determine damage category summary from line items
        const lineItems = parsed.repairLineItems || {};
        const damageCats = [];
        if (lineItems.structural?.length > 0) damageCats.push('structural');
        if (lineItems.bodyPanels?.length > 0) damageCats.push('body panel and cosmetic');
        if (lineItems.restraints?.length > 0) damageCats.push('restraint system');
        if (lineItems.interior?.length > 0) damageCats.push('interior');
        const damageDesc = damageCats.length > 0 ? damageCats.join(', ') : 'the documented areas';

        // POI description fragment
        const poiFragment = poiLabel
            ? `a ${poiLabel.toLowerCase()} (CCC Position ${poiCode || 'N/A'})`
            : 'the reported loss';

        // --- Paragraph 1 (shared opening, diverges by mode) ---
        let para1 = `${vehicleRef} sustained ${lossType} damage consistent with ${poiFragment}.`;

        if (isTotalLoss) {
            // Total loss: severity + designation
            para1 += ' Based on documented damage severity and repair cost analysis, the vehicle has been designated a total loss.';
        } else {
            // Repairable: shop/workfile + damage categories
            if (shopName || workfileId) {
                para1 += ` The preliminary estimate`;
                if (shopName) para1 += ` prepared by ${shopName}`;
                if (workfileId) para1 += ` (Workfile ID: ${workfileId})`;
                para1 += ` documents repair procedures addressing ${damageDesc}`;
                para1 += poiLabel ? ` to the ${poiLabel.toLowerCase()} of the vehicle.` : '.';
            }
        }

        blocks.push(para([run(para1)], { spacing: { before: 60, after: 80 }, indent: { left: 80 } }));

        // --- Paragraph 2 (mode-specific) ---
        let para2 = '';
        if (isTotalLoss) {
            para2 = 'The estimated cost of repairs exceeds the economic repair threshold relative to the vehicle\'s actual cash value.';
            para2 += ' This claim will proceed under total loss settlement guidelines.';
        } else {
            para2 = 'Based on current inspection and estimate documentation, the vehicle is repairable within economic guidelines.';
            para2 += ' A supplement may be required following teardown.';
            if (repairDays > 0) {
                para2 += ` Estimated repair duration is approximately ${repairDays} day${repairDays !== 1 ? 's' : ''}.`;
            }
        }

        blocks.push(para([run(para2)], { spacing: { before: 40, after: 80 }, indent: { left: 80 } }));

        return blocks;
    }

    // ─── 5. Damage Assessment ────────────────────────────────────────────────

    function damageAssessment() {
        // Use parsed repair line items if available; fall back to POI-based categorization
        const lineItems = parsed.repairLineItems || {};
        const hasLineItems = Object.values(lineItems).some(arr => arr?.length > 0);

        const categories = {
            'STRUCTURAL': [],
            'BODY PANELS': [],
            'RESTRAINTS': [],
            'INTERIOR': [],
        };

        if (hasLineItems) {
            // Use actual parsed repair lines — much more specific than POI label
            if (lineItems.structural?.length > 0)
                categories['STRUCTURAL'] = lineItems.structural.map(s => s.replace(/\s+/g, ' ').trim());
            if (lineItems.bodyPanels?.length > 0)
                categories['BODY PANELS'] = lineItems.bodyPanels.map(s => s.replace(/\s+/g, ' ').trim());
            if (lineItems.restraints?.length > 0)
                categories['RESTRAINTS'] = lineItems.restraints.map(s => s.replace(/\s+/g, ' ').trim());
            if (lineItems.interior?.length > 0)
                categories['INTERIOR'] = lineItems.interior.map(s => s.replace(/\s+/g, ' ').trim());
        } else {
            // Fallback: categorize from POI label keywords
            const label = (poiLabel || '').toUpperCase();
            if (/FRAME|RAIL|APRON|PILLAR|UNIBODY|SUBFRAME|CROSS.?MEMBER|STRUCTURAL/i.test(label))
                categories['STRUCTURAL'].push(poiLabel);
            if (/BUMPER|FENDER|HOOD|DOOR|QUARTER|PANEL|DECKLID|TRUNK|TAILGATE|ROOF|GRILLE|HEADER/i.test(label))
                categories['BODY PANELS'].push(poiLabel);
            if (/AIRBAG|AIR.?BAG|SRS|RESTRAINT|SEAT.?BELT/i.test(label))
                categories['RESTRAINTS'].push(poiLabel);
            if (/DASH|CONSOLE|HEADLINER|CARPET|TRIM|SEAT|INTERIOR/i.test(label))
                categories['INTERIOR'].push(poiLabel);

            // If nothing matched, put POI label under BODY PANELS
            const hasAny = Object.values(categories).some(arr => arr.length > 0);
            if (!hasAny && poiLabel) categories['BODY PANELS'].push(poiLabel);
        }

        const blocks = [
            emptyPara(120),
            sectionHeaderTable('DAMAGE ASSESSMENT'),
        ];

        const rows = [];
        for (const [cat, items] of Object.entries(categories)) {
            // Consolidate descriptions: join multiple items with ". "
            const description = items.length > 0
                ? items.slice(0, 6).join('. ') + (items.length > 6 ? '...' : '')
                : 'No damage documented';
            rows.push(new TableRow({
                children: [
                    new TableCell({
                        width: { size: 30, type: WidthType.PERCENTAGE },
                        shading: { type: ShadingType.CLEAR, fill: AMBER_SHADE },
                        borders: { top: GRAY_BORDER, bottom: GRAY_BORDER, left: GRAY_BORDER, right: GRAY_BORDER },
                        children: [
                            para([run(cat, { bold: true, size: SZ_BODY, color: NAVY })], {
                                spacing: { before: 40, after: 40 }, indent: { left: 80 },
                            }),
                        ],
                    }),
                    new TableCell({
                        width: { size: 70, type: WidthType.PERCENTAGE },
                        shading: { type: ShadingType.CLEAR, fill: WHITE },
                        borders: { top: GRAY_BORDER, bottom: GRAY_BORDER, left: GRAY_BORDER, right: GRAY_BORDER },
                        children: [
                            para([run(description)], {
                                spacing: { before: 40, after: 40 }, indent: { left: 80 },
                            }),
                        ],
                    }),
                ],
            }));
        }

        blocks.push(new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            layout: TableLayoutType.FIXED,
            borders: TABLE_NONE,
            rows,
        }));

        return blocks;
    }

    // ─── 6. Repair Cost Summary ──────────────────────────────────────────────

    function repairCostSummary() {
        const partsTotal   = _toNumber(parsed.partsTotal);
        const laborTotal   = _toNumber(parsed.laborTotal);
        const paintTotal   = _toNumber(parsed.paintTotal);
        const total        = _toNumber(parsed.estimateTotal);
        const deductible   = _toNumber(parsed.deductible);
        const bodyHrs      = _toNumber(parsed.bodyLaborHrs);
        const bodyRate     = _toNumber(parsed.bodyLaborRate);
        const paintHrs     = _toNumber(parsed.paintLaborHrs);
        const paintRate    = _toNumber(parsed.paintLaborRate);
        const mechHrs      = _toNumber(parsed.mechLaborHrs);
        const mechRate     = _toNumber(parsed.mechLaborRate);
        const paintSupp    = _toNumber(parsed.paintSupplies);
        const salesTax     = _toNumber(parsed.salesTax);

        if (!total && !partsTotal && !laborTotal && !paintTotal) return [];

        function costRow(label, amount, opts = {}) {
            const { bold: isBold = false, navy = false, gold = false, topBorder = false } = opts;
            const bgFill = navy ? NAVY : WHITE;
            const textColor = navy ? WHITE : BODY_COLOR;
            const amountColor = gold ? GOLD : textColor;
            const topBrd = topBorder
                ? { style: BorderStyle.SINGLE, size: 6, color: NAVY }
                : GRAY_BORDER;

            return new TableRow({
                children: [
                    new TableCell({
                        width: { size: 65, type: WidthType.PERCENTAGE },
                        shading: { type: ShadingType.CLEAR, fill: bgFill },
                        borders: { top: topBrd, bottom: GRAY_BORDER, left: GRAY_BORDER, right: GRAY_BORDER },
                        children: [
                            para([run(label, { bold: isBold, color: textColor })], {
                                spacing: { before: 40, after: 40 }, indent: { left: 80 },
                                alignment: AlignmentType.LEFT,
                            }),
                        ],
                    }),
                    new TableCell({
                        width: { size: 35, type: WidthType.PERCENTAGE },
                        shading: { type: ShadingType.CLEAR, fill: bgFill },
                        borders: { top: topBrd, bottom: GRAY_BORDER, left: GRAY_BORDER, right: GRAY_BORDER },
                        children: [
                            para([run(_formatCurrency(amount), { bold: isBold, color: amountColor })], {
                                spacing: { before: 40, after: 40 },
                                alignment: AlignmentType.RIGHT,
                                indent: { right: 80 },
                            }),
                        ],
                    }),
                ],
            });
        }

        // Format labor line label with hrs @ rate if available
        function laborLabel(prefix, hrs, rate) {
            if (hrs > 0 && rate > 0) {
                return `${prefix} (${hrs} hrs @ $${rate.toFixed(2)}/hr)`;
            }
            return prefix;
        }

        const rows = [];

        // Parts
        if (partsTotal > 0) rows.push(costRow('Parts', partsTotal));

        // Labor breakdown — show individual categories if parsed, otherwise show total
        const hasLaborBreakdown = bodyHrs > 0 || paintHrs > 0 || mechHrs > 0;
        if (hasLaborBreakdown) {
            if (bodyHrs > 0) {
                const bodyAmt = bodyHrs * bodyRate;
                rows.push(costRow(laborLabel('Body Labor', bodyHrs, bodyRate), bodyAmt));
            }
            if (paintHrs > 0) {
                const paintAmt = paintHrs * paintRate;
                rows.push(costRow(laborLabel('Paint Labor', paintHrs, paintRate), paintAmt));
            }
            if (mechHrs > 0) {
                const mechAmt = mechHrs * mechRate;
                rows.push(costRow(laborLabel('Mechanical Labor', mechHrs, mechRate), mechAmt));
            }
        } else if (laborTotal > 0) {
            rows.push(costRow('Labor', laborTotal));
        }

        // Paint supplies
        if (paintSupp > 0) {
            rows.push(costRow('Paint Supplies', paintSupp));
        } else if (paintTotal > 0 && !hasLaborBreakdown) {
            rows.push(costRow('Paint / Refinish', paintTotal));
        }

        // Subtotal line
        const lineItemSum = rows.reduce((sum, _r, _i) => {
            // Can't easily sum from rows, so compute from parsed values
            return sum;
        }, 0);
        const computedSubtotal = partsTotal + laborTotal + (paintSupp || paintTotal);
        if (rows.length > 0 && computedSubtotal > 0 && computedSubtotal !== total) {
            rows.push(costRow('Subtotal', computedSubtotal, { bold: true, topBorder: true }));
        }

        // Tax
        const taxAmount = salesTax > 0 ? salesTax : (total > computedSubtotal ? total - computedSubtotal : 0);
        if (taxAmount > 0) {
            rows.push(costRow('Sales Tax', taxAmount));
        }

        // TOTAL row — navy background, gold amount
        rows.push(costRow('TOTAL COST OF REPAIRS', total, { bold: true, navy: true, gold: true }));

        // Deductible + net
        if (deductible > 0) {
            rows.push(costRow('Deductible', deductible));
            rows.push(costRow('Net Cost of Repairs', total - deductible, { bold: true }));
        }

        return [
            emptyPara(120),
            sectionHeaderTable('REPAIR COST SUMMARY'),
            new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                layout: TableLayoutType.FIXED,
                borders: TABLE_NONE,
                rows,
            }),
        ];
    }

    // ─── 7. Vehicle Condition ────────────────────────────────────────────────

    function vehicleCondition() {
        const cond = payload.condition || {};
        const ratingLabels = ['Below Average', 'Normal', 'Above Average', 'Exceptional'];
        const ratingNotes = {
            0: 'Below average for vehicle age and mileage',
            1: 'Consistent with vehicle age and mileage',
            2: 'Above average for vehicle age and mileage',
            3: 'Exceptional condition for vehicle age',
        };
        const components = [
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

        const hasAnyRating = components.some(([, c]) => c && c.rating !== null && c.rating !== undefined);
        if (!hasAnyRating) return [];

        // Header row
        const headerRow = new TableRow({
            children: ['Component', 'Rating', 'Notes'].map(text =>
                new TableCell({
                    width: { size: text === 'Notes' ? 40 : 30, type: WidthType.PERCENTAGE },
                    shading: { type: ShadingType.CLEAR, fill: NAVY },
                    borders: { top: NAVY_BORDER, bottom: NAVY_BORDER, left: NAVY_BORDER, right: NAVY_BORDER },
                    children: [
                        para([run(text, { bold: true, color: WHITE, size: SZ_BODY })], {
                            spacing: { before: 40, after: 40 }, indent: { left: 80 },
                        }),
                    ],
                })
            ),
        });

        const dataRows = [];
        let rowIdx = 0;
        for (const [label, comp] of components) {
            if (!comp || comp.rating === null || comp.rating === undefined) continue;
            const ratingText = ratingLabels[comp.rating] || `Rating ${comp.rating}`;
            const commentText = comp.comment || ratingNotes[comp.rating] || '';
            const shaded = rowIdx % 2 === 0;
            const bgFill = shaded ? LIGHT_GRAY : WHITE;

            dataRows.push(new TableRow({
                children: [
                    new TableCell({
                        width: { size: 30, type: WidthType.PERCENTAGE },
                        shading: { type: ShadingType.CLEAR, fill: bgFill },
                        borders: { top: GRAY_BORDER, bottom: GRAY_BORDER, left: GRAY_BORDER, right: GRAY_BORDER },
                        children: [para([run(label, { bold: true })], { spacing: { before: 30, after: 30 }, indent: { left: 80 } })],
                    }),
                    new TableCell({
                        width: { size: 30, type: WidthType.PERCENTAGE },
                        shading: { type: ShadingType.CLEAR, fill: bgFill },
                        borders: { top: GRAY_BORDER, bottom: GRAY_BORDER, left: GRAY_BORDER, right: GRAY_BORDER },
                        children: [para([run(ratingText)], { spacing: { before: 30, after: 30 }, indent: { left: 80 } })],
                    }),
                    new TableCell({
                        width: { size: 40, type: WidthType.PERCENTAGE },
                        shading: { type: ShadingType.CLEAR, fill: bgFill },
                        borders: { top: GRAY_BORDER, bottom: GRAY_BORDER, left: GRAY_BORDER, right: GRAY_BORDER },
                        children: [para([run(commentText)], { spacing: { before: 30, after: 30 }, indent: { left: 80 } })],
                    }),
                ],
            }));
            rowIdx++;
        }

        return [
            emptyPara(120),
            sectionHeaderTable('VEHICLE CONDITION'),
            new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                layout: TableLayoutType.FIXED,
                borders: TABLE_NONE,
                rows: [headerRow, ...dataRows],
            }),
        ];
    }

    // ─── 8. Vehicle Options / Equipment (Total Loss only) ────────────────────

    const OPTION_LABELS = {
        "PS":"Power Steering","PB":"Power Brakes","PW":"Power Windows","PL":"Power Locks",
        "SP":"Power Driver Seat","PC":"Power Passenger Seat","PA":"Power Antenna",
        "PM":"Power Mirrors","PT":"Power Trunk/Gate","PP":"Power Adj Pedals",
        "PD":"Power Sliding Door","DP":"Dual Pwr Slide Doors","AC":"Air Conditioning",
        "DA":"Dual Air Cond","CL":"Climate Control","RD":"Rear Defogger",
        "IW":"Intermittent Wipers","TW":"Tilt Wheel","TL":"Telescopic Wheel",
        "CC":"Cruise Control","KE":"Keyless Entry","CN":"Console/Storage",
        "CO":"Overhead Console","EC":"Entertainment Ctr","NV":"Navigation System",
        "C2":"Communications Sys","HU":"Heads-Up Display","WT":"Wood Interior/Trim",
        "EI":"Electronic Instrum","IB":"Onboard Computer","MC":"Message Center",
        "MM":"Memory Package","RJ":"Remote Start","HL":"Homelink","DE":"Deluxe Equipment",
        "CS":"Cloth Seats","LS":"Leather Seats","RL":"Reclining Seats","BS":"Bucket Seats",
        "SH":"Heated Seats","RH":"Rear Heated Seats","3S":"3rd Row Seat",
        "3P":"Power 3rd Seat","R3":"Retractable Seats","VS":"Ventilated Seats",
        "AM":"AM Radio","FM":"FM Radio","ST":"Stereo","CA":"Cassette","SE":"Search/Seek",
        "CD":"CD Player","SK":"CD Changer","UR":"Premium Radio","XM":"Satellite Radio",
        "TQ":"Steering Whl Ctrls","M3":"Aux Audio Input","EQ":"Equalizer",
        "AW":"Aluminum/Alloy","CJ":"Chrome Wheels","W2":'20" Wheels',
        "DC":"Deluxe Whl Covers","FC":"Full Whl Covers","SA":"Spoke Aluminum",
        "SY":"Styled Steel","WW":"Wire Wheels","WC":"Wire Whl Covers",
        "RW":"Rally Wheels","KW":"Locking Wheels","LC":"Locking Whl Covers",
        "EG":"Elec Glass Roof","ES":"Elec Steel Roof","OR":"Skyview Roof",
        "SD":"Dual Sunroof","MS":"Manual Steel Roof","MG":"Manual Glass Roof",
        "FR":"Flip Roof","TT":"T-Top","GT":"Glass T-Top","VP":"Power Convert Roof",
        "RM":"Detachable Roof","VR":"Vinyl Covered Roof","RF":"Cabriolet Roof",
        "LR":"Landau Roof","LP":"Padded Landau Roof","PV":"Padded Vinyl Roof","HT":"Hard Top",
        "AG":"Driver Air Bag","RG":"Passenger Air Bag","XG":"Front Side Air Bags",
        "ZG":"Rear Side Air Bags","DG":"Head/Curtain Bags","TD":"Alarm/Anti-Theft",
        "VZ":"Night Vision","IC":"Adaptive Cruise","PJ":"Parking Sensors",
        "PX":"Parking Assist","AB":"Anti-Lock Brakes","A2":"ABS (alt)",
        "DB":"4-Whl Disc Brakes","RB":"Roll Bar","TX":"Traction Control",
        "T1":"Stability Control","AL":"Auto Level","SV":"Surround View/360",
        "LW":"Lane Departure","RR":"Roof/Luggage Rack","WG":"Woodgrain",
        "WP":"Rear Wndw Wiper","2T":"Two-Tone Paint","HP":"Three Stage Paint",
        "IP":"Clearcoat Paint","MP":"Metallic Paint","SL":"Rear Spoiler",
        "FL":"Fog Lamps","TG":"Tinted Glass","DT":"Privacy Glass",
        "BN":"Body Side Moldings","DM":"Dual Mirrors","HM":"Heated Mirrors",
        "HV":"Headlamp Washers","MX":"Signal Integ Mirrors","XE":"Xenon Headlamps",
        "TP":"Towing Package","BL":"Bedliner","BY":"Spray-On Bedliner",
        "SAFETY_BC":"Backup Camera","SAFETY_BD":"Blind Spot Monitor",
    };

    function vehicleOptionsEquipment() {
        const activeOptions = payload.options || [];
        if (!activeOptions.length) return [];

        // Map codes to labels, sorted alphabetically by label
        const optionList = activeOptions
            .map(code => OPTION_LABELS[code] || code)
            .sort();

        const blocks = [
            emptyPara(120),
            sectionHeaderTable('VEHICLE OPTIONS / EQUIPMENT'),
        ];

        // Build a compact multi-column table (3 columns)
        const colCount = 3;
        const colWidth = Math.floor(100 / colCount);
        const rows = [];

        for (let i = 0; i < optionList.length; i += colCount) {
            const cells = [];
            for (let c = 0; c < colCount; c++) {
                const label = optionList[i + c] || '';
                const shaded = Math.floor(i / colCount) % 2 === 0;
                cells.push(new TableCell({
                    width: { size: colWidth, type: WidthType.PERCENTAGE },
                    shading: { type: ShadingType.CLEAR, fill: shaded ? LIGHT_GRAY : WHITE },
                    borders: { top: GRAY_BORDER, bottom: GRAY_BORDER, left: GRAY_BORDER, right: GRAY_BORDER },
                    children: [
                        para([run(label, { size: SZ_BODY })], {
                            spacing: { before: 30, after: 30 }, indent: { left: 80 },
                        }),
                    ],
                }));
            }
            rows.push(new TableRow({ children: cells }));
        }

        blocks.push(new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            layout: TableLayoutType.FIXED,
            borders: TABLE_NONE,
            rows,
        }));

        return blocks;
    }

    // ─── 9. Prior Damage ─────────────────────────────────────────────────────

    function priorDamage() {
        const pd = (parsed.priorDamage || '').trim();

        // Always show this section — if no data, state "no prior damage"
        const blocks = [
            emptyPara(120),
            sectionHeaderTable('PRIOR DAMAGE'),
        ];

        const normalized = pd.toUpperCase();
        const isNone = !pd
            || normalized === 'NO UPD VISIBLE'
            || normalized === 'NONE'
            || normalized === 'N/A'
            || pd.length < 4;  // Guard against truncated fragments like "ated"

        if (isNone) {
            blocks.push(para([run('No unrelated prior damage was observed during inspection.')], {
                spacing: { before: 60, after: 80 }, indent: { left: 80 },
            }));
        } else {
            blocks.push(para([run('Prior damage noted: ' + pd + '.')], {
                spacing: { before: 60, after: 80 }, indent: { left: 80 },
            }));
        }

        return blocks;
    }

    // ─── Page Break ─────────────────────────────────────────────────────────

    function makePageBreak() {
        return new Paragraph({ children: [new PageBreak()] });
    }

    // ─── 11. Appraiser Certification ─────────────────────────────────────────

    function appraiserCertification() {
        const para1 = 'This report has been prepared based on a physical inspection of the referenced vehicle ' +
            'and a thorough review of the associated CCC estimate documentation. All findings contained herein ' +
            'are presented in accordance with accepted industry standards for vehicle damage appraisal and are ' +
            'intended to provide an accurate and objective assessment of the vehicle\'s condition at the time of inspection.';

        const para2 = 'The appraiser certifies that the information provided in this report is true and accurate to ' +
            'the best of their knowledge and professional judgment. This document does not constitute a guarantee ' +
            'of repair costs and is subject to revision upon supplemental inspection or teardown findings.';

        return [
            emptyPara(120),
            sectionHeaderTable('APPRAISER CERTIFICATION'),
            para([run(para1)], { spacing: { before: 80, after: 80 }, indent: { left: 80 } }),
            para([run(para2)], { spacing: { before: 40, after: 80 }, indent: { left: 80 } }),
        ];
    }

    // ─── 12. Important Notice ────────────────────────────────────────────────

    function importantNotice() {
        const noticeText = isTotalLoss
            ? 'This valuation report is based on the vehicle\'s condition, equipment, ' +
              'and mileage at the time of loss. The actual cash value determination is ' +
              'subject to review and may be adjusted based on additional documentation ' +
              'or comparable vehicle analysis. Settlement terms are subject to policy ' +
              'provisions and applicable state regulations.'
            : 'This estimate is preliminary and does not represent a final repair cost. ' +
              'Actual repair costs may change following vehicle teardown and supplemental ' +
              'inspection. Additional hidden or structural damage not visible at the time ' +
              'of initial appraisal may result in supplemental claims. Final authorization ' +
              'and payment remain subject to carrier review and approval of any supplement requests.';

        return [
            emptyPara(120),
            new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                layout: TableLayoutType.FIXED,
                borders: TABLE_NONE,
                rows: [
                    new TableRow({
                        children: [
                            new TableCell({
                                width: { size: 100, type: WidthType.PERCENTAGE },
                                shading: { type: ShadingType.CLEAR, fill: CALLOUT_BG },
                                borders: {
                                    top: { style: BorderStyle.SINGLE, size: 8, color: GOLD },
                                    bottom: GRAY_BORDER,
                                    left: GRAY_BORDER,
                                    right: GRAY_BORDER,
                                },
                                children: [
                                    para([run('IMPORTANT NOTICE', { bold: true, color: NAVY, size: SZ_HEAD })], {
                                        spacing: { before: 100, after: 60 }, indent: { left: 120 },
                                    }),
                                    para([run(noticeText, { italics: true, size: SZ_BODY })], {
                                        spacing: { before: 0, after: 100 }, indent: { left: 120, right: 120 },
                                    }),
                                ],
                            }),
                        ],
                    }),
                ],
            }),
        ];
    }

    // ─── 13. Signature Block ─────────────────────────────────────────────────

    function signatureBlock() {
        const today = new Date().toLocaleDateString('en-US', {
            year: 'numeric', month: 'long', day: 'numeric',
        });

        const sigName = fullName || payload.claim?.writer || '';
        const sigText = sigName ? `/s/ ${sigName}` : '';

        const blocks = [emptyPara(200)];

        // Table 1: Signature + Date
        blocks.push(new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            layout: TableLayoutType.FIXED,
            borders: TABLE_NONE,
            rows: [
                // Signature and date values
                new TableRow({
                    children: [
                        new TableCell({
                            width: { size: 60, type: WidthType.PERCENTAGE },
                            borders: { ...CELL_NONE, bottom: { style: BorderStyle.SINGLE, size: 4, color: NAVY } },
                            children: [
                                para([
                                    new TextRun({ text: sigText, font: FONT_SIG, size: SZ_SIG, color: NAVY, italics: true }),
                                ], { spacing: { before: 40, after: 40 }, indent: { left: 80 } }),
                            ],
                        }),
                        new TableCell({
                            width: { size: 40, type: WidthType.PERCENTAGE },
                            borders: { ...CELL_NONE, bottom: { style: BorderStyle.SINGLE, size: 4, color: NAVY } },
                            children: [
                                para([run(today, { color: NAVY })], {
                                    spacing: { before: 40, after: 40 }, indent: { left: 80 },
                                }),
                            ],
                        }),
                    ],
                }),
                // Labels
                new TableRow({
                    children: [
                        new TableCell({
                            width: { size: 60, type: WidthType.PERCENTAGE },
                            borders: CELL_NONE,
                            children: [
                                para([run('Appraiser Signature', { size: SZ_SMALL, color: '888888' })], {
                                    spacing: { before: 20, after: 40 }, indent: { left: 80 },
                                }),
                            ],
                        }),
                        new TableCell({
                            width: { size: 40, type: WidthType.PERCENTAGE },
                            borders: CELL_NONE,
                            children: [
                                para([run('Date', { size: SZ_SMALL, color: '888888' })], {
                                    spacing: { before: 20, after: 40 }, indent: { left: 80 },
                                }),
                            ],
                        }),
                    ],
                }),
            ],
        }));

        blocks.push(emptyPara(120));

        // Table 2: Printed Name + License Number
        blocks.push(new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            layout: TableLayoutType.FIXED,
            borders: TABLE_NONE,
            rows: [
                // Values
                new TableRow({
                    children: [
                        new TableCell({
                            width: { size: 60, type: WidthType.PERCENTAGE },
                            borders: { ...CELL_NONE, bottom: { style: BorderStyle.SINGLE, size: 2, color: MED_GRAY } },
                            children: [
                                para([run(sigName, { bold: true })], {
                                    spacing: { before: 40, after: 40 }, indent: { left: 80 },
                                }),
                            ],
                        }),
                        new TableCell({
                            width: { size: 40, type: WidthType.PERCENTAGE },
                            borders: { ...CELL_NONE, bottom: { style: BorderStyle.SINGLE, size: 2, color: MED_GRAY } },
                            children: [
                                para([run(licenseNumber)], {
                                    spacing: { before: 40, after: 40 }, indent: { left: 80 },
                                }),
                            ],
                        }),
                    ],
                }),
                // Labels
                new TableRow({
                    children: [
                        new TableCell({
                            width: { size: 60, type: WidthType.PERCENTAGE },
                            borders: CELL_NONE,
                            children: [
                                para([run('Appraiser Name (Print)', { size: SZ_SMALL, color: '888888' })], {
                                    spacing: { before: 20, after: 40 }, indent: { left: 80 },
                                }),
                            ],
                        }),
                        new TableCell({
                            width: { size: 40, type: WidthType.PERCENTAGE },
                            borders: CELL_NONE,
                            children: [
                                para([run('License Number', { size: SZ_SMALL, color: '888888' })], {
                                    spacing: { before: 20, after: 40 }, indent: { left: 80 },
                                }),
                            ],
                        }),
                    ],
                }),
            ],
        }));

        return blocks;
    }

    // ─── Assemble ────────────────────────────────────────────────────────────
    // Repairable: Title → Claim/Insured → Vehicle → Loss → Damage → Costs →
    //             Prior Damage → [break] → Certification → Notice → Signature
    // Total Loss: Title → Claim/Insured → Vehicle → Options → Condition → Loss →
    //             Damage → Costs → Prior Damage → [break] → Certification → Notice → Signature

    const children = [
        titleBlock(),
        emptyPara(120),
        claimInsuredSideBySide(),
        ...vehicleInformation(),
    ];

    // Total Loss only: options + condition (inform valuation)
    if (isTotalLoss) {
        children.push(...vehicleOptionsEquipment());
        children.push(...vehicleCondition());
    }

    children.push(
        ...lossDescription(),
        ...damageAssessment(),
        ...repairCostSummary(),
        ...priorDamage(),
        makePageBreak(),
        ...appraiserCertification(),
        ...importantNotice(),
        ...signatureBlock(),
    );

    // Remove any null/undefined from conditional sections
    const filteredChildren = children.filter(Boolean);

    const doc = new Document({
        creator: 'Claim Cipher',
        sections: [{
            properties: {
                page: {
                    margin: { top: 1080, bottom: 1080, left: 1440, right: 1440 },
                },
            },
            headers: { default: buildHeader() },
            footers: { default: buildFooter() },
            children: filteredChildren,
        }],
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
