// =====================================================
// AI MAP ANALYSIS RESCUE GUIDE — ADMIN PANEL
// Injects into Emergency section of admin-panel.html
// =====================================================
(function () {
  'use strict';
  const RG_ADMIN_ID = 'ai-rescue-guide-admin-root';
  const API_BASE = window.location.origin + '/api/custom-system';

  function escHtml(v) { return String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function safeArray(obj, key) { return obj && Array.isArray(obj[key]) ? obj[key] : []; }
  function safeParseJSON(val, fb) { if (!val) return fb; if (typeof val === 'object') return val; try { return JSON.parse(val); } catch { return fb; } }
  function getSystemID() { return localStorage.getItem('active_system_id') || new URLSearchParams(location.search).get('systemID') || ''; }
  function getAuthToken() { return localStorage.getItem('auth-token') || localStorage.getItem('user-session') || ''; }

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

  // ===== FETCH / PATCH =====
  async function fetchLayoutAnalysis() {
    const sid = getSystemID(); if (!sid) return null;
    try {
      const r = await fetch(API_BASE + '/' + sid); if (r.ok) { const d = await r.json(); const s = d.system || d;
        return { analysis: safeParseJSON(s.layoutAnalysis || s.layout_analysis, null), visible: s.layout_analysis_visible != null ? s.layout_analysis_visible : 1 };
      }
    } catch (e) { console.warn('[RG-ADMIN] API fail:', e.message); }
      try { const c = JSON.parse(localStorage.getItem('resqai_custom_systems') || '[]'); let s = c.find(x => (x.systemID || x.id) === getSystemID()); if (s?.data) s = { ...s, ...s.data }; if (s) return { analysis: safeParseJSON(s.layoutAnalysis || s.layout_analysis, null), visible: s.layout_analysis_visible != null ? s.layout_analysis_visible : 1 }; } catch {}
    return { analysis: null, visible: 1 };
  }

  async function patchLayoutAnalysis(payload) {
    const sid = getSystemID(); if (!sid) return false;
    try { const r = await fetch(API_BASE + '/' + sid + '/layout-analysis', { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getAuthToken() }, body: JSON.stringify(payload) }); return r.ok; } catch { return false; }
  }

  let currentAnalysis = null, currentVisible = 1, collapsedSections = {};

  function renderScoreBadge(score) {
    const s = typeof score === 'number' ? score : null;
    const cls = s === null ? 'score-na' : s >= 8 ? 'score-high' : s >= 5 ? 'score-medium' : 'score-low';
    return `<div class="safety-score-badge ${cls}"><span class="score-value">${s !== null ? s : '—'}</span><span class="score-label">${s !== null ? '/10' : 'N/A'}</span></div>`;
  }

  function severityBadge(sev) {
    const s = (sev || 'medium').toLowerCase();
    return `<span class="severity-badge severity-${s === 'high' ? 'high' : s === 'low' ? 'low' : 'medium'}">${escHtml(s)}</span>`;
  }

  function renderCard(key, colorCls, icon, title, items, renderItem) {
    const col = collapsedSections[key];
    const hCls = col ? 'guide-card-header collapsed' : 'guide-card-header';
    const bCls = col ? 'guide-card-body collapsed' : 'guide-card-body';
    let body = items.length === 0 ? `<div class="rg-item" style="color:var(--rg-text-muted);font-style:italic;">No data available</div>` : items.map((it, i) => renderItem(it, i)).join('');
    const editBtn = items.length > 0 ? `<button class="edit-btn rg-section-edit" data-section="${key}" title="Edit"><span class="material-symbols-outlined" style="font-size:14px;">edit</span> Edit</button>` : '';
    return `<div class="guide-card ${colorCls}" data-section="${key}"><div class="${hCls}" onclick="window.__rgToggle('${key}')"><h4 class="rg-card-title"><span class="rg-card-icon">${icon}</span>${escHtml(title)}</h4><div style="display:flex;align-items:center;gap:8px;"><span class="rg-card-count">${items.length}</span>${editBtn}<span class="material-symbols-outlined rg-collapse-arrow">expand_more</span></div></div><div class="${bCls}" id="rg-body-${key}">${body}</div></div>`;
  }

  function renderGuide(container) {
    if (document.getElementById(RG_ADMIN_ID)) document.getElementById(RG_ADMIN_ID).remove();
    const w = document.createElement('div'); w.id = RG_ADMIN_ID; w.className = 'ai-rescue-guide-container'; w.style.marginTop = '24px';

    if (!currentAnalysis) {
      w.innerHTML = `<div class="card p-6" style="border:1px solid rgba(255,255,255,0.06);border-radius:16px;"><div class="empty-state-guide"><span class="rg-empty-icon">🗺️</span><div class="rg-empty-title">Map Analysis Processing</div><div class="rg-empty-desc">The map uploaded during system creation will automatically show the analysis here.</div></div></div>`;
      container.appendChild(w); return;
    }

    const a = currentAnalysis;
    const exits = safeArray(a, 'exits'), hrz = safeArray(a, 'highRiskZones'), routes = safeArray(a, 'evacuationRoutes'), equip = safeArray(a, 'equipmentPlacement'), ap = safeArray(a, 'assemblyPoints');
    const recs = safeArray(a, 'recommendations').slice().sort((x, y) => { const o = { high: 0, medium: 1, low: 2 }; return (o[(x.priority || 'medium').toLowerCase()] || 1) - (o[(y.priority || 'medium').toLowerCase()] || 1); });
    const score = typeof a.overallSafetyScore === 'number' ? a.overallSafetyScore : null;
    const summary = a.summary || 'AI analysis completed. Review the sections below.';

    w.innerHTML = `<div class="card p-6" style="border:1px solid rgba(255,255,255,0.06);border-radius:16px;">
      <div class="rescue-guide-header">
          <div style="display:flex;align-items:flex-start;gap:16px;flex:1;min-width:0;max-width:100%;">
            ${renderScoreBadge(score)}
            <div class="rg-title-group" style="flex:1; min-width:0; word-wrap:break-word;">
              <h3 class="rg-title" style="display:flex;align-items:flex-start;gap:8px;line-height:1.3;margin:0 0 6px 0;">
                <span class="material-symbols-outlined" style="color:#ffb3ae;flex-shrink:0;">map</span>
                <span style="flex:1;">AI Map Analysis Rescue Guide</span>
              </h3>
              <p class="rg-summary">${escHtml(summary)}</p>
            </div>
          </div>
        <div class="rg-controls"><div class="rg-admin-controls">
          <button style="padding:6px 12px;border-radius:8px;background:rgba(59,130,246,0.15);border:1px solid rgba(59,130,246,0.3);color:#93c5fd;font-family:var(--rg-font-headline);font-size:11px;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:6px;transition:all 0.2s;" onclick="window.__rgOpenMapPreview()"><span class="material-symbols-outlined" style="font-size:14px;">map</span> View Map</button>
          <div class="visibility-toggle ${currentVisible ? 'active' : ''}" onclick="window.__rgToggleVisibility()" title="Toggle visibility for users"><span class="toggle-label">Show to Users</span><div class="toggle-switch"></div></div>
        </div></div>
      </div>
      <div class="rg-cards-grid" style="${currentVisible ? '' : 'display:none;'}">
        ${renderCard('exits', 'guide-card-green', '🚪', 'Exits', exits, (e, i) => `<div class="rg-item"><span class="rg-item-number">${i + 1}</span><div class="rg-item-text"><div class="rg-item-label">${escHtml(e.type || 'Exit')}</div><div class="rg-item-sublabel">${escHtml(e.location || 'Unknown')}</div></div></div>`)}
        ${renderCard('highRiskZones', 'guide-card-red', '⚠️', 'High Risk Zones', hrz, (z, i) => `<div class="rg-item"><span class="rg-item-number">${i + 1}</span><div class="rg-item-text"><div class="rg-item-label">${escHtml(z.location || 'Unspecified')} ${severityBadge(z.severity)}</div><div class="rg-item-sublabel">${escHtml(z.risk || 'Risk details unavailable')}</div></div></div>`)}
        ${renderCard('evacuationRoutes', 'guide-card-blue', '🏃', 'Evacuation Routes', routes, (r, i) => { const badge = r.priority ? `<span style="color:#93c5fd;font-weight:700;font-size:10px;text-transform:uppercase;">[${escHtml(r.priority)}]</span>` : ''; return `<div class="rg-item"><span class="rg-item-number">${i + 1}</span><div class="rg-item-text"><div class="rg-item-label">${escHtml(r.from || 'Zone ' + (i + 1))} → ${escHtml(r.to || 'Safe exit')} ${badge}</div>${r.notes ? `<div class="rg-item-sublabel">${escHtml(r.notes)}</div>` : ''}</div></div>`; })}
        ${renderCard('equipmentPlacement', 'guide-card-orange', '🧯', 'Equipment Placement', equip, (eq, i) => `<div class="rg-item"><span class="rg-item-number">${i + 1}</span><div class="rg-item-text"><div class="rg-item-label">${escHtml(eq.equipment || eq.name || 'Equipment')}</div><div class="rg-item-sublabel">📍 ${escHtml(eq.location || 'N/A')}${eq.reason || eq.why ? ' — ' + escHtml(eq.reason || eq.why) : ''}</div></div></div>`)}
        ${renderCard('recommendations', 'guide-card-purple', '💡', 'Recommendations', recs, (rec, i) => `<div class="rg-item"><span class="rg-item-number">${i + 1}</span><div class="rg-item-text"><div class="rg-item-label">${severityBadge(rec.priority)} ${escHtml(rec.action || rec.recommendation || 'Review safety')}</div></div></div>`)}
        ${ap.length > 0 ? renderCard('assemblyPoints', 'guide-card-cyan', '🏟️', 'Assembly Points', ap, (p, i) => `<div class="rg-item"><span class="rg-item-number">${i + 1}</span><div class="rg-item-text"><div class="rg-item-label">${escHtml(p.location || p.name || 'Point ' + (i + 1))}</div>${p.description ? `<div class="rg-item-sublabel">${escHtml(p.description)}</div>` : ''}</div></div>`) : ''}
      </div>
    </div>`;

    container.appendChild(w);
    w.querySelectorAll('.rg-section-edit').forEach(btn => btn.addEventListener('click', function(e) { e.stopPropagation(); startEditSection(this.dataset.section); }));
  }

  window.__rgToggle = function(k) { collapsedSections[k] = !collapsedSections[k]; const c = document.querySelector(`.guide-card[data-section="${k}"]`); if (!c) return; c.querySelector('.guide-card-header')?.classList.toggle('collapsed'); c.querySelector('.guide-card-body')?.classList.toggle('collapsed'); };

  window.__rgToggleVisibility = async function() { 
      currentVisible = currentVisible ? 0 : 1; 
      document.querySelector('.visibility-toggle')?.classList.toggle('active', !!currentVisible); 
      const grid = document.querySelector('.rg-cards-grid');
      if (grid) grid.style.display = currentVisible ? '' : 'none';
      const ok = await patchLayoutAnalysis({ layout_analysis_visible: currentVisible }); 
      toast(currentVisible ? 'Guide visible to users' : 'Guide hidden from users', ok ? 'success' : 'warning'); 
  };

  window.__rgOpenMapPreview = async function() {
    const sys = window.systemData;
    let b64 = sys?.layout_image || sys?.structure?.layoutAsset?.base64;
    let mime = sys?.structure?.layoutAsset?.mimeType || 'image/jpeg';
    if (!b64) {
        try {
            const sid = getSystemID() || new URLSearchParams(location.search).get('systemID');
            const resp = await fetch(window.location.origin + '/api/custom-system/' + sid);
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



  function startEditSection(key) {
    if (!currentAnalysis || !currentAnalysis[key]) return;
    const body = document.getElementById('rg-body-' + key); if (!body) return;
    if (body.classList.contains('collapsed')) window.__rgToggle(key);
    const items = currentAnalysis[key];
    body.innerHTML = items.map((it, i) => `<div class="rg-item editing" style="flex-direction:column;"><textarea class="rg-edit-input" data-index="${i}" rows="3" style="width:100%;resize:vertical;">${escHtml(JSON.stringify(it, null, 2))}</textarea></div>`).join('') + `<div class="rg-edit-actions"><button class="rg-save-btn" onclick="window.__rgSaveEdit('${key}')">Save Changes</button><button class="rg-cancel-btn" onclick="window.__rgCancelEdit()">Cancel</button></div>`;
  }

  window.__rgSaveEdit = async function(key) {
    const body = document.getElementById('rg-body-' + key); if (!body) return;
    const tas = body.querySelectorAll('.rg-edit-input'), items = [];
    for (const ta of tas) { try { items.push(JSON.parse(ta.value)); } catch { toast('Invalid JSON at item ' + (parseInt(ta.dataset.index) + 1), 'error'); return; } }
    currentAnalysis[key] = items;
    const ok = await patchLayoutAnalysis({ layout_analysis: JSON.stringify(currentAnalysis) });
    toast(ok ? 'Section updated!' : 'Saved locally', ok ? 'success' : 'warning');
    injectGuide();
  };
  window.__rgCancelEdit = function() { injectGuide(); };

  async function injectGuide() {
    const sec = document.getElementById('section-emergency'); if (!sec) return;
    if (currentAnalysis === null) { const r = await fetchLayoutAnalysis(); if (r) { currentAnalysis = r.analysis; currentVisible = r.visible; } else { currentAnalysis = false; } }
    renderGuide(sec);
  }

  function init() {
    waitForElement('#section-emergency', () => { console.log('[RG-ADMIN] Injecting rescue guide'); injectGuide(); }, 12000);
    document.addEventListener('click', e => { const n = e.target.closest('[onclick*="showSection"]'); if (n) { const m = n.getAttribute('onclick').match(/showSection\(['"](\w+)['"]\)/); if (m && m[1] === 'emergency') setTimeout(injectGuide, 100); } });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
