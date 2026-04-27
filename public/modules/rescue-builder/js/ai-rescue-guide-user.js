// =====================================================
// AI MAP ANALYSIS RESCUE GUIDE — USER PANEL
// Injects into Guide tab of user-panel.html
// =====================================================
(function () {
  'use strict';
  const RG_USER_ID = 'ai-rescue-guide-user-root';
  let _origin = window.location.origin;
  if (_origin.includes('file://') || _origin.includes(':5500') || _origin.includes(':5501') || _origin === 'null') _origin = 'http://localhost:3000';
  const API_BASE = _origin + '/api/custom-system';

  function escHtml(v) { return String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function safeArray(obj, key) { return obj && Array.isArray(obj[key]) ? obj[key] : []; }
  function safeParseJSON(val, fb) { if (!val) return fb; if (typeof val === 'object') return val; try { return JSON.parse(val); } catch { return fb; } }
  function getSystemID() { return localStorage.getItem('active_system_id') || new URLSearchParams(location.search).get('systemID') || ''; }

  function toast(msg, type) {
    if (typeof window.toast === 'function') { window.toast(msg, type); return; }
    const c = document.getElementById('toast'); if (!c) return;
    const d = document.createElement('div'); d.className = 'toast-msg toast-' + (type || 'info'); d.textContent = msg; c.appendChild(d); setTimeout(() => d.remove(), 4000);
  }

  function waitForElement(sel, cb, maxWait) {
    maxWait = maxWait || 10000;
    const iv = setInterval(() => { const el = document.querySelector(sel); if (el) { clearInterval(iv); cb(el); } }, 500);
    setTimeout(() => clearInterval(iv), maxWait);
  }

  // ===== TRANSLATIONS =====
  const translations = {
    en: {
      title: 'AI Map Analysis Rescue Guide',
      nearestExits: '🚪 Nearest Exits',
      evacuationSteps: '🏃 Evacuation Steps',
      assemblyPoints: '🏟️ Assembly Points',
      dos: "✅ Do's During Emergency",
      donts: "❌ Don'ts During Emergency",
      noGuide: 'Emergency guide not available. Contact your admin.',
      step: 'Step', readOnly: 'Read Only', safetyScore: 'Safety Score',
      goTo: 'Go to', proceedTo: 'Proceed to', followInstructions: 'Follow staff instructions',
      doItems: ['Stay calm and alert at all times', 'Follow the marked evacuation routes', 'Help others who need assistance', 'Move quickly but do not run', 'Report to your designated assembly point'],
      dontItems: ['Do NOT use elevators during emergencies', 'Do NOT go back for personal belongings', 'Do NOT block exit pathways', 'Do NOT panic or push others', 'Do NOT ignore fire alarm signals']
    },
    hi: {
      title: 'एआई मैप विश्लेषण बचाव गाइड',
      nearestExits: '🚪 निकटतम निकास',
      evacuationSteps: '🏃 निकासी के कदम',
      assemblyPoints: '🏟️ सभा स्थल',
      dos: '✅ आपातकाल में क्या करें',
      donts: '❌ आपातकाल में क्या न करें',
      noGuide: 'आपातकालीन गाइड उपलब्ध नहीं है। अपने एडमिन से संपर्क करें।',
      step: 'कदम', readOnly: 'केवल पढ़ने के लिए', safetyScore: 'सुरक्षा स्कोर',
      goTo: 'जाएं', proceedTo: 'आगे बढ़ें', followInstructions: 'कर्मचारियों के निर्देशों का पालन करें',
      doItems: ['हमेशा शांत और सतर्क रहें', 'चिह्नित निकासी मार्गों का पालन करें', 'जिन्हें सहायता चाहिए उनकी मदद करें', 'तेज़ी से चलें लेकिन दौड़ें नहीं', 'निर्धारित सभा स्थल पर रिपोर्ट करें'],
      dontItems: ['आपातकाल में लिफ्ट का उपयोग न करें', 'व्यक्तिगत सामान के लिए वापस न जाएं', 'निकास मार्गों को अवरुद्ध न करें', 'घबराएं नहीं और दूसरों को धक्का न दें', 'फायर अलार्म सिग्नल को अनदेखा न करें']
    },
    bn: {
      title: 'এআই ম্যাপ বিশ্লেষণ উদ্ধার গাইড',
      nearestExits: '🚪 নিকটতম বের হওয়ার পথ',
      evacuationSteps: '🏃 সরিয়ে নেওয়ার ধাপ',
      assemblyPoints: '🏟️ সমাবেশ স্থান',
      dos: '✅ জরুরি অবস্থায় করণীয়',
      donts: '❌ জরুরি অবস্থায় যা করবেন না',
      noGuide: 'জরুরি গাইড উপলব্ধ নেই। আপনার অ্যাডমিনের সাথে যোগাযোগ করুন।',
      step: 'ধাপ', readOnly: 'শুধুমাত্র পড়ার জন্য', safetyScore: 'নিরাপত্তা স্কোর',
      goTo: 'যান', proceedTo: 'এগিয়ে যান', followInstructions: 'কর্মীদের নির্দেশাবলী অনুসরণ করুন',
      doItems: ['সবসময় শান্ত ও সতর্ক থাকুন', 'চিহ্নিত সরিয়ে নেওয়ার পথ অনুসরণ করুন', 'যাদের সাহায্য দরকার তাদের সাহায্য করুন', 'দ্রুত চলুন কিন্তু দৌড়াবেন না', 'নির্ধারিত সমাবেশ স্থানে রিপোর্ট করুন'],
      dontItems: ['জরুরি অবস্থায় লিফট ব্যবহার করবেন না', 'ব্যক্তিগত জিনিসপত্রের জন্য ফিরে যাবেন না', 'বের হওয়ার পথ আটকাবেন না', 'আতঙ্কিত হবেন না বা ধাক্কাধাক্কি করবেন না', 'ফায়ার অ্যালার্ম সংকেত উপেক্ষা করবেন না']
    }
  };

  let currentLang = 'en', currentAnalysis = null, currentVisible = 1, collapsedSections = {};
  function t(key) { return (translations[currentLang] && translations[currentLang][key]) || translations.en[key] || key; }

  async function fetchLayoutAnalysis() {
    const sid = getSystemID(); if (!sid) return null;
    try { const r = await fetch(API_BASE + '/' + sid); if (r.ok) { const d = await r.json(); const s = d.system || d; return { analysis: safeParseJSON(s.layoutAnalysis || s.layout_analysis, null), visible: s.layout_analysis_visible != null ? s.layout_analysis_visible : 1 }; } } catch (e) { console.warn('[RG-USER] API fail:', e.message); }
    try { const c = JSON.parse(localStorage.getItem('resqai_custom_systems') || '[]'); let s = c.find(x => (x.systemID || x.id) === getSystemID()); if (s?.data) s = { ...s, ...s.data }; if (s) return { analysis: safeParseJSON(s.layoutAnalysis || s.layout_analysis, null), visible: 1 }; } catch {}
    return { analysis: null, visible: 1 };
  }

  function renderScoreBadge(score) {
    const s = typeof score === 'number' ? score : null;
    const cls = s === null ? 'score-na' : s >= 8 ? 'score-high' : s >= 5 ? 'score-medium' : 'score-low';
    return `<div class="safety-score-badge ${cls}"><span class="score-value">${s !== null ? s : '—'}</span><span class="score-label">${s !== null ? '/10' : 'N/A'}</span></div>`;
  }

  function deriveEvacuationSteps(a) {
    const routes = safeArray(a, 'evacuationRoutes'), exits = safeArray(a, 'exits'), ap = safeArray(a, 'assemblyPoints');
    const steps = [];
    if (routes.length > 0) {
      routes.slice().sort((x, y) => { const p = (x.priority || '').toLowerCase(), q = (y.priority || '').toLowerCase(); if (p === 'primary' && q !== 'primary') return -1; if (q === 'primary' && p !== 'primary') return 1; return 0; })
        .forEach((r, i) => steps.push(`${t('step')} ${i + 1}: ${t('goTo')} ${r.from || 'current area'} → ${r.to || 'safe exit'}`));
    }
    if (steps.length === 0 && exits.length > 0) exits.forEach((e, i) => steps.push(`${t('step')} ${i + 1}: ${t('proceedTo')} ${e.location || e.type || 'Exit ' + (i + 1)}`));
    if (ap.length > 0) steps.push(`${t('step')} ${steps.length + 1}: ${t('proceedTo')} ${ap[0].location || ap[0].name || 'assembly point'}`);
    if (steps.length === 0) steps.push(`${t('step')} 1: ${t('followInstructions')}`);
    return steps.slice(0, 6);
  }

  function deriveDos(a) {
    const recs = safeArray(a, 'recommendations'), dos = [];
    recs.forEach(r => { const tx = r.action || r.recommendation || ''; if (tx) dos.push(tx); });
    const defs = t('doItems'); while (dos.length < 5 && defs.length > dos.length) dos.push(defs[dos.length]);
    return dos.slice(0, 6);
  }

  function deriveDonts(a) {
    const hrz = safeArray(a, 'highRiskZones'), donts = [];
    hrz.forEach(z => { const s = (z.severity || '').toLowerCase(); if (s === 'high' || s === 'critical') { const r = z.risk || z.location || ''; if (r) donts.push('⚠️ Avoid: ' + r); } });
    t('dontItems').forEach(d => { if (!donts.includes(d)) donts.push(d); });
    return donts.slice(0, 6);
  }

  function renderCard(key, colorCls, title, items, renderItem) {
    const col = collapsedSections[key];
    const hCls = col ? 'guide-card-header collapsed' : 'guide-card-header';
    const bCls = col ? 'guide-card-body collapsed' : 'guide-card-body';
    let body = items.length === 0 ? `<div class="rg-item" style="color:var(--rg-text-muted);font-style:italic;">No data</div>` : items.map((it, i) => renderItem(it, i)).join('');
    return `<div class="guide-card ${colorCls}" data-section="${key}"><div class="${hCls}" onclick="window.__rgUserToggle('${key}')"><h4 class="rg-card-title">${title}</h4><div style="display:flex;align-items:center;gap:8px;"><span class="rg-card-count">${items.length}</span><span class="material-symbols-outlined rg-collapse-arrow">expand_more</span></div></div><div class="${bCls}">${body}</div></div>`;
  }

  function renderGuide(container) {
    if (document.getElementById(RG_USER_ID)) document.getElementById(RG_USER_ID).remove();
    const w = document.createElement('div'); w.id = RG_USER_ID; w.className = 'ai-rescue-guide-container'; w.style.marginTop = '20px';

    if (!currentAnalysis) {
      w.innerHTML = `<div class="card p-6" style="border:1px solid rgba(255,255,255,0.06);border-radius:16px;"><div class="empty-state-guide"><span class="rg-empty-icon">📋</span><div class="rg-empty-title">${escHtml(t('noGuide'))}</div></div></div>`;
      container.appendChild(w); return;
    }

    const a = currentAnalysis;
    const exits = safeArray(a, 'exits'), ap = safeArray(a, 'assemblyPoints');
    const evacSteps = deriveEvacuationSteps(a), dos = deriveDos(a), donts = deriveDonts(a);
    const score = typeof a.overallSafetyScore === 'number' ? a.overallSafetyScore : null;

    w.innerHTML = `<div class="card p-6" style="border:1px solid rgba(255,255,255,0.06);border-radius:16px;">
      <div class="rescue-guide-header">
          <div style="display:flex;align-items:flex-start;gap:16px;flex:1;min-width:0;max-width:100%;">
            ${renderScoreBadge(score)}
            <div class="rg-title-group" style="flex:1; min-width:0; word-wrap:break-word;">
              <h3 class="rg-title" style="display:flex;align-items:flex-start;gap:8px;line-height:1.3;margin:0 0 6px 0;">
                <span class="material-symbols-outlined" style="color:#ffb3ae;flex-shrink:0;">menu_book</span>
                <span style="flex:1;">${escHtml(t('title'))}</span>
              </h3>
            </div>
          </div>
        <div class="rg-controls">
          <button style="padding:6px 12px;border-radius:8px;background:rgba(59,130,246,0.15);border:1px solid rgba(59,130,246,0.3);color:#93c5fd;font-family:var(--rg-font-headline);font-size:11px;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:6px;transition:all 0.2s;" onclick="window.__rgOpenUserMapPreview()"><span class="material-symbols-outlined" style="font-size:14px;">map</span> View Map</button>
          <div class="visibility-toggle ${currentVisible ? 'active' : ''}" onclick="window.__rgToggleVisibilityUser()" title="Toggle visibility for users"><span class="toggle-label">Show to Users</span><div class="toggle-switch"></div></div>
        </div>
      </div>
      <div class="rg-cards-grid" style="${currentVisible ? '' : 'display:none;'}">
        ${renderCard('exits', 'guide-card-green', t('nearestExits'), exits, (e, i) => `<div class="rg-item"><span class="rg-item-number">${i + 1}</span><div class="rg-item-text">${escHtml(e.location || e.type || 'Exit ' + (i + 1))}</div></div>`)}
        ${renderCard('evacuationSteps', 'guide-card-blue', t('evacuationSteps'), evacSteps, (s, i) => `<div class="rg-item"><span class="rg-item-number">${i + 1}</span><div class="rg-item-text">${escHtml(s)}</div></div>`)}
        ${renderCard('assemblyPoints', 'guide-card-cyan', t('assemblyPoints'), ap, (p, i) => `<div class="rg-item"><span class="rg-item-number">${i + 1}</span><div class="rg-item-text">${escHtml(p.location || p.name || 'Point ' + (i + 1))}</div></div>`)}
        ${renderCard('dos', 'guide-card-green', t('dos'), dos, (it, i) => `<div class="rg-item"><span class="rg-item-number">${i + 1}</span><div class="rg-item-text">${escHtml(it)}</div></div>`)}
        ${renderCard('donts', 'guide-card-red', t('donts'), donts, (it, i) => `<div class="rg-item"><span class="rg-item-number">${i + 1}</span><div class="rg-item-text">${escHtml(it)}</div></div>`)}
      </div>
    </div>`;
    container.appendChild(w);
  }

  window.__rgUserToggle = function(k) { collapsedSections[k] = !collapsedSections[k]; const c = document.querySelector(`#${RG_USER_ID} .guide-card[data-section="${k}"]`); if (!c) return; c.querySelector('.guide-card-header')?.classList.toggle('collapsed'); c.querySelector('.guide-card-body')?.classList.toggle('collapsed'); };
  window.__rgSetLang = function(l) { currentLang = l; injectGuide(); };

  window.__rgToggleVisibilityUser = async function() { 
      currentVisible = currentVisible ? 0 : 1; 
      document.querySelector('.visibility-toggle')?.classList.toggle('active', !!currentVisible); 
      const grid = document.querySelector(`#${RG_USER_ID} .rg-cards-grid`);
      if (grid) grid.style.display = currentVisible ? '' : 'none';
      
      const sid = getSystemID();
      if (!sid) return;
      try {
          const r = await fetch(API_BASE + '/' + sid + '/layout-analysis', { 
              method: 'PATCH', 
              headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + (localStorage.getItem('auth-token') || localStorage.getItem('user-session') || '') }, 
              body: JSON.stringify({ layout_analysis_visible: currentVisible }) 
          });
          const type = r.ok ? 'success' : 'warning';
          const msg = currentVisible ? 'Guide visible to users' : 'Guide hidden from users';
          // Find toast div
          let c = document.getElementById('toast');
          if (c) {
              const d = document.createElement('div'); d.className = 'toast-msg toast-' + type; d.textContent = msg; 
              c.appendChild(d); setTimeout(() => d.remove(), 4000);
          }
      } catch (e) { console.warn(e); }
  };

  window.__rgOpenUserMapPreview = async function() {
    const sys = window.systemData;
    let b64 = sys?.layout_image || sys?.structure?.layoutAsset?.base64;
    let mime = sys?.structure?.layoutAsset?.mimeType || 'image/jpeg';
    if (!b64) {
        try {
            const sid = getSystemID() || new URLSearchParams(location.search).get('systemID');
            const resp = await fetch(API_BASE + '/' + sid);
            if (resp.ok) {
                const data = await resp.json();
                b64 = data.system?.layout_image || data.system?.structure?.layoutAsset?.base64;
                mime = data.system?.structure?.layoutAsset?.mimeType || mime;
                if (b64 && sys) {
                    sys.layout_image = b64;
                }
            }
        } catch (e) { console.warn('[RG] Failed to fetch map from API:', e); }
    }
    if (!b64) { toast('No map image available in system data.', 'warning'); return; }
    let ov = document.getElementById('rg-map-modal'); if (ov) ov.remove();
    ov = document.createElement('div'); ov.id = 'rg-map-modal'; ov.className = 'rg-modal-overlay';
    ov.innerHTML = `<div class="rg-modal" style="max-width:800px; width:90%;"><h3 style="margin-bottom:16px;">🗺️ System Map</h3><div style="background:#0b1220;border-radius:10px;padding:10px;text-align:center;"><img src="data:${mime};base64,${b64}" style="max-width:100%;max-height:60vh;border-radius:8px;object-fit:contain;" alt="Map"/></div><div class="rg-modal-actions" style="margin-top:20px;justify-content:center;"><button class="rg-modal-btn primary" onclick="document.getElementById('rg-map-modal').remove()">Close Map</button></div></div>`;
    document.body.appendChild(ov);
    ov.addEventListener('click', function(e) { if (e.target === ov) ov.remove(); });
  };

  async function injectGuide() {
    const sec = document.getElementById('section-guide'); if (!sec) return;
    if (currentAnalysis === null) { const r = await fetchLayoutAnalysis(); if (r) { currentAnalysis = r.analysis; currentVisible = r.visible; } else { currentAnalysis = false; currentVisible = 0; } }
    renderGuide(sec);
  }

  function init() {
    waitForElement('#section-guide', () => { console.log('[RG-USER] Injecting rescue guide'); injectGuide(); }, 12000);
    document.addEventListener('click', e => { const n = e.target.closest('[onclick*="showTab"]'); if (n) { const m = n.getAttribute('onclick').match(/showTab\(['"](\w+)['"]\)/); if (m && m[1] === 'guide') setTimeout(injectGuide, 100); } });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
