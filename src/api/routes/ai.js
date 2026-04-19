// ============================================
// ResQAI - EcoPlus Hotel Emergency AI Routes
// ============================================

import express from 'express';
import { generateAIResponse, getLastAIUsageReport, testGroqProvider } from '../../utils/aiRouter.js';
import { getAIStatus } from '../../utils/validateEnv.js';

const router = express.Router();

// ==================== GET AI HEALTH STATUS ====================

router.get('/health', (req, res) => {
    try {
        const aiStatus = getAIStatus();

        res.json({
            status: 'ok',
            timestamp: new Date().toISOString(),
            message: 'EcoPlus AI System is operational',
            providers: {
                gemini: aiStatus.gemini ? 'Available' : 'Not configured',
                openrouter: aiStatus.openRouter ? 'Available' : 'Not configured',
                groq: aiStatus.groq ? 'Available' : 'Not configured'
            },
            primaryProvider: aiStatus.gemini ? 'Gemini' : aiStatus.openRouter ? 'OpenRouter' : aiStatus.groq ? 'Groq' : 'None'
        });
    } catch (error) {
        console.error('❌ Error in /api/ai/health:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to get AI status'
        });
    }
});

// ==================== POST EMERGENCY GUIDANCE REQUEST ====================

router.post('/emergency-guidance', async (req, res) => {
    try {
        const {
            emergencyType,
            floor,
            roomNumber = 'Unknown',
            severity = 'medium',
            description,
            guestContext,
            language = 'en',
            params = {}
        } = req.body;

        // Validate required fields
        if (!emergencyType || !description) {
            console.warn('❌ Missing required fields for emergency guidance');
            return res.status(400).json({
                error: 'Missing required fields: emergencyType, description'
            });
        }

        console.log(`🏨 [EcoPlus] Emergency Guidance Request:`, {
            type: emergencyType,
            floor,
            severity,
            language
        });

        // Build comprehensive prompt for emergency guidance
        const prompt = buildEmergencyGuidancePrompt(
            emergencyType,
            description,
            floor,
            roomNumber,
            severity,
            guestContext,
            language
        );

        // Get AI response with emergency guidance
        const guidance = await generateAIResponse(prompt, language);

        // Ensure response is reasonable length
        const limitedGuidance = guidance.length > 500
            ? guidance.substring(0, 497) + '...'
            : guidance;

        console.log('✅ Emergency guidance generated successfully');

        res.json({
            guidance: limitedGuidance,
            emergencyType,
            floor,
            roomNumber,
            severity,
            language,
            timestamp: new Date().toISOString(),
            provider: 'ResQAI-EcoPlus-Integration'
        });

    } catch (error) {
        console.error('❌ Error in /api/ai/emergency-guidance:', error);

        // Provide fallback guidance
        const fallbackGuidance = getFallbackGuidance(
            req.body.emergencyType,
            req.body.language || 'en'
        );

        res.status(500).json({
            guidance: fallbackGuidance,
            error: 'AI provider temporarily unavailable',
            timestamp: new Date().toISOString(),
            isFallback: true
        });
    }
});

// ==================== HELPER FUNCTIONS ====================

/**
 * Build comprehensive prompt for emergency guidance
 */
function buildEmergencyGuidancePrompt(
    emergencyType,
    description,
    floor,
    roomNumber,
    severity,
    guestContext,
    language = 'en'
) {
    const languageName = language === 'hi' ? 'Hindi' : 'English';

    let prompt = `You are an AI emergency guidance system for hotels. Provide immediate, actionable safety guidance.

EMERGENCY DETAILS:
- Type: ${emergencyType}
- Floor: ${floor ? `Floor ${floor}` : 'Floor unknown'}
- Room: ${roomNumber}
- Severity: ${severity}
- Description: ${description}

${guestContext ? `
GUEST CONTEXT:
- Is nearby: ${guestContext.isNearby ? 'Yes' : 'No'}
- Guest floor: ${guestContext.floor || 'Unknown'}
- Zone: ${guestContext.zone || 'Unknown'}
` : ''}

INSTRUCTIONS:
1. Provide IMMEDIATE ACTION (1-2 sentences)
2. STEP-BY-STEP GUIDANCE (numbered list, max 5 steps)
3. SAFETY TIPS (2-3 key points)
4. CONTACT INFORMATION (local emergency number and hotel security)

IMPORTANT:
- Be concise and clear
- Prioritize immediate safety
- Assume guest is under stress
- Respond in ${languageName}
- Include room evacuation route if applicable

Format your response with clear sections [IMMEDIATE ACTION], [STEPS], [SAFETY TIPS], [CONTACTS]`;

    return prompt;
}

/**
 * Fallback guidance when AI is unavailable
 */
