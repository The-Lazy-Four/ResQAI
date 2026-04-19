# Custom Rescue Builder - DEBUG TEST FLOW

## TEST SCENARIO: Click Fire Emergency Button

### Expected Console Output (ALL STEPS):

```
[EMERGENCY] Fire triggered
🚨 [EMERGENCY] FIRE triggered
[AI] Calling AI for guidance...
🤖 Calling AI for guidance...
✅ AI API called successfully
[SOS] Emergency alert added to display
✅ Emergency alert added to display
✅ Emergency event logged
```

### UI Behavior:
1. ✅ Toast appears: "🚨 FIRE EMERGENCY triggered"
2. ✅ Alert card updates in admin panel
3. ✅ Emergency text displays in red box
4. ✅ No console errors

---

## TEST SCENARIO: Click "Get AI Instructions" Button

### Expected Console Output (SEQUENCE):

```
🤖 [AI] Requesting guidance
[AI] Button clicked: Get AI Instructions
[AI] Loading state shown
[AI] Calling API endpoint: /api/custom-system/generate-guidance
✅ AI guidance received
[AI] Response received - Success
[AI] Card updated with AI response
```

### UI Behavior:
1. ✅ Loading indicator shows: "⏳ Loading... Analyzing emergency scenario..."
2. ✅ AI card updates with response
3. ✅ Shows: "🟢 Active" when success
4. ✅ Shows: "🟡 Using Template" if fallback
5. ✅ Toast shows: "✅ AI guidance generated"

---

## TEST SCENARIO: Click SOS Button (User Panel)

### Expected Console Output (SEQUENCE):

```
🆘 [SOS] Activating emergency protocol
[SOS] Step 1: Button clicked
📍 [LOCATION] Requesting geolocation...
[SOS] Step 2: Requesting location
[SOS] Step 3: Location received
🤖 [AI] Requesting emergency guidance...
[SOS] Step 4: Calling AI API
✅ AI guidance received
[SOS] Step 5: AI response received
✅ SOS guidance overlay displayed
[SOS] Step 6: Guidance displayed
🔊 Speaking SOS guidance
[SOS] Step 7: Voice triggered
✅ SOS event logged locally
[SOS] Step 8: Event logged
```

### UI Behavior:
1. ✅ Toast: "🆘 SOS ACTIVATED - Emergency responders notified"
2. ✅ Geolocation permission popup (if first time)
3. ✅ Modal overlay appears with guidance
4. ✅ Voice plays (if browser supports Speech API)
5. ✅ Dismiss button appears

---

## TEST SCENARIO: Click "Open Admin Panel"

### Expected Console Output:

```
👨‍💼 [ADMIN] Admin button clicked
[ADMIN] Opening admin panel
[ADMIN] Panel displayed
```

### Expected Admin Panel Content:
1. ✅ Organization info visible
2. ✅ Emergency buttons: Fire, Medical, Intruder, Flood
3. ✅ Active SOS Alerts section
4. ✅ Staff list populated
5. ✅ Alert broadcast textarea
6. ✅ AI Guidance card (🟢 Active or 🟡 Using Template)

---

## TEST SCENARIO: Click "Open User Panel"

### Expected Console Output:

```
👥 [NAV] Opening user panel
[USER] Opening user panel
[USER] SystemID found: SYSTEM-ID-HERE
📢 [PANEL] Loading user alerts
✅ Loaded 0 alerts
[USER] Panel displayed
```

### Expected User Panel Content:
1. ✅ "🟢 Safety Status: SAFE"
2. ✅ SOS button visible
3. ✅ Evacuation plan displayed
4. ✅ Emergency contacts visible
5. ✅ Safety tips listed

---

## TEST SCENARIO: Click "Broadcast Alert" (Admin)

### Expected Console Output:

```
📢 [BROADCAST] Sending alert
[BROADCAST] Admin button clicked - Broadcasting alert
[BROADCAST] Alert saved to localStorage
[BROADCAST] Backend sent successfully
```

### UI Behavior:
1. ✅ Toast: "✅ Alert broadcast sent to all users"
2. ✅ Message textarea clears
3. ✅ Alert appears in admin history

---

## CRITICAL BUG CHECKS

### ✅ BUG #1: Missing triggerEmergency() Function
- **Status:** FIXED
- **Evidence:** Function now exists at line ~1113
- **Tests:**
  - Fire button → calls triggerEmergency('fire')
  - Medical button → calls triggerEmergency('medical')
  - Intruder button → calls triggerEmergency('intruder')
  - Flood button → calls triggerEmergency('flood')

### ✅ BUG #2: Corrupted loadUserAlerts() Function
- **Status:** FIXED
- **Evidence:** Removed broken code, cleaned implementation
- **Tests:**
  - No undefined variable errors
  - Function completes without exceptions

### ✅ BUG #3: Missing Console Logging
- **Status:** FIXED
- **Evidence:** Added console.log() to every critical function
- **Tests:**
  - Each button click has unique log prefix
  - Each step in SOS flow is logged
  - API calls are logged before and after

### ✅ BUG #4: AI Always Using Fallback
- **Status:** FIXED
- **Evidence:** 
  - Real API call to /api/ai/emergency-guidance
  - Real API call to /api/custom-system/generate-guidance
  - Proper error handling with fallback only on actual failure

### ✅ BUG #5: No Error Messages
- **Status:** FIXED
- **Evidence:** All catch blocks now log error messages
- **Tests:**
  - Network failures logged
  - API errors logged
  - Missing data logged

---

## LOGGING PREFIX GUIDE

Use these prefixes to search console and identify issues:

