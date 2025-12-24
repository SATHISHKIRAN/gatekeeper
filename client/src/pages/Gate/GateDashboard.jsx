import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { QrCode, LogOut, ArrowRight, Activity, Users, Clock } from 'lucide-react';
import GateScanner from './Scanner';
import GateHistory from './GateHistory';

const GateDashboard = () => {
    const [showScanner, setShowScanner] = useState(false);
    const [stats, setStats] = useState({ activeOut: 0, entriesToday: 0, exitsToday: 0 });

    useEffect(() => {
        fetchStats();
        // Poll stats every 30s
        const interval = setInterval(fetchStats, 30000);
        return () => clearInterval(interval);
    }, []);

    const fetchStats = async () => {
        try {
            const res = await axios.get('/api/gate/dashboard-stats');
            setStats(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    if (showScanner) {
        return <GateScanner onClose={() => { setShowScanner(false); fetchStats(); }} />;
    }

    return (
        <div className="space-y-8 animate-fade-in p-2 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">Gate Ops</h1>
                    <p className="text-gray-500 dark:text-slate-400 font-medium">Main Gate • Terminal 1</p>
                </div>
                <div className="flex items-center gap-2">
                    <span className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></span>
                    <span className="text-sm font-bold text-gray-500 uppercase tracking-widest">System Online</span>
                </div>
            </div>

            {/* Quick Actions */}
            <button
                onClick={() => setShowScanner(true)}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl p-6 shadow-xl shadow-indigo-500/20 transition-all transform hover:scale-[1.01] flex items-center justify-between group"
            >
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                        <QrCode className="w-8 h-8 text-white" />
                    </div>
                    <div className="text-left">
                        <h2 className="text-xl font-black">Open Scanner</h2>
                        <p className="text-indigo-200">Process Entry / Exit Requests</p>
                    </div>
                </div>
                <ArrowRight className="w-8 h-8 opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition" />
            </button>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800">
                    <div className="flex items-center gap-3 mb-2">
                        <Activity className="w-5 h-5 text-orange-500" />
                        <h3 className="font-bold text-gray-500 dark:text-slate-400 uppercase text-xs tracking-wider">Active Out</h3>
                    </div>
                    <p className="text-4xl font-black text-gray-900 dark:text-white">{stats.activeOut}</p>
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800">
                    <div className="flex items-center gap-3 mb-2">
                        <LogOut className="w-5 h-5 text-indigo-500" />
                        <h3 className="font-bold text-gray-500 dark:text-slate-400 uppercase text-xs tracking-wider">Exits Today</h3>
                    </div>
                    <p className="text-4xl font-black text-gray-900 dark:text-white">{stats.exitsToday}</p>
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800">
                    <div className="flex items-center gap-3 mb-2">
                        <Clock className="w-5 h-5 text-emerald-500" />
                        <h3 className="font-bold text-gray-500 dark:text-slate-400 uppercase text-xs tracking-wider">Entries Today</h3>
                    </div>
                    <p className="text-4xl font-black text-gray-900 dark:text-white">{stats.entriesToday}</p>
                </div>
            </div>

            {/* Live Logs */}
            <GateHistory />
        </div>
    );
};

export default GateDashboard;
