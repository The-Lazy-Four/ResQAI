# 🚨 ResQAI Crisis Portal — Setup Guide

## Quick Start (3 steps)

```bash
# 1. Install dependencies
npm install

# 2. Start the server
node src/server.js

# 3. Open the portal
# http://localhost:3000/pages/guest-crisis-portal.html
```

## What's Working
- ✅ All 5 pages: Command Center, Live Intel, Deployment, Signal Hub, Archive
- ✅ Smart SOS Hub: 8 emergency type tiles + main SOS button
- ✅ AI integration via /api/chat (Gemini → OpenRouter → Groq → fallback)
- ✅ Live AI response panel with formatted guidance
- ✅ Voice input (Chrome/Edge) with graceful fallback
- ✅ Dynamic alert feed with new SOS entries
- ✅ Quick-dial buttons (112, 101, 108, 100)
- ✅ Broadcast Location (uses device GPS if allowed)
- ✅ Signal Hub: broadcast messages + AI drafting
- ✅ Deployment: unit tracking + deploy new units
- ✅ Live UTC clock
- ✅ Auto-cycling safety tips

## AI Providers (all pre-configured in .env)
| Provider  | Status     | Model                        |
|-----------|------------|------------------------------|
| Gemini    | PRIMARY    | gemini-2.5-flash             |
| OpenRouter| SECONDARY  | meta-llama/llama-3-8b-instruct |
| Groq      | TERTIARY   | llama-3.1-70b-versatile      |
| Fallback  | ALWAYS ON  | Built-in emergency templates |

## SQLite Note
If `sqlite3` native bindings fail to compile, the server automatically
uses an in-memory store. All features still work — data just resets on restart.

To compile sqlite3 properly:
```bash
apt install build-essential python3   # Ubuntu/Debian
npm install                           # then re-install
```

## File Structure (new files added)
```
public/
  pages/
    guest-crisis-portal.html  ← FULLY REBUILT (all 5 pages functional)
  scripts/
    main.js         ← Entry point
    aiService.js    ← AI API calls + rich offline fallback
    alerts.js       ← Dynamic alert state + rendering
    sos.js          ← SOS trigger system + toasts
    ui.js           ← AI panel, clock, safety tips
    voice.js        ← SpeechRecognition with fallback
    navigation.js   ← Sidebar page switching
src/
  db/db.js          ← PATCHED: sqlite3 + in-memory fallback
  utils/aiRouter.js ← PATCHED: reads OPENROUTER_PRIMARY_API_KEY
```
