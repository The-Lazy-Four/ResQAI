/**
 * ECHO+ Utilities Module
 * Safe DOM access, helpers, and common functions
 */

window.EchoPlusUtils = (function () {
    'use strict';

    // ============================================================
    // SAFE DOM ACCESS
    // ============================================================

    /**
     * Safely get element with null checking
     */
    function getElement(id) {
        if (!id || typeof id !== 'string') {
            console.warn('getElement: Invalid ID provided', id);
            return null;
        }

        const el = document.getElementById(id);
        if (!el) {
            console.warn(`getElement: Element with ID "${id}" not found`);
        }
        return el;
    }

    /**
     * Safely query selector
     */
    function querySelector(selector, context = document) {
        if (!selector || typeof selector !== 'string') return null;
        return context.querySelector(selector);
    }

    /**
     * Safely query selector all
     */
    function querySelectorAll(selector, context = document) {
        if (!selector || typeof selector !== 'string') return [];
        return Array.from(context.querySelectorAll(selector));
    }

    /**
     * Check if element exists
     */
    function elementExists(id) {
        if (!id) return false;
        return document.getElementById(id) !== null;
    }

    // ============================================================
    // DOM MANIPULATION (SAFE)
    // ============================================================

    function setText(elementId, text) {
        const el = getElement(elementId);
        if (!el) return false;
        el.textContent = String(text || '').trim();
        return true;
    }

    function setHTML(elementId, html) {
        const el = getElement(elementId);
        if (!el) return false;
        // Sanitize HTML to prevent XSS
        const temp = document.createElement('div');
        temp.textContent = html;
        el.innerHTML = temp.innerHTML; // Safe text conversion
        return true;
    }

    function addClass(elementId, className) {
        const el = getElement(elementId);
        if (!el) return false;
        if (className && typeof className === 'string') {
            el.classList.add(...className.split(' '));
        }
        return true;
    }

    function removeClass(elementId, className) {
        const el = getElement(elementId);
        if (!el) return false;
        if (className && typeof className === 'string') {
            el.classList.remove(...className.split(' '));
        }
        return true;
    }

    function toggleClass(elementId, className) {
        const el = getElement(elementId);
        if (!el) return false;
        el.classList.toggle(className);
        return true;
    }

    function hasClass(elementId, className) {
        const el = getElement(elementId);
        return el ? el.classList.contains(className) : false;
    }

    // ============================================================
    // EVENT HANDLING (SAFE)
    // ============================================================

    function addEventListener(elementId, event, handler) {
        const el = getElement(elementId);
        if (!el || typeof handler !== 'function') return false;
        el.addEventListener(event, handler);
        return true;
    }

    function removeEventListener(elementId, event, handler) {
        const el = getElement(elementId);
        if (!el || typeof handler !== 'function') return false;
        el.removeEventListener(event, handler);
        return true;
    }

    // ============================================================
    // UTILITY FUNCTIONS
    // ============================================================

    function getCurrentTime() {
        return new Date().toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }

    function generateInitials(name) {
        if (!name || typeof name !== 'string') return 'US';
        return name.split(' ')
            .slice(0, 2)
            .map(w => w[0])
            .join('')
            .toUpperCase();
    }

    function debounce(func, wait = 300) {
        if (typeof func !== 'function') return () => { };
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    function throttle(func, limit = 1000) {
        if (typeof func !== 'function') return () => { };
        let inThrottle;
        return function (...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    function formatTime(timestamp) {
        if (!timestamp) return '';
        if (typeof timestamp === 'number') {
            return new Date(timestamp).toLocaleTimeString('en-IN', {
                hour: '2-digit',
                minute: '2-digit'
            });
        }
        return String(timestamp);
    }

    // ============================================================
    // VALIDATION
    // ============================================================

    function validateRoomNumber(room) {
        if (!room || typeof room !== 'string') return false;
        return /^\d{2,4}$/.test(room.trim());
    }

    function validateFloor(floor) {
        if (typeof floor !== 'number' && typeof floor !== 'string') return false;
        const f = parseInt(floor);
        const cfg = window.ECHO_CONFIG;
        return f >= cfg.validation.minFloor && f <= cfg.validation.maxFloors;
    }

    function validateCode(code) {
        if (!code || typeof code !== 'string') return false;
        return code.trim().length >= 4;
    }

    // ============================================================
    // SCREEN NAVIGATION (SAFE)
    // ============================================================

    function showScreen(screenId) {
        if (!screenId || typeof screenId !== 'string') {
            console.warn('showScreen: Invalid screen ID', screenId);
            return false;
        }

        try {
            // Hide all screens
            querySelectorAll('.echo-screen').forEach(screen => {
                screen.classList.remove('echo-active');
            });

            // Show target screen
            const target = getElement(screenId);
            if (!target) {
                console.warn(`showScreen: Element "${screenId}" not found`);
                return false;
            }

            target.classList.add('echo-active');
            return true;
        } catch (error) {
            console.error('showScreen error:', error);
            return false;
        }
    }

    // ============================================================
    // PUBLIC API
    // ============================================================

    return {
        // DOM Access
        $: getElement,
        $$: querySelectorAll,
        query: querySelector,
        exists: elementExists,

        // DOM Manipulation
        text: setText,
        html: setHTML,
        addClass,
        removeClass,
        toggleClass,
        hasClass,

        // Events
        on: addEventListener,
        off: removeEventListener,

        // Utilities
        time: getCurrentTime,
        initials: generateInitials,
        debounce,
        throttle,
        formatTime,

        // Validation
        validateRoom: validateRoomNumber,
        validateFloor,
        validateCode,

        // Navigation
        showScreen,

        // Public access to logger
        log: (msg, data) => console.log('[ECHO+]', msg, data)
    };
})();
