// ============================================
// ResQAI - Unified Nearby Crisis Intelligence
// Guest / Visitor Rapid Crisis Portal
// ============================================

const API_BASE = '/api';
const PORTAL_API_BASE = '/api/portal';

const nearbyState = {
    location: null,
    lastTrackedLocation: null,
    incidents: [],
    riskZones: [],
    aiRisks: [],
    safeZones: [],
    selectedIncidentId: null,
    activeIncident: null,
    selectedSafeZoneId: null,
    travelerMode: false,
    watchId: null
};

const NEARBY_LOADING_TIMEOUT_MS = 15000;
const SAFE_ZONE_LOADING_TIMEOUT_MS = 9000;

console.log('📍 Nearby crisis intelligence module loaded');

function toast(message, type = 'info') {
    if (typeof showToast === 'function') {
        showToast(message, type);
        return;
    }
    console.log(`[${type.toUpperCase()}] ${message}`);
}

function setLoading(isLoading) {
    if (typeof showLoading === 'function') {
        try {
            showLoading(isLoading);
        } catch (error) {
            console.warn('⚠️ showLoading failed:', error);
        }
    }
}

function isNearbyTabActive() {
    const nearbyTab = document.getElementById('nearby');
    return !!nearbyTab && nearbyTab.classList.contains('active');
}

function getCurrentLocation() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Geolocation not supported'));
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                resolve({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                });
            },
            (error) => reject(error),
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
        );
    });
}

function normalizeSeverity(severity) {
    const value = String(severity || 'low').toLowerCase();
    if (value === 'critical' || value === 'high') return 'critical';
    if (value === 'medium' || value === 'moderate') return 'medium';
    return 'low';
}

function severityClassForApi(severity) {
    const normalized = normalizeSeverity(severity);
    if (normalized === 'critical') return 'high';
    return normalized;
}

function severityLabel(severity) {
    const normalized = normalizeSeverity(severity);
    if (normalized === 'critical') return 'CRITICAL';
    if (normalized === 'medium') return 'MEDIUM';
    return 'LOW';
}

function getIncidentIcon(type) {
    const icons = {
        fire: '🔥',
        flood: '💧',
        medical: '🚑',
        accident: '⚡',
        weather: '⛈️',
        traffic: '🚗',
        theft: '🚨',
        earthquake: '🏚️',
        stampede: '👥',
        safe: '✅',
        other: '🆘'
    };
    return icons[type] || '🆘';
}

