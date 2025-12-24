import React, { useState } from 'react';
import axios from 'axios';
import { ShieldAlert, Send, AlertTriangle, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const HODMedical = () => {
    const [email, setEmail] = useState('');
    const [reason, setReason] = useState('');
    const [status, setStatus] = useState(null); // success | error
    const [msg, setMsg] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setStatus(null);
        try {
            await axios.post('/api/hod/medical-override', { studentEmail: email, reason });
            setStatus('success');
            setMsg('Emergency Pass Authorized. SMS sent to Parents & Warden.');
            setEmail('');
            setReason('');
        } catch (err) {
            setStatus('error');
            setMsg(err.response?.data?.message || 'Authorization Failed');
        }
    };

    return (
        <div className="space-y-8 max-w-2xl mx-auto">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-2xl">
                    <ShieldAlert className="w-8 h-8 text-red-600 dark:text-red-400" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Medical Override</h2>
                    <p className="text-red-600 dark:text-red-400 text-sm font-medium">Critical Emergency Authorization</p>
                </div>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-red-100 dark:border-red-900/30 shadow-2xl relative overflow-hidden"
            >
                <div className="absolute top-0 right-0 p-4 opacity-5 dark:opacity-10">
                    <ShieldAlert className="w-32 h-32 text-red-600" />
                </div>

                <div className="relative z-10 mb-8 p-4 bg-red-50 dark:bg-red-900/20 rounded-2xl border border-red-100 dark:border-red-900/30 flex gap-3">
                    <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400 shrink-0" />
                    <div>
                        <h3 className="font-bold text-red-800 dark:text-red-400">Critical Action Protocol</h3>
                        <p className="text-red-600 dark:text-red-500/80 text-sm mt-1 leading-relaxed">
                            This bypasses standard approval workflows. An <strong>IMMEDIATE</strong> exit pass will be generated and broadcasted to campus security.
                        </p>
                    </div>
                </div>

                <AnimatePresence>
                    {status && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className={`p-4 rounded-xl mb-6 flex items-center gap-3 font-bold text-sm ${status === 'success'
                                    ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                                    : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                                }`}
                        >
                            {status === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                            {msg}
                        </motion.div>
                    )}
                </AnimatePresence>

                <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
                    <div>
                        <label className="text-[10px] font-extrabold text-gray-400 dark:text-slate-500 uppercase tracking-widest ml-1">Student Identification</label>
                        <input
                            type="email"
                            placeholder="student@universe.com"
                            className="w-full bg-gray-50 dark:bg-slate-800 border-none rounded-xl p-4 mt-1 dark:text-white outline-none focus:ring-2 focus:ring-red-500 transition"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-extrabold text-gray-400 dark:text-slate-500 uppercase tracking-widest ml-1">Emergency Context</label>
                        <textarea
                            placeholder="Briefly describe the medical condition or emergency..."
                            className="w-full bg-gray-50 dark:bg-slate-800 border-none rounded-xl p-4 mt-1 dark:text-white outline-none focus:ring-2 focus:ring-red-500 transition"
                            rows="3"
                            required
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-xl transition shadow-xl shadow-red-500/30 flex items-center justify-center gap-3 group active:scale-[0.98]"
                    >
                        <ShieldAlert className="w-6 h-6 group-hover:animate-pulse" />
                        AUTHORIZE EMERGENCY EXIT
                    </button>
                </form>
            </motion.div>
        </div>
    );
};

export default HODMedical;
