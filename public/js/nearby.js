// ============================================
// ResQAI - Nearby Crisis System (Frontend)
// ============================================

const API_BASE = 'http://localhost:3000/api';
let currentLocation = null;

console.log('📍 Nearby alerts system loaded');

// ==================== GET NEARBY INCIDENTS ====================

async function getNearbyIncidents() {
    console.log('🔄 getNearbyIncidents called');
    try {
        showLoading(true);

        // Get user's current location
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const { latitude, longitude } = position.coords;
                    currentLocation = { lat: latitude, lng: longitude };
                    console.log('📍 Location fetched:', { latitude, longitude });

                    try {
                        // Fetch both incidents AND AI risks in parallel
                        const incidentsUrl = `${API_BASE}/nearby/nearby?latitude=${latitude}&longitude=${longitude}&radius=5`;
                        console.log('📡 Fetching nearby incidents from:', incidentsUrl);

                        const incidentsResponse = await fetch(incidentsUrl);
                        const incidentsData = await incidentsResponse.json();
                        console.log('✅ Nearby incidents response:', incidentsData);

                        if (incidentsData.success) {
                            displayNearbyIncidents(incidentsData);
                            getRiskZones();
                            showToast(`✅ Found ${incidentsData.total_count} incidents nearby`, 'success');
                        } else {
                            showToast('❌ Failed to fetch nearby incidents', 'error');
                        }

                        // Also fetch AI risk analysis
                        getAIRisks(latitude, longitude);

                    } catch (error) {
                        console.error('Error fetching nearby incidents:', error);
                        showToast('❌ Error fetching incidents', 'error');
                    } finally {
                        showLoading(false);
                    }
                },
                (error) => {
                    console.warn('Geolocation error:', error);
                    showToast('📍 Please enable location access', 'warning');
                    showLoading(false);
                }
            );
        } else {
            showToast('📍 Geolocation not supported', 'warning');
            showLoading(false);
        }
    } catch (error) {
        console.error('Error in getNearbyIncidents:', error);
        showLoading(false);
    }
}

// ==================== DISPLAY INCIDENTS ====================

function displayNearbyIncidents(data) {
    console.log('🎨 Displaying nearby incidents, count:', data.total_count);

    const container = document.getElementById('nearbyContent');
    if (!container) {
        console.error('❌ nearbyContent container not found');
        return;
    }

    // Update status panel
    updateNearbyStatus(data);

    if (data.total_count === 0) {
        container.innerHTML = `
            <div class="empty-state-box">
                <i class="fas fa-check-circle"></i>
                <p>No major incidents nearby. Stay safe!</p>
            </div>
        `;
        return;
    }

    let html = '';
    data.incidents.forEach(incident => {
        const icon = getIncidentIcon(incident.type);
        const distance = incident.distance.toFixed(2);
        const timeAgo = getTimeAgo(incident.timestamp);

        html += `
            <div class="incident-card">
                <div class="incident-card-header">
                    <div>
                        <div class="incident-type-badge">${icon}</div>
                        <div class="incident-title">${incident.type.charAt(0).toUpperCase() + incident.type.slice(1)}</div>
                    </div>
                    <div class="incident-distance">📍 ${distance}km</div>
                </div>
                
                <p class="incident-desc">${incident.description}</p>
                
                <div class="incident-meta">
                    <span>🕐 ${timeAgo}</span>
                    <span class="incident-severity ${incident.severity}">${incident.severity}</span>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
    console.log('✅ Incidents rendered successfully');
}

// ==================== VIEW INCIDENT DETAILS ====================

async function viewIncidentDetails(incidentId) {
    console.log('📖 Viewing incident details:', incidentId);
    try {
        const url = `${API_BASE}/nearby/incident/${incidentId}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.success) {
            const incident = data.incident;
            const coords = `${incident.location.lat.toFixed(4)}, ${incident.location.lng.toFixed(4)}`;
            const time = new Date(incident.timestamp).toLocaleTimeString();

            // Create clean formatted alert message
            const message = `${getIncidentIcon(incident.type)} ${incident.type.toUpperCase()} INCIDENT

📍 Location
${coords}

📏 Distance
${incident.distance.toFixed(2)}km away

⏱️ Time
${time}

📝 Details
${incident.description}

⚠️ Severity
${incident.severity.toUpperCase()}

🔔 Status
${incident.status}

Recommended Actions:
    1. Stay alert and monitor updates
    2. Avoid the affected area
    3. Follow official instructions
    4. Call 112 if you need help`;

            console.log('ℹ️ Showing incident alert:', incident.type);
            alert(message);
        }
    } catch (error) {
        console.error('Error fetching incident details:', error);
        showToast('❌ Failed to fetch incident details', 'error');
    }
}

// ==================== GET RISK ZONES ====================

async function getRiskZones() {
    console.log('🔥 Fetching risk zones');
    try {
        const url = `${API_BASE}/nearby/risk-zones`;
        console.log('📡 Fetching from:', url);

        const response = await fetch(url);
        const data = await response.json();
        console.log('✅ Risk zones response:', data);

        if (data.success) {
            displayRiskZones(data.risk_zones);
        }
    } catch (error) {
        console.error('Error fetching risk zones:', error);
    }
}

