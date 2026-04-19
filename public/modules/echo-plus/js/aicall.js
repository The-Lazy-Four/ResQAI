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
        this.onAlertAdmin = options.onAlertAdmin || null;

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

            const conf = window.ECHO_CONFIG?.aiCall || {};
            const utt = new SpeechSynthesisUtterance(text);
            utt.lang = conf.ttsLang?.[this.lang] || "en-US";
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

            // Fallback
            const maxDuration = Math.max(3000, text.length * 80);
            setTimeout(() => { if (this.isSpeaking) { this.isSpeaking = false; resolve(); } }, maxDuration);
        });
    }

    // ── Speech Recognition ────────────────────────────────────
    _listen() {
        if (!this.isActive) return;
        const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRec) {
            this.onStatus("text-input");
            return;
        }

        const conf = window.ECHO_CONFIG?.aiCall || {};
        this.recognition = new SpeechRec();
        this.recognition.lang = conf.sttLang?.[this.lang] || "en-US";
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.maxAlternatives = 1;
        this.isListening = true;
        this.onStatus("listening");

        this.recognition.onresult = async (e) => {
            const result = e.results[e.results.length - 1];
            const transcript = result[0].transcript.trim();

            if (this.isSpeaking && transcript.length > 0) {
                // Aggressive VAD Barge-in: Instantly stop the AI speaking when the user interrupts with any syllable
                this.synth.cancel();
                this.isSpeaking = false;
                this.onStatus("listening");
            }

            if (!result.isFinal || !transcript || !this.isActive) return;

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
            if (this.isActive && this.isListening) {
                 // The mic closed unexpectedly or after a long timeout, keep it alive
                 setTimeout(() => this._listen(), 800);
            }
        };

        try { this.recognition.start(); }
        catch { }
    }

    _stopListening() {
        this.isListening = false;
        try { this.recognition?.stop(); } catch { }
    }

    // ── AI Response ───────────────────────────────────────────
    async _processAndRespond(userText) {
        this.onStatus("thinking");
        let responseText = await this._callAI(userText);
        if (!this.isActive) return;

        // Extract [ALERT_ADMIN: message]
        const alertMatch = responseText.match(/\[ALERT_ADMIN:\s*(.*?)\]/i);
        if (alertMatch) {
            const alertMsg = alertMatch[1];
            responseText = responseText.replace(alertMatch[0], "").trim();
            if (this.onAlertAdmin) {
                this.onAlertAdmin(alertMsg);
            }
        }

        this.conversation.push({ role: "assistant", content: responseText });
        this.onTranscript("AI", responseText);
        
        // Start listening concurrently allowing user to barge in while AI speaks!
        this._speak(responseText);
        if (this.isActive) {
            setTimeout(() => this._listen(), 300);
        }
    }

    async _callAI(userMessage) {
        const conf = window.ECHO_CONFIG?.aiCall || {};
        const pos = this.currentPosition;
        const type = this.incident?.type || "other";
        
        let hotelArchitecture = "";
        if (this.lang === 'hi') {
            hotelArchitecture = `होटल इको रिज़ॉर्ट वास्तुकला: 5 मंजिल। मंजिल 1 लॉबी / मुख्य निकास है। उत्तर और दक्षिण सिरों पर सीढ़ियाँ हैं। लिफ्ट केंद्रीय हैं। आग/भूकंप के दौरान लिफ्ट का उपयोग न करें।`;
        } else if (this.lang === 'bn') {
            hotelArchitecture = `হোটেল ইকো রিসর্ট আর্কিটেকচার: ৫ তলা। তলা ১ লবি/প্রধান প্রস্থান। উত্তর ও দক্ষিণ প্রান্তে সিঁড়ি রয়েছে। লিফটগুলো কেন্দ্রে অবস্থিত। আগুন/ভূমিকম্পের সময় লিফট ব্যবহার করবেন না।`;
        } else {
            hotelArchitecture = `Hotel Echo Resort Architecture: 5 Floors. Floor 1 is the lobby/main exit. North and South ends have stairwells. Elevators are central. Do NOT use elevators during fire/quake.`;
        }

        const stepsContext = (this.instructionSteps && this.instructionSteps.length > 0) 
            ? `Current evacuation steps to guide the guest through: ${this.instructionSteps.join(', ')}.`
            : "";

        const systemPrompt = `You are "Rescue AI," a warm, professional, and highly conversational emergency concierge.
Context: Guest: ${this.guestName}. Location: Floor ${pos.floor}, Room ${pos.room}. Emergency: ${type}.
${stepsContext}
Architecture: ${hotelArchitecture}

Interaction Rules:
- Be conversational and empathetic. Avoid robotic, numbered lists.
- Keep responses concise (1-2 sentences).
- If the guest reports progress, acknowledge it warmly and provide the next step.
- If the guest is in danger, be firm, clear, and direct.
- If the guest asks to alert security or staff, include "[ALERT_ADMIN: <message>]" in your response.
- Language: ${this.lang}.`;

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    message: userMessage, 
                    language: this.lang,
                    context: systemPrompt,
                    isVoiceOverride: true,
                    history: this.conversation.map(m => ({ role: m.role, content: m.content })).slice(-5)
                })
            });
            const data = await response.json();
            if (data.success && data.response) {
                return data.response; 
            }
        } catch (e) {
            console.error("AI API Error:", e);
        }

        // Synchronize with centralized fallback if API fails
        if (window.EchoPlusAI && typeof window.EchoPlusAI.getFallback === 'function') {
            return window.EchoPlusAI.getFallback(type, this.lang, { floor: pos.floor, room: pos.room, zone: pos.zone });
        }

        // Final local fallback if all else fails
        return "Please remain calm and follow the emergency signs in the corridor. Help is on the way.";
    }

    _fallbackResponse(userText, prefix = "") {
        const responses = {
            en: [
                "Help is being dispatched to your exact location. Are you safe?",
                "Security is on the way. Keep this line open.",
                "Follow the green exit signs. Do not use elevators.",
                "I am monitoring your position. Keep moving towards the stairwell."
            ],
            hi: [
                "मदद आपके स्थान पर पहुँच रही है। क्या आप ठीक हैं?",
                "सुरक्षाकर्मी आ रहे हैं। लाइन पर बने रहें।",
                "हरे निकास चिह्नों का पालन करें। लिफ्ट का उपयोग न करें।",
                "मैं आपकी स्थिति पर नज़र रख रहा हूँ। सीढ़ियों की ओर बढ़ते रहें।"
            ],
            bn: [
                "সাহায্য আপনার অবস্থানের দিকেই আসছে। আপনি কি ঠিক আছেন?",
                "সিকিউরিটি আসছে। লাইনে থাকুন।",
                "সবুজ এক্সিট চিহ্নগুলো অনুসরণ করুন। লিফট ব্যবহার করবেন না।",
                "আমি আপনার অবস্থান দেখছি। সিঁড়ির দিকে এগোতে থাকুন।"
            ]
        };
        const arr = responses[this.lang] || responses.en;
        return prefix + arr[Math.floor(Math.random() * arr.length)];
    }

    // ── GPS position tracking ─────────────────────────────────
    _watchPosition() {
        if (!navigator.geolocation) return;
        this.positionWatcher = navigator.geolocation.watchPosition(
            (pos) => {
                this.currentPosition = {
                    ...this.currentPosition,
                    lat: pos.coords.latitude,
                    lon: pos.coords.longitude
                };
            },
            (err) => { },
            { enableHighAccuracy: true, timeout: 5000, maximumAge: 2000 }
        );
    }

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

    _getOpeningMessage() {
        const conf = window.ECHO_CONFIG?.aiCall || {};
        const type = this.incident?.type || "other";
        const msgs = conf.openingMessages?.[this.lang] || {};
        return msgs[type] || msgs.other || "ResQ AI here. Emergency received. How can I help?";
    }
    _sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
    updatePosition(pos) { this.currentPosition = { ...this.currentPosition, ...pos }; }
};
