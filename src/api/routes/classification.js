// ============================================
// ResQAI - Emergency Classification (Multi-Provider AI)
// ============================================

import express from 'express';
import { getSystemPrompt, isValidLanguage } from '../../utils/languages.js';
import { generateAIResponse, getAIRouterStatus, getLastAIUsageReport } from '../../utils/aiRouter.js';

const router = express.Router();

// Emergency classification types
const EMERGENCY_TYPES = ['fire', 'flood', 'medical', 'accident', 'other'];

// ==================== 🔥 RISK PREDICTION SYSTEM ====================
// This is our USP - AI-powered risk analysis
function analyzeRisks(description, emergencyType) {
    const lower = description.toLowerCase();
    const risks = {
        flood_risk: 0,
        fire_risk: 0,
        accident_risk: 0,
        medical_risk: 0
    };

    // Flood risk indicators
    const floodIndicators = ['flood', 'rain', 'water', 'river', 'dam', 'barish', 'nadi', 'barsat'];
    const floodKeywordCount = floodIndicators.filter(k => lower.includes(k)).length;
    risks.flood_risk = Math.min(100, floodKeywordCount * 20);

    // Fire risk indicators
    const fireIndicators = ['fire', 'smoke', 'burn', 'industrial', 'factory', 'electrical', 'aag'];
    const fireKeywordCount = fireIndicators.filter(k => lower.includes(k)).length;
    risks.fire_risk = Math.min(100, fireKeywordCount * 20);

    // Accident risk indicators
    const accidentIndicators = ['accident', 'crash', 'collision', 'vehicle', 'highway', 'road'];
    const accidentKeywordCount = accidentIndicators.filter(k => lower.includes(k)).length;
    risks.accident_risk = Math.min(100, accidentKeywordCount * 20);

    // Medical risk indicators
    const medicalIndicators = ['injured', 'hurt', 'bleeding', 'unconscious', 'medical', 'chot', 'dard'];
    const medicalKeywordCount = medicalIndicators.filter(k => lower.includes(k)).length;
    risks.medical_risk = Math.min(100, medicalKeywordCount * 20);

    // Current type boost
    if (emergencyType === 'flood') risks.flood_risk += 25;
    if (emergencyType === 'fire') risks.fire_risk += 25;
    if (emergencyType === 'accident') risks.accident_risk += 25;
    if (emergencyType === 'medical') risks.medical_risk += 25;

    return risks;
}

function generateAIPredictions(description, riskScores) {
    const predictions = [];

    if (riskScores.flood_risk > 60) {
        predictions.push({
            icon: '⚠️',
            level: 'HIGH',
            text: `Flood risk detected in affected area (${Math.round(riskScores.flood_risk)}%)`,
            color: 'blue'
        });
    }

    if (riskScores.fire_risk > 60) {
        predictions.push({
            icon: '🔥',
            level: 'HIGH',
            text: `Fire risk escalation detected (${Math.round(riskScores.fire_risk)}%)`,
            color: 'red'
        });
    }

    if (riskScores.accident_risk > 60) {
        predictions.push({
            icon: '⚡',
            level: 'MEDIUM',
            text: `Accident-prone zone identified (${Math.round(riskScores.accident_risk)}%)`,
            color: 'orange'
        });
    }

    if (riskScores.medical_risk > 60) {
        predictions.push({
            icon: '🚑',
            level: 'HIGH',
            text: `Medical emergency detected (${Math.round(riskScores.medical_risk)}%)`,
            color: 'green'
        });
    }

    return predictions;
}

// Classification suggestions (API-generated only)
const SUGGESTIONS = {
    fire: '🔥 Fire Emergency: Evacuate all people immediately',
    flood: '💧 Flood Alert: Move to higher ground immediately',
    medical: '🚑 Medical Emergency: Call 108 (Ambulance) or 112 immediately',
    accident: '🚨 Traffic Accident: Check for injuries immediately',
    other: '🆘 Emergency Response: Call 112 for assistance'
};

// ==================== CLASSIFICATION USING MULTI-PROVIDER AI ====================

