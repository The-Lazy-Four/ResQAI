// =====================================================
// ResQAI - Custom Rescue System Builder API Routes (FIXED)
// =====================================================

import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query, execute, isMySQLAvailable } from '../../db/mysql.js';
import { getDatabase, saveSystemAlert, getSystemAlerts, saveSystemEvent, getSystemEvents, logActivity, getActivityLogs, executeQuery } from '../../db/db.js';
import { generateAIResponse } from '../../utils/aiRouter.js';
import { verifyToken, optionalAuth } from '../../middleware/auth.js';

const router = express.Router();

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
    const layoutAnalysis = safeParseJSON(parsedStructure?.layoutAnalysis, null);
    if (parsedStructure) { delete parsedStructure.layoutAnalysis; }
    n.structure = parsedStructure; n.staff = parsedStaff; n.riskTypes = parsedRiskTypes; n.layoutAnalysis = layoutAnalysis;
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

// CREATE
router.post('/create', optionalAuth, async (req, res) => {
    try {
        const { organizationName, organizationType, location, contactEmail, structure, staff, riskTypes, layoutAnalysis } = req.body;
        if (!organizationName || !organizationType || !location || !contactEmail) return res.status(400).json({ error: 'Missing required fields' });
        const systemID = uuidv4();
        const userID = req.user?.userID || 'anonymous-' + uuidv4();
        const storedStructure = buildStoredStructure(structure, layoutAnalysis);
        if (isMySQLAvailable()) {
            await execute(`INSERT INTO systems (id, user_id, organization_name, organization_type, location, contact_email, structure_json, staff_json, risk_types_json, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [systemID, userID, organizationName, organizationType, location, contactEmail, JSON.stringify(storedStructure), JSON.stringify(staff), JSON.stringify(riskTypes), 'active']);
        } else {
            const db = await getDatabase();
            await new Promise((resolve, reject) => {
                db.run(`INSERT INTO custom_rescue_systems (id, organization_name, organization_type, location, contact_email, structure_json, staff_json, risk_types_json, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [systemID, organizationName, organizationType, location, contactEmail, JSON.stringify(storedStructure), JSON.stringify(staff), JSON.stringify(riskTypes), 'active', new Date().toISOString()],
                    err => err ? reject(err) : resolve());
            });
        }
        await logActivity(systemID, 'SYSTEM_CREATED', `Created: ${organizationName}`);
        res.json({ success: true, systemID, userID, message: 'System created successfully', system: { id: systemID, organizationName, organizationType, location, status: 'active' } });
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

// LIST USER SYSTEMS
router.get('/user/list', optionalAuth, async (req, res) => {
    try {
        const userID = req.user?.userID;
        let systems = [];
        if (isMySQLAvailable()) {
            if (userID) systems = await query(`SELECT id, organization_name, organization_type, location, status, created_at FROM systems WHERE user_id = ? ORDER BY created_at DESC LIMIT 100`, [userID]);
        } else {
            const db = await getDatabase();
            systems = await new Promise((resolve, reject) => { db.all(`SELECT id, organization_name, organization_type, location, status, created_at FROM custom_rescue_systems ORDER BY created_at DESC LIMIT 100`, (err, rows) => err ? reject(err) : resolve(rows || [])); });
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
        if (!alerts || alerts.length === 0) {
            return res.json({ success: true, alerts: getMockAlerts(req.params.systemID) });
        }
        res.json({ success: true, alerts });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// SYSTEM EVENTS
router.get('/:systemID/events', optionalAuth, async (req, res) => {
    try {
        const events = await getSystemEvents(req.params.systemID);
        if (!events || events.length === 0) {
            return res.json({ success: true, events: getMockEvents(req.params.systemID) });
        }
        res.json({ success: true, events });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// SQL: EXECUTE QUERY
router.post('/sql/execute', optionalAuth, async (req, res) => {
    try {
        const { query: sqlQuery } = req.body;
        if (!sqlQuery) return res.status(400).json({ error: 'Missing SQL query' });
        const upper = sqlQuery.trim().toUpperCase();
        if (!upper.startsWith('SELECT') && !upper.startsWith('WITH') && !upper.startsWith('PRAGMA')) {
            return res.status(403).json({ error: 'Only SELECT and PRAGMA queries are permitted.' });
        }
        const results = await executeQuery(sqlQuery.trim());
        await logActivity(null, 'SQL_QUERY', sqlQuery.substring(0, 200));
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

// DELETE SYSTEM
router.delete('/:systemID', verifyToken, async (req, res) => {
    try {
        const { systemID } = req.params;
        const userID = req.user.userID;
        if (isMySQLAvailable()) {
            await execute(`DELETE FROM systems WHERE id=? AND user_id=?`, [systemID, userID]);
        } else {
            const db = await getDatabase();
            await new Promise((resolve, reject) => { db.run(`DELETE FROM custom_rescue_systems WHERE id=?`, [systemID], err => err ? reject(err) : resolve()); });
        }
        res.json({ success: true, message: 'System deleted', systemID });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// LOG EMERGENCY (FIXED - DB only, no localStorage)
router.post('/log-emergency', optionalAuth, async (req, res) => {
    try {
        const { systemID, emergencyType, location, timestamp } = req.body;
        if (!systemID || !emergencyType) return res.status(400).json({ error: 'Missing required fields' });
        const eventID = 'EV-' + Date.now();
        await saveSystemEvent(eventID, systemID, 'EMERGENCY_SOS', { emergencyType, location, timestamp }, location);
        await logActivity(systemID, 'EMERGENCY_SOS', `SOS: ${emergencyType} at ${location || 'unknown'}`);
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
        res.json({ success: true, alertID, message: 'Alert broadcast sent', timestamp: new Date().toISOString() });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

export default router;
