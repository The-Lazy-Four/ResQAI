// ============================================
// ResQAI - Rapid Crisis Portal Routes
// Complete API for Portal Features
// ============================================

import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { generateAIResponse } from '../../utils/aiRouter.js';

const router = express.Router();

const SAFE_ZONE_SEARCH_RADIUS_METERS = 5000;
const SAFE_ZONE_MAX_DISTANCE_KM = 5;
const SAFE_ZONE_LIMIT = 5;

const SAFE_ZONE_TYPE_RULES = {
    hospital: [
        { key: 'amenity', value: 'hospital' }
    ],
    police: [
        { key: 'amenity', value: 'police' }
    ],
    shelter: [
        { key: 'amenity', value: 'shelter' }
    ],
    open_ground: [
        { key: 'leisure', value: 'park' },
        { key: 'leisure', value: 'playground' },
        { key: 'landuse', value: 'grass' },
        { key: 'natural', value: 'grassland' }
    ],
    elevated_area: [
        { key: 'natural', value: 'peak' },
        { key: 'tourism', value: 'viewpoint' }
    ]
};

const INCIDENT_SAFE_ZONE_RULES = {
    fire: ['hospital', 'open_ground'],
    flood: ['elevated_area', 'shelter'],
    accident: ['hospital'],
    medical: ['hospital'],
    earthquake: ['open_ground', 'shelter'],
    general: ['hospital', 'police', 'shelter']
};

// ==================== SAFETY TIPS DATABASE ====================
const SAFETY_TIPS_POOL = [
    { icon: '🚪', title: 'Know Your Exits', content: 'Always identify the nearest emergency exits when entering any building. In a crisis, knowing at least 2 escape routes can save your life.' },
    { icon: '📞', title: 'Save Emergency Contacts', content: 'Program emergency numbers into your phone. In stress, people forget. Having quick-dial options for 112, police, fire, and ambulance is crucial.' },
    { icon: '👥', title: 'Share Your Location', content: 'Let trusted family members know where you are. Enable location sharing on your phone for quick emergency responder access.' },
    { icon: '💧', title: 'Flood Safety', content: 'Never drive/walk through flooded areas. 6 inches of moving water can knock you off your feet. Turn back, don\'t drown.' },
    { icon: '🔥', title: 'Fire Response', content: 'If trapped: Stay low and move toward fresh air. Leave immediately if possible. Use stairs - never elevators. Close doors behind you.' },
    { icon: '🏃', title: 'Evacuation Procedure', content: 'Walk, don\'t run. Help others if safe. Assembly points are designated for a reason - go there for headcount and information.' },
    { icon: '🆘', title: 'When to Call SOS', content: 'Call 112 for: Life-threatening situations, crimes in progress, medical emergencies, accidents, natural disasters. Your call helps save lives.' },
    { icon: '💣', title: 'Earthquake Safety', content: 'Drop, Cover, Hold: Drop to hands and knees. Take cover under sturdy desk/table. Hold on until shaking stops. Stay away from windows.' },
    { icon: '👮', title: 'If Threatened', content: 'Trust your instincts. Get to a safe place. Call police (100). Never confront the aggressor. Document details (appearance, vehicle, direction) for police.' },
    { icon: '🏥', title: 'First Aid Basics', content: 'Learn CPR and basic first aid. Call 108 for ambulance. Keep first aid kit accessible. Stay calm and follow operator instructions on phone.' },
];

// ==================== SOS EVENT LOG ====================
let sosEventLog = [];

// ==================== GET RANDOM SAFETY TIP ====================
router.get('/safety-tip', async (req, res) => {
    try {
        const { latitude, longitude, language = 'en' } = req.query;

        // Get a random tip from pool
        const randomTip = SAFETY_TIPS_POOL[Math.floor(Math.random() * SAFETY_TIPS_POOL.length)];

        console.log('[RapidPortal] Safety tip fetched');

        res.json({
            success: true,
            tip: randomTip,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ Safety Tip Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch safety tip',
            message: error.message
        });
    }
});

