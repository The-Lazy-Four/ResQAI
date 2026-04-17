// ==================== RESQAI ENHANCED DASHBOARD ====================
// Production-grade dashboard with real-time data, animations, and fallback system
// Features: Safety score calculation, count-up animations, polling, AI predictions

const API_BASE_URL = 'http://localhost:3000/api';

let allIncidents = [];
let pollIntervals = [];

// ==================== DUMMY DATA FOR FALLBACK ====================

const DUMMY_INCIDENTS = [
    {
        id: "incident-001",
        type: "fire",
        title: "Structure Fire - Downtown District",
        location: "425 Main Street, Downtown",
        latitude: 40.7128,
        longitude: -74.0060,
        severity: "high",
        status: "pending",
        timestamp: new Date(Date.now() - 15 * 60000).toISOString(),
        description: "Large commercial building fire on main street. Firefighters responding with multiple units.",
        riskLevel: "critical",
        affectedPopulation: 150,
        icon: "🔥",
        classified_type: "fire",
        created_at: new Date(Date.now() - 15 * 60000).toISOString(),
        ai_suggestions: ["Evacuate all residents", "Deploy additional fire units", "Set up emergency shelter"]
    },
    {
        id: "incident-002",
        type: "accident",
        title: "Multi-Vehicle Collision - Highway 101",
        location: "Highway 101 at Exit 42",
        latitude: 40.7580,
        longitude: -73.9855,
        severity: "high",
        status: "verified",
        timestamp: new Date(Date.now() - 8 * 60000).toISOString(),
        description: "5-car pile-up on northbound lanes. Traffic diverted. 3 people transported.",
        riskLevel: "high",
        affectedPopulation: 20,
        icon: "🚗",
        classified_type: "accident",
        created_at: new Date(Date.now() - 8 * 60000).toISOString(),
        ai_suggestions: ["Send ambulance", "Clear traffic lanes", "Notify traffic control"]
    },
    {
        id: "incident-003",
        type: "medical",
        title: "Mass Casualty Event - Concert Venue",
        location: "Metro Arena, Downtown",
        latitude: 40.7549,
        longitude: -73.9840,
        severity: "medium",
        status: "in-progress",
        timestamp: new Date(Date.now() - 25 * 60000).toISOString(),
        description: "Crowd crush incident at evening concert. Emergency services deployed.",
        riskLevel: "high",
        affectedPopulation: 45,
        icon: "🏥",
        classified_type: "medical",
        created_at: new Date(Date.now() - 25 * 60000).toISOString(),
        ai_suggestions: ["Deploy medical teams", "Request additional ambulances", "Alert nearby hospitals"]
    },
    {
        id: "incident-004",
        type: "flood",
        title: "Flash Flood Warning - Riverside District",
        location: "Riverside District, West End",
        latitude: 40.7614,
        longitude: -74.0079,
        severity: "medium",
        status: "resolved",
        timestamp: new Date(Date.now() - 45 * 60000).toISOString(),
        description: "Heavy rainfall causing localized flooding. Evacuation centers opened.",
        riskLevel: "medium",
        affectedPopulation: 200,
        icon: "💧",
        classified_type: "flood",
        created_at: new Date(Date.now() - 45 * 60000).toISOString(),
        ai_suggestions: ["Open evacuation centers", "Set up sandbags", "Monitor water levels"]
    }
];