// ==================== DISPLAY RISK ZONES ====================

function displayRiskZones(riskZones) {
    console.log('🎨 Displaying risk zones, count:', riskZones.length);

    const container = document.getElementById('riskZonesContainer');

    if (riskZones.length === 0) {
        container.innerHTML = '<div class="empty-state-box"><i class="fas fa-check"></i><p>No immediate risk zones</p></div>';
        return;
    }

    let html = '';

    riskZones.forEach(zone => {
        const icon = getIncidentIcon(zone.type);
        const riskLevel = zone.risk_level.toLowerCase();

        html += `
            <div class="risk-zone-card ${riskLevel}">
                <div class="zone-badge ${riskLevel}">${zone.risk_level}</div>
                <div class="zone-name">${icon} ${zone.type}</div>
                <p class="zone-description">${zone.recommendation}</p>
                <div class="zone-info">
                    <div>📏 Radius: ${zone.radius}km</div>
                </div>
            </div>
        `;
    });

    container.innerHTML = `<div class="risk-zones-grid">${html}</div>`;
    console.log('✅ Risk zones rendered successfully');
}

// ==================== GET AI RISK ANALYSIS ====================

async function getAIRisks(latitude, longitude) {
    console.log('🤖 [AI] Requesting location-based risk analysis');
    try {
        const language = typeof currentLanguage !== 'undefined' ? currentLanguage : 'en';

        const url = `${API_BASE}/nearby/analyze`;
        console.log('📡 [AI] Fetching from:', url);

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                latitude: latitude,
                longitude: longitude,
                language: language
            })
        });

        const data = await response.json();
        console.log('✅ [AI] Risk analysis response:', data);

        if (data.ai_risks && data.ai_risks.length > 0) {
            displayAIRisks(data);
            showToast(`🤖 AI identified ${data.total_risks} potential risks in your area`, 'info');
        } else {
            console.warn('⚠️ [AI] No risks identified');
        }
    } catch (error) {
        console.error('❌ [AI] Error fetching risk analysis:', error);
        // Silently fail - don't disrupt user experience
    }
}

// ==================== DISPLAY AI RISKS ====================

function displayAIRisks(data) {
    console.log('🎨 [AI] Displaying AI risks, count:', data.total_risks);

    const container = document.getElementById('aiRisksContainer');
    if (!container) {
        console.warn('⚠️ [AI] aiRisksContainer not found - creating it');
        // Create container if it doesn't exist
        const nearbyContent = document.getElementById('nearbyContent');
        if (nearbyContent && nearbyContent.parentElement) {
            const aiSection = document.createElement('div');
            aiSection.id = 'aiRisksContainer';
            aiSection.className = 'ai-risks-section';
            nearbyContent.parentElement.insertAdjacentElement('afterend', aiSection);
        } else {
            console.error('❌ [AI] Cannot create container - parent not found');
            return;
        }
    }

    if (!data.ai_risks || data.ai_risks.length === 0) {
        container.innerHTML = `
            <div class="ai-risks-section">
                <h2 class="section-title">🤖 AI Risk Analysis</h2>
                <div class="empty-state-box">
                    <i class="fas fa-robot"></i>
                    <p>No major AI-identified risks in your area</p>
                </div>
            </div>
        `;
        return;
    }

    let html = '<h2 class="section-title">🤖 AI Risk Analysis</h2>';
    html += '<div class="ai-risks-grid">';

    data.ai_risks.forEach((risk) => {
        const icon = getRiskIcon(risk.type);
        const severityClass = risk.severity.toLowerCase();

        html += `
            <div class="ai-risk-card ${severityClass}">
                <div class="risk-header">
                    <div class="risk-icon">${icon}</div>
                    <div class="risk-type">${formatRiskType(risk.type)}</div>
                    <div class="risk-severity-badge ${severityClass}">${risk.severity.toUpperCase()}</div>
                </div>
                
                <p class="risk-message">${risk.message}</p>
                
                <div class="risk-footer">
                    <div class="risk-distance">📍 ${risk.distance || 'Nearby'}</div>
                    <div class="risk-recommendation">${risk.recommendation}</div>
                </div>
            </div>
        `;
    });

    html += '</div>';
    container.innerHTML = html;
    console.log('✅ [AI] AI risks rendered successfully');
}

// ==================== CREATE ALERT BEACON ====================

