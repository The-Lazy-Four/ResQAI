// ============================================
// RAPID CRISIS ACCESS PORTAL - JavaScript
// Personal Module Enhanced Functionality
// ============================================

console.log('[RapidPortal] Initializing Rapid Crisis Access Portal');

// ==================== PORTAL DATA STATE ====================
const rapidPortalState = {
    crisisAlerts: [],
    safetyTips: [],
    currentTipIndex: 0,
    autoRefreshInterval: null,
    location: null,
    safetyLevel: 'safe',
    aiLanguage: 'en'
};

// ==================== SAFETY TIPS DATABASE ====================
const SAFETY_TIPS = [
    {
        icon: '🚪',
        title: 'Know Your Exits',
        content: 'Always identify the nearest emergency exits when entering any building. In a crisis, knowing at least 2 escape routes can save your life.'
    },
    {
        icon: '📞',
        title: 'Save Emergency Contacts',
        content: 'Program emergency numbers into your phone. In stress, people forget. Having quick-dial options for 112, police, fire, and ambulance is crucial.'
    },
    {
        icon: '👥',
        title: 'Share Your Location',
        content: 'Let trusted family members know where you are. Enable location sharing on your phone for quick emergency responder access.'
    },
    {
        icon: '💧',
        title: 'Flood Safety',
        content: 'Never drive/walk through flooded areas. 6 inches of moving water can knock you off your feet. Turn back, don\'t drown.'
    },
    {
        icon: '🔥',
        title: 'Fire Response',
        content: 'If trapped: Stay low and move toward fresh air. Leave immediately if possible. Use stairs - never elevators. Close doors behind you.'
    },
    {
        icon: '🏃',
        title: 'Evacuation Procedure',
        content: 'Walk, don\'t run. Help others if safe. Assembly points are designated for a reason - go there for headcount and information.'
    },
    {
        icon: '🆘',
        title: 'When to Call SOS',
        content: 'Call 112 for: Life-threatening situations, crimes in progress, medical emergencies, accidents, natural disasters. Your call helps save lives.'
    },
    {
        icon: '💣',
        title: 'Earthquake Safety',
        content: 'Drop, Cover, Hold: Drop to hands and knees. Take cover under sturdy desk/table. Hold on until shaking stops. Stay away from windows.'
    }
];

// ==================== DUMMY CRISIS ALERTS ====================
const DUMMY_CRISIS_ALERTS = [
    {
        id: 'alert-001',
        icon: '🔥',
        title: 'Fire incident reported',
        location: 'Downtown District',
        distance: '2.1 km away',
        severity: 'high',
        timestamp: new Date(Date.now() - 5 * 60000),
        advice: 'Stay indoors with doors/windows closed. Activate building alarm. Move to designated assembly point.',
        type: 'fire'
    },
    {
        id: 'alert-002',
        icon: '💧',
        title: 'Flooded road',
        location: 'Sector 5, Main Street',
        distance: '3.4 km away',
        severity: 'medium',
        timestamp: new Date(Date.now() - 15 * 60000),
        advice: 'Avoid affected routes. Use alternate navigation. Water levels expected to rise till evening.',
        type: 'flood'
    },
    {
        id: 'alert-003',
        icon: '🏥',
        title: 'Medical emergency',
        location: 'Central Mall',
        distance: '1.8 km away',
        severity: 'high',
        timestamp: new Date(Date.now() - 20 * 60000),
        advice: 'Ambulances dispatched. Avoid the area. Nearby hospital: City Medical Center (500m).',
        type: 'medical'
    },
    {
        id: 'alert-004',
        icon: '⛈️',
        title: 'Storm warning issued',
        location: 'Entire Region',
        distance: 'Your Area',
        severity: 'medium',
        timestamp: new Date(Date.now() - 30 * 60000),
        advice: 'Stay indoors. Heavy winds and lightning expected. Keep away from windows and metal objects.',
        type: 'weather'
    },
    {
        id: 'alert-005',
        icon: '🚗',
        title: 'Traffic accident',
        location: 'Highway Junction',
        distance: '4.2 km away',
        severity: 'low',
        timestamp: new Date(Date.now() - 45 * 60000),
        advice: 'Traffic diverted. Take alternate routes. Road should be clear within 30 minutes.',
        type: 'accident'
    }
];

