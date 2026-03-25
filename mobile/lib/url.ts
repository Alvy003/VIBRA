/**
 * Resolves a potentially relative asset URL to an absolute one using the API base URL.
 * If the URL is already absolute (starts with http) or is a data URI, it is returned as-is.
 */
export const resolveAssetUrl = (url: string | null | undefined): string | undefined => {
    if (!url) return undefined;
    
    // If it's already an absolute URL or data URI, return as is
    if (url.startsWith('http') || url.startsWith('data:') || url.startsWith('file:')) {
        return url;
    }
    
    // Get the base API URL from environment
    const baseUrl = process.env.EXPO_PUBLIC_API_URL;
    if (!baseUrl) return url;
    
    // Combine base URL and relative path, ensuring no double slashes
    const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const cleanUrl = url.startsWith('/') ? url : `/${url}`;
    
    return `${cleanBase}${cleanUrl}`;
};
