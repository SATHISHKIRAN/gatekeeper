import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, ArrowRight, ShieldCheck, Loader2, Eye, EyeOff, Download } from 'lucide-react';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [installPrompt, setInstallPrompt] = useState(null);

    const { login } = useAuth();
    const { settings } = useSettings();
    const navigate = useNavigate();

    useEffect(() => {
        const handler = (e) => {
            e.preventDefault();
            setInstallPrompt(e);
        };
        window.addEventListener('beforeinstallprompt', handler);
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstallClick = async () => {
        if (!installPrompt) return;
        installPrompt.prompt();
        const { outcome } = await installPrompt.userChoice;
        if (outcome === 'accepted') {
            setInstallPrompt(null);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            // Slight artificial delay for UX smoothness
            await new Promise(r => setTimeout(r, 600));

            const user = await login(email, password);
            // Role-based redirect
            switch (user.role) {
                case 'student': navigate('/student/dashboard'); break;
                case 'staff': navigate('/staff/queue'); break;
                case 'hod': navigate('/hod/dashboard'); break;
                case 'warden': navigate('/warden/verify'); break;
                case 'gatekeeper': navigate('/gate/dashboard'); break;
                case 'admin': navigate('/admin/analytics'); break;
                default: navigate('/');
            }
        } catch (err) {
            setError('Invalid credentials');
            setLoading(false);
        }
    };

    const primaryColor = settings?.theme_primary || '#4F46E5';

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8 font-sans transition-colors duration-200">
            <div className="w-full max-w-md space-y-8 bg-white p-10 rounded-2xl shadow-xl border border-gray-100 relative">

                {/* Install Button (Mobile Only usually, but shown if trigger exists) */}
                {installPrompt && (
                    <button
                        onClick={handleInstallClick}
                        className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-lg hover:bg-indigo-100 transition-colors"
                        style={{ color: primaryColor, backgroundColor: `${primaryColor} 15` }}
                    >
                        <Download className="w-3.5 h-3.5" />
                        Install App
                    </button>
                )}

                {/* Header Section */}
                <div className="text-center">
                    {settings?.app_logo && (settings.app_logo.startsWith('http') || settings.app_logo.startsWith('data:')) ? (
                        <div className="w-24 h-24 mx-auto mb-6 relative">
                            <img src={settings.app_logo} alt="Logo" className="w-full h-full object-contain" />
                        </div>
                    ) : (
                        <div className="mx-auto h-16 w-16 bg-indigo-50 rounded-2xl flex items-center justify-center mb-6">
                            <ShieldCheck className="h-10 w-10 text-indigo-600" style={{ color: primaryColor }} />
                        </div>
                    )}

                    <h2 className="mt-2 text-3xl font-bold tracking-tight text-gray-900">
                        {settings?.app_name || 'GateKeeper'}
                    </h2>
                    <p className="mt-2 text-sm text-gray-600">
                        {settings?.announcement_text || 'Sign in to access your dashboard'}
                    </p>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md">
                        <div className="flex">
                            <div className="ml-3">
                                <p className="text-sm text-red-700 font-medium">{error}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Login Form */}
                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                                Email Address
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Mail className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-all"
                                    placeholder="Enter your email"
                                    style={{ '--tw-ring-color': primaryColor, '--tw-border-opacity': '1' }}
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                                Password
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    id="password"
                                    name="password"
                                    type={showPassword ? "text" : "password"}
                                    autoComplete="current-password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-all"
                                    placeholder="Enter your password"
                                    style={{ '--tw-ring-color': primaryColor }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors focus:outline-none"
                                >
                                    {showPassword ? (
                                        <EyeOff className="h-5 w-5" />
                                    ) : (
                                        <Eye className="h-5 w-5" />
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="text-sm">
                            <button
                                type="button"
                                onClick={() => navigate('/forgot-password?flow=email')}
                                className="font-medium text-gray-500 hover:text-indigo-600 transition-colors"
                            >
                                Forgot email?
                            </button>
                        </div>
                        <div className="text-sm">
                            <button
                                type="button"
                                onClick={() => navigate('/forgot-password?flow=password')}
                                className="font-medium text-indigo-600 hover:text-indigo-500 transition-colors"
                                style={{ color: primaryColor }}
                            >
                                Forgot password?
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-bold rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors shadow-lg shadow-indigo-500/30"
                        style={{ backgroundColor: primaryColor, boxShadow: `0 10px 15px -3px ${primaryColor}40` }}
                    >
                        {loading ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                            <span className="flex items-center gap-2">
                                Sign In <ArrowRight className="h-4 w-4" />
                            </span>
                        )}
                    </button>

                </form>
            </div>

            <div className="fixed bottom-4 text-center w-full text-xs text-gray-400">
                © 2025 {settings?.app_name || 'GateKeeper'}. All rights reserved.
            </div>
        </div>
    );
};

export default Login;
