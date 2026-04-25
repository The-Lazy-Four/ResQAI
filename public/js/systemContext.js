/**
 * systemContext.js
 * 
 * Frontend helper to get the current system context.
 * Extracts system_id from URL params, localStorage, or URL path.
 * All API calls in admin/user panels should use getSystemId().
 */

// Returns the active system ID from multiple sources
export function getSystemId() {
    // 1. Check URL query param: ?systemID=xxx
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get('systemID') || params.get('system_id');
    if (fromUrl) {
        localStorage.setItem('active_system_id', fromUrl);
        return fromUrl;
    }

    // 2. Check localStorage (set by system.html role router)
    const stored = localStorage.getItem('active_system_id');
    if (stored) return stored;

    return null;
}

// Returns the human-readable system code (e.g. RESQ-4821)
export function getSystemCode() {
    return localStorage.getItem('active_system_code') || null;
}

// Clear system context (when user exits)
export function clearSystemContext() {
    localStorage.removeItem('active_system_id');
    localStorage.removeItem('active_system_code');
}
