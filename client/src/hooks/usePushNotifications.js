import { useState, useEffect } from 'react';
import axios from 'axios';
import { urlBase64ToUint8Array } from '../utils/pushUtils';

export const usePushNotifications = () => {
    const [permission, setPermission] = useState(Notification.permission);
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Check if already subscribed
        checkSubscription();
    }, []);

    const checkSubscription = async () => {
        if ('serviceWorker' in navigator && 'PushManager' in window) {
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();
            if (subscription) {
                setIsSubscribed(true);
            }
        }
    };

    const subscribe = async () => {
        setLoading(true);
        try {
            // 1. Ask Permission
            const perm = await Notification.requestPermission();
            setPermission(perm);

            if (perm !== 'granted') {
                alert('Permission denied. Please enable notifications in your browser settings.');
                return;
            }

            // 2. Get Public VAPID Key from Backend (Best Practice: Fetch dynamically)
            // For now, hardcoding the one we just generated for simplicity as per plan, 
            // BUT ideally endpoint should return it. 
            // Let's assume we can pass it or fetch it.
            // Using the key generated:
            const vapidPublicKey = 'BHw-k74VzU807O2nF8-L519-elS0FZWeosx974micYXVb1lGvxeIAsJRUy-k0UZ1eJ_vUsbXPmD6bktch-qW004';

            // 3. Register SW & Subscribe
            if ('serviceWorker' in navigator) {
                const registration = await navigator.serviceWorker.ready;

                const subscription = await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
                });

                // 4. Send Subscription to Backend
                await axios.post('/api/notifications/subscribe', { subscription });

                setIsSubscribed(true);
                // Optional: Send a test notification immediately
                // axios.post('/api/system/test-push');

                alert('Success! You will now receive notifications even when the app is closed.');
            } else {
                alert('Service Workers are not supported in this browser.');
            }

        } catch (error) {
            console.error('Failed to subscribe:', error);
            alert('Failed to enable notifications. See console for details.');
        } finally {
            setLoading(false);
        }
    };

    return { permission, isSubscribed, subscribe, loading };
};
