# 📖 ResQAI Project Overview

## 🎯 Project Vision

**ResQAI** – AI-powered emergency response system for real-time crisis management.

**Problem**: In emergencies, people have seconds to make critical decisions but lack real-time awareness, clear guidance, and safe shelter information.

**Solution**: An intelligent system that delivers instant AI guidance, live incident maps, smart safe zones, and voice-activated emergency response.

---

## 🏗️ System Architecture (4-Layer Model)

```
┌─────────────────────────────────────────┐
│      CLIENT LAYER (Frontend)            │
│  ┌─────────────┬──────────┬──────────┐  │
│  │  Rapid      │ EcoPlus  │ SQBitain │  │
│  │  Crisis     │ (Hotel)  │ (Custom) │  │
│  │  Protocol   │ Module   │ Builder  │  │
│  └─────────────┴──────────┴──────────┘  │
└────────────────┬────────────────────────┘
                 │ REST API (JSON)
┌────────────────▼────────────────────────┐
│      API LAYER (Express Routes)         │
│  /api/emergencies, /api/ai,             │
│  /api/portal, /api/custom-system, ...   │
└────────────────┬────────────────────────┘
                 │ Business Logic
┌────────────────▼────────────────────────┐
│      CORE LAYER (Processing)            │
│  • AI Router (Gemini→OpenRouter→Groq)   │
│  • Classification Engine                │
│  • SOS Management                       │
│  • Multi-language Support               │
└────────────────┬────────────────────────┘
                 │ Persistence
┌────────────────▼────────────────────────┐
│      DATA LAYER (SQLite/MySQL)          │
│  • Emergencies Table                    │
│  • Custom Systems Table                 │
│  • System Logs                          │
│  • User Sessions                        │
└─────────────────────────────────────────┘
```

---

## 🎬 The 3 Core Modules

### 1️⃣ **Rapid Crisis Protocol**
**Purpose**: General public emergency response system

**User Flow**:
1. User arrives at landing page
2. Selects "Personal Rescue AI"
3. Enters dashboard with:
   - Real-time incident map (5km radius)
   - SOS activation button
   - Chat-based AI guidance
   - Voice command support
   - Safety tips & statistics
4. In emergency:
   - User describes situation or uses voice
   - AI classifies incident type
   - AI generates evacuation guidance
   - Shows nearby safe zones
   - Links to appropriate helpline

**Key Features**:
- Multi-language support (English, Hindi, Bengali)
- Voice activation (Web Speech API)
- Live incident mapping
- AI chatbot for guidance
- Helpline integration

**Technology**:
- Frontend: HTML5, CSS3, Vanilla JS
- Maps: Leaflet.js
- Voice: Web Speech API
- AI: Gemini 2.5 Flash

---

### 2️⃣ **EcoPlus Module** (Hotel/Resort)
**Purpose**: Specialized emergency response for hospitality properties

**User Flows**:

**Guest Flow**:
1. Guest checks in via app
2. Selects room/floor location
3. In emergency:
   - Selects emergency type (Fire, Medical, etc.)
   - AI gives hotel-specific guidance
   - Staff notified instantly
   - Guest tracked in real-time

**Staff/Admin Flow**:
1. Admin logs into command center
2. Views real-time incident dashboard
3. Monitors all active guests & emergencies
4. Sends targeted guidance to specific guests
5. Coordinates evacuation by floor/area
6. Tracks completion status

**Key Features**:
- Guest + Admin dual interfaces
- Position tracking (floor, room, zone)
- Bulk notifications
- Staff coordination dashboard
- Multi-language support
- Voice call integration with sentiment analysis
- Auto-response suggestions for staff

**Technology**:
- Guest Interface: Modal-based with location selector
- Admin Dashboard: Grid layout with real-time updates
- AI Integration: Hotel-specific prompt engineering
- Chat System: Admin-to-guest communication
- Voice: Web Speech API for guest guidance

---

### 3️⃣ **SQBitain Module** (Custom Rescue Builder)
**Purpose**: Create custom emergency response systems for any organization

**Organization Types Supported**:
- Schools
- Hospitals
- Hostels
- Restaurants
- Corporate offices
- Any custom organization