function getTimeAgo(timestamp) {
    if (!timestamp) return 'Just now';
    if (typeof timestamp === 'string' && timestamp.toLowerCase().includes('ago')) return timestamp;

    const now = new Date();
    const time = new Date(timestamp);
    const diffSeconds = Math.max(1, Math.floor((now - time) / 1000));

    if (diffSeconds < 60) return `${diffSeconds}s ago`;
    if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
    if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`;
    return `${Math.floor(diffSeconds / 86400)}d ago`;
}

function toRad(value) {
    return (value * Math.PI) / 180;
}

function distanceKm(a, b) {
    const R = 6371;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const s1 = Math.sin(dLat / 2);
    const s2 = Math.sin(dLng / 2);
    const aa = s1 * s1 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * s2 * s2;
    return 2 * R * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
}

function toDirection(from, to) {
    const lat1 = toRad(from.lat);
    const lat2 = toRad(to.lat);
    const dLng = toRad(to.lng - from.lng);

    const y = Math.sin(dLng) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
    const brng = (Math.atan2(y, x) * 180) / Math.PI;
    const bearing = (brng + 360) % 360;

    const points = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    return points[Math.round(bearing / 45) % 8];
}

async function getNearbyIncidents(showUserToast = true) {
    try {
        setLoading(true);

        nearbyState.location = await withTimeout(getCurrentLocation(), NEARBY_LOADING_TIMEOUT_MS, 'location lookup');

        const latitude = nearbyState.location.lat;
        const longitude = nearbyState.location.lng;

        const incidentsUrl = `${API_BASE}/nearby/nearby?latitude=${latitude}&longitude=${longitude}&radius=5`;
        const riskZonesUrl = `${API_BASE}/nearby/risk-zones`;
        const aiRiskUrl = `${API_BASE}/nearby/analyze`;

        const [incidentsResp, riskZonesResp, aiRiskResp] = await Promise.all([
            fetch(incidentsUrl).then(r => r.json()).catch(() => ({ success: false, incidents: [] })),
            fetch(riskZonesUrl).then(r => r.json()).catch(() => ({ success: false, risk_zones: [] })),
            fetch(aiRiskUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ latitude, longitude, language: 'en' })
            }).then(r => r.json()).catch(() => ({ ai_risks: [] }))
        ]);

        nearbyState.incidents = incidentsResp.success ? (incidentsResp.incidents || []) : [];
        nearbyState.riskZones = riskZonesResp.success ? (riskZonesResp.risk_zones || []) : [];
        nearbyState.aiRisks = aiRiskResp.ai_risks || [];

        nearbyState.activeIncident = pickPrimaryIncident(nearbyState.incidents);
        await loadSafeZones(nearbyState.activeIncident, { showToast: false });

        renderUnifiedCrisisIntelligence(nearbyState.incidents);
        renderRiskZonesAsTags(nearbyState.riskZones);
        renderAIInsights(nearbyState.aiRisks);
        renderCrowdSafetyMode(nearbyState.incidents);
        updateStatusPanel();

        if (showUserToast) {
            toast(`✅ ${nearbyState.incidents.length} nearby alerts updated`, 'success');
        }
    } catch (error) {
        console.error('❌ getNearbyIncidents failed:', error);
        toast('❌ Failed to load nearby crisis intelligence', 'error');
    } finally {
        setLoading(false);
    }
}

function pickPrimaryIncident(incidents) {
    const list = Array.isArray(incidents) ? incidents : [];
    const critical = list.find((incident) => normalizeSeverity(incident.severity) === 'critical');
    if (critical) return critical;

    const high = list.find((incident) => normalizeSeverity(incident.severity) === 'high');
    if (high) return high;

    return list[0] || null;
}

function normalizeEmergencyType(type, description = '') {
    const text = `${type || ''} ${description || ''}`.toLowerCase();

    if (text.includes('fire') || text.includes('smoke') || text.includes('burn')) return 'fire';
    if (text.includes('flood') || text.includes('water') || text.includes('rain')) return 'flood';
    if (text.includes('accident') || text.includes('injur') || text.includes('collision')) return 'accident';
    if (text.includes('medical') || text.includes('heart') || text.includes('breath') || text.includes('ambulance')) return 'medical';
    if (text.includes('earthquake') || text.includes('tremor')) return 'earthquake';
    if (text.includes('theft') || text.includes('threat') || text.includes('attack')) return 'theft';

    return String(type || 'general').toLowerCase() || 'general';
}

async function startImmediateEmergencyGuidance(payload = {}) {
    const emergencyType = normalizeEmergencyType(payload.type || payload.emergencyType, payload.description || payload.transcript || '');
    const severity = payload.severity || (emergencyType === 'fire' || emergencyType === 'flood' || emergencyType === 'medical' ? 'high' : 'medium');

    if (!nearbyState.location) {
        nearbyState.location = await getCurrentLocation();
    }

    const guidedIncident = {
        id: payload.id || `report-${Date.now()}`,
        type: emergencyType,
        title: payload.title || payload.description || `Emergency reported: ${emergencyType}`,
        location: payload.location || 'Current location',
        severity,
        distance: '0 km away',
        advice: payload.description || payload.transcript || ''
    };

    nearbyState.activeIncident = guidedIncident;
    nearbyState.selectedIncidentId = guidedIncident.id;

    renderUnifiedCrisisIntelligence([{
        id: guidedIncident.id,
        type: guidedIncident.type,
        title: guidedIncident.title,
        location: guidedIncident.location,
        distance: '0 km away',
        severity: guidedIncident.severity,
        timestamp: 'Just now',
        advice: guidedIncident.advice
    }]);

    generateSmartEvacuationGuide(guidedIncident);
    await loadSafeZones(guidedIncident, { showToast: false });

    if (typeof window.loadEvacuationRoute === 'function') {
        try {
            window.loadEvacuationRoute(guidedIncident, false, { switchTab: false });
        } catch (error) {
            console.warn('⚠️ Evacuation route preload failed:', error);
        }
    }

    const followUpTip = guidedIncident.type === 'flood'
        ? 'Move to higher ground and avoid flooded roads.'
        : guidedIncident.type === 'fire'
            ? 'Stay low, avoid smoke, and use the nearest safe exit.'
            : 'Move toward the nearest safe location and follow official instructions.';

    toast(`🗺️ Live guidance ready for ${emergencyType}`, 'success');

    if (window.speechSynthesis) {
        try {
            const utterance = new SpeechSynthesisUtterance(followUpTip);
            utterance.lang = 'en-IN';
            utterance.rate = 0.95;
            window.speechSynthesis.speak(utterance);
        } catch (error) {
            console.warn('⚠️ Emergency guidance voice failed:', error);
        }
    }

    return guidedIncident;
}

function buildSafeZoneQueryParams(incident = null, category = 'all') {
    const type = String(incident?.type || 'general').toLowerCase();
    return new URLSearchParams({
        userLat: nearbyState.location.lat,
        userLng: nearbyState.location.lng,
        incidentType: type,
        category
    });
}

function normalizeSafeZone(zone, index) {
    const lat = Number(zone.lat);
    const lng = Number(zone.lng);
    const distanceKm = distanceKmBetweenPoints(nearbyState.location, { lat, lng });

    return {
        ...zone,
        id: zone.id || `${zone.type || 'zone'}-${index}-${lat.toFixed(4)}-${lng.toFixed(4)}`,
        lat,
        lng,
        distanceKm,
        distance: zone.distance || `${distanceKm.toFixed(1)} km`,
        direction: toDirection(nearbyState.location, { lat, lng })
    };
}

function distanceKmBetweenPoints(a, b) {
    return distanceKm(a, b);
}

async function loadSafeZones(alert = null, options = {}) {
    try {
        if (!nearbyState.location) {
            nearbyState.location = await withTimeout(getCurrentLocation(), NEARBY_LOADING_TIMEOUT_MS, 'location lookup');
        }

        const params = buildSafeZoneQueryParams(alert || nearbyState.activeIncident, options.category || 'all');
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), SAFE_ZONE_LOADING_TIMEOUT_MS);

        let response;
        try {
            response = await fetch(`${PORTAL_API_BASE}/safe-zones?${params.toString()}`, {
                signal: controller.signal
            });
        } finally {
            clearTimeout(timeoutId);
        }

        const data = await response.json();

        if (!data.success || !Array.isArray(data.safe_zones) || data.safe_zones.length === 0) {
            nearbyState.safeZones = [];
            renderSafeZones([], null, data.fallback_advice || 'Unable to fetch nearby safe zones');
            syncSafeZonesOnMap([]);
            if (options.showToast !== false) {
                toast('Unable to fetch nearby safe zones', 'warning');
            }
            return data;
        }

        nearbyState.safeZones = data.safe_zones.map((zone, index) => normalizeSafeZone(zone, index));

        if (!nearbyState.selectedSafeZoneId && nearbyState.safeZones.length > 0) {
            nearbyState.selectedSafeZoneId = nearbyState.safeZones[0].id;
        }

        renderSafeZones(nearbyState.safeZones, nearbyState.selectedSafeZoneId);
        syncSafeZonesOnMap(nearbyState.safeZones, nearbyState.selectedSafeZoneId);

        return data;
    } catch (error) {
        console.error('❌ loadSafeZones failed:', error);
        nearbyState.safeZones = [];
        renderSafeZones([], null, 'Unable to fetch nearby safe zones');
        syncSafeZonesOnMap([]);
        if (options.showToast !== false) {
            toast('Unable to fetch nearby safe zones', 'warning');
        }
        return { success: false, safe_zones: [] };
    }
}

function withTimeout(promise, timeoutMs, label = 'request') {
    return Promise.race([
        promise,
        new Promise((_, reject) => {
            setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
        })
    ]);
}

function syncSafeZonesOnMap(safeZones, selectedSafeZoneId = null) {
    if (typeof window.renderNearbySafeZonesOnMap === 'function') {
        window.renderNearbySafeZonesOnMap(safeZones, selectedSafeZoneId);
    }
}

function renderUnifiedCrisisIntelligence(incidents) {
    const container = document.getElementById('nearbyContent');
    if (!container) return;

    const list = Array.isArray(incidents) ? incidents : [];
    updateSummaryStrip(list);

    if (list.length === 0) {
        container.innerHTML = `
            <div class="empty-state-box" style="grid-column: 1 / -1;">
                <i class="fas fa-shield-check"></i>
                <p>No active nearby incidents. Your current zone looks safe.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = list.map((incident) => {
        const incidentType = incident.type || 'other';
        const severity = normalizeSeverity(incident.severity);
        const severityTag = severityLabel(incident.severity);
        const title = incident.title || `${incidentType.toUpperCase()} Incident`;
        const distance = incident.distance || `${(incident.distance_km || 0).toFixed(1)} km away`;
        const timeAgo = getTimeAgo(incident.timestamp);
        const action = incident.advice || incident.description || 'Move to a safer route and follow official advisories.';

        return `
            <article class="incident-card unified-incident-card ${severity}" onclick="selectIncident('${incident.id}')">
                <div class="incident-card-header">
                    <div>
                        <div class="incident-type-badge">${getIncidentIcon(incidentType)}</div>
                        <div class="incident-title">${title}</div>
                    </div>
                    <span class="incident-severity ${severity}">${severityTag}</span>
                </div>
                <div class="incident-meta-line">
                    <span>📍 ${distance}</span>
                    <span>🕒 ${timeAgo}</span>
                </div>
                <p class="incident-desc"><strong>AI Action:</strong> ${action}</p>
                <div class="unified-actions">
                    <button class="quick-action-btn" onclick="event.stopPropagation(); viewOnMapForIncident('${incident.id}')">View on Map</button>
                    <button class="quick-action-btn" onclick="event.stopPropagation(); getHelpForIncident('${incident.id}')">Get Help</button>
                </div>
            </article>
        `;
    }).join('');
}

