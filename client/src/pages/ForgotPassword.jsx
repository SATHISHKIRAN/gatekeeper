import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Mail, Phone, Key, Lock, ArrowRight, Loader2, CheckCircle, ShieldCheck, UserSearch } from 'lucide-react';
import axios from 'axios';
import { useSettings } from '../context/SettingsContext';

const ForgotPassword = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { settings } = useSettings();

    // Detect flow type from query param (?flow=email or ?flow=password)
    const queryParams = new URLSearchParams(location.search);
    const initialFlow = queryParams.get('flow') === 'email' ? 'email' : 'password';

    const [flow, setFlow] = useState(initialFlow);
    const [step, setStep] = useState(1);
    const [email, setEmail] = useState('');
    const [maskedPhone, setMaskedPhone] = useState('');
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [recoveredEmails, setRecoveredEmails] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const primaryColor = settings?.theme_primary || '#4F46E5';

    // Reset state if flow changes
    useEffect(() => {
        setStep(1);
        setError('');
        // Keep inputs if relevant or clear them
    }, [flow]);

    // --- Forgot Password Methods ---
    const handlePasswordInit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const res = await axios.post('/api/auth/forgot-password/init', { email });
            setMaskedPhone(res.data.maskedPhone);
            setStep(2);
        } catch (err) {
            setError(err.response?.data?.message || 'Email not found');
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordSendOTP = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await axios.post('/api/auth/forgot-password/send-otp', { email, phone });
            setStep(3);
        } catch (err) {
            setError(err.response?.data?.message || 'Phone number mismatch');
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordVerifyOTP = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await axios.post('/api/auth/forgot-password/verify-otp', { email, otp });
            setStep(4);
        } catch (err) {
            setError(err.response?.data?.message || 'Invalid or expired OTP');
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordReset = async (e) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }
        setError('');
        setLoading(true);
        try {
            await axios.post('/api/auth/forgot-password/reset', { email, otp, newPassword });
            setStep(5);
            setTimeout(() => navigate('/'), 1000);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to reset password');
        } finally {
            setLoading(false);
        }
    };

    // --- Forgot Email Methods ---
    const handleEmailInit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await axios.post('/api/auth/forgot-email/init', { phone });
            setStep(2);
        } catch (err) {
            setError(err.response?.data?.message || 'Phone number not found');
        } finally {
            setLoading(false);
        }
    };

    const handleEmailVerify = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const res = await axios.post('/api/auth/forgot-email/verify', { phone, otp });
            setRecoveredEmails(res.data.emails);
            setStep(3);
        } catch (err) {
            setError(err.response?.data?.message || 'Invalid or expired OTP');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8 font-sans transition-colors duration-500">
            <div className="w-full max-w-md space-y-8 bg-white p-10 rounded-2xl shadow-xl border border-gray-100">
                <div className="text-center">
                    <div className="mx-auto h-16 w-16 bg-indigo-50 rounded-2xl flex items-center justify-center mb-6">
                        {flow === 'password' ? (
                            <Lock className="h-10 w-10 text-indigo-600" style={{ color: primaryColor }} />
                        ) : (
                            <UserSearch className="h-10 w-10 text-indigo-600" style={{ color: primaryColor }} />
                        )}
                    </div>
                    <h2 className="mt-2 text-3xl font-bold tracking-tight text-gray-900">
                        {flow === 'password' ? 'Reset Password' : 'Recover Email'}
                    </h2>
                    <p className="mt-2 text-sm text-gray-600">
                        {flow === 'password' ? (
                            <>
                                {step === 1 && "Enter your email to locate your account"}
                                {step === 2 && "Confirm your identity with your mobile number"}
                                {step === 3 && "Enter the OTP sent to your WhatsApp"}
                                {step === 4 && "Set your new password"}
                                {step === 5 && "Success! Your password has been updated."}
                            </>
                        ) : (
                            <>
                                {step === 1 && "Enter your phone number to find your account email"}
                                {step === 2 && "Enter the OTP sent to your WhatsApp"}
                                {step === 3 && "Here are the email addresses found for your number"}
                            </>
                        )}
                    </p>
                </div>

                {error && (
                    <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md">
                        <p className="text-sm text-red-700 font-medium">{error}</p>
                    </div>
                )}

                {/* --- FORGOT PASSWORD STEPS --- */}
                {flow === 'password' && (
                    <div className="space-y-6">
                        {step === 1 && (
                            <form className="space-y-6" onSubmit={handlePasswordInit}>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                                    <input
                                        type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                                        className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
                                        placeholder="Enter your email" style={{ '--tw-ring-color': primaryColor }}
                                    />
                                </div>
                                <button
                                    type="submit" disabled={loading}
                                    className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-bold rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 transition shadow-lg"
                                    style={{ backgroundColor: primaryColor }}
                                >
                                    {loading ? <Loader2 className="animate-spin" /> : "Continue"}
                                </button>
                                <div className="text-center">
                                    <button onClick={() => setFlow('email')} className="text-sm text-gray-500 hover:text-indigo-600">Forgot your email instead?</button>
                                </div>
                            </form>
                        )}

                        {step === 2 && (
                            <form className="space-y-6" onSubmit={handlePasswordSendOTP}>
                                <div className="p-3 bg-indigo-50 rounded-lg text-center font-mono text-indigo-700 font-bold mb-4">
                                    {maskedPhone}
                                </div>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                                    <input
                                        type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)}
                                        className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
                                        placeholder="Enter full mobile number" style={{ '--tw-ring-color': primaryColor }}
                                    />
                                </div>
                                <p className="text-xs text-center text-gray-500 font-medium">We'll send an OTP to this number via WhatsApp if it matches.</p>
                                <button
                                    type="submit" disabled={loading}
                                    className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-bold rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 transition shadow-lg shadow-indigo-500/20"
                                    style={{ backgroundColor: primaryColor }}
                                >
                                    {loading ? <Loader2 className="animate-spin" /> : "Send OTP"}
                                </button>
                            </form>
                        )}

                        {step === 3 && (
                            <form className="space-y-6" onSubmit={handlePasswordVerifyOTP}>
                                <div className="relative">
                                    <Key className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                                    <input
                                        type="text" required maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value)}
                                        className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 transition-all font-medium text-center tracking-widest text-lg"
                                        placeholder="Enter 6-digit OTP" style={{ '--tw-ring-color': primaryColor }}
                                    />
                                </div>
                                <button
                                    type="submit" disabled={loading}
                                    className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-bold rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 transition shadow-lg"
                                    style={{ backgroundColor: primaryColor }}
                                >
                                    {loading ? <Loader2 className="animate-spin" /> : "Verify OTP"}
                                </button>
                                <button type="button" onClick={() => setStep(2)} className="w-full text-xs text-gray-500 hover:text-indigo-600 text-center">Wrong phone number? Go back</button>
                            </form>
                        )}

                        {step === 4 && (
                            <form className="space-y-4" onSubmit={handlePasswordReset}>
                                <div className="space-y-4">
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                                        <input
                                            type="password" required value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                                            className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 transition-all"
                                            placeholder="New Password" style={{ '--tw-ring-color': primaryColor }}
                                        />
                                    </div>
                                    <div className="relative">
                                        <ShieldCheck className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                                        <input
                                            type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                                            className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 transition-all"
                                            placeholder="Confirm Password" style={{ '--tw-ring-color': primaryColor }}
                                        />
                                    </div>
                                </div>
                                <button
                                    type="submit" disabled={loading}
                                    className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-bold rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 transition shadow-lg"
                                    style={{ backgroundColor: primaryColor }}
                                >
                                    {loading ? <Loader2 className="animate-spin" /> : "Reset Password"}
                                </button>
                            </form>
                        )}

                        {step === 5 && (
                            <div className="text-center space-y-6">
                                <div className="mx-auto h-20 w-20 bg-green-50 rounded-full flex items-center justify-center">
                                    <CheckCircle className="h-12 w-12 text-green-500" />
                                </div>
                                <p className="text-gray-600">Redirecting to login page in 3 seconds...</p>
                                <button onClick={() => navigate('/')} className="w-full py-3 text-indigo-600 font-bold hover:underline" style={{ color: primaryColor }}>Return to Login now</button>
                            </div>
                        )}
                    </div>
                )}

                {/* --- FORGOT EMAIL STEPS --- */}
                {flow === 'email' && (
                    <div className="space-y-6">
                        {step === 1 && (
                            <form className="space-y-6" onSubmit={handleEmailInit}>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                                    <input
                                        type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)}
                                        className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
                                        placeholder="Enter your phone number" style={{ '--tw-ring-color': primaryColor }}
                                    />
                                </div>
                                <button
                                    type="submit" disabled={loading}
                                    className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-bold rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 transition shadow-lg"
                                    style={{ backgroundColor: primaryColor }}
                                >
                                    {loading ? <Loader2 className="animate-spin" /> : "Send OTP"}
                                </button>
                                <div className="text-center">
                                    <button onClick={() => setFlow('password')} className="text-sm text-gray-500 hover:text-indigo-600">Forgot your password instead?</button>
                                </div>
                            </form>
                        )}

                        {step === 2 && (
                            <form className="space-y-6" onSubmit={handleEmailVerify}>
                                <div className="relative">
                                    <Key className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                                    <input
                                        type="text" required maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value)}
                                        className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 transition-all font-medium text-center tracking-widest text-lg"
                                        placeholder="Enter 6-digit OTP" style={{ '--tw-ring-color': primaryColor }}
                                    />
                                </div>
                                <button
                                    type="submit" disabled={loading}
                                    className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-bold rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 transition shadow-lg"
                                    style={{ backgroundColor: primaryColor }}
                                >
                                    {loading ? <Loader2 className="animate-spin" /> : "Verify OTP"}
                                </button>
                                <button type="button" onClick={() => setStep(1)} className="w-full text-xs text-gray-500 hover:text-indigo-600 text-center">Wrong phone number? Go back</button>
                            </form>
                        )}

                        {step === 3 && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="space-y-3">
                                    {recoveredEmails.map((email, idx) => (
                                        <div key={idx} className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center gap-3">
                                            <Mail className="w-5 h-5 text-indigo-600" />
                                            <span className="font-bold text-gray-800 break-all">{email}</span>
                                        </div>
                                    ))}
                                </div>
                                <button
                                    onClick={() => navigate('/')}
                                    className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-bold rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 transition shadow-lg"
                                    style={{ backgroundColor: primaryColor }}
                                >
                                    Continue to Login
                                </button>
                            </div>
                        )}
                    </div>
                )}

                <div className="text-center pt-4">
                    <button onClick={() => navigate('/')} className="text-sm text-gray-500 hover:text-indigo-600 transition">
                        Back to Login
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;
