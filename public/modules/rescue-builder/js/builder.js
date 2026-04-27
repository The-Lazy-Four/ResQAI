// =====================================================
// RESCUE BUILDER - MAIN APPLICATION LOGIC
// =====================================================

// ===== GLOBAL CONFIG =====
const BASE_URL = window.location.origin;
const API_BASE_URL = `${BASE_URL}/api/custom-system`;
const AUTH_TOKEN_KEY = 'auth-token';
const DEBUG = true;  // Comprehensive debug logging
const STORAGE_KEY = 'resqai_custom_systems';  // Production storage key

// ===== DATA STORAGE =====
let systemData = {
    organizationName: "",
    organizationType: "",
    location: "",
    contactEmail: "",
    structure: {
        floors: 0,
        rooms: 0,
        buildings: 0,
        notes: ""
    },
    staff: [],
    riskTypes: [],
    systemID: "",
    layoutAnalysis: null,
    createdAt: new Date().toISOString()
};

// ===== LAYOUT ANALYSIS STATE =====
let layoutImageBase64 = null;
let layoutImageMimeType = null;
let launchContext = {
    directWizard: false,
    returnToOrgSelect: false,
    selectedType: '',
    systemID: ''
};

// ===== UTILITY FUNCTIONS =====

function getAuthToken() {
    return localStorage.getItem(AUTH_TOKEN_KEY) || localStorage.getItem('user-session') || '';
}

function readLaunchContext() {
    const params = new URLSearchParams(window.location.search);
    const selectedType = (params.get('type') || '').trim();
    const entry = (params.get('entry') || '').trim();
    const systemID = (params.get('systemID') || '').trim();

    launchContext = {
        directWizard: entry === 'wizard' && Boolean(selectedType),
        returnToOrgSelect: entry === 'wizard',
        selectedType,
        systemID
    };
}

