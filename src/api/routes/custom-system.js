// =====================================================
// ResQAI - Custom Rescue System Builder API Routes (FIXED)
// =====================================================

import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import QRCode from 'qrcode';
import { query, execute, isMySQLAvailable } from '../../db/mysql.js';
import { getDatabase, saveSystemAlert, getSystemAlerts, saveSystemEvent, getSystemEvents, logActivity, getActivityLogs, executeQuery } from '../../db/db.js';
import { generateAIResponse } from '../../utils/aiRouter.js';
import { verifyToken, optionalAuth } from '../../middleware/auth.js';

const router = express.Router();

// Generate a readable system code like RESQ-4821
function generateSystemCode() {
    const num = Math.floor(1000 + Math.random() * 9000);
    return `RESQ-${num}`;
}

// Generate a random 6-char access code
function generateAccessCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function safeParseJSON(value, fallback = null) {
    if (!value) return fallback;
    if (typeof value === 'object') return value;
    try { return JSON.parse(value); } catch { return fallback; }
}

function buildStoredStructure(structure, layoutAnalysis) {
    const s = structure && typeof structure === 'object' && !Array.isArray(structure) ? { ...structure } : {};
    if (layoutAnalysis) s.layoutAnalysis = layoutAnalysis;
    return s;
}

function normalizeSystemRecord(system) {
    if (!system) return system;
    const n = { ...system };
    const parsedStructure = safeParseJSON(system.structure_json, {});
    const parsedStaff = safeParseJSON(system.staff_json, []);
    const parsedRiskTypes = safeParseJSON(system.risk_types_json, []);
    // Layout analysis: prefer dedicated column, fallback to structure_json embed
    const layoutAnalysisFromColumn = safeParseJSON(system.layout_analysis, null);
    const layoutAnalysisFromStructure = safeParseJSON(parsedStructure?.layoutAnalysis, null);
    const layoutAnalysis = layoutAnalysisFromColumn || layoutAnalysisFromStructure;
    if (parsedStructure) { delete parsedStructure.layoutAnalysis; }
    n.structure = parsedStructure; n.staff = parsedStaff; n.riskTypes = parsedRiskTypes; n.layoutAnalysis = layoutAnalysis;
    n.layout_analysis_visible = system.layout_analysis_visible != null ? system.layout_analysis_visible : 1;
    return n;
}

function getMockAlerts(systemID = 'mock-system') {
    return [
        {
            id: `${systemID}-mock-alert-1`,
            system_id: systemID,
            severity: 'critical',
            message: 'Fire Alert',
            alert_type: 'broadcast',
            created_at: new Date().toISOString()
        },
        {
            id: `${systemID}-mock-alert-2`,
            system_id: systemID,
            severity: 'warning',
            message: 'Medical Emergency',
            alert_type: 'broadcast',
            created_at: new Date(Date.now() - 300000).toISOString()
        }
    ];
}

function getMockActivity(systemID = 'mock-system') {
    return [
        {
            id: 1,
            system_id: systemID,
            action: 'SOS Triggered',
            details: 'Emergency signal received',
            created_at: new Date().toISOString()
        },
        {
            id: 2,
            system_id: systemID,
            action: 'Alert Broadcast',
            details: 'Staff notification sent',
            created_at: new Date(Date.now() - 300000).toISOString()
        }
    ];
}

function getMockEvents(systemID = 'mock-system') {
    return [
        {
            id: `${systemID}-mock-event-1`,
            system_id: systemID,
            event_type: 'EMERGENCY_SOS',
            details: JSON.stringify({ emergencyType: 'SOS', location: 'Lobby' }),
            location: 'Lobby',
            created_at: new Date().toISOString()
        }
    ];
}