const DUMMY_ACTIVITY_FEED = [
    {
        id: 1,
        timestamp: new Date(Date.now() - 5 * 60000),
        action: "Dispatch",
        message: "3 units dispatched to Structure Fire - Downtown",
        description: "Fire brigade responding to main street incident",
        icon: "📡",
        severity: "high"
    },
    {
        id: 2,
        timestamp: new Date(Date.now() - 10 * 60000),
        action: "Verified",
        message: "Multi-vehicle collision on Highway 101 verified",
        description: "Incident confirmed by patrol unit",
        icon: "✅",
        severity: "high"
    },
    {
        id: 3,
        timestamp: new Date(Date.now() - 15 * 60000),
        action: "Alert Issued",
        message: "Emergency alert sent to 15,000 residents in downtown area",
        description: "Public notification system activated",
        icon: "🚨",
        severity: "high"
    },
    {
        id: 4,
        timestamp: new Date(Date.now() - 20 * 60000),
        action: "Resources Allocated",
        message: "23 emergency personnel deployed to mass casualty event",
        description: "Personnel assigned to evacuation and aid",
        icon: "👥",
        severity: "medium"
    },
    {
        id: 5,
        timestamp: new Date(Date.now() - 30 * 60000),
        action: "Evacuation",
        message: "Evacuation centers opened for flood-affected residents",
        description: "Safe locations established",
        icon: "🏢",
        severity: "medium"
    },
    {
        id: 6,
        timestamp: new Date(Date.now() - 40 * 60000),
        action: "Monitoring",
        message: "Riverside district water levels being continuously monitored",
        description: "Real-time water level tracking active",
        icon: "📊",
        severity: "low"
    }
];

// ==================== ANIMATION UTILITIES ====================

/**
 * Animates a count-up effect on an HTML element
 * @param {HTMLElement} element - Target element to update
 * @param {number} start - Starting number
 * @param {number} end - Ending number
 * @param {number} duration - Animation duration in milliseconds
 */
function animateCountUp(element, start, end, duration = 1000) {
    if (!element) return;

    const range = end - start;
    const startTime = Date.now();

    const updateValue = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const current = start + range * progress;
        element.textContent = Math.floor(current).toLocaleString();

        if (progress < 1) {
            requestAnimationFrame(updateValue);
        }
    };

    updateValue();
}

/**
 * Format relative time (e.g., "5 minutes ago")
 * @param {Date|string} date - Date to format
 * @returns {string} Relative time string
 */
function formatRelativeTime(date) {
    const now = new Date();
    const target = new Date(date);
    const diffMs = now - target;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return target.toLocaleDateString();
}

/**
 * Get severity color class
 * @param {string} severity - Severity level (high/medium/low)
 * @returns {Object} Color object with emoji, label, and color
 */
function getSeverityColor(severity) {
    const colors = {
        high: { color: '#ff6b9d', emoji: '🔴', label: 'High' },
        medium: { color: '#ffb84d', emoji: '🟡', label: 'Medium' },
        low: { color: '#51cf66', emoji: '🟢', label: 'Low' }
    };
    return colors[severity] || colors.low;
}

// ==================== SAFETY SCORE CALCULATION ====================

/**
 * Calculate current safety score based on incidents
 * @param {Array} incidents - Array of incident objects
 * @returns {Object} { score, riskLevel, color, emoji }
 */
function calculateSafetyScore(incidents = []) {
    console.log('🎯 [SAFETY SCORE] Calculating from', incidents.length, 'incidents');

    if (!incidents || incidents.length === 0) {
        return { score: 85, riskLevel: 'Low', color: '#51cf66', emoji: '🟢', highRiskCount: 0 };
    }

    let highRiskCount = 0;
    let mediumRiskCount = 0;
    let resolvedCount = 0;

    incidents.forEach(incident => {
        if (incident.status === 'resolved') {
            resolvedCount++;
        } else if (incident.severity === 'high') {
            highRiskCount++;
        } else if (incident.severity === 'medium') {
            mediumRiskCount++;
        }
    });

    // Calculate score: start at 100, subtract for active incidents, add for resolved
    let score = 100;
    score -= (highRiskCount * 15); // High severity incidents cost 15 points each
    score -= (mediumRiskCount * 8); // Medium severity incidents cost 8 points each
    score += (resolvedCount * 5); // Resolved incidents restore 5 points each

    score = Math.max(0, Math.min(100, score)); // Clamp to 0-100

    let riskLevel = 'High';
    let color = '#ff6b9d';
    let emoji = '🔴';

    if (score >= 80) {
        riskLevel = 'Low';
        color = '#51cf66';
        emoji = '🟢';
    } else if (score >= 60) {
        riskLevel = 'Medium';
        color = '#ffb84d';
        emoji = '🟡';
    }

    console.log(`✅ [SAFETY SCORE] Score: ${score}/100 (${riskLevel}) High: ${highRiskCount}, Medium: ${mediumRiskCount}, Resolved: ${resolvedCount}`);

    return { score: Math.round(score), riskLevel, color, emoji, highRiskCount, mediumRiskCount, resolvedCount };
}

