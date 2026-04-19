// ============================================================
// ResQAI Voice Call System
// AI-powered emergency calls in English, Hindi, Bangla
// Uses Web Speech API (TTS + STT) + Claude API for intelligence
// ============================================================

window.ResQAICall = class AICallSystem {
    constructor(options = {}) {
        this.lang = options.lang || "en";
        this.incident = options.incident || null;
        this.guestName = options.guestName || "Guest";
        this.onTranscript = options.onTranscript || (() => { });
        this.onEnd = options.onEnd || (() => { });
        this.onStatus = options.onStatus || (() => { });

        this.conversation = [];  // {role, content}[]
        this.isListening = false;
        this.isSpeaking = false;
        this.isActive = false;
        this.recognition = null;
        this.synth = window.speechSynthesis;
        this.callDuration = 0;
        this.callTimer = null;

        // Position tracking
        this.currentPosition = options.position || { floor: 1, room: "101", zone: "Unknown" };
        this.positionWatcher = null;
    }

    // ── Start Call ────────────────────────────────────────────
    async start() {
        this.isActive = true;
        this._startTimer();
        this._watchPosition();
        this.onStatus("connecting");

        // Short connecting delay for realism
        await this._sleep(1200);
        this.onStatus("connected");

        // Opening message
        const opening = this._getOpeningMessage();
        this.conversation.push({ role: "assistant", content: opening });
        this.onTranscript("AI", opening);
        await this._speak(opening);
        this._listen();
    }

    // ── End Call ──────────────────────────────────────────────
    end() {
        this.isActive = false;
        this._stopTimer();
        this._stopListening();
        this.synth.cancel();
        if (this.positionWatcher !== null) {
            navigator.geolocation?.clearWatch(this.positionWatcher);
        }
        this.onStatus("ended");
        this.onEnd(this.conversation);
    }

    // ── Text-to-Speech ────────────────────────────────────────
    _speak(text) {
        return new Promise(resolve => {
            if (!this.isActive) { resolve(); return; }
            this.synth.cancel();
            this.isSpeaking = true;
            this.onStatus("speaking");

            const utt = new SpeechSynthesisUtterance(text);
            utt.lang = ResQConfig.ttsLang[this.lang] || "en-US";
            utt.rate = 0.92;
            utt.pitch = 1.0;
            utt.volume = 1.0;

            // Pick appropriate voice
            const voices = this.synth.getVoices();
            const langCode = utt.lang.split("-")[0];
            const preferred = voices.find(v => v.lang.startsWith(utt.lang)) ||
                voices.find(v => v.lang.startsWith(langCode)) ||
                voices[0];
            if (preferred) utt.voice = preferred;

            utt.onend = () => { this.isSpeaking = false; resolve(); };
            utt.onerror = () => { this.isSpeaking = false; resolve(); };
            this.synth.speak(utt);

            // Fallback in case onend doesn't fire (some browsers)
            const maxDuration = Math.max(3000, text.length * 80);
            setTimeout(() => { if (this.isSpeaking) { this.isSpeaking = false; resolve(); } }, maxDuration);
        });
    }

    // ── Speech Recognition ────────────────────────────────────
    _listen() {
        if (!this.isActive) return;
        const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRec) {
            // Fallback: text input mode
            this.onStatus("text-input");
            return;
        }

        this.recognition = new SpeechRec();
        this.recognition.lang = ResQConfig.sttLang[this.lang] || "en-US";
        this.recognition.continuous = false;
        this.recognition.interimResults = false;
        this.recognition.maxAlternatives = 1;
        this.isListening = true;
        this.onStatus("listening");

        this.recognition.onresult = async (e) => {
            const transcript = e.results[0][0].transcript.trim();
            if (!transcript || !this.isActive) return;

            this.isListening = false;
            this.onStatus("processing");
            this.onTranscript("Guest", transcript);
            this.conversation.push({ role: "user", content: transcript });
            await this._processAndRespond(transcript);
        };

        this.recognition.onerror = (e) => {
            this.isListening = false;
            if (this.isActive && e.error !== "aborted") {
                this.onStatus("listening-error");
                setTimeout(() => this._listen(), 1500);
            }
        };

        this.recognition.onend = () => {
            this.isListening = false;
            if (this.isActive && !this.isSpeaking) {
                setTimeout(() => this._listen(), 800);
            }
        };

        try { this.recognition.start(); }
        catch { setTimeout(() => this._listen(), 2000); }
    }

    _stopListening() {
        this.isListening = false;
        try { this.recognition?.stop(); } catch { }
    }

    // ── AI Response via Claude API ────────────────────────────
    async _processAndRespond(userText) {
        const response = await this._callClaude(userText);
        if (!this.isActive) return;

        this.conversation.push({ role: "assistant", content: response });
        this.onTranscript("AI", response);
        await this._speak(response);
        if (this.isActive) this._listen();
    }

    async _callClaude(userMessage) {
        const apiKey = ResQConfig.claudeApiKey;
        if (!apiKey) return this._fallbackResponse(userMessage);

        const pos = this.currentPosition;
        const systemPrompt = ResQConfig.aiPrompts[this.lang] +
            `\n\nCURRENT GUEST CONTEXT:\n- Name: ${this.guestName}\n- Floor: ${pos.floor}\n- Room/Zone: ${pos.room || pos.zone}\n- Emergency type: ${this.incident?.issueType || "unknown"}\n- Coordinates: ${pos.lat ? `${pos.lat.toFixed(4)}, ${pos.lon.toFixed(4)}` : "GPS unavailable"}\n- Time: ${new Date().toLocaleTimeString()}\n\nRespond in ${this.lang === 'en' ? 'English' : this.lang === 'hi' ? 'Hindi' : 'Bengali'} only. Max 3 sentences.`;

        try {
            const resp = await fetch("https://api.anthropic.com/v1/messages", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    model: "claude-sonnet-4-20250514",
                    max_tokens: 200,
                    system: systemPrompt,
                    messages: this.conversation.slice(-8) // last 4 exchanges
                })
            });
            if (!resp.ok) throw new Error(`API ${resp.status}`);
            const data = await resp.json();
            return data.content?.[0]?.text?.trim() || this._fallbackResponse(userMessage);
        } catch (err) {
            console.warn("Claude API error:", err);
            return this._fallbackResponse(userMessage);
        }
    }

    _fallbackResponse(userText) {
        const responses = {
            en: [
                "I understand, please stay calm. Help is being dispatched to your location right now. Are you in a safe position?",
                "Our security team has been alerted and is heading to you. Please stay where you are and keep this line open.",
                "I can see your location. Please move to the nearest corridor and wait for our security officer to reach you.",
                "Emergency services have been notified. Keep calm and follow the emergency exit signs if you need to evacuate.",
                "Help is on the way. Please stay on the line and let me know if your situation changes."
            ],
            hi: [
                "मैं समझता हूँ, कृपया शांत रहें। मदद अभी आपके स्थान पर भेजी जा रही है। क्या आप सुरक्षित हैं?",
                "हमारी सुरक्षा टीम को सूचित कर दिया गया है और वे आपकी ओर आ रहे हैं। जहाँ हैं वहीं रहें।",
                "मैं आपका स्थान देख सकता हूँ। नजदीकी गलियारे में जाएं और सुरक्षाकर्मी का इंतजार करें।",
                "आपातकालीन सेवाओं को सूचित किया गया है। शांत रहें और यदि जरूरी हो तो निकास चिह्नों का पालन करें।",
                "मदद आ रही है। लाइन पर रहें और अगर स्थिति बदले तो बताएं।"
            ],
            bn: [
                "আমি বুঝতে পারছি, শান্ত থাকুন। সাহায্য এখনই আপনার কাছে পাঠানো হচ্ছে। আপনি কি নিরাপদ আছেন?",
                "আমাদের নিরাপত্তা দলকে জানানো হয়েছে এবং তারা আসছেন। আপনি যেখানে আছেন সেখানে থাকুন।",
                "আমি আপনার অবস্থান দেখতে পাচ্ছি। নিকটস্থ করিডোরে যান এবং নিরাপত্তা কর্মীর জন্য অপেক্ষা করুন।",
                "জরুরী সেবা জানানো হয়েছে। শান্ত থাকুন এবং প্রয়োজনে ইমার্জেন্সি এক্সিট চিহ্ন অনুসরণ করুন।",
                "সাহায্য আসছে। লাইনে থাকুন এবং পরিস্থিতি পরিবর্তন হলে জানান।"
            ]
        };
        const arr = responses[this.lang] || responses.en;
        return arr[Math.floor(Math.random() * arr.length)];
    }

    // ── Text message (for STT fallback) ──────────────────────
    async sendText(text) {
        if (!this.isActive || !text.trim()) return;
        this.onTranscript("Guest", text);
        this.conversation.push({ role: "user", content: text });
        this.onStatus("processing");
        await this._processAndRespond(text);
    }

    // ── GPS position tracking ─────────────────────────────────
    _watchPosition() {
        if (!navigator.geolocation) return;
        this.positionWatcher = navigator.geolocation.watchPosition(
            (pos) => {
                this.currentPosition = {
                    ...this.currentPosition,
                    lat: pos.coords.latitude,
                    lon: pos.coords.longitude,
                    accuracy: pos.coords.accuracy
                };
                // Update realtime system
                const session = ResQAuth?.getSession();
                if (session) {
                    ResQAuth.updatePosition({
                        lat: pos.coords.latitude,
                        lon: pos.coords.longitude,
                        accuracy: pos.coords.accuracy
                    });
                }
            },
            (err) => { console.warn("GPS:", err.message); },
            { enableHighAccuracy: true, timeout: 5000, maximumAge: 2000 }
        );
    }

    // ── Switch language mid-call ──────────────────────────────
    switchLanguage(lang) {
        this.lang = lang;
        this._stopListening();
        this.synth.cancel();
        this.isSpeaking = false;
        const msg = { en: "Switching to English.", hi: "हिंदी में बदल रहे हैं।", bn: "বাংলায় পরিবর্তন করছি।" };
        this._speak(msg[lang] || msg.en).then(() => this._listen());
    }

    // ── Timer ─────────────────────────────────────────────────
    _startTimer() {
        this.callDuration = 0;
        this.callTimer = setInterval(() => { this.callDuration++; }, 1000);
    }
    _stopTimer() {
        clearInterval(this.callTimer);
    }
    getCallDuration() {
        const m = Math.floor(this.callDuration / 60).toString().padStart(2, "0");
        const s = (this.callDuration % 60).toString().padStart(2, "0");
        return `${m}:${s}`;
    }

    // ── Utility ───────────────────────────────────────────────
    _getOpeningMessage() {
        const msgs = ResQConfig.openingMessages[this.lang];
        return msgs?.[this.incident?.issueType] || msgs?.other || "ResQ AI here — emergency received. How can I help?";
    }
    _sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

    // Update position from map/floor
    updatePosition(pos) {
        this.currentPosition = { ...this.currentPosition, ...pos };
    }
};