import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import StatusRing from '../../components/StatusRing';
import { Calendar, Clock, MapPin, Plus, AlertCircle, ShieldCheck, ArrowRight, ArrowLeft, Zap, History, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Modal from '../../components/Modal';
import EditRequestModal from '../../components/EditRequestModal';
import { Trash2, Edit2, Bell } from 'lucide-react';
import { useSocket } from '../../context/SocketContext';
import { usePushNotifications } from '../../context/NotificationContext';

const StudentDashboard = () => {
    const { user } = useAuth();
    const { socket } = useSocket();
    const navigate = useNavigate();
    const { permission, subscribe, loading: pushLoading, isSubscribed } = usePushNotifications();
    const [requests, setRequests] = useState([]);
    const [page, setPage] = useState(1);
    const [pages, setPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [activeRequest, setActiveRequest] = useState(null);
    const [stats, setStats] = useState({ total: 0, monthCount: 0 });
    const [showModal, setShowModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [cancelLoading, setCancelLoading] = useState(false);
    const [cooldown, setCooldown] = useState(null);
    const [formData, setFormData] = useState({
        type: user?.student_type?.toLowerCase().includes('day') ? 'Leave' : 'Outing',
        reason: '', departure_date: '', return_date: ''
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activePassTypes, setActivePassTypes] = useState([]);

    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        fetchDashboardData();
        fetchPassTypes();

        // Poll every 60 seconds as fallback (Reduced from 5s)
        const interval = setInterval(fetchDashboardData, 60000);

        if (socket) {
            socket.on('request_updated', (data) => {
                // console.log('Socket Update:', data);
                fetchDashboardData();
                // toast.success('Dashboard Updated'); 
            });
        }

        return () => {
            clearInterval(interval);
            if (socket) socket.off('request_updated');
        };
    }, [page, socket]);

    const fetchDashboardData = async () => {
        try {
            const res = await axios.get(`/api/requests/my-requests?page=${page}&limit=5&t=${Date.now()}`);
            const data = res.data;
            setRequests(data.requests || []);
            setPages(data.pages || 1);
            setTotal(data.total || 0);
            setCooldown(data.cooldown || null);

            // Derive active request (expired is treated as inactive/finished)
            const active = data.requests?.find(r => !['rejected', 'completed', 'cancelled', 'expired'].includes(r.status));

            // Check for late departure
            if (active && ['approved_hod', 'approved_warden'].includes(active.status)) {
                const now = new Date();
                const depTime = new Date(active.departure_date);
                // Grace Period: 30 minutes
                const gracePeriod = 30 * 60 * 1000;

                if (now.getTime() > (depTime.getTime() + gracePeriod)) {
                    active.isLateToExit = true;
                }
            }

            setActiveRequest(active);

            // Fetch summary stats separately if needed, but for now we'll just mock it from total
            setStats({
                total: data.total,
                monthCount: data.total // Approximate for now or fetch true stats if API exists
            });
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };



    const fetchPassTypes = async () => {
        try {
            const res = await axios.get('/api/policies/student-types');
            if (res.data && res.data.length > 0) {
                setActivePassTypes(res.data);
                setFormData(prev => {
                    const exists = res.data.find(p => p.pass_type === prev.type);
                    return exists ? prev : { ...prev, type: res.data[0].pass_type };
                });
            }
        } catch (err) {
            console.error('Failed to fetch pass types', err);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (isSubmitting) return;

        setIsSubmitting(true);
        // const toastId = toast.loading('Submitting request...'); // Optional: local loading is better

        try {
            // BACKEND IS FAST NOW (Async Notifications)
            await axios.post('/api/requests/apply', formData);

            // 1. Close Modal IMMEDIATELY
            setShowModal(false);

            // 2. Success Feedback
            toast.success('Sent Successfully');

            // 3. Reset Form
            const defaultType = user?.student_type?.toLowerCase().includes('day') ? 'Leave' : 'Outing';
            setFormData({
                type: defaultType,
                reason: '',
                departure_date: '',
                return_date: ''
            });

            // 4. Refresh Data (Simulate async to not block UI)
            setTimeout(() => {
                fetchDashboardData();
            }, 100);

        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.message || 'Submission failed');
            setError(err.response?.data?.message || 'Failed to submit request');
            // Keep modal open to show error
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCancel = async (id) => {
        if (!window.confirm('Are you sure you want to cancel this pass request?')) return;

        // Optimistic UI Update
        const previousRequests = [...requests];
        const previousActive = activeRequest;

        // VISUAL: Immediately mark as cancelled or remove from active
        setRequests(prev => prev.map(req =>
            req.id === id ? { ...req, status: 'cancelled' } : req
        ));

        if (activeRequest && activeRequest.id === id) {
            setActiveRequest(null);
        }

        const toastId = toast.loading('Cancelling pass...');
        setCancelLoading(true);

        try {
            await axios.delete(`/api/requests/${id}`);
            toast.success('Pass Cancelled', { id: toastId });

            // Background refresh to ensure consistency
            fetchDashboardData();
        } catch (err) {
            console.error('Cancel failed:', err);
            toast.error(err.response?.data?.message || 'Failed to cancel request', { id: toastId });

            // Revert on failure
            setRequests(previousRequests);
            setActiveRequest(previousActive);
        } finally {
            setCancelLoading(false);
        }
    };

    if (loading) return <div className="text-center py-10 dark:text-slate-400">Loading Dashboard...</div>;

    return (
        <div className="space-y-8 pb-12">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Welcome, {user?.name?.split(' ')[0]} 👋</h1>
                    <p className="text-slate-500 mt-1">Here's what's happening with your gate passes today.</p>
                    {user?.mentor_on_leave && (
                        <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 rounded-lg text-xs font-bold border border-amber-100 dark:border-amber-800">
                            <AlertCircle className="w-4 h-4" />
                            <span>Mentor on Leave &bull; Auto-Escalation Active</span>
                        </div>
                    )}
                    {cooldown?.active && (
                        <div className="mt-3 flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-2xl">
                            <Clock className="w-6 h-6 text-red-600 dark:text-red-400" />
                            <div>
                                <p className="text-sm font-black text-red-900 dark:text-red-300 uppercase tracking-tight">Restriction Active: Frequent Cancellations</p>
                                <p className="text-xs text-red-600 dark:text-red-400">
                                    You have cancelled 3 passes in 24 hours. Your access will be restored on {new Date(cooldown.timeLeft).toLocaleDateString()} at {new Date(cooldown.timeLeft).toLocaleTimeString()}.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-3">
                    {/* Push Notification Bell */}
                    {!isSubscribed && permission !== 'denied' && (
                        <button
                            onClick={subscribe}
                            disabled={pushLoading}
                            className="p-3 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-colors relative group"
                            title="Enable Push Notifications"
                        >
                            <Bell className={`w-6 h-6 ${pushLoading ? 'animate-pulse' : ''}`} />
                            <span className="absolute top-2 right-2.5 w-2 h-2 bg-indigo-500 rounded-full animate-ping" />
                            <span className="absolute top-2 right-2.5 w-2 h-2 bg-indigo-500 rounded-full" />
                        </button>
                    )}

                    <button
                        onClick={() => setShowModal(true)}
                        disabled={!!activeRequest}
                        className={`px-6 py-3 rounded-xl font-bold shadow-xl shadow-primary-500/10 transition-all active:scale-95 flex items-center justify-center gap-2 ${activeRequest
                            ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed border border-slate-200 dark:border-slate-700'
                            : 'bg-primary-600 hover:bg-primary-700 text-white shadow-primary-500/25'
                            }`}
                    >
                        <Plus className="w-5 h-5" />
                        {activeRequest ? (activeRequest.status === 'active' ? 'Student is OUT' : 'Pass Approved') : 'New Pass Request'}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Hero Card (Active Pass) */}
                <div className="lg:col-span-2">
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        {activeRequest ? (
                            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden relative">
                                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary-500 to-indigo-500" />
                                <div className="p-8">
                                    <div className="flex justify-between items-start mb-8">
                                        <div>
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold mb-3 ${activeRequest.isLateToExit ? 'bg-red-50 text-red-600 border border-red-100 animate-pulse' :
                                                activeRequest.status === 'active' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                                                    ((user?.student_type?.includes('Day') && activeRequest.status === 'approved_hod') || activeRequest.status === 'approved_warden') ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                                                        'bg-amber-50 text-amber-600 border border-amber-100'
                                                }`}>
                                                <Zap className="w-3 h-3 fill-current" />
                                                {activeRequest.isLateToExit ? 'EXIT OVERDUE' :
                                                    activeRequest.status === 'active' ? 'STUDENT IS OUTSIDE' :
                                                        ((user?.student_type?.includes('Day') && activeRequest.status === 'approved_hod') || activeRequest.status === 'approved_warden') ? 'READY FOR EXIT' :
                                                            'WAITING FOR APPROVAL'}
                                            </span>
                                            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Active Gate Pass</h3>
                                            <p className="text-slate-400 text-sm">Valid until {new Date(activeRequest.return_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                        </div>
                                        <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-2xl">
                                            <StatusRing status={activeRequest.status} size="sm" />
                                        </div>
                                    </div>

                                    {activeRequest.isLateToExit && (
                                        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900 rounded-2xl flex items-start gap-3">
                                            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                                            <div>
                                                <p className="text-sm font-bold text-red-900 dark:text-red-300">Late to Depart!</p>
                                                <p className="text-xs text-red-600 dark:text-red-400">Your approved departure time was {new Date(activeRequest.departure_date).toLocaleTimeString()}. Please exit campus immediately or re-apply if delayed.</p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Verification Message */}
                                    <div className="mb-6 p-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-xl flex items-start gap-3">
                                        <ShieldCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-sm font-bold text-indigo-900 dark:text-indigo-300">Identity-Based Verification</p>
                                            <p className="text-xs text-indigo-600 dark:text-indigo-400">At the gate, provide your Register Number: <span className="font-mono font-black">{user.register_number}</span></p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                                        <div className="p-4 bg-slate-50 dark:bg-slate-700/30 rounded-2xl border border-slate-100 dark:border-slate-700">
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Departure</p>
                                            <p className="font-semibold text-slate-900 dark:text-white">
                                                {new Date(activeRequest.departure_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                            <p className="text-xs text-slate-500">{new Date(activeRequest.departure_date).toLocaleDateString()}</p>
                                        </div>
                                        <div className="p-4 bg-slate-50 dark:bg-slate-700/30 rounded-2xl border border-slate-100 dark:border-slate-700">
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Return By</p>
                                            <p className="font-semibold text-slate-900 dark:text-white">
                                                {new Date(activeRequest.return_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                            <p className="text-xs text-slate-500">{new Date(activeRequest.return_date).toLocaleDateString()}</p>
                                        </div>
                                        <div className="p-4 bg-slate-50 dark:bg-slate-700/30 rounded-2xl border border-slate-100 dark:border-slate-700">
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Type</p>
                                            <p className="font-semibold text-slate-900 dark:text-white capitalize">{activeRequest.type}</p>
                                            <p className="text-xs text-slate-500">{activeRequest.reason}</p>
                                        </div>
                                    </div>

                                    {((user?.student_type?.includes('Day') && activeRequest.status === 'approved_hod') || activeRequest.status === 'approved_warden' || activeRequest.status === 'active') ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="col-span-full p-6 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50 text-center">
                                                <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Gate Verification ID</p>
                                                <div className="flex justify-center mb-4 p-4 bg-white rounded-xl shadow-sm inline-block">
                                                    <QRCodeSVG
                                                        value={user.register_number}
                                                        size={160}
                                                        level="H"
                                                        includeMargin={true}
                                                    />
                                                </div>
                                                <p className="text-2xl font-black font-mono tracking-wider text-slate-900 dark:text-white select-all">{user.register_number}</p>
                                                <p className="text-xs text-slate-400 mt-2">Show this QR to the Gatekeeper for entry/exit.</p>
                                            </div>

                                            {/* Allow Cancellation for Approved (Ready) passes, but BLOCK for Active (Exited) */}
                                            {activeRequest.status !== 'active' && (
                                                <div className="col-span-full">
                                                    <button
                                                        onClick={() => handleCancel(activeRequest.id)}
                                                        disabled={cancelLoading}
                                                        className="w-full py-3 bg-red-50 text-red-600 border border-red-100 rounded-xl font-bold hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                        {cancelLoading ? 'Cancelling...' : 'Cancel Pass (Penalty Applies)'}
                                                    </button>
                                                    <p className="text-center text-[10px] text-red-400 mt-2 font-medium">Warning: Cancelling a ready pass allows immediate re-application but deducts 20 Trust Points.</p>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-2 gap-4">
                                            {activeRequest.status === 'pending' && (
                                                <button
                                                    onClick={() => setShowEditModal(true)}
                                                    className="py-3 bg-white text-slate-900 border border-slate-200 rounded-xl font-bold hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
                                                >
                                                    <Edit2 className="w-4 h-4" /> Edit Pass
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handleCancel(activeRequest.id)}
                                                disabled={cancelLoading}
                                                className={`py-3 ${activeRequest.status === 'pending' ? '' : 'col-span-2'} bg-red-50 text-red-600 border border-red-100 rounded-xl font-bold hover:bg-red-100 transition-colors flex items-center justify-center gap-2`}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                                {cancelLoading ? 'Cancelling...' : 'Cancel Pass'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl p-10 text-white shadow-xl relative overflow-hidden h-full flex flex-col justify-center">
                                <div className="absolute top-0 right-0 p-8 opacity-10">
                                    <MapPin className="w-64 h-64" />
                                </div>
                                <div className="relative z-10 max-w-md">
                                    <h3 className="text-3xl font-bold mb-4">You are inside campus</h3>
                                    <p className="text-indigo-100 text-lg mb-8 leading-relaxed">
                                        Planning to go out? Apply for a pass instantly. Ensure you have approval before reaching the gate.
                                    </p>
                                    <button
                                        onClick={() => setShowModal(true)}
                                        className="bg-white text-indigo-600 px-8 py-3 rounded-xl font-bold hover:bg-indigo-50 transition-colors shadow-lg shadow-black/10 inline-flex items-center gap-2"
                                    >
                                        Apply Now <ArrowRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </motion.div>
                </div>

                {/* Side Stats & Quick Links */}
                <div className="space-y-6">
                    {/* Stats Card */}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
                        <h4 className="font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                            <Activity className="w-5 h-5 text-indigo-500" />
                            This Month
                        </h4>
                        <div className="flex items-end gap-2 mb-2">
                            <span className="text-5xl font-black text-slate-900 dark:text-white">{stats.monthCount}</span>
                            <span className="text-sm font-medium text-slate-400 mb-2">passes issued</span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-indigo-500 rounded-full"
                                style={{ width: `${Math.min((stats.monthCount / 10) * 100, 100)}%` }}
                            />
                        </div>
                        <p className="text-xs text-slate-400 mt-3">Pass limit resets on 1st of every month.</p>
                    </div>

                    {/* Quick Links */}
                    <div className="bg-white dark:bg-slate-800 p-2 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
                        <button
                            onClick={() => navigate('/student/history')}
                            className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-2xl transition-colors group"
                        >
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-xl">
                                    <History className="w-5 h-5" />
                                </div>
                                <div className="text-left">
                                    <p className="font-bold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">History</p>
                                    <p className="text-xs text-slate-500">View past records</p>
                                </div>
                            </div>
                            <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition-colors" />
                        </button>

                        <div className="h-px bg-slate-100 dark:bg-slate-700 mx-4" />

                        <button
                            onClick={() => navigate('/student/profile')}
                            className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-2xl transition-colors group"
                        >
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-purple-50 dark:bg-purple-900/20 text-purple-600 rounded-xl">
                                    <ShieldCheck className="w-5 h-5" />
                                </div>
                                <div className="text-left">
                                    <p className="font-bold text-slate-900 dark:text-white group-hover:text-purple-600 transition-colors">Safety</p>
                                    <p className="text-xs text-slate-500">Password & Security</p>
                                </div>
                            </div>
                            <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-purple-500 transition-colors" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Recent Activity Table */}
            {/* Recent Activity Table */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <History className="w-5 h-5 text-indigo-500" />
                        Recent Activity
                    </h3>
                    <button
                        onClick={() => navigate('/student/history')}
                        className="text-primary-600 text-sm font-bold hover:underline"
                    >
                        View All
                    </button>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-700">
                    {requests.length === 0 ? (
                        <div className="px-6 py-10 text-center text-slate-400">No recent activity found.</div>
                    ) : (
                        requests.map((req) => (
                            <div key={req.id} className="p-4 space-y-3">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">REF #{req.id.toString().padStart(4, '0')}</span>
                                        </div>
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-xs text-slate-500">Type:</span>
                                            <span className="font-bold text-slate-900 dark:text-white capitalize text-base">{req.type}</span>
                                        </div>
                                    </div>
                                    <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${req.status === 'completed' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                                        req.status === 'rejected' || req.status === 'expired' ? 'bg-red-50 text-red-600 border border-red-100' :
                                            'bg-amber-50 text-amber-600 border border-amber-100'
                                        }`}>
                                        {req.status.replace('_', ' ')}
                                    </span>
                                </div>
                                <div className="grid grid-cols-2 gap-4 text-xs">
                                    <div className="bg-slate-50 dark:bg-slate-700/30 p-2 rounded-lg">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase">Departure</p>
                                        <p className="font-medium text-slate-700 dark:text-slate-300">
                                            {new Date(req.departure_date).toLocaleDateString()}
                                        </p>
                                        <p className="text-[10px] text-slate-500">
                                            {new Date(req.departure_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                    <div className="bg-slate-50 dark:bg-slate-700/30 p-2 rounded-lg">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase">Return</p>
                                        <p className="font-medium text-slate-700 dark:text-slate-300">
                                            {new Date(req.return_date).toLocaleDateString()}
                                        </p>
                                        <p className="text-[10px] text-slate-500">
                                            {new Date(req.return_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                            <tr>
                                <th className="px-6 py-4">Ref ID</th>
                                <th className="px-6 py-4">Type</th>
                                <th className="px-6 py-4">Departure</th>
                                <th className="px-6 py-4">Return</th>
                                <th className="px-6 py-4">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {requests.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-10 text-center text-slate-400">No recent activity found.</td>
                                </tr>
                            ) : (
                                requests.map((req) => (
                                    <tr key={req.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                                        <td className="px-6 py-4 font-mono text-slate-500">#{req.id.toString().padStart(4, '0')}</td>
                                        <td className="px-6 py-4 font-bold text-slate-900 dark:text-white capitalize">{req.type}</td>
                                        <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                                            {new Date(req.departure_date).toLocaleDateString()}
                                            <span className="block text-[10px] text-slate-400">{new Date(req.departure_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                                            {new Date(req.return_date).toLocaleDateString()}
                                            <span className="block text-[10px] text-slate-400">{new Date(req.return_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${req.status === 'completed' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                                                req.status === 'rejected' || req.status === 'expired' ? 'bg-red-50 text-red-600 border border-red-100' :
                                                    req.status === 'active' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                                                        'bg-amber-50 text-amber-600 border border-amber-100'
                                                }`}>
                                                {req.status.replace('_', ' ')}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Minimal Pagination */}
                {pages > 1 && (
                    <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Page {page} of {pages} ({total} entries)</span>
                        <div className="flex gap-2">
                            <button
                                disabled={page === 1}
                                onClick={() => setPage(p => p - 1)}
                                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-30 hover:bg-white dark:hover:bg-slate-800 transition-colors"
                            >
                                <ArrowLeft className="w-4 h-4" />
                            </button>
                            <button
                                disabled={page === pages}
                                onClick={() => setPage(p => p + 1)}
                                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-30 hover:bg-white dark:hover:bg-slate-800 transition-colors"
                            >
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal - Kept minimal functional */}
            <Modal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                title="Apply for Gate Pass"
            >
                <form onSubmit={handleSubmit} className="space-y-5">
                    {error && (
                        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-xl text-xs font-bold flex items-center gap-2">
                            <AlertCircle className="w-4 h-4" /> {error}
                        </div>
                    )}
                    <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Pass Type</label>
                        <select
                            className="w-full bg-gray-50 dark:bg-slate-800 border-none rounded-xl p-3 mt-1 text-sm dark:text-white outline-none focus:ring-2 focus:ring-primary-500 transition"
                            value={formData.type}
                            onChange={e => {
                                const newType = e.target.value;
                                setFormData(prev => ({
                                    ...prev,
                                    type: newType,
                                    // Reset dates if switching types could cause conflict? No, nice to keep.
                                }));
                                setError('');
                            }}
                        >
                            {user?.student_type?.toLowerCase().includes('day') ? (
                                <>
                                    <option value="Leave">Leave (Full Day/Half Day)</option>
                                    <option value="Permission">Permission (Early Exit)</option>
                                    <option value="On Duty">On Duty (OD)</option>
                                </>
                            ) : (
                                <>
                                    <option value="Outing">Outing</option>
                                    <option value="Home Visit">Home Visit</option>
                                    <option value="On Duty">On Duty (OD)</option>
                                </>
                            )}
                        </select>
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Reason</label>
                        <textarea
                            className="w-full bg-gray-50 dark:bg-slate-800 border-none rounded-xl p-3 mt-1 text-sm dark:text-white outline-none focus:ring-2 focus:ring-primary-500 transition"
                            rows="3"
                            placeholder="Briefly explain..."
                            required
                            value={formData.reason}
                            onChange={e => setFormData({ ...formData, reason: e.target.value })}
                        />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Departure</label>
                            <input
                                type="datetime-local"
                                className="w-full bg-gray-50 dark:bg-slate-800 border-none rounded-xl p-3 mt-1 text-sm dark:text-white outline-none focus:ring-2 focus:ring-primary-500"
                                required
                                min={new Date().toISOString().slice(0, 16)}
                                max={new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16)}
                                value={formData.departure_date}
                                onChange={e => {
                                    const val = e.target.value;
                                    setFormData({ ...formData, departure_date: val });

                                    // Client-Side Validation Logic
                                    const d = new Date(val);
                                    const day = d.getDay();
                                    const isWeekend = day === 0 || day === 6;
                                    const isHostel = user?.student_type?.toLowerCase().includes('hostel');

                                    if (isHostel && formData.type === 'Outing') {
                                        if (!isWeekend) {
                                            if (d.getHours() < 17) {
                                                console.log("Validation Warning: Before 5pm on weekday");
                                                setError('Note: On working days, Outing is allowed only after 5:00 PM.');
                                            } else {
                                                setError('');
                                            }
                                        } else {
                                            setError('');
                                        }
                                    }
                                }}
                            />
                        </div>

                        {/* Hide Return Date ONLY for Day Scholar Permission (Early Exit) passes. 
                            OD and Leave now REQUIRE Return Date.
                            "return hide for permition early exit for daycomer"
                        */}
                        {!(user?.student_type?.toLowerCase().includes('day') && (formData.type === 'Permission')) && (
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Return</label>
                                <input
                                    type="datetime-local"
                                    className="w-full bg-gray-50 dark:bg-slate-800 border-none rounded-xl p-3 mt-1 text-sm dark:text-white outline-none focus:ring-2 focus:ring-primary-500"
                                    required
                                    min={formData.departure_date}
                                    value={formData.return_date}
                                    onChange={e => {
                                        const rVal = e.target.value;
                                        setFormData({ ...formData, return_date: rVal });

                                        // Holiday Duration Check (Hostel Logic)
                                        if (formData.departure_date) {
                                            const start = new Date(formData.departure_date);
                                            const end = new Date(rVal);
                                            const diffHrs = (end - start) / (1000 * 60 * 60);
                                            const day = start.getDay();
                                            const isWeekend = day === 0 || day === 6;
                                            const isHostel = user?.student_type?.toLowerCase().includes('hostel');

                                            if (isHostel && formData.type === 'Outing' && isWeekend) {
                                                if (diffHrs > 12) {
                                                    setError('Warning: Weekend/Holiday Outing passes are limited to 12 hours.');
                                                } else {
                                                    setError('');
                                                }
                                            }
                                        }
                                    }}
                                />
                            </div>
                        )}
                    </div>

                    {/* Helper text for Day Scholars */}
                    {user?.student_type?.toLowerCase().includes('day') && (formData.type === 'Leave' || formData.type === 'On Duty' || formData.type === 'Permission') && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg flex gap-2">
                            <div className="shrink-0 mt-0.5"><div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div></div>
                            <p className="text-[10px] text-blue-600 dark:text-blue-300">
                                {formData.type === 'Permission' ? 'For Early Exit Permission, return time is not required (assumed end of day).' :
                                    formData.type === 'On Duty' ? 'OD passes require approval but no gate scan.' :
                                        'For Leave, specify your expected return time.'}
                            </p>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full bg-primary-600 text-white py-3 rounded-xl font-bold hover:bg-primary-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isSubmitting ? (
                            <>
                                <span className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full"></span>
                                Sending...
                            </>
                        ) : 'Submit Application'}
                    </button>
                </form>
            </Modal>

            <EditRequestModal
                isOpen={showEditModal}
                onClose={() => setShowEditModal(false)}
                request={activeRequest}
                onUpdate={fetchDashboardData}
            />
        </div>
    );
};

export default StudentDashboard;
