# 🎮 Modules Documentation

Detailed explanation of ResQAI's 3 core modules.

---

## 🚀 Module 1: Rapid Crisis Protocol

**Location**: `public/pages/guest-crisis-portal.html`

**Purpose**: Standalone guest-facing emergency response system for the public.

### User Interface

#### Portal View
**File**: `public/pages/guest-crisis-portal.html`

**Layout**:
- **Tabbed Interface**:
  1. Dashboard (Statistics & briefing)
  2. Report (Create emergency)
  3. Chat (AI guidance)
  4. Nearby (Map of incidents)
  5. Map (Interactive mapping)

#### Dashboard Tab
**Features**:
- Real-time statistics:
  - Total emergencies
  - Active incidents
  - Resolved incidents
- Safety score (0-100)
- Daily risk insights
- Morning safety brief modal
- Quick action buttons for common emergencies

**Data Source**: `/api/emergencies`, `/api/classification`

#### Report Tab
**Features**:
- Emergency description form
- Location input
- Photo attachment
- Severity selection
- AI classification on submit
- Results display with confidence score

**Data Flow**:
```
User Input Form
    ↓
POST /api/emergencies
    ↓
AI Classification
    ↓
Display Results with Guidance
```

#### Chat Tab
**File**: `public/pages/guest-crisis-portal.html`

**Features**:
- Multi-language support (en, hi, bn)
- Emergency-specific quick buttons:
  - Fire
  - Medical Emergency
  - Flood
  - Accidents
- Free text input
- Chat history
- Context-aware responses
- AI-powered guidance

**Data Flow**:
```
User Message
    ↓
POST /api/chat (with language)
    ↓
AI Router generates response
    ↓
Display in chat interface
```

#### Nearby Tab
**File**: `public/pages/guest-crisis-portal.html`

**Features**:
- Interactive map (Leaflet.js)
- Real-time incident markers
- Within 5km radius
- Distance display
- Cluster markers for dense areas
- Incident detail modals on click
- Location permission handling
- Auto-refresh every 60 seconds

**Data Flow**:
```
Get user location
    ↓
GET /api/nearby?lat=&lon=&radius=5000
    ↓
Render incident markers
    ↓
Display details on click
```

#### Map Tab
**Features**:
- Full-screen interactive map
- Safe zone overlays
- Evacuation route visualization
- Incident density heatmap
- Route optimization

---

### Data Storage (Client-Side)

**localStorage Keys**:
```javascript
localStorage.getItem('dashboard_statistics')      // Dashboard stats
localStorage.getItem('chat_history')              // Chat messages
localStorage.getItem('emergencies_cache')         // Emergency list
localStorage.getItem('user_preferences')          // Language, theme
localStorage.getItem('location_permissions')      // Geolocation consent
```

### API Endpoints Used

| Endpoint | Purpose | Trigger |
|----------|---------|---------|
| POST /api/emergencies | Create emergency report | Report form submit |
| GET /api/emergencies | List emergencies | Dashboard load, filter |
| POST /api/classification | Classify emergency | Auto on submit |
| POST /api/chat | Chatbot message | Chat input |
| GET /api/nearby/nearby | Get nearby incidents | Map load, location change |
| POST /api/voice/transcribe | Speech to text | Voice button click |
| GET /api/portal/safety-tip | Random safety tips | Dashboard refresh |
| GET /api/portal/safe-zones | Get safe shelter | After classification |

---

## 🏨 Module 2: EcoPlus (Hotel Emergency Module)

**Location**: `public/modules/echo-plus/`

**Purpose**: Specialized emergency management for hotels, resorts, and hospitality properties.

### Dual Interface Architecture

#### Guest Interface

**User Flow**:
1. Guest logs in or checks in
2. Enters room/floor information
3. Dashboard shows:
   - Room location
   - Quick emergency buttons
   - Staff contact info
   - Safety tips
4. In emergency:
   - Selects emergency type
   - Receives AI guidance in real-time
   - Staff notified automatically
   - Position tracked on admin dashboard