function getFallbackGuidance(emergencyType, language = 'en') {
    const fallbacks = {
        fire: {
            en: `IMMEDIATE ACTION: Evacuate immediately. Use stairs, never elevators.
STEPS:
1. Alert others: Pull fire alarm or shout "FIRE!"
2. Exit safely: Use nearest stairwell
3. Meet outside: Proceed to assembly point
4. Report: Inform hotel security/fire department
5. Wait: Do not re-enter the building
CONTACTS: Fire: 101 | Hotel Security: Contact front desk`,
            hi: `तुरंत कदम: तुरंत खाली करें। सीढ़ियाँ उपयोग करें।
संपर्क: आग: 101 | होटल सुरक्षा: फ्रंट डेस्क`
        },
        medical: {
            en: `IMMEDIATE ACTION: Call 108 immediately. Stay calm.
STEPS:
1. Call hotel medical staff immediately
2. Lie down and rest
3. Provide patient history if conscious
4. Stay on the phone with operator
5. Prepare for ambulance arrival
CONTACTS: Ambulance: 108 | Hotel Front Desk: Dial 0`,
            hi: `तुरंत कदम: 108 पर कॉल करें।
संपर्क: एम्बुलेंस: 108 | होटल: डायल 0`
        },
        flood: {
            en: `IMMEDIATE ACTION: Move to higher floor. Avoid basement/ground floor.
STEPS:
1. Proceed to upper floor immediately
2. Close windows and doors
3. Contact hotel management
4. Wait for further instructions
5. Document damage if safe
CONTACTS: Hotel Emergency: Front Desk | Rescue: 112`,
            hi: `तुरंत कदम: ऊपरी मंजिल पर जाएं।
संपर्क: होटल आपातकालीन: फ्रंट डेस्क | बचाव: 112`
        },
        accident: {
            en: `IMMEDIATE ACTION: Do not move injured person. Call for help.
STEPS:
1. Call 112 immediately
2. Provide location and details
3. Do not move injured person
4. Keep area safe from hazards
5. Provide first aid if trained
CONTACTS: Emergency: 112 | Ambulance: 108`,
            hi: `तुरंत कदम: 112 पर कॉल करें।
संपर्क: आपातकालीन: 112 | एम्बुलेंस: 108`
        }
    };

    const type = emergencyType?.toLowerCase() || 'accident';
    const lang = (language || 'en').toLowerCase();

    return (fallbacks[type] && fallbacks[type][lang]) ||
        fallbacks[type]?.en ||
        fallbacks.accident.en;
}

// ==================== TEST AI ENDPOINT (FOR VERIFICATION) ====================

router.post('/test-ai', async (req, res) => {
    try {
        const { query = 'Test emergency query', language = 'en' } = req.body;

        console.log('\n🧪 [TEST-AI] Starting AI verification test...');
        console.log(`   Query: "${query}"`);
        console.log(`   Language: ${language}\n`);

        // Send test query to AI
        const response = await generateAIResponse(query, language);

        // Get the usage report from the last AI call
        const usageReport = getLastAIUsageReport();

        console.log('\n✅ [TEST-AI] Test completed - Usage report captured\n');

        res.json({
            success: true,
            query,
            language,
            response: response.substring(0, 200) + (response.length > 200 ? '...' : ''),
            aiUsageReport: usageReport || {
                provider: 'Unknown',
                fallback: true,
                responseTime: 0,
                type: 'Unknown'
            },
            timestamp: new Date().toISOString(),
            message: 'AI Verification Test - Use aiUsageReport field to verify provider'
        });

    } catch (error) {
        console.error('❌ [TEST-AI] Error during test:', error.message);
        res.status(500).json({
            success: false,
            error: error.message,
            message: 'AI verification test failed'
        });
    }
});

// ==================== TEST GROQ PROVIDER SPECIFICALLY ====================

router.post('/test-groq', async (req, res) => {
    try {
        const { query = 'Test emergency query', language = 'en' } = req.body;

        console.log('\n🧪 [TEST-GROQ] Starting Groq-specific provider test...');
        console.log(`   Query: "${query}"`);
        console.log(`   Language: ${language}`);
        console.log('   Testing Groq as TERTIARY fallback provider\n');

        const startTime = Date.now();

        // Send test query directly to Groq provider
        const response = await testGroqProvider(query, language);

        const responseTime = Date.now() - startTime;

        console.log('✅ [TEST-GROQ] GROQ PROVIDER SUCCESS');
        console.log('🧪 Groq test completed - Provider confirmed working\n');

        res.json({
            success: true,
            testType: 'GROQ_ONLY',
            query,
            language,
            response: response.substring(0, 250) + (response.length > 250 ? '...' : ''),
            groqTestReport: {
                provider: 'Groq',
                status: 'ACTIVE',
                responseTime: responseTime,
                responseType: 'AI-GENERATED',
                model: process.env.GROQ_MODEL || 'mixtral-8x7b-32768',
                testResult: 'SUCCESS ✅'
            },
            timestamp: new Date().toISOString(),
            message: 'Groq Provider Test - Confirms Groq is working as fallback provider'
        });

    } catch (error) {
        console.error('❌ [TEST-GROQ] Groq provider failed:', error.message);
        res.status(500).json({
            success: false,
            testType: 'GROQ_ONLY',
            testResult: 'FAILED ❌',
            error: error.message,
            groqTestReport: {
                provider: 'Groq',
                status: 'FAILED',
                responseTime: 0,
                responseType: 'ERROR',
                model: process.env.GROQ_MODEL || 'mixtral-8x7b-32768',
                testResult: 'FAILED ❌',
                errorDetails: error.message
            },
            message: 'Groq provider test failed - Please check API key and model configuration'
        });
    }
});

export default router;
