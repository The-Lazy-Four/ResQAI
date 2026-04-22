/**
 * ResQAI Crisis Portal - Voice Module
 * Handles voice input, intent detection via AI, and voice responses
 */

import { CrisisState, setState } from './core.js';
import SOSModule from './sos.js';
import AIService from './aiService.js';

export const VoiceModule = {

    recognition: null,
    isListening: false,

    /**
     * Initialize voice system
     */
    init() {
        console.log('✓ Voice Module initialized');
        this.setupSpeechRecognition();
        this.attachVoiceButton();
    },

    /**
     * Setup Web Speech API
     */
    setupSpeechRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

        if (!SpeechRecognition) {
            console.log('⚠️ Web Speech API not supported');
            return;
        }

        this.recognition = new SpeechRecognition();
        this.recognition.continuous = false;
        this.recognition.interimResults = true;
        this.recognition.lang = 'en-US';

        this.recognition.onstart = () => {
            setState('isListening', true);
            console.log('🎤 Listening...');
        };

        this.recognition.onresult = (event) => {
            let transcript = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                transcript += event.results[i][0].transcript;
            }

            if (event.isFinal) {
                this.processVoiceCommand(transcript.toLowerCase());
            }
        };

        this.recognition.onend = () => {
            setState('isListening', false);
        };

        this.recognition.onerror = (event) => {
            console.error('Voice error:', event.error);
            setState('isListening', false);
        };
    },

    /**
     * Attach voice button listener
     */
    attachVoiceButton() {
        // Listen for voice-start action via action delegation system
        // No longer using fragile selector - relies on data-action="voice-start"
        // This is handled by main.js attachGlobalActionDelegation()
    },

    /**
     * Start listening for voice commands
     */
    startListening() {
        try {
            if (!this.recognition) {
                window.showNotification('🎤 Voice input not supported', 'warning');
                return;
            }

            this.isListening = true;
            this.recognition.start();
            window.showNotification('🎤 Listening for voice command...', 'info');
        } catch (err) {
            console.error('❌ Voice start error:', err);
            window.showNotification('⚠️ Voice input failed', 'error');
        }
    },

    /**
     * Process voice commands with AI intent detection
     */
    async processVoiceCommand(transcript) {
        try {
            console.log(`🎤 Voice Command: "${transcript}"`);
            setState('lastVoiceCommand', transcript);

            window.showNotification(`🎤 Heard: "${transcript}"`, 'success');

            // Use AIService for intent detection
            const intent = await AIService.analyzeVoiceCommand(transcript);

            if (intent.intent === 'sos') {
                // Route to SOS
                await SOSModule.trigger(intent.sosType);
                this.speak(`Emergency SOS triggered for ${intent.sosType}. Help is on the way.`);
            } else if (intent.intent === 'query') {
                // Route to AI
                const response = await AIService.sendQuery(transcript, { location: CrisisState.userLocation });
                if (window.AIModule) {
                    window.AIModule.displayResponse(response);
                }
                this.speak(response);
            } else if (intent.intent === 'location') {
                // Return location info
                const loc = CrisisState.userLocation;
                const message = `You are in sector ${loc.sector}`;
                window.showNotification(`📍 ${message}`, 'info');
                this.speak(message);
            } else {
                // Fallback to AI query
                const response = await AIService.sendQuery(transcript);
                if (window.AIModule) {
                    window.AIModule.displayResponse(response);
                }
                this.speak(response);
            }
        } catch (err) {
            console.error('❌ Voice processing error:', err);
            window.showNotification('⚠️ Voice processing failed', 'error');
        }
    },

    /**
     * Speak a response using speechSynthesis
     */
    speak(message) {
        if ('speechSynthesis' in window) {
            // Cancel any ongoing speech
            speechSynthesis.cancel();

            const utterance = new SpeechSynthesisUtterance(message);
            utterance.rate = 0.95;
            utterance.pitch = 1;
            utterance.volume = 0.8;

            speechSynthesis.speak(utterance);
        }
    }
};

export default VoiceModule;
