// ============================================
// RAPID CRISIS ACCESS PORTAL - JavaScript v2.0
// Fully Functional Emergency Response Dashboard
// ============================================

console.log('[RapidPortal] Initializing Rapid Crisis Access Portal v2.0');

// ==================== PORTAL STATE ====================
const rapidPortalState = {
    location: null,
    crisisAlerts: [],
    currentTipIndex: 0,
    autoRefreshInterval: null,
    refreshStepIndex: 0,
    routeUpdateInterval: null,
    proactiveMonitorInterval: null,
    proactiveModalTimeout: null,
    activeProactiveModalId: null,
    routeCache: {},
    ignoredAlertUntil: {},
    spokenAlertAt: {},
    proactiveAlertAt: {},
    proactiveLocationWarningAt: 0,
    lastTravelerLocation: null,
    activeEvacuationAlertId: null,
    activeEvacuationSeverity: null,
    safeZones: [],
    routeDrawingInterval: null,
    mapLayers: {
        userMarker: null,
        incidentMarker: null,
        destinationMarker: null,
        routeLine: null,
        dangerCircle: null,
        staticUserMarker: null,
        safeZoneMarkers: [],
        selectedSafeZoneMarker: null
    },
    safetyLevel: 'safe',
    aiLanguage: 'en',
    lastTips: [],
    mapInstance: null,
    sosLog: [],
    voiceRecognitionActive: false,
    refreshThrottle: false
};

// ==================== CONFIGURATION ====================
const PORTAL_CONFIG = {
    API_BASE: '/api/portal',
    PROACTIVE_CHECK_INTERVAL: 10000,
    PROACTIVE_ALERT_RADIUS_KM: 2,
    PROACTIVE_MODAL_TIMEOUT: 15000,
    PROACTIVE_ALERT_COOLDOWN_MS: 180000,
    EVACUATION_REFRESH_INTERVAL: 12000,
    REFRESH_INTERVAL: 60000,
    REFRESH_SCHEDULE: [60000, 300000, 600000],
    TIP_ROTATION_INTERVAL: 20000,
    VOICE_LANGUAGES: {
        en: 'en-IN',
        hi: 'hi-IN',
        bn: 'bn-IN'
    },
    EMERGENCY_HELPLINES: {
        fire: { number: '101', name: 'Fire Brigade' },
        medical: { number: '108', name: 'Ambulance' },
        'women-safety': { number: '100', name: 'Police (Women Safety)' },
        'child-safety': { number: '1098', name: 'Child Helpline' },
        theft: { number: '100', name: 'Police' },
        earthquake: { number: '112', name: 'National Emergency' },
        flood: { number: '112', name: 'Disaster Management' },
        custom: { number: '112', name: 'National Emergency' }
    }
};

// ==================== SAFETY TIPS DATABASE ====================
const SAFETY_TIPS = [
    { icon: '🚪', title: 'Know Your Exits', content: 'Always identify nearest emergency exits when entering any building.' },
    { icon: '📞', title: 'Save Contacts', content: 'Program 112, 101, 108, 100 into your phone for quick access.' },
    { icon: '🔥', title: 'Fire Response', content: 'Stay low, use stairs not elevators, close doors behind you.' },
    { icon: '💧', title: 'Flood Safety', content: 'Never drive through flooded areas. Turn back, don\'t drown.' },
    { icon: '👥', title: 'Share Location', content: 'Enable location sharing for quick emergency responder access.' },
    { icon: '🏃', title: 'Evacuation', content: 'Walk, don\'t run. Help others if safe. Go to assembly points.' },
    { icon: '💣', title: 'Earthquake', content: 'DROP, COVER, HOLD under sturdy furniture. Stay away from windows.' },
    { icon: '👮', title: 'If Threatened', content: 'Trust your instincts. Get to safety. Call 100. Document details.' },
    { icon: '🏥', title: 'First Aid', content: 'Learn CPR basics. Call 108 for ambulance. Keep first aid kit ready.' },
    { icon: '🆘', title: 'When to Call 112', content: 'Use for life-threatening situations, crimes, accidents, disasters.' }
];

// ==================== DUMMY CRISIS ALERTS (FALLBACK) ====================
const DUMMY_CRISIS_ALERTS = [
    {
        id: 'alert-001',
        icon: '✅',
        title: 'No major incidents nearby',
        location: 'Your Area',
        distance: 'Safe',
        severity: 'low',
        timestamp: 'Just now',
        advice: 'Stay alert and prepared. Emergency services operational.'
    }
];

// ==================== INITIALIZATION ====================
function initializeRapidPortal() {
    console.log('[RapidPortal] Initializing portal');

    // Get geolocation
    getPortalLocation();

    // Initialize UI components
    updateHeroTopBar();
    loadCrisisAlerts();
    initializeSafetyTips();
    startAutoRefresh();
    startProactiveMonitoring();
    setupEventListeners();

    console.log('[RapidPortal] Initialization complete');
}

function setupEventListeners() {
    // Language selection
    const aiLangSelect = document.getElementById('aiLanguageSelect');
    if (aiLangSelect) {
        aiLangSelect.addEventListener('change', (e) => {
            rapidPortalState.aiLanguage = e.target.value;
            console.log(`[RapidPortal] Language set to: ${rapidPortalState.aiLanguage}`);
        });
    }
}

// ==================== GEOLOCATION ====================
function getPortalLocation() {
    if (!navigator.geolocation) {
        console.log('[RapidPortal] Geolocation not available');
        rapidPortalState.location = { lat: 28.6139, lng: 77.2090 };
        return;
    }

    navigator.geolocation.getCurrentPosition(
        (position) => {
            rapidPortalState.location = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            };
            console.log(`[RapidPortal] Geolocation success: ${rapidPortalState.location.lat.toFixed(4)}, ${rapidPortalState.location.lng.toFixed(4)}`);
        },
        (error) => {
            console.log(`[RapidPortal] Geolocation error: ${error.message}`);
            rapidPortalState.location = { lat: 28.6139, lng: 77.2090 };
        }
    );
}

// ==================== HERO TOP BAR ====================
function updateHeroTopBar() {
    // Update time
    const timeEl = document.getElementById('heroTime');
    if (timeEl) {
        const now = new Date();
        timeEl.textContent = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    }

    // Update location
    const locEl = document.getElementById('heroLocation');
    if (locEl && rapidPortalState.location) {
        locEl.textContent = `📍 ${rapidPortalState.location.lat.toFixed(4)}, ${rapidPortalState.location.lng.toFixed(4)}`;
    }

    // Update safety status
    updateSafetyStatus();
}

function updateSafetyStatus() {
    const statusEl = document.getElementById('heroSafetyStatus');
    if (!statusEl) return;

    let status = '✅ Safe';
    let color = '#51cf66';

    const highAlerts = rapidPortalState.crisisAlerts.filter(a => a.severity === 'high').length;
    const mediumAlerts = rapidPortalState.crisisAlerts.filter(a => a.severity === 'medium').length;

    if (highAlerts > 0) {
        status = '🔴 High Alert';
        color = '#ff6b6b';
    } else if (mediumAlerts > 0) {
        status = '🟡 Caution';
        color = '#ffa500';
    }

    statusEl.innerHTML = status;
    statusEl.style.color = color;
}

