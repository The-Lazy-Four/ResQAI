// =====================================================
// DASHBOARD - System Dashboard Rendering
// =====================================================

import { fetchUserSystemsAPI } from './api.js';
import { deleteSystemAPI } from './api.js';

const DEBUG = true;

/**
 * Load and display all user systems
 * Called when dashboard is shown or refreshed
 * @returns {Promise<void>}
 */
export async function loadAndRenderDashboard() {
    console.group('[DASHBOARD] Loading systems');
    
    try {
        // Fetch systems from API (with localStorage fallback)
        const systems = await fetchUserSystemsAPI();
        
        // Render them
        renderSystemCards(systems);
        
        console.log('[DASHBOARD] ✅ Complete');
        console.groupEnd();
    } catch (error) {
        console.error('[DASHBOARD] ❌ Error:', error.message);
        console.groupEnd();
        showErrorState(error.message);
    }
}

/**
 * Render system cards to the dashboard
 * @param {Array<Object>} systems - Systems to render
 */
export function renderSystemCards(systems) {
    console.group('[RENDER] Creating cards');
    
    const container = document.getElementById('systems-list');
    
    if (!container) {
        console.error('[RENDER] ❌ Container #systems-list not found');
        console.groupEnd();
        return;
    }

    // Clear container
    container.innerHTML = '';
    
    // Validate input
    if (!Array.isArray(systems)) {
        systems = [];
    }

    console.log('[RENDER] Rendering', systems.length, 'system(s)');

    // Empty state
    if (systems.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px;">
                <div style="font-size: 48px; margin-bottom: 20px;">📋</div>
                <h3 style="color: #fff; margin-bottom: 10px;">No Systems Yet</h3>
                <p style="color: #888;">Create your first rescue system to get started</p>
            </div>
        `;
        console.log('[RENDER] ✅ Showed empty state');
        console.groupEnd();
        return;
    }

    // Render each system
    systems.forEach((system, i) => {
        try {
            const card = createSystemCard(system);
            container.appendChild(card);
            console.log('[RENDER] ✅ Card', i + 1, 'created');
        } catch (error) {
            console.error('[RENDER] ❌ Card', i + 1, 'error:', error.message);
        }
    });

    console.log('[RENDER] ✅ All cards rendered');
    console.groupEnd();
}

/**
 * Create a single system card element
 * @param {Object} system - System data
 * @returns {HTMLElement} Card element
 */
function createSystemCard(system) {
    const card = document.createElement('div');
    card.className = 'system-card';

    const systemID = system.systemID || system.id;
    const date = new Date(system.createdAt).toLocaleDateString();
    
    // Status indicator
    let statusDot = '⏳';
    if (system.source === 'api' || system.status === 'saved') {
        statusDot = '✅';
    } else if (system.status === 'local') {
        statusDot = '💾';
    }

    card.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px;">
            <span style="background: rgba(255,255,255,0.1); color: #fff; padding: 4px 12px; border-radius: 8px; font-size: 12px; text-transform: capitalize;">
                ${system.organizationType || 'Unknown'}
            </span>
            <span title="${statusDot === '✅' ? 'Saved to API' : 'Local only'}" style="font-size: 18px;">
                ${statusDot}
            </span>
        </div>
        
        <h3 style="color: #fff; margin: 0 0 12px 0; font-size: 18px; font-weight: 600;">
            ${system.organizationName || 'Unnamed System'}
        </h3>
        
        <p style="color: #888; margin: 8px 0; font-size: 14px;">
            📍 ${system.location || 'No location'}
        </p>
        
        <p style="color: #666; margin: 8px 0 16px 0; font-size: 12px;">
            Created: ${date}
        </p>
        
        <div style="display: flex; gap: 8px;">
            <button 
                class="btn-small btn-primary" 
                onclick="window.openSystemPanel('${systemID}')"
                style="flex: 1; padding: 8px 12px; border: none; border-radius: 6px; background: #3b82f6; color: white; cursor: pointer; font-weight: 500;">
                Open
            </button>
            <button 
                class="btn-small btn-danger" 
                onclick="window.deleteSystemPrompt('${systemID}')"
                style="flex: 1; padding: 8px 12px; border: none; border-radius: 6px; background: #ef4444; color: white; cursor: pointer; font-weight: 500;">
                Delete
            </button>
        </div>
    `;

    return card;
}

/**
 * Show error state on dashboard
 * @param {string} message - Error message
 */
function showErrorState(message) {
    const container = document.getElementById('systems-list');
    if (!container) return;

    container.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px;">
            <div style="font-size: 48px; margin-bottom: 20px;">⚠️</div>
            <h3 style="color: #fff; margin-bottom: 10px;">Error Loading Systems</h3>
            <p style="color: #888; margin-bottom: 20px;">${message}</p>
            <button 
                onclick="location.reload()"
                style="padding: 10px 20px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer;">
                Retry
            </button>
        </div>
    `;
}

/**
 * Delete system with confirmation
 * @param {string} systemID - System to delete
 */
export async function deleteSystemWithConfirm(systemID) {
    if (!confirm('Delete this system? This cannot be undone.')) {
        return;
    }

    console.log('[DASHBOARD] Deleting system:', systemID);
    
    try {
        const success = await deleteSystemAPI(systemID);
        if (success) {
            // Reload dashboard
            await loadAndRenderDashboard();
            showMessage('System deleted', 'success');
        }
    } catch (error) {
        console.error('[DASHBOARD] Delete error:', error);
        showMessage('Failed to delete system', 'error');
    }
}

/**
 * Show message toast
 * @param {string} message - Message text
 * @param {string} type - 'success', 'error', 'info'
 */
function showMessage(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 12px 20px;
        background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
        color: white;
        border-radius: 6px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        z-index: 10000;
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}
