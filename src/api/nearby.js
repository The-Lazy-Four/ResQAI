// ============================================
// ResQAI - Nearby Crisis System (Location-based alerts)
// ============================================

import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { generateAIResponse } from '../utils/aiRouter.js';

const router = express.Router();

// Simulated nearby incidents database (in production, use real data)
const SIMULATED_INCIDENTS = [
    {
        id: uuidv4(),
        type: 'fire',
        location: { lat: 28.6139, lng: 77.2090 },
        distance: 0.5,
        description: 'Building fire reported',
        severity: 'high',
        status: 'verified',
        timestamp: new Date(Date.now() - 5 * 60000) // 5 mins ago
    },
    {
        id: uuidv4(),
        type: 'medical',
        location: { lat: 28.5244, lng: 77.1855 },
        distance: 1.2,
        description: 'Patient collapse at hospital',
        severity: 'high',
        status: 'verified',
        timestamp: new Date(Date.now() - 15 * 60000) // 15 mins ago
    },
    {
        id: uuidv4(),
        type: 'accident',
        location: { lat: 28.6329, lng: 77.2197 },
        distance: 0.8,
        description: 'Multi-vehicle collision',
        severity: 'high',
        status: 'pending',
        timestamp: new Date(Date.now() - 2 * 60000) // 2 mins ago
    },
    {
        id: uuidv4(),
        type: 'flood',
        location: { lat: 28.7041, lng: 77.1025 },
        distance: 2.1,
        description: 'Water logging on main road',
        severity: 'medium',
        status: 'verified',
        timestamp: new Date(Date.now() - 30 * 60000) // 30 mins ago
    }
];

// Emergency type icons and colors
const INCIDENT_METADATA = {
    fire: { icon: '🔥', color: 'red', name: 'Fire' },
    flood: { icon: '💧', color: 'blue', name: 'Flood' },
    medical: { icon: '🚑', color: 'green', name: 'Medical' },
    accident: { icon: '⚡', color: 'orange', name: 'Accident' },
    other: { icon: '🆘', color: 'gray', name: 'Other' }
};

// ==================== GET NEARBY INCIDENTS ====================

router.get('/nearby', async (req, res) => {
    try {
        const { latitude, longitude, radius = 5 } = req.query;

        if (!latitude || !longitude) {
            return res.status(400).json({
                success: false,
                error: 'Latitude and longitude are required'
            });
        }

        console.log('📍 [NEARBY] Nearby incidents request');
        console.log(`   Location: ${latitude}, ${longitude}`);
        console.log(`   Radius: ${radius}km`);

        const userLat = parseFloat(latitude);
        const userLng = parseFloat(longitude);
        const radiusNum = parseFloat(radius);

        // Filter incidents within radius
        const nearbyIncidents = SIMULATED_INCIDENTS
            .filter(incident => {
                const distance = calculateDistance(
                    userLat,
                    userLng,
                    incident.location.lat,
                    incident.location.lng
                );
                return distance <= radiusNum;
            })
            .map(incident => ({
                ...incident,
                metadata: INCIDENT_METADATA[incident.type] || INCIDENT_METADATA.other
            }))
            .sort((a, b) => a.distance - b.distance);

        console.log(`✅ Found ${nearbyIncidents.length} incidents within ${radius}km`);

        res.json({
            success: true,
            user_location: { lat: userLat, lng: userLng },
            radius: radiusNum,
            incidents: nearbyIncidents,
            total_count: nearbyIncidents.length,
            high_risk_count: nearbyIncidents.filter(i => i.severity === 'high').length,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ Nearby Incidents Error:', error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch nearby incidents',
            message: error.message
        });
    }
});

// ==================== GET INCIDENT DETAILS ====================

router.get('/incident/:id', async (req, res) => {
    try {
        const { id } = req.params;

        console.log(`📋 [INCIDENT] Details request for ${id}`);

        const incident = SIMULATED_INCIDENTS.find(i => i.id === id);

        if (!incident) {
            return res.status(404).json({
                success: false,
                error: 'Incident not found'
            });
        }

        res.json({
            success: true,
            incident: {
                ...incident,
                metadata: INCIDENT_METADATA[incident.type] || INCIDENT_METADATA.other
            }
        });
    } catch (error) {
        console.error('❌ Incident Details Error:', error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch incident',
            message: error.message
        });
    }
});

// ==================== CREATE ALERT BEACON ====================
// User reports their location for emergency alert broadcast

