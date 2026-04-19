// ============================================
// ResQAI - MySQL Database Setup
// ============================================
// Handles MySQL initialization with auto-create tables
// Fallback to SQLite if MySQL unavailable

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

let pool = null;
let isAvailable = false;

const MYSQL_CONFIG = {
    host: process.env.MYSQL_HOST || 'localhost',
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'resqai_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelayMs: 0,
};

// Initialize MySQL connection pool
export async function initMySQL() {
    try {
        // Try to create database if it doesn't exist
        const tempConnection = await mysql.createConnection({
            host: MYSQL_CONFIG.host,
            user: MYSQL_CONFIG.user,
            password: MYSQL_CONFIG.password,
        });

        await tempConnection.execute(`CREATE DATABASE IF NOT EXISTS ${MYSQL_CONFIG.database}`);
        await tempConnection.end();

        // Create main connection pool
        pool = mysql.createPool(MYSQL_CONFIG);

        // Test connection
        const connection = await pool.getConnection();
        await connection.ping();
        connection.release();

        console.log('✅ MySQL connection established:', MYSQL_CONFIG.database);
        isAvailable = true;

        // Create tables
        await createTables();

        return true;
    } catch (error) {
        console.warn('⚠️  MySQL unavailable, falling back to SQLite:', error.message);
        isAvailable = false;
        return false;
    }
}

// Create MySQL tables
async function createTables() {
    if (!pool) return;

    const tables = [
        // Users table
        `CREATE TABLE IF NOT EXISTS users (
            id VARCHAR(36) PRIMARY KEY,
            email VARCHAR(255) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            first_name VARCHAR(100),
            last_name VARCHAR(100),
            organization VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_email (email),
            INDEX idx_created (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

        // Systems table
        `CREATE TABLE IF NOT EXISTS systems (
            id VARCHAR(36) PRIMARY KEY,
            user_id VARCHAR(36) NOT NULL,
            organization_name VARCHAR(255) NOT NULL,
            organization_type VARCHAR(50) NOT NULL,
            location VARCHAR(255) NOT NULL,
            contact_email VARCHAR(255),
            structure_json LONGTEXT,
            staff_json LONGTEXT,
            risk_types_json LONGTEXT,
            status VARCHAR(50) DEFAULT 'active',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            INDEX idx_user_id (user_id),
            INDEX idx_status (status),
            INDEX idx_created (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

        // System logs
        `CREATE TABLE IF NOT EXISTS system_logs (
            id VARCHAR(36) PRIMARY KEY,
            system_id VARCHAR(36) NOT NULL,
            action VARCHAR(100) NOT NULL,
            details LONGTEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (system_id) REFERENCES systems(id) ON DELETE CASCADE,
            INDEX idx_system_id (system_id),
            INDEX idx_created (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

        // Sessions table
        `CREATE TABLE IF NOT EXISTS sessions (
            id VARCHAR(36) PRIMARY KEY,
            user_id VARCHAR(36) NOT NULL,
            token VARCHAR(500) NOT NULL,
            expires_at TIMESTAMP NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            INDEX idx_user_id (user_id),
            INDEX idx_expires (expires_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
    ];

    try {
        for (const table of tables) {
            const connection = await pool.getConnection();
            await connection.execute(table);
            connection.release();
        }
        console.log('✅ MySQL tables created successfully');
    } catch (error) {
        console.error('❌ Error creating tables:', error);
    }
}

// Get MySQL pool
export function getPool() {
    return pool;
}

// Check if MySQL is available
export function isMySQLAvailable() {
    return isAvailable && pool;
}

// Execute query
export async function query(sql, params = []) {
    if (!pool) throw new Error('MySQL pool not initialized');
    const connection = await pool.getConnection();
    try {
        const [rows] = await connection.execute(sql, params);
        return rows;
    } finally {
        connection.release();
    }
}

// Execute insert/update/delete
export async function execute(sql, params = []) {
    if (!pool) throw new Error('MySQL pool not initialized');
    const connection = await pool.getConnection();
    try {
        const [result] = await connection.execute(sql, params);
        return result;
    } finally {
        connection.release();
    }
}

// Close pool
export async function closeMySQL() {
    if (pool) {
        await pool.end();
        pool = null;
    }
}
