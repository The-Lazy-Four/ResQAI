// ============================================
// ResQAI - Database Setup (SQLite) - Enhanced
// ============================================

import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../emergencies.db');

let db = null;
let usingMemoryFallback = false;

function openDatabase(databasePath) {
    return new Promise((resolve, reject) => {
        const handle = new sqlite3.Database(databasePath, (err) => {
            if (err) {
                reject(err);
                return;
            }
            db = handle;
            usingMemoryFallback = databasePath === ':memory:';
            resolve(handle);
        });
    });
}

export async function initDatabase() {
    if (db) return db;
    try {
        await openDatabase(DB_PATH);
        console.log('✅ Database initialized:', DB_PATH);
        await createTables();
        return db;
    } catch (err) {
        console.warn('⚠️ Primary SQLite init failed, using fallback in-memory DB:', err.message);
        console.log('Using fallback in-memory DB');
        await openDatabase(':memory:');
        await createTables();
        return db;
    }
}

async function createTables() {
    if (!db) return;
    return new Promise((resolve, reject) => {
        db.exec(`
            CREATE TABLE IF NOT EXISTS emergencies (
                id TEXT PRIMARY KEY,
                system_id TEXT,
                description TEXT NOT NULL,
                location TEXT NOT NULL,
                severity TEXT DEFAULT 'high',
                status TEXT DEFAULT 'pending',
                classified_type TEXT,
                confidence_score REAL,
                ai_suggestions TEXT,
                image_url TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS chat_history (
                id TEXT PRIMARY KEY,
                system_id TEXT,
                user_message TEXT NOT NULL,
                bot_response TEXT NOT NULL,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS custom_rescue_systems (
                id TEXT PRIMARY KEY,
                system_code TEXT UNIQUE,
                access_code TEXT,
                admin_id TEXT,
                organization_name TEXT NOT NULL,
                organization_type TEXT NOT NULL,
                location TEXT NOT NULL,
                contact_email TEXT NOT NULL,
                structure_json TEXT,
                staff_json TEXT,
                risk_types_json TEXT,
                status TEXT DEFAULT 'created',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS incidents (
                id TEXT PRIMARY KEY,
                system_id TEXT NOT NULL,
                type TEXT NOT NULL,
                status TEXT DEFAULT 'active',
                message TEXT,
                location TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS sos_events (
                id TEXT PRIMARY KEY,
                system_id TEXT NOT NULL,
                emergency_type TEXT NOT NULL,
                location TEXT,
                status TEXT DEFAULT 'active',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS system_alerts (
                id TEXT PRIMARY KEY,
                system_id TEXT NOT NULL,
                message TEXT NOT NULL,
                severity TEXT DEFAULT 'info',
                alert_type TEXT DEFAULT 'broadcast',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS system_events (
                id TEXT PRIMARY KEY,
                system_id TEXT NOT NULL,
                event_type TEXT NOT NULL,
                details TEXT,
                location TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS activity_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                system_id TEXT,
                action TEXT NOT NULL,
                details TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE INDEX IF NOT EXISTS idx_emergencies_status ON emergencies(status);
            CREATE INDEX IF NOT EXISTS idx_emergencies_system ON emergencies(system_id);
            CREATE INDEX IF NOT EXISTS idx_emergencies_created ON emergencies(created_at);
            CREATE INDEX IF NOT EXISTS idx_custom_systems_created ON custom_rescue_systems(created_at);
            CREATE INDEX IF NOT EXISTS idx_custom_systems_code ON custom_rescue_systems(system_code);
            CREATE INDEX IF NOT EXISTS idx_custom_systems_admin ON custom_rescue_systems(admin_id);
            CREATE INDEX IF NOT EXISTS idx_alerts_system ON system_alerts(system_id);
            CREATE INDEX IF NOT EXISTS idx_events_system ON system_events(system_id);
            CREATE INDEX IF NOT EXISTS idx_incidents_system ON incidents(system_id);
            CREATE INDEX IF NOT EXISTS idx_sos_events_system ON sos_events(system_id);
        `, (err) => { if (err) console.warn('Table creation note:', err.message); resolve(); });
    });
}

export async function getDatabase() {
    if (!db) await initDatabase();
    return db;
}

export async function closeDatabase() {
    if (db) { db.close(); db = null; }
}

export function getEmergencies(filters = {}) {
    return new Promise(async (resolve, reject) => {
        const db = await getDatabase();
        let query = 'SELECT * FROM emergencies WHERE 1=1';
        const params = [];
        if (filters.status) { query += ' AND status = ?'; params.push(filters.status); }
        if (filters.type) { query += ' AND classified_type = ?'; params.push(filters.type); }
        query += ' ORDER BY created_at DESC';
        db.all(query, params, (err, rows) => { if (err) reject(err); else resolve(rows || []); });
    });
}

export function getEmergencyById(id) {
    return new Promise(async (resolve, reject) => {
        const db = await getDatabase();
        db.get('SELECT * FROM emergencies WHERE id = ?', [id], (err, row) => { if (err) reject(err); else resolve(row); });
    });
}

