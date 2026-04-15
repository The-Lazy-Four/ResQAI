// ============================================
// ResQAI - Chatbot Logic
// ============================================

async function sendChatMessage() {
    const input = document.getElementById('chatInput');
    const message = input.value.trim();

    if (!message) return;

    // Add user message to chat
    addChatMessage(message, 'user');
    input.value = '';

    showLoading(true);

    try {
        // Get current language from selector
        const languageSelect = document.getElementById('languageSelect');
        const language = languageSelect ? languageSelect.value : 'en';

        const response = await fetch(`${API_BASE_URL}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message, language })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            addChatMessage(data.response, 'bot');
        } else if (data.error === 'AI service unavailable') {
            showToast('AI temporarily unavailable', 'warning');
            addChatMessage(`⚠️ ${data.message}`, 'bot');
        } else {
            addChatMessage(`Error: ${data.message || 'Unknown error'}`, 'bot');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('AI temporarily unavailable', 'warning');
        addChatMessage('🔴 Connection error. Gemini API is not available.', 'bot');
    } finally {
        showLoading(false);
    }
}

function sendQuickMessage(message) {
    document.getElementById('chatInput').value = message;
    sendChatMessage();
}

function handleChatKeypress(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        sendChatMessage();
    }
}

function addChatMessage(text, sender) {
    const chatMessages = document.getElementById('chatMessages');

    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}-message`;

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';

    // Format AI responses with clean styling
    if (sender === 'bot') {
        // Parse structured response if available
        let formattedText = text;

        // Apply clean formatting
        formattedText = formattedText
            .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')  // Bold
            .replace(/(\d+\.\s+)/g, '<br><strong style="color: #4a9eff;">$1</strong>')  // Numbered steps
            .replace(/•\s+/g, '<br>• ')  // Bullets
            .replace(/\n\n/g, '<br><br>');  // Double newlines

        contentDiv.innerHTML = `
            <div style="color: #fff; font-size: 13px; line-height: 1.6;">
                ${formattedText}
            </div>
        `;
    } else {
        contentDiv.innerHTML = `<strong style="color: #4a9eff;">You:</strong> <span style="color: #ddd;">${text}</span>`;
    }

    const timeDiv = document.createElement('small');
    timeDiv.textContent = 'Just now';
    timeDiv.style.color = '#666';
    timeDiv.style.fontSize = '11px';
    timeDiv.style.marginTop = '6px';
    timeDiv.style.display = 'block';

    messageDiv.appendChild(contentDiv);
    messageDiv.appendChild(timeDiv);

    chatMessages.appendChild(messageDiv);

    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Predefined responses fallback (for demo without API)
const fallbackResponses = {
    fire: {
        keywords: ['fire', 'burning', 'smoke', 'flames'],
        response: `🔥 <strong>Fire Safety Guidelines:</strong>
<br><br>
1. <strong>Evacuate immediately</strong> - Leave the building using nearest exit
2. <strong>Close doors</strong> behind you to slow fire spread
3. <strong>Call emergency (911)</strong> as soon as safe
4. <strong>Never use elevators</strong> - Always use stairs
5. <strong>Stay low</strong> to avoid smoke inhalation
6. <strong>Feel doors</strong> before opening - Check if hot
7. <strong>Meet at assembly point</strong> to account for everyone
8. <strong>Don't return</strong> to the building for any reason

Critical: Alert others while evacuating. Your safety is priority #1.`
    },
    medical: {
        keywords: ['injured', 'hurt', 'pain', 'medical', 'sick', 'unconscious', 'bleeding'],
        response: `🚑 <strong>Emergency Medical Response:</strong>
<br><br>
1. <strong>Ensure scene safety</strong> - Check for immediate dangers
2. <strong>Call 911</strong> immediately for serious conditions
3. <strong>Check responsiveness</strong> - Tap and shout
4. <strong>Open airway</strong> - Tilt head, lift chin
5. <strong>Check breathing</strong> - Look, listen, feel
6. <strong>Begin CPR if needed</strong> - 30 chest compressions + 2 breaths
7. <strong>Stop severe bleeding</strong> - Apply direct pressure
8. <strong>Don't move the victim</strong> unless there's immediate danger
9. <strong>Recovery position</strong> if unconscious but breathing
10. <strong>Stay with victim</strong> until help arrives

Remember: Early intervention saves lives. Act decisively!`
    },
    flood: {
        keywords: ['flood', 'water', 'flash flood', 'drowning', 'tsunami', 'submerged'],
        response: `💧 <strong>Flood Safety Protocol:</strong>
<br><br>
1. <strong>Don't walk/drive through water</strong> - Just 6 inches can knock you down
2. <strong>Move to higher ground</strong> immediately
3. <strong>Turn off utilities</strong> if time permits
4. <strong>Don't touch electrical items</strong> - Risk of electrocution
5. <strong>Never go near flood water</strong> - Hidden currents & contaminants
6. <strong>Stay informed</strong> - Monitor emergency broadcasts
7. <strong>Have evacuation plan ready</strong> - Know routes to high ground
8. <strong>Keep emergency kit</strong> - Water, food, first aid, flashlight
9. <strong>Document property</strong> - Photos for insurance claims
10. <strong>Return home cautiously</strong> - Check for structural damage

Warning: Flood water moves fast and is dangerous. Prevention beats rescue!`
    },
    accident: {
        keywords: ['accident', 'crash', 'collision', 'car', 'vehicle', 'wreck'],
        response: `🚗 <strong>Vehicle Accident Response:</strong>
<br><br>
1. <strong>Check for injuries</strong> - Assess yourself and others
2. <strong>Call 911</strong> for serious injuries or significant damage
3. <strong>Move to safety</strong> - Get away from traffic if possible
4. <strong>Turn off engines</strong> - Reduce fire risk
5. <strong>Turn on hazard lights</strong> - Warning to other drivers
6. <strong>Exchange information</strong> - Names, phone, insurance, license plate
7. <strong>Document scene</strong> - Photos of all vehicles, damages, road conditions
8. <strong>Get witness info</strong> - Names and contacts of bystanders
9. <strong>Don't admit fault</strong> - Let insurance investigate
10. <strong>Keep records</strong> - Medical reports, repair estimates, police report

Safety first, paperwork second. Protect yourself and others!`
    },
    general: {
        keywords: [],
        response: `Hello! I'm ResQAI, your emergency response AI assistant.

I can help with guidance on:
🔥 Fire safety and evacuation
🚑 Medical emergencies and first aid
💧 Flood safety and water disasters
🚗 Vehicle accidents and traffic incidents
⚠️ General emergency preparedness

What type of emergency are you concerned about? Just ask me!`
    }
};

function getAIResponse(userMessage) {
    const lower = userMessage.toLowerCase();

    // Check for fire-related keywords
    if (fallbackResponses.fire.keywords.some(k => lower.includes(k))) {
        return fallbackResponses.fire.response;
    }

    // Check for medical-related keywords
    if (fallbackResponses.medical.keywords.some(k => lower.includes(k))) {
        return fallbackResponses.medical.response;
    }

    // Check for flood-related keywords
    if (fallbackResponses.flood.keywords.some(k => lower.includes(k))) {
        return fallbackResponses.flood.response;
    }

    // Check for accident-related keywords
    if (fallbackResponses.accident.keywords.some(k => lower.includes(k))) {
        return fallbackResponses.accident.response;
    }

    // Default response
    return fallbackResponses.general.response;
}
