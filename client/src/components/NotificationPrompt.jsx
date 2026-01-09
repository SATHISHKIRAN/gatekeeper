import React, { useState, useEffect } from 'react';
import { BellRing, BellOff, X } from 'lucide-react';

import toast from 'react-hot-toast';

const NotificationPrompt = () => {
    const [permission, setPermission] = useState(Notification.permission);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Only show if permission is 'default' (not granted or denied yet)
        if (Notification.permission === 'default') {
            // Add a small delay so it doesn't pop up instantly on load
            const timer = setTimeout(() => setIsVisible(true), 2000);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleEnable = async () => {
        try {
            const result = await Notification.requestPermission();
            setPermission(result);
            setIsVisible(false);

            if (result === 'granted') {
                toast.success('Notifications Enabled! You will now receive important updates.');
                // Try to subscribe to push if service worker is ready
                if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                    // We trust the main app logic/auth context to handle the actual subscription logic 
                    // or we could trigger a custom event here if needed.
                }
            } else if (result === 'denied') {
                toast.error('Notifications Blocked. You can enable them later in browser settings.');
            }
        } catch (error) {
            console.error('Error requesting notification permission:', error);
        }
    };

    const handleDismiss = () => {
        setIsVisible(false);
    };

    if (permission !== 'default' || !isVisible) return null;
    return (
        <div
            className="text-white hidden md:flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 rounded-lg text-xs font-bold shadow-md shadow-rose-500/20 transition-all ml-2"
        >
            <div onClick={handleEnable} className="flex items-center gap-2 cursor-pointer">
                <BellRing className="w-3.5 h-3.5 animate-pulse" />
                <span>Enable Alerts</span>
            </div>
            <div className="h-4 w-[1px] bg-white/30 mx-1"></div>
            <button onClick={handleDismiss} className="hover:text-white/80">
                <X className="w-3 h-3" />
            </button>
        </div>
    );
};

export default NotificationPrompt;
