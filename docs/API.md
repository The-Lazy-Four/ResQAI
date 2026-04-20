# 📡 API Reference

Complete documentation of all ResQAI API endpoints.

**Base URL**: `http://localhost:3000/api`

---

## Authentication Routes

### Register User
**Endpoint**: `POST /auth/register`

**Request**:
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "first_name": "John",
  "last_name": "Doe"
}
```

**Response** (201):
```json
{
  "success": true,
  "userID": "uuid-123",
  "email": "user@example.com",
  "message": "User registered successfully"
}
```

**Errors**:
- 400: Invalid input
- 409: Email already exists

---

### Login
**Endpoint**: `POST /auth/login`

**Request**:
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response** (200):
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "expires_in": 604800,
  "userID": "uuid-123"
}
```

**Errors**:
- 400: Missing credentials
- 401: Invalid email/password

---

### Verify Token
**Endpoint**: `POST /auth/verify`

**Headers**:
```
Authorization: Bearer <token>
```

**Response** (200):
```json
{
  "valid": true,
  "userID": "uuid-123",
  "email": "user@example.com"
}
```

**Errors**:
- 401: Invalid token

---

### Logout
**Endpoint**: `POST /auth/logout`

**Headers**:
```
Authorization: Bearer <token>
```

**Response** (200):
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

## Emergency Routes

### Create Emergency
**Endpoint**: `POST /emergencies`

**Request**:
```json
{
  "description": "Fire in building",
  "location": "123 Main St, City",
  "severity": "high",
  "latitude": 40.7128,
  "longitude": -74.0060,
  "image": "base64-encoded-image"
}
```

**Response** (201):
```json
{
  "id": "emergency-uuid-123",
  "description": "Fire in building",
  "location": "123 Main St, City",
  "severity": "high",
  "status": "pending",
  "classified_type": "fire",
  "confidence_score": 0.95,
  "ai_suggestions": [
    "Evacuate immediately",
    "Call fire brigade",
    "Move to safe distance"
  ],
  "created_at": "2026-04-20T10:30:00Z"
}
```

**Errors**:
- 400: Missing required fields
- 500: AI classification failed

---

### List Emergencies
**Endpoint**: `GET /emergencies`

**Query Parameters**:
```
status=pending          # Filter by status: pending|resolved|dismissed
type=fire              # Filter by classified type
limit=20               # Pagination limit
offset=0               # Pagination offset
```

**Response** (200):
```json
{
  "count": 5,
  "emergencies": [
    {
      "id": "emergency-uuid-123",
      "description": "Fire in building",
      "location": "123 Main St",
      "classified_type": "fire",
      "confidence_score": 0.95,
      "status": "pending",
      "created_at": "2026-04-20T10:30:00Z"
    }
  ]
}
```

---

### Get Single Emergency
**Endpoint**: `GET /emergencies/:id`

**Response** (200):
```json
{
  "id": "emergency-uuid-123",
  "description": "Fire in building",
  "location": "123 Main St, City",
  "severity": "high",
  "status": "pending",
  "classified_type": "fire",
  "confidence_score": 0.95,
  "ai_suggestions": [...],
  "risk_scores": {
    "fire_risk": 0.95,
    "flood_risk": 0.1,
    "medical_risk": 0.2,
    "accident_risk": 0.3
  },
  "created_at": "2026-04-20T10:30:00Z"
}
```

---

### Update Emergency
**Endpoint**: `PATCH /emergencies/:id`

**Request**:
```json
{
  "status": "resolved",
  "confidence_score": 0.95,
  "classified_type": "fire"
}
```

**Response** (200):
```json
{
  "id": "emergency-uuid-123",
  "status": "resolved",
  "updated_at": "2026-04-20T10:35:00Z"
}
```

---

### Delete Emergency
**Endpoint**: `DELETE /emergencies/:id`

**Response** (200):
```json
{
  "success": true,
  "message": "Emergency deleted"
}
```

---

## Classification Routes

### Classify Emergency
**Endpoint**: `POST /classification`

