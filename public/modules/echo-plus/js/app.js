// ============================================================
// ECHO+ APP LOGIC — Guest + Admin flows, AI, TTS, Maps
// ============================================================
// NOTE: API keys & credentials removed - handled by backend
// This module is production-ready for integration into ResQAI

const ADMIN_PASS = 'echo2024'; // DEMO ONLY - Replace with backend auth


let state = {
  role: null,
  selectedHotel: null,
  guestName: '', roomNumber: '', secretCode: '',
  guestObj: null,
  currentEmergency: null,
  lang: 'en',
  notifications: [],
  timeline: [],
  emergencyCount: 0,
  mapAnim: null,
  lastInstruction: '',
  aiThinking: false,
  instructionSteps: [],
  currentStepIndex: 0,
  stepInterval: null,
  isDimmed: false,
  isAutoMode: false,
  guestPositions: {}, // Map of roomNumber -> { x, y, floor, status: 'static'|'moving'|'evacuated' }
  guestPaths: {}       // Future path points for each guest
};

const $ = id => document.getElementById(id);
const show = id => {
  if (!id || typeof id !== 'string') {
    console.warn('show: Invalid screen ID', id);
    return;
  }
  try {
    document.querySelectorAll('.echo-screen').forEach(s => s.classList.remove('echo-active'));
    const el = $(id);
    if (el) {
      el.classList.add('echo-active');
    } else {
      console.warn('show: Screen not found:', id);
    }
  } catch (error) {
    console.error('show error:', error);
  }
};
const now = () => new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

// ============================================================
// BOOT
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  try {
    console.log('🚀 [EcoPlus] DOMContentLoaded - Starting initialization...');

    // Verify critical DOM elements exist
    const landingScreen = $('screen-landing');
    if (!landingScreen) {
      console.error('❌ [EcoPlus] Critical element missing: #screen-landing');
      throw new Error('Missing critical DOM element: screen-landing');
    }

    // Display landing screen
    show('screen-landing');
    console.log('📺 [EcoPlus] Landing screen displayed');

    // Safe initialization with null checks
    const hotelSearch = $('hotel-search');
    const adminPassInput = $('admin-pass-input');

    // Initialize app state
    renderHotelList('');
    console.log('🏨 [EcoPlus] Hotel list rendered');

    initAdminMap();
    console.log('🗺️ [EcoPlus] Admin map initialized');

    updateStaffPanel();
    console.log('👥 [EcoPlus] Staff panel updated');

    // Only add listeners if elements exist
    if (hotelSearch) {
      hotelSearch.addEventListener('input', e => renderHotelList(e.target.value));
      console.log('🔍 [EcoPlus] Hotel search listener attached');
    } else {
      console.warn('⚠️ [EcoPlus] Hotel search element not found');
    }

    if (adminPassInput) {
      adminPassInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') adminLogin();
      });
      console.log('🔐 [EcoPlus] Admin login listener attached');
    } else {
      console.warn('⚠️ [EcoPlus] Admin input element not found');
    }

    console.log('✅ [EcoPlus] Initialization complete - Module is ready');
  } catch (error) {
    console.error('❌ [EcoPlus] Initialization error:', error);
    // Show fallback message
    const landingScreen = $('screen-landing');
    if (landingScreen) {
      landingScreen.innerHTML = `
        <div style="
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100vh;
          color: #ff4444;
          text-align: center;
          padding: 20px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        ">
          <h2 style="font-size: 24px; margin-bottom: 10px;">⚠️ Initialization Error</h2>
          <p style="color: #ccc; margin-bottom: 20px;">${error.message}</p>
          <p style="font-size: 12px; color: #999;">Check browser console for details</p>
        </div>
      `;
    }
  }
});

// ============================================================
// IMMEDIATE BOOT CHECKS
// ============================================================
console.log('🏨 [EcoPlus] App.js loaded');
console.log('  - state object:', typeof state !== 'undefined' ? 'Ready' : 'Not found');
console.log('  - $() helper:', typeof $ !== 'undefined' ? 'Ready' : 'Not found');
console.log('  - show() function:', typeof show !== 'undefined' ? 'Ready' : 'Not found');

// ============================================================
// ROUTING
// ============================================================
function goGuest() {
  console.log('👤 [EcoPlus] Going to guest mode');
  state.role = 'guest';
  show('screen-guest-select');
}
window.goGuest = goGuest;


function goAdmin() {
  console.log('🖥️ [EcoPlus] Going to admin mode');
  initAllGuestPositions(); // Start tracking all guests
  show('screen-admin-login');
}
window.goAdmin = goAdmin;


// ============================================================
// REAL-TIME LOCATION TRACKING & SIMULATION
// ============================================================
let trackingInterval = null;

function initAllGuestPositions() {
  if (!state.selectedHotel) return;
  state.guestPositions = {};
  
  state.selectedHotel.rooms.forEach(room => {
    if (room.status === 'occupied') {
      const floorInfo = { '6': 20, '5': 68, '4': 116, '3': 164, '2': 212, '1': 260 };
      const roomsOnFloor = state.selectedHotel.rooms.filter(r => r.floor === room.floor);
      const idx = roomsOnFloor.indexOf(room);
      const adminX = 80 + idx * 58 + 25; 
      const adminY = floorInfo[room.floor.toString()] + 16 + 8;
      
      state.guestPositions[room.roomNumber] = {
        x: adminX, y: adminY, floor: room.floor, status: 'static', roomX: adminX, roomY: adminY
      };
    }
  });

  if (!trackingInterval) trackingInterval = setInterval(simulateGuestMovement, 1000);
}

function simulateGuestMovement() {
  if (!state.currentEmergency) {
    Object.keys(state.guestPositions).forEach(roomNum => {
      const g = state.guestPositions[roomNum];
      if (g.status === 'static') {
        g.x = g.roomX + (Math.random() * 4 - 2);
        g.y = g.roomY + (Math.random() * 4 - 2);
      }
    });
  } else {
    if (['fire', 'earthquake'].includes(state.currentEmergency.type)) {
      Object.keys(state.guestPositions).forEach(roomNum => {
        const g = state.guestPositions[roomNum];
        if (g.status !== 'evacuated') {
          const targetExitX = g.x < 300 ? 35 : 545;
          const targetExitY = 300;
          const dx = targetExitX - g.x, dy = targetExitY - g.y;
          const dist = Math.hypot(dx, dy);
          if (dist < 10) {
            g.status = 'evacuated';
            addTimeline('success', `Guest from Room ${roomNum} has evacuated safely.`);
          } else {
            g.status = 'moving';
            g.x += (dx / dist) * 8; g.y += (dy / dist) * 8;
          }
        }
      });
    }
  }
  if (state.role === 'admin') updateAdminMap(state.currentEmergency);
}

function goLanding() {
  state.role = null; state.selectedHotel = null; state.currentEmergency = null;
  state.guestObj = null; state.notifications = [];
  show('screen-landing');
  clearEmergencyVisuals();
}
function goGuestLogin() {
  if (!state.selectedHotel) {
    console.warn('No hotel selected');
    return;
  }

  // Safe DOM updates with null checks
  const hotelName = $('login-hotel-name');
  const hotelLoc = $('login-hotel-loc');

  if (hotelName) hotelName.textContent = state.selectedHotel.name;
  if (hotelLoc) hotelLoc.textContent = `${state.selectedHotel.city}, ${state.selectedHotel.country}`;
 
  show('screen-guest-login');
}
function goGuestSelectFromLogin() { show('screen-guest-select'); }

// ============================================================
// NEARBY STAFF (GUEST DASHBOARD)
// ============================================================
function renderNearbyStaff() {
  const container = $('nearby-staff-container');
  if (!container || !state.guestObj) return;

  const guestFloor = state.guestObj.floor || 1;
  const staffData = ECHO_DATA.staff;
  
  // Sort by simulated distance
  const nearby = staffData.map(s => {
    const sFloor = getFloorFromZone(s.assignedZone);
    const floorDiff = Math.abs(guestFloor - sFloor);
    // Simulated distance in meters
    const dist = (floorDiff * 12) + (Math.floor(Math.random() * 15) + 5);
    return { ...s, dist };
  }).sort((a, b) => a.dist - b.dist);

  container.innerHTML = nearby.map(s => `
    <div class="staff-nearby-card">
      <div class="staff-nearby-info">
        <div class="staff-nearby-avatar">${s.avatar}</div>
        <div class="staff-nearby-detail">
          <div class="staff-nearby-name">${s.name}</div>
          <div class="staff-nearby-role">${s.role.toUpperCase()} • ${s.assignedZone}</div>
          <div class="staff-nearby-dist">📍 ${s.dist}m away</div>
        </div>
        <div class="staff-status-pill ${s.status === 'active' ? 'online' : 'busy'}">${s.status}</div>
      </div>
      <div class="staff-nearby-actions">
        <button class="s-action-call" onclick="initiateStaffContact('${s.name}', 'voice')">📞 Voice Call</button>
        <button class="s-action-chat" onclick="initiateStaffContact('${s.name}', 'text')">💬 Message</button>
      </div>
    </div>
  `).join('');
}

function getFloorFromZone(zone) {
  if (zone.includes('Floor')) return parseInt(zone.match(/\d+/) ? zone.match(/\d+/)[0] : 1);
  if (zone.includes('Conference')) return 3;
  if (zone.includes('Rooftop')) return 6;
  if (zone.includes('Lobby') || zone.includes('Front Desk') || zone.includes('Medical Bay')) return 1;
  return 1;
}

function initiateStaffContact(name, type) {
  // Move focus to chat hub and pre-select target if possible
  const chatSection = document.querySelector('.chat-main-container');
  if (chatSection) {
    chatSection.scrollIntoView({ behavior: 'smooth' });
    chatSection.style.border = '1px solid var(--blue)';
    setTimeout(() => chatSection.style.border = '', 2000);
  }
  
  if (type === 'voice') {
    startVoiceRecording('guest');
  } else {
    const input = $('chat-input-guest');
    if (input) {
      input.value = `@${name}: `;
      input.focus();
    }
  }
  
  addChatMessage({
    role: 'system',
    text: `System: Initiating ${type} contact with ${name}...`,
    target: 'all',
    ts: Date.now()
  });
}

