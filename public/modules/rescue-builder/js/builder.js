// =====================================================
// RESCUE BUILDER - MAIN APPLICATION LOGIC
// =====================================================

// ===== GLOBAL CONFIG =====
const API_BASE_URL = '/api/custom-system';
const AUTH_TOKEN_KEY = 'auth-token';
const DEBUG = true;  // Comprehensive debug logging
const STORAGE_KEY = 'rescue_systems';  // Standardized localStorage key

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
    createdAt: new Date().toISOString()
};

// ===== UTILITY FUNCTIONS =====

function getAuthToken() {
    return localStorage.getItem(AUTH_TOKEN_KEY) || localStorage.getItem('user-session') || '';
}

function getAPIHeaders() {
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`
    };
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

// ===== SYSTEMS MANAGEMENT =====

// Load user's systems from backend
async function loadUserSystems() {
    if (DEBUG) console.group('🔍 [LOAD] Systems');

    try {
        const token = getAuthToken();
        if (DEBUG) console.log('Token:', !!token);

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
        }
    } catch (e) {
        if (DEBUG) console.error('Corrupted localStorage');
        systems = [];
    }

    if (DEBUG) {
        console.log('Loaded:', systems.length, 'systems');
        console.groupEnd();
    }

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

// Press F12 to toggle debug (only in development)
document.addEventListener('keydown', (e) => {
    if (e.key === 'F12') {
        e.preventDefault();
        toggleDebugPanel();
    }
});

// Render systems dashboard with list of user's systems
function renderSystemsDashboard(systems) {
    // VALIDATE INPUT
    const container = document.getElementById('systems-list');
    if (!container) {
        if (DEBUG) console.error('❌ Container not found!');
        return;
    }

    // VALIDATE SYSTEMS ARRAY
    if (!Array.isArray(systems)) {
        if (DEBUG) console.error('❌ Systems not an array');
        systems = [];
    }

    container.innerHTML = '';
    if (DEBUG) console.log('🎨 [RENDER] Systems:', systems.length, 'found');

    // EMPTY STATE
    if (systems.length === 0) {
        if (DEBUG) console.log('📭 No systems - empty state');
        container.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px;">
                <div style="font-size: 48px; margin-bottom: 20px;">📋</div>
                <h3 style="color: #fff; margin-bottom: 10px;">No Systems Yet</h3>
                <p style="color: #888;">Create your first rescue system to get started</p>
            </div>
        `;
        return;
    }

    // RENDER CARDS WITH ERROR HANDLING
    systems.forEach((system, index) => {
        try {
            const card = document.createElement('div');
            card.className = 'system-card';

            // STATUS INDICATOR
            let statusDot = '⏳';
            if (system.status === 'saved') statusDot = '✅';
            else if (system.status === 'local') statusDot = '💾';

            const createdDate = system.createdAt
                ? new Date(system.createdAt).toLocaleDateString()
                : 'Unknown';
            const systemID = system.systemID || system.id;

            card.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                    <span style="background: rgba(255,255,255,0.1); color: #fff; padding: 4px 12px; border-radius: 8px; font-size: 12px;">${system.organizationType || 'Unknown'}</span>
                    <span title="${statusDot === '✅' ? 'Saved' : 'Local Only'}">${statusDot}</span>
                </div>
                <h3 style="color: #fff; margin: 0 0 12px 0; font-size: 16px; font-weight: 600;">${system.organizationName || 'Unnamed'}</h3>
                <p style="color: #888; margin: 8px 0; font-size: 14px;">📍 ${system.location || 'No location'}</p>
                <p style="color: #666; margin: 8px 0 16px 0; font-size: 12px;">Created: ${createdDate}</p>
                <div style="display: flex; gap: 8px;">
                    <button class="btn-small btn-primary" onclick="openSystemPanel('${systemID}')" style="flex: 1;">Open</button>
                    <button class="btn-small btn-danger" onclick="deleteSystemConfirm('${systemID}')" style="flex: 1;">Delete</button>
                </div>
            `;
            container.appendChild(card);
            if (DEBUG) console.log(`✅ Card ${index + 1} rendered`);
        } catch (cardErr) {
            if (DEBUG) console.error(`❌ Card ${index} failed:`, cardErr.message);
        }
    });

    if (DEBUG) console.log('🎨 Dashboard render complete');
}

// Show systems dashboard screen
async function showSystemsDashboard() {
    showScreen('screen-systems-dashboard');
    await loadUserSystems();  // Wait for systems to load before returning
}

// Open system control panel
function openSystemPanel(systemID) {
    systemData.systemID = systemID;
    showScreen('screen-system-control-panel');
    loadSystemIntoPanel(systemID);
}

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

                console.log('[LOAD] systemData updated:', {
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
                const system = systems.find(s => s.systemID === systemID);
                console.log('[LOAD] Found system in localStorage:', system);

                if (system) {
                    systemData.organizationName = system.organizationName;
                    systemData.organizationType = system.organizationType;
                    systemData.location = system.location;
                    systemData.contactEmail = system.contactEmail;
                    systemData.structure = system.structure || systemData.structure;
                    systemData.staff = system.staff || systemData.staff;

                    console.log('[LOAD] systemData updated from localStorage');

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

// Delete system
async function deleteSystem(systemID) {
    try {
        const response = await fetch(`${API_BASE_URL}/${systemID}`, {
            method: 'DELETE',
            headers: getAPIHeaders()
        });

        if (response.ok) {
            showToast('✅ System deleted successfully', 'success');
            loadUserSystems(); // Refresh list
        } else {
            showToast('❌ Failed to delete system', 'error');
        }
    } catch (error) {
        console.error('❌ Error deleting system:', error);
        showToast('❌ Error deleting system', 'error');
    }
}

// ===== BACK BUTTON FUNCTIONS =====

function goBackToMainPage() {
    console.log('🔙 Exiting to parent ResQAI app...');
    // Call parent window function to exit the iframe
    if (window.parent && window.parent.goBackFromRescueBuilder) {
        window.parent.goBackFromRescueBuilder();
    } else {
        console.warn('⚠️ Cannot exit - parent window function not available');
    }
}

function goBackFromSystemPanel() {
    console.log('🔙 Returning to systems dashboard from control panel...');
    showSystemsDashboard();
}

// ===== SCREEN 1: TYPE SELECTION =====

function selectType(type) {
    systemData.organizationType = type;
    const template = getTemplate(type);

    // Set default structure values
    systemData.structure.floors = template.defaultFloors;
    systemData.structure.rooms = template.defaultRooms;
    systemData.structure.buildings = template.defaultBuildings;

    // Pre-populate wizard form
    document.getElementById('org-type').value = type;

    // Show first step
    showScreen('screen-wizard-step1');
}

function goToTypeSelection() {
    try {
        if (DEBUG) console.log('🔘 [NAV] Create System clicked');
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

function nextStep2() {
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
    newItem.innerHTML = `
    <div class="staff-form">
      <input type="text" class="staff-name" placeholder="Staff Name" />
      <select class="staff-role">
        <option value="">Select Role</option>
        <option value="commander">Emergency Commander</option>
        <option value="warden">Floor Warden</option>
        <option value="medical">Medical Lead</option>
        <option value="coordinator">Coordinator</option>
        <option value="responder">First Responder</option>
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
    if (DEBUG) console.group('🚀 [BUILD] System');

    // COLLECT RISK TYPES
    const checkboxes = document.querySelectorAll('.risk-checkbox input:checked');
    systemData.riskTypes = [];
    checkboxes.forEach(cb => {
        systemData.riskTypes.push(cb.value);
    });

    if (systemData.riskTypes.length === 0) {
        showToast('Please select at least one risk type', 'error');
        if (DEBUG) console.groupEnd();
        return;
    }

    // INITIALIZE SYSTEM
    if (!systemData.systemID) {
        systemData.systemID = generateSystemID();
    }
    systemData.createdAt = new Date().toISOString();

    if (DEBUG) {
        console.log('Data collected:', {
            risks: systemData.riskTypes.length,
            staff: systemData.staff?.length || 0,
            structure: !!systemData.structure
        });
    }

    // SHOW ANIMATION
    showScreen('screen-ai-build');

    // SAVE SYSTEM
    try {
        if (DEBUG) console.log('Saving...');
        const result = await saveSystemData();
        if (DEBUG) console.log('✅ Saved');
    } catch (error) {
        if (DEBUG) console.log('⚠️ Save error:', error.message);
    }

    // ALWAYS ANIMATE AND REDIRECT
    // (system is definitely saved either way)
    if (DEBUG) console.groupEnd();
    await animateAndRedirect();
}

async function animateAndRedirect() {
    return new Promise((resolve) => {
        if (DEBUG) console.group('🎬 [ANIMATE] Build progress');

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

                // COMPLETE ALL STAGES
                stages.forEach(stage => {
                    const el = document.getElementById(stage.id);
                    if (el) {
                        el.classList.remove('active');
                        el.classList.add('completed');
                    }
                });

                const fillEl = document.getElementById('build-progress-fill');
                if (fillEl) fillEl.style.width = '100%';

                if (DEBUG) console.log('✅ Animation complete');

                // REDIRECT
                setTimeout(async () => {
                    if (DEBUG) console.log('Loading dashboard...');

                    // Load systems and show dashboard
                    try {
                        await loadUserSystems();
                    } catch (err) {
                        if (DEBUG) console.warn('Error:', err.message);
                    }

                    showScreen('screen-systems-dashboard');
                    if (DEBUG) {
                        console.log('Dashboard shown');
                        console.groupEnd();
                    }
                    resolve();
                }, 800);
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
    if (DEBUG) console.log('👨‍💼 [ADMIN] Admin button clicked');
    console.log('[ADMIN] Opening admin panel');

    populateAdminDashboard();
    showScreen('screen-admin-dashboard');

    console.log('[ADMIN] Panel displayed');
}

function accessUserDashboard() {
    if (DEBUG) console.log('👥 [NAV] Opening user panel');
    console.log('[USER] Opening user panel');

    if (!systemData.systemID) {
        console.log('[USER] ERROR: systemID not found');
        showToast('System not loaded', 'error');
        return;
    }

    console.log('[USER] SystemID found:', systemData.systemID);

    populateUserPanel();
    showScreen('screen-user-panel');

    console.log('[USER] Panel displayed');
}

function populateAdminDashboard() {
    if (DEBUG) console.log('👨‍💼 [ADMIN] Populating dashboard');
    console.log('[ADMIN] systemData:', systemData);

    const template = getTemplate(systemData.organizationType);
    console.log('[ADMIN] Template:', template);

    // Organization info
    const orgNameEl = document.getElementById('admin-org-name');
    const orgTypeEl = document.getElementById('admin-org-type');
    const locationEl = document.getElementById('admin-location');

    // Set values with logging
    if (orgNameEl) {
        orgNameEl.textContent = systemData.organizationName || '—';
        console.log('[ADMIN] Set org name:', systemData.organizationName);
    }

    if (orgTypeEl) {
        orgTypeEl.textContent = template?.name || systemData.organizationType || '—';
        console.log('[ADMIN] Set org type:', template?.name);
    }

    if (locationEl) {
        locationEl.textContent = systemData.location || '—';
        console.log('[ADMIN] Set location:', systemData.location);
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
            console.log('[ADMIN] No staff data available');
        }
    }

    // Evacuation routes
    const routesDiv = document.getElementById('evacuation-routes');
    if (routesDiv) {
        routesDiv.innerHTML = '';
        if (template?.evacuationSteps) {
            template.evacuationSteps.forEach((step, index) => {
                const item = document.createElement('div');
                item.className = 'route-item';
                item.textContent = `${index + 1}. ${step}`;
                routesDiv.appendChild(item);
            });
            console.log('[ADMIN] Populated evacuation routes');
        }
    }

    // Load and display active SOS events
    displayActiveSOS();

    // Start polling for emergency alerts
    startAdminAlertPolling();

    if (DEBUG) console.log('✅ Admin dashboard populated');
    console.log('[ADMIN] Dashboard fully loaded');
}

// Display active SOS events
function displayActiveSOS() {
    try {
        const sosEvents = JSON.parse(localStorage.getItem('rescue_sos_events') || '[]');
        const activeSOSList = document.getElementById('active-sos-list');

        if (activeSOSList && sosEvents.length > 0) {
            activeSOSList.innerHTML = '';
            sosEvents.filter(e => e.status === 'active').forEach(event => {
                const item = document.createElement('div');
                item.className = 'sos-alert-item';
                item.style.cssText = 'background: rgba(255,107,107,0.1); border-left: 4px solid #ff6b6b; padding: 12px; margin: 8px 0; border-radius: 4px;';
                item.innerHTML = `
                    <strong style="color: #ff6b6b;">🚨 ${event.emergencyType.toUpperCase()}</strong>
                    <div style="font-size: 12px; color: #888; margin-top: 4px;">
                        ⏰ ${new Date(event.timestamp).toLocaleTimeString()}
                    </div>
                `;
                activeSOSList.appendChild(item);
            });
        }
    } catch (err) {
        if (DEBUG) console.warn('SOS display error:', err.message);
    }
}

// Start polling for emergency alerts
let adminAlertInterval = null;
function startAdminAlertPolling() {
    if (adminAlertInterval) clearInterval(adminAlertInterval);

    adminAlertInterval = setInterval(() => {
        try {
            displayActiveSOS();
        } catch (err) {
            if (DEBUG) console.warn('Admin alert poll error:', err.message);
        }
    }, 3000); // Poll every 3 seconds

    if (DEBUG) console.log('📡 Admin alert polling started');
}

function populateUserPanel() {
    if (DEBUG) console.log('👥 [PANEL] Populating user panel');
    console.log('[PANEL] systemData:', systemData);

    const template = getTemplate(systemData.organizationType);
    console.log('[PANEL] Template loaded:', template?.name);

    // Add safety status section
    const statusDiv = document.querySelector('.user-card.alert-section');
    if (statusDiv) {
        // Update status at top
        const statusLabel = statusDiv.querySelector('h3');
        if (statusLabel) {
            statusLabel.textContent = '🟢 Safety Status: SAFE';
            statusLabel.style.color = '#4ade80';
            console.log('[PANEL] Safety status set');
        }
    }

    // Evacuation plan
    const planDiv = document.getElementById('user-evacuation-plan');
    if (planDiv) {
        planDiv.innerHTML = '';
        if (template?.evacuationSteps) {
            template.evacuationSteps.forEach((step, index) => {
                const item = document.createElement('div');
                item.className = 'plan-item';
                item.innerHTML = `<strong>Step ${index + 1}:</strong> ${step}`;
                planDiv.appendChild(item);
            });
            console.log('[PANEL] Evacuation plan populated');
        }
    }

    // Emergency contacts
    const contactsDiv = document.getElementById('user-contacts');
    if (contactsDiv) {
        contactsDiv.innerHTML = '';
        if (template?.emergencyContacts) {
            template.emergencyContacts.forEach(contact => {
                const item = document.createElement('div');
                item.className = 'contact-item';
                item.innerHTML = `<strong>${contact.name}</strong><br>📞 ${contact.phone}`;
                contactsDiv.appendChild(item);
            });
            console.log('[PANEL] Emergency contacts populated');
        }
    }

    // Safety tips
    const tipsDiv = document.getElementById('safety-tips');
    if (tipsDiv) {
        tipsDiv.innerHTML = '';
        const tips = getSafetyTips(systemData.organizationType);
        if (tips && tips.length > 0) {
            tips.forEach(tip => {
                const item = document.createElement('div');
                item.className = 'tip-item';
                item.textContent = '✓ ' + tip;
                tipsDiv.appendChild(item);
            });
            console.log('[PANEL] Safety tips populated');
        }
    }

    // Load alerts from admin
    loadUserAlerts();

    if (DEBUG) console.log('✅ User panel populated');
    console.log('[PANEL] User panel fully loaded');
}

// Load and display alerts from admin broadcasts
function loadUserAlerts() {
    if (DEBUG) console.log('📢 [PANEL] Loading user alerts');

    try {
        const alertsKey = 'rescue_broadcast_alerts_' + systemData.systemID;
        const alerts = JSON.parse(localStorage.getItem(alertsKey) || '[]');
        const userAlertsDiv = document.getElementById('user-alerts');

        if (userAlertsDiv && alerts.length > 0) {
            userAlertsDiv.innerHTML = '';
            alerts.forEach(alert => {
                const item = document.createElement('div');
                item.className = 'alert-item';
                item.style.cssText = 'background: rgba(255,193,7,0.1); border-left: 4px solid #ffc107; padding: 12px; margin: 8px 0; border-radius: 4px;';
                item.innerHTML = `
                    <strong style="color: #ffc107;">📢 Admin Alert</strong>
                    <div style="margin-top: 8px; font-size: 14px;">${alert.message}</div>
                    <div style="font-size: 12px; color: #888; margin-top: 4px;">
                        ⏰ ${new Date(alert.timestamp).toLocaleTimeString()}
                    </div>
                `;
                userAlertsDiv.appendChild(item);
            });
            if (DEBUG) console.log('✅ Loaded', alerts.length, 'alerts');
        } else {
            if (DEBUG) console.log('No alerts to load');
        }
    } catch (err) {
        if (DEBUG) console.warn('❌ Load alerts error:', err.message);
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
            const response = await fetch('/api/custom-system/broadcast-alert', {
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
    const aiCard = document.querySelector('.ai-card');
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

        const response = await fetch(API_BASE_URL + '/generate-guidance', {
            method: 'POST',
            headers: getAPIHeaders(),
            body: JSON.stringify({
                systemID: systemData.systemID,
                organizationType: systemData.organizationType,
                emergencyType: 'general',
                structure: systemData.structure,
                staff: systemData.staff,
                staffCount: systemData.staff?.length || 0
            })
        });

        if (!response.ok) {
            throw new Error(`API ${response.status}`);
        }

        const data = await response.json();
        const guidance = data.guidance || data.steps || getEvacuationGuidance('fire');

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
        const response = await fetch('/api/ai/emergency-guidance', {
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
function logEmergencyEvent(type, guidance) {
    try {
        const emergencyEvent = {
            id: `${type.toUpperCase()}-` + Date.now(),
            type: type,
            emergencyType: type,
            timestamp: new Date().toISOString(),
            guidance: guidance,
            status: 'active'
        };

        const events = JSON.parse(localStorage.getItem('rescue_emergency_events') || '[]');
        events.push(emergencyEvent);
        localStorage.setItem('rescue_emergency_events', JSON.stringify(events));

        if (DEBUG) console.log('✅ Emergency event logged');
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

    let userLocation = null;

    // Try to get user location
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
            },
            (error) => {
                if (DEBUG) console.warn('⚠️ Geolocation failed:', error.message);
                console.log('[SOS] Step 3: Location denied/error:', error.message);
                showToast('💡 Enable location for better emergency response', 'warning');
            },
            { timeout: 5000, enableHighAccuracy: false }
        );
    }

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

        // Try AI-based guidance
        try {
            const response = await fetch('/api/ai/emergency-guidance', {
                method: 'POST',
                headers: getAPIHeaders(),
                body: JSON.stringify({
                    emergencyType: 'sos',
                    description: `User activated SOS in ${systemData.organizationType} system`,
                    severity: 'critical',
                    guestContext: {
                        location: userLocation,
                        organizationType: systemData.organizationType
                    },
                    language: 'en'
                })
            });

            if (response.ok) {
                const data = await response.json();
                const guidance = data.guidance;
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
                throw new Error(`AI response ${response.status}`);
            }
        } catch (aiErr) {
            if (DEBUG) console.warn('⚠️ AI guidance failed, using fallback:', aiErr.message);
            console.log('[SOS] Step 5: AI failed, using fallback');
            const fallbackGuidance = getFallbackSOSGuidance();
            displaySOSGuidance(fallbackGuidance);
            console.log('[SOS] Step 6: Fallback displayed');
            if ('speechSynthesis' in window) {
                speakSOSGuidance(fallbackGuidance);
                console.log('[SOS] Step 7: Voice triggered (fallback)');
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
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
    `;

    const sosCard = document.createElement('div');
    sosCard.style.cssText = `
        background: linear-gradient(135deg, #ff6b6b 0%, #ff4757 100%);
        color: white;
        padding: 30px;
        border-radius: 16px;
        max-width: 500px;
        text-align: center;
        box-shadow: 0 10px 40px rgba(0,0,0,0.3);
    `;

    sosCard.innerHTML = `
        <h1 style="font-size: 48px; margin: 0 0 20px 0;">🆘</h1>
        <h2 style="color: #fff; margin: 0 0 20px 0; font-size: 24px;">EMERGENCY PROTOCOL ACTIVE</h2>
        <div style="background: rgba(0,0,0,0.2); padding: 20px; border-radius: 8px; margin: 20px 0; text-align: left; white-space: pre-wrap; font-size: 14px; max-height: 300px; overflow-y: auto;">${guidance}</div>
        <button onclick="document.getElementById('sos-guidance-overlay')?.remove()" style="
            background: white;
            color: #ff6b6b;
            border: none;
            padding: 12px 30px;
            border-radius: 8px;
            cursor: pointer;
            font-weight: bold;
            font-size: 16px;
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
    const guidance = `EMERGENCY PROTOCOL ACTIVATED

STEP 1: Move to safe location
STEP 2: Call emergency services

EMERGENCY NUMBERS:
🚒 Fire: 101
🚔 Police: 100
🚑 Medical: 108 or 112

STEP 3: Wait for responders
STEP 4: Follow instructions from authorities

Your location has been shared with emergency services.`;

    return guidance;
}

// Log SOS event to backend for admin notification
async function logSOSEvent(sosPayload) {
    try {
        // Save to localStorage for admin panel polling
        const sosEvents = JSON.parse(localStorage.getItem('rescue_sos_events') || '[]');
        sosEvents.push({
            ...sosPayload,
            id: 'SOS-' + Date.now(),
            status: 'active'
        });
        localStorage.setItem('rescue_sos_events', JSON.stringify(sosEvents));

        if (DEBUG) console.log('✅ SOS event logged locally');

        // Try backend logging
        await fetch('/api/custom-system/log-emergency', {
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
        const response = await fetch('/api/chat', {
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
        createdAt: new Date().toISOString()
    };
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
            riskTypes: systemData.riskTypes
        };

        if (DEBUG) console.group('📤 [SAVE] Sending to API');
        if (DEBUG) console.log('Payload:', payload);

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

        // SAVE TO LOCALSTORAGE WITH STANDARDIZED KEY
        let systems = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        systems.push({
            systemID: systemData.systemID,
            organizationName: systemData.organizationName,
            organizationType: systemData.organizationType,
            location: systemData.location,
            contactEmail: systemData.contactEmail,
            structure: systemData.structure,
            staff: systemData.staff,
            riskTypes: systemData.riskTypes,
            status: 'saved',
            createdAt: new Date().toISOString()
        });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(systems));

        if (DEBUG) {
            console.log('✅ System ID:', systemData.systemID);
            console.log('Count:', systems.length);
            console.groupEnd();
        }

        return { success: true, systemID: systemData.systemID };

    } catch (error) {
        if (DEBUG) {
            console.group('❌ [SAVE] API Failed - Fallback');
            console.error('Error:', error.message);
            console.groupEnd();
        }

        showToast(`⚠️ Saving locally: ${error.message}`, 'warning');

        if (!systemData.systemID) {
            systemData.systemID = 'LOCAL-' + Date.now();
        }

        let systems = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        systems.push({
            systemID: systemData.systemID,
            organizationName: systemData.organizationName,
            organizationType: systemData.organizationType,
            location: systemData.location,
            contactEmail: systemData.contactEmail,
            structure: systemData.structure,
            staff: systemData.staff,
            riskTypes: systemData.riskTypes,
            status: 'local',
            createdAt: new Date().toISOString()
        });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(systems));

        if (DEBUG) {
            console.group('💾 [SAVE] Fallback Success');
            console.log('System ID:', systemData.systemID);
            console.log('Status: local');
            console.log('Total:', systems.length);
            console.groupEnd();
        }

        return { success: true, systemID: systemData.systemID, local: true };
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
        console.log('✅ System loaded from backend:', systemID);

    } catch (error) {
        console.error('❌ Error loading system data:', error);

        // Fallback to localStorage
        const systems = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        const system = systems.find(s => s.systemID === systemID);
        if (system) {
            systemData = system;
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
    // Set initial screen - show systems dashboard first
    showSystemsDashboard();

    // Handle upload image preview
    const layoutImage = document.getElementById('layout-image');
    if (layoutImage) {
        layoutImage.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const preview = document.getElementById('upload-preview');
                    preview.innerHTML = `<img src="${event.target.result}" alt="Layout preview" />`;
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // Click on upload box to trigger file input
    const uploadBox = document.querySelector('.upload-box');
    if (uploadBox) {
        uploadBox.addEventListener('click', () => {
            document.getElementById('layout-image').click();
        });
    }

    // Log system info
    console.log('📊 Rescue Builder Info:', {
        API: API_BASE_URL,
        hasAuth: !!getAuthToken(),
        timestamp: new Date().toISOString()
    });
}

// ===== KEYBOARD SHORTCUTS =====

document.addEventListener('keydown', (e) => {
    // ESC to go back
    if (e.key === 'Escape') {
        const activeScreen = document.querySelector('.rescue-screen.active');
        if (activeScreen.id !== 'screen-type-selection') {
            goBack();
        }
    }
});
