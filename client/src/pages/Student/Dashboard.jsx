import React, { useState, useEffect } from 'react';
import axios from 'axios';
import StatusRing from '../../components/StatusRing';
import { Calendar, Clock, MapPin, Plus, AlertCircle, ShieldCheck, ArrowRight, Zap, History, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Modal from '../../components/Modal';
import EditRequestModal from '../../components/EditRequestModal';
import { Trash2, Edit2 } from 'lucide-react';

const StudentDashboard = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [requests, setRequests] = useState([]);
    const [page, setPage] = useState(1);
    const [pages, setPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [activeRequest, setActiveRequest] = useState(null);
    const [stats, setStats] = useState({ total: 0, monthCount: 0 });
    const [showModal, setShowModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [cancelLoading, setCancelLoading] = useState(false);
    const [formData, setFormData] = useState({
        type: user?.student_type === 'day_scholar' ? 'Leave' : 'Outing',
        reason: '', departure_date: '', return_date: ''
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchDashboardData();
    }, [page]);

    const fetchDashboardData = async () => {
        try {
            const res = await axios.get(`/api/requests/my-requests?page=${page}&limit=5`);
            const data = res.data;
            setRequests(data.requests || []);
            setPages(data.pages || 1);
            setTotal(data.total || 0);

            // Derive active request (Check all requests, but for dashboard maybe we just look at recent ones or fetch separately if needed)
            // For now, if active is in the first 5, use it. Otherwise, we might need a separate call for "active" pass.
            // Let's assume the user usually has only 1 active pass anyway.
            const active = data.requests?.find(r => !['rejected', 'completed', 'cancelled'].includes(r.status));
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            await axios.post('/api/requests/apply', formData);
            setShowModal(false);
            fetchDashboardData(); // Refresh all
            setFormData({ type: 'outing', reason: '', departure_date: '', return_date: '' });
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to submit request');
        }
    };

    const handleCancel = async (id) => {
        // if (!window.confirm('Are you sure you want to cancel this pass request?')) return;
        console.log('Cancelling request:', id);
        setCancelLoading(true);
        try {
            await axios.delete(`/api/requests/${id}`);
            // Optimistic update or refetch
            fetchDashboardData();
        } catch (err) {
            console.error('Cancel failed:', err);
            alert(err.response?.data?.message || 'Failed to cancel request');
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
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    disabled={!!activeRequest}
                    className={`px-6 py-3 rounded-xl font-bold shadow-xl shadow-primary-500/10 transition-all active:scale-95 flex items-center justify-center gap-2 ${activeRequest
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed border border-slate-200 dark:border-slate-700'
                        : 'bg-primary-600 hover:bg-primary-700 text-white shadow-primary-500/25'
                        }`}
                >
                    <Plus className="w-5 h-5" />
                    {activeRequest ? 'Pass is Active' : 'New Pass Request'}
                </button>
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
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-600 border border-emerald-100 mb-3">
                                                <Zap className="w-3 h-3 fill-current" /> Live Status
                                            </span>
                                            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Active Gate Pass</h3>
                                            <p className="text-slate-400 text-sm">Valid until {new Date(activeRequest.return_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                        </div>
                                        <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-2xl">
                                            <StatusRing status={activeRequest.status} size="sm" />
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

                                    {activeRequest.status === 'generated' ? (
                                        <button
                                            onClick={() => navigate('/student/wallet')}
                                            className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                                        >
                                            <MapPin className="w-5 h-5" />
                                            Show QR to Guard
                                        </button>
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
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                            <tr>
                                <th className="px-6 py-4">Ref ID</th>
                                <th className="px-6 py-4">Type</th>
                                <th className="px-6 py-4">Departure</th>
                                <th className="px-6 py-4">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {requests.length === 0 ? (
                                <tr>
                                    <td colSpan="4" className="px-6 py-10 text-center text-slate-400">No recent activity found.</td>
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
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${req.status === 'completed' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                                                    req.status === 'rejected' ? 'bg-red-50 text-red-600 border border-red-100' :
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
                            onChange={e => setFormData({ ...formData, type: e.target.value })}
                        >
                            {user?.student_type === 'day_scholar' ? (
                                <>
                                    <option value="Leave">Leave</option>
                                    <option value="On Duty">On Duty (OD)</option>
                                    <option value="Emergency">Emergency</option>
                                </>
                            ) : (
                                <>
                                    <option value="Outing">Outing</option>
                                    <option value="Leave">Leave (Hostel Stay)</option>
                                    <option value="On Duty">On Duty (OD)</option>
                                    <option value="Home Visit">Home Visit</option>
                                    <option value="Project Work">Project Work / Industrial Visit</option>
                                    <option value="Emergency">Emergency</option>
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
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Departure</label>
                            <input
                                type="datetime-local"
                                className="w-full bg-gray-50 dark:bg-slate-800 border-none rounded-xl p-3 mt-1 text-sm dark:text-white outline-none focus:ring-2 focus:ring-primary-500"
                                required
                                value={formData.departure_date}
                                onChange={e => setFormData({ ...formData, departure_date: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Return</label>
                            <input
                                type="datetime-local"
                                className="w-full bg-gray-50 dark:bg-slate-800 border-none rounded-xl p-3 mt-1 text-sm dark:text-white outline-none focus:ring-2 focus:ring-primary-500"
                                required
                                value={formData.return_date}
                                onChange={e => setFormData({ ...formData, return_date: e.target.value })}
                            />
                        </div>
                    </div>
                    <button type="submit" className="w-full bg-primary-600 text-white py-3 rounded-xl font-bold hover:bg-primary-700 transition">Submit Application</button>
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
