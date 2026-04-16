// ============================================
// ResQAI - Main App Logic
// ============================================

const API_BASE_URL = 'http://localhost:3000/api';

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

// ==================== INITIALIZE APP ====================
document.addEventListener('DOMContentLoaded', () => {
    // Show dashboard on load
    showTab('dashboard');

    // Dashboard initialization is handled in dashboard.js
    // loadIncidents() is called there with proper polling setup
});

