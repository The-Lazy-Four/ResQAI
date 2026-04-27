import express from 'express';
import jwt from 'jsonwebtoken';
import { createRequire } from 'module';
import { query, execute, isMySQLAvailable } from '../../db/mysql.js';
import { getDatabase } from '../../db/db.js';
import ensureGoogleAuthSchema from '../../db/init.js';

const require = createRequire(import.meta.url);
const crypto = require('node:crypto');

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'resqai-secret-key-change-in-production';
const JWT_EXPIRY = '7d';
const DEFAULT_REDIRECT = '/modules/rescue-builder/pages/custom-builder-dashboard.html';
const schemaReady = ensureGoogleAuthSchema().catch((error) => {
    console.warn('Google auth schema initialization warning:', error.message);
});
const PLACEHOLDER_PATTERNS = [
    /^your[_-]/i,
    /placeholder/i,
    /^replace[_-]/i,
    /client[_-]?id/i,
    /client[_-]?secret/i
];

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

function parseCookies(req) {
    const header = req.headers.cookie || '';
    return header.split(';').reduce((cookies, part) => {
        const [rawKey, ...rawValue] = part.trim().split('=');
        if (!rawKey) return cookies;
        cookies[rawKey] = decodeURIComponent(rawValue.join('=') || '');
        return cookies;
    }, {});
}

function splitName(fullName = '') {
    const cleaned = String(fullName || '').trim();
    if (!cleaned) {
        return { firstName: 'ResQAI', lastName: 'Admin', displayName: 'ResQAI Admin' };
    }

    const [firstName, ...rest] = cleaned.split(/\s+/);
    return {
        firstName,
        lastName: rest.join(' '),
        displayName: cleaned
    };
}

function buildState(next) {
    return Buffer.from(JSON.stringify({ next: next || DEFAULT_REDIRECT })).toString('base64url');
}

function readState(state) {
    if (!state) return DEFAULT_REDIRECT;
    try {
        const parsed = JSON.parse(Buffer.from(state, 'base64url').toString('utf8'));
        if (parsed && typeof parsed.next === 'string' && parsed.next.startsWith('/')) {
            return parsed.next;
        }
    } catch (error) {
        // Ignore malformed state.
    }
    return DEFAULT_REDIRECT;
}

function getRequestOrigin(req) {
    const host = req.get('host');
    if (!host) return '';

    const forwardedProto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim();
    const protocol = forwardedProto || req.protocol || 'http';
    return `${protocol}://${host}`;
}

function getGoogleRedirectURI(req) {
    const requestOrigin = getRequestOrigin(req);
    if (requestOrigin) {
        return new URL('/api/google-auth/callback', `${requestOrigin}/`).toString();
    }

    return String(process.env.GOOGLE_REDIRECT_URI || '').trim();
}

function buildGoogleAuthUrl(next, redirectURI) {
    const params = new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID || '',
        redirect_uri: redirectURI,
        response_type: 'code',
        scope: 'openid email profile',
        access_type: 'offline',
        state: buildState(next)
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

function isConfiguredValue(value) {
    const normalized = String(value || '').trim();
    if (!normalized) return false;
    return !PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(normalized));
}

function getGoogleConfigError(req) {
    const clientID = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectURI = getGoogleRedirectURI(req);

    if (!isConfiguredValue(clientID)) {
        return 'Google sign-in is not configured yet. Replace the placeholder GOOGLE_CLIENT_ID value in .env and restart the server.';
    }

    if (!isConfiguredValue(clientSecret)) {
        return 'Google sign-in is not configured yet. Replace the placeholder GOOGLE_CLIENT_SECRET value in .env and restart the server.';
    }

    if (!isConfiguredValue(redirectURI)) {
        return 'Google sign-in is not configured yet. Add a valid GOOGLE_REDIRECT_URI in .env and restart the server.';
    }

    try {
        new URL(String(redirectURI));
    } catch (error) {
        return 'Google sign-in is not configured yet. GOOGLE_REDIRECT_URI must be a valid URL.';
    }

    return null;
}

