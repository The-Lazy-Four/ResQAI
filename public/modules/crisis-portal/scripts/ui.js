// ============================================
// ResQAI Crisis Portal - UI Utilities
// ============================================

/**
 * Show AI response in the AI response panel
 */
export function showAIResponse(text) {
  const panel = document.getElementById('ai-response-panel');
  if (!panel) return;

  panel.classList.remove('hidden');

  const content = document.getElementById('ai-response-content');
  if (content) {
    // Format text: bold **text**, newlines, numbered lists
    const formatted = text
      .replace(/\*\*(.*?)\*\*/g, '<strong class="text-on-background">$1</strong>')
      .replace(/\n/g, '<br>')
      .replace(/(\d+\.\s)/g, '<span class="text-cyan-400 font-bold">$1</span>');

    content.innerHTML = formatted;

    // Scroll panel into view smoothly
    panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

/**
 * Show a loading state in the AI panel
 */
export function showAILoading() {
  showAIResponse('<span class="animate-pulse text-slate-400">⏳ ResQAI is thinking...</span>');
}

/**
 * Hide AI response panel
 */
export function hideAIResponse() {
  const panel = document.getElementById('ai-response-panel');
  if (panel) panel.classList.add('hidden');
}

/**
 * Update the live clock
 */
export function startClock() {
  const clockEl = document.getElementById('live-clock');
  if (!clockEl) return;

  function tick() {
    const now = new Date();
    const h = String(now.getUTCHours()).padStart(2, '0');
    const m = String(now.getUTCMinutes()).padStart(2, '0');
    const s = String(now.getUTCSeconds()).padStart(2, '0');
    clockEl.textContent = `${h}:${m}:${s} UTC`;
  }

  tick();
  setInterval(tick, 1000);
}

/**
 * Cycle safety tips
 */
export function initSafetyTips() {
  const tips = [
    {
      icon: 'medical_information',
      title: 'Smoke Inhalation Prevention',
      body: 'Stay low to the floor. Use a damp cloth to cover nose and mouth. Crawl to exits.',
    },
    {
      icon: 'fire_extinguisher',
      title: 'Fire Extinguisher Protocol',
      body: 'PASS: Pull pin, Aim low, Squeeze handle, Sweep side to side. Use only if safe.',
    },
    {
      icon: 'water_drop',
      title: 'Flood Safety',
      body: 'Never walk in moving water. Move to higher ground immediately. Avoid storm drains.',
    },
    {
      icon: 'earthquake',
      title: 'Earthquake: Drop Cover Hold',
      body: 'Drop to hands and knees. Take cover under desk. Hold on until shaking stops.',
    },
    {
      icon: 'favorite',
      title: 'CPR Basics',
      body: 'Call 108, push hard and fast in center of chest, 100-120 compressions per minute.',
    },
  ];

  let current = 0;
  const titleEl = document.getElementById('safety-tip-title');
  const bodyEl = document.getElementById('safety-tip-body');
  const iconEl = document.getElementById('safety-tip-icon');
  const dotsEl = document.getElementById('safety-tip-dots');

  if (!titleEl || !bodyEl) return;

  function renderTip(idx) {
    const tip = tips[idx];
    titleEl.textContent = tip.title;
    bodyEl.textContent = tip.body;
    if (iconEl) iconEl.textContent = tip.icon;
    if (dotsEl) {
      dotsEl.innerHTML = tips
        .map(
          (_, i) =>
            `<div class="${i === idx ? 'w-4 h-1 bg-secondary' : 'w-1 h-1 bg-white/20'} rounded-full transition-all"></div>`
        )
        .join('');
    }
  }

  renderTip(0);

  setInterval(() => {
    current = (current + 1) % tips.length;
    renderTip(current);
  }, 5000);
}