function getAPIHeaders() {
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`
    };
}

function getMockAlerts() {
    return [
        {
            severity: 'critical',
            message: '⚠️ [DEMO] Fire Alert',
            created_at: new Date().toISOString()
        },
        {
            severity: 'warning',
            message: '⚠️ [DEMO] Medical Emergency',
            created_at: new Date(Date.now() - 300000).toISOString()
        }
    ];
}

function getMockActivity() {
    return [
        {
            action: '⚠️ [DEMO] SOS Triggered',
            details: 'This is demonstration data - Emergency signal received',
            created_at: new Date().toISOString()
        },
        {
            action: '⚠️ [DEMO] Alert Broadcast',
            details: 'This is demonstration data - Staff notification sent',
            created_at: new Date(Date.now() - 300000).toISOString()
        }
    ];
}

function escapeHtml(value) {
    return String(value == null ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function getAnalysisCollection(analysis, key) {
    return analysis && Array.isArray(analysis[key]) ? analysis[key] : [];
}

function getLayoutAsset(structure) {
    const source = structure || systemData.structure;
    if (!source || !source.layoutAsset || !source.layoutAsset.base64 || !source.layoutAsset.mimeType) {
        return null;
    }

    return source.layoutAsset;
}

function getCacheSafeStructure(structure) {
    const source = structure && typeof structure === 'object' ? structure : {};
    const safeStructure = JSON.parse(JSON.stringify(source));

    if (safeStructure.layoutAsset && safeStructure.layoutAsset.base64) {
        safeStructure.layoutAsset = {
            mimeType: safeStructure.layoutAsset.mimeType || '',
            fileName: safeStructure.layoutAsset.fileName || '',
            savedToBackend: true
        };
    }

    return safeStructure;
}

function syncLayoutAssetFromStructure(structure) {
    const asset = getLayoutAsset(structure);
    layoutImageBase64 = asset ? asset.base64 : null;
    layoutImageMimeType = asset ? asset.mimeType : null;
}

function getCurrentLayoutDataUrl() {
    const asset = getLayoutAsset();

    if (asset) {
        return `data:${asset.mimeType};base64,${asset.base64}`;
    }

    if (layoutImageBase64 && layoutImageMimeType) {
        return `data:${layoutImageMimeType};base64,${layoutImageBase64}`;
    }

    return null;
}

function updateCachedSystemRecord() {
    try {
        const systems = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        let updated = false;

        systems.forEach(system => {
            const storedID = system.systemID || system.id;
            if (storedID !== systemData.systemID) return;

            if (!system.data || typeof system.data !== 'object') {
                system.data = {};
            }

            system.systemID = storedID;
            system.name = systemData.organizationName || system.name;
            system.type = systemData.organizationType || system.type;
            system.location = systemData.location || system.location;
            system.contactEmail = systemData.contactEmail || system.contactEmail;
            system.status = systemData.status || system.status || 'active';
            system.lastUpdated = new Date().toISOString();
            system.layoutAnalysis = systemData.layoutAnalysis || null;

            system.data.organizationName = systemData.organizationName;
            system.data.organizationType = systemData.organizationType;
            system.data.location = systemData.location;
            system.data.contactEmail = systemData.contactEmail;
            system.data.structure = getCacheSafeStructure(systemData.structure);
            system.data.staff = systemData.staff;
            system.data.riskTypes = systemData.riskTypes;
            system.data.template = systemData.template;
            system.data.layoutAnalysis = systemData.layoutAnalysis || null;

            updated = true;
        });

        if (updated) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(systems));
        }

        return updated;
    } catch (error) {
        console.warn('[CACHE] Failed to update local system cache:', error.message);
        return false;
    }
}

async function persistLayoutAnalysis() {
    updateCachedSystemRecord();

    if (!systemData.systemID || !getAuthToken()) {
        return false;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/${systemData.systemID}`, {
            method: 'PATCH',
            headers: getAPIHeaders(),
            body: JSON.stringify({
                organizationName: systemData.organizationName,
                organizationType: systemData.organizationType,
                location: systemData.location,
                contactEmail: systemData.contactEmail,
                structure: systemData.structure,
                staff: systemData.staff,
                riskTypes: systemData.riskTypes,
                status: systemData.status || 'active',
                layoutAnalysis: systemData.layoutAnalysis
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        return true;
    } catch (error) {
        console.warn('[LAYOUT-AI] Failed to persist layout analysis:', error.message);
        return false;
    }
}

// ===== UI HELPER FUNCTIONS =====

function showScreen(screenId) {
    document.querySelectorAll('.rescue-screen').forEach(screen => {
        screen.classList.remove('active');
    });
    const target = document.getElementById(screenId);
    if (target) {
        target.classList.add('active');
        window.scrollTo(0, 0);
    }
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.getElementById('toast-wrap').appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function getAdminAIGuidanceCard() {
    const cards = Array.from(document.querySelectorAll('#screen-admin-dashboard .admin-card.ai-card'));
    return cards.find(function (card) {
        const heading = card.querySelector('h3');
        return heading && heading.textContent.indexOf('AI Guidance Engine') !== -1;
    }) || cards[cards.length - 1] || null;
}

function getCurrentMapStage() {
    const userScreen = document.getElementById('screen-user-panel');
    if (userScreen && userScreen.classList.contains('active')) {
        return document.getElementById('user-map-stage');
    }

    const adminScreen = document.getElementById('screen-admin-dashboard');
    if (adminScreen && adminScreen.classList.contains('active')) {
        return document.getElementById('admin-map-stage');
    }

    return document.getElementById('admin-map-stage') || document.getElementById('user-map-stage');
}

function getUserGuidanceCard() {
    return document.querySelector('#screen-user-panel .user-card.guidance-section');
}

// ===== SYSTEM TYPE THEMING =====

const SYSTEM_THEMES = {
    school: { color: '#3b82f6', label: 'School', emoji: '🎓' },
    hospital: { color: '#10b981', label: 'Hospital', emoji: '🏥' },
    restaurant: { color: '#f97316', label: 'Restaurant', emoji: '🍽️' },
    hostel: { color: '#a855f7', label: 'Hotel / Resort', emoji: '🏨' },
    custom: { color: '#6366f1', label: 'Custom', emoji: '⚙️' },
    other: { color: '#06b6d4', label: 'Organization', emoji: '🏢' }
};

function getThemeByType(type) {
    return SYSTEM_THEMES[type] || SYSTEM_THEMES.custom;
}

// ===== SYSTEM STATUS HELPERS =====

const SYSTEM_STATUS = {
    active: { emoji: '🟢', label: 'Active', color: '#10b981' },
    monitoring: { emoji: '🟡', label: 'Monitoring', color: '#f59e0b' },
    emergency: { emoji: '🔴', label: 'Emergency', color: '#ef4444' }
};

function getSystemStatus(system) {
    if (system.status === 'emergency') return SYSTEM_STATUS.emergency;
    if (system.alertsCount > 0) return SYSTEM_STATUS.monitoring;
    return SYSTEM_STATUS.active;
}

// ===== INITIALIZE SYSTEM WITH DEFAULTS =====


// ===== AI SYSTEM SUMMARY =====

async function addAISummarySection(system, theme) {
    const summaryContainer = document.getElementById('ai-summary');
    if (!summaryContainer) return;

    // Show loading state
    summaryContainer.innerHTML = `
        <div style="padding: 16px; background: ${theme.color}11; border-left: 3px solid ${theme.color}; border-radius: 6px;">
            <div style="color: ${theme.color}; font-weight: 600; margin-bottom: 8px;">🧠 AI System Insight</div>
            <div style="color: #888; font-size: 12px;">⏳ Analyzing system readiness...</div>
        </div>
    `;

    try {
        console.log('[AI-SUMMARY] Generating summary for:', system.organizationName, system.organizationType);

        const response = await fetch(`${BASE_URL}/api/ai/generate-summary`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getAuthToken()}`
            },
            body: JSON.stringify({
                organizationType: system.organizationType,
                location: system.location,
                staffCount: (system.staff && system.staff.length) || 0,
                riskTypes: system.riskTypes || []
            }),
            timeout: 5000
        });

        if (response.ok) {
            const data = await response.json();
            const insight = data.insight || getDefaultInsight(system.organizationType);

            summaryContainer.innerHTML = `
                <div style="padding: 16px; background: ${theme.color}11; border-left: 3px solid ${theme.color}; border-radius: 6px;">
                    <div style="color: ${theme.color}; font-weight: 600; margin-bottom: 8px;">🧠 AI System Insight</div>
                    <div style="color: #ccc; font-size: 13px; line-height: 1.5;">${insight}</div>
                </div>
            `;
            console.log('[AI-SUMMARY] ✅ Summary generated');
        } else {
            throw new Error('API response not ok');
        }
    } catch (error) {
        console.warn('[AI-SUMMARY] ⚠️ API failed:', error.message);
        const insight = getDefaultInsight(system.organizationType);

        summaryContainer.innerHTML = `
            <div style="padding: 16px; background: ${theme.color}11; border-left: 3px solid ${theme.color}; border-radius: 6px;">
                <div style="color: ${theme.color}; font-weight: 600; margin-bottom: 8px;">🧠 System Insight</div>
                <div style="color: #ccc; font-size: 13px; line-height: 1.5;">${insight}</div>
            </div>
        `;
    }
}

function getDefaultInsight(type) {
    const insights = {
        school: '📚 Schools require comprehensive evacuation procedures and safe spaces. Focus on ensuring all staff are trained in emergency protocols and communication systems are in place.',
        hospital: '🏥 Healthcare facilities need rapid response coordination. Ensure emergency protocols cover patient safety, staff coordination, and resource management.',
        restaurant: '🍽️ Food service venues require crowd management and rapid evacuation procedures. Train staff on emergency exits and communication with emergency services.',
        hostel: '🏨 Hotel and resort facilities need guest management and evacuation procedures. Maintain updated guest information and clear emergency routes.',
        custom: '⚙️ Review emergency procedures specific to your organization type. Ensure all staff are trained and communication channels are tested regularly.',
        other: '🏢 Develop comprehensive emergency response plans specific to your organization. Regular drills and staff training are essential.'
    };
    return insights[type] || insights.other;
}

// ===== SMART ACTION BUTTONS =====

function addSmartActionButtons(system, theme) {
    const actionsContainer = document.getElementById('smart-actions');
    if (!actionsContainer) return;

    actionsContainer.innerHTML = `
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-top: 16px;">
            <button onclick="activateEmergencyMode()" style="padding: 12px; background: #ef444466; border: 1px solid #ef4444; color: #ff6b6b; border-radius: 6px; cursor: pointer; font-weight: 600;">
                🚨 Trigger Emergency
            </button>
            <button onclick="sendAlert()" style="padding: 12px; background: #f97316aa; border: 1px solid #f97316; color: #ffb84d; border-radius: 6px; cursor: pointer; font-weight: 600;">
                📡 Send Alert
            </button>
            <button onclick="getAIGuidance()" style="padding: 12px; background: ${theme.color}66; border: 1px solid ${theme.color}; color: #fff; border-radius: 6px; cursor: pointer; font-weight: 600;">
                🧠 AI Guidance
            </button>
        </div>
    `;
}

// ===== MAP ANALYSIS RESCUE GUIDE =====

function renderGuideRows(items, formatter, emptyText) {
    if (!items.length) {
        return `<div style="color:#888;font-size:12px;line-height:1.6;">${escapeHtml(emptyText)}</div>`;
    }

    return items.map(function (item, index) {
        return `<div style="padding:10px 12px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:10px;color:#d4d4d8;font-size:12px;line-height:1.6;">${formatter(item, index)}</div>`;
    }).join('');
}

function renderGuidePanel(title, color, items, formatter, emptyText) {
    return `
        <div style="background:${color}12;border:1px solid ${color}33;border-radius:14px;padding:16px;">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:12px;">
                <h4 style="color:${color};font-size:14px;margin:0;">${escapeHtml(title)}</h4>
                <span style="color:${color};font-size:11px;font-weight:700;background:${color}22;border:1px solid ${color}33;padding:4px 8px;border-radius:999px;">${items.length}</span>
            </div>
            <div style="display:grid;gap:10px;">
                ${renderGuideRows(items, formatter, emptyText)}
            </div>
        </div>
    `;
}

function getAdminRouteLabel(route, index) {
    const from = route && route.from ? escapeHtml(route.from) : `Zone ${index + 1}`;
    const to = route && route.to ? escapeHtml(route.to) : 'safe exit';
    const notes = route && route.notes ? ` <span style="color:#94a3b8;">(${escapeHtml(route.notes)})</span>` : '';
    return `${from} -> ${to}${notes}`;
}

function getRecommendationLabel(rec) {
    const priority = rec && rec.priority ? escapeHtml(rec.priority).toUpperCase() : 'MEDIUM';
    const action = rec && rec.action ? escapeHtml(rec.action) : 'Review map safety setup';
    return `<span style="color:#c4b5fd;font-weight:700;">[${priority}]</span> ${action}`;
}

function getUserEvacuationSteps(analysis, template) {
    const steps = [];
    const routes = getAnalysisCollection(analysis, 'evacuationRoutes');
    const exits = getAnalysisCollection(analysis, 'exits');
    const assemblyPoints = getAnalysisCollection(analysis, 'assemblyPoints');

    routes.forEach(function (route, index) {
        const from = route && route.from ? String(route.from) : `your area ${index + 1}`;
        const to = route && route.to ? String(route.to) : 'the nearest safe exit';
        steps.push(`Move from ${from} to ${to}.`);
    });

    if (!steps.length && exits.length) {
        steps.push(`Use the nearest marked exit: ${String(exits[0].location || exits[0].type || 'Main exit')}.`);
    }

    if (!steps.length && template && Array.isArray(template.evacuationSteps)) {
        template.evacuationSteps.forEach(function (step) {
            if (steps.length < 4 && step) {
                steps.push(String(step));
            }
        });
    }

    if (assemblyPoints.length) {
        steps.push(`After exiting, continue to ${String(assemblyPoints[0].location || 'the designated assembly point')}.`);
    }

    if (!steps.length) {
        steps.push('Follow staff instructions and the posted evacuation signs.');
    }

    return steps.slice(0, 5);
}

function closeMapPreviewPanel() {
    ['admin-map-stage', 'user-map-stage'].forEach(function (id) {
        const stage = document.getElementById(id);
        if (!stage) return;
        stage.innerHTML = '';
        stage.style.display = 'none';
    });
}

function openMapPreview() {
    const dataUrl = getCurrentLayoutDataUrl();
    const asset = getLayoutAsset();
    const mimeType = asset ? asset.mimeType : layoutImageMimeType;
    const stage = getCurrentMapStage();

    if (!stage) {
        showToast('Map preview area is unavailable on this screen.', 'warning');
        return;
    }

    if (!dataUrl || !mimeType) {
        showToast('Saved map file is not available for this system yet.', 'warning');
        return;
    }

    const mapBody = mimeType === 'application/pdf'
        ? `<iframe src="${dataUrl}" title="Saved Floor Map" style="width:100%;height:72vh;border:none;border-radius:18px;background:#0b1220;"></iframe>`
        : `<img src="${dataUrl}" alt="Saved Floor Map" style="width:100%;max-height:72vh;border-radius:18px;border:1px solid rgba(255,255,255,0.08);object-fit:contain;background:#0b1220;" />`;

    stage.innerHTML = `
        <div style="background:rgba(15,23,42,0.96);border:1px solid rgba(148,163,184,0.18);border-radius:24px;overflow:hidden;box-shadow:0 24px 80px rgba(0,0,0,0.35);">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:16px;padding:20px 24px;border-bottom:1px solid rgba(148,163,184,0.12);background:linear-gradient(180deg, rgba(15,23,42,0.98) 0%, rgba(15,23,42,0.9) 100%);">
                <div>
                    <div style="color:#f8fafc;font-size:26px;font-weight:800;">Saved Structure Map</div>
                    <div style="color:#94a3b8;font-size:13px;margin-top:6px;">${escapeHtml((asset && asset.fileName) || 'Uploaded floor map')}</div>
                </div>
                <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:flex-end;">
                    <button onclick="requestMapAIGuidance()" style="padding:10px 14px;background:rgba(59,130,246,0.14);border:1px solid rgba(59,130,246,0.35);color:#93c5fd;border-radius:10px;cursor:pointer;font-weight:700;">Get AI Instructions</button>
                    <button onclick="closeMapPreviewPanel()" style="padding:10px 14px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.12);color:#e5e7eb;border-radius:10px;cursor:pointer;font-weight:700;">Hide Map</button>
                </div>
            </div>
            <div style="padding:24px;background:linear-gradient(180deg, rgba(15,23,42,0.98) 0%, rgba(2,6,23,0.98) 100%);">
                ${mapBody}
                <div id="layout-map-guidance-output" style="margin-top:18px;display:none;padding:16px;border-radius:14px;background:rgba(59,130,246,0.1);border:1px solid rgba(59,130,246,0.22);color:#dbeafe;font-size:13px;line-height:1.7;"></div>
            </div>
        </div>
    `;

    stage.style.display = 'block';
    stage.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function fetchGuidanceText(type, structureOverride) {
    const response = await fetch(API_BASE_URL + '/generate-guidance', {
        method: 'POST',
        headers: getAPIHeaders(),
        body: JSON.stringify({
            type: type,
            organizationType: systemData.organizationType,
            structure: structureOverride || systemData.structure,
            staff: systemData.staff,
            staffCount: systemData.staff?.length || 0
        })
    });

    if (!response.ok) {
        throw new Error(`API ${response.status}`);
    }

    const data = await response.json();
    return data.guidance || data.steps || getEvacuationGuidance('fire');
}

async function requestMapAIGuidance() {
    if (!systemData.layoutAnalysis) {
        showToast('No map analysis available for AI instructions.', 'warning');
        return;
    }

    let output = document.getElementById('layout-map-guidance-output');
    if (!output) {
        openMapPreview();
        output = document.getElementById('layout-map-guidance-output');
    }

    if (output) {
        output.style.display = 'block';
        output.innerHTML = '<div style="color:#93c5fd;font-weight:700;margin-bottom:8px;">AI is reading the saved map analysis...</div><div style="color:#bfdbfe;">Preparing route-specific instructions.</div>';
    }

    try {
        const guidance = await fetchGuidanceText('map-analysis', {
            ...systemData.structure,
            layoutAnalysis: systemData.layoutAnalysis,
            mapSummary: systemData.layoutAnalysis.summary || '',
            requestedFocus: 'Use the analyzed map to explain exits, evacuation flow, and responder actions.'
        });

        if (output) {
            output.innerHTML = `<div style="color:#93c5fd;font-weight:700;margin-bottom:8px;">AI Map Instructions</div><div>${escapeHtml(guidance)}</div>`;
        }

        const aiCard = getAdminAIGuidanceCard();
        if (aiCard) {
            aiCard.innerHTML = `
                <h3>AI Guidance Engine</h3>
                <div class="ai-status">
                    <div class="ai-indicator">ðŸŸ¢ Map Analysis Active</div>
                    <p><strong>Map-based Recommendation:</strong></p>
                    <p>${escapeHtml(guidance)}</p>
                    <button class="btn-secondary" onclick="requestMapAIGuidance()">Get AI Instructions</button>
                </div>
            `;
        }

        const userGuidanceCard = getUserGuidanceCard();
        if (userGuidanceCard) {
            userGuidanceCard.innerHTML = `
                <h3>AI Safety Guide</h3>
                <div class="guidance-container" id="user-guidance">
                    <p style="color:#86efac;font-weight:700;">Map-based Recommendation</p>
                    <p>${escapeHtml(guidance)}</p>
                    <button class="btn-secondary" onclick="requestMapAIGuidance()">Get AI Instructions</button>
                </div>
            `;
        }

        showToast('AI map instructions ready', 'success');
    } catch (error) {
        console.warn('[AI-MAP] Using fallback guidance:', error.message);
        const fallback = getEvacuationGuidance('fire');

        if (output) {
            output.innerHTML = `<div style="color:#fbbf24;font-weight:700;margin-bottom:8px;">Template Guidance</div><div>${escapeHtml(fallback)}</div>`;
        }

        const userGuidanceCard = getUserGuidanceCard();
        if (userGuidanceCard) {
            userGuidanceCard.innerHTML = `
                <h3>AI Safety Guide</h3>
                <div class="guidance-container" id="user-guidance">
                    <p style="color:#fbbf24;font-weight:700;">Template Guidance</p>
                    <p>${escapeHtml(fallback)}</p>
                    <button class="btn-secondary" onclick="requestMapAIGuidance()">Get AI Instructions</button>
                </div>
            `;
        }

        showToast('Using template instructions for the map guide', 'warning');
    }
}

async function reAnalyzeMapGuide() {
    if (!layoutImageBase64 || !layoutImageMimeType) {
        showToast('Original floor plan is not loaded in this session. Existing analysis is still available.', 'warning');
        return;
    }

    await analyzeLayout();
    await persistLayoutAnalysis();
    populateAdminDashboard();

    if (document.getElementById('screen-user-panel') && document.getElementById('screen-user-panel').classList.contains('active')) {
        populateUserPanel();
    }
}

function addLayoutSafetyReport(system, theme) {
    const grid = document.querySelector('.admin-grid');
    if (!grid) return;

    const existing = document.getElementById('layout-safety-report');
    if (existing) existing.remove();

    const analysis = system.layoutAnalysis;
    const exits = getAnalysisCollection(analysis, 'exits');
    const highRiskZones = getAnalysisCollection(analysis, 'highRiskZones');
    const evacuationRoutes = getAnalysisCollection(analysis, 'evacuationRoutes');
    const equipmentPlacement = getAnalysisCollection(analysis, 'equipmentPlacement');
    const recommendations = getAnalysisCollection(analysis, 'recommendations');
    const score = analysis && typeof analysis.overallSafetyScore === 'number' ? analysis.overallSafetyScore : null;
    const scoreClr = score === null ? '#64748b' : score >= 7 ? '#22c55e' : score >= 4 ? '#f59e0b' : '#ef4444';
    const summary = analysis && analysis.summary
        ? escapeHtml(analysis.summary)
        : 'No map analysis available';
    const hasMapAsset = !!getCurrentLayoutDataUrl();
    const viewMapButtonStyle = hasMapAsset
        ? 'padding:10px 14px;background:rgba(59,130,246,0.14);border:1px solid rgba(59,130,246,0.35);color:#93c5fd;border-radius:10px;cursor:pointer;font-weight:700;'
        : 'padding:10px 14px;background:rgba(100,116,139,0.12);border:1px solid rgba(100,116,139,0.24);color:#64748b;border-radius:10px;cursor:not-allowed;font-weight:700;';

    const card = document.createElement('div');
    card.className = 'admin-card';
    card.id = 'layout-safety-report';
    card.style.gridColumn = '1 / -1';

    let content = `
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;margin-bottom:16px;">
            <div>
                <h3 style="margin:0 0 8px 0;">AI Map Analysis Rescue Guide</h3>
                <p style="color:#9ca3af;font-size:13px;line-height:1.6;max-width:760px;">${summary}</p>
            </div>
            <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
                <div style="background:${scoreClr}22;color:${scoreClr};border:1px solid ${scoreClr}55;padding:8px 14px;border-radius:999px;font-size:13px;font-weight:700;">
                    ${score === null ? 'Safety Score N/A' : `Safety Score ${score}/10`}
                </div>
                <button onclick="openMapPreview()" ${hasMapAsset ? '' : 'disabled'} style="${viewMapButtonStyle}">
                    View Map
                </button>
                <button onclick="requestMapAIGuidance()" style="padding:10px 14px;background:rgba(34,197,94,0.14);border:1px solid rgba(34,197,94,0.35);color:#86efac;border-radius:10px;cursor:pointer;font-weight:700;">
                    Get AI Instructions
                </button>
                <button onclick="reAnalyzeMapGuide()" style="padding:10px 14px;background:${theme.color}18;border:1px solid ${theme.color}55;color:${theme.color};border-radius:10px;cursor:pointer;font-weight:700;">
                    Re-analyze Map
                </button>
            </div>
        </div>
    `;

    if (!analysis) {
        content += `
            <div style="padding:16px;border-radius:12px;background:rgba(255,255,255,0.03);border:1px dashed rgba(255,255,255,0.14);color:#a1a1aa;font-size:13px;">
                No map analysis available
            </div>
        `;
    } else {
        content += `
            <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(220px, 1fr));gap:16px;">
                ${renderGuidePanel('Exits', '#22c55e', exits, function (exit) {
            const type = exit && exit.type ? `${escapeHtml(exit.type)} - ` : '';
            const location = exit && exit.location ? escapeHtml(exit.location) : 'Exit location unavailable';
            return `${type}${location}`;
        }, 'No exits identified')}
                ${renderGuidePanel('High-Risk Zones', '#f59e0b', highRiskZones, function (zone) {
            const location = zone && zone.location ? escapeHtml(zone.location) : 'Unspecified area';
            const risk = zone && zone.risk ? escapeHtml(zone.risk) : 'Risk details unavailable';
            return `${location} - ${risk}`;
        }, 'No high-risk zones identified')}
                ${renderGuidePanel('Evacuation Routes', '#3b82f6', evacuationRoutes, function (route, index) {
            return getAdminRouteLabel(route, index);
        }, 'No evacuation routes available')}
                ${renderGuidePanel('Equipment Placement', '#06b6d4', equipmentPlacement, function (equipment) {
            const name = equipment && equipment.equipment ? escapeHtml(equipment.equipment) : 'Equipment';
            const location = equipment && equipment.location ? escapeHtml(equipment.location) : 'Location unavailable';
            return `${name} - ${location}`;
        }, 'No equipment placement notes')}
                ${renderGuidePanel('Recommendations', '#8b5cf6', recommendations, function (rec) {
            return getRecommendationLabel(rec);
        }, 'No recommendations available')}
            </div>
        `;
    }

    card.innerHTML = content;

    const aiSummary = document.getElementById('ai-summary');
    if (aiSummary && aiSummary.nextSibling) {
        grid.insertBefore(card, aiSummary.nextSibling);
    } else {
        grid.appendChild(card);
    }
}

function addUserLayoutSafetyGuide(system) {
    const grid = document.querySelector('.user-grid');
    if (!grid) return;

    const existing = document.getElementById('user-map-analysis-guide');
    if (existing) existing.remove();

    const analysis = system.layoutAnalysis;
    const exits = getAnalysisCollection(analysis, 'exits');
    const highRiskZones = getAnalysisCollection(analysis, 'highRiskZones');
    const evacuationRoutes = getAnalysisCollection(analysis, 'evacuationRoutes');
    const equipmentPlacement = getAnalysisCollection(analysis, 'equipmentPlacement');
    const recommendations = getAnalysisCollection(analysis, 'recommendations');
    const assemblyPoints = getAnalysisCollection(analysis, 'assemblyPoints');
    const score = analysis && typeof analysis.overallSafetyScore === 'number' ? analysis.overallSafetyScore : null;
    const scoreClr = score === null ? '#64748b' : score >= 7 ? '#22c55e' : score >= 4 ? '#f59e0b' : '#ef4444';
    const hasMapAsset = !!getCurrentLayoutDataUrl();
    const summary = analysis && analysis.summary
        ? escapeHtml(analysis.summary)
        : 'No map analysis available';
    const card = document.createElement('div');

    card.className = 'user-card';
    card.id = 'user-map-analysis-guide';
    card.style.gridColumn = '1 / -1';

    card.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;margin-bottom:16px;">
            <div>
                <h3 style="margin:0 0 8px 0;">AI Map Analysis Rescue Guide</h3>
                <p style="color:#9ca3af;font-size:13px;line-height:1.6;">${summary}</p>
            </div>
            <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
                <div style="background:${scoreClr}22;color:${scoreClr};border:1px solid ${scoreClr}55;padding:8px 14px;border-radius:999px;font-size:13px;font-weight:700;">
                    ${score === null ? 'Safety Score N/A' : `Safety Score ${score}/10`}
                </div>
                <button onclick="openMapPreview()" ${hasMapAsset ? '' : 'disabled'} style="${hasMapAsset ? 'padding:10px 14px;background:rgba(59,130,246,0.14);border:1px solid rgba(59,130,246,0.35);color:#93c5fd;border-radius:10px;cursor:pointer;font-weight:700;' : 'padding:10px 14px;background:rgba(100,116,139,0.12);border:1px solid rgba(100,116,139,0.24);color:#64748b;border-radius:10px;cursor:not-allowed;font-weight:700;'}">
                    View Map
                </button>
                <button onclick="requestMapAIGuidance()" style="padding:10px 14px;background:rgba(34,197,94,0.14);border:1px solid rgba(34,197,94,0.35);color:#86efac;border-radius:10px;cursor:pointer;font-weight:700;">
                    Get AI Instructions
                </button>
                <div style="padding:8px 12px;border-radius:999px;background:rgba(59,130,246,0.12);border:1px solid rgba(59,130,246,0.32);color:#93c5fd;font-size:12px;font-weight:700;">
                    Read only
                </div>
            </div>
        </div>
        ${analysis ? `
            <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(220px, 1fr));gap:16px;">
                ${renderGuidePanel('Exits', '#22c55e', exits, function (exit) {
        const type = exit && exit.type ? `${escapeHtml(exit.type)} - ` : '';
        const location = exit && exit.location ? escapeHtml(exit.location) : 'Exit location unavailable';
        return `${type}${location}`;
    }, 'No exits available')}
                ${renderGuidePanel('High-Risk Zones', '#f59e0b', highRiskZones, function (zone) {
        const location = zone && zone.location ? escapeHtml(zone.location) : 'Unspecified area';
        const risk = zone && zone.risk ? escapeHtml(zone.risk) : 'Risk details unavailable';
        return `${location} - ${risk}`;
    }, 'No high-risk zones available')}
                ${renderGuidePanel('Evacuation Routes', '#3b82f6', evacuationRoutes, function (route, index) {
        return getAdminRouteLabel(route, index);
    }, 'No evacuation routes available')}
                ${renderGuidePanel('Equipment Placement', '#06b6d4', equipmentPlacement, function (equipment) {
        const name = equipment && equipment.equipment ? escapeHtml(equipment.equipment) : 'Equipment';
        const location = equipment && equipment.location ? escapeHtml(equipment.location) : 'Location unavailable';
        return `${name} - ${location}`;
    }, 'No equipment placement notes')}
                ${renderGuidePanel('Recommendations', '#8b5cf6', recommendations, function (rec) {
        return getRecommendationLabel(rec);
    }, 'No recommendations available')}
                ${renderGuidePanel('Assembly Points', '#a855f7', assemblyPoints, function (point) {
        return escapeHtml(point.location || point.notes || 'Assembly point not specified');
    }, 'No assembly points available')}
            </div>
            <div style="margin-top:16px;padding:14px 16px;border-radius:14px;background:rgba(59,130,246,0.08);border:1px solid rgba(59,130,246,0.18);color:#bfdbfe;font-size:13px;line-height:1.7;">
                This map analysis is read-only for users and comes from the map uploaded during structure setup.
            </div>
        ` : `
            <div style="padding:16px;border-radius:12px;background:rgba(255,255,255,0.03);border:1px dashed rgba(255,255,255,0.14);color:#a1a1aa;font-size:13px;">
                No map analysis available
            </div>
        `}
    `;

    const guidanceCard = document.querySelector('.user-card.guidance-section');
    if (guidanceCard) {
        grid.insertBefore(card, guidanceCard);
    } else {
        grid.appendChild(card);
    }
}

async function activateEmergencyMode() {
    const emergencyType = prompt('Enter emergency type (e.g., fire, medical, flood, intruder):') || 'general';
    if (!emergencyType.trim()) return;
    showToast('🚨 Activating emergency mode...', 'error');
    try {
        const resp = await fetch(`${BASE_URL}/api/custom-system/log-emergency`, {
            method: 'POST', headers: getAPIHeaders(),
            body: JSON.stringify({ systemID: systemData.systemID, emergencyType: emergencyType.trim(), location: systemData.location, timestamp: new Date().toISOString() })
        });
        if (resp.ok) {
            const data = await resp.json();
            showToast(`🚨 EMERGENCY ACTIVATED: ${emergencyType.toUpperCase()} - Event ID: ${data.eventID}`, 'error');
            // Update local cache status
            const systems = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
            const sys = systems.find(s => (s.systemID || s.id) === systemData.systemID);
            if (sys) { sys.status = 'emergency'; sys.alertsCount = (sys.alertsCount || 0) + 1; sys.lastUpdated = new Date().toISOString(); localStorage.setItem(STORAGE_KEY, JSON.stringify(systems)); }
            // Reload SOS events
            setTimeout(() => loadAdminSOSAlerts(), 500);
        } else { showToast('🚨 Emergency logged locally', 'error'); }
    } catch (err) {
        showToast('🚨 Emergency mode activated (offline)', 'error');
        console.warn('Emergency API error:', err.message);
    }
}

async function sendAlert() {
    const message = prompt('Enter alert message to broadcast to all staff:');
    if (!message || !message.trim()) return;
    showToast('📡 Broadcasting alert...', 'info');
    try {
        const resp = await fetch(`${BASE_URL}/api/custom-system/broadcast-alert`, {
            method: 'POST', headers: getAPIHeaders(),
            body: JSON.stringify({ systemID: systemData.systemID, message: message.trim(), severity: 'warning' })
        });
        if (resp.ok) { showToast('📡 Alert broadcast to all staff!', 'success'); }
        else { showToast('📡 Alert queued locally', 'success'); }
    } catch (err) { showToast('📡 Alert sent (offline mode)', 'success'); console.warn(err.message); }
}

async function getAIGuidance() {
    showToast('🧠 Getting AI guidance...', 'info');
    try {
        const resp = await fetch(`${BASE_URL}/api/custom-system/generate-guidance`, {
            method: 'POST', headers: getAPIHeaders(),
            body: JSON.stringify({ type: 'general', organizationType: systemData.organizationType || 'organization', structure: systemData.structure, staff: systemData.staff })
        });
        if (resp.ok) {
            const data = await resp.json();
            alert(`🧠 AI Emergency Guidance:\n\n${data.guidance}`);
            showToast('✅ AI guidance generated', 'success');
        }
    } catch (err) { showToast('AI guidance temporarily unavailable', 'warning'); }
}

// ===== SYSTEMS MANAGEMENT =====

// Load user's systems from backend
async function loadUserSystems() {
    if (DEBUG) console.group('🔍 [LOAD] Systems');

    try {
        const token = getAuthToken();

        // TRY API WITH TIMEOUT
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);

            const response = await fetch(API_BASE_URL + '/user/list', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (response.ok) {
                const data = await response.json();
                const apiSystems = data.systems || [];

                if (DEBUG) console.log('✅ API returned:', apiSystems.length, 'systems');

                // IF API RETURNED SYSTEMS, USE THEM
                if (apiSystems.length > 0) {
                    // Map snake_case to camelCase
                    const mapped = apiSystems.map(s => ({
                        systemID: s.id || s.systemID,
                        organizationName: s.organization_name || s.organizationName,
                        organizationType: s.organization_type || s.organizationType,
                        location: s.location,
                        contactEmail: s.contact_email || s.contactEmail,
                        status: s.status || 'saved',
                        createdAt: s.created_at || s.createdAt
                    }));

                    if (DEBUG) console.log('After mapping:', mapped.length, 'systems');
                    if (DEBUG) console.groupEnd();

                    renderSystemsDashboard(mapped);
                    return;
                } else {
                    // API returned 0 systems - fall through to localStorage check
                    throw new Error('API returned 0 systems - checking localStorage');
                }
            } else {
                throw new Error(`API ${response.status}`);
            }
        } catch (apiErr) {
            if (DEBUG) console.warn('⚠️ API failed:', apiErr.message);
        }

    } catch (error) {
        if (DEBUG) console.error('Error:', error.message);
    }

    // FALLBACK: Load from localStorage
    if (DEBUG) console.log('📦 Using localStorage fallback');

    let systems = [];
    try {
        const stored = localStorage.getItem(STORAGE_KEY);

        if (stored) {
            systems = JSON.parse(stored);
            if (DEBUG) console.log('✅ Parsed localStorage:', systems.length, 'systems');
        } else if (DEBUG) {
            console.log('localStorage is empty');
        }
    } catch (e) {
        if (DEBUG) console.error('❌ Corrupted localStorage:', e.message);
        systems = [];
    }

    if (DEBUG) console.groupEnd();

    renderSystemsDashboard(systems || []);
}

// DEBUG: Check what's actually in localStorage and display on page
function debugLocalStorage() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        console.log('=== LOCAL STORAGE DEBUG ===');
        console.log('Raw localStorage value:', stored);

        let debugHtml = '';

        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                debugHtml += `<div style="margin-bottom: 10px;">✅ localStorage parsed successfully</div>`;
                debugHtml += `<div style="margin-bottom: 10px;">📦 Count: ${Array.isArray(parsed) ? parsed.length : 'ERROR - NOT AN ARRAY'}</div>`;
                debugHtml += `<div style="margin-bottom: 10px;">📋 Data:</div>`;
                debugHtml += `<pre style="background: #0a0a14; padding: 10px; border-radius: 4px; overflow-x: auto; max-height: 300px;">${JSON.stringify(parsed, null, 2)}</pre>`;
                console.log('Parsed count:', Array.isArray(parsed) ? parsed.length : 'NOT AN ARRAY');
                console.log('Parsed content:', parsed);
            } catch (parseErr) {
                debugHtml += `<div style="color: #ff0;">❌ JSON Parse Error: ${parseErr.message}</div>`;
            }
        } else {
            debugHtml += `<div style="color: #ff0;">⚠️ localStorage['resqai-systems'] is EMPTY or NULL</div>`;
        }

        // Update debug panel
        const debugPanel = document.getElementById('debug-panel');
        const debugContent = document.getElementById('debug-content');
        if (debugContent) {
            debugContent.innerHTML = debugHtml;
            if (debugPanel) debugPanel.style.display = 'block';
        }

    } catch (e) {
        console.error('Error reading localStorage:', e);
        const debugContent = document.getElementById('debug-content');
        if (debugContent) {
            debugContent.innerHTML = `<div style="color: #ff0;">❌ Debug Error: ${e.message}</div>`;
        }
    }
}

