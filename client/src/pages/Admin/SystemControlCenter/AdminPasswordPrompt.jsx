import React, { useState } from 'react';
import { Lock, ArrowRight, ShieldAlert } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';

const AdminPasswordPrompt = ({ onVerify }) => {
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const { token } = useAuth();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const response = await axios.post(
                '/api/settings/verify-pin',
                { password },
                {
                    headers: { Authorization: token },
                    withCredentials: true
                }
            );

            if (response.data.success) {
                toast.success('Access Granted');
                onVerify();
            } else {
                toast.error(response.data.message || 'Invalid Security PIN');
                setPassword('');
            }
        } catch (error) {
            console.error(error);
            toast.error('Verification failed. Server might be unreachable.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-2xl border border-slate-200 dark:border-slate-800"
            >
                <div className="w-20 h-20 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Lock className="w-10 h-10 text-indigo-600 dark:text-indigo-400" />
                </div>

                <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Restricted Access</h2>
                <p className="text-slate-500 text-sm mb-8">
                    This area contains sensitive system configurations. Please enter your secondary <strong>Security PIN</strong> to proceed.
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="relative">
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter Security PIN"
                            className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl focus:outline-none focus:border-indigo-500 font-bold tracking-widest text-center text-lg transition-all"
                            autoFocus
                        />
                        <ShieldAlert className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    </div>

                    <button
                        type="submit"
                        disabled={loading || !password}
                        className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-xl shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all transform active:scale-95"
                    >
                        {loading ? 'Verifying...' : 'Unlock System Control'}
                        {!loading && <ArrowRight className="w-5 h-5" />}
                    </button>

                    <div className="pt-4 text-xs text-slate-400">
                        <p>Default PIN: <strong>admin123</strong> (if not set)</p>
                    </div>
                </form>
            </motion.div>
        </div>
    );
};

export default AdminPasswordPrompt;