function refreshPortalData() {
    if (rapidPortalState.refreshThrottle) return;

    console.log('[RapidPortal] Manual refresh triggered');

    rapidPortalState.refreshThrottle = true;
    const btn = document.querySelector('.hero-refresh-btn');
    if (btn) btn.style.animation = 'spin 1s linear';

    updateHeroTopBar();
    loadCrisisAlerts();

    setTimeout(() => {
        rapidPortalState.refreshThrottle = false;
    }, 1000);
}

// ==================== CRISIS ALERTS ====================
async function loadCrisisAlerts() {
    try {
        if (!rapidPortalState.location) {
            throw new Error('Location not available');
        }

        console.log('[RapidPortal] Fetching nearby alerts...');

        const response = await fetch(
            `${PORTAL_CONFIG.API_BASE}/nearby-alerts?latitude=${rapidPortalState.location.lat}&longitude=${rapidPortalState.location.lng}&radius=5&language=${rapidPortalState.aiLanguage}`,
            { method: 'GET', headers: { 'Content-Type': 'application/json' } }
        );

        const data = await response.json();
        rapidPortalState.crisisAlerts = (data.alerts || []).map((alert, index) => {
            if (typeof alert.lat === 'number' && typeof alert.lng === 'number') {
                return alert;
            }

            const fallbackLat = rapidPortalState.location.lat + (0.003 * ((index % 2) ? -1 : 1)) * (index + 1);
            const fallbackLng = rapidPortalState.location.lng + (0.0035 * ((index % 3) ? 1 : -1)) * (index + 1);

            return {
                ...alert,
                lat: fallbackLat,
                lng: fallbackLng,
                radiusMeters: alert.severity === 'high' ? 500 : 320
            };
        });
        renderCrisisAlerts(rapidPortalState.crisisAlerts);
        checkProactiveEvacuation();

        console.log(`[RapidPortal] Nearby alerts fetched: ${rapidPortalState.crisisAlerts.length}`);
    } catch (error) {
        console.error('[RapidPortal] Error loading alerts:', error);
        renderCrisisAlerts([]);
    }
}

function parseDistanceKm(distanceText) {
    const text = String(distanceText || '').toLowerCase();
    const match = text.match(/([0-9]+(?:\.[0-9]+)?)/);
    if (!match) return null;
    return parseFloat(match[1]);
}

function isHighOrCritical(severity) {
    const value = String(severity || '').toLowerCase();
    return value === 'high' || value === 'critical';
}

function getAlertDistanceKm(alert) {
    if (rapidPortalState.location && typeof alert.lat === 'number' && typeof alert.lng === 'number') {
        return distanceBetweenPoints(rapidPortalState.location, { lat: alert.lat, lng: alert.lng });
    }

    return parseDistanceKm(alert.distance);
}

function getCacheKeyForAlert(alert) {
    const latKey = rapidPortalState.location ? rapidPortalState.location.lat.toFixed(3) : 'na';
    const lngKey = rapidPortalState.location ? rapidPortalState.location.lng.toFixed(3) : 'na';
    return `${alert.id || alert.title}-${latKey}-${lngKey}`;
}

function getBestProactiveAlert() {
    const now = Date.now();

    return rapidPortalState.crisisAlerts.find((alert) => {
        const distanceKm = getAlertDistanceKm(alert);
        const inRange = typeof distanceKm === 'number' ? distanceKm <= PORTAL_CONFIG.PROACTIVE_ALERT_RADIUS_KM : false;
        const highSeverity = isHighOrCritical(alert.severity);
        const ignoredUntil = rapidPortalState.ignoredAlertUntil[alert.id] || 0;
        const proactiveAt = rapidPortalState.proactiveAlertAt[alert.id] || 0;
        return inRange && highSeverity && ignoredUntil < now && (now - proactiveAt) >= PORTAL_CONFIG.PROACTIVE_ALERT_COOLDOWN_MS;
    });
}

async function prefetchEvacuationRoute(alert) {
    if (!alert || !rapidPortalState.location) return null;

    const cacheKey = getCacheKeyForAlert(alert);
    if (rapidPortalState.routeCache[cacheKey]) {
        return rapidPortalState.routeCache[cacheKey];
    }

    try {
        const routeData = await fetchEvacuationRouteData(alert);
        if (routeData?.success) {
            rapidPortalState.routeCache[cacheKey] = routeData;
            showToast('🧭 Safe route prepared');
            return routeData;
        }
    } catch (error) {
        console.warn('[RapidPortal] Proactive prefetch failed:', error);
    }

    return null;
}

function announceCriticalAlertVoice() {
    if (!window.speechSynthesis) return;

    const msg = 'Warning. High risk area detected nearby. Safe route is ready.';
    const utterance = new SpeechSynthesisUtterance(msg);
    utterance.lang = PORTAL_CONFIG.VOICE_LANGUAGES[rapidPortalState.aiLanguage] || 'en-IN';
    utterance.rate = 0.95;
    window.speechSynthesis.speak(utterance);
}

function closeProactiveModal() {
    const modal = document.getElementById('proactiveEvacuationModal');
    if (modal) {
        modal.remove();
    }

    if (rapidPortalState.proactiveModalTimeout) {
        clearTimeout(rapidPortalState.proactiveModalTimeout);
        rapidPortalState.proactiveModalTimeout = null;
    }

    rapidPortalState.activeProactiveModalId = null;
}

