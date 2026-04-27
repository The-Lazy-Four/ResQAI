// ============================================
// ResQAI - Database schema helpers
// ============================================

import path from 'path';
import { fileURLToPath } from 'url';
import { getDatabase } from './db.js';
import { execute, isMySQLAvailable } from './mysql.js';

const __filename = fileURLToPath(import.meta.url);

function execSqlite(db, sql) {
    return new Promise((resolve, reject) => {
        db.exec(sql, (err) => {
            if (err) reject(err);
            else resolve();
        });
    });
}

export async function ensureGoogleAuthSchema() {
    const db = await getDatabase();

    await execSqlite(db, `
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            first_name TEXT,
            last_name TEXT,
            organization TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS admins (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS admin_sessions (
            token TEXT PRIMARY KEY,
            admin_id TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            expires_at DATETIME,
            FOREIGN KEY (admin_id) REFERENCES admins(id)
        );

        CREATE TABLE IF NOT EXISTS password_reset_tokens (
            token_hash TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            email TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            expires_at DATETIME NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );
    `);

    try {
        await execSqlite(db, 'ALTER TABLE admins ADD COLUMN google_id TEXT');
    } catch (error) {
        // Column already exists.
    }

    try {
        await execSqlite(db, 'ALTER TABLE users ADD COLUMN google_id TEXT');
    } catch (error) {
        // Column already exists.
    }

    if (isMySQLAvailable()) {
        await execute(`
            CREATE TABLE IF NOT EXISTS admins (
                id VARCHAR(36) PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                google_id VARCHAR(255) NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_admins_email (email)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        await execute(`
            CREATE TABLE IF NOT EXISTS admin_sessions (
                token VARCHAR(128) PRIMARY KEY,
                admin_id VARCHAR(36) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP NULL,
                INDEX idx_admin_sessions_admin (admin_id),
                INDEX idx_admin_sessions_expiry (expires_at),
                CONSTRAINT fk_admin_sessions_admin
                    FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        await execute(`
            CREATE TABLE IF NOT EXISTS password_reset_tokens (
                token_hash VARCHAR(128) PRIMARY KEY,
                user_id VARCHAR(36) NOT NULL,
                email VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP NOT NULL,
                INDEX idx_password_reset_user (user_id),
                INDEX idx_password_reset_expiry (expires_at),
                CONSTRAINT fk_password_reset_user
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        try {
            await execute('ALTER TABLE users ADD COLUMN google_id VARCHAR(255) NULL');
        } catch (error) {
            // Column already exists.
        }
    }

    return true;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
    await ensureGoogleAuthSchema();
    console.log('Google auth schema ready.');
}

export default ensureGoogleAuthSchema;
