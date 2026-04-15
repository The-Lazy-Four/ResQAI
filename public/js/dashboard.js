// ============================================
// ResQAI - Dashboard Logic
// ============================================

const API_BASE_URL = 'http://localhost:3000/api';

let allIncidents = [];
let incidentCount = 0;
let pollingInterval = null;
let activityFeedInterval = null;

// ==================== LOAD INCIDENTS & STATS ====================
async function loadIncidents() {
    try {
        // Show skeleton loader
        showSkeletonLoader(true);

        const response = await fetch(`${API_BASE_URL}/emergencies`);
        const data = await response.json();

        if (response.ok) {
            const previousCount = allIncidents.length;
            allIncidents = data.incidents || [];

            // Check if new incidents were added
            if (allIncidents.length > previousCount) {
                const newCount = allIncidents.length - previousCount;
                showNotification(`🚨 ${newCount} new incident${newCount > 1 ? 's' : ''} reported!`, 'warning');
            }

            renderIncidents(allIncidents);
            updateStats();
            loadAIPredictions();  // NEW: Load predictions
            loadLiveActivityFeed();  // NEW: Load live feed
        } else {
            console.error('Error loading incidents:', data);
            showToast('Error loading incidents', 'error');
        }
    } catch (error) {
        console.error('Error fetching incidents:', error);
        showToast('Failed to load incidents', 'error');
    } finally {
        // Hide skeleton loader
        showSkeletonLoader(false);
    }
}

// ==================== AI PREDICTIONS ====================
async function loadAIPredictions() {
    try {
        const grid = document.getElementById('predictionsGrid');
        if (!grid) return;

        // Extract predictions from incidents
        const allPredictions = [];

        allIncidents.forEach(incident => {
            // Try to parse AI suggestions as JSON
            try {
                let suggestions = incident.ai_suggestions;
                if (typeof suggestions === 'string') {
                    suggestions = JSON.parse(suggestions);
                }

                // If it's an array, add all items
                if (Array.isArray(suggestions)) {
                    allPredictions.push(...suggestions);
                } else if (suggestions && typeof suggestions === 'object') {
                    allPredictions.push(suggestions);
                }
            } catch (e) {
                // If parsing fails, try to display as text
                if (incident.ai_suggestions) {
                    allPredictions.push({
                        text: incident.ai_suggestions,
                        level: 'INFO',
                        icon: 'ℹ️',
                        color: 'blue'
                    });
                }
            }
        });

        // Show AI-generated risk assessment
        if (allPredictions.length === 0) {
            grid.innerHTML = `
                <div class="prediction-card">
                    <span class="prediction-icon">📊</span>
                    <span class="prediction-text">No active risk predictions detected. All systems normal.</span>
                </div>
            `;
            return;
        }

        // Display predictions with color coding
        grid.innerHTML = allPredictions
            .slice(0, 4)  // Show top 4
            .map((pred, idx) => {
                const level = (pred.level || 'MODERATE').toUpperCase();
                const text = pred.text || pred.message || 'Risk assessment ongoing';
                const icon = pred.icon || '⚠️';
                const color = getPredictionColor(pred.color || 'orange');

                return `
                    <div class="prediction-card" style="border-color: ${color};">
                        <span class="prediction-icon">${icon}</span>
                        <div style="flex-direction: column;">
                            <span class="prediction-text" style="font-weight: 600; color: ${color};">
                                ${level}
                            </span>
                            <span class="prediction-text">${text}</span>
                        </div>
                    </div>
                `;
            }).join('');
    } catch (error) {
        console.error('Error loading predictions:', error);
    }
}

function getPredictionColor(colorName) {
    const colors = {
        red: '#ff0043',
        blue: '#00d4ff',
        orange: '#ffa500',
        green: '#00ff41'
    };
    return colors[colorName] || '#ffbe0b';
}

