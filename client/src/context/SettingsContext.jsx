import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const SettingsContext = createContext();

export const useSettings = () => useContext(SettingsContext);

export const SettingsProvider = ({ children }) => {
    const [settings, setSettings] = useState({
        app_name: 'UniVerse GateKeeper',
        app_logo: '/logo.png',
        theme_primary: '#4F46E5', // Indigo-600
        theme_secondary: '#10B981', // Emerald-500
        maintenance_mode: false,
        allow_registration: true,
        announcement_text: '',
        login_background: null
    });
    const [loading, setLoading] = useState(true);

    const fetchSettings = async () => {
        try {
            const res = await axios.get('/api/settings');
            if (res.data) setSettings(prev => ({ ...prev, ...res.data }));
            setLoading(false);
        } catch (err) {
            console.error("Failed to load settings", err);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSettings();
    }, []);

    // Apply Settings Side Effects
    useEffect(() => {
        if (!settings) return;

        // 1. Update Title
        document.title = settings.app_name;

        // 2. Update Favicon (if URL provided)
        if (settings.app_logo) {
            const link = document.querySelector("link[rel~='icon']") || document.createElement('link');
            link.type = 'image/png';
            link.rel = 'icon';
            link.href = settings.app_logo;
            document.getElementsByTagName('head')[0].appendChild(link);
        }

        // 3. Update Theme Colors (CSS Variables Injection)
        const root = document.documentElement;
        root.style.setProperty('--theme-primary', settings.theme_primary);
        root.style.setProperty('--theme-secondary', settings.theme_secondary);

        // Optional: Inject dynamic overrides for Tailwind classes to force theme change
        // This is a "Hammer" approach to ensure existing UI components update without refactoring code
        const styleId = 'dynamic-theme-styles';
        let styleTag = document.getElementById(styleId);
        if (!styleTag) {
            styleTag = document.createElement('style');
            styleTag.id = styleId;
            document.head.appendChild(styleTag);
        }

        styleTag.innerHTML = `
            .text-indigo-600, .text-indigo-500, .dark .text-indigo-400 { color: ${settings.theme_primary} !important; }
            .bg-indigo-600, .bg-indigo-500 { background-color: ${settings.theme_primary} !important; }
            .border-indigo-600, .border-indigo-500 { border-color: ${settings.theme_primary} !important; }
            .ring-indigo-600, .ring-indigo-500 { --tw-ring-color: ${settings.theme_primary} !important; }
            
            .text-emerald-600, .text-emerald-500 { color: ${settings.theme_secondary} !important; }
            .bg-emerald-600, .bg-emerald-500 { background-color: ${settings.theme_secondary} !important; }
        `;

    }, [settings]);

    const updateSettings = async (newSettings) => {
        try {
            await axios.put('/api/settings', newSettings);
            setSettings(newSettings);
            toast.success("System settings updated successfully");
            return true;
        } catch (err) {
            console.error(err);
            toast.error("Failed to update settings");
            return false;
        }
    };

    return (
        <SettingsContext.Provider value={{ settings, updateSettings, loading, fetchSettings }}>
            {children}
        </SettingsContext.Provider>
    );
};