**Key Features**:
- Position tracking (floor, room, zone)
- Language selection (English, Hindi, Bengali)
- Voice-guided evacuation
- Real-time staff notifications
- Chat with staff
- Auto-response suggestions

**Files**:
- `index.html` - Guest interface template
- `js/app.js` - Main guest logic
- `js/chat.js` - Guest-staff chat
- `js/aicall.js` - Voice guidance (Web Speech API)
- `js/helpers.js` - Utility functions
- `js/config.js` - Configuration

**Data Flow (Guest)**:
```
Guest Selects Emergency
    ↓
POST /api/ai/emergency-guidance
    (with floor, room, emergency_type)
    ↓
AI generates hotel-specific guidance
    ↓
Display step-by-step instructions
    ↓
Notify admin dashboard
    ↓
Track guest position on map
```

#### Admin/Staff Interface

**User Flow**:
1. Staff member logs in
2. Views real-time incident dashboard
3. Sees:
   - Active guests with positions
   - Active emergencies
   - Staff assignments
   - Communication channels
4. In emergency:
   - Activates emergency mode
   - Sends targeted messages to floors
   - Coordinates evacuation
   - Tracks completion
   - Receives guest feedback

**Key Features**:
- Real-time guest tracking
- Incident dashboard
- Staff member management
- Bulk notification system
- Floor-by-floor coordination
- Communication history
- Evacuation status tracking
- AI-generated staff instructions

**Files**:
- `wrapper.html` - Admin wrapper template
- `js/module.js` - Admin module initialization
- `js/data.js` - Data management
- `js/ai-safe.js` - AI integration for admin
- `css/hotel-safe.css` - Admin styling

**Data Flow (Admin)**:
```
Emergency Alert from Guest
    ↓
Received on Admin Dashboard
    ↓
View incident details & guest position
    ↓
Generate staff instructions
    ↓
POST /api/ai/emergency-guidance
    (for staff coordination)
    ↓
Send bulk alerts to affected zones
    ↓
Track guest movements
    ↓
Log completion events
```

### Guest Position Tracking System

**Data Structure**:
```javascript
{
  building: "Main Building",
  floor: "3",
  room: "305",
  zone: "North Wing",
  safe_distance_from_exit: 50  // meters
}
```

**Safe Zone Detection**:
- Building layout pre-configured
- Evacuation routes per floor
- Assembly point assignments
- Nearest exit calculation

### Communication Channels

**Guest → Staff**:
- Emergency button (one-click activation)
- Chat messages
- Voice calls (Web Speech API)

**Staff → Guest**:
- Targeted floor notifications
- Room-specific instructions
- Zone-based alerts
- Voice announcements (via PA system)

### Database/Storage

**Server-side** (for multi-property integration):
```sql
-- Hotel properties
CREATE TABLE hotel_properties (
  id VARCHAR(36) PRIMARY KEY,
  property_name VARCHAR(255),
  address TEXT,
  contact_email VARCHAR(255),
  total_rooms INT,
  total_floors INT
);

-- Active guests
CREATE TABLE hotel_guests (
  id VARCHAR(36) PRIMARY KEY,
  property_id VARCHAR(36),
  room_number VARCHAR(10),
  floor INT,
  check_in TIMESTAMP,
  check_out TIMESTAMP,
  emergency_contact VARCHAR(20)
);

-- Emergency logs
CREATE TABLE hotel_emergencies (
  id VARCHAR(36) PRIMARY KEY,
  property_id VARCHAR(36),
  guest_id VARCHAR(36),
  type VARCHAR(50),
  severity VARCHAR(20),
  resolved_at TIMESTAMP
);
```

**Client-side** (localStorage):
```javascript
localStorage['hotel_property_id'] = '...';
localStorage['guest_room'] = '305';
localStorage['guest_floor'] = '3';
localStorage['emergency_log'] = JSON.stringify([...]);
```

### AI Integration Points

1. **Emergency Guidance Generation**
   - Endpoint: `POST /api/ai/emergency-guidance`
   - Input: floor, room, emergency_type, severity
   - Output: Step-by-step guest guidance + staff instructions

