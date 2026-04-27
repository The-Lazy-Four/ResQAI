// ============================================
// ResQAI Crisis Portal - SOS System
// ============================================

import { getSOSGuidance } from './aiService.js';
import { addAlert } from './alerts.js';
import { showAIResponse } from './ui.js';

let sosActive = false;

const SOS_TYPES = {
  fire: { label: 'Fire Emergency', severity: 'critical' },
  medical: { label: 'Medical Emergency', severity: 'critical' },
  safety: { label: 'Women Safety Alert', severity: 'critical' },
  child: { label: 'Child Safety Alert', severity: 'critical' },
  quake: { label: 'Earthquake Alert', severity: 'critical' },
  flood: { label: 'Flood Emergency', severity: 'medium' },
  theft: { label: 'Theft / Crime Alert', severity: 'medium' },
  other: { label: 'General Emergency', severity: 'medium' },
  sos: { label: 'SOS TRIGGERED', severity: 'critical' },
};

/**
 * Play loud siren sound using Web Audio API
 */
function playSiren(duration = 5000, frequency = 800) {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Siren waveform: alternating frequency for classic siren sound
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);

    // Ramp up and down frequency for siren effect
    oscillator.frequency.exponentialRampToValueAtTime(1200, audioContext.currentTime + 0.5);
    oscillator.frequency.exponentialRampToValueAtTime(frequency, audioContext.currentTime + 1);

    // Create pulsing effect
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.8, audioContext.currentTime + 0.1);
    gainNode.gain.exponentialRampToValueAtTime(0.3, audioContext.currentTime + 0.5);

    // Repeat siren pattern
    let time = audioContext.currentTime;
    const endTime = audioContext.currentTime + (duration / 1000);

    while (time < endTime) {
      oscillator.frequency.exponentialRampToValueAtTime(1200, time + 0.4);
      oscillator.frequency.exponentialRampToValueAtTime(frequency, time + 0.8);
      gainNode.gain.exponentialRampToValueAtTime(0.8, time + 0.1);
      gainNode.gain.exponentialRampToValueAtTime(0.3, time + 0.5);
      time += 1;
    }

    oscillator.start(audioContext.currentTime);
    oscillator.stop(endTime);
  } catch (err) {
    console.log('Siren audio error:', err);
  }
}

/**
 * Trigger SOS for a given type
 */
export async function triggerSOS(type = 'sos') {
  if (sosActive) return;
  sosActive = true;

  const info = SOS_TYPES[type] || SOS_TYPES.sos;

  // Play loud siren immediately
  playSiren(5000, 800);

  // Update status indicator
  updateStatus('EMERGENCY - SOS ACTIVE', 'red');

  // Add to alert feed
  addAlert({
    type,
    severity: info.severity,
    title: info.label,
    description: `SOS triggered by Operator 01 at Sector 7G. Emergency services notified.`,
    distance: 'YOUR LOCATION',
  });

  // Show dispatching notification with siren indicator
  showToast(`🚨 ${info.label.toUpperCase()} — SIREN ACTIVATED! Emergency services dispatched!`, 'critical');

  // Show loading in AI panel
  showAIResponse('⏳ Getting emergency guidance from ResQAI...');

  // Call AI for guidance
  const guidance = await getSOSGuidance(type);
  showAIResponse(`🚨 **${info.label}** — AI Guidance:\n\n${guidance}`);

  // Simulate dispatch status update
  setTimeout(() => {
    showToast('✅ Police & Ambulance dispatched to Sector 7G', 'info');
  }, 2000);

  // Reset after 30 seconds
  setTimeout(() => {
    sosActive = false;
    updateStatus('STATUS: SECURE', 'green');
  }, 30000);
}

/**
 * Initialize all SOS buttons
 */
export function initSOS() {
  // Main SOS button in sidebar
  const sidebarSOS = document.getElementById('sidebar-sos-btn');
  if (sidebarSOS) {
    sidebarSOS.addEventListener('click', () => triggerSOS('sos'));
  }

  // Big TRIGGER SOS NOW button
  const mainSOS = document.getElementById('main-sos-btn');
  if (mainSOS) {
    mainSOS.addEventListener('click', () => triggerSOS('sos'));
  }

  // Smart SOS type tiles
  document.querySelectorAll('[data-sos-type]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const type = btn.getAttribute('data-sos-type');
      triggerSOS(type);
    });
  });

  // Quick-dial protocol buttons
  document.querySelectorAll('[data-dial]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const number = btn.getAttribute('data-dial');
      showToast(`📞 Calling ${number}...`, 'info');
    });
  });

  // Broadcast location
  const broadcastBtn = document.getElementById('broadcast-location-btn');
  if (broadcastBtn) {
    broadcastBtn.addEventListener('click', broadcastLocation);
  }

  // Navigate button on map
  const navigateBtn = document.getElementById('navigate-btn');
  if (navigateBtn) {
    navigateBtn.addEventListener('click', () => {
      showToast('🗺️ Navigation to Sector 7 Central Bunker activated', 'info');
    });
  }
}

/**
 * Broadcast user location
 */
function broadcastLocation() {
  showToast('📡 Broadcasting location...', 'info');

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        showToast(`✅ Location broadcasted: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`, 'success');
        updateLocationDisplay(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
      },
      () => {
        // Fallback if user denies
        showToast('✅ Location broadcasted: SECTOR 7G (default)', 'success');
      }
    );
  } else {
    showToast('✅ Location broadcasted: SECTOR 7G', 'success');
  }
}

function updateLocationDisplay(text) {
  const el = document.getElementById('location-display');
  if (el) el.textContent = text;
}

function updateStatus(text, color) {
  const el = document.getElementById('status-indicator');
  if (!el) return;

  el.querySelector('span.status-text').textContent = text;

  el.className = el.className
    .replace(/bg-\w+-500\/10|border-\w+-500\/20|text-\w+-500/g, '')
    .trim();

  const colorMap = {
    green: 'bg-green-500/10 border-green-500/20 text-green-500',
    red: 'bg-rose-500/10 border-rose-500/20 text-rose-500',
  };

  el.classList.add(...(colorMap[color] || colorMap.green).split(' '));

  const dot = el.querySelector('.status-dot');
  if (dot) {
    dot.className = dot.className.replace(/bg-\w+-500/, '');
    dot.classList.add(color === 'red' ? 'bg-rose-500' : 'bg-green-500');
  }
}

/**
 * Show a toast notification
 */
export function showToast(message, type = 'info') {
  const toastContainer = document.getElementById('toast-container');
  if (!toastContainer) return;

  const colorMap = {
    critical: 'border-rose-500 bg-rose-500/10 text-rose-300',
    info: 'border-cyan-500 bg-cyan-500/10 text-cyan-300',
    success: 'border-green-500 bg-green-500/10 text-green-300',
  };

  const toast = document.createElement('div');
  toast.className = `border ${colorMap[type] || colorMap.info} px-5 py-3 rounded-xl text-xs font-headline backdrop-blur-md shadow-xl animate-fade-in max-w-sm`;
  toast.textContent = message;

  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.5s';
    setTimeout(() => toast.remove(), 500);
  }, 4000);
}