**Request**:
```json
{
  "description": "I see flames and smoke",
  "language": "en"
}
```

**Response** (200):
```json
{
  "type": "fire",
  "confidence": 0.95,
  "reasoning": "High confidence due to mentions of flames and smoke",
  "immediate_actions": [
    "Evacuate immediately",
    "Call 101",
    "Use nearest exit"
  ],
  "step_by_step": [
    "Leave the building via nearest safe exit",
    "Move to assembly point",
    "Report to emergency services"
  ],
  "prevention_tips": [
    "Check fire extinguishers",
    "Keep exits clear",
    "Practice fire drills"
  ],
  "risk_scores": {
    "fire_risk": 0.95,
    "flood_risk": 0.1,
    "medical_risk": 0.1,
    "accident_risk": 0.2
  }
}
```

**Errors**:
- 400: Missing description
- 500: AI provider unavailable

---

## Chat Routes

### Send Chat Message
**Endpoint**: `POST /chat`

**Request**:
```json
{
  "message": "What should I do in a fire?",
  "language": "en",
  "context": "emergency_guidance"
}
```

**Response** (200):
```json
{
  "user_message": "What should I do in a fire?",
  "bot_response": "In case of fire: 1) Stay calm 2) Call 101 3) Evacuate immediately...",
  "timestamp": "2026-04-20T10:30:00Z",
  "sentiment": "informational",
  "suggested_actions": ["Call fire brigade", "Evacuate building"]
}
```

**Supported Languages**:
- `en` - English
- `hi` - Hindi
- `bn` - Bengali

---

### Chat Health Check
**Endpoint**: `GET /chat/health`

**Response** (200):
```json
{
  "status": "healthy",
  "message": "Chat service operational"
}
```

---

## Voice Routes

### Text to Speech
**Endpoint**: `POST /voice/speak`

**Request**:
```json
{
  "text": "Fire detected on third floor",
  "language": "en",
  "voice_gender": "neutral"
}
```

**Response** (200):
```json
{
  "success": true,
  "audio_url": "/audio/voice-123.mp3",
  "duration": 3.5
}
```

---

### Speech to Text Initiation
**Endpoint**: `POST /voice/transcribe`

**Request**:
```json
{
  "audio_blob": "base64-encoded-audio",
  "language": "en"
}
```

**Response** (202):
```json
{
  "request_id": "transcribe-123",
  "status": "processing",
  "message": "Transcription in progress"
}
```

---

### Transcription Callback
**Endpoint**: `POST /voice/transcribe-callback`

**Request**:
```json
{
  "request_id": "transcribe-123",
  "text": "There is a fire"
}
```

**Response** (200):
```json
{
  "success": true,
  "original_request_id": "transcribe-123",
  "recognized_text": "There is a fire",
  "confidence": 0.92
}
```

---

## Location & Nearby Routes

### Get Nearby Incidents
**Endpoint**: `GET /nearby/nearby`

**Query Parameters**:
```
latitude=40.7128      # Required
longitude=-74.0060    # Required
radius=5000           # Optional (meters, default 5000)
```

**Response** (200):
```json
{
  "incidents": [
    {
      "id": "incident-123",
      "type": "fire",
      "severity": "high",
      "latitude": 40.7130,
      "longitude": -74.0065,
      "distance": 450,
      "description": "Building fire",
      "timestamp": "2026-04-20T10:25:00Z"
    }
  ],
  "count": 1
}
```

---

### Get Incident Details
**Endpoint**: `GET /nearby/incident/:id`

**Response** (200):
```json
{
  "id": "incident-123",
  "type": "fire",
  "severity": "high",
  "location": "100 Broadway, NYC",
  "latitude": 40.7130,
  "longitude": -74.0065,
  "description": "Multi-story building fire",
  "affected_area": 500,
  "evacuation_zones": ["Zone A", "Zone B"],
  "emergency_services": {
    "fire": "101",
    "medical": "108"
  },
  "created_at": "2026-04-20T10:00:00Z"
}
```

---

