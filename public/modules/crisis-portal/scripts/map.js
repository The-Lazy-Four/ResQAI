/**
 * ResQAI Crisis Portal - Map Module
 * Handles map interactions, markers, and location tracking
 */

export const MapModule = {

    markers: [],

    /**
     * Initialize map interactions
     */
    init() {
        console.log('✓ Map Module initialized');
        this.attachMapListeners();
        this.attachNavigateButton();
    },

    /**
     * Attach map click listeners
     */
    attachMapListeners() {
        const mapContainer = document.querySelector('div.relative.flex-1.bg-surface-container-low.rounded-3xl');

        if (mapContainer) {
            mapContainer.addEventListener('click', (e) => {
                if (e.target === mapContainer || e.target.tagName === 'IMG') {
                    this.handleMapClick(e);
                }
            });
        }
    },

    /**
     * Handle map click
     */
    handleMapClick(event) {
        const rect = event.currentTarget.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        const percentX = (x / rect.width * 100).toFixed(1);
        const percentY = (y / rect.height * 100).toFixed(1);

        window.showNotification(`📍 Map clicked at: ${percentX}%, ${percentY}%`, 'info');
        console.log(`🗺️ Map interaction: ${percentX}%, ${percentY}%`);

        this.placeMarker(percentX, percentY);
    },

    /**
     * Place marker on map
     */
    placeMarker(x, y) {
        const mapContainer = document.querySelector('div.relative.flex-1.bg-surface-container-low.rounded-3xl');

        if (!mapContainer) return;

        const marker = document.createElement('div');
        marker.className = 'absolute w-4 h-4 bg-primary-container rounded-full shadow-lg animate-pulse';
        marker.style.left = x + '%';
        marker.style.top = y + '%';
        marker.style.transform = 'translate(-50%, -50%)';

        const markerDiv = document.querySelector('div.absolute.inset-0.pointer-events-none');
        if (markerDiv) {
            markerDiv.appendChild(marker);
        }

        this.markers.push({ x, y, element: marker });
    },

    /**
     * Attach navigate button
     */
    attachNavigateButton() {
        const navigateButton = document.querySelector('button.bg-secondary.px-4.py-2');
        if (navigateButton) {
            navigateButton.addEventListener('click', () => {
                window.showNotification('🗺️ Routing to Sector 7 Central Bunker', 'info');
                setTimeout(() => {
                    window.showNotification('✓ Navigation started', 'success');
                }, 1000);
            });
        }
    },

    /**
     * Clear all markers
     */
    clearMarkers() {
        this.markers.forEach(m => m.element.remove());
        this.markers = [];
    },

    /**
     * Get current markers
     */
    getMarkers() {
        return this.markers;
    }
};

export default MapModule;
