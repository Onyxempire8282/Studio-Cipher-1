// Client-side BCIF PDF generator using pdf-lib (CDN).
// Draws a flat, non-editable BCIF form directly — no template needed.
// Output is inherently locked (no form fields = nothing to edit).

const OL = {
    PS:"Power Steering",PB:"Power Brakes",PW:"Power Windows",PL:"Power Locks",
    SP:"Pwr Driver Seat",PC:"Pwr Pass Seat",PA:"Pwr Antenna",PM:"Pwr Mirrors",
    PT:"Pwr Trunk/Gate",PP:"Adj Pedals",PD:"Pwr Slide Door",DP:"Dual Pwr Slide",
    AC:"Air Conditioning",DA:"Dual A/C",CL:"Climate Control",RD:"Rear Defogger",
    IW:"Int Wipers",TW:"Tilt Wheel",TL:"Telescopic Wheel",CC:"Cruise Control",
    KE:"Keyless Entry",CN:"Console/Storage",CO:"Overhead Console",EC:"Entertain Ctr",
    NV:"Navigation",C2:"Communications",HU:"Heads-Up Display",WT:"Wood Trim",
    EI:"Elec Instrument",IB:"Onboard Computer",MC:"Message Center",MM:"Memory Pkg",
    RJ:"Remote Start",SV:"Surround View",HL:"HomeLink",
    CS:"Cloth Seats",LS:"Leather Seats",RL:"Reclining Seats",BS:"Bucket Seats",
    SH:"Heated Seats",RH:"Rear Heated Seats","3S":"3rd Row Seat","3P":"Pwr 3rd Seat",
    R3:"Retractable Seats","2P":"12 Passenger","5P":"15 Passenger",
    B2:"Captain Chairs(2)",B4:"Captain Chairs(4)",B6:"Captain Chairs(6)",VS:"Ventilated Seats",
    AM:"AM Radio",FM:"FM Radio",ST:"Stereo",CA:"Cassette",SE:"Search/Seek",
    CD:"CD Player",SK:"CD Changer",UR:"Premium Radio",XM:"Satellite Radio",
    TQ:"Steer Whl Ctrls",M3:"Aux Audio",EQ:"Equalizer",
    AW:"Alloy Wheels",CJ:"Chrome Wheels",W2:'20"+ Wheels',DC:"Dlx Whl Covers",
    FC:"Full Whl Covers",SA:"Spoke Aluminum",SY:"Styled Steel",WW:"Wire Wheels",
    WC:"Wire Whl Covers",RW:"Rally Wheels",KW:"Locking Wheels",LC:"Locking Covers",
    EG:"Elec Glass Roof",ES:"Elec Steel Roof",OR:"Skyview Roof",SD:"Dual Sunroof",
    MS:"Manual Steel Roof",MG:"Manual Glass Roof",FR:"Flip Roof",TT:"T-Top",
    GT:"Glass T-Top",VP:"Pwr Conv Roof",RM:"Detachable Roof",VR:"Vinyl Roof",
    RF:"Cabriolet Roof",LR:"Landau Roof",LP:"Padded Landau",PV:"Padded Vinyl Roof",HT:"Hard Top",
    AG:"Driver Airbag",RG:"Pass Airbag",XG:"Front Side Airbags",ZG:"Rear Side Airbags",
    DG:"Curtain Airbags",TD:"Anti-Theft/Alarm",VZ:"Night Vision",IC:"Adaptive Cruise",
    PJ:"Parking Sensors",PX:"Parking Sens Equip",AB:"ABS 4-Wheel",A2:"ABS 2-Wheel",
    DB:"4-Whl Disc Brakes",RB:"Roll Bar",TX:"Traction Control",T1:"Stability Control",
    AL:"Auto Leveling",LW:"Lane Departure",SAFETY_BC:"Backup Camera",SAFETY_BD:"Blind Spot",
    RR:"Roof Rack",WG:"Woodgrain",WP:"Rear Wiper","2T":"Two-Tone Paint",HP:"3-Stage Paint",
    IP:"Clearcoat Paint",MP:"Metallic Paint",SL:"Rear Spoiler",FL:"Fog Lamps",
    TG:"Tinted Glass",DT:"Privacy Glass",BN:"Body Moldings",DM:"Dual Mirrors",
    HM:"Heated Mirrors",HV:"Headlamp Washers",MX:"Signal Mirrors",XE:"Xenon Headlamps",
    OTHER_BC:"Bumper Cushions",OTHER_BD:"Running Boards",UP:"Pwr Retract Boards",
    AR:"Bed Rails",BL:"Bedliner",BY:"Spray Bedliner",CP:"Dlx Truck Cap",GG:"Grill Guard",
    SB:"Rear Step Bumper",SS:"Swivel Seats",SW:"Rear Slide Window",PG:"Pwr Rear Window",
    TB:"Perm Tool Box",TN:"Soft Tonneau",TZ:"Hard Tonneau",TP:"Towing Pkg",
    WD:"Dual Rear Wheels",XT:"Aux Fuel Tank",BG:"Bumper Guards",EM:"CA Emissions",
    SG:"Stone Guard",WI:"Winch",DE:"Deluxe Equipment"
};

