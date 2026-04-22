/**
 * ResQAI Crisis Portal - AI Module
 * Handles AI chatbot, intelligent responses, and API integration
 */

import { CrisisState } from './core.js';
import VoiceModule from './voice.js';

export const AIModule = {

    /**
     * Initialize AI system
     */
    init() {
        console.log('✓ AI Module initialized');
        this.attachListeners();
    },

    /**
     * Attach AI input listeners with debouncing
     */
    attachListeners() {
        const aiInput = document.getElementById('aiInput');
        const aiButton = document.querySelector('button[data-action="ask-ai"]');

        if (aiButton) {
            // Debounced click handler
            const debouncedAsk = window.debounce(() => {
                if (aiInput && aiInput.value.trim()) {
                    this.ask(aiInput.value.trim());
                    aiInput.value = '';
                }
            }, 300);

            aiButton.addEventListener('click', debouncedAsk);
        }

        if (aiInput) {
            aiInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && aiInput.value.trim()) {
                    this.ask(aiInput.value.trim());
                    aiInput.value = '';
                }
            });
        }
    },

    /**
     * Process AI query (real API with fallback)
     */
    async ask(query) {
        try {
            console.log(`🤖 AI Query: "${query}"`);

            // Store in chat history
            CrisisState.chatHistory.push({
                role: 'user',
                message: query,
                timestamp: new Date()
            });

            let response = await this.fetchAIResponse(query);

            // Store response in history
            CrisisState.chatHistory.push({
                role: 'assistant',
                message: response,
                timestamp: new Date()
            });

            this.displayResponse(response);
            VoiceModule.speak(response);
        } catch (err) {
            console.error('❌ AI Error:', err);
            window.showNotification('⚠️ AI response failed', 'error');
        }
    },

    /**
     * Fetch AI response from API with fallback
     */
    async fetchAIResponse(query) {
        try {
            // Try real API first
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: query,
                    context: {
                        location: CrisisState.userLocation,
                        status: CrisisState.safetyStatus,
                        activeAlerts: CrisisState.alerts.length
                    }
                })
            });

            if (response.ok) {
                const data = await response.json();
                console.log('🔌 API Response received');
                return data.response || data.message || 'No response from API';
            }
        } catch (err) {
            console.warn('⚠️ API unavailable, using rule-based fallback:', err.message);
        }

        // Fallback to rule-based response
        return this.generateResponse(query.toLowerCase());
    },

    /**
     * Generate AI response (rule-based)
     */
    generateResponse(query) {
        // Fire safety
        if (query.includes('fire')) {
            return `🔥 FIRE SAFETY: 1) Evacuate immediately. 2) Feel doors before opening. 3) Stay low to avoid smoke. 4) Use stairs, not elevators. 5) Assembly point: Sector 7 Central Bunker`;
        }

        // Medical emergency
        if (query.includes('medical') || query.includes('first aid') || query.includes('help')) {
            return `🏥 FIRST AID: 1) Call 108 for ambulance. 2) Check consciousness. 3) Clear airway. 4) Control bleeding with pressure. 5) Keep patient warm and calm`;
        }

        // Earthquake
        if (query.includes('earthquake') || query.includes('quake')) {
            return `🌍 EARTHQUAKE SAFETY: 1) DROP, COVER, HOLD ON. 2) Stay under sturdy table/desk. 3) Protect head and neck. 4) Stay away from windows. 5) Exit only when shaking stops`;
        }

        // Flood
        if (query.includes('flood') || query.includes('water')) {
            return `💧 FLOOD SAFETY: 1) Move to higher ground immediately. 2) Never drive through flooded areas. 3) Avoid contact with floodwater. 4) Call 112 for rescue. 5) Wait for all-clear from authorities`;
        }

        // Location
        if (query.includes('location') || query.includes('where')) {
            const loc = CrisisState.userLocation;
            return `📍 YOUR LOCATION: Sector ${loc.sector}, Coordinates: ${loc.coordinates.lat}, ${loc.coordinates.lng}. Status: GEOTAGGED`;
        }

        // Emergency contacts
        if (query.includes('emergency') || query.includes('call') || query.includes('contact')) {
            return `📞 EMERGENCY CONTACTS: 112 - Universal Emergency, 101 - Fire, 108 - Ambulance, 100 - Police`;
        }

        // Status
        if (query.includes('status') || query.includes('system')) {
            return `✅ SYSTEM STATUS: All systems operational. Current safety status: ${CrisisState.safetyStatus}. Active alerts: ${CrisisState.alerts.length}`;
        }

        // Default
        return `🤖 I can help with fire safety, medical emergencies, earthquakes, floods, location info, and emergency contacts. What do you need help with?`;
    },

    /**
     * Display AI response
     */
    displayResponse(response) {
        const responseDiv = document.createElement('div');
        responseDiv.className = 'fixed bottom-20 right-8 bg-surface-container-high border border-tertiary rounded-2xl p-6 max-w-sm z-40 shadow-lg animate-slideIn';
        responseDiv.innerHTML = `
      <button onclick="this.parentElement.remove()" class="absolute top-3 right-3 text-slate-400 hover:text-on-surface">
        <span class="material-symbols-outlined">close</span>
      </button>
      <div class="flex gap-3 mb-3">
        <div class="w-8 h-8 rounded-lg bg-tertiary/10 flex items-center justify-center">
          <span class="material-symbols-outlined text-tertiary text-sm">psychology</span>
        </div>
        <p class="font-headline font-bold text-on-background">ResQAI Response</p>
      </div>
      <p class="text-sm text-on-surface-variant whitespace-pre-line leading-relaxed">${response}</p>
    `;

        document.body.appendChild(responseDiv);

        setTimeout(() => {
            responseDiv.remove();
        }, 8000);
    }
};

export default AIModule;