export async function classifyEmergency(description, language = 'en') {
    console.log('\n🔍 [CLASSIFY] Emergency classification request');
    console.log('🌐 Language:', language);
    console.log('   Description:', description.substring(0, 80));

    // Validate language
    if (!isValidLanguage(language)) {
        console.warn(`⚠️  Invalid language "${language}", defaulting to English`);
        language = 'en';
    }

    try {
        const systemPrompt = getSystemPrompt(language);

        const prompt = `${systemPrompt}

SPECIAL INSTRUCTION FOR CLASSIFICATION:
You must classify this emergency report and return structured action plan as JSON.

Emergency report: "${description}"

Return ONLY valid JSON in this format - no other text:
{
  "type": "fire|flood|medical|accident|other",
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation in ${language}",
  "immediate_actions": ["action 1", "action 2", "action 3"],
  "step_by_step": ["step 1 with details", "step 2 with details", "step 3 with details"],
  "prevention_tips": ["tip 1", "tip 2", "tip 3"]
}

Return ONLY the JSON object, nothing else.`;

        console.log('📡 Sending to multi-provider AI router...');

        // Use the multi-provider AI router
        const responseText = await generateAIResponse(prompt, language);

        // Get the AI usage report
        const aiUsageReport = getLastAIUsageReport();

        console.log('\n═══════════════════════════════════════════════════════════');
        console.log('🤖 AI USAGE REPORT FOR CLASSIFICATION:');
        if (aiUsageReport) {
            console.log(`   Provider: ${aiUsageReport.provider}`);
            console.log(`   Fallback: ${aiUsageReport.fallback ? 'YES ⚠️' : 'NO ✅ (Live AI)'}`);
            console.log(`   Response Time: ${aiUsageReport.responseTime}ms`);
            console.log(`   Response Type: ${aiUsageReport.type}`);
        } else {
            console.log('   Report: Unavailable');
        }
        console.log('═══════════════════════════════════════════════════════════\n');

        // Validate response is not empty
        if (!responseText || responseText.trim().length === 0) {
            throw new Error('Empty response from AI');
        }

        // Parse JSON response - strip code fence markers
        const cleanText = responseText.replace(/```json\n?|\n?```/g, '').trim();
        
        // Validate JSON can be parsed
        let parsed;
        try {
            parsed = JSON.parse(cleanText);
        } catch (parseError) {
            console.error('JSON PARSE ERROR:', parseError.message);
            throw new Error(`Invalid JSON from AI: ${parseError.message}`);
        }

        console.log(`📊 Parsed - Type: ${parsed.type}, Confidence: ${parsed.confidence}`);

        // Ensure valid type
        if (!EMERGENCY_TYPES.includes(parsed.type)) {
            console.warn(`⚠️  Invalid type "${parsed.type}", defaulting to "other"`);
            parsed.type = 'other';
        }

        // Clamp confidence
        parsed.confidence = Math.max(0, Math.min(1, parseFloat(parsed.confidence) || 0.5));

        // Generate predictions (rule-based analysis of the description)
        const risks = analyzeRisks(description, parsed.type);
        const predictions = generateAIPredictions(description, risks);

        // Structure with AI-generated plans
        const result_obj = {
            type: parsed.type,
            confidence: parsed.confidence,
            reasoning: parsed.reasoning || 'Emergency classified by AI',
            immediate_actions: parsed.immediate_actions || ['Call 112', 'Evacuate area', 'Ensure safety'],
            step_by_step: parsed.step_by_step || ['Step 1', 'Step 2', 'Step 3'],
            prevention_tips: parsed.prevention_tips || ['Prevention tip 1', 'Prevention tip 2'],
            ai_predictions: predictions,
            risk_scores: risks,
            language: language
        };

        console.log('✨ Classification complete');
        return result_obj;
    } catch (error) {
        console.error('\n⚠️  AI CLASSIFICATION FAILED:', error.message);
        console.log('📋 Using heuristic-based fallback...');
        return getHeuristicClassification(description, language);
    }
}

// ==================== FALLBACK HEURISTIC CLASSIFICATION ====================