// Toggle debug panel visibility  
function toggleDebugPanel() {
    const debugPanel = document.getElementById('debug-panel');
    if (debugPanel) {
        debugPanel.style.display = debugPanel.style.display === 'none' ? 'block' : 'none';
    }
}

// Consolidated global keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (e.key === 'F12') {
        e.preventDefault();
        toggleDebugPanel();
    } else if (e.key === 'Escape') {
        // Check if modal is open, else go back
        const sosOverlay = document.getElementById('sos-guidance-overlay');
        if (sosOverlay) {
            sosOverlay.remove();
        } else if (document.querySelector('.rescue-screen.active')?.id !== 'screen-type-selection') {
            goBack();
        }
    }
});

// Render systems dashboard with list of user's systems
function renderSystemsDashboard(systems) {
    console.log('[RENDER] Starting dashboard render');
    if (DEBUG) console.group('🎨 [RENDER] Dashboard');

    // VALIDATE INPUT
    const container = document.getElementById('systems-list');
    if (!container) {
        console.error('[RENDER] ❌ Container #systems-list not found!');
        if (DEBUG) console.groupEnd();
        return;
    }

    // VALIDATE SYSTEMS ARRAY
    if (!Array.isArray(systems)) {
        console.warn('[RENDER] ⚠️ Systems not an array, using empty array');
        systems = [];
    }

    container.innerHTML = '';
    console.log('[RENDER] Total systems to render:', systems.length);

    // EMPTY STATE
    if (systems.length === 0) {
        console.log('[RENDER] No systems found - showing empty state');
        container.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px;">
                <div style="font-size: 48px; margin-bottom: 20px;">📋</div>
                <h3 style="color: #fff; margin-bottom: 10px;">No Systems Yet</h3>
                <p style="color: #888;">Create your first rescue system to get started</p>
            </div>
        `;
        console.log('[RENDER] ✅ Empty state rendered');
        if (DEBUG) console.groupEnd();
        return;
    }

    // RENDER CARDS WITH ERROR HANDLING
    systems.forEach((system, index) => {
        try {
            const card = document.createElement('div');
            card.className = 'system-card';

            // GET THEME BY TYPE
            const theme = getThemeByType(system.type);
            const status = getSystemStatus(system);

            const systemID = system.systemID || system.id;
            const orgType = system.type || system.organizationType || 'custom';
            const orgName = system.name || system.organizationName || 'Unnamed';
            const location = (system.data && system.data.location) || system.location || 'No location';
            const staffCount = (system.data && system.data.staff && system.data.staff.length) || 0;
            const riskCount = (system.data && system.data.riskTypes && system.data.riskTypes.length) || 0;
            const alertsCount = system.alertsCount || 0;
            const layoutAnalysis = (system.data && system.data.layoutAnalysis) || system.layoutAnalysis;
            const safetyScore = layoutAnalysis ? layoutAnalysis.overallSafetyScore : null;
            const safetyScoreColor = safetyScore ? (safetyScore >= 7 ? '#22c55e' : safetyScore >= 4 ? '#f59e0b' : '#ef4444') : null;

            // Format last updated time
            const lastUpdated = system.lastUpdated
                ? new Date(system.lastUpdated).toLocaleString()
                : 'Never';

            console.log(`[RENDER] Card ${index + 1} - systemID: ${systemID}, name: ${orgName}, type: ${orgType}, alerts: ${alertsCount}`);

            // Apply theme to card border
            card.style.borderLeft = `4px solid ${theme.color}`;
            card.style.boxShadow = `0 0 15px ${theme.color}33`;

            card.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px;">
                    <div style="display: flex; gap: 8px;">
                        <span style="background: ${theme.color}22; color: ${theme.color}; border: 1px solid ${theme.color}66; padding: 4px 12px; border-radius: 8px; font-size: 12px; font-weight: 600;">${theme.emoji} ${theme.label}</span>
                    </div>
                    <span title="${status.label}" style="font-size: 20px;">${status.emoji}</span>
                </div>
                <h3 style="color: #fff; margin: 0 0 12px 0; font-size: 16px; font-weight: 600;">${orgName}</h3>
                ${safetyScore ? `<div style="display:inline-block;background:${safetyScoreColor}22;color:${safetyScoreColor};border:1px solid ${safetyScoreColor}55;padding:3px 10px;border-radius:12px;font-size:11px;font-weight:700;margin-bottom:8px;">\ud83d\udee1\ufe0f Safety: ${safetyScore}/10</div>` : ''}
                <p style="color: #888; margin: 8px 0; font-size: 14px;">📍 ${location}</p>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 12px 0 16px 0; padding: 12px; background: rgba(255,255,255,0.03); border-radius: 6px;">
                    <div style="font-size: 12px; color: #666;">
                        👥 <span style="color: #0f0;">${staffCount}</span> Staff
                    </div>
                    <div style="font-size: 12px; color: #666;">
                        ⚠️ <span style="color: #ff9;">${riskCount}</span> Risks
                    </div>
                    <div style="font-size: 12px; color: #666;">
                        🚨 <span style="color: ${alertsCount > 0 ? '#f44' : '#0a0'}">${alertsCount}</span> Alerts
                    </div>
                    <div style="font-size: 12px; color: #666;">
                        ⏱️ Updated
                    </div>
                </div>
                
                <p style="color: #666; margin: 8px 0 16px 0; font-size: 11px;">Last updated: ${lastUpdated}</p>
                
                <div style="display: flex; gap: 8px;">
                    <button class="btn-small btn-primary" onclick="openSystem('${systemID}')" style="flex: 1;">📂 Open</button>
                    <button class="btn-small btn-danger" onclick="deleteSystemConfirm('${systemID}')" style="flex: 1;">🗑️ Delete</button>
                </div>
            `;

            // Add hover preview
            card.addEventListener('mouseenter', () => {
                card.style.transform = 'translateY(-4px)';
                card.style.boxShadow = `0 8px 25px ${theme.color}55`;
            });

            card.addEventListener('mouseleave', () => {
                card.style.transform = 'translateY(0)';
                card.style.boxShadow = `0 0 15px ${theme.color}33`;
            });

            card.style.transition = 'all 0.3s ease';

            container.appendChild(card);
            console.log(`[RENDER] ✅ Card ${index + 1} created with theme ${theme.label} - systemID: ${systemID}`);
        } catch (cardErr) {
            console.error(`[RENDER] ❌ Card ${index + 1} error:`, cardErr.message);
        }
    });

    console.log('[RENDER] ✅ All systems rendered successfully');
    if (DEBUG) console.groupEnd();
}

// Show systems dashboard screen
async function showSystemsDashboard() {
    showScreen('screen-systems-dashboard');
    await loadUserSystems();  // Wait for systems to load before returning
}

// Open system admin control panel
function openSystemPanel(systemID) {
    console.log('[NAV] Opening admin panel for system:', systemID);
    systemData.systemID = systemID;
    showScreen('screen-system-control-panel');
    loadSystemIntoPanel(systemID);
}