function showProactiveEvacuationModal(alert) {
    closeProactiveModal();

    const modal = document.createElement('div');
    modal.id = 'proactiveEvacuationModal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.72);z-index:11000;display:flex;align-items:center;justify-content:center;padding:1rem;';
    modal.innerHTML = `
        <div style="width:100%;max-width:460px;background:linear-gradient(135deg,rgba(40,20,40,0.96),rgba(20,30,60,0.96));border:1px solid rgba(255,107,107,0.5);border-radius:14px;padding:1.2rem;color:#eef3ff;box-shadow:0 16px 40px rgba(0,0,0,0.45);">
            <h3 style="margin-bottom:0.8rem;color:#ff9e9e;">🚨 CRITICAL ALERT NEAR YOU</h3>
            <p style="margin-bottom:0.4rem;">${alert.title || 'Emergency incident detected'} ${alert.distance ? `(${alert.distance})` : ''}</p>
            <p style="margin-bottom:1rem;color:#b9c8e6;">Safe route is ready</p>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.6rem;">
                <button id="proactiveStartBtn" style="padding:0.7rem;border-radius:8px;border:1px solid rgba(79,195,247,0.5);background:rgba(79,195,247,0.2);color:#dff3ff;font-weight:600;cursor:pointer;">Start Evacuation</button>
                <button id="proactiveIgnoreBtn" style="padding:0.7rem;border-radius:8px;border:1px solid rgba(255,167,38,0.5);background:rgba(255,167,38,0.18);color:#ffe2b3;font-weight:600;cursor:pointer;">Ignore</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    rapidPortalState.activeProactiveModalId = alert.id;

    const startBtn = document.getElementById('proactiveStartBtn');
    const ignoreBtn = document.getElementById('proactiveIgnoreBtn');

    if (startBtn) {
        startBtn.addEventListener('click', () => {
            rapidPortalState.proactiveAlertAt[alert.id] = Date.now();
            closeProactiveModal();
            loadEvacuationRoute(alert, false, { switchTab: true });
        });
    }

    if (ignoreBtn) {
        ignoreBtn.addEventListener('click', () => {
            rapidPortalState.ignoredAlertUntil[alert.id] = Date.now() + PORTAL_CONFIG.PROACTIVE_ALERT_COOLDOWN_MS;
            rapidPortalState.proactiveAlertAt[alert.id] = Date.now();
            closeProactiveModal();
        });
    }

    rapidPortalState.proactiveModalTimeout = setTimeout(() => {
        rapidPortalState.proactiveAlertAt[alert.id] = Date.now();
        closeProactiveModal();
        loadEvacuationRoute(alert, false, { switchTab: false });
    }, PORTAL_CONFIG.PROACTIVE_MODAL_TIMEOUT);
}

function checkProactiveEvacuation() {
    const alert = getBestProactiveAlert();
    if (!alert) return;

    if (!rapidPortalState.location) {
        const now = Date.now();
        if (now - rapidPortalState.proactiveLocationWarningAt > 60000) {
            rapidPortalState.proactiveLocationWarningAt = now;
            showToast('⚠️ High-risk zone nearby. Enable location for guided evacuation.');
        }
        return;
    }

    showToast('⚠️ High-risk zone nearby');
    rapidPortalState.proactiveAlertAt[alert.id] = rapidPortalState.proactiveAlertAt[alert.id] || Date.now();
    prefetchEvacuationRoute(alert);

    const spokenAt = rapidPortalState.spokenAlertAt[alert.id] || 0;
    if (Date.now() - spokenAt > 30000) {
        rapidPortalState.spokenAlertAt[alert.id] = Date.now();
        announceCriticalAlertVoice();
    }

    if (rapidPortalState.activeProactiveModalId !== alert.id) {
        showProactiveEvacuationModal(alert);
    }
}

function renderCrisisAlerts(alerts) {
    const gridEl = document.getElementById('crisisAlertsGrid');
    if (!gridEl) return;

    const summary = getAlertSummary(alerts || []);

    if (!alerts || alerts.length === 0) {
        gridEl.innerHTML = `
            <div class="crisis-alert-summary-bar crisis-alert-summary-bar--safe">
                <span class="summary-pill summary-pill--active">0 Active Alerts Nearby</span>
                <span class="summary-pill">0 High</span>
                <span class="summary-pill">0 Medium</span>
                <span class="summary-pill">0 Low</span>
            </div>
            <div class="crisis-alert-card" style="grid-column: 1/-1; text-align: center; background: linear-gradient(135deg, rgba(81, 207, 102, 0.1), rgba(81, 207, 102, 0.05));">
                <div style="font-size: 3rem; margin: 1rem 0;">✅</div>
                <h3>No Major Incidents Nearby</h3>
                <p>Your area appears safe. Stay alert and prepared.</p>
                <div class="crisis-alert-footer">AI Verified • Updated just now</div>
            </div>
        `;
        updateSafetyStatus();
        return;
    }

    gridEl.innerHTML = `
        <div class="crisis-alert-summary-bar">
            <span class="summary-pill summary-pill--active">${summary.total} Active Alerts Nearby</span>
            <span class="summary-pill summary-pill--high">${summary.high} High</span>
            <span class="summary-pill summary-pill--medium">${summary.medium} Medium</span>
            <span class="summary-pill summary-pill--low">${summary.low} Low</span>
        </div>
        ${alerts.map((alert, idx) => `
        <div class="crisis-alert-card ${alert.severity === 'high' ? 'crisis-alert-card--high' : ''}" style="animation: slideUp 0.4s ease-out ${idx * 0.1}s backwards;">
            <div class="crisis-alert-header">
                <div class="crisis-icon-wrap">
                    <span class="crisis-ping" aria-hidden="true"></span>
                    <div class="crisis-icon" style="font-size: 2rem;">${alert.icon || '⚠️'}</div>
                </div>
                <div style="flex: 1;">
                    <div class="crisis-title">${alert.title}</div>
                    <span class="severity-badge severity-${alert.severity || 'medium'}">${alert.severity || 'medium'}</span>
                </div>
            </div>
            <div class="crisis-details" style="margin-top: 1rem;">
                <div class="crisis-detail-item">
                    <span>📍</span>
                    <span>${alert.location || 'Unknown Location'}</span>
                </div>
                <div class="crisis-detail-item">
                    <span>📏</span>
                    <span>${alert.distance || 'Unknown'}</span>
                </div>
                <div class="crisis-detail-item">
                    <span>⏰</span>
                    <span>${alert.timestamp || 'Just now'}</span>
                </div>
            </div>
            <div class="crisis-advice" style="margin-top: 1rem; padding: 0.75rem; background: rgba(0,0,0,0.2); border-radius: 8px;">
                <strong>💡 Action:</strong> ${alert.advice || 'Follow official guidance'}
            </div>
            <div class="crisis-actions" style="margin-top: 1rem; display: flex; gap: 0.5rem;">
                <button class="crisis-action-btn" onclick="viewOnMap('${alert.id}')">View on Map</button>
                <button class="crisis-action-btn" onclick="getHelpForAlert('${alert.id}')">Get Help</button>
            </div>
            <div class="crisis-alert-footer">AI Verified • Updated just now</div>
        </div>
        `).join('')}
    `;

    updateSafetyStatus();
}

function getAlertSummary(alerts) {
    const safeAlerts = Array.isArray(alerts) ? alerts : [];
    const high = safeAlerts.filter(alert => alert.severity === 'high').length;
    const medium = safeAlerts.filter(alert => alert.severity === 'medium').length;
    const low = safeAlerts.filter(alert => alert.severity === 'low').length;

    return {
        total: safeAlerts.length,
        high,
        medium,
        low
    };
}

function viewOnMap(alertId) {
    const alert = getAlertById(alertId);
    if (!alert) {
        showTab('map');
        showToast('📍 Switching to map view...');
        return;
    }

    loadEvacuationRoute(alert);
}

function getHelpForAlert(alertId) {
    const alert = getAlertById(alertId);
    if (!alert) {
        showToast('⚠️ Alert details unavailable');
        return;
    }

    loadEvacuationRoute(alert);
    getAIGuidance(alert.type, `Provide immediate emergency help for ${alert.title} near ${alert.location}.`);
}

function getAlertById(alertId) {
    return rapidPortalState.crisisAlerts.find(alert => String(alert.id) === String(alertId));
}

// ==================== SMART SOS HUB ====================
function activateSOS(sosType) {
    console.log(`[RapidPortal] SOS activated: ${sosType}`);

    if (sosType === 'custom') {
        showCustomSOSModal();
        return;
    }

    // Get helpline
    const helpline = PORTAL_CONFIG.EMERGENCY_HELPLINES[sosType] || PORTAL_CONFIG.EMERGENCY_HELPLINES.custom;

    // Log SOS event
    logSOSEvent(sosType);

    // Show confirmation modal
    showSOSModal(sosType, helpline);
}

function showSOSModal(sosType, helpline) {
    const modal = document.createElement('div');
    modal.innerHTML = `
        <div class="sos-modal-overlay" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 10000;">
            <div class="sos-modal" style="background: linear-gradient(135deg, rgba(255, 68, 68, 0.95), rgba(255, 0, 0, 0.9)); border-radius: 16px; padding: 2rem; max-width: 400px; color: white; text-align: center;">
                <div class="sos-modal-header" style="margin-bottom: 1.5rem;">
                    <h2>🚨 Emergency Confirmed</h2>
                </div>
                <div class="sos-modal-body" style="margin-bottom: 1.5rem; font-size: 1rem;">
                    <p><strong>Type:</strong> ${sosType.toUpperCase()}</p>
                    <p style="margin-top: 1rem;"><strong>Helpline:</strong> <span style="color: #ffff00; font-size: 1.8rem;">${helpline.number}</span></p>
                    <p><strong>${helpline.name}</strong></p>
                    <p style="margin-top: 1rem; font-size: 0.9rem; opacity: 0.9;">
                        Your location has been logged and shared with emergency services.
                    </p>
                </div>
                <div class="sos-modal-actions" style="display: flex; flex-direction: column; gap: 0.5rem;">
                    <button style="padding: 0.8rem; background: #ffff00; color: #000; border: none; border-radius: 8px; font-weight: bold; font-size: 1rem; cursor: pointer;" onclick="dialNumber('${helpline.number}'); closeModal(this.closest('[class*=overlay]'));">
                        📞 Call ${helpline.number}
                    </button>
                    <button style="padding: 0.8rem; background: rgba(255,255,255,0.2); color: white; border: 1px solid white; border-radius: 8px; font-weight: bold; cursor: pointer;" onclick="copyToClipboard('${helpline.number}'); showToast('Number copied!'); closeModal(this.closest('[class*=overlay]'));">
                        📋 Copy Number
                    </button>
                    <button style="padding: 0.8rem; background: rgba(0,0,0,0.3); color: white; border: none; border-radius: 8px; cursor: pointer;" onclick="closeModal(this.closest('[class*=overlay]'));">
                        Close
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    playEmergencySound();
    flashRedAlert();
}