### Create Alert Beacon
**Endpoint**: `POST /nearby/alert`

**Request**:
```json
{
  "type": "fire",
  "latitude": 40.7128,
  "longitude": -74.0060,
  "radius": 1000,
  "description": "Building fire - evacuate area"
}
```

**Response** (201):
```json
{
  "alert_id": "alert-123",
  "type": "fire",
  "broadcast_radius": 1000,
  "affected_users": 45,
  "created_at": "2026-04-20T10:30:00Z"
}
```

---

## AI System Routes

### Check AI Health
**Endpoint**: `GET /ai/health`

**Response** (200):
```json
{
  "status": "healthy",
  "providers": {
    "gemini": "active",
    "openrouter": "active",
    "groq": "active",
    "free_ai": "available"
  },
  "primary": "gemini",
  "last_used": "gemini",
  "timestamp": "2026-04-20T10:35:00Z"
}
```

---

### Emergency Guidance (Hotel-Specific)
**Endpoint**: `POST /ai/emergency-guidance`

**Request**:
```json
{
  "emergency_type": "fire",
  "floor": "3",
  "room_number": "305",
  "severity": "high",
  "description": "Fire on corridor",
  "language": "en"
}
```

**Response** (200):
```json
{
  "guidance": "Evacuate immediately via nearest stairwell. Do NOT use elevators. Move to assembly point in parking lot. Report to staff upon arrival.",
  "immediate_actions": [
    "Alert nearby guests",
    "Evacuate via stairwell",
    "Move to assembly point"
  ],
  "staff_instructions": "Coordinate floor evacuation. Account for all guests. Report missing persons.",
  "provider_used": "gemini",
  "confidence": 0.94,
  "timestamp": "2026-04-20T10:30:00Z"
}
```

---

### Test AI Provider
**Endpoint**: `POST /ai/test-ai`

**Request**:
```json
{
  "test_prompt": "What should I do in a fire?"
}
```

**Response** (200):
```json
{
  "success": true,
  "provider": "gemini",
  "response": "In case of fire...",
  "response_time": 1234,
  "model": "gemini-2.5-flash"
}
```

---

### Test Groq Provider
**Endpoint**: `POST /ai/test-groq`

**Request**:
```json
{
  "test_prompt": "Emergency evacuation protocol?"
}
```

**Response** (200):
```json
{
  "success": true,
  "provider": "groq",
  "response": "Evacuation protocol...",
  "response_time": 2345,
  "model": "mixtral-8x7b-32768"
}
```

---

## Portal/Crisis Routes

### Get Random Safety Tip
**Endpoint**: `GET /portal/safety-tip`

**Response** (200):
```json
{
  "tip": "Always keep emergency numbers saved in your phone",
  "category": "preparedness",
  "language": "en"
}
```

---

### Get Nearby Alerts
**Endpoint**: `GET /portal/nearby-alerts`

**Query Parameters**:
```
latitude=40.7128
longitude=-74.0060
radius=5000
```

**Response** (200):
```json
{
  "alerts": [
    {
      "id": "alert-123",
      "type": "fire",
      "severity": "high",
      "distance": 450,
      "ai_analysis": "Possible building evacuation required",
      "recommendations": ["Evacuate area", "Call authorities"]
    }
  ]
}
```

---

### SOS Log (Emergency Activation)
**Endpoint**: `POST /portal/sos-log`

**Request**:
```json
{
  "emergency_type": "fire",
  "latitude": 40.7128,
  "longitude": -74.0060,
  "language": "en",
  "custom_description": "Fire on 3rd floor"
}
```

**Response** (200):
```json
{
  "sos_id": "sos-uuid-123",
  "emergency_type": "fire",
  "helpline_number": "101",
  "helpline_name": "Fire Brigade",
  "ai_suggestion": "Evacuate building immediately...",
  "safe_zones": [
    { "name": "Park", "distance": 200 },
    { "name": "Hospital", "distance": 500 }
  ],
  "created_at": "2026-04-20T10:30:00Z"
}
```

---

