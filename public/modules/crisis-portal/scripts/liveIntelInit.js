/**
 * ResQAI Crisis Portal - Live Intel Page Initialization
 * Handles alert interactions and real-time alert fetching
 */

import { CrisisState, setState, getState } from '/modules/crisis-portal/scripts/core.js';
import AIService from '/modules/crisis-portal/scripts/aiService.js';

/**
 * Initialize Live Intel page functionality
 */
export async function initLiveIntel() {
    try {
        console.log('🔍 Initializing Live Intel...');

        // Initialize AIService if not already done
        if (!window.AIService) {
            await AIService.init();
            window.AIService = AIService;
        }

        // Start fetching live alerts every 30 seconds
        initLiveAlertFetching();

        // Attach alert click handlers
        attachAlertHandlers();

        // Load initial alerts
        await refreshAlerts();

        console.log('✓ Live Intel initialized');
        window.showNotification('📊 Live Intel ready', 'info');
    } catch (err) {
        console.error('❌ Live Intel init error:', err);
        window.showNotification('⚠️ Live Intel encountered errors', 'error');
    }
}

/**
 * Start periodic alert fetching
 */
function initLiveAlertFetching() {
    // Fetch every 30 seconds
    setInterval(async () => {
        await refreshAlerts();
    }, 30000);
}

/**
 * Refresh alerts from API or simulation
 */
async function refreshAlerts() {
    try {
        // Fetch live alerts from core system
        // (core.js already handles this with CrisisState.alerts)
        const alerts = CrisisState.alerts || [];

        // Update alert list display
        updateAlertsList(alerts);
    } catch (err) {
        console.error('❌ Alert refresh error:', err);
    }
}

/**
 * Update alerts list in the UI
 */
function updateAlertsList(alerts) {
    const alertsList = document.querySelector('[data-component="alerts-list"]');
    if (!alertsList) return;

    // Clear existing alerts
    alertsList.innerHTML = '';

    if (alerts.length === 0) {
        alertsList.innerHTML = '<p class="text-slate-400 text-center py-8">No active alerts</p>';
        return;
    }

    // Create alert items
    alerts.forEach(alert => {
        const alertItem = createAlertElement(alert);
        alertsList.appendChild(alertItem);
    });
}

/**
 * Create alert element for display
 */
function createAlertElement(alert) {
    const alertDiv = document.createElement('div');
    alertDiv.className = 'bg-slate-800/50 border border-slate-700 rounded-lg p-4 hover:bg-slate-700/50 cursor-pointer transition';
    alertDiv.setAttribute('data-alert-id', alert.id);

    const icon = getAlertIcon(alert.type);
    const color = getAlertColor(alert.type);

    const timeAgo = getTimeAgo(alert.timestamp);

    alertDiv.innerHTML = `
    <div class="flex items-start gap-4">
      <span class="material-symbols-outlined text-xl ${color}">${icon}</span>
      <div class="flex-1 min-w-0">
        <h3 class="font-headline font-bold text-white mb-1">${alert.title}</h3>
        <p class="text-slate-400 text-sm mb-2">${alert.location}</p>
        <p class="text-slate-300 text-sm mb-3">${alert.description}</p>
        <div class="flex items-center justify-between">
          <span class="text-slate-500 text-xs">${timeAgo}</span>
          <button class="text-xs px-3 py-1 bg-cyan-500/20 text-cyan-300 rounded hover:bg-cyan-500/30 transition get-details-btn">
            Get Details
          </button>
        </div>
      </div>
    </div>
  `;

    // Attach click handler
    const detailsBtn = alertDiv.querySelector('.get-details-btn');
    if (detailsBtn) {
        detailsBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            showAlertDetails(alert);
        });
    }

    return alertDiv;
}

/**
 * Show detailed info about an alert
 */
