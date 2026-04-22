/**
 * ResQAI Crisis Portal - Alerts Module
 * Handles alert management, filtering, and rendering
 */

import { CrisisState } from './core.js';

export const AlertsModule = {

    /**
     * Initialize alerts
     */
    init() {
        console.log('✓ Alerts Module initialized');
        this.attachAlertListeners();
        this.listenForNewAlerts();
    },

    /**
     * Attach alert click listeners
     */
    attachAlertListeners() {
        document.addEventListener('click', (e) => {
            const alertCard = e.target.closest('div[data-alert-id]');
            if (alertCard) {
                const alertId = alertCard.dataset.alertId;
                this.showAlertDetails(alertId);
            }
        });
    },

    /**
     * Listen for new alerts from events
     */
    listenForNewAlerts() {
        window.addEventListener('alertAdded', (e) => {
            const alert = e.detail;
            window.showNotification(`🚨 New ${alert.severity} Alert: ${alert.title}`, 'warning');
        });
    },

    /**
     * Show alert details modal
     */
    showAlertDetails(alertId) {
        const alert = CrisisState.alerts.find(a => a.id == alertId);

        if (!alert) return;

        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50';
        modal.innerHTML = `
      <div class="bg-surface-container-high border border-white/10 rounded-3xl p-8 max-w-2xl max-h-96 overflow-y-auto">
        <div class="flex justify-between items-start mb-6">
          <div>
            <h2 class="text-2xl font-headline font-black text-on-background mb-2">${alert.title}</h2>
            <p class="text-sm text-on-surface-variant">${alert.description}</p>
          </div>
          <button onclick="this.closest('.fixed').remove()" class="text-slate-400 hover:text-on-surface">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
        
        <div class="grid grid-cols-2 gap-4 mb-6">
          <div class="bg-white/5 p-4 rounded-lg">
            <p class="text-xs text-slate-500 font-headline mb-1">SEVERITY</p>
            <p class="text-lg font-bold text-on-background">${alert.severity}</p>
          </div>
          <div class="bg-white/5 p-4 rounded-lg">
            <p class="text-xs text-slate-500 font-headline mb-1">DISTANCE</p>
            <p class="text-lg font-bold text-on-background">${alert.distance}</p>
          </div>
          <div class="bg-white/5 p-4 rounded-lg">
            <p class="text-xs text-slate-500 font-headline mb-1">STATUS</p>
            <p class="text-lg font-bold text-on-background">${alert.status}</p>
          </div>
          <div class="bg-white/5 p-4 rounded-lg">
            <p class="text-xs text-slate-500 font-headline mb-1">UNITS ASSIGNED</p>
            <p class="text-lg font-bold text-on-background">${alert.units.length}</p>
          </div>
        </div>
        
        ${alert.units.length > 0 ? `
          <div class="mb-6">
            <h3 class="text-sm font-headline font-bold text-slate-400 mb-3">ASSIGNED UNITS</h3>
            <div class="flex flex-wrap gap-2">
              ${alert.units.map(unit => `<span class="bg-primary-container/20 text-primary-container px-3 py-1 rounded-full text-xs font-bold">${unit}</span>`).join('')}
            </div>
          </div>
        ` : ''}
        
        <div class="flex gap-4">
          <button onclick="this.closest('.fixed').remove()" class="flex-1 bg-slate-700 text-on-background px-6 py-3 rounded-lg font-headline font-bold">
            CLOSE
          </button>
          <button class="flex-1 bg-primary-container text-on-primary-container px-6 py-3 rounded-lg font-headline font-bold">
            REQUEST ASSISTANCE
          </button>
        </div>
      </div>
    `;

        document.body.appendChild(modal);
    },

    /**
     * Get alerts by severity filter
     */
    getAlertsBySeverity(severity) {
        return CrisisState.alerts.filter(a => a.severity === severity);
    },

    /**
     * Get alerts by type filter
     */
    getAlertsByType(type) {
        return CrisisState.alerts.filter(a => a.type === type);
    }
};

export default AlertsModule;