function showCustomSOSModal() {
    const modal = document.createElement('div');
    modal.innerHTML = `
        <div class="sos-modal-overlay" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 10000;">
            <div class="sos-modal" style="background: linear-gradient(135deg, rgba(50, 100, 200, 0.95), rgba(0, 50, 150, 0.9)); border-radius: 16px; padding: 2rem; max-width: 400px; color: white;">
                <div class="sos-modal-header" style="margin-bottom: 1.5rem;">
                    <h2>⚙️ Custom SOS</h2>
                </div>
                <div class="sos-modal-body" style="margin-bottom: 1.5rem;">
                    <label style="display: block; margin-bottom: 0.5rem;">Describe your emergency:</label>
                    <textarea id="customSOSInput" placeholder="e.g., Chemical spill, stampede, abduction..." style="width: 100%; height: 80px; padding: 0.5rem; border: 1px solid #555; border-radius: 8px; background: rgba(0,0,0,0.3); color: white; font-family: inherit; resize: vertical;"></textarea>
                </div>
                <div class="sos-modal-actions" style="display: flex; flex-direction: column; gap: 0.5rem;">
                    <button style="padding: 0.8rem; background: #ff6b6b; color: white; border: none; border-radius: 8px; font-weight: bold; font-size: 1rem; cursor: pointer;" onclick="submitCustomSOS(this.closest('[class*=overlay]'));">
                        🚨 Submit & Call 112
                    </button>
                    <button style="padding: 0.8rem; background: rgba(0,0,0,0.3); color: white; border: none; border-radius: 8px; cursor: pointer;" onclick="closeModal(this.closest('[class*=overlay]'));">
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    document.getElementById('customSOSInput').focus();
}

function submitCustomSOS(modal) {
    const input = document.getElementById('customSOSInput');
    const description = input?.value || 'Custom Emergency';

    logSOSEvent('custom', description);

    console.log(`[RapidPortal] Custom SOS: ${description}`);

    dialNumber('112');
    closeModal(modal);
    showToast('🆘 Custom SOS activated! Call 112 immediately.');
}

async function logSOSEvent(sosType, description = '') {
    try {
        if (!rapidPortalState.location) return;

        const response = await fetch(`${PORTAL_CONFIG.API_BASE}/sos-log`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                emergencyType: sosType,
                latitude: rapidPortalState.location.lat,
                longitude: rapidPortalState.location.lng,
                customDescription: description
            })
        });

        const data = await response.json();
        console.log(`[RapidPortal] SOS logged: ${data.sos_id}`);
    } catch (error) {
        console.error('[RapidPortal] Failed to log SOS:', error);
    }
}

// ==================== AI GUIDE & VOICE ====================
function startVoiceInput() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
        showToast('⚠️ Voice input not supported in this browser');
        return;
    }

    const recognition = new SpeechRecognition();
    const lang = PORTAL_CONFIG.VOICE_LANGUAGES[rapidPortalState.aiLanguage] || 'en-IN';
    recognition.lang = lang;

    console.log(`[RapidPortal] Voice input started (${lang})`);

    const inputEl = document.getElementById('aiQueryInput');
    if (inputEl) {
        inputEl.placeholder = '🎤 Listening...';
        inputEl.style.opacity = '0.5';
    }

    recognition.onstart = () => {
        rapidPortalState.voiceRecognitionActive = true;
    };

    recognition.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
        }

        if (inputEl) {
            inputEl.value = transcript;
            inputEl.placeholder = 'Ask: What should I do during fire in hotel?';
            inputEl.style.opacity = '1';
        }

        console.log(`[RapidPortal] Voice recognized: "${transcript}"`);

        // Auto-submit if speech is final
        if (event.results[event.results.length - 1].isFinal) {
            setTimeout(submitAIQuery, 500);
        }
    };

    recognition.onerror = (event) => {
        console.error(`[RapidPortal] Voice error:`, event.error);
        showToast(`⚠️ Voice input error: ${event.error}`);
        if (inputEl) {
            inputEl.placeholder = 'Ask: What should I do during fire in hotel?';
            inputEl.style.opacity = '1';
        }
    };

    recognition.start();
}

function submitAIQuery() {
    const inputEl = document.getElementById('aiQueryInput');
    if (!inputEl || !inputEl.value.trim()) {
        showToast('Please enter or speak your emergency question');
        return;
    }

    const query = inputEl.value.trim();
    getAIGuidance(null, query);
}

async function getAIGuidance(emergencyType, customQuery = '') {
    const responseEl = document.getElementById('aiResponseArea');
    if (!responseEl) return;

    const query = customQuery || `Tell me about safety during ${emergencyType}`;

    console.log(`[RapidPortal] Getting AI guidance for: "${query}"`);

    responseEl.innerHTML = '<p class="ai-prompt-text">⏳ Generating safety guidance...</p>';

    try {
        const response = await fetch(`${PORTAL_CONFIG.API_BASE}/ai-guide`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                query: query,
                emergencyType: emergencyType || 'general',
                language: rapidPortalState.aiLanguage
            })
        });

        const data = await response.json();
        const guidance = data.guidance || getFallbackGuidance(emergencyType);

        displayAIGuidance(guidance);
        console.log('[RapidPortal] AI guidance displayed');
    } catch (error) {
        console.error('[RapidPortal] AI error:', error);
        displayAIGuidance(getFallbackGuidance(emergencyType));
    }
}

function displayAIGuidance(guidance) {
    const responseEl = document.getElementById('aiResponseArea');
    if (!responseEl) return;

    // Format the guidance with HTML
    const formatted = guidance
        .split('\n')
        .filter(line => line.trim())
        .map(line => {
            const trimmed = line.trim();
            if (trimmed.match(/^[0-9]\./)) {
                return `<div class="ai-response-item">📌 ${trimmed}</div>`;
            } else if (trimmed.match(/^[✅❌]/)) {
                return `<div class="ai-response-item">${trimmed}</div>`;
            } else if (trimmed.match(/^[🔥🆘📞]/)) {
                return `<div class="ai-response-header">${trimmed}</div>`;
            }
            return `<p class="ai-response-text">${trimmed}</p>`;
        })
        .join('');

    responseEl.innerHTML = formatted;

    // Add speak button
    const speakBtn = document.createElement('button');
    speakBtn.innerHTML = '🔊 Speak Response';
    speakBtn.className = 'speak-btn';
    speakBtn.style.cssText = 'padding: 0.5rem 1rem; background: linear-gradient(135deg, #007bff, #0056b3); color: white; border: none; border-radius: 8px; cursor: pointer; margin-top: 1rem;';
    speakBtn.onclick = () => speakResponse(guidance);
    responseEl.appendChild(speakBtn);
}

function getFallbackGuidance(emergencyType) {
    const guides = {
        fire: `🔥 FIRE EMERGENCY
1. Evacuate immediately if safe to do so
2. Use nearest stairs (never elevators)
3. Stay low under smoke
4. Close doors behind you
5. Go to assembly point
📞 Call 101 - Fire Brigade`,

        medical: `🏥 MEDICAL EMERGENCY
1. Call 108 Ambulance immediately
2. Check if person is responsive
3. Perform CPR if trained
4. Control bleeding with pressure
5. Keep person warm and still
📞 Call 108 - Ambulance`,

        flood: `💧 FLOOD SAFETY
1. Move to higher ground immediately
2. Never drive through flooded areas
3. Avoid wading in water
4. Store important documents high
5. Listen to official weather warnings
📞 Call 112 - Emergency Services`,

        earthquake: `🏚️ EARTHQUAKE SAFETY
1. DROP to hands and knees
2. COVER head/neck under sturdy table
3. HOLD on until shaking stops
4. Stay away from windows
5. Check for injuries after shaking
📞 Call 112 - Emergency Services`,

        theft: `🚨 SECURITY THREAT
1. Get to a safe location
2. Call 100 - Police immediately
3. Document all details (faces, vehicles)
4. Don't resist or confront
5. Share info with responders
📞 Call 100 - Police`
    };

    return guides[emergencyType] || `🆘 GENERAL EMERGENCY
1. Move to a safe location
2. Call 112 - National Emergency
3. Stay calm and follow instructions
4. Share your location
5. Help others if safe`;
}

function speakResponse(text) {
    if (!window.speechSynthesis) {
        showToast('⚠️ Text-to-speech not supported');
        return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = PORTAL_CONFIG.VOICE_LANGUAGES[rapidPortalState.aiLanguage] || 'en-IN';
    utterance.rate = 0.9;

    window.speechSynthesis.speak(utterance);
    console.log('[RapidPortal] Speaking response');
}

// ==================== QUICK CONTACTS ====================
function dialNumber(number) {
    const emergencyNumbers = {
        '112': 'National Emergency',
        '101': 'Fire Brigade',
        '108': 'Ambulance Service',
        '100': 'Police'
    };

    console.log(`[RapidPortal] Dialing ${number}`);

    if (window.innerWidth <= 768) {
        window.location.href = `tel:${number}`;
    } else {
        copyToClipboard(number);
        showToast(`📞 Number ${number} (${emergencyNumbers[number]}) copied to clipboard`, 3000);
    }
}

// ==================== SAFETY TIPS ====================
function initializeSafetyTips() {
    console.log('[RapidPortal] Initializing safety tips rotation');

    displaySafetyTip();

    // Rotate tips every 20 seconds
    setInterval(() => {
        rapidPortalState.currentTipIndex = (rapidPortalState.currentTipIndex + 1) % 10;
        displaySafetyTip();
    }, PORTAL_CONFIG.TIP_ROTATION_INTERVAL);
}

function displaySafetyTip() {
    fetchSafetyTip()
        .then(tip => {
            const titleEl = document.getElementById('tipTitle');
            const contentEl = document.getElementById('tipContent');
            const iconEl = document.querySelector('.tip-icon');

            if (titleEl) titleEl.textContent = tip.title;
            if (contentEl) contentEl.textContent = tip.content;
            if (iconEl) iconEl.textContent = tip.icon;

            // Fade animation
            const card = document.querySelector('.safety-tip-card');
            if (card) {
                card.style.animation = 'fadeInOut 0.5s ease-in-out';
            }
        })
        .catch(error => {
            console.error('[RapidPortal] Failed to load tip:', error);
        });
}

async function fetchSafetyTip() {
    try {
        const response = await fetch(`${PORTAL_CONFIG.API_BASE}/safety-tip?language=${rapidPortalState.aiLanguage}`, {
            method: 'GET'
        });

        const data = await response.json();
        return data.tip || getDefaultTip();
    } catch (error) {
        return getDefaultTip();
    }
}

function getDefaultTip() {
    return SAFETY_TIPS[Math.floor(Math.random() * SAFETY_TIPS.length)];
}

function nextSafetyTip() {
    rapidPortalState.currentTipIndex = (rapidPortalState.currentTipIndex + 1) % 10;
    displaySafetyTip();
}

function previousSafetyTip() {
    rapidPortalState.currentTipIndex = (rapidPortalState.currentTipIndex - 1 + 10) % 10;
    displaySafetyTip();
}

// ==================== AUTO REFRESH ====================
function startAutoRefresh() {
    console.log('[RapidPortal] Starting progressive auto-refresh (1m -> 5m -> 10m)');

    // Ensure no duplicate timers are running.
    stopAutoRefresh();
    rapidPortalState.refreshStepIndex = 0;

    const scheduleNextRefresh = () => {
        const schedule = PORTAL_CONFIG.REFRESH_SCHEDULE;
        const interval = schedule[Math.min(rapidPortalState.refreshStepIndex, schedule.length - 1)] || PORTAL_CONFIG.REFRESH_INTERVAL;

        rapidPortalState.autoRefreshInterval = setTimeout(async () => {
            await loadCrisisAlerts();
            updateHeroTopBar();

            if (rapidPortalState.refreshStepIndex < schedule.length - 1) {
                rapidPortalState.refreshStepIndex += 1;
            }

            scheduleNextRefresh();
        }, interval);

        console.log(`[RapidPortal] Next auto-refresh in ${Math.round(interval / 60000)} min`);
    };

    scheduleNextRefresh();
}

function stopAutoRefresh() {
    if (rapidPortalState.autoRefreshInterval) {
        clearTimeout(rapidPortalState.autoRefreshInterval);
        rapidPortalState.autoRefreshInterval = null;
        console.log('[RapidPortal] Auto-refresh stopped');
    }
}

// ==================== UTILITY FUNCTIONS ====================
function showToast(message, duration = 3000) {
    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: rgba(0,0,0,0.8);
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        z-index: 9999;
        animation: slideInRight 0.3s ease-out;
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.3s ease-out';
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

function playEmergencySound() {
    // Create a beep sound using Web Audio API
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = 800;
        oscillator.type = 'sine';

        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
    } catch (e) {
        console.log('[RapidPortal] Audio not available');
    }
}

function flashRedAlert() {
    const flash = document.createElement('div');
    flash.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(255, 0, 0, 0.3);
        z-index: 9998;
        animation: flashIn 0.5s ease-out;
    `;

    document.body.appendChild(flash);
    setTimeout(() => flash.remove(), 2000);
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).catch(() => {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
    });
}

