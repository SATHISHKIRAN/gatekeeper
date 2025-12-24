import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { AnimatePresence, motion } from 'framer-motion';
import { X, CheckCircle, Info, Shield, AlertTriangle } from 'lucide-react';
import { useAuth } from './AuthContext';

const NotificationContext = createContext();

const Toast = ({ toast, onClose }) => {
    if (!toast) return null;

    const icons = {
        success: <CheckCircle className="w-5 h-5 text-emerald-500" />,
        error: <Shield className="w-5 h-5 text-red-500" />,
        warning: <AlertTriangle className="w-5 h-5 text-amber-500" />,
        info: <Info className="w-5 h-5 text-indigo-500" />
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-6 right-6 z-50 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-2xl rounded-xl p-4 flex items-start gap-4 max-w-sm"
        >
            <div className="shrink-0 mt-0.5">{icons[toast.type] || icons.info}</div>
            <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">{toast.title}</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{toast.message}</p>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="w-4 h-4" />
            </button>
        </motion.div>
    );
};

export const NotificationProvider = ({ children }) => {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [toast, setToast] = useState(null);
    const lastNotifIdRef = useRef(null);

    const fetchNotifications = async (isPolling = false) => {
        if (!user) return;
        try {
            const res = await axios.get('/api/notifications');
            const newNotifs = res.data.notifications || [];

            setNotifications(newNotifs);
            setUnreadCount(res.data.unreadCount);

            // Check for new notifications to show toast
            if (newNotifs.length > 0) {
                const latest = newNotifs[0];
                if (isPolling && lastNotifIdRef.current && latest.id > lastNotifIdRef.current) {
                    // New notification arrived!
                    showToast(latest.title, latest.message, latest.type);
                    // Play sound?
                    const audio = new Audio('/notification.mp3'); // Assuming file exists or fails silently
                    audio.play().catch(() => { });
                }
                lastNotifIdRef.current = latest.id;
            }
        } catch (err) {
            console.error('Failed to fetch notifications');
        }
    };

    const markAsRead = async (id) => {
        try {
            await axios.put(`/api/notifications/${id}/read`); // Matches route: /:id/read
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (err) {
            console.error('Failed to mark read');
        }
    };

    const markAllAsRead = async () => {
        try {
            await axios.put('/api/notifications/read-all'); // Matches route: /read-all
            setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
            setUnreadCount(0);
        } catch (err) {
            console.error('Failed to mark all read');
        }
    };

    const showToast = (title, message, type = 'info') => {
        setToast({ title, message, type, id: Date.now() });
        setTimeout(() => setToast(null), 5000);
    };

    const subscribeToPush = async () => {
        try {
            if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
                console.warn('Push messaging is not supported');
                return;
            }

            const registration = await navigator.serviceWorker.register('/sw.js');
            await navigator.serviceWorker.ready;

            const permission = await Notification.requestPermission();
            if (permission !== 'granted') return;

            const publicVapidKey = 'BCPlQrWyWi3JyCMDZ3VOS5tLIj_1uKZWnIZtxj8rxBCM7y6q6qbOiT0CukkgjqfL2kum4xWTJrFRnd2vuTxHrLU';

            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
            });

            await axios.post('/api/notifications/subscribe', { subscription });
            console.log('Push subscription successful');
        } catch (err) {
            console.error('Push subscription failed:', err);
        }
    };

    function urlBase64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding)
            .replace(/-/g, '+')
            .replace(/_/g, '/');
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    }

    useEffect(() => {
        if (user) {
            fetchNotifications(false); // Initial fetch
            subscribeToPush(); // Subscribe to push
            const interval = setInterval(() => fetchNotifications(true), 15000); // Poll every 15s
            return () => clearInterval(interval);
        }
    }, [user]);

    return (
        <NotificationContext.Provider value={{ notifications, unreadCount, markAsRead, markAllAsRead, showToast, fetchNotifications }}>
            {children}
            <AnimatePresence>
                {toast && <Toast toast={toast} onClose={() => setToast(null)} />}
            </AnimatePresence>
        </NotificationContext.Provider>
    );
};

export const useNotification = () => useContext(NotificationContext);
