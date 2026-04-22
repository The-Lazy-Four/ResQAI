/**
 * ResQAI Crisis Portal - Archive Page Initialization
 * Handles incident history, search, and record management
 */

import { CrisisState, setState, getState } from '/modules/crisis-portal/scripts/core.js';
import AIService from '/modules/crisis-portal/scripts/aiService.js';

/**
 * Initialize Archive page functionality
 */
export async function initArchive() {
    try {
        console.log('📂 Initializing Archive...');

        // Initialize AIService if not already done
        if (!window.AIService) {
            await AIService.init();
            window.AIService = AIService;
        }

        // Load incident history
        displayIncidents();

        // Attach search functionality
        attachSearchHandlers();

        // Attach filter handlers
        attachFilterHandlers();

        console.log('✓ Archive initialized');
        window.showNotification('📂 Archive loaded', 'info');
    } catch (err) {
        console.error('❌ Archive init error:', err);
        window.showNotification('⚠️ Archive encountered errors', 'error');
    }
}

/**
 * Display incident history
 */
function displayIncidents() {
    try {
        const incidents = CrisisState.incidents || CrisisState.chatHistory || [];
        const archiveList = document.querySelector('[data-component="archive-list"]');

        if (!archiveList) return;

        archiveList.innerHTML = '';

        if (incidents.length === 0) {
            archiveList.innerHTML = '<p class="text-slate-400 text-center py-8">No incidents recorded</p>';
            return;
        }

        // Display incidents in reverse chronological order
        incidents.slice().reverse().forEach(incident => {
            const incidentElement = createIncidentElement(incident);
            archiveList.appendChild(incidentElement);
        });
    } catch (err) {
        console.error('❌ Display incidents error:', err);
    }
}

/**
 * Create incident display element
 */
function createIncidentElement(incident) {
    const incidentDiv = document.createElement('div');
    incidentDiv.className = 'bg-slate-800/50 border border-slate-700 rounded-lg p-4 mb-4 hover:bg-slate-700/50 transition';

    // Parse incident data
    const timestamp = incident.timestamp ? new Date(incident.timestamp) : new Date();
    const timeStr = formatDateTime(timestamp);

    // Get incident type icon
    const icon = getIncidentIcon(incident.type || incident.sosType || 'info');
    const color = getIncidentColor(incident.type || incident.sosType || 'info');

    // Build incident display
    incidentDiv.innerHTML = `
    <div class="flex items-start gap-4">
      <span class="material-symbols-outlined text-xl ${color}">${icon}</span>
      <div class="flex-1 min-w-0">
        <div class="flex items-center justify-between mb-1">
          <h3 class="font-headline font-bold text-white">${incident.type || incident.sosType || 'Incident'}</h3>
          <span class="text-xs text-slate-400">${timeStr}</span>
        </div>
        <p class="text-slate-400 text-sm mb-2">${incident.location || 'Location unknown'}</p>
        <p class="text-slate-300 text-sm mb-3">${incident.description || incident.message || 'No additional details'}</p>
        <div class="flex items-center gap-2">
          <span class="text-xs px-2 py-1 rounded bg-slate-700 text-slate-300">${incident.status || 'Resolved'}</span>
          <button class="text-xs px-3 py-1 bg-cyan-500/20 text-cyan-300 rounded hover:bg-cyan-500/30 transition view-details-btn">
            View Details
          </button>
        </div>
      </div>
    </div>
  `;

    // Attach click handler
    const detailsBtn = incidentDiv.querySelector('.view-details-btn');
    if (detailsBtn) {
        detailsBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            showIncidentDetails(incident);
        });
    }

    return incidentDiv;
}

/**
 * Show detailed incident information
 */
