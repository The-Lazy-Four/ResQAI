// =====================================================
// API - Custom Rescue System API Integration
// =====================================================

import { saveSystemToStorage, loadSystemsFromStorage } from './storage.js';

const API_BASE_URL = '/api/custom-system';
const API_TIMEOUT = 8000; // 8 second timeout
const DEBUG = true;

/**
 * Get authorization headers
 * @returns {Object} Headers with auth token if available
 */
function getHeaders() {
    const token = localStorage.getItem('auth-token') || localStorage.getItem('user-session');
    return {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
}

/**
 * Create system via API
 * Saves to both API AND localStorage for reliability
 * @param {Object} systemData - System data to create
 * @returns {Promise<Object>} Created system with ID
 */
export async function createSystemAPI(systemData) {
    console.group('[API] Creating system');
    try {
        console.log('[API] POST /create with payload:', systemData);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

        const response = await fetch(API_BASE_URL + '/create', {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(systemData),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const result = await response.json();

        if (!result.systemID && !result.id) {
            throw new Error('No systemID in response');
        }

        const systemID = result.systemID || result.id;
        const createdSystem = {
            systemID,
            userID: result.userID,
            ...systemData,
            source: 'api',
            createdAt: new Date().toISOString()
        };

        // Also save to localStorage for redundancy
        saveSystemToStorage(createdSystem);

        console.log('[API] ✅ System created:', systemID);
        console.groupEnd();
        return createdSystem;

    } catch (error) {
        console.error('[API] ❌ Creation failed:', error.message);
        console.groupEnd();
        throw error;
    }
}

/**
 * Fetch user's systems from API
 * Falls back to localStorage if API fails
 * @returns {Promise<Array>} Array of systems
 */
export async function fetchUserSystemsAPI() {
    console.group('[API] Fetching user systems');
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

        const response = await fetch(API_BASE_URL + '/user/list', {
            method: 'GET',
            headers: getHeaders(),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const result = await response.json();
        let systems = result.systems || [];

        // Map snake_case to camelCase
        systems = systems.map(s => ({
            systemID: s.id || s.systemID,
            userID: s.user_id || s.userID,
            organizationName: s.organization_name || s.organizationName,
            organizationType: s.organization_type || s.organizationType,
            location: s.location,
            contactEmail: s.contact_email || s.contactEmail,
            structure: s.structure_json ? JSON.parse(s.structure_json) : s.structure,
            staff: s.staff_json ? JSON.parse(s.staff_json) : s.staff,
            riskTypes: s.risk_types_json ? JSON.parse(s.risk_types_json) : s.riskTypes,
            status: s.status || 'saved',
            source: 'api',
            createdAt: s.created_at || s.createdAt
        }));

        console.log('[API] ✅ Fetched', systems.length, 'systems');
        console.groupEnd();
        return systems;

    } catch (error) {
        console.warn('[API] ⚠️ Fetch failed, using fallback:', error.message);
        
        // Fallback to localStorage
        const systems = loadSystemsFromStorage();
        console.log('[API] 📦 Using localStorage fallback with', systems.length, 'systems');
        console.groupEnd();
        return systems;
    }
}

/**
 * Delete system from API
 * Also removes from localStorage
 * @param {string} systemID - System to delete
 * @returns {Promise<boolean>} Success
 */
export async function deleteSystemAPI(systemID) {
    console.group('[API] Deleting system:', systemID);
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

        const response = await fetch(`${API_BASE_URL}/${systemID}`, {
            method: 'DELETE',
            headers: getHeaders(),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        // Also remove from localStorage
        const systems = loadSystemsFromStorage();
        const updated = systems.filter(s => s.systemID !== systemID);
        localStorage.setItem('rescue_systems', JSON.stringify(updated));

        console.log('[API] ✅ Deleted');
        console.groupEnd();
        return true;

    } catch (error) {
        console.error('[API] ❌ Delete failed:', error.message);
        console.groupEnd();
        return false;
    }
}