function getHeuristicClassification(description, language = 'en') {
    console.log('🧠 Using heuristic-based classification (AI offline)');

    // Simple heuristic-based classification as fallback
    let fallbackType = 'other';
    const descLower = description.toLowerCase();

    if (descLower.includes('fire') || descLower.includes('burn') || descLower.includes('flame')) {
        fallbackType = 'fire';
    } else if (descLower.includes('flood') || descLower.includes('water') || descLower.includes('rain')) {
        fallbackType = 'flood';
    } else if (descLower.includes('medical') || descLower.includes('injured') || descLower.includes('sick')) {
        fallbackType = 'medical';
    } else if (descLower.includes('accident') || descLower.includes('crash') || descLower.includes('collision')) {
        fallbackType = 'accident';
    }

    const fallbackPlans = {
        fire: {
            immediate_actions: ['Alert everyone nearby', 'Evacuate immediately', 'Call 102 (Fire)'],
            step_by_step: ['Activate fire alarm if available', 'Use nearest exit', 'Move to safe assembly point', 'Never use elevators'],
            prevention_tips: ['Keep fire exits clear', 'Know evacuation routes', 'Maintain fire extinguishers', 'Install smoke detectors']
        },
        flood: {
            immediate_actions: ['Move to higher ground', 'Avoid flooded areas', 'Call 112'],
            step_by_step: ['Turn off utilities if safe', 'Gather important documents', 'Move to elevated location', 'Wait for assistance'],
            prevention_tips: ['Know flood-prone areas', 'Maintain drainage systems', 'Store supplies high', 'Plan evacuation route']
        },
        medical: {
            immediate_actions: ['Check responsiveness', 'Call 101 (Ambulance)', 'Start CPR if trained'],
            step_by_step: ['Clear airway', 'Give CPR if needed', 'Place in recovery position', 'Monitor vital signs'],
            prevention_tips: ['Learn first aid', 'Keep medical kit handy', 'Know emergency numbers', 'Stay calm and alert']
        },
        accident: {
            immediate_actions: ['Move to safety', 'Call 100 (Police)', 'Check for injuries'],
            step_by_step: ['Turn off ignition', 'Move away from traffic', 'Document details', 'Seek medical help if needed'],
            prevention_tips: ['Follow traffic rules', 'Avoid distractions', 'Maintain vehicle', 'Wear seatbelt']
        },
        other: {
            immediate_actions: ['Ensure your safety', 'Call 112 (Emergency)', 'Alert nearby help'],
            step_by_step: ['Move to safe location', 'Provide location details', 'Stay calm', 'Wait for help'],
            prevention_tips: ['Know emergency numbers', 'Stay alert', 'Keep phone charged', 'Know your location']
        }
    };

    const plan = fallbackPlans[fallbackType] || fallbackPlans.other;

    console.log(`✅ Fallback classification result: ${fallbackType}`);
    return {
        type: fallbackType,
        confidence: 0.5,
        reasoning: 'AI system offline - heuristic classification used',
        immediate_actions: plan.immediate_actions,
        step_by_step: plan.step_by_step,
        prevention_tips: plan.prevention_tips,
        ai_predictions: [],
        risk_scores: { fire_risk: 0, flood_risk: 0, medical_risk: 0, accident_risk: 0 },
        language: language
    };
}

// ==================== CLASSIFICATION ROUTER ====================

router.post('/', async (req, res) => {
    try {
        const { text, language = 'en' } = req.body;

        if (!text) {
            console.warn('❌ Empty text for classification');
            return res.status(400).json({
                success: false,
                error: 'AI service unavailable',
                message: 'Text to classify is required'
            });
        }

        console.log('\n📨 [CLASSIFICATION ROUTE] Request received');

        const result = await classifyEmergency(text, language);
        console.log('✅ [CLASSIFICATION ROUTE] Sending response to client\n');

        res.json({
            success: true,
            classification: result
        });
    } catch (error) {
        console.error('\n🔴 [ROUTE] Unhandled error:', error.message);
        res.status(500).json({
            success: false,
            error: 'AI service unavailable',
            message: 'Error classifying emergency',
            details: error.message
        });
    }
});

export default router;
