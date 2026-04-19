// =====================================================
// ResQAI - Authentication API Routes
// =====================================================

import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { query, execute, isMySQLAvailable } from '../../db/mysql.js';
import { getDatabase } from '../../db/db.js';

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'resqai-secret-key-change-in-production';
const JWT_EXPIRY = '7d';

// ===== REGISTER USER =====
router.post('/register', async (req, res) => {
    try {
        const { email, password, firstName, lastName, organization } = req.body;

        // Validation
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password required' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }

        const userID = uuidv4();
        const passwordHash = await bcrypt.hash(password, 10);

        try {
            if (isMySQLAvailable()) {
                // Try MySQL first
                await execute(
                    `INSERT INTO users (id, email, password_hash, first_name, last_name, organization) 
                     VALUES (?, ?, ?, ?, ?, ?)`,
                    [userID, email, passwordHash, firstName || '', lastName || '', organization || '']
                );
            } else {
                // Fallback to SQLite
                const db = await getDatabase();
                await new Promise((resolve, reject) => {
                    db.run(
                        `INSERT INTO users (id, email, password_hash, first_name, last_name, organization) 
                         VALUES (?, ?, ?, ?, ?, ?)`,
                        [userID, email, passwordHash, firstName || '', lastName || '', organization || ''],
                        (err) => {
                            if (err) reject(err);
                            else resolve();
                        }
                    );
                });
            }

            // Generate token
            const token = jwt.sign({ userID, email }, JWT_SECRET, { expiresIn: JWT_EXPIRY });

            console.log(`✅ User registered: ${email}`);

            res.json({
                success: true,
                message: 'User registered successfully',
                token,
                user: { userID, email, firstName, lastName }
            });

        } catch (dbError) {
            if (dbError.message && dbError.message.includes('UNIQUE constraint failed')) {
                return res.status(400).json({ error: 'Email already registered' });
            }
            throw dbError;
        }

    } catch (error) {
        console.error('❌ Registration error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ===== LOGIN USER =====
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validation
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password required' });
        }

        let user;

        try {
            if (isMySQLAvailable()) {
                const users = await query(
                    `SELECT id, email, password_hash, first_name, last_name FROM users WHERE email = ?`,
                    [email]
                );
                user = users[0];
            } else {
                // SQLite fallback
                const db = await getDatabase();
                user = await new Promise((resolve, reject) => {
                    db.get(
                        `SELECT id, email, password_hash, first_name, last_name FROM users WHERE email = ?`,
                        [email],
                        (err, row) => {
                            if (err) reject(err);
                            else resolve(row);
                        }
                    );
                });
            }
        } catch (dbError) {
            console.error('❌ Database error:', dbError);
            return res.status(500).json({ error: 'Database error' });
        }

        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Verify password
        const passwordMatch = await bcrypt.compare(password, user.password_hash);
        if (!passwordMatch) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Generate token
        const token = jwt.sign({ userID: user.id, email: user.email }, JWT_SECRET, { expiresIn: JWT_EXPIRY });

        console.log(`✅ User logged in: ${email}`);

        res.json({
            success: true,
            message: 'Login successful',
            token,
            user: {
                userID: user.id,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name
            }
        });

    } catch (error) {
        console.error('❌ Login error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ===== VERIFY TOKEN =====
router.post('/verify', (req, res) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');

        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        res.json({ success: true, user: decoded });

    } catch (error) {
        res.status(401).json({ error: 'Invalid or expired token' });
    }
});

// ===== LOGOUT (invalidate token) =====
router.post('/logout', async (req, res) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');

        if (!token) {
            return res.status(400).json({ error: 'No token provided' });
        }

        const decoded = jwt.verify(token, JWT_SECRET);

        // Optional: Store token in blacklist (for production use Redis)
        // For now, token validation is checked on client side

        console.log(`✅ User logged out: ${decoded.email}`);

        res.json({ success: true, message: 'Logout successful' });

    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

export default router;
