import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Clock, CheckCircle, Shield, History, MapPin,
    CreditCard, Lock, Eye, EyeOff, RefreshCcw, Wifi, Battery, Signal,
    UserCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';

const LiveClock = () => {
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="flex flex-col items-center justify-center p-6 bg-slate-900 text-white rounded-2xl shadow-lg border border-slate-700 relative overflow-hidden">
            <div className="absolute inset-0 bg-indigo-500/10 animate-pulse"></div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-1 relative z-10 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
                Official Standard Time
            </p>
            <div className="text-5xl font-black font-mono tracking-wider relative z-10 tabular-nums">
                {time.toLocaleTimeString('en-US', { hour12: false })}
            </div>
            <p className="text-sm text-slate-400 font-bold mt-2 relative z-10">
                {time.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
        </div>
    );
};

const StudentWallet = () => {
    const { user } = useAuth();
    const [walletData, setWalletData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchWalletData();
        // Auto-refresh data every 30 seconds to keep status live
        const interval = setInterval(fetchWalletData, 30000);
        return () => clearInterval(interval);
    }, []);

    const fetchWalletData = async () => {
        try {
            const res = await axios.get('/api/student/wallet');
            setWalletData(res.data);
            setLoading(false);
        } catch (err) {
            console.error(err);
            setLoading(false);
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm font-bold text-gray-500 uppercase tracking-widest animate-pulse">Syncing Secure Wallet...</p>
            </div>
        </div>
    );

    const { identity, activePass, history } = walletData;

    return (
        <div className="max-w-5xl mx-auto pb-12 animate-fade-in space-y-8">

            {/* Top Bar: Title & Live Status */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Digital Wallet</h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Live Identity & Access Tokens</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                {/* Left Column: Clock & Identity (5 cols) */}
                <div className="lg:col-span-5 space-y-6">

                    {/* Digital ID Card */}
                    <div className="relative group perspective-1000">
                        <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-500"></div>
                        <div className="relative h-64 bg-slate-900 rounded-xl overflow-hidden shadow-2xl text-white border border-slate-700 flex flex-col">
                            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
                            <div className="absolute top-0 right-0 w-48 h-48 bg-purple-500/30 rounded-full blur-3xl -mr-10 -mt-10"></div>
                            <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500/30 rounded-full blur-3xl -ml-10 -mb-10"></div>

                            <div className="p-6 relative z-10 flex flex-col h-full justify-between">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/20">
                                            <Shield className="w-6 h-6 text-indigo-300" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-lg leading-tight">UniVerse</h3>
                                            <p className="text-[10px] text-indigo-200 uppercase tracking-widest">Student Identity</p>
                                        </div>
                                    </div>
                                    <Signal className="w-5 h-5 text-white/50" />
                                </div>

                                <div className="flex gap-4 items-end">
                                    <div className="w-20 h-24 bg-white/10 rounded-lg border border-white/20 backdrop-blur-sm overflow-hidden flex items-center justify-center">
                                        <span className="text-3xl font-bold text-white/80">{identity.name.charAt(0)}</span>
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Student Name</p>
                                        <p className="text-xl font-bold truncate">{identity.name}</p>

                                        <div className="flex justify-between mt-3">
                                            <div>
                                                <p className="text-[10px] text-slate-400 uppercase">Reg No</p>
                                                <p className="font-mono text-sm tracking-wide">{identity.reg_no}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] text-slate-400 uppercase">Year</p>
                                                <p className="font-mono text-sm font-bold">Year {identity.year}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Identity Details List */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-200 dark:border-slate-700">
                        <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-700 last:border-0">
                            <span className="text-xs font-bold text-slate-400 uppercase">Department</span>
                            <span className="text-sm font-bold text-slate-800 dark:text-slate-200">CSE</span>
                        </div>

                        <div className="flex justify-between items-center py-2 last:border-0">
                            <span className="text-xs font-bold text-slate-400 uppercase">Type</span>
                            <span className="text-sm font-bold text-slate-800 dark:text-slate-200 capitalize">{identity.type.replace('_', ' ')}</span>
                        </div>
                    </div>
                </div>

                {/* Right Column: Active Pass & Actions (7 cols) */}
                <div className="lg:col-span-7 space-y-6">

                    {/* Active Pass Section */}
                    <AnimatePresence mode="wait">
                        {activePass ? (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="bg-white dark:bg-slate-800 rounded-3xl p-1 shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden"
                            >
                                <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-6 rounded-t-3xl relative overflow-hidden text-white">
                                    <div className="absolute right-0 top-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
                                    <div className="relative z-10 flex justify-between items-start">
                                        <div>
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="px-2 py-0.5 bg-white/20 backdrop-blur-md rounded-lg text-xs font-bold border border-white/20">LIVE PASS</span>
                                                <span className="flex h-2 w-2 rounded-full bg-white animate-pulse"></span>
                                            </div>
                                            <h3 className="text-2xl font-black">{activePass.type} Request</h3>
                                        </div>
                                        <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md">
                                            <MapPin className="w-6 h-6 text-white" />
                                        </div>
                                    </div>

                                    <div className="mt-8 flex justify-between items-end">
                                        <div>
                                            <p className="text-emerald-100 text-xs uppercase font-bold mb-1">Departure</p>
                                            <p className="text-2xl font-mono font-bold">
                                                {new Date(activePass.departure_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                            <p className="text-emerald-100 text-xs">
                                                {new Date(activePass.departure_date).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-emerald-100 text-xs uppercase font-bold mb-1">Return By</p>
                                            <p className="text-2xl font-mono font-bold">
                                                {new Date(activePass.return_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                            <p className="text-emerald-100 text-xs">
                                                {new Date(activePass.return_date).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-6 bg-white dark:bg-slate-800">
                                    <div className="flex flex-col md:flex-row items-center gap-8">

                                        {/* MANUAl VERIFICATION AREA (Replaced QR) */}
                                        <div className="flex-1 w-full flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-900 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700">
                                            <div className="mb-4 bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm w-full text-center">
                                                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mb-1">Verification Code</p>
                                                <p className="text-3xl font-black font-mono text-indigo-600 dark:text-indigo-400 tracking-widest">
                                                    {identity.reg_no}
                                                </p>
                                            </div>
                                            <p className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                                                <UserCheck className="w-4 h-4" />
                                                Show to Gatekeeper
                                            </p>
                                        </div>

                                        {/* Pass Info */}
                                        <div className="flex-1 space-y-4 w-full">
                                            <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl">
                                                <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600">
                                                    <CheckCircle className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <p className="text-xs text-slate-400 uppercase font-bold">Current Status</p>
                                                    <p className="text-sm font-bold text-slate-900 dark:text-white capitalize">{activePass.status.replace('_', ' ')}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl">
                                                <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600">
                                                    <CreditCard className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <p className="text-xs text-slate-400 uppercase font-bold">Pass ID</p>
                                                    <p className="text-sm font-bold text-slate-900 dark:text-white font-mono">#{activePass.id.toString().padStart(6, '0')}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-sm border border-slate-200 dark:border-slate-700 text-center flex flex-col items-center justify-center min-h-[300px]"
                            >
                                <div className="w-20 h-20 bg-slate-50 dark:bg-slate-700/50 rounded-full flex items-center justify-center mb-4">
                                    <Shield className="w-10 h-10 text-slate-300" />
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No Active Gate Pass</h3>
                                <p className="text-slate-500 max-w-xs mx-auto mb-6">You are currently on campus. To leave, please request a new gate pass.</p>
                                <button className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/20 transition-all active:scale-95">
                                    Request New Pass
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Recent History */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
                        <h3 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                            <History className="w-5 h-5 text-indigo-500" />
                            Recent Activity
                        </h3>
                        <div className="space-y-3">
                            {history.length === 0 ? (
                                <p className="text-slate-400 text-center py-4 text-sm italic">No recent history</p>
                            ) : (
                                history.slice(0, 3).map(req => (
                                    <div key={req.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors border border-transparent hover:border-slate-100 dark:hover:border-slate-700">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg ${req.status === 'completed' ? 'bg-emerald-50 text-emerald-600' :
                                                req.status === 'rejected' ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-500'
                                                }`}>
                                                {req.status === 'completed' ? <CheckCircle className="w-4 h-4" /> :
                                                    req.status === 'rejected' ? <Shield className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-slate-900 dark:text-white">{req.type} Pass</p>
                                                <p className="text-[10px] text-slate-400 font-medium uppercase">{new Date(req.created_at).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                        <span className="text-xs font-mono font-bold text-slate-500">
                                            #{req.id.toString().padStart(4, '0')}
                                        </span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default StudentWallet;
