// ================================
// ResQAI - Advanced Features System
// ================================
// Daily Safety Score, Morning Brief, Safe Places, Smart Notifications, Offline Mode

const API_BASE = 'http://localhost:3000/api';
let currentLocation = null;

// ==================== OFFLINE MODE & CACHE ====================

class OfflineCache {
    constructor() {
        this.storageKey = 'resqai_offline_cache';
        this.init();
    }

    init() {
        if (!localStorage.getItem(this.storageKey)) {
            localStorage.setItem(this.storageKey, JSON.stringify({
                safetyScore: null,
                morningBrief: null,
                safePlaces: null,
                aiRisks: null,
                timestamp: null,
                isOffline: false
            }));
        }
    }

    save(key, data) {
        try {
            const cache = JSON.parse(localStorage.getItem(this.storageKey));
            cache[key] = data;
            cache.timestamp = new Date().toISOString();
            localStorage.setItem(this.storageKey, JSON.stringify(cache));
            console.log(`✅ [CACHE] Saved ${key}`);
        } catch (e) {
            console.error('❌ [CACHE] Save failed:', e.message);
        }
    }

    get(key) {
        try {
            const cache = JSON.parse(localStorage.getItem(this.storageKey));
            return cache[key];
        } catch (e) {
            console.error('❌ [CACHE] Get failed:', e.message);
            return null;
        }
    }

    isExpired() {
        try {
            const cache = JSON.parse(localStorage.getItem(this.storageKey));
            if (!cache.timestamp) return true;

            const cacheTime = new Date(cache.timestamp);
            const now = new Date();
            const diffMs = now - cacheTime;
            const diffMins = diffMs / (1000 * 60);

            return diffMins > 60; // Cache expires after 1 hour
        } catch (e) {
            return true;
        }
    }
}

const offlineCache = new OfflineCache();

// ==================== ONLINE STATUS MONITORING ====================

window.addEventListener('online', () => {
    console.log('🌐 [NETWORK] Back online');
    hideOfflineIndicator();
});

window.addEventListener('offline', () => {
    console.log('🌐 [NETWORK] Went offline');
    showOfflineIndicator();
});

function showOfflineIndicator() {
    console.log('📡 [OFFLINE] Showing offline indicator');
    const indicator = document.getElementById('offlineModeIndicator');
    if (indicator) {
        indicator.classList.remove('hidden');
        offlineCache.init();
        offlineCache.save('isOffline', true);
    }
}

function hideOfflineIndicator() {
    console.log('📡 [ONLINE] Hiding offline indicator');
    const indicator = document.getElementById('offlineModeIndicator');
    if (indicator) {
        indicator.classList.add('hidden');
        offlineCache.save('isOffline', false);
    }
}

// ==================== DAILY SAFETY SCORE ====================

async function calculateSafetyScore() {
    console.log('🎯 Calculating daily safety score');

    try {
        // Get user location if available
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const { latitude, longitude } = position.coords;
                    currentLocation = { lat: latitude, lng: longitude };

                    try {
                        const response = await fetch(`${API_BASE}/nearby/safety-score`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ latitude, longitude })
                        });

                        const data = await response.json();
                        if (data.success) {
                            console.log('✅ Safety score calculated:', data.safety_score);
                            offlineCache.save('safetyScore', data);
                            displaySafetyScore(data);
                        }
                    } catch (error) {
                        console.warn('⚠️ Safety score fetch error, using cache:', error.message);
                        const cachedScore = offlineCache.get('safetyScore');
                        if (cachedScore) {
                            displaySafetyScore(cachedScore);
                        }
                    }
                },
                (error) => {
                    console.warn('Geolocation error:', error.message);
                    // Try to show cached score
                    const cachedScore = offlineCache.get('safetyScore');
                    if (cachedScore) {
                        displaySafetyScore(cachedScore);
                    }
                }
            );
        }
    } catch (error) {
        console.error('Error in calculateSafetyScore:', error.message);
    }
}

function displaySafetyScore(data) {
    console.log('🎨 [SCORE] Displaying safety score');

    const scoreValue = document.getElementById('scoreValue');
    const scoreLevel = document.getElementById('scoreLevel');
    const weatherScore = document.getElementById('weatherScore');
    const incidentsScore = document.getElementById('incidentsScore');
    const aiRiskScore = document.getElementById('aiRiskScore');
    const scoreCircle = document.getElementById('scoreCircle');

    if (scoreValue) {
        scoreValue.textContent = data.safety_score;

        // Update level text with emoji
        if (scoreLevel) {
            scoreLevel.textContent = `${data.emoji} ${data.risk_level} risk today`;
        }

        // Update component scores
        if (weatherScore) weatherScore.textContent = `${data.components.weather.score}`;
        if (incidentsScore) incidentsScore.textContent = `${data.components.incidents.score}`;
        if (aiRiskScore) aiRiskScore.textContent = `${data.components.ai_risks.score}`;

        // Color-code the circle based on score
        if (scoreCircle) {
            if (data.safety_score >= 80) {
                scoreCircle.style.boxShadow = '0 0 30px rgba(81, 207, 102, 0.6)';
            } else if (data.safety_score >= 60) {
                scoreCircle.style.boxShadow = '0 0 30px rgba(255, 165, 0, 0.6)';
            } else {
                scoreCircle.style.boxShadow = '0 0 30px rgba(255, 107, 107, 0.6)';
            }
        }

        console.log('✅ Safety score displayed');
    }
}

