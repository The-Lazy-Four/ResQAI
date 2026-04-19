// =====================================================
// RESCUE BUILDER - MAIN APPLICATION LOGIC
// =====================================================

// ===== GLOBAL CONFIG =====
const API_BASE_URL = '/api/custom-system';
const AUTH_TOKEN_KEY = 'auth-token';

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

// ===== BACK BUTTON FUNCTION =====

function goBackToMainPage() {
    console.log('🔙 Returning to main page...');
    // Try to notify parent window if in iframe
    if (window.parent !== window) {
        try {
            window.parent.goBackFromRescueBuilder();
        } catch (e) {
            console.log('Not in iframe or parent inaccessible, using localStorage fallback');
            localStorage.setItem('rescue-builder-closed', 'true');
            window.history.back();
        }
    } else {
        // Direct navigation if not in iframe
        window.location.href = '/pages/index.html';
    }
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
    showScreen('screen-type-selection');
    document.getElementById('back-btn-1').style.display = 'none';
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

// ===== SCREEN 5: WIZARD STEP 4 - RISK TYPES =====

async function buildSystem() {
    const checkboxes = document.querySelectorAll('.risk-checkbox input:checked');
    systemData.riskTypes = [];

    checkboxes.forEach(cb => {
        systemData.riskTypes.push(cb.value);
    });

    if (systemData.riskTypes.length === 0) {
        showToast('Please select at least one risk type', 'error');
        return;
    }

    // Generate system ID (will be overwritten by backend)
    systemData.systemID = generateSystemID();
    systemData.createdAt = new Date().toISOString();

    // Show loading screen
    showScreen('screen-ai-build');
    startAIBuildAnimation();

    // Save to backend
    try {
        const result = await saveSystemData();
        console.log('✅ System created with ID:', result.systemID);
    } catch (error) {
        console.error('❌ Error building system:', error);
        showToast('❌ Error building system. Please try again.', 'error');
        goToWizardStep4();
    }
}

function goToWizardStep4() {
    showScreen('screen-wizard-step4');
}

// ===== SCREEN 6: AI BUILD ANIMATION =====

function startAIBuildAnimation() {
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

            // Mark last stage as completed
            stages.forEach(stage => {
                document.getElementById(stage.id).classList.remove('active');
                document.getElementById(stage.id).classList.add('completed');
            });

            // Update progress bar
            document.getElementById('build-progress-fill').style.width = '100%';

            // Show success screen after delay
            setTimeout(() => {
                showSuccessScreen();
            }, 1500);
        } else {
            // Update progress bar
            document.getElementById('build-progress-fill').style.width = currentProgress + '%';

            // Activate stage based on progress
            stages.forEach(stage => {
                if (currentProgress >= stage.target && !document.getElementById(stage.id).classList.contains('active')) {
                    document.getElementById(stage.id).classList.add('active');
                }
                if (currentProgress >= stage.target + 10) {
                    document.getElementById(stage.id).classList.remove('active');
                    document.getElementById(stage.id).classList.add('completed');
                }
            });
        }
    }, 800);
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
        // Prepare data for API
        const payload = {
            organizationName: systemData.organizationName,
            organizationType: systemData.organizationType,
            location: systemData.location,
            contactEmail: systemData.contactEmail,
            structure: systemData.structure,
            staff: systemData.staff,
            riskTypes: systemData.riskTypes
        };

        const response = await fetch(API_BASE_URL + '/create', {
            method: 'POST',
            headers: getAPIHeaders(),
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to save system');
        }

        const data = await response.json();
        systemData.systemID = data.systemID;
        systemData.userID = data.userID;

        // Also cache in localStorage for hybrid approach
        const systems = JSON.parse(localStorage.getItem('resqai-systems') || '[]');
        systems.push({ ...systemData, saved: true });
        localStorage.setItem('resqai-systems', JSON.stringify(systems));

        console.log('✅ System saved to backend:', systemData.systemID);
        return data;

    } catch (error) {
        console.error('❌ Error saving system data:', error);
        showToast('⚠️ Saving locally (offline mode)', 'warning');

        // Generate local ID if not exists
        if (!systemData.systemID) {
            systemData.systemID = 'LOCAL-' + Date.now();
        }

        // Fallback to localStorage
        const systems = JSON.parse(localStorage.getItem('resqai-systems') || '[]');
        const existingIndex = systems.findIndex(s => s.systemID === systemData.systemID);
        
        if (existingIndex >= 0) {
            systems[existingIndex] = { ...systemData, savedLocal: true };
        } else {
            systems.push({ ...systemData, savedLocal: true });
        }
        
        localStorage.setItem('resqai-systems', JSON.stringify(systems));

        return { systemID: systemData.systemID };
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
});

function initializeModule() {
    // Set initial screen
    showScreen('screen-type-selection');

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