async function showAlertDetails(alert) {
    try {
        // Get AI explanation of the alert
        const explanation = AIService.explainAlert(alert);

        // Create modal
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50';

        modal.innerHTML = `
      <div class="bg-slate-800 border border-slate-700 rounded-lg p-8 max-w-2xl w-full mx-4 max-h-[80vh] overflow-auto">
        <div class="flex items-center gap-4 mb-6">
          <span class="material-symbols-outlined text-4xl ${getAlertColor(alert.type)}">${getAlertIcon(alert.type)}</span>
          <div>
            <h2 class="text-2xl font-bold text-white">${alert.title}</h2>
            <p class="text-slate-400 mt-1">${alert.location}</p>
          </div>
        </div>
        
        <div class="space-y-4 mb-6">
          <div>
            <h3 class="font-headline font-bold text-slate-300 mb-2">Alert Details</h3>
            <p class="text-slate-300">${alert.description}</p>
          </div>
          
          <div>
            <h3 class="font-headline font-bold text-slate-300 mb-2">AI Analysis</h3>
            <p class="text-slate-300">${explanation}</p>
          </div>
          
          <div class="grid grid-cols-2 gap-4">
            <div>
              <p class="text-slate-500 text-sm">Severity</p>
              <p class="text-white font-bold">${alert.severity || 'High'}</p>
            </div>
            <div>
              <p class="text-slate-500 text-sm">Status</p>
              <p class="text-white font-bold">${alert.status || 'Active'}</p>
            </div>
          </div>
        </div>
        
        <button class="w-full px-4 py-2 bg-cyan-500/20 text-cyan-300 rounded hover:bg-cyan-500/30 transition close-btn">
          Close
        </button>
      </div>
    `;

        document.body.appendChild(modal);

        // Attach close handler
        const closeBtn = modal.querySelector('.close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                modal.remove();
            });
        }

        // Close on background click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    } catch (err) {
        console.error('❌ Alert details error:', err);
        window.showNotification('⚠️ Could not load alert details', 'error');
    }
}

/**
 * Attach event listeners to existing alert elements
 */
function attachAlertHandlers() {
    // Find any hardcoded alerts in the HTML
    const alertElements = document.querySelectorAll('[data-alert-type]');

    alertElements.forEach(element => {
        const alertType = element.getAttribute('data-alert-type');
        const alertBtn = element.querySelector('button');

        if (alertBtn) {
            alertBtn.addEventListener('click', async (e) => {
                e.preventDefault();

                // Create mock alert object for display
                const mockAlert = {
                    id: Math.random().toString(36).substr(2, 9),
                    type: alertType,
                    title: element.querySelector('h3')?.textContent || 'Alert',
                    location: element.querySelector('.text-slate-400')?.textContent || 'Unknown',
                    description: element.querySelector('p')?.textContent || 'No description',
                    timestamp: new Date(),
                    severity: 'High',
                    status: 'Active'
                };

                await showAlertDetails(mockAlert);
            });
        }
    });
}

/**
 * Helper: Get icon for alert type
 */
function getAlertIcon(type) {
    const icons = {
        'fire': 'local_fire_department',
        'medical': 'emergency',
        'accident': 'car_crash',
        'flood': 'water_damage',
        'earthquake': 'vibration',
        'default': 'warning'
    };
    return icons[type] || icons['default'];
}

/**
 * Helper: Get color for alert type
 */
function getAlertColor(type) {
    const colors = {
        'fire': 'text-orange-400',
        'medical': 'text-red-400',
        'accident': 'text-yellow-400',
        'flood': 'text-blue-400',
        'earthquake': 'text-purple-400',
        'default': 'text-slate-400'
    };
    return colors[type] || colors['default'];
}

/**
 * Helper: Get time ago string
 */
function getTimeAgo(timestamp) {
    if (!timestamp) return 'Just now';

    const now = new Date();
    const time = new Date(timestamp);
    const seconds = Math.floor((now - time) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLiveIntel);
} else {
    initLiveIntel();
}

export default { initLiveIntel };
