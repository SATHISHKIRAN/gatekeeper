import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSocket } from '../../context/SocketContext';
import { motion } from 'framer-motion';
import {
    Users, Clock, CheckCircle, BarChart2, Bell,
    ArrowRight, Activity, Calendar, FileText
} from 'lucide-react';
import { Link } from 'react-router-dom';

const StatCard = ({ title, value, icon: Icon, color, trend }) => (
    <motion.div
        whileHover={{ y: -5 }}
        className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-lg border border-gray-100 dark:border-slate-800 relative overflow-hidden group"
    >
        <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full opacity-10 group-hover:opacity-20 transition-opacity bg-${color}-500 blur-2xl`} />

        <div className="flex justify-between items-start mb-4">
            <div className={`p-3 rounded-xl bg-${color}-50 dark:bg-${color}-900/20 text-${color}-600 dark:text-${color}-400`}>
                <Icon className="w-6 h-6" />
            </div>
            {trend && (
                <span className={`text-xs font-bold px-2 py-1 rounded-lg ${trend > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                    {trend > 0 ? '+' : ''}{trend}%
                </span>
            )}
        </div>

        <h3 className="text-gray-500 dark:text-slate-400 text-sm font-medium mb-1">{title}</h3>
        <p className="text-3xl font-bold text-gray-900 dark:text-white">{value}</p>
    </motion.div>
);

