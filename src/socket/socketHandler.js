// ============================================
// ResQAI - Socket.IO Handler (System-Scoped)
// ============================================
// Manages real-time WebSocket connections with
// strict system_id room isolation.

/**
 * Initializes Socket.IO event handlers on the given io instance.
 * Each client joins a system-specific room via "join_system".
 * All emissions are scoped to that room — no cross-system leakage.
 */
export function initSocketHandlers(io) {
    io.on('connection', (socket) => {
        console.log(`🔌 [SOCKET] Client connected: ${socket.id}`);

        // --- JOIN SYSTEM ROOM ---
        // Client sends { system_id } to join a specific system room
        socket.on('join_system', ({ system_id }) => {
            if (!system_id) {
                socket.emit('error_msg', { message: 'system_id is required' });
                return;
            }
            socket.join(system_id);
            socket.data.system_id = system_id; // store for later use
            console.log(`🏠 [SOCKET] ${socket.id} joined room: ${system_id}`);
            socket.emit('joined_system', { system_id, message: 'Connected to system' });
        });

        // --- LEAVE SYSTEM ROOM ---
        socket.on('leave_system', ({ system_id }) => {
            if (system_id) {
                socket.leave(system_id);
                console.log(`🚪 [SOCKET] ${socket.id} left room: ${system_id}`);
            }
        });

        // --- DISCONNECT ---
        socket.on('disconnect', (reason) => {
            console.log(`❌ [SOCKET] ${socket.id} disconnected: ${reason}`);
        });
    });

    console.log('✅ [SOCKET] Handler initialized');
}

/**
 * Emits a new SOS event to all clients in the system room.
 * Called from the API route after saving to DB.
 */
export function emitSOS(io, system_id, sosData) {
    io.to(system_id).emit('new_sos', {
        system_id,
        ...sosData,
        timestamp: new Date().toISOString()
    });
    console.log(`🚨 [SOCKET] SOS emitted to room ${system_id}`);
}

/**
 * Emits a new alert broadcast to all clients in the system room.
 */
export function emitAlert(io, system_id, alertData) {
    io.to(system_id).emit('new_alert', {
        system_id,
        ...alertData,
        timestamp: new Date().toISOString()
    });
    console.log(`📢 [SOCKET] Alert emitted to room ${system_id}`);
}

/**
 * Emits an incident update to all clients in the system room.
 */
export function emitIncidentUpdate(io, system_id, incidentData) {
    io.to(system_id).emit('incident_update', {
        system_id,
        ...incidentData,
        timestamp: new Date().toISOString()
    });
}
