/**
 * ResQAI Crisis Portal - Deployment Page Initialization
 * Handles unit assignment and deployment tracking
 */

import { CrisisState, setState, getState } from '/modules/crisis-portal/scripts/core.js';
import AIService from '/modules/crisis-portal/scripts/aiService.js';

/**
 * Initialize Deployment page functionality
 */
export async function initDeployment() {
    try {
        console.log('🚑 Initializing Deployment...');

        // Initialize AIService if not already done
        if (!window.AIService) {
            await AIService.init();
            window.AIService = AIService;
        }

        // Load deployment units
        updateDeploymentStatus();

        // Refresh deployment status every 10 seconds
        setInterval(updateDeploymentStatus, 10000);

        console.log('✓ Deployment page initialized');
        window.showNotification('🚑 Deployment tracking active', 'info');
    } catch (err) {
        console.error('❌ Deployment init error:', err);
        window.showNotification('⚠️ Deployment encountered errors', 'error');
    }
}

/**
 * Update deployment status display
 */
function updateDeploymentStatus() {
    try {
        const units = CrisisState.units || [];
        const deploymentList = document.querySelector('[data-component="deployment-list"]');

        if (!deploymentList) return;

        deploymentList.innerHTML = '';

        if (units.length === 0) {
            deploymentList.innerHTML = '<p class="text-slate-400 text-center py-8">No units currently deployed</p>';
            return;
        }

        units.forEach(unit => {
            const unitElement = createUnitElement(unit);
            deploymentList.appendChild(unitElement);
        });
    } catch (err) {
        console.error('❌ Deployment status update error:', err);
    }
}

/**
 * Create unit display element
 */
function createUnitElement(unit) {
    const unitDiv = document.createElement('div');
    unitDiv.className = 'bg-slate-800/50 border border-slate-700 rounded-lg p-4 mb-4';

    const statusColor = getStatusColor(unit.status);
    const typeIcon = getUnitIcon(unit.type);

    unitDiv.innerHTML = `
    <div class="flex items-start justify-between mb-4">
      <div class="flex items-center gap-3">
        <span class="material-symbols-outlined text-2xl text-cyan-400">${typeIcon}</span>
        <div>
          <h3 class="font-headline font-bold text-white">${unit.name}</h3>
          <p class="text-slate-400 text-sm">${unit.type}</p>
        </div>
      </div>
      <span class="px-3 py-1 rounded text-xs font-bold ${statusColor}">
        ${unit.status}
      </span>
    </div>
    
    <div class="grid grid-cols-2 gap-4 text-sm mb-4">
      <div>
        <p class="text-slate-500">Location</p>
        <p class="text-white font-bold">${unit.location}</p>
      </div>
      <div>
        <p class="text-slate-500">ETA</p>
        <p class="text-white font-bold">${unit.eta || '5-10 min'}</p>
      </div>
    </div>
    
    <div class="w-full bg-slate-700/50 rounded-full h-2">
      <div class="bg-cyan-500 h-2 rounded-full transition-all" style="width: ${unit.progress || 0}%"></div>
    </div>
  `;

    return unitDiv;
}

/**
 * Helper: Get status color
 */
function getStatusColor(status) {
    const colors = {
        'En Route': 'bg-yellow-500/20 text-yellow-300',
        'On Scene': 'bg-cyan-500/20 text-cyan-300',
        'Returning': 'bg-blue-500/20 text-blue-300',
        'Available': 'bg-green-500/20 text-green-300',
        'default': 'bg-slate-700 text-slate-300'
    };
    return colors[status] || colors['default'];
}

/**
 * Helper: Get unit type icon
 */
function getUnitIcon(type) {
    const icons = {
        'ambulance': 'emergency',
        'fire': 'local_fire_department',
        'police': 'local_police',
        'rescue': 'paraglide',
        'default': 'directions_car'
    };
    return icons[type] || icons['default'];
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDeployment);
} else {
    initDeployment();
}

export default { initDeployment };