// ==================== MORNING SAFETY BRIEF ====================

async function showMorningBrief() {
    console.log('🌅 Showing morning safety brief');

    try {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const { latitude, longitude } = position.coords;
                    currentLocation = { lat: latitude, lng: longitude };

                    try {
                        const response = await fetch(`${API_BASE}/nearby/morning-brief`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                latitude,
                                longitude,
                                language: document.getElementById('languageSelect')?.value || 'en'
                            })
                        });

                        const data = await response.json();
                        if (data.success) {
                            console.log('✅ Morning brief fetched');
                            offlineCache.save('morningBrief', data);
                            displayMorningBrief(data);
                        }
                    } catch (error) {
                        console.warn('⚠️ Morning brief fetch error, using cache:', error.message);
                        const cachedBrief = offlineCache.get('morningBrief');
                        if (cachedBrief) {
                            displayMorningBrief(cachedBrief);
                        }
                    }
                },
                (error) => {
                    console.warn('Geolocation error:', error.message);
                    const cachedBrief = offlineCache.get('morningBrief');
                    if (cachedBrief) {
                        displayMorningBrief(cachedBrief);
                    }
                }
            );
        }
    } catch (error) {
        console.error('Error in showMorningBrief:', error.message);
    }
}

function displayMorningBrief(data) {
    console.log('🎨 [BRIEF] Displaying morning brief');

    const briefTitle = document.getElementById('morningBriefTitle');
    const briefTime = document.getElementById('morningBriefTime');
    const briefAlerts = document.getElementById('briefAlerts');
    const briefRecommendations = document.getElementById('briefRecommendations');
    const modal = document.getElementById('morningBriefModal');

    if (data.brief) {
        const brief = data.brief;

        if (briefTitle) briefTitle.textContent = brief.title;
        if (briefTime) briefTime.textContent = `As of ${brief.time}`;

        // Display alerts
        if (briefAlerts && brief.alerts) {
            briefAlerts.innerHTML = brief.alerts.map(alert => `
                <div class="brief-alert-item">
                    <span class="alert-emoji">${alert.emoji}</span>
                    <span class="alert-text">${alert.text}</span>
                </div>
            `).join('');
        }

        // Display recommendations
        if (briefRecommendations && brief.recommendations) {
            briefRecommendations.innerHTML = brief.recommendations.map(rec => `
                <li>${rec}</li>
            `).join('');
        }

        // Show modal
        if (modal) {
            modal.classList.add('show');
            document.body.style.overflow = 'hidden';
            console.log('✅ Morning brief modal displayed');
        }
    }
}

function closeMorningBrief() {
    console.log('❌ Closing morning brief');
    const modal = document.getElementById('morningBriefModal');
    if (modal) {
        modal.classList.remove('show');
        document.body.style.overflow = 'auto';
    }
}

// ==================== SAFE PLACES NEARBY ====================

let currentSafePlacesFilter = 'all';

async function showSafePlaces() {
    console.log('🏥 Fetching safe places');

    try {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const { latitude, longitude } = position.coords;
                    currentLocation = { lat: latitude, lng: longitude };

                    try {
                        const response = await fetch(`${API_BASE}/nearby/safe-places`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                latitude,
                                longitude,
                                category: currentSafePlacesFilter
                            })
                        });

                        const data = await response.json();
                        if (data.success) {
                            console.log('✅ Safe places fetched:', data.total_count);
                            offlineCache.save('safePlaces', data);
                            displaySafePlaces(data);
                        }
                    } catch (error) {
                        console.warn('⚠️ Safe places fetch error, using cache:', error.message);
                        const cachedPlaces = offlineCache.get('safePlaces');
                        if (cachedPlaces) {
                            displaySafePlaces(cachedPlaces);
                        }
                    }
                },
                (error) => {
                    console.warn('Geolocation error:', error.message);
                    const cachedPlaces = offlineCache.get('safePlaces');
                    if (cachedPlaces) {
                        displaySafePlaces(cachedPlaces);
                    }
                }
            );
        }
    } catch (error) {
        console.error('Error in showSafePlaces:', error.message);
    }
}