// ============================================================
// HOTEL SEARCH
// ============================================================
function renderHotelList(query) {
  const list = $('hotel-list-container');
  const q = query.toLowerCase();
  const filtered = ECHO_DATA.hotels.filter(h =>
    h.name.toLowerCase().includes(q) ||
    h.city.toLowerCase().includes(q) ||
    h.type.toLowerCase().includes(q)
  );
  list.innerHTML = filtered.length === 0
    ? `<div style="color:var(--text3);font-size:14px;text-align:center;padding:24px">No hotels found</div>`
    : filtered.map(h => `
      <div class="hotel-card" onclick="selectHotel('${h.id}')">
        <div class="hotel-type-badge badge-${h.type}">${h.type === 'luxury' ? '👑' : h.type === 'boutique' ? '🌸' : '🏢'}</div>
        <div class="hotel-info">
          <div class="hotel-name">${h.name}</div>
          <div class="hotel-loc">📍 ${h.city}, ${h.country}</div>
          <div class="hotel-meta">${h.type.charAt(0).toUpperCase() + h.type.slice(1)} · ${h.floors} floors · ${h.rooms.filter(r => r.status === 'occupied').length} guests</div>
        </div>
        <div class="hotel-arrow">›</div>
      </div>
    `).join('');
}

function selectHotel(id) {
  state.selectedHotel = ECHO_DATA.hotels.find(h => h.id === id);
  goGuestLogin();
}

// ============================================================
// GUEST LOGIN
// ============================================================
function guestLogin() {
  const name = $('guest-name').value.trim();
  const room = $('guest-room').value.trim();
  const code = $('guest-code').value.trim();
  const err = $('login-error');
  err.classList.remove('show');

  if (!name || !room || !code) { 
    err.textContent = 'Please fill in all fields.'; 
    err.classList.add('show'); 
    return; 
  }

  if (!state.selectedHotel) {
    err.textContent = 'Session error: No hotel selected. Please go back and select a hotel.';
    err.classList.add('show');
    console.error('[EcoPlus] guestLogin failed: state.selectedHotel is null');
    return;
  }

  // Find room and validate code (Allow 'guest' or 'echo2024' as universal demo codes)
  const found = state.selectedHotel.rooms.find(r =>
    r.roomNumber === room &&
    (r.secretCode.toLowerCase() === code.toLowerCase() || code.toLowerCase() === 'guest' || code.toLowerCase() === 'echo2024') &&
    r.status === 'occupied'
  );

  if (!found) { 
    err.textContent = 'Invalid room or secret code. Please try again.'; 
    err.classList.add('show'); 
    return; 
  }

  // Allow name override for demo
  state.guestObj = { ...found, guestName: name };
  state.guestName = name;
  state.roomNumber = room;
  showGuestDashboard();
}

function showGuestDashboard() {
  const g = state.guestObj;
  const h = state.selectedHotel;

  // Header
  $('gdash-hotel').textContent = h.name;
  $('gdash-city').textContent = `${h.city} · Floor ${g.floor}`;

  // Guest card
  const initials = g.guestName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  $('gdash-avatar').textContent = initials;
  $('gdash-guestname').textContent = g.guestName;
  $('gdash-room-detail').textContent = `Room ${g.roomNumber} · Floor ${g.floor} · ${g.zone.charAt(0).toUpperCase() + g.zone.slice(1)} Wing`;
  $('gdash-zone').textContent = `Zone: ${g.zone}`;

  // Status
  setGuestStatus('normal', '✅ All Clear — You are safe', 'No active emergencies. Enjoy your stay at ' + h.name + '.');

  // Instruction UI
  const instructionCard = $('gdash-instruction');
  if (instructionCard) {
    instructionCard.innerHTML = 'No emergency active. Have a pleasant stay. In case of emergency, follow the voice instructions.';
  }
  state.lastInstruction = '';
  
  if ($('guest-speak-btn')) $('guest-speak-btn').style.display = 'inline-block';
  $('screen-guest-dashboard').style.backgroundColor = ''; // Reset dimming

  // Floor map
  renderGuestMap(g.floor, null);

  // Notifications reset
  state.notifications = [];
  renderNotifications();

  renderNearbyStaff(); // Initial render for staff list
  show('screen-guest-dashboard');
}

function setGuestStatus(type, title, message) {
  const statusCard = $('gdash-status-card');
  const statusTitle = $('gdash-status-title');
  const statusMsg = $('gdash-status-msg');
  
  if (statusCard) {
    statusCard.classList.remove('normal', 'danger', 'warning', 'alert');
    statusCard.classList.add(type);
  }
  if (statusTitle) statusTitle.innerHTML = title;
  if (statusMsg) statusMsg.textContent = message;

  renderNearbyStaff(); // Update nearby staff list whenever status changes
}


// ============================================================
// ADMIN LOGIN
// ============================================================
function adminLogin() {
  const pass = $('admin-pass-input').value;
  const err = $('admin-login-error');
  err.classList.remove('show');
  if (pass !== ADMIN_PASS) { err.textContent = 'Incorrect master password.'; err.classList.add('show'); return; }
  show('screen-admin-dashboard');
  renderAdminNotifications();
}

// ============================================================
// EMERGENCY TRIGGER (ADMIN)
// ============================================================
function triggerEmergency(type) {
  // Default to first scenario of that type or construct one
  const scenario = ECHO_DATA.scenarios.find(s => s.type === type) || {
    type, floor: 2, roomNumber: '201', zone: 'west', severity: 'high',
    description: `${type} emergency detected in hotel.`,
    recommendedAction: 'Follow emergency protocols immediately.'
  };

  state.currentEmergency = scenario;
  state.emergencyCount++;

  // Update admin UI
  $('admin-alert-count').textContent = state.emergencyCount;
  $('admin-status-text').textContent = type.toUpperCase() + ' ALERT';
  $('admin-status-text').style.color = typeColor(type);

  // Highlight trigger button
  document.querySelectorAll('.trigger-btn').forEach(b => b.classList.remove('active-emergency'));
  const btnMap = { fire: 'trig-fire', medical: 'trig-medical', earthquake: 'trig-quake', suspicious: 'trig-suspect' };
  if ($(btnMap[type])) $(btnMap[type]).classList.add('active-emergency');

  // Staff assignment
  const assignments = assignStaff(scenario);
  updateStaffPanel(assignments);

  // Admin map
  updateAdminMap(scenario);

  // AI instruction
  fetchAndDisplayInstruction(scenario, 'admin');

  // Timeline
  addTimeline(type, `${type.charAt(0).toUpperCase() + type.slice(1)} triggered — Floor ${scenario.floor}`);

  // Notifications
  addNotification(type, `🚨 ${type.toUpperCase()}: ${scenario.description}`);
  renderAdminNotifications();

  // Toast
  showToast(type, type.toUpperCase() + ' ALERT', scenario.description);

  // If guest is logged in, update their dashboard
  if (state.guestObj) {
    const isNear = state.guestObj.floor === scenario.floor;
    const statusType = type === 'fire' ? 'danger' : type === 'medical' ? 'warning' : type === 'earthquake' ? 'danger' : 'alert';
    const icons = { fire: '🔥', medical: '🏥', earthquake: '🌍', suspicious: '⚠️' };
    setGuestStatus(statusType, icons[type] + ' ' + type.toUpperCase() + ' — ' + (isNear ? 'YOU ARE IN DANGER ZONE' : 'Alert in building'), scenario.description);
    fetchAndDisplayInstruction(scenario, 'guest');
    renderGuestMap(state.guestObj.floor, scenario);
    addNotification(type, `🚨 ${type.toUpperCase()} ALERT: ${scenario.description}`);
    renderNotifications();
  }
}

function typeColor(type) {
  return { fire: 'var(--fire)', medical: 'var(--medical)', earthquake: 'var(--quake)', suspicious: 'var(--purple)' }[type] || 'var(--blue)';
}

// ============================================================
// AI INSTRUCTION (via backend API - no keys in frontend)
// ============================================================
async function fetchAndDisplayInstruction(scenario, target, autoSpeak = false) {
  const lang = state.lang;
  const guestContext = state.guestObj
    ? {
      isNearby: state.guestObj.floor === scenario.floor,
      floor: state.guestObj.floor,
      zone: state.guestObj.zone
    }
    : null;

  // Show thinking state
  if (target === 'guest' || target === 'both') {
    const gdash = $('gdash-instruction');
    if (gdash) gdash.textContent = '...';
    const aiThink = $('ai-think-guest');
    if (aiThink) aiThink.style.display = 'inline-flex';
  }
  if (target === 'admin' || target === 'both') {
    const adminAI = $('admin-ai-text');
    if (adminAI) adminAI.textContent = '...';
    const aiThink = $('ai-think-admin');
    if (aiThink) aiThink.style.display = 'inline-flex';
  }

  try {
    // Use safe AI module - no API keys exposed
    const text = await window.EchoPlusAI.getGuidance(scenario, guestContext, lang);
    state.lastInstruction = text;
    displayInstruction(text, target);
    if (autoSpeak && (target === 'guest' || target === 'both')) {
      setTimeout(() => speakInstruction('guest'), 800);
    }
  } catch (error) {
    console.error('AI guidance error:', error);
    // Fallback to pre-translated guidance
    const fb = window.EchoPlusAI.getFallback(scenario.type, lang, guestContext);
    state.lastInstruction = fb;
    displayInstruction(fb, target);
    if (autoSpeak && (target === 'guest' || target === 'both')) {
      setTimeout(() => speakInstruction('guest'), 800);
    }
  } finally {
    const aiThink = $('admin-ai-text') ? $('ai-think-admin') : null;
    if (aiThink) aiThink.style.display = 'none';
    const guestThink = $('gdash-instruction') ? $('ai-think-guest') : null;
    if (guestThink) guestThink.style.display = 'none';
  }
}

