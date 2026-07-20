export const FEATURES = {
    LOCAL_LIBRARY: process.env.ENABLE_LOCAL_LIBRARY === "true",
};

export function getPlayableMatch(match = {}) {
    if (!FEATURES.LOCAL_LIBRARY) {
        return {
            ...match,
            isExternal: true,
        };
    }
    return match;
}