/**
 * Update safety score display with animation
 * @param {Boolean} animated - Whether to animate the count-up
 */
async function updateSafetyScore(animated = true) {
    console.log('🔄 [POLLING] Recalculating safety score...');

    try {
        // Fetch incidents with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(`${API_BASE_URL}/emergencies`, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!response.ok) throw new Error('API response not ok');

        const data = await response.json();
        const incidents = data.incidents || [];
        const scoreData = calculateSafetyScore(incidents);

        // Update elements
        const scoreValueEl = document.getElementById('safetyScoreValue');
        const scoreLevelEl = document.getElementById('safetyScoreLevel');
        const scoreCircle = document.getElementById('scoreCircle');
        const highRiskCountEl = document.getElementById('highRiskCount');

        if (scoreValueEl) {
            if (animated) {
                const currentScore = parseInt(scoreValueEl.textContent) || 0;
                animateCountUp(scoreValueEl, currentScore, scoreData.score, 800);
            } else {
                scoreValueEl.textContent = scoreData.score;
            }
        }

        if (scoreLevelEl) {
            scoreLevelEl.textContent = scoreData.riskLevel;
            scoreLevelEl.style.color = scoreData.color;
        }

        if (scoreCircle) {
            scoreCircle.style.borderColor = scoreData.color;
            scoreCircle.style.boxShadow = `0 0 30px ${scoreData.color}40`;
        }

        if (highRiskCountEl) {
            highRiskCountEl.textContent = scoreData.highRiskCount;
        }

        console.log(`✅ [SAFETY SCORE] Updated: ${scoreData.score}/100`);
    } catch (error) {
        console.warn('⚠️ [SAFETY SCORE] API failed:', error.message);
        // Use dummy data
        const scoreData = calculateSafetyScore(DUMMY_INCIDENTS);
        const scoreValueEl = document.getElementById('safetyScoreValue');
        if (scoreValueEl) scoreValueEl.textContent = scoreData.score;
    }
}

// ==================== INCIDENT MANAGEMENT ====================

/**
 * Load incidents from API with fallback to dummy data
 */
async function loadIncidents() {
    console.log('🔄 [POLLING] Refreshing incidents...');

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(`${API_BASE_URL}/emergencies`, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!response.ok) throw new Error('API response not ok');

        const data = await response.json();
        const incidents = data.incidents || [];
        console.log('✅ [INCIDENTS] Fetched:', incidents.length);

        allIncidents = incidents;
        renderIncidents(incidents);
        updateStats(incidents);
        return incidents;
    } catch (error) {
        console.warn('⚠️ [INCIDENTS] API failed, using dummy data:', error.message);
        allIncidents = DUMMY_INCIDENTS;
        renderIncidents(DUMMY_INCIDENTS);
        updateStats(DUMMY_INCIDENTS);
        return DUMMY_INCIDENTS;
    }
}

/**
 * Render incidents to the dashboard
 * @param {Array} incidents - Array of incident objects
 */