// ==================== GET NEARBY ALERTS WITH AI ANALYSIS ====================
router.get('/nearby-alerts', async (req, res) => {
    try {
        const { latitude, longitude, radius = 5, language = 'en' } = req.query;

        if (!latitude || !longitude) {
            return res.status(400).json({
                success: false,
                error: 'Latitude and longitude are required'
            });
        }

        const userLat = parseFloat(latitude);
        const userLng = parseFloat(longitude);
        const radiusKm = parseFloat(radius);

        console.log(`[RapidPortal] Nearby alerts request: ${userLat}, ${userLng}, radius: ${radiusKm}km`);

        // Generate AI-powered alerts based on location
        const systemPrompt = `You are an emergency response system for India. Generate realistic nearby crisis alerts within 5km radius.`;

        const prompt = `Generate 2-4 realistic crisis alerts that could exist near coordinates ${userLat.toFixed(4)}, ${userLng.toFixed(4)}.
        
Return ONLY valid JSON array (no markdown, no extra text):
[
  {
    "id": "unique-id",
    "type": "fire|flood|medical|accident|weather|theft|earthquake",
    "title": "short title",
    "location": "nearby location name",
    "distance": "X.X km away",
    "severity": "high|medium|low",
    "icon": "emoji",
    "advice": "safety advice",
    "timestamp": "minutes ago text"
  }
]`;

        // Get AI response
        const aiResponse = await generateAIResponse(prompt, language);

        let alerts = [];
        try {
            // Extract JSON from response
            const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                alerts = JSON.parse(jsonMatch[0]);
            }
        } catch (e) {
            console.warn('⚠️ Failed to parse AI response, using fallback alerts');
        }

        // Fallback alerts if AI fails
        if (!alerts || alerts.length === 0) {
            alerts = [
                { id: uuidv4(), type: 'medical', title: 'Medical emergency reported', location: 'Central Hospital Area', distance: '1.2 km away', severity: 'high', icon: '🏥', advice: 'Ambulance en route. Call 108 for updates.', timestamp: '8 mins ago' },
                { id: uuidv4(), type: 'traffic', title: 'Road accident on main highway', location: 'NH-44', distance: '2.5 km away', severity: 'high', icon: '🚨', advice: 'Avoid the affected route. Use alternate roads.', timestamp: '15 mins ago' },
                { id: uuidv4(), type: 'weather', title: 'Thunderstorm warning', location: 'City-wide', distance: 'Your area', severity: 'medium', icon: '⛈️', advice: 'Stay indoors. Avoid open areas and tall structures.', timestamp: '5 mins ago' }
            ];
        }

        // If still no alerts, show safe status
        if (!alerts || alerts.length === 0) {
            alerts = [
                { id: uuidv4(), type: 'safe', title: 'No major incidents detected', location: 'Your area', distance: 'Safe Zone', severity: 'low', icon: '✅', advice: 'No active emergency alerts. Stay vigilant and prepared.', timestamp: 'Just now' }
            ];
        }

        alerts = enrichAlertsWithCoordinates(alerts, userLat, userLng, radiusKm);

        console.log(`[RapidPortal] Generated ${alerts.length} alerts`);

        res.json({
            success: true,
            alerts: alerts,
            count: alerts.length,
            radius: radiusKm,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ Nearby Alerts Error:', error);

        // Return fallback alerts on error
        const fallbackAlerts = [
            { id: uuidv4(), type: 'safe', title: 'No major incidents nearby', location: 'Your area', distance: 'Safe', severity: 'low', icon: '✅', advice: 'System operational. Stay alert.', timestamp: 'Just now' }
        ];

        res.status(200).json({
            success: true,
            alerts: fallbackAlerts,
            count: 1,
            timestamp: new Date().toISOString()
        });
    }
});

// ==================== POST SOS ACTIVATION ====================
router.post('/sos-log', async (req, res) => {
    try {
        const { emergencyType, latitude, longitude, language = 'en', customDescription = '' } = req.body;

        if (!emergencyType || !latitude || !longitude) {
            return res.status(400).json({
                success: false,
                error: 'emergencyType, latitude, and longitude are required'
            });
        }

        const sosId = uuidv4();
        const sosEntry = {
            id: sosId,
            type: emergencyType,
            location: { lat: latitude, lng: longitude },
            timestamp: new Date().toISOString(),
            customDescription: customDescription,
            status: 'activated'
        };

        sosEventLog.push(sosEntry);

        // Map emergency types to helpline numbers
        const helplines = {
            fire: { number: '101', name: 'Fire Brigade' },
            medical: { number: '108', name: 'Ambulance' },
            'women-safety': { number: '100', name: 'Police (Women Safety)' },
            'child-safety': { number: '1098', name: 'Child Helpline' },
            theft: { number: '100', name: 'Police' },
            earthquake: { number: '112', name: 'National Emergency' },
            flood: { number: '112', name: 'Disaster Management' },
            custom: { number: '112', name: 'National Emergency' }
        };

        const helpline = helplines[emergencyType] || helplines.custom;

        console.log(`[RapidPortal] SOS triggered: ${emergencyType} at ${latitude}, ${longitude}`);

        res.json({
            success: true,
            sos_id: sosId,
            emergency_type: emergencyType,
            helpline_number: helpline.number,
            helpline_name: helpline.name,
            status: 'activated',
            timestamp: new Date().toISOString(),
            ai_suggestion: `Call ${helpline.number} immediately. Your location has been logged.`
        });
    } catch (error) {
        console.error('❌ SOS Log Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to log SOS',
            message: error.message
        });
    }
});

