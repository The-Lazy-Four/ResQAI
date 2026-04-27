// =====================================================
// ResQAI - Authentication API Routes
// =====================================================

import crypto from 'node:crypto';
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { query, execute, isMySQLAvailable } from '../../db/mysql.js';
import { getDatabase } from '../../db/db.js';
import ensureGoogleAuthSchema from '../../db/init.js';

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'resqai-secret-key-change-in-production';
const JWT_EXPIRY = '7d';
const PASSWORD_RESET_EXPIRY_MS = 30 * 60 * 1000;

function normalizeEmail(email) {
    return String(email || '').trim().toLowerCase();
}

function isUniqueConstraintError(error) {
    const message = String(error?.message || '').toLowerCase();
    return message.includes('unique constraint failed')
        || message.includes('duplicate entry')
        || message.includes('unique violation');
}

function isGoogleOnlyPassword(passwordHash) {
    return String(passwordHash || '').trim() === 'GOOGLE_AUTH';
}

function isBcryptHash(passwordHash) {
    return /^\$2[aby]\$\d{2}\$/.test(String(passwordHash || ''));
}

function hashResetToken(token) {
    return crypto.createHash('sha256').update(String(token)).digest('hex');
}

function getRequestOrigin(req) {
    const host = req.get('host');
    if (!host) return '';

    const forwardedProto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim();
    const protocol = forwardedProto || req.protocol || 'http';
    return `${protocol}://${host}`;
}

function dbGet(db, sql, params = []) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

function dbRun(db, sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function onRun(err) {
            if (err) reject(err);
            else resolve(this);
        });
    });
}

async function findUserByEmail(email) {
    if (isMySQLAvailable()) {
        const users = await query(
            `SELECT id, email, password_hash, first_name, last_name, organization, google_id
             FROM users WHERE LOWER(email) = ?`,
            [email]
        );
        return users[0] || null;
    }

    const db = await getDatabase();
    return dbGet(
        db,
        `SELECT id, email, password_hash, first_name, last_name, organization, google_id
         FROM users WHERE LOWER(email) = ?`,
        [email]
    );
}

