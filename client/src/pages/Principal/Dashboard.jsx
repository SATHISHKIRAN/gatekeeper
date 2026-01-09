import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSettings } from '../../context/SettingsContext';
import {
    Users, Activity, AlertTriangle, CheckCircle, TrendingUp,
    Clock, Shield, Mic2
} from 'lucide-react';
import toast from 'react-hot-toast';

const StatCard = ({ title, value, icon: Icon, color, trend }) => (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all">
        <div className="flex items-start justify-between mb-4">
            <div className={`p-3 rounded-xl ${color}`}>
                <Icon className="w-6 h-6 text-white" />
            </div>
            {trend && (
                <span className="text-xs font-bold text-emerald-500 flex items-center gap-1 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-1 rounded-full">
                    <TrendingUp className="w-3 h-3" /> {trend}
                </span>
            )}
        </div>
        <div>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-bold uppercase tracking-wider">{title}</p>
            <h3 className="text-3xl font-black text-slate-800 dark:text-white mt-1">{value}</h3>
        </div>
    </div>
);

const PrincipalDashboard = () => {
    const { settings } = useSettings();
    const [stats, setStats] = useState(null);
    const [pulse, setPulse] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [statsRes, pulseRes] = await Promise.all([
                    axios.get('/api/principal/stats'),
                    axios.get('/api/principal/pulse')
                ]);
                setStats(statsRes.data);
                setPulse(pulseRes.data);
            } catch (error) {
                console.error("Dashboard error:", error);
                toast.error("Failed to load dashboard data");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
        const interval = setInterval(fetchData, 30000); // 30s poll
        return () => clearInterval(interval);
    }, []);

    if (loading) return <div className="p-10 text-center font-bold text-slate-500">Loading Executive Suite...</div>;

    return (
        <div className="space-y-8 animate-fade-in-up pb-10">
            {/* Welcome Header */}
            <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 to-slate-800 rounded-3xl p-8 mb-8 text-white shadow-2xl">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16"></div>
                <div className="relative z-10">
                    <h1 className="text-3xl font-black mb-2">Principal's Command Center</h1>
                    <p className="text-slate-300 font-medium">Real-time campus oversight and executive analytics.</p>
                </div>
            </div>

            {/* KPI Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Active Passes"
                    value={stats?.activePasses || 0}
                    icon={Activity}
                    color="bg-indigo-500"
                    trend="+12% vs last week"
                />
                <StatCard
                    title="Campus Population"
                    value={stats?.population?.total || 0}
                    icon={Users}
                    color="bg-blue-500"
                />
                <StatCard
                    title="Critical Issues"
                    value={stats?.criticalIssues || 0}
                    icon={AlertTriangle}
                    color="bg-red-500"
                />
                <StatCard
                    title="Movements Today"
                    value={stats?.movementsToday || 0}
                    icon={Clock}
                    color="bg-emerald-500"
                />
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
                {/* Live Pulse Feed */}
                <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
                    <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                        <Activity className="w-5 h-5 text-indigo-500" /> Live Campus Pulse
                    </h3>
                    <div className="space-y-4">
                        {pulse.map((event) => (
                            <div key={event.id} className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-700/50">
                                <div className={`p-2 rounded-lg ${event.action === 'exit' ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'}`}>
                                    {event.action === 'exit' ? <TrendingUp className="w-4 h-4 rotate-45" /> : <TrendingUp className="w-4 h-4 rotate-[135deg]" />}
                                </div>
                                <div className="flex-1">
                                    <p className="font-bold text-slate-800 dark:text-slate-200">{event.user_name}</p>
                                    <p className="text-xs text-slate-500 uppercase font-bold">{event.role} • {event.pass_type}</p>
                                </div>
                                <div className="text-right text-xs text-slate-400 font-mono">
                                    {new Date(event.timestamp).toLocaleTimeString()}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
                    <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-6">Quick Actions</h3>
                    <div className="space-y-3">
                        <button className="w-full p-4 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 font-bold rounded-xl flex items-center gap-3 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors">
                            <Mic2 className="w-5 h-5" /> Broadcast Message
                        </button>
                        <button className="w-full p-4 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold rounded-xl flex items-center gap-3 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                            <Shield className="w-5 h-5" /> View Staff Roster
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PrincipalDashboard;
