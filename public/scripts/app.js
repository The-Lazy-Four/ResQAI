// ============================================
// ResQAI - Main App Logic
// ============================================

// ==================== API CONFIGURATION ====================
// Use relative paths for flexibility across localhost and production (Render)
// This will work on both http://localhost:3000 and https://your-app.onrender.com
const API_BASE_URL = '/api';

// Debugging - log the actual origin in console
console.log('🌐 [API Config] Using base URL:', window.location.origin + API_BASE_URL);
console.log('🌐 [API Config] Environment:', window.location.hostname);

// ==================== TAB NAVIGATION ====================
function showTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });

    // Show selected tab
    document.getElementById(tabName).classList.add('active');

    // Update active nav link
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`)?.classList.add('active');

    // Initialize map when switching to map tab
    if (tabName === 'map') {
        setTimeout(initMap, 100);
    }

    // Close mobile nav
    document.getElementById('navMenu').classList.remove('active');
}

function toggleNav() {
    const navMenu = document.getElementById('navMenu');
    const navToggle = document.querySelector('.nav-toggle');
    navMenu.classList.toggle('active');
    navToggle.classList.toggle('active');
}

// ==================== EMERGENCY FORM ====================
document.getElementById('emergencyForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const description = document.getElementById('description').value.trim();
    const location = document.getElementById('location').value.trim();
    const severity = document.querySelector('input[name="severity"]:checked')?.value || 'high';
    const imageFile = document.getElementById('imageUpload').files[0];

    if (!description) {
        showToast('Please describe the emergency', 'error');
        return;
    }

    if (!location) {
        showToast('Please provide a location', 'error');
        return;
    }

    showLoading(true);

    try {
        const formData = new FormData();
        formData.append('description', description);
        formData.append('location', location);
        formData.append('severity', severity);
        if (imageFile) {
            formData.append('image', imageFile);
        }

        const response = await fetch(`${API_BASE_URL}/emergencies`, {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (response.ok) {
            showToast('Emergency report submitted successfully!', 'success');

            if (typeof window.startImmediateEmergencyGuidance === 'function') {
                window.startImmediateEmergencyGuidance({
                    id: data.incident?.id,
                    type: data.incident?.classified_type || severity,
                    title: data.incident?.description || description,
                    description,
                    location: data.incident?.location || location,
                    severity: data.incident?.severity || severity
                }).catch((error) => {
                    console.warn('⚠️ Immediate emergency guidance failed:', error);
                });
            }

            document.getElementById('emergencyForm').reset();
            document.getElementById('imagePreview').innerHTML = '';
            document.getElementById('fileName').textContent = 'Click to upload or drag & drop';

            // Reload dashboard
            setTimeout(() => {
                showTab('dashboard');
                loadIncidents();
            }, 1000);
        } else {
            showToast(data.message || 'Error submitting report', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Failed to submit report. Check connection.', 'error');
    } finally {
        showLoading(false);
    }
});

// ==================== IMAGE UPLOAD ====================
function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Update file name
    document.getElementById('fileName').textContent = file.name;

    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => {
        const preview = document.getElementById('imagePreview');
        preview.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
    };
    reader.readAsDataURL(file);
}

// ==================== LOCATION DETECTION ====================
function getLocation() {
    showLoading(true);

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                // For demo, convert to approximate address
                document.getElementById('location').value = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
                showToast('Location detected successfully!', 'success');
                showLoading(false);
            },
            (error) => {
                console.error('Geolocation error:', error);
                showToast('Could not detect location. Please enter manually.', 'error');
                showLoading(false);
            }
        );
    } else {
        showToast('Geolocation not supported by this browser', 'error');
        showLoading(false);
    }
}

// ==================== UTILITY FUNCTIONS ====================

function showLoading(show) {
    const spinner = document.getElementById('loadingSpinner');
    if (!spinner) {
        console.warn('⚠️ Loading spinner element not found');
        return;
    }

    if (show) {
        spinner.classList.remove('hidden');
    } else {
        spinner.classList.add('hidden');
    }
}

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type}`;

    setTimeout(() => {
        toast.className = 'toast';
    }, 3000);
}

function showNotification(message, type = 'info') {
    // Create a new notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type} notification-enter`;
    notification.innerHTML = `
        <div class="notification-content">
            ${message}
        </div>
        <button onclick="this.parentElement.remove()" class="notification-close">
            <i class="fas fa-times"></i>
        </button>
    `;

    // Add to top of page
    const container = document.body;
    container.insertBefore(notification, container.firstChild);

    // Auto remove after 5 seconds
    setTimeout(() => {
        notification.classList.remove('notification-enter');
        notification.classList.add('notification-exit');
        setTimeout(() => notification.remove(), 300);
    }, 5000);
}

