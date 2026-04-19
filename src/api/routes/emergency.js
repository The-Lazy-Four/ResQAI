// ============================================
// ResQAI - Emergency API Routes
// ============================================

import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import {
    getEmergencies,
    getEmergencyById,
    createEmergency,
    updateEmergency,
    deleteEmergency
} from '../../db/db.js';
import { classifyEmergency } from './classification.js';

const router = express.Router();

// ==================== GET ALL EMERGENCIES ====================
router.get('/', async (req, res) => {
    try {
        const { status, type } = req.query;
        const filters = {};

        if (status) filters.status = status;
        if (type) filters.type = type;

        const incidents = await getEmergencies(filters);

        res.json({
            success: true,
            count: incidents.length,
            incidents: incidents.map(incident => ({
                ...incident,
                confidence_score: parseFloat(incident.confidence_score || 0),
                created_at: new Date(incident.created_at).toISOString()
            }))
        });
    } catch (error) {
        console.error('Error fetching emergencies:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching emergencies',
            error: error.message
        });
    }
});

// ==================== GET SINGLE EMERGENCY ====================
router.get('/:id', async (req, res) => {
    try {
        const incident = await getEmergencyById(req.params.id);

        if (!incident) {
            return res.status(404).json({
                success: false,
                message: 'Emergency not found'
            });
        }

        res.json({
            success: true,
            incident: {
                ...incident,
                confidence_score: parseFloat(incident.confidence_score || 0),
                created_at: new Date(incident.created_at).toISOString()
            }
        });
    } catch (error) {
        console.error('Error fetching emergency:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching emergency',
            error: error.message
        });
    }
});

// ==================== CREATE EMERGENCY ====================
router.post('/', async (req, res) => {
    try {
        const { description, location, severity = 'high', image } = req.body;

        // Validation
        if (!description || !location) {
            return res.status(400).json({
                success: false,
                message: 'Description and location are required'
            });
        }

        const id = uuidv4();

        // Classify emergency using AI
        const classification = await classifyEmergency(description);

        // Create emergency record
        const emergency = await createEmergency({
            id,
            description,
            location,
            severity,
            classified_type: classification.type,
            confidence_score: classification.confidence,
            ai_suggestions: classification.suggestions,
            image_url: image || null
        });

        console.log(`✅ Emergency created: ${id} - ${classification.type}`);

        res.status(201).json({
            success: true,
            message: 'Emergency report submitted successfully',
            incident: {
                ...emergency,
                confidence_score: parseFloat(emergency.confidence_score || 0),
                created_at: new Date(emergency.created_at).toISOString()
            }
        });
    } catch (error) {
        console.error('Error creating emergency:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating emergency report',
            error: error.message
        });
    }
});

// ==================== UPDATE EMERGENCY (STATUS, ETC) ====================
router.patch('/:id', async (req, res) => {
    try {
        const { status, ai_suggestions, confidence_score, classified_type } = req.body;

        const updates = {};
        if (status) updates.status = status;
        if (ai_suggestions) updates.ai_suggestions = ai_suggestions;
        if (confidence_score !== undefined) updates.confidence_score = confidence_score;
        if (classified_type) updates.classified_type = classified_type;

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No valid fields to update'
            });
        }

        const updated = await updateEmergency(req.params.id, updates);

        if (!updated) {
            return res.status(404).json({
                success: false,
                message: 'Emergency not found'
            });
        }

        console.log(`✅ Emergency updated: ${req.params.id}`);

        res.json({
            success: true,
            message: 'Emergency updated successfully',
            incident: {
                ...updated,
                confidence_score: parseFloat(updated.confidence_score || 0),
                created_at: new Date(updated.created_at).toISOString()
            }
        });
    } catch (error) {
        console.error('Error updating emergency:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating emergency',
            error: error.message
        });
    }
});

