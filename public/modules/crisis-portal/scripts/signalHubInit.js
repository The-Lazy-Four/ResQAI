/**
 * ResQAI Crisis Portal - Signal Hub Page Initialization
 * Handles sensor readings and real-time network monitoring
 */

import { CrisisState, setState, getState } from '/modules/crisis-portal/scripts/core.js';
import AIService from '/modules/crisis-portal/scripts/aiService.js';

/**
 * Initialize Signal Hub page functionality
 */
export async function initSignalHub() {
    try {
        console.log('📡 Initializing Signal Hub...');

        // Initialize AIService if not already done
        if (!window.AIService) {
            await AIService.init();
            window.AIService = AIService;
        }

        // Start sensor monitoring
        initSensorMonitoring();

        // Attach network status handlers
        attachNetworkHandlers();

        console.log('✓ Signal Hub initialized');
        window.showNotification('📡 Network monitoring active', 'info');
    } catch (err) {
        console.error('❌ Signal Hub init error:', err);
        window.showNotification('⚠️ Signal Hub encountered errors', 'error');
    }
}

/**
 * Initialize sensor reading updates
 */
function initSensorMonitoring() {
    // Update sensor readings every 5 seconds
    const sensorInterval = setInterval(() => {
        updateSensorReadings();
    }, 5000);

    // Initial update
    updateSensorReadings();

    // Store interval for cleanup
    window.sensorMonitoringInterval = sensorInterval;
}

/**
 * Update sensor readings display
 */
function updateSensorReadings() {
    try {
        const sensors = CrisisState.sensors || {
            signalStrength: Math.floor(Math.random() * 40) + 60,
            latency: Math.floor(Math.random() * 30) + 10,
            bandwidth: Math.floor(Math.random() * 50) + 40,
            packetLoss: Math.floor(Math.random() * 3),
            connections: Math.floor(Math.random() * 15) + 20,
            uptime: '99.8%'
        };

        // Update each sensor display
        updateSensorGauge('signal-strength', sensors.signalStrength, 100, '%');
        updateSensorGauge('latency', sensors.latency, 100, 'ms');
        updateSensorGauge('bandwidth', sensors.bandwidth, 100, 'Mbps');
        updateSensorGauge('packet-loss', sensors.packetLoss, 5, '%');
        updateSensorValue('connections', sensors.connections);
        updateSensorValue('uptime', sensors.uptime);

        // Update network status
        updateNetworkStatus(sensors);
    } catch (err) {
        console.error('❌ Sensor update error:', err);
    }
}

/**
 * Update a gauge sensor display
 */
function updateSensorGauge(sensorId, value, max, unit) {
    const gauge = document.querySelector(`[data-sensor="${sensorId}"]`);
    if (!gauge) return;

    const percentage = (value / max) * 100;
    const progressBar = gauge.querySelector('.bg-gradient-to-r');
    const valueDisplay = gauge.querySelector('.text-white');

    if (progressBar) {
        progressBar.style.width = percentage + '%';
    }

    if (valueDisplay) {
        valueDisplay.textContent = `${value}${unit}`;
    }
}

/**
 * Update a simple value sensor display
 */
function updateSensorValue(sensorId, value) {
    const element = document.querySelector(`[data-sensor="${sensorId}"]`);
    if (element) {
        const valueDisplay = element.querySelector('.text-white');
        if (valueDisplay) {
            valueDisplay.textContent = value;
        }
    }
}

/**
 * Update network status indicator
 */
function updateNetworkStatus(sensors) {
    const statusElement = document.querySelector('[data-component="network-status"]');
    if (!statusElement) return;

    // Determine overall status
    let status = 'Excellent';
    let statusClass = 'bg-green-500/20 text-green-300';

    if (sensors.signalStrength < 40 || sensors.latency > 50 || sensors.packetLoss > 2) {
        status = 'Warning';
        statusClass = 'bg-yellow-500/20 text-yellow-300';
    }

    if (sensors.signalStrength < 20 || sensors.latency > 100 || sensors.packetLoss > 5) {
        status = 'Critical';
        statusClass = 'bg-red-500/20 text-red-300';
    }

    statusElement.className = `px-4 py-2 rounded-lg font-bold text-center ${statusClass}`;
    statusElement.textContent = `Network: ${status}`;
}

/**
 * Attach network status event handlers
 */
function attachNetworkHandlers() {
    // Online/offline detection
    window.addEventListener('online', () => {
        window.showNotification('🟢 Network online', 'success');
        updateNetworkIndicator(true);
    });

    window.addEventListener('offline', () => {
        window.showNotification('🔴 Network offline', 'error');
        updateNetworkIndicator(false);
    });
}

/**
 * Update network indicator
 */
function updateNetworkIndicator(isOnline) {
    const indicator = document.querySelector('[data-component="network-indicator"]');
    if (indicator) {
        if (isOnline) {
            indicator.className = 'w-3 h-3 bg-green-500 rounded-full';
        } else {
            indicator.className = 'w-3 h-3 bg-red-500 rounded-full';
        }
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSignalHub);
} else {
    initSignalHub();
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (window.sensorMonitoringInterval) {
        clearInterval(window.sensorMonitoringInterval);
    }
});

export default { initSignalHub };