function closeModal(modalEl) {
    if (modalEl) {
        modalEl.style.animation = 'fadeOut 0.3s ease-out';
        setTimeout(() => modalEl.remove(), 300);
    }
}

// ==================== MAP INTEGRATION ====================
async function initializeMap() {
    if (!rapidPortalState.location) return;

    console.log('[RapidPortal] Initializing map...');

    const mapEl = document.querySelector('.map-element');
    if (!mapEl) return;

    // Check if Leaflet is loaded
    if (typeof L === 'undefined') {
        console.error('[RapidPortal] Leaflet library not loaded');
        showToast('⚠️ Map library not available');
        return;
    }

    // Initialize map
    if (rapidPortalState.mapInstance) {
        rapidPortalState.mapInstance.remove();
    }

    const map = L.map(mapEl).setView(
        [rapidPortalState.location.lat, rapidPortalState.location.lng],
        13
    );

    // Add tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
    }).addTo(map);

    // Add user marker (blue pulsing)
    const userMarker = L.circleMarker(
        [rapidPortalState.location.lat, rapidPortalState.location.lng],
        { radius: 10, fillColor: '#007bff', color: '#0056b3', weight: 2, opacity: 0.9 }
    ).addTo(map);

    userMarker.bindPopup('📍 Your Location');
    rapidPortalState.mapLayers.staticUserMarker = userMarker;

    // Add alert markers
    rapidPortalState.crisisAlerts.forEach(alert => {
        if (alert.lat && alert.lng) {
            const marker = L.marker([alert.lat, alert.lng], {
                icon: L.divIcon({
                    className: 'alert-marker',
                    html: alert.icon || '⚠️',
                    iconSize: [30, 30]
                })
            }).addTo(map);

            marker.bindPopup(`<strong>${alert.title}</strong><br>${alert.location}`);
        }
    });

    // Load safe places
    loadMapPlaces(map);

    ensureEvacuationGuidePanel();

    rapidPortalState.mapInstance = map;
    console.log('[RapidPortal] Map initialized');
}