function buildLoginRedirect(params) {
    const query = new URLSearchParams({
        login: 'success',
        name: params.name || 'Admin',
        token: params.token,
        email: params.email || '',
        id: params.id,
        next: params.next || DEFAULT_REDIRECT
    });

    return `/pages/admin-login.html?${query.toString()}`;
}

function buildErrorRedirect(message, next) {
    const query = new URLSearchParams({
        error: message,
        next: next || DEFAULT_REDIRECT
    });

    return `/pages/admin-login.html?${query.toString()}`;
}

async function ensureAdminRecordMySQL(user, displayName, googleID) {
    const existingAdmin = (await query('SELECT id FROM admins WHERE email = ?', [user.email]))[0];

    if (!existingAdmin) {
        await execute(
            'INSERT INTO admins (id, name, email, password_hash, google_id) VALUES (?, ?, ?, ?, ?)',
            [user.id, displayName, user.email, 'GOOGLE_AUTH', googleID || null]
        );
        return;
    }

    await execute(
        'UPDATE admins SET name = ?, google_id = COALESCE(?, google_id) WHERE id = ?',
        [displayName, googleID || null, existingAdmin.id]
    );
}

async function ensureAdminRecordSQLite(user, displayName, googleID) {
    const db = await getDatabase();
    const existingAdmin = await dbGet(db, 'SELECT id FROM admins WHERE email = ?', [user.email]);

    if (!existingAdmin) {
        await dbRun(
            db,
            'INSERT INTO admins (id, name, email, password_hash, google_id) VALUES (?, ?, ?, ?, ?)',
            [user.id, displayName, user.email, 'GOOGLE_AUTH', googleID || null]
        );
        return;
    }

    await dbRun(
        db,
        'UPDATE admins SET name = ?, google_id = COALESCE(?, google_id) WHERE id = ?',
        [displayName, googleID || null, existingAdmin.id]
    );
}

