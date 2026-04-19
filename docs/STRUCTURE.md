# ResQAI - Project Structure

## 📁 Directory Tree

```
d:\Development\Projects\Rapid Crisis Response/
│
├── docs/                          # 📚 Documentation
│   ├── README.md                  # Main documentation
│   ├── STRUCTURE.md              # This file
│   ├── FEATURES.md               # Feature overview
│   └── SETUP.md                  # Setup instructions
│
├── public/                        # 🌐 Frontend (Served by Express)
│   ├── pages/                    # HTML entry points
│   │   ├── index.html            # Main dashboard page
│   │   └── loader.html           # Liquid fill loader
│   │
│   ├── styles/                   # CSS stylesheets
│   │   └── main.css              # Master stylesheet (was styles.css)
│   │
│   ├── scripts/                  # JavaScript modules
│   │   ├── app.js                # Main entry point & state machine
│   │   │
│   │   ├── modules/              # Feature modules
│   │   │   ├── dashboard.js      # Dashboard logic (was dashboard-enhanced.js)
│   │   │   ├── chatbot.js        # AI chatbot interface
│   │   │   ├── nearby.js         # Nearby incidents map
│   │   │   ├── voice.js          # Voice command handler
│   │   │   └── features.js       # Feature initialization
│   │   │
│   │   └── utils/                # Shared utilities (to be created)
│   │       ├── api.js            # API request wrapper
│   │       ├── storage.js        # LocalStorage helper
│   │       └── helpers.js        # General utilities
│   │
│   └── assets/                   # Static files
│       ├── icons/                # Icon sprites
│       ├── images/               # Screenshots, hero images
│       └── fonts/                # Custom fonts
│
├── src/                          # 🔧 Backend (Node.js/Express)
│   ├── config/                   # Configuration
│   │   └── constants.js          # App constants
│   │
│   ├── api/                      # REST API handlers
│   │   ├── routes/               # Endpoint implementations
│   │   │   ├── chat.js           # POST /api/chat
│   │   │   ├── emergency.js      # POST /api/emergencies
│   │   │   ├── nearby.js         # GET /api/nearby
│   │   │   ├── voice.js          # POST /api/voice
│   │   │   └── classification.js # POST /api/classification
│   │   │
│   │   └── middleware/           # Express middleware
│   │       └── errorHandler.js   # Error handling
│   │
│   ├── db/                       # Database layer
│   │   ├── models/               # Data models (to be created)
│   │   │   ├── Emergency.js
│   │   │   ├── User.js
│   │   │   └── Incident.js
│   │   │
│   │   └── db.js                 # SQLite initialization
│   │
│   ├── utils/                    # Backend utilities
│   │   ├── aiRouter.js           # Gemini API handler
│   │   └── languages.js          # Localization handler
│   │
│   └── server.js                 # Express app setup
│
├── .env                          # Environment variables (git-ignored)
├── .env.example                  # Example env template
├── .gitignore                    # Git exclude rules
├── emergencies.db                # SQLite database
├── package.json                  # Dependencies & scripts
├── package-lock.json             # Locked versions
└── README.md                     # Root readme (redirects to docs/)
```

---

## 🎯 Key Directories Explained

### `/public` - Frontend Web App
**Purpose**: Served as static files by Express to the browser

**Structure**:
- `pages/` - HTML entry points (index.html, loader.html)
- `styles/` - CSS files for UI styling
- `scripts/` - JavaScript organized by functionality
  - `app.js` - SPA state machine & initialization
  - `modules/` - Feature-specific code (chatbot, dashboard, etc.)
  - `utils/` - Reusable helpers (API calls, storage, etc.)
- `assets/` - Images, icons, fonts

**Key Files**:
- `pages/index.html` - Main SPA container (has inline CSS for loader overlay)
- `pages/loader.html` - Liquid fill animation (iframe)
- `styles/main.css` - Master stylesheet (compiled from multiple sources)
- `scripts/app.js` - State manager for Loader → Selection → Dashboard flow

---

### `/src` - Backend Server
**Purpose**: Express.js server handling API requests, database, and AI