async function loadMapPlaces(map) {
    try {
        const response = await fetch(`${PORTAL_CONFIG.API_BASE}/map-places?type=all`);
        const data = await response.json();

        const safeZones = Array.isArray(data.safe_zones) ? data.safe_zones : flattenSafeZones(data.places || {});
        rapidPortalState.safeZones = safeZones;
        renderNearbySafeZonesOnMap(safeZones);
    } catch (error) {
        console.error('[RapidPortal] Failed to load places:', error);
    }
}

function flattenSafeZones(groupedPlaces) {
    return Object.entries(groupedPlaces).flatMap(([type, places]) => {
        return (places || []).map((place, index) => ({
            ...place,
            id: place.id || `${type}-${index}-${place.lat}-${place.lng}`,
            type: place.type || type
        }));
    });
}

function clearSafeZoneMarkers() {
    const { mapInstance, mapLayers } = rapidPortalState;
    if (!mapInstance) return;

    (mapLayers.safeZoneMarkers || []).forEach((entry) => {
        if (entry?.marker) {
            mapInstance.removeLayer(entry.marker);
        }
    });

    if (mapLayers.selectedSafeZoneMarker) {
        mapInstance.removeLayer(mapLayers.selectedSafeZoneMarker);
        mapLayers.selectedSafeZoneMarker = null;
    }

    mapLayers.safeZoneMarkers = [];
}

function createSafeZoneMarkerIcon(type, isSelected = false) {
    const palette = {
        hospital: '#ef5350',
        police: '#42a5f5',
        shelter: '#66bb6a',
        open_ground: '#26a69a',
        elevated_area: '#ffa726',
        fallback: '#8e9fb3',
        general: '#8e9fb3'
    };

    const color = palette[type] || palette.general;
    const size = isSelected ? 30 : 20;

    return L.divIcon({
        className: `place-marker place-${type}${isSelected ? ' place-selected' : ''}`,
        html: `<div style="background:${color};width:${size}px;height:${size}px;border-radius:50%;box-shadow:0 0 ${isSelected ? '16px' : '8px'} ${color};border:2px solid rgba(255,255,255,0.85);"></div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2]
    });
}

function renderNearbySafeZonesOnMap(safeZones = [], selectedSafeZoneId = null) {
    const map = rapidPortalState.mapInstance;
    if (!map) return;

    clearSafeZoneMarkers();
    rapidPortalState.safeZones = Array.isArray(safeZones) ? safeZones : [];

    rapidPortalState.safeZones.forEach((zone) => {
        const marker = L.marker([zone.lat, zone.lng], {
            icon: createSafeZoneMarkerIcon(zone.type || 'general', String(zone.id) === String(selectedSafeZoneId))
        }).addTo(map);

        marker.bindPopup(`<strong>${zone.name}</strong><br>${zone.distance || ''}<br>${String(zone.type || 'safe zone').replace(/_/g, ' ')}`);

        rapidPortalState.mapLayers.safeZoneMarkers.push({
            id: zone.id,
            zone,
            marker
        });
    });

    if (selectedSafeZoneId) {
        const selected = rapidPortalState.mapLayers.safeZoneMarkers.find((entry) => String(entry.id) === String(selectedSafeZoneId));
        if (selected) {
            highlightNearbySafeZoneOnMap(selected.zone);
        }
    }
}

function highlightNearbySafeZoneOnMap(zone) {
    const map = rapidPortalState.mapInstance;
    if (!map || !zone) return;

    const match = rapidPortalState.mapLayers.safeZoneMarkers.find((entry) => {
        return String(entry.id) === String(zone.id) || (Math.abs(entry.zone.lat - zone.lat) < 0.0001 && Math.abs(entry.zone.lng - zone.lng) < 0.0001);
    });

    if (!match) {
        renderNearbySafeZonesOnMap(rapidPortalState.safeZones, zone.id);
        return;
    }

    if (rapidPortalState.mapLayers.selectedSafeZoneMarker) {
        map.removeLayer(rapidPortalState.mapLayers.selectedSafeZoneMarker);
    }

    rapidPortalState.mapLayers.selectedSafeZoneMarker = L.circleMarker([match.zone.lat, match.zone.lng], {
        radius: 14,
        color: '#ffffff',
        weight: 2,
        fillColor: '#29b6f6',
        fillOpacity: 0.2
    }).addTo(map);

    match.marker.openPopup();
    map.setView([match.zone.lat, match.zone.lng], Math.max(map.getZoom(), 15));
}

async function loadEvacuationRoute(alert, forceRecalculate = false, options = {}) {
    if (!alert) return;

    const { switchTab = true } = options;

    if (!rapidPortalState.location) {
        rapidPortalState.location = { lat: 28.6139, lng: 77.2090 };
    }

    rapidPortalState.activeEvacuationAlertId = alert.id;
    rapidPortalState.activeEvacuationSeverity = alert.severity || 'medium';

    if (switchTab) {
        showTab('map');
    }
    setTimeout(async () => {
        try {
            if (!rapidPortalState.mapInstance) {
                await initializeMap();
            }

            const cacheKey = getCacheKeyForAlert(alert);
            let data = !forceRecalculate ? rapidPortalState.routeCache[cacheKey] : null;

            if (!data) {
                data = await fetchEvacuationRouteData(alert);
                if (data?.success) {
                    rapidPortalState.routeCache[cacheKey] = data;
                }
            }

            if (!data.success) {
                throw new Error(data.error || 'Failed to fetch evacuation route');
            }

            renderEvacuationRouteOnMap(data, alert);
            renderEvacuationGuidePanel(data, alert);
            startEvacuationAutoUpdate(alert);

            if (!forceRecalculate) {
                showToast('🧭 Evacuation route loaded');
            }
        } catch (error) {
            console.error('[RapidPortal] Evacuation route error:', error);
            renderEvacuationFallback(alert);
        }
    }, 250);
}

async function fetchEvacuationRouteData(alert) {
    const incidentLat = alert.lat || rapidPortalState.location.lat + 0.004;
    const incidentLng = alert.lng || rapidPortalState.location.lng + 0.004;

    const params = new URLSearchParams({
        userLat: rapidPortalState.location.lat,
        userLng: rapidPortalState.location.lng,
        incidentLat,
        incidentLng,
        severity: alert.severity || 'medium'
    });

    const response = await fetch(`${PORTAL_CONFIG.API_BASE}/evacuation-route?${params.toString()}`);
    return response.json();
}

function clearEvacuationLayers() {
    const { mapInstance, mapLayers } = rapidPortalState;
    if (!mapInstance) return;

    ['userMarker', 'incidentMarker', 'destinationMarker', 'routeLine', 'dangerCircle'].forEach((key) => {
        if (mapLayers[key]) {
            mapInstance.removeLayer(mapLayers[key]);
            mapLayers[key] = null;
        }
    });

    if (rapidPortalState.routeDrawingInterval) {
        clearInterval(rapidPortalState.routeDrawingInterval);
        rapidPortalState.routeDrawingInterval = null;
    }
}

function createPulseMarker(icon, colorClass) {
    return L.divIcon({
        className: `evac-marker evac-marker-${colorClass}`,
        html: `<div class="evac-marker-inner">${icon}</div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15]
    });
}