async function createAlertBeacon() {
    console.log('🚨 SOS Beacon triggered');

    try {
        if (!currentLocation) {
            console.warn('⚠️ No location available for SOS');
            showToast('📍 Please enable location first', 'warning');
            return;
        }

        const message = prompt('📢 What help do you need? (e.g., "Medical emergency" or "Fire hazard")');
        if (!message) {
            console.log('⚠️ SOS cancelled by user');
            return;
        }

        console.log('📍 SOS Location:', currentLocation);
        console.log('📢 SOS Message:', message);

        showLoading(true);

        const url = `${API_BASE}/nearby/alert`;
        console.log('📡 Sending SOS beacon to:', url);

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                latitude: currentLocation.lat,
                longitude: currentLocation.lng,
                message: message,
                radius: 2
            })
        });

        const data = await response.json();
        console.log('✅ SOS beacon response:', data);

        if (data.success) {
            console.log('🚀 SOS beacon activated successfully');
            showToast('🚨 SOS Beacon Activated!', 'success');
            const alertMsg = `🚨 ALERT BEACON ACTIVATED

Your emergency location has been broadcast
to nearby services.

📍 Police
ETA ~${data.eta_minutes.police} minutes

🚑 Ambulance
ETA ~${data.eta_minutes.ambulance} minutes

🔥 Fire Service
${data.fire_service_notified ? 'Notified and responding' : 'Not needed at this time'}

📢 Your Message
    "${message}"

⏱️ Beacon Duration
Your beacon will broadcast for
the next 10 minutes.

    Stay in a safe location.
Help is on the way!`;

            alert(alertMsg);
        } else {
            console.warn('❌ SOS beacon failed:', data);
            showToast('❌ Failed to create alert beacon', 'error');
        }
    } catch (error) {
        console.error('Error creating alert beacon:', error);
        showToast('❌ Error creating beacon', 'error');
    } finally {
        showLoading(false);
    }
}

// ==================== HELPER FUNCTIONS ====================

function getIncidentIcon(type) {
    const icons = {
        fire: '🔥',
        flood: '💧',
        medical: '🚑',
        accident: '⚡',
        other: '🆘'
    };
    return icons[type] || '🆘';
}

function getRiskIcon(type) {
    const icons = {
        fire: '🔥',
        flood: '💧',
        weather_hazard: '⛈️',
        traffic_accident: '🚗',
        medical_emergency: '🚑',
        structural_collapse: '🏢',
        industrial_accident: '⚙️',
        stampede: '👥',
        other: '🆘'
    };
    return icons[type] || '⚠️';
}

function formatRiskType(type) {
    const formatted = {
        fire: 'Fire Hazard',
        flood: 'Flood Risk',
        weather_hazard: 'Weather Hazard',
        traffic_accident: 'Traffic Risk',
        medical_emergency: 'Medical Emergency',
        structural_collapse: 'Structure Risk',
        industrial_accident: 'Industrial Hazard',
        stampede: 'Crowd Risk',
        other: 'Other Risk'
    };
    return formatted[type] || type.replace(/_/g, ' ').toUpperCase();
}

function getTimeAgo(timestamp) {
    const now = new Date();
    const time = new Date(timestamp);
    const diff = Math.floor((now - time) / 1000);

    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
}

// Auto-load nearby incidents when tab is shown
function showNearbyTab() {
    const tab = document.getElementById('nearby');
    if (tab && window.getComputedStyle(tab).display !== 'none') {
        getNearbyIncidents();
    }
}

// ==================== UPDATE STATUS PANEL ====================

function updateNearbyStatus(data) {
    console.log('📊 Updating status panel');
    const incidentCountEl = document.getElementById('incidentCount');
    const riskCountEl = document.getElementById('riskCount');
    const locationStatusEl = document.getElementById('locationStatus');

    if (incidentCountEl) {
        incidentCountEl.textContent = data.total_count || 0;
    }
    if (riskCountEl) {
        riskCountEl.textContent = data.high_risk_count || 0;
    }
    if (locationStatusEl && currentLocation) {
        locationStatusEl.textContent = '✅ Enabled';
        locationStatusEl.style.color = '#51cf66';
        console.log('✅ Location status: Enabled');
    }
}

// ==================== QUICK ACTION: CALL 112 ====================

function callEmergency(number) {
    console.log('📞 Calling emergency number:', number);
    window.location.href = `tel:${number}`;
}

// ==================== QUICK ACTION: ASK AI ====================

function askAI() {
    console.log('🤖 Opening AI chat');
    if (typeof showTab === 'function') {
        showTab('chat');
    } else {
        console.warn('⚠️ showTab function not available');
    }
}

// Load incidents on page load
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Nearby alerts DOM loaded - initializing system');
    console.log('📍 Current location:', currentLocation);

    // Auto-refresh every 30 seconds
    setInterval(() => {
        const nearbyTab = document.getElementById('nearby');
        if (nearbyTab && (nearbyTab.classList.contains('active') || nearbyTab.style.display === 'block')) {
            // Silently refresh in background
            if (currentLocation) {
                console.log('🔄 Auto-refreshing nearby incidents');

                const url = `${API_BASE}/nearby/nearby?latitude=${currentLocation.lat}&longitude=${currentLocation.lng}&radius=5`;
                fetch(url)
                    .then(res => res.json())
                    .then(data => {
                        if (data.success) {
                            console.log('✅ Auto-refresh completed');
                            displayNearbyIncidents(data);
                            getRiskZones();
                        }
                    })
                    .catch(error => console.error('❌ Auto-refresh error:', error));
            }
        }
    }, 30000);

    console.log('✅ Nearby alerts system initialized');
});