// Open system user panel
// Load system details for control panel
async function loadSystemIntoPanel(systemID) {
    if (DEBUG) console.group('📂 [LOAD] System into panel');
    console.log('[LOAD] Loading system:', systemID);

    const panelInfo = document.getElementById('panel-system-info');

    if (!panelInfo) {
        if (DEBUG) console.error('Panel info container not found');
        console.log('[LOAD] ERROR: Panel info element missing');
        return;
    }

    // Show loading state
    panelInfo.innerHTML = `
        <div class="info-line">
            <span class="label">Loading system...</span>
            <span class="value">⏳ Please wait</span>
        </div>
    `;

    try {
        // Try API first with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        console.log('[LOAD] Calling API: ' + API_BASE_URL + '/' + systemID);
        const response = await fetch(`${API_BASE_URL}/${systemID}`, {
            headers: getAPIHeaders(),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (response.ok) {
            const data = await response.json();
            const system = data.system;
            console.log('[LOAD] API response received:', system);

            if (system) {
                systemData.organizationName = system.organizationName || system.organization_name;
                systemData.organizationType = system.organizationType || system.organization_type;
                systemData.location = system.location;
                systemData.contactEmail = system.contactEmail || system.contact_email;
                systemData.structure = system.structure || systemData.structure;
                systemData.staff = system.staff || systemData.staff;
                systemData.status = system.status || systemData.status || 'active';
                systemData.layoutAnalysis = system.layoutAnalysis
                    || (system.structure && (system.structure.layoutAnalysis || system.structure.layout_analysis))
                    || null;
                systemData.systemID = systemID; // IMPORTANT: Set the system ID
                syncLayoutAssetFromStructure(systemData.structure);

                console.log('[LOAD] systemData updated from API:', {
                    organizationName: systemData.organizationName,
                    organizationType: systemData.organizationType,
                    location: systemData.location
                });

                panelInfo.innerHTML = `
                    <div class="info-line">
                        <span class="label">Organization:</span>
                        <span class="value">${systemData.organizationName || 'Unknown'}</span>
                    </div>
                    <div class="info-line">
                        <span class="label">Type:</span>
                        <span class="value">${systemData.organizationType || 'Unknown'}</span>
                    </div>
                    <div class="info-line">
                        <span class="label">Location:</span>
                        <span class="value">${systemData.location || 'Unknown'}</span>
                    </div>
                    <div class="info-line">
                        <span class="label">Contact:</span>
                        <span class="value">${systemData.contactEmail || 'Unknown'}</span>
                    </div>
                `;
                if (DEBUG) console.log('✅ System loaded from API:', systemID);
                console.log('[LOAD] Panel info updated from API');
                if (DEBUG) console.groupEnd();
                return;
            }
        }
        throw new Error(`HTTP ${response.status}`);
    } catch (apiError) {
        if (DEBUG) console.warn('⚠️ API failed:', apiError.message);
        console.log('[LOAD] API failed, trying localStorage');

        // Fallback to localStorage
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            console.log('[LOAD] localStorage key:', STORAGE_KEY);
            console.log('[LOAD] localStorage data:', stored);

            if (stored) {
                const systems = JSON.parse(stored);
                const system = systems.find(s => (s.systemID || s.id) === systemID);
                console.log('[LOAD] Found system in localStorage:', system);

                if (system) {
                    // HANDLE NEW STRUCTURE (data property) and OLD STRUCTURE (flat properties)
                    const systemData_org = (system.data && system.data.organizationName) || system.organizationName;
                    const systemData_type = (system.data && system.data.organizationType) || system.type || system.organizationType;
                    const systemData_location = (system.data && system.data.location) || system.location;
                    const systemData_email = (system.data && system.data.contactEmail) || system.contactEmail;
                    const systemData_structure = (system.data && system.data.structure) || system.structure;
                    const systemData_staff = (system.data && system.data.staff) || system.staff;
                    const systemData_template = (system.data && system.data.template) || system.template;
                    const systemData_layoutAnalysis = (system.data && system.data.layoutAnalysis)
                        || system.layoutAnalysis
                        || (systemData_structure && (systemData_structure.layoutAnalysis || systemData_structure.layout_analysis));

                    systemData.organizationName = systemData_org;
                    systemData.organizationType = systemData_type;
                    systemData.location = systemData_location;
                    systemData.contactEmail = systemData_email;
                    systemData.structure = systemData_structure || systemData.structure;
                    systemData.staff = systemData_staff || systemData.staff;
                    systemData.template = systemData_template;
                    systemData.status = system.status || systemData.status || 'active';
                    systemData.layoutAnalysis = systemData_layoutAnalysis;
                    systemData.systemID = systemID; // IMPORTANT: Set the system ID
                    syncLayoutAssetFromStructure(systemData.structure);

                    console.log('[LOAD] systemData updated from localStorage:', {
                        organizationName: systemData.organizationName,
                        organizationType: systemData.organizationType,
                        location: systemData.location,
                        hasTemplate: !!systemData_template
                    });

                    panelInfo.innerHTML = `
                        <div class="info-line">
                            <span class="label">Organization:</span>
                            <span class="value">${systemData.organizationName || 'Unknown'}</span>
                        </div>
                        <div class="info-line">
                            <span class="label">Type:</span>
                            <span class="value">${systemData.organizationType || 'Unknown'}</span>
                        </div>
                        <div class="info-line">
                            <span class="label">Location:</span>
                            <span class="value">${systemData.location || 'Unknown'}</span>
                        </div>
                        <div class="info-line">
                            <span class="label">Contact:</span>
                            <span class="value">${systemData.contactEmail || 'Unknown'}</span>
                        </div>
                    `;
                    if (DEBUG) console.log('✅ System loaded from localStorage');
                    console.log('[LOAD] Panel info updated from localStorage');
                    if (DEBUG) console.groupEnd();
                    return;
                }
            }
        } catch (storageErr) {
            if (DEBUG) console.error('Storage fallback failed:', storageErr.message);
            console.log('[LOAD] localStorage error:', storageErr.message);
        }

        // System not found
        panelInfo.innerHTML = `
            <div class="info-line" style="color: #ff6b6b;">
                <span class="label">⚠️ System Not Found</span>
                <span class="value">This system could not be loaded</span>
            </div>
        `;
        if (DEBUG) console.error('System not found:', systemID);
        console.log('[LOAD] ERROR: System not found:', systemID);
        if (DEBUG) console.groupEnd();
    }
}

// Delete system confirmation
function deleteSystemConfirm(systemID) {
    if (confirm('Are you sure you want to delete this system? This action cannot be undone.')) {
        deleteSystem(systemID);
    }
}

// Delete system from API and localStorage
async function deleteSystem(systemID) {
    console.group('[DELETE] System deletion');
    console.log('[DELETE] Deleting systemID:', systemID);

    try {
        // Try to delete from API
        try {
            console.log('[DELETE] Attempting API delete...');
            const response = await fetch(`${API_BASE_URL}/${systemID}`, {
                method: 'DELETE',
                headers: getAPIHeaders()
            });

            if (response.ok) {
                console.log('[DELETE] ✅ API deletion successful');
            } else {
                console.warn('[DELETE] ⚠️ API deletion failed, trying localStorage');
            }
        } catch (apiErr) {
            console.warn('[DELETE] ⚠️ API call failed, falling back to localStorage:', apiErr.message);
        }

        // ALWAYS delete from localStorage for reliability
        console.log('[DELETE] Removing from localStorage...');
        let systems = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        const beforeCount = systems.length;
        systems = systems.filter(s => s.systemID !== systemID);
        const afterCount = systems.length;

        localStorage.setItem(STORAGE_KEY, JSON.stringify(systems));

        console.log(`[DELETE] ✅ Removed from localStorage (was ${beforeCount}, now ${afterCount})`);
        console.groupEnd();

        showToast('✅ System deleted successfully', 'success');

        // Refresh the dashboard
        console.log('[DELETE] Reloading dashboard...');
        loadUserSystems();
    } catch (error) {
        console.error('[DELETE] ❌ Unexpected error:', error);
        console.groupEnd();
        showToast('❌ Error deleting system', 'error');
    }
}

// ===== OPEN SYSTEM DETAIL VIEW =====

function openSystem(systemID) {
    console.log('[OPEN] Opening system detail view for:', systemID);

    try {
        // Load the system from localStorage when available, but allow backend-only systems too
        const systems = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        const system = systems.find(s => (s.systemID || s.id) === systemID);

        if (!system) {
            console.error('[OPEN] ❌ System not found:', systemID);
            showToast('❌ System not found', 'error');
            return;
        }

        console.log('[OPEN] ✅ System found:', system.name || system.organizationName);

        // Save active system to localStorage for control panel to load
        localStorage.setItem('active_system_id', systemID);
        console.log('[OPEN] Active system ID saved to localStorage');

        // Navigate to control panel
        console.log('[OPEN] Navigating to system control panel...');
        showSystemControlPanel(systemID);

    } catch (error) {
        console.error('[OPEN] ❌ Error opening system:', error.message);
        showToast('❌ Error opening system: ' + error.message, 'error');
    }
}

// Show the system control panel screen (already exists in HTML)
function showSystemControlPanel(systemID) {
    console.log('[PANEL] Loading system into control panel:', systemID);
    showScreen('screen-system-control-panel');
    loadSystemIntoPanel(systemID);
}

// ===== BACK BUTTON FUNCTIONS =====

function goBackToMainPage() {
    console.log('🔙 Exiting to ResQAI dashboard...');
    if (window.parent && window.parent !== window && window.parent.goBackFromRescueBuilder) {
        window.parent.goBackFromRescueBuilder();
    } else {
        window.location.href = '/modules/rescue-builder/pages/custom-builder-dashboard.html';
    }
}

function goBackFromSystemPanel() {
    console.log('🔙 [BACK] Returning to systems dashboard from control panel...');
    window.location.href = '/modules/rescue-builder/pages/custom-builder-dashboard.html';
}

// ===== SCREEN 1: TYPE SELECTION =====

function selectType(type) {
    systemData.organizationType = type;
    const template = getTemplate(type);

    // Attach full template to systemData for persistence
    systemData.template = template;

    // Set default structure values
    systemData.structure.floors = template.defaultFloors;
    systemData.structure.rooms = template.defaultRooms;
    systemData.structure.buildings = template.defaultBuildings;

    // Pre-populate wizard form
    document.getElementById('org-type').value = type;

    // Show first step
    showScreen('screen-wizard-step1');
    console.log('[SELECT] Type:', type, '| Template attached with', template.emergencyTypes?.length, 'emergency types');
}

function goToTypeSelection() {
    try {
        if (DEBUG) console.log('🔘 [NAV] Create System clicked');
        if (launchContext.returnToOrgSelect) {
            window.location.href = '/modules/rescue-builder/pages/custom-builder-org-select.html';
            return;
        }
        showScreen('screen-type-selection');
        const backBtn = document.getElementById('back-btn-1');
        if (backBtn) backBtn.style.display = 'none';
        if (DEBUG) console.log('✅ Navigation complete');
    } catch (error) {
        if (DEBUG) console.error('Error:', error.message);
        showToast('Error: Could not navigate', 'error');
    }
}

// ===== SCREEN 2: WIZARD STEP 1 - BASIC INFO =====

function nextStep1() {
    const orgName = document.getElementById('org-name').value.trim();
    const orgType = document.getElementById('org-type').value;
    const location = document.getElementById('org-location').value.trim();
    const email = document.getElementById('org-contact').value.trim();

    // Validation
    if (!orgName || !orgType || !location || !email) {
        showToast('Please fill in all required fields', 'error');
        return;
    }

    // Email validation
    if (!isValidEmail(email)) {
        showToast('Please enter a valid email address', 'error');
        return;
    }

    // Save to systemData
    systemData.organizationName = orgName;
    systemData.organizationType = orgType;
    systemData.location = location;
    systemData.contactEmail = email;

    // Pre-populate step 2 with template defaults
    const template = getTemplate(orgType);
    document.getElementById('num-floors').value = template.defaultFloors;
    document.getElementById('num-rooms').value = template.defaultRooms;
    document.getElementById('num-buildings').value = template.defaultBuildings;

    showScreen('screen-wizard-step2');
    showToast('Basic info saved! Now set up your structure.', 'success');
}

function goToWizardStep1() {
    showScreen('screen-wizard-step1');
}

// ===== SCREEN 3: WIZARD STEP 2 - STRUCTURE =====

function toggleStructureMode(mode) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));

    if (mode === 'manual') {
        document.querySelectorAll('.tab-btn')[0].classList.add('active');
        document.getElementById('tab-manual').classList.add('active');
    } else {
        document.querySelectorAll('.tab-btn')[1].classList.add('active');
        document.getElementById('tab-image').classList.add('active');
    }
}

// ===== LAYOUT AI ANALYSIS =====

async function analyzeLayout() {
    if (!layoutImageBase64 || !layoutImageMimeType) {
        showToast('Please upload an image first', 'error');
        return;
    }
    var analyzeBtn = document.getElementById('btn-analyze-layout');
    var loadingDiv = document.getElementById('layout-analysis-loading');
    var resultsDiv = document.getElementById('layout-analysis-results');
    var fallbackDiv = document.getElementById('layout-manual-fallback');
    if (resultsDiv) resultsDiv.style.display = 'none';
    if (fallbackDiv) fallbackDiv.style.display = 'none';
    if (analyzeBtn) analyzeBtn.style.display = 'none';
    if (loadingDiv) loadingDiv.style.display = 'block';
    console.log('[LAYOUT-AI] Starting layout analysis...');
    try {
        var desc = document.getElementById('image-notes') ? document.getElementById('image-notes').value.trim() : '';
        var response = await fetch(`${BASE_URL}/api/ai/analyze-layout`, {
            method: 'POST',
            headers: getAPIHeaders(),
            body: JSON.stringify({ imageBase64: layoutImageBase64, mimeType: layoutImageMimeType, description: desc })
        });
        if (!response.ok) {
            var errData = await response.json().catch(function () { return {}; });
            throw new Error(errData.message || errData.error || 'API error ' + response.status);
        }
        var data = await response.json();
        if (data.analysis) {
            console.log('[LAYOUT-AI] Analysis received, score:', data.analysis.overallSafetyScore);
            systemData.layoutAnalysis = data.analysis;
            renderLayoutAnalysis(data.analysis);
            showToast('Layout analysis complete!', 'success');
        } else { throw new Error('No analysis data'); }
    } catch (error) {
        console.error('[LAYOUT-AI] Failed:', error.message);
        showToast('AI analysis failed: ' + error.message, 'error');
        showManualFallbackForm();
    } finally {
        if (loadingDiv) loadingDiv.style.display = 'none';
    }
}

function getSeverityColor(s) { return s === 'high' ? '#ef4444' : s === 'low' ? '#22c55e' : '#f59e0b'; }
function getPriorityColor(p) { return p === 'high' ? '#ef4444' : p === 'low' ? '#22c55e' : '#f59e0b'; }

function renderLayoutAnalysis(analysis) {
    var container = document.getElementById('layout-analysis-results');
    if (!container) return;
    var sc = analysis.overallSafetyScore;
    var scoreClr = sc >= 7 ? '#22c55e' : sc >= 4 ? '#f59e0b' : '#ef4444';
    var html = '';
    html += '<div style="background:linear-gradient(135deg,' + scoreClr + '15,' + scoreClr + '08);border:1px solid ' + scoreClr + '44;border-radius:12px;padding:20px;text-align:center;margin-bottom:16px;">';
    html += '<div style="font-size:36px;font-weight:800;color:' + scoreClr + ';">' + sc + '/10</div>';
    html += '<div style="font-size:13px;color:#999;margin-top:4px;">Overall Safety Score</div>';
    if (analysis.summary) html += '<p style="color:#ccc;font-size:13px;margin-top:10px;line-height:1.5;">' + analysis.summary + '</p>';
    html += '</div>';
    if (analysis.exits && analysis.exits.length > 0) {
        html += '<div style="background:rgba(34,197,94,0.08);border:1px solid rgba(34,197,94,0.25);border-radius:10px;padding:16px;margin-bottom:12px;">';
        html += '<div style="color:#22c55e;font-weight:700;font-size:14px;margin-bottom:10px;">\u2705 Exits Found (' + analysis.exits.length + ')</div>';
        analysis.exits.forEach(function (e) {
            html += '<div style="color:#ccc;font-size:13px;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.05);"><strong>' + (e.type || 'Exit') + '</strong> \u2014 ' + e.location + (e.notes ? ' <span style="color:#888">(' + e.notes + ')</span>' : '') + '</div>';
        });
        html += '</div>';
    }
    if (analysis.highRiskZones && analysis.highRiskZones.length > 0) {
        html += '<div style="background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.25);border-radius:10px;padding:16px;margin-bottom:12px;">';
        html += '<div style="color:#f59e0b;font-weight:700;font-size:14px;margin-bottom:10px;">\u26a0\ufe0f High-Risk Zones (' + analysis.highRiskZones.length + ')</div>';
        analysis.highRiskZones.forEach(function (z) {
            html += '<div style="color:#ccc;font-size:13px;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.05);"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:' + getSeverityColor(z.severity) + ';margin-right:6px;"></span><strong>' + z.location + '</strong> \u2014 ' + z.risk + ' <span style="color:' + getSeverityColor(z.severity) + ';font-size:11px;font-weight:600;">[' + (z.severity || 'medium').toUpperCase() + ']</span></div>';
        });
        html += '</div>';
    }
    if (analysis.evacuationRoutes && analysis.evacuationRoutes.length > 0) {
        html += '<div style="background:rgba(59,130,246,0.08);border:1px solid rgba(59,130,246,0.25);border-radius:10px;padding:16px;margin-bottom:12px;">';
        html += '<div style="color:#3b82f6;font-weight:700;font-size:14px;margin-bottom:10px;">\ud83c\udfc3 Evacuation Routes (' + analysis.evacuationRoutes.length + ')</div>';
        analysis.evacuationRoutes.forEach(function (rt) {
            html += '<div style="color:#ccc;font-size:13px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05);"><span style="color:' + (rt.priority === 'primary' ? '#3b82f6' : '#6b7280') + ';font-size:11px;font-weight:600;">[' + (rt.priority || 'secondary').toUpperCase() + ']</span> <strong>' + rt.from + '</strong> \u2192 <strong>' + rt.to + '</strong><div style="color:#888;font-size:12px;margin-top:3px;">' + rt.path + '</div></div>';
        });
        html += '</div>';
    }
    if (analysis.assemblyPoints && analysis.assemblyPoints.length > 0) {
        html += '<div style="background:rgba(168,85,247,0.08);border:1px solid rgba(168,85,247,0.25);border-radius:10px;padding:16px;margin-bottom:12px;">';
        html += '<div style="color:#a855f7;font-weight:700;font-size:14px;margin-bottom:10px;">\ud83d\udccd Assembly Points (' + analysis.assemblyPoints.length + ')</div>';
        analysis.assemblyPoints.forEach(function (ap) {
            html += '<div style="color:#ccc;font-size:13px;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.05);"><strong>' + ap.location + '</strong>' + (ap.capacity ? ' \u2014 Capacity: ' + ap.capacity : '') + (ap.notes ? ' <span style="color:#888">(' + ap.notes + ')</span>' : '') + '</div>';
        });
        html += '</div>';
    }
    if (analysis.equipmentPlacement && analysis.equipmentPlacement.length > 0) {
        html += '<div style="background:rgba(6,182,212,0.08);border:1px solid rgba(6,182,212,0.25);border-radius:10px;padding:16px;margin-bottom:12px;">';
        html += '<div style="color:#06b6d4;font-weight:700;font-size:14px;margin-bottom:10px;">\ud83e\uddef Equipment Placement (' + analysis.equipmentPlacement.length + ')</div>';
        analysis.equipmentPlacement.forEach(function (eq) {
            html += '<div style="color:#ccc;font-size:13px;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.05);"><strong>' + eq.equipment + '</strong> \u2192 ' + eq.location + '<div style="color:#888;font-size:12px;margin-top:2px;">' + eq.reason + '</div></div>';
        });
        html += '</div>';
    }
    if (analysis.recommendations && analysis.recommendations.length > 0) {
        html += '<div style="background:rgba(99,102,241,0.08);border:1px solid rgba(99,102,241,0.25);border-radius:10px;padding:16px;margin-bottom:12px;">';
        html += '<div style="color:#6366f1;font-weight:700;font-size:14px;margin-bottom:10px;">\ud83d\udccb Recommendations (' + analysis.recommendations.length + ')</div>';
        analysis.recommendations.forEach(function (rec) {
            html += '<div style="color:#ccc;font-size:13px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05);"><span style="color:' + getPriorityColor(rec.priority) + ';font-size:11px;font-weight:600;">[' + (rec.priority || 'medium').toUpperCase() + ']</span> <strong>' + rec.action + '</strong><div style="color:#888;font-size:12px;margin-top:2px;">' + rec.reason + '</div></div>';
        });
        html += '</div>';
    }
    container.innerHTML = html;
    container.style.display = 'block';
    var analyzeBtn = document.getElementById('btn-analyze-layout');
    if (analyzeBtn) { analyzeBtn.textContent = '\ud83d\udd04 Re-Analyze Layout'; analyzeBtn.style.display = 'block'; }
}