function showIncidentDetails(incident) {
    try {
        // Create modal
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50';

        const timestamp = incident.timestamp ? new Date(incident.timestamp) : new Date();
        const timeStr = formatDateTime(timestamp);

        const icon = getIncidentIcon(incident.type || incident.sosType || 'info');
        const color = getIncidentColor(incident.type || incident.sosType || 'info');

        modal.innerHTML = `
      <div class="bg-slate-800 border border-slate-700 rounded-lg p-8 max-w-2xl w-full mx-4 max-h-[80vh] overflow-auto">
        <div class="flex items-center gap-4 mb-6">
          <span class="material-symbols-outlined text-4xl ${color}">${icon}</span>
          <div>
            <h2 class="text-2xl font-bold text-white">${incident.type || incident.sosType || 'Incident'}</h2>
            <p class="text-slate-400 mt-1">${timeStr}</p>
          </div>
        </div>
        
        <div class="space-y-4 mb-6">
          <div>
            <h3 class="font-headline font-bold text-slate-300 mb-2">Location</h3>
            <p class="text-white">${incident.location || 'Unknown'}</p>
          </div>
          
          <div>
            <h3 class="font-headline font-bold text-slate-300 mb-2">Description</h3>
            <p class="text-slate-300">${incident.description || incident.message || 'No details available'}</p>
          </div>
          
          <div class="grid grid-cols-2 gap-4">
            <div>
              <p class="text-slate-500 text-sm">Status</p>
              <p class="text-white font-bold">${incident.status || 'Resolved'}</p>
            </div>
            <div>
              <p class="text-slate-500 text-sm">Resolution Time</p>
              <p class="text-white font-bold">${incident.resolutionTime || 'N/A'}</p>
            </div>
          </div>
        </div>
        
        <button class="w-full px-4 py-2 bg-cyan-500/20 text-cyan-300 rounded hover:bg-cyan-500/30 transition close-btn">
          Close
        </button>
      </div>
    `;

        document.body.appendChild(modal);

        // Attach close handler
        const closeBtn = modal.querySelector('.close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                modal.remove();
            });
        }

        // Close on background click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    } catch (err) {
        console.error('❌ Incident details error:', err);
        window.showNotification('⚠️ Could not load incident details', 'error');
    }
}

/**
 * Attach search functionality
 */
function attachSearchHandlers() {
    const searchInput = document.querySelector('[data-component="search-input"]');
    const searchBtn = document.querySelector('[data-component="search-btn"]');

    if (!searchInput) return;

    const performSearch = () => {
        const query = searchInput.value.toLowerCase();
        filterIncidents(query);
    };

    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            performSearch();
        }
    });

    if (searchBtn) {
        searchBtn.addEventListener('click', performSearch);
    }
}

/**
 * Filter incidents by search query
 */
function filterIncidents(query) {
    const incidents = document.querySelectorAll('[data-component="archive-list"] > div');

    incidents.forEach(incident => {
        const text = incident.textContent.toLowerCase();
        if (text.includes(query) || query === '') {
            incident.style.display = '';
        } else {
            incident.style.display = 'none';
        }
    });
}

/**
 * Attach filter handlers
 */
function attachFilterHandlers() {
    const filterButtons = document.querySelectorAll('[data-filter]');

    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            const filterType = button.getAttribute('data-filter');
            applyFilter(filterType);

            // Update active state
            filterButtons.forEach(btn => {
                btn.classList.remove('border-cyan-500', 'text-cyan-300');
                btn.classList.add('border-slate-600', 'text-slate-400');
            });
            button.classList.remove('border-slate-600', 'text-slate-400');
            button.classList.add('border-cyan-500', 'text-cyan-300');
        });
    });
}

/**
 * Apply type filter to incidents
 */
function applyFilter(filterType) {
    const incidents = document.querySelectorAll('[data-component="archive-list"] > div');

    incidents.forEach(incident => {
        if (filterType === 'all') {
            incident.style.display = '';
        } else {
            const incidentText = incident.textContent.toLowerCase();
            if (incidentText.includes(filterType.toLowerCase())) {
                incident.style.display = '';
            } else {
                incident.style.display = 'none';
            }
        }
    });
}

/**
 * Helper: Get icon for incident type
 */
function getIncidentIcon(type) {
    const icons = {
        'fire': 'local_fire_department',
        'medical': 'emergency',
        'women': 'safety_check',
        'child': 'child_care',
        'earthquake': 'vibration',
        'flood': 'water_damage',
        'theft': 'security',
        'accident': 'car_crash',
        'default': 'history'
    };
    return icons[type] || icons['default'];
}

/**
 * Helper: Get color for incident type
 */
function getIncidentColor(type) {
    const colors = {
        'fire': 'text-orange-400',
        'medical': 'text-red-400',
        'women': 'text-pink-400',
        'child': 'text-purple-400',
        'earthquake': 'text-purple-400',
        'flood': 'text-blue-400',
        'theft': 'text-yellow-400',
        'accident': 'text-yellow-400',
        'default': 'text-slate-400'
    };
    return colors[type] || colors['default'];
}

/**
 * Helper: Format date and time
 */
function formatDateTime(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initArchive);
} else {
    initArchive();
}

export default { initArchive };
