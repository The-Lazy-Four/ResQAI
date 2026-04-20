# 📊 Data Flow Documentation

Complete step-by-step data flows through the ResQAI system.

---

## 1. SOS Emergency Trigger Flow

**Scenario**: User detects emergency and activates SOS

```
┌─────────────────────────────────────────────────────────┐
│                   USER ACTION                           │
│  User clicks "SOS" button OR speaks emergency keyword   │
└────────────┬────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────┐
│           CLIENT-SIDE (JavaScript)                      │
│  1. Capture current location via Geolocation API        │
│  2. Get emergency description (text or voice)           │
│  3. Detect language preference from localStorage        │
│  4. Create request payload                              │
│     {                                                    │
│       emergencyType: "fire",                            │
│       latitude: 40.7128,                                │
│       longitude: -74.0060,                              │
│       language: "en",                                   │
│       customDescription: "Fire on 3rd floor"            │
│     }                                                    │
└────────────┬────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────┐
│       NETWORK REQUEST (HTTP POST)                       │
│  POST http://localhost:3000/api/portal/sos-log         │
│  Headers: Content-Type: application/json               │
│  Body: [payload from above]                            │
└────────────┬────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────┐
│           SERVER-SIDE (src/api/routes/portal.js)       │
│  1. Receive request in POST /sos-log handler           │
│  2. Validate input (emergency type, coordinates)       │
│  3. Lookup helpline number based on type               │
│     fire → 101, medical → 108, etc.                    │
│  4. Store in in-memory sosEventLog array               │
│     sosEventLog.push({                                 │
│       id: uuid(),                                      │
│       type: "fire",                                    │
│       coordinates: {...},                             │
│       timestamp: Date.now(),                          │
│       status: "active"                                │
│     })                                                 │
└────────────┬────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────┐
│      AI CLASSIFICATION (via aiRouter.js)               │
│  1. Build system prompt with emergency description    │
│  2. Route to available AI provider (Gemini)           │
│  3. Receive JSON response with:                       │
│     {                                                 │
│       type: "fire",                                 │
│       confidence: 0.95,                             │
│       immediate_actions: [...],                     │
│       step_by_step: [...],                          │
│       prevention_tips: [...]                        │
│     }                                                │
│  4. Cache response for 24 hours                      │
└────────────┬────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────┐
│      CREATE EMERGENCY RECORD (POST /emergencies)       │
│  1. Internal route call to /api/emergencies           │
│  2. Store in SQLite emergencies table:                │
│     {                                                 │
│       id: uuid,                                      │
│       description: "Fire on 3rd floor",             │
│       location: "123 Main St",                      │
│       severity: "high",                             │
│       classified_type: "fire",                      │
│       confidence_score: 0.95,                       │
│       ai_suggestions: [...]                         │
│     }                                                │
│  3. Create index entries for filtering              │
└────────────┬────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────┐
│        BUILD RESPONSE PAYLOAD                          │
│  {                                                     │
│    sosId: "sos-uuid-123",                            │
│    emergencyType: "fire",                            │
│    helpline_number: "101",                           │
│    helpline_name: "Fire Brigade",                    │
│    ai_suggestion: "Step-by-step guidance...",        │
│    safe_zones: [                                     │
│      { name: "Park", distance: 200 },                │
│      { name: "Hospital", distance: 500 }             │
│    ],                                                 │
│    confidence: 0.95,                                 │
│    timestamp: "2026-04-20T10:30:00Z"                │
│  }                                                    │
└────────────┬────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────┐
│       HTTP RESPONSE (200 OK)                          │
│  Client receives complete SOS response               │
└────────────┬────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────┐
│        CLIENT DISPLAY & NOTIFICATION                   │
│  1. Display helpline number prominently               │
│  2. Show AI guidance in large, readable format        │
│  3. Play alarm sound if enabled                       │
│  4. Show nearby safe zones on map                     │
│  5. Enable voice readout of guidance                 │
│  6. Store SOS ID in localStorage for tracking        │
│  7. Begin location monitoring                        │
└─────────────────────────────────────────────────────────┘
```

**Total Flow Time**: ~2-3 seconds (including AI inference)

**Data Stored**:
- localStorage: SOS ID, timestamp
- SQLite: Complete emergency record
- In-memory: sosEventLog array
- Cache: AI response (24 hours)