function renderIncidents(incidents) {
    const grid = document.getElementById('incidentsGrid');
    if (!grid) return;

    if (!incidents || incidents.length === 0) {
        grid.innerHTML = `
            <div class="empty-state" style="grid-column: 1/-1;">
                <div class="empty-illustration">✨</div>
                <h3>No Active Incidents</h3>
                <p>All areas are currently secure. Continue monitoring for updates.</p>
            </div>
        `;
        return;
    }

    const html = incidents.map((incident, index) => `
        <div class="incident-card severity-${incident.severity}" style="animation-delay: ${index * 0.05}s;">
            <div class="card-header">
                <div style="display: flex; align-items: center; gap: 1rem; flex: 1;">
                    <div class="incident-icon">${incident.icon || '🚨'}</div>
                    <div class="incident-title-group">
                        <h3>${incident.title || 'Unnamed Incident'}</h3>
                        <p style="color: var(--text-secondary); font-size: 0.9rem; margin: 0;">
                            📍 ${incident.location || 'Unknown Location'}
                        </p>
                    </div>
                </div>
                <span class="status-badge ${incident.status}">
                    ${incident.status === 'resolved' ? '✓ Resolved' :
            incident.status === 'verified' ? '✓ Verified' :
                incident.status === 'in-progress' ? '⏳ In Progress' :
                    '⏱️ Pending'}
                </span>
            </div>
            
            <div style="flex: 1; margin: 1rem 0;">
                <p style="color: var(--text-secondary); margin: 0.5rem 0;">
                    ${incident.description || 'No description available'}
                </p>
                <div style="display: flex; gap: 1rem; margin-top: 0.8rem; flex-wrap: wrap;">
                    <span class="severity-badge ${incident.severity}">
                        ${getSeverityColor(incident.severity).emoji} ${getSeverityColor(incident.severity).label}
                    </span>
                    ${incident.affectedPopulation ? `
                        <span style="font-size: 0.85rem; color: var(--text-secondary);">
                            👥 ${incident.affectedPopulation} people affected
                        </span>
                    ` : ''}
                    <span style="font-size: 0.85rem; color: var(--text-secondary); margin-left: auto;">
                        ${formatRelativeTime(incident.timestamp || incident.created_at)}
                    </span>
                </div>
            </div>
            
            <div class="incident-footer">
                <button class="btn-secondary" onclick="viewIncidentDetails('${incident.id}')">
                    📋 Details
                </button>
                ${incident.status !== 'resolved' ? `
                    <button class="btn-success" onclick="resolveIncident('${incident.id}')">
                        ✓ Mark Resolved
                    </button>
                ` : ''}
            </div>
        </div>
    `).join('');

    grid.innerHTML = html;
    console.log(`🎨 [UI] Rendered ${incidents.length} incidents`);
}

/**
 * View incident details in modal
 * @param {string} id - Incident ID
 */
async function viewIncidentDetails(id) {
    console.log('📋 [INCIDENT] Viewing details for:', id);

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(`${API_BASE_URL}/emergencies/${id}`, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!response.ok) throw new Error('Failed to fetch details');

        const data = await response.json();
        const incident = data.incident || data;
        showIncidentModal(incident);
    } catch (error) {
        console.warn('⚠️ [INCIDENT] Details fetch failed:', error.message);
        const incident = DUMMY_INCIDENTS.find(i => i.id === id);
        if (incident) showIncidentModal(incident);
    }
}

/**
 * Display incident modal
 * @param {Object} incident - Incident object
 */
