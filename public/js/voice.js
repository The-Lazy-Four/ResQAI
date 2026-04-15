// ============================================
// ResQAI - Voice Control System (Frontend)
// ============================================

const API_BASE = 'http://localhost:3000/api';

// Speech Recognition (Web Speech API)
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = new SpeechRecognition();

// Speech Synthesis (Web Speech API)
const synth = window.speechSynthesis;

// State
let currentLanguage = 'en';
let isListening = false;

// ==================== SPEECH RECOGNITION SETUP ====================

recognition.continuous = false;
recognition.interimResults = false;
recognition.lang = 'en-US';

recognition.onstart = () => {
    console.log('🎤 Listening...');
    isListening = true;
    updateMicIcon('listening');
    showToast('🎤 Listening... speak now!', 'info');
};

recognition.onresult = async (event) => {
    let transcript = '';
    let confidence = 0;

    for (let i = event.resultIndex; i < event.results.length; i++) {
        const isFinal = event.results[i].isFinal;
        transcript += event.results[i][0].transcript;
        confidence = event.results[i][0].confidence;

        if (isFinal) {
            console.log(`✅ Recognized (${(confidence * 100).toFixed(0)}%): ${transcript}`);
            handleVoiceInput(transcript, confidence);
        }
    }
};

recognition.onerror = (event) => {
    console.error('🎤 Error:', event.error);
    showToast(`🎤 Error: ${event.error}`, 'error');
    updateMicIcon('idle');
    isListening = false;
};

recognition.onend = () => {
    console.log('🎤 Stopped listening');
    updateMicIcon('idle');
    isListening = false;
};

// ==================== VOICE INPUT HANDLER ====================

async function handleVoiceInput(transcript, confidence) {
    try {
        // Ensure we have minimum confidence
        if (confidence < 0.5) {
            showToast('❌ Confidence too low, try again', 'warning');
            return;
        }

        // Route to appropriate handler
        const lowerTranscript = transcript.toLowerCase();

        // Check for emergency keywords
        if (lowerTranscript.includes('fire') || lowerTranscript.includes('aag')) {
            sendToChat('fire emergency ' + transcript);
        } else if (lowerTranscript.includes('medical') || lowerTranscript.includes('injured') || lowerTranscript.includes('accident')) {
            sendToChat('medical emergency ' + transcript);
        } else if (lowerTranscript.includes('flood') || lowerTranscript.includes('water') || lowerTranscript.includes('barish')) {
            sendToChat('flood alert ' + transcript);
        } else if (lowerTranscript.includes('help') || lowerTranscript.includes('emergency') || lowerTranscript.includes('112')) {
            sendToChat('emergency help ' + transcript);
        } else {
            // General query
            sendToChat(transcript);
        }

        // Send transcription to server
        await fetch(`${API_BASE}/voice/transcribe-callback`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                transcript: transcript,
                language: currentLanguage,
                confidence: confidence
            })
        }).catch(err => console.warn('Could not log transcription:', err));

    } catch (error) {
        console.error('Error handling voice input:', error);
        showToast('❌ Error processing voice input', 'error');
    }
}

// ==================== SEND TEXT TO CHAT ====================

async function sendToChat(message) {
    try {
        const chatInput = document.querySelector('.chat-input-area input[type="text"]');
        const chatButton = document.querySelector('.chat-input-area button');

        if (chatInput && chatButton) {
            chatInput.value = message;
            chatButton.click();

            // Auto-play response
            setTimeout(() => {
                const lastResponse = document.querySelector('.chat-message.ai:last-of-type');
                if (lastResponse) {
                    const responseText = lastResponse.textContent;
                    speakText(responseText);
                }
            }, 1000);
        }
    } catch (error) {
        console.error('Error sending to chat:', error);
    }
}

// ==================== TEXT-TO-SPEECH ====================

function speakText(text, language = 'en') {
    try {
        // Cancel any ongoing speech
        synth.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = getLanguageCode(language);
        utterance.rate = 0.9;
        utterance.pitch = 1;
        utterance.volume = 1;

        console.log(`🔊 Speaking (${language}): ${text.substring(0, 50)}...`);

        synth.speak(utterance);

        showToast('🔊 Playing response...', 'info');
    } catch (error) {
        console.error('Error in text-to-speech:', error);
    }
}

// ==================== START/STOP LISTENING ====================

function toggleMicrophone() {
    if (!recognitionSupported()) {
        showToast('🎤 Speech Recognition not supported in your browser', 'error');
        return;
    }

    if (isListening) {
        recognition.stop();
        updateMicIcon('idle');
    } else {
        recognition.lang = getLanguageCode(currentLanguage);
        recognition.start();
    }
}

function updateMicIcon(state) {
    const micButtons = document.querySelectorAll('[data-voice-toggle]');
    micButtons.forEach(btn => {
        if (state === 'listening') {
            btn.classList.add('listening');
            btn.innerHTML = '<i class="fas fa-microphone"></i> Listening...';
        } else {
            btn.classList.remove('listening');
            btn.innerHTML = '<i class="fas fa-microphone"></i> Voice Input';
        }
    });
}

// ==================== LANGUAGE SUPPORT ====================

function getLanguageCode(lang) {
    const codes = {
        en: 'en-US',
        hi: 'hi-IN',
        bn: 'bn-IN'
    };
    return codes[lang] || 'en-US';
}

function setVoiceLanguage(language) {
    currentLanguage = language;
    recognition.lang = getLanguageCode(language);
    console.log(`🌐 Voice language set to: ${language}`);
}

// ==================== FEATURE DETECTION ====================

function recognitionSupported() {
    return SpeechRecognition !== undefined;
}

function synthesisSupported() {
    return synth !== undefined;
}

// ==================== ADD VOICE BUTTONS TO UI ====================

function initializeVoiceUI() {
    // Add voice button to chat

    const chatForm = document.querySelector('.chat-input-area');
    if (chatForm && recognitionSupported()) {
        const voiceBtn = document.createElement('button');
        voiceBtn.type = 'button';
        voiceBtn.className = 'btn-voice';
        voiceBtn.setAttribute('data-voice-toggle', 'true');
        voiceBtn.innerHTML = '<i class="fas fa-microphone"></i> Voice Input';
        voiceBtn.onclick = toggleMicrophone;

        chatForm.insertBefore(voiceBtn, chatForm.querySelector('button'));
    }

    // Add speak button when responses are ready
    setInterval(() => {
        const lastAiMessage = document.querySelector('.chat-message.ai:last-of-type');
        if (lastAiMessage && !lastAiMessage.querySelector('[data-speak-btn]')) {
            const speakBtn = document.createElement('button');
            speakBtn.className = 'btn-speak';
            speakBtn.setAttribute('data-speak-btn', 'true');
            speakBtn.innerHTML = '🔊 Speak';
            speakBtn.onclick = () => speakText(lastAiMessage.textContent);

            if (synthesisSupported()) {
                lastAiMessage.appendChild(speakBtn);
            }
        }
    }, 500);
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    if (recognitionSupported() || synthesisSupported()) {
        initializeVoiceUI();
        console.log('✅ Voice features enabled');
        console.log(`   Speech Recognition: ${recognitionSupported() ? '✅' : '❌'}`);
        console.log(`   Text-to-Speech: ${synthesisSupported() ? '✅' : '❌'}`);
    }
});

// Listen for language changes
document.addEventListener('languageChanged', (e) => {
    setVoiceLanguage(e.detail.language);
});
