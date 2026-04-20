# 🚀 ResQAI Setup Guide

Complete guide for setting up and running ResQAI locally.

---

## ⚡ Quick Start (5 minutes)

### Linux/macOS

```bash
# 1. Clone repository
git clone https://github.com/The-Lazy-Four/ResQAI.git
cd ResQAI

# 2. Install dependencies
npm install

# 3. Setup environment
cp .env.example .env

# 4. Add API keys to .env (see below)
# Edit .env with your text editor

# 5. Start server
npm start

# 6. Open browser
# Visit http://localhost:3000
```

### Windows (PowerShell)

```powershell
# 1. Clone repository
git clone https://github.com/The-Lazy-Four/ResQAI.git
cd ResQAI

# 2. Install dependencies
npm install

# 3. Setup environment
Copy-Item .env.example .env

# 4. Edit .env with your API keys
notepad .env

# 5. Start server
npm start

# 6. Open browser
# Visit http://localhost:3000
```

---

## 📋 Prerequisites

### System Requirements

- **Node.js**: v16 or higher
- **npm**: v7 or higher
- **Git**: v2.20 or higher
- **RAM**: 512 MB minimum
- **Disk**: 500 MB available

### Installation Verification

```bash
# Check versions
node --version        # Should be v16+
npm --version         # Should be v7+
git --version         # Should be v2.20+
```

### Platform-Specific Setup

#### Windows

1. **Install Node.js**
   - Download from https://nodejs.org/ (LTS version)
   - Run installer with default settings
   - Restart terminal/PowerShell

2. **Install Git**
   - Download from https://git-scm.com/
   - Run installer with default settings

3. **Verify Installation**
   ```powershell
   node --version
   npm --version
   git --version
   ```

#### macOS

```bash
# Install using Homebrew
brew install node git

# Or download directly
# Node: https://nodejs.org/
# Git: https://git-scm.com/

# Verify
node --version
npm --version
```

#### Linux (Ubuntu/Debian)

```bash
# Update package manager
sudo apt update

# Install Node.js (v16+)
curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
sudo apt install nodejs

# Install Git
sudo apt install git

# Verify
node --version
npm --version
git --version
```

#### Linux (Other Distributions)

See: https://nodejs.org/en/download/package-manager/

---

## 🔧 Environment Configuration

### Step 1: Copy Environment Template

```bash
cp .env.example .env
```

This creates `.env` in your project root directory.

### Step 2: Get Required API Keys

#### Gemini API Key (Primary AI Provider)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select existing)
3. Navigate to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **API Key**
5. Copy the generated key
6. (Optional) Restrict key to **Generative Language API**

#### OpenRouter API Key (Secondary - Optional)

