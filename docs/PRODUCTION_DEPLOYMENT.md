# RESQAI - PRODUCTION DEPLOYMENT CHECKLIST

## 🚀 Pre-Deployment (Render Setup)

### Environment Variables
- [ ] Set `GEMINI_API_KEY` in Render Environment
- [ ] Set `OPENROUTER_API_KEY` in Render Environment (optional, falls back)
- [ ] Set `GROQ_API_KEY` in Render Environment (optional, falls back)
- [ ] Set `NODE_ENV=production` in Render Environment
- [ ] Set `PORT=3000` (or use default)
- [ ] Never commit `.env` file to GitHub

### Render Configuration
- [ ] Build Command: `npm install`
- [ ] Start Command: `npm start`
- [ ] Root Directory: `/` (project root)
- [ ] Verify auto-deploy is enabled

---

## ✅ FIXES APPLIED (April 2026)

### 1. ✅ Environment Variables
**File**: `src/server.js`
- Added debug logging showing first 10 chars of API keys
- Safe env var access with fallbacks
- Environment validation on startup

**How to verify**:
```bash
curl https://your-app.onrender.com/api/health
# Should show AI provider status
```

### 2. ✅ CORS Configuration
**File**: `src/server.js`
- Production: `origin: '*'` (allow all domains)
- Development: Only localhost (safe for local dev)
- Automatically detects environment

**Console output**:
```
🔒 [CORS] Mode: ALLOW ALL (Production)
```

### 3. ✅ Frontend API Calls
**Files**: 
- `public/scripts/app.js` ✅
- `public/scripts/modules/chatbot.js` ✅
- `public/scripts/modules/nearby.js` ✅

**Changed from**:
```javascript
const API_BASE_URL = 'http://localhost:3000/api';  // ❌ Breaks on Render
```

**Changed to**:
```javascript
const API_BASE_URL = '/api';  // ✅ Works everywhere
```

**Why**: Relative paths work on both localhost and production URLs.

### 4. ✅ Error Handling & Timeouts
**File**: `public/scripts/modules/chatbot.js`
- Added 30-second timeout for API calls
- Proper abort handling on timeout
- Enhanced error logging with debugging info
- Shows which AI providers are available

**Sample console output**:
```
📤 [CHAT] Sending to /api/chat (Language: en)
📥 [CHAT] Response status: 200
✅ [CHAT] Data received: Success
🤖 [AI] Providers available: Gemini, OpenRouter, Groq
```

### 5. ✅ Health Check Endpoint
**File**: `src/server.js`
- `GET /api/health` now shows full diagnostics
- Shows which AI providers are configured
- Shows current environment (dev/prod)

**Example response**:
```json
{
  "status": "ok",
  "environment": "production",
  "ai": {
    "gemini": "✅ Available",
    "openrouter": "✅ Available",
    "groq": "❌ Not configured",
    "primaryProvider": "Gemini"
  }
}
```

### 6. ✅ Environment Validation Utility
**File**: `src/utils/validateEnv.js`
- Validates all required environment variables
- Shows which are configured
- Displays on server startup
- Used by health check endpoint

---

## 🧪 TESTING CHECKLIST

### Local Testing
```bash
# 1. Start server
npm start

# 2. Check console for:
# ✅ [ENVIRONMENT] GEMINI_API_KEY: sk_...
# ✅ [AI ROUTER] Gemini configured
# 🔒 [CORS] Mode: LOCALHOST ONLY

# 3. Test health endpoint
curl http://localhost:3000/api/health
# Should show AI providers available

# 4. Test chat endpoint
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"hello","language":"en"}'
# Should return AI response

# 5. Open browser
# http://localhost:3000
# - Check browser console (F12) for API logs
# - Test chat feature
# - Verify "🌐 [API Config] Using base URL: http://localhost:3000/api"
```

