/**
 * resqSocket.js — Frontend Socket.IO client for ResQAI
 * 
 * Connects to the server, joins a system-specific room,
 * and provides event listeners for real-time SOS/alert updates.
 * Handles reconnection and room re-joining automatically.
 */

// Socket.IO client is loaded via CDN <script> tag in the HTML pages
// This module wraps it for easy use

let socket = null;
let currentSystemId = null;
let eventHandlers = {};

/**
 * Connect to the Socket.IO server and join a system room.
 * @param {string} systemId - The system ID to join
 * @returns {object} socket instance
 */
function connectToSystem(systemId) {
    if (!systemId) {
        console.warn('[SOCKET] No system_id provided');
        return null;
    }

    // Avoid duplicate connections
    if (socket && socket.connected && currentSystemId === systemId) {
        console.log('[SOCKET] Already connected to', systemId);
        return socket;
    }

    // Disconnect old socket if switching systems
    if (socket) {
        socket.disconnect();
    }

    currentSystemId = systemId;

    // Connect to the server (same origin)
    socket = io(window.location.origin, {
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 2000
    });

    // On connect → join the system room
    socket.on('connect', () => {
        console.log('[SOCKET] Connected:', socket.id);
        socket.emit('join_system', { system_id: systemId });
        updateConnectionStatus(true);
    });

    // Confirm room join
    socket.on('joined_system', (data) => {
        console.log('[SOCKET] Joined system room:', data.system_id);
    });

    // Handle disconnect
    socket.on('disconnect', (reason) => {
        console.log('[SOCKET] Disconnected:', reason);
        updateConnectionStatus(false);
    });

    // On reconnect → re-join the room automatically
    socket.on('reconnect', () => {
        console.log('[SOCKET] Reconnected, re-joining room:', systemId);
        socket.emit('join_system', { system_id: systemId });
        updateConnectionStatus(true);
    });

    // Server error
    socket.on('error_msg', (data) => {
        console.error('[SOCKET] Server error:', data.message);
    });

    return socket;
}

/**
 * Listen for a specific event. Wraps socket.on for convenience.
 * @param {string} event - Event name (e.g. 'new_sos', 'new_alert')
 * @param {function} callback - Handler function
 */
function onEvent(event, callback) {
    if (!socket) {
        console.warn('[SOCKET] Not connected. Call connectToSystem() first.');
        return;
    }
    socket.on(event, callback);
}

/**
 * Disconnect from the socket server.
 */
function disconnectSocket() {
    if (socket) {
        socket.disconnect();
        socket = null;
        currentSystemId = null;
    }
}

/**
 * Updates a connection status indicator if one exists in the DOM.
 * Looks for element with id="socket-status".
 */
function updateConnectionStatus(connected) {
    const el = document.getElementById('socket-status');
    if (!el) return;
    if (connected) {
        el.innerHTML = '<span class="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span> <span class="text-emerald-400 text-[10px] font-bold uppercase tracking-wider">Live</span>';
    } else {
        el.innerHTML = '<span class="w-2 h-2 rounded-full bg-amber-400 inline-block"></span> <span class="text-amber-400 text-[10px] font-bold uppercase tracking-wider">Reconnecting...</span>';
    }
}

// Expose globally (these HTML pages use inline scripts, not ES modules)
window.ResQSocket = {
    connectToSystem,
    onEvent,
    disconnectSocket
};
