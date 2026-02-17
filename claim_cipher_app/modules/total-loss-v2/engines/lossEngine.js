// Determines total loss vs repairable logic based on extracted data
export function evaluateLossType({ estimateTotal = 0, acv = 0, threshold = 0.75 }) {
    if (!acv || !estimateTotal) return { isTotalLoss: false };

    const ratio = estimateTotal / acv;

    return {
        isTotalLoss: ratio >= threshold,
        ratio
    };
}
