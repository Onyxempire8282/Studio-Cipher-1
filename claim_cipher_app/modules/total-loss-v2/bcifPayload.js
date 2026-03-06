// Factory for creating a clean BCIF payload object (internal canonical structure)
export function createEmptyBCIFPayload() {
    return {
        meta: {
            createdAt: new Date().toISOString(),
            source: null
        },

        claim: {
            carrier: "",
            writer: "",
            adjuster: "",
            claimNumber: "",
            policyNumber: "",
            lossType: "",
            coverage: "",
            dateOfLoss: "",
            dateOfInspection: "",
            lossLocation: ""
        },

        vehicle: {
            year: "",
            make: "",
            model: "",
            vin: "",
            odometer: "",
            bodyStyle: "",
            engine: ""
        },

        condition: {
            // Exterior
            paint:        { rating: 2, comment: "" },
            sheetMetal:   { rating: 2, comment: "" },
            glass:        { rating: 2, comment: "" },
            trim:         { rating: 2, comment: "" },
            // Interior
            seats:        { rating: 2, comment: "" },
            carpet:       { rating: 2, comment: "" },
            dashboard:    { rating: 2, comment: "" },
            headliner:    { rating: 2, comment: "" },
            // Mechanical
            frontTires:   { rating: null, treadDepth: "", comment: "" },
            rearTires:    { rating: null, treadDepth: "", comment: "" },
            engine:       { rating: 2, comment: "" },
            transmission: { rating: 2, comment: "" },
        },

        priorDamage: { exists: false, text: "" },

        options: [],

        damageAssessment: {
            structural: "",
            bodyPanels: "",
            restraints: "",
            interior: ""
        },

        summary: {
            damageSummary: "",
            conclusion: "",
            additionalNotes: "",
            isTotalLoss: false,
            acv: 0,
            deductible: 0
        }
    };
}
