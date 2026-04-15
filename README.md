# 🚨 ResQAI - AI Crisis Intelligence System

**Advanced AI-powered emergency detection, response, and multi-language support for India and beyond.**

---

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [New Features](#new-features)
3. [Key Capabilities](#key-capabilities)
4. [Tech Stack](#tech-stack)
5. [Multi-Language Support](#multi-language-support)
6. [Voice Control](#voice-control)
7. [Setup Guide](#setup-guide)
8. [API Endpoints](#api-endpoints)
9. [Demo Script](#demo-script)
10. [Troubleshooting](#troubleshooting)

---

## 🎯 Project Overview

**ResQAI** is a next-generation Crisis Intelligence System that:
- Accepts emergency reports with AI classification
- Generates **structured action plans** for ANY disaster type
- Provides **real-time nearby crisis alerts** with location-based mapping
- Supports **3 languages**: English, Hindi, Bengali
- Features **voice input/output** for hands-free operation
- Uses **Google Gemini AI** for intelligent decision-making
- Displays incidents on live dashboard with AI predictions

**Perfect for**: Emergency services, disaster management, IoT integration, hackathons, real-world deployment

---

## ✨ New Features (Crisis Intelligence Upgrade)

### 🚨 **Structured Emergency Response Plans**
All AI responses now follow a standardized format:
```
🚨 [EMERGENCY TYPE]

**Immediate Actions:**
1. Action 1
2. Action 2  
3. Action 3

**Step-by-Step Instructions:**
1. Detailed step with context
2. Safety considerations
3. Next steps

**Prevention & Safety Tips:**
- Tip 1
- Tip 2

📞 **Emergency Contacts (India):**
- 112 - National Emergency
- 101 - Fire Services
- 108 - Ambulance
- 100 - Police
```

### 🌍 **Multi-Language Support**
- **English** - Full interface and responses
- **हिन्दी (Hindi)** - Complete Hindi language support
- **বাংলা (Bengali)** - Bengali language support
- Select language from dropdown - AI responds in chosen language instantly

### 🎤 **Voice Control System**
- **Speech Recognition**: Speak emergency descriptions, AI listens and responds
- **Text-to-Speech**: AI responses read aloud automatically
- **Hands-Free Operation**: Perfect for emergency situations
- **Web Speech API**: Browser-native, no installation needed

### 📍 **Nearby Crisis System**
- **Real-time incident detection** within 5km radius
- **Location-based alerts** showing distance to incidents
- **Risk Zone Mapping** - Heatmap of dangerous areas
- **SOS Alert Beacon** - Broadcast your location to emergency services
- **Auto-refresh** every 30 seconds for live updates

### 🤖 **Advanced AI Classification**
- Identifies **ANY emergency type** (not limited to preset categories)
- Generates **custom action plans** for specific scenarios
- Calculates **risk scores** and escalation patterns
- Provides **context-aware recommendations**

### 📊 **Dashboard Enhancements**
- AI-powered **incident predictions**
- Real-time **risk scoring**
- **Live activity feed** with timestamps
- Statistics showing verified vs unverified incidents
- Dark theme with glassmorphism design

---

## 🎯 Key Capabilities

## 🎯 Key Capabilities

### ✅ Core Features

1. **Emergency Report System**
   - Text description with character limit
   - Optional image upload (with preview)
   - Manual or auto-detected location (geolocation API)
   - Severity level selector (Low/Medium/High)
   - AI classification + confidence scores

2. **AI Classification Engine**
   - Uses Google Gemini (gemini-2.5-flash) for real-time analysis
   - Generates **structured action plans** for ANY emergency
   - Returns incident type with confidence score
   - Provides immediate actions and step-by-step guidance
   - API-only architecture (no fallback responses)

3. **Live Dashboard**
   - Real-time incident cards with animations
   - Status indicators: Pending → Verified → Resolved
   - Search and filter by status/type
   - Statistics cards (total, resolved, pending, verified)
   - AI-powered predictions for each incident
   - Click to expand for full details

4. **AI Assistant - Multi-Language**
   - Context-aware emergency guidance in 3 languages
   - Voice input (speak your question)
   - Voice output (listen to response)
   - Quick emergency buttons
   - Real-time structured responses
   - Covers: Fire, Flood, Medical, Accidents, and ANY emergency

5. **Nearby Crisis Alerts**
   - Real-time incident detection within 5km
   - Distance-sorted incident list
   - Risk zone heatmap analysis
   - SOS Alert Beacon (broadcast your location)
   - Auto-refresh live incident feed
   - Emergency contact display

6. **Interactive Response Map**
   - Leaflet.js + OpenStreetMap integration
   - Color-coded markers per incident type
   - Risk zones visualization
   - Click markers for details
   - Auto-zoom to incident clusters
   - Legend for incident types

7. **Voice Control System**
   - 🎤 **Speech Recognition**: Hands-free input
   - 🔊 **Text-to-Speech**: Voice responses
   - Automatic emergency routing (detects fire/flood/medical)
   - Confidence-based validation
   - Works in English, Hindi, Bengali

### 🎨 UI/UX Features

- **Dark theme with glassmorphism** design
- **Smooth animations** (fade-in, slide-up, hover effects)
- **Neon accents** (cyan, magenta, yellow)
- **Fully responsive** (mobile, tablet, desktop)
- **Loading spinners & toast notifications**
- **Custom glow effects** on brand text
- **Multi-language UI** (buttons, labels, help text)
- **Voice button indicator** (shows listening/idle state)

---

## 🛠️ Tech Stack

### Frontend
- **HTML5** - Semantic markup
- **CSS3** - Glassmorphism, animations, gradients
- **Vanilla JavaScript** - No frameworks (pure DOM manipulation)
- **Leaflet.js** - Interactive maps
- **Font Awesome** - Icon library

### Backend
- **Node.js** - Runtime
- **Express.js** - Web framework
- **SQLite3** - Lightweight database
- **UUID** - Unique ID generation
- **CORS** - Cross-origin requests

### AI/ML
- **Google Generative AI (Gemini)** - LLM for classification + chatbot
- **Rule-based risk analysis** - Keyword matching for risk scoring
- **Gemini 2.5 Flash** - Cost-effective, real-time performance

### DevOps & APIs
- **RESTful API** - Clean endpoint design
- **Environment variables** (.env configuration)
- **WebSocket-ready** - For real-time updates
- **CORS enabled** - Cross-origin requests for frontend

---

## 🌍 Multi-Language Support

ResQAI speaks your language! Complete support for:

### **English (en)**
- Interface: English
- Responses: English
- Emergency contacts: India-specific

### **हिन्दी (Hindi - hi)**
- Interface: हिन्दी
- Responses: हिन्दी
- Regional context: India

### **বাংলা (Bengali - bn)**
- Interface: বাংলা
- Responses: বাংলা  
- Regional expertise: East India focus

**How to use**: Select language from dropdown in header. AI automatically responds in chosen language!

---

## 🎤 Voice Control Guide

### For Users:
1. **Click the Microphone Icon** in chat
2. **Speak your emergency** clearly (e.g., "Fire in building" or "Medical emergency")
3. **AI listens** and automatically processes
4. **Response arrives** via text and voice
5. **Listen to guidance** - response reads aloud automatically

### Speech Recognition:
- Works with natural emergency descriptions
- Auto-detects emergency keywords
- Supports English, Hindi, Bengali
- High accuracy with modern browsers

### Text-to-Speech:
- AI speaks all responses
- Adjustable speed/volume
- Supports multiple languages
- Browser-native (no downloads needed)

### Browser Support:
- **Chrome/Edge**: ✅ Full support
- **Firefox**: ✅ Full support
- **Safari**: ⚠️ Limited mobile support
- **Mobile**: ✅ Android Chrome, iOS Safari

---

## 📦 Setup Guide

### Prerequisites

- **Node.js 16+** ([Download](https://nodejs.org))
- **npm or yarn** (comes with Node.js)
- **Google Gemini API key** (free tier available)
- **Code editor** (VS Code recommended)
- **Git** (optional)

### Step 1: Clone/Download Project

```bash
# Option A: Clone from GitHub
git clone https://github.com/yourusername/resqai.git
cd resqai

# Option B: Download ZIP and extract
# Then open folder in VS Code or terminal
```

### Step 2: Install Dependencies

```bash
# Navigate to project root
cd "d:\Development\Projects\Rapid Crisis Response"

# Install all dependencies
npm install
```

**Expected output:**
```
added 50 packages in 2m
```

### Step 3: Get Google Gemini API Key (5 minutes)

1. **Go to** [Google AI Studio](https://makersuite.google.com/app/apikey)
2. **Sign in** with your Google account (create one if needed - free!)
3. **Click** "Create API Key"
4. **Copy** the key (looks like: `AIzaSyD...`)

### Step 4: Configure Environment

1. **Open** `.env` file in your project root
2. **Paste** your Gemini API key:

```env
GEMINI_API_KEY=AIzaSyD_your_api_key_here

PORT=3000
NODE_ENV=development
DB_PATH=./emergencies.db
```

3. **Save** the file

### Step 5: Initialize Database (One-time)

```bash
npm run init-db
```

**Or** the database will auto-create on first run.

---

## 🚀 Running the Project

### Start Development Server

```bash
npm start
```

**Expected output:**
```
╔═════════════════════════════════════════╗
║         🚨 ResQAI Backend Running 🚨    ║
╠═════════════════════════════════════════╣
║  Server: http://localhost:3000            ║
║  API:    http://localhost:3000/api      ║
║  Health: http://localhost:3000/api/health║
╚═════════════════════════════════════════╝
```

### Open in Browser

- **URL**: [http://localhost:3000](http://localhost:3000)
- **Or**: Open `public/index.html` directly (limited features)

### Optional: Watch Mode (Auto-reload)

```bash
npm run dev
```

---

## 📅 5-Day Build Plan

### Day 1: Foundation & UI (4-5 hours)
- [x] Project setup & dependencies
- [x] HTML structure (form + dashboard)
- [x] CSS dark theme & animations
- [x] Responsive design test

**Deliverable**: Visually complete frontend (static)

---

### Day 2: Backend & Database (4-5 hours)
- [x] Express server setup
- [x] SQLite database schema
- [x] Emergency CRUD endpoints
- [x] CORS configuration

**Deliverable**: API endpoints working with Postman

---

### Day 3: AI Logic & Classification (4 hours)
- [x] Gemini API integration
- [x] Emergency type detection
- [x] Confidence score calculation
- [x] Risk analysis and predictions

**Deliverable**: Can classify test inputs

---

### Day 4: Dashboard & Features (5 hours)
- [x] Display incidents from API
- [x] Real-time search/filter
- [x] Statistics cards
- [x] Map integration
- [x] Incident detail view

**Deliverable**: Dashboard fully functional

---

### Day 5: Polish & Deploy (3-4 hours)
- [x] Chatbot integration
- [x] Error handling & validation
- [x] Performance optimization
- [x] Demo testing
- [x] Documentation

**Deliverable**: Production-ready, demo-ready

---

## 🎬 Demo Script (When Presenting)

### Opening (30 seconds)
> "Hi, I'm presenting ResQAI - an AI-powered emergency response system. In real disaster situations, every second counts. ResQAI helps first responders detect and classify emergencies in real-time using AI."

### Demo Flow (5-7 minutes)

#### 1. Dashboard Overview (1 min)
- Show live dashboard with incident cards
- Point out: status badges, confidence scores, statistics
- "Here we can see pending, verified, and resolved incidents."

#### 2. Submit Emergency Report (2 mins)
**Scenario**: "Let me simulate a fire emergency"

- Switch to "Report Emergency" tab
- Fill in: *"Fire detected in warehouse building, heavy smoke visible from parking area"*
- Add location: *"42.3601° N, 71.0589° W"* (or auto-detect)
- Set severity: **High**
- Click **Submit**

**Say**: "Notice the AI is processing... analyzing the description..."

#### 3. AI Classification (30 seconds)
- Wait for incident to appear on dashboard
- Click on incident card to expand
- Show:
  - Classified type: **🔥 Fire** (92% confidence)
  - AI suggestions
  - Status: **Verified**

**Say**: "The AI instantly classified this as a fire with 92% confidence and generated response suggestions."

#### 4. Chatbot Assistant (1.5 mins)
- Switch to "AI Assistant" tab
- Click quick button: **"🔥 Fire Tips"**
- Show response with safety guidelines

**Say**: "The chatbot provides real-time guidance to people in affected areas. It uses the same AI to understand context and give specific advice."

#### 5. Response Map (1 min)
- Switch to map view
- Show incident markers
- Point out color coding
- Click a marker to show details

**Say**: "Emergency responders can see all incidents plotted in real-time on the map. Different colors represent different emergency types, so dispatch can prioritize effectively."

#### 6. Closing (30 seconds)
> "With ResQAI, we're leveraging AI to make emergency response faster, smarter, and more coordinated. In a real deployment, this would integrate with emergency services, IoT sensors, and public reporting."

---

## 🔧 API Endpoints Reference

### Emergencies
```
GET    /api/emergencies              - Get all incidents
POST   /api/emergencies              - Create new incident
GET    /api/emergencies/:id          - Get single incident
PATCH  /api/emergencies/:id          - Update incident status
DELETE /api/emergencies/:id          - Delete incident
GET    /api/emergencies/stats/summary - Get statistics
```

### Classification (AI - Multi-Language)
```
POST   /api/classification           - Classify emergency + generate action plan
Body: { "text": "...", "language": "en|hi|bn" }
Response: structured action plan with immediate actions, steps, prevention tips
```

### Chat (AI - Multi-Language & Voice Ready)
```
POST   /api/chat                     - Send message, get AI guidance
Body: { "message": "...", "language": "en|hi|bn" }
Response: structured advice with contacts and safety steps
```

### Voice (Speech Recognition & TTS)
```
POST   /api/voice/speak              - Prepare text for TTS
Body: { "text": "...", "language": "en|hi|bn" }
Response: { id, text, instructions }

POST   /api/voice/transcribe         - Start speech recognition
Body: { "audio": "...", "language": "en|hi|bn" }
Response: { status, callback_url }

POST   /api/voice/transcribe-callback - Submit recognized transcript
Body: { "transcript": "...", "language": "...", "confidence": 0.0-1.0 }
Response: { transcript, ready_for_chat }
```

### Nearby Crisis (Location-Based Alerts)
```
GET    /api/nearby/nearby            - Get incidents within radius
Query: latitude, longitude, radius (km)
Response: incidents sorted by distance

GET    /api/nearby/incident/:id      - Get incident details
Response: full incident data with recommendations

GET    /api/nearby/risk-zones        - Get risk analysis heatmap
Response: critical and moderate risk zones

POST   /api/nearby/alert             - Create SOS alert beacon
Body: { "latitude": , "longitude": , "message": "", "radius": }
Response: { alert_id, broadcast_status, eta_estimates }
```

### Health
```
GET    /api/health                   - Server status
```

---

## 📱 Sample Emergency Reports (For Testing)

### Fire Incident
```
Description: Heavy smoke visible from building, flames on top floor, multiple people screaming
Location: 123 Main St, Downtown
Severity: High
```

### Medical Incident
```
Description: Person collapsed at subway station, not responsive, appears to be having seizure
Location: Central Station, Platform 5
Severity: High
```

### Flood Incident
```
Description: River overflowing due to heavy rain, water spreading into residential area, evacuation needed
Location: Riverside District, Park Avenue
Severity: High
```

### Accident Incident
```
Description: Two vehicles collided at intersection, both badly damaged, occupants trapped in cars
Location: 5th Ave & 42nd St
Severity: High
```

---

## 🐛 Troubleshooting

### "Cannot find module" error
```bash
# Reinstall dependencies
npm install
```

### "Port 3000 already in use"
```bash
# Use different port
PORT=3001 npm start

# Or kill the process using port 3000
# Windows: netstat -ano | findstr :3000
# Mac/Linux: lsof -i :3000
```

### Voice features not working
- **Chrome/Edge**: Should work on all versions
- **Firefox**: Full support on desktop
- **Safari**: Mobile voice support is limited
- **Test**: Open browser console, mic icon should show in chat area

### Language selection not working
- Refresh the browser after selecting language
- Clear browser cache if issues persist
- Language setting persists with browser storage

### Gemini API not working
- Check `.env` file has valid Gemini API key
- Verify API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
- Ensure internet connection is stable
- **Note**: `gemini-2.5-flash` model is required (not gemini-pro or older versions)
- If API is overloaded: Wait a few minutes and retry
- Server returns 503 error if API unavailable (no fallback)

### Nearby incidents showing simulated data
- Current nearby system uses simulated incidents for demo
- In production: Connect to real incident database
- Location permissions: Allow browser access to location

### Database errors
- Delete `emergencies.db` file (⚠️ will lose data)
- Run: `npm run init-db`
- Restart server

### "CORS" or "blocked" errors
- Ensure frontend running on same `localhost:3000` or update CORS in `src/server.js`

---

## 📚 Project Structure

```
resqai/
├── public/
│   ├── index.html              # Main UI (with new nearby + voice tabs)
│   ├── css/
│   │   └── styles.css          # All styling (glassmorphism + animations)
│   └── js/
│       ├── app.js              # Core app logic
│       ├── dashboard.js        # Dashboard functionality
│       ├── chatbot.js          # Chat logic (updated for multi-language)
│       ├── nearby.js           # Nearby crisis system (NEW)
│       └── voice.js            # Voice control (NEW)
├── src/
│   ├── server.js               # Express server (with new routes)
│   ├── api/
│   │   ├── emergency.js        # Emergency routes
│   │   ├── classification.js   # AI classification (with action plans + language)
│   │   ├── chat.js             # Chat routes (with language support)
│   │   ├── voice.js            # Voice API endpoints (NEW)
│   │   └── nearby.js           # Nearby crisis API (NEW)
│   ├── utils/
│   │   └── languages.js        # Multi-language support (NEW)
│   └── db/
│       └── db.js               # Database operations
├── .env                        # Configuration (add API key here!)
├── .env.example                # Template
├── package.json                # Dependencies
└── README.md                   # This file
```

---

## 🌐 Deployment Options

### Option 1: Local Development
```bash
npm start
# Access at http://localhost:3000
```

### Option 2: Heroku (Cloud)
```bash
heroku create resqai-crisis-intelligence
git push heroku main
# App deployed to Heroku
```

### Option 3: Railway / Render (Modern Alternative)
- Push to GitHub
- Connect via Railway.app or Render.com
- Auto-deploys on push

### Option 4: Docker
```docker
FROM node:18
WORKDIR /app
COPY . .
RUN npm install
EXPOSE 3000
ENV GEMINI_API_KEY=your_key_here
CMD ["npm", "start"]
```

### Production Checklist
- [ ] Set strong `GEMINI_API_KEY` in environment
- [ ] Set `NODE_ENV=production`
- [ ] Use cloud database (not local SQLite)
- [ ] Enable HTTPS
- [ ] Set rate limiting on APIs
- [ ] Update CORS origins to production URL
- [ ] Test all voice features before deployment
- [ ] Verify multi-language translations

---

## 📝 License

MIT - Free to use and modify

---

## 🙋 Support & Issues

- **Bug reports**: Create GitHub issue
- **Feature requests**: Star the repo!
- **Questions**: Check Troubleshooting section

---

**Built with ❤️ for emergency responders and disaster management. Save lives with AI! 🚀**

---

## 🎓 Learning Resources

- [Express.js Docs](https://expressjs.com)
- [Google Gemini API](https://ai.google.dev)
- [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)
- [Geolocation API](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API)
- [Leaflet Maps](https://leafletjs.com)
- [SQLite3 Node.js](https://www.npmjs.com/package/sqlite3)
- [REST API Design](https://restfulapi.net)

---

## 🚀 Recent Upgrades (April 2026)

### Crisis Intelligence System v2.0
- ✨ Structured action plans for ANY emergency
- ✨ Multi-language support (English, Hindi, Bengali)
- ✨ Voice control (speech-to-text and text-to-speech)
- ✨ Nearby crisis detection and alerts
- ✨ Risk zone heatmap analysis
- ✨ SOS alert beacon broadcasting
- ✨ Gemini 2.5 Flash model (latest & fastest)

**Status**: Production Ready ✅  
**Last Updated**: April 15, 2026  
**Version**: 2.0.0

---