### Production Testing (Render)
```bash
# 1. Monitor Render logs during deployment
# Look for:
# ✅ [ENVIRONMENT] GEMINI_API_KEY: sk_...
# ✅ [AI ROUTER] Gemini configured

# 2. Health check
curl https://your-app.onrender.com/api/health

# 3. Browser console check
# - Open https://your-app.onrender.com
# - Press F12 (DevTools)
# - Check Console tab
# - Should see: "🌐 [API Config] Using base URL: https://your-app.onrender.com/api"

# 4. Chat functionality
# - Go to AI Assistant tab
# - Send a message
# - Should get response from Gemini API
# - Console should show provider logs
```

---

## 🔍 DEBUGGING PRODUCTION ISSUES

### Issue: "Gemini API not available" on Render

**Step 1: Check environment variables**
```
Render Dashboard → Settings → Environment
- Verify GEMINI_API_KEY is set
- Verify no extra spaces/newlines
- Copy from Google Cloud Console carefully
```

**Step 2: Check server logs**
```
Render Dashboard → Logs
Look for:
✅ [ENVIRONMENT] GEMINI_API_KEY: sk_... ← Should show key
❌ [AI ROUTER] Gemini API key not configured ← Means key is missing
```

**Step 3: Check health endpoint**
```
curl https://your-app.onrender.com/api/health
Response should show:
"gemini": "✅ Available"
```

**Step 4: Browser console debugging**
```
DevTools → Console tab → Send chat message
Look for logs:
📤 [CHAT] Sending to /api/chat ← API path check
📥 [CHAT] Response status: 200 ← HTTP status
✅ [CHAT] Data received: Success ← Success indicator
```

### Issue: CORS error

**Cause**: Origin not allowed
**Solution**: Already fixed! Server returns:
```
'Access-Control-Allow-Origin': '*'
```

**Verify**:
```
Render Logs should show:
🔒 [CORS] Mode: ALLOW ALL (Production)
```

### Issue: Timeout or slow response

**Cause**: API call taking > 30 seconds
**Solution**: Browser will show:
```
❌ [CHAT] Request timeout (30s)
```

**Fix**:
- Check Gemini API quota on Google Cloud Console
- Check Render CPU/Memory allocation
- Check internet connectivity

---

## 📝 RENDER ENVIRONMENT VARIABLES

Set these in Render Dashboard:

```env
PORT=3000
NODE_ENV=production
GEMINI_API_KEY=sk_xxxxxxxxxxxxxxxxxxxx
OPENROUTER_API_KEY=sk-xxxxxxxxxxxxxxxxxxxx
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxx
```

**Where to get keys**:
- **Gemini**: https://console.cloud.google.com/ → APIs → Generative Language
- **OpenRouter**: https://openrouter.ai/keys
- **Groq**: https://console.groq.com/keys

---

## 🚨 FALLBACK PROVIDERS

If Gemini isdown:
1. **Primary**: Gemini
2. **Secondary**: OpenRouter
3. **Tertiary**: Groq
4. **Fallback**: Hardcoded generic response

**Test fallback** (simulate Gemini error):
1. Set `GEMINI_API_KEY` to invalid value in `.env`
2. Restart server
3. Send chat message
4. Should use OpenRouter or Groq instead

---

## ✅ FINAL VERIFICATION

Before considering deployment complete:

- [ ] `curl /api/health` shows all providers
- [ ] Browser console shows "Using base URL" logs
- [ ] Chat sends messages without errors
- [ ] No "localhost:3000" in network requests
- [ ] Environment banner shows "production" on Render
- [ ] Render logs show GEMINI_API_KEY configured
- [ ] No CORS errors in browser console
- [ ] Response time < 5 seconds for chat

---

## 📞 SUPPORT

If issues persist:
1. Check Render logs (most important!)
2. Check browser DevTools console (F12)
3. Check health endpoint response
4. Verify environment variables in Render settings
5. Verify API keys are valid on provider dashboards

---

**Last Updated**: April 16, 2026  
**Status**: Production-Ready ✅