function displaySafePlaces(data) {
    console.log('🎨 [PLACES] Displaying safe places');

    const placesList = document.getElementById('safePlacesList');
    const modal = document.getElementById('safePlacesModal');

    if (placesList && data.safe_places) {
        placesList.innerHTML = data.safe_places.map(place => {
            let categoryIcon = '';
            if (place.category === 'hospital') categoryIcon = '🏥';
            else if (place.category === 'police') categoryIcon = '🚔';
            else if (place.category === 'shelter') categoryIcon = '🏠';

            return `
                <div class="safe-place-item" onclick="callLocation('${place.name}')">
                    <div class="place-header">
                        <span class="place-icon">${categoryIcon}</span>
                        <span class="place-name">${place.name}</span>
                        <span class="place-distance">📍 ${place.distance.toFixed(1)}km</span>
                    </div>
                    <div class="place-details">
                        <div>📍 ${place.address}</div>
                        ${place.phone ? `<div>📞 ${place.phone}</div>` : ''}
                        ${place.capacity ? `<div>👥 Capacity: ${place.capacity} people</div>` : ''}
                    </div>
                </div>
            `;
        }).join('');

        // Show modal
        if (modal) {
            modal.classList.add('show');
            document.body.style.overflow = 'hidden';
            console.log('✅ Safe places modal displayed');
        }
    }
}

function closeSafePlaces() {
    console.log('❌ Closing safe places');
    const modal = document.getElementById('safePlacesModal');
    if (modal) {
        modal.classList.remove('show');
        document.body.style.overflow = 'auto';
    }
    currentSafePlacesFilter = 'all';
}

function filterSafePlaces(category) {
    console.log('🔍 Filtering safe places by:', category);
    currentSafePlacesFilter = category;

    // Update active tab
    const tabs = document.querySelectorAll('.filter-tab');
    tabs.forEach(tab => tab.classList.remove('active'));
    event.target.classList.add('active');

    showSafePlaces();
}

function callLocation(placeName) {
    console.log('📞 Calling location:', placeName);
    // In real app, would open maps or call the number
    showNotification('📌 Navigate', `Opening maps for ${placeName}`);
}

// ==================== SMART NOTIFICATIONS ====================

function showNotification(title, message, icon = '🔔') {
    console.log(`🔔 [NOTIFICATION] ${title}: ${message}`);

    const container = document.getElementById('smartNotificationsContainer');
    if (!container) return;

    const notif = document.createElement('div');
    notif.className = 'smart-notification';
    notif.innerHTML = `
        <div class="notification-icon">${icon}</div>
        <div class="notification-content">
            <div class="notification-title">${title}</div>
            <div class="notification-message">${message}</div>
        </div>
        <button class="notification-close" onclick="this.parentElement.style.display='none'">
            <i class="fas fa-times"></i>
        </button>
    `;

    container.appendChild(notif);

    // Auto-remove after 6 seconds
    setTimeout(() => {
        if (notif.parentElement) {
            notif.remove();
        }
    }, 6000);
}

// Generate smart notification examples
function generateSmartNotifications() {
    console.log('📣 [SMART NOTIF] Generating example notifications');

    // Random smart notifications
    const notifications = [
        { title: '🌧️ Weather Alert', message: 'Heavy rain expected in 2 hours', icon: '🌧️' },
        { title: '⚠️ Traffic Alert', message: 'Avoid Sector 5 (traffic accident)', icon: '🚗' },
        { title: '🏥 Nearby Hazard', message: 'Medical emergency reported 0.5km away', icon: '🚑' },
        { title: '🔥 Fire Alert', message: 'Fire reported in North zone', icon: '🔥' }
    ];

    // Show random notification (in production, use WebSocket for real-time)
    if (Math.random() > 0.7) {
        const randomNotif = notifications[Math.floor(Math.random() * notifications.length)];
        showNotification(randomNotif.title, randomNotif.message, randomNotif.icon);
    }
}

// ==================== INITIALIZATION ====================

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 [FEATURES] Advanced features system initialized');

    // Calculate safety score on load
    calculateSafetyScore();

    // Show morning brief on first visit today
    const lastBriefDate = localStorage.getItem('lastMorningBriefDate');
    const today = new Date().toDateString();
    if (lastBriefDate !== today) {
        setTimeout(() => {
            showMorningBrief();
            localStorage.setItem('lastMorningBriefDate', today);
        }, 1000);
    }

    // Refresh safety score periodically
    setInterval(() => {
        calculateSafetyScore();
    }, 5 * 60 * 1000); // Every 5 minutes

    // Generate smart notifications periodically
    setInterval(() => {
        generateSmartNotifications();
    }, 15 * 1000); // Every 15 seconds (adjust as needed)

    // Check network status
    if (!navigator.onLine) {
        showOfflineIndicator();
    }

    console.log('✅ Features system ready');
});

// Export functions for global use
window.showMorningBrief = showMorningBrief;
window.closeMorningBrief = closeMorningBrief;
window.showSafePlaces = showSafePlaces;
window.closeSafePlaces = closeSafePlaces;
window.filterSafePlaces = filterSafePlaces;
window.showNotification = showNotification;
window.calculateSafetyScore = calculateSafetyScore;
window.showOfflineIndicator = showOfflineIndicator;
window.hideOfflineIndicator = hideOfflineIndicator;