function showManualFallbackForm() {
    var fb = document.getElementById('layout-manual-fallback');
    if (!fb) return;
    fb.innerHTML = '<div style="background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.25);border-radius:10px;padding:20px;">'
        + '<div style="color:#f59e0b;font-weight:700;margin-bottom:12px;">\u26a0\ufe0f AI Analysis Unavailable</div>'
        + '<p style="color:#888;font-size:13px;margin-bottom:16px;">Please enter building details manually, or try again later.</p>'
        + '<div style="display:flex;flex-direction:column;gap:12px;">'
        + '<div><label style="color:#ccc;font-size:13px;font-weight:600;display:block;margin-bottom:4px;">Number of Exits</label>'
        + '<input type="number" id="fallback-exits" min="0" placeholder="e.g., 4" style="width:100%;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);color:#fff;padding:10px;border-radius:6px;font-size:13px;" /></div>'
        + '<div><label style="color:#ccc;font-size:13px;font-weight:600;display:block;margin-bottom:4px;">Known Risk Areas</label>'
        + '<textarea id="fallback-risks" placeholder="e.g., Basement has limited exits..." rows="2" style="width:100%;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);color:#fff;padding:10px;border-radius:6px;font-size:13px;font-family:inherit;"></textarea></div>'
        + '<div><label style="color:#ccc;font-size:13px;font-weight:600;display:block;margin-bottom:4px;">Safety Equipment Locations</label>'
        + '<textarea id="fallback-equipment" placeholder="e.g., Fire extinguishers in hallways..." rows="2" style="width:100%;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);color:#fff;padding:10px;border-radius:6px;font-size:13px;font-family:inherit;"></textarea></div>'
        + '<button type="button" onclick="saveManualFallbackData()" style="background:linear-gradient(135deg,#f59e0b 0%,#d97706 100%);color:#fff;border:none;padding:12px;border-radius:8px;font-weight:600;cursor:pointer;font-family:inherit;">Save Manual Analysis</button>'
        + '</div></div>';
    fb.style.display = 'block';
    var btn = document.getElementById('btn-analyze-layout');
    if (btn) { btn.textContent = '\ud83d\udd04 Retry AI Analysis'; btn.style.display = 'block'; }
}

function saveManualFallbackData() {
    var exits = parseInt(document.getElementById('fallback-exits').value) || 0;
    var risks = (document.getElementById('fallback-risks').value || '').trim();
    var equipment = (document.getElementById('fallback-equipment').value || '').trim();
    systemData.layoutAnalysis = {
        exits: [], highRiskZones: [], evacuationRoutes: [], assemblyPoints: [],
        equipmentPlacement: [], recommendations: [],
        overallSafetyScore: 5,
        summary: 'Manual assessment - AI analysis was unavailable.',
        isManual: true
    };
    if (exits > 0) {
        for (var i = 0; i < exits; i++) systemData.layoutAnalysis.exits.push({ location: 'Exit ' + (i + 1), type: 'Exit', notes: 'Manually entered' });
    }
    if (risks) systemData.layoutAnalysis.highRiskZones.push({ location: 'User noted', risk: risks, severity: 'medium' });
    if (equipment) systemData.layoutAnalysis.equipmentPlacement.push({ equipment: 'Various', location: equipment, reason: 'Manually entered' });
    showToast('Manual safety data saved', 'success');
    document.getElementById('layout-manual-fallback').style.display = 'none';
    renderLayoutAnalysis(systemData.layoutAnalysis);
}

function nextStep2() {
    // Check which tab is active
    var imageTabActive = document.getElementById('tab-image') && document.getElementById('tab-image').classList.contains('active');

    if (imageTabActive) {
        // Image mode - use image notes and layout analysis data
        var imageNotes = document.getElementById('image-notes') ? document.getElementById('image-notes').value.trim() : '';
        systemData.structure.notes = imageNotes;
        if (!systemData.structure.floors || systemData.structure.floors < 1) systemData.structure.floors = 1;
        if (!systemData.structure.rooms || systemData.structure.rooms < 1) systemData.structure.rooms = 1;
        if (!systemData.structure.buildings || systemData.structure.buildings < 1) systemData.structure.buildings = 1;
        showScreen('screen-wizard-step3');
        showToast('Structure configured! Now add staff members.', 'success');
        return;
    }

    // Manual mode - original validation
    const floors = parseInt(document.getElementById('num-floors').value) || 0;
    const rooms = parseInt(document.getElementById('num-rooms').value) || 0;
    const buildings = parseInt(document.getElementById('num-buildings').value) || 1;
    const notes = document.getElementById('structure-notes').value.trim();

    if (floors < 1 || rooms < 1) {
        showToast('Please enter valid floor and room numbers', 'error');
        return;
    }

    systemData.structure.floors = floors;
    systemData.structure.rooms = rooms;
    systemData.structure.buildings = buildings;
    systemData.structure.notes = notes;
    delete systemData.structure.layoutAsset;
    layoutImageBase64 = null;
    layoutImageMimeType = null;

    showScreen('screen-wizard-step3');
    showToast('Structure configured! Now add staff members.', 'success');
}

function goToWizardStep2() {
    showScreen('screen-wizard-step2');
}

// ===== SCREEN 4: WIZARD STEP 3 - STAFF =====

function addStaffItem() {
    const staffList = document.getElementById('staff-list');
    const newItem = document.createElement('div');
    newItem.className = 'staff-item';

    // Get roles from template (dynamic per org type)
    const roles = getStaffRoles(systemData.organizationType);
    const roleOptions = roles.map(r => `<option value="${r.value}">${r.label}</option>`).join('');

    newItem.innerHTML = `
    <div class="staff-form">
      <input type="text" class="staff-name" placeholder="Staff Name" />
      <select class="staff-role">
        <option value="">Select Role</option>
        ${roleOptions}
      </select>
      <input type="tel" class="staff-phone" placeholder="Phone Number" />
      <button type="button" class="btn-remove" onclick="removeStaffItem(this)">✕</button>
    </div>
  `;
    staffList.appendChild(newItem);
}

function removeStaffItem(btn) {
    btn.closest('.staff-item').remove();
}

function nextStep3() {
    const staffItems = document.querySelectorAll('.staff-item');
    systemData.staff = [];

    let valid = true;
    staffItems.forEach(item => {
        const name = item.querySelector('.staff-name').value.trim();
        const role = item.querySelector('.staff-role').value;
        const phone = item.querySelector('.staff-phone').value.trim();

        if (name && role && phone) {
            systemData.staff.push({ name, role, phone });
        }
    });

    if (systemData.staff.length === 0) {
        showToast('Please add at least one staff member', 'error');
        return;
    }

    showScreen('screen-wizard-step4');
    showToast('Staff members configured! Select risk types now.', 'success');
}

function goToWizardStep3() {
    showScreen('screen-wizard-step3');
}

async function buildSystem() {
    console.log('\n========== [CREATE] SYSTEM CREATION STARTED ==========');
    if (DEBUG) console.group('🚀 [CREATE] System');

    // ===== STEP 1: COLLECT RISK TYPES =====
    console.log('[CREATE] STEP 1: Collecting risk types...');
    const checkboxes = document.querySelectorAll('.risk-checkbox input:checked');
    systemData.riskTypes = [];
    checkboxes.forEach(cb => {
        systemData.riskTypes.push(cb.value);
    });

    if (systemData.riskTypes.length === 0) {
        console.error('[CREATE] ❌ STEP 1 FAILED: No risk types selected');
        showToast('Please select at least one risk type', 'error');
        if (DEBUG) console.groupEnd();
        return;
    }

    console.log('[CREATE] ✅ STEP 1 COMPLETE: Risk types collected:', systemData.riskTypes);

    // ===== STEP 2: VALIDATE ALL REQUIRED DATA =====
    console.log('[CREATE] STEP 2: Validating systemData...');

    if (!systemData.organizationName) {
        console.error('[CREATE] ❌ STEP 2 FAILED: Missing organizationName');
        showToast('❌ Organization name is missing', 'error');
        if (DEBUG) console.groupEnd();
        return;
    }

    if (!systemData.organizationType) {
        console.error('[CREATE] ❌ STEP 2 FAILED: Missing organizationType');
        showToast('❌ Organization type is missing', 'error');
        if (DEBUG) console.groupEnd();
        return;
    }

    if (!systemData.location) {
        console.error('[CREATE] ❌ STEP 2 FAILED: Missing location');
        showToast('❌ Location is missing', 'error');
        if (DEBUG) console.groupEnd();
        return;
    }

    if (!systemData.contactEmail) {
        console.error('[CREATE] ❌ STEP 2 FAILED: Missing contactEmail');
        showToast('❌ Contact email is missing', 'error');
        if (DEBUG) console.groupEnd();
        return;
    }

    if (!systemData.staff || systemData.staff.length === 0) {
        console.error('[CREATE] ❌ STEP 2 FAILED: Missing staff');
        showToast('❌ At least one staff member is required', 'error');
        if (DEBUG) console.groupEnd();
        return;
    }

    console.log('[CREATE] ✅ STEP 2 COMPLETE: All required fields present');

    // ===== STEP 3: GENERATE SYSTEM ID IF NEEDED =====
    console.log('[CREATE] STEP 3: Generating system ID...');
    if (!systemData.systemID) {
        systemData.systemID = generateSystemID();
    }
    systemData.createdAt = new Date().toISOString();

    console.log('[CREATE] ✅ STEP 3 COMPLETE: System data ready:', {
        systemID: systemData.systemID,
        organizationName: systemData.organizationName,
        organizationType: systemData.organizationType,
        location: systemData.location,
        staff: systemData.staff.length,
        risks: systemData.riskTypes.length
    });

    // ===== STEP 4: SHOW ANIMATION SCREEN =====
    console.log('[CREATE] STEP 4: Showing animation screen...');
    showScreen('screen-ai-build');
    console.log('[CREATE] ✅ STEP 4 COMPLETE: Animation screen shown');

    // ===== STEP 4.5: GENERATE AI TEMPLATE (IF CUSTOM) =====
    if (systemData.organizationType === 'other') {
        console.log('[CREATE] STEP 4.5: Generating custom AI template...');
        try {
            const aiTemplate = await generateAITemplate(systemData);
            systemData.template = aiTemplate;
            console.log('[CREATE] ✅ STEP 4.5 COMPLETE: AI template generated');
        } catch (err) {
            console.warn('[CREATE] ⚠️ AI template failed, fallback already applied:', err.message);
        }
    }

    // ===== STEP 5: SAVE TO API/LOCALSTORAGE =====
    console.log('[CREATE] STEP 5: CRITICAL - Saving system to API/localStorage...');
    let saveSuccess = false;
    let savedSystemID = null;
    let saveError = null;

    try {
        console.log('[CREATE] STEP 5A: Calling saveSystemData()...');
        const result = await saveSystemData();
        console.log('[CREATE] STEP 5B: saveSystemData() returned:', result);

        if (result && result.systemID) {
            saveSuccess = true;
            savedSystemID = result.systemID;
            console.log('[CREATE] ✅ STEP 5 COMPLETE: System saved successfully with ID:', savedSystemID);
        } else {
            saveError = 'No systemID in result: ' + JSON.stringify(result);
            console.error('[CREATE] ❌ STEP 5 FAILED: Invalid result structure -', saveError);
        }
    } catch (error) {
        saveError = error.message;
        console.error('[CREATE] ❌ STEP 5 FAILED: saveSystemData() threw exception:', error.message, error);
    }

    // ===== STEP 5 VALIDATION: CHECK IF SAVE SUCCEEDED =====
    if (!saveSuccess || !savedSystemID) {
        console.error('[CREATE] ❌❌❌ CRITICAL FAILURE - SAVE DID NOT COMPLETE ❌❌❌');
        console.error('[CREATE] Save error details:', saveError);
        console.error('[CREATE] Aborting animation and redirecting to step 4');
        showToast('❌ Failed to save system: ' + saveError, 'error');
        showScreen('screen-wizard-step4');
        if (DEBUG) console.groupEnd();
        console.log('========== [CREATE] SYSTEM CREATION ABORTED - SAVE FAILED ==========\n');
        return;
    }

    // ===== STEP 6: ANIMATE AND LOAD DASHBOARD =====
    console.log('[CREATE] STEP 6: CRITICAL - Starting animation and dashboard load...');
    showToast('✅ System created! Loading dashboard...', 'success');
    if (DEBUG) console.groupEnd();

    try {
        console.log('[CREATE] STEP 6A: Calling animateAndRedirect()...');
        await animateAndRedirect();
        console.log('[CREATE] ✅ STEP 6 COMPLETE: Animation and redirect finished');
        console.log('========== [CREATE] SYSTEM CREATION SUCCESSFUL ==========\n');
    } catch (error) {
        console.error('[CREATE] ❌ STEP 6 FAILED: Completion flow error:', error.message);
        showToast('❌ Error displaying dashboard: ' + error.message, 'error');
        console.log('========== [CREATE] SYSTEM CREATION FAILED AT STEP 6 ==========\n');
    }
}

async function animateAndRedirect() {
    return new Promise((resolve, reject) => {
        if (DEBUG) console.group('🎬 [ANIMATE] Build progress');
        console.log('[ANIMATE] Animation starting - will progress 0-100% then load dashboard');

        let currentProgress = 0;
        const stages = [
            { id: 'stage-1', target: 15 },
            { id: 'stage-2', target: 35 },
            { id: 'stage-3', target: 65 },
            { id: 'stage-4', target: 95 }
        ];

        const interval = setInterval(() => {
            currentProgress += Math.random() * 20;

            if (currentProgress > 100) {
                currentProgress = 100;
                clearInterval(interval);

                console.log('[ANIMATE] Progress reached 100% - animation complete');

                // COMPLETE ALL STAGES
                stages.forEach(stage => {
                    const el = document.getElementById(stage.id);
                    if (el) {
                        el.classList.remove('active');
                        el.classList.add('completed');
                        console.log('[ANIMATE] Stage marked complete:', stage.id);
                    }
                });

                const fillEl = document.getElementById('build-progress-fill');
                if (fillEl) fillEl.style.width = '100%';

                if (DEBUG) console.log('✅ Animation complete at 100%');

                // REDIRECT WITH DELAY
                const REDIRECT_DELAY = 1000; // 1 second delay to ensure data is written
                console.log('[ANIMATE] Waiting', REDIRECT_DELAY, 'ms before loading dashboard...');

                setTimeout(async () => {
                    console.log('\n========== [ANIMATE] CRITICAL - Dashboard Loading Phase ==========');
                    console.log('[ANIMATE] Now loading dashboard...');

                    // Load systems and show dashboard
                    try {
                        console.log('[ANIMATE] STEP 1: Calling loadUserSystems()...');
                        await loadUserSystems();
                        console.log('[ANIMATE] ✅ STEP 1 COMPLETE: loadUserSystems() returned successfully');
                    } catch (err) {
                        console.error('[ANIMATE] ❌ STEP 1 FAILED: loadUserSystems() threw error:', err.message, err);
                        if (DEBUG) console.warn('[ANIMATE] Error during load:', err.message);
                    }

                    // Show the dashboard screen
                    console.log('[ANIMATE] STEP 2: Showing screen screen-systems-dashboard...');
                    window.location.href = '/modules/rescue-builder/pages/custom-builder-dashboard.html';
                    console.log('[ANIMATE] ✅ STEP 2 COMPLETE: Dashboard screen shown');

                    if (DEBUG) {
                        console.log('[ANIMATE] Standalone dashboard redirect dispatched');
                        console.groupEnd();
                    }

                    console.log('[ANIMATE] ✅ Animation and redirect complete - resolving promise');
                    console.log('========== [ANIMATE] DASHBOARD LOADING PHASE COMPLETE ==========\n');
                    resolve();
                }, REDIRECT_DELAY);
            } else {
                // UPDATE PROGRESS
                const fillEl = document.getElementById('build-progress-fill');
                if (fillEl) fillEl.style.width = currentProgress + '%';

                // UPDATE STAGES
                stages.forEach(stage => {
                    const el = document.getElementById(stage.id);
                    if (!el) return;

                    if (currentProgress >= stage.target && !el.classList.contains('active')) {
                        el.classList.add('active');
                    }
                    if (currentProgress >= stage.target + 10) {
                        el.classList.remove('active');
                        el.classList.add('completed');
                    }
                });
            }
        }, 800);
    });
}

function goToWizardStep4() {
    showScreen('screen-wizard-step4');
}

// ===== SCREEN 7: SUCCESS SCREEN =====

function showSuccessScreen() {
    // Populate success info
    document.getElementById('success-org-name').textContent = systemData.organizationName;
    document.getElementById('success-org-type').textContent = systemData.organizationType.charAt(0).toUpperCase() + systemData.organizationType.slice(1);

    showScreen('screen-success');
    showToast('✅ Your rescue system is ready!', 'success');
}

// ===== SCREENS 8 & 9: DASHBOARDS =====

function accessAdminDashboard() {
    if (DEBUG) console.log('👨‍💼 [ADMIN] Opening admin panel');
    const sid = systemData?.systemID;
    if (!sid) { showToast('System not loaded', 'error'); return; }
    localStorage.setItem('active_system_id', sid);
    // Open standalone admin panel page
    window.location.href = `/modules/rescue-builder/pages/admin-panel.html?systemID=${sid}`;
}

function accessUserDashboard() {
    if (DEBUG) console.log('👥 [NAV] Opening user panel');
    const sid = systemData?.systemID;
    if (!sid) { showToast('System not loaded', 'error'); return; }
    localStorage.setItem('active_system_id', sid);
    // Open standalone user panel page
    window.location.href = `/modules/rescue-builder/pages/user-panel.html?systemID=${sid}`;
}