const ActivityItem = ({ action }) => (
    <div className="flex items-start gap-4 p-4 hover:bg-gray-50 dark:hover:bg-slate-800/50 rounded-xl transition-colors">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${action.status === 'approved_staff' ? 'bg-green-100 text-green-600' :
            action.status === 'rejected' ? 'bg-red-100 text-red-600' :
                'bg-blue-100 text-blue-600'
            }`}>
            {action.status === 'approved_staff' ? <CheckCircle className="w-5 h-5" /> :
                action.status === 'rejected' ? <Bell className="w-5 h-5" /> :
                    <Clock className="w-5 h-5" />}
        </div>
        <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {action.student_name}
            </p>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                Request type: <span className="font-semibold capitalize">{action.type}</span>
            </p>
        </div>
        <span className="text-xs text-gray-400 whitespace-nowrap">
            {new Date(action.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
    </div>
);

const StaffDashboard = () => {
    const [stats, setStats] = useState({
        pendingCount: 0,
        totalStudents: 0,
        todayApprovals: 0,
        avgTrustScore: 0,
        recentActivity: [],
        isGlobalProxy: false,
        isOnLeave: false,
        proxyPendingCount: 0
    });
    const [loading, setLoading] = useState(true);
    const [showOverrideModal, setShowOverrideModal] = useState(false);
    const [overrideForm, setOverrideForm] = useState({ email: '', reason: '' });
    const [overrideLoading, setOverrideLoading] = useState(false);

    const { socket } = useSocket();

    useEffect(() => {
        fetchDashboardData();

        // Socket Listener
        if (socket) {
            socket.on('request_updated', () => {
                fetchDashboardData();
            });
        }

        // Fallback Poll (60s)
        const interval = setInterval(fetchDashboardData, 60000);
        return () => {
            clearInterval(interval);
            if (socket) socket.off('request_updated');
        };
    }, [socket]);

    const fetchDashboardData = async () => {
        try {
            const res = await axios.get('/api/staff/dashboard');
            setStats(res.data);
            setLoading(false);
        } catch (err) {
            console.error("Failed to fetch dashboard stats", err);
        }
    };

    const handleOverride = async (e) => {
        e.preventDefault();
        setOverrideLoading(true);
        try {
            await axios.post('/api/staff/proxy/medical-override', {
                studentEmail: overrideForm.email,
                reason: overrideForm.reason
            });
            setShowOverrideModal(false);
            setOverrideForm({ email: '', reason: '' });
            alert('Emergency Pass Issued Successfully');
            fetchDashboardData();
        } catch (err) {
            alert(err.response?.data?.message || 'Override Failed');
        } finally {
            setOverrideLoading(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Loading Dashboard...</div>;

    const sections = [
        { title: 'Pending Requests', value: stats.pendingCount, icon: Clock, color: 'orange', trend: stats.pendingCount > 0 ? 5 : 0 },
        { title: 'My Students', value: stats.totalStudents, icon: Users, color: 'blue' },
        { title: "Today's Passes", value: stats.todayApprovals, icon: Calendar, color: 'green' },
        { title: 'Avg Trust Score', value: stats.avgTrustScore, icon: Activity, color: 'purple' },
    ];

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Staff Dashboard</h1>
                    <p className="text-gray-500 dark:text-slate-400">Overview of your assigned mentees' activity</p>
                </div>
                <div className="flex gap-3">
                    <Link
                        to="/staff/queue"
                        className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-medium shadow-lg shadow-primary-600/20 transition-all flex items-center gap-2"
                    >
                        <FileText className="w-4 h-4" /> Review Queue
                    </Link>
                </div>
            </div>

            {/* ALERTS SECTION */}
            <div className="space-y-4">
                {/* 1. Leave Warning */}
                {stats.isOnLeave && (
                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4 rounded-2xl flex items-center gap-4">
                        <div className="p-3 bg-amber-100 dark:bg-amber-900/40 rounded-xl text-amber-600 dark:text-amber-400">
                            <Clock className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-amber-800 dark:text-amber-300">You are currently On Leave</h3>
                            <p className="text-sm text-amber-600 dark:text-amber-400 font-medium">
                                Your mentee requests have been automatically escalated to the HOD for approval.
                            </p>
                        </div>
                    </div>
                )}

                {/* 2. Proxy / Assistant HOD Banner */}
                {stats.isGlobalProxy && (
                    <div className="bg-gradient-to-r from-indigo-600 to-violet-600 p-6 rounded-2xl text-white shadow-xl shadow-indigo-500/20 relative overflow-hidden">
                        <div className="absolute right-0 top-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16" />

                        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                                    <ShieldCheck className="w-8 h-8 text-white" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="text-xl font-black uppercase tracking-tight">Assistant HOD Active</h3>
                                        <span className="px-2 py-0.5 bg-white/20 rounded text-[10px] font-bold uppercase tracking-wider">Delegated Authority</span>
                                    </div>
                                    <p className="text-indigo-100 font-medium text-sm">
                                        You have been assigned as the acting HOD. You have full authority to approve/reject passes for the entire department.
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                <div className="text-right">
                                    <p className="text-[10px] uppercase font-bold text-indigo-200 tracking-widest">HOD Queue</p>
                                    <p className="text-3xl font-black">{stats.proxyPendingCount}</p>
                                </div>
                                <Link
                                    to="/staff/queue?filter=proxy" // Assuming queue supports filter param or defaulting to show
                                    className="px-6 py-3 bg-white text-indigo-600 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-indigo-50 transition-colors shadow-lg"
                                >
                                    Review HOD Requests
                                </Link>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {sections.map((stat, idx) => (
                    <StatCard key={idx} {...stat} />
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Recent Activity Feed */}
                <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Recent Activity</h2>
                        <Link to="/staff/history" className="text-primary-600 text-sm font-medium hover:underline flex items-center gap-1">
                            View All <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>

                    <div className="space-y-2">
                        {stats.recentActivity.length > 0 ? (
                            stats.recentActivity.map(action => (
                                <ActivityItem key={action.id} action={action} />
                            ))
                        ) : (
                            <div className="text-center py-10 text-gray-500">No recent activity found.</div>
                        )}
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-gradient-to-br from-slate-900 to-slate-800 dark:from-sky-900 dark:to-slate-900 rounded-2xl shadow-lg p-6 text-white">
                    <h2 className="text-lg font-bold mb-4">Quick Actions</h2>
                    <div className="space-y-3">
                        <Link to="/staff/my-students" className="block w-full p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-colors backdrop-blur-sm flex items-center gap-3">
                            <Users className="w-5 h-5 text-sky-300" />
                            <span className="font-medium">View Student Roster</span>
                        </Link>
                        <Link to="/staff/analytics" className="block w-full p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-colors backdrop-blur-sm flex items-center gap-3">
                            <BarChart2 className="w-5 h-5 text-purple-300" />
                            <span className="font-medium">Mentee Analytics</span>
                        </Link>
                        <button className="w-full p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-colors backdrop-blur-sm flex items-center gap-3 text-left">
                            <Bell className="w-5 h-5 text-orange-300" />
                            <span className="font-medium">Send Broadcast (Soon)</span>
                        </button>
                    </div>

                    <div className="mt-8 pt-6 border-t border-white/10">
                        <h3 className="text-sm font-semibold text-slate-400 uppercase mb-3">System Status</h3>
                        <div className="flex items-center gap-2 text-sm text-green-400">
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                            All Systems Operational
                        </div>
                    </div>
                </div>
            </div>

            {/* Critical Emergency Protocol Card - Only for Proxy */}
            {stats.isGlobalProxy && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-red-500 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between shadow-2xl shadow-red-500/30 overflow-hidden relative"
                >
                    <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />
                    <div className="flex items-center gap-6 relative z-10">
                        <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                            <Activity className="w-8 h-8 text-white animate-pulse" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-white uppercase tracking-tight">Critical Emergency Protocol</h2>
                            <p className="text-red-100 font-medium">Delegated Authority Active: Issue immediate Medical Overrides (HOD Level).</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowOverrideModal(true)}
                        className="mt-6 md:mt-0 relative z-10 px-8 py-3 bg-white text-red-600 rounded-xl font-black uppercase tracking-widest hover:bg-red-50 transition-all shadow-xl active:scale-95 flex items-center gap-2"
                    >
                        Issue Medical Pass <ArrowRight className="w-4 h-4" />
                    </button>
                </motion.div>
            )}

            {/* Override Modal */}
            {showOverrideModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden"
                    >
                        <div className="bg-red-500 p-6 text-white flex justify-between items-center">
                            <h3 className="text-xl font-black uppercase flex items-center gap-2">
                                <Activity className="w-6 h-6" /> Medical Override
                            </h3>
                            <button onClick={() => setShowOverrideModal(false)} className="p-1 hover:bg-white/20 rounded-lg">
                                {/* <X className="w-6 h-6" /> */}
                                <Users className="w-6 h-6" /> {/* Placeholder fallback */}
                            </button>
                        </div>
                        <form onSubmit={handleOverride} className="p-6 space-y-4">
                            <div className="p-4 bg-red-50 text-red-700 text-sm font-bold rounded-xl border border-red-100 mb-4">
                                WARNING: This action bypasses all standard checks. Use only for genuine medical emergencies. Action will be logged.
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase text-gray-400 mb-1">Student Email / ID</label>
                                <input
                                    type="email"
                                    required
                                    value={overrideForm.email}
                                    onChange={e => setOverrideForm({ ...overrideForm, email: e.target.value })}
                                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-xl font-bold outline-none focus:ring-2 focus:ring-red-500"
                                    placeholder="student@college.edu"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase text-gray-400 mb-1">Medical Reason</label>
                                <textarea
                                    required
                                    value={overrideForm.reason}
                                    onChange={e => setOverrideForm({ ...overrideForm, reason: e.target.value })}
                                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-xl font-bold outline-none focus:ring-2 focus:ring-red-500"
                                    rows="3"
                                    placeholder="Describe emergency..."
                                />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowOverrideModal(false)}
                                    className="flex-1 py-3 bg-slate-100 text-slate-500 font-bold rounded-xl"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={overrideLoading}
                                    className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl shadow-lg shadow-red-500/20"
                                >
                                    {overrideLoading ? 'Authorizing...' : 'Authorize Immediate Exit'}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </div>
    );
};

export default StaffDashboard;
