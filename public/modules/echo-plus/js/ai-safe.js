/**
 * ECHO+ AI Module
 * Handles all AI emergency guidance requests
 * All API keys handled by backend - NEVER in frontend
 */

window.EchoPlusAI = (function () {
    'use strict';

    const config = window.ECHO_CONFIG;
    const logs = [];

    // ============================================================
    // INTERNAL LOGGING
    // ============================================================
    function log(level, message, data) {
        if (!config.logging.enabled) return;

        const logEntry = {
            timestamp: new Date().toISOString(),
            level,
            message,
            data
        };

        logs.push(logEntry);
        if (logs.length > config.logging.maxLogs) logs.shift();

        if (config.logging.logToConsole) {
            const prefix = `[ECHO+ AI] [${level}]`;
            if (level === 'error') console.error(prefix, message, data);
            else if (level === 'warn') console.warn(prefix, message, data);
            else console.log(prefix, message, data);
        }
    }

    // ============================================================
    // RETRY LOGIC
    // ============================================================
    async function fetchWithRetry(url, options, retries = config.api.retries) {
        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), config.api.timeout);

                const response = await fetch(url, {
                    ...options,
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                return response;
            } catch (error) {
                log('warn', `Attempt ${attempt} failed`, { url, error: error.message });

                if (attempt === retries) {
                    throw error;
                }

                // Exponential backoff
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
            }
        }
    }

    // ============================================================
    // EMERGENCY GUIDANCE REQUEST
    // ============================================================
    async function getEmergencyGuidance(scenario, guestContext, language = 'en') {
        if (!scenario || typeof scenario !== 'object') {
            log('error', 'Invalid scenario provided', scenario);
            throw new Error('Scenario must be a valid object');
        }

        if (language && !config.i18n.supported.includes(language)) {
            log('warn', 'Unsupported language, falling back to English', { requested: language });
            language = config.i18n.default;
        }

        try {
            log('info', 'Requesting emergency guidance', {
                type: scenario.type,
                floor: scenario.floor,
                language
            });

            // Build sanitized request (no API keys exposed)
            const requestPayload = {
                emergencyType: scenario.type,
                floor: scenario.floor,
                roomNumber: scenario.roomNumber || 'Unknown',
                severity: scenario.severity || 'medium',
                description: scenario.description,
                guestContext: guestContext ? {
                    isNearby: guestContext.isNearby,
                    floor: guestContext.floor,
                    zone: guestContext.zone
                } : null,
                language: language,
                // Request parameters only - NO SECRETS
                params: {
                    maxTokens: 300,
                    temperature: 0.7,
                    tone: "calm, reassuring, authoritative",
                    instructionType: "directional_safety_tips"
                }
            };

            // Call BACKEND endpoint only (backend handles actual API key)
            const response = await fetchWithRetry(
                config.api.aiEndpoint,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        // Include session token if available
                        'Authorization': window.sessionStorage.getItem(config.security.sessionTokenKey)
                            ? `Bearer ${window.sessionStorage.getItem(config.security.sessionTokenKey)}`
                            : ''
                    },
                    body: JSON.stringify(requestPayload)
                }
            );

            const data = await response.json();

            if (!data.guidance) {
                throw new Error('No guidance in response');
            }

            log('info', 'Emergency guidance received', { type: scenario.type });
            return data.guidance;

        } catch (error) {
            log('error', 'Failed to get emergency guidance', {
                error: error.message,
                scenario: scenario.type
            });

            // Return fallback guidance if backend unavailable
            return getFallbackGuidance(scenario.type, language);
        }
    }

    // ============================================================
    // FALLBACK GUIDANCE (when backend unavailable)
    // ============================================================
    function getFallbackGuidance(emergencyType, language = 'en', guestContext = null) {
        log('warn', 'Using fallback guidance', { type: emergencyType });

        const steps = [];
        const exitDir = (guestContext && guestContext.zone === 'east') ? 'right' : 'left';
        const exitName = (guestContext && guestContext.zone === 'east') ? 'Exit A' : 'Exit B';

        if (emergencyType === 'fire') {
            steps.push("Leave your room immediately. Do not collect belongings.");
            steps.push(`Turn ${exitDir} in the corridor toward ${exitName}.`);
            steps.push("Take the stairs down. DO NOT use elevators.");
            steps.push("Exit the building to the assembly point.");
        } else if (emergencyType === 'earthquake') {
            steps.push("Drop, cover, and hold on under a sturdy desk.");
            steps.push("Wait for the shaking to stop completely.");
            steps.push(`Carefully exit building via stairs at ${exitName}.`);
        } else if (emergencyType === 'suspicious') {
            steps.push("Lock your door and remain inside the room.");
            steps.push("Avoid standing near windows.");
            steps.push("Wait for further instructions from authorities.");
        } else if (emergencyType === 'medical') {
            steps.push("Help is on the way. Please stay calm.");
            steps.push("Unlock your door so responders can enter.");
            steps.push("Clear space around the person needing help.");
        } else {
            steps.push("Please remain calm and stay in a safe location.");
            steps.push("Follow all instructions from hotel staff.");
        }

        // Return as a single string joined by newlines, or a specific format if needed
        return steps.join("\n");
    }

    // ============================================================
    // HEALTH CHECK
    // ============================================================
    async function healthCheck() {
        try {
            const response = await fetchWithRetry(
                `${config.api.aiEndpoint}/health`,
                { method: 'GET' }
            );
            const data = await response.json();
            log('info', 'AI service health check passed');
            return data.status === 'ok';
        } catch (error) {
            log('warn', 'AI service unavailable', { error: error.message });
            return false;
        }
    }

    // ============================================================
    // PUBLIC API
    // ============================================================
    return {
        getGuidance: getEmergencyGuidance,
        getFallback: getFallbackGuidance,
        healthCheck: healthCheck,
        getLogs: () => [...logs],
        clearLogs: () => logs.length = 0
    };
})();

// Export for use
window.EchoPlusAI = window.EchoPlusAI || window.EchoPlusAI;