export function createEmergency(emergency) {
    return new Promise(async (resolve, reject) => {
        const db = await getDatabase();
        const { id, description, location, severity, classified_type, confidence_score, ai_suggestions, image_url } = emergency;
        db.run(
            `INSERT INTO emergencies (id, description, location, severity, classified_type, confidence_score, ai_suggestions, image_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, description, location, severity, classified_type, confidence_score, ai_suggestions, image_url],
            async function (err) { if (err) reject(err); else resolve(await getEmergencyById(id)); }
        );
    });
}

export function updateEmergency(id, updates) {
    return new Promise(async (resolve, reject) => {
        const db = await getDatabase();
        const updatable = ['status', 'classified_type', 'confidence_score', 'ai_suggestions'];
        const fields = [], values = [];
        for (const [key, value] of Object.entries(updates)) {
            if (updatable.includes(key)) { fields.push(`${key} = ?`); values.push(value); }
        }
        if (fields.length === 0) { reject(new Error('No valid fields to update')); return; }
        fields.push('updated_at = CURRENT_TIMESTAMP'); values.push(id);
        db.run(`UPDATE emergencies SET ${fields.join(', ')} WHERE id = ?`, values, async function (err) {
            if (err) reject(err); else resolve(await getEmergencyById(id));
        });
    });
}

export function deleteEmergency(id) {
    return new Promise(async (resolve, reject) => {
        const db = await getDatabase();
        db.run('DELETE FROM emergencies WHERE id = ?', [id], function (err) { if (err) reject(err); else resolve({ success: true }); });
    });
}

export function getChatHistory() {
    return new Promise(async (resolve, reject) => {
        const db = await getDatabase();
        db.all('SELECT * FROM chat_history ORDER BY timestamp DESC LIMIT 50', [], (err, rows) => { if (err) reject(err); else resolve(rows || []); });
    });
}

export function addChatMessage(id, userMessage, botResponse) {
    return new Promise(async (resolve, reject) => {
        const db = await getDatabase();
        db.run('INSERT INTO chat_history (id, user_message, bot_response) VALUES (?, ?, ?)', [id, userMessage, botResponse],
            function (err) { if (err) reject(err); else resolve({ success: true }); }
        );
    });
}

// System alerts helpers
export async function saveSystemAlert(alertId, systemId, message, severity, alertType) {
    const db = await getDatabase();
    return new Promise((resolve, reject) => {
        db.run(
            'INSERT INTO system_alerts (id, system_id, message, severity, alert_type) VALUES (?, ?, ?, ?, ?)',
            [alertId, systemId, message, severity || 'info', alertType || 'broadcast'],
            function (err) { if (err) reject(err); else resolve({ success: true }); }
        );
    });
}

export async function getSystemAlerts(systemId) {
    const db = await getDatabase();
    return new Promise((resolve, reject) => {
        db.all('SELECT * FROM system_alerts WHERE system_id = ? ORDER BY created_at DESC LIMIT 100', [systemId],
            (err, rows) => { if (err) reject(err); else resolve(rows || []); }
        );
    });
}

export async function saveSystemEvent(eventId, systemId, eventType, details, location) {
    const db = await getDatabase();
    return new Promise((resolve, reject) => {
        db.run(
            'INSERT INTO system_events (id, system_id, event_type, details, location) VALUES (?, ?, ?, ?, ?)',
            [eventId, systemId, eventType, JSON.stringify(details || {}), location || ''],
            function (err) { if (err) reject(err); else resolve({ success: true }); }
        );
    });
}

export async function getSystemEvents(systemId) {
    const db = await getDatabase();
    return new Promise((resolve, reject) => {
        db.all('SELECT * FROM system_events WHERE system_id = ? ORDER BY created_at DESC LIMIT 100', [systemId],
            (err, rows) => { if (err) reject(err); else resolve(rows || []); }
        );
    });
}

export async function logActivity(systemId, action, details) {
    const db = await getDatabase();
    return new Promise((resolve, reject) => {
        db.run('INSERT INTO activity_logs (system_id, action, details) VALUES (?, ?, ?)',
            [systemId, action, details || ''], function (err) { if (err) reject(err); else resolve({ success: true }); }
        );
    });
}

export async function getActivityLogs(systemId, limit = 50) {
    const db = await getDatabase();
    return new Promise((resolve, reject) => {
        const q = systemId
            ? 'SELECT * FROM activity_logs WHERE system_id = ? ORDER BY created_at DESC LIMIT ?'
            : 'SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT ?';
        const params = systemId ? [systemId, limit] : [limit];
        db.all(q, params, (err, rows) => { if (err) reject(err); else resolve(rows || []); });
    });
}

// SQL Query executor (safe read-only queries for the SQL module)
export async function executeQuery(sqlQuery, params = []) {
    const db = await getDatabase();
    return new Promise((resolve, reject) => {
        const upperQ = sqlQuery.trim().toUpperCase();
        if (!upperQ.startsWith('SELECT') && !upperQ.startsWith('WITH') && !upperQ.startsWith('PRAGMA')) {
            reject(new Error('Only SELECT queries are allowed for security'));
            return;
        }
        db.all(sqlQuery, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows || []);
        });
    });
}