**Structure**:
- `api/` - REST API endpoints
  - `routes/` - Implementation of /api/* endpoints
  - `middleware/` - Express middleware (error handling, auth, etc.)
- `db/` - Database layer
  - `models/` - Data model definitions
  - `db.js` - SQLite connection & initialization
- `utils/` - Helpers
  - `aiRouter.js` - Gemini API integration
  - `languages.js` - Multi-language support

**Key Files**:
- `server.js` - Express app setup, CORS, static serving
- `api/routes/chat.js` - Chat endpoint handler
- `api/routes/emergency.js` - Emergency reporting endpoint

---

### `/docs` - Documentation
**Purpose**: Developer-facing guides and specifications

**Contains**:
- `README.md` - Project overview & quick start
- `STRUCTURE.md` - This file (directory explanation)
- `FEATURES.md` - Feature specification
- `SETUP.md` - Detailed setup & deployment

---

## 📊 Data Flow

```
┌─────────────────────────────────────────────┐
│         BROWSER (Frontend)                  │
│ ┌─────────────────────────────────────────┐ │
│ │  pages/index.html                       │ │
│ │  + scripts/app.js (State Machine)       │ │
│ │  + styles/main.css                      │ │
│ │  + modules/* (Features)                 │ │
│ └─────────────────────────────────────────┘ │
└──────────────┬──────────────────────────────┘
               │ HTTP/AJAX
               ▼
┌─────────────────────────────────────────────┐
│      Express SERVER (src/server.js)         │
│ ┌─────────────────────────────────────────┐ │
│ │  /api/chat             → routes/chat.js │ │
│ │  /api/emergencies      → routes/emer... │ │
│ │  /api/nearby           → routes/nearby.js│ │
│ │  /api/voice            → routes/voice.js│ │
│ │  /api/classification   → routes/class...│ │
│ └─────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────┐ │
│ │  Utilities & Middleware                 │ │
│ │  - aiRouter.js (Gemini API)             │ │
│ │  - errorHandler.js                      │ │
│ │  - languages.js                         │ │
│ └─────────────────────────────────────────┘ │
└──────────────┬──────────────────────────────┘
               │
               ├─→ SQLite DB (db/db.js)
               └─→ Gemini API (utils/aiRouter.js)
```

---

## 🔄 Frontend Module Organization

### `scripts/app.js` (Main Entry Point)
```javascript
// Exports:
- transitionToSelection()      // Loader → Selection Screen
- selectRescueSystem(type)     // Selection → Dashboard
- transitionToDashboard()      // Show main dashboard
- showToast(message)           // Toast notifications
```

### `scripts/modules/dashboard.js`
```javascript
// Handles:
- Tab switching (Dashboard, Report, Chat, etc.)
- Real-time statistics updates
- Safety score calculation
- Map initialization
```

### `scripts/modules/chatbot.js`
```javascript
// Handles:
- Chat message UI rendering
- API calls to /api/chat
- Message history
- Quick action buttons
```

### `scripts/modules/nearby.js`
```javascript
// Handles:
- Leaflet map rendering
- Nearby incidents fetching
- Incident markers & clustering
- Distance calculations
```

---

## 🔧 Backend Route Organization

### `/api/chat` (POST)
**File**: `src/api/routes/chat.js`
```
POST /api/chat
Body: { message, language }
Response: { reply, confidence }
```

### `/api/emergencies` (POST)
**File**: `src/api/routes/emergency.js`
```
POST /api/emergencies
Body: { type, location, description }
Response: { id, guidance, contacts }
```

### `/api/nearby` (GET)
**File**: `src/api/routes/nearby.js`
```
GET /api/nearby?lat=28.7&lng=77.1&radius=5
Response: [{ id, type, distance, location }]
```

---

## 🎨 CSS Architecture

**File**: `public/styles/main.css` (Combined from multiple parts)

**Sections**:
1. **CSS Variables** - Colors, spacing, shadows
2. **Base Styles** - Typography, resets
3. **Navbar** - Navigation styling
4. **Components** - Cards, buttons, modals
5. **Loader Styles** - Liquid animation overlay
6. **Selection Screen** - Glassmorphism, cards
7. **Dashboard** - Tab content styling
8. **Responsive** - Media queries (1024px, 768px, 480px)

---

## 📦 Dependencies

See `package.json` for full list:

**Backend**:
- `express` - Web framework
- `cors` - Cross-origin requests
- `dotenv` - Environment variables
- `sqlite3` - Database

**Frontend** (CDN):
- `leaflet.js` - Maps
- `font-awesome` - Icons

---

## 🚀 Development Workflow

### Adding a New Feature
1. Create module in `scripts/modules/newfeature.js`
2. Add router in `src/api/routes/newfeature.js`
3. Add styles to `styles/main.css`
4. Import in `app.js`
5. Update `pages/index.html` if needed

### Adding a New API Endpoint
1. Create `src/api/routes/endpoint.js`
2. Import in `src/server.js`
3. Mount with `app.use('/api/endpoint', endpointRoutes)`
4. Call from frontend via fetch

### Modifying Styles
1. Edit `public/styles/main.css`
2. Use CSS variables for colors
3. Add mobile breakpoints (768px, 480px)
4. No CSS frameworks - vanilla CSS only

---

## 🔗 Cross-References

**From HTML to Assets**:
```html
<!-- In pages/index.html -->
<link rel="stylesheet" href="../styles/main.css">
<script src="../scripts/app.js"></script>
```

**From server.js to API routes**:
```javascript
import chatRoutes from './api/routes/chat.js';
app.use('/api/chat', chatRoutes);
```

**From frontend to backend**:
```javascript
// In scripts/modules/chatbot.js
fetch('/api/chat', { method: 'POST', body: data })
```

---

## 📋 File Naming Conventions

| Type | Convention | Example |
|------|-----------|---------|
| HTML Pages | lowercase.html | `index.html`, `loader.html` |
| CSS Files | descriptive.css | `main.css` |
| JS Modules | camelCase.js | `dashboard.js`, `chatbot.js` |
| API Routes | feature.js | `chat.js`, `emergency.js` |
| Utilities | descriptiveHelper.js | `errorHandler.js` |

---

## ✅ Hackathon Checklist

- [ ] All files organized in correct directories
- [ ] Path references updated (HTML, server.js)
- [ ] No old directories remaining
- [ ] Documentation complete
- [ ] Dependencies in package.json
- [ ] Environment variables in .env.example
- [ ] Git commits for structure changes

---

**Last Updated**: April 2026  
**Structure Version**: 1.0 (Hackathon-Ready)
