// Maps CCC condition language to internal numeric scale and BCIF language
export const cccToInternal = {
    EXCELLENT: 3,
    GOOD: 2,
    FAIR: 1,
    POOR: 0
};

export const internalToBCIF = {
    3: "EXCEPTIONAL",
    2: "ABOVE_AVERAGE",
    1: "NORMAL",
    0: "BELOW_AVERAGE"
};

export const internalToSummaryText = {
    3: "exceptional condition",
    2: "above average condition",
    1: "condition consistent with age and mileage",
    0: "below average condition"
};