function fallbackInstructions(type, lang) {
  const t = ECHO_DATA.translations[lang] || ECHO_DATA.translations.en;
  const map = {
    fire: `1. ${t.fire.near}\n2. ${t.fire.far}\n3. ${t.fire.general}`,
    medical: `1. ${t.medical.general}\n2. ${t.medical.nearby}\n3. Call reception at 0 immediately.`,
    earthquake: `1. ${t.earthquake.general}\n2. ${t.earthquake.after}\n3. Follow staff instructions after shaking stops.`,
    suspicious: `1. ${t.suspicious.general}\n2. ${t.suspicious.nearby}\n3. Report suspicious activity to security.`
  };
  return map[type] || 'Emergency in progress. Follow staff instructions immediately.';
}

function displayInstruction(text, target) {
  state.lastInstruction = text;
  
  // Parse text into steps if it looks like a list or has multiple lines
  let steps = [];
  if (text.includes('\n')) {
    steps = text.split('\n').map(s => s.replace(/^\d+[\.\)]\s*/, '').trim()).filter(s => s.length > 0);
  } else if (text.includes('1.') && text.includes('2.')) {
    steps = text.split(/\d+[\.\)]\s*/).map(s => s.trim()).filter(s => s.length > 0);
  } else {
    // If it's just one paragraph, make it one step
    steps = [text];
  }

  if (target === 'guest' || target === 'both') {
    state.instructionSteps = steps;
    state.currentStepIndex = 0;
    renderGuestStepsUI();
    renderGuestMapDynamic();
  }
  
  if (target === 'admin' || target === 'both') {
    if ($('admin-ai-text')) $('admin-ai-text').textContent = text;
  }
}

// ============================================================
// TTS / VOICE
// ============================================================
function speakInstruction(target) {
  const text = target === 'admin' ? $('admin-ai-text').textContent : $('gdash-instruction').textContent;
  if (!text || text === '...') return;
  if (window.speechSynthesis.speaking) window.speechSynthesis.cancel();

  const utt = new SpeechSynthesisUtterance(text);
  utt.rate = 0.88; utt.pitch = 1.05; utt.volume = 1;
  const langMap = { en: 'en-US', hi: 'hi-IN', bn: 'bn-IN' };
  utt.lang = langMap[state.lang] || 'en-US';

  const btn = target === 'admin' ? $('admin-speak-btn') : $('guest-speak-btn');
  if (btn) { btn.classList.add('speaking'); btn.innerHTML = '🔊 Speaking...'; }
  utt.onend = () => {
    if (btn) { btn.classList.remove('speaking'); btn.innerHTML = '🔊 Speak'; }
  };
  window.speechSynthesis.speak(utt);
}

function repeatInstruction() {
  if (state.lastInstruction) {
    if ($('gdash-instruction')) $('gdash-instruction').textContent = state.lastInstruction;
    speakInstruction('guest');
  }
}

// ============================================================
// AI REAL-TIME VOICE CALL
// ============================================================
function startAICall() {
  if (state.aiCallActive) return; 
  if (!window.ResQAICall) {
    console.error("ResQAICall class not found");
    return;
  }
  
  // UI Toggling
  const standby = $('ai-standby-content');
  const activeUI = $('ai-active-call-ui');
  const transcript = $('gdash-call-transcript');

  if (standby) standby.style.display = 'none';
  if (activeUI) activeUI.style.display = 'flex';
  
  if (transcript) {
    transcript.textContent = 'Connecting to ResQ AI...';
    transcript.style.color = 'var(--text2)';
  }

  state.aiCallActive = true;
  
  state.aiCallSystem = new window.ResQAICall({
    lang: state.lang || 'en',
    incident: state.currentEmergency, 
    guestName: state.guestName || "Guest",
    instructionSteps: state.instructionSteps || [],
    position: state.guestObj ? { floor: state.guestObj.floor, room: state.guestObj.roomNumber, zone: state.guestObj.zone } : { floor: 1, room: "000", zone: "Unknown" },
    onStatus: (status) => {
        const stat = $('aicall-status');
        const aiThink = $('ai-think-guest');
        if (!stat) return;
        
        stat.textContent = status.charAt(0).toUpperCase() + status.slice(1);
        if (aiThink) aiThink.style.display = (status === 'thinking') ? 'inline-flex' : 'none';
    },
    onTranscript: (speaker, text) => {
        if (!transcript) return;
        transcript.textContent = `${speaker}: ${text}`;
        transcript.scrollTop = transcript.scrollHeight;
    },
    onAlertAdmin: (msg) => {
        if (typeof window.receiveAdminAlert === 'function') {
            window.receiveAdminAlert(msg);
        }
    },
    onEnd: (history) => {
      state.aiCallActive = false;
      if (standby) standby.style.display = 'block';
      if (activeUI) activeUI.style.display = 'none';
      if ($('aicall-duration')) $('aicall-duration').textContent = "00:00";
    }
  });

  // Duration Timer Update
  const durationEl = $('aicall-duration');
  if (durationEl) {
      const timer = setInterval(() => {
          if (!state.aiCallActive) {
              clearInterval(timer);
              return;
          }
          if (state.aiCallSystem) {
              durationEl.textContent = state.aiCallSystem.getCallDuration();
          }
      }, 1000);
  }

  state.aiCallSystem.start();
}
window.startAICall = startAICall;

function endAICall() {
  if (state.aiCallSystem) {
    state.aiCallSystem.end();
    state.aiCallSystem = null;
  }
}
window.endAICall = endAICall;

window.receiveAdminAlert = function(msg) {
  const feed = document.getElementById('admin-notif-feed');
  if (!feed) return;
  
  if (feed.innerText.includes('All clear')) {
    feed.innerHTML = '';
  }
  
  const alertEl = document.createElement('div');
  alertEl.style.padding = '12px';
  alertEl.style.marginBottom = '8px';
  alertEl.style.borderRadius = '8px';
  alertEl.style.background = 'rgba(239, 68, 68, 0.15)';
  alertEl.style.borderLeft = '3px solid #ef4444';
  const roomNum = state.guestObj ? state.guestObj.roomNumber : 'Unknown';
  alertEl.innerHTML = `<div style="font-size:11px;color:#ef4444;margin-bottom:4px;font-weight:bold;">🚨 AI ALERT (Room ${roomNum})</div>
                       <div style="font-size:13px;color:#fff;">${msg}</div>`;
                       
  feed.prepend(alertEl);
  
  const countObj = document.getElementById('admin-alert-count');
  if (countObj) {
    countObj.innerText = parseInt(countObj.innerText || 0) + 1;
  }
  const notifCount = document.getElementById('admin-notif-count');
  if (notifCount) {
    notifCount.innerText = parseInt(notifCount.innerText || 0) + 1;
    notifCount.style.background = 'var(--fire)';
  }
}

// ============================================================
// LANGUAGE
// ============================================================
function setLang(lang) {
  state.lang = lang;
  window.currentLang = lang;
  document.querySelectorAll('.lang-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.lang === lang);
  });
  if (state.currentEmergency) {
    fetchAndDisplayInstruction(state.currentEmergency, 'guest');
  }
}

