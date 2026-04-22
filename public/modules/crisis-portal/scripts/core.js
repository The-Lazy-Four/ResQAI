/**
 * ResQAI Crisis Portal - Core State Management & Initialization
 * Central state store and system initialization
 */

export const CrisisState = {
    // UI State
    activeSection: 'command-center',
    currentPage: 'command-center',

    // System Status
    safetyStatus: 'SECURE',
    systemOperational: true,
    trainingMode: true,

    // SOS State
    sosActivated: false,
    sosType: null,
    sosTimestamp: null,

    // Location
    locationEnabled: true,
    userLocation: {
        sector: '7G',
        coordinates: { lat: 40.7128, lng: -74.0060 }
    },

    // Emergency Contacts
    emergencyContacts: {
        '112': 'Universal Emergency',
        '101': 'Fire Department',
        '108': 'Ambulance',
        '100': 'Police'
    },

    // Live Alerts (Dynamic)
    alerts: [
        {
            id: 1,
            type: 'fire',
            title: 'Structural Fire',
            description: 'Emergency teams deployed to Zone B industrial complex. Evacuate immediately.',
            severity: 'CRITICAL',
            distance: '1.2 KM',
            timestamp: new Date(Date.now() - 4 * 60000),
            icon: 'local_fire_department',
            units: ['FD-01', 'FD-03'],
            status: 'ACTIVE'
        },
        {
            id: 2,
            type: 'medical',
            title: 'Mass Casualty Event',
            description: 'Transit collision at Main Intersection. Ambulances on route. Traffic blocked.',
            severity: 'MEDIUM',
            distance: '3.8 KM',
            timestamp: new Date(Date.now() - 12 * 60000),
            icon: 'medical_services',
            units: ['AMB-02', 'AMB-05'],
            status: 'IN_PROGRESS'
        },
        {
            id: 3,
            type: 'power',
            title: 'Grid Instability',
            description: 'Localized power outage in Sector 4. Estimated repair: 2 hours.',
            severity: 'LOW',
            distance: '4.5 KM',
            timestamp: new Date(Date.now() - 45 * 60000),
            icon: 'power_off',
            units: ['UTIL-01'],
            status: 'MONITORING'
        }
    ],

    // Emergency Units (Deployment tracking)
    emergencyUnits: [
        { id: 'FD-01', type: 'Fire', status: 'ACTIVE', location: '1.2 KM', assigned: 1 },
        { id: 'FD-03', type: 'Fire', status: 'EN_ROUTE', location: '2.1 KM', assigned: 1 },
        { id: 'AMB-02', type: 'Ambulance', status: 'ACTIVE', location: '3.8 KM', assigned: 2 },
        { id: 'AMB-05', type: 'Ambulance', status: 'EN_ROUTE', location: '4.2 KM', assigned: 2 },
        { id: 'POL-01', type: 'Police', status: 'IDLE', location: '2.5 KM', assigned: 0 },
        { id: 'UTIL-01', type: 'Utility', status: 'MONITORING', location: '4.5 KM', assigned: 3 }
    ],

    // Sensor Data (Signal Hub)
    sensors: [
        { id: 'FIRE_01', type: 'Fire', zone: 'Zone B', reading: 'HIGH', status: 'ALERT', lastUpdate: new Date() },
        { id: 'SMOKE_01', type: 'Smoke', zone: 'Zone B', reading: 'CRITICAL', status: 'ALERT', lastUpdate: new Date() },
        { id: 'MOTION_01', type: 'Motion', zone: 'Zone C', reading: 'ACTIVE', status: 'NORMAL', lastUpdate: new Date() },
        { id: 'GAS_01', type: 'Gas Leak', zone: 'Sector 4', reading: 'CLEAR', status: 'NORMAL', lastUpdate: new Date() }
    ],

    // Safety Tips
    safetyTips: [
        {
            title: 'Smoke Inhalation Prevention',
            description: 'Stay low to the floor. Use a damp cloth to cover nose and mouth. Move towards exits.',
            icon: 'medical_information',
            category: 'fire'
        },
        {
            title: 'Emergency Assembly Point',
            description: 'Know your building\'s assembly point. Head there calmly and await further instructions.',
            icon: 'groups',
            category: 'general'
        },
        {
            title: 'Communication Protocol',
            description: 'Keep your phone charged. Text when voice lines are congested. Provide location info.',
            icon: 'phone_in_talk',
            category: 'general'
        }
    ],

    // Incident History
    incidentHistory: [
        { id: 101, type: 'fire', title: 'Building Fire - Sector 5', status: 'RESOLVED', date: '2026-04-20', duration: '2h 15m' },
        { id: 102, type: 'medical', title: 'Traffic Collision', status: 'RESOLVED', date: '2026-04-19', duration: '1h 45m' },
        { id: 103, type: 'power', title: 'Power Outage - Grid Section 3', status: 'RESOLVED', date: '2026-04-18', duration: '3h 30m' }
    ],

    // Voice State
    isListening: false,
    lastVoiceCommand: null,

    // Chat History
    chatHistory: []
};

/**
 * Save state to localStorage
 */
export function saveStateToStorage() {
    try {
        const stateToSave = {
            alerts: CrisisState.alerts,
            sosActivated: CrisisState.sosActivated,
            sosType: CrisisState.sosType,
            sosTimestamp: CrisisState.sosTimestamp,
            userLocation: CrisisState.userLocation,
            safetyStatus: CrisisState.safetyStatus,
            chatHistory: CrisisState.chatHistory,
            incidentHistory: CrisisState.incidentHistory
        };
        localStorage.setItem('crisisState', JSON.stringify(stateToSave));
        console.log('💾 State saved to localStorage');
    } catch (err) {
        console.error('❌ Failed to save state:', err);
    }
}