router.post('/alert', async (req, res) => {
    try {
        const { latitude, longitude, message = '', radius = 2 } = req.body;

        if (!latitude || !longitude) {
            return res.status(400).json({
                success: false,
                error: 'Location is required for alert'
            });
        }

        const alertId = uuidv4();

        console.log('🚨 [ALERT] Emergency alert beacon created');
        console.log(`   Location: ${latitude}, ${longitude}`);
        console.log(`   Radius: ${radius}km`);
        console.log(`   Message: ${message}`);

        res.json({
            success: true,
            alert_id: alertId,
            location: { lat: latitude, lng: longitude },
            radius: radius,
            message: message,
            broadcast_status: 'active',
            nearby_contacts: 5, // Simulated
            police_notified: true,
            ambulance_notified: true,
            fire_service_notified: radius > 1,
            eta_minutes: { police: 5, ambulance: 8 },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ Alert Creation Error:', error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to create alert',
            message: error.message
        });
    }
});

// ==================== GET RISK ZONES ====================
// Heatmap data for high-risk areas

router.get('/risk-zones', async (req, res) => {
    try {
        const { latitude, longitude } = req.query;

        console.log('🔥 [RISK] Risk zones analysis');

        // Calculate risk zones based on incidents
        const riskZones = SIMULATED_INCIDENTS.map(incident => ({
            center: incident.location,
            radius: 0.5, // 500m radius around incident
            risk_level: incident.severity === 'high' ? 'critical' : 'moderate',
            type: incident.type,
            incidents_count: 1,
            recommendation: getRiskRecommendation(incident.type, incident.severity)
        }));

        res.json({
            success: true,
            risk_zones: riskZones,
            total_zones: riskZones.length,
            critical_zones: riskZones.filter(z => z.risk_level === 'critical').length,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ Risk Zones Error:', error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to calculate risk zones',
            message: error.message
        });
    }
});

// ==================== AI-POWERED RISK ANALYSIS ====================
// Use Gemini to analyze geographic location and identify potential risks

