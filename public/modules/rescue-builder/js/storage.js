// =====================================================
// STORAGE - LocalStorage Management for Rescue Systems
// =====================================================

const STORAGE_KEY = 'rescue_systems';
const DEBUG = true;

/**
 * Load systems from localStorage
 * @returns {Array} Array of systems or empty array if none
 */
export function loadSystemsFromStorage() {
    console.group('[STORAGE] Loading from localStorage');
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        
        if (!stored) {
            console.log('[STORAGE] ✅ Empty - no systems saved yet');
            console.groupEnd();
            return [];
        }

        const systems = JSON.parse(stored);
        
        if (!Array.isArray(systems)) {
            console.error('[STORAGE] ❌ Not an array, resetting');
            localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
            console.groupEnd();
            return [];
        }

        console.log('[STORAGE] ✅ Loaded', systems.length, 'systems');
        console.groupEnd();
        return systems;
    } catch (error) {
        console.error('[STORAGE] ❌ Error loading:', error.message);
        console.groupEnd();
        return [];
    }
}

/**
 * Save a new system to localStorage
 * ALWAYS appends - never overwrites
 * @param {Object} system - System object to save
 * @returns {boolean} Success or failure
 */
export function saveSystemToStorage(system) {
    console.group('[STORAGE] Saving system');
    try {
        // Load current systems
        let systems = loadSystemsFromStorage();
        
        // Check for duplicates
        const exists = systems.some(s => s.systemID === system.systemID);
        if (exists) {
            console.warn('[STORAGE] ⚠️ System already exists, skipping');
            console.groupEnd();
            return true;
        }

        // Append new system
        systems.push({
            ...system,
            savedAt: new Date().toISOString()
        });

        // Save back to storage
        localStorage.setItem(STORAGE_KEY, JSON.stringify(systems));
        
        console.log('[STORAGE] ✅ Saved. Total systems:', systems.length);
        console.groupEnd();
        return true;
    } catch (error) {
        console.error('[STORAGE] ❌ Save error:', error.message);
        console.groupEnd();
        return false;
    }
}

/**
 * Delete system from storage
 * @param {string} systemID - System to delete
 * @returns {boolean} Success or failure
 */
export function deleteSystemFromStorage(systemID) {
    console.group('[STORAGE] Deleting system');
    try {
        let systems = loadSystemsFromStorage();
        systems = systems.filter(s => s.systemID !== systemID);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(systems));
        
        console.log('[STORAGE] ✅ Deleted. Remaining:', systems.length);
        console.groupEnd();
        return true;
    } catch (error) {
        console.error('[STORAGE] ❌ Delete error:', error.message);
        console.groupEnd();
        return false;
    }
}

/**
 * Clear all systems from storage
 * @returns {boolean} Success
 */
export function clearAllSystems() {
    console.group('[STORAGE] Clearing all systems');
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
        console.log('[STORAGE] ✅ Cleared');
        console.groupEnd();
        return true;
    } catch (error) {
        console.error('[STORAGE] ❌ Clear error:', error.message);
        console.groupEnd();
        return false;
    }
}
