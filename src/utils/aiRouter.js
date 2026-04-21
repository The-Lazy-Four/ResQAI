// ============================================
// ResQAI - Multi-Provider AI Router
// Ensures AI NEVER fails with smart fallback
// ============================================

import { GoogleGenerativeAI } from '@google/generative-ai';
import Groq from 'groq-sdk';
import axios from 'axios';

// ==================== INITIALIZATION ====================

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const OPENROUTER_PRIMARY_API_KEY = process.env.OPENROUTER_PRIMARY_API_KEY;
const OPENROUTER_SECONDARY_API_KEY = process.env.OPENROUTER_SECONDARY_API_KEY;
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const AI_TIMEOUT = parseInt(process.env.AI_TIMEOUT || '30000');

// Parse Priority Chain
let defaultPriority = ["gemini", "openrouter_primary", "openrouter_secondary", "groq"];
try {
    if (process.env.AI_PROVIDER_PRIORITY) {
        defaultPriority = JSON.parse(process.env.AI_PROVIDER_PRIORITY).filter(p => p !== 'fallback');
    }
} catch (e) {
    console.warn('⚠️ [AI ROUTER] Failed to parse AI_PROVIDER_PRIORITY, using defaults');
}

console.log('\n📋 [AI ROUTER] Environment Variables Check:');
console.log(`   GROQ_API_KEY: ${GROQ_API_KEY ? 'SET' : 'NOT SET'}`);
console.log(`   PRIORITY CHAIN: ${defaultPriority.join(' → ')}`);

// Initialize Gemini
let geminiClient = null;
if (GEMINI_API_KEY && GEMINI_API_KEY.trim()) {
    geminiClient = new GoogleGenerativeAI(GEMINI_API_KEY);
}

// Initialize Groq
let groqClient = null;
if (GROQ_API_KEY && GROQ_API_KEY.trim()) {
    groqClient = new Groq({ apiKey: GROQ_API_KEY });
}

// OpenRouter Check
const hasOpenRouterPrimary = !!(OPENROUTER_PRIMARY_API_KEY && OPENROUTER_PRIMARY_API_KEY.trim());
const hasOpenRouterSecondary = !!(OPENROUTER_SECONDARY_API_KEY && OPENROUTER_SECONDARY_API_KEY.trim());

// ==================== PROVIDERS ====================

async function callGemini(prompt, language = 'en') {
    if (!geminiClient) throw new Error('Gemini not initialized');
    try {
        const model = geminiClient.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-2.5-flash' });
        const result = await Promise.race([
            model.generateContent(prompt),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Gemini timeout')), AI_TIMEOUT))
        ]);
        const response = await result.response.text();
        return response.trim();
    } catch (error) { throw error; }
}

async function callOpenRouter(prompt, apiKey) {
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
                        Authorization: `Bearer ${apiKey}`,
                        'HTTP-Referer': 'http://localhost:3000',
                        'X-Title': 'ResQAI Emergency Response'
                    },
                    timeout: AI_TIMEOUT
                }
            ),
            new Promise((_, reject) => setTimeout(() => reject(new Error('OpenRouter timeout')), AI_TIMEOUT))
        ]);
        const content = response.data?.choices?.[0]?.message?.content;
        if (!content) throw new Error('Empty response');
        return content.trim();
    } catch (error) { throw error; }
}

async function callGroq(prompt) {
    if (!groqClient) throw new Error('Groq not initialized');
    try {
        const model = process.env.GROQ_MODEL || 'llama-3.1-70b-versatile';
        const response = await Promise.race([
            groqClient.chat.completions.create({
                model: model,
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.7,
                max_tokens: 1000
            }),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Groq timeout')), AI_TIMEOUT))
        ]);
        const content = response.choices?.[0]?.message?.content;
        if (!content) throw new Error('Empty response');
        return content.trim();
    } catch (error) { throw error; }
}

