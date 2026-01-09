import React, { useState, useEffect } from 'react';
import { useSettings } from '../../../context/SettingsContext';
import { Save, Image, Upload, Palette } from 'lucide-react';
import toast from 'react-hot-toast';

const GeneralSettings = () => {
    const { settings, updateSettings, loading } = useSettings();
    const [formData, setFormData] = useState({});
    const [hasChanges, setHasChanges] = useState(false);
    const [imgError, setImgError] = useState(false);

    useEffect(() => {
        if (settings) {
            setFormData(settings);
            setHasChanges(false); // Reset on load
        }
    }, [settings]);

    const handleChange = (key, value) => {
        if (key === 'app_logo') setImgError(false);
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
            toast.success('Configuration saved!');
        }
    };

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5000000) return toast.error('Max 5MB');
            const reader = new FileReader();
            reader.onloadend = () => handleChange('app_logo', reader.result);
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="space-y-8 animate-fade-in-up">
            <header className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white">General & Branding</h2>
                    <p className="text-slate-500">Customize the identity and contact information of your instance.</p>
                </div>
                {hasChanges && (
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className="animate-bounce-short px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/30 flex items-center gap-2 transition-all"
                    >
                        <Save className="w-4 h-4" /> Save Configuration
                    </button>
                )}
            </header>

            <div className="grid lg:grid-cols-2 gap-8">
                {/* Identity Card */}
                <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-slate-700/50 p-6 space-y-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                            <Image className="w-5 h-5" />
                        </div>
                        <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">Visual Identity</h3>
                    </div>

                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Application Logo</label>
                        <div className="flex items-start gap-5">
                            <div className="relative group w-24 h-24 bg-slate-100 dark:bg-slate-900 rounded-2xl flex items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-700 overflow-hidden shrink-0 cursor-pointer hover:border-indigo-500 transition-colors">
                                {formData.app_logo && !imgError ? (
                                    <img
                                        src={formData.app_logo}
                                        alt="Logo"
                                        className="w-full h-full object-contain p-2"
                                        onError={() => setImgError(true)}
                                    />
                                ) : (
                                    <Upload className="w-8 h-8 text-slate-400" />
                                )}
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-bold transition-opacity pointer-events-none">
                                    Change
                                </div>
                                <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer z-10" onChange={handleImageUpload} />
                            </div>
                            <div className="flex-1 space-y-3">
                                <input
                                    type="text"
                                    value={formData.app_name || ''}
                                    onChange={(e) => handleChange('app_name', e.target.value)}
                                    placeholder="Application Name"
                                    className="w-full p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                />
                                <input
                                    type="text"
                                    value={formData.app_logo || ''}
                                    onChange={(e) => handleChange('app_logo', e.target.value)}
                                    placeholder="Or Image URL (https://...)"
                                    className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-600 dark:text-slate-400 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                />
                                <div className="text-xs text-slate-500">
                                    <p>Recommended: 512x512px Transparent PNG.</p>
                                    <p className="mt-1">This logo appears on the login screen and sidebar.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Login Background</label>
                        <div className="space-y-3">
                            <div className="relative group w-full h-40 bg-slate-100 dark:bg-slate-900 rounded-2xl flex items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-700 overflow-hidden cursor-pointer hover:border-indigo-500 transition-colors">
                                {formData.login_background ? (
                                    <img src={formData.login_background} alt="Background" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="flex flex-col items-center gap-2 text-slate-400">
                                        <Upload className="w-8 h-8" />
                                        <span className="text-xs font-bold">Upload 1920x1080 Image</span>
                                    </div>
                                )}
                                {formData.login_background && (
                                    <div className="absolute top-2 right-2 p-1 bg-white/10 backdrop-blur rounded-lg cursor-pointer z-20" onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleChange('login_background', '');
                                    }}>
                                        <Upload className="w-4 h-4 text-white rotate-45" />
                                    </div>
                                )}
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                    onChange={(e) => {
                                        const file = e.target.files[0];
                                        if (file) {
                                            if (file.size > 5000000) return toast.error('Max 5MB');
                                            const reader = new FileReader();
                                            reader.onloadend = () => handleChange('login_background', reader.result);
                                            reader.readAsDataURL(file);
                                        }
                                    }}
                                />
                            </div>
                            <input
                                type="text"
                                value={formData.login_background || ''}
                                onChange={(e) => handleChange('login_background', e.target.value)}
                                placeholder="Or Background Image URL (https://...)"
                                className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-600 dark:text-slate-400 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Announcement Banner</label>
                        <textarea
                            value={formData.announcement_text || ''}
                            onChange={(e) => handleChange('announcement_text', e.target.value)}
                            className="w-full p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm min-h-[80px] focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                            placeholder="Supports basic text (e.g. 'Maintenance scheduled at 10 PM'). Leave empty to hide."
                        />
                    </div>
                </div>

                {/* Contact & Theme Card */}
                <div className="space-y-6">
                    <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-slate-700/50 p-6 space-y-6">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg text-emerald-600 dark:text-emerald-400">
                                <Palette className="w-5 h-5" />
                            </div>
                            <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">Theme Colors</h3>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Primary</label>
                                <div className="flex items-center gap-2 p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl">
                                    <input
                                        type="color"
                                        value={formData.theme_primary || '#4F46E5'}
                                        onChange={(e) => handleChange('theme_primary', e.target.value)}
                                        className="w-8 h-8 rounded cursor-pointer bg-transparent border-none"
                                    />
                                    <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-400">{formData.theme_primary}</span>
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Secondary</label>
                                <div className="flex items-center gap-2 p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl">
                                    <input
                                        type="color"
                                        value={formData.theme_secondary || '#10B981'}
                                        onChange={(e) => handleChange('theme_secondary', e.target.value)}
                                        className="w-8 h-8 rounded cursor-pointer bg-transparent border-none"
                                    />
                                    <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-400">{formData.theme_secondary}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-slate-700/50 p-6 space-y-6">
                        <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">Contact Information</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Support Email</label>
                                <input
                                    type="email"
                                    value={formData.contact_email || ''}
                                    onChange={(e) => handleChange('contact_email', e.target.value)}
                                    placeholder="support@college.edu"
                                    className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Helpline Phone</label>
                                <input
                                    type="tel"
                                    value={formData.contact_phone || ''}
                                    onChange={(e) => handleChange('contact_phone', e.target.value)}
                                    placeholder="+91 99999 99999"
                                    className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GeneralSettings;