async function findOrCreateUser(profile) {
    const email = String(profile.email || '').trim().toLowerCase();
    const googleID = profile.sub || profile.id || '';
    const { firstName, lastName, displayName } = splitName(profile.name || email.split('@')[0]);

    if (!email) {
        throw new Error('Google account did not return an email address.');
    }

    if (isMySQLAvailable()) {
        let user = (await query('SELECT id, email, first_name, last_name FROM users WHERE email = ?', [email]))[0];

        if (!user) {
            const userID = crypto.randomUUID();
            await execute(
                `INSERT INTO users (id, email, password_hash, first_name, last_name, organization, google_id)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [userID, email, 'GOOGLE_AUTH', firstName || '', lastName || '', '', googleID || null]
            );
            user = { id: userID, email, first_name: firstName || '', last_name: lastName || '' };
        } else {
            await execute(
                'UPDATE users SET first_name = ?, last_name = ?, google_id = COALESCE(?, google_id) WHERE id = ?',
                [firstName || user.first_name || '', lastName || user.last_name || '', googleID || null, user.id]
            );
        }

        await ensureAdminRecordMySQL(user, displayName, googleID);
        return {
            id: user.id,
            email: user.email,
            name: displayName
        };
    }

    const db = await getDatabase();
    let user = await dbGet(db, 'SELECT id, email, first_name, last_name FROM users WHERE email = ?', [email]);

    if (!user) {
        const userID = crypto.randomUUID();
        await dbRun(
            db,
            `INSERT INTO users (id, email, password_hash, first_name, last_name, organization, google_id)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [userID, email, 'GOOGLE_AUTH', firstName || '', lastName || '', '', googleID || null]
        );
        user = { id: userID, email, first_name: firstName || '', last_name: lastName || '' };
    } else {
        await dbRun(
            db,
            'UPDATE users SET first_name = ?, last_name = ?, google_id = COALESCE(?, google_id) WHERE id = ?',
            [firstName || user.first_name || '', lastName || user.last_name || '', googleID || null, user.id]
        );
    }

    await ensureAdminRecordSQLite(user, displayName, googleID);
    return {
        id: user.id,
        email: user.email,
        name: displayName
    };
}

async function createAdminSession(adminID) {
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    if (isMySQLAvailable()) {
        await execute(
            'INSERT INTO admin_sessions (token, admin_id, expires_at) VALUES (?, ?, ?)',
            [token, adminID, expiresAt]
        );
        return token;
    }

    const db = await getDatabase();
    await dbRun(
        db,
        'INSERT INTO admin_sessions (token, admin_id, expires_at) VALUES (?, ?, ?)',
        [token, adminID, expiresAt.toISOString()]
    );
    return token;
}

router.get('/url', async (req, res) => {
    const redirectURI = getGoogleRedirectURI(req);
    const configError = getGoogleConfigError(req);
    if (configError) {
        return res.status(503).json({ success: false, error: configError });
    }

    const next = typeof req.query.next === 'string' && req.query.next.startsWith('/')
        ? req.query.next
        : DEFAULT_REDIRECT;

    const googleAuthUrl = buildGoogleAuthUrl(next, redirectURI);
    res.json({ url: googleAuthUrl });
});

router.get('/callback', async (req, res) => {
    const next = readState(req.query.state);

    try {
        await schemaReady;
        await ensureGoogleAuthSchema();

        const redirectURI = getGoogleRedirectURI(req);
        const configError = getGoogleConfigError(req);
        if (configError) {
            return res.redirect(buildErrorRedirect(configError, next));
        }

        const code = req.query.code;
        if (!code) {
            return res.redirect(buildErrorRedirect('Google login was cancelled or expired.', next));
        }

        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: process.env.GOOGLE_CLIENT_ID || '',
                client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
                code: String(code),
                redirect_uri: redirectURI,
                grant_type: 'authorization_code'
            })
        });

        const tokenData = await tokenResponse.json();
        if (!tokenResponse.ok || !tokenData.access_token) {
            const message = tokenData.error_description || tokenData.error || 'Unable to complete Google sign-in.';
            return res.redirect(buildErrorRedirect(message, next));
        }

        const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: {
                Authorization: `Bearer ${tokenData.access_token}`
            }
        });

        const profile = await userInfoResponse.json();
        if (!userInfoResponse.ok || !profile.email) {
            return res.redirect(buildErrorRedirect('Unable to read your Google profile.', next));
        }

        const user = await findOrCreateUser(profile);
        const jwtToken = jwt.sign({ userID: user.id, email: user.email }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
        const sessionToken = await createAdminSession(user.id);

        res.cookie('resqai_admin_token', sessionToken, {
            httpOnly: true,
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        return res.redirect(buildLoginRedirect({
            id: user.id,
            email: user.email,
            name: user.name,
            token: jwtToken,
            next
        }));
    } catch (error) {
        console.error('Google auth callback error:', error);
        return res.redirect(buildErrorRedirect('Google sign-in failed. Please try again.', next));
    }
});

router.post('/logout', async (req, res) => {
    try {
        await schemaReady;
        await ensureGoogleAuthSchema();
        const cookies = parseCookies(req);
        const sessionToken = cookies.resqai_admin_token;

        if (sessionToken) {
            if (isMySQLAvailable()) {
                await execute('DELETE FROM admin_sessions WHERE token = ?', [sessionToken]);
            } else {
                const db = await getDatabase();
                await dbRun(db, 'DELETE FROM admin_sessions WHERE token = ?', [sessionToken]);
            }
        }

        res.clearCookie('resqai_admin_token', {
            httpOnly: true,
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production'
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Google logout error:', error);
        res.status(500).json({ success: false, error: 'Logout failed' });
    }
});

export default router;