// ==================== LIVE ACTIVITY FEED ====================
async function loadLiveActivityFeed() {
    try {
        const feed = document.getElementById('activityFeed');
        if (!feed) return;

        const response = await fetch(`${API_BASE_URL}/emergencies/feed/live`);
        const data = await response.json();

        if (data.success && data.feed && data.feed.length > 0) {
            feed.innerHTML = data.feed
                .slice(0, 8)  // Show latest 8 activities
                .map(activity => {
                    const time = new Date(activity.timestamp);
                    const timeStr = formatRelativeTime(time);

                    return `
                        <div class="activity-item">
                            <span class="activity-icon">${activity.icon || '📍'}</span>
                            <p>${activity.message}</p>
                            <span class="activity-timestamp">${timeStr}</span>
                        </div>
                    `;
                }).join('');
        } else {
            feed.innerHTML = `
                <div class="activity-item loading">
                    <span class="activity-icon">⏳</span>
                    <p>No activity yet - stay tuned!</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading activity feed:', error);
    }
}

function formatRelativeTime(date) {
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
}

// ==================== RENDER INCIDENTS ====================
function renderIncidents(incidents) {
    const container = document.getElementById('incidentsGrid');
    if (!container) return;

    if (!incidents || incidents.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>No incidents reported. Great news! 🎉</p>
            </div>
        `;
        return;
    }

    container.innerHTML = incidents
        .map(incident => `
            <div class="incident-card severity-${incident.severity}">
                <div class="incident-header">
                    <h3>${incident.classified_type ? incident.classified_type.toUpperCase() : 'INCIDENT'}</h3>
                    <span class="severity-badge">${incident.severity.toUpperCase()}</span>
                </div>
                <p class="incident-description">${incident.description}</p>
                <div class="incident-meta">
                    <span>📍 ${incident.location}</span>
                    <span>🕐 ${formatRelativeTime(new Date(incident.created_at))}</span>
                </div>
                <div class="incident-footer">
                    <button onclick="viewIncidentDetails('${incident.id}')" class="btn-secondary">View Details</button>
                </div>
            </div>
        `).join('');
}

// ==================== UPDATE STATS ====================
function updateStats() {
    if (allIncidents.length === 0) {
        document.getElementById('totalIncidents').textContent = '0';
        document.getElementById('resolvedIncidents').textContent = '0';
        document.getElementById('pendingIncidents').textContent = '0';
        document.getElementById('verifiedIncidents').textContent = '0';
        return;
    }

    const total = allIncidents.length;
    const resolved = allIncidents.filter(i => i.status === 'resolved').length;
    const pending = allIncidents.filter(i => i.status === 'pending').length;
    const verified = allIncidents.filter(i => i.status === 'verified').length;

    document.getElementById('totalIncidents').textContent = total;
    document.getElementById('resolvedIncidents').textContent = resolved;
    document.getElementById('pendingIncidents').textContent = pending;
    document.getElementById('verifiedIncidents').textContent = verified;
}

// ==================== VIEW INCIDENT DETAILS ====================
async function viewIncidentDetails(incidentId) {
    try {
        const response = await fetch(`${API_BASE_URL}/emergencies/${incidentId}`);
        const data = await response.json();

        if (data.success) {
            const incident = data.incident;
            const modal = document.getElementById('incidentModal');

            if (modal) {
                modal.innerHTML = `
                    <div class="modal-content">
                        <span class="close" onclick="closeIncidentModal()">&times;</span>
                        <h2>${incident.title}</h2>
                        <p><strong>Location:</strong> ${incident.location}</p>
                        <p><strong>Description:</strong> ${incident.description}</p>
                        <p><strong>Severity:</strong> ${incident.severity}</p>
                        <p><strong>Status:</strong> ${incident.status}</p>
                        ${incident.ai_predictions ? `<p><strong>AI Analysis:</strong> ${JSON.stringify(incident.ai_predictions)}</p>` : ''}
                    </div>
                `;
                modal.style.display = 'block';
            }
        }
    } catch (error) {
        console.error('Error viewing incident details:', error);
    }
}

function closeIncidentModal() {
    const modal = document.getElementById('incidentModal');
    if (modal) modal.style.display = 'none';
}

// ==================== NOTIFICATIONS ====================
function showNotification(message, type = 'info') {
    // Create notification element
    const notif = document.createElement('div');
    notif.className = `notification notification-${type}`;
    notif.textContent = message;

    const container = document.getElementById('notificationContainer');
    if (container) {
        container.appendChild(notif);

        // Auto-remove after 4 seconds
        setTimeout(() => notif.remove(), 4000);
    }
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => toast.remove(), 3000);
}

// ==================== POLLING & AUTO-REFRESH ====================
function startPolling() {
    // Poll every 30 seconds
    pollingInterval = setInterval(() => {
        loadIncidents();
    }, 30000);

    // Poll activity feed every 10 seconds
    activityFeedInterval = setInterval(() => {
        loadLiveActivityFeed();
    }, 10000);
}

function stopPolling() {
    if (pollingInterval) clearInterval(pollingInterval);
    if (activityFeedInterval) clearInterval(activityFeedInterval);
}

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', () => {
    loadIncidents();
    startPolling();

    // Stop polling when user leaves the page
    window.addEventListener('beforeunload', stopPolling);
});

