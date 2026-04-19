// ============================================================
// ECHO+ REAL-TIME COMMUNICATION HUB
// Simulated broadcast across all panels via shared state
// ============================================================

const chatState = {
  messages: [],           // Global shared message store
  mediaRecorder: null,
  audioChunks: [],
  isRecording: false,
  currentTarget: 'all',   // 'all' | 'admin' | 'staff'
  unreadGuest: 0,
  unreadAdmin: 0,
};

// ─── NOTIFICATION SOUND (base64 beep) ──────────────────────
const ALERT_BEEP = new Audio('data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAA' +
  'EAAAQAAIAAAQABAABAAAEAAQABBAAEAAQABIIAAQAAQAAQAAQAA' + 
  'AAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA');

function playAlertBeep() {
  try { 
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);
  } catch(e) {}
}

// ─── SEND MESSAGE ───────────────────────────────────────────
function chatSend(role, panelSuffix, isEmergency = false) {
  const input = document.getElementById(`chat-input-${panelSuffix}`);
  const text = input ? input.value.trim() : '';
  if (!text) return;

  const room = role === 'guest' 
    ? (window.state && state.guestObj ? state.guestObj.roomNumber : '203')
    : (role === 'admin' ? 'Admin' : 'Staff');

  addChatMessage({
    role,
    room,
    text,
    type: isEmergency ? 'emergency' : 'text',
    target: chatState.currentTarget,
    ts: Date.now(),
  });

  if (input) input.value = '';
  if (isEmergency) playAlertBeep();
}

function addChatMessage(msg) {
  msg.id = 'msg_' + Date.now() + '_' + Math.random().toString(36).slice(2);
  chatState.messages.push(msg);
  renderAllChatPanels();
}

// ─── RENDER ALL CHAT PANELS ─────────────────────────────────
function renderAllChatPanels() {
  renderChatPanel('guest');
  renderChatPanel('admin');
}

function renderChatPanel(panelRole) {
  const feed = document.getElementById(`chat-feed-${panelRole}`);
  if (!feed) return;

  const currentRoom = panelRole === 'guest' 
    ? (window.state && state.guestObj ? state.guestObj.roomNumber : '203')
    : 'Admin';

  const msgs = chatState.messages.filter(m => {
    if (m.target === 'all') return true;
    if (m.target === 'admin' && panelRole === 'admin') return true;
    if (m.target === 'staff' && panelRole === 'admin') return true;
    return false;
  });

  feed.innerHTML = msgs.length === 0
    ? '<div style="text-align:center;color:#4b5563;font-size:13px;padding:20px 0;">No messages yet. Stay safe.</div>'
    : msgs.map(m => buildMessageBubble(m, currentRoom)).join('');

  // Auto-scroll
  feed.scrollTop = feed.scrollHeight;
}