// CREATE — generates system_code, access_code, admin_id, QR
router.post('/create', optionalAuth, async (req, res) => {
    try {
        const { organizationName, organizationType, location, contactEmail, structure, staff, riskTypes, layoutAnalysis, adminId } = req.body;
        if (!organizationName || !organizationType || !location || !contactEmail) return res.status(400).json({ error: 'Missing required fields' });

        const systemID = uuidv4();
        const systemCode = generateSystemCode();
        const accessCode = generateAccessCode();
        const adminID = adminId || req.user?.userID || null;
        const storedStructure = buildStoredStructure(structure, layoutAnalysis);

        // Build the public access link
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const publicLink = `${baseUrl}/s/${systemCode}`;

        // Generate QR code as data URL
        const qrDataUrl = await QRCode.toDataURL(publicLink, { width: 300, margin: 2, color: { dark: '#ff5352', light: '#0a0e14' } });

        if (isMySQLAvailable()) {
            await execute(`INSERT INTO systems (id, user_id, organization_name, organization_type, location, contact_email, structure_json, staff_json, risk_types_json, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [systemID, adminID, organizationName, organizationType, location, contactEmail, JSON.stringify(storedStructure), JSON.stringify(staff), JSON.stringify(riskTypes), 'active']);
        } else {
            const db = await getDatabase();
            await new Promise((resolve, reject) => {
                db.run(`INSERT INTO custom_rescue_systems (id, system_code, access_code, admin_id, organization_name, organization_type, location, contact_email, structure_json, staff_json, risk_types_json, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [systemID, systemCode, accessCode, adminID, organizationName, organizationType, location, contactEmail, JSON.stringify(storedStructure), JSON.stringify(staff), JSON.stringify(riskTypes), 'active', new Date().toISOString()],
                    err => err ? reject(err) : resolve());
            });
        }
        await logActivity(systemID, 'SYSTEM_CREATED', `Created: ${organizationName}`);
        res.json({
            success: true, systemID, systemCode, accessCode, adminId: adminID,
            publicLink, qrCode: qrDataUrl,
            message: 'System created successfully',
            system: { id: systemID, systemCode, organizationName, organizationType, location, status: 'active' }
        });
    } catch (error) { console.error(error); res.status(500).json({ error: error.message }); }
});

