// ============================================
// ResQAI - Database (SQLite + in-memory fallback)
// ============================================

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../emergencies.db');

// ---------- in-memory fallback ----------
const mem = { emergencies: [], chat: [] };

let sqlite3Mod = null;
let db = null;
let useMemory = false;

try {
    const mod = await import('sqlite3');
    sqlite3Mod = mod.default ?? mod;
} catch {
    console.warn('⚠️  sqlite3 native binding missing — using in-memory store (all features still work)');
    useMemory = true;
}

// ---------- init ----------
export async function initDatabase() {
    if (useMemory || db) return db;
    return new Promise((resolve) => {
        db = new sqlite3Mod.Database(DB_PATH, (err) => {
            if (err) { console.warn('⚠️  SQLite open failed — using memory store:', err.message); useMemory = true; resolve(null); return; }
            console.log('✅ SQLite initialized:', DB_PATH);
            db.exec(`
                CREATE TABLE IF NOT EXISTS emergencies (
                    id TEXT PRIMARY KEY, description TEXT NOT NULL, location TEXT NOT NULL,
                    severity TEXT DEFAULT 'high', status TEXT DEFAULT 'pending',
                    classified_type TEXT, confidence_score REAL, ai_suggestions TEXT,
                    image_url TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP);
                CREATE TABLE IF NOT EXISTS chat_history (
                    id TEXT PRIMARY KEY, user_message TEXT NOT NULL, bot_response TEXT NOT NULL,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP);`);
            resolve(db);
        });
    });
}

export async function getDatabase() { if (!db && !useMemory) await initDatabase(); return db; }
export async function closeDatabase() { if (db) { db.close(); db = null; } }

// ---------- CRUD ----------
export async function getEmergencies(filters = {}) {
    if (useMemory) return mem.emergencies;
    return new Promise(async (resolve) => {
        const d = await getDatabase();
        d.all('SELECT * FROM emergencies ORDER BY created_at DESC', [], (err, rows) => resolve(rows || []));
    });
}

export async function getEmergencyById(id) {
    if (useMemory) return mem.emergencies.find(e => e.id === id);
    return new Promise(async (resolve) => {
        const d = await getDatabase();
        d.get('SELECT * FROM emergencies WHERE id = ?', [id], (err, row) => resolve(row));
    });
}

export async function createEmergency(emergency) {
    if (useMemory) { mem.emergencies.unshift(emergency); return emergency; }
    return new Promise(async (resolve) => {
        const { id, description, location, severity, classified_type, confidence_score, ai_suggestions, image_url } = emergency;
        const d = await getDatabase();
        d.run(`INSERT INTO emergencies (id,description,location,severity,classified_type,confidence_score,ai_suggestions,image_url) VALUES (?,?,?,?,?,?,?,?)`,
            [id, description, location, severity, classified_type, confidence_score, ai_suggestions, image_url],
            async (err) => resolve(err ? emergency : await getEmergencyById(id)));
    });
}

export async function updateEmergency(id, updates) {
    if (useMemory) {
        const idx = mem.emergencies.findIndex(e => e.id === id);
        if (idx !== -1) Object.assign(mem.emergencies[idx], updates);
        return mem.emergencies[idx];
    }
    return new Promise(async (resolve) => {
        const allowed = ['status','classified_type','confidence_score','ai_suggestions'];
        const fields = [], values = [];
        for (const [k, v] of Object.entries(updates)) { if (allowed.includes(k)) { fields.push(`${k}=?`); values.push(v); } }
        if (!fields.length) { resolve(null); return; }
        fields.push('updated_at=CURRENT_TIMESTAMP'); values.push(id);
        const d = await getDatabase();
        d.run(`UPDATE emergencies SET ${fields.join(',')} WHERE id=?`, values, async () => resolve(await getEmergencyById(id)));
    });
}

export async function deleteEmergency(id) {
    if (useMemory) { mem.emergencies = mem.emergencies.filter(e => e.id !== id); return { success: true }; }
    return new Promise(async (resolve) => {
        const d = await getDatabase();
        d.run('DELETE FROM emergencies WHERE id=?', [id], () => resolve({ success: true }));
    });
}

export async function getChatHistory() {
    if (useMemory) return mem.chat.slice(0, 50);
    return new Promise(async (resolve) => {
        const d = await getDatabase();
        d.all('SELECT * FROM chat_history ORDER BY timestamp DESC LIMIT 50', [], (err, rows) => resolve(rows || []));
    });
}

export async function addChatMessage(id, userMessage, botResponse) {
    if (useMemory) {
        mem.chat.unshift({ id, user_message: userMessage, bot_response: botResponse, timestamp: new Date().toISOString() });
        return { success: true };
    }
    return new Promise(async (resolve) => {
        const d = await getDatabase();
        d.run('INSERT INTO chat_history (id,user_message,bot_response) VALUES (?,?,?)',
            [id, userMessage, botResponse],
            (err) => resolve({ success: !err }));
    });
}
