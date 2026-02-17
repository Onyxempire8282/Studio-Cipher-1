// Handles conversion of CCC ratings into internal condition matrix
import { cccToInternal } from "../ratingMap.js";

export function mapConditionFromCCC(cccConditionText = "") {
    const normalized = cccConditionText.trim().toUpperCase();

    const rating = cccToInternal[normalized] ?? 1; // default NORMAL

    return {
        overall: rating,
        exterior: rating,
        interior: rating,
        mechanical: rating
    };
}
