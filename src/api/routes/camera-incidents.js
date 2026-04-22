// ============================================
// ResQAI - Camera Incidents API Route
// ============================================

import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../../db/db.js';
import { io } from '../../server.js';

const router = express.Router();

// Ensure camera_incidents table exists
async function ensureCameraTable() {
    const db = await getDatabase();
    return new Promise((resolve, reject) => {
        db.exec(`
            CREATE TABLE IF NOT EXISTS camera_incidents (
                id TEXT PRIMARY KEY,
                camera_id TEXT NOT NULL,
                camera_name TEXT NOT NULL,
                incident_type TEXT NOT NULL,
                confidence REAL NOT NULL,
                snapshot_data TEXT,
                detection_method TEXT DEFAULT 'ai_model',
                status TEXT DEFAULT 'active',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_camera_incidents_type ON camera_incidents(incident_type);
            CREATE INDEX IF NOT EXISTS idx_camera_incidents_camera ON camera_incidents(camera_id);
            CREATE INDEX IF NOT EXISTS idx_camera_incidents_created ON camera_incidents(created_at);
        `, (err) => {
            if (err && !err.message.includes('already exists')) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
}

// ==================== GET ALL CAMERA INCIDENTS ====================

router.get('/', async (req, res) => {
    try {
        await ensureCameraTable();
        const db = await getDatabase();
        const { limit = 50, type, camera_id } = req.query;

        let query = 'SELECT * FROM camera_incidents WHERE 1=1';
        const params = [];

        if (type) { query += ' AND incident_type = ?'; params.push(type); }
        if (camera_id) { query += ' AND camera_id = ?'; params.push(camera_id); }

        query += ' ORDER BY created_at DESC LIMIT ?';
        params.push(parseInt(limit));

        const rows = await new Promise((resolve, reject) => {
            db.all(query, params, (err, rows) => {
                if (err) reject(err);
                else resolve(rows || []);
            });
        });

        res.json({ success: true, count: rows.length, incidents: rows });
    } catch (error) {
        console.error('Error fetching camera incidents:', error);
        res.status(500).json({ success: false, message: 'Error fetching camera incidents', error: error.message });
    }
});

// ==================== CREATE CAMERA INCIDENT ====================

router.post('/', async (req, res) => {
    try {
        await ensureCameraTable();
        const db = await getDatabase();

        const {
            camera_id,
            camera_name,
            incident_type,
            confidence,
            snapshot_data,
            detection_method = 'ai_model'
        } = req.body;

        if (!camera_id || !incident_type || confidence === undefined) {
            return res.status(400).json({
                success: false,
                message: 'camera_id, incident_type, and confidence are required'
            });
        }

        const id = uuidv4();
        const incident = {
            id,
            camera_id,
            camera_name: camera_name || `Camera ${camera_id}`,
            incident_type,
            confidence: parseFloat(confidence),
            snapshot_data: snapshot_data || null,
            detection_method,
            status: 'active',
            created_at: new Date().toISOString()
        };

        await new Promise((resolve, reject) => {
            db.run(
                `INSERT INTO camera_incidents 
                (id, camera_id, camera_name, incident_type, confidence, snapshot_data, detection_method, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [id, camera_id, incident.camera_name, incident_type, incident.confidence,
                    snapshot_data, detection_method, 'active'],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });

        console.log(`🚨 [Camera Incident] ${incident_type} detected on ${camera_id} (${(confidence * 100).toFixed(1)}%)`);

        // Emit Socket.IO event to all connected clients
        if (io) {
            io.emit('incident:new', {
                ...incident,
                source: 'camera_ai',
                severity: incident_type === 'Fire' ? 'critical' : 'high',
                timestamp: incident.created_at
            });
            console.log(`📡 [Socket.IO] Emitted incident:new to all clients`);
        }

        res.status(201).json({
            success: true,
            message: `${incident_type} incident logged successfully`,
            incident
        });
    } catch (error) {
        console.error('Error creating camera incident:', error);
        res.status(500).json({ success: false, message: 'Error creating camera incident', error: error.message });
    }
});

// ==================== STATS ====================

router.get('/stats', async (req, res) => {
    try {
        await ensureCameraTable();
        const db = await getDatabase();

        const rows = await new Promise((resolve, reject) => {
            db.all('SELECT * FROM camera_incidents ORDER BY created_at DESC', [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows || []);
            });
        });

        const stats = {
            total: rows.length,
            fire: rows.filter(r => r.incident_type === 'Fire').length,
            smoke: rows.filter(r => r.incident_type === 'Smoke').length,
            active: rows.filter(r => r.status === 'active').length,
            last24h: rows.filter(r => new Date(r.created_at) > new Date(Date.now() - 86400000)).length
        };

        res.json({ success: true, stats });
    } catch (error) {
        console.error('Error getting camera stats:', error);
        res.status(500).json({ success: false, message: 'Error getting stats', error: error.message });
    }
});

// ==================== RESOLVE INCIDENT ====================

router.patch('/:id/resolve', async (req, res) => {
    try {
        await ensureCameraTable();
        const db = await getDatabase();

        await new Promise((resolve, reject) => {
            db.run(
                'UPDATE camera_incidents SET status = ? WHERE id = ?',
                ['resolved', req.params.id],
                (err) => { if (err) reject(err); else resolve(); }
            );
        });

        if (io) {
            io.emit('incident:resolved', { id: req.params.id });
        }

        res.json({ success: true, message: 'Incident resolved' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error resolving incident', error: error.message });
    }
});

export default router;
