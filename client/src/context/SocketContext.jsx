import React, { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
    const [socket, setSocket] = useState(null);
    const { user } = useAuth();

    useEffect(() => {
        // Connect only if authenticated
        if (user) {
            // Adjust URL for production
            // Connect to current host
            const url = '/';
            // Optimize connection settings
            const newSocket = io(url, {
                transports: ['polling', 'websocket'], // Restore polling for stability
                reconnection: true,
                reconnectionAttempts: 20,
                reconnectionDelay: 2000
            });

            setSocket(newSocket);

            newSocket.on('connect', () => {
                // console.log('Socket Connected');
                newSocket.emit('join', user.id);
                if (user.role) {
                    newSocket.emit('join_role', user.role);
                }
            });

            return () => newSocket.close();
        }
    }, [user]);

    return (
        <SocketContext.Provider value={{ socket }}>
            {children}
        </SocketContext.Provider>
    );
};
