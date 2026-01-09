import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { Siren, AlertTriangle, Send, ShieldAlert, CheckCircle, XCircle, History, Clock } from 'lucide-react';

const MedicalOverride = () => {
    const [email, setEmail] = useState('');
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState(null);
    const [history, setHistory] = useState([]);

    const fetchHistory = async () => {
        try {
            const res = await axios.get('/api/staff/proxy/medical-history');
            setHistory(res.data);
        } catch (error) {
            console.error('Failed to fetch history', error);
        }
    };

    useEffect(() => {
        fetchHistory();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setStatus(null);

        try {
            const res = await axios.post('/api/staff/proxy/medical-override', {
                studentEmail: email,
                reason
            });
            setStatus({ type: 'success', message: res.data.message });
            setEmail('');
            setReason('');
            fetchHistory(); // Refresh table
        } catch (error) {
            setStatus({ type: 'error', message: error.response?.data?.message || 'Override Failed.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-10">
            <div className="flex items-center gap-4 mb-8">
                <div className="p-3 bg-red-100 dark:bg-red-900/20 rounded-xl">
                    <Siren className="w-8 h-8 text-red-600 dark:text-red-500 animate-pulse" />
                </div>
                <div>
                    <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">
                        Critical Emergency Protocol
                    </h1>
                    <p className="text-gray-500 dark:text-slate-400 font-medium">
                        Assistant HOD / Delegated Authority Channel
                    </p>
                </div>
            </div>

            {/* Warning Banner */}
            <div className="bg-amber-50 dark:bg-amber-900/10 border-l-4 border-amber-500 p-6 rounded-r-xl shadow-sm">
                <div className="flex gap-4">
                    <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0" />
                    <div className="space-y-2">
                        <h3 className="font-bold text-amber-900 dark:text-amber-100">Restricted Action Area</h3>
                        <p className="text-sm text-amber-800 dark:text-amber-200/80 leading-relaxed">
                            This interface allows immediate generation of <strong>Medical Emergency Passes</strong> under delegated HOD authority.
                            This action bypasses standard warden checks and is logged as a critical security event.
                            <br />
                            <strong>Use only for genuine life-safety or urgent medical situations.</strong>
                        </p>
                    </div>
                </div>
            </div>

            {/* Override Form */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-red-100 dark:border-red-900/30 shadow-2xl shadow-red-500/5 relative overflow-hidden"
            >
                {/* Decorative Background */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

                <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-700 dark:text-slate-300 ml-1">Student Email Address</label>
                            <div className="relative group">
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3.5 pl-11 outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all font-medium"
                                    placeholder="student@university.edu"
                                />
                                <ShieldAlert className="absolute left-3.5 top-3.5 w-5 h-5 text-gray-400 group-focus-within:text-red-500 transition-colors" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-700 dark:text-slate-300 ml-1">Emergency Reason</label>
                            <input
                                type="text"
                                required
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3.5 outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all font-medium"
                                placeholder="e.g., Severe Allergic Reaction, Fracture"
                            />
                        </div>
                    </div>

                    <div className="pt-4 flex items-center justify-end gap-4">
                        {status && (
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold ${status.type === 'success' ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'}`}
                            >
                                {status.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                                {status.message}
                            </motion.div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="bg-red-600 hover:bg-red-700 text-white px-8 py-3.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-red-500/30 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></span>
                            ) : (
                                <>
                                    <Send className="w-5 h-5" />
                                    AUTHORIZE OVERRIDE
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </motion.div>

            {/* History Table */}
            <div className="space-y-4">
                <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                    <History className="w-5 h-5" />
                    Recent Override Actions
                </h3>

                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 dark:bg-slate-800/50 text-xs uppercase text-gray-500 dark:text-slate-400 font-bold">
                                <tr>
                                    <th className="px-6 py-4">Timestamp</th>
                                    <th className="px-6 py-4">Student</th>
                                    <th className="px-6 py-4">Reason</th>
                                    <th className="px-6 py-4">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                                {history.length === 0 ? (
                                    <tr>
                                        <td colSpan="4" className="px-6 py-8 text-center text-gray-400 dark:text-slate-500 text-sm">
                                            No overrides recorded yet.
                                        </td>
                                    </tr>
                                ) : (
                                    history.map((item, index) => (
                                        <tr key={index} className="hover:bg-gray-50 dark:hover:bg-slate-800/30 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-slate-300">
                                                    <Clock className="w-4 h-4 text-gray-400" />
                                                    {new Date(item.timestamp).toLocaleString()}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div>
                                                    <p className="text-sm font-bold text-gray-900 dark:text-white">{item.student_name}</p>
                                                    <p className="text-xs text-gray-500">{item.register_number}</p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600 dark:text-slate-300">
                                                {item.reason}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="px-2 py-1 text-xs font-bold rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                                    ISSUED
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MedicalOverride;