2. **Staff Decision Support**
   - AI recommends evacuation order by floor
   - Suggests communication templates
   - Calculates safe zones based on incident type

3. **Sentiment Analysis** (Optional)
   - Analyze guest voice for panic levels
   - Adjust guidance tone accordingly

---

## 🛠️ Module 3: SQBitain (Custom Rescue Builder)

**Location**: `public/modules/rescue-builder/`

**Purpose**: Allow any organization to create custom emergency response systems.

### Supported Organization Types

- Schools
- Hospitals
- Hostels
- Restaurants
- Corporate offices
- Government offices
- NGOs
- Custom organizations

### User Workflow

#### Step 1: Organization Selection/Description

**User Chooses**:
```
Organization Type: [Select from list] OR [Describe custom]

Example inputs:
- "A 5-floor corporate office with 500 employees"
- "A school with 3 buildings and 1500 students"
- "A hospital with emergency ward and 4 departments"
```

**Files**: `js/builder.js` (initial screen)

#### Step 2: AI Template Generation

**Process**:
1. User submits description
2. POST `/api/custom-system/generate-template`
3. AI analyzes description
4. Generates JSON template with:
   - Building structure
   - Staff roles
   - Risk categories
   - Departments/zones
   - Contact procedures

**Example Generated Template**:
```json
{
  "organization_name": "ABC School",
  "organization_type": "school",
  "structure": {
    "buildings": [
      {
        "name": "Main Building",
        "floors": ["Ground", "First", "Second"],
        "zones": {
          "Ground": ["Reception", "Office", "Cafeteria"],
          "First": ["Classrooms 1-10"],
          "Second": ["Classrooms 11-20"]
        }
      },
      {
        "name": "Sports Complex",
        "floors": ["Ground"],
        "zones": { "Ground": ["Gym", "Pool"] }
      }
    ]
  },
  "staff": [
    { "name": "Principal", "role": "Emergency Coordinator", "phone": "" },
    { "name": "Head Boy", "role": "Floor Captain", "phone": "" },
    { "name": "Nurse", "role": "Medical Lead", "phone": "" }
  ],
  "risk_types": ["fire", "medical", "intruder", "natural_disaster"],
  "communication_channels": ["PA System", "SMS", "Email"]
}
```

#### Step 3: Review & Customize

**User Can Edit**:
- Building names & structure
- Staff member names, roles, phone numbers
- Risk categories (add/remove)
- Safe assembly points
- Communication methods
- Evacuation procedures

**Files**: `js/builder.js` (customization interface)

**Real-time Validation**:
- Required fields check
- Staff role completeness
- Risk category coverage

#### Step 4: System Activation

**On Save**:
1. System gets unique `systemID` (UUID)
2. Bound to user's `userID`
3. Status set to "active"
4. Can be shared with team members
5. Emergency logging begins

**API**: `POST /api/custom-system/create`

#### Step 5: Emergency Response

**During Emergency**:

**User Flow**:
1. Emergency detected or activated
2. System enters "emergency" mode
3. Can log emergency: `POST /api/custom-system/log-emergency`
4. AI generates targeted guidance
5. Broadcast alerts to team: `POST /api/custom-system/broadcast-alert`

**Example Emergency Flow**:
```
Fire detected on First Floor
    ↓
POST /api/custom-system/log-emergency
    {system_id, type: "fire", location: "First Floor"}
    ↓
System retrieves staff assignments for First Floor
    ↓
POST /api/custom-system/generate-guidance
    (with floor, emergency_type, staff list)
    ↓
AI generates:
    - Evacuation sequence
    - Staff assignments
    - Safe assembly points
    - Communication messages
    ↓
Broadcast via PA System, SMS, Email
    ↓
Log completion status
```

### System Management UI

**Files**: `js/templates.js`, `index.html`

**Available Actions**:
- Create new system
- View system list
- Open system (view/edit)
- Delete system
- Export system (backup)
- View emergency logs
- Generate reports