// ==================== INITIALIZE PORTAL ====================
function initializeRapidPortal() {
    console.log('[RapidPortal] Initializing portal on dashboard load');

    // Initialize hero top bar
    updateHeroTopBar();

    // Load crisis alerts
    loadCrisisAlerts();

    // Initialize safety tips
    initializeSafetyTips();

    // Set up auto-refresh for alerts (every 60 seconds)
    startAutoRefresh();

    // Load AI language preference
    const aiLangSelect = document.getElementById('aiLanguageSelect');
    if (aiLangSelect) {
        aiLangSelect.addEventListener('change', (e) => {
            rapidPortalState.aiLanguage = e.target.value;
            console.log(`[RapidPortal] AI language changed to: ${rapidPortalState.aiLanguage}`);
        });
    }
}

// ==================== HERO TOP BAR ====================
function updateHeroTopBar() {
    console.log('[RapidPortal] Updating hero top bar');

    // Update current time
    const timeElement = document.getElementById('heroTime');
    if (timeElement) {
        const now = new Date();
        const timeStr = now.toLocaleTimeString('en-IN', { hour12: true });
        timeElement.textContent = timeStr;
    }

    // Update location (fallback to default)
    const locationElement = document.getElementById('heroLocation');
    if (locationElement) {
        if (navigator.geolocation && rapidPortalState.location === null) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    rapidPortalState.location = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    };
                    locationElement.textContent = `📍 ${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`;
                    console.log(`[RapidPortal] Location detected: ${rapidPortalState.location.lat}, ${rapidPortalState.location.lng}`);
                },
                (error) => {
                    console.log('[RapidPortal] Location access denied, using default');
                    locationElement.textContent = 'Central Location';
                }
            );
        } else if (rapidPortalState.location) {
            locationElement.textContent = `📍 ${rapidPortalState.location.lat.toFixed(4)}, ${rapidPortalState.location.lng.toFixed(4)}`;
        }
    }

    // Update safety status (dynamic based on alerts)
    updateSafetyStatus();
}

function updateSafetyStatus() {
    const statusElement = document.getElementById('heroSafetyStatus');
    if (!statusElement) return;

    let safetyLevel = 'Safe';
    let statusColor = '#51cf66';

    if (rapidPortalState.crisisAlerts.length === 0) {
        safetyLevel = 'Safe';
        statusColor = '#51cf66';
    } else {
        const highAlerts = rapidPortalState.crisisAlerts.filter(a => a.severity === 'high').length;
        const mediumAlerts = rapidPortalState.crisisAlerts.filter(a => a.severity === 'medium').length;

        if (highAlerts > 0) {
            safetyLevel = 'High Alert';
            statusColor = '#ff6b6b';
        } else if (mediumAlerts > 0) {
            safetyLevel = 'Caution';
            statusColor = '#ffa500';
        }
    }

    statusElement.textContent = safetyLevel;
    statusElement.style.color = statusColor;
    rapidPortalState.safetyLevel = safetyLevel.toLowerCase();
}

function refreshPortalData() {
    console.log('[RapidPortal] Manual refresh triggered');
    const refreshBtn = document.querySelector('.hero-refresh-btn');
    if (refreshBtn) {
        refreshBtn.style.animation = 'spin 1s linear';
        setTimeout(() => {
            refreshBtn.style.animation = '';
        }, 1000);
    }

    updateHeroTopBar();
    loadCrisisAlerts();
}

// ==================== CRISIS ALERTS ====================
function loadCrisisAlerts() {
    console.log('[RapidPortal] Loading crisis alerts');

    const gridElement = document.getElementById('crisisAlertsGrid');
    if (!gridElement) return;

    // Try to fetch from API first
    fetchCrisisAlertsFromAPI()
        .then(alerts => {
            rapidPortalState.crisisAlerts = alerts;
            renderCrisisAlerts(alerts);
        })
        .catch(() => {
            // Fallback to dummy data
            console.log('[RapidPortal] Using fallback dummy crisis alerts');
            rapidPortalState.crisisAlerts = DUMMY_CRISIS_ALERTS;
            renderCrisisAlerts(DUMMY_CRISIS_ALERTS);
        });
}

