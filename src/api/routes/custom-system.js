// =====================================================
// ResQAI - Custom Rescue System Builder API Routes (Multi-User)
// =====================================================

import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query, execute, isMySQLAvailable } from '../../db/mysql.js';
import { getDatabase } from '../../db/db.js';
import { callAI } from '../../utils/aiRouter.js';
import { verifyToken, optionalAuth } from '../../middleware/auth.js';

const router = express.Router();
const DEBUG = true;

// ===== CREATE CUSTOM SYSTEM =====
router.post('/create', optionalAuth, async (req, res) => {
    try {
        const { organizationName, organizationType, location, contactEmail, structure, staff, riskTypes } = req.body;

        // Validation
        if (!organizationName || !organizationType || !location || !contactEmail) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const systemID = uuidv4();
        const userID = req.user?.userID || 'anonymous-' + uuidv4();

        try {
            if (isMySQLAvailable()) {
                // MySQL: Save with user_id
                await execute(
                    `INSERT INTO systems (id, user_id, organization_name, organization_type, location, contact_email, 
                     structure_json, staff_json, risk_types_json, status)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        systemID, userID, organizationName, organizationType, location, contactEmail,
                        JSON.stringify(structure),
                        JSON.stringify(staff),
                        JSON.stringify(riskTypes),
                        'active'
                    ]
                );
            } else {
                // SQLite fallback
                const db = await getDatabase();
                await new Promise((resolve, reject) => {
                    db.run(
                        `INSERT INTO custom_rescue_systems (id, organization_name, organization_type, location, contact_email,
                         structure_json, staff_json, risk_types_json, status, created_at)
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [
                            systemID, organizationName, organizationType, location, contactEmail,
                            JSON.stringify(structure),
                            JSON.stringify(staff),
                            JSON.stringify(riskTypes),
                            'created',
                            new Date().toISOString()
                        ],
                        (err) => {
                            if (err) reject(err);
                            else resolve();
                        }
                    );
                });
            }

            console.log(`✅ System created: ${systemID} by user: ${userID}`);

            res.json({
                success: true,
                systemID,
                userID,
                message: 'System created successfully',
                system: {
                    id: systemID,
                    organizationName,
                    organizationType,
                    location,
                    status: 'active'
                }
            });

        } catch (dbError) {
            throw dbError;
        }

    } catch (error) {
        console.error('❌ Error creating system:', error);
        res.status(500).json({ error: error.message });
    }
});

// ===== GET SINGLE SYSTEM =====
router.get('/:systemID', optionalAuth, async (req, res) => {
    try {
        const { systemID } = req.params;

        let system;

        if (isMySQLAvailable()) {
            const results = await query(
                `SELECT * FROM systems WHERE id = ?`,
                [systemID]
            );
            system = results[0];
        } else {
            const db = await getDatabase();
            system = await new Promise((resolve, reject) => {
                db.get(`SELECT * FROM custom_rescue_systems WHERE id = ?`, [systemID], (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                });
            });
        }

        if (!system) {
            return res.status(404).json({ error: 'System not found' });
        }

        // Parse JSON fields
        if (system.structure_json) system.structure = JSON.parse(system.structure_json);
        if (system.staff_json) system.staff = JSON.parse(system.staff_json);
        if (system.risk_types_json) system.riskTypes = JSON.parse(system.risk_types_json);

        res.json({ success: true, system });

    } catch (error) {
        console.error('❌ Error fetching system:', error);
        res.status(500).json({ error: error.message });
    }
});

// ===== LIST USER'S SYSTEMS =====
router.get('/user/list', optionalAuth, async (req, res) => {
    try {
        const userID = req.user?.userID;
        let systems = [];

        // If authenticated, fetch from MySQL for that user
        if (userID && isMySQLAvailable()) {
            systems = await query(
                `SELECT id, organization_name, organization_type, location, status, created_at
                 FROM systems WHERE user_id = ? ORDER BY created_at DESC LIMIT 100`,
                [userID]
            );
        } else if (userID && !isMySQLAvailable()) {
            // MySQL unavailable but authenticated - try SQLite
            const db = await getDatabase();
            systems = await new Promise((resolve, reject) => {
                db.all(
                    `SELECT id, organization_name, organization_type, location, status, created_at
                     FROM custom_rescue_systems ORDER BY created_at DESC LIMIT 100`,
                    (err, rows) => {
                        if (err) reject(err);
                        else resolve(rows || []);
                    }
                );
            });
        }
        // If not authenticated, return empty array (frontend will use localStorage)

        res.json({
            success: true,
            count: systems.length,
            systems: systems || []
        });

    } catch (error) {
        console.error('❌ Error listing systems:', error);
        res.status(500).json({ error: error.message, systems: [] });
    }
});

