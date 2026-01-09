const socketIo = require('socket.io');

let io;

const initSocket = (server) => {
    io = socketIo(server, {
        cors: {
            origin: "*", // Allow any origin for mobile access
            methods: ["GET", "POST"],
            credentials: true
        }
    });

    io.on('connection', (socket) => {
        // console.log('New client connected', socket.id);

        // Client joins a room based on their user ID for private notifications
        socket.on('join', (userId) => {
            if (userId) {
                socket.join(`user_${userId}`);
                // console.log(`Socket ${socket.id} joined user_${userId}`);
            }
        });

        // HOD/Warden rooms for dashboard updates
        socket.on('join_role', (role) => {
            if (role) {
                socket.join(`role_${role}`);
            }
        });

        socket.on('disconnect', () => {
            // console.log('Client disconnected');
        });
    });

    console.log('[SOCKET] Socket.io Initialized');
    return io;
};

const getIo = () => {
    if (!io) {
        throw new Error("Socket.io not initialized!");
    }
    return io;
};

// Helper to emit to a specific user
const notifyUser = (userId, event, data) => {
    if (io) {
        console.log(`[SOCKET] Emitting '${event}' to user_${userId}`, data);
        io.to(`user_${userId}`).emit(event, data);
    } else {
        console.error(`[SOCKET] Error: IO is undefined when trying to notify user_${userId}`);
    }
};

// Helper to broadcast to roles
const notifyRole = (role, event, data) => {
    if (io) {
        io.to(`role_${role}`).emit(event, data);
    }
};

module.exports = { initSocket, getIo, notifyUser, notifyRole };
