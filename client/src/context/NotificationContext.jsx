import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import axios from 'axios';
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

        <div
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
        </div>
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

                    // Trigger System Notification if minimized or hidden
                    if (Notification.permission === 'granted' && (document.hidden || !document.hasFocus())) {
                        try {
                            const n = new Notification(latest.title, {
                                body: latest.message,
                                icon: '/logo192.png',
                                tag: 'gate-system-alert'
                            });
                            n.onclick = () => {
                                window.focus();
                                n.close();
                            };
                        } catch (e) {
                            console.error('System notification failed', e);
                        }
                    }
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

    const [permissionStatus, setPermissionStatus] = useState(Notification.permission);

    // Initial subscription check
    useEffect(() => {
        if (user) {
            fetchNotifications(false);
            if (Notification.permission === 'granted') {
                subscribeToPush();
            }
            const interval = setInterval(() => fetchNotifications(true), 15000);
            return () => clearInterval(interval);
        }
    }, [user]);

    const [pushLoading, setPushLoading] = useState(false);

    const requestPermission = async () => {
        setPushLoading(true);
        try {
            const permission = await Notification.requestPermission();
            setPermissionStatus(permission);
            if (permission === 'granted') {
                await subscribeToPush();
                showToast('Notifications Enabled', 'You will now receive instant updates.', 'success');
            } else {
                showToast('Permission Needed', 'Please enable notifications in your browser settings.', 'warning');
            }
        } catch (error) {
            console.error('Permission request failed', error);
        } finally {
            setPushLoading(false);
        }
    };

    const subscribeToPush = async () => {
        try {
            if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

            // 1. Fetch VAPID Key dynamically from server
            const { data } = await axios.get('/api/notifications/vapid-key');
            const publicVapidKey = data.publicKey;

            if (!publicVapidKey) {
                console.warn('No VAPID key found');
                return;
            }

            const registration = await navigator.serviceWorker.ready;

            // 2. Check for existing subscription
            let subscription = await registration.pushManager.getSubscription();

            // 3. Verify VAPID Key Consistency
            if (subscription) {
                const currentKey = subscription.options.applicationServerKey;
                if (currentKey) {
                    const newKeyArray = urlBase64ToUint8Array(publicVapidKey);
                    const existingKeyArray = new Uint8Array(currentKey);

                    let keysMatch = true;
                    if (newKeyArray.length !== existingKeyArray.length) {
                        keysMatch = false;
                    } else {
                        for (let i = 0; i < newKeyArray.length; i++) {
                            if (newKeyArray[i] !== existingKeyArray[i]) {
                                keysMatch = false;
                                break;
                            }
                        }
                    }

                    if (!keysMatch) {
                        console.log('[Push] VAPID Key changed. Re-subscribing...');
                        await subscription.unsubscribe();
                        subscription = null;
                    }
                }
            }

            // 4. Subscribe if needed
            if (!subscription) {
                subscription = await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
                });
            } else {
                console.log('[Push] Subscription valid via existing key');
            }

            // 4. Send subscription to server
            await axios.post('/api/notifications/subscribe', { subscription });
            // console.log('Push subscription verified');
        } catch (err) {
            console.error('Push subscription failed:', err);
            // Optional: Show toast only if it was an explicit user action (requestPermission)
        }
    };

    return (
        <NotificationContext.Provider value={{
            notifications, unreadCount, markAsRead, markAllAsRead,
            showToast, fetchNotifications, requestPermission, permissionStatus,
            pushLoading
        }}>
            {children}
            {toast && <Toast toast={toast} onClose={() => setToast(null)} />}
        </NotificationContext.Provider>
    );
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

export const useNotification = () => useContext(NotificationContext);

export const usePushNotifications = () => {
    const { permissionStatus, requestPermission, pushLoading } = useContext(NotificationContext);
    return {
        permission: permissionStatus,
        subscribe: requestPermission,
        loading: pushLoading,
        isSubscribed: permissionStatus === 'granted'
    };
};
