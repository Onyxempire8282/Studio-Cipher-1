// Legacy TL-V2 controller (superseded by total-loss-studio.js)

import { createEmptyBCIFPayload } from "./bcifPayload.js";
import { mapConditionFromCCC } from "./engines/conditionEngine.js";
import { normalizeOptions } from "./engines/optionsEngine.js";
import { evaluateLossType } from "./engines/lossEngine.js";
import { buildClaimSummary } from "./summaryEngine.js";

let bcifPayload = null;

export async function startTotalLossV2Flow(parsedEstimate) {
    if (!parsedEstimate) {
        return null;
    }

    // 1️⃣ Create Payload
    bcifPayload = createEmptyBCIFPayload();

    // 2️⃣ Inject Claim + Vehicle from parsed estimate
    bcifPayload.claim.carrier       = parsedEstimate.carrierName    || "";
    bcifPayload.claim.claimNumber   = parsedEstimate.claimNumber    || "";
    bcifPayload.claim.policyNumber  = parsedEstimate.policyNumber   || "";
    bcifPayload.claim.lossType      = parsedEstimate.lossType       || "";
    bcifPayload.claim.dateOfLoss    = parsedEstimate.dateOfLoss     || "";
    bcifPayload.claim.lossLocation  = parsedEstimate.inspectionLocation || "";

    bcifPayload.vehicle.year        = parsedEstimate.year           || "";
    bcifPayload.vehicle.make        = parsedEstimate.make           || "";
    bcifPayload.vehicle.model       = parsedEstimate.model          || "";
    bcifPayload.vehicle.vin         = parsedEstimate.vin            || "";
    bcifPayload.vehicle.odometer    = parsedEstimate.mileage        || "";

    // 3️⃣ Condition Engine
    const condition = mapConditionFromCCC(parsedEstimate.conditionRating);
    bcifPayload.condition = {
        ...bcifPayload.condition,
        ...condition
    };

    // 4️⃣ Options Engine
    bcifPayload.options = normalizeOptions(parsedEstimate.options);

    // 5️⃣ Loss Evaluation (POI 15 = total loss)
    const outcome = evaluateLossType({
        pointOfImpactCode: parsedEstimate.pointOfImpactCode
    });
    const isTotalLoss = outcome === 'total_loss';

    bcifPayload.summary.isTotalLoss = isTotalLoss;
    bcifPayload.summary.conclusion = isTotalLoss
        ? "Vehicle is declared a total loss based on estimate threshold."
        : "Vehicle appears repairable based on current estimate data.";

    // 6️⃣ Build Summary Text
    bcifPayload.summary.damageSummary = buildClaimSummary(parsedEstimate, bcifPayload);

    return bcifPayload;
}
