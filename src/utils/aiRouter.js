// ============================================
// ResQAI - Multi-Provider AI Router
// Ensures AI NEVER fails with smart fallback
// ============================================

import { GoogleGenerativeAI } from '@google/generative-ai';
import Groq from 'groq-sdk';
import axios from 'axios';

// ==================== INITIALIZATION ====================

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const OPENROUTER_PRIMARY_API_KEY = process.env.OPENROUTER_PRIMARY_API_KEY || process.env.OPENROUTER_API_KEY;
const OPENROUTER_SECONDARY_API_KEY = process.env.OPENROUTER_SECONDARY_API_KEY;
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const AI_TIMEOUT = parseInt(process.env.AI_TIMEOUT || '30000');
const DEFAULT_AI_PROVIDER_PRIORITY = [
    'gemini',
    'openrouter_primary',
    'openrouter_secondary',
    'grok',
    'fallback'
];

console.log('\n📋 [AI ROUTER] Environment Variables Check:');
console.log(`   GROQ_API_KEY: ${GROQ_API_KEY ? GROQ_API_KEY.slice(0, 20) + '...' : 'NOT SET'}`);
console.log(`   GROQ_MODEL: ${process.env.GROQ_MODEL || 'NOT SET (will use default)'}\n`);

function normalizeProviderName(name) {
    const value = String(name || '').trim().toLowerCase();
    if (value === 'groq') return 'grok';
    if (value === 'openrouter') return 'openrouter_primary';
    return value;
}

function parseProviderPriority() {
    const configured = process.env.AI_PROVIDER_PRIORITY;
    if (!configured || !configured.trim()) {
        return DEFAULT_AI_PROVIDER_PRIORITY;
    }

    let parsed = [];
    try {
        if (configured.trim().startsWith('[')) {
            parsed = JSON.parse(configured);
        } else {
            parsed = configured.split(',');
        }
    } catch (error) {
        console.warn('⚠️  [AI ROUTER] Invalid AI_PROVIDER_PRIORITY. Using default chain.');
        return DEFAULT_AI_PROVIDER_PRIORITY;
    }

    const normalized = parsed
        .map(normalizeProviderName)
        .filter((name) => DEFAULT_AI_PROVIDER_PRIORITY.includes(name));

    if (!normalized.includes('fallback')) {
        normalized.push('fallback');
    }

    return [...new Set(normalized)];
}

const AI_PROVIDER_PRIORITY = parseProviderPriority();

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
const hasOpenRouterPrimary = OPENROUTER_PRIMARY_API_KEY && OPENROUTER_PRIMARY_API_KEY.trim() && OPENROUTER_PRIMARY_API_KEY !== 'your-key';
const hasOpenRouterSecondary = OPENROUTER_SECONDARY_API_KEY && OPENROUTER_SECONDARY_API_KEY.trim() && OPENROUTER_SECONDARY_API_KEY !== 'your-key';

if (hasOpenRouterPrimary) {
    console.log('✅ [AI ROUTER] OpenRouter PRIMARY configured');
} else {
    console.warn('⚠️  [AI ROUTER] OpenRouter PRIMARY API key not configured - will be skipped');
}