**System List Display**:
```
Organization Name | Type | Status | Created | Actions
ABC School        | school | active | Apr 20 | [Edit] [Logs] [Delete]
```

**System Status**:
- `active` - Normal operations, monitoring
- `monitoring` - Enhanced alert mode
- `emergency` - Active emergency situation
- `disabled` - Not in use

### Multi-Tenant Isolation

**Implementation** (`src/api/routes/custom-system.js`):

**Create**:
```javascript
const systemID = generateUUID();
const userID = req.user?.userID || 'anonymous-' + generateUUID();
db.insert('systems', { id: systemID, user_id: userID, ... });
```

**Retrieve User Systems**:
```javascript
// Only return systems where user_id = current user
SELECT * FROM systems WHERE user_id = ?;
```

**Update/Delete** (Ownership Check):
```javascript
const system = db.query('SELECT user_id FROM systems WHERE id = ?', [systemID]);
if (system.user_id !== req.user.userID) {
  return 403 Forbidden;
}
// Proceed with update/delete
```

### Data Storage

**Server-side** (MySQL):
```sql
CREATE TABLE systems (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  organization_name VARCHAR(255),
  organization_type VARCHAR(50),
  location VARCHAR(255),
  contact_email VARCHAR(255),
  structure_json LONGTEXT,      -- Full structure/layout
  staff_json LONGTEXT,          -- Staff assignments
  risk_types_json LONGTEXT,     -- Risk categories
  status VARCHAR(50),           -- active|monitoring|emergency
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE system_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  system_id VARCHAR(36),
  action VARCHAR(100),          -- emergency_logged, alert_broadcast, etc
  details LONGTEXT,
  created_at TIMESTAMP,
  FOREIGN KEY (system_id) REFERENCES systems(id) ON DELETE CASCADE
);
```

**Client-side** (localStorage):
```javascript
localStorage['systemID'] = 'uuid-123';
localStorage['systemData'] = JSON.stringify({
  organization_name: 'ABC School',
  structure: {...},
  staff: {...},
  risk_types: [...]
});
localStorage['emergency_logs'] = JSON.stringify([...]);
```

### AI Integration Points

1. **Template Generation**
   - Endpoint: `POST /api/custom-system/generate-template`
   - Input: Organization description
   - Output: JSON structure, staff roles, risk types

2. **Custom Guidance Generation**
   - Endpoint: `POST /api/custom-system/generate-guidance`
   - Input: System ID, emergency type, context
   - Output: Step-by-step guidance, staff instructions, communication messages

3. **Emergency Analysis**
   - AI can analyze organization structure
   - Recommend optimal evacuation routes
   - Suggest staff role assignments based on org type

### Supported Themes & Branding

**Theme by Organization Type**:
```javascript
const THEMES = {
  school: { color: '#4CAF50', icon: '🏫' },
  hospital: { color: '#E91E63', icon: '🏥' },
  hostel: { color: '#2196F3', icon: '🏢' },
  restaurant: { color: '#FF9800', icon: '🍽️' },
  corporate: { color: '#673AB7', icon: '💼' }
}
```

---

## 🔗 Module Integration

All 3 modules connect at the API layer:

```
┌────────────────────────────────────────┐
│     API Layer (/api/*)                 │
├────────────────────────────────────────┤
│ • /api/emergencies (shared)            │
│ • /api/classification (shared)         │
│ • /api/chat (shared)                   │
│ • /api/ai/emergency-guidance (EcoPlus) │
│ • /api/custom-system/* (SQBitain)      │
└────────────────────────────────────────┘
              ▲      ▲      ▲
              │      │      │
    ┌─────────┘      │      └──────────┐
    │                │                 │
    ▼                ▼                 ▼
┌─────────┐    ┌──────────┐      ┌────────────┐
│  Rapid  │    │ EcoPlus  │      │ SQBitain   │
│ Crisis  │    │ (Hotel)  │      │ (Custom)   │
│Protocol │    │          │      │            │
└─────────┘    └──────────┘      └────────────┘
```

---

**Module documentation complete** 🎯
