// ============================================
// ResQAI - Voice API Routes (Speech Recognition & TTS)
// ============================================

import express from 'express';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// ==================== TEXT-TO-SPEECH ====================
// Uses Web Speech API on frontend (browser-native)
// This endpoint prepares audio metadata for frontend TTS

router.post('/speak', async (req, res) => {
    try {
        const { text, language = 'en' } = req.body;

        if (!text || text.trim().length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Text is required for speech synthesis'
            });
        }

        console.log('🔊 [TTS] Text-to-speech request');
        console.log(`   Language: ${language}`);
        console.log(`   Text length: ${text.length} characters`);

        // Send back metadata for frontend to handle TTS
        res.json({
            success: true,
            id: uuidv4(),
            text: text.substring(0, 500), // Limit speech length
            language: language,
            instructions: 'Use Web Speech API (browser native)',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ TTS Error:', error.message);
        res.status(500).json({
            success: false,
            error: 'Voice synthesis failed',
            message: error.message
        });
    }
});

// ==================== SPEECH-TO-TEXT ====================
// Receives audio blob from frontend, simulates transcription
// Frontend sends base64 or blob, server acknowledges and processes meta

router.post('/transcribe', async (req, res) => {
    try {
        const { audio, language = 'en' } = req.body;

        if (!audio) {
            return res.status(400).json({
                success: false,
                error: 'Audio data is required'
            });
        }

        console.log('🎤 [STT] Speech-to-text request');
        console.log(`   Language: ${language}`);
        console.log(`   Audio size: ${audio.length} bytes`);

        // In production, send to Google Cloud Speech-to-Text API
        // For now, return acknowledgment for frontend to show processing
        // Frontend will use Web Speech API (browser-native) for actual recognition

        res.json({
            success: true,
            id: uuidv4(),
            status: 'processing',
            language: language,
            instructions: 'Use Web Speech API (browser native)',
            callback: '/api/voice/transcribe-callback',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ STT Error:', error.message);
        res.status(500).json({
            success: false,
            error: 'Speech recognition failed',
            message: error.message
        });
    }
});

// ==================== TRANSCRIPTION CALLBACK ====================
// Frontend sends recognized text here after Web Speech API processing

router.post('/transcribe-callback', async (req, res) => {
    try {
        const { transcript, language = 'en', confidence = 0 } = req.body;

        if (!transcript || transcript.trim().length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Transcript is required'
            });
        }

        console.log('✅ [STT] Transcription received from frontend');
        console.log(`   Transcript: "${transcript.substring(0, 100)}..."`);
        console.log(`   Confidence: ${confidence.toFixed(2)}`);
        console.log(`   Language: ${language}`);

        res.json({
            success: true,
            transcript: transcript,
            language: language,
            confidence: confidence,
            ready_for_chat: true,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ Callback Error:', error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to process transcription',
            message: error.message
        });
    }
});

export default router;
