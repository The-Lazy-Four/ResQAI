/**
 * ECHO+ Module Wrapper
 * Production-ready module interface for ResQAI integration
 * 
 * Safe, sandboxed integration with zero global pollution
 * All functionality accessible via window.EchoPlus.api
 */

window.EchoPlus = window.EchoPlus || (function () {
    'use strict';

    // ============================================================
    // MODULE STATE
    // ============================================================
    const module = {
        version: window.ECHO_CONFIG?.version || '2.0.1',
        namespace: 'EchoPlus',
        loaded: false,
        ready: false,
        config: null
    };

    // ============================================================
    // INITIALIZATION
    // ============================================================
    function init(parentConfig = {}) {
        try {
            // Merge parent config with defaults
            if (window.ECHO_CONFIG && window.ECHO_CONFIG.init) {
                window.ECHO_CONFIG.init(parentConfig);
            }

            console.log('🏨 ECHO+ Emergency System v' + module.version);
            console.log('✓ Module initialized - ready for integration into ResQAI');

            module.loaded = true;
            module.ready = true;
            module.config = window.ECHO_CONFIG;

            return true;
        } catch (error) {
            console.error('ECHO+ initialization failed:', error);
            return false;
        }
    }

    // ============================================================
    // PUBLIC API — GUEST FUNCTIONS
    // ============================================================
    const guestAPI = {
        // Navigate to guest flow
        enter: () => {
            if (typeof goGuest === 'function') goGuest();
        },

        // Login guest
        login: (name, room, code) => {
            if (typeof guestLogin !== 'function') return false;
            // Set form fields safely
            const nameEl = document.getElementById('guest-name');
            const roomEl = document.getElementById('guest-room');
            const codeEl = document.getElementById('guest-code');

            if (nameEl) nameEl.value = name;
            if (roomEl) roomEl.value = room;
            if (codeEl) codeEl.value = code;

            // Trigger login
            setTimeout(() => guestLogin(), 100);
            return true;
        },

        // Get current guest data
        getCurrent: () => {
            return {
                name: window.state?.guestName || null,
                room: window.state?.roomNumber || null,
                hotel: window.state?.selectedHotel || null,
                isLoggedIn: window.state?.guestObj ? true : false
            };
        },

        // Exit guest dashboard
        exit: () => {
            if (typeof goLanding === 'function') goLanding();
        }
    };

    // ============================================================
    // PUBLIC API — ADMIN FUNCTIONS
    // ============================================================
    const adminAPI = {
        // Enter admin dashboard
        enter: () => {
            if (typeof goAdmin === 'function') goAdmin();
        },

        // Login as admin
        login: (password) => {
            const passEl = document.getElementById('admin-pass-input');
            if (passEl) {
                passEl.value = password;
                if (typeof adminLogin === 'function') {
                    setTimeout(() => adminLogin(), 100);
                    return true;
                }
            }
            return false;
        },

        // Trigger emergency
        triggerEmergency: (type) => {
            if (typeof triggerEmergency === 'function') {
                triggerEmergency(type);
                return true;
            }
            return false;
        },

        // Clear active emergency
        clearEmergency: () => {
            if (typeof clearEmergency === 'function') {
                clearEmergency();
                return true;
            }
            return false;
        },

        // Get current emergency state
        getEmergency: () => {
            return window.state?.currentEmergency || null;
        },

        // Run demo scenario
        runScenario: (scenarioId) => {
            if (typeof runScenario === 'function') {
                runScenario(scenarioId);
                return true;
            }
            return false;
        }
    };

    // ============================================================
    // PUBLIC API — SYSTEM FUNCTIONS
    // ============================================================
    const systemAPI = {
        // Get module status
        status: () => {
            return {
                loaded: module.loaded,
                ready: module.ready,
                version: module.version,
                config: module.config
            };
        },

        // Set language
        setLanguage: (lang) => {
            if (typeof setLang === 'function') {
                setLang(lang);
                return true;
            }
            return false;
        },

        // Get current language
        getLanguage: () => {
            return window.state?.lang || 'en';
        },

        // Get all hotels
        getHotels: () => {
            return window.ECHO_DATA?.hotels || [];
        },

        // Get all scenarios
        getScenarios: () => {
            return window.ECHO_DATA?.scenarios || [];
        },

        // Get current state
        getState: () => {
            return {
                role: window.state?.role || null,
                selectedHotel: window.state?.selectedHotel || null,
                currentEmergency: window.state?.currentEmergency || null,
                language: window.state?.lang || 'en',
                notifications: window.state?.notifications || []
            };
        },

        // Health check
        healthCheck: async () => {
            if (window.EchoPlusAI && typeof window.EchoPlusAI.healthCheck === 'function') {
                return await window.EchoPlusAI.healthCheck();
            }
            return true; // Assume healthy if offline
        },

        // Cleanup on unload
        destroy: () => {
            try {
                window.speechSynthesis?.cancel();
                if (window.state?.mapAnim) {
                    cancelAnimationFrame(window.state.mapAnim);
                }
                console.log('ECHO+ module destroyed');
                return true;
            } catch (error) {
                console.error('Error destroying ECHO+ module:', error);
                return false;
            }
        }
    };

    // ============================================================
    // EVENT SYSTEM (for parent app to listen)
    // ============================================================
    const events = {
        listeners: {},

        on: function (eventName, callback) {
            if (!this.listeners[eventName]) {
                this.listeners[eventName] = [];
            }
            this.listeners[eventName].push(callback);
            return () => this.off(eventName, callback);
        },

        off: function (eventName, callback) {
            if (!this.listeners[eventName]) return;
            this.listeners[eventName] = this.listeners[eventName].filter(cb => cb !== callback);
        },

        emit: function (eventName, data) {
            if (!this.listeners[eventName]) return;
            this.listeners[eventName].forEach(cb => {
                try {
                    cb(data);
                } catch (error) {
                    console.error(`Error in event listener for "${eventName}":`, error);
                }
            });
        }
    };

    // Hook into global state changes
    function setupEventHooks() {
        // Trigger event when emergency changes
        const originalTrigger = window.triggerEmergency;
        window.triggerEmergency = function (...args) {
            const result = originalTrigger?.apply(this, args);
            events.emit('emergency-triggered', {
                emergency: window.state?.currentEmergency
            });
            return result;
        };
    }

    // ============================================================
    // PUBLIC EXPORTS
    // ============================================================
    return {
        // Module info
        version: module.version,
        namespace: module.namespace,

        // Initialization
        init,

        // Sub-APIs
        api: {
            guest: guestAPI,
            admin: adminAPI,
            system: systemAPI,
            events
        },

        // Direct access for advanced use
        _internal: {
            state: () => window.state,
            data: () => window.ECHO_DATA,
            config: () => window.ECHO_CONFIG
        }
    };
})();

// Log successful module creation
console.log('✓ ECHO+ module wrapper loaded - accessible via window.EchoPlus');