const OPTION_SECTIONS = [
    { title:"POWER OPTIONS", codes:["PS","PB","PW","PL","SP","PC","PA","PM","PT","PP","PD","DP"] },
    { title:"DECOR / CONVENIENCE", codes:["AC","DA","CL","RD","IW","TW","TL","CC","KE","CN","CO","EC","NV","C2","HU","WT","EI","IB","MC","MM","RJ","SV","HL"] },
    { title:"SEATING", codes:["CS","LS","RL","BS","SH","RH","3S","3P","R3","2P","5P","B2","B4","B6","VS"] },
    { title:"RADIO / AUDIO", codes:["AM","FM","ST","CA","SE","CD","SK","UR","XM","TQ","M3","EQ"] },
    { title:"WHEELS", codes:["AW","CJ","W2","DC","FC","SA","SY","WW","WC","RW","KW","LC"] },
    { title:"ROOF", codes:["EG","ES","OR","SD","MS","MG","FR","TT","GT","VP","RM","VR","RF","LR","LP","PV","HT"] },
    { title:"SAFETY / BRAKES", codes:["AG","RG","XG","ZG","DG","TD","VZ","IC","PJ","PX","AB","A2","DB","RB","TX","T1","AL","LW","SAFETY_BC","SAFETY_BD"] },
    { title:"EXTERIOR / PAINT / GLASS", codes:["RR","WG","WP","2T","HP","IP","MP","SL","FL","TG","DT","BN","DM","HM","HV","MX","XE"] },
    { title:"OTHER / TRUCK", codes:["OTHER_BC","OTHER_BD","UP","AR","BL","BY","CP","GG","SB","SS","SW","PG","TB","TN","TZ","TP","WD","XT","BG","EM","SG","WI","DE"] }
];

const COND_ROWS = [
    ["Paint","PAINT"],["Sheet Metal","SHEET_METAL"],["Glass","GLASS"],["Trim","TRIM"],
    ["Seats","SEATS"],["Carpet","CARPET"],["Dashboard","DASHBOARD"],["Headliner","HEADLINER"],
    ["Front Tires","FRONT_TIRES"],["Rear Tires","REAR_TIRES"],["Engine","ENGINE"],["Transmission","TRANSMISSION"]
];

// ── helpers ──

function newPage(c) {
    c.page = c.doc.addPage([c.W, c.H]);
    c.y = c.H - c.M;
    c.pageNum++;
}

function check(c, need) {
    if (c.y < c.M + need) newPage(c);
}

function line(c, y, color) {
    c.page.drawLine({ start:{x:c.M,y}, end:{x:c.W-c.M,y}, thickness:0.5, color });
}

function hdr(c, text) {
    check(c, 28);
    c.page.drawText(text, { x:c.M, y:c.y, font:c.bold, size:10, color:c.dk });
    c.y -= 3;
    line(c, c.y, c.med);
    c.y -= 13;
}

function field(c, label, value, x, w) {
    const lw = c.font.widthOfTextAtSize(label + ": ", 8.5);
    c.page.drawText(label + ": ", { x, y:c.y, font:c.font, size:8.5, color:c.med });
    const val = (value || "\u2014").substring(0, Math.floor((w - lw) / 4.5));
    c.page.drawText(val, { x:x+lw, y:c.y, font:c.bold, size:8.5, color:c.blk });
}

function fieldRow(c, pairs) {
    check(c, 14);
    const cw = c.cw / pairs.length;
    pairs.forEach(([l,v], i) => field(c, l, v, c.M + i*cw, cw));
    c.y -= 14;
}