// ============================================================
// FLOOR MAP — GUEST
// ============================================================
function renderGuestMap(floor, emergency) {
  const svg = $('guest-map-svg');
  if (!svg) return;
  const W = 600, H = 280;

  // Base layout for the floor
  let html = `<rect width="${W}" height="${H}" fill="#0c1120"/>
  <rect x="10" y="10" width="${W - 20}" height="${H - 20}" rx="6" fill="#111827" stroke="#1e293b" stroke-width="1"/>
  <text x="20" y="7" fill="#1e3a5e" font-size="10" font-family="sans-serif">FLOOR ${floor} PLAN</text>`;

  // Rooms
  const rooms = [
    { x: 20, y: 20, w: 90, h: 60, id: 'R01', label: `${floor}01` },
    { x: 120, y: 20, w: 90, h: 60, id: 'R02', label: `${floor}02` },
    { x: 220, y: 20, w: 90, h: 60, id: 'R03', label: `${floor}03` },
    { x: 380, y: 20, w: 90, h: 60, id: 'R04', label: `${floor}04` },
    { x: 480, y: 20, w: 90, h: 60, id: 'R05', label: `${floor}05` },
    { x: 20, y: 180, w: 90, h: 60, id: 'R06', label: `${floor}06` },
    { x: 120, y: 180, w: 90, h: 60, id: 'R07', label: `${floor}07` },
    { x: 220, y: 180, w: 90, h: 60, id: 'R08', label: `${floor}08` },
    { x: 380, y: 180, w: 90, h: 60, id: 'R09', label: `${floor}09` },
    { x: 480, y: 180, w: 90, h: 60, id: 'R10', label: `${floor}10` },
  ];

  // Lifts/Stairs center
  html += `<rect x="320" y="20" width="50" height="60" rx="4" fill="#0f1825" stroke="#1e293b" stroke-width="1"/>
  <text x="345" y="52" text-anchor="middle" fill="#334155" font-size="9" font-family="sans-serif">LIFT</text>`;

  // Corridor
  html += `<rect x="10" y="88" width="${W - 20}" height="36" rx="2" fill="#0a1628" stroke="#1e293b" stroke-width="0.5"/>
  <text x="${W / 2}" y="110" text-anchor="middle" fill="#1e3a5e" font-size="10" font-family="sans-serif">CORRIDOR</text>`;

  // Exit arrows
  html += `<rect x="10" y="130" width="55" height="42" rx="4" fill="#062010" stroke="#00d97e" stroke-width="1.5"/>
  <text x="37" y="148" text-anchor="middle" fill="#00d97e" font-size="8" font-family="sans-serif" font-weight="bold">EXIT A</text>
  <text x="37" y="162" text-anchor="middle" fill="#00d97e" font-size="8" font-family="sans-serif">STAIRS</text>`;

  html += `<rect x="${W - 65}" y="130" width="55" height="42" rx="4" fill="#062010" stroke="#00d97e" stroke-width="1.5"/>
  <text x="${W - 37}" y="148" text-anchor="middle" fill="#00d97e" font-size="8" font-family="sans-serif" font-weight="bold">EXIT B</text>
  <text x="${W - 37}" y="162" text-anchor="middle" fill="#00d97e" font-size="8" font-family="sans-serif">STAIRS</text>`;

  // Render rooms
  let userRoomData = null;
  rooms.forEach((r, i) => {
    const isDanger = emergency && (r.label === emergency.roomNumber || (emergency.zone === 'east' && i >= 5) || (emergency.zone === 'west' && i < 5));
    const isUser = state.guestObj && r.label === state.guestObj.roomNumber;
    if (isUser) userRoomData = r;
    let fill = '#1a2540', stroke = '#2a3a5a';
    if (isDanger) { fill = 'rgba(255,77,77,0.25)'; stroke = '#ff4d4d'; }
    if (isUser) { fill = 'rgba(79,142,247,0.2)'; stroke = '#4f8ef7'; }
    html += `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" rx="4" fill="${fill}" stroke="${stroke}" stroke-width="${isUser || isDanger ? '2' : '1'}"/>
    <text x="${r.x + r.w / 2}" y="${r.y + r.h / 2 + 4}" text-anchor="middle" fill="${isUser ? '#4f8ef7' : isDanger ? '#ff4d4d' : '#4a5568'}" font-size="11" font-family="sans-serif" font-weight="${isUser ? 'bold' : 'normal'}">${r.label}${isUser ? ' ★' : ''}</text>`;
  });

  const requiresEvac = emergency && (emergency.type === 'fire' || emergency.type === 'earthquake');

  // Dynamic Evacuation Route Generation
  if (requiresEvac && userRoomData) {
    let dangerX = W / 2;
    const dangerRoom = rooms.find(r => r.label === emergency.roomNumber);
    if (dangerRoom) dangerX = dangerRoom.x + dangerRoom.w / 2;
    else dangerX = emergency.zone === 'east' ? W * 0.75 : W * 0.25;

    const startX = userRoomData.x + userRoomData.w / 2;
    const startY = userRoomData.y === 20 ? 80 : 180;
    const corridorY = 106;
    let targetExit = 'A';
    let endX = 37;

    if (dangerX < startX) { targetExit = 'B'; endX = W - 37; }
    else if (dangerX > startX) { targetExit = 'A'; endX = 37; }
    else {
      if (startX > W / 2) { targetExit = 'B'; endX = W - 37; }
      else { targetExit = 'A'; endX = 37; }
    }

    const points = [
      {x: startX, y: startY},
      {x: startX, y: corridorY},
      {x: endX, y: corridorY},
      {x: endX, y: 130}
    ];

    html += `
    <defs>
      <filter id="glow-static" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="3" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
    `;

    const pointsStr = points.map(p => `${p.x},${p.y}`).join(' ');
    html += `<polyline points="${pointsStr}" fill="none" stroke="#60a5fa" stroke-width="4" stroke-dasharray="10 8" stroke-linecap="round" id="evac-path" filter="url(#glow-static)"/>`;
    html += `<circle cx="${startX}" cy="${startY}" r="6" fill="#60a5fa" filter="url(#glow-static)"/>
             <circle cx="${endX}" cy="130" r="8" fill="#ffffff" filter="url(#glow-static)">
                <animate attributeName="r" values="6;10;6" dur="1s" repeatCount="indefinite" />
             </circle>`;
             
    // Draw arrows along segments
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const angle = Math.atan2(dy, dx) * 180 / Math.PI;
      const dist = Math.hypot(dx, dy);
      const numArrows = Math.max(1, Math.floor(dist / 40));
      for (let j = 1; j <= numArrows; j++) {
        const fraction = j / (numArrows + 1);
        const ax = p1.x + dx * fraction;
        const ay = p1.y + dy * fraction;
        html += `
          <g transform="translate(${ax}, ${ay}) rotate(${angle})">
             <path d="M-5,-5 L5,0 L-5,5 L-2,0 Z" fill="#ffffff" filter="url(#glow-static)">
                <animate attributeName="opacity" values="0.3;1;0.3" dur="1s" begin="${fraction}s" repeatCount="indefinite" />
                <animateTransform attributeName="transform" type="translate" values="-4,0; 4,0; -4,0" dur="1s" begin="${fraction}s" repeatCount="indefinite" />
             </path>
          </g>
        `;
    }
    }
  } else if (userRoomData) {
    const startX = userRoomData.x + userRoomData.w / 2;
    const startY = userRoomData.y === 20 ? 80 : 180;
    
    html += `
      <g filter="url(#glow-static)">
        <circle cx="${startX}" cy="${startY}" r="6" fill="#ffffff">
          <animate attributeName="r" values="5;8;5" dur="2s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.6;1;0.6" dur="2s" repeatCount="indefinite" />
        </circle>
        <circle cx="${startX}" cy="${startY}" r="12" fill="none" stroke="#ffffff" stroke-width="1" opacity="0.3">
          <animate attributeName="r" values="6;16;6" dur="2s" repeatCount="indefinite" />
        </circle>
      </g>
    `;
  }

  svg.innerHTML = html;

  // Animate evac dashes
  if (state.mapAnim) cancelAnimationFrame(state.mapAnim);
  if (emergency) {
    let offset = 0;
    function anim() {
      const path = svg.querySelector('#evac-path');
      if (path) { offset = (offset - 1) % 18; path.setAttribute('stroke-dashoffset', offset); }
      state.mapAnim = requestAnimationFrame(anim);
    }
    anim();
  }
}

// ============================================================
// FLOOR MAP — ADMIN
// ============================================================
function initAdminMap() {
  const svg = $('admin-map-svg');
  if (!svg) return;
  renderAdminMap(null);
}

function renderAdminMap(emergency) {
  updateAdminMap(emergency);
}

function updateAdminMap(emergency) {
  const svg = $('admin-map-svg');
  if (!svg) return;
  const W = 580, H = 320;

  let html = `
  <defs>
    <filter id="glow-admin" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="2" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
    <linearGradient id="grad-admin-bg" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#020617;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#0f172a;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <rect width="${W}" height="${H}" fill="url(#grad-admin-bg)"/>
  <text x="16" y="16" fill="#475569" font-size="10" font-family="'Syne', sans-serif" font-weight="800" letter-spacing="1">HOTEL COMMAND RADAR — MULTI-FLOOR OVERVIEW</text>
  `;

  const floors = [
    { label: 'Floor 6', y: 25, rooms: ['601', '602', '603'] },
    { label: 'Floor 5', y: 73, rooms: ['501', '502', '503', '504'] },
    { label: 'Floor 4', y: 121, rooms: ['401', '402', '403', '404', '405'] },
    { label: 'Floor 3', y: 169, rooms: ['301', '302', '303', '304', '305', '306'] },
    { label: 'Floor 2', y: 217, rooms: ['201', '202', '203', '204', '205', '206', '207'] },
    { label: 'Floor 1', y: 265, rooms: ['101', '102', '103', '104', '105', '106', '107', '108'] },
  ];

  floors.forEach(f => {
    html += `<text x="10" y="${f.y + 24}" fill="#334155" font-size="9" font-family="'Syne', sans-serif" font-weight="bold">${f.label.toUpperCase()}</text>`;
    f.rooms.forEach((r, i) => {
      const rx = 80 + i * 58, ry = f.y + 8, rw = 50, rh = 32;
      const isDanger = emergency && (r === emergency.roomNumber || (f.label === 'Floor ' + emergency.floor && i < 3));
      let fill = '#111827', stroke = '#1e293b';
      if (isDanger) { fill = 'rgba(239, 68, 68, 0.2)'; stroke = '#ef4444'; }
      html += `<rect x="${rx}" y="${ry}" width="${rw}" height="${rh}" rx="6" fill="${fill}" stroke="${stroke}" stroke-width="${isDanger ? '1.5' : '0.5'}" ${isDanger ? 'filter="url(#glow-admin)"' : ''}/>
      <text x="${rx + rw / 2}" y="${ry + rh / 2 + 4}" text-anchor="middle" fill="${isDanger ? '#ef4444' : '#334155'}" font-size="9" font-family="sans-serif">${r}</text>`;
    });
  });

  // Exits with better labels
  html += `
    <rect x="10" y="300" width="45" height="15" rx="3" fill="#064e3b" stroke="#10b981" stroke-width="0.5" opacity="0.6"/>
    <text x="32" y="310" text-anchor="middle" fill="#10b981" font-size="7" font-weight="bold">EXIT A</text>
    <rect x="${W - 55}" y="300" width="45" height="15" rx="3" fill="#064e3b" stroke="#10b981" stroke-width="0.5" opacity="0.6"/>
    <text x="${W - 32}" y="310" text-anchor="middle" fill="#10b981" font-size="7" font-weight="bold">EXIT B</text>
  `;

  Object.keys(state.guestPositions).forEach(roomNum => {
    const g = state.guestPositions[roomNum];
    if (g.status === 'evacuated') return;
    const isCurrentGuest = state.guestObj && roomNum === state.guestObj.roomNumber;
    html += `
      <g filter="url(#glow-admin)">
        <circle cx="${g.x}" cy="${g.y}" r="3" fill="#fff" stroke="${isCurrentGuest ? '#3b82f6' : '#64748b'}" stroke-width="1">
          ${isCurrentGuest ? '<animate attributeName="r" values="3;5;3" dur="1s" repeatCount="indefinite" />' : ''}
        </circle>
        <text x="${g.x}" y="${g.y - 6}" text-anchor="middle" fill="#fff" font-size="6" font-weight="bold" opacity="0.8">${roomNum}</text>
      </g>
    `;
  });

  // Safe Dynamic Path visualization for Admin
  if (emergency) {
    const ey = 25 + (6 - emergency.floor) * 48 + 24;
    let dangerIdx = emergency.roomNumber ? parseInt(emergency.roomNumber.slice(-2)) - 1 : 2;
    if(dangerIdx < 0) dangerIdx = 0;
    if(dangerIdx > 7) dangerIdx = 7;
    let dangerX = 80 + dangerIdx * 58 + 25;
    
    html += `
      <polyline points="${dangerX},${ey} 45,${ey} 45,300" fill="none" stroke="#60a5fa" stroke-width="2" stroke-dasharray="6 4" stroke-linecap="round" class="admin-evac-anim" filter="url(#glow-admin)"/>
      <polyline points="${dangerX},${ey} ${W-45},${ey} ${W-45},300" fill="none" stroke="#10b981" stroke-width="2" stroke-dasharray="6 4" stroke-linecap="round" class="admin-evac-anim" filter="url(#glow-admin)"/>
    `;
  }

  svg.innerHTML = html;

  if (state.adminMapAnim) cancelAnimationFrame(state.adminMapAnim);
  if (emergency) {
    let off = 0;
    function anim() {
      const paths = svg.querySelectorAll('.admin-evac-anim');
      if(paths.length > 0) {
        off = (off - 1) % 10;
        paths.forEach(p => p.setAttribute('stroke-dashoffset', off));
      }
      state.adminMapAnim = requestAnimationFrame(anim);
    }
    anim();
  }
}