---

## 2. Admin Notification Flow (EcoPlus Hotel)

**Scenario**: Guest activates SOS, admin sees it on dashboard

```
┌─────────────────────────────────────────────────────────┐
│         GUEST INITIATES SOS (from flow #1)            │
└────────────┬────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────┐
│    CLIENT: Store SOS in localStorage                   │
│    Key: 'hotel_emergency_' + timestamp                │
│    Value: { guestId, roomNumber, floor, type, ... }   │
└────────────┬────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────┐
│    CLIENT: Send to Server                             │
│    POST /api/portal/sos-log (with hotelId)           │
│    POST /api/emergencies (create record)              │
│    Broadcast via WebSocket (if connected)             │
└────────────┬────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────┐
│    SERVER: Update incident in memory                   │
│    sosEventLog.add({                                   │
│      id, type, floor, room, severity, ...             │
│    });                                                  │
│                                                        │
│    Optionally: Store in MySQL sessions table          │
│    (for persistence across server restarts)           │
└────────────┬────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────┐
│    SERVER: Query for Active Admins                     │
│    SELECT * FROM sessions WHERE user_role = 'admin'  │
│    Get list of admin socket IDs                       │
└────────────┬────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────┐
│    SERVER: Broadcast to All Admin Clients             │
│    WebSocket.emit('emergency_alert', {                │
│      sosId, guestId, floor, room, type, time         │
│    })                                                  │
│                                                       │
│    Alternative (if no WebSocket):                     │
│    Admin polls GET /api/portal/nearby-alerts          │
│    Every 5-10 seconds                                 │
└────────────┬────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────┐
│    CLIENT (Admin Dashboard): Receive Alert            │
│    1. Sound alarm on admin device                     │
│    2. Highlight emergency on floor map                │
│    3. Show guest position (floor/room)                │
│    4. Display emergency type with icon                │
│    5. Add to active incidents list                    │
│    6. Show AI-generated staff instructions            │
└────────────┬────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────┐
│    ADMIN TAKES ACTION                                 │
│    • Click on incident to view details                │
│    • POST /api/ai/emergency-guidance                  │
│      (with floor, room, emergency_type)              │
│    • Receive staff-specific instructions              │
│    • Broadcast alert to guest's floor:                │
│      POST /api/custom-system/broadcast-alert         │
└────────────┬────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────┐
│    FLOOR STAFF RECEIVE NOTIFICATION                   │
│    • PA System announcement                           │
│    • SMS notification (if configured)                 │
│    • Email alert                                      │
│    • Dashboard update with evacuation steps           │
│                                                       │
│    Floor Staff begins coordinated response:           │
│    1. Account for all guests on floor                │
│    2. Guide evacuation via safest route              │
│    3. Report completion back to admin                │
└─────────────────────────────────────────────────────────┘
```

**Total Flow Time**: <1 second (real-time)

**Data Stored**:
- Redis cache: Active emergency for 24 hours
- MySQL: Emergency log
- Admin session: Alert acknowledged timestamp

---

## 3. Emergency Classification Flow

**Scenario**: User submits emergency description, system classifies it

