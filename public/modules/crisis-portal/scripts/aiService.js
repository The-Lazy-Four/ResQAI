/**
 * ResQAI Crisis Portal - Central AI Service
 * Handles all AI interactions with fallback to rule-based system
 */

export const AIService = {
    apiConnected: false,

    /**
     * Initialize AI service (check API availability)
     */
    async init() {
        try {
            const response = await fetch('/api/health', { method: 'GET' });
            this.apiConnected = response.ok;
            console.log('🤖 AI Service:', this.apiConnected ? 'API Connected' : 'Using Simulation Mode');
        } catch (err) {
            this.apiConnected = false;
            console.warn('⚠️ AI API unavailable, using simulation mode:', err.message);
        }
    },

    /**
     * Send query to AI (with real API or fallback)
     */
    async sendQuery(query, context = {}) {
        try {
            if (this.apiConnected) {
                const response = await fetch('/api/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: query, context })
                });

                if (response.ok) {
                    const data = await response.json();
                    console.log('🔌 AI Response from API:', data.response);
                    return data.response || data.message;
                }
            }
        } catch (err) {
            console.warn('⚠️ AI API call failed:', err.message);
        }

        // Fallback to rule-based
        return this.generateRuleBasedResponse(query);
    },

    /**
     * Get emergency guidance for SOS type
     */
    async getEmergencyGuidance(sosType) {
        const guidance = {
            'fire': {
                message: '🔥 FIRE EMERGENCY DETECTED\n1. Evacuate immediately\n2. Feel doors before opening\n3. Stay low to avoid smoke\n4. Use stairs, not elevators\n5. Assembly point: Nearest safe zone\n\nEmergency services dispatched. Help is on the way.',
                actions: ['evacuate', 'call-emergency', 'alert-nearby']
            },
            'medical': {
                message: '🏥 MEDICAL EMERGENCY\n1. Call ambulance (108)\n2. Check responsiveness\n3. Clear airway\n4. Control bleeding\n5. Keep patient warm\n\nAmbulance dispatched. ETA 5-7 minutes.',
                actions: ['call-ambulance', 'provide-first-aid', 'monitor-patient']
            },
            'women-safety': {
                message: '👩 WOMEN SAFETY ALERT\n1. Move to safe location\n2. Call police (100) immediately\n3. Document situation\n4. Contact trusted person\n5. Stay visible to public\n\nPolice units responding. ETA 3-5 minutes.',
                actions: ['call-police', 'move-to-safety', 'alert-authorities']
            },
            'earthquake': {
                message: '🌍 EARTHQUAKE DETECTED\n1. DROP, COVER, HOLD ON\n2. Stay under sturdy table/desk\n3. Protect head and neck\n4. Stay away from windows\n5. Don\'t move until shaking stops\n\nEarthquake response teams activated.',
                actions: ['drop-cover-hold', 'evacuate-after-shaking', 'check-surroundings']
            },
            'flood': {
                message: '💧 FLOOD WARNING\n1. Move to higher ground NOW\n2. Never drive through flooded areas\n3. Avoid contact with water\n4. Call rescue (112)\n5. Wait for all-clear signal\n\nRescue teams notified. Evacuation routes activated.',
                actions: ['move-to-safety', 'call-rescue', 'wait-for-clearance']
            },
            'child-safety': {
                message: '👧 CHILD SAFETY ALERT\n1. Locate child immediately\n2. Move to safe area\n3. Call police (100)\n4. Provide child\'s information\n5. Stay calm\n\nChild protection services activated.',
                actions: ['locate-child', 'move-to-safety', 'call-police']
            },
            'theft': {
                message: '🚨 THEFT/CRIME ALERT\n1. Move away from threat\n2. Go to public area\n3. Call police (100)\n4. Note suspect details\n5. Provide location\n\nPolice dispatched to your location.',
                actions: ['move-to-safety', 'call-police', 'document-details']
            }
        };

        return guidance[sosType] || {
            message: '🚨 EMERGENCY SOS ACTIVATED\nEmergency services dispatched to your location.\nStay calm and follow instructions.',
            actions: ['dispatch-emergency', 'await-services']
        };
    },

    /**
     * Analyze voice command and determine intent
     */
    async analyzeVoiceCommand(text) {
        try {
            if (this.apiConnected) {
                const response = await fetch('/api/voice/analyze', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text })
                });

                if (response.ok) {
                    const data = await response.json();
                    return data; // { intent: 'sos', sosType: 'fire' }
                }
            }
        } catch (err) {
            console.warn('⚠️ Voice analysis API failed:', err.message);
        }

        // Fallback: Local intent detection
        return this.detectLocalIntent(text);
    },

    /**
     * Local intent detection (fallback)
     */
    detectLocalIntent(text) {
        const lower = text.toLowerCase();

        // SOS patterns
        if (/fire|burning|flames|smoke/.test(lower)) {
            return { intent: 'sos', sosType: 'fire', confidence: 0.95 };
        }
        if (/medical|ambulance|injured|sick|pain/.test(lower)) {
            return { intent: 'sos', sosType: 'medical', confidence: 0.95 };
        }
        if (/earthquake|quake|shaking/.test(lower)) {
            return { intent: 'sos', sosType: 'earthquake', confidence: 0.95 };
        }
        if (/flood|water|drowning/.test(lower)) {
            return { intent: 'sos', sosType: 'flood', confidence: 0.95 };
        }
        if (/women|female|threat|danger/.test(lower)) {
            return { intent: 'sos', sosType: 'women-safety', confidence: 0.95 };
        }
        if (/help|emergency|sos|mayday/.test(lower)) {
            return { intent: 'sos', sosType: 'center-trigger', confidence: 0.9 };
        }
        if (/where|location|sector/.test(lower)) {
            return { intent: 'location', confidence: 0.8 };
        }

        // Default to query
        return { intent: 'query', confidence: 0.5 };
    },

    /**
     * Explain alert to user
     */
    explainAlert(alert) {
        const explanations = {
            'fire': 'Fire emergency - Stay low, avoid smoke. Evacuate using stairs. Move away from heat sources.',
            'medical': 'Medical emergency - Check patient\'s breathing and responsiveness. Call ambulance. Perform first aid.',
            'power': 'Power outage in area - Use flashlights. Avoid elevators. Be cautious of traffic lights offline.',
            'traffic': 'Traffic incident - Avoid the area. Use alternate routes. Watch for emergency vehicles.',
            'flood': 'Flood warning - Move to higher ground immediately. Do not enter flooded areas.',
            'earthquake': 'Earthquake detected - Take shelter under tables. Protect head. Stay away from windows.',
            'theft': 'Theft reported - Lock doors/windows. Stay alert. Report suspicious activity to police.'
        };

        return explanations[alert.type] || `${alert.title}: ${alert.description}`;
    },

    /**
     * Suggest safe zone for current location
     */
    getSafeZone(userLocation) {
        // Simple grid-based safe zone suggestion
        const zones = [
            { name: 'Central Community Bunker', sector: '7C', distance: '0.5 KM' },
            { name: 'City Hospital Emergency Wing', sector: '7D', distance: '1.2 KM' },
            { name: 'Emergency Shelter 1', sector: '6G', distance: '2.1 KM' },
            { name: 'Police Station Sector 7', sector: '7F', distance: '1.8 KM' },
            { name: 'Evacuation Point Alpha', sector: '5G', distance: '3.2 KM' }
        ];

        return zones[Math.floor(Math.random() * zones.length)];
    },

    /**
     * Generate rule-based response (fallback)
     */
    generateRuleBasedResponse(query) {
        const lower = query.toLowerCase();

        if (/fire/.test(lower)) {
            return '🔥 FIRE SAFETY: 1) Evacuate immediately. 2) Feel doors before opening. 3) Stay low to avoid smoke. 4) Use stairs, not elevators. 5) Assembly point: Nearest safe zone.';
        }
        if (/medical|first aid/.test(lower)) {
            return '🏥 FIRST AID: 1) Call ambulance (108). 2) Check consciousness. 3) Clear airway. 4) Control bleeding. 5) Keep patient warm.';
        }
        if (/earthquake/.test(lower)) {
            return '🌍 EARTHQUAKE: 1) DROP, COVER, HOLD ON. 2) Stay under table. 3) Protect head/neck. 4) Away from windows. 5) Exit when shaking stops.';
        }
        if (/flood|water/.test(lower)) {
            return '💧 FLOOD: 1) Move to higher ground NOW. 2) Never drive through water. 3) Avoid contact. 4) Call rescue (112). 5) Wait for all-clear.';
        }
        if (/location|where/.test(lower)) {
            return '📍 LOCATION: You are in Sector 7G. Nearby safe zones: Community Bunker (0.5 KM), Hospital (1.2 KM).';
        }
        if (/help|emergency/.test(lower)) {
            return '🆘 EMERGENCY CONTACTS: 112 (Universal), 101 (Fire), 108 (Ambulance), 100 (Police).';
        }
        if (/system|status/.test(lower)) {
            return '✅ SYSTEM STATUS: All systems operational. No active threats. Ready for emergency response.';
        }

        return '🤖 I can help with fire safety, medical guidance, earthquake response, flood procedures, and emergency contacts. What do you need?';
    }
};

export default AIService;