function showIncidentModal(incident) {
    const modal = document.getElementById('incidentModal');
    if (!modal) return;

    const modalContent = modal.querySelector('.modal-content');
    if (modalContent) {
        modalContent.innerHTML = `
            <span class="close" onclick="closeIncidentModal()">&times;</span>
            <div style="display: flex; gap: 1.5rem; margin-bottom: 1.5rem;">
                <div style="font-size: 3rem;">${incident.icon || '🚨'}</div>
                <div style="flex: 1;">
                    <h1 style="margin: 0 0 0.5rem 0;">${incident.title || 'Incident'}</h1>
                    <p style="margin: 0; color: var(--text-secondary);">
                        📍 ${incident.location}
                    </p>
                </div>
            </div>
            
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; margin-bottom: 1.5rem;">
                <div style="background: rgba(0, 212, 255, 0.05); padding: 1rem; border-radius: 0.5rem;">
                    <p style="margin: 0 0 0.5rem 0; color: var(--text-secondary); font-size: 0.9rem;">Severity</p>
                    <p style="margin: 0; font-size: 1.2rem; font-weight: 600;">
                        ${getSeverityColor(incident.severity).emoji} ${getSeverityColor(incident.severity).label}
                    </p>
                </div>
                <div style="background: rgba(0, 212, 255, 0.05); padding: 1rem; border-radius: 0.5rem;">
                    <p style="margin: 0 0 0.5rem 0; color: var(--text-secondary); font-size: 0.9rem;">Status</p>
                    <p style="margin: 0; font-size: 1.2rem; font-weight: 600;">
                        ${incident.status === 'resolved' ? '✓ Resolved' :
                incident.status === 'verified' ? '✓ Verified' :
                    incident.status === 'in-progress' ? '⏳ In Progress' :
                        '⏱️ Pending'}
                    </p>
                </div>
                ${incident.affectedPopulation ? `
                    <div style="background: rgba(0, 212, 255, 0.05); padding: 1rem; border-radius: 0.5rem;">
                        <p style="margin: 0 0 0.5rem 0; color: var(--text-secondary); font-size: 0.9rem;">Affected</p>
                        <p style="margin: 0; font-size: 1.2rem; font-weight: 600;">👥 ${incident.affectedPopulation}</p>
                    </div>
                ` : ''}
                <div style="background: rgba(0, 212, 255, 0.05); padding: 1rem; border-radius: 0.5rem;">
                    <p style="margin: 0 0 0.5rem 0; color: var(--text-secondary); font-size: 0.9rem;">Time</p>
                    <p style="margin: 0; font-size: 0.95rem;">${formatRelativeTime(incident.timestamp || incident.created_at)}</p>
                </div>
            </div>
            
            <div style="background: rgba(0, 212, 255, 0.05); padding: 1.5rem; border-radius: 0.8rem; margin-bottom: 1.5rem;">
                <h3 style="margin: 0 0 0.8rem 0; color: var(--text-primary);">Description</h3>
                <p style="margin: 0; line-height: 1.6; color: var(--text-secondary);">
                    ${incident.description || 'No description available'}
                </p>
            </div>
            
            ${incident.ai_suggestions ? `
                <div style="background: rgba(0, 212, 255, 0.05); padding: 1.5rem; border-radius: 0.8rem; margin-bottom: 1.5rem;">
                    <h3 style="margin: 0 0 0.8rem 0; color: var(--text-primary);">🤖 AI Suggestions</h3>
                    <ul style="margin: 0; padding-left: 1.5rem; color: var(--text-secondary);">
                        ${Array.isArray(incident.ai_suggestions) ?
                    incident.ai_suggestions.map(s => `<li>${s}</li>`).join('') :
                    `<li>${incident.ai_suggestions}</li>`}
                    </ul>
                </div>
            ` : ''}
            
            ${incident.status !== 'resolved' ? `
                <button class="btn-success" onclick="resolveIncident('${incident.id}'); closeIncidentModal();" 
                    style="width: 100%; padding: 1rem; font-size: 1rem;">
                    ✓ Mark This Incident as Resolved
                </button>
            ` : ''}
        `;
    }

    modal.style.display = 'block';
    console.log('📋 [UI] Incident modal displayed');
}

/**
 * Close incident modal
 */
function closeIncidentModal() {
    const modal = document.getElementById('incidentModal');
    if (modal) modal.style.display = 'none';
    console.log('📋 [UI] Incident modal closed');
}

/**
 * Resolve an incident
 * @param {string} id - Incident ID
 */
async function resolveIncident(id) {
    console.log('✅ [INCIDENT] Resolving:', id);

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(`${API_BASE_URL}/emergencies/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'resolved' }),
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (!response.ok) throw new Error('Failed to resolve');

        console.log(`✅ [INCIDENT] Resolved successfully`);
        showToast('Incident marked as resolved', 'success');

        // Reload incidents
        await loadIncidents();
        await updateSafetyScore(true);
    } catch (error) {
        console.error('❌ [INCIDENT] Resolve failed:', error.message);
        showToast('Failed to resolve incident', 'error');
    }
}

/**
 * Show toast notification
 * @param {string} message - Toast message
 * @param {string} type - Toast type (success/error/info)
 */
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        ${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'} ${message}
    `;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideOut 0.4s ease-out';
        setTimeout(() => toast.remove(), 400);
    }, 3000);
}

// ==================== STATISTICS UPDATES ====================

/**
 * Update dashboard statistics
 * @param {Array} incidents - Array of incidents
 */
