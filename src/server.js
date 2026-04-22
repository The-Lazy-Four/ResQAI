// ============================================
// ResQAI - Express Server with Socket.IO
// ============================================

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';

// Import database initialization
import { initMySQL } from './db/mysql.js';

// Import API routes
import emergencyRoutes from './api/routes/emergency.js';
import classificationRoutes from './api/routes/classification.js';
import chatRoutes from './api/routes/chat.js';
import voiceRoutes from './api/routes/voice.js';
import nearbyRoutes from './api/routes/nearby.js';
import aiRoutes from './api/routes/ai.js';
import portalRoutes from './api/routes/portal.js';
import authRoutes from './api/routes/auth.js';
import customSystemRoutes from './api/routes/custom-system.js';
import cameraIncidentRoutes from './api/routes/camera-incidents.js';

// Import validation utilities
import { validateEnvironment, getAIStatus } from './utils/validateEnv.js';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Load environment variables
const envConfig = dotenv.config({ path: path.join(projectRoot, '.env'), override: true });

if (envConfig.parsed) {
    console.log('\n✅ [DOTENV] Loaded .env variables:');
    if (envConfig.parsed.GROQ_MODEL) {
        console.log(`   GROQ_MODEL from .env: ${envConfig.parsed.GROQ_MODEL}`);
    }
    Object.keys(envConfig.parsed).forEach(key => {
        process.env[key] = envConfig.parsed[key];
    });
    console.log('✅ [DOTENV] Forced all .env values into process.env\n');
}

validateEnvironment();

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// ==================== SOCKET.IO ====================

const io = new SocketIOServer(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] }
});

export { io };

io.on('connection', (socket) => {
    console.log(`🔌 [Socket.IO] Client connected: ${socket.id}`);
    socket.on('disconnect', () => {
        console.log(`🔌 [Socket.IO] Client disconnected: ${socket.id}`);
    });
    socket.on('join:admin', () => {
        socket.join('admin');
        console.log(`🔐 [Socket.IO] Admin joined: ${socket.id}`);
    });
});

// ==================== DATABASE ====================

console.log('\n🗄️  [DATABASE] Initializing database connections...');
await initMySQL().catch(err => {
    console.warn('⚠️  MySQL initialization failed, SQLite will be used:', err.message);
});

// ==================== ENVIRONMENT LOG ====================

console.log(`\n📋 [ENVIRONMENT] Node Env: ${NODE_ENV}`);
console.log(`📋 [ENVIRONMENT] GEMINI_API_KEY: ${process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.slice(0, 10) + '...' : 'NOT SET'}`);
console.log(`📋 [ENVIRONMENT] OPENROUTER_PRIMARY_API_KEY: ${(process.env.OPENROUTER_PRIMARY_API_KEY || process.env.OPENROUTER_API_KEY) ? (process.env.OPENROUTER_PRIMARY_API_KEY || process.env.OPENROUTER_API_KEY).slice(0, 10) + '...' : 'NOT SET'}`);
console.log(`📋 [ENVIRONMENT] OPENROUTER_SECONDARY_API_KEY: ${process.env.OPENROUTER_SECONDARY_API_KEY ? process.env.OPENROUTER_SECONDARY_API_KEY.slice(0, 10) + '...' : 'NOT SET'}`);
console.log(`📋 [ENVIRONMENT] GROQ_API_KEY: ${process.env.GROQ_API_KEY ? process.env.GROQ_API_KEY.slice(0, 10) + '...' : 'NOT SET'}`);
console.log(`📋 [ENVIRONMENT] PORT: ${PORT}\n`);

// ==================== MIDDLEWARE ====================

const corsOptions = NODE_ENV === 'production'
    ? { origin: '*', methods: ['GET', 'POST', 'PATCH', 'DELETE'] }
    : {
        origin: ['http://localhost:3000', 'http://localhost:5500', 'http://127.0.0.1:5500', 'file://'],
        methods: ['GET', 'POST', 'PATCH', 'DELETE'],
        credentials: true
    };

console.log(`🔒 [CORS] Mode: ${NODE_ENV === 'production' ? 'ALLOW ALL (Production)' : 'LOCALHOST ONLY (Development)'}\n`);
app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

// ==================== API ROUTES ====================

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
            openrouterPrimary: aiStatus.openRouterPrimary ? '✅ Available' : '❌ Not configured',
            openrouterSecondary: aiStatus.openRouterSecondary ? '✅ Available' : '❌ Not configured',
            openrouter: aiStatus.openRouter ? '✅ Available' : '❌ Not configured',
            groq: aiStatus.groq ? '✅ Available' : '❌ Not configured',
            primaryProvider: aiStatus.gemini ? 'Gemini' : aiStatus.openRouter ? 'OpenRouter' : aiStatus.groq ? 'Groq' : 'None',
            providerPriority: aiStatus.providerPriority
        },
        socketio: '✅ Active',
        cors: NODE_ENV === 'production' ? 'Allow All (Production)' : 'Localhost Only (Development)'
    });
});

app.use('/api/auth', authRoutes);
app.use('/api/emergencies', emergencyRoutes);
app.use('/api/classification', classificationRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/voice', voiceRoutes);
app.use('/api/nearby', nearbyRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/portal', portalRoutes);
app.use('/api/custom-system', customSystemRoutes);
app.use('/api/camera-incidents', cameraIncidentRoutes);

// ==================== SERVE FRONTEND ====================

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/pages/index.html'));
});

app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
        res.sendFile(path.join(__dirname, '../public/pages/landing.html'));
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

// ==================== START ====================

httpServer.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════╗
║         🚨 ResQAI Backend Running 🚨     ║
╠══════════════════════════════════════════╣
║  Server:  http://localhost:${PORT}            ║
║  API:     http://localhost:${PORT}/api      ║
║  Admin:   http://localhost:${PORT}/admin    ║
║  Health:  http://localhost:${PORT}/api/health║
╚══════════════════════════════════════════╝
    `);

    if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() && process.env.GEMINI_API_KEY !== 'your-gemini-api-key-here') {
        console.log('✅ GEMINI_API_KEY detected - AI features ENABLED');
        console.log('🤖 Classification and Chat AI will use Gemini API');
    } else {
        console.warn('⚠️  GEMINI_API_KEY not set - AI features in fallback mode');
    }
    console.log('🔌 Socket.IO server ready for real-time connections');
    console.log('📷 AI Camera Surveillance Module available at /admin\n');
});

export default app;