function updateSummaryStrip(incidents) {
    const strip = document.getElementById('crisisSummaryStrip');
    if (!strip) return;

    const critical = incidents.filter((x) => normalizeSeverity(x.severity) === 'critical').length;
    const medium = incidents.filter((x) => normalizeSeverity(x.severity) === 'medium').length;
    const low = incidents.filter((x) => normalizeSeverity(x.severity) === 'low').length;

    strip.innerHTML = `
        <span>${incidents.length} Active Alerts Nearby</span>
        <span>${critical} Critical</span>
        <span>${medium} Medium</span>
        <span>${low} Low</span>
    `;
}

function renderRiskZonesAsTags(riskZones) {
    const container = document.getElementById('riskZonesContainer');
    if (!container) return;

    const zones = Array.isArray(riskZones) ? riskZones : [];
    if (zones.length === 0) {
        container.innerHTML = '<span class="risk-zone-tag low">No active risk zones</span>';
        return;
    }

    container.innerHTML = zones.map((zone) => {
        const level = normalizeSeverity(zone.risk_level || zone.severity || 'low');
        const name = zone.type ? String(zone.type).replace(/_/g, ' ') : 'General zone';
        const radius = zone.radius ? `(${zone.radius}km)` : '';
        return `<span class="risk-zone-tag ${level}">${name} ${radius}</span>`;
    }).join('');
}