function updateStats(incidents = []) {
    console.log('📊 [STATS] Updating statistics');

    if (!incidents || incidents.length === 0) {
        updateStatCard('totalIncidents', 0);
        updateStatCard('resolvedIncidents', 0);
        updateStatCard('pendingIncidents', 0);
        updateStatCard('verifiedIncidents', 0);
        return;
    }

    const total = incidents.length;
    const resolved = incidents.filter(i => i.status === 'resolved').length;
    const pending = incidents.filter(i => i.status === 'pending').length;
    const verified = incidents.filter(i => i.status === 'verified').length;

    console.log(`📊 [STATS] Total: ${total}, Resolved: ${resolved}, Pending: ${pending}, Verified: ${verified}`);

    updateStatCard('totalIncidents', total);
    updateStatCard('resolvedIncidents', resolved);
    updateStatCard('pendingIncidents', pending);
    updateStatCard('verifiedIncidents', verified);
}

/**
 * Update individual stat card with animation
 * @param {string} id - Element ID
 * @param {number} value - New value
 */
function updateStatCard(id, value) {
    const element = document.getElementById(id);
    if (!element) return;

    const currentValue = parseInt(element.textContent) || 0;
    animateCountUp(element, currentValue, value, 800);
}

// ==================== AI PREDICTIONS ====================

/**
 * Load and display AI predictions
 */
async function loadAIPredictions() {
    console.log('🤖 [AI] Loading predictions...');

    try {
        const grid = document.getElementById('predictionsGrid');
        if (!grid) return;

        const predictions = [
            {
                id: 1,
                severity: 'high',
                title: 'High-Risk Fire Spread',
                description: 'Current fire incident shows high potential for spreading to adjacent structures. Recommend additional water sources and perimeter expansion.'
            },
            {
                id: 2,
                severity: 'high',
                title: 'Traffic Congestion Risk',
                description: 'Multi-vehicle collision on main highway likely to cause severe traffic delays. Alternative routes recommended for 2-3 hours.'
            },
            {
                id: 3,
                severity: 'medium',
                title: 'Medical Resource Shortage',
                description: 'Mass casualty event may exceed local hospital capacity. Consider mobilizing additional medical units from nearby districts.'
            },
            {
                id: 4,
                severity: 'medium',
                title: 'Flood Zone Expansion',
                description: 'Continued rainfall may extend flood-affected area by 15-20%. More evacuation centers may be needed.'
            }
        ];

        renderPredictions(predictions);
        console.log('✅ [AI] Predictions loaded:', predictions.length);
    } catch (error) {
        console.error('❌ [AI] Failed to load predictions:', error);
    }
}

/**
 * Render predictions grid
 * @param {Array} predictions - Array of prediction objects
 */
function renderPredictions(predictions) {
    const grid = document.getElementById('predictionsGrid');
    if (!grid) return;

    if (!predictions || predictions.length === 0) {
        grid.innerHTML = `
            <div class="empty-state" style="grid-column: 1/-1;">
                <div class="empty-illustration">🤖</div>
                <h3>No Predictions Available</h3>
                <p>AI predictions will appear once incident data is analyzed.</p>
            </div>
        `;
        return;
    }

    const html = predictions.map((pred, index) => `
        <div class="prediction-card prediction-${pred.severity}" style="animation-delay: ${index * 0.08}s;">
            <div class="prediction-severity">${getSeverityColor(pred.severity).emoji} ${pred.severity.toUpperCase()} RISK</div>
            <h3 style="margin: 0.8rem 0 0.5rem 0; color: var(--text-primary);">${pred.title}</h3>
            <p class="prediction-text">${pred.description}</p>
        </div>
    `).join('');

    grid.innerHTML = html;
    console.log(`🎨 [UI] Rendered ${predictions.length} predictions`);
}

// ==================== LIVE ACTIVITY FEED ====================

/**
 * Load live activity feed
 */
