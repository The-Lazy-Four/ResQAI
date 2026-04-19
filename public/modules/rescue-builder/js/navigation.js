// =====================================================
// NAVIGATION - Screen and Modal Management
// =====================================================

import { loadAndRenderDashboard } from './dashboard.js';

const DEBUG = true;

/**
 * Show a specific screen by ID
 * @param {string} screenID - Element ID of screen to show
 */
export function showScreen(screenID) {
    console.log('[NAV] Showing screen:', screenID);

    // Hide all screens
    document.querySelectorAll('.rescue-screen').forEach(screen => {
        screen.classList.remove('active');
    });

    // Show target screen
    const target = document.getElementById(screenID);
    if (target) {
        target.classList.add('active');
        console.log('[NAV] ✅ Screen visible:', screenID);
    } else {
        console.error('[NAV] ❌ Screen not found:', screenID);
    }
}

/**
 * Show systems dashboard with proper load order
 * 1. Show screen
 * 2. Load systems from API/localStorage
 * 3. Render cards
 */
export async function showSystemsDashboard() {
    console.group('[NAV] Showing systems dashboard');
    
    try {
        // First show the screen
        showScreen('screen-systems-dashboard');
        
        // Then load and render systems
        await loadAndRenderDashboard();
        
        console.log('[NAV] ✅ Dashboard complete');
        console.groupEnd();
    } catch (error) {
        console.error('[NAV] ❌ Dashboard error:', error);
        console.groupEnd();
    }
}

/**
 * Show toast notification
 * @param {string} message - Message text
 * @param {string} type - 'success', 'error', 'warning', 'info'
 */
export function showToast(message, type = 'info') {
    const container = document.getElementById('toast-wrap') || createToastContainer();
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = message;
    toast.style.cssText = `
        padding: 12px 16px;
        margin-bottom: 8px;
        border-radius: 6px;
        background: ${getToastColor(type)};
        color: white;
        font-size: 14px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        animation: slideDown 0.3s ease;
    `;
    
    container.appendChild(toast);
    
    // Auto-remove after 4 seconds
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

/**
 * Get color for toast type
 * @param {string} type - Toast type
 * @returns {string} CSS color
 */
function getToastColor(type) {
    const colors = {
        success: '#10b981',
        error: '#ef4444',
        warning: '#f59e0b',
        info: '#3b82f6'
    };
    return colors[type] || colors.info;
}

/**
 * Create toast container if it doesn't exist
 * @returns {HTMLElement} Container element
 */
function createToastContainer() {
    let container = document.getElementById('toast-wrap');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-wrap';
        container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            max-width: 400px;
        `;
        document.body.appendChild(container);
    }
    return container;
}

/**
 * Confirm dialog
 * @param {string} message - Message text
 * @returns {Promise<boolean>} User choice
 */
export function confirm(message) {
    return new Promise(resolve => {
        const dialog = document.createElement('div');
        dialog.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10001;
        `;

        dialog.innerHTML = `
            <div style="background: #1a1a2e; padding: 24px; border-radius: 8px; max-width: 400px; text-align: center;">
                <h3 style="color: #fff; margin-bottom: 16px; font-size: 18px;">${message}</h3>
                <div style="display: flex; gap: 12px; justify-content: center;">
                    <button 
                        onclick="this.parentElement.parentElement.parentElement.remove()"
                        style="padding: 8px 16px; background: #666; color: white; border: none; border-radius: 6px; cursor: pointer;">
                        Cancel
                    </button>
                    <button 
                        onclick="this.parentElement.parentElement.parentElement.remove()"
                        style="padding: 8px 16px; background: #ef4444; color: white; border: none; border-radius: 6px; cursor: pointer;">
                        Delete
                    </button>
                </div>
            </div>
        `;

        const confirmBtn = dialog.querySelector('button:nth-child(2)');
        const cancelBtn = dialog.querySelector('button:nth-child(1)');

        confirmBtn.onclick = () => {
            dialog.remove();
            resolve(true);
        };

        cancelBtn.onclick = () => {
            dialog.remove();
            resolve(false);
        };

        document.body.appendChild(dialog);
    });
}