function renderAIInsights(aiRisks) {
    const container = document.getElementById('aiRisksContainer');
    if (!container) return;

    const insights = (Array.isArray(aiRisks) ? aiRisks : []).slice(0, 4);
    if (insights.length === 0) {
        container.innerHTML = '<span class="ai-inline-badge">AI insights are stable for your area</span>';
        return;
    }

    container.innerHTML = insights.map((risk) => {
        const level = normalizeSeverity(risk.severity);
        const text = risk.recommendation || risk.message || 'Monitor local updates';
        return `<span class="ai-inline-badge ${level}">🤖 ${text}</span>`;
    }).join('');
}

function renderSafeZones(safeZones, selectedSafeZoneId = null, fallbackMessage = '') {
    const container = document.getElementById('safeZonesContainer');
    if (!container) return;

    const zones = Array.isArray(safeZones) ? safeZones.slice(0, 6) : [];
    if (!nearbyState.location || zones.length === 0) {
        container.innerHTML = `
            <div class="empty-state-box" style="grid-column: 1 / -1;">
                <i class="fas fa-hospital"></i>
                <p>${fallbackMessage || 'Unable to fetch nearby safe zones'}</p>
            </div>
        `;
        return;
    }

    container.innerHTML = zones.map((zone) => {
        const coords = { lat: zone.lat, lng: zone.lng };
        const km = Number.isFinite(zone.distanceKm) ? zone.distanceKm.toFixed(1) : distanceKm(nearbyState.location, coords).toFixed(1);
        const direction = zone.direction || toDirection(nearbyState.location, coords);
        const name = zone.name || 'Safe Facility';
        const badge = String(zone.type || 'safe_zone').replace(/_/g, ' ');
        const isSelected = String(zone.id) === String(selectedSafeZoneId);

        return `
            <div class="safe-zone-item ${isSelected ? 'selected' : ''}" onclick="selectSafeZone('${zone.id}')">
                <div style="display:flex;align-items:flex-start;gap:0.75rem;justify-content:space-between;">
                    <div>
                        <h4>${name}</h4>
                        <p>${km} km • ${direction}</p>
                    </div>
                    <span class="incident-severity low" style="font-size:0.72rem;text-transform:capitalize;">${badge}</span>
                </div>
                <div style="display:flex;gap:0.5rem;flex-wrap:wrap;">
                    <button class="quick-action-btn" onclick="event.stopPropagation(); navigateToSafeZone('${zone.id}')">Navigate</button>
                    <button class="quick-action-btn" onclick="event.stopPropagation(); viewSafeZoneOnMap('${zone.id}')">View on Map</button>
                </div>
            </div>
        `;
    }).join('');
}