function showSkeletonLoader(show) {
    const skeleton = document.getElementById('skeletonLoader');
    const emptyState = document.getElementById('emptyState');
    const cardsContainer = document.getElementById('incidentCardsContainer');

    if (show) {
        skeleton.style.display = 'grid';
        emptyState.style.display = 'none';
        if (cardsContainer) cardsContainer.style.display = 'none';
    } else {
        skeleton.style.display = 'none';
    }
}



// Filter and search functionality
document.getElementById('searchIncidents')?.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const statusFilter = document.getElementById('filterStatus').value;

    const filtered = allIncidents.filter(incident => {
        const matchesSearch =
            incident.description.toLowerCase().includes(searchTerm) ||
            incident.location.toLowerCase().includes(searchTerm) ||
            incident.classified_type.toLowerCase().includes(searchTerm);

        const matchesStatus = statusFilter === '' || incident.status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    renderIncidents(filtered);
});

document.getElementById('filterStatus')?.addEventListener('change', (e) => {
    const searchTerm = document.getElementById('searchIncidents').value.toLowerCase();
    const statusFilter = e.target.value;

    const filtered = allIncidents.filter(incident => {
        const matchesSearch =
            incident.description.toLowerCase().includes(searchTerm) ||
            incident.location.toLowerCase().includes(searchTerm) ||
            incident.classified_type.toLowerCase().includes(searchTerm);

        const matchesStatus = statusFilter === '' || incident.status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    renderIncidents(filtered);
});

// Resolve incident
async function resolveIncident(incidentId) {
    showLoading(true);
    try {
        const response = await fetch(`${API_BASE_URL}/emergencies/${incidentId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'resolved' })
        });

        if (response.ok) {
            showToast('Incident marked as resolved!', 'success');
            loadIncidents();
        } else {
            showToast('Error resolving incident', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Failed to resolve incident', 'error');
    } finally {
        showLoading(false);
    }
}

// ==================== MAP FUNCTIONALITY ====================
let mapInstance = null;
let markers = [];

function initMap() {
    // Initialize Leaflet map only once
    if (mapInstance) return;

    // Default to India's center (Delhi region)
    mapInstance = L.map('map').setView([20.5937, 78.9629], 5);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
    }).addTo(mapInstance);

    updateMapMarkers();
}

function updateMapMarkers() {
    if (!mapInstance) return;

    // Clear existing markers
    markers.forEach(marker => mapInstance.removeLayer(marker));
    markers = [];

    // Add new markers
    allIncidents.forEach(incident => {
        const coords = parseCoordinates(incident.location);
        if (coords) {
            const icon = L.divIcon({
                html: `<div style="background: ${getMarkerColor(incident.classified_type)}; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; border: 2px solid white; box-shadow: 0 2px 10px rgba(0,0,0,0.3);">${getEmergencyIcon(incident.classified_type)}</div>`,
                iconSize: [30, 30],
                className: 'custom-icon'
            });

            const marker = L.marker([coords.lat, coords.lng], { icon })
                .bindPopup(`
                    <div style="color: #000; font-weight: bold;">
                        ${incident.classified_type.toUpperCase()}
                    </div>
                    <small>${incident.location}</small>
                `)
                .addTo(mapInstance);

            markers.push(marker);
        }
    });

    // Fit bounds if markers exist
    if (markers.length > 0) {
        const group = new L.featureGroup(markers);
        mapInstance.fitBounds(group.getBounds().pad(0.1));
    }
}

function parseCoordinates(location) {
    // Try to parse "lat, lng" format
    const match = location.match(/(-?\d+\.?\d*),\s*(-?\d+\.?\d*)/);
    if (match) {
        return { lat: parseFloat(match[1]), lng: parseFloat(match[2]) };
    }

    // Generate random coordinates in NYC area as fallback
    const lat = 40.7128 + (Math.random() - 0.5) * 0.1;
    const lng = -74.0060 + (Math.random() - 0.5) * 0.1;
    return { lat, lng };
}

function getMarkerColor(type) {
    const colors = {
        fire: '#ff0043',
        flood: '#0064ff',
        medical: '#00ff41',
        accident: '#ffa500'
    };
    return colors[type] || '#00d4ff';
}

// Update map when incidents load
const originalLoadIncidents = window.loadIncidents;
window.loadIncidents = async function () {
    await originalLoadIncidents.call(this);
    updateMapMarkers();
};