// ===== LIST ALL SYSTEMS (ADMIN) =====
router.get('/admin/all', async (req, res) => {
    try {
        let systems;

        if (isMySQLAvailable()) {
            systems = await query(
                `SELECT s.id, s.organization_name, s.organization_type, s.location, s.status, 
                        s.created_at, u.email FROM systems s
                 LEFT JOIN users u ON s.user_id = u.id
                 ORDER BY s.created_at DESC LIMIT 500`,
                []
            );
        } else {
            const db = await getDatabase();
            systems = await new Promise((resolve, reject) => {
                db.all(
                    `SELECT id, organization_name, organization_type, location, status, created_at
                     FROM custom_rescue_systems ORDER BY created_at DESC LIMIT 500`,
                    (err, rows) => {
                        if (err) reject(err);
                        else resolve(rows || []);
                    }
                );
            });
        }

        res.json({
            success: true,
            count: systems.length,
            systems
        });

    } catch (error) {
        console.error('❌ Error listing all systems:', error);
        res.status(500).json({ error: error.message });
    }
});

// ===== GENERATE AI GUIDANCE =====
router.post('/generate-guidance', optionalAuth, async (req, res) => {
    try {
        const { type, organizationType, structure, staff } = req.body;

        if (!type || !organizationType) {
            return res.status(400).json({ error: 'Missing required parameters' });
        }

        const prompt = `You are an AI emergency management expert. Generate detailed emergency guidance for a ${organizationType} environment.
        
Context:
- Organization Type: ${organizationType}
- Emergency Type: ${type}
- Building Structure: ${structure ? JSON.stringify(structure) : 'Not specified'}
- Staff Count: ${staff ? staff.length : 0}

Generate:
1. Step-by-step evacuation procedures (3-5 steps)
2. Role assignments for each staff member
3. Safety tips specific to this emergency type

Response should be practical, concise, and action-oriented.`;

        const guidance = await callAI(prompt);

        res.json({
            success: true,
            guidance,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Error generating guidance:', error);
        res.json({
            success: false,
            guidance: 'Standard procedure: 1. Activate alarm 2. Evacuate building 3. Assemble at designated point 4. Account for all persons 5. Contact emergency services',
            error: error.message
        });
    }
});

// ===== UPDATE SYSTEM =====
router.patch('/:systemID', verifyToken, async (req, res) => {
    try {
        const { systemID } = req.params;
        const { organizationName, organizationType, location, contactEmail, structure, staff, riskTypes, status } = req.body;
        const userID = req.user.userID;

        let result;

        if (isMySQLAvailable()) {
            // Verify ownership
            const systems = await query(`SELECT user_id FROM systems WHERE id = ?`, [systemID]);
            if (!systems[0] || systems[0].user_id !== userID) {
                return res.status(403).json({ error: 'Unauthorized' });
            }

            result = await execute(
                `UPDATE systems SET organization_name=?, organization_type=?, location=?, 
                 contact_email=?, structure_json=?, staff_json=?, risk_types_json=?, status=?
                 WHERE id = ? AND user_id = ?`,
                [
                    organizationName || undefined, organizationType || undefined, location || undefined,
                    contactEmail || undefined, structure ? JSON.stringify(structure) : undefined,
                    staff ? JSON.stringify(staff) : undefined, riskTypes ? JSON.stringify(riskTypes) : undefined,
                    status || 'active', systemID, userID
                ]
            );
        } else {
            const db = await getDatabase();
            result = await new Promise((resolve, reject) => {
                db.run(
                    `UPDATE custom_rescue_systems SET organization_name=?, organization_type=?, 
                     location=?, contact_email=?, structure_json=?, staff_json=?, risk_types_json=?, status=?
                     WHERE id = ?`,
                    [
                        organizationName, organizationType, location, contactEmail,
                        structure ? JSON.stringify(structure) : '{}',
                        staff ? JSON.stringify(staff) : '[]',
                        riskTypes ? JSON.stringify(riskTypes) : '[]',
                        status || 'active', systemID
                    ],
                    (err) => {
                        if (err) reject(err);
                        else resolve({ success: true });
                    }
                );
            });
        }

        res.json({ success: true, message: 'System updated', systemID });

    } catch (error) {
        console.error('❌ Error updating system:', error);
        res.status(500).json({ error: error.message });
    }
});

// ===== DELETE SYSTEM =====
router.delete('/:systemID', verifyToken, async (req, res) => {
    try {
        const { systemID } = req.params;
        const userID = req.user.userID;

        if (isMySQLAvailable()) {
            await execute(
                `DELETE FROM systems WHERE id = ? AND user_id = ?`,
                [systemID, userID]
            );
        } else {
            const db = await getDatabase();
            await new Promise((resolve, reject) => {
                db.run(`DELETE FROM custom_rescue_systems WHERE id = ?`, [systemID], (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
        }

        console.log(`✅ System deleted: ${systemID}`);
        res.json({ success: true, message: 'System deleted', systemID });

    } catch (error) {
        console.error('❌ Error deleting system:', error);
        res.status(500).json({ error: error.message });
    }
});

// ===== LOG EMERGENCY EVENT =====
router.post('/log-emergency', optionalAuth, async (req, res) => {
    try {
        const { systemID, type, emergencyType, location, timestamp } = req.body;

        if (!systemID || !emergencyType) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        if (DEBUG) console.log(`🚨 [EMERGENCY] SOS triggered in system ${systemID}: ${emergencyType}`);

        // Save emergency event
        const eventID = 'EV-' + Date.now();
        
        try {
            if (isMySQLAvailable()) {
                await execute(
                    `INSERT INTO system_logs (id, system_id, action, details, created_at)
                     VALUES (?, ?, ?, ?, ?)`,
                    [
                        eventID,
                        systemID,
                        'EMERGENCY_SOS',
                        JSON.stringify({ emergencyType, location, timestamp }),
                        new Date().toISOString()
                    ]
                );
            }
        } catch (dbErr) {
            console.warn('⚠️ Database logging failed:', dbErr.message);
        }

        // Emit to admin panel via local storage
        const adminAlerts = JSON.parse(localStorage.getItem('admin_emergency_alerts') || '[]');
        adminAlerts.push({
            id: eventID,
            systemID,
            emergencyType,
            location,
            timestamp: new Date().toISOString(),
            status: 'active'
        });
        localStorage.setItem('admin_emergency_alerts', JSON.stringify(adminAlerts));

        res.json({
            success: true,
            eventID,
            message: 'Emergency event logged',
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Error logging emergency:', error);
        res.status(500).json({ error: error.message });
    }
});

// ===== BROADCAST ALERT =====
router.post('/broadcast-alert', optionalAuth, async (req, res) => {
    try {
        const { systemID, message, severity = 'info' } = req.body;

        if (!systemID || !message) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        if (DEBUG) console.log(`📢 [BROADCAST] Alert in system ${systemID}: ${message.substring(0, 50)}...`);

        // Save alert event
        const alertID = 'ALERT-' + Date.now();
        
        try {
            if (isMySQLAvailable()) {
                await execute(
                    `INSERT INTO system_logs (id, system_id, action, details, created_at)
                     VALUES (?, ?, ?, ?, ?)`,
                    [
                        alertID,
                        systemID,
                        'ALERT_BROADCAST',
                        JSON.stringify({ message, severity }),
                        new Date().toISOString()
                    ]
                );
            }
        } catch (dbErr) {
            console.warn('⚠️ Database logging failed:', dbErr.message);
        }

        // Store in localStorage for user panel
        const broadcastAlerts = JSON.parse(localStorage.getItem('rescue_broadcast_alerts_' + systemID) || '[]');
        broadcastAlerts.push({
            id: alertID,
            message,
            severity,
            timestamp: new Date().toISOString()
        });
        localStorage.setItem('rescue_broadcast_alerts_' + systemID, JSON.stringify(broadcastAlerts));

        res.json({
            success: true,
            alertID,
            message: 'Alert broadcast sent',
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Error broadcasting alert:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
