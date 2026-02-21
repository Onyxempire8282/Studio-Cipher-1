// Handles conversion of CCC ratings into internal condition matrix
import { cccToInternal } from "../ratingMap.js";

export function mapConditionFromCCC(cccConditionText = "") {
    const normalized = cccConditionText.trim().toUpperCase();

    const rating = cccToInternal[normalized] ?? 1; // default NORMAL

    return {
        // Exterior
        paint:        { rating, comment: "" },
        sheetMetal:   { rating, comment: "" },
        glass:        { rating, comment: "" },
        trim:         { rating, comment: "" },
        // Interior
        seats:        { rating, comment: "" },
        carpet:       { rating, comment: "" },
        dashboard:    { rating, comment: "" },
        headliner:    { rating, comment: "" },
        // Mechanical — tires left unrated for manual entry
        frontTires:   { rating: null, treadDepth: "", comment: "" },
        rearTires:    { rating: null, treadDepth: "", comment: "" },
        engine:       { rating, comment: "" },
        transmission: { rating, comment: "" },
    };
}