// ==================== AI EMERGENCY GUIDE ====================
router.post('/ai-guide', async (req, res) => {
    try {
        const { query, emergencyType = 'general', language = 'en' } = req.body;

        if (!query) {
            return res.status(400).json({
                success: false,
                error: 'Query is required'
            });
        }

        console.log(`[RapidPortal] AI Guide request: "${query}"`);

        const systemPrompt = `You are an expert crisis management AI for India. Provide emergency guidance in structured format.
Respond ONLY with the guidance, formatted as:

🔥 Immediate Actions
1. Action
2. Action

🚨 Safety Do's & Don'ts
✅ Do
❌ Don't

📞 Emergency Helplines
[relevant numbers]

🛡 Prevention Tips
[tips]`;

        const fullPrompt = `Emergency situation: ${query}
        
Type: ${emergencyType}
Language: ${language}

Provide emergency guidance following the format below. Be concise and actionable.`;

        const guidance = await generateAIResponse(fullPrompt, language);

        console.log('[RapidPortal] AI guidance generated');

        res.json({
            success: true,
            query: query,
            guidance: guidance,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ AI Guide Error:', error);

        // Return fallback guidance
        const fallbackGuidance = `🔥 Immediate Actions
1. Get to a safe location
2. Call 112 or appropriate emergency number
3. Follow emergency responder instructions

📞 Emergency Helplines
112 - National Emergency
101 - Fire Brigade
108 - Ambulance
100 - Police`;

        res.status(200).json({
            success: true,
            guidance: fallbackGuidance,
            timestamp: new Date().toISOString()
        });
    }
});

// ==================== GET MAP PLACES (HOSPITALS, POLICE, FIRE) ====================
router.get('/map-places', async (req, res) => {
    try {
        const { latitude, longitude, type = 'all', incidentType = 'general' } = req.query;

        if (!latitude || !longitude) {
            return res.status(400).json({
                success: false,
                error: 'latitude and longitude are required'
            });
        }

        const userLat = parseFloat(latitude);
        const userLng = parseFloat(longitude);
        const safeZones = await getNearbySafeZones(userLat, userLng, incidentType, type, SAFE_ZONE_LIMIT);
        const grouped = groupSafeZonesByType(safeZones);

        console.log(`[RapidPortal] Map places requested: ${type} (${incidentType})`);

        res.json({
            success: true,
            places: grouped,
            safe_zones: safeZones,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ Map Places Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch places',
            message: error.message
        });
    }
});

// ==================== GET DYNAMIC SAFE ZONES ====================
router.get('/safe-zones', async (req, res) => {
    try {
        const { userLat, userLng, incidentType = 'general', category = 'all' } = req.query;

        if (!userLat || !userLng) {
            return res.status(400).json({
                success: false,
                error: 'userLat and userLng are required'
            });
        }

        const safeZones = await getNearbySafeZones(
            parseFloat(userLat),
            parseFloat(userLng),
            incidentType,
            category,
            SAFE_ZONE_LIMIT
        );

        if (!safeZones.length) {
            return res.status(200).json({
                success: false,
                error: 'Unable to fetch nearby safe zones',
                safe_zones: [],
                fallback_advice: getSafeZoneFallbackAdvice(incidentType),
                timestamp: new Date().toISOString()
            });
        }

        res.json({
            success: true,
            safe_zones: safeZones,
            count: safeZones.length,
            incidentType,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ Safe Zones Error:', error);
        res.status(200).json({
            success: false,
            error: 'Unable to fetch nearby safe zones',
            safe_zones: [],
            fallback_advice: getSafeZoneFallbackAdvice(req.query?.incidentType),
            timestamp: new Date().toISOString()
        });
    }
});

// ==================== GET EVACUATION ROUTE ====================
router.get('/evacuation-route', async (req, res) => {
    try {
        const {
            userLat,
            userLng,
            incidentLat,
            incidentLng,
            severity = 'medium'
        } = req.query;

        if (!userLat || !userLng || !incidentLat || !incidentLng) {
            return res.status(400).json({
                success: false,
                error: 'userLat, userLng, incidentLat and incidentLng are required'
            });
        }

        const user = { lat: parseFloat(userLat), lng: parseFloat(userLng) };
        const incident = { lat: parseFloat(incidentLat), lng: parseFloat(incidentLng) };
        const safeDestination = await getNearestSafeDestination(user);

        let provider = 'fallback';
        let routePayload = null;

        try {
            routePayload = await getOpenRouteServiceRoute(user, incident, safeDestination);
            provider = routePayload ? 'openrouteservice' : provider;
        } catch (orsError) {
            console.warn('[RapidPortal] ORS route failed, trying Mapbox/fallback');
        }

        if (!routePayload) {
            try {
                routePayload = await getMapboxRoute(user, safeDestination);
                provider = routePayload ? 'mapbox' : provider;
            } catch (mapboxError) {
                console.warn('[RapidPortal] Mapbox route failed, using fallback route');
            }
        }

        if (!routePayload) {
            routePayload = createFallbackRoute(user, incident, safeDestination, severity);
        }

        const response = {
            success: true,
            provider,
            safeDestination,
            route: routePayload.route,
            distance: routePayload.distance,
            eta: routePayload.eta,
            instructions: routePayload.instructions,
            dangerZone: {
                center: [incident.lat, incident.lng],
                radiusMeters: getDangerRadiusBySeverity(severity)
            },
            timestamp: new Date().toISOString()
        };

        res.json(response);
    } catch (error) {
        console.error('❌ Evacuation Route Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate evacuation route',
            message: error.message
        });
    }
});

// ==================== GET LOCATION CITY NAME ====================
router.get('/location-city', async (req, res) => {
    try {
        const { latitude, longitude } = req.query;

        // Simplified reverse geocoding - in production use real API
        const cities = {
            delhi: { lat: 28.6139, lng: 77.2090, name: 'New Delhi' },
            mumbai: { lat: 19.0760, lng: 72.8777, name: 'Mumbai' },
            bangalore: { lat: 12.9716, lng: 77.5946, name: 'Bangalore' }
        };

        let cityName = 'Unknown Location';

        if (latitude && longitude) {
            const userLat = parseFloat(latitude);
            const userLng = parseFloat(longitude);

            // Find nearest city (simplified)
            Object.values(cities).forEach(city => {
                if (Math.abs(city.lat - userLat) < 1 && Math.abs(city.lng - userLng) < 1) {
                    cityName = city.name;
                }
            });
        }

        res.json({
            success: true,
            city: cityName,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to determine location'
        });
    }
});

// ==================== HELPER FUNCTIONS ====================

function calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function enrichAlertsWithCoordinates(alerts, userLat, userLng, radiusKm) {
    return (alerts || []).map((alert, index) => {
        if (typeof alert.lat === 'number' && typeof alert.lng === 'number') {
            return alert;
        }

        const coords = getOffsetCoordinates(userLat, userLng, Math.max(0.4, radiusKm * 0.35), index);
        return {
            ...alert,
            lat: coords.lat,
            lng: coords.lng,
            radiusMeters: getDangerRadiusBySeverity(alert.severity || 'medium')
        };
    });
}

function getOffsetCoordinates(baseLat, baseLng, radiusKm, seed = 0) {
    const angle = ((seed * 67) % 360) * (Math.PI / 180);
    const distanceKm = Math.max(0.2, radiusKm * (0.45 + (seed % 3) * 0.2));

    const dLat = (distanceKm / 111) * Math.cos(angle);
    const dLng = (distanceKm / (111 * Math.cos(baseLat * Math.PI / 180))) * Math.sin(angle);

    return {
        lat: baseLat + dLat,
        lng: baseLng + dLng
    };
}

function getDangerRadiusBySeverity(severity) {
    const value = String(severity || 'medium').toLowerCase();
    if (value === 'high' || value === 'critical') return 500;
    if (value === 'medium') return 350;
    return 220;
}

async function getNearestSafeDestination(user) {
    const safeZones = await getNearbySafeZones(user.lat, user.lng, 'general', 'all', SAFE_ZONE_LIMIT);
    const nearest = safeZones
        .filter((zone) => Number.isFinite(zone.distanceKm) && zone.distanceKm <= SAFE_ZONE_MAX_DISTANCE_KM)
        .sort((a, b) => a.distanceKm - b.distanceKm)[0];

    if (nearest) {
        return {
            name: nearest.name,
            lat: nearest.lat,
            lng: nearest.lng,
            type: nearest.type
        };
    }

    return {
        name: 'Safer Area',
        lat: user.lat + 0.006,
        lng: user.lng + 0.006,
        type: 'fallback'
    };
}

function normalizeIncidentType(incidentType) {
    const value = String(incidentType || 'general').toLowerCase();
    if (value === 'medical') return 'accident';
    if (value === 'fire' || value === 'flood' || value === 'accident' || value === 'earthquake') return value;
    return 'general';
}

function normalizeSafeZoneCategory(category, incidentType) {
    const value = String(category || '').toLowerCase();

    if (!value || value === 'all') {
        return null;
    }

    if (SAFE_ZONE_TYPE_RULES[value]) {
        return value;
    }

    return INCIDENT_SAFE_ZONE_RULES[normalizeIncidentType(incidentType)]?.[0] || 'hospital';
}

function getRequestedSafeZoneTypes(incidentType, category) {
    const normalizedCategory = normalizeSafeZoneCategory(category, incidentType);
    if (normalizedCategory) {
        return [normalizedCategory];
    }

    return INCIDENT_SAFE_ZONE_RULES[normalizeIncidentType(incidentType)] || INCIDENT_SAFE_ZONE_RULES.general;
}

function buildOverpassFragments(requestedTypes, userLat, userLng, radiusMeters) {
    const fragments = [];

    requestedTypes.forEach((type) => {
        const filters = SAFE_ZONE_TYPE_RULES[type] || [];
        filters.forEach((filter) => {
            fragments.push(`nwr(around:${radiusMeters},${userLat},${userLng})["${filter.key}"="${filter.value}"];`);
        });
    });

    return fragments;
}

function extractSafeZoneCoordinates(element) {
    if (typeof element.lat === 'number' && typeof element.lon === 'number') {
        return { lat: element.lat, lng: element.lon };
    }

    if (element.center && typeof element.center.lat === 'number' && typeof element.center.lon === 'number') {
        return { lat: element.center.lat, lng: element.center.lon };
    }

    return null;
}

function inferSafeZoneType(tags = {}) {
    if (tags.amenity === 'hospital') return 'hospital';
    if (tags.amenity === 'police') return 'police';
    if (tags.amenity === 'shelter') return 'shelter';
    if (tags.leisure === 'park' || tags.leisure === 'playground' || tags.landuse === 'grass' || tags.natural === 'grassland') return 'open_ground';
    if (tags.natural === 'peak' || tags.tourism === 'viewpoint') return 'elevated_area';
    return 'general';
}

function getSafeZoneTypeLabel(type) {
    const labels = {
        hospital: 'hospital',
        police: 'police',
        shelter: 'shelter',
        open_ground: 'open_ground',
        elevated_area: 'elevated_area',
        general: 'safe_zone',
        fallback: 'safe_zone'
    };

    return labels[type] || 'safe_zone';
}

function formatDistanceKm(distanceKm) {
    return `${distanceKm.toFixed(1)} km`;
}

function normalizeSafeZoneRecord(element, userLat, userLng) {
    const coords = extractSafeZoneCoordinates(element);
    if (!coords) return null;

    const tags = element.tags || {};
    const type = inferSafeZoneType(tags);
    const name = tags.name || tags.operator || tags.brand || getSafeZoneTypeLabel(type).replace('_', ' ').toUpperCase();
    const distanceKm = calculateDistance(userLat, userLng, coords.lat, coords.lng);

    if (!Number.isFinite(distanceKm) || distanceKm > SAFE_ZONE_MAX_DISTANCE_KM) {
        return null;
    }

    return {
        name,
        lat: coords.lat,
        lng: coords.lng,
        distance: formatDistanceKm(distanceKm),
        distanceKm,
        type,
        address: tags['addr:full'] || tags['addr:street'] || tags['addr:suburb'] || tags['addr:city'] || '',
        source: 'openstreetmap'
    };
}

async function fetchSafeZonesFromOverpass(userLat, userLng, incidentType, category) {
    const requestedTypes = getRequestedSafeZoneTypes(incidentType, category);
    const fragments = buildOverpassFragments(requestedTypes, userLat, userLng, SAFE_ZONE_SEARCH_RADIUS_METERS);

    if (fragments.length === 0) {
        return [];
    }

    const query = `
[out:json][timeout:20];
(
${fragments.join('\n')}
);
out center tags;
`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
        const response = await fetch('https://overpass-api.de/api/interpreter', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
            body: `data=${encodeURIComponent(query)}`,
            signal: controller.signal
        });

        if (!response.ok) {
            throw new Error(`Overpass request failed: ${response.status}`);
        }

        const data = await response.json();
        const records = (data.elements || [])
            .map((element) => normalizeSafeZoneRecord(element, userLat, userLng))
            .filter(Boolean)
            .sort((a, b) => a.distanceKm - b.distanceKm);

        return dedupeSafeZones(records).slice(0, SAFE_ZONE_LIMIT);
    } finally {
        clearTimeout(timeoutId);
    }
}

function dedupeSafeZones(safeZones) {
    const seen = new Set();
    return safeZones.filter((zone) => {
        const key = `${zone.name}|${zone.lat.toFixed(4)}|${zone.lng.toFixed(4)}|${zone.type}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

async function getNearbySafeZones(userLat, userLng, incidentType = 'general', category = 'all', limit = SAFE_ZONE_LIMIT) {
    const safeZones = await fetchSafeZonesFromOverpass(userLat, userLng, incidentType, category);
    return safeZones
        .filter((zone) => Number.isFinite(zone.distanceKm) && zone.distanceKm <= SAFE_ZONE_MAX_DISTANCE_KM)
        .sort((a, b) => a.distanceKm - b.distanceKm)
        .slice(0, limit);
}

function groupSafeZonesByType(safeZones) {
    return (safeZones || []).reduce((groups, zone) => {
        const key = zone.type || 'general';
        if (!groups[key]) {
            groups[key] = [];
        }
        groups[key].push({
            name: zone.name,
            lat: zone.lat,
            lng: zone.lng,
            distance: zone.distance,
            type: zone.type,
            address: zone.address,
            source: zone.source
        });
        return groups;
    }, {});
}

function getSafeZoneFallbackAdvice(incidentType) {
    const normalized = normalizeIncidentType(incidentType);

    if (normalized === 'fire') {
        return 'Move to an open area and keep distance from smoke, heat, and enclosed spaces.';
    }

    if (normalized === 'flood') {
        return 'Move to higher ground and follow shelter instructions from local authorities.';
    }

    if (normalized === 'accident') {
        return 'Head toward the nearest hospital or request emergency transport support.';
    }

    return 'Move to the nearest safe public facility and follow local emergency instructions.';
}

async function getOpenRouteServiceRoute(user, incident, destination) {
    const apiKey = process.env.OPENROUTESERVICE_API_KEY;
    if (!apiKey) return null;

    const radiusMeters = 350;
    const avoidPolygon = createCirclePolygon(incident, radiusMeters, 18);

    const body = {
        coordinates: [
            [user.lng, user.lat],
            [destination.lng, destination.lat]
        ],
        instructions: true,
        language: 'en',
        preference: 'recommended',
        options: {
            avoid_polygons: {
                type: 'Polygon',
                coordinates: [avoidPolygon]
            }
        }
    };

    const response = await fetch('https://api.openrouteservice.org/v2/directions/driving-car/geojson', {
        method: 'POST',
        headers: {
            Authorization: apiKey,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });

    if (!response.ok) return null;

    const data = await response.json();
    const feature = data.features?.[0];
    if (!feature) return null;

    const coords = (feature.geometry?.coordinates || []).map(([lng, lat]) => [lat, lng]);
    const summary = feature.properties?.summary || {};
    const segments = feature.properties?.segments?.[0]?.steps || [];
    const instructions = segments.map((step) => step.instruction).filter(Boolean).slice(0, 6);

    return {
        route: coords,
        distance: formatDistance(summary.distance || 0),
        eta: formatEta(summary.duration || 0),
        instructions: instructions.length ? instructions : ['Move toward the designated safe destination.']
    };
}

async function getMapboxRoute(user, destination) {
    const apiKey = process.env.MAPBOX_API_KEY;
    if (!apiKey) return null;

    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${user.lng},${user.lat};${destination.lng},${destination.lat}?alternatives=true&geometries=geojson&steps=true&overview=full&access_token=${apiKey}`;
    const response = await fetch(url);
    if (!response.ok) return null;

    const data = await response.json();
    const route = data.routes?.[0];
    if (!route) return null;

    const coords = (route.geometry?.coordinates || []).map(([lng, lat]) => [lat, lng]);
    const instructions = (route.legs?.[0]?.steps || [])
        .map((step) => step.maneuver?.instruction)
        .filter(Boolean)
        .slice(0, 6);

    return {
        route: coords,
        distance: formatDistance(route.distance || 0),
        eta: formatEta(route.duration || 0),
        instructions: instructions.length ? instructions : ['Move toward the designated safe destination.']
    };
}

function createFallbackRoute(user, incident, destination, severity) {
    const dangerRadiusKm = getDangerRadiusBySeverity(severity) / 1000;
    const directIntersects = doesSegmentIntersectCircle(user, destination, incident, dangerRadiusKm);

    let route = [];
    if (directIntersects) {
        const waypoint = getDetourWaypoint(user, incident, dangerRadiusKm + 0.25);
        route = [
            [user.lat, user.lng],
            [waypoint.lat, waypoint.lng],
            [destination.lat, destination.lng]
        ];
    } else {
        route = [
            [user.lat, user.lng],
            [destination.lat, destination.lng]
        ];
    }

    let totalDistanceKm = 0;
    for (let i = 1; i < route.length; i += 1) {
        totalDistanceKm += calculateDistance(route[i - 1][0], route[i - 1][1], route[i][0], route[i][1]);
    }

    const durationMinutes = Math.max(2, Math.round((totalDistanceKm / 28) * 60));

    const instructions = directIntersects
        ? [
            'Move away from the incident radius immediately.',
            'Use the alternate detour corridor shown on map.',
            `Proceed toward ${destination.name}.`,
            'Call emergency services if route becomes blocked.'
        ]
        : [
            `Proceed directly toward ${destination.name}.`,
            'Stay on well-connected main roads.',
            'Avoid the marked incident area if conditions worsen.'
        ];

    return {
        route,
        distance: `${totalDistanceKm.toFixed(1)} km`,
        eta: `${durationMinutes} mins`,
        instructions
    };
}

function createCirclePolygon(center, radiusMeters, points = 12) {
    const coords = [];
    const radiusKm = radiusMeters / 1000;
    for (let i = 0; i <= points; i += 1) {
        const angle = (2 * Math.PI * i) / points;
        const lat = center.lat + (radiusKm / 111) * Math.cos(angle);
        const lng = center.lng + (radiusKm / (111 * Math.cos(center.lat * Math.PI / 180))) * Math.sin(angle);
        coords.push([lng, lat]);
    }
    return coords;
}

function doesSegmentIntersectCircle(start, end, circle, radiusKm) {
    const ax = start.lng;
    const ay = start.lat;
    const bx = end.lng;
    const by = end.lat;
    const cx = circle.lng;
    const cy = circle.lat;

    const abx = bx - ax;
    const aby = by - ay;
    const ab2 = abx * abx + aby * aby;
    if (ab2 === 0) return false;

    const t = Math.max(0, Math.min(1, ((cx - ax) * abx + (cy - ay) * aby) / ab2));
    const px = ax + abx * t;
    const py = ay + aby * t;
    const closestDistanceKm = calculateDistance(py, px, cy, cx);

    return closestDistanceKm <= radiusKm;
}

function getDetourWaypoint(user, incident, offsetKm) {
    const dx = user.lng - incident.lng;
    const dy = user.lat - incident.lat;
    const length = Math.sqrt(dx * dx + dy * dy) || 1;

    const perpX = -dy / length;
    const perpY = dx / length;

    const deltaLat = (offsetKm / 111) * perpY;
    const deltaLng = (offsetKm / (111 * Math.cos(incident.lat * Math.PI / 180))) * perpX;

    return {
        lat: incident.lat + deltaLat,
        lng: incident.lng + deltaLng
    };
}

function formatDistance(distanceMeters) {
    return `${(distanceMeters / 1000).toFixed(1)} km`;
}

function formatEta(durationSeconds) {
    return `${Math.max(1, Math.round(durationSeconds / 60))} mins`;
}

export default router;
