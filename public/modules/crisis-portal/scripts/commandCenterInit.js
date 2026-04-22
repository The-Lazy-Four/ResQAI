/**
 * ResQAI Command Center - Page Initialization
 * Handles SOS buttons and other command center specific features
 */

import AIService from '/modules/crisis-portal/scripts/aiService.js';
import { CrisisState, saveStateToStorage } from '/modules/crisis-portal/scripts/core.js';
import SOSModule from '/modules/crisis-portal/scripts/sos.js';

/**
 * Initialize command center page
 */
export async function initCommandCenter() {
    console.log('📊 Initializing Command Center...');

    // Initialize AI service first
    await AIService.init();
    if (!AIService.apiConnected) {
        window.showNotification('⚠️ Running in Simulation Mode (API unavailable)', 'warning');
    }

    // Initialize SOS grid buttons
    initializeSOSButtons();

    // Initialize sidebar SOS button
    initializeSidebarSOS();

    // Initialize center SOS button
    initializeCenterSOS();

    console.log('✅ Command Center Ready');
}

/**
 * Initialize 8 SOS grid buttons
 */
function initializeSOSButtons() {
    const sosConfig = [
        { icon: 'fire_truck', type: 'fire', label: 'Fire' },
        { icon: 'emergency', type: 'medical', label: 'Medical' },
        { icon: 'female', type: 'women-safety', label: 'Women Safety' },
        { icon: 'child_care', type: 'child-safety', label: 'Child Safety' },
        { icon: 'tsunami', type: 'earthquake', label: 'Earthquake' },
        { icon: 'water_drop', type: 'flood', label: 'Flood' },
        { icon: 'policy', type: 'theft', label: 'Theft' },
        { icon: 'more_horiz', type: 'custom', label: 'Custom' }
    ];

    sosConfig.forEach(config => {
        const iconElement = document.querySelector(`span.material-symbols-outlined[data-icon="${config.icon}"]`);
        if (iconElement) {
            const button = iconElement.closest('button');
            if (button) {
                button.addEventListener('click', async (e) => {
                    e.preventDefault();
                    await triggerSOS(config.type, config.label);
                });
            }
        }
    });

    console.log('✓ SOS Grid Buttons Initialized');
}

/**
 * Initialize sidebar SOS button
 */
function initializeSidebarSOS() {
    const sidebarButton = document.querySelector('button.w-full.py-4.bg-primary-container');
    if (sidebarButton) {
        sidebarButton.addEventListener('click', async (e) => {
            e.preventDefault();
            await triggerSOS('center-trigger', 'Emergency SOS');
        });
    }
}

/**
 * Initialize center SOS button (large)
 */
function initializeCenterSOS() {
    const centerButton = document.querySelector('button.group.relative.w-full.h-48');
    if (centerButton) {
        centerButton.addEventListener('click', async (e) => {
            e.preventDefault();
            await triggerSOS('center-trigger', 'Emergency SOS');
        });
    }
}

/**
 * Trigger SOS with AI integration
 */
async function triggerSOS(sosType, label) {
    try {
        console.log(`🚨 SOS Triggered: ${sosType}`);

        // Get AI guidance for this SOS type
        const guidance = await AIService.getEmergencyGuidance(sosType);

        // Show guidance modal
        showSOSGuidanceModal(guidance);

        // Create incident record
        const incident = {
            id: Math.floor(Math.random() * 100000),
            type: sosType,
            title: `${label} Emergency - ${new Date().toLocaleTimeString()}`,
            status: 'ACTIVE',
            date: new Date().toISOString().split('T')[0],
            duration: '0m',
            location: CrisisState.userLocation,
            timestamp: new Date()
        };

        // Save to history
        CrisisState.incidentHistory.unshift(incident);
        saveStateToStorage();

        // Trigger dispatch
        await triggerDispatch(sosType, incident);

        window.showNotification(`🚨 ${label} - Emergency services dispatched`, 'calling');
    } catch (err) {
        console.error('❌ SOS Error:', err);
        window.showNotification('⚠️ SOS failed - Please try again', 'error');
    }
}

/**
 * Show SOS guidance modal
 */
function showSOSGuidanceModal(guidance) {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50';
    modal.innerHTML = `
    <div class="bg-surface-container-high border-2 border-primary-container rounded-3xl p-8 max-w-2xl max-h-96 overflow-y-auto">
      <h2 class="text-2xl font-headline font-black text-on-background mb-4">🚨 EMERGENCY RESPONSE GUIDE</h2>
      <p class="text-sm text-on-surface-variant whitespace-pre-line leading-relaxed mb-6">${guidance.message}</p>
      <button onclick="this.closest('.fixed').remove()" class="bg-primary-container text-on-primary-container px-8 py-3 rounded-lg font-headline font-bold">
        ACKNOWLEDGE & PROCEED
      </button>
    </div>
  `;
    document.body.appendChild(modal);

    // Auto-close after 10 seconds
    setTimeout(() => {
        modal.remove();
    }, 10000);
}

/**
 * Trigger dispatch (API or simulation)
 */
async function triggerDispatch(sosType, incident) {
    try {
        if (AIService.apiConnected) {
            const response = await fetch('/api/emergency', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: sosType,
                    location: CrisisState.userLocation,
                    incidentId: incident.id,
                    timestamp: new Date()
                })
            });

            if (response.ok) {
                const data = await response.json();
                console.log('✓ Dispatch confirmed via API');
                setTimeout(() => {
                    window.showNotification(`✓ Dispatch Confirmed. ETA: ${data.eta || 5} minutes`, 'success');
                }, 1500);
                return;
            }
        }
    } catch (err) {
        console.warn('⚠️ Dispatch API failed:', err.message);
    }

    // Fallback: Show simulation notification
    setTimeout(() => {
        window.showNotification('⚠️ Running in Simulation Mode - Emergency recorded locally', 'warning');
    }, 1500);
}

/**
 * Auto-init when DOM is ready
 */
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCommandCenter);
} else {
    initCommandCenter();
}

export default { initCommandCenter };
