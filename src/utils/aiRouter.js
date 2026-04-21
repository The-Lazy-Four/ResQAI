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

console.log('\n📋 [AI ROUTER] Environment Variables Check:');
console.log(`   GROQ_API_KEY: ${GROQ_API_KEY ? GROQ_API_KEY.slice(0, 20) + '...' : 'NOT SET'}`);
console.log(`   GROQ_MODEL: ${process.env.GROQ_MODEL || 'NOT SET (will use default)'}\n`);

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

// ==================== PROVIDER: FREE AI (POLLINATIONS) ====================

async function callFreeAI(prompt, language = 'en') {
    console.log('🟣 [AI] Attempting Free AI (Pollinations.ai)...');

    try {
        const response = await Promise.race([
            axios.post('https://text.pollinations.ai/', {
                messages: [
                    { role: 'system', content: 'You are an intelligent ResQAI crisis response agent.' },
                    { role: 'user', content: prompt }
                ],
                model: 'openai'
            }, {
                headers: { 'Content-Type': 'application/json' },
                timeout: AI_TIMEOUT
            }),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error('FreeAI timeout')), AI_TIMEOUT)
            )
        ]);

        const content = response.data;
        if (!content || typeof content !== 'string') {
            throw new Error('Empty or invalid response from Free AI');
        }

        console.log('✅ [AI] Free AI succeeded');
        return content.trim();
    } catch (error) {
        console.error('❌ [AI] Free AI failed:', error.message);
        throw error;
    }
}

// ==================== SMART FALLBACK ====================

