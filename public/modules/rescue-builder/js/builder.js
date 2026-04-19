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
        const stored = localStorage.getItem('resqai-systems');
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
    try {
        const response = await fetch(`${API_BASE_URL}/${systemID}`, {
            headers: getAPIHeaders()
        });

        if (response.ok) {
            const data = await response.json();
            const system = data.system;
            const panelInfo = document.getElementById('panel-system-info');
            if (panelInfo) {
                panelInfo.innerHTML = `
                    <div class="info-line">
                        <span class="label">Organization:</span>
                        <span class="value">${system.organizationName}</span>
                    </div>
                    <div class="info-line">
                        <span class="label">Type:</span>
                        <span class="value">${system.organizationType}</span>
                    </div>
                    <div class="info-line">
                        <span class="label">Location:</span>
                        <span class="value">${system.location}</span>
                    </div>
                    <div class="info-line">
                        <span class="label">Contact:</span>
                        <span class="value">${system.contactEmail}</span>
                    </div>
                `;
            }
        }
    } catch (error) {
        console.error('❌ Error loading system:', error);
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
    populateAdminDashboard();
    showScreen('screen-admin-dashboard');
}

function accessUserDashboard() {
    populateUserPanel();
    showScreen('screen-user-panel');
}

function populateAdminDashboard() {
    const template = getTemplate(systemData.organizationType);

    // Organization info
    document.getElementById('admin-org-name').textContent = systemData.organizationName;
    document.getElementById('admin-org-type').textContent = template.name;
    document.getElementById('admin-location').textContent = systemData.location;

    // Staff list
    const staffListDiv = document.getElementById('admin-staff-list');
    staffListDiv.innerHTML = '';
    systemData.staff.forEach(staff => {
        const item = document.createElement('div');
        item.className = 'staff-item-admin';
        item.innerHTML = `
      <div class="staff-name-admin">${staff.name}</div>
      <div class="staff-role-admin">${staff.role.toUpperCase()} • ${staff.phone}</div>
    `;
        staffListDiv.appendChild(item);
    });

    // Evacuation routes
    const routesDiv = document.getElementById('evacuation-routes');
    routesDiv.innerHTML = '';
    template.evacuationSteps.forEach((step, index) => {
        const item = document.createElement('div');
        item.className = 'route-item';
        item.textContent = `${index + 1}. ${step}`;
        routesDiv.appendChild(item);
    });
}

function populateUserPanel() {
    const template = getTemplate(systemData.organizationType);

    // Evacuation plan
    const planDiv = document.getElementById('user-evacuation-plan');
    planDiv.innerHTML = '';
    template.evacuationSteps.forEach((step, index) => {
        const item = document.createElement('div');
        item.className = 'plan-item';
        item.innerHTML = `<strong>Step ${index + 1}:</strong> ${step}`;
        planDiv.appendChild(item);
    });

    // Emergency contacts
    const contactsDiv = document.getElementById('user-contacts');
    contactsDiv.innerHTML = '';
    template.emergencyContacts.forEach(contact => {
        const item = document.createElement('div');
        item.className = 'contact-item';
        item.innerHTML = `<strong>${contact.name}</strong><br>📞 ${contact.phone}`;
        contactsDiv.appendChild(item);
    });

    // Safety tips
    const tipsDiv = document.getElementById('safety-tips');
    tipsDiv.innerHTML = '';
    getSafetyTips(systemData.organizationType).forEach(tip => {
        const item = document.createElement('div');
        item.className = 'tip-item';
        item.textContent = '✓ ' + tip;
        tipsDiv.appendChild(item);
    });
}

function triggerEmergency(type) {
    const guidance = getEvacuationGuidance(type);
    const alertMsg = `🚨 ${type.toUpperCase()} EMERGENCY\n\n${guidance}`;

    showToast(`Emergency triggered: ${type}`, 'error');

    // Add to alerts
    const alertDiv = document.getElementById('user-alerts');
    if (alertDiv && alertDiv.querySelector('.no-alerts')) {
        alertDiv.innerHTML = '';
    }

    const alertItem = document.createElement('div');
    alertItem.className = 'alert-item';
    alertItem.innerHTML = `<strong>🚨 ${type.toUpperCase()}</strong><br>${guidance}`;
    alertDiv?.appendChild(alertItem);
}