function renderCrowdSafetyMode(incidents) {
    const container = document.getElementById('crowdSafetyContainer');
    if (!container) return;

    const list = Array.isArray(incidents) ? incidents : [];
    const trafficRisks = list.filter((item) => {
        const type = String(item.type || '').toLowerCase();
        return type.includes('traffic') || type.includes('accident') || type.includes('stampede');
    });

    const criticalCount = list.filter((item) => normalizeSeverity(item.severity) === 'critical').length;
    const densityRisk = trafficRisks.length + criticalCount;

    let level = 'low';
    let primary = 'Crowd flow is manageable in your nearby routes.';
    let guidance = 'Use normal routes and stay observant.';

    if (densityRisk >= 3) {
        level = 'critical';
        primary = 'Avoid this route: congestion and crowd density are high.';
        guidance = 'Use alternate path and avoid central traffic corridors.';
    } else if (densityRisk >= 1) {
        level = 'medium';
        primary = 'Moderate congestion detected near one or more zones.';
        guidance = 'Use alternate path where possible and avoid bottlenecks.';
    }

    container.innerHTML = `
        <div class="crowd-safety-status ${level}">
            <strong>${level.toUpperCase()} Crowd Risk</strong>
            <p>${primary}</p>
            <p>${guidance}</p>
        </div>
    `;
}

function updateStatusPanel() {
    const locationStatusEl = document.getElementById('locationStatus');
    const incidentCountEl = document.getElementById('incidentCount');
    const riskCountEl = document.getElementById('riskCount');
    const travelerModeStatusEl = document.getElementById('travelerModeStatus');

    if (locationStatusEl) {
        locationStatusEl.textContent = nearbyState.location ? '✅ Enabled' : 'Disabled';
    }

    if (incidentCountEl) {
        incidentCountEl.textContent = String(nearbyState.incidents.length);
    }

    if (riskCountEl) {
        const critical = nearbyState.incidents.filter((x) => normalizeSeverity(x.severity) === 'critical').length;
        riskCountEl.textContent = String(critical);
    }

    if (travelerModeStatusEl) {
        travelerModeStatusEl.textContent = nearbyState.travelerMode ? 'ON' : 'OFF';
    }

    const travelerBtn = document.getElementById('travelerModeToggle');
    if (travelerBtn) {
        travelerBtn.innerHTML = nearbyState.travelerMode
            ? '<i class="fas fa-location-arrow"></i> Traveler Mode: ON'
            : '<i class="fas fa-location-arrow"></i> Traveler Mode: OFF';
    }
}

function findIncidentById(id) {
    return nearbyState.incidents.find((incident) => String(incident.id) === String(id));
}

function selectIncident(incidentId) {
    nearbyState.selectedIncidentId = incidentId;
    const incident = findIncidentById(incidentId);
    if (!incident) return;

    nearbyState.activeIncident = incident;
    generateSmartEvacuationGuide(incident);
    loadSafeZones(incident, { showToast: false });
}