function formatDate(date) {
    const now = new Date();
    const diff = now - new Date(date);
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;

    return new Date(date).toLocaleDateString();
}

function getEmergencyIcon(type) {
    const icons = {
        fire: '🔥',
        flood: '💧',
        medical: '🚑',
        accident: '🚗'
    };
    return icons[type] || '⚠️';
}

// ==================== INDIA LOCALIZATION ====================

function makeCall(number) {
    const helplines = {
        '112': 'National Emergency Helpline',
        '101': 'Fire Brigade',
        '108': 'Ambulance Service',
        '100': 'Police'
    };

    showToast(`📞 ${helplines[number]} (${number}) - Please call directly for emergency assistance!`, 'warning');

    // In real app, use tel:// protocol
    // window.location.href = `tel:+91${number}`;
}

function changeLanguage() {
    const lang = document.getElementById('languageSelect').value;

    if (lang === 'hi') {
        showToast('🇮🇳 आपातकालीन सहायता के लिए 112 पर कॉल करें | Hindi support coming soon!', 'info');
    } else {
        showToast('Language changed to English', 'info');
    }
}

// ==================== ECHOPLUS MODULE INTEGRATION ====================

/**
 * Initialize global APP_STATE for module communication
 */
window.APP_STATE = window.APP_STATE || {
    mode: null,
    userLocation: null,
    language: 'en',
    timestamp: Date.now()
};

/**
 * Load EcoPlus Hotel Emergency Module
 */
function loadEcoPlusModule(event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }

    console.log('🏨 Loading EcoPlus Hotel Emergency Module...');

    try {
        // Hide the selection screen
        const selectionScreen = document.getElementById('selectionScreen');
        if (selectionScreen) {
            selectionScreen.classList.remove('active');
            selectionScreen.classList.add('exit-left');
        }

        // Create an iframe to load EcoPlus in isolation
        const iframeContainer = document.createElement('div');
        iframeContainer.id = 'echo-plus-iframe-container';
        iframeContainer.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 5100;
            background: #0a0a0a;
            animation: fadeInModule 0.5s ease-out;
        `;

        // Add fade-in animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes fadeInModule {
                from {
                    opacity: 0;
                    background: rgba(10, 10, 10, 0);
                }
                to {
                    opacity: 1;
                    background: rgba(10, 10, 10, 1);
                }
            }
        `;
        if (!document.querySelector('style[data-animation="fadeInModule"]')) {
            style.setAttribute('data-animation', 'fadeInModule');
            document.head.appendChild(style);
        }

        const iframe = document.createElement('iframe');
        iframe.id = 'echo-plus-module-frame';
        iframe.src = '/modules/echo-plus/wrapper.html';
        iframe.title = 'EcoPlus Hotel Emergency Module';
        iframe.style.cssText = `
            width: 100%;
            height: 100%;
            border: none;
            display: block;
        `;

        iframe.onload = () => {
            console.log('✅ EcoPlus Module Frame Loaded Successfully');
            showToast('🏨 EcoPlus Hotel Module Loaded', 'success');

            // Log the event
            if (window.APP_STATE) {
                window.APP_STATE.lastModuleLoaded = 'echo-plus';
                window.APP_STATE.moduleLoadTime = Date.now();
            }
        };

        iframe.onerror = (error) => {
            console.error('❌ Failed to load EcoPlus Module:', error);
            showToast('❌ Failed to load EcoPlus Module. Please try again.', 'error');

            // Cleanup on error
            iframeContainer.remove();
            const selectionScreen = document.getElementById('selectionScreen');
            if (selectionScreen) {
                selectionScreen.classList.add('active');
                selectionScreen.classList.remove('exit-left');
            }
        };

        iframeContainer.appendChild(iframe);
        document.body.appendChild(iframeContainer);

        // Update APP_STATE
        window.APP_STATE.mode = 'hotel';
        window.APP_STATE.timestamp = Date.now();
        console.log('📊 APP_STATE Updated:', window.APP_STATE);

    } catch (error) {
        console.error('❌ Error loading EcoPlus Module:', error);
        showToast('❌ Error loading module. Please try again.', 'error');
    }
}

/**
 * Load Custom Rescue System Builder Module
 */