```
┌─────────────────────────────────────────────────────────┐
│         USER FILLS REPORT FORM                         │
│  Description: "I see flames and heavy smoke"          │
│  Location: "Building 3, Floor 2"                      │
│  Severity: "High"                                      │
│  Language: "en"                                        │
└────────────┬────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────┐
│      CLIENT: Send Classification Request              │
│  POST /api/classification                             │
│  {                                                     │
│    description: "I see flames and heavy smoke",       │
│    language: "en"                                     │
│  }                                                     │
└────────────┬────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────┐
│    SERVER: Validate Input                             │
│    • Check description not empty                      │
│    • Check language code valid                        │
│    • Check char length < 5000                         │
└────────────┬────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────┐
│    LOAD LANGUAGE-SPECIFIC SYSTEM PROMPT                │
│    Language 'en' → Load from prompts/en.prompt       │
│                                                        │
│    Template includes:                                  │
│    • Emergency classification guidelines               │
│    • Output JSON structure requirements                │
│    • Confidence scoring rules                         │
│    • Action generation instructions                   │
└────────────┬────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────┐
│    CONSTRUCT FULL PROMPT                              │
│  [System Prompt] + [User Input]                      │
│                                                        │
│  "You are an emergency response AI assistant.         │
│   Emergency: 'I see flames and heavy smoke'          │
│   Classify and provide guidance..."                  │
└────────────┬────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────┐
│    AI ROUTER: Try Provider Chain                       │
│                                                        │
│    1st Attempt: Call Gemini API                       │
│    → Timeout 30s                                      │
│    → Return structured JSON                          │
│    → Log success + response_time (800ms)              │
└────────────┬────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────┐
│    PARSE AI RESPONSE                                  │
│  {                                                     │
│    "type": "fire",                                   │
│    "confidence": 0.95,                               │
│    "reasoning": "Clear mention of flames & smoke",   │
│    "immediate_actions": [                            │
│      "Evacuate immediately",                         │
│      "Call 101 (Fire Brigade)",                      │
│      "Use nearest exit"                              │
│    ],                                                 │
│    "step_by_step": [                                 │
│      "Leave the building via nearest stairwell",     │
│      "Move to assembly point",                       │
│      "Report to emergency services"                  │
│    ],                                                 │
│    "prevention_tips": [                              │
│      "Check fire extinguishers monthly",             │
│      "Keep escape routes clear",                     │
│      "Practice fire drills quarterly"                │
│    ],                                                 │
│    "risk_scores": {                                  │
│      "fire_risk": 0.95,                             │
│      "flood_risk": 0.10,                            │
│      "medical_risk": 0.20,                          │
│      "accident_risk": 0.30                          │
│    }                                                  │
│  }                                                    │
└────────────┬────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────┐
│    VALIDATE RESPONSE                                  │
│    • JSON structure correct?                          │
│    • Confidence 0-1.0?                                │
│    • Required fields present?                         │
│    → If invalid, return fallback template             │
└────────────┬────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────┐
│    CREATE EMERGENCY RECORD                            │
│    INSERT INTO emergencies (                          │
│      id, description, classified_type,                │
│      confidence_score, ai_suggestions, ...            │
│    )                                                   │
└────────────┬────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────┐
│    BUILD RESPONSE                                     │
│  {                                                     │
│    classification: {                                 │
│      type: "fire",                                  │
│      confidence: 0.95,                              │
│      reasoning: "..."                               │
│    },                                                │
│    guidance: {                                      │
│      immediate_actions: [...],                      │
│      step_by_step: [...]                            │
│    },                                                │
│    risk_predictions: [                              │
│      { type: "fire", risk: 0.95, level: "high" }   │
│    ],                                                │
│    provider_used: "gemini",                         │
│    response_time_ms: 800                           │
│  }                                                    │
└────────────┬────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────┐
│    HTTP RESPONSE (200 OK)                            │
│    Send classification + guidance to client          │
└────────────┬────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────┐
│    CLIENT: Display Results                            │
│    1. Show emergency type icon/badge                  │
│    2. Display confidence as percentage                │
│    3. List immediate actions in priority order        │
│    4. Show step-by-step in collapsible section       │
│    5. Highlight high-risk predictions (>60%)         │
│    6. Cache response in localStorage (24h)           │
│    7. Link helpline based on emergency type          │
└─────────────────────────────────────────────────────────┘
```

**Total Flow Time**: ~1-2 seconds

**Data Stored**:
- MySQL: Emergency record with classification
- Cache: Full response (24 hours)
- Client: localStorage for offline access

---

## 4. SystemID Isolation Flow (Multi-Tenant)

**Scenario**: Two organizations create rescue systems simultaneously