function parseGuidanceToSteps(guidanceText) {
    return String(guidanceText || '')
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .map((line) => line.replace(/^[-*0-9.\s]+/, '').trim())
        .filter((line) => line.length > 0)
        .slice(0, 6);
}

function fallbackEvacuationSteps(incident) {
    const kind = String(incident.type || 'incident').toLowerCase();

    if (kind.includes('fire')) {
        return [
            'Trigger nearest alarm and move to the nearest marked exit.',
            'Avoid elevators and stay low if smoke is present.',
            'Proceed to hotel assembly zone and report your room status.',
            'Call 101 or 112 if responders are not already on site.'
        ];
    }

    if (kind.includes('medical')) {
        return [
            'Call 108 immediately and keep the path clear for responders.',
            'Move patient to a safe, ventilated area if possible.',
            'Do not provide food or drink unless advised by professionals.',
            'Share exact location details with emergency teams.'
        ];
    }

    return [
        'Move away from the affected area and avoid crowding exits.',
        'Follow official hotel/staff directions and safe route signage.',
        'Stay connected and monitor updates from local authorities.',
        'Call 112 for urgent support and keep emergency contacts informed.'
    ];
}

async function generateSmartEvacuationGuide(incident) {
    const panel = document.getElementById('evacuationGuidePanel');
    if (!panel) return;

    panel.innerHTML = `
        <div class="empty-state-box">
            <i class="fas fa-spinner fa-spin"></i>
            <p>Generating smart evacuation plan...</p>
        </div>
    `;

    try {
        const query = `Generate evacuation steps for a ${incident.type || 'general'} incident near ${incident.location || 'current location'} in a hospitality environment. Include concise guest-safe actions.`;

        const response = await fetch(`${PORTAL_API_BASE}/ai-guide`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query, emergencyType: incident.type || 'general', language: 'en' })
        });

        const data = await response.json();
        const steps = parseGuidanceToSteps(data.guidance || '').slice(0, 6);
        const finalSteps = steps.length ? steps : fallbackEvacuationSteps(incident);

        panel.innerHTML = `
            <div class="evacuation-guide-content">
                <h4>${incident.title || 'Incident'} • Evacuation Steps</h4>
                <ol>
                    ${finalSteps.map((step) => `<li>${step}</li>`).join('')}
                </ol>
            </div>
        `;
    } catch (error) {
        console.error('❌ Failed to generate evacuation guide:', error);
        const fallback = fallbackEvacuationSteps(incident);
        panel.innerHTML = `
            <div class="evacuation-guide-content">
                <h4>${incident.title || 'Incident'} • Evacuation Steps</h4>
                <ol>
                    ${fallback.map((step) => `<li>${step}</li>`).join('')}
                </ol>
            </div>
        `;
    }
}

