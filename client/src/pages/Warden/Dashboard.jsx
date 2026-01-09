import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Users, LogOut, Clock, Activity, Send, Bell, RefreshCw,
    Check, AlertTriangle, Shield, CheckCircle, XCircle, User
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
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
    const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
    const [rejectReason, setRejectReason] = useState('');
    const [selectedRequestId, setSelectedRequestId] = useState(null);

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

    const handleVerify = async (id, status, reason = null) => {
        try {
            await axios.put(`/api/warden/${id}/verify`, { status, reason });
            fetchDashboardData();
            fetchQueue();
            if (status === 'rejected') {
                setIsRejectModalOpen(false);
                setRejectReason('');
                setSelectedRequestId(null);
            }
        } catch (err) {
            alert(err.response?.data?.message || 'Verification failed');
        }
    };

    const openRejectModal = (id) => {
        setSelectedRequestId(id);
        setRejectReason('');
        setIsRejectModalOpen(true);
    };

    const confirmReject = (e) => {
        e.preventDefault();
        if (!selectedRequestId) return;
        handleVerify(selectedRequestId, 'rejected', rejectReason);
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
                    <div className="h-64 w-full">
                        <ResponsiveContainer width={500} height="100%" minWidth={10} minHeight={10} style={{ width: '99%' }}>
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

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    <AnimatePresence mode="popLayout">
                        {verificationQueue.length === 0 ? (
                            <div className="col-span-full text-center py-12 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-dashed border-slate-200 dark:border-slate-700">
                                <p className="text-sm text-slate-500">No pending verifications</p>
                            </div>
                        ) : (
                            verificationQueue.map((req) => (
                                <RequestCard
                                    key={req.id}
                                    req={req}
                                    onApprove={() => handleVerify(req.id, 'approved_warden')}
                                    onReject={() => openRejectModal(req.id)}
                                />
                            ))
                        )}
                    </AnimatePresence>
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

            {/* Reject Reason Modal */}
            <Modal
                isOpen={isRejectModalOpen}
                onClose={() => setIsRejectModalOpen(false)}
                title="Reject Request"
                maxWidth="max-w-md"
            >
                <form onSubmit={confirmReject} className="space-y-4 p-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Reason for Rejection</label>
                        <textarea
                            required
                            rows={3}
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                            placeholder="e.g., Parent did not approve, Disciplinary action..."
                        />
                    </div>
                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={() => setIsRejectModalOpen(false)}
                            className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                        >
                            Confirm Reject
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

// --- Request Card Component ---
const RequestCard = React.forwardRef(({ req, onApprove, onReject }, ref) => {
    const [showContact, setShowContact] = useState(false);

    // Determine card styling based on type and status
    const isUrgent = req.type === 'emergency';
    const isHosteler = req.student_type !== 'Day Scholar';

    // Duration Calc
    const departure = new Date(req.departure_date);
    const returnDate = req.return_date ? new Date(req.return_date) : null;
    let durationString = "Exit Only";

    if (returnDate) {
        const diffMs = returnDate - departure;
        const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffHrs / 24);
        if (diffDays > 0) durationString = `${diffDays}d ${diffHrs % 24}h`;
        else durationString = `${diffHrs}h`;
    }

    const cardBorderColor = isUrgent ? 'border-rose-200 dark:border-rose-900' : 'border-slate-200 dark:border-slate-800';

    return (
        <motion.div
            ref={ref}
            layout
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`
                group relative bg-white dark:bg-slate-900 rounded-[1.5rem] overflow-hidden border-2 transition-all duration-300 shadow-sm hover:shadow-xl
                ${cardBorderColor}
            `}
        >
            {/* Header Strip - Type Indicator */}
            <div className={`h-2 w-full ${isUrgent ? 'bg-rose-500' :
                req.type === 'Outing' ? 'bg-sky-500' :
                    req.type === 'Leave' ? 'bg-violet-500' : 'bg-slate-300'
                }`} />

            {/* Top Badge Overlay (Right) */}
            <div className="absolute top-4 right-4 flex flex-col items-end gap-2 z-20 pointer-events-none">
                {isUrgent && (
                    <span className="px-3 py-1 bg-rose-500 text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg shadow-rose-500/30 flex items-center gap-1 animate-pulse">
                        <AlertTriangle className="w-3 h-3" /> Urgent
                    </span>
                )}
                <span className="px-3 py-1 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg shadow-blue-500/30 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> Ready for Warden
                </span>
            </div>

            <div className="p-5 pt-16">
                {/* 1. Identity Section */}
                <div className="flex items-start gap-4 mb-5">
                    <div
                        className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-lg font-black text-slate-400 border border-slate-200 dark:border-slate-700 relative overflow-hidden shrink-0"
                    >
                        {req.student_name?.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-black text-slate-800 dark:text-white leading-tight truncate">
                            {req.student_name}
                        </h3>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs">
                            <span className="font-bold text-slate-500 uppercase tracking-wider">{req.year} Year</span>
                            <span className="w-1 h-1 bg-slate-300 rounded-full" />
                            <span className="font-mono font-bold text-slate-500">{req.register_number}</span>
                            {req.room_number && (
                                <>
                                    <span className="w-1 h-1 bg-slate-300 rounded-full" />
                                    <span className="font-bold text-indigo-600 dark:text-indigo-400 truncate max-w-[120px]">
                                        Room #{req.room_number}
                                    </span>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* 2. The "Ticket" Journey Section */}
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700 mb-5 relative overflow-hidden">
                    {/* Visual Perforation Lines */}
                    <div className="absolute top-1/2 -left-2 w-4 h-4 bg-white dark:bg-slate-900 rounded-full border border-slate-100 dark:border-slate-700" />
                    <div className="absolute top-1/2 -right-2 w-4 h-4 bg-white dark:bg-slate-900 rounded-full border border-slate-100 dark:border-slate-700" />
                    <div className="absolute top-1/2 left-2 right-2 border-t border-dashed border-slate-300 dark:border-slate-600 opacity-30" />

                    <div className="grid grid-cols-[1fr,auto,1fr] gap-4 p-4 relative z-10">
                        {/* Departure */}
                        <div>
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Out</p>
                            <p className="text-lg font-black text-slate-800 dark:text-white">
                                {new Date(req.departure_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                            <p className="text-[10px] font-bold text-slate-500">{new Date(req.departure_date).toLocaleDateString()}</p>
                        </div>

                        {/* Duration Center */}
                        <div className="flex flex-col items-center justify-center">
                            <div className="px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-[9px] font-mono font-bold text-slate-600 dark:text-slate-300 mb-1">
                                {durationString}
                            </div>
                            <div className="w-full h-px bg-slate-300 dark:bg-slate-600" />
                            <span className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wide">{req.type}</span>
                        </div>

                        {/* Return */}
                        <div className="text-right">
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">In</p>
                            {req.return_date ? (
                                <>
                                    <p className="text-lg font-black text-slate-800 dark:text-white">
                                        {new Date(req.return_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                    <p className="text-[10px] font-bold text-slate-500">{new Date(req.return_date).toLocaleDateString()}</p>
                                </>
                            ) : (
                                <p className="text-sm font-bold text-slate-400 py-1">--</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* 3. Reason & Risk */}
                <div className="mb-5">
                    <div className="relative pl-3 border-l-2 border-slate-200 dark:border-slate-700 mb-3">
                        <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 leading-relaxed italic">"{req.reason}"</p>
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className={`text-xs font-black px-2 py-1 rounded-md ${req.trust_score >= 80 ? 'bg-emerald-50 text-emerald-600' :
                                req.trust_score >= 50 ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'
                                }`}>
                                {req.trust_score}% Trust
                            </div>
                        </div>

                        {/* Contact Toggle */}
                        {(req.parent_phone || req.phone) && (
                            <button
                                onClick={() => setShowContact(!showContact)}
                                className="text-[10px] font-bold text-blue-600 hover:underline uppercase tracking-wider flex items-center gap-1"
                            >
                                <User className="w-3 h-3" /> {showContact ? 'Hide Contact' : 'Show Contact'}
                            </button>
                        )}
                    </div>

                    {/* Contact Details Drawer */}
                    <AnimatePresence>
                        {showContact && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="mt-3 pt-3 border-t border-dashed border-slate-200 dark:border-slate-700 grid grid-cols-2 gap-2 text-xs">
                                    {req.phone && (
                                        <div>
                                            <p className="text-[9px] text-slate-400 font-bold uppercase">Student</p>
                                            <a href={`tel:${req.phone}`} className="font-mono font-bold text-slate-700 dark:text-slate-200 hover:text-blue-500">{req.phone}</a>
                                        </div>
                                    )}
                                    {req.parent_phone && (
                                        <div className="text-right">
                                            <p className="text-[9px] text-slate-400 font-bold uppercase">Parent</p>
                                            <a href={`tel:${req.parent_phone}`} className="font-mono font-bold text-slate-700 dark:text-slate-200 hover:text-blue-500">{req.parent_phone}</a>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* 4. Actions Footer */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-800 flex gap-3">
                <button
                    onClick={onReject}
                    className="flex-1 py-3 px-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-black text-slate-500 uppercase tracking-widest hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-all shadow-sm"
                >
                    Decline
                </button>
                <button
                    onClick={onApprove}
                    className={`flex-[2] py-3 px-4 rounded-xl text-xs font-black text-white uppercase tracking-widest shadow-lg shadow-emerald-500/20 transition-all active:scale-95 flex items-center justify-center gap-2
                        ${isUrgent
                            ? 'bg-rose-600 hover:bg-rose-700'
                            : 'bg-emerald-600 hover:bg-emerald-700'
                        }`}
                >
                    <Check className="w-3 h-3" />
                    Authorize
                </button>
            </div>
        </motion.div>
    );
});
export default WardenDashboard;
