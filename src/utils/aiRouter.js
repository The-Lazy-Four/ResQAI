// ============================================
// ResQAI - Multi-Provider AI Router
// Ensures AI NEVER fails with smart fallback
// ============================================

import { GoogleGenerativeAI } from '@google/generative-ai';
import Groq from 'groq-sdk';
import axios from 'axios';

// ==================== INITIALIZATION ====================

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const AI_TIMEOUT = parseInt(process.env.AI_TIMEOUT || '30000');

// Initialize Gemini
let geminiClient = null;
if (GEMINI_API_KEY && GEMINI_API_KEY.trim() && GEMINI_API_KEY !== 'your-key') {
    geminiClient = new GoogleGenerativeAI(GEMINI_API_KEY);
    console.log('✅ [AI ROUTER] Gemini configured as PRIMARY provider');
} else {
    console.warn('⚠️  [AI ROUTER] Gemini API key not configured - will be skipped');
}

// Initialize Groq
let groqClient = null;
if (GROQ_API_KEY && GROQ_API_KEY.trim() && GROQ_API_KEY !== 'your-key') {
    groqClient = new Groq({ apiKey: GROQ_API_KEY });
    console.log('✅ [AI ROUTER] Groq configured as TERTIARY provider');
} else {
    console.warn('⚠️  [AI ROUTER] Groq API key not configured - will be skipped');
}

// OpenRouter uses HTTP
const hasOpenRouter = OPENROUTER_API_KEY && OPENROUTER_API_KEY.trim() && OPENROUTER_API_KEY !== 'your-key';
if (hasOpenRouter) {
    console.log('✅ [AI ROUTER] OpenRouter configured as SECONDARY provider');
} else {
    console.warn('⚠️  [AI ROUTER] OpenRouter API key not configured - will be skipped');
}

// ==================== PROVIDER: GEMINI ====================

async function callGemini(prompt, language = 'en') {
    console.log('🔵 [AI] Attempting Gemini (Primary)...');

    if (!geminiClient) {
        throw new Error('Gemini client not initialized');
    }

    try {
        const model = geminiClient.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-2.5-flash' });

        const result = await Promise.race([
            model.generateContent(prompt),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Gemini timeout')), AI_TIMEOUT)
            )
        ]);

        const response = await result.response.text();

        if (!response || response.trim().length === 0) {
            throw new Error('Empty response from Gemini');
        }

        console.log('✅ [AI] Gemini succeeded');
        return response.trim();
    } catch (error) {
        console.error('❌ [AI] Gemini failed:', error.message);
        throw error;
    }
}

// ==================== PROVIDER: OPENROUTER ====================

async function callOpenRouter(prompt, language = 'en') {
    console.log('🟢 [AI] Attempting OpenRouter (Secondary)...');

    if (!hasOpenRouter) {
        throw new Error('OpenRouter API key not configured');
    }

    try {
        const response = await Promise.race([
            axios.post(
                'https://openrouter.ai/api/v1/chat/completions',
                {
                    model: process.env.OPENROUTER_MODEL || 'meta-llama/llama-3-8b-instruct',
                    messages: [{ role: 'user', content: prompt }],
                    temperature: 0.7,
                    max_tokens: 1500
                },
                {
                    headers: {
                        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
                        'HTTP-Referer': 'http://localhost:3000',
                        'X-Title': 'ResQAI Emergency Response'
                    },
                    timeout: AI_TIMEOUT
                }
            ),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error('OpenRouter timeout')), AI_TIMEOUT)
            )
        ]);

        const content = response.data?.choices?.[0]?.message?.content;

        if (!content || content.trim().length === 0) {
            throw new Error('Empty response from OpenRouter');
        }

        console.log('✅ [AI] OpenRouter succeeded');
        return content.trim();
    } catch (error) {
        console.error('❌ [AI] OpenRouter failed:', error.message);
        throw error;
    }
}

// ==================== PROVIDER: GROQ ====================

async function callGroq(prompt, language = 'en') {
    console.log('🟡 [AI] Attempting Groq (Tertiary)...');

    if (!groqClient) {
        throw new Error('Groq client not initialized');
    }

    try {
        const response = await Promise.race([
            groqClient.chat.completions.create({
                model: process.env.GROQ_MODEL || 'mixtral-8x7b-32768',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.7,
                max_tokens: 1500
            }),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Groq timeout')), AI_TIMEOUT)
            )
        ]);

        const content = response.choices?.[0]?.message?.content;

        if (!content || content.trim().length === 0) {
            throw new Error('Empty response from Groq');
        }

        console.log('✅ [AI] Groq succeeded');
        return content.trim();
    } catch (error) {
        console.error('❌ [AI] Groq failed:', error.message);
        throw error;
    }
}

// ==================== SMART FALLBACK ====================