function populateAdminDashboard() {
    if (DEBUG) console.log('👨‍💼 [ADMIN] Populating dashboard');
    console.log('[ADMIN] systemData:', systemData);
    closeMapPreviewPanel();

    // Get theme and status
    const theme = getThemeByType(systemData.organizationType);
    const status = getSystemStatus(systemData);

    // Use saved template or fall back to type-based template
    const template = systemData.template || getTemplate(systemData.organizationType);
    console.log('[ADMIN] Template:', template?.name, '| Emergency types:', template?.emergencyTypes?.length);

    // Organization info with enhanced header
    const orgNameEl = document.getElementById('admin-org-name');
    const orgTypeEl = document.getElementById('admin-org-type');
    const locationEl = document.getElementById('admin-location');

    if (orgNameEl) {
        orgNameEl.textContent = systemData.organizationName || '—';
        // Apply theme color to header
        orgNameEl.style.color = theme.color;
    }
    if (orgTypeEl) {
        orgTypeEl.innerHTML = `${theme.emoji} ${theme.label} | ${status.emoji} ${status.label}`;
        orgTypeEl.style.color = theme.color;
    }
    if (locationEl) {
        locationEl.textContent = systemData.location || '—';
    }

    // Add AI Summary Section
    addAISummarySection(systemData, theme);

    // Add Layout Safety Report (if available)
    addLayoutSafetyReport(systemData, theme);

    // Add Smart Action Buttons
    addSmartActionButtons(systemData, theme);

    // ===== DYNAMIC EMERGENCY BUTTONS =====
    const emergencyBtnsDiv = document.getElementById('admin-emergency-buttons');
    if (emergencyBtnsDiv) {
        emergencyBtnsDiv.innerHTML = '';
        const emergencyTypes = template?.emergencyTypes || getEmergencyTypes(systemData.organizationType);
        emergencyTypes.forEach(et => {
            const btn = document.createElement('button');
            btn.className = 'btn-emergency';
            btn.style.cssText = `background: ${et.color}22; border: 1px solid ${et.color}66; color: ${et.color}; cursor: pointer;`;
            btn.innerHTML = `${et.icon} ${et.label}`;
            btn.onclick = () => triggerEmergency(et.id);
            emergencyBtnsDiv.appendChild(btn);
        });
        console.log('[ADMIN] Rendered', emergencyTypes.length, 'emergency buttons');
    }

    // ===== DYNAMIC FEATURE SECTIONS =====
    const featureDiv = document.getElementById('admin-feature-sections');
    if (featureDiv) {
        featureDiv.innerHTML = '';
        const featureSections = template?.featureSections || getFeatureSections(systemData.organizationType);
        if (featureSections) {
            Object.entries(featureSections).forEach(([key, section]) => {
                const card = document.createElement('div');
                card.className = 'feature-section';
                card.innerHTML = `
                    <div class="feature-section-header">
                        <h4>${section.title}</h4>
                        <p>${section.description}</p>
                    </div>
                    ${section.fields && section.fields.length > 0 ? `
                    <div class="feature-section-fields">
                        ${section.fields.map(f => `<div class="feature-field"><span class="field-label">${f}</span><span class="field-value">—</span></div>`).join('')}
                    </div>` : ''}
                `;
                featureDiv.appendChild(card);
            });
            console.log('[ADMIN] Rendered', Object.keys(featureSections).length, 'feature sections');
        }
    }

    // Staff list
    const staffListDiv = document.getElementById('admin-staff-list');
    if (staffListDiv) {
        staffListDiv.innerHTML = '';
        if (systemData.staff && systemData.staff.length > 0) {
            systemData.staff.forEach(staff => {
                const item = document.createElement('div');
                item.className = 'staff-item-admin';
                item.innerHTML = `
            <div class="staff-name-admin">${staff.name}</div>
            <div class="staff-role-admin">${staff.role.toUpperCase()} • ${staff.phone}</div>
          `;
                staffListDiv.appendChild(item);
            });
            console.log('[ADMIN] Populated', systemData.staff.length, 'staff members');
        } else {
            staffListDiv.innerHTML = '<p style="color: #888;">No staff members added</p>';
        }
    }

    // Evacuation routes
    const routesDiv = document.getElementById('evacuation-routes');
    if (routesDiv) {
        routesDiv.innerHTML = '';
        const steps = template?.evacuationSteps || [];
        steps.forEach((step, index) => {
            const item = document.createElement('div');
            item.className = 'route-item';
            item.textContent = `${index + 1}. ${step}`;
            routesDiv.appendChild(item);
        });
    }

    // Load and display active SOS events
    displayActiveSOS();

    // Start polling for emergency alerts
    startAdminAlertPolling();

    if (DEBUG) console.log('✅ Admin dashboard populated with type-specific template');
    console.log('[ADMIN] Dashboard fully loaded');
}

// Display active SOS events
async function displayActiveSOS() {
    try {
        const currentSystemID = systemData?.systemID || localStorage.getItem('active_system_id');
        if (!currentSystemID) return;
        const activeSOSList = document.getElementById('active-sos-list');
        if (!activeSOSList) return;

        // Fetch from backend DB
        const resp = await fetch(`${BASE_URL}/api/custom-system/${currentSystemID}/events`, { headers: getAPIHeaders() });
        if (resp.ok) {
            const data = await resp.json();
            const events = (data.events || []).filter(e => e.event_type === 'EMERGENCY_SOS');
            if (events.length > 0) {
                activeSOSList.innerHTML = '';
                events.slice(0, 10).forEach(event => {
                    const details = (() => { try { return JSON.parse(event.details || '{}'); } catch { return {}; } })();
                    const item = document.createElement('div');
                    item.className = 'sos-alert-item';
                    item.style.cssText = 'background: rgba(255,107,107,0.1); border-left: 4px solid #ff6b6b; padding: 12px; margin: 8px 0; border-radius: 6px; display:flex; justify-content:space-between; align-items:center;';
                    item.innerHTML = `
                        <div>
                            <strong style="color: #ff6b6b;">🚨 ${(details.emergencyType || event.event_type).toUpperCase()}</strong>
                            <div style="font-size: 12px; color: #888; margin-top: 4px;">📍 ${details.location || event.location || 'Unknown'}</div>
                            <div style="font-size: 11px; color: #666; margin-top: 2px;">⏰ ${new Date(event.created_at).toLocaleString()}</div>
                        </div>
                        <button onclick="resolveSOSEvent('${event.id}')" style="padding:6px 12px;background:rgba(34,197,94,0.15);border:1px solid rgba(34,197,94,0.4);color:#4ade80;border-radius:4px;cursor:pointer;font-size:11px;font-weight:700;">✓ Resolve</button>
                    `;
                    activeSOSList.appendChild(item);
                });
                return;
            }
        }
        // Fallback: check localStorage SOS events
        const sosEvents = JSON.parse(localStorage.getItem(`rescue_sos_events_${currentSystemID}`) || '[]');
        const activeEvents = sosEvents.filter(e => e.status === 'active');
        if (activeEvents.length > 0) {
            activeSOSList.innerHTML = '';
            activeEvents.forEach(event => {
                const item = document.createElement('div');
                item.style.cssText = 'background: rgba(255,107,107,0.1); border-left: 4px solid #ff6b6b; padding: 12px; margin: 8px 0; border-radius: 6px;';
                item.innerHTML = `<strong style="color:#ff6b6b;">🚨 ${(event.emergencyType || 'SOS').toUpperCase()}</strong><div style="font-size:12px;color:#888;margin-top:4px;">⏰ ${new Date(event.timestamp).toLocaleString()}</div>`;
                activeSOSList.appendChild(item);
            });
        } else {
            activeSOSList.innerHTML = '<p style="color: #888; font-size: 14px; padding: 12px;">✅ No active SOS events</p>';
        }
    } catch (err) {
        if (DEBUG) console.warn('SOS display error:', err.message);
    }
}

async function resolveSOSEvent(eventId) {
    try {
        const resp = await fetch(`${BASE_URL}/api/custom-system/events/${eventId}`, {
            method: 'DELETE',
            headers: getAPIHeaders()
        });
        if (resp.ok) {
            showToast('✅ SOS event marked as resolved', 'success');
            setTimeout(() => displayActiveSOS(), 300);
        } else {
            showToast('Failed to resolve event', 'error');
        }
    } catch (err) {
        console.error('Error resolving event:', err);
    }
}

function loadAdminSOSAlerts() { displayActiveSOS(); }

async function loadAdminBroadcastAlerts() {
    try {
        const currentSystemID = systemData?.systemID;
        if (!currentSystemID) return;
        const resp = await fetch(`${BASE_URL}/api/custom-system/${currentSystemID}/alerts`, { headers: getAPIHeaders() });
        if (resp.ok) {
            const data = await resp.json();
            if (DEBUG) console.log('[ADMIN] Broadcast alerts loaded:', data.alerts?.length);
        }
    } catch (err) { if (DEBUG) console.warn('Load alerts error:', err); }
}

// Start polling for emergency alerts from backend
let adminAlertInterval = null;
function startAdminAlertPolling() {
    if (adminAlertInterval) clearInterval(adminAlertInterval);
    adminAlertInterval = setInterval(() => {
        displayActiveSOS().catch(() => { });
    }, 5000);
    if (DEBUG) console.log('📡 Admin alert polling started (backend)');
}

function populateUserPanel() {
    if (DEBUG) console.log('👥 [PANEL] Populating user panel');

    // Use saved template or fall back
    const template = systemData.template || getTemplate(systemData.organizationType);
    console.log('[PANEL] Template:', template?.name);
    closeMapPreviewPanel();
    addUserLayoutSafetyGuide(systemData);

    // Safety status
    const statusDiv = document.querySelector('.user-card.alert-section');
    if (statusDiv) {
        const statusLabel = statusDiv.querySelector('h3');
        if (statusLabel) {
            statusLabel.textContent = '🟢 Safety Status: SAFE';
            statusLabel.style.color = '#4ade80';
        }
    }

    // ===== DYNAMIC USER FEATURE SECTIONS =====
    const userFeatureDiv = document.getElementById('user-feature-sections');
    if (userFeatureDiv) {
        userFeatureDiv.innerHTML = '';
        const featureSections = template?.featureSections || getFeatureSections(systemData.organizationType);
        if (featureSections) {
            // Show first 2 feature sections in user panel (summary view)
            const entries = Object.entries(featureSections).slice(0, 2);
            entries.forEach(([key, section]) => {
                const card = document.createElement('div');
                card.className = 'user-card feature-section';
                card.innerHTML = `
                    <h3>${section.title}</h3>
                    <p style="color: #888; font-size: 13px;">${section.description}</p>
                    ${section.fields && section.fields.length > 0 ? `
                    <div class="feature-section-fields" style="margin-top: 12px;">
                        ${section.fields.map(f => `<div class="feature-field"><span class="field-label">${f}</span><span class="field-value">—</span></div>`).join('')}
                    </div>` : ''}
                `;
                userFeatureDiv.appendChild(card);
            });
        }
    }

    // Evacuation plan
    const planDiv = document.getElementById('user-evacuation-plan');
    if (planDiv) {
        planDiv.innerHTML = '';
        const steps = template?.evacuationSteps || [];
        steps.forEach((step, index) => {
            const item = document.createElement('div');
            item.className = 'plan-item';
            item.innerHTML = `<strong>Step ${index + 1}:</strong> ${step}`;
            planDiv.appendChild(item);
        });
    }

    // Emergency contacts
    const contactsDiv = document.getElementById('user-contacts');
    if (contactsDiv) {
        contactsDiv.innerHTML = '';
        const contacts = template?.emergencyContacts || [];
        contacts.forEach(contact => {
            const item = document.createElement('div');
            item.className = 'contact-item';
            item.innerHTML = `<strong>${contact.name}</strong><br>📞 ${contact.phone}`;
            contactsDiv.appendChild(item);
        });
    }

    // Safety tips
    const tipsDiv = document.getElementById('safety-tips');
    if (tipsDiv) {
        tipsDiv.innerHTML = '';
        const tips = template?.safetyTips || getSafetyTips(systemData.organizationType) || [];
        tips.forEach(tip => {
            const item = document.createElement('div');
            item.className = 'tip-item';
            item.textContent = '✓ ' + tip;
            tipsDiv.appendChild(item);
        });
    }

    // Load alerts from admin
    loadUserAlerts();

    if (DEBUG) console.log('✅ User panel populated with type-specific template');
}

// Load and display alerts from admin broadcasts
async function loadUserAlerts() {
    if (DEBUG) console.log('📢 [PANEL] Loading user alerts from backend');
    const userAlertsDiv = document.getElementById('user-alerts');
    if (!userAlertsDiv) return;

    try {
        const resp = await fetch(`${BASE_URL}/api/custom-system/${systemData.systemID}/alerts`, { headers: getAPIHeaders() });
        if (resp.ok) {
            const data = await resp.json();
            const alerts = (data.alerts && data.alerts.length > 0) ? data.alerts : getMockAlerts();
            if (alerts.length > 0) {
                userAlertsDiv.innerHTML = '';
                alerts.slice(0, 10).forEach(alert => {
                    const severityColor = { critical: '#ef4444', warning: '#f97316', info: '#3b82f6' }[alert.severity] || '#ffc107';
                    const item = document.createElement('div');
                    item.className = 'alert-item';
                    item.style.cssText = `background: ${severityColor}18; border-left: 4px solid ${severityColor}; padding: 12px; margin: 8px 0; border-radius: 6px;`;
                    item.innerHTML = `
                        <strong style="color: ${severityColor};">📢 ${alert.severity?.toUpperCase() || 'ALERT'}</strong>
                        <div style="margin-top: 8px; font-size: 14px; color: #ccc;">${alert.message}</div>
                        <div style="font-size: 11px; color: #888; margin-top: 4px;">⏰ ${new Date(alert.created_at).toLocaleString()}</div>
                    `;
                    userAlertsDiv.appendChild(item);
                });
                if (DEBUG) console.log('✅ Loaded', alerts.length, 'backend alerts');
                return;
            }
        }
    } catch (err) { if (DEBUG) console.warn('Backend alerts failed, using localStorage/mocks:', err.message); }

    // Fallback: localStorage
    const alerts = JSON.parse(localStorage.getItem('rescue_broadcast_alerts_' + systemData.systemID) || '[]')
        .concat(JSON.parse(localStorage.getItem('rescue_admin_alerts_' + systemData.systemID) || '[]'));
    if (alerts.length > 0) {
        userAlertsDiv.innerHTML = '';
        alerts.slice(0, 10).forEach(alert => {
            const item = document.createElement('div');
            item.style.cssText = 'background: rgba(255,193,7,0.1); border-left: 4px solid #ffc107; padding: 12px; margin: 8px 0; border-radius: 6px;';
            item.innerHTML = `<strong style="color: #ffc107;">📢 Alert</strong><div style="margin-top:8px;font-size:14px;color:#ccc;">${alert.message}</div><div style="font-size:11px;color:#888;margin-top:4px;">⏰ ${new Date(alert.timestamp || alert.created_at).toLocaleString()}</div>`;
            userAlertsDiv.appendChild(item);
        });
    } else {
        const mockAlerts = getMockAlerts();
        userAlertsDiv.innerHTML = '';
        mockAlerts.slice(0, 10).forEach(alert => {
            const severityColor = { critical: '#ef4444', warning: '#f97316', info: '#3b82f6' }[alert.severity] || '#ffc107';
            const item = document.createElement('div');
            item.className = 'alert-item';
            item.style.cssText = `background: ${severityColor}18; border-left: 4px solid ${severityColor}; padding: 12px; margin: 8px 0; border-radius: 6px;`;
            item.innerHTML = `<strong style="color: ${severityColor};">📢 ${alert.severity.toUpperCase()}</strong><div style="margin-top:8px;font-size:14px;color:#ccc;">${alert.message}</div><div style="font-size:11px;color:#888;margin-top:4px;">⏰ ${new Date(alert.created_at).toLocaleString()}</div>`;
            userAlertsDiv.appendChild(item);
        });
    }
}

async function broadcastAlert() {
    const message = document.getElementById('alert-message').value.trim();

    if (!message) {
        showToast('Please enter an alert message', 'error');
        return;
    }

    if (DEBUG) console.group('📢 [BROADCAST] Sending alert');
    if (DEBUG) console.log('Message:', message);
    console.log('[BROADCAST] Admin button clicked - Broadcasting alert');

    try {
        // Save alert to localStorage for user panel
        const alerts = JSON.parse(localStorage.getItem('rescue_admin_alerts_' + systemData.systemID) || '[]');
        const alertItem = {
            id: 'ALERT-' + Date.now(),
            message,
            timestamp: new Date().toISOString(),
            from: 'Admin',
            read: false
        };
        alerts.push(alertItem);
        localStorage.setItem('rescue_admin_alerts_' + systemData.systemID, JSON.stringify(alerts));

        if (DEBUG) console.log('✅ Alert saved to localStorage');
        console.log('[BROADCAST] Alert saved to localStorage');

        // Try backend broadcast
        try {
            const response = await fetch(`${BASE_URL}/api/custom-system/broadcast-alert`, {
                method: 'POST',
                headers: getAPIHeaders(),
                body: JSON.stringify({
                    systemID: systemData.systemID,
                    message,
                    severity: 'info',
                    timestamp: new Date().toISOString()
                })
            });

            if (response.ok) {
                if (DEBUG) console.log('✅ Alert sent to backend');
                console.log('[BROADCAST] Backend sent successfully');
                showToast('✅ Alert broadcast sent to all users', 'success');
            } else {
                throw new Error(`Backend ${response.status}`);
            }
        } catch (backendErr) {
            if (DEBUG) console.warn('⚠️ Backend broadcast failed:', backendErr.message);
            console.log('[BROADCAST] Backend failed - using localStorage only');
            showToast('⚠️ Alert saved locally (offline mode)', 'warning');
        }

        document.getElementById('alert-message').value = '';

    } catch (error) {
        if (DEBUG) console.error('Broadcast error:', error.message);
        console.log('[BROADCAST] ERROR:', error.message);
        showToast('❌ Failed to broadcast alert', 'error');
    }

    if (DEBUG) console.groupEnd();
}

