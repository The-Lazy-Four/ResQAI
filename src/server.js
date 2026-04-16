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

// Import validation utilities
import { validateEnvironment, getAIStatus } from './utils/validateEnv.js';

// Load environment variables (MUST be before any env var access)
dotenv.config();

// Validate environment on startup
validateEnvironment();

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ==================== ENVIRONMENT VALIDATION ====================

// Log environment status (first 10 chars of keys for security)
console.log(`\n📋 [ENVIRONMENT] Node Env: ${NODE_ENV}`);
console.log(`📋 [ENVIRONMENT] GEMINI_API_KEY: ${process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.slice(0, 10) + '...' : 'NOT SET'}`);
console.log(`📋 [ENVIRONMENT] OPENROUTER_API_KEY: ${process.env.OPENROUTER_API_KEY ? process.env.OPENROUTER_API_KEY.slice(0, 10) + '...' : 'NOT SET'}`);
console.log(`📋 [ENVIRONMENT] GROQ_API_KEY: ${process.env.GROQ_API_KEY ? process.env.GROQ_API_KEY.slice(0, 10) + '...' : 'NOT SET'}`);
console.log(`📋 [ENVIRONMENT] PORT: ${PORT}\n`);

// ==================== MIDDLEWARE ====================

// CORS configuration - Allow all origins in production for Render deployment
const corsOptions = NODE_ENV === 'production'
    ? { origin: '*', methods: ['GET', 'POST', 'PATCH', 'DELETE'] }
    : {
        origin: ['http://localhost:3000', 'http://localhost:5500', 'http://127.0.0.1:5500', 'file://'],
        methods: ['GET', 'POST', 'PATCH', 'DELETE'],
        credentials: true
    };

console.log(`🔒 [CORS] Mode: ${NODE_ENV === 'production' ? 'ALLOW ALL (Production)' : 'LOCALHOST ONLY (Development)'}\n`);
app.use(cors(corsOptions));

// Body parsing
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname, '../public')));

// ==================== API ROUTES ====================

// Health check - Returns server status and AI provider availability
app.get('/api/health', (req, res) => {
    const aiStatus = getAIStatus();

    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        message: 'ResQAI Backend is running!',
        environment: process.env.NODE_ENV || 'development',
        port: PORT,
        ai: {
            gemini: aiStatus.gemini ? '✅ Available' : '❌ Not configured',
            openrouter: aiStatus.openRouter ? '✅ Available' : '❌ Not configured',
            groq: aiStatus.groq ? '✅ Available' : '❌ Not configured',
            primaryProvider: aiStatus.gemini ? 'Gemini' : aiStatus.openRouter ? 'OpenRouter' : aiStatus.groq ? 'Groq' : 'None'
        },
        cors: NODE_ENV === 'production' ? 'Allow All (Production)' : 'Localhost Only (Development)'
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
    if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() && process.env.GEMINI_API_KEY !== 'your-gemini-api-key-here') {
        console.log('✅ GEMINI_API_KEY detected - AI features ENABLED');
        console.log('🤖 Classification and Chat AI will use Gemini API');
    } else if (!process.env.GEMINI_API_KEY || !process.env.GEMINI_API_KEY.trim()) {
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
