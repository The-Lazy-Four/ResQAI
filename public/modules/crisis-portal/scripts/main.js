// ============================================
// ResQAI Crisis Portal - Main Entry Point
// ============================================

import { initNavigation } from './navigation.js';
import { initSOS, showToast } from './sos.js';
import { initAlerts } from './alerts.js';
import { startClock, initSafetyTips, showAIResponse, showAILoading } from './ui.js';
import { initVoice } from './voice.js';
import { askAI } from './aiService.js';

// ==================== BOOT ====================

document.addEventListener('DOMContentLoaded', () => {
  console.log('[ResQAI] Booting crisis portal...');

  startClock();
  initNavigation();
  initAlerts();
  initSOS();
  initSafetyTips();
  initAIBar();

  console.log('[ResQAI] Crisis portal ready ✅');
});

// ==================== AI INPUT BAR ====================

function initAIBar() {
  const input = document.getElementById('ai-input');
  const askBtn = document.getElementById('ask-ai-btn');
  const micBtn = document.getElementById('mic-btn');

  if (!input || !askBtn) return;

  // Voice
  initVoice(input, micBtn);

  // Submit on button click
  askBtn.addEventListener('click', () => submitAIQuery(input.value));

  // Submit on Enter
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') submitAIQuery(input.value);
  });
}

async function submitAIQuery(message) {
  if (!message || !message.trim()) return;

  const input = document.getElementById('ai-input');

  showAILoading();

  // Clear input
  if (input) input.value = '';

  try {
    const response = await askAI(
      message,
      'You are ResQAI, an emergency response AI assistant. Be concise, direct, and helpful for crisis situations.'
    );
    showAIResponse(response);
  } catch (err) {
    showAIResponse('⚠️ Unable to reach AI. For emergencies: call 112 immediately.');
  }
}