function getFallbackResponse(language = 'en', isVoiceOverride = false) {
    console.log('🔴 [AI] All providers failed - Using fallback');

    if (isVoiceOverride) {
        const voiceFallbacks = {
            en: "I am having trouble connecting to my central systems, but please do not panic. Make sure you are safe, move away from any immediate danger, and dial 112 immediately for local authorities.",
            hi: "मैं अपने मुख्य सर्वर से कनेक्ट नहीं कर पा रहा हूँ। कृपया घबराएं नहीं। सुरक्षित स्थान पर चले जाएं और सहायता के लिए तुरंत 112 डायल करें।",
            bn: "আমি আমার প্রধান সিস্টেমের সাথে সংযোগ করতে পারছি না। অনুগ্রহ করে আতঙ্কিত হবেন না। নিরাপদ স্থানে যান এবং সাহায্যের জন্য অবিলম্বে 112 ডায়াল করুন।"
        };
        return voiceFallbacks[language] || voiceFallbacks.en;
    }

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

export async function generateAIResponse(prompt, language = 'en', isVoiceOverride = false) {
    const startTime = Date.now();

    console.log('\n════════════════════════════════════════════════════════════');
    console.log('🧠 [AI ROUTER] 🤖 LIVE AI REQUEST INITIATED 🤖');
    console.log('════════════════════════════════════════════════════════════');
    console.log(`   Language: ${language}`);
    console.log(`   Voice Mode: ${isVoiceOverride}`);
    console.log(`   Prompt: "${prompt.substring(0, 80)}..."`);
    console.log('   Provider Chain: Gemini → OpenRouter → Groq → Fallback');

    const errors = [];
    let usedProvider = null;
    let isFallback = false;

    // Try Gemini (Primary)
    try {
        if (geminiClient) {
            console.log('\n🤖 [PROVIDER] Attempting GEMINI (Primary Provider)...');
            const startGemini = Date.now();
            const response = await callGemini(prompt, language);
            const geminiTime = Date.now() - startGemini;

            console.log(`✅ [PROVIDER] GEMINI SUCCESS - ${geminiTime}ms`);
            console.log('🤖 Provider Used: GEMINI');
            console.log('⚠️ Fallback Used: NO (Using live AI)');
            console.log(`⏱️ Response Time: ${geminiTime}ms`);
            console.log('✨ Response Type: AI-GENERATED');

            usedProvider = 'Gemini';
            isFallback = false;

            // Store usage report
            lastAIUsageReport = {
                provider: 'Gemini',
                fallback: false,
                responseTime: geminiTime,
                type: 'AI-GENERATED'
            };

            return response;
        } else {
            console.log('⏭️  [AI] Gemini skipped - not configured');
        }
    } catch (error) {
        errors.push(`Gemini: ${error.message}`);
    }

    // Try OpenRouter (Secondary)
    try {
        if (hasOpenRouter) {
            console.log('\n🤖 [PROVIDER] Attempting OPENROUTER (Secondary Provider)...');
            const startOpenRouter = Date.now();
            const response = await callOpenRouter(prompt, language);
            const openRouterTime = Date.now() - startOpenRouter;

            console.log(`✅ [PROVIDER] OPENROUTER SUCCESS - ${openRouterTime}ms`);
            console.log('🤖 Provider Used: OPENROUTER');
            console.log('⚠️ Fallback Used: NO (Using live AI)');
            console.log(`⏱️ Response Time: ${openRouterTime}ms`);
            console.log('✨ Response Type: AI-GENERATED');

            usedProvider = 'OpenRouter';
            isFallback = false;

            // Store usage report
            lastAIUsageReport = {
                provider: 'OpenRouter',
                fallback: false,
                responseTime: openRouterTime,
                type: 'AI-GENERATED'
            };

            return response;
        } else {
            console.log('⏭️  [AI] OpenRouter skipped - not configured');
        }
    } catch (error) {
        errors.push(`OpenRouter: ${error.message}`);
    }

    // Try Groq (Tertiary)
    try {
        if (groqClient) {
            console.log('\n🤖 [PROVIDER] Attempting GROQ (Tertiary Provider)...');
            const startGroq = Date.now();
            const response = await callGroq(prompt, language);
            const groqTime = Date.now() - startGroq;

            console.log(`✅ [PROVIDER] GROQ SUCCESS - ${groqTime}ms`);
            console.log('🤖 Provider Used: GROQ');
            console.log('⚠️ Fallback Used: NO (Using live AI)');
            console.log(`⏱️ Response Time: ${groqTime}ms`);
            console.log('✨ Response Type: AI-GENERATED');

            usedProvider = 'Groq';
            isFallback = false;

            // Store usage report
            lastAIUsageReport = {
                provider: 'Groq',
                fallback: false,
                responseTime: groqTime,
                type: 'AI-GENERATED'
            };

            return response;
        } else {
            console.log('⏭️  [AI] Groq skipped - not configured');
        }
    } catch (error) {
        errors.push(`Groq: ${error.message}`);
    }

    // Try Free AI (Pollinations) if others failed
    try {
        console.log('\n🤖 [PROVIDER] Attempting FREE AI (Quartenary Provider)...');
        const startFreeAI = Date.now();
        const response = await callFreeAI(prompt, language);
        const freeAITime = Date.now() - startFreeAI;

        console.log(`✅ [PROVIDER] FREE AI SUCCESS - ${freeAITime}ms`);
        console.log('🤖 Provider Used: FREE AI');
        console.log('⚠️ Fallback Used: NO (Using live free AI)');
        console.log(`⏱️ Response Time: ${freeAITime}ms`);
        console.log('✨ Response Type: AI-GENERATED');

        usedProvider = 'FreeAI';
        isFallback = false;

        // Store usage report
        lastAIUsageReport = {
            provider: 'FreeAI',
            fallback: false,
            responseTime: freeAITime,
            type: 'AI-GENERATED'
        };

        return response;
    } catch (error) {
        errors.push(`FreeAI: ${error.message}`);
    }

    // All providers failed - use absolute fallback
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

    return getFallbackResponse(language, isVoiceOverride);
}

// Export usage report for testing
export function getLastAIUsageReport() {
    return lastAIUsageReport;
}

// ==================== IMAGE ANALYSIS (VISION) ====================

export async function generateImageAnalysis(imageBase64, mimeType, prompt) {
    console.log('\n════════════════════════════════════════════════════════════');
    console.log('🖼️ [AI ROUTER] IMAGE ANALYSIS REQUEST');
    console.log('════════════════════════════════════════════════════════════');
    console.log(`   Mime Type: ${mimeType}`);
    console.log(`   Image Size: ${Math.round(imageBase64.length / 1024)}KB (base64)`);
    console.log(`   Prompt: "${prompt.substring(0, 80)}..."`);

    // Try Gemini Vision (Primary)
    if (geminiClient) {
        try {
            console.log('\n🔵 [VISION] Attempting Gemini Vision...');
            const model = geminiClient.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-2.0-flash' });

            const result = await Promise.race([
                model.generateContent([
                    prompt,
                    { inlineData: { data: imageBase64, mimeType: mimeType } }
                ]),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Gemini Vision timeout')), 60000)
                )
            ]);

            const response = await result.response.text();
            if (response && response.trim().length > 0) {
                console.log('✅ [VISION] Gemini Vision succeeded');
                return response.trim();
            }
            throw new Error('Empty response from Gemini Vision');
        } catch (error) {
            console.error('❌ [VISION] Gemini Vision failed:', error.message);
        }
    }

    // Try OpenRouter Vision (Secondary)
    if (hasOpenRouter) {
        try {
            console.log('\n🟢 [VISION] Attempting OpenRouter Vision...');
            const response = await Promise.race([
                axios.post(
                    'https://openrouter.ai/api/v1/chat/completions',
                    {
                        model: 'google/gemini-2.0-flash-001',
                        messages: [{
                            role: 'user',
                            content: [
                                { type: 'text', text: prompt },
                                { type: 'image_url', image_url: { url: `data:${mimeType};base64,${imageBase64}` } }
                            ]
                        }],
                        temperature: 0.3,
                        max_tokens: 4000
                    },
                    {
                        headers: {
                            Authorization: `Bearer ${OPENROUTER_API_KEY}`,
                            'HTTP-Referer': 'http://localhost:3000',
                            'X-Title': 'ResQAI Layout Analysis'
                        },
                        timeout: 60000
                    }
                ),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('OpenRouter Vision timeout')), 60000)
                )
            ]);

            const content = response.data?.choices?.[0]?.message?.content;
            if (content && content.trim().length > 0) {
                console.log('✅ [VISION] OpenRouter Vision succeeded');
                return content.trim();
            }
            throw new Error('Empty response from OpenRouter Vision');
        } catch (error) {
            console.error('❌ [VISION] OpenRouter Vision failed:', error.message);
        }
    }

    // All vision providers failed
    console.error('🔴 [VISION] All vision providers failed');
    throw new Error('No vision-capable AI provider available. Configure GEMINI_API_KEY or OPENROUTER_API_KEY.');
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