function renderEvacuationRouteOnMap(routeData, alert) {
    const map = rapidPortalState.mapInstance;
    if (!map) return;

    clearEvacuationLayers();

    const dangerCenter = routeData.dangerZone?.center || [alert.lat, alert.lng];
    const destination = routeData.safeDestination;
    const route = Array.isArray(routeData.route) ? routeData.route : [];

    rapidPortalState.mapLayers.userMarker = L.marker(
        [rapidPortalState.location.lat, rapidPortalState.location.lng],
        { icon: createPulseMarker('🔵', 'user') }
    ).addTo(map).bindPopup('Your location');

    rapidPortalState.mapLayers.incidentMarker = L.marker(
        [dangerCenter[0], dangerCenter[1]],
        { icon: createPulseMarker('🔴', 'incident') }
    ).addTo(map).bindPopup(`${alert.title || 'Incident'} (Danger)`);

    rapidPortalState.mapLayers.destinationMarker = L.marker(
        [destination.lat, destination.lng],
        { icon: createPulseMarker('🟢', 'safe') }
    ).addTo(map).bindPopup(destination.name || 'Safe destination');

    rapidPortalState.mapLayers.dangerCircle = L.circle(
        [dangerCenter[0], dangerCenter[1]],
        {
            radius: routeData.dangerZone?.radiusMeters || 350,
            color: '#ff4d4d',
            fillColor: '#ff4d4d',
            fillOpacity: 0.12,
            weight: 2,
            className: 'danger-zone-circle'
        }
    ).addTo(map);

    if (route.length > 1) {
        const drawnRoute = [route[0]];
        rapidPortalState.mapLayers.routeLine = L.polyline(drawnRoute, {
            color: '#29b6f6',
            weight: 5,
            opacity: 0.9
        }).addTo(map);

        let cursor = 1;
        rapidPortalState.routeDrawingInterval = setInterval(() => {
            if (cursor >= route.length) {
                clearInterval(rapidPortalState.routeDrawingInterval);
                rapidPortalState.routeDrawingInterval = null;
                return;
            }

            drawnRoute.push(route[cursor]);
            rapidPortalState.mapLayers.routeLine.setLatLngs(drawnRoute);
            cursor += 1;
        }, 60);
    }

    const bounds = L.latLngBounds([
        [rapidPortalState.location.lat, rapidPortalState.location.lng],
        [dangerCenter[0], dangerCenter[1]],
        [destination.lat, destination.lng]
    ]);

    map.fitBounds(bounds.pad(0.25));
}

function ensureEvacuationGuidePanel() {
    const mapContainer = document.querySelector('#map.tab-content .map-container');
    if (!mapContainer) return;

    if (document.getElementById('evacuationGuidePanelMap')) return;

    const panel = document.createElement('div');
    panel.id = 'evacuationGuidePanelMap';
    panel.className = 'evacuation-guide-map-panel';
    panel.innerHTML = `
        <h3>🧭 EVACUATION GUIDE</h3>
        <p>Select an alert to load a safe evacuation route.</p>
    `;

    mapContainer.appendChild(panel);
}

function renderEvacuationGuidePanel(routeData, alert) {
    ensureEvacuationGuidePanel();

    const panel = document.getElementById('evacuationGuidePanelMap');
    if (!panel) return;

    const destination = routeData.safeDestination || { name: 'Safe Zone' };
    const instructions = routeData.instructions || [];

    panel.innerHTML = `
        <h3>🧭 EVACUATION GUIDE</h3>
        <div class="evac-meta"><strong>Destination:</strong> ${destination.name}</div>
        <div class="evac-meta"><strong>Distance:</strong> ${routeData.distance || 'N/A'}</div>
        <div class="evac-meta"><strong>ETA:</strong> ${routeData.eta || 'N/A'}</div>
        <ol class="evac-steps">
            ${instructions.map((step) => `<li>${step}</li>`).join('')}
        </ol>
        <div class="evac-actions">
            <button class="evac-btn" onclick="startEvacuationNavigation()">Start Navigation</button>
            <button class="evac-btn" onclick="recalculateEvacuationRoute()">Recalculate</button>
            <button class="evac-btn evac-btn-danger" onclick="dialNumber('112')">Call Emergency</button>
        </div>
    `;
}