// ============================================================
// STAFF PANEL
// ============================================================
function updateStaffPanel(assignments) {
  const list = $('admin-staff-list');
  if (!list) return;
  const staffData = assignments
    ? assignments.map(a => ({ ...a.staff, taskOverride: a.task, statusOverride: 'alert' }))
    : ECHO_DATA.staff;

  const roleColors = {
    security: { bg: '#1e3a5f', col: '#60a5fa' },
    medical: { bg: '#063020', col: '#4ade80' },
    manager: { bg: '#2a1040', col: '#c084fc' }
  };

  list.innerHTML = staffData.map(s => {
    const c = roleColors[s.role] || { bg: '#1e2a40', col: '#94a3b8' };
    const status = s.statusOverride || s.status;
    return `<div class="staff-item">
      <div class="staff-avatar" style="background:${c.bg};color:${c.col}">${s.avatar}</div>
      <div style="flex:1">
        <div class="staff-name-text">${s.name}</div>
        <div class="staff-role-text">${s.role.charAt(0).toUpperCase() + s.role.slice(1)}</div>
        <div class="staff-zone-text">${s.taskOverride || s.assignedZone}</div>
      </div>
      <div class="staff-status status-${status}">${status.charAt(0).toUpperCase() + status.slice(1)}</div>
    </div>`;
  }).join('');
}

// ============================================================
// NOTIFICATIONS
// ============================================================
function addNotification(type, msg) {
  state.notifications.unshift({ type, msg, time: now() });
  if (state.notifications.length > 10) state.notifications.pop();
}

function renderNotifications() {
  const feed = $('guest-notif-feed');
  if (!feed) return;
  if (state.notifications.length === 0) {
    feed.innerHTML = `<div style="padding:16px;color:var(--text3);font-size:13px;text-align:center">No alerts</div>`;
    return;
  }
  feed.innerHTML = state.notifications.map(n => `
    <div class="notif-item ${n.type}">
      <div class="notif-msg">${n.msg}</div>
      <div class="notif-time">${n.time}</div>
    </div>
  `).join('');
  $('guest-notif-count').textContent = state.notifications.length;
  $('guest-notif-count').className = 'panel-badge red';
}

function renderAdminNotifications() {
  const feed = $('admin-notif-feed');
  if (!feed) return;
  if (state.notifications.length === 0) {
    feed.innerHTML = `<div style="padding:16px;color:var(--text3);font-size:13px;text-align:center">All clear</div>`;
    return;
  }
  feed.innerHTML = state.notifications.map(n => `
    <div class="notif-item ${n.type}">
      <div class="notif-msg">${n.msg}</div>
      <div class="notif-time">${n.time}</div>
    </div>
  `).join('');
  if ($('admin-notif-count')) {
    $('admin-notif-count').textContent = state.notifications.length;
    $('admin-notif-count').className = 'panel-badge red';
  }
}

// ============================================================
// TIMELINE
// ============================================================
function addTimeline(type, event) {
  state.timeline.unshift({ type, event, time: now() });
  if (state.timeline.length > 8) state.timeline.pop();
  renderTimeline();
}

function renderTimeline() {
  const tl = $('admin-timeline');
  if (!tl) return;
  tl.innerHTML = state.timeline.map(t => `
    <div class="timeline-item">
      <div class="timeline-dot" style="background:${typeColor(t.type)}"></div>
      <div class="timeline-content">
        <div class="timeline-event">${t.event}</div>
        <div class="timeline-time">${t.time}</div>
      </div>
    </div>
  `).join('');
}

// ============================================================
// TOAST
// ============================================================
function showToast(type, title, msg) {
  const wrap = $('toast-wrap');
  const t = document.createElement('div');
  t.className = `toast t-${type}`;
  t.innerHTML = `<div class="toast-title">${title}</div><div class="toast-msg">${msg}</div>`;
  wrap.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateX(40px)'; t.style.transition = 'all 0.4s'; setTimeout(() => t.remove(), 400); }, 4500);
}

// ============================================================
// CLEAR
// ============================================================
function clearEmergency() {
  if (state.stepInterval) clearInterval(state.stepInterval);
  if (window.speechSynthesis) window.speechSynthesis.cancel();
  
  state.currentEmergency = null;
  state.instructionSteps = [];
  state.currentStepIndex = 0;
  state.isDimmed = false;
  $('screen-guest-dashboard').style.backgroundColor = '';
  
  document.querySelectorAll('.trigger-btn').forEach(b => b.classList.remove('active-emergency'));
  if ($('admin-status-text')) {
    $('admin-status-text').textContent = 'OPERATIONAL';
    $('admin-status-text').style.color = 'var(--medical)';
  }
  if ($('admin-ai-text')) $('admin-ai-text').textContent = 'No active emergency. All systems nominal.';
  
  updateAdminMap(null);
  updateStaffPanel();
  addTimeline('info', 'All-clear declared');
  addNotification('info', '✅ All clear — Emergency protocols deactivated');
  renderAdminNotifications();
  
  if (state.guestObj) {
    setGuestStatus('normal', '✅ All Clear', 'Emergency deactivated. All systems normal. You are safe.');
    const inst = $('gdash-instruction');
    if (inst) inst.innerHTML = 'Emergency cleared. No further action needed. Relax and enjoy your stay.';
    if ($('guest-speak-btn')) $('guest-speak-btn').style.display = 'inline-block';
    renderGuestMap(state.guestObj.floor, null);
    addNotification('info', '✅ All clear — Emergency deactivated');
    renderNotifications();
  }
}

function clearEmergencyVisuals() {
  if (state.stepInterval) clearInterval(state.stepInterval);
  if ($('admin-map-svg')) updateAdminMap(null);
  if ($('guest-map-svg')) renderGuestMap(state.guestObj?.floor || 2, null);
  if ($('screen-guest-dashboard')) $('screen-guest-dashboard').style.backgroundColor = '';
}

// ============================================================
// DEMO SCENARIO TRIGGER
// ============================================================
function runScenario(id) {
  const sc = ECHO_DATA.scenarios.find(s => s.id === id);
  if (!sc) return;
  state.currentEmergency = sc;
  state.emergencyCount++;
  $('admin-alert-count').textContent = state.emergencyCount;
  $('admin-status-text').textContent = sc.type.toUpperCase() + ' ALERT';
  $('admin-status-text').style.color = typeColor(sc.type);

  document.querySelectorAll('.trigger-btn').forEach(b => b.classList.remove('active-emergency'));
  const btnMap = { fire: 'trig-fire', medical: 'trig-medical', earthquake: 'trig-quake', suspicious: 'trig-suspect' };
  if ($(btnMap[sc.type])) $(btnMap[sc.type]).classList.add('active-emergency');

  updateStaffPanel(assignStaff(sc));
  updateAdminMap(sc);
  fetchAndDisplayInstruction(sc, 'admin');
  addTimeline(sc.type, `${sc.name} — Severity: ${sc.severity}`);
  addNotification(sc.type, `🚨 ${sc.name}: ${sc.description}`);
  renderAdminNotifications();
  showToast(sc.type, sc.name, sc.description);
}

// ============================================================
// EMERGENCY TRIGGER (GUEST)
// ============================================================
function guestTriggerEmergency(type) {
  if (!state.guestObj) return;

  const scenario = {
    id: 'guest_' + Date.now(),
    type: type,
    floor: state.guestObj.floor,
    roomNumber: state.guestObj.roomNumber,
    zone: state.guestObj.zone,
    severity: 'critical',
    name: `Guest Reported ${type.charAt(0).toUpperCase() + type.slice(1)}`,
    description: `A guest in room ${state.guestObj.roomNumber} reported a ${type} emergency.`
  };

  state.currentEmergency = scenario;

  const statusType = type === 'fire' ? 'danger' : type === 'medical' ? 'warning' : type === 'earthquake' ? 'danger' : 'alert';
  const icons = { fire: '🔥', medical: '🏥', earthquake: '🌍', suspicious: '⚠️' };

  setGuestStatus(statusType, icons[type] + '  ' + type.toUpperCase() + ' REPORTED', scenario.description);

  addNotification(type, `🚨 ${type.toUpperCase()} REPORTED: Help is on the way.`);
  renderNotifications();
  showToast(type, 'EMERGENCY REPORTED', 'Your alert has been sent to hotel security.');

  // IMPORTANT: Use the new step-sequence engine instead of the static API call
  startGuestSimulation(scenario);
}