function getHelpForIncident(incidentId) {
    selectIncident(incidentId);
    const panel = document.getElementById('evacuationGuidePanel');
    if (panel) panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function viewOnMapForIncident(incidentId) {
    const incident = findIncidentById(incidentId);
    if (!incident) {
        if (typeof showTab === 'function') showTab('map');
        return;
    }

    if (typeof showTab === 'function') {
        showTab('map');
    }

    toast(`📍 ${incident.title || 'Incident'} highlighted on map context`, 'info');
}

function selectSafeZone(zoneId) {
    nearbyState.selectedSafeZoneId = zoneId;
    renderSafeZones(nearbyState.safeZones, zoneId);
    syncSafeZonesOnMap(nearbyState.safeZones, zoneId);
}

function getSafeZoneById(zoneId) {
    return nearbyState.safeZones.find((zone) => String(zone.id) === String(zoneId));
}

function viewSafeZoneOnMap(zoneId) {
    const zone = getSafeZoneById(zoneId);
    if (!zone) return;

    selectSafeZone(zoneId);

    if (typeof showTab === 'function') {
        showTab('map');
    }

    if (typeof window.highlightNearbySafeZoneOnMap === 'function') {
        window.highlightNearbySafeZoneOnMap(zone);
    }
}

function navigateToSafeZone(zoneId) {
    const zone = getSafeZoneById(zoneId);
    if (!zone) return;

    selectSafeZone(zoneId);

    if (typeof window.loadEvacuationRoute === 'function' && nearbyState.activeIncident) {
        window.loadEvacuationRoute(nearbyState.activeIncident, true);
        return;
    }

    const url = `https://www.google.com/maps/dir/?api=1&destination=${zone.lat},${zone.lng}`;
    window.open(url, '_blank', 'noopener');
    toast(`🧭 Navigation opened for ${zone.name}`, 'info');
}

function callEmergency(number) {
    window.location.href = `tel:${number}`;
}

function askAI() {
    if (typeof showTab === 'function') {
        showTab('chat');
    }
}

async function createAlertBeacon() {
    try {
        if (!nearbyState.location) {
            nearbyState.location = await getCurrentLocation();
        }

        const message = prompt('📢 What help do you need? (e.g., Medical emergency in lobby)');
        if (!message) return;

        setLoading(true);
        const response = await fetch(`${API_BASE}/nearby/alert`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                latitude: nearbyState.location.lat,
                longitude: nearbyState.location.lng,
                message,
                radius: 2
            })
        });

        const data = await response.json();
        if (data.success) {
            toast('🚨 SOS Beacon activated successfully', 'success');
        } else {
            toast('❌ Failed to activate SOS beacon', 'error');
        }
    } catch (error) {
        console.error('❌ createAlertBeacon failed:', error);
        toast('❌ SOS beacon failed', 'error');
    } finally {
        setLoading(false);
    }
}

async function triggerVoiceEmergency(intentType, transcript) {
    try {
        if (!nearbyState.location) {
            nearbyState.location = await getCurrentLocation();
        }

        await fetch(`${PORTAL_API_BASE}/sos-log`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                emergencyType: intentType,
                latitude: nearbyState.location.lat,
                longitude: nearbyState.location.lng,
                language: 'en',
                customDescription: transcript
            })
        });

        const aiResponse = await fetch(`${PORTAL_API_BASE}/ai-guide`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                query: `Emergency voice request: ${transcript}. Provide instant actions.`,
                emergencyType: intentType,
                language: 'en'
            })
        }).then((r) => r.json()).catch(() => ({ guidance: '' }));

        const tempIncident = {
            id: 'voice-emergency',
            type: intentType,
            title: `Voice Emergency: ${intentType}`,
            location: 'Current location'
        };

        const panel = document.getElementById('evacuationGuidePanel');
        if (panel) {
            const steps = parseGuidanceToSteps(aiResponse.guidance || '').slice(0, 5);
            const finalSteps = steps.length ? steps : fallbackEvacuationSteps(tempIncident);
            panel.innerHTML = `
                <div class="evacuation-guide-content">
                    <h4>Voice Mode Response • ${intentType.toUpperCase()}</h4>
                    <ol>
                        ${finalSteps.map((step) => `<li>${step}</li>`).join('')}
                    </ol>
                </div>
            `;
        }

        if (window.speechSynthesis && aiResponse.guidance) {
            const utterance = new SpeechSynthesisUtterance(parseGuidanceToSteps(aiResponse.guidance).slice(0, 2).join('. '));
            utterance.lang = 'en-IN';
            utterance.rate = 0.95;
            window.speechSynthesis.speak(utterance);
        }

        toast(`🚨 Voice SOS triggered for ${intentType}`, 'warning');
    } catch (error) {
        console.error('❌ triggerVoiceEmergency failed:', error);
        toast('❌ Voice emergency failed. Please use SOS button.', 'error');
    }
}

async function handleHeardEmergency(transcript, intentType) {
    const detectedType = intentType || detectVoiceIntent(transcript);
    const normalizedType = detectedType === 'custom' ? 'general' : detectedType;

    if (!nearbyState.location) {
        nearbyState.location = await getCurrentLocation();
    }

    const guidedIncident = {
        id: `voice-${Date.now()}`,
        type: normalizedType,
        title: `Voice Detected: ${normalizedType}`,
        location: 'Current location',
        severity: normalizedType === 'flood' || normalizedType === 'fire' ? 'high' : 'medium',
        distance: '0 km away'
    };

    nearbyState.activeIncident = guidedIncident;
    generateSmartEvacuationGuide(guidedIncident);
    await loadSafeZones(guidedIncident, { showToast: false });
    toast(`🗺️ AI guide and safe places loaded for ${normalizedType}`, 'success');
}

