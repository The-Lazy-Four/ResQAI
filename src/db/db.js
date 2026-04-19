// ============================================
// ResQAI - Database Setup (SQLite)
// ============================================

import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../emergencies.db');

let db = null;

// Initialize database connection
export async function initDatabase() {
    if (db) return db;

    return new Promise((resolve, reject) => {
        db = new sqlite3.Database(DB_PATH, (err) => {
            if (err) {
                console.error('❌ Database error:', err);
                reject(err);
            } else {
                console.log('✅ Database initialized:', DB_PATH);
                createTables();
                resolve(db);
            }
        });
    });
}

// Create database tables
async function createTables() {
    if (!db) return;

    db.exec(`
        CREATE TABLE IF NOT EXISTS emergencies (
            id TEXT PRIMARY KEY,
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
            user_message TEXT NOT NULL,
            bot_response TEXT NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS custom_rescue_systems (
            id TEXT PRIMARY KEY,
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

        CREATE INDEX IF NOT EXISTS idx_emergencies_status ON emergencies(status);
        CREATE INDEX IF NOT EXISTS idx_emergencies_created ON emergencies(created_at);
        CREATE INDEX IF NOT EXISTS idx_emergencies_type ON emergencies(classified_type);
        CREATE INDEX IF NOT EXISTS idx_custom_systems_created ON custom_rescue_systems(created_at);
        CREATE INDEX IF NOT EXISTS idx_custom_systems_status ON custom_rescue_systems(status);
    `);
}

// Get database instance
export async function getDatabase() {
    if (!db) {
        await initDatabase();
    }
    return db;
}

// Close database connection
export async function closeDatabase() {
    if (db) {
        db.close();
        db = null;
    }
}

// ==================== CRUD OPERATIONS ====================

export function getEmergencies(filters = {}) {
    return new Promise(async (resolve, reject) => {
        const db = await getDatabase();
        let query = 'SELECT * FROM emergencies WHERE 1=1';
        const params = [];

        if (filters.status) {
            query += ' AND status = ?';
            params.push(filters.status);
        }

        if (filters.type) {
            query += ' AND classified_type = ?';
            params.push(filters.type);
        }

        query += ' ORDER BY created_at DESC';

        db.all(query, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows || []);
        });
    });
}

export function getEmergencyById(id) {
    return new Promise(async (resolve, reject) => {
        const db = await getDatabase();
        db.get('SELECT * FROM emergencies WHERE id = ?', [id], (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

export function createEmergency(emergency) {
    return new Promise(async (resolve, reject) => {
        const db = await getDatabase();
        const {
            id,
            description,
            location,
            severity,
            classified_type,
            confidence_score,
            ai_suggestions,
            image_url
        } = emergency;

        db.run(
            `INSERT INTO emergencies 
            (id, description, location, severity, classified_type, confidence_score, ai_suggestions, image_url) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, description, location, severity, classified_type, confidence_score, ai_suggestions, image_url],
            async function (err) {
                if (err) reject(err);
                else resolve(await getEmergencyById(id));
            }
        );
    });
}

export function updateEmergency(id, updates) {
    return new Promise(async (resolve, reject) => {
        const db = await getDatabase();
        const updatable = ['status', 'classified_type', 'confidence_score', 'ai_suggestions'];
        const fields = [];
        const values = [];

        for (const [key, value] of Object.entries(updates)) {
            if (updatable.includes(key)) {
                fields.push(`${key} = ?`);
                values.push(value);
            }
        }

        if (fields.length === 0) {
            reject(new Error('No valid fields to update'));
            return;
        }

        fields.push('updated_at = CURRENT_TIMESTAMP');
        values.push(id);

        db.run(
            `UPDATE emergencies SET ${fields.join(', ')} WHERE id = ?`,
            values,
            async function (err) {
                if (err) reject(err);
                else resolve(await getEmergencyById(id));
            }
        );
    });
}

export function deleteEmergency(id) {
    return new Promise(async (resolve, reject) => {
        const db = await getDatabase();
        db.run('DELETE FROM emergencies WHERE id = ?', [id], function (err) {
            if (err) reject(err);
            else resolve({ success: true });
        });
    });
}

export function getChatHistory() {
    return new Promise(async (resolve, reject) => {
        const db = await getDatabase();
        db.all('SELECT * FROM chat_history ORDER BY timestamp DESC LIMIT 50', [], (err, rows) => {
            if (err) reject(err);
            else resolve(rows || []);
        });
    });
}

export function addChatMessage(id, userMessage, botResponse) {
    return new Promise(async (resolve, reject) => {
        const db = await getDatabase();
        db.run(
            'INSERT INTO chat_history (id, user_message, bot_response) VALUES (?, ?, ?)',
            [id, userMessage, botResponse],
            function (err) {
                if (err) reject(err);
                else resolve({ success: true });
            }
        );
    });
}