function chk(c, checked, x, y) {
    c.page.drawRectangle({ x, y:y-1, width:7, height:7,
        borderColor:c.med, borderWidth:0.5, color:c.rgb(1,1,1) });
    if (checked) {
        c.page.drawText("X", { x:x+1.5, y:y, font:c.bold, size:5.5, color:c.blk });
    }
}

function chkRow(c, items, cols) {
    const cw = c.cw / cols;
    for (let i = 0; i < items.length; i++) {
        if (i > 0 && i % cols === 0) { c.y -= 11; check(c, 14); }
        const col = i % cols;
        const x = c.M + col * cw;
        const [label, checked] = items[i];
        chk(c, checked, x, c.y);
        const txt = label.substring(0, Math.floor((cw - 14) / 4));
        c.page.drawText(txt, { x:x+10, y:c.y, font:c.font, size:7.5, color:c.dk });
    }
    c.y -= 11;
}

function wrap(c, text, size, indent) {
    if (!text) return;
    const maxW = c.cw - (indent || 0);
    const words = text.split(/\s+/);
    let cur = "";
    for (const w of words) {
        const test = cur ? cur + " " + w : w;
        if (c.font.widthOfTextAtSize(test, size) > maxW && cur) {
            check(c, size + 3);
            c.page.drawText(cur, { x:c.M+(indent||0), y:c.y, font:c.font, size, color:c.blk });
            c.y -= size + 2;
            cur = w;
        } else {
            cur = test;
        }
    }
    if (cur) {
        check(c, size + 3);
        c.page.drawText(cur, { x:c.M+(indent||0), y:c.y, font:c.font, size, color:c.blk });
        c.y -= size + 2;
    }
}

// ── main export ──