// GET SINGLE
router.get('/:systemID', optionalAuth, async (req, res) => {
    try {
        const { systemID } = req.params;
        let system;
        if (isMySQLAvailable()) {
            const r = await query(`SELECT * FROM systems WHERE id = ?`, [systemID]); system = r[0];
        } else {
            const db = await getDatabase();
            system = await new Promise((resolve, reject) => { db.get(`SELECT * FROM custom_rescue_systems WHERE id = ?`, [systemID], (err, row) => err ? reject(err) : resolve(row)); });
        }
        if (!system) return res.status(404).json({ error: 'System not found' });
        res.json({ success: true, system: normalizeSystemRecord(system) });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// LIST USER SYSTEMS (auto-generates system_code for legacy systems)
router.get('/user/list', optionalAuth, async (req, res) => {
    try {
        const userID = req.user?.userID;
        let systems = [];
        if (isMySQLAvailable()) {
            if (userID) systems = await query(`SELECT id, organization_name, organization_type, location, status, created_at FROM systems WHERE user_id = ? ORDER BY created_at DESC LIMIT 100`, [userID]);
        } else {
            const db = await getDatabase();
            systems = await new Promise((resolve, reject) => { db.all(`SELECT id, system_code, admin_id, organization_name, organization_type, location, status, created_at FROM custom_rescue_systems ORDER BY created_at DESC LIMIT 100`, (err, rows) => err ? reject(err) : resolve(rows || [])); });

            // Backfill system_code for legacy systems that don't have one
            for (const sys of systems) {
                if (!sys.system_code) {
                    const newCode = generateSystemCode();
                    await new Promise((resolve) => {
                        db.run(`UPDATE custom_rescue_systems SET system_code = ? WHERE id = ?`, [newCode, sys.id], (err) => {
                            if (err) console.warn('[BACKFILL] Could not set system_code:', err.message);
                            else console.log(`✅ [BACKFILL] Generated system_code ${newCode} for system ${sys.id}`);
                            resolve();
                        });
                    });
                    sys.system_code = newCode;
                }
            }
        }
        res.json({ success: true, count: systems.length, systems: systems || [] });
    } catch (error) { res.status(500).json({ error: error.message, systems: [] }); }
});

// ADMIN: ALL SYSTEMS
router.get('/admin/all', async (req, res) => {
    try {
        let systems;
        if (isMySQLAvailable()) {
            systems = await query(`SELECT s.id, s.organization_name, s.organization_type, s.location, s.status, s.created_at FROM systems s ORDER BY s.created_at DESC LIMIT 500`, []);
        } else {
            const db = await getDatabase();
            systems = await new Promise((resolve, reject) => { db.all(`SELECT id, organization_name, organization_type, location, status, created_at FROM custom_rescue_systems ORDER BY created_at DESC LIMIT 500`, (err, rows) => err ? reject(err) : resolve(rows || [])); });
        }
        res.json({ success: true, count: systems.length, systems });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// GET SYSTEM STATS
router.get('/stats/overview', optionalAuth, async (req, res) => {
    try {
        const db = await getDatabase();
        const stats = await new Promise((resolve, reject) => {
            db.get(`SELECT (SELECT COUNT(*) FROM custom_rescue_systems) as total_systems, (SELECT COUNT(*) FROM custom_rescue_systems WHERE status='active') as active_systems, (SELECT COUNT(*) FROM system_events WHERE event_type='EMERGENCY_SOS') as total_sos, (SELECT COUNT(*) FROM system_alerts) as total_alerts, (SELECT COUNT(*) FROM system_events WHERE DATE(created_at)=DATE('now')) as events_today`,
                (err, row) => err ? reject(err) : resolve(row || {}));
        });
        res.json({ success: true, stats });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// ACTIVITY LOGS
router.get('/logs/activity', optionalAuth, async (req, res) => {
    try {
        const { systemId, limit } = req.query;
        const logs = await getActivityLogs(systemId, parseInt(limit) || 50);
        if (!logs || logs.length === 0) {
            return res.json({ success: true, logs: getMockActivity(systemId) });
        }
        res.json({ success: true, logs });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// SYSTEM ALERTS
router.get('/:systemID/alerts', optionalAuth, async (req, res) => {
    try {
        const alerts = await getSystemAlerts(req.params.systemID);
        res.json({ success: true, alerts: alerts || [] });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// SYSTEM EVENTS
router.get('/:systemID/events', optionalAuth, async (req, res) => {
    try {
        const events = await getSystemEvents(req.params.systemID);
        res.json({ success: true, events: events || [] });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// DELETE EVENT
router.delete('/events/:eventID', optionalAuth, async (req, res) => {
    try {
        const db = await getDatabase();
        await new Promise((resolve, reject) => {
            db.run(`DELETE FROM system_events WHERE id = ?`, [req.params.eventID], err => err ? reject(err) : resolve());
        });
        // Also delete from sos_events just in case
        await new Promise((resolve) => {
            db.run(`DELETE FROM sos_events WHERE id = ?`, [req.params.eventID], () => resolve());
        });
        res.json({ success: true, message: 'Event resolved' });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// SQL: EXECUTE QUERY (with system-scoped access control)
router.post('/sql/execute', optionalAuth, async (req, res) => {
    try {
        const { query: sqlQuery, systemID } = req.body;
        if (!sqlQuery) return res.status(400).json({ error: 'Missing SQL query' });

        // SECURITY: Verify system access before allowing query execution
        if (systemID) {
            const system = await (isMySQLAvailable()
                ? query('SELECT id, user_id FROM systems WHERE id = ?', [systemID])
                : new Promise((resolve) => {
                    getDatabase().then(db => {
                        db.get('SELECT id, admin_id FROM custom_rescue_systems WHERE id = ?', [systemID], (err, row) => {
                            resolve(err ? null : row);
                        });
                    });
                }));

            if (!system) return res.status(404).json({ error: 'System not found' });

            // Check if user has access to this system
            if (req.user && system.user_id !== req.user.userID && system.admin_id !== req.user.userID) {
                return res.status(403).json({ error: 'Access denied: You do not have permission to query this system' });
            }
        }

        const upper = sqlQuery.trim().toUpperCase();
        if (!upper.startsWith('SELECT') && !upper.startsWith('WITH') && !upper.startsWith('PRAGMA')) {
            return res.status(403).json({ error: 'Only SELECT and PRAGMA queries are permitted.' });
        }
        const results = await executeQuery(sqlQuery.trim());
        await logActivity(systemID || null, 'SQL_QUERY', sqlQuery.substring(0, 200));
        res.json({ success: true, results, rowCount: results.length, query: sqlQuery.trim() });
    } catch (error) { res.status(400).json({ success: false, error: error.message }); }
});

// SQL: LIST TABLES
router.get('/sql/tables', optionalAuth, async (req, res) => {
    try {
        const db = await getDatabase();
        const tables = await new Promise((resolve, reject) => {
            db.all(`SELECT name, type FROM sqlite_master WHERE type IN ('table','view') ORDER BY name`, (err, rows) => err ? reject(err) : resolve(rows || []));
        });
        const tableInfo = await Promise.all(tables.map(async (t) => {
            const cols = await new Promise((res, rej) => { db.all(`PRAGMA table_info(${t.name})`, (err, rows) => err ? rej(err) : res(rows || [])); });
            const cnt = await new Promise((res) => { db.get(`SELECT COUNT(*) as c FROM "${t.name}"`, (err, row) => res(err ? 0 : (row?.c || 0))); });
            return { name: t.name, type: t.type, columns: cols, rowCount: cnt };
        }));
        res.json({ success: true, tables: tableInfo });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// SQL: AI QUERY ASSISTANT
router.post('/sql/ai-assist', optionalAuth, async (req, res) => {
    try {
        const { question, schema } = req.body;
        if (!question) return res.status(400).json({ error: 'Missing question' });
        const prompt = `You are an expert SQLite assistant for ResQAI emergency management.

Tables available:
- emergencies (id, description, location, severity, status, classified_type, confidence_score, created_at)
- custom_rescue_systems (id, organization_name, organization_type, location, status, created_at)
- system_alerts (id, system_id, message, severity, alert_type, created_at)
- system_events (id, system_id, event_type, details, location, created_at)
- activity_logs (id, system_id, action, details, created_at)
- chat_history (id, user_message, bot_response, timestamp)

User question: "${question}"

Respond with ONLY:
QUERY:
<valid SQLite SELECT query>

EXPLANATION:
<one sentence explanation>`;

        const response = await generateAIResponse(prompt);
        const qMatch = response.match(/QUERY:\s*([\s\S]*?)(?=EXPLANATION:|$)/i);
        const eMatch = response.match(/EXPLANATION:\s*([\s\S]*?)$/i);
        let suggestedQuery = qMatch ? qMatch[1].trim().replace(/```sql?/gi, '').replace(/```/g, '').trim() : '';
        const explanation = eMatch ? eMatch[1].trim() : '';
        res.json({ success: true, query: suggestedQuery, explanation });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// SQL: AI DATA INSIGHTS
router.post('/sql/ai-insights', optionalAuth, async (req, res) => {
    try {
        const { data, query: sqlQuery } = req.body;
        if (!data || !Array.isArray(data)) return res.status(400).json({ error: 'Missing data' });
        const sample = data.slice(0, 15);
        const prompt = `Analyze these query results for an emergency management system and give 3-4 practical insights.

Query: ${sqlQuery || 'custom query'}
Row count: ${data.length}
Sample data: ${JSON.stringify(sample, null, 2)}

Give:
1. Summary of what the data shows (1-2 sentences)
2. Key insight or pattern
3. One actionable recommendation for the emergency team
Keep it concise and professional.`;
        const insights = await generateAIResponse(prompt);
        res.json({ success: true, insights, rowCount: data.length });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// AI SYSTEM ANALYSIS
router.post('/ai/system-analysis', optionalAuth, async (req, res) => {
    try {
        const { systemId, organizationType, organizationName, location, staffCount, riskTypes, alertsCount, eventsToday } = req.body;
        const prompt = `Analyze emergency readiness for this organization in ResQAI:
- Name: ${organizationName} (${organizationType})
- Location: ${location}
- Staff: ${staffCount}
- Risks: ${(riskTypes || []).join(', ')}
- Recent Alerts: ${alertsCount || 0}
- Events Today: ${eventsToday || 0}

Give a 3-sentence assessment: (1) Overall readiness, (2) Key concern or strength, (3) One specific recommendation. Be direct and professional.`;
        const analysis = await generateAIResponse(prompt);
        await logActivity(systemId, 'AI_ANALYSIS', `Analysis for ${organizationName}`);
        res.json({ success: true, analysis, timestamp: new Date().toISOString() });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// GENERATE AI TEMPLATE
router.post('/generate-template', optionalAuth, async (req, res) => {
    try {
        const { organizationType, customDescription, structure, staff } = req.body;
        if (!customDescription && !organizationType) return res.status(400).json({ error: 'Missing description or type' });
        const desc = customDescription || organizationType || 'custom organization';
        const prompt = `Emergency management system designer. Generate JSON config for: "${desc}".
Building: ${structure ? JSON.stringify(structure) : 'Not specified'}. Staff: ${staff ? staff.length : 0}.
Return ONLY valid JSON:
{"name":"...","description":"...","icon":"emoji","dashboardSections":["s1","s2","s3"],"emergencyTypes":[{"id":"t1","icon":"emoji","label":"Label","color":"#hex"}],"staffRoles":[{"value":"r1","label":"Role"}],"featureSections":{"s1":{"title":"Title","description":"Desc","fields":["F1"]}},"evacuationSteps":["Step 1","Step 2","Step 3","Step 4","Step 5"],"safetyTips":["Tip 1","Tip 2","Tip 3","Tip 4","Tip 5"],"riskTypes":["fire","medical"]}
Make content specific to "${desc}". Include 3-5 emergency types, 3-5 staff roles, 2-4 feature sections.`;
        const aiResponse = await generateAIResponse(prompt);
        let jsonStr = aiResponse;
        const m = aiResponse.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (m) jsonStr = m[1].trim();
        const s = jsonStr.indexOf('{'), e = jsonStr.lastIndexOf('}');
        if (s !== -1 && e !== -1) jsonStr = jsonStr.substring(s, e + 1);
        let template;
        try { template = JSON.parse(jsonStr); } catch { return res.json({ success: true, template: null, fallback: true }); }
        res.json({ success: true, template, source: 'ai', timestamp: new Date().toISOString() });
    } catch (error) { res.json({ success: false, template: null, fallback: true, error: error.message }); }
});

// GENERATE AI GUIDANCE
router.post('/generate-guidance', optionalAuth, async (req, res) => {
    try {
        const { type, organizationType, structure, staff } = req.body;
        if (!type || !organizationType) return res.status(400).json({ error: 'Missing required parameters' });
        const prompt = `AI emergency management expert. Generate detailed guidance for a ${organizationType}.
Emergency: ${type}. Building: ${structure ? JSON.stringify(structure) : 'Standard'}. Staff: ${staff ? staff.length : 0}.
Provide: 1. 3-5 step evacuation, 2. Staff role assignments, 3. Safety tips. Be practical and concise.`;
        const guidance = await generateAIResponse(prompt);
        res.json({ success: true, guidance, timestamp: new Date().toISOString() });
    } catch (error) { res.json({ success: false, guidance: '1. Activate alarm 2. Evacuate building 3. Assemble at designated point 4. Account for all persons 5. Contact emergency services', error: error.message }); }
});

// UPDATE SYSTEM
router.patch('/:systemID', verifyToken, async (req, res) => {
    try {
        const { systemID } = req.params;
        const { organizationName, organizationType, location, contactEmail, structure, staff, riskTypes, status, layoutAnalysis } = req.body;
        const userID = req.user.userID;
        const storedStructure = structure ? buildStoredStructure(structure, layoutAnalysis) : undefined;
        if (isMySQLAvailable()) {
            const systems = await query(`SELECT user_id FROM systems WHERE id = ?`, [systemID]);
            if (!systems[0] || systems[0].user_id !== userID) return res.status(403).json({ error: 'Unauthorized' });
            await execute(`UPDATE systems SET organization_name=?, organization_type=?, location=?, contact_email=?, structure_json=?, staff_json=?, risk_types_json=?, status=? WHERE id=? AND user_id=?`,
                [organizationName, organizationType, location, contactEmail, storedStructure ? JSON.stringify(storedStructure) : undefined, staff ? JSON.stringify(staff) : undefined, riskTypes ? JSON.stringify(riskTypes) : undefined, status || 'active', systemID, userID]);
        } else {
            const db = await getDatabase();
            await new Promise((resolve, reject) => {
                db.run(`UPDATE custom_rescue_systems SET organization_name=?, organization_type=?, location=?, contact_email=?, structure_json=?, staff_json=?, risk_types_json=?, status=?, updated_at=? WHERE id=?`,
                    [organizationName, organizationType, location, contactEmail, storedStructure ? JSON.stringify(storedStructure) : '{}', staff ? JSON.stringify(staff) : '[]', riskTypes ? JSON.stringify(riskTypes) : '[]', status || 'active', new Date().toISOString(), systemID],
                    err => err ? reject(err) : resolve());
            });
        }
        await logActivity(systemID, 'SYSTEM_UPDATED', 'System data updated');
        res.json({ success: true, message: 'System updated', systemID });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// PATCH LAYOUT ANALYSIS (dedicated endpoint for map analyser)
router.patch('/:systemID/layout-analysis', optionalAuth, async (req, res) => {
    try {
        const { systemID } = req.params;
        const { layout_analysis, layout_analysis_visible, layout_image } = req.body;
        const db = await getDatabase();

        // Ensure the columns exist (SQLite: add if missing)
        const cols = await new Promise((resolve, reject) => {
            db.all(`PRAGMA table_info(custom_rescue_systems)`, (err, rows) => err ? reject(err) : resolve(rows || []));
        });
        const colNames = cols.map(c => c.name);
        if (!colNames.includes('layout_analysis')) {
            await new Promise((resolve) => db.run(`ALTER TABLE custom_rescue_systems ADD COLUMN layout_analysis TEXT`, resolve));
        }
        if (!colNames.includes('layout_analysis_visible')) {
            await new Promise((resolve) => db.run(`ALTER TABLE custom_rescue_systems ADD COLUMN layout_analysis_visible INTEGER DEFAULT 1`, resolve));
        }
        if (!colNames.includes('layout_image')) {
            await new Promise((resolve) => db.run(`ALTER TABLE custom_rescue_systems ADD COLUMN layout_image TEXT`, resolve));
        }

        // Build dynamic UPDATE query
        const updates = [];
        const params = [];
        if (layout_analysis !== undefined) {
            updates.push('layout_analysis = ?');
            params.push(typeof layout_analysis === 'string' ? layout_analysis : JSON.stringify(layout_analysis));
        }
        if (layout_analysis_visible !== undefined) {
            updates.push('layout_analysis_visible = ?');
            params.push(layout_analysis_visible ? 1 : 0);
        }
        if (layout_image !== undefined) {
            updates.push('layout_image = ?');
            params.push(layout_image);
        }
        if (updates.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        params.push(systemID);
        await new Promise((resolve, reject) => {
            db.run(`UPDATE custom_rescue_systems SET ${updates.join(', ')} WHERE id = ?`, params,
                err => err ? reject(err) : resolve());
        });

        // Fetch updated record
        const updated = await new Promise((resolve, reject) => {
            db.get('SELECT * FROM custom_rescue_systems WHERE id = ?', [systemID],
                (err, row) => err ? reject(err) : resolve(row));
        });

        await logActivity(systemID, 'LAYOUT_ANALYSIS_UPDATED', 'Layout analysis data updated');
        res.json({ success: true, system: normalizeSystemRecord(updated) });
    } catch (error) {
        console.error('[LAYOUT-ANALYSIS] Update error:', error);
        res.status(500).json({ error: error.message });
    }
});

// DELETE SYSTEM (and all related data)
router.delete('/:systemID', optionalAuth, async (req, res) => {
    try {
        const { systemID } = req.params;
        const db = await getDatabase();

        // Delete all related child records first
        const relatedTables = ['incidents', 'sos_events', 'system_alerts', 'system_events', 'activity_logs'];
        for (const table of relatedTables) {
            await new Promise((resolve) => {
                db.run(`DELETE FROM ${table} WHERE system_id = ?`, [systemID], (err) => {
                    if (err) console.warn(`[DELETE] Could not clean ${table}:`, err.message);
                    resolve();
                });
            });
        }

        // Delete the system itself
        const result = await new Promise((resolve, reject) => {
            db.run(`DELETE FROM custom_rescue_systems WHERE id = ?`, [systemID], function (err) {
                if (err) return reject(err);
                resolve(this.changes);
            });
        });

        if (result === 0) {
            return res.status(404).json({ success: false, error: 'System not found' });
        }

        console.log(`🗑️ [DELETE] System ${systemID} and all related data removed`);
        res.json({ success: true, message: 'System deleted successfully' });
    } catch (error) {
        console.error('[DELETE] Error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// LOG EMERGENCY (FIXED - DB only, no localStorage)
router.post('/log-emergency', optionalAuth, async (req, res) => {
    try {
        const { systemID, emergencyType, location, timestamp } = req.body;
        if (!systemID || !emergencyType) return res.status(400).json({ error: 'Missing required fields' });
        const eventID = 'EV-' + Date.now();
        await saveSystemEvent(eventID, systemID, 'EMERGENCY_SOS', { emergencyType, location, timestamp }, location);
        await logActivity(systemID, 'EMERGENCY_SOS', `SOS: ${emergencyType} at ${location || 'unknown'}`);
        // Emit to system room via Socket.IO
        const io = req.app.locals.io;
        if (io) io.to(systemID).emit('new_sos', { id: eventID, system_id: systemID, emergency_type: emergencyType, location, timestamp: new Date().toISOString() });
        res.json({ success: true, eventID, message: 'Emergency event logged', timestamp: new Date().toISOString() });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// BROADCAST ALERT (FIXED - DB only, no localStorage)
router.post('/broadcast-alert', optionalAuth, async (req, res) => {
    try {
        const { systemID, message, severity = 'info' } = req.body;
        if (!systemID || !message) return res.status(400).json({ error: 'Missing required fields' });
        const alertID = 'ALERT-' + Date.now();
        await saveSystemAlert(alertID, systemID, message, severity, 'broadcast');
        await logActivity(systemID, 'ALERT_BROADCAST', message.substring(0, 100));
        // Emit to system room via Socket.IO
        const io = req.app.locals.io;
        if (io) io.to(systemID).emit('new_alert', { id: alertID, system_id: systemID, message, severity, timestamp: new Date().toISOString() });
        res.json({ success: true, alertID, message: 'Alert broadcast sent', timestamp: new Date().toISOString() });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// LOOKUP BY SYSTEM CODE (public access — no auth required)
router.get('/code/:code', async (req, res) => {
    try {
        const { code } = req.params;
        const db = await getDatabase();
        const system = await new Promise((resolve, reject) => {
            db.get(`SELECT * FROM custom_rescue_systems WHERE system_code = ?`, [code.toUpperCase()], (err, row) => err ? reject(err) : resolve(row));
        });
        if (!system) return res.status(404).json({ error: 'System not found' });
        res.json({ success: true, system: normalizeSystemRecord(system) });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// SOS — scoped to system, stored in sos_events table
router.post('/sos', async (req, res) => {
    try {
        const { system_id, emergency_type, location } = req.body;
        if (!system_id) return res.status(400).json({ error: 'system_id is required' });
        if (!emergency_type) return res.status(400).json({ error: 'emergency_type is required' });

        // Verify system exists
        const db = await getDatabase();
        const system = await new Promise((resolve, reject) => {
            db.get(`SELECT id FROM custom_rescue_systems WHERE id = ? OR system_code = ?`, [system_id, system_id], (err, row) => err ? reject(err) : resolve(row));
        });
        if (!system) return res.status(404).json({ error: 'System not found' });

        const sosId = 'SOS-' + Date.now();
        const realSystemId = system.id;
        await new Promise((resolve, reject) => {
            db.run(`INSERT INTO sos_events (id, system_id, emergency_type, location) VALUES (?, ?, ?, ?)`,
                [sosId, realSystemId, emergency_type, location || ''], err => err ? reject(err) : resolve());
        });
        // Also log as system event and activity for existing panels
        await saveSystemEvent(sosId, realSystemId, 'EMERGENCY_SOS', { emergencyType: emergency_type, location }, location);
        await logActivity(realSystemId, 'EMERGENCY_SOS', `SOS: ${emergency_type} at ${location || 'unknown'}`);
        // Emit to system room via Socket.IO
        const io = req.app.locals.io;
        if (io) io.to(realSystemId).emit('new_sos', { id: sosId, system_id: realSystemId, emergency_type, location, timestamp: new Date().toISOString() });
        res.json({ success: true, sosId, message: 'SOS logged', timestamp: new Date().toISOString() });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// GET SOS EVENTS — scoped to system
router.get('/sos/:systemID', async (req, res) => {
    try {
        const db = await getDatabase();
        const events = await new Promise((resolve, reject) => {
            db.all(`SELECT * FROM sos_events WHERE system_id = ? ORDER BY created_at DESC LIMIT 100`, [req.params.systemID],
                (err, rows) => err ? reject(err) : resolve(rows || []));
        });
        res.json({ success: true, events });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// CREATE INCIDENT — scoped to system
router.post('/incidents', async (req, res) => {
    try {
        const { system_id, type, message, location } = req.body;
        if (!system_id || !type) return res.status(400).json({ error: 'system_id and type are required' });
        const db = await getDatabase();
        const incidentId = 'INC-' + Date.now();
        await new Promise((resolve, reject) => {
            db.run(`INSERT INTO incidents (id, system_id, type, message, location) VALUES (?, ?, ?, ?, ?)`,
                [incidentId, system_id, type, message || '', location || ''], err => err ? reject(err) : resolve());
        });
        await logActivity(system_id, 'INCIDENT_CREATED', `${type}: ${message || ''}`);
        res.json({ success: true, incidentId });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// GET INCIDENTS — scoped to system
router.get('/incidents/:systemID', async (req, res) => {
    try {
        const db = await getDatabase();
        const incidents = await new Promise((resolve, reject) => {
            db.all(`SELECT * FROM incidents WHERE system_id = ? ORDER BY created_at DESC LIMIT 100`, [req.params.systemID],
                (err, rows) => err ? reject(err) : resolve(rows || []));
        });
        res.json({ success: true, incidents });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// STATS: OVERVIEW — for SQL Module dashboard
router.get('/stats/overview', optionalAuth, async (req, res) => {
    try {
        if (isMySQLAvailable()) {
            const systems = await query('SELECT COUNT(*) as total FROM systems');
            const active = await query('SELECT COUNT(*) as count FROM systems WHERE status = "active"');
            const emergencies = await query('SELECT COUNT(*) as count FROM emergencies WHERE created_at > DATE_SUB(NOW(), INTERVAL 30 DAY)');
            return res.json({
                stats: {
                    total_systems: systems[0]?.total || 0,
                    active_systems: active[0]?.count || 0,
                    emergencies_this_month: emergencies[0]?.count || 0
                }
            });
        }

        const db = await getDatabase();
        const stats = await new Promise((resolve) => {
            db.get(`SELECT
                (SELECT COUNT(*) FROM custom_rescue_systems) as total_systems,
                (SELECT COUNT(*) FROM custom_rescue_systems WHERE status='active') as active_systems,
                (SELECT COUNT(*) FROM emergencies WHERE created_at > datetime('now', '-30 days')) as emergencies_this_month`,
                (err, row) => {
                    if (err) resolve({ total_systems: 0, active_systems: 0, emergencies_this_month: 0 });
                    else resolve(row || {});
                });
        });
        res.json({ stats });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

export default router;
