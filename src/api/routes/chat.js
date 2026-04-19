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

async function getAIResponse(message, language = 'en', context = null, isVoiceOverride = false, history = []) {
    console.log('\n📨 [CHAT] Message received:', message.substring(0, 100));

    // Validate language
    if (!isValidLanguage(language)) {
        console.warn(`⚠️  Invalid language "${language}", defaulting to English`);
        language = 'en';
    }

    let systemPrompt = getSystemPrompt(language);
    
    // If context is provided (e.g., from EchoPlus module), inject it to make the AI aware of the hotel architecture and guest location
    if (context) {
        systemPrompt = `${context}\n\n${systemPrompt}`;
    }

    let historyText = "";
    if (Array.isArray(history) && history.length > 0) {
        historyText = "Recent Conversation History:\n" + history.map(m => `${m.role === 'user' ? 'Guest' : 'You (AI)'}: ${m.content}`).join('\n') + "\n\n";
    }

    let prompt = `${systemPrompt}\n\n${historyText}User query (${language}): "${message}"\n\nProvide a comprehensive, structured response in ${language} that follows the exact format above.`;

    // For voice override, we need shorter, more concise, and spoken-friendly responses without markdown formatting like asterisks or bold tags
    if (isVoiceOverride) {
        prompt = `${systemPrompt}\n\n${historyText}User query (${language}): "${message}"\n\nProvide a short, direct, and conversational emergency response in ${language} that is easy to understand when spoken by a voice assistant. Do not use Markdown, bullet points, or special characters. Act distinctly as an AI hotel emergency guide on a voice call. Answer perfectly based on the hotel architecture provided in the context, and answer any follow-up questions normally based on conversation history.`;
    }


    // Use the multi-provider AI router
    const response = await generateAIResponse(prompt, language, isVoiceOverride);

    // Limit response length
    if (response.length > 2000) {
        return response.substring(0, 1997) + '...';
    }

    return response;
}

// ==================== POST CHAT MESSAGE ====================

router.post('/', async (req, res) => {
    try {
        const { message, language = 'en', context, isVoiceOverride, history } = req.body;

        if (!message || !message.trim()) {
            console.warn('❌ Empty message received');
            return res.status(400).json({
                success: false,
                error: 'AI service unavailable',
                message: 'Message is required'
            });
        }

        console.log('\n📨 [ROUTE] Chat request received');
        const id = uuidv4();

        // Get AI response from multi-provider router (always returns a response)
        const response = await getAIResponse(message, language, context, isVoiceOverride, history);

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
