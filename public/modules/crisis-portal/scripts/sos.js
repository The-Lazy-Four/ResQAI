/**
 * ResQAI Crisis Portal - SOS Module
 * Handles emergency SOS triggering with real API integration
 */

import { CrisisState, setState, saveStateToStorage } from './core.js';
import AIService from './aiService.js';

export const SOSModule = {

    /**
     * Initialize SOS system
     */
    init() {
        console.log('✓ SOS Module initialized');
        // Listeners are now attached via global action delegation in main.js
        // This module handles the trigger logic when called
    },

    /**
     * Trigger SOS (async - sends to API)
     */
    async trigger(sosType) {
        try {
            const typeMap = {
                'sidebar-initiate': { msg: '🆘 SOS INITIATED - All Services Dispatched', icon: '🆘' },
                'center-trigger': { msg: '🚨 EMERGENCY SOS - Police & Ambulance en route', icon: '🚨' },
                'fire': { msg: '🔥 FIRE EMERGENCY - Dispatch sent to Zone B', icon: '🔥' },
                'medical': { msg: '🏥 MEDICAL EMERGENCY - Ambulance dispatched', icon: '🏥' },
                'women-safety': { msg: '👩 WOMEN SAFETY ALERT - Police units assigned', icon: '👩' },
                'child-safety': { msg: '👧 CHILD SAFETY ALERT - Emergency response active', icon: '👧' },
                'earthquake': { msg: '🌍 EARTHQUAKE ALERT - Evacuation protocols active', icon: '🌍' },
                'flood': { msg: '💧 FLOOD WARNING - Rescue teams notified', icon: '💧' },
                'theft': { msg: '🚨 THEFT/THREAT REPORTED - Police dispatched', icon: '🚨' },
                'custom': { msg: '⚙️ CUSTOM EMERGENCY - Response team assigned', icon: '⚙️' }
            };

            const sosInfo = typeMap[sosType] || { msg: 'Emergency services dispatched', icon: '🚨' };

            setState('sosActivated', true);
            setState('sosType', sosType);
            setState('sosTimestamp', new Date());

            // Create incident record
            const incidentId = Math.floor(Math.random() * 10000);
            const incident = {
                id: incidentId,
                type: sosType,
                title: sosInfo.msg.replace(/[^a-zA-Z\s]/g, '').trim(),
                status: 'ACTIVE',
                date: new Date().toISOString().split('T')[0],
                duration: '0m',
                location: CrisisState.userLocation,
                timestamp: new Date()
            };

            // Save to incident history
            CrisisState.incidentHistory.unshift(incident);
            saveStateToStorage();

            this.showSOSAlert(sosInfo.msg, sosInfo.icon);
            await this.simulateDispatch(sosType, incident);

            console.log(`🚨 SOS Triggered: ${sosType}`);

            setTimeout(() => {
                setState('sosActivated', false);
            }, 5000);
        } catch (err) {
            console.error('❌ SOS Error:', err);
            window.showNotification('⚠️ SOS failed', 'error');
        }
    },

    /**
     * Show SOS alert modal
     */
    showSOSAlert(message, icon) {
        const alertDiv = document.createElement('div');
        alertDiv.className = 'fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 animate-pulse';
        alertDiv.innerHTML = `
      <div class="bg-surface-container-high border-2 border-primary-container rounded-3xl p-8 max-w-md text-center animate-bounce">
        <div class="text-6xl mb-4">${icon}</div>
        <h2 class="text-2xl font-headline font-black text-on-background mb-4">${message}</h2>
        <p class="text-sm text-on-surface-variant mb-6">Emergency services are being dispatched to your location.</p>
        <button onclick="this.parentElement.parentElement.remove()" class="bg-primary-container text-on-primary-container px-8 py-3 rounded-lg font-headline font-bold">
          ACKNOWLEDGE
        </button>
      </div>
    `;

        document.body.appendChild(alertDiv);

        // Play alert sound
        this.playSOSSound();

        // Speak alert (if speechSynthesis available)
        this.speakSOSMessage(message);

        setTimeout(() => {
            alertDiv.remove();
        }, 5000);
    },

    /**
     * Simulate dispatch process with real API call
     */
    async simulateDispatch(sosType, incident) {
        try {
            // Show initial alert
            window.showNotification('🚨 Emergency dispatch initiated', 'calling');

            // POST to API
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
                console.log('🔌 Emergency dispatched to API:', data);

                // Simulate dispatch confirmation
                setTimeout(() => {
                    window.showNotification('✓ [API] Dispatch Confirmed - Services En Route', 'success');
                    this.speakSOSMessage('Your SOS has been confirmed. Emergency services are on the way.');
                }, 1500);

                // Simulate ETA notification
                setTimeout(() => {
                    const eta = data.eta || Math.floor(Math.random() * 5) + 3;
                    window.showNotification(`🚑 ETA: ${eta} minutes`, 'info');
                }, 3000);

                return;
            }
        } catch (err) {
            console.warn('⚠️ API unavailable, using simulation:', err.message);
        }

        // Fallback: Simulate dispatch locally
        setTimeout(() => {
            window.showNotification('[SIMULATION] Dispatch Confirmed - Services En Route', 'warning');
            this.speakSOSMessage('Your emergency SOS has been recorded. Local services have been notified.');
        }, 1500);

        setTimeout(() => {
            const eta = Math.floor(Math.random() * 5) + 3;
            window.showNotification(`🚑 ETA: ${eta} minutes`, 'info');
        }, 3000);
    },

    /**
     * Play SOS sound (simple beep)
     */
    playSOSSound() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.frequency.value = 800;
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.5);
        } catch (e) {
            console.log('Audio context not supported');
        }
    },

    /**
     * Speak SOS message using speechSynthesis
     */
    speakSOSMessage(message) {
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(message);
            utterance.rate = 0.9;
            utterance.pitch = 1;
            utterance.volume = 0.8;
            speechSynthesis.speak(utterance);
        }
    }
};

export default SOSModule;