if (hasOpenRouterSecondary) {
    console.log('✅ [AI ROUTER] OpenRouter SECONDARY configured');
} else {
    console.warn('⚠️  [AI ROUTER] OpenRouter SECONDARY API key not configured - will be skipped');
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

async function callOpenRouterProvider(prompt, apiKey, model, providerLabel) {
    console.log(`🟢 [AI] Attempting ${providerLabel}...`);

    if (!apiKey || !apiKey.trim()) {
        throw new Error(`${providerLabel} API key not configured`);
    }

    try {
        const response = await Promise.race([
            axios.post(
                'https://openrouter.ai/api/v1/chat/completions',
                {
                    model: model || process.env.OPENROUTER_MODEL || 'meta-llama/llama-3-8b-instruct',
                    messages: [{ role: 'user', content: prompt }],
                    temperature: 0.7,
                    max_tokens: 1500
                },
                {
                    headers: {
                        Authorization: `Bearer ${apiKey}`,
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
            throw new Error(`Empty response from ${providerLabel}`);
        }

        console.log(`✅ [AI] ${providerLabel} succeeded`);
        return content.trim();
    } catch (error) {
        console.error(`❌ [AI] ${providerLabel} failed:`, error.message);
        throw error;
    }
}

async function callOpenRouterPrimary(prompt, language = 'en') {
    return callOpenRouterProvider(
        prompt,
        OPENROUTER_PRIMARY_API_KEY,
        process.env.OPENROUTER_PRIMARY_MODEL || process.env.OPENROUTER_MODEL || 'meta-llama/llama-3-8b-instruct',
        'OpenRouter Primary'
    );
}

async function callOpenRouterSecondary(prompt, language = 'en') {
    return callOpenRouterProvider(
        prompt,
        OPENROUTER_SECONDARY_API_KEY,
        process.env.OPENROUTER_SECONDARY_MODEL || process.env.OPENROUTER_MODEL || 'meta-llama/llama-3-8b-instruct',
        'OpenRouter Secondary'
    );
}

// ==================== PROVIDER: GROQ ====================

async function callGroq(prompt, language = 'en') {
    console.log('🟡 [AI] Attempting Groq (Tertiary)...');

    if (!groqClient) {
        throw new Error('Groq client not initialized');
    }

    try {
        const model = process.env.GROQ_MODEL || 'mixtral-8x7b-32768';
        console.log(`   📌 Groq Model: ${model}`);

        const response = await Promise.race([
            groqClient.chat.completions.create({
                model: model,
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

// Track AI usage for reporting
let lastAIUsageReport = null;

export async function generateAIResponse(prompt, language = 'en') {
    const startTime = Date.now();

    console.log('\n════════════════════════════════════════════════════════════');
    console.log('🧠 [AI ROUTER] 🤖 LIVE AI REQUEST INITIATED 🤖');
    console.log('════════════════════════════════════════════════════════════');
    console.log(`   Language: ${language}`);
    console.log(`   Prompt: "${prompt.substring(0, 80)}..."`);
    console.log(`   Provider Chain: ${AI_PROVIDER_PRIORITY.join(' → ')}`);

    const errors = [];
    let usedProvider = null;
    let isFallback = false;

    for (const provider of AI_PROVIDER_PRIORITY) {
        try {
            if (provider === 'gemini') {
                if (!geminiClient) {
                    console.log('⏭️  [AI] Gemini skipped - not configured');
                    continue;
                }

                console.log('\n🤖 [PROVIDER] Attempting GEMINI (Primary Provider)...');
                const startGemini = Date.now();
                const response = await callGemini(prompt, language);
                const geminiTime = Date.now() - startGemini;

                usedProvider = 'Gemini';
                isFallback = false;
                lastAIUsageReport = { provider: 'Gemini', fallback: false, responseTime: geminiTime, type: 'AI-GENERATED' };
                return response;
            }

            if (provider === 'openrouter_primary') {
                if (!hasOpenRouterPrimary) {
                    console.log('⏭️  [AI] OpenRouter Primary skipped - not configured');
                    continue;
                }

                console.log('\n🤖 [PROVIDER] Attempting OPENROUTER PRIMARY...');
                const startOpenRouterPrimary = Date.now();
                const response = await callOpenRouterPrimary(prompt, language);
                const openRouterPrimaryTime = Date.now() - startOpenRouterPrimary;

                usedProvider = 'OpenRouter Primary';
                isFallback = false;
                lastAIUsageReport = { provider: 'OpenRouter Primary', fallback: false, responseTime: openRouterPrimaryTime, type: 'AI-GENERATED' };
                return response;
            }

            if (provider === 'openrouter_secondary') {
                if (!hasOpenRouterSecondary) {
                    console.log('⏭️  [AI] OpenRouter Secondary skipped - not configured');
                    continue;
                }

                console.log('\n🤖 [PROVIDER] Attempting OPENROUTER SECONDARY...');
                const startOpenRouterSecondary = Date.now();
                const response = await callOpenRouterSecondary(prompt, language);
                const openRouterSecondaryTime = Date.now() - startOpenRouterSecondary;

                usedProvider = 'OpenRouter Secondary';
                isFallback = false;
                lastAIUsageReport = { provider: 'OpenRouter Secondary', fallback: false, responseTime: openRouterSecondaryTime, type: 'AI-GENERATED' };
                return response;
            }

            if (provider === 'grok') {
                if (!groqClient) {
                    console.log('⏭️  [AI] Groq skipped - not configured');
                    continue;
                }

                console.log('\n🤖 [PROVIDER] Attempting GROQ (Tertiary Provider)...');
                const startGroq = Date.now();
                const response = await callGroq(prompt, language);
                const groqTime = Date.now() - startGroq;

                usedProvider = 'Groq';
                isFallback = false;
                lastAIUsageReport = { provider: 'Groq', fallback: false, responseTime: groqTime, type: 'AI-GENERATED' };
                return response;
            }

            if (provider === 'fallback') {
                break;
            }
        } catch (error) {
            errors.push(`${provider}: ${error.message}`);
        }
    }

    // All providers failed - use fallback
    const totalTime = Date.now() - startTime;
    console.error('\n🔴 [AI ROUTER] ALL PROVIDERS FAILED - FALLBACK ENGAGED');
    console.error('   Errors encountered:');
    errors.forEach(e => console.error(`   - ${e}`));

    console.log('\n═════════════════════════════════════════════════════════════');
    console.log('🤖 Provider Used: FALLBACK (Template-based)');
    console.log('⚠️ Fallback Used: YES');
    console.log(`⏱️ Total Time: ${totalTime}ms (all providers attempted)`);
    console.log('✨ Response Type: STATIC TEMPLATE');
    console.log('═════════════════════════════════════════════════════════════\n');

    usedProvider = 'Fallback';
    isFallback = true;

    // Store usage report
    lastAIUsageReport = {
        provider: 'Fallback',
        fallback: true,
        responseTime: totalTime,
        type: 'STATIC TEMPLATE'
    };

    return getFallbackResponse(language);
}

// Export usage report for testing
export function getLastAIUsageReport() {
    return lastAIUsageReport;
}

// Export Groq test function
export async function testGroqProvider(prompt, language = 'en') {
    console.log('\n🧪 [GROQ TEST] Testing Groq as standalone provider...');
    return await callGroq(prompt, language);
}

// ==================== HEALTH CHECK ====================

export function getAIRouterStatus() {
    return {
        gemini: !!geminiClient,
        openrouterPrimary: hasOpenRouterPrimary,
        openrouterSecondary: hasOpenRouterSecondary,
        openrouter: hasOpenRouterPrimary || hasOpenRouterSecondary,
        groq: !!groqClient,
        fallback: true,
        providerPriority: AI_PROVIDER_PRIORITY,
        availableProviders: [
            geminiClient ? 'Gemini' : null,
            hasOpenRouterPrimary ? 'OpenRouter Primary' : null,
            hasOpenRouterSecondary ? 'OpenRouter Secondary' : null,
            groqClient ? 'Groq' : null,
            'Fallback'
        ].filter(Boolean)
    };
}

console.log('✅ [STARTUP] AI Router initialized with providers:', getAIRouterStatus().availableProviders.join(' → '));