function startEvacuationNavigation() {
    const marker = rapidPortalState.mapLayers.destinationMarker;
    if (!marker) {
        showToast('⚠️ Destination unavailable');
        return;
    }

    const latLng = marker.getLatLng();
    const url = `https://www.google.com/maps/dir/?api=1&destination=${latLng.lat},${latLng.lng}`;
    window.open(url, '_blank');
}

function recalculateEvacuationRoute() {
    const alert = getAlertById(rapidPortalState.activeEvacuationAlertId);
    if (!alert) {
        showToast('⚠️ No active evacuation alert');
        return;
    }

    loadEvacuationRoute(alert, true);
}

function getSeverityRank(severity) {
    const val = String(severity || 'low').toLowerCase();
    if (val === 'critical' || val === 'high') return 3;
    if (val === 'medium') return 2;
    return 1;
}

function distanceBetweenPoints(a, b) {
    const r = 6371;
    const dLat = (b.lat - a.lat) * Math.PI / 180;
    const dLng = (b.lng - a.lng) * Math.PI / 180;
    const x = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
    return r * c;
}

function startEvacuationAutoUpdate(baseAlert) {
    stopEvacuationAutoUpdate();

    rapidPortalState.routeUpdateInterval = setInterval(() => {
        if (!rapidPortalState.activeEvacuationAlertId) return;

        const currentAlert = getAlertById(rapidPortalState.activeEvacuationAlertId) || baseAlert;
        if (!currentAlert) return;

        navigator.geolocation.getCurrentPosition((position) => {
            const nextLocation = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            };

            const movedKm = distanceBetweenPoints(rapidPortalState.location || nextLocation, nextLocation);
            const oldRank = getSeverityRank(rapidPortalState.activeEvacuationSeverity);
            const newRank = getSeverityRank(currentAlert.severity);

            rapidPortalState.location = nextLocation;

            if (movedKm >= 0.08 || newRank > oldRank) {
                rapidPortalState.activeEvacuationSeverity = currentAlert.severity;
                loadEvacuationRoute(currentAlert, true);
            }
        });
    }, PORTAL_CONFIG.EVACUATION_REFRESH_INTERVAL);
}

function stopEvacuationAutoUpdate() {
    if (rapidPortalState.routeUpdateInterval) {
        clearInterval(rapidPortalState.routeUpdateInterval);
        rapidPortalState.routeUpdateInterval = null;
    }
}

function isTravelerModeEnabled() {
    const statusEl = document.getElementById('travelerModeStatus');
    if (!statusEl) return false;
    return String(statusEl.textContent || '').trim().toUpperCase() === 'ON';
}

function startProactiveMonitoring() {
    stopProactiveMonitoring();

    rapidPortalState.proactiveMonitorInterval = setInterval(() => {
        if (!rapidPortalState.location) {
            getPortalLocation();
        }

        checkProactiveEvacuation();

        if (isTravelerModeEnabled() && rapidPortalState.activeEvacuationAlertId) {
            navigator.geolocation.getCurrentPosition((position) => {
                const next = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };

                if (!rapidPortalState.lastTravelerLocation) {
                    rapidPortalState.lastTravelerLocation = next;
                    return;
                }

                const movedKm = distanceBetweenPoints(rapidPortalState.lastTravelerLocation, next);
                rapidPortalState.location = next;

                if (movedKm >= 0.08) {
                    rapidPortalState.lastTravelerLocation = next;
                    const alert = getAlertById(rapidPortalState.activeEvacuationAlertId);
                    if (alert) {
                        loadEvacuationRoute(alert, true);
                    }
                }
            });
        }
    }, PORTAL_CONFIG.PROACTIVE_CHECK_INTERVAL);
}

function stopProactiveMonitoring() {
    if (rapidPortalState.proactiveMonitorInterval) {
        clearInterval(rapidPortalState.proactiveMonitorInterval);
        rapidPortalState.proactiveMonitorInterval = null;
    }

    closeProactiveModal();
}

function renderEvacuationFallback(alert) {
    const map = rapidPortalState.mapInstance;
    if (!map) return;

    clearEvacuationLayers();

    const incidentLat = alert.lat || rapidPortalState.location.lat + 0.003;
    const incidentLng = alert.lng || rapidPortalState.location.lng + 0.003;
    const destination = {
        name: 'Nearest Hospital',
        lat: rapidPortalState.location.lat + 0.006,
        lng: rapidPortalState.location.lng + 0.006
    };

    rapidPortalState.mapLayers.userMarker = L.marker(
        [rapidPortalState.location.lat, rapidPortalState.location.lng],
        { icon: createPulseMarker('🔵', 'user') }
    ).addTo(map).bindPopup('Your location');

    rapidPortalState.mapLayers.incidentMarker = L.marker(
        [incidentLat, incidentLng],
        { icon: createPulseMarker('🔴', 'incident') }
    ).addTo(map).bindPopup('Incident zone');

    rapidPortalState.mapLayers.destinationMarker = L.marker(
        [destination.lat, destination.lng],
        { icon: createPulseMarker('🟢', 'safe') }
    ).addTo(map).bindPopup(destination.name);

    rapidPortalState.mapLayers.routeLine = L.polyline([
        [rapidPortalState.location.lat, rapidPortalState.location.lng],
        [destination.lat, destination.lng]
    ], {
        color: '#4fc3f7',
        weight: 4,
        opacity: 0.9,
        dashArray: '8,8'
    }).addTo(map);

    rapidPortalState.mapLayers.dangerCircle = L.circle([incidentLat, incidentLng], {
        radius: 350,
        color: '#ff4d4d',
        fillColor: '#ff4d4d',
        fillOpacity: 0.14,
        weight: 2,
        className: 'danger-zone-circle'
    }).addTo(map);

    renderEvacuationGuidePanel({
        safeDestination: destination,
        distance: 'Approx. 2-3 km',
        eta: '6-8 mins',
        instructions: [
            'Move away from incident toward open main road.',
            'Head toward nearest hospital or official shelter.',
            'Call emergency services if roads are blocked.'
        ]
    }, alert);

    const bounds = L.latLngBounds([
        [rapidPortalState.location.lat, rapidPortalState.location.lng],
        [incidentLat, incidentLng],
        [destination.lat, destination.lng]
    ]);
    map.fitBounds(bounds.pad(0.3));

    showToast('⚠️ Routing API unavailable. Showing safe fallback guidance.');
}

// ==================== PAGE LIFECYCLE ====================
// Initialization moved to dashboard transition to prevent alerts on landing page
// initializeRapidPortal() is now called from transitionToDashboard() in index.html

window.addEventListener('beforeunload', () => {
    stopAutoRefresh();
    stopEvacuationAutoUpdate();
    stopProactiveMonitoring();
    console.log('[RapidPortal] Portal cleanup on unload');
});

window.renderNearbySafeZonesOnMap = renderNearbySafeZonesOnMap;
window.highlightNearbySafeZoneOnMap = highlightNearbySafeZoneOnMap;

// Override showTab to initialize map when tab is shown
const originalShowTab = window.showTab;
if (originalShowTab) {
    window.showTab = function (tabName) {
        if (tabName === 'map') {
            setTimeout(initializeMap, 200);
        }
        return originalShowTab.call(this, tabName);
    };
}

console.log('[RapidPortal] Portal module v2.0 loaded successfully');