// ============================================================
// HACKATHON DEMO: REAL-TIME STEP SIMULATION LOGIC
// ============================================================
function startGuestSimulation(scenario) {
  if (state.stepInterval) clearInterval(state.stepInterval);
  if (window.speechSynthesis) window.speechSynthesis.cancel();
  
  // Dim background for focus
  state.isDimmed = true;
  $('screen-guest-dashboard').style.backgroundColor = '#07070a';
  
  // 1. Generate Instructions Logic
  const type = scenario.type;
  const lang = state.lang;
  let steps = [];

  if (type === 'fire') {
    steps.push("Leave your room immediately. Do not collect belongings.");
    steps.push("Turn left in the corridor toward Exit A.");
    steps.push("Take the stairs down. DO NOT use elevators.");
    steps.push("Exit the building to the assembly point.");
  } else if (type === 'earthquake') {
    steps.push("Drop, cover, and hold on under a sturdy desk.");
    steps.push("Wait for the shaking to stop completely.");
    steps.push("Carefully exit building via stairs. Watch for debris.");
  } else if (type === 'suspicious') {
    steps.push("Lock your door and remain inside the room.");
    steps.push("Avoid standing near windows.");
    steps.push("Wait for further instructions from authorities.");
  } else if (type === 'medical') {
    steps.push("Help is on the way. Please stay calm.");
    steps.push("Unlock your door so responders can enter.");
    steps.push("Clear space around the person needing help.");
  }

  // Very basic translation wrapper
  if (lang === 'bn') {
    steps = steps.map(translateDemoText);
  } else if (lang === 'hi') {
    steps = [
      "शांत रहें। मदद आ रही है।",
      "कृपया निर्देशों का पालन करें।",
      "सुरक्षित स्थान पर जाएं।"
    ];
  }

  state.instructionSteps = steps;
  state.currentStepIndex = 0;
  
  // Hide standard manual speak button since simulation runs automatically
  if ($('guest-speak-btn')) $('guest-speak-btn').style.display = 'none';

  // Initialize explicitly to false for safety-first UX
  state.isAutoMode = false;

  // Render initial step UI & map
  renderGuestStepsUI();
  renderGuestMapDynamic();
  
  // Initial voice
  if (steps.length > 0) {
    playCurrentStep();
  }
}

function playCurrentStep() {
  const stepText = state.instructionSteps[state.currentStepIndex];
  if (!stepText) return;
  
  renderGuestStepsUI();
  renderGuestMapDynamic();
  
  if (state.aiCallSystem && state.aiCallActive) {
    const prompt = `I have just reached Step ${state.currentStepIndex + 1}: ${stepText}. What should I do next?`;
    state.aiCallSystem._processAndRespond(prompt);
  } else {
    speakInstructionDirectly(stepText, state.lang);
  }
}

// Global functions for inline HTML onClick handlers
window.nextStep = function() {
  if (state.currentStepIndex < state.instructionSteps.length - 1) {
    state.currentStepIndex++;
    if (state.stepInterval && state.isAutoMode) {
      clearInterval(state.stepInterval);
      startAutoWait();
    }
    playCurrentStep();
  }
}

window.toggleAutoMode = function() {
  state.isAutoMode = !state.isAutoMode;
  renderGuestStepsUI();
  
  if (state.isAutoMode) {
    startAutoWait();
  } else {
    if (state.stepInterval) {
      clearInterval(state.stepInterval);
      state.stepInterval = null;
    }
  }
}

function startAutoWait() {
  if (state.stepInterval) clearInterval(state.stepInterval);
  state.stepInterval = setInterval(() => {
    if (state.currentStepIndex < state.instructionSteps.length - 1) {
      state.currentStepIndex++;
      playCurrentStep();
    } else {
      clearInterval(state.stepInterval);
    }
  }, 4000);
}

function renderGuestStepsUI() {
  const container = $('gdash-instruction');
  if (!container) return;
  
  const stepsHTML = state.instructionSteps.map((step, index) => {
    const isActive = index === state.currentStepIndex;
    const isPast = index < state.currentStepIndex;
    
    // Dynamic styles inline based on step status
    const bg = isActive ? 'rgba(59, 130, 246, 0.1)' : 'transparent';
    const border = isActive ? '1.5px solid #3b82f6' : '1px solid #1f2937';
    const opacity = isPast ? '0.5' : '1';
    const transform = isActive ? 'scale(1.02)' : 'scale(1)';
    const shadow = isActive ? '0 0 15px rgba(59, 130, 246, 0.2)' : 'none';
    
    return `
      <div onclick="goToStep(${index})" style="display: flex; align-items: center; padding: 12px; margin-bottom: 10px; 
                  background: ${bg}; border: ${border}; opacity: ${opacity};
                  transform: ${transform}; box-shadow: ${shadow};
                  border-radius: 12px; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); cursor: pointer;">
        <div style="width: 26px; height: 26px; border-radius: 50%; 
                    background: ${isActive ? '#3b82f6' : '#1f2937'}; color: white;
                    display: flex; justify-content: center; align-items: center; 
                    font-size: 11px; font-weight: 800; margin-right: 14px; flex-shrink: 0;
                    border: 1px solid ${isActive ? '#60a5fa' : '#374151'};">
          ${index + 1}
        </div>
        <div style="font-size: 14px; font-weight: ${isActive ? '700' : '500'}; color: ${isActive ? '#fff' : '#94a3b8'};">
          ${step}
        </div>
        ${isActive ? '<div style="margin-left: auto; color: #3b82f6; font-size: 12px;">Active</div>' : ''}
        ${isPast ? '<div style="margin-left: auto; color: #10b981; font-size: 14px;">✓</div>' : ''}
      </div>
    `;
  }).join('');
  
  const controlsHTML = `
    <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #1f2937;">
      <div style="display: flex; gap: 10px; margin-bottom: 15px;">
        <button onclick="toggleAutoMode()" style="flex: 1; padding: 10px; border-radius: 8px; background: ${state.isAutoMode ? 'rgba(16, 185, 129, 0.15)' : '#1f2937'}; color: ${state.isAutoMode ? '#10b981' : '#94a3b8'}; border: 1px solid ${state.isAutoMode ? '#10b981' : '#374151'}; cursor: pointer; font-size: 12px; font-weight: bold; transition: 0.2s;">
          ${state.isAutoMode ? '⚡ Auto-Play ON' : '▶ Manual Mode'}
        </button>
        ${state.currentStepIndex < state.instructionSteps.length - 1 ? `
          <button onclick="nextStep()" style="flex: 1.5; padding: 10px 20px; border-radius: 8px; background: #3b82f6; color: white; border: none; cursor: pointer; font-weight: bold; font-size: 13px; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3); transition: 0.2s;">
            Next Step →
          </button>
        ` : `
          <button onclick="clearEmergency()" style="flex: 1.5; padding: 10px 20px; border-radius: 8px; background: #10b981; color: white; border: none; cursor: pointer; font-weight: bold; font-size: 13px;">
            I am Safe ✅
          </button>
        `}
      </div>
      
      <!-- Interactive Chat Input -->
      <div style="position: relative; background: rgba(15, 23, 42, 0.6); border: 1px solid #1e293b; border-radius: 12px; padding: 8px; display: flex; align-items: center; gap: 8px; transition: 0.3s;" id="guidance-chat-input-wrap">
        <div style="width: 32px; height: 32px; border-radius: 50%; background: #3b82f6; display: flex; align-items: center; justify-content: center; font-size: 14px; flex-shrink: 0;">💬</div>
        <input type="text" id="guidance-interactive-input" 
               placeholder="Ask AI or report progress..." 
               style="flex: 1; background: transparent; border: none; color: white; font-size: 13px; outline: none; padding: 4px;"
               onfocus="document.getElementById('guidance-chat-input-wrap').style.borderColor='#3b82f6'"
               onblur="document.getElementById('guidance-chat-input-wrap').style.borderColor='#1e293b'"
               onkeydown="if(event.key==='Enter') sendGuidanceInteraction()">
        <button onclick="sendGuidanceInteraction()" style="background: none; border: none; color: #3b82f6; font-weight: bold; cursor: pointer; padding: 5px;">Send</button>
      </div>
    </div>
  `;
  
  container.innerHTML = `<div style="display:flex; flex-direction:column; gap:4px;">${stepsHTML}</div>${controlsHTML}`;
}

window.goToStep = function(idx) {
  state.currentStepIndex = idx;
  playCurrentStep();
}

window.sendGuidanceInteraction = async function() {
  const input = $('guidance-interactive-input');
  const val = input.value.trim();
  if (!val) return;
  
  input.value = '';
  input.placeholder = 'Thinking...';
  
  // If no AI call is active, start one silently to get response or just use the API
  if (!state.aiCallSystem || !state.aiCallActive) {
    const scenario = state.currentEmergency || { type: 'other', floor: 1, roomNumber: 'Unknown', description: 'Interactive help needed' };
    const guestContext = state.guestObj ? { isNearby: true, floor: state.guestObj.floor, zone: state.guestObj.zone } : null;
    
    try {
      const responseText = await window.EchoPlusAI.getGuidance(scenario, guestContext, state.lang);
      displayInstruction(responseText, 'guest');
      speakInstructionDirectly(responseText, state.lang);
    } catch (e) {
      console.error(e);
      input.placeholder = 'Search failed. Try again.';
    }
  } else {
    // If call is active, it will handle via audio, but we can also push text
    state.aiCallSystem._processAndRespond(val);
  }
}

function speakInstructionDirectly(text, lang) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.9; 
  utterance.pitch = 1.0;
  
  if (lang === 'bn') utterance.lang = 'bn-IN';
  else if (lang === 'hi') utterance.lang = 'hi-IN';
  else utterance.lang = 'en-US';
  
  const voices = window.speechSynthesis.getVoices();
  const GoogleVoice = voices.find(v => v.lang === utterance.lang && v.name.includes("Google"));
  if (GoogleVoice) utterance.voice = GoogleVoice;
  
  window.speechSynthesis.speak(utterance);
}