function getFallbackResponse(language = 'en') {
    console.log('🔴 [AI] All providers failed - Using fallback');

    const fallbacks = {
        en: `🚨 EMERGENCY RESPONSE (AI System Offline)

I'm unable to access AI services right now, but here are the immediate steps:

IMMEDIATE ACTIONS:
1. Ensure your safety first
2. Move to a safe location if needed
3. Call your local emergency number: 112

EMERGENCY SERVICES:
📞 Police: 100
📞 Ambulance: 101
📞 Fire Service: 102
📞 National Emergency: 112

STAY CALM:
• Help is on the way
• Follow official instructions
• Stay where rescuers can find you
• Keep your phone charged

⚠️ Note: Our AI assistants are temporarily unavailable. 
Please contact emergency services directly for professional guidance.`,

        hi: `🚨 आपातकालीन प्रतिक्रिया (AI सिस्टम ऑफलाइन)

फिलहाल मैं AI सेवाओं तक पहुंच नहीं पा रहा हूँ, लेकिन यहां तत्काल कदम हैं:

तत्काल कार्यवाही:
1. अपनी सुरक्षा सुनिश्चित करें
2. जरूरत पड़ने पर सुरक्षित स्थान पर जाएं
3. अपने स्थानीय आपातकालीन नंबर को कॉल करें: 112

आपातकालीन सेवाएं:
📞 पुलिस: 100
📞 एम्बुलेंस: 101
📞 अग्निशमन सेवा: 102
📞 राष्ट्रीय आपातकालीन: 112

शांत रहें:
• मदद रास्ते में है
• आधिकारिक निर्देशों का पालन करें
• उस जगह रहें जहां बचाव दल आपको खोज सकें
• अपना फोन चार्ज रखें`,

        bn: `🚨 জরুরি প্রতিক্রিয়া (AI সিস্টেম অফলাইন)

এখন আমি AI সেবাগুলিতে অ্যাক্সেস করতে পারছি না, তবে এখানে তাৎক্ষণিক পদক্ষেপ রয়েছে:

তাৎক্ষণিক পদক্ষেপ:
1. আপনার নিরাপত্তা নিশ্চিত করুন
2. প্রয়োজনে নিরাপদ স্থানে যান
3. আপনার স্থানীয় জরুরি নম্বরে কল করুন: 112

জরুরি সেবা:
📞 পুলিশ: 100
📞 অ্যাম্বুলেন্স: 101
📞 অগ্নিনিরসন সেবা: 102
📞 জাতীয় জরুরি: 112

শান্ত থাকুন:
• সাহায্য পথে আছে
• অফিসিয়াল নির্দেশনা অনুসরণ করুন
• উদ্ধারকারীরা আপনাকে খুঁজে পেতে পারেন এমন জায়গায় থাকুন
• আপনার ফোন চার্জ রাখুন`
    };

    return fallbacks[language] || fallbacks.en;
}

// ==================== MAIN ROUTER ====================

export async function generateAIResponse(prompt, language = 'en') {
    console.log('\n🧠 [AI ROUTER] Starting multi-provider AI call');
    console.log(`   Language: ${language}`);
    console.log(`   Prompt: "${prompt.substring(0, 80)}..."`);

    const errors = [];

    // Try Gemini (Primary)
    try {
        if (geminiClient) {
            return await callGemini(prompt, language);
        } else {
            console.log('⏭️  [AI] Gemini skipped - not configured');
        }
    } catch (error) {
        errors.push(`Gemini: ${error.message}`);
    }

    // Try OpenRouter (Secondary)
    try {
        if (hasOpenRouter) {
            return await callOpenRouter(prompt, language);
        } else {
            console.log('⏭️  [AI] OpenRouter skipped - not configured');
        }
    } catch (error) {
        errors.push(`OpenRouter: ${error.message}`);
    }

    // Try Groq (Tertiary)
    try {
        if (groqClient) {
            return await callGroq(prompt, language);
        } else {
            console.log('⏭️  [AI] Groq skipped - not configured');
        }
    } catch (error) {
        errors.push(`Groq: ${error.message}`);
    }

    // All providers failed - use fallback
    console.error('⚠️  [AI ROUTER] All providers exhausted:');
    errors.forEach(e => console.error(`   - ${e}`));

    return getFallbackResponse(language);
}

// ==================== HEALTH CHECK ====================

export function getAIRouterStatus() {
    return {
        gemini: !!geminiClient,
        openrouter: hasOpenRouter,
        groq: !!groqClient,
        fallback: true,
        availableProviders: [
            geminiClient ? 'Gemini' : null,
            hasOpenRouter ? 'OpenRouter' : null,
            groqClient ? 'Groq' : null,
            'Fallback'
        ].filter(Boolean)
    };
}

console.log('✅ [STARTUP] AI Router initialized with providers:', getAIRouterStatus().availableProviders.join(' → '));