1. Go to [OpenRouter.ai](https://openrouter.ai/)
2. Sign up or log in
3. Go to **Settings** → **Keys**
4. Create a new API key
5. Copy the key

#### Groq API Key (Tertiary - Optional)

1. Go to [Groq Console](https://console.groq.com/)
2. Sign up or log in
3. Create API key in settings
4. Copy the key

### Step 3: Edit .env File

```env
# =============================
# SERVER CONFIGURATION
# =============================
PORT=3000
NODE_ENV=development

# =============================
# DATABASE
# =============================
DB_PATH=./emergencies.db
# For MySQL (production):
# DB_TYPE=mysql
# DB_HOST=localhost
# DB_USER=resqai_user
# DB_PASSWORD=your_password
# DB_NAME=resqai_db

# =============================
# AI SERVICES
# =============================
# PRIMARY: Google Gemini
GEMINI_API_KEY=<your-gemini-api-key>
GEMINI_MODEL=gemini-2.5-flash

# SECONDARY: OpenRouter (optional)
OPENROUTER_API_KEY=<your-openrouter-api-key>
OPENROUTER_MODEL=meta-llama/llama-3-8b-instruct

# TERTIARY: Groq (optional)
GROQ_API_KEY=<your-groq-api-key>
GROQ_MODEL=mixtral-8x7b-32768

# =============================
# TIMEOUTS & RETRY
# =============================
AI_TIMEOUT=30000        # 30 seconds
AI_RETRY_ATTEMPTS=3

# =============================
# SECURITY
# =============================
JWT_SECRET=your-secret-key-change-this
JWT_EXPIRY=7d           # 7 days

# =============================
# LOGGING
# =============================
LOG_LEVEL=info
ENABLE_AI_LOGGING=true

# =============================
# LOCATION DEFAULTS (Optional)
# =============================
DEFAULT_LAT=28.7041     # New Delhi
DEFAULT_LNG=77.1025
```

### Step 4: Verify Configuration

```bash
# Check if server starts
npm start

# Should output:
# Server running on http://localhost:3000
# Database initialized
# AI providers ready
```

---

## 📦 Installation

### Install Node Dependencies

```bash
npm install
```

**What gets installed**:
- express (web framework)
- @google/generative-ai (Gemini)
- groq-sdk (Groq provider)
- sqlite3 (database)
- dotenv (environment variables)
- cors (CORS middleware)
- And 20+ other dependencies

### Installation Troubleshooting

**Error: "npm: command not found"**
- Node.js not installed or not in PATH
- Solution: Reinstall Node.js, restart terminal

**Error: "sqlite3 build failed"**
- Missing build tools
- Linux: `sudo apt install build-essential python3`
- macOS: Install Xcode Command Line Tools

**Error: Module not found**
- Incomplete installation
- Solution: `rm -rf node_modules package-lock.json && npm install`

---

## 🎮 Running the Application

### Development Server

```bash
npm start
```

**Expected Output**:
```
╔════════════════════════════════════════╗
║        ResQAI Emergency Response       ║
║        Server Initialization           ║
╚════════════════════════════════════════╝

✓ Server running on http://localhost:3000
✓ Database initialized (emergencies.db)
✓ API routes mounted:
  - /api/emergencies
  - /api/classification
  - /api/chat
  - /api/voice
  - /api/nearby
  - /api/ai
  - /api/portal
  - /api/custom-system
✓ AI providers ready:
  - Gemini: active
  - OpenRouter: ready
  - Groq: ready
  - Free AI: available

Press Ctrl+C to stop server
```

### Access the Application

**Open browser to**: http://localhost:3000

**Landing Page**: Select your rescue system
1. **Personal Rescue AI** → Main dashboard
2. **Hotel/Resort System** → EcoPlus module
3. **Custom Rescue Builder** → SQBitain module

### Monitor Server Logs

**Real-time logs**:
```bash
# Default: Shows info level
npm start

# With debugging:
DEBUG=* npm start

# Tail logs only:
npm start 2>&1 | grep -E "✓|✗|error|warn"
```

---

## 🧪 Testing the Installation

### Test 1: API Health Check

```bash
curl http://localhost:3000/api/ai/health
```

**Expected Response** (200 OK):
```json
{
  "status": "healthy",
  "providers": {
    "gemini": "active",
    "openrouter": "ready",
    "groq": "ready",
    "free_ai": "available"
  }
}
```

### Test 2: Create Emergency

```bash
curl -X POST http://localhost:3000/api/emergencies \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Fire in building",
    "location": "123 Main St",
    "severity": "high"
  }'
```

**Expected Response** (201 Created):
```json
{
  "id": "emergency-uuid-123",
  "description": "Fire in building",
  "classified_type": "fire",
  "confidence_score": 0.95,
  "status": "pending"
}
```

### Test 3: Classify Emergency

```bash
curl -X POST http://localhost:3000/api/classification \
  -H "Content-Type: application/json" \
  -d '{
    "description": "I see flames",
    "language": "en"
  }'
```

**Expected Response** (200 OK):
```json
{
  "type": "fire",
  "confidence": 0.98,
  "immediate_actions": ["Evacuate immediately", "Call 101"],
  "step_by_step": [...]
}
```

### Test 4: Chat Message

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What do I do in a fire?",
    "language": "en"
  }'
```

**Expected Response** (200 OK):
```json
{
  "user_message": "What do I do in a fire?",
  "bot_response": "In case of fire: 1) Stay calm 2) Call 101...",
  "timestamp": "2026-04-20T10:30:00Z"
}
```

---

## 📂 Project Structure After Setup

```
ResQAI/
├── src/
│   ├── server.js                 # Express entry point
│   ├── api/routes/               # API endpoints
│   ├── utils/                    # AI router, helpers
│   ├── middleware/               # Authentication
│   ├── db/                       # Database layer
│   └── config/                   # Configuration
├── public/                       # Frontend
│   ├── pages/                    # HTML pages
│   ├── modules/                  # EcoPlus, SQBitain
│   ├── scripts/                  # JavaScript
│   └── styles/                   # CSS
├── docs/                         # Documentation
├── node_modules/                 # Dependencies
├── emergencies.db                # SQLite database (created on first run)
├── .env                          # Environment variables (YOUR FILE)
├── .env.example                  # Template (do not edit)
├── package.json                  # Dependencies list
├── package-lock.json             # Lock file
├── README.md                      # Project README
└── .git/                         # Git repository
```

---

## 🐛 Troubleshooting

### Issue: "Cannot find module '@google/generative-ai'"

**Cause**: Dependencies not installed

**Solution**:
```bash
rm -rf node_modules package-lock.json
npm install
```

### Issue: "ENOENT: no such file or directory, open '.env'"

**Cause**: .env file not created

**Solution**:
```bash
cp .env.example .env
# Then edit .env with your API keys
```

### Issue: "Error: GEMINI_API_KEY is not set"

**Cause**: Missing API key in .env

**Solution**:
1. Add your API key to .env
2. Ensure no quotes: `GEMINI_API_KEY=key-here` (not `"key-here"`)
3. Restart server: `Ctrl+C` then `npm start`

### Issue: "Port 3000 already in use"

**Cause**: Another process using port 3000

**Solutions**:
```bash
# Option 1: Use different port
PORT=3001 npm start

# Option 2: Kill process on port 3000
# Linux/macOS:
lsof -ti:3000 | xargs kill -9

# Windows PowerShell:
Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess | Stop-Process
```

### Issue: "AI provider timeout"

**Cause**: Slow network or provider unavailable

**Solution**:
1. Check internet connection
2. Verify API key is valid
3. Increase timeout in .env: `AI_TIMEOUT=60000`
4. Check provider status page (Gemini, Groq, etc.)

### Issue: "Database locked"

**Cause**: Multiple processes accessing SQLite

**Solution**:
1. Use only one instance of npm start
2. Check for other node processes: `ps aux | grep node`
3. Close them: `killall node`

---

## 🔄 Updating Code

### Pull Latest Changes

```bash
git pull origin main
npm install  # In case dependencies changed
npm start
```

### Database Migration

If .env.example changed:
```bash
cp .env.example .env.new
# Compare .env and .env.new
diff .env .env.new
# Manually merge changes if needed
```

---

## 📱 Testing Different Modules

### Rapid Crisis Protocol
1. Visit http://localhost:3000/
2. Click "Personal Rescue AI"
3. Explore Dashboard, Report, Chat, Nearby tabs

### EcoPlus (Hotel Module)
1. Visit http://localhost:3000/public/modules/echo-plus/
2. Test guest and admin interfaces
3. Try emergency activation

### SQBitain (Custom Builder)
1. Visit http://localhost:3000/public/modules/rescue-builder/
2. Create new rescue system
3. Test with different organization types

---

## 🔒 Production Deployment

For production setup, see:
- [PRODUCTION_DEPLOYMENT.md](./PRODUCTION_DEPLOYMENT.md)

Key changes:
- Switch to MySQL
- Set `NODE_ENV=production`
- Use strong `JWT_SECRET`
- Enable HTTPS/SSL
- Configure CORS properly
- Set up monitoring

---

## 📚 Additional Resources

- **API Reference**: See [API.md](./API.md)
- **Architecture**: See [ARCHITECTURE.md](./ARCHITECTURE.md)
- **Modules**: See [MODULES.md](./MODULES.md)
- **AI System**: See [AI_SYSTEM.md](./AI_SYSTEM.md)
- **Data Flow**: See [DATA_FLOW.md](./DATA_FLOW.md)

---

## ✅ Verification Checklist

Before deploying:

- [ ] Node.js v16+ installed
- [ ] Dependencies installed (`npm install` successful)
- [ ] .env file created with all required keys
- [ ] At least one AI provider key configured
- [ ] Server starts without errors (`npm start`)
- [ ] Health check responds: `curl http://localhost:3000/api/ai/health`
- [ ] API endpoints working (test classification, chat)
- [ ] Frontend loads at http://localhost:3000
- [ ] Database initialized (emergencies.db created)
- [ ] No console errors in browser DevTools

---

## 🎯 Next Steps

After setup:

1. **Explore Features**
   - Try SOS emergency activation
   - Test chatbot with questions
   - View incident maps

2. **Read Documentation**
   - Review [OVERVIEW.md](./OVERVIEW.md) for system overview
   - Check [ARCHITECTURE.md](./ARCHITECTURE.md) for technical details

3. **Customize**
   - Modify prompts in `src/utils/aiRouter.js`
   - Add custom organizations to builder
   - Configure language-specific helplines

4. **Integrate**
   - Connect real emergency services APIs
   - Add user authentication backend
   - Integrate with actual mapping services

---

**Setup Complete!** 🎉

For questions or issues, check troubleshooting above or review API documentation.

**Your emergency response system is ready to use.**
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
