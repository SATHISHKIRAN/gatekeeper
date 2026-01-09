import React, { useState, useEffect } from 'react';
import { useSettings } from '../../../context/SettingsContext';
import { Save, Shield, AlertTriangle, Key } from 'lucide-react';
import toast from 'react-hot-toast';

const SecuritySettings = () => {
    const { settings, updateSettings, loading } = useSettings();
    const [formData, setFormData] = useState({});
    const [hasChanges, setHasChanges] = useState(false);

    useEffect(() => {
        if (settings) {
            setFormData(settings);
            setHasChanges(false);
        }
    }, [settings]);

    const handleChange = (key, value) => {
        setFormData(prev => {
            const updated = { ...prev, [key]: value };
            setHasChanges(JSON.stringify(updated) !== JSON.stringify(settings));
            return updated;
        });
    };

    const handleSave = async () => {
        const success = await updateSettings(formData);
        if (success) {
            setHasChanges(false);
            toast.success('Security policies updated!');
        }
    };

    return (
        <div className="space-y-8 animate-fade-in-up">
            <header className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white">Security & Access</h2>
                    <p className="text-slate-500">Configure access controls, trust score params, and emergency locks.</p>
                </div>
                {hasChanges && (
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className="animate-bounce-short px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/30 flex items-center gap-2 transition-all"
                    >
                        <Save className="w-4 h-4" /> Update Policies
                    </button>
                )}
            </header>

            <div className="grid lg:grid-cols-3 gap-6">
                {/* Access Logic */}
                <div className="lg:col-span-2 bg-white/50 dark:bg-slate-800/50 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-slate-700/50 p-6 space-y-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg text-amber-600 dark:text-amber-400">
                            <Key className="w-5 h-5" />
                        </div>
                        <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">Access Control Logic</h3>
                    </div>

                    <div className="space-y-6">
                        <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                            <div>
                                <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">New Student Registration</h4>
                                <p className="text-xs text-slate-500 mt-1">Allow students to sign up via public registration page.</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.allow_registration || false}
                                    onChange={(e) => handleChange('allow_registration', e.target.checked)}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-indigo-600"></div>
                            </label>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-100 dark:border-red-900/30">
                            <div>
                                <h4 className="font-bold text-sm text-red-700 dark:text-red-400">Emergency Maintenance Mode</h4>
                                <p className="text-xs text-red-600/70 mt-1">Locks application for all non-admin users immediately.</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.maintenance_mode || false}
                                    onChange={(e) => handleChange('maintenance_mode', e.target.checked)}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 dark:peer-focus:ring-red-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-red-600"></div>
                            </label>
                        </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-6 pt-4">
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Session Timeout (Minutes)</label>
                            <input
                                type="number"
                                value={formData.session_timeout || 60}
                                onChange={(e) => handleChange('session_timeout', parseInt(e.target.value))}
                                className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-sm"
                            />
                        </div>
                    </div>
                </div>

                {/* Trust Score Defaults */}
                <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-slate-700/50 p-6 space-y-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400">
                            <Shield className="w-5 h-5" />
                        </div>
                        <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">Trust Framework</h3>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Starting Trust Score</label>
                            <input
                                type="number"
                                value={formData.max_trust_score || 100}
                                onChange={(e) => handleChange('max_trust_score', parseInt(e.target.value))}
                                className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-lg text-indigo-600"
                            />
                            <p className="text-[10px] text-slate-500 mt-1">Default score assigned to new students.</p>
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Minimum Trust Threshold</label>
                            <input
                                type="number"
                                value={formData.min_trust_score || 0}
                                onChange={(e) => handleChange('min_trust_score', parseInt(e.target.value))}
                                className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-lg text-red-500"
                            />
                            <p className="text-[10px] text-slate-500 mt-1">Students below this score are auto-blocked.</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Admin Security PIN */}
            <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-slate-700/50 p-6 space-y-6">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-rose-100 dark:bg-rose-900/30 rounded-lg text-rose-600 dark:text-rose-400">
                        <Key className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">Restricted Access PIN</h3>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Set New PIN</label>
                        <input
                            type="password"
                            placeholder="Set new PIN..."
                            onChange={(e) => handleChange('new_admin_password', e.target.value)}
                            className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-sm"
                        />
                        <p className="text-[10px] text-slate-500 mt-2">
                            <AlertTriangle className="w-3 h-3 inline mr-1 text-amber-500" />
                            This PIN is required for high-security actions like changing policies or removing staff.
                        </p>
                    </div>
                </div>
            </div>
        </div>

    );
};

export default SecuritySettings;