```
ORGANIZATION A                          ORGANIZATION B
     │                                       │
     ▼                                       ▼
┌──────────────────────┐             ┌──────────────────────┐
│ Create Custom System │             │ Create Custom System │
│ POST /custom-system/ │             │ POST /custom-system/ │
│      create          │             │      create          │
└──────────┬───────────┘             └──────────┬───────────┘
           │                                    │
           ▼                                    ▼
    ┌─────────────┐                    ┌─────────────┐
    │Generate UUID│                    │Generate UUID│
    │systemID_A   │                    │systemID_B   │
    └──────┬──────┘                    └──────┬──────┘
           │                                  │
           │    ┌──────────────────────────┐  │
           │    │ SERVER PROCESSING        │  │
           └───►│                          │◄─┘
                │ Check Authentication    │
                │ Get userID from JWT     │
                │ userID_A, userID_B      │
                └──────────┬──────────────┘
                           │
                           ▼
            ┌──────────────────────────────┐
            │   INSERT INTO systems        │
            │   ┌────────────────────────┐ │
            │   │ID        | systemID_A  │ │
            │   │user_id   | userID_A    │ │
            │   │org_name  | ABC School  │ │
            │   │status    | active      │ │
            │   └────────────────────────┘ │
            │   ┌────────────────────────┐ │
            │   │ID        | systemID_B  │ │
            │   │user_id   | userID_B    │ │
            │   │org_name  | XYZ Hospital│ │
            │   │status    | active      │ │
            │   └────────────────────────┘ │
            └──────────────────────────────┘
                          │
           ┌──────────────┴──────────────┐
           │                             │
           ▼                             ▼
    ┌─────────────┐            ┌─────────────┐
    │ Org A User  │            │ Org B User  │
    │             │            │             │
    │ List Systems│            │ List Systems│
    └──────┬──────┘            └──────┬──────┘
           │                         │
    GET /custom-system/user/list  GET /custom-system/user/list
           │                         │
           ▼                         ▼
    ┌──────────────────────┐  ┌──────────────────────┐
    │  SELECT * FROM       │  │  SELECT * FROM       │
    │  systems             │  │  systems             │
    │  WHERE               │  │  WHERE               │
    │  user_id = userID_A  │  │  user_id = userID_B  │
    └──────────────┬───────┘  └──────────────┬───────┘
                   │                        │
                   ▼                        ▼
         ┌──────────────────┐    ┌──────────────────┐
         │Returns:          │    │Returns:          │
         │systemID_A        │    │systemID_B        │
         │ABC School        │    │XYZ Hospital      │
         │(ONLY their data) │    │(ONLY their data) │
         └──────────────────┘    └──────────────────┘

        ISOLATION: Org A cannot see Org B's data and vice versa
```

### Update with Ownership Check

```
ORG A TRIES TO UPDATE ORG B's SYSTEM
             │
             ▼
PATCH /custom-system/systemID_B
Authorization: Bearer <userID_A_token>
             │
             ▼
┌─────────────────────────────────────┐
│ SERVER: Verify Ownership            │
│                                     │
│ SELECT user_id FROM systems         │
│ WHERE id = systemID_B               │
│ → Result: userID_B                  │
│                                     │
│ Check: userID_B == userID_A?        │
│ → FALSE                             │
│                                     │
│ Return 403 FORBIDDEN                │
│ "You don't have permission"         │
└─────────────────────────────────────┘
```

**Total Flow Time**: <1 second per operation

**Data Integrity**: Enforced at database level with FOREIGN KEY constraint

---

## 5. Multi-Language Support Flow

**Scenario**: User requests guidance in Bengali

```
┌─────────────────────────────────────┐
│   USER INTERFACE LANGUAGE: Bengali  │
│   localStorage['user_language']='bn'│
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│   USER SUBMITS EMERGENCY REPORT     │
│   Description (user's language):    │
│   "আমাদের বাড়িতে আগুন লেগেছে"     │
│   (Translation: "Fire in building") │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│   POST /api/classification          │
│   {                                 │
│     description: "...",             │
│     language: "bn"  ← Key param     │
│   }                                 │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│   LOAD LANGUAGE-SPECIFIC PROMPT     │
│   Load from: prompts/bn.prompt      │
│                                     │
│   Template includes Bengali-specific│
│   • Context (Bangladesh context)    │
│   • Helpline numbers (Bangladesh)   │
│   • Cultural considerations         │
│   • Local emergency procedures      │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│   CONSTRUCT PROMPT (in Bengali)     │
│   [System prompt in Bengali]         │
│   + [User input in Bengali]          │
│   + [Output format JSON]             │
│                                     │
│   "আপনি জরুরি প্রতিক্রিয়া AI..."   │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│   AI ROUTER: Call Provider          │
│   Pass full prompt (already Bengali)│
│   AI understands context + language │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│   AI RESPONSE (in Bengali)          │
│   {                                 │
│     type: "fire",                  │
│     confidence: 0.95,              │
│     reasoning: "আগুনের উল্লেখ...",  │
│     immediate_actions: [           │
│       "অবিলম্বে সরে যান",          │
│       "১০১-এ কল করুন",             │
│       "নিরাপদ দূরত্বে সরে যান"     │
│     ],                             │
│     step_by_step: [                │
│       "নিকটতম সিঁড়ি দিয়ে...",     │
│       "সমাবেশ স্থানে যান",          │
│       "জরুরি সেবায় রিপোর্ট করুন"  │
│     ]                              │
│   }                                │
│   (All responses in Bengali)        │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│   HTTP RESPONSE (200)               │
│   Full response in Bengali          │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│   CLIENT DISPLAY (Bengali UI)       │
│   • Emergency type label (Bengali)  │
│   • Immediate actions (Bengali)     │
│   • Helpline: ০১ (Bangladesh)       │
│   • Step-by-step (Bengali)          │
│   • Voice synthesis (Bengali voice) │
│   • Prevention tips (Bengali)       │
│                                     │
│   User receives full guidance in   │
│   their native language             │
└─────────────────────────────────────┘
```

