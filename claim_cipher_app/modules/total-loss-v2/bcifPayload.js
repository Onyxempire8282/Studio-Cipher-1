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
            overall: 1,
            exterior: 1,
            interior: 1,
            mechanical: 1,
            tires: {
                frontLeft: "",
                frontRight: "",
                rearLeft: "",
                rearRight: "",
                avgFront: "",
                avgRear: ""
            },
            comments: {
                exterior: "",
                interior: "",
                mechanical: ""
            }
        },

        options: [],

        summary: {
            damageSummary: "",
            conclusion: "",
            additionalNotes: ""
        }
    };
}
