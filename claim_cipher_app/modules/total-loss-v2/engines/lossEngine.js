// Determines total loss vs repairable based on CCC Point of Impact code.
// POI 15 = Total Loss designation in the CCC estimating platform.
export function evaluateLossType({ pointOfImpactCode }) {
    return pointOfImpactCode === 15 ? 'total_loss' : 'repairable';
}
