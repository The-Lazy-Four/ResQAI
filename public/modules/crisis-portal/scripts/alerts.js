// ============================================
// ResQAI Crisis Portal - Alerts System
// ============================================

// In-memory alert state
export const alertState = {
  alerts: [
    {
      id: 1,
      type: 'fire',
      severity: 'critical',
      title: 'Structural Fire',
      description: 'Emergency teams deployed to Zone B industrial complex. Evacuate immediately.',
      distance: '1.2 KM',
      detectedAgo: '4 MIN AGO',
      icon: 'local_fire_department',
      color: 'primary',
      borderColor: 'border-primary-container',
      textColor: 'text-primary',
    },
    {
      id: 2,
      type: 'medical',
      severity: 'medium',
      title: 'Mass Casualty Event',
      description: 'Transit collision at Main Intersection. Ambulances on route. Traffic blocked.',
      distance: '3.8 KM',
      detectedAgo: '12 MIN AGO',
      icon: 'medical_services',
      color: 'yellow-500',
      borderColor: 'border-yellow-500',
      textColor: 'text-yellow-500',
    },
    {
      id: 3,
      type: 'power',
      severity: 'low',
      title: 'Grid Instability',
      description: 'Localized power outage in Sector 4. Estimated repair: 2 hours.',
      distance: '4.5 KM',
      detectedAgo: '45 MIN AGO',
      icon: 'power_off',
      color: 'green-500',
      borderColor: 'border-green-500',
      textColor: 'text-green-500',
    },
  ],
  nextId: 4,
};

/**
 * Add a new alert
 */
export function addAlert({ type, severity, title, description, distance = 'NEARBY' }) {
  const severityMap = {
    critical: { color: 'primary-container', borderColor: 'border-rose-500', textColor: 'text-rose-400' },
    medium: { color: 'yellow-500', borderColor: 'border-yellow-500', textColor: 'text-yellow-500' },
    low: { color: 'green-500', borderColor: 'border-green-500', textColor: 'text-green-500' },
  };

  const iconMap = {
    fire: 'local_fire_department',
    medical: 'medical_services',
    flood: 'water_drop',
    quake: 'tsunami',
    theft: 'policy',
    child: 'child_care',
    safety: 'female',
    other: 'warning',
    sos: 'notifications_active',
  };

  const style = severityMap[severity] || severityMap.critical;
  const icon = iconMap[type] || 'warning';

  const alert = {
    id: alertState.nextId++,
    type,
    severity,
    title,
    description,
    distance,
    detectedAgo: 'JUST NOW',
    icon,
    ...style,
  };

  alertState.alerts.unshift(alert);

  // Keep max 6 alerts
  if (alertState.alerts.length > 6) {
    alertState.alerts = alertState.alerts.slice(0, 6);
  }

  renderAlerts();
  return alert;
}

/**
 * Render all alerts into the DOM
 */
export function renderAlerts() {
  const container = document.getElementById('alerts-container');
  if (!container) return;

  container.innerHTML = alertState.alerts
    .map(
      (a) => `
    <div class="bg-surface-container-low ${a.borderColor} border-l-4 p-5 rounded-r-xl shadow-lg relative overflow-hidden group alert-card" data-alert-id="${a.id}">
      <div class="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
        <span class="material-symbols-outlined text-4xl">${a.icon}</span>
      </div>
      <div class="flex justify-between items-start mb-2">
        <span class="text-[10px] font-headline font-bold ${a.textColor} px-2 py-0.5 bg-white/5 rounded">${a.severity.toUpperCase()}</span>
        <span class="text-[10px] text-slate-500">${a.distance}</span>
      </div>
      <h3 class="font-headline font-bold text-on-background mb-1">${a.title}</h3>
      <p class="text-xs text-on-surface-variant line-clamp-2">${a.description}</p>
      <p class="mt-3 text-[10px] font-headline text-slate-500">DETECTED: ${a.detectedAgo}</p>
    </div>
  `
    )
    .join('');
}

/**
 * Initialize alerts system
 */
export function initAlerts() {
  renderAlerts();

  // Auto-age alerts every 30s
  setInterval(() => {
    alertState.alerts.forEach((a) => {
      if (a.detectedAgo === 'JUST NOW') a.detectedAgo = '1 MIN AGO';
    });
    renderAlerts();
  }, 30000);
}