function detectVoiceIntent(text) {
    const input = String(text || '').toLowerCase();

    if (input.includes('fire')) return 'fire';
    if (input.includes('medical') || input.includes('ambulance')) return 'medical';
    if (input.includes('flood')) return 'flood';
    if (input.includes('earthquake')) return 'earthquake';
    if (input.includes('accident')) return 'accident';
    if (input.includes('theft') || input.includes('threat')) return 'theft';
    return 'custom';
}

function startEmergencyVoiceMode() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        toast('⚠️ Voice mode is not supported in this browser', 'warning');
        return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-IN';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    toast('🎤 Listening... say: help fire / accident nearby', 'info');

    recognition.onresult = async (event) => {
        const transcript = event.results[0][0].transcript;
        const intent = detectVoiceIntent(transcript);

        if (transcript.toLowerCase().includes('help') || transcript.toLowerCase().includes('emergency')) {
            await triggerVoiceEmergency(intent, transcript);
        } else {
            toast(`🗣️ Heard: "${transcript}"`, 'info');

            if (intent !== 'custom') {
                await handleHeardEmergency(transcript, intent);
            } else {
                await getNearbyIncidents(false);
            }
        }
    };

    recognition.onerror = (event) => {
        console.error('❌ Voice mode error:', event.error);
        toast(`⚠️ Voice error: ${event.error}`, 'warning');
    };

    recognition.start();
}

function stopTravelerModeTracking() {
    if (nearbyState.watchId !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(nearbyState.watchId);
        nearbyState.watchId = null;
    }
}

function startTravelerModeTracking() {
    if (!navigator.geolocation) return;

    stopTravelerModeTracking();

    nearbyState.watchId = navigator.geolocation.watchPosition(
        async (position) => {
            const next = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            };

            if (!nearbyState.lastTrackedLocation) {
                nearbyState.lastTrackedLocation = next;
                return;
            }

            const moved = distanceKm(nearbyState.lastTrackedLocation, next);
            if (moved >= 0.25) {
                nearbyState.location = next;
                nearbyState.lastTrackedLocation = next;
                await getNearbyIncidents(false);

                const hasCritical = nearbyState.incidents.some((x) => normalizeSeverity(x.severity) === 'critical');
                if (hasCritical) {
                    toast('⚠️ Auto Safety Mode: critical alerts detected near your movement path', 'warning');
                }
            }
        },
        (error) => {
            console.error('❌ Traveler mode tracking error:', error);
            toast('⚠️ Traveler Mode tracking error', 'warning');
        },
        { enableHighAccuracy: true, maximumAge: 30000, timeout: 15000 }
    );
}

function toggleTravelerMode() {
    nearbyState.travelerMode = !nearbyState.travelerMode;

    if (nearbyState.travelerMode) {
        startTravelerModeTracking();
        toast('🧭 Auto Safety Mode enabled', 'success');
    } else {
        stopTravelerModeTracking();
        toast('🧭 Auto Safety Mode disabled', 'info');
    }

    updateStatusPanel();
}

function showNearbyTab() {
    if (isNearbyTabActive()) {
        getNearbyIncidents();
    }
}

// Compatibility stubs for old AI modal hooks still present in HTML
function showAIRiskDetails() { }
function closeAIRiskModal() {
    const modal = document.getElementById('aiRiskModal');
    if (modal) {
        modal.classList.remove('show');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const nearbyTabLink = document.querySelector('.nav-link[data-tab="nearby"]');
    if (nearbyTabLink) {
        nearbyTabLink.addEventListener('click', () => {
            setTimeout(() => getNearbyIncidents(false), 150);
        });
    }

    // Conservative periodic sync to avoid API pressure.
    setInterval(() => {
        if (isNearbyTabActive() && !nearbyState.travelerMode) {
            getNearbyIncidents(false);
        }
    }, 600000);

    updateStatusPanel();
});

window.loadSafeZones = loadSafeZones;
window.startImmediateEmergencyGuidance = startImmediateEmergencyGuidance;
window.selectSafeZone = selectSafeZone;
window.viewSafeZoneOnMap = viewSafeZoneOnMap;
window.navigateToSafeZone = navigateToSafeZone;