/**
 * Load state from localStorage
 */
export function loadStateFromStorage() {
    try {
        const saved = localStorage.getItem('crisisState');
        if (saved) {
            const data = JSON.parse(saved);
            Object.assign(CrisisState, data);
            console.log('📂 State loaded from localStorage');
            return true;
        }
    } catch (err) {
        console.error('❌ Failed to load state:', err);
    }
    return false;
}

/**
 * Fetch live alerts from API
 */
export async function fetchLiveAlerts() {
    try {
        const response = await fetch('/api/nearby', {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });

        if (response.ok) {
            const data = await response.json();
            const newAlerts = data.alerts || [];
            newAlerts.forEach(newAlert => {
                const exists = CrisisState.alerts.find(a => a.id === newAlert.id);
                if (!exists) {
                    CrisisState.alerts.unshift(newAlert);
                    window.dispatchEvent(new CustomEvent('alertAdded', { detail: newAlert }));
                }
            });
            saveStateToStorage();
            return true;
        }
    } catch (err) {
        console.warn('⚠️ Live alerts API unavailable, using simulation:', err.message);
        addRandomAlert();
    }
    return false;
}

/**
 * Initialize the Crisis Portal
 */
export function initializeCrisisPortal() {
    console.log('🚨 ResQAI Crisis Portal Initializing...');

    // Load persistent state
    loadStateFromStorage();

    // Initialize all modules
    initializeClock();
    initializeTimeUpdates();

    console.log('✅ ResQAI Crisis Portal Core Ready');
}

/**
 * Update state and persist
 */
export function setState(path, value) {
    const parts = path.split('.');
    let obj = CrisisState;

    for (let i = 0; i < parts.length - 1; i++) {
        obj = obj[parts[i]];
    }

    obj[parts[parts.length - 1]] = value;
    console.log(`📊 State updated: ${path} =`, value);

    // Auto-save critical state
    if (['alerts', 'sosActivated', 'userLocation', 'safetyStatus'].includes(parts[0])) {
        saveStateToStorage();
    }
}

/**
 * Get state value
 */
export function getState(path) {
    return path.split('.').reduce((obj, key) => obj?.[key], CrisisState);
}

/**
 * Initialize live clock
 */
function initializeClock() {
    const timeDisplay = document.querySelector('p.font-headline.text-on-surface.font-bold.text-lg');

    function updateClock() {
        const now = new Date();
        const utcTime = now.toUTCString().split(' ')[4];
        if (timeDisplay) {
            timeDisplay.textContent = utcTime + ' UTC';
        }
    }

    updateClock();
    setInterval(updateClock, 1000);
}

/**
 * Initialize time-based updates (status changes, alerts, etc.)
 */
function initializeTimeUpdates() {
    // Update safety status every 3-5 minutes randomly
    setInterval(() => {
        updateSafetyStatus();
    }, (Math.random() * 120000) + 180000);

    // Fetch live alerts from API (30s interval) or simulate fallback
    setInterval(() => {
        fetchLiveAlerts();
    }, 30000); // Check every 30 seconds
}

/**
 * Update safety status randomly
 */
function updateSafetyStatus() {
    const newStatus = Math.random() > 0.2 ? 'SECURE' : 'ALERT';
    setState('safetyStatus', newStatus);

    const statusElement = document.querySelector('span.text-xs.font-headline.uppercase.tracking-widest');
    const statusBadge = document.querySelector('div.flex.items-center.gap-2.px-4.py-2.bg-green-500\\/10');

    if (newStatus === 'ALERT') {
        if (statusBadge) {
            statusBadge.classList.remove('bg-green-500/10', 'border-green-500/20');
            statusBadge.classList.add('bg-red-500/10', 'border-red-500/20');
        }
        if (statusElement) {
            statusElement.classList.remove('text-green-500');
            statusElement.classList.add('text-red-500');
            statusElement.textContent = 'STATUS: ALERT';
        }
    }

    console.log(`🛡️ Safety Status: ${newStatus}`);

    // Dispatch event for other modules
    window.dispatchEvent(new CustomEvent('statusChanged', { detail: { status: newStatus } }));
}

/**
 * Add random alert for simulation
 */
function addRandomAlert() {
    const alertTypes = ['fire', 'medical', 'power', 'traffic', 'flooding'];
    const titles = {
        'fire': 'Fire Alert',
        'medical': 'Medical Emergency',
        'power': 'Power Outage',
        'traffic': 'Traffic Incident',
        'flooding': 'Flood Warning'
    };

    const type = alertTypes[Math.floor(Math.random() * alertTypes.length)];
    const newAlert = {
        id: CrisisState.alerts.length + 1,
        type: type,
        title: titles[type],
        description: `New ${type} alert detected in your area.`,
        severity: ['CRITICAL', 'MEDIUM', 'LOW'][Math.floor(Math.random() * 3)],
        distance: `${(Math.random() * 5 + 1).toFixed(1)} KM`,
        timestamp: new Date(),
        icon: 'notifications_active',
        units: [],
        status: 'NEW'
    };

    CrisisState.alerts.unshift(newAlert);

    // Dispatch event
    window.dispatchEvent(new CustomEvent('alertAdded', { detail: newAlert }));
    console.log('🚨 New alert added:', newAlert.title);
}

/**
 * Navigation helper
 */
export function navigateToPage(page) {
    setState('currentPage', page);
    window.location.href = `/modules/crisis-portal/pages/${page}.html`;
}

export default CrisisState;
