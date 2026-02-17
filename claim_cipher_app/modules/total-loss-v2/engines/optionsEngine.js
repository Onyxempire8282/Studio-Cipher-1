// Converts CCC option array into internal canonical options array
export function normalizeOptions(cccOptions = []) {
    if (!Array.isArray(cccOptions)) return [];

    return cccOptions.map(option =>
        option
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, "_")
            .replace(/_{2,}/g, "_")
            .replace(/^_|_$/g, "")
    );
}
