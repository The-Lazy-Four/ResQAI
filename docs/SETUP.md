# ResQAI - Development Setup Guide

## 🚀 Quick Start (5 minutes)

### Prerequisites
- Node.js v16+ ([Download](https://nodejs.org/))
- npm or yarn
- Git
- Code editor (VS Code recommended)

### Steps

```bash
# 1. Clone/Pull the repository
cd "d:\Development\Projects\Rapid Crisis Response"

# 2. Install dependencies
npm install

# 3. Create .env file
cp .env.example .env

# 4. Add Gemini API Key
# Edit .env and add your Google Gemini API key:
# GEMINI_API_KEY=your_key_here

# 5. Start the server
npm start

# 6. Open browser
# Visit http://localhost:3000
```

---

## 📋 Prerequisites Checklist

### Windows

#### Install Node.js
- [ ] Download from https://nodejs.org/ (LTS version)
- [ ] Install with default settings
- [ ] Verify: `node --version` (should be v16+)

#### Install Git
- [ ] Download from https://git-scm.com/
- [ ] Install with default settings

#### Verify Installation
```powershell
node --version      # v16.x.x or higher
npm --version       # 7.x.x or higher
git --version       # 2.x.x or higher
```

### macOS

```bash
# Using Homebrew (if not installed: /bin/bash -c "$(curl -fsSL...)")
brew install node git

# Verify
node --version
npm --version
```

### Linux (Ubuntu/Debian)

```bash
sudo apt update
sudo apt install nodejs npm git

# Verify
node --version
npm --version
```

---

## 🔧 Environment Setup

### Step 1: Create `.env` file

```bash
cd d:\Development\Projects\Rapid Crisis Response
cp .env.example .env
```

### Step 2: Edit `.env`

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database
DB_PATH=./emergencies.db

# AI Services - GET KEY FROM: https://console.cloud.google.com/
GEMINI_API_KEY=your_gemini_api_key_here

# Default Location (New Delhi, India)
DEFAULT_LAT=28.7041
DEFAULT_LNG=77.1025
```

### Step 3: Get Gemini API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable **Generative Language API**
4. Create an API key (not OAuth)
5. Copy the key to `.env`

---

## 📦 Dependencies

### Check current dependencies:
```bash
npm list
```

### Main packages:

| Package | Version | Purpose |
|---------|---------|---------|
| `express` | ^4.18.x | Web framework |
| `cors` | ^2.8.x | CORS middleware |
| `dotenv` | ^16.x | Environment variables |
| `sqlite3` | ^5.x | Database |

### Install dependencies:
```bash
npm install
```

---

## 🎮 Running the Application

### Development Mode

```bash
npm start
```

**Output**:
```
╔═════════════════════════════════════════╗
║         🚨 ResQAI Backend Running 🚨    ║
╠═════════════════════════════════════════╣
║  Server: http://localhost:3000            ║
║  API:    http://localhost:3000/api      ║
║  Health: http://localhost:3000/api/health║
╚═════════════════════════════════════════╝
```

### Access in Browser
- **Dashboard**: http://localhost:3000
- **API Health**: http://localhost:3000/api/health
- **Loader only**: http://localhost:3000/pages/loader.html

---

## 🧪 Testing Features

### 1. Test Loader Animation
```
URL: http://localhost:3000/pages/loader.html
Expected: Liquid fill animates 0-100%, then redirects to index.html
```

### 2. Test Selection Screen
```
URL: http://localhost:3000
Steps:
1. Wait for loader to complete (6 seconds or click "100%")
2. Selection screen slides in with 3 cards
3. Cards animate with stagger effect
4. Hover over cards - scale & glow effect
```

### 3. Test Dashboard
```
Steps:
1. Click "Personal Rescue AI" card
2. Selection screen slides left
3. Dashboard fades in
4. Check all tabs work (Dashboard, Report, Chat, Nearby, Map)
```

### 4. Test Chatbot
```
Steps:
1. Click "AI Assistant" tab
2. Send a message (e.g., "help with fire")
3. Check: /api/chat endpoint returns AI response
4. Verify multi-language dropdown works
```

### 5. Test Map Feature
```
Steps:
1. Click "Nearby Alerts" tab
2. Allow location permission
3. Map loads with your location
4. Nearby incidents appear as markers
5. Click markers for details
```

### 6. Test API Endpoints
```bash
# Health check
curl http://localhost:3000/api/health

# Chat endpoint
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"fire safety","language":"en"}'

# Nearby incidents
curl "http://localhost:3000/api/nearby?lat=28.7&lng=77.1&radius=5"

# Classification
curl -X POST http://localhost:3000/api/classification \
  -H "Content-Type: application/json" \
  -d '{"type":"fire","location":"Delhi"}'
```

---

## 🔍 Debugging

### Enable Console Logging
In `src/server.js`, logging is already enabled. You'll see:
```
✅ [API] Incoming POST /api/chat
✅ [DB] Query executed in 125ms
❌ [ERROR] CORS blocked from localhost:5500
```

### Check Database
```bash
# Install sqlite3 CLI
npm install -g sqlite3

# Open database
sqlite3 emergencies.db

# List tables
.tables

# Query incidents
SELECT * FROM incidents LIMIT 10;
```

### Browser DevTools
```javascript
// In browser console (F12)

// Check API call
fetch('/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ message: 'test', language: 'en' })
}).then(r => r.json()).then(console.log)