### Get AI Guidance
**Endpoint**: `POST /portal/ai-guide`

**Request**:
```json
{
  "query": "What do I do in a flood?",
  "location": "123 Main St",
  "language": "en"
}
```

**Response** (200):
```json
{
  "guidance": "In case of flood: 1) Move to higher ground 2) Avoid water contact 3) Call authorities...",
  "relevant_helplines": { "emergency": "108" },
  "safety_tips": ["Don't attempt to swim", "Wait for rescue"],
  "ai_provider": "gemini"
}
```

---

### Get Safe Zones
**Endpoint**: `GET /portal/safe-zones`

**Query Parameters**:
```
incident_type=fire
latitude=40.7128
longitude=-74.0060
```

**Response** (200):
```json
{
  "safe_zones": [
    {
      "id": "zone-1",
      "name": "City Park",
      "type": "shelter",
      "distance": 200,
      "capacity": 5000,
      "address": "456 Park Ave",
      "availability": "available"
    },
    {
      "id": "zone-2",
      "name": "Community Center",
      "type": "evacuation_point",
      "distance": 450,
      "capacity": 2000,
      "availability": "available"
    }
  ]
}
```

---

### Get Evacuation Route
**Endpoint**: `GET /portal/evacuation-route`

**Query Parameters**:
```
from_latitude=40.7128
from_longitude=-74.0060
to_latitude=40.7150
to_longitude=-74.0080
```

**Response** (200):
```json
{
  "route": {
    "distance": 2.5,
    "duration": 5,
    "steps": [
      "Head north on Main Street",
      "Turn right on Broadway",
      "Arrive at destination"
    ],
    "coordinates": [[40.7128, -74.0060], [40.7140, -74.0065], [40.7150, -74.0080]]
  },
  "danger_zones": [],
  "estimated_time": 5,
  "traffic": "light"
}
```

---

### Get Location City
**Endpoint**: `GET /portal/location-city`

**Query Parameters**:
```
latitude=40.7128
longitude=-74.0060
```

**Response** (200):
```json
{
  "city": "New York",
  "state": "NY",
  "country": "USA",
  "region": "Manhattan",
  "zip_code": "10001"
}
```

---

## Custom System Routes

### Create Custom System
**Endpoint**: `POST /custom-system/create`

**Request**:
```json
{
  "organization_name": "ABC School",
  "organization_type": "school",
  "location": "123 Education St",
  "contact_email": "admin@abcschool.edu",
  "structure": {
    "buildings": [
      {
        "name": "Main Building",
        "floors": ["Ground", "First", "Second"],
        "rooms": 50
      }
    ]
  },
  "staff": [
    {
      "name": "John Manager",
      "role": "Coordinator",
      "phone": "+1-555-0100"
    }
  ],
  "risk_types": ["fire", "medical", "intruder"]
}
```

**Response** (201):
```json
{
  "system_id": "system-uuid-123",
  "organization_name": "ABC School",
  "user_id": "user-uuid-456",
  "status": "active",
  "created_at": "2026-04-20T10:30:00Z"
}
```

---

### Get System Details
**Endpoint**: `GET /custom-system/:systemID`

**Response** (200):
```json
{
  "id": "system-uuid-123",
  "user_id": "user-uuid-456",
  "organization_name": "ABC School",
  "organization_type": "school",
  "location": "123 Education St",
  "contact_email": "admin@abcschool.edu",
  "structure": {...},
  "staff": [...],
  "risk_types": ["fire", "medical", "intruder"],
  "status": "active",
  "created_at": "2026-04-20T10:30:00Z",
  "updated_at": "2026-04-20T10:30:00Z"
}
```

---

### List User's Systems
**Endpoint**: `GET /custom-system/user/list`

**Headers**:
```
Authorization: Bearer <token>
```

**Query Parameters**:
```
limit=10
offset=0
```

**Response** (200):
```json
{
  "systems": [
    {
      "id": "system-uuid-123",
      "organization_name": "ABC School",
      "organization_type": "school",
      "status": "active",
      "created_at": "2026-04-20T10:30:00Z"
    }
  ],
  "total": 1
}
```