| Prefix | Meaning |
|--------|---------|
| `[EMERGENCY]` | Emergency type triggered (Fire/Medical/Intruder/Flood) |
| `[AI]` | AI call initiated or response received |
| `[SOS]` | SOS button flow, step 1-8 |
| `[LOCATION]` | Geolocation status |
| `[VOICE]` | Speech synthesis status |
| `[ADMIN]` | Admin panel operations |
| `[USER]` | User panel operations |
| `[BROADCAST]` | Alert broadcast operations |
| `[PANEL]` | Panel loading and population |
| `🆘` | SOS activation |
| `🤖` | AI operations |
| `📍` | Location operations |
| `🔊` | Voice operations |
| `👨‍💼` | Admin panel |
| `👥` | User panel |
| `📢` | Broadcast alert |

---

## COMPLETE FLOW TEST (Do This Sequentially)

### Step 1: Create System
```
1. Click "Create New System"
2. Select "School"
3. Fill in: 
   - Organization Name: "Test High School"
   - Location: "123 Main St"
   - Email: "admin@test.com"
4. Next: Structure (click Next)
5. Next: Staff (add one staff member)
6. Complete: Save System
```

**Expected Console:**
```
[SAVE] System creation
✅ System ID created
✅ System saved
```

### Step 2: Open System
```
1. Click "Open" on created system
2. Verify control panel loads
```

**Expected Console:**
```
✅ System loaded from API
[LOAD] System loaded successfully
```

### Step 3: Open Admin Panel
```
1. Click "Open Admin Panel"
2. Verify all sections display
```

**Expected Console:**
```
[ADMIN] Opening admin panel
[ADMIN] Panel displayed
```

### Step 4: Trigger Fire Emergency
```
1. Click "Fire" button in Emergency Trigger section
2. Check toast notification
3. Watch alert appear
```

**Expected Console:**
```
[EMERGENCY] Fire triggered
🚨 [EMERGENCY] FIRE triggered
🤖 Calling AI for guidance...
✅ Emergency event logged
```

### Step 5: Get AI Instructions
```
1. Click "Get AI Instructions" button
2. Watch AI card update
```

**Expected Console:**
```
[AI] Button clicked: Get AI Instructions
[AI] Loading state shown
[AI] Calling API endpoint: /api/custom-system/generate-guidance
✅ AI guidance received
[AI] Card updated with AI response
```

### Step 6: Open User Panel
```
1. Click "Open User Panel"
2. Verify panel displays
3. Click "SOS" button
4. Allow geolocation if prompted
5. Listen for voice guidance
6. Click "Dismiss"
```

**Expected Console:**
```
[USER] Opening user panel
👥 [NAV] Opening user panel
[SOS] Step 1: Button clicked
📍 [LOCATION] Requesting geolocation...
[SOS] Step 3: Location received
🤖 [AI] Requesting emergency guidance...
[SOS] Step 5: AI response received
✅ SOS guidance overlay displayed
🔊 Speaking SOS guidance
[SOS] Step 7: Voice triggered
✅ SOS event logged locally
```

### Step 7: Broadcast Alert (Back to Admin)
```
1. Go back to Admin Panel
2. Type message: "Fire detected on 3rd floor, evacuate building"
3. Click "Broadcast Alert"
4. Check success message
```

**Expected Console:**
```
[BROADCAST] Admin button clicked - Broadcasting alert
[BROADCAST] Alert saved to localStorage
[BROADCAST] Backend sent successfully
```

### Step 8: Check User Receives Alert
```
1. Go to User Panel
2. Verify alert appears in "Active Alerts" section
```

**Expected Console:**
```
[USER] Opening user panel
📢 [PANEL] Loading user alerts
✅ Loaded 1 alerts
```

---

## DEBUGGING CHECKLIST

- [ ] Open browser console (F12)
- [ ] Filter by `[` to show only tagged logs
- [ ] Click each button and verify log sequence
- [ ] Check for "ERROR" or "undefined" in red
- [ ] Verify toasts appear for each action
- [ ] Check Admin panel shows emergency alerts
- [ ] Check User panel receives admin broadcasts
- [ ] Verify voice plays on SOS (check audio permissions)
- [ ] Check geolocation popup appears on SOS
- [ ] Verify no infinite loops (check for repeated logs)

---

## COMMON ISSUES & FIXES

### Issue: "Cannot read property 'systemID' of undefined"
**Cause:** System not loaded  
**Fix:** Make sure to click "Open" on a system before opening panels

### Issue: "[AI] Loading state shown" but no response
**Cause:** API endpoint unreachable  
**Fix:** Check if backend is running. Check /api/custom-system/generate-guidance endpoint

### Issue: Fallback showing instead of AI response
**Cause:** API call failing  
**Fix:** Check API key configuration. Check browser console for actual error

### Issue: No voice audio
**Cause:** Browser doesn't support Speech API or permissions denied  
**Fix:** Use Chrome/Edge browser. Allow microphone permissions

### Issue: Geolocation permission popup doesn't appear
**Cause:** https only, or site blocked  
**Fix:** Use https. Check site permissions in browser

---

## VALIDATION CHECKLIST

- [x] triggerEmergency() function exists and works
- [x] loadUserAlerts() function is clean and working
- [x] All onclick functions exist and execute
- [x] AI calls are real (not fake)
- [x] SOS has 8 logged steps
- [x] Voice synthesis integrated
- [x] Admin panel shows real-time events
- [x] User panel receives admin broadcasts
- [x] All buttons have console logging
- [x] Error handling for all API calls
- [x] Fallback guidance when API fails
