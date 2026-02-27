#!/usr/bin/env node
/**
 * cccParser.test.js — CLI regression harness for the CCC estimate parser
 *
 * Usage:
 *   node test/cccParser.test.js <path/to/estimate.pdf>
 *   node test/cccParser.test.js <path/to/estimate.txt>   (pre-extracted text)
 *
 * PDF extraction requires pdfjs-dist:
 *   npm install pdfjs-dist --save-dev
 *
 * Or skip the install and place pre-extracted text alongside the PDF:
 *   estimate.txt  (same basename, .txt extension)
 *
 * ── HOW TO USE ───────────────────────────────────────────────────────────────
 * 1. Run once with a real estimate: node test/cccParser.test.js path/to/estimate.pdf
 * 2. All fields will print with "(no expected value set)"
 * 3. Copy the actual values from the output into the EXPECTED object below
 * 4. Re-run to get PASS/FAIL results — add more PDFs as you accumulate fixtures
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, extname, basename } from 'path';
import { createRequire } from 'module';
import { parseCCCText } from '../modules/total-loss-v2/engines/cccParser.js';

const require = createRequire(import.meta.url);

// ── Fill these in after a first run ─────────────────────────────────────────
const EXPECTED = {
    claimNumber:     'FILL_IN',   // e.g. '10382231'
    vin:             'FILL_IN',   // e.g. '1HGCM82633A004352'
    year:            'FILL_IN',   // e.g. '2019'
    make:            'FILL_IN',   // e.g. 'HONDA'
    model:           'FILL_IN',   // e.g. 'CIVIC'
    bodyStyle:       'FILL_IN',   // e.g. 'BODY_4DR'
    engineSize:      'FILL_IN',   // e.g. '1.5L'
    cylinders:       'FILL_IN',   // e.g. 'CYL_4'
    transmission:    'FILL_IN',   // e.g. 'TRANS_AUTO'
    optionsMinCount: 0,           // minimum number of options expected (set after first run)
};

// Fields set to SKIP are printed but not pass/fail checked
const SKIP = 'FILL_IN';

// ── PDF text extraction (Node) ───────────────────────────────────────────────

async function extractTextFromPDF(pdfPath) {
    let pdfjsLib;
    try {
        pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');
    } catch {
        const txtPath = pdfPath.replace(/\.pdf$/i, '.txt');
        if (existsSync(txtPath)) {
            console.log(`[NOTE] pdfjs-dist not installed — using sidecar file: ${basename(txtPath)}\n`);
            return readFileSync(txtPath, 'utf8');
        }
        throw new Error(
            'pdfjs-dist is not installed and no .txt sidecar was found.\n' +
            '  Install:  npm install pdfjs-dist --save-dev\n' +
            `  Or place: ${txtPath}`
        );
    }

    const loadingTask = pdfjsLib.getDocument({ url: pdfPath });
    const doc = await loadingTask.promise;
    const pages = [];
    for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const content = await page.getTextContent();
        pages.push(content.items.map(item => item.str).join(' '));
    }
    return pages.join('\n');
}

// ── Output helpers ────────────────────────────────────────────────────────────

const GREEN  = '\x1b[32m';
const RED    = '\x1b[31m';
const GREY   = '\x1b[90m';
const RESET  = '\x1b[0m';
const BOLD   = '\x1b[1m';

let passCount = 0;
let failCount = 0;
let skipCount = 0;

function check(label, actual, expected) {
    if (expected === SKIP) {
        console.log(`  ${GREY}[ -- ]${RESET}  ${label}: ${JSON.stringify(actual)}`);
        skipCount++;
        return;
    }
    const pass = String(actual) === String(expected);
    if (pass) {
        console.log(`  ${GREEN}[ OK ]${RESET}  ${label}: ${JSON.stringify(actual)}`);
        passCount++;
    } else {
        console.log(`  ${RED}[FAIL]${RESET}  ${label}: ${JSON.stringify(actual)}  ${RED}(expected: ${JSON.stringify(expected)})${RESET}`);
        failCount++;
    }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
    const inputPath = process.argv[2];
    if (!inputPath) {
        console.error('Usage: node test/cccParser.test.js <estimate.pdf|estimate.txt>');
        process.exit(1);
    }

    const absPath = resolve(inputPath);
    if (!existsSync(absPath)) {
        console.error(`File not found: ${absPath}`);
        process.exit(1);
    }

    let rawText;
    const ext = extname(absPath).toLowerCase();
    if (ext === '.txt') {
        rawText = readFileSync(absPath, 'utf8');
    } else if (ext === '.pdf') {
        console.log(`Extracting text from: ${basename(absPath)}\n`);
        rawText = await extractTextFromPDF(absPath);
    } else {
        console.error(`Unsupported file type: ${ext} — use .pdf or .txt`);
        process.exit(1);
    }

    console.log(`${BOLD}Running cccParser against: ${basename(absPath)}${RESET}\n`);

    const result = parseCCCText(rawText);

    // ── Parser returned an error ──────────────────────────────────────
    if (!result.success) {
        console.log(`${RED}${BOLD}PARSER ERROR: ${result.error}${RESET}`);
        console.log(`  ${result.message}`);
        console.log(`\n${GREY}── RAW TEXT SAMPLE (first 800 chars) ─────────────────────────${RESET}`);
        console.log(rawText.substring(0, 800));
        process.exit(2);
    }

    // ── Claim fields ──────────────────────────────────────────────────
    console.log(`${BOLD}── CLAIM FIELDS ──────────────────────────────────────────────${RESET}`);
    check('claimNumber',        result.claimNumber,        EXPECTED.claimNumber);
    check('policyNumber',       result.policyNumber,       SKIP);
    check('ownerName',          result.ownerName,          SKIP);
    check('insuredName',        result.insuredName,        SKIP);
    check('carrierName',        result.carrierName,        SKIP);
    check('dateOfLoss',         result.dateOfLoss,         SKIP);
    check('lossType',           result.lossType,           SKIP);
    check('inspectionLocation', result.inspectionLocation, SKIP);

    // ── Vehicle ───────────────────────────────────────────────────────
    console.log(`\n${BOLD}── VEHICLE ───────────────────────────────────────────────────${RESET}`);
    check('vin',          result.vin,          EXPECTED.vin);
    check('year',         result.year,         EXPECTED.year);
    check('make',         result.make,         EXPECTED.make);
    check('model',        result.model,        EXPECTED.model);
    check('bodyStyle',    result.bodyStyle,    EXPECTED.bodyStyle);
    check('engineSize',   result.engineSize,   EXPECTED.engineSize);
    check('cylinders',    result.cylinders,    EXPECTED.cylinders);
    check('transmission', result.transmission, EXPECTED.transmission);
    check('mileage',      result.mileage,      SKIP);

    // ── Options ───────────────────────────────────────────────────────
    console.log(`\n${BOLD}── OPTIONS ───────────────────────────────────────────────────${RESET}`);
    const optCount = result.options ? result.options.length : 0;
    const optPass  = optCount >= EXPECTED.optionsMinCount;
    if (optPass) {
        console.log(`  ${GREEN}[ OK ]${RESET}  options count: ${optCount}  (min: ${EXPECTED.optionsMinCount})`);
        passCount++;
    } else {
        console.log(`  ${RED}[FAIL]${RESET}  options count: ${optCount}  ${RED}(expected min: ${EXPECTED.optionsMinCount})${RESET}`);
        failCount++;
    }
    if (result.options && result.options.length > 0) {
        const preview = result.options.slice(0, 12);
        preview.forEach(opt => console.log(`    ${GREY}•${RESET} ${opt}`));
        if (result.options.length > 12) {
            console.log(`    ${GREY}... and ${result.options.length - 12} more${RESET}`);
        }
    }

    // ── Financial ─────────────────────────────────────────────────────
    console.log(`\n${BOLD}── FINANCIAL ─────────────────────────────────────────────────${RESET}`);
    check('estimateTotal', result.estimateTotal, SKIP);
    check('acv',           result.acv,           SKIP);
    check('oemOnly',       result.oemOnly,        SKIP);

    // ── Summary ───────────────────────────────────────────────────────
    const total = passCount + failCount;
    console.log(`\n${BOLD}── RESULTS ───────────────────────────────────────────────────${RESET}`);
    if (failCount === 0) {
        console.log(`  ${GREEN}${BOLD}${passCount}/${total} passed${RESET}  (${skipCount} skipped — no expected value set)`);
    } else {
        console.log(`  ${RED}${BOLD}${failCount} failed${RESET}, ${GREEN}${passCount} passed${RESET}  (${skipCount} skipped)`);
        process.exit(1);
    }
}

main().catch(err => {
    console.error('\nFatal error:', err.message);
    process.exit(1);
});
