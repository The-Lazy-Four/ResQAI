// =====================================================
// ResQAI - Authentication Middleware
// =====================================================

import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'resqai-secret-key-change-in-production';

// Middleware to verify JWT token
export function verifyToken(req, res, next) {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');

        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();

    } catch (error) {
        res.status(401).json({ error: 'Invalid or expired token' });
    }
}

// Optional: Middleware that doesn't block but sets req.user if token exists
export function optionalAuth(req, res, next) {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');

        if (token) {
            const decoded = jwt.verify(token, JWT_SECRET);
            req.user = decoded;
        }

        next();

    } catch (error) {
        // Continue without user
        next();
    }
}

export default { verifyToken, optionalAuth };
