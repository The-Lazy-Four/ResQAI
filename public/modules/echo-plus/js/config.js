/**
 * ECHO+ Configuration Module
 * Handles environment settings, API endpoints, and secure credential management
 * For integration into ResQAI main system
 */

window.ECHO_CONFIG = window.ECHO_CONFIG || {

    // ============================================================
    // MODULE IDENTITY
    // ============================================================
    version: '2.0.1',
    moduleName: 'echo-plus-hotel-emergency',
    namespace: 'EchoPlus',

    // ============================================================
    // API & BACKEND CONFIGURATION
    // ============================================================
    // All sensitive keys handled by backend ONLY - NEVER in frontend
    // Frontend only stores endpoint paths (loaded from .env on server)
    api: {
        aiEndpoint: '/api/ai/emergency-guidance',
        aiHealthEndpoint: '/api/ai/health',
        authEndpoint: '/api/auth/login',
        statusEndpoint: '/api/status',
        hotelEndpoint: '/api/hotels',
        emergencyEndpoint: '/api/emergencies',
        timeout: 8000,
        retries: 2
    },

    // ============================================================
    // FRONTEND SECURITY
    // ============================================================
    // Demo credentials only - REMOVED in production
    // Production: Use backend-provided session tokens
    security: {
        isDemo: true,
        // All auth should be token-based, not hardcoded passwords
        sessionTokenKey: 'echo_session_token',
        requiresBackendAuth: true
    },

    // ============================================================
    // UI CONFIGURATION
    // ============================================================
    ui: {
        theme: 'dark',
        animationEnabled: true,
        soundEnabled: true,
        toastDuration: 4500,
        transitionSpeed: 0.3
    },

    // ============================================================
    // SUPPORTED LANGUAGES & LOCALIZATION
    // ============================================================
    i18n: {
        default: 'en',
        supported: ['en', 'hi', 'bn'],
        rtl: false
    },

    // ============================================================
    // FEATURE FLAGS
    // ============================================================
    features: {
        voiceGuidance: true,
        multiLanguage: true,
        mapRendering: true,
        adminPanel: true,
        staffCoordination: true,
        emergencyAlerts: true,
        spatialAudio: true
    },

    // ============================================================
    // INTEGRATION SETTINGS
    // ============================================================
    // Global state isolation to prevent conflicts
    stateNamespace: '__echo_plus_state__',
    eventBusNamespace: '__echo_plus_events__',

    // CSS class prefix to prevent conflicts with parent system
    cssPrefix: 'echo-',

    // Don't pollute global window object
    useWindowGlobal: false,
    useModulePattern: true,

    // ============================================================
    // LOGGING
    // ============================================================
    logging: {
        enabled: true,
        level: 'info', // 'debug', 'info', 'warn', 'error'
        logToConsole: true,
        logToServer: false,
        maxLogs: 500
    },

    // ============================================================
    // AI CALL SETTINGS
    // ============================================================
    aiCall: {
        ttsLang: { en: 'en-US', hi: 'hi-IN', bn: 'bn-IN' },
        sttLang: { en: 'en-US', hi: 'hi-IN', bn: 'bn-IN' },
        openingMessages: {
            en: {
                fire: "ResQ AI here. I've received your FIRE alert. Please stay calm. I'm guiding you out now.",
                medical: "ResQ AI here. Medical emergency received. Help is on the way. Are you breathing okay?",
                earthquake: "ResQ AI here. Earthquake detected. Please Drop, Cover, and Hold on. I am with you.",
                other: "ResQ AI emergency assistant here. How can I help you safely?"
            },
            hi: {
                fire: "ResQ AI बोल रहा हूँ। हमें आग की सूचना मिली है। कृपया शांत रहें, मैं आपको बाहर निकाल रहा हूँ।",
                medical: "ResQ AI बोल रहा हूँ। मेडिकल इमरजेंसी मिली है। मदद रास्ते में है।",
                earthquake: "ResQ AI बोल रहा हूँ। भूकंप आया है। कृपया छुपें और खुद को बचाएं।",
                other: "ResQ AI सहायता केंद्र। हम आपकी कैसे मदद कर सकते हैं?"
            },
            bn: {
                fire: "ResQ AI বলছি। আগুনের খবর পেয়েছি। শান্ত থাকুন, আমি আপনাকে বার করে নিয়ে যাচ্ছি।",
                medical: "ResQ AI বলছি। মেডিকেল ইমার্জেন্সি রিপোর্ট করা হয়েছে। সাহায্য আসছে।",
                earthquake: "ResQ AI বলছি। ভূমিকম্প হয়েছে। নিচে বসে মাথা ঢেকে রাখুন।",
                other: "ResQ AI সাহায্য কেন্দ্র। আপনি কেমন আছেন?"
            }
        },
        systemPrompts: {
            en: "You are a professional emergency responder AI. Provide short, calm, actionable instructions. Max 2-3 sentences.",
            hi: "आप एक पेशेवर आपातकालीन प्रतिक्रियाकर्ता एआई हैं। संक्षिप्त, शांत और कार्रवाई योग्य निर्देश दें।",
            bn: "আপনি একজন পেশাদার জরুরি রেসপন্ডার এআই। ছোট এবং শান্ত নির্দেশ দিন।"
        }
    },

    // ============================================================
    // VALIDATION
    // ============================================================
    validation: {
        minPasswordLength: 6,
        maxRetries: 3,
        sessionTimeout: 3600000, // 1 hour
        minFloor: 1,
        maxFloors: 20,
        maxRoomsPerFloor: 50
    }
};

/**
 * Load environment-specific overrides
 * Example: from parent app context
 */
function initConfig(overrides) {
    if (overrides && typeof overrides === 'object') {
        Object.assign(window.ECHO_CONFIG, overrides);
        console.log('ECHO+ Config initialized with overrides');
    }
}

window.ECHO_CONFIG.init = initConfig;