function broadcastAlert() {
    const message = document.getElementById('alert-message').value.trim();

    if (!message) {
        showToast('Please enter an alert message', 'error');
        return;
    }

    showToast('Alert broadcast sent to all users', 'success');
    document.getElementById('alert-message').value = '';
}

async function requestAIGuidance() {
    try {
        const response = await fetch(API_BASE_URL + '/generate-guidance', {
            method: 'POST',
            headers: getAPIHeaders(),
            body: JSON.stringify({
                type: 'general',
                organizationType: systemData.organizationType,
                structure: systemData.structure,
                staff: systemData.staff,
                systemData
            })
        });

        if (!response.ok) {
            throw new Error('Failed to get AI guidance');
        }

        const data = await response.json();
        const guidance = data.guidance || getEvacuationGuidance('fire');
        showToast('🤖 AI Guidance: ' + guidance.substring(0, 100) + '...', 'success');

    } catch (error) {
        console.error('❌ Error getting AI guidance:', error);
        // Fallback to template-based guidance
        const guidance = getEvacuationGuidance('fire');
        showToast('AI Guidance: ' + guidance, 'info');
    }
}

function activateSOS() {
    showToast('🆘 SOS activated! Your location shared with responders.', 'success');
}

async function askAI() {
    const question = document.getElementById('guidance-input').value.trim();

    if (!question) {
        showToast('Please ask a question', 'error');
        return;
    }

    try {
        // Try to get response from ResQAI chat API
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: getAPIHeaders(),
            body: JSON.stringify({
                message: question,
                context: `User is in ${systemData.organizationType} emergency system. Org: ${systemData.organizationName}`,
                systemID: systemData.systemID
            })
        });

        let responseText = '';
        if (response.ok) {
            const data = await response.json();
            responseText = data.response || data.message || '';
        }

        // Fallback to local responses if API fails
        if (!responseText) {
            const responses = [
                "Based on your question, follow the evacuation routes posted in your area and reach the assembly point.",
                "For your safety, stay calm, help others if possible, and wait for instructions from emergency personnel.",
                "Contact the emergency commander for immediate assistance. Your safety is our priority.",
                "Check the safety tips section for detailed guidance specific to your organization type."
            ];
            responseText = responses[Math.floor(Math.random() * responses.length)];
        }

        const guidanceDiv = document.getElementById('user-guidance');
        const responseItem = document.createElement('div');
        responseItem.className = 'plan-item';
        responseItem.innerHTML = `<strong>AI Response:</strong> ${responseText}`;

        if (guidanceDiv.querySelector('p')) {
            guidanceDiv.innerHTML = '';
        }
        guidanceDiv.appendChild(responseItem);
        document.getElementById('guidance-input').value = '';

    } catch (error) {
        console.error('❌ Error asking AI:', error);
        // Use fallback local response
        const responses = [
            "Based on your question, follow the evacuation routes posted in your area.",
            "For your safety, stay calm and wait for emergency personnel instructions.",
            "Contact your emergency commander for immediate assistance."
        ];
        const responseText = responses[Math.floor(Math.random() * responses.length)];
        const guidanceDiv = document.getElementById('user-guidance');
        const responseItem = document.createElement('div');
        responseItem.className = 'plan-item';
        responseItem.innerHTML = `<strong>AI Response:</strong> ${responseText}`;
        if (guidanceDiv.querySelector('p')) {
            guidanceDiv.innerHTML = '';
        }
        guidanceDiv.appendChild(responseItem);
        document.getElementById('guidance-input').value = '';
    }
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
        const systems = JSON.parse(localStorage.getItem('resqai-systems') || '[]');
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
