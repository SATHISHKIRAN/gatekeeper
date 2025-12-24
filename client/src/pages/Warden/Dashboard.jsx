import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Users, LogOut, Clock, Activity, Send, Bell, RefreshCw
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import Modal from '../../components/Modal';

const WardenDashboard = () => {
    const [stats, setStats] = useState({
        total_students: 0,
        students_out: 0,
        pending_requests: 0,
        movements_today: 0
    });
    const [recentActivity, setRecentActivity] = useState([]);
    const [weeklyStats, setWeeklyStats] = useState([]);
    const [verificationQueue, setVerificationQueue] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isBroadcastOpen, setIsBroadcastOpen] = useState(false);
    const [broadcastData, setBroadcastData] = useState({ title: '', message: '' });

    useEffect(() => {
        fetchDashboardData();
        fetchQueue();
    }, []);

    const fetchDashboardData = async () => {
        try {
            const res = await axios.get('/api/warden/stats');
            setStats(res.data.stats);
            setRecentActivity(res.data.recent_activity);
            setWeeklyStats(res.data.weekly_stats);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchQueue = async () => {
        try {
            const res = await axios.get('/api/warden/verify-queue');
            setVerificationQueue(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const handleVerify = async (id, status) => {
        try {
            await axios.put(`/api/warden/${id}/verify`, { status });
            fetchDashboardData();
            fetchQueue();
        } catch (err) {
            alert(err.response?.data?.message || 'Verification failed');
        }
    };

    const handleBroadcast = async (e) => {
        e.preventDefault();
        try {
            await axios.post('/api/warden/broadcast', broadcastData);
            alert('Broadcast sent successfully');
            setIsBroadcastOpen(false);
            setBroadcastData({ title: '', message: '' });
        } catch (err) {
            alert('Failed to send broadcast');
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-slate-500 font-medium">Loading...</p>
            </div>
        </div>
    );

    return (
        <div className="space-y-6 pb-20">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Dashboard</h1>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Hostel management overview</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setIsBroadcastOpen(true)}
                        className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-2"
                    >
                        <Bell className="w-4 h-4" />
                        <span className="text-sm font-medium">Broadcast</span>
                    </button>
                    <button
                        onClick={() => fetchDashboardData()}
                        className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                        <RefreshCw className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                            <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Total Students</span>
                    </div>
                    <p className="text-3xl font-bold text-slate-900 dark:text-white">{stats.total_students}</p>
                </div>

                <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-rose-100 dark:bg-rose-900/30 rounded-lg">
                            <LogOut className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                        </div>
                        <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Currently Out</span>
                    </div>
                    <p className="text-3xl font-bold text-slate-900 dark:text-white">{stats.students_out}</p>
                </div>

                <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                            <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                        </div>
                        <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Pending Approval</span>
                    </div>
                    <p className="text-3xl font-bold text-slate-900 dark:text-white">{stats.pending_requests}</p>
                </div>

                <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                            <Activity className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Today's Movements</span>
                    </div>
                    <p className="text-3xl font-bold text-slate-900 dark:text-white">{stats.movements_today}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Weekly Movement Chart */}
                <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Weekly Movement</h3>
                            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Last 7 days</p>
                        </div>
                    </div>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={weeklyStats}>
                                <defs>
                                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis
                                    dataKey="date"
                                    tickFormatter={(val) => new Date(val).toLocaleDateString('en-US', { weekday: 'short' })}
                                    stroke="#94a3b8"
                                    style={{ fontSize: '12px' }}
                                />
                                <YAxis stroke="#94a3b8" style={{ fontSize: '12px' }} />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#fff',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '8px',
                                        fontSize: '12px'
                                    }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="count"
                                    stroke="#6366f1"
                                    strokeWidth={2}
                                    fillOpacity={1}
                                    fill="url(#colorCount)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Recent Activity */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Recent Activity</h3>
                    <div className="space-y-4">
                        {recentActivity.length === 0 ? (
                            <p className="text-sm text-slate-500 text-center py-8">No recent activity</p>
                        ) : (
                            recentActivity.map((act) => (
                                <div key={act.id} className="flex items-start gap-3 pb-4 border-b border-slate-100 dark:border-slate-700 last:border-0 last:pb-0">
                                    <div className="w-2 h-2 rounded-full bg-indigo-500 mt-2"></div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{act.student_name}</p>
                                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                                            {act.type} - <span className={`font-medium ${act.status === 'generated' ? 'text-emerald-600' :
                                                    act.status === 'rejected' ? 'text-rose-600' : 'text-blue-600'
                                                }`}>{act.status}</span>
                                        </p>
                                        <p className="text-xs text-slate-500 mt-1">
                                            {new Date(act.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Pending Verifications */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Pending Verifications</h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{verificationQueue.length} requests awaiting approval</p>
                    </div>
                </div>

                <div className="space-y-3">
                    {verificationQueue.length === 0 ? (
                        <div className="text-center py-12 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                            <p className="text-sm text-slate-500">No pending verifications</p>
                        </div>
                    ) : (
                        verificationQueue.map((req) => (
                            <div key={req.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center font-semibold text-indigo-600 dark:text-indigo-400">
                                        {req.student_name.charAt(0)}
                                    </div>
                                    <div>
                                        <h4 className="font-medium text-slate-900 dark:text-white">{req.student_name}</h4>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-xs px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded">{req.type}</span>
                                            <span className="text-xs text-slate-600 dark:text-slate-400">{req.reason}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handleVerify(req.id, 'rejected')}
                                        className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors"
                                    >
                                        Reject
                                    </button>
                                    <button
                                        onClick={() => handleVerify(req.id, 'approved_warden')}
                                        className="px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                                    >
                                        Approve
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Broadcast Modal */}
            <Modal
                isOpen={isBroadcastOpen}
                onClose={() => setIsBroadcastOpen(false)}
                title="Send Broadcast"
                maxWidth="max-w-lg"
            >
                <form onSubmit={handleBroadcast} className="space-y-4 p-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Title</label>
                        <input
                            type="text"
                            required
                            value={broadcastData.title}
                            onChange={(e) => setBroadcastData({ ...broadcastData, title: e.target.value })}
                            className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            placeholder="Enter broadcast title"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Message</label>
                        <textarea
                            required
                            rows={4}
                            value={broadcastData.message}
                            onChange={(e) => setBroadcastData({ ...broadcastData, message: e.target.value })}
                            className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                            placeholder="Enter your message"
                        />
                    </div>
                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={() => setIsBroadcastOpen(false)}
                            className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                        >
                            Send Broadcast
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default WardenDashboard;