function buildMessageBubble(msg, currentRoom) {
  const isMine = (msg.role === 'guest' && msg.room === currentRoom) ||
                 (msg.role === 'admin' && currentRoom === 'Admin');
  const time = new Date(msg.ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  const roleColors = { guest: '#4f8ef7', admin: '#ef4444', staff: '#10b981' };
  const roleLabels = { guest: `Guest · Rm ${msg.room}`, admin: '🛡️ Admin', staff: '👷 Staff' };
  const color = roleColors[msg.role] || '#9ca3af';

  if (msg.type === 'emergency') {
    return `
      <div class="chat-msg-wrap" style="justify-content:${isMine ? 'flex-end' : 'flex-start'}; animation: chatSlideIn 0.3s ease;">
        <div style="max-width:85%;background:rgba(239,68,68,0.15);border:2px solid #ef4444;border-radius:12px;padding:12px 14px;animation:chatPulse 1.5s ease 3;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
            <span style="color:#ef4444;font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;">🚨 EMERGENCY ALERT</span>
            <span style="font-size:10px;color:#4b5563;margin-left:auto;">${time}</span>
          </div>
          <div style="font-size:13px;color:#ef4444;font-weight:600;">${escapeHtml(msg.text)}</div>
          <div style="font-size:10px;color:#6b7280;margin-top:4px;">${roleLabels[msg.role]}</div>
        </div>
      </div>
    `;
  }

  if (msg.type === 'voice') {
    return `
      <div class="chat-msg-wrap" style="justify-content:${isMine ? 'flex-end' : 'flex-start'}; animation: chatSlideIn 0.3s ease;">
        <div style="max-width:80%;background:${isMine ? 'rgba(79,142,247,0.15)' : 'rgba(255,255,255,0.05)'};border:1px solid ${isMine ? 'rgba(79,142,247,0.4)' : 'rgba(255,255,255,0.08)'};border-radius:${isMine ? '16px 4px 16px 16px' : '4px 16px 16px 16px'};padding:10px 14px;">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
            <span style="font-size:10px;font-weight:700;color:${color};">${roleLabels[msg.role]}</span>
            <span style="font-size:10px;color:#4b5563;margin-left:auto;">${time}</span>
          </div>
          <div style="display:flex;align-items:center;gap:10px;">
            <span style="font-size:18px;">🎤</span>
            <audio controls src="${msg.audioUrl}" style="width:160px;height:30px;filter:invert(0.8);"></audio>
          </div>
        </div>
      </div>
    `;
  }

  if (msg.type === 'image') {
    return `
      <div class="chat-msg-wrap" style="justify-content:${isMine ? 'flex-end' : 'flex-start'}; animation: chatSlideIn 0.3s ease;">
        <div style="max-width:70%;background:${isMine ? 'rgba(79,142,247,0.15)' : 'rgba(255,255,255,0.05)'};border:1px solid ${isMine ? 'rgba(79,142,247,0.4)' : 'rgba(255,255,255,0.08)'};border-radius:${isMine ? '16px 4px 16px 16px' : '4px 16px 16px 16px'};padding:10px;">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
            <span style="font-size:10px;font-weight:700;color:${color};">${roleLabels[msg.role]}</span>
            <span style="font-size:10px;color:#4b5563;margin-left:auto;">${time}</span>
          </div>
          <img src="${msg.imageUrl}" style="width:100%;border-radius:8px;max-height:180px;object-fit:cover;" />
          ${msg.text ? `<div style="font-size:12px;color:#9ca3af;margin-top:6px;">${escapeHtml(msg.text)}</div>` : ''}
        </div>
      </div>
    `;
  }

  // Plain text
  return `
    <div class="chat-msg-wrap" style="justify-content:${isMine ? 'flex-end' : 'flex-start'}; animation: chatSlideIn 0.3s ease;">
      <div style="max-width:78%;background:${isMine ? 'rgba(79,142,247,0.15)' : 'rgba(255,255,255,0.05)'};border:1px solid ${isMine ? 'rgba(79,142,247,0.3)' : 'rgba(255,255,255,0.08)'};border-radius:${isMine ? '16px 4px 16px 16px' : '4px 16px 16px 16px'};padding:10px 14px;">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
          <span style="font-size:10px;font-weight:700;color:${color};">${roleLabels[msg.role]}</span>
          <span style="font-size:10px;color:#4b5563;margin-left:auto;">${time}</span>
        </div>
        <div style="font-size:13px;color:#e2e8f0;line-height:1.5;">${escapeHtml(msg.text)}</div>
        <div style="display:flex;align-items:center;gap:4px;margin-top:4px;justify-content:flex-end;">
          <span style="font-size:10px;color:#4b5563;">
            ${msg.target === 'all' ? '👥 All' : msg.target === 'admin' ? '🛡️ Admin' : '👷 Staff'}
          </span>
        </div>
      </div>
    </div>
  `;
}

// ─── VOICE RECORDING ────────────────────────────────────────
async function startVoiceRecording(panelSuffix) {
  const btn = document.getElementById(`chat-mic-${panelSuffix}`);
  if (chatState.isRecording) {
    stopVoiceRecording(panelSuffix);
    return;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    chatState.mediaRecorder = new MediaRecorder(stream);
    chatState.audioChunks = [];
    chatState.isRecording = true;
    if (btn) { btn.textContent = '⏹ Stop'; btn.style.background = 'rgba(239,68,68,0.3)'; btn.style.borderColor = '#ef4444'; }

    chatState.mediaRecorder.ondataavailable = e => {
      if (e.data.size > 0) chatState.audioChunks.push(e.data);
    };
    chatState.mediaRecorder.onstop = () => {
      const blob = new Blob(chatState.audioChunks, { type: 'audio/webm' });
      const url = URL.createObjectURL(blob);
      const role = panelSuffix === 'guest' ? 'guest' : 'admin';
      const room = role === 'guest' 
        ? (window.state && state.guestObj ? state.guestObj.roomNumber : '203')
        : 'Admin';
      addChatMessage({ role, room, type: 'voice', audioUrl: url, target: chatState.currentTarget, ts: Date.now() });
      chatState.isRecording = false;
      stream.getTracks().forEach(t => t.stop());
      if (btn) { btn.textContent = '🎤'; btn.style.background = ''; btn.style.borderColor = ''; }
    };
    chatState.mediaRecorder.start();
  } catch (err) {
    alert('Microphone permission denied. Please allow microphone access for voice messages.');
    chatState.isRecording = false;
  }
}

function stopVoiceRecording(panelSuffix) {
  if (chatState.mediaRecorder && chatState.isRecording) {
    chatState.mediaRecorder.stop();
  }
}

// ─── IMAGE UPLOAD ───────────────────────────────────────────
function handleImageUpload(event, panelSuffix) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    const role = panelSuffix === 'guest' ? 'guest' : 'admin';
    const room = role === 'guest' 
      ? (window.state && state.guestObj ? state.guestObj.roomNumber : '203')
      : 'Admin';
    addChatMessage({ role, room, type: 'image', imageUrl: e.target.result, text: '', target: chatState.currentTarget, ts: Date.now() });
  };
  reader.readAsDataURL(file);
}

// ─── QUICK ADMIN REPLY ───────────────────────────────────────
function adminQuickReply(text) {
  addChatMessage({
    role: 'admin',
    room: 'Admin',
    text,
    type: 'text',
    target: 'all',
    ts: Date.now(),
  });
}

// ─── KEYBOARD SHORTCUT (Enter to send) ──────────────────────
function chatInputKeydown(e, panelSuffix, role) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    chatSend(role, panelSuffix);
  }
}

// ─── UTILS ──────────────────────────────────────────────────
function escapeHtml(text) {
  return String(text)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');
}

function setChatTarget(target, panelSuffix) {
  chatState.currentTarget = target;
  ['all', 'admin', 'staff'].forEach(t => {
    const btn = document.getElementById(`ctarget-${t}-${panelSuffix}`);
    if (btn) {
      btn.style.background = t === target ? 'rgba(79,142,247,0.3)' : 'rgba(255,255,255,0.05)';
      btn.style.borderColor = t === target ? 'rgba(79,142,247,0.6)' : 'rgba(255,255,255,0.1)';
      btn.style.color = t === target ? '#4f8ef7' : '#6b7280';
    }
  });
}
