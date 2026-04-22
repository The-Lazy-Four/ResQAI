// ============================================
// ResQAI - Chat API Routes (Chatbot)
// ============================================

import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { addChatMessage } from '../../db/db.js';
import { getSystemPrompt, isValidLanguage } from '../../utils/languages.js';
import { generateAIResponse, getAIRouterStatus } from '../../utils/aiRouter.js';

const router = express.Router();

// ==================== GET AI RESPONSE - MULTI-PROVIDER ====================

async function getAIResponse(message, language = 'en', context = '', history = [], isVoiceOverride = false, priorityProvider = null) {
    console.log('\n📨 [CHAT] Message received:', message.substring(0, 100));

    // Validate language
    if (!isValidLanguage(language)) {
        console.warn(`⚠️  Invalid language "${language}", defaulting to English`);
        language = 'en';
    }

    const systemPrompt = getSystemPrompt(language);
    
    // Format conversation history
    const historyText = history && history.length > 0 
        ? history.map(h => `${h.role === 'user' ? 'Guest' : 'Rescue AI'}: ${h.content}`).join('\n')
        : '';

    const prompt = `${systemPrompt}
${context ? `\nCORE CONTEXT:\n${context}` : ''}
${historyText ? `\nCONVERSATION HISTORY:\n${historyText}` : ''}

USER QUERY (${language}): "${message}"

${isVoiceOverride ? 'CONSTRAINTS: Keep response extremely short (1-2 sentences) for immediate voice guidance.' : 'Provide a comprehensive, structured response that follows the exact format above.'}`;

    // Use the multi-provider AI router
    const response = await generateAIResponse(prompt, language, isVoiceOverride, priorityProvider);

    // Limit response length
    if (response.length > 2000) {
        return response.substring(0, 1997) + '...';
    }

    return response;
}

// ==================== POST CHAT MESSAGE ====================

router.post('/', async (req, res) => {
    try {
        const { message, language = 'en', context = '', history = [], isVoiceOverride = false } = req.body;

        if (!message || !message.trim()) {
            console.warn('❌ Empty message received');
            return res.status(400).json({
                success: false,
                error: 'Input required',
                message: 'Message is required'
            });
        }

        console.log('\n📨 [ROUTE] Chat request received');
        const id = uuidv4();

        // Get AI response
        const providerPriority = isVoiceOverride ? 'Groq' : null;
        const response = await getAIResponse(message, language, context, history, isVoiceOverride, providerPriority);

        // Store in database (optional)
        try {
            await addChatMessage(id, message, response);
            console.log('💾 Saved to database');
        } catch (error) {
            console.warn('⚠️  Could not save chat history:', error.message);
            // Don't fail the response if chat history fails
        }

        console.log('✅ [ROUTE] Sending response to client');
        res.json({
            success: true,
            id: id,
            message: message,
            response: response,
            language: language,
            timestamp: new Date().toISOString(),
            providers: getAIRouterStatus().availableProviders
        });

    } catch (error) {
        console.error('\n🔴 [ROUTE] Unhandled error:', error.message);
        res.status(500).json({
            success: false,
            error: 'Server error',
            message: 'Error processing chat message',
            details: error.message
        });
    }
});

// ==================== HEALTH CHECK ====================

router.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'chat-api',
        aiProviders: getAIRouterStatus()
    });
});

export default router;