async function callFreeAI(prompt) {
    try {
        const response = await axios.post('https://text.pollinations.ai/', {
            messages: [{ role: 'system', content: 'You are ResQAI emergency assistant.' }, { role: 'user', content: prompt }],
            model: 'openai'
        }, { timeout: AI_TIMEOUT });
        if (!response.data) throw new Error('Empty response');
        return response.data.trim();
    } catch (error) { throw error; }
}

// ==================== FALLBACKS ====================

function getFallbackResponse(language = 'en', isVoiceOverride = false) {
    if (isVoiceOverride) {
        const voiceFallbacks = {
            en: "I am having trouble connecting, but please stay safe. Follow the exit signs and dial 112.",
            hi: "कनेक्शन में समस्या है, कृपया सुरक्षित रहें। निकास चिह्नों का पालन करें और 112 डायल करें।",
            bn: "সংযোগ করতে সমস্যা হচ্ছে, দয়া করে নিরাপদ থাকুন। এক্সিট চিহ্ন অনুসরণ করুন এবং ১১২ ডায়াল করুন।"
        };
        return voiceFallbacks[language] || voiceFallbacks.en;
    }
    return "Emergency Response Offline. Please call 112 immediately.";
}

// ==================== MAIN ROUTER ====================

let lastAIUsageReport = null;

export async function generateAIResponse(prompt, language = 'en', isVoiceOverride = false, priorityProvider = null) {
    const startTime = Date.now();
    const errors = [];

    const allProviders = {
        'gemini': { name: 'Gemini', active: !!geminiClient, call: (p) => callGemini(p, language) },
        'openrouter_primary': { name: 'OpenRouter-P', active: hasOpenRouterPrimary, call: (p) => callOpenRouter(p, OPENROUTER_PRIMARY_API_KEY) },
        'openrouter_secondary': { name: 'OpenRouter-S', active: hasOpenRouterSecondary, call: (p) => callOpenRouter(p, OPENROUTER_SECONDARY_API_KEY) },
        'groq': { name: 'Groq', active: !!groqClient, call: (p) => callGroq(p) }
    };

    let chain = defaultPriority.filter(id => allProviders[id]).map(id => allProviders[id]);

    if (priorityProvider) {
        const pId = priorityProvider.toLowerCase();
        const pIdx = chain.findIndex(p => p.name.toLowerCase().includes(pId));
        if (pIdx > -1) {
            chain.unshift(chain.splice(pIdx, 1)[0]);
        } else if (allProviders[pId]?.active) {
            chain.unshift(allProviders[pId]);
        }
    }

    console.log(`🧠 [AI ROUTER] Chain: ${chain.map(p => p.name).join(' → ')}`);

    for (const provider of chain) {
        if (!provider.active) continue;
        try {
            console.log(`🤖 Attempting ${provider.name}...`);
            const startCall = Date.now();
            const response = await provider.call(prompt);
            const callTime = Date.now() - startCall;
            console.log(`✅ ${provider.name} success (${callTime}ms)`);
            
            lastAIUsageReport = { provider: provider.name, responseTime: callTime };
            return response;
        } catch (error) {
            console.error(`❌ ${provider.name} failed:`, error.message);
            errors.push(`${provider.name}: ${error.message}`);
        }
    }

    try {
        console.log('🤖 Attempting Free AI...');
        const response = await callFreeAI(prompt);
        return response;
    } catch (e) {
        console.error('❌ All providers failed');
        return getFallbackResponse(language, isVoiceOverride);
    }
}

export function getAIRouterStatus() {
    return {
        gemini: !!geminiClient,
        openrouter_primary: hasOpenRouterPrimary,
        openrouter_secondary: hasOpenRouterSecondary,
        groq: !!groqClient,
        availableProviders: defaultPriority.filter(id => {
            const p = { gemini: !!geminiClient, openrouter_primary: hasOpenRouterPrimary, openrouter_secondary: hasOpenRouterSecondary, groq: !!groqClient };
            return p[id];
        })
    };
}

export function getLastAIUsageReport() {
    return lastAIUsageReport;
}

export async function testGroqProvider(prompt, language = 'en') {
    return await callGroq(prompt);
}
