/**
 * ResQAI Crisis Portal - Main Entry Point
 * Initializes all modules and systems
 */

import './core.js';
import './navigation.js';
import './sos.js';
import './aiService.js';
import './voice.js';
import './alerts.js';
import './map.js';

import { initializeCrisisPortal } from './core.js';
import NavigationModule from './navigation.js';
import SOSModule from './sos.js';
import AIService from './aiService.js';
import VoiceModule from './voice.js';
import AlertsModule from './alerts.js';
import MapModule from './map.js';
import { initCommandCenter } from './commandCenterInit.js';
import { initLiveIntel } from './liveIntelInit.js';
import { initDeployment } from './deploymentInit.js';
import { initSignalHub } from './signalHubInit.js';
import { initArchive } from './archiveInit.js';
import AIModule from './ai.js';

/**
 * Utility: Debounce function for performance
 */
window.debounce = function (func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

/**
 * Global notification system with error handling
 */
window.showNotification = function (message, type = 'info') {
    try {
        const notificationDiv = document.createElement('div');

        const typeStyles = {
            'info': 'bg-blue-500/20 border-blue-500/50 text-blue-300',
            'success': 'bg-green-500/20 border-green-500/50 text-green-300',
            'error': 'bg-red-500/20 border-red-500/50 text-red-300',
            'warning': 'bg-yellow-500/20 border-yellow-500/50 text-yellow-300',
            'calling': 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300'
        };

        const style = typeStyles[type] || typeStyles['info'];

        notificationDiv.className = `fixed top-24 right-8 border rounded-lg p-4 z-40 animate-slideDown ${style}`;
        notificationDiv.innerHTML = `<p class="font-headline text-sm font-bold">${message}</p>`;

        document.body.appendChild(notificationDiv);

        setTimeout(() => {
            notificationDiv.remove();
        }, 3000);
    } catch (err) {
        console.error('❌ Notification error:', err);
    }
};

/**
 * Global utility functions
 */
window.dialNumber = function (number) {
    const contact = {
        '112': 'Universal Emergency',
        '101': 'Fire Department',
        '108': 'Ambulance',
        '100': 'Police'
    };

    const contactName = contact[number] || 'Unknown Service';
    window.showNotification(`📞 Calling ${number} (${contactName})`, 'calling');
    console.log(`📞 Dialing: ${number} - ${contactName}`);

    setTimeout(() => {
        window.showNotification(`[SIMULATION] Connected to ${contactName}`, 'warning');
    }, 2000);
};

window.broadcastLocation = function () {
    window.showNotification(`📍 Broadcasting location: Sector 7G`, 'info');
    setTimeout(() => {
        window.showNotification('[SIMULATION] Location received by dispatch center', 'warning');
    }, 1500);
};

/**
 * Initialize on DOM ready
 */
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const page = window.location.pathname;
        console.log('Page loaded:', page);
        console.log('🚨 ResQAI Crisis Portal Starting...');

        // Initialize AI Service first (checks API availability)
        await AIService.init();
        if (!AIService.apiConnected) {
            console.warn('⚠️ Running in Simulation Mode');
        } else {
            console.log('AI connected');
        }

        // Initialize core system
        initializeCrisisPortal();

        // Initialize all modules with error handling
        try {
            SOSModule.init();
            console.log('✓ SOS Module loaded');
        } catch (err) {
            console.error('❌ SOS Module failed:', err);
        }

        try {
            VoiceModule.init();
            console.log('✓ Voice Module loaded');
        } catch (err) {
            console.error('❌ Voice Module failed:', err);
        }

        try {
            AIModule.init();
            console.log('✓ AI Module loaded');
        } catch (err) {
            console.error('❌ AI Module failed:', err);
        }

        try {
            NavigationModule.init();
            console.log('✓ Navigation Module loaded');
            console.log('Navigation working');
        } catch (err) {
            console.error('❌ Navigation Module failed:', err);
        }

        try {
            AlertsModule.init();
            console.log('✓ Alerts Module loaded');
        } catch (err) {
            console.error('❌ Alerts Module failed:', err);
        }

        try {
            MapModule.init();
            console.log('✓ Map Module loaded');
        } catch (err) {
            console.error('❌ Map Module failed:', err);
        }

        initializePage(page);
        attachGlobalActionDelegation();

        // Make AIService globally available
        window.AIService = AIService;

        console.log('✅ ResQAI Crisis Portal Ready');
        const mode = AIService.apiConnected ? 'API Mode' : 'Simulation Mode';
        window.showNotification(`Crisis Portal Ready (${mode})`, 'info');
    } catch (err) {
        console.error('❌ Critical initialization error:', err);
        window.showNotification('⚠️ Crisis Portal encountered errors', 'error');
    }
});

/**
 * Attach quick dial button listeners
 */
function attachQuickDialButtons() {
    const dialButtons = document.querySelectorAll('button.flex-1.bg-white\\/5.border.border-white\\/5.p-4');

    dialButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            const numberSpan = button.querySelector('span.font-headline.font-black.text-xl');
            if (numberSpan) {
                const number = numberSpan.textContent.trim();
                window.dialNumber(number);
            }
        });
    });
}

/**
 * Attach broadcast location button
 */
function attachBroadcastButton() {
    const broadcastButton = document.querySelector('button.flex.items-center.gap-2.px-6.py-2.bg-secondary-container');

    if (broadcastButton) {
        broadcastButton.addEventListener('click', () => {
            window.broadcastLocation();
        });
    }
}

/**
 * Central action delegation for data-action buttons
 */
function attachGlobalActionDelegation() {
    document.addEventListener('click', (e) => {
        const target = e.target.closest('[data-action]');
        const action = target?.dataset.action;
        if (!action) return;

        handleAction(action, target);
    });
}

function handleAction(action, element) {
    if (action === 'sos-main') {
        // Main large SOS button - trigger full emergency
        SOSModule.trigger?.('center-trigger');
        return;
    }

    if (action.startsWith('sos-')) {
        const sosType = action.replace('sos-', '');
        SOSModule.trigger?.(sosType);
        return;
    }

    if (action.startsWith('dial-')) {
        const number = action.replace('dial-', '');
        window.dialNumber(number);
        return;
    }

    if (action === 'broadcast-location') {
        window.broadcastLocation();
        return;
    }

    if (action === 'ask-ai') {
        const input = document.querySelector('#aiInput, #chatInput');
        const query = input?.value?.trim();
        if (query) {
            AIModule.ask?.(query);
            input.value = '';
        }
        return;
    }

    if (action === 'voice-start') {
        VoiceModule.startListening?.();
        return;
    }

    console.log('Unhandled action:', action, element);
}

/**
 * Page-specific init routing
 */
function initializePage(page) {
    if (page.endsWith('/command-center.html')) {
        initCommandCenter();
        return;
    }

    if (page.endsWith('/live-intel.html')) {
        initLiveIntel();
        return;
    }

    if (page.endsWith('/deployment.html')) {
        initDeployment();
        return;
    }

    if (page.endsWith('/signal-hub.html')) {
        initSignalHub();
        return;
    }

    if (page.endsWith('/archive.html')) {
        initArchive();
    }
}

// Make AIModule globally available for voice module
window.AIModule = { ask: (query) => AIModule.ask(query) };

export default { SOSModule, VoiceModule, AIModule, NavigationModule, AlertsModule, MapModule };