// ==================== DELETE EMERGENCY ====================
router.delete('/:id', async (req, res) => {
    try {
        await deleteEmergency(req.params.id);

        console.log(`✅ Emergency deleted: ${req.params.id}`);

        res.json({
            success: true,
            message: 'Emergency deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting emergency:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting emergency',
            error: error.message
        });
    }
});

// ==================== GET STATISTICS ====================
router.get('/stats/summary', async (req, res) => {
    try {
        const incidents = await getEmergencies();

        const stats = {
            total: incidents.length,
            pending: incidents.filter(i => i.status === 'pending').length,
            verified: incidents.filter(i => i.status === 'verified').length,
            resolved: incidents.filter(i => i.status === 'resolved').length,
            byType: {}
        };

        // Count by type
        incidents.forEach(incident => {
            const type = incident.classified_type || 'unknown';
            stats.byType[type] = (stats.byType[type] || 0) + 1;
        });

        res.json({
            success: true,
            stats
        });
    } catch (error) {
        console.error('Error getting stats:', error);
        res.status(500).json({
            success: false,
            message: 'Error getting statistics',
            error: error.message
        });
    }
});

// ==================== LIVE ACTIVITY FEED ====================
// Live feed of emergency activities (simulated for demo)
const ActivityTemplates = {
    reported: [
        'New emergency reported in Sector 5',
        'Fire alert in downtown area',
        'Medical emergency detected',
        'Flood warning issued for coastal area',
        'Traffic accident reported on highway',
        'New incident in Ward 12'
    ],
    verified: [
        'AI verified incident - Fire confirmed',
        'AI analysis complete - Medical emergency',
        'Incident AI-verified as flood',
        'Accident severity assessed',
        'Prediction model confidence: 95%'
    ],
    dispatched: [
        'Ambulance dispatched to location',
        'Fire brigade en route',
        'Police unit assigned',
        'Emergency responders mobilized',
        'Rescue team dispatched'
    ],
    completed: [
        'Incident resolved successfully',
        'Area cleared - All safe',
        'Victim transported to hospital',
        'Emergency response completed',
        'Situation stabilized'
    ]
};

router.get('/feed/live', async (req, res) => {
    try {
        const incidents = await getEmergencies({});

        // Generate live feed based on recent incidents
        const feed = [];

        incidents.slice(0, 5).forEach((incident, index) => {
            const stages = ['reported', 'verified', 'dispatched'];

            stages.forEach((stage, stageIndex) => {
                const templates = ActivityTemplates[stage];
                const randomTemplate = templates[Math.floor(Math.random() * templates.length)];

                feed.push({
                    id: `${incident.id}-${stage}`,
                    incident_id: incident.id,
                    type: incident.classified_type,
                    message: randomTemplate,
                    stage: stage,
                    timestamp: new Date(incident.created_at ?
                        new Date(incident.created_at).getTime() + stageIndex * 60000 :
                        Date.now()
                    ).toISOString(),
                    icon: stage === 'reported' ? '🚨' :
                        stage === 'verified' ? '✅' :
                            stage === 'dispatched' ? '🚑' : '✓✓'
                });
            });
        });

        // Also add fresh activities (demo)
        if (incidents.length < 2) {
            feed.push({
                id: 'demo-1',
                type: 'fire',
                message: 'Demonstration: New fire alert in industrial area',
                stage: 'reported',
                timestamp: new Date().toISOString(),
                icon: '🚨'
            });

            feed.push({
                id: 'demo-2',
                type: 'medical',
                message: 'Demonstration: Medical emergency AI verified',
                stage: 'verified',
                timestamp: new Date(Date.now() - 30000).toISOString(),
                icon: '✅'
            });
        }

        // Sort by timestamp (newest first)
        feed.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        res.json({
            success: true,
            feed: feed,
            total: feed.length
        });
    } catch (error) {
        console.error('Error getting live feed:', error);
        res.status(500).json({
            success: false,
            message: 'Error getting live feed',
            error: error.message
        });
    }
});

export default router;
