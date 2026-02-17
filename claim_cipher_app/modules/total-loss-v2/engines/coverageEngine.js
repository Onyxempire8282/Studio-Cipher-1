// Maps coverage types into canonical coverage fields
export function normalizeCoverage(type = "") {
    const normalized = type.toUpperCase();

    if (normalized.includes("COLL")) return "COLLISION";
    if (normalized.includes("COMP")) return "COMPREHENSIVE";
    if (normalized.includes("LIAB")) return "LIABILITY";

    return "UNKNOWN";
}