export async function generateBCIFPdf(tokenMap) {
    const { PDFDocument, rgb, StandardFonts } = window.PDFLib;

    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const bold = await doc.embedFont(StandardFonts.HelveticaBold);

    const c = {
        doc, font, bold, page:null, y:0, pageNum:0,
        W:612, H:792, M:36,
        get cw(){ return this.W - 2*this.M; },
        blk: rgb(0,0,0),
        dk:  rgb(0.15,0.15,0.15),
        med: rgb(0.4,0.4,0.4),
        lt:  rgb(0.6,0.6,0.6),
        rgb
    };

    newPage(c);

    // ── TITLE ──
    c.page.drawText("BCIF — BASE CLAIM INFORMATION FORM", {
        x:c.M, y:c.y, font:bold, size:14, color:c.blk });
    c.y -= 18;
    c.page.drawLine({ start:{x:c.M,y:c.y}, end:{x:c.W-c.M,y:c.y}, thickness:1.5, color:c.dk });
    c.y -= 18;

    // ── CLAIM ──
    hdr(c, "CLAIM INFORMATION");
    fieldRow(c, [["Claim #", tokenMap.CLAIM_NUMBER], ["Date of Loss", tokenMap.DATE_OF_LOSS]]);
    fieldRow(c, [["Insured", tokenMap.INSURED_NAME], ["Owner", tokenMap.OWNER_NAME]]);
    fieldRow(c, [["Owner Phone", tokenMap.OWNER_PHONE], ["Office ID", tokenMap.OFFICE_ID]]);
    fieldRow(c, [["Adjuster", tokenMap.ADJR_NAME], ["Appraiser", tokenMap.APPR_NAME]]);
    fieldRow(c, [["Loss State", tokenMap.LOSS_STATE], ["Loss Zip", tokenMap.LOSS_ZIP_CODE]]);

    // ── VEHICLE ──
    hdr(c, "VEHICLE INFORMATION");
    fieldRow(c, [["Year", tokenMap.YEAR], ["Make", tokenMap.MAKE], ["Model", tokenMap.MODEL]]);
    fieldRow(c, [["VIN", tokenMap.VIN], ["Mileage", tokenMap.MILEAGE]]);
    fieldRow(c, [["Engine Size", tokenMap.ENGINE_SIZE], ["Special Features", tokenMap.SPECIAL_FEATURES]]);

    // Body Style
    check(c, 14);
    c.page.drawText("Body Style:", { x:c.M, y:c.y, font:font, size:8, color:c.med });
    c.y -= 11;
    const bodyItems = [
        ["2DR",tokenMap.BODY_2DR==="X"],["4DR",tokenMap.BODY_4DR==="X"],
        ["Conv",tokenMap.BODY_CONVERTIBLE==="X"],["Hatch",tokenMap.BODY_HATCHBACK==="X"],
        ["Pickup",tokenMap.BODY_PICKUP==="X"],["Utility",tokenMap.BODY_UTILITY==="X"],
        ["Van",tokenMap.BODY_VAN==="X"],["Wagon",tokenMap.BODY_WAGON==="X"]
    ];
    chkRow(c, bodyItems, 4);

    // Cylinders
    c.page.drawText("Cylinders:", { x:c.M, y:c.y, font:font, size:8, color:c.med });
    c.y -= 11;
    const cylItems = ["3","4","5","6","8","10","12"].map(n =>
        [n+" Cyl", tokenMap["CYL_"+n]==="X"]);
    chkRow(c, cylItems, 4);

    // Transmission
    c.page.drawText("Transmission:", { x:c.M, y:c.y, font:font, size:8, color:c.med });
    c.y -= 11;
    const transItems = [
        ["Auto",tokenMap.TRANS_AUTO==="X"],["Overdrive",tokenMap.TRANS_OD==="X"],
        ["Pwr O/D",tokenMap.TRANS_PO==="X"],["3-Spd",tokenMap.TRANS_S3==="X"],
        ["4-Spd",tokenMap.TRANS_S4==="X"],["5-Spd",tokenMap.TRANS_S5==="X"],
        ["6-Spd",tokenMap.TRANS_S6==="X"],["4WD/AWD",tokenMap.TRANS_4W==="X"]
    ];
    chkRow(c, transItems, 4);

    // Fuel
    c.page.drawText("Fuel/Engine:", { x:c.M, y:c.y, font:font, size:8, color:c.med });
    c.y -= 11;
    chkRow(c, [["Diesel",tokenMap.DIESEL==="X"],["Turbo",tokenMap.TURBO==="X"]], 4);

    // ── CONDITION RATINGS ──
    check(c, 220);
    hdr(c, "CONDITION RATINGS  (0=Below Avg  1=Normal  2=Above Avg  3=Exceptional)");

    const colW = [130, 30, 30, 30, 30, c.cw-250];
    const drawCondRow = (label, prefix, isHeader) => {
        check(c, 14);
        const f = isHeader ? bold : font;
        const sz = isHeader ? 8 : 8;
        c.page.drawText(isHeader ? label : label, { x:c.M+2, y:c.y, font:f, size:sz, color:c.dk });

        if (isHeader) {
            ["0","1","2","3"].forEach((v,i) => {
                c.page.drawText(v, { x:c.M+130+i*30+10, y:c.y, font:bold, size:8, color:c.med });
            });
            c.page.drawText("Comment", { x:c.M+250+4, y:c.y, font:bold, size:8, color:c.med });
        } else {
            for (let i = 0; i <= 3; i++) {
                chk(c, tokenMap[prefix+"_"+i]==="X", c.M+130+i*30+8, c.y);
            }
            const comment = tokenMap[prefix+"_COMMENT"] || "";
            if (comment) {
                const maxCW = c.cw - 254;
                const trunc = comment.substring(0, Math.floor(maxCW / 4.5));
                c.page.drawText(trunc, { x:c.M+254, y:c.y, font:font, size:7.5, color:c.dk });
            }
        }
        c.y -= 13;
    };

    drawCondRow("Category","",true);
    line(c, c.y+10, c.lt);
    for (const [label, prefix] of COND_ROWS) {
        drawCondRow(label, prefix, false);
    }

    // ── COVERAGE / LOSS ──
    hdr(c, "COVERAGE / LOSS TYPE");
    c.page.drawText("Coverage:", { x:c.M, y:c.y, font:font, size:8, color:c.med });
    c.y -= 11;
    chkRow(c, [
        ["Collision",tokenMap.COVERAGE_COLLISION==="X"],
        ["Comprehensive",tokenMap.COVERAGE_COMPREHENSIVE==="X"],
        ["Liability",tokenMap.COVERAGE_LIABILITY==="X"],
        ["Other",tokenMap.COVERAGE_OTHER==="X"]
    ], 4);

    c.page.drawText("Loss / Ownership:", { x:c.M, y:c.y, font:font, size:8, color:c.med });
    c.y -= 11;
    chkRow(c, [
        ["Theft",tokenMap.LOSS_TYPE_THEFT==="X"],["Other Loss",tokenMap.LOSS_TYPE_OTHER==="X"],
        ["Leased Yes",tokenMap.LEASED_YES==="X"],["Leased No",tokenMap.LEASED_NO==="X"],
        ["3rd Party Yes",tokenMap.THIRD_PARTY_YES==="X"],["3rd Party No",tokenMap.THIRD_PARTY_NO==="X"]
    ], 4);

    // ── OPTIONS ──
    newPage(c);
    c.page.drawText("BCIF — VEHICLE OPTIONS", {
        x:c.M, y:c.y, font:bold, size:12, color:c.blk });
    c.y -= 16;
    line(c, c.y, c.dk);
    c.y -= 12;

    for (const section of OPTION_SECTIONS) {
        check(c, 30);
        c.page.drawText(section.title, { x:c.M, y:c.y, font:bold, size:8.5, color:c.dk });
        c.y -= 12;

        const items = section.codes.map(code => {
            const label = code + " " + (OL[code] || "");
            return [label, tokenMap[code] === "\u2611"];
        });
        chkRow(c, items, 4);
        c.y -= 4;
    }

    // ── REFURBISHMENT ──
    check(c, 60);
    hdr(c, "REFURBISHMENT");
    fieldRow(c, [["Restored Amount", tokenMap.RESTORED_AMOUNT]]);
    fieldRow(c, [["Engine Mileage", tokenMap.REF_ENGINE_MILEAGE], ["Engine Price", tokenMap.REF_ENGINE_PURCHASE_PRICE]]);
    fieldRow(c, [["Trans Mileage", tokenMap.REF_TRANS_MILEAGE], ["Trans Price", tokenMap.REF_TRANS_PURCHASE_PRICE]]);

    c.page.drawText("Paint Type:", { x:c.M, y:c.y, font:font, size:8, color:c.med });
    c.y -= 11;
    chkRow(c, [
        ["Basic",tokenMap.REF_PAINT_BASIC==="X"],
        ["Standard",tokenMap.REF_PAINT_STANDARD==="X"],
        ["Custom",tokenMap.REF_PAINT_CUSTOM==="X"]
    ], 4);

    c.page.drawText("Interior Type:", { x:c.M, y:c.y, font:font, size:8, color:c.med });
    c.y -= 11;
    chkRow(c, [
        ["Vinyl",tokenMap.REF_INTERIOR_VINYL==="X"],
        ["Cloth",tokenMap.REF_INTERIOR_CLOTH==="X"],
        ["Leather",tokenMap.REF_INTERIOR_LEATHER==="X"]
    ], 4);

    // ── ADJUSTMENTS ──
    check(c, 60);
    hdr(c, "ADJUSTMENTS");
    fieldRow(c, [["Pre-Tax Adj 1", tokenMap.PRE_TAX_ADJ1_DESC],
                 ["Add", tokenMap.PRE_TAX_ADJ1_ADD], ["Deduct", tokenMap.PRE_TAX_ADJ1_DEDUCT]]);
    fieldRow(c, [["Pre-Tax Adj 2", tokenMap.PRE_TAX_ADJ2_DESC],
                 ["Add", tokenMap.PRE_TAX_ADJ2_ADD], ["Deduct", tokenMap.PRE_TAX_ADJ2_DEDUCT]]);
    fieldRow(c, [["Post-Tax Adj 1", tokenMap.POST_TAX_ADJ1_DESC],
                 ["Add", tokenMap.POST_TAX_ADJ1_ADD], ["Deduct", tokenMap.POST_TAX_ADJ1_DEDUCT]]);
    fieldRow(c, [["Post-Tax Adj 2", tokenMap.POST_TAX_ADJ2_DESC],
                 ["Add", tokenMap.POST_TAX_ADJ2_ADD], ["Deduct", tokenMap.POST_TAX_ADJ2_DEDUCT]]);

    // ── SUMMARY ──
    check(c, 80);
    hdr(c, "DAMAGE SUMMARY");
    const summary = tokenMap._DAMAGE_SUMMARY || "";
    if (summary) wrap(c, summary, 8.5, 0);

    // ── FOOTER on every page ──
    const totalPages = c.pageNum;
    const pages = doc.getPages();
    const now = new Date().toLocaleDateString("en-US");
    for (let i = 0; i < pages.length; i++) {
        const p = pages[i];
        p.drawText(`Generated by Claim Cipher | ${now} | Page ${i+1} of ${totalPages}`, {
            x:c.M, y:18, font, size:7, color:c.lt
        });
    }

    return await doc.save();
}