async function requestAIGuidance() {
    if (DEBUG) console.group('🤖 [AI] Requesting guidance');
    console.log('[AI] Button clicked: Get AI Instructions');

    // Show loading state
    const aiCard = getAdminAIGuidanceCard();
    const originalContent = aiCard?.innerHTML;
    if (aiCard) {
        aiCard.innerHTML = '<h3>AI Guidance Engine</h3><div class="ai-status"><div class="ai-indicator">⏳ Loading...</div><p>Analyzing emergency scenario...</p></div>';
        console.log('[AI] Loading state shown');
    }

    try {
        if (!systemData.systemID) {
            throw new Error('System ID not available');
        }

        if (DEBUG) console.log('Sending request with:', {
            systemID: systemData.systemID,
            orgType: systemData.organizationType
        });
        console.log('[AI] Calling API endpoint: /api/custom-system/generate-guidance');

        const guidance = await fetchGuidanceText('general', systemData.structure);

        if (DEBUG) console.log('✅ AI guidance received');
        console.log('[AI] Response received - Success');

        if (aiCard) {
            aiCard.innerHTML = `
                <h3>AI Guidance Engine</h3>
                <div class="ai-status">
                    <div class="ai-indicator">🟢 Active</div>
                    <p><strong>AI Recommendation:</strong></p>
                    <p>${guidance}</p>
                    <button class="btn-secondary" onclick="requestAIGuidance()">Get AI Instructions</button>
                </div>
            `;
            console.log('[AI] Card updated with AI response');
        }
        showToast('✅ AI guidance generated', 'success');

    } catch (error) {
        if (DEBUG) console.error('Error:', error.message);
        console.log('[AI] ERROR - Falling back to template:', error.message);

        // Fallback to template-based guidance
        const guidance = getEvacuationGuidance('fire');
        if (aiCard) {
            aiCard.innerHTML = `
                <h3>AI Guidance Engine</h3>
                <div class="ai-status">
                    <div class="ai-indicator">🟡 Using Template</div>
                    <p><strong>Standard Response:</strong></p>
                    <p>${guidance}</p>
                    <button class="btn-secondary" onclick="requestAIGuidance()">Get AI Instructions</button>
                </div>
            `;
            console.log('[AI] Card updated with template fallback');
        }
        showToast('⚠️ Using template guidance', 'warning');
    }

    if (DEBUG) console.groupEnd();
}

// Trigger specific emergency type (Fire, Medical, Intruder, Flood)
async function triggerEmergency(type) {
    if (DEBUG) console.group(`🚨 [EMERGENCY] ${type.toUpperCase()} triggered`);
    if (DEBUG) console.log('Button clicked:', type);

    if (!type) {
        showToast('❌ Emergency type not specified', 'error');
        return;
    }

    // Show immediate toast
    showToast(`🚨 ${type.toUpperCase()} EMERGENCY triggered`, 'error');

    try {
        // Get emergency guidance from AI
        const guidance = await fetchEmergencyGuidance(type);
        if (DEBUG) console.log('✅ AI guidance received');

        // Add to admin panel display
        addEmergencyAlert(type, guidance);

        // Save to localStorage for admin polling
        logEmergencyEvent(type, guidance);

        // Show toast with status
        showToast(`${type.toUpperCase()} protocol activated`, 'error');

    } catch (error) {
        if (DEBUG) console.error('Emergency trigger error:', error.message);
        showToast(`❌ ${type.toUpperCase()} protocol error`, 'error');
    }

    if (DEBUG) console.groupEnd();
}

// Fetch AI guidance for specific emergency
async function fetchEmergencyGuidance(emergencyType) {
    if (DEBUG) console.log('🤖 Calling AI for guidance...');

    try {
        const response = await fetch(`${BASE_URL}/api/ai/emergency-guidance`, {
            method: 'POST',
            headers: getAPIHeaders(),
            body: JSON.stringify({
                emergencyType: emergencyType,
                description: `${emergencyType.toUpperCase()} emergency in ${systemData.organizationType}`,
                severity: emergencyType === 'fire' || emergencyType === 'intruder' ? 'critical' : 'high',
                guestContext: {
                    organizationType: systemData.organizationType,
                    location: systemData.location
                },
                language: 'en'
            })
        });

        if (response.ok) {
            const data = await response.json();
            const guidance = data.guidance || '';
            if (DEBUG) console.log('✅ AI API called successfully');
            return guidance;
        } else {
            throw new Error(`API ${response.status}`);
        }
    } catch (error) {
        if (DEBUG) console.warn('⚠️ AI call failed, using fallback:', error.message);
        return getFallbackEmergencyGuidance(emergencyType);
    }
}

// Add emergency alert to admin display
function addEmergencyAlert(type, guidance) {
    const alertDiv = document.getElementById('user-alerts');
    if (alertDiv) {
        const noAlertsMsg = alertDiv.querySelector('.no-alerts');
        if (noAlertsMsg) {
            alertDiv.innerHTML = '';
        }

        const alertItem = document.createElement('div');
        alertItem.className = 'alert-item';
        alertItem.style.borderLeft = '4px solid #ff6b6b';
        alertItem.style.padding = '12px';
        alertItem.style.marginBottom = '8px';
        alertItem.style.backgroundColor = 'rgba(255, 107, 107, 0.1)';
        alertItem.style.borderRadius = '4px';
        alertItem.innerHTML = `
            <strong style="color: #ff6b6b;">🚨 ${type.toUpperCase()} EMERGENCY</strong>
            <div style="margin-top: 8px; font-size: 13px; white-space: pre-wrap; color: #888;">
                ${guidance}
            </div>
            <div style="margin-top: 8px; font-size: 12px; color: #666;">
                ⏰ Triggered at ${new Date().toLocaleTimeString()}
            </div>
        `;
        alertDiv.appendChild(alertItem);

        if (DEBUG) console.log('✅ Emergency alert added to display');
    }
}

// Log emergency event for admin visibility
async function logEmergencyEvent(type, guidance) {
    try {
        const emergencyEvent = {
            id: `${type.toUpperCase()}-` + Date.now(),
            type: type,
            emergencyType: type,
            timestamp: new Date().toISOString(),
            guidance: guidance,
            status: 'active'
        };

        // Save to localStorage as local cache
        const events = JSON.parse(localStorage.getItem('rescue_emergency_events') || '[]');
        events.push(emergencyEvent);
        localStorage.setItem('rescue_emergency_events', JSON.stringify(events));

        // Also persist to backend DB
        if (systemData?.systemID) {
            fetch(`${BASE_URL}/api/custom-system/log-emergency`, {
                method: 'POST',
                headers: getAPIHeaders(),
                body: JSON.stringify({ systemID: systemData.systemID, emergencyType: type, location: systemData.location, timestamp: emergencyEvent.timestamp })
            }).catch(err => { if (DEBUG) console.warn('Backend emergency log error:', err.message); });
        }

        if (DEBUG) console.log('✅ Emergency event logged (localStorage + backend)');
    } catch (err) {
        if (DEBUG) console.warn('Emergency logging error:', err.message);
    }
}

// Get fallback guidance if AI fails
function getFallbackEmergencyGuidance(emergencyType) {
    const guidance = {
        fire: `FIRE EMERGENCY PROTOCOL
1. Alert all staff and occupants
2. Activate fire alarm
3. Evacuate via nearest exit
4. Call Fire: 101
5. Assembly point: Main gate
6. Account for all personnel`,

        medical: `MEDICAL EMERGENCY PROTOCOL
1. Call Medical: 108 or 112
2. Provide location and nature of emergency
3. Move casualty to safe area
4. Provide basic first aid if trained
5. Do not move patient unless in immediate danger
6. Clear area for ambulance access`,

        intruder: `INTRUDER ALERT PROTOCOL
1. Call Police: 100
2. Lock all doors and windows
3. Alert all occupants
4. Move to safe location
5. Do not confront intruder
6. Report to authorities when safe`,

        flood: `FLOOD EMERGENCY PROTOCOL
1. Move to higher ground
2. Turn off electrical appliances
3. Document property damage
4. Call emergency: 100
5. Do not cross flooded areas
6. Wait for all-clear from authorities`
    };

    return guidance[emergencyType] || 'Emergency protocol: Follow evacuation routes and contact emergency services.';
}

async function activateSOS() {
    if (DEBUG) console.group('🆘 [SOS] Activating emergency protocol');
    console.log('[SOS] Step 1: Button clicked');

    showToast('🆘 SOS ACTIVATED - Emergency responders notified', 'error');

    // Wrap geolocation in Promise to make it awaitable
    const getUserLocation = () => new Promise((resolve) => {
        let userLocation = null;

        if (navigator.geolocation) {
            if (DEBUG) console.log('📍 [LOCATION] Requesting geolocation...');
            console.log('[SOS] Step 2: Requesting location');

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    userLocation = {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                        accuracy: position.coords.accuracy
                    };
                    if (DEBUG) console.log('✅ Location obtained:', userLocation);
                    console.log('[SOS] Step 3: Location received');
                    resolve(userLocation);
                },
                (error) => {
                    if (DEBUG) console.warn('⚠️ Geolocation failed:', error.message);
                    console.log('[SOS] Step 3: Location denied/error:', error.message);
                    showToast('💡 Enable location for better emergency response', 'warning');
                    resolve(null);  // Resolve with null instead of rejecting
                },
                { timeout: 5000, enableHighAccuracy: false }
            );
        } else {
            resolve(null);
        }
    });

    // Now we can await the location
    const userLocation = await getUserLocation();

    try {
        // Trigger AI guidance for SOS
        if (DEBUG) console.log('🤖 [AI] Requesting emergency guidance...');
        console.log('[SOS] Step 4: Calling AI API');

        const sosPayload = {
            systemID: systemData.systemID,
            type: 'SOS',
            emergencyType: 'SOS',
            organizationType: systemData.organizationType,
            location: userLocation,
            timestamp: new Date().toISOString()
        };
        if (DEBUG) console.log(`[SOS ISOLATION] SOS activated for systemID: ${sosPayload.systemID} (${systemData.organizationType})`);
        console.log('[SOS PAYLOAD]', sosPayload);

        // Try AI-based guidance with improved prompt
        try {
            const response = await fetch(`${BASE_URL}/api/ai/emergency-guidance`, {
                method: 'POST',
                headers: getAPIHeaders(),
                body: JSON.stringify({
                    emergencyType: 'sos',
                    description: `Critical SOS activated in ${systemData.organizationType} system at ${systemData.location || 'unknown location'}`,
                    severity: 'critical',
                    organizationType: systemData.organizationType,
                    location: systemData.location,
                    userLocation: userLocation,
                    staffCount: systemData.staff?.length || 0,
                    language: 'en',
                    includeSteps: true,
                    format: 'structured'
                })
            });

            if (response.ok) {
                const data = await response.json();
                const guidance = data.guidance || data.response || '';

                if (guidance && guidance.trim().length > 0) {
                    if (DEBUG) console.log('✅ AI guidance received');
                    console.log('[SOS] Step 5: AI response received');

                    // Display guidance clearly
                    displaySOSGuidance(guidance);
                    console.log('[SOS] Step 6: Guidance displayed');

                    // Try voice synthesis
                    if ('speechSynthesis' in window) {
                        speakSOSGuidance(guidance);
                        console.log('[SOS] Step 7: Voice triggered');
                    }
                } else {
                    throw new Error('AI returned empty guidance');
                }
            } else {
                throw new Error(`AI response ${response.status}`);
            }
        } catch (aiErr) {
            if (DEBUG) console.warn('⚠️ AI guidance failed, using fallback:', aiErr.message);
            if (DEBUG) console.log('[SOS] Step 5: AI failed, using enhanced fallback');
            const fallbackGuidance = getFallbackSOSGuidance();
            displaySOSGuidance(fallbackGuidance);
            if (DEBUG) console.log('[SOS] Step 6: Fallback displayed');
            if ('speechSynthesis' in window) {
                // Speak only first 500 characters to avoid long audio
                speakSOSGuidance(fallbackGuidance.substring(0, 500));
                if (DEBUG) console.log('[SOS] Step 7: Voice triggered (fallback)');
            }
        }

        // Log to admin panel via local storage event
        logSOSEvent(sosPayload);
        console.log('[SOS] Step 8: Event logged');

    } catch (error) {
        if (DEBUG) console.error('SOS error:', error.message);
        console.log('[SOS] ERROR:', error.message);
        showToast('❌ SOS processing error - responders still notified', 'error');
    }

    if (DEBUG) console.groupEnd();
}