function loadCustomRescueBuilder(event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }

    // Check authentication first
    const authToken = localStorage.getItem('auth-token') || localStorage.getItem('user-session');
    if (!authToken) {
        console.log('⚠️  User not authenticated. Redirecting to login...');
        showToast('⚠️ Please log in to use Custom Rescue Builder', 'error');
        // For now, allow access - in production redirect to /login.html
    }

    console.log('🔧 Loading Custom Rescue System Builder...');

    try {
        // Hide the selection screen
        const selectionScreen = document.getElementById('selectionScreen');
        if (selectionScreen) {
            selectionScreen.classList.remove('active');
            selectionScreen.classList.add('exit-left');
        }

        // Create a container for the module
        const iframeContainer = document.createElement('div');
        iframeContainer.id = 'rescue-builder-container';
        iframeContainer.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 5100;
            background: #0a0a0a;
            animation: fadeInModule 0.5s ease-out;
        `;

        const iframe = document.createElement('iframe');
        iframe.id = 'rescue-builder-frame';
        iframe.src = '/modules/rescue-builder/index.html';
        iframe.title = 'Custom Rescue System Builder';
        iframe.style.cssText = `
            width: 100%;
            height: 100%;
            border: none;
            display: block;
        `;

        iframe.onload = () => {
            console.log('✅ Custom Rescue Builder Module Loaded Successfully');
            showToast('🔧 Custom Rescue Builder Ready', 'success');

            // Log the event
            if (window.APP_STATE) {
                window.APP_STATE.lastModuleLoaded = 'rescue-builder';
                window.APP_STATE.moduleLoadTime = Date.now();
            }
        };

        iframe.onerror = (error) => {
            console.error('❌ Failed to load Custom Rescue Builder:', error);
            showToast('❌ Failed to load Custom Rescue Builder. Please try again.', 'error');

            // Cleanup on error
            iframeContainer.remove();
            const selectionScreen = document.getElementById('selectionScreen');
            if (selectionScreen) {
                selectionScreen.classList.add('active');
                selectionScreen.classList.remove('exit-left');
            }
        };

        iframeContainer.appendChild(iframe);
        document.body.appendChild(iframeContainer);

        // Update APP_STATE
        window.APP_STATE.mode = 'rescue-builder';
        window.APP_STATE.timestamp = Date.now();
        console.log('📊 APP_STATE Updated:', window.APP_STATE);

    } catch (error) {
        console.error('❌ Error loading Custom Rescue Builder:', error);
        showToast('❌ Error loading module. Please try again.', 'error');
    }
}

/**
 * Return from Custom Rescue Builder back to ResQAI
 */
function goBackFromRescueBuilder() {
    console.log('← Returning from Rescue Builder to ResQAI Main App');
    const container = document.getElementById('rescue-builder-container');
    if (container) {
        container.remove();
    }
    const selectionScreen = document.getElementById('selectionScreen');
    if (selectionScreen) {
        selectionScreen.classList.add('active');
        selectionScreen.classList.remove('exit-left');
    }
}

/**
 * Return from EcoPlus module back to ResQAI
 */
function goBackFromEcoPlus() {
    console.log('← Returning from EcoPlus to ResQAI Main App');

    try {
        const iframe = document.getElementById('echo-plus-module-frame');
        const container = document.getElementById('echo-plus-iframe-container');

        if (iframe && container) {
            // Add fade-out animation
            container.style.animation = 'fadeOutModule 0.5s ease-out forwards';

            // Add the animation if not already present
            const style = document.querySelector('style[data-animation="fadeOutModule"]');
            if (!style) {
                const newStyle = document.createElement('style');
                newStyle.setAttribute('data-animation', 'fadeOutModule');
                newStyle.textContent = `
                    @keyframes fadeOutModule {
                        from {
                            opacity: 1;
                            background: rgba(10, 10, 10, 1);
                        }
                        to {
                            opacity: 0;
                            background: rgba(10, 10, 10, 0);
                        }
                    }
                `;
                document.head.appendChild(newStyle);
            }

            setTimeout(() => {
                container.remove();

                // Reset APP_STATE
                window.APP_STATE.mode = null;
                window.APP_STATE.lastModuleLoaded = 'echo-plus';
                window.APP_STATE.moduleUnloadTime = Date.now();
                window.APP_STATE.timestamp = Date.now();

                // Show selection screen again with animation
                const selectionScreen = document.getElementById('selectionScreen');
                if (selectionScreen) {
                    // Force reflow to reset animation
                    selectionScreen.offsetHeight;
                    selectionScreen.classList.add('active');
                    selectionScreen.classList.remove('exit-left');
                }

                showToast('← Returned to ResQAI Main App', 'info');
            }, 500);
        }
    } catch (error) {
        console.error('❌ Error returning from EcoPlus:', error);
        showToast('❌ Error returning to main app. Please refresh.', 'error');
    }
}

// ==================== INITIALIZE APP ====================
document.addEventListener('DOMContentLoaded', () => {
    // Show dashboard on load
    showTab('dashboard');

    // Dashboard initialization is handled in dashboard.js
    // loadIncidents() is called there with proper polling setup
});


