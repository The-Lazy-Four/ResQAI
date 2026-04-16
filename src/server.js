// ============================================
// ResQAI - Express Server
// ============================================

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Import API routes
import emergencyRoutes from './api/routes/emergency.js';
import classificationRoutes from './api/routes/classification.js';
import chatRoutes from './api/routes/chat.js';
import voiceRoutes from './api/routes/voice.js';
import nearbyRoutes from './api/routes/nearby.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ==================== MIDDLEWARE ====================

// CORS configuration
app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:5500', 'http://127.0.0.1:5500', 'file://'],
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    credentials: true
}));

// Body parsing
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname, '../public')));

// ==================== API ROUTES ====================

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        message: 'ResQAI Backend is running!'
    });
});

// Mount API routes
app.use('/api/emergencies', emergencyRoutes);
app.use('/api/classification', classificationRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/voice', voiceRoutes);
app.use('/api/nearby', nearbyRoutes);

// ==================== SERVE FRONTEND ====================

// Serve index.html for any route not matched by API
app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
        res.sendFile(path.join(__dirname, '../public/pages/index.html'));
    }
});

// ==================== ERROR HANDLING ====================

app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(err.status || 500).json({
        error: true,
        message: err.message || 'Internal server error',
        status: err.status || 500
    });
});

// ==================== START SERVER ====================

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

app.listen(PORT, () => {
    console.log(`
╔═════════════════════════════════════════╗
║         🚨 ResQAI Backend Running 🚨    ║
╠═════════════════════════════════════════╣
║  Server: http://localhost:${PORT}            ║
║  API:    http://localhost:${PORT}/api      ║
║  Health: http://localhost:${PORT}/api/health║
╚═════════════════════════════════════════╝
    `);

    // Check Gemini API Key
    if (GEMINI_API_KEY && GEMINI_API_KEY.trim() && GEMINI_API_KEY !== 'your-gemini-api-key-here') {
        console.log('✅ GEMINI_API_KEY detected - AI features ENABLED');
        console.log('🤖 Classification and Chat AI will use Gemini API');
    } else if (!GEMINI_API_KEY || !GEMINI_API_KEY.trim()) {
        console.warn('⚠️  GEMINI_API_KEY not set in .env');
        console.warn('⚠️  AI features will use fallback (rule-based) mode');
        console.warn('📝 To enable Gemini AI, add GEMINI_API_KEY=your-key-here to .env');
    } else {
        console.warn('⚠️  GEMINI_API_KEY is placeholder (not configured)');
        console.warn('⚠️  AI features will use fallback (rule-based) mode');
        console.warn('📝 Replace with real API key in .env file');
    }
});

export default app;