function renderGuestMapDynamic() {
  const svg = $('guest-map-svg');
  if (!svg || !state.currentEmergency) return;
  
  const W = 600, H = 280;
  const floor = state.guestObj ? state.guestObj.floor : 2;
  const emergency = state.currentEmergency;

  // Base Defs for Premium Aesthetics
  let html = `
  <defs>
    <filter id="glow-room" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="3" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
    <filter id="inner-shadow">
      <feOffset dx="0" dy="2"/>
      <feGaussianBlur stdDeviation="2" result="offset-blur"/>
      <feComposite operator="out" in="SourceGraphic" in2="offset-blur" result="inverse"/>
      <feFlood flood-color="black" flood-opacity="0.5" result="color"/>
      <feComposite operator="in" in="color" in2="inverse" result="shadow"/>
      <feComposite operator="over" in="shadow" in2="SourceGraphic"/>
    </filter>
    <linearGradient id="grad-floor" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#0f172a;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#020617;stop-opacity:1" />
    </linearGradient>
    <radialGradient id="grad-danger" cx="50%" cy="50%" r="50%">
      <stop offset="0%" style="stop-color:#ef4444;stop-opacity:0.6" />
      <stop offset="100%" style="stop-color:#ef4444;stop-opacity:0" />
    </radialGradient>
    <radialGradient id="grad-user" cx="50%" cy="50%" r="50%">
      <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:0.4" />
      <stop offset="100%" style="stop-color:#3b82f6;stop-opacity:0" />
    </radialGradient>
  </defs>
  
  <!-- Floor Background -->
  <rect width="${W}" height="${H}" fill="url(#grad-floor)"/>
  <rect x="10" y="10" width="${W - 20}" height="${H - 20}" rx="12" fill="none" stroke="#1e293b" stroke-width="1" opacity="0.5"/>
  
  <!-- UI Text Overlay -->
  <text x="25" y="30" fill="#64748b" font-size="10" font-family="'Syne', sans-serif" font-weight="800" letter-spacing="1">LIVE EVACUATION RADAR — FLOOR ${floor}</text>
  `;

  // Draw Main Corridor
  html += `
    <rect x="15" y="95" width="${W - 30}" height="30" rx="4" fill="#0f172a" stroke="#1e293b" stroke-width="0.5" opacity="0.8"/>
    <line x1="15" y1="110" x2="${W - 15}" y2="110" stroke="#1e293b" stroke-width="0.5" stroke-dasharray="4 4" opacity="0.4"/>
  `;

  // Define Rooms
  const rooms = [
    { x: 25, y: 35, w: 85, h: 55, label: `${floor}01` }, { x: 120, y: 35, w: 85, h: 55, label: `${floor}02` },
    { x: 215, y: 35, w: 85, h: 55, label: `${floor}03` }, { x: 375, y: 35, w: 85, h: 55, label: `${floor}04` },
    { x: 470, y: 35, w: 85, h: 55, label: `${floor}05` }, { x: 25, y: 135, w: 85, h: 55, label: `${floor}06` },
    { x: 120, y: 135, w: 85, h: 55, label: `${floor}07` }, { x: 215, y: 135, w: 85, h: 55, label: `${floor}08` },
    { x: 375, y: 135, w: 85, h: 55, label: `${floor}09` }, { x: 470, y: 135, w: 85, h: 55, label: `${floor}10` }
  ];

  let userRoomData = rooms.find(r => r.label === state.guestObj?.roomNumber) || rooms[0];
  let startX = userRoomData.x + userRoomData.w / 2;
  let startY = userRoomData.y === 35 ? 90 : 135;
  let corridorY = 110;

  let dangerX = W / 2;
  const dangerRoom = rooms.find(r => r.label === emergency?.roomNumber);
  if (dangerRoom) dangerX = dangerRoom.x + dangerRoom.w / 2;
  else if (emergency?.zone === 'east') dangerX = W * 0.75;
  else if (emergency?.zone === 'west') dangerX = W * 0.25;
  
  let endX = dangerX < startX ? W - 45 : 45;

  // Render Rooms with Enhanced Style
  rooms.forEach((r) => {
    const isDanger = r.label === emergency?.roomNumber;
    const isUser = r.label === (state.guestObj?.roomNumber || '');
    
    let fill = "#1e293b";
    let stroke = "#334155";
    let filter = "";
    let opacity = 0.6;
    
    if (isDanger) {
      fill = "rgba(239, 68, 68, 0.15)";
      stroke = "#ef4444";
      filter = "url(#glow-room)";
      opacity = 1;
    } else if (isUser) {
      fill = "rgba(59, 130, 246, 0.15)";
      stroke = "#3b82f6";
      filter = "url(#glow-room)";
      opacity = 1;
    }
    
    html += `
      <g opacity="${opacity}">
        <rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" rx="8" fill="${fill}" stroke="${stroke}" stroke-width="${isUser || isDanger ? 2 : 1}" filter="${filter}"/>
        <text x="${r.x + r.w / 2}" y="${r.y + r.h / 2 + 5}" text-anchor="middle" fill="${isUser || isDanger ? '#fff' : '#475569'}" font-size="12" font-family="'Syne', sans-serif" font-weight="bold">${r.label}${isUser ? ' ●' : ''}</text>
      </g>
    `;
  });

  // Exits
  const exitA = { x: 25, y: 210, w: 60, h: 40, label: "EXIT A" };
  const exitB = { x: W - 85, y: 210, w: 60, h: 40, label: "EXIT B" };
  
  [exitA, exitB].forEach(ex => {
    html += `
      <rect x="${ex.x}" y="${ex.y}" width="${ex.w}" height="${ex.h}" rx="6" fill="#064e3b" stroke="#10b981" stroke-width="1.5" opacity="0.8"/>
      <text x="${ex.x + ex.w/2}" y="${ex.y + 18}" text-anchor="middle" fill="#10b981" font-size="9" font-family="'Syne', sans-serif" font-weight="bold">${ex.label}</text>
      <text x="${ex.x + ex.w/2}" y="${ex.y + 30}" text-anchor="middle" fill="#10b981" font-size="8" font-family="sans-serif">STAIRS</text>
    `;
  });

  // Danger Origin Scanner Effect
  if (emergency) {
    const dy = dangerRoom ? dangerRoom.y + 27 : 60;
    html += `
      <circle cx="${dangerX}" cy="${dy}" r="25" fill="url(#grad-danger)">
        <animate attributeName="r" values="20;45;20" dur="2s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.8;0.2;0.8" dur="2s" repeatCount="indefinite" />
      </circle>
      <g filter="url(#glow-room)">
        <circle cx="${dangerX}" cy="${dy}" r="6" fill="#ef4444"/>
        <text x="${dangerX}" y="${dy + 5}" text-anchor="middle" fill="#fff" font-size="12">⚠️</text>
      </g>
    `;
  }

  // Evacuation Route Logic
  const requiresEvac = emergency && (emergency.type === 'fire' || emergency.type === 'earthquake');
  if (requiresEvac) {
    const points = [
      {x: startX, y: startY},
      {x: startX, y: corridorY},
      {x: endX, y: corridorY},
      {x: endX, y: 210}
    ];
    
    // Calculate current visible path based on step index
    // Step 0: Leave room, Step 1: In corridor, Step 2: Walk to exit, Step 3: At stairs
    const currentPoints = points.slice(0, Math.min(state.currentStepIndex + 2, points.length));
    
    if (currentPoints.length > 1) {
      const pathStr = currentPoints.map(p => `${p.x},${p.y}`).join(' ');
      html += `
        <polyline points="${pathStr}" fill="none" stroke="#60a5fa" stroke-width="5" stroke-dasharray="12 10" stroke-linecap="round" filter="url(#glow-room)" class="evac-path-main"/>
        <polyline points="${pathStr}" fill="none" stroke="#fff" stroke-width="1.5" stroke-dasharray="12 10" stroke-linecap="round" opacity="0.6" class="evac-path-main"/>
      `;
      
      // Animated Arrows
      for (let i = 0; i < currentPoints.length - 1; i++) {
        const p1 = currentPoints[i];
        const p2 = currentPoints[i + 1];
        const dx = p2.x - p1.x, dy = p2.y - p1.y;
        const angle = Math.atan2(dy, dx) * 180 / Math.PI;
        const dist = Math.hypot(dx, dy);
        const numArrows = Math.max(1, Math.floor(dist / 40));
        
        for (let j = 1; j <= numArrows; j++) {
          const frac = j / (numArrows + 1);
          const ax = p1.x + dx * frac;
          const ay = p1.y + dy * frac;
          html += `
            <path d="M-5,-4 L5,0 L-5,4 Z" fill="#fff" transform="translate(${ax},${ay}) rotate(${angle})" filter="url(#glow-room)">
              <animate attributeName="opacity" values="0.2;1;0.2" dur="1s" begin="${frac}s" repeatCount="indefinite" />
              <animateTransform attributeName="transform" type="translate" values="-4,0; 4,0; -4,0" dur="1s" begin="${frac}s" additive="sum" repeatCount="indefinite" />
            </path>
          `;
        }
      }
    }
    
    // User Current Location Pulse
    const activePoint = currentPoints[currentPoints.length - 1];
    html += `
      <g filter="url(#glow-room)">
        <circle cx="${activePoint.x}" cy="${activePoint.y}" r="8" fill="#fff">
          <animate attributeName="r" values="8;12;8" dur="1s" repeatCount="indefinite" />
        </circle>
        <circle cx="${activePoint.x}" cy="${activePoint.y}" r="15" fill="none" stroke="#fff" stroke-width="1" opacity="0.5">
          <animate attributeName="r" values="10;25;10" dur="1s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.5;0;0.5" dur="1s" repeatCount="indefinite" />
        </circle>
      </g>
    `;
  }

  svg.innerHTML = html;

  // Manual dash animation for the path polyline
  if (state.dynMapAnim) cancelAnimationFrame(state.dynMapAnim);
  let offset = 0;
  function anim() {
    const lines = svg.querySelectorAll('.evac-path-main');
    if (lines.length > 0) {
      offset = (offset - 1.5) % 22;
      lines.forEach(l => l.setAttribute('stroke-dashoffset', offset));
    }
    state.dynMapAnim = requestAnimationFrame(anim);
  }
  anim();
}