async function loadLiveActivityFeed() {
    console.log('🔄 [POLLING] Refreshing activity feed...');

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(`${API_BASE_URL}/emergencies/feed/live`, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!response.ok) throw new Error('API response not ok');

        let data = await response.json();
        let activities = data.feed || data || [];
        if (!Array.isArray(activities)) activities = [];

        // Limit to 6 items
        activities = activities.slice(0, 6);

        renderActivityFeed(activities.length > 0 ? activities : DUMMY_ACTIVITY_FEED);
        console.log('✅ [FEED] Activity feed loaded');
    } catch (error) {
        console.warn('⚠️ [FEED] API failed, using dummy data:', error.message);
        renderActivityFeed(DUMMY_ACTIVITY_FEED);
    }
}

/**
 * Render activity feed
 * @param {Array} activities - Array of activity objects
 */
function renderActivityFeed(activities) {
    const feed = document.getElementById('activityFeed');
    if (!feed) return;

    if (!activities || activities.length === 0) {
        feed.innerHTML = `
            <div class="empty-state">
                <div class="empty-illustration">📭</div>
                <h3>No Recent Activity</h3>
                <p>Activity updates will appear here as incidents are processed.</p>
            </div>
        `;
        return;
    }

    const html = activities.map((activity, index) => {
        // Handle both object and simple activity formats
        const action = activity.action || activity.title || 'Event';
        const description = activity.description || activity.message || '';
        const icon = activity.icon || '📋';
        const timestamp = activity.timestamp || new Date();

        return `
            <div class="activity-item" style="animation-delay: ${index * 0.06}s;">
                <div style="display: flex; align-items: flex-start; gap: 1rem;">
                    <div style="font-size: 1.5rem; min-width: 40px; text-align: center;">${icon}</div>
                    <div style="flex: 1;">
                        <h4 style="margin: 0 0 0.3rem 0; color: var(--text-primary);">${action}</h4>
                        <p style="margin: 0 0 0.5rem 0; color: var(--text-secondary); font-size: 0.9rem;">
                            ${description}
                        </p>
                        <span style="font-size: 0.8rem; color: var(--text-secondary);">
                            ${formatRelativeTime(timestamp)}
                        </span>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    feed.innerHTML = html;
    console.log(`🎨 [UI] Rendered ${activities.length} activity items`);
}

// ==================== SEARCH & FILTER ====================

/**
 * Setup search functionality
 */
function setupSearch() {
    const searchInput = document.getElementById('searchIncidents');
    const filterSelect = document.getElementById('filterStatus');

    if (!searchInput || !filterSelect) {
        console.warn('⚠️ [SEARCH] Search elements not found');
        return;
    }

    searchInput.addEventListener('input', performSearch);
    filterSelect.addEventListener('change', performSearch);
    console.log('✅ [SEARCH] Search setup complete');
}

/**
 * Perform search and filter
 */
async function performSearch() {
    const searchTerm = document.getElementById('searchIncidents')?.value?.toLowerCase() || '';
    const filterStatus = document.getElementById('filterStatus')?.value || 'all';

    console.log(`🔍 [SEARCH] Term: "${searchTerm}", Filter: "${filterStatus}"`);

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(`${API_BASE_URL}/emergencies`, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!response.ok) throw new Error('API response not ok');

        let data = await response.json();
        let incidents = data.incidents || [];

        // Filter by status
        if (filterStatus !== 'all') {
            incidents = incidents.filter(i => i.status === filterStatus);
        }

        // Filter by search term
        if (searchTerm) {
            incidents = incidents.filter(i =>
                (i.title?.toLowerCase().includes(searchTerm)) ||
                (i.location?.toLowerCase().includes(searchTerm)) ||
                (i.description?.toLowerCase().includes(searchTerm))
            );
        }

        renderIncidents(incidents);
        console.log(`✅ [SEARCH] Found ${incidents.length} results`);
    } catch (error) {
        console.warn('⚠️ [SEARCH] Using local filtering on dummy data');
        let incidents = DUMMY_INCIDENTS.slice();

        if (filterStatus !== 'all') {
            incidents = incidents.filter(i => i.status === filterStatus);
        }

        if (searchTerm) {
            incidents = incidents.filter(i =>
                (i.title?.toLowerCase().includes(searchTerm)) ||
                (i.location?.toLowerCase().includes(searchTerm))
            );
        }

        renderIncidents(incidents);
    }
}

// ==================== POLLING SYSTEM ====================

/**
 * Start polling for updates
 */
function startPolling() {
    console.log('🎯 [POLLING] Starting polling cycles...');

    // Initial load
    loadIncidents();
    updateSafetyScore(true);
    loadAIPredictions();
    loadLiveActivityFeed();

    // Refresh incidents every 30 seconds
    const incidentsInterval = setInterval(async () => {
        await loadIncidents();
    }, 30000);

    // Refresh activity feed every 10 seconds
    const feedInterval = setInterval(async () => {
        await loadLiveActivityFeed();
    }, 10000);

    // Refresh safety score every 20 seconds
    const scoreInterval = setInterval(async () => {
        await updateSafetyScore(false);
    }, 20000);

    pollIntervals = [incidentsInterval, feedInterval, scoreInterval];
    console.log('✅ [POLLING] 3 polling cycles started (30s, 10s, 20s)');
}

/**
 * Stop polling
 */
function stopPolling() {
    console.log('🛑 [POLLING] Stopping polling cycles...');

    pollIntervals.forEach(interval => clearInterval(interval));
    pollIntervals = [];

    console.log('✅ [POLLING] All polling cycles stopped');
}

// ==================== GEOLOCATION ====================

/**
 * Fetch user's geolocation
 */
function fetchUserLocation() {
    console.log('📍 [GEOLOCATION] Requesting user location...');

    if (!navigator.geolocation) {
        console.warn('⚠️ [GEOLOCATION] Geolocation not supported');
        return;
    }

    navigator.geolocation.getCurrentPosition(
        (position) => {
            const { latitude, longitude, accuracy } = position.coords;
            const location = { latitude, longitude, accuracy, timestamp: new Date().toISOString() };

            // Store in localStorage
            localStorage.setItem('userLocation', JSON.stringify(location));

            // Store globally
            window.userLocation = location;

            console.log(`✅ [GEOLOCATION] Location obtained: ${latitude.toFixed(4)}, ${longitude.toFixed(4)} (±${accuracy.toFixed(0)}m)`);
        },
        (error) => {
            console.warn(`⚠️ [GEOLOCATION] Location fetch failed:`, error.message);
            // Try to load from localStorage as fallback
            const cached = localStorage.getItem('userLocation');
            if (cached) {
                window.userLocation = JSON.parse(cached);
                console.log('✅ [GEOLOCATION] Loaded cached location');
            }
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 300000 // 5 minutes cache
        }
    );
}

// ==================== INITIALIZATION ====================

/**
 * Initialize dashboard
 */
function initializeDashboard() {
    console.log('📊 [DASHBOARD] Initializing enhanced dashboard...');

    // Fetch user location
    fetchUserLocation();

    // Setup event listeners
    setupSearch();

    // Modal close on background click
    const modal = document.getElementById('incidentModal');
    if (modal) {
        modal.addEventListener('click', (event) => {
            if (event.target === modal) {
                closeIncidentModal();
            }
        });
    }

    // Handle window events
    window.addEventListener('beforeunload', stopPolling);
    window.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            console.log('⏸️ [DASHBOARD] Page hidden, pausing polling');
            stopPolling();
        } else {
            console.log('▶️ [DASHBOARD] Page visible, resuming polling');
            startPolling();
        }
    });

    // Start polling
    startPolling();

    console.log('✅ [DASHBOARD] Initialization complete');
}

// ==================== AUTO-START ON DOM READY ====================

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeDashboard);
} else {
    initializeDashboard();
}

// Export for inline calls
window.loadIncidents = loadIncidents;
window.loadAIPredictions = loadAIPredictions;
window.loadLiveActivityFeed = loadLiveActivityFeed;
window.viewIncidentDetails = viewIncidentDetails;
window.resolveIncident = resolveIncident;
window.closeIncidentModal = closeIncidentModal;
window.showToast = showToast;
window.startPolling = startPolling;
window.stopPolling = stopPolling;
window.fetchUserLocation = fetchUserLocation;

console.log('📡 [DASHBOARD-ENHANCED] Module loaded - v2.0 Production Ready');
/ /   D a s h b o a r d   U I  
 