---

### Update System
**Endpoint**: `PATCH /custom-system/:systemID`

**Headers**:
```
Authorization: Bearer <token>
```

**Request**:
```json
{
  "organization_name": "ABC School Updated",
  "status": "monitoring",
  "structure": {...}
}
```

**Response** (200):
```json
{
  "success": true,
  "updated_fields": ["organization_name", "status"],
  "system_id": "system-uuid-123"
}
```

---

### Delete System
**Endpoint**: `DELETE /custom-system/:systemID`

**Headers**:
```
Authorization: Bearer <token>
```

**Response** (200):
```json
{
  "success": true,
  "message": "System deleted"
}
```

---

### Generate AI Template
**Endpoint**: `POST /custom-system/generate-template`

**Request**:
```json
{
  "organization_description": "A 5-building hospital with 300 beds and emergency ward"
}
```

**Response** (200):
```json
{
  "generated_template": {
    "organization_name": "Hospital",
    "organization_type": "hospital",
    "structure": {
      "buildings": [
        {
          "name": "Main Building",
          "floors": 5,
          "departments": ["Emergency", "ICU", "Surgery", "Pediatrics"]
        }
      ]
    },
    "staff_roles": ["Chief Medical Officer", "Head Nurse", "Emergency Coordinator"],
    "risk_types": ["medical_emergency", "fire", "earthquake", "chemical_spill"],
    "estimated_capacity": 300
  }
}
```

---

### Generate Custom Guidance
**Endpoint**: `POST /custom-system/generate-guidance`

**Request**:
```json
{
  "system_id": "system-uuid-123",
  "emergency_type": "fire",
  "additional_context": "Fire in administrative wing"
}
```

**Response** (200):
```json
{
  "guidance": "Activate fire alarm. Evacuate administrative wing via nearest stairwell. Close fire doors. Assembly point at main parking lot. Call 101.",
  "staff_instructions": [
    "Coordinator to accounting office",
    "Nurse to ICU",
    "Admin to main gate"
  ],
  "communication": "Use PA system for building-wide announcement",
  "provider_used": "gemini"
}
```

---

### Log Emergency to System
**Endpoint**: `POST /custom-system/log-emergency`

**Request**:
```json
{
  "system_id": "system-uuid-123",
  "emergency_type": "fire",
  "location": "3rd floor administrative wing",
  "severity": "high",
  "description": "Fire detected"
}
```

**Response** (201):
```json
{
  "log_id": "log-uuid-789",
  "system_id": "system-uuid-123",
  "emergency_type": "fire",
  "status": "logged",
  "created_at": "2026-04-20T10:30:00Z"
}
```

---

### Broadcast Alert to System
**Endpoint**: `POST /custom-system/broadcast-alert`

**Headers**:
```
Authorization: Bearer <token>
```

**Request**:
```json
{
  "system_id": "system-uuid-123",
  "message": "Fire in building. Evacuate immediately.",
  "alert_type": "emergency",
  "target_zones": ["Ground", "First", "Second"]
}
```

**Response** (200):
```json
{
  "success": true,
  "alert_id": "alert-uuid-999",
  "recipients": 150,
  "zones_affected": 3,
  "created_at": "2026-04-20T10:30:00Z"
}
```

---

## Error Responses

All error responses follow this format:

```json
{
  "error": "Error Type",
  "message": "Detailed error message",
  "code": "ERROR_CODE",
  "timestamp": "2026-04-20T10:30:00Z"
}
```

**Common Error Codes**:

| Code | Status | Meaning |
|------|--------|---------|
| UNAUTHORIZED | 401 | Missing or invalid token |
| FORBIDDEN | 403 | Permission denied |
| NOT_FOUND | 404 | Resource not found |
| INVALID_INPUT | 400 | Invalid request data |
| AI_UNAVAILABLE | 503 | All AI providers offline |
| SERVER_ERROR | 500 | Internal server error |

---

**API Documentation updated: April 20, 2026** 📋