**Supported Languages**:
- en (English) – Default, English context
- hi (Hindi) – India-specific context
- bn (Bengali) – Bangladesh-specific context

**Total Flow Time**: <2 seconds

---

## 6. Chat Interaction Flow

**Scenario**: User asks chatbot for emergency guidance

```
┌─────────────────────────────────────┐
│  USER TYPES IN CHAT: "Fire safety?"│
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│  CLIENT: Build Chat Message         │
│  {                                  │
│    message: "Fire safety?",         │
│    language: "en",                  │
│    context: "general",              │
│    timestamp: 2026-04-20T10:30Z     │
│  }                                  │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│  POST /api/chat                     │
│  Send message to server             │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│  SERVER: Process Message            │
│  1. Store in chat_history table     │
│  2. Build AI prompt with context    │
│  3. Add recent chat history         │
│  4. Include emergency tips if      │
│     user in crisis mode            │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│  BUILD FULL PROMPT                  │
│  [System: You are helpful AI]        │
│  [History: recent messages]          │
│  [User: "Fire safety?"]             │
│  [Instruction: Respond in English]  │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│  AI ROUTER: Generate Response       │
│  • Try Gemini with 30s timeout      │
│  • Return narrative text (not JSON) │
│  • Response: "Fire safety involves..│
│    1. Install detectors... 2. Exit │
│    planning... 3. Practice drills.."│
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│  BUILD RESPONSE                     │
│  {                                  │
│    user_message: "Fire safety?",    │
│    bot_response: "Full AI response",│
│    sentiment: "informational",      │
│    confidence: 0.92,                │
│    suggested_actions: null,         │
│    timestamp: 2026-04-20T10:30Z     │
│  }                                  │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│  HTTP RESPONSE (200)                │
│  Return chat response to client     │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│  CLIENT: Display in Chat Box        │
│  1. Show user message (left side)   │
│  2. Show bot response (right side)  │
│  3. Add timestamp                   │
│  4. Store in localStorage for      │
│     offline access                 │
│  5. Enable voice read-out option   │
│  6. Keep in chat history           │
│  7. Auto-scroll to latest message  │
└─────────────────────────────────────┘
```

**Chat Flow Summary**:
- One message per request
- Context maintained in localStorage
- Previous messages accessible for history
- Voice-enabled read-back available

---

## Performance Metrics

### End-to-End Response Times

| Flow | Avg Time | 95th % | Notes |
|------|----------|--------|-------|
| SOS Trigger | 2.5s | 4.5s | Includes AI classification |
| Admin Notification | <1s | 1.5s | WebSocket or polling |
| Classification | 1.2s | 2.0s | Gemini inference |
| System Creation | 3.5s | 5.0s | Includes AI template generation |
| Chat Message | 1.5s | 2.5s | AI response generation |
| Location Query | 0.8s | 1.2s | Database lookup |

### Data Volume per Operation

| Operation | Request | Response | Stored |
|-----------|---------|----------|--------|
| SOS | 200 bytes | 1.2 KB | 2.5 KB |
| Classification | 300 bytes | 2.5 KB | 3.0 KB |
| Custom System | 5 KB | 6 KB | 10 KB |
| Chat | 100 bytes | 1.5 KB | 2.0 KB |

---

**Data Flow Documentation Complete** 📊