// Display SOS guidance in modal/overlay
function displaySOSGuidance(guidance) {
    const sosOverlay = document.createElement('div');
    sosOverlay.id = 'sos-guidance-overlay';
    sosOverlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100vh;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        align-items: flex-start;
        justify-content: center;
        z-index: 10000;
        overflow-y: auto;
        padding: 20px 0;
    `;

    const sosCard = document.createElement('div');
    sosCard.style.cssText = `
        background: linear-gradient(135deg, #ff6b6b 0%, #ff4757 100%);
        color: white;
        padding: 40px;
        border-radius: 16px;
        max-width: 700px;
        width: 90%;
        text-align: center;
        box-shadow: 0 10px 40px rgba(0,0,0,0.3);
        margin: 20px auto;
        max-height: 90vh;
        overflow-y: auto;
    `;

    // Clean up asterisks and markdown formatting from guidance
    let cleanGuidance = guidance
        .replace(/\*\*/g, '')  // Remove ** markdown
        .replace(/^\s*-\s/gm, '')  // Remove bullet points
        .trim();

    sosCard.innerHTML = `
        <h1 style="font-size: 48px; margin: 0 0 20px 0;">🆘</h1>
        <h2 style="color: #fff; margin: 0 0 20px 0; font-size: 24px;">EMERGENCY PROTOCOL ACTIVE</h2>
        <div style="background: rgba(0,0,0,0.2); padding: 30px; border-radius: 8px; margin: 20px 0; text-align: left; white-space: pre-wrap; font-size: 13px; line-height: 1.8; overflow-y: auto;">${cleanGuidance}</div>
        <button onclick="document.getElementById('sos-guidance-overlay')?.remove()" style="
            background: white;
            color: #ff6b6b;
            border: none;
            padding: 12px 30px;
            border-radius: 8px;
            cursor: pointer;
            font-weight: bold;
            font-size: 16px;
            margin-top: 15px;
        ">Dismiss</button>
    `;

    sosOverlay.appendChild(sosCard);
    document.body.appendChild(sosOverlay);

    if (DEBUG) console.log('✅ SOS guidance overlay displayed');
}

// Speak SOS guidance using Web Speech API
function speakSOSGuidance(guidance) {
    try {
        if (!('speechSynthesis' in window)) {
            if (DEBUG) console.warn('Speech synthesis not supported');
            return;
        }

        // Cancel any existing speech
        speechSynthesis.cancel();

        // Create utterance
        const utterance = new SpeechSynthesisUtterance(guidance);
        utterance.rate = 0.9;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        utterance.onstart = () => {
            if (DEBUG) console.log('🔊 Voice guidance started');
        };

        utterance.onend = () => {
            if (DEBUG) console.log('✅ Voice guidance completed');
        };

        utterance.onerror = (event) => {
            if (DEBUG) console.warn('Voice synthesis error:', event.error);
        };

        speechSynthesis.speak(utterance);
        if (DEBUG) console.log('🔊 Speaking SOS guidance');

    } catch (err) {
        if (DEBUG) console.error('Speech synthesis error:', err.message);
    }
}

// Fallback SOS guidance with emergency numbers
function getFallbackSOSGuidance() {
    const orgType = systemData.organizationType || 'general';

    const guidanceByType = {
        school: `IMMEDIATE ACTION
Immediately deploy hotel security and a first responder team to locate the guest who activated the SOS. Prioritize pinpointing their location using the hotel's tracking system.

STEPS
1. Locate Guest - Access the hotel's system to determine the precise room or area where the SOS was activated.
2. Dispatch Team - Send a security and/or first aid trained staff member directly to the identified location with a first aid kit and AED.
3. Assess Situation - Evaluate guest condition, provide immediate assistance if trained, contact emergency services if needed.
4. Document Event - Record the incident with timestamp and actions taken.

EMERGENCY NUMBERS:
🚒 Fire: 101
🚔 Police: 100
🚑 Medical: 108 or 112

KEY REMINDERS:
• Keep guest informed of help arrival
• Provide basic comfort measures
• Do not move guest unless in immediate danger
• Stay with guest until help arrives

Your location has been shared with emergency services.`,

        hospital: `IMMEDIATE ACTION
Activate emergency response protocol immediately. Locate patient and assess medical condition. Alert nearest medical staff.

STEPS
1. Locate Patient - Use hospital system to identify exact location of SOS activation.
2. Dispatch Medical Team - Send trained medical personnel with emergency equipment to the location.
3. Assess Condition - Perform medical evaluation, initiate emergency care procedures.
4. Alert Services - Contact emergency services if external support needed.
5. Document Incident - Record patient ID, incident time, actions taken, and treatment provided.

EMERGENCY NUMBERS:
🚒 Fire: 101
🚔 Police: 100
🚑 Medical: 108 or 112

KEY REMINDERS:
• Ensure patient safety and privacy
• Follow hospital emergency protocols
• Provide immediate medical assessment
• Keep communication lines open

Your location has been shared with emergency services.`,

        restaurant: `IMMEDIATE ACTION
Immediately dispatch staff to locate guest. Assess situation and ensure guest safety.

STEPS
1. Locate Guest - Determine guest location using restaurant layout or table number.
2. Assess Situation - Check for medical, security, or other emergency needs.
3. Provide Assistance - Offer immediate help or summon specialized responders.
4. Contact Services - Call emergency services if needed.
5. Support Guest - Provide comfort and information until help arrives.

EMERGENCY NUMBERS:
🚒 Fire: 101
🚔 Police: 100
🚑 Medical: 108 or 112

KEY REMINDERS:
• Remain calm and professional
• Ensure guest privacy
• Keep other guests informed if needed
• Document the incident

Your location has been shared with emergency services.`,

        hostel: `IMMEDIATE ACTION
Locate guest immediately and assess emergency type. Mobilize staff to provide assistance.

STEPS
1. Locate Guest - Find guest in their room or common area using room directory.
2. Assess Emergency - Determine if medical, security, or other type of emergency.
3. Provide First Aid - Offer immediate assistance if trained and guest willing.
4. Contact Services - Call emergency services if needed.
5. Notify Staff - Alert other staff members as appropriate.

EMERGENCY NUMBERS:
🚒 Fire: 101
🚔 Police: 100
🚑 Medical: 108 or 112

KEY REMINDERS:
• Prioritize guest safety
• Respect guest privacy
• Provide comfort and reassurance
• Document incident details

Your location has been shared with emergency services.`,

        general: `IMMEDIATE ACTION
Move to safe location and call emergency services immediately.

STEPS
1. Safety First - Move to a safe location away from danger.
2. Call Emergency - Dial 100 (Police) or 108/112 (Medical) depending on situation.
3. Provide Location - Tell responders your exact location and emergency type.
4. Stay Calm - Provide clear information about the situation.
5. Follow Directions - Wait for responders and follow their instructions.

EMERGENCY NUMBERS:
🚒 Fire: 101
🚔 Police: 100
🚑 Medical: 108 or 112

KEY REMINDERS:
• Remain calm and focused
• Help others if safe to do so
• Gather information for responders
• Do not move injured persons

Your location has been shared with emergency services.`
    };

    return guidanceByType[orgType] || guidanceByType.general;
}

// Log SOS event to backend for admin notification
async function logSOSEvent(sosPayload) {
    try {
        // ISOLATION FIX: Save to systemID-scoped localStorage key
        if (!sosPayload.systemID) {
            console.error('[SOS LOG] ERROR: systemID missing from payload');
            return;
        }

        const systemID = sosPayload.systemID;
        const sosEvents = JSON.parse(localStorage.getItem(`rescue_sos_events_${systemID}`) || '[]');
        sosEvents.push({
            ...sosPayload,
            id: 'SOS-' + Date.now(),
            status: 'active'
        });
        localStorage.setItem(`rescue_sos_events_${systemID}`, JSON.stringify(sosEvents));
        if (DEBUG) console.log(`[SOS ISOLATION] Event saved for system ${systemID} - Total events for this system: ${sosEvents.length}`);
        console.log(`[SOS LOG] Event saved for system ${systemID}`);

        if (DEBUG) console.log('✅ SOS event logged locally');

        // Try backend logging
        await fetch(`${BASE_URL}/api/custom-system/log-emergency`, {
            method: 'POST',
            headers: getAPIHeaders(),
            body: JSON.stringify(sosPayload)
        }).catch(err => {
            if (DEBUG) console.warn('Backend SOS logging failed:', err.message);
        });

    } catch (err) {
        if (DEBUG) console.error('SOS logging error:', err.message);
    }
}

async function askAI() {
    const question = document.getElementById('guidance-input').value.trim();

    if (!question) {
        showToast('Please ask a question', 'error');
        return;
    }

    if (DEBUG) console.group('💬 [AI] User question');
    if (DEBUG) console.log('Question:', question);

    const guidanceDiv = document.getElementById('user-guidance');

    // Show loading state
    if (guidanceDiv.querySelector('p')) {
        guidanceDiv.innerHTML = '';
    }
    const loadingItem = document.createElement('div');
    loadingItem.className = 'plan-item';
    loadingItem.innerHTML = '<strong>⏳ AI is thinking...</strong>';
    guidanceDiv.appendChild(loadingItem);

    try {
        // Try to get response from ResQAI chat API
        const response = await fetch(`${BASE_URL}/api/chat`, {
            method: 'POST',
            headers: getAPIHeaders(),
            body: JSON.stringify({
                message: question,
                context: `Emergency system: ${systemData.organizationType} - ${systemData.organizationName}`,
                systemID: systemData.systemID,
                type: 'safety'
            })
        });

        let responseText = '';
        if (response.ok) {
            const data = await response.json();
            responseText = data.response || data.message || '';
            if (DEBUG) console.log('✅ API response:', responseText);
        } else {
            if (DEBUG) console.warn('API status:', response.status);
        }

        // Use fallback if no response
        if (!responseText) {
            const responses = [
                "Follow evacuation routes posted in your area and reach the assembly point.",
                "Stay calm, help others if possible, and wait for emergency personnel instructions.",
                "If in immediate danger, call 911 or your local emergency number.",
                "Check safety tips for detailed guidance specific to your location."
            ];
            responseText = responses[Math.floor(Math.random() * responses.length)];
            if (DEBUG) console.log('Using fallback response');
        }

        // Display response
        guidanceDiv.innerHTML = '';
        const responseItem = document.createElement('div');
        responseItem.className = 'plan-item';
        responseItem.innerHTML = `<strong>🤖 AI Response:</strong><br>${responseText}`;
        guidanceDiv.appendChild(responseItem);

        document.getElementById('guidance-input').value = '';
        showToast('✅ AI response generated', 'success');

    } catch (error) {
        if (DEBUG) console.error('Error:', error.message);

        // Use fallback local response
        const responses = [
            "Follow evacuation routes posted in your area.",
            "Stay calm and wait for emergency personnel.",
            "Contact your emergency commander immediately."
        ];
        const responseText = responses[Math.floor(Math.random() * responses.length)];

        guidanceDiv.innerHTML = '';
        const responseItem = document.createElement('div');
        responseItem.className = 'plan-item';
        responseItem.innerHTML = `<strong>💬 Response:</strong><br>${responseText}`;
        guidanceDiv.appendChild(responseItem);
        document.getElementById('guidance-input').value = '';
        showToast('⚠️ Using offline response', 'warning');
    }

    if (DEBUG) console.groupEnd();
}

function logoutSystem() {
    showScreen('screen-type-selection');
    systemData = {
        organizationName: "",
        organizationType: "",
        location: "",
        contactEmail: "",
        structure: { floors: 0, rooms: 0, buildings: 0, notes: "" },
        staff: [],
        riskTypes: [],
        systemID: "",
        layoutAnalysis: null,
        createdAt: new Date().toISOString()
    };
    layoutImageBase64 = null;
    layoutImageMimeType = null;
}

function goBack() {
    goToTypeSelection();
}

// ===== DATA PERSISTENCE =====

async function saveSystemData() {
    try {
        const payload = {
            organizationName: systemData.organizationName,
            organizationType: systemData.organizationType,
            location: systemData.location,
            contactEmail: systemData.contactEmail,
            structure: systemData.structure,
            staff: systemData.staff,
            riskTypes: systemData.riskTypes,
            layoutAnalysis: systemData.layoutAnalysis
        };

        if (DEBUG) console.group('📤 [SAVE] Sending to API');
        console.log('[SAVE] API endpoint:', API_BASE_URL + '/create');
        console.log('[SAVE] Payload:', JSON.stringify(payload, null, 2));

        const response = await fetch(API_BASE_URL + '/create', {
            method: 'POST',
            headers: getAPIHeaders(),
            body: JSON.stringify(payload)
        });

        // FIX: READ RESPONSE BODY ONCE ONLY - NEVER TWICE
        let responseText = '';
        try {
            responseText = await response.text();
        } catch (readErr) {
            throw new Error('Failed to read response');
        }

        console.log('[SAVE] Response status:', response.status);
        console.log('[SAVE] Response text:', responseText);

        let responseData = null;
        if (responseText) {
            try {
                responseData = JSON.parse(responseText);
            } catch (parseErr) {
                throw new Error('Response is not JSON');
            }
        }

        if (!response.ok) {
            const error = responseData?.error || `HTTP ${response.status}`;
            throw new Error(error);
        }

        if (!responseData || !responseData.systemID) {
            throw new Error('No systemID in response');
        }

        systemData.systemID = responseData.systemID;
        systemData.userID = responseData.userID;

        console.log('[SAVE] ✅ Got systemID from API:', systemData.systemID);

        // STEP 1: CREATE SYSTEM OBJECT (EXACT STRUCTURE)
        console.log('[SAVE] STEP 1: Creating system object...');
        const newSystem = {
            systemID: systemData.systemID,
            name: systemData.organizationName || 'Unnamed System',
            type: systemData.organizationType || 'custom',
            createdAt: new Date().toISOString(),
            lastUpdated: new Date().toISOString(),
            alertsCount: 0,
            status: 'active',
            layoutAnalysis: systemData.layoutAnalysis,
            data: {
                organizationName: systemData.organizationName,
                organizationType: systemData.organizationType,
                location: systemData.location,
                contactEmail: systemData.contactEmail,
                structure: getCacheSafeStructure(systemData.structure),
                staff: systemData.staff,
                riskTypes: systemData.riskTypes,
                template: systemData.template,
                layoutAnalysis: systemData.layoutAnalysis
            }
        };

        console.log('[SAVE] ✅ STEP 1 COMPLETE: System object created');

        // STEP 2: SAVE TO LOCALSTORAGE (EXACT FLOW)
        console.log('[SAVE] STEP 2: Saving to localStorage...');
        const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        existing.push(newSystem);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));

        console.log('[SAVE] System saved:', newSystem);
        console.log('[SAVE] ✅ STEP 2 COMPLETE: System saved to localStorage');
        console.log('[SAVE] Total systems now:', existing.length);

        if (DEBUG) {
            console.log('✅ System ID:', newSystem.systemID);
            console.log('Count:', existing.length);
            console.groupEnd();
        }

        return { success: true, systemID: newSystem.systemID };

    } catch (error) {
        if (DEBUG) {
            console.group('❌ [SAVE] API Failed - Fallback');
            console.error('Error:', error.message);
            console.groupEnd();
        }

        console.error('[SAVE] ❌ API error:', error.message);

        showToast(`⚠️ Saving locally: ${error.message}`, 'warning');

        // STEP 1: CREATE SYSTEM OBJECT (EXACT STRUCTURE) - FALLBACK
        console.log('[SAVE] FALLBACK STEP 1: Creating system object...');
        const newSystem = {
            systemID: 'sys_' + Date.now(),
            name: systemData.organizationName || 'Unnamed System',
            type: systemData.organizationType || 'custom',
            createdAt: new Date().toISOString(),
            lastUpdated: new Date().toISOString(),
            alertsCount: 0,
            status: 'active',
            layoutAnalysis: systemData.layoutAnalysis,
            data: {
                organizationName: systemData.organizationName,
                organizationType: systemData.organizationType,
                location: systemData.location,
                contactEmail: systemData.contactEmail,
                structure: getCacheSafeStructure(systemData.structure),
                staff: systemData.staff,
                riskTypes: systemData.riskTypes,
                template: systemData.template,
                layoutAnalysis: systemData.layoutAnalysis
            }
        };

        console.log('[SAVE] ✅ FALLBACK STEP 1 COMPLETE: System object created');

        // STEP 2: SAVE TO LOCALSTORAGE (EXACT FLOW) - FALLBACK
        console.log('[SAVE] FALLBACK STEP 2: Saving to localStorage...');
        const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        existing.push(newSystem);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));

        console.log('[SAVE] System saved:', newSystem);
        console.log('[SAVE] ✅ FALLBACK STEP 2 COMPLETE: System saved to localStorage');
        console.log('[SAVE] Total systems now:', existing.length);

        if (DEBUG) {
            console.group('💾 [SAVE] Fallback Success');
            console.log('System ID:', newSystem.systemID);
            console.log('Status: local');
            console.log('Total:', existing.length);
            console.groupEnd();
        }

        return { success: true, systemID: newSystem.systemID, local: true };
    }
}

async function loadSystemData(systemID) {
    try {
        const response = await fetch(`${API_BASE_URL}/${systemID}`, {
            headers: getAPIHeaders()
        });

        if (!response.ok) {
            throw new Error('Failed to load system');
        }

        const data = await response.json();
        systemData = data.system;
        syncLayoutAssetFromStructure(systemData.structure);
        // Restore template if missing
        if (!systemData.template && systemData.organizationType) {
            systemData.template = getTemplate(systemData.organizationType);
        }
        console.log('✅ System loaded from backend:', systemID);

    } catch (error) {
        console.error('❌ Error loading system data:', error);

        // Fallback to localStorage
        const systems = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        const system = systems.find(s => s.systemID === systemID);
        if (system) {
            systemData = system;
            syncLayoutAssetFromStructure(systemData.structure || (system.data && system.data.structure));
            // Restore template if missing (legacy systems)
            if (!systemData.template && systemData.organizationType) {
                systemData.template = getTemplate(systemData.organizationType);
            }
            console.log('✅ System loaded from localStorage:', systemID);
        }
    }
}

// ===== UTILITY FUNCTIONS =====

function isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

// ===== EVENT LISTENERS & INITIALIZATION =====

document.addEventListener('DOMContentLoaded', () => {
    // Check authentication
    const authToken = getAuthToken();
    if (!authToken) {
        console.log('⚠️ User not authenticated. Module will work with localStorage fallback.');
    } else {
        console.log('✅ User authenticated. Using backend API for data storage.');
    }

    // Initialize
    initializeModule();

    console.log('🔧 ResQAI Rescue Builder initialized successfully');
    console.log('📱 Entry point: Your Systems Dashboard');
});

function initializeModule() {
    readLaunchContext();

    if (launchContext.directWizard) {
        selectType(launchContext.selectedType);
    } else if (launchContext.systemID) {
        localStorage.setItem('active_system_id', launchContext.systemID);
        showSystemControlPanel(launchContext.systemID);
    } else {
        // Keep index.html focused on builder runtime; use dedicated dashboard page for default entry.
        window.location.replace('/modules/rescue-builder/pages/custom-builder-dashboard.html');
        return;
    }

    // Handle upload image preview with base64 extraction for AI analysis
    const layoutImage = document.getElementById('layout-image');
    if (layoutImage) {
        layoutImage.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                // Validate file type
                const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
                if (!validTypes.includes(file.type)) {
                    showToast('Please upload a JPG, PNG, or PDF file', 'error');
                    return;
                }
                // Validate file size (max 10MB)
                if (file.size > 10 * 1024 * 1024) {
                    showToast('File too large. Max size is 10MB', 'error');
                    return;
                }
                const reader = new FileReader();
                reader.onload = (event) => {
                    const dataUrl = event.target.result;
                    // Extract base64 and mime type for AI analysis
                    const matches = dataUrl.match(/^data:(.+);base64,(.+)$/);
                    if (matches) {
                        layoutImageMimeType = matches[1];
                        layoutImageBase64 = matches[2];
                        systemData.structure.layoutAsset = {
                            mimeType: layoutImageMimeType,
                            base64: layoutImageBase64,
                            fileName: file.name
                        };
                        console.log('[UPLOAD] Image loaded:', layoutImageMimeType, Math.round(layoutImageBase64.length / 1024) + 'KB');
                    }
                    // Show preview
                    const preview = document.getElementById('upload-preview');
                    if (file.type === 'application/pdf') {
                        preview.innerHTML = '<div style="padding:20px;background:rgba(255,255,255,0.05);border-radius:8px;text-align:center;"><div style="font-size:40px;margin-bottom:8px;">\ud83d\udcc4</div><p style="color:#ccc;font-size:14px;">' + file.name + '</p><p style="color:#888;font-size:12px;">PDF uploaded successfully</p></div>';
                    } else {
                        preview.innerHTML = `<img src="${dataUrl}" alt="Layout preview" />`;
                    }
                    // Show analyze button
                    const analyzeBtn = document.getElementById('btn-analyze-layout');
                    if (analyzeBtn) {
                        analyzeBtn.style.display = 'block';
                        analyzeBtn.textContent = '\ud83d\udd0d Analyze Layout with AI';
                    }
                    // Reset previous analysis
                    const resultsDiv = document.getElementById('layout-analysis-results');
                    const fallbackDiv = document.getElementById('layout-manual-fallback');
                    if (resultsDiv) resultsDiv.style.display = 'none';
                    if (fallbackDiv) fallbackDiv.style.display = 'none';
                    systemData.layoutAnalysis = null;
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // Click on upload box to trigger file input (prevent double-trigger)
    const uploadBox = document.querySelector('.upload-box');
    if (uploadBox) {
        uploadBox.addEventListener('click', (e) => {
            if (e.target.tagName !== 'INPUT') {
                document.getElementById('layout-image').click();
            }
        });
    }

    // Log system info
    console.log('📊 Rescue Builder Info:', {
        API: API_BASE_URL,
        hasAuth: !!getAuthToken(),
        timestamp: new Date().toISOString()
    });
}