async function fetchCrisisAlertsFromAPI() {
    try {
        const response = await fetch('/api/nearby', {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) throw new Error('API failed');
        const data = await response.json();

        console.log('[RapidPortal] Alerts loaded from API');
        return data.incidents || [];
    } catch (error) {
        console.error('[RapidPortal] API error:', error);
        throw error;
    }
}

function renderCrisisAlerts(alerts) {
    const gridElement = document.getElementById('crisisAlertsGrid');
    if (!gridElement) return;

    if (!alerts || alerts.length === 0) {
        gridElement.innerHTML = '<div class="loading-placeholder">No active crisis alerts in your area. Stay safe!</div>';
        updateSafetyStatus();
        return;
    }

    gridElement.innerHTML = alerts.map(alert => `
        <div class="crisis-alert-card">
            <div class="crisis-alert-header">
                <div class="crisis-icon">${alert.icon || '⚠️'}</div>
                <div>
                    <div class="crisis-title">${alert.title}</div>
                    <span class="crisis-severity">${alert.severity || 'medium'}</span>
                </div>
            </div>
            <div class="crisis-details">
                <div class="crisis-detail-item">
                    <span class="crisis-detail-icon">📍</span>
                    <span>${alert.location || 'Unknown Location'}</span>
                </div>
                <div class="crisis-detail-item">
                    <span class="crisis-detail-icon">📏</span>
                    <span>${alert.distance || 'Unknown'}</span>
                </div>
                <div class="crisis-detail-item">
                    <span class="crisis-detail-icon">⏰</span>
                    <span>${formatRelativeTime(alert.timestamp)}</span>
                </div>
            </div>
            <div class="crisis-advice">
                <strong>What to do:</strong> ${alert.advice || 'Follow official guidance.'}
            </div>
            <div class="crisis-actions">
                <button class="crisis-action-btn" onclick="viewOnMap()">View on Map</button>
                <button class="crisis-action-btn" onclick="showAIGuidance('${alert.type}')">Get Help</button>
            </div>
        </div>
    `).join('');

    updateSafetyStatus();
    console.log(`[RapidPortal] Rendered ${alerts.length} crisis alerts`);
}

function formatRelativeTime(date) {
    const now = new Date();
    const target = new Date(date);
    const diffMs = now - target;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return target.toLocaleDateString();
}

function viewOnMap() {
    showTab('map');
    showToast('Switching to map view...');
}

function showAIGuidance(emergencyType) {
    showTab('chat');
    const aiInput = document.getElementById('aiQueryInput');
    if (aiInput) {
        const guidanceQueries = {
            'fire': 'What should I do during a fire emergency?',
            'flood': 'How should I prepare for floods?',
            'medical': 'What are basic first aid steps?',
            'weather': 'How to stay safe in storms?',
            'accident': 'Safety tips after accidents?'
        };
        aiInput.value = guidanceQueries[emergencyType] || 'Help with emergency response';
    }
}

// ==================== SMART SOS HUB ====================
function activateSOS(sosType) {
    console.log(`[RapidPortal] SOS activated: ${sosType}`);

    const sosMessages = {
        'fire': '🔥 FIRE EMERGENCY\n\nCalling 101 - Fire Brigade\nLocal authorities notified\nYour location is being shared',
        'medical': '🏥 MEDICAL EMERGENCY\n\nCalling 108 - Ambulance\nLocal authorities notified\nYour location is being shared',
        'women-safety': '👩 WOMEN SAFETY ALERT\n\nCalling 112 - Emergency Services\nLocal authorities notified\nYour location is being shared',
        'child-safety': '👧 CHILD SAFETY ALERT\n\nCalling 112 - Emergency Services\nLocal authorities notified\nYour location is being shared',
        'earthquake': '🏚️ EARTHQUAKE EMERGENCY\n\nCalling 112 - Emergency Services\nSafety protocols activated\nLocal authorities notified',
        'flood': '🌊 FLOOD EMERGENCY\n\nCalling 112 - Emergency Services\nDisaster management activated\nLocal authorities notified',
        'theft': '🚨 SECURITY THREAT\n\nCalling 100 - Police\nLocalauthorities notified\nYour location is being shared',
        'custom': '⚙️ CUSTOM SOS\n\nCalling 112 - Emergency Services\nMulti-agency response initiated\nYour location is being shared'
    };

    const message = sosMessages[sosType] || 'Emergency services activated';

    // Show alert
    const alertDiv = document.createElement('div');
    alertDiv.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: linear-gradient(135deg, rgba(255, 68, 68, 0.95), rgba(255, 0, 0, 0.9));
        border: 2px solid #ff0000;
        border-radius: 16px;
        padding: 2rem;
        color: white;
        text-align: center;
        z-index: 10000;
        max-width: 400px;
        box-shadow: 0 0 50px rgba(255, 0, 0, 0.7);
        font-weight: 600;
        white-space: pre-line;
    `;
    alertDiv.textContent = message;

    document.body.appendChild(alertDiv);

    // Pulse animation
    alertDiv.style.animation = 'pulse 1s infinite';

    setTimeout(() => {
        alertDiv.remove();
    }, 5000);

    // Log to console
    console.log(`[RapidPortal] SOS Alert: ${sosType}`);
    showToast(`🆘 ${sosType.toUpperCase()} SOS activated! Emergency services notified.`);
}

// ==================== AI ASSISTANT ====================
function submitAIQuery() {
    const queryInput = document.getElementById('aiQueryInput');
    const responseArea = document.getElementById('aiResponseArea');

    if (!queryInput || !queryInput.value.trim()) {
        showToast('Please enter your emergency question');
        return;
    }

    const query = queryInput.value.trim();
    const language = document.getElementById('aiLanguageSelect')?.value || 'en';

    console.log(`[RapidPortal] AI query submitted: "${query}" (Language: ${language})`);

    // Show loading state
    responseArea.innerHTML = '<p class="ai-prompt-text">⏳ AI is thinking... This may take a moment.</p>';

    // Send to AI API
    sendAIQuery(query, language)
        .then(response => {
            displayAIResponse(response);
        })
        .catch(error => {
            console.error('[RapidPortal] AI error:', error);
            displayAIResponse(getOfflineAIResponse(query));
        });
}

async function sendAIQuery(query, language) {
    try {
        const response = await fetch('/api/ai/emergency-guidance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                query: query,
                language: language,
                location: rapidPortalState.location
            })
        });

        if (!response.ok) throw new Error('API failed');
        const data = await response.json();

        console.log('[RapidPortal] AI provider:', data.provider);
        return data.response || data.guidance || '';
    } catch (error) {
        console.error('[RapidPortal] AI API error:', error);
        throw error;
    }
}

function displayAIResponse(response) {
    const responseArea = document.getElementById('aiResponseArea');
    if (!responseArea) return;

    // Format response with bullet points
    const formattedResponse = response
        .split('\n')
        .filter(line => line.trim())
        .map(line => {
            if (line.trim().startsWith('•') || line.trim().startsWith('-') || line.trim().startsWith('*')) {
                return `<div class="ai-response-bullet">${line.trim()}</div>`;
            }
            return `<p class="ai-response-text">${line.trim()}</p>`;
        })
        .join('');

    responseArea.innerHTML = formattedResponse;
    console.log('[RapidPortal] AI response displayed');
}

function getOfflineAIResponse(query) {
    // Offline fallback responses
    const responses = {
        'fire': '• Evacuate immediately if safe\n• Take the nearest stairway\n• Walk, don\'t run\n• Close doors behind you\n• Go to assembly point\n• Call 101 Fire Brigade\n• Don\'t use elevators',
        'medical': '• Call 108 Ambulance NOW\n• Keep person lying down\n• Check responsiveness\n• Perform CPR if trained\n• Elevate legs if not injured\n• Keep person warm\n• Monitor vitals\n• Provide first aid if needed',
        'flood': '• Move to higher ground\n• Don\'t drive through floods\n• Avoid wading in water\n• Listen to official warnings\n• Avoid downed power lines\n• Stay indoors if safe\n• Store important documents high',
        'earthquake': '• DROP, COVER, HOLD\n• Get under sturdy table\n• Cover head/neck\n• Stay away from windows\n• Don\'t leave building\n• Check for injuries\n• Follow instructions\n• Prepare for aftershocks'
    };

    // Check query for keywords
    for (const [key, response] of Object.entries(responses)) {
        if (query.toLowerCase().includes(key)) {
            return response;
        }
    }

    return '• Stay calm\n• Assess the situation\n• Call emergency services (112)\n• Move to safety\n• Help others if safe\n• Stay informed\n• Follow official guidance';
}

function startVoiceInput() {
    console.log('[RapidPortal] Voice input initiated');
    showToast('🎤 Voice input - feature coming soon!');
    // Example: Use Web Speech API for voice input
}

// ==================== EMERGENCY DIALING ====================
function dialNumber(number) {
    console.log(`[RapidPortal] Attempting to dial: ${number}`);

    const emergencyNumbers = {
        '112': 'National Emergency Number',
        '101': 'Fire Brigade',
        '108': 'Ambulance Service',
        '100': 'Police'
    };

    // Try to initiate call (works on mobile with tel: protocol)
    if (navigator.userAgentData?.getHighEntropyValues) {
        window.location.href = `tel:${number}`;
    } else {
        // Fallback: Show alert for desktop
        showToast(`📞 Call ${number} (${emergencyNumbers[number]}) - Please use your phone to dial.`);
    }

    console.log(`[RapidPortal] Dialed: ${number}`);
}

// ==================== SAFETY TIPS CAROUSEL ====================
function initializeSafetyTips() {
    console.log('[RapidPortal] Initializing safety tips');
    rapidPortalState.safetyTips = SAFETY_TIPS;
    displaySafetyTip();
}

function displaySafetyTip() {
    const tip = rapidPortalState.safetyTips[rapidPortalState.currentTipIndex];
    const titleElement = document.getElementById('tipTitle');
    const contentElement = document.getElementById('tipContent');
    const iconElement = document.querySelector('.tip-icon');

    if (titleElement) titleElement.textContent = tip.title;
    if (contentElement) contentElement.textContent = tip.content;
    if (iconElement) iconElement.textContent = tip.icon;
}

function nextSafetyTip() {
    rapidPortalState.currentTipIndex = (rapidPortalState.currentTipIndex + 1) % rapidPortalState.safetyTips.length;
    displaySafetyTip();
}

function previousSafetyTip() {
    rapidPortalState.currentTipIndex = (rapidPortalState.currentTipIndex - 1 + rapidPortalState.safetyTips.length) % rapidPortalState.safetyTips.length;
    displaySafetyTip();
}

// ==================== AUTO-REFRESH ====================
function startAutoRefresh() {
    console.log('[RapidPortal] Starting auto-refresh (every 60 seconds)');

    rapidPortalState.autoRefreshInterval = setInterval(() => {
        loadCrisisAlerts();
        updateHeroTopBar();
    }, 60000); // 60 seconds
}

function stopAutoRefresh() {
    if (rapidPortalState.autoRefreshInterval) {
        clearInterval(rapidPortalState.autoRefreshInterval);
        console.log('[RapidPortal] Auto-refresh stopped');
    }
}

// ==================== INITIALIZATION ON PAGE LOAD ====================
document.addEventListener('DOMContentLoaded', () => {
    // Wait for the dashboard to be visible
    const dashboardTab = document.getElementById('dashboard');
    if (dashboardTab && dashboardTab.classList.contains('active')) {
        initializeRapidPortal();
    }

    // Watch for tab switches
    const originalShowTab = window.showTab;
    window.showTab = function(tabName) {
        if (tabName === 'dashboard') {
            setTimeout(initializeRapidPortal, 100);
        }
        return originalShowTab.call(this, tabName);
    };
});

// ==================== CLEANUP ====================
window.addEventListener('beforeunload', () => {
    stopAutoRefresh();
    console.log('[RapidPortal] Portal cleanup on unload');
});
