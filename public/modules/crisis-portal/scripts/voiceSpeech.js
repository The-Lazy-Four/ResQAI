// ============================================================
// ResQAI Crisis Portal — Voice & Siren System
// voiceSpeech.js
// ============================================================

(function () {
    'use strict';

    // Audio context (lazy init to satisfy autoplay policy)
    let _audioCtx = null;
    let _sirenNodes = null;
    let _sirenActive = false;
    let _speechQueue = [];
    let _speaking = false;

    const SUPPORTED = typeof window !== 'undefined' && 'speechSynthesis' in window;

    // Emergency keywords that get repeated for emphasis
    const CRITICAL_PHRASES = [
        'evacuate immediately',
        'call 112',
        'call 911',
        'call 101',
        'call 108',
        'do not use elevator',
        'stay low',
        'drop cover hold',
        'move to higher ground',
        'leave the building',
        'get out now',
    ];

    // Per-type voice profiles
    const VOICE_PROFILES = {
        fire: { rate: 0.92, pitch: 1.1, volume: 1.0 },
        medical: { rate: 0.88, pitch: 0.95, volume: 1.0 },
        flood: { rate: 0.90, pitch: 1.0, volume: 1.0 },
        quake: { rate: 0.88, pitch: 0.9, volume: 1.0 },
        safety: { rate: 0.90, pitch: 1.05, volume: 1.0 },
        child: { rate: 0.88, pitch: 1.1, volume: 1.0 },
        theft: { rate: 0.90, pitch: 1.0, volume: 1.0 },
        other: { rate: 0.90, pitch: 1.0, volume: 1.0 },
        sos: { rate: 0.85, pitch: 1.15, volume: 1.0 },
    };

    // Opening announcement per type
    const TYPE_ANNOUNCEMENTS = {
        fire: 'Fire emergency alert.',
        medical: 'Medical emergency alert.',
        flood: 'Flood emergency alert.',
        quake: 'Earthquake emergency alert.',
        safety: 'Safety emergency alert.',
        child: 'Child safety emergency alert.',
        theft: 'Security alert.',
        other: 'Emergency alert.',
        sos: 'S.O.S. activated. Emergency services have been notified.',
    };

    function getAudioContext() {
        if (!_audioCtx) {
            const Ctor = window.AudioContext || window.webkitAudioContext;
            if (!Ctor) return null;
            _audioCtx = new Ctor();
        }
        if (_audioCtx.state === 'suspended') {
            _audioCtx.resume().catch(() => { });
        }
        return _audioCtx;
    }

    // Build oscillator-based wailing siren (no external file needed)
    function _buildSiren(ctx) {
        const masterGain = ctx.createGain();
        masterGain.gain.setValueAtTime(0.0, ctx.currentTime);
        masterGain.gain.linearRampToValueAtTime(0.45, ctx.currentTime + 0.05);
        masterGain.connect(ctx.destination);

        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const oscGain1 = ctx.createGain();
        const oscGain2 = ctx.createGain();

        osc1.type = 'sawtooth';
        osc2.type = 'square';
        oscGain1.gain.value = 0.6;
        oscGain2.gain.value = 0.25;

        osc1.connect(oscGain1);
        osc2.connect(oscGain2);
        oscGain1.connect(masterGain);
        oscGain2.connect(masterGain);

        // Wail: sweep 700 Hz -> 1100 Hz -> 700 Hz every 1.2 s
        const now = ctx.currentTime;
        const wailDuration = 1.2;
        const cycles = 60;

        for (let i = 0; i < cycles; i++) {
            const t = now + i * wailDuration;
            osc1.frequency.setValueAtTime(700, t);
            osc1.frequency.linearRampToValueAtTime(1100, t + wailDuration * 0.5);
            osc1.frequency.linearRampToValueAtTime(700, t + wailDuration);

            osc2.frequency.setValueAtTime(440, t);
            osc2.frequency.linearRampToValueAtTime(660, t + wailDuration * 0.5);
            osc2.frequency.linearRampToValueAtTime(440, t + wailDuration);
        }

        osc1.start(now);
        osc2.start(now);

        return { osc1, osc2, masterGain };
    }

    function playSiren() {
        if (_sirenActive) return;
        const ctx = getAudioContext();
        if (!ctx) return;

        _sirenActive = true;
        _sirenNodes = _buildSiren(ctx);
    }

    function _stopSiren() {
        if (!_sirenNodes || !_sirenActive) return;
        const ctx = getAudioContext();
        if (!ctx) return;

        const { osc1, osc2, masterGain } = _sirenNodes;
        const now = ctx.currentTime;

        masterGain.gain.cancelScheduledValues(now);
        masterGain.gain.setValueAtTime(masterGain.gain.value, now);
        masterGain.gain.linearRampToValueAtTime(0.0, now + 0.3);

        setTimeout(() => {
            try { osc1.stop(); } catch (_) { }
            try { osc2.stop(); } catch (_) { }
            _sirenNodes = null;
            _sirenActive = false;
        }, 350);
    }

    function _cleanText(text) {
        return text
            .replace(/\*\*(.*?)\*\*/g, '$1')
            .replace(/[🔥🚑🌊🌍🚔🆘👶⚡🚨📞⏳✅❌⚠️]/gu, '')
            .replace(/\n{2,}/g, '. ')
            .replace(/\n/g, '. ')
            .replace(/\s{2,}/g, ' ')
            .trim();
    }

    function _extractCriticalLines(text) {
        const lines = text.split(/[.\n]/).map((l) => l.trim()).filter(Boolean);

        return lines.filter((line) => {
            const l = line.toLowerCase();
            return CRITICAL_PHRASES.some((phrase) => l.includes(phrase));
        });
    }

    function _utterance(text, profile = {}, onEnd = null) {
        if (!SUPPORTED || !text.trim()) {
            if (onEnd) onEnd();
            return null;
        }

        const u = new SpeechSynthesisUtterance(text);
        u.lang = 'en-US';
        u.rate = profile.rate ?? 0.90;
        u.pitch = profile.pitch ?? 1.0;
        u.volume = profile.volume ?? 1.0;

        const voices = window.speechSynthesis.getVoices();
        const preferred = voices.find((v) =>
            v.lang.startsWith('en') && /google|samantha|alex|zira|david/i.test(v.name)
        ) || voices.find((v) => v.lang.startsWith('en'));
        if (preferred) u.voice = preferred;

        if (onEnd) u.onend = onEnd;
        u.onerror = () => { if (onEnd) onEnd(); };

        return u;
    }

    function _drainQueue() {
        if (_speaking || _speechQueue.length === 0) return;
        _speaking = true;

        const { text, profile, onEnd } = _speechQueue.shift();
        const u = _utterance(text, profile, () => {
            _speaking = false;
            if (onEnd) onEnd();
            _drainQueue();
        });

        if (u) {
            window.speechSynthesis.speak(u);
        } else {
            _speaking = false;
            if (onEnd) onEnd();
            _drainQueue();
        }
    }

    function _enqueue(text, profile, onEnd) {
        _speechQueue.push({ text, profile, onEnd });
        _drainQueue();
    }

    function speak(text, options = {}) {
        if (!SUPPORTED) return;
        const cleaned = _cleanText(String(text || ''));
        if (!cleaned) return;

        _enqueue(cleaned, {
            rate: options.rate ?? 0.90,
            pitch: options.pitch ?? 1.0,
            volume: options.volume ?? 1.0,
        }, options.onEnd || null);
    }

    function speakEmergency(type, message) {
        if (!SUPPORTED) return;

        const safeType = (type || 'other').toLowerCase();
        const profile = VOICE_PROFILES[safeType] || VOICE_PROFILES.other;
        const announce = TYPE_ANNOUNCEMENTS[safeType] || TYPE_ANNOUNCEMENTS.other;
        const cleaned = _cleanText(String(message || ''));

        playSiren();

        _enqueue(announce, { ...profile, pitch: profile.pitch + 0.1 }, null);

        _enqueue(cleaned, profile, () => {
            _stopSiren();

            const critical = _extractCriticalLines(cleaned);
            if (critical.length > 0) {
                const repeatCount = Math.min(critical.length, 3);
                for (let i = 0; i < repeatCount; i++) {
                    _enqueue(critical[i], {
                        ...profile,
                        rate: (profile.rate || 0.90) - 0.05,
                        pitch: (profile.pitch || 1.0) + 0.05,
                    }, null);
                }
            }
        });
    }

    function handleAIResponse(text, type) {
        if (!text) return;
        speakEmergency(type || 'other', text);
    }

    function stopAllAudio() {
        if (SUPPORTED) {
            window.speechSynthesis.cancel();
        }
        _speechQueue = [];
        _speaking = false;

        _stopSiren();
    }

    if (SUPPORTED) {
        window.speechSynthesis.getVoices();
        if (typeof window.speechSynthesis.onvoiceschanged !== 'undefined') {
            window.speechSynthesis.onvoiceschanged = () => {
                window.speechSynthesis.getVoices();
            };
        }
    }

    window.VoiceSystem = {
        speak,
        speakEmergency,
        handleAIResponse,
        stopAllAudio,
        playSiren,
    };
})();