**User Flow**:
1. User selects "Custom Rescue Builder"
2. Chooses organization type OR describes custom setup
3. AI generates template system (organization structure, staff roles, risk types)
4. User reviews & customizes:
   - Floors/buildings/zones
   - Staff member names & roles
   - Emergency contact procedures
   - Risk categories
5. System saved with unique systemID
6. System can be:
   - Activated for emergency mode
   - Shared with team members
   - Updated with new staff/procedures
   - Monitored in real-time dashboard

**Key Features**:
- AI template generation (describe organization → JSON config)
- Drag-and-drop structure builder
- Role-based staff assignments
- Risk type configuration
- Multi-tenant isolation (per organization)
- System status tracking
- Emergency log history
- Theme-based coloring by org type

**Technology**:
- Frontend: Wizard-based UI
- Backend: CRUD endpoints for system management
- AI: Prompt engineering for custom templates
- Database: Custom systems table with user ownership
- Multi-tenancy: systemID + userID isolation

---

## 🔗 How Modules Integrate

```
┌──────────────────┐
│  Landing Page    │
│  (index.html)    │
└────────┬─────────┘
         │
    ┌────┴──────────────┬──────────────┐
    │                   │              │
    ▼                   ▼              ▼
┌─────────────┐ ┌─────────────┐ ┌──────────────┐
│ Rapid Crisis│ │  EcoPlus    │ │  SQBitain    │
│  Protocol   │ │  (Hotel)    │ │  (Custom)    │
│             │ │             │ │              │
│ Dashboard ◄─┼─►Admin Center│ │System Builder│
│ SOS         │ │Guest Alerts │ │System List   │
│ Mapping     │ │            │ │Emergency Log │
└──────┬──────┘ └──────┬──────┘ └──────┬───────┘
       │               │               │
       └───────────────┼───────────────┘
                       │
                ┌──────▼──────┐
                │  API Layer  │
                │ /api/*      │
                └─────────────┘
```

---

## 📊 Key Statistics

| Metric | Value |
|--------|-------|
| **API Routes** | 10 files covering 30+ endpoints |
| **Frontend Modules** | 3 (Rapid Crisis, EcoPlus, SQBitain) |
| **Languages Supported** | English, Hindi, Bengali |
| **AI Providers** | 4 (Gemini → OpenRouter → Groq → Free) |
| **Response Time** | <2 seconds for AI guidance |
| **Coverage Radius** | 5km (enforced max distance) |
| **Database Options** | SQLite (dev), MySQL (production) |

---

## 🔐 Security & Isolation

### Authentication
- JWT tokens (7-day expiry)
- Token verification middleware
- Optional auth for public endpoints

### Multi-Tenant Isolation
- **SystemID Pattern**: Each custom system gets unique UUID
- **UserID Binding**: Systems linked to creator's user account
- **Ownership Validation**: Update/delete only by creator
- **Database Constraints**: MySQL foreign keys enforce integrity

### Data Protection
- Password hashing with bcrypt
- Environment variable management
- Token expiration
- Session cleanup on logout

---

## 🚀 Getting Started

1. **Setup**: See [SETUP.md](./SETUP.md) for installation
2. **Architecture Details**: See [ARCHITECTURE.md](./ARCHITECTURE.md)
3. **API Reference**: See [API.md](./API.md)
4. **Module Details**: See [MODULES.md](./MODULES.md)
5. **AI System**: See [AI_SYSTEM.md](./AI_SYSTEM.md)
6. **Data Flows**: See [DATA_FLOW.md](./DATA_FLOW.md)

---

## ✅ What's Implemented

- ✅ Multi-provider AI routing with fallback chain
- ✅ Emergency classification with confidence scoring
- ✅ Real-time incident tracking & mapping
- ✅ Chat interface with multi-language support
- ✅ Voice activation (Web Speech API)
- ✅ Custom system builder with AI templates
- ✅ User authentication & JWT
- ✅ Multi-tenant isolation (MySQL)
- ✅ SOS logging with helpline mapping
- ✅ Hotel-specific emergency guidance

## ⚠️ Simulated/Placeholder

- ⚠️ Nearby incidents (using SIMULATED_INCIDENTS array)
- ⚠️ OpenStreetMap integration (API endpoints defined)
- ⚠️ Evacuation routes (basic calculation)
- ⚠️ Voice transcription (frontend only, Web Speech API)

---

**Built for Google Hackathon** 🎯