async function createUserRecord({ userID, email, passwordHash, firstName, lastName, organization }) {
    if (isMySQLAvailable()) {
        await execute(
            `INSERT INTO users (id, email, password_hash, first_name, last_name, organization)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [userID, email, passwordHash, firstName || '', lastName || '', organization || '']
        );
        return;
    }

    const db = await getDatabase();
    await dbRun(
        db,
        `INSERT INTO users (id, email, password_hash, first_name, last_name, organization)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [userID, email, passwordHash, firstName || '', lastName || '', organization || '']
    );
}

async function updateUserPasswordProfile(userID, { passwordHash, firstName, lastName, organization }) {
    if (isMySQLAvailable()) {
        await execute(
            `UPDATE users
             SET password_hash = ?, first_name = ?, last_name = ?, organization = ?
             WHERE id = ?`,
            [passwordHash, firstName || '', lastName || '', organization || '', userID]
        );
        return;
    }

    const db = await getDatabase();
    await dbRun(
        db,
        `UPDATE users
         SET password_hash = ?, first_name = ?, last_name = ?, organization = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [passwordHash, firstName || '', lastName || '', organization || '', userID]
    );
}

async function updateUserPasswordOnly(userID, passwordHash) {
    if (isMySQLAvailable()) {
        await execute('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, userID]);
        return;
    }

    const db = await getDatabase();
    await dbRun(
        db,
        'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [passwordHash, userID]
    );
}

async function storePasswordResetToken({ tokenHash, userID, email, expiresAt }) {
    if (isMySQLAvailable()) {
        await execute('DELETE FROM password_reset_tokens WHERE user_id = ?', [userID]);
        await execute(
            'INSERT INTO password_reset_tokens (token_hash, user_id, email, expires_at) VALUES (?, ?, ?, ?)',
            [tokenHash, userID, email, expiresAt]
        );
        return;
    }

    const db = await getDatabase();
    await dbRun(db, 'DELETE FROM password_reset_tokens WHERE user_id = ?', [userID]);
    await dbRun(
        db,
        'INSERT INTO password_reset_tokens (token_hash, user_id, email, expires_at) VALUES (?, ?, ?, ?)',
        [tokenHash, userID, email, expiresAt.toISOString()]
    );
}

async function getPasswordResetToken(tokenHash) {
    if (isMySQLAvailable()) {
        const rows = await query(
            `SELECT token_hash, user_id, email, expires_at
             FROM password_reset_tokens
             WHERE token_hash = ?`,
            [tokenHash]
        );
        return rows[0] || null;
    }

    const db = await getDatabase();
    return dbGet(
        db,
        `SELECT token_hash, user_id, email, expires_at
         FROM password_reset_tokens
         WHERE token_hash = ?`,
        [tokenHash]
    );
}

async function deletePasswordResetToken(tokenHash) {
    if (isMySQLAvailable()) {
        await execute('DELETE FROM password_reset_tokens WHERE token_hash = ?', [tokenHash]);
        return;
    }

    const db = await getDatabase();
    await dbRun(db, 'DELETE FROM password_reset_tokens WHERE token_hash = ?', [tokenHash]);
}

function buildAuthResponse(userID, email, firstName, lastName, message) {
    const token = jwt.sign({ userID, email }, JWT_SECRET, { expiresIn: JWT_EXPIRY });

    return {
        success: true,
        message,
        token,
        user: { userID, email, firstName, lastName }
    };
}

// ===== REGISTER USER =====
router.post('/register', async (req, res) => {
    try {
        await ensureGoogleAuthSchema();

        const email = normalizeEmail(req.body.email);
        const password = String(req.body.password || '');
        const firstName = String(req.body.firstName || '').trim();
        const lastName = String(req.body.lastName || '').trim();
        const organization = String(req.body.organization || '').trim();

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password required' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }

        const passwordHash = await bcrypt.hash(password, 10);

        try {
            const existingUser = await findUserByEmail(email);

            if (existingUser) {
                if (isGoogleOnlyPassword(existingUser.password_hash)) {
                    await updateUserPasswordProfile(existingUser.id, {
                        passwordHash,
                        firstName,
                        lastName,
                        organization
                    });

                    return res.json(
                        buildAuthResponse(
                            existingUser.id,
                            email,
                            firstName,
                            lastName,
                            'Email login enabled for your existing account'
                        )
                    );
                }

                return res.status(400).json({ error: 'Email already exists. Log in or use Forgot password.' });
            }

            const userID = uuidv4();
            await createUserRecord({ userID, email, passwordHash, firstName, lastName, organization });

            console.log(`User registered: ${email}`);
            res.json(buildAuthResponse(userID, email, firstName, lastName, 'User registered successfully'));
        } catch (dbError) {
            if (isUniqueConstraintError(dbError)) {
                return res.status(400).json({ error: 'Email already exists. Log in or use Forgot password.' });
            }
            throw dbError;
        }
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ===== LOGIN USER =====
router.post('/login', async (req, res) => {
    try {
        await ensureGoogleAuthSchema();

        const email = normalizeEmail(req.body.email);
        const password = String(req.body.password || '');

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password required' });
        }

        try {
            const user = await findUserByEmail(email);

            if (!user) {
                return res.status(401).json({ error: 'Invalid email or password' });
            }

            if (isGoogleOnlyPassword(user.password_hash)) {
                return res.status(400).json({ error: 'This account currently uses Google sign-in. Use Google or choose Forgot password to add an email password.' });
            }

            if (!isBcryptHash(user.password_hash)) {
                return res.status(400).json({ error: 'This account needs a password reset before email login can continue.' });
            }

            const passwordMatch = await bcrypt.compare(password, user.password_hash);
            if (!passwordMatch) {
                return res.status(401).json({ error: 'Invalid email or password' });
            }

            console.log(`User logged in: ${email}`);
            res.json(buildAuthResponse(user.id, user.email, user.first_name, user.last_name, 'Login successful'));
        } catch (dbError) {
            console.error('Database error:', dbError);
            return res.status(500).json({ error: 'Database error' });
        }
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ===== FORGOT PASSWORD =====
router.post('/forgot-password', async (req, res) => {
    try {
        await ensureGoogleAuthSchema();

        const email = normalizeEmail(req.body.email);
        const next = typeof req.body.next === 'string' && req.body.next.startsWith('/')
            ? req.body.next
            : '/modules/rescue-builder/pages/custom-builder-dashboard.html';

        if (!email) {
            return res.status(400).json({ error: 'Email required' });
        }

        const user = await findUserByEmail(email);
        const genericResponse = {
            success: true,
            message: 'If that email is registered, a password reset link is now ready.'
        };

        if (!user) {
            return res.json(genericResponse);
        }

        const rawToken = crypto.randomBytes(32).toString('hex');
        const tokenHash = hashResetToken(rawToken);
        const expiresAt = new Date(Date.now() + PASSWORD_RESET_EXPIRY_MS);
        await storePasswordResetToken({ tokenHash, userID: user.id, email, expiresAt });

        const origin = getRequestOrigin(req) || 'http://localhost:3000';
        const resetUrl = new URL('/pages/admin-reset-password.html', `${origin}/`);
        resetUrl.searchParams.set('token', rawToken);
        resetUrl.searchParams.set('next', next);

        res.json({
            ...genericResponse,
            resetLink: resetUrl.toString()
        });
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ error: 'Unable to start password reset right now.' });
    }
});

// ===== RESET PASSWORD =====
router.post('/reset-password', async (req, res) => {
    try {
        await ensureGoogleAuthSchema();

        const token = String(req.body.token || '').trim();
        const password = String(req.body.password || '');

        if (!token || !password) {
            return res.status(400).json({ error: 'Token and password required' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }

        const tokenHash = hashResetToken(token);
        const resetEntry = await getPasswordResetToken(tokenHash);

        if (!resetEntry) {
            return res.status(400).json({ error: 'This reset link is invalid or has already been used.' });
        }

        const expiryDate = new Date(resetEntry.expires_at);
        if (Number.isNaN(expiryDate.getTime()) || expiryDate.getTime() < Date.now()) {
            await deletePasswordResetToken(tokenHash);
            return res.status(400).json({ error: 'This reset link has expired. Please request a new one.' });
        }

        const passwordHash = await bcrypt.hash(password, 10);
        await updateUserPasswordOnly(resetEntry.user_id, passwordHash);
        await deletePasswordResetToken(tokenHash);

        res.json({ success: true, message: 'Password updated successfully.' });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ error: 'Unable to reset password right now.' });
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

// ===== LOGOUT =====
router.post('/logout', async (req, res) => {
    try {
        await ensureGoogleAuthSchema();

        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            return res.status(400).json({ error: 'No token provided' });
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        console.log(`User logged out: ${decoded.email}`);

        res.json({ success: true, message: 'Logout successful' });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

export default router;