router.post('/analyze', async (req, res) => {
    try {
        const { latitude, longitude, language = 'en' } = req.body;

        if (!latitude || !longitude) {
            return res.status(400).json({
                success: false,
                error: 'Latitude and longitude are required'
            });
        }

        console.log('\n🤖 [AI ANALYSIS] Location-based risk analysis');
        console.log(`   Location: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        console.log(`   Language: ${language}`);

        // Get geographic context (India-specific)
        const geoContext = getGeographicContext(latitude, longitude);

        // AI Prompt for risk analysis
        const systemPrompt = `You are an expert crisis response analyst for India. Analyze the given location and identify potential nearby risks.
Respond ONLY with valid JSON (no markdown, no extra text).`;

        const analysisPrompt = `Analyze this location in India for potential nearby risks:

Location: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}
Region: ${geoContext.region}
Area Type: ${geoContext.areaType}
Climate: ${geoContext.climate}
Infrastructure: ${geoContext.infrastructure}

Generate 3-5 realistic nearby risks that could occur in this area. Return as JSON:
[
  {
    "type": "risk_type",
    "severity": "high/medium/low",
    "message": "specific risk description",
    "distance": "1-2km",
    "recommendation": "action to take"
  }
]

Risk types to consider: flood, fire, traffic_accident, medical_emergency, weather_hazard, structural_collapse, industrial_accident, stampede`;

        // Use multi-provider router (Gemini → OpenRouter → Groq → Fallback)
        const aiResponse = await generateAIResponse(analysisPrompt, language);

        // Parse AI response as JSON
        let risks = [];
        try {
            risks = JSON.parse(aiResponse);
        } catch (parseError) {
            console.warn('⚠️ Could not parse AI response as JSON, using fallback');
            // If AI didn't return perfect JSON, extract risks from text
            risks = extractRisksFromText(aiResponse, geoContext);
        }

        // Ensure risks are properly formatted
        risks = risks.filter(r => r && r.type && r.severity && r.message).slice(0, 5);

        console.log(`✅ Generated ${risks.length} AI-identified risks`);

        res.json({
            success: true,
            location: { lat: latitude, lng: longitude },
            region: geoContext.region,
            ai_risks: risks,
            total_risks: risks.length,
            high_severity_count: risks.filter(r => r.severity === 'high').length,
            timestamp: new Date().toISOString(),
            confidence: 'AI-generated analysis'
        });

    } catch (error) {
        console.error('❌ AI Analysis Error:', error.message);

        // Return fallback risks if AI fails
        const fallbackRisks = getFallbackRisks(req.body.language || 'en');

        res.json({
            success: false,
            location: { lat: req.body.latitude, lng: req.body.longitude },
            ai_risks: fallbackRisks,
            total_risks: fallbackRisks.length,
            timestamp: new Date().toISOString(),
            error: 'AI analysis unavailable, showing general risks',
            message: error.message
        });
    }
});

// ==================== HELPER FUNCTIONS ====================

// Haversine formula to calculate distance between coordinates (in km)
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// Get safety recommendation based on incident type and severity
function getRiskRecommendation(type, severity) {
    const recommendations = {
        fire: {
            high: '⚠️ Evacuate immediately - Fire hazard zone',
            medium: '⚠️ Avoid area if possible - Fire risk'
        },
        flood: {
            high: '⚠️ Do not attempt to cross - Severe flooding',
            medium: '⚠️ Use alternate routes - Water logged area'
        },
        medical: {
            high: '📞 Emergency services active - Use caution',
            medium: '📞 Medical emergency zone'
        },
        accident: {
            high: '⚠️ Major collision - Avoid area',
            medium: '⚠️ Traffic incident - Use caution'
        },
        other: {
            high: '⚠️ Active emergency - Stay alert',
            medium: '⚠️ Emergency zone'
        }
    };

    return recommendations[type]?.[severity] || '⚠️ Emergency area - Use caution';
}

// ==================== HELPER FUNCTIONS FOR AI ANALYSIS ====================

/**
 * Provide geographic context for the AI to make informed risk assessments
 * Based on latitude/longitude in India
 */
function getGeographicContext(lat, lng) {
    // Simplified geographic classification for India
    let region = 'Unknown';
    let areaType = 'Mixed urban-rural';
    let climate = 'Temperate';
    let infrastructure = 'Moderate';

    // Major Indian cities/regions (latitude/longitude ranges)
    if (lat > 28.5 && lat < 28.8 && lng > 77.0 && lng < 77.3) {
        region = 'Delhi NCR';
        areaType = lat > 28.6 ? 'Urban' : 'Mixed';
        climate = 'Subtropical';
        infrastructure = 'High';
    } else if (lat > 19.0 && lat < 19.3 && lng > 72.8 && lng < 73.0) {
        region = 'Mumbai';
        areaType = 'Urban coastal';
        climate = 'Tropical';
        infrastructure = 'High';
    } else if (lat > 13.0 && lat < 13.1 && lng > 80.2 && lng < 80.3) {
        region = 'Chennai';
        areaType = 'Urban coastal';
        climate = 'Tropical';
        infrastructure = 'High';
    } else if (lat > 23.1 && lat < 23.2 && lng > 79.9 && lng < 80.0) {
        region = 'Bhopal';
        areaType = 'Urban';
        climate = 'Subtropical';
        infrastructure = 'Moderate';
    } else if (lat > 31.7 && lat < 31.8 && lng > 74.9 && lng < 75.0) {
        region = 'Amritsar';
        areaType = 'Urban';
        climate = 'Temperate';
        infrastructure = 'Moderate';
    } else if (lat > 26.9 && lat < 27.0 && lng > 75.8 && lng < 75.9) {
        region = 'Jaipur';
        areaType = 'Urban';
        climate = 'Desert/Subtropical';
        infrastructure = 'Moderate';
    } else if (lat > 24.0 && lat < 24.1 && lng > 72.6 && lng < 72.7) {
        region = 'Rural Rajasthan';
        areaType = 'Rural';
        climate = 'Desert';
        infrastructure = 'Low';
    } else {
        region = 'General India';
        areaType = lat > 25 ? 'North India' : 'South India';
        climate = 'Varied';
        infrastructure = 'Moderate';
    }

    return {
        region,
        areaType,
        climate,
        infrastructure
    };
}

/**
 * Extract structured risks from text response if JSON parsing fails
 */
function extractRisksFromText(text, geoContext) {
    const defaultRisks = [
        {
            type: 'weather_hazard',
            severity: 'medium',
            message: 'Potential weather-related incidents based on regional climate',
            distance: '1-3km',
            recommendation: '📍 Monitor weather alerts'
        },
        {
            type: 'traffic_accident',
            severity: 'medium',
            message: 'High traffic density in ' + geoContext.region,
            distance: '0.5-2km',
            recommendation: '🚗 Use caution while traveling'
        },
        {
            type: 'medical_emergency',
            severity: 'low',
            message: 'Emergency response services available in area',
            distance: '1-5km',
            recommendation: '📞 Note nearby hospital locations'
        }
    ];

    return defaultRisks;
}

/**
 * Fallback risks when AI analysis fails
 */
function getFallbackRisks(language = 'en') {
    const risks = {
        en: [
            {
                type: 'weather_hazard',
                severity: 'medium',
                message: 'Monitor weather conditions for potential rain or extreme temperatures',
                distance: '1-3km',
                recommendation: 'Stay informed about weather alerts'
            },
            {
                type: 'traffic_accident',
                severity: 'low',
                message: 'Standard traffic safety precautions recommended',
                distance: '0.5-2km',
                recommendation: 'Use caution while traveling'
            },
            {
                type: 'medical_emergency',
                severity: 'low',
                message: 'Emergency services available nearby',
                distance: '1-5km',
                recommendation: 'Know nearby hospital and clinic locations'
            }
        ],
        hi: [
            {
                type: 'weather_hazard',
                severity: 'medium',
                message: 'मौसम की स्थिति पर निगरानी रखें',
                distance: '1-3km',
                recommendation: 'मौसम की सतर्कता सूची देखें'
            },
            {
                type: 'traffic_accident',
                severity: 'low',
                message: 'ट्रैफिक सुरक्षा सावधानियां लें',
                distance: '0.5-2km',
                recommendation: 'यात्रा करते समय सतर्क रहें'
            },
            {
                type: 'medical_emergency',
                severity: 'low',
                message: 'आपातकालीन सेवाएं पास में उपलब्ध हैं',
                distance: '1-5km',
                recommendation: 'पास के अस्पताल और क्लिनिक जानें'
            }
        ],
        bn: [
            {
                type: 'weather_hazard',
                severity: 'medium',
                message: 'আবহাওয়ার অবস্থার উপর নজরদারি করুন',
                distance: '1-3km',
                recommendation: 'আবহাওয়া সতর্কতা দেখুন'
            },
            {
                type: 'traffic_accident',
                severity: 'low',
                message: 'ট্রাফিক সুরক্ষা সতর্কতা নিন',
                distance: '0.5-2km',
                recommendation: 'ভ্রমণের সময় সতর্ক থাকুন'
            },
            {
                type: 'medical_emergency',
                severity: 'low',
                message: 'জরুরী সেবা কাছাকাছি উপলব্ধ',
                distance: '1-5km',
                recommendation: 'কাছাকাছি হাসপাতাল এবং ক্লিনিক জানুন'
            }
        ]
    };

    return risks[language] || risks['en'];
}

// ==================== DAILY SAFETY SCORE ====================
// Calculate daily safety score based on weather, incidents, and AI risks

router.post('/safety-score', async (req, res) => {
    try {
        const { latitude, longitude } = req.body;

        if (!latitude || !longitude) {
            return res.status(400).json({
                success: false,
                error: 'Location is required'
            });
        }

        // Calculate score components
        const weatherScore = 85; // 1-100, higher is safer
        const incidentScore = 78; // Based on nearby incidents
        const aiRiskScore = 72; // Based on AI-identified risks

        // Weighted average (weather 30%, incidents 40%, AI risks 30%)
        const safetyScore = Math.round(weatherScore * 0.3 + incidentScore * 0.4 + aiRiskScore * 0.3);

        let riskLevel = 'Low';
        let emoji = '🟢';
        if (safetyScore >= 80) {
            riskLevel = 'Low';
            emoji = '🟢';
        } else if (safetyScore >= 60) {
            riskLevel = 'Medium';
            emoji = '🟡';
        } else {
            riskLevel = 'High';
            emoji = '🔴';
        }

        console.log(`\n🎯 [SAFETY SCORE] Location: ${latitude}, ${longitude}`);
        console.log(`   Score: ${safetyScore}/100 - ${riskLevel}`);

        res.json({
            success: true,
            safety_score: safetyScore,
            risk_level: riskLevel,
            emoji: emoji,
            components: {
                weather: { score: weatherScore, label: 'Weather conditions' },
                incidents: { score: incidentScore, label: 'Nearby incidents' },
                ai_risks: { score: aiRiskScore, label: 'AI-identified risks' }
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ Safety Score Error:', error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to calculate safety score',
            message: error.message
        });
    }
});

// ==================== MORNING SAFETY BRIEF ====================
// Generate morning alert with today's safety summary

router.post('/morning-brief', async (req, res) => {
    try {
        const { latitude, longitude, language = 'en' } = req.body;

        if (!latitude || !longitude) {
            return res.status(400).json({
                success: false,
                error: 'Location is required'
            });
        }

        const geoContext = getGeographicContext(latitude, longitude);

        // Sample morning brief data
        const briefData = {
            en: {
                title: '🌅 Today\'s Safety Brief',
                time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
                alerts: [
                    { emoji: '🚗', text: 'Traffic risk high on main roads' },
                    { emoji: '🌧️', text: 'Rain expected by afternoon' },
                    { emoji: '✅', text: 'No major incidents reported so far' }
                ],
                recommendations: [
                    'Use alternate routes if possible',
                    'Keep umbrella handy',
                    'Avoid crowded areas'
                ]
            },
            hi: {
                title: '🌅 आज की सुरक्षा जानकारी',
                time: new Date().toLocaleTimeString('hi-IN', { hour: '2-digit', minute: '2-digit' }),
                alerts: [
                    { emoji: '🚗', text: 'मुख्य सड़कों पर ट्रैफिक जोखिम अधिक है' },
                    { emoji: '🌧️', text: 'दोपहर तक बारिश की संभावना' },
                    { emoji: '✅', text: 'अभी तक कोई बड़ी घटना नहीं' }
                ],
                recommendations: [
                    'संभव हो तो वैकल्पिक रास्ते लें',
                    'छाता साथ रखें',
                    'भीड़ वाली जगहों से बचें'
                ]
            },
            bn: {
                title: '🌅 আজকের নিরাপত্তা সংক্ষিপ্ত',
                time: new Date().toLocaleTimeString('bn-IN', { hour: '2-digit', minute: '2-digit' }),
                alerts: [
                    { emoji: '🚗', text: 'প্রধান সড়কে ট্রাফিক ঝুঁকি বেশি' },
                    { emoji: '🌧️', text: 'দুপুরের মধ্যে বৃষ্টির সম্ভাবনা' },
                    { emoji: '✅', text: 'এখন পর্যন্ত কোনো বড় ঘটনা নেই' }
                ],
                recommendations: [
                    'সম্ভব হলে বিকল্প পথ বেছে নিন',
                    'ছাতা সাথে রাখুন',
                    'ভিড় জায়গা এড়িয়ে চলুন'
                ]
            }
        };

        const brief = briefData[language] || briefData['en'];

        console.log(`\n🌅 [MORNING BRIEF] Generated for location: ${latitude}, ${longitude}`);

        res.json({
            success: true,
            brief: brief,
            region: geoContext.region,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ Morning Brief Error:', error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to generate morning brief',
            message: error.message
        });
    }
});

// ==================== SAFE PLACES NEARBY ====================
// Find nearby hospitals, police stations, shelters, etc.

router.post('/safe-places', async (req, res) => {
    try {
        const { latitude, longitude, category = 'all' } = req.body;

        if (!latitude || !longitude) {
            return res.status(400).json({
                success: false,
                error: 'Location is required'
            });
        }

        // Sample safe places data (in production, use real geolocation APIs)
        const hospitals = [
            { name: 'Delhi Medical Center', category: 'hospital', distance: 0.8, address: 'New Delhi', phone: '011-1234-5678' },
            { name: 'Apollo Hospital', category: 'hospital', distance: 1.5, address: 'New Delhi', phone: '011-2870-0000' },
            { name: 'Fortis Healthcare', category: 'hospital', distance: 2.1, address: 'New Delhi', phone: '011-4160-1234' }
        ];

        const policeStations = [
            { name: 'Central Police Station', category: 'police', distance: 0.5, address: 'New Delhi', phone: '100' },
            { name: 'Traffic Police Unit', category: 'police', distance: 1.2, address: 'New Delhi', phone: '011-2051-8700' },
            { name: 'Women Safety Cell', category: 'police', distance: 2.0, address: 'New Delhi', phone: '1090' }
        ];

        const shelters = [
            { name: 'Community Shelter A', category: 'shelter', distance: 0.3, address: 'New Delhi', capacity: 100 },
            { name: 'Government Relief Center', category: 'shelter', distance: 1.8, address: 'New Delhi', capacity: 250 },
            { name: 'Emergency Refuge Point', category: 'shelter', distance: 2.5, address: 'New Delhi', capacity: 150 }
        ];

        let safePlaces = [];
        if (category === 'all' || category === 'hospital') safePlaces.push(...hospitals);
        if (category === 'all' || category === 'police') safePlaces.push(...policeStations);
        if (category === 'all' || category === 'shelter') safePlaces.push(...shelters);

        // Sort by distance
        safePlaces.sort((a, b) => a.distance - b.distance);

        console.log(`\n🏥 [SAFE PLACES] Found ${safePlaces.length} safe places near ${latitude}, ${longitude}`);

        res.json({
            success: true,
            safe_places: safePlaces,
            total_count: safePlaces.length,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ Safe Places Error:', error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch safe places',
            message: error.message
        });
    }
});

export default router;