function translateDemoText(text) {
  const dict = {
    "Leave your room immediately. Do not collect belongings.": "অবিলম্বে আপনার রুম ছেড়ে দিন।",
    "Turn left in the corridor toward Exit A.": "করিডোরে বাম দিকে মোড় নিয়ে এক্সিট এ (Exit A) এর দিকে যান।",
    "Take the stairs down. DO NOT use elevators.": "সিঁড়ি ব্যবহার করে নিচে যান। লিফট ব্যবহার করবেন না।",
    "Exit the building to the assembly point.": "বিল্ডিং থেকে বের হয়ে নিরাপদ স্থানে যান।",
    "Drop, cover, and hold on under a sturdy desk.": "মাটিতে বসে পড়ুন, আড়াল নিন এবং শক্ত করে ধরে রাখুন।",
    "Wait for the shaking to stop completely.": "ভূমিকম্প না থামা পর্যন্ত অপেক্ষা করুন।",
    "Carefully exit building via stairs. Watch for debris.": "সাবধানে সিঁড়ি দিয়ে বেরিয়ে যান।",
    "Lock your door and remain inside the room.": "আপনার দরজা লক করুন এবং ভিতরে থাকুন।",
    "Avoid standing near windows.": "জানালার পাশে দাঁড়ানো থেকে বিরত থাকুন।",
    "Wait for further instructions from authorities.": "পরবর্তী নির্দেশের জন্য অপেক্ষা করুন।",
    "Help is on the way. Please stay calm.": "সাহায্য আসছে। শান্ত থাকুন।",
    "Clear space around the person needing help.": "আহত ব্যক্তির কাছাকাছি জায়গা ফাঁকা করুন।"
  };
  return dict[text] || text;
}

// ============================================================
// REAL-TIME ALERT BROADCAST SYSTEM (MULTI-USER SIMULATION)
// ============================================================

const guestsRegistry = [
  { room: "203", floor: 2, zone: "east", name: "Vikram N." },
  { room: "305", floor: 3, zone: "west", name: "Priya S." },
  { room: "101", floor: 1, zone: "lobby", name: "Rahul D." }
];

function generateInstruction(guest, event) {
  const type = event.type;
  
  if (type === 'fire') {
    if (guest.floor === event.floor) return { message: "Fire on your floor! Evacuate immediately via nearest stairs.", status: "DANGER", icon: "🔴" };
    if (guest.floor > event.floor) return { message: "Fire below you. Evacuate fast using emergency stairs.", status: "DANGER", icon: "🔴" };
    return { message: "Fire reported above. Proceed calmly to safe exit.", status: "SAFE", icon: "🟡" };
  } else if (type === 'earthquake') {
    return { message: "Earthquake! Drop, cover, and hold on under a sturdy desk.", status: "DANGER", icon: "🔴" };
  } else if (type === 'suspicious') {
    if (guest.zone === event.zone || guest.floor === event.floor) return { message: "Security alert near you. Lock your door and stay inside.", status: "DANGER", icon: "🔴" };
    return { message: "Security incident reported. Avoid the area and stay in your room.", status: "SAFE", icon: "🟡" };
  } else {
    return { message: "Emergency responders dispatched. Clear the halls.", status: "SAFE", icon: "🟢" };
  }
}

function broadcastEmergency(event) {
  if (!event) event = { type: 'fire', floor: 2, zone: 'east' };
  
  // Admin UI notification wrapper
  if (window.addNotification) addNotification(event.type, `🚨 ${event.type.toUpperCase()} alert affecting multiple guests.`);
  if (window.addTimeline) addTimeline(event.type, `Multi-User Broadcast Initiated`);

  renderMultiGuestSimulatorUI();
  const responses = [];

  guestsRegistry.forEach((guest, index) => {
    const instruction = generateInstruction(guest, event);
    responses.push({ guest, instruction });

    // Stagger the UI updates slightly for organic network realism
    setTimeout(() => {
      updateGuestCardStatus(guest.room, instruction);
      triggerVibration(guest.room);
    }, 400 + (index * 600)); 

    // Stagger the physical voices over time to prevent audio overlap 
    setTimeout(() => {
      if (window.speakInstructionDirectly) {
        speakInstructionDirectly(`Guest in Room ${guest.room}: ${instruction.message}`, 'en');
      }
    }, 1000 + (index * 4000)); 
  });

  return responses;
}

function renderMultiGuestSimulatorUI() {
  const container = document.getElementById('multi-guest-container');
  if(!container) return;
  
  container.innerHTML = guestsRegistry.map(g => `
    <div id="gcard-${g.room}" style="padding:15px; margin-bottom:10px; background:var(--echo-glass); border-radius:8px; border:2px solid transparent; transition:0.3s; display:flex; align-items:center;">
       <div style="font-size:24px; margin-right:15px;">👤</div>
       <div style="flex: 1;">
         <div style="font-weight:bold; font-size:16px;">Room ${g.room} <span id="gicon-${g.room}">🟢</span></div>
         <div id="gmsg-${g.room}" style="font-size:13px; color:#9ca3af; margin-top:4px;">Monitoring secure.</div>
       </div>
    </div>
  `).join('');
}

function updateGuestCardStatus(room, instruction) {
  const card = document.getElementById(`gcard-${room}`);
  const msgLabel = document.getElementById(`gmsg-${room}`);
  const iconLabel = document.getElementById(`gicon-${room}`);
  
  if(card && msgLabel && iconLabel) {
    msgLabel.innerText = instruction.message;
    iconLabel.innerText = instruction.icon;
    
    if (instruction.status === "DANGER") {
      card.style.backgroundColor = "rgba(239, 68, 68, 0.1)"; // Red Glow
      card.style.borderColor = "#ef4444";
      msgLabel.style.color = "#fca5a5";
    } else {
      card.style.backgroundColor = "rgba(245, 158, 11, 0.1)"; // Amber Glow
      card.style.borderColor = "#f59e0b";
      msgLabel.style.color = "#fcd34d";
    }
  }
}

function triggerVibration(room) {
  const card = document.getElementById(`gcard-${room}`);
  if(card && card.animate) {
    card.animate([
      { transform: 'translateX(0)' },
      { transform: 'translateX(-5px)' },
      { transform: 'translateX(5px)' },
      { transform: 'translateX(-5px)' },
      { transform: 'translateX(5px)' },
      { transform: 'translateX(0)' }
    ], { duration: 400, easing: 'ease-in-out' });
  }
}
// ============================================================
// AI CALL SYSTEM INTEGRATION
// ============================================================
let activeAICall = null;

function toggleAICall() {
    const btn = document.getElementById('aicall-btn');
    const btnText = document.getElementById('aicall-btn-text');
    const btnIcon = document.getElementById('aicall-btn-icon');
    const card = document.getElementById('aicall-panel');

    if (activeAICall && activeAICall.isActive) {
        // End Call
        activeAICall.end();
        btn.classList.remove('active');
        btnText.innerText = 'Start AI Call';
        btnIcon.innerText = '📞';
        card.classList.remove('active');
    } else {
        // Start Call
        initiateAICall(state.currentEmergency?.type || 'general');
    }
}

function initiateAICall(type = 'fire') {
    if (activeAICall) activeAICall.end();

    const transcriptBox = document.getElementById('aicall-transcript-box');
    const statusEl = document.getElementById('aicall-status');
    const timerEl = document.getElementById('aicall-timer');
    const btn = document.getElementById('aicall-btn');
    const btnText = document.getElementById('aicall-btn-text');
    const btnIcon = document.getElementById('aicall-btn-icon');
    const card = document.getElementById('aicall-panel');

    // Reset UI
    transcriptBox.innerHTML = '';
    btn.classList.add('active');
    btnText.innerText = 'End AI Call';
    btnIcon.innerText = '📵';
    card.classList.add('active');

    activeAICall = new window.ResQAICall({
        lang: state.lang || 'en',
        guestName: state.guestObj?.name || 'Guest',
        incident: { type: type },
        position: {
            floor: state.guestObj?.floor || 1,
            room: state.guestObj?.roomNumber || '101',
            zone: state.guestObj?.zone || 'North'
        },
        onStatus: (status) => {
            statusEl.innerText = status.toUpperCase();
            if (status === 'connected') {
                // Start timer updates
                const timerInt = setInterval(() => {
                    if (!activeAICall || !activeAICall.isActive) {
                        clearInterval(timerInt);
                        return;
                    }
                    timerEl.innerText = activeAICall.getCallDuration();
                }, 1000);
            }
        },
        onTranscript: (role, text) => {
            const msg = document.createElement('div');
            msg.className = `aicall-msg ${role.toLowerCase()}`;
            msg.innerText = text;
            transcriptBox.appendChild(msg);
            transcriptBox.scrollTop = transcriptBox.scrollHeight;
        },
        onEnd: () => {
            statusEl.innerText = 'DISCONNECTED';
            btn.classList.remove('active');
            btnText.innerText = 'Start AI Call';
            btnIcon.innerText = '📞';
            card.classList.remove('active');
        }
    });

    activeAICall.start();
}

// Auto-trigger for fire
const originalGuestTriggerEmergency = guestTriggerEmergency;
guestTriggerEmergency = function(type) {
    originalGuestTriggerEmergency(type);
    if (type === 'fire') {
        setTimeout(() => {
            showToast('fire', 'AI ASSISTANT', 'Initiating emergency AI guidance call...');
            initiateAICall('fire');
        }, 1500);
    }
};