// Check local storage
localStorage.getItem('selectedLanguage')

// Check if module loaded
typeof chatbot !== 'undefined'
```

---

## 🐛 Troubleshooting

### Port 3000 Already in Use
```bash
# Kill process on port 3000
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# macOS/Linux
lsof -i :3000
kill -9 <PID>

# Or change port in .env
PORT=3001
npm start
```

### GEMINI_API_KEY Not Working
```bash
# Check if key is set
node -e "console.log(process.env.GEMINI_API_KEY)"

# If empty:
# 1. Verify .env file exists
# 2. Check key is not in quotes
# 3. Check key is valid (test on Google Cloud Console)
# 4. Restart server
npm start
```

### Database Locked Error
```bash
# SQLite database is locked (concurrent access)
# Solution: 
rm emergencies.db
npm start
# Database will recreate on first query
```

### Module Not Found Error
```bash
# If: Error: Cannot find module 'express'
# Solution:
rm -rf node_modules
npm install
npm start
```

### CSS/JS Not Loading
```
Symptom: Page looks broken, console shows 404 errors
Cause: File paths incorrect after reorganization

Check these paths:
- HTML: <link href="../styles/main.css">
- JS: <script src="../scripts/app.js">
- API: /api/chat (not /api/chat.js)
```

---

## 📁 File Structure After Setup

```
d:\Development\Projects\Rapid Crisis Response\
├── node_modules/              ← Created after npm install
├── public/
│   ├── pages/                 ← HTML files
│   ├── styles/                ← CSS files
│   ├── scripts/               ← JavaScript modules
│   └── assets/                ← Images, icons
├── src/
│   ├── api/routes/            ← API endpoints
│   ├── db/                    ← Database
│   └── server.js              ← Express server
├── docs/                      ← Documentation
├── .env                       ← Environment variables (created)
├── emergencies.db             ← SQLite database (created on first run)
├── package.json               ← Dependencies
└── README.md                  ← Project readme
```

---

## 🔄 Development Workflow

### 1. Start server
```bash
npm start
```

### 2. Edit files
- Backend: `src/**/*.js` → Restart server
- Frontend: `public/scripts/**/*.js` → Reload browser
- Styles: `public/styles/main.css` → Ctrl+Shift+R (hard refresh)

### 3. Check console
```bash
# Terminal shows server logs
# Browser DevTools (F12) shows client logs
```

### 4. Test API endpoints
```bash
# Use curl, Postman, or browser DevTools
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"test"}'
```

### 5. Commit changes
```bash
git status
git add .
git commit -m "feat: add new feature"
git push origin main
```

---

## 📈 Performance Tips

### Enable Caching
```javascript
// In server.js
app.use(express.static(path.join(__dirname, '../public'), {
    maxAge: '1d'
}));
```

### Optimize Bundle Size
```bash
# Check bundle size
npm run analyze

# Minify CSS/JS
npm install -g terser
```

### Database Optimization
```sql
-- In SQLite
CREATE INDEX idx_incident_location ON incidents(latitude, longitude);
CREATE INDEX idx_incident_type ON incidents(type);
```

---

## 🚀 Deployment Preparation

### Pre-deployment Checklist
- [ ] Remove `.env` from git (add to `.gitignore`)
- [ ] Update `NODE_ENV=production` in `.env`
- [ ] Test all endpoints on localhost
- [ ] Check for console errors/warnings
- [ ] Minify CSS/JS for production
- [ ] Test on different devices
- [ ] Verify API rate limits
- [ ] Set up database backup

### Deploy to Heroku
```bash
# Install Heroku CLI
npm install -g heroku

# Login
heroku login

# Create app
heroku create resqai-app

# Set environment variables
heroku config:set GEMINI_API_KEY=your_key
heroku config:set NODE_ENV=production

# Deploy
git push heroku main

# Check logs
heroku logs --tail
```

### Deploy to Vercel (Frontend only)
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

---

## 📚 Useful Commands

```bash
# Development
npm start              # Start server
npm run dev            # With auto-reload (if configured)

# Testing
npm test               # Run tests (if configured)
npm run build          # Build for production

# Database
npm run db:init        # Initialize database
npm run db:reset       # Reset database

# Utilities
npm list               # Show all dependencies
npm update             # Update all packages
npm outdated           # Check for updates
```

---

## 🔗 Useful Links

- **Express.js Docs**: https://expressjs.com/
- **Google Gemini API**: https://ai.google.dev/
- **Leaflet.js Docs**: https://leafletjs.com/
- **SQLite3 Docs**: https://www.sqlite.org/
- **Node.js Docs**: https://nodejs.org/docs/

---

## 💬 Getting Help

### Check Logs
1. **Server logs**: Terminal window
2. **Browser logs**: Press F12, go to Console
3. **Network logs**: DevTools → Network tab

### Common Issues

| Issue | Solution |
|-------|----------|
| Port in use | Change PORT in .env |
| API not responding | Check if server is running |
| CSS not loading | Clear browser cache (Ctrl+Shift+Del) |
| Gemini not working | Verify API key in .env |
| Database error | Delete emergencies.db, restart |

---

## 🎉 You're Ready!

Your ResQAI development environment is now set up. Start building! 🚀

---

**Last Updated**: April 2026  
**Setup Version**: 1.0
