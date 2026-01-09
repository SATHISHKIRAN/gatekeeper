import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, ArrowRight, ShieldCheck, Loader2, Eye, EyeOff, Download, Sparkles } from 'lucide-react';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
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

    // Redirect if already logged in
    const { user } = useAuth();
    useEffect(() => {
        if (user) {
            switch (user.role) {
                case 'student': navigate('/student/dashboard'); break;
                case 'staff': navigate('/staff/queue'); break;
                case 'hod': navigate('/hod/dashboard'); break;
                case 'warden': navigate('/warden/verify'); break;
                case 'gatekeeper': navigate('/gate/dashboard'); break;
                case 'admin': navigate('/admin/analytics'); break;
                case 'principal': navigate('/principal/dashboard'); break;
                default: navigate('/');
            }
        }
    }, [user, navigate]);

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
            // await new Promise(r => setTimeout(r, 800)); // Cinematic delay removed for speed
            const user = await login(email, password, rememberMe);
            switch (user.role) {
                case 'student': navigate('/student/dashboard'); break;
                case 'staff': navigate('/staff/queue'); break;
                case 'hod': navigate('/hod/dashboard'); break;
                case 'warden': navigate('/warden/verify'); break;
                case 'gatekeeper': navigate('/gate/dashboard'); break;
                case 'admin': navigate('/admin/analytics'); break;
                case 'principal': navigate('/principal/dashboard'); break;
                default: navigate('/');
            }
        } catch (err) {
            setError(err || 'Invalid credentials');
            setLoading(false);
        }
    };

    const primaryColor = settings?.theme_primary || '#4F46E5';
    const bgImage = settings?.login_background || null;

    return (
        <div className="min-h-screen relative flex items-center justify-center font-sans overflow-hidden bg-slate-900 selection:bg-indigo-500/30 selection:text-indigo-200">
            {/* --- Dynamic Background --- */}
            <div className="absolute inset-0 z-0">
                {bgImage ? (
                    <>
                        <div
                            className="absolute inset-0 bg-cover bg-center transition-transform duration-[20s] ease-in-out scale-110 animate-slow-zoom"
                            style={{ backgroundImage: `url(${bgImage})` }}
                        />
                        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[4px]" />
                        {/* Gradient Overlay for depth */}
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent" />
                    </>
                ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 animate-gradient-xy">
                        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '40px 40px' }}></div>
                    </div>
                )}
            </div>

            {/* --- Noise Texture (Cinema Effect) --- */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none z-[1]"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}
            />

            {/* --- Main Glass Card --- */}
            <div className="relative z-10 w-full max-w-[420px] p-6 sm:p-0 mx-4">
                <div className={`
                    relative overflow-hidden
                    rounded-[2rem] 
                    bg-white/10 dark:bg-black/20 
                    backdrop-blur-3xl 
                    shadow-2xl shadow-black/50
                    border border-white/10 dark:border-white/5
                    transition-all duration-500
                    animate-fade-in-up
                `}>
                    {/* Glass sheen reflection */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent opacity-50 pointer-events-none" />

                    {/* Content Container */}
                    <div className="relative p-8 sm:p-10 space-y-8">

                        {/* Install App Button (Floating) */}
                        {installPrompt && (
                            <button
                                onClick={handleInstallClick}
                                className="absolute top-4 right-4 group flex items-center gap-2 px-3 py-1.5 
                                bg-white/10 hover:bg-white/20 text-white/90 text-xs font-bold 
                                rounded-full transition-all border border-white/10 backdrop-blur-md"
                            >
                                <Download className="w-3.5 h-3.5 group-hover:-translate-y-0.5 transition-transform" />
                                <span>Get App</span>
                            </button>
                        )}

                        {/* Top Section: Logo & Titles */}
                        <div className="text-center space-y-6">
                            <div className="relative inline-block group">
                                <div
                                    className="absolute inset-0 rounded-3xl blur-xl opacity-40 group-hover:opacity-60 transition-all duration-700"
                                    style={{ backgroundColor: primaryColor }}
                                ></div>
                                <div className="relative w-24 h-24 bg-gradient-to-b from-white to-slate-100 dark:from-slate-800 dark:to-slate-900 rounded-3xl flex items-center justify-center shadow-lg border border-white/40 ring-1 ring-black/5 transform group-hover:scale-105 transition-all duration-500">
                                    {settings?.app_logo ? (
                                        <img src={settings.app_logo} alt="Logo" className="w-14 h-14 object-contain" />
                                    ) : (
                                        <ShieldCheck className="w-12 h-12" style={{ color: primaryColor }} />
                                    )}
                                </div>
                                <div className="absolute -bottom-2 -right-2 bg-green-500 text-white p-1.5 rounded-full border-2 border-slate-900 shadow-sm" title="System Online">
                                    <Sparkles className="w-3 h-3" fill="currentColor" />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <h1 className="text-3xl font-black text-white tracking-tight drop-shadow-md">
                                    {settings?.app_name || 'GateKeeper'}
                                </h1>
                                <p className="text-sm font-medium text-slate-300/80 tracking-wide uppercase text-[11px] letter-spacing-2">
                                    {settings?.announcement_text || 'Secure Campus Access Portal'}
                                </p>
                            </div>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-5">
                                {/* Email Field */}
                                <div className="group relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Mail
                                            className="h-5 w-5 text-slate-400 group-focus-within:text-white transition-colors duration-300"
                                            style={{ color: error ? '#F87171' : undefined }}
                                        />
                                    </div>
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="block w-full pl-11 pr-4 py-4 bg-slate-900/40 border border-slate-700/50 rounded-xl 
                                        text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-transparent
                                        focus:bg-slate-900/60 transition-all duration-300 sm:text-sm shadow-inner"
                                        placeholder="Gmail ID"
                                        style={{
                                            '--tw-ring-color': primaryColor,
                                            borderColor: error ? '#991B1B' : undefined
                                        }}
                                    />
                                </div>

                                {/* Password Field */}
                                <div className="group relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Lock
                                            className="h-5 w-5 text-slate-400 group-focus-within:text-white transition-colors duration-300"
                                            style={{ color: error ? '#F87171' : undefined }}
                                        />
                                    </div>
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="block w-full pl-11 pr-12 py-4 bg-slate-900/40 border border-slate-700/50 rounded-xl 
                                        text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-transparent
                                        focus:bg-slate-900/60 transition-all duration-300 sm:text-sm shadow-inner"
                                        placeholder="Password"
                                        style={{
                                            '--tw-ring-color': primaryColor,
                                            borderColor: error ? '#991B1B' : undefined
                                        }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-white transition-colors cursor-pointer"
                                    >
                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>

                            {/* Utility Row */}
                            <div className="flex items-center justify-between text-xs sm:text-sm">
                                <label className="flex items-center space-x-2 cursor-pointer group">
                                    <div className="relative flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={rememberMe}
                                            onChange={(e) => setRememberMe(e.target.checked)}
                                            className="peer h-4 w-4 rounded border-slate-600 bg-slate-800 text-transparent focus:ring-0 checked:bg-current transition-all cursor-pointer appearance-none"
                                            style={{ color: primaryColor }}
                                        />
                                        <div className="absolute inset-0 flex items-center justify-center text-white pointer-events-none opacity-0 peer-checked:opacity-100">
                                            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4">
                                                <polyline points="20 6 9 17 4 12" />
                                            </svg>
                                        </div>
                                    </div>
                                    <span className="text-slate-400 group-hover:text-slate-200 transition-colors">Keep me signed in</span>
                                </label>
                                <button
                                    type="button"
                                    onClick={() => navigate('/forgot-password?flow=password')}
                                    className="font-semibold transition-colors hover:underline decoration-2 underline-offset-4"
                                    style={{ color: primaryColor }}
                                >
                                    Forgot Password?
                                </button>
                            </div>

                            {/* Error Message */}
                            {error && (
                                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-200 text-sm font-medium text-center animate-shake backdrop-blur-sm">
                                    {error}
                                </div>
                            )}

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={loading}
                                className="group relative w-full flex justify-center py-4 px-4 border border-transparent text-sm font-bold rounded-xl text-white overflow-hidden transition-all shadow-lg hover:shadow-2xl disabled:opacity-70 disabled:cursor-not-allowed"
                                style={{ backgroundColor: primaryColor }}
                            >
                                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
                                <div className="relative flex items-center gap-2">
                                    {loading ? (
                                        <>
                                            <Loader2 className="h-5 w-5 animate-spin text-white/90" />
                                            <span>Authenticating...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span>Enter Secure Portal</span>
                                            <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                                        </>
                                    )}
                                </div>
                            </button>
                        </form>
                    </div>

                    {/* Card Footer Stripe */}
                    <div className="h-1.5 w-full bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-50" />
                </div>

                {/* Bottom Watermark */}
                <p className="mt-8 text-center text-[10px] uppercase tracking-widest text-slate-500/60 font-medium">
                    2026@Protected by {settings?.app_name || 'GateKeeper'} System
                </p>
            </div>
        </div>
    );
};

export default Login;
