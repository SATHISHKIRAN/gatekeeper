import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSocket } from '../../context/SocketContext';
import {
    ShieldCheck, Phone, User, Clock, Check, X, AlertTriangle,
    Search, Filter, ChevronRight, MapPin, Calendar,
    MoreVertical, Eye, MessageSquare, ShieldAlert
} from 'lucide-react';
import toast from 'react-hot-toast';
import StudentDetailView from '../../components/StudentDetailView';

const WardenVerify = () => {
    const [requests, setRequests] = useState([]);
    const [risks, setRisks] = useState({});
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [selectedStudentId, setSelectedStudentId] = useState(null);
    const [filterType, setFilterType] = useState('all');

    const { socket } = useSocket();

    useEffect(() => {
        fetchRequests();

        if (socket) {
            socket.on('request_updated', () => {
                fetchRequests();
            });
        }

        const interval = setInterval(fetchRequests, 60000); // 1 min fallback
        return () => {
            clearInterval(interval);
            if (socket) socket.off('request_updated');
        };
    }, [socket]);

    const fetchRequests = async () => {
        try {
            const res = await axios.get('/api/warden/verify-queue');
            setRequests(res.data);
            res.data.forEach(req => fetchRisk(req.user_id));
        } catch (err) {
            console.error(err);
            toast.error("Failed to fetch queue");
        } finally {
            setLoading(false);
        }
    };

    const fetchRisk = async (studentId) => {
        try {
            const res = await axios.post('/api/ai/predict-risk', { studentId });
            setRisks(prev => ({ ...prev, [studentId]: res.data }));
        } catch (err) {
            console.error("AI Error", err);
        }
    };

    const handleVerify = async (id, status, score, reason = '') => {
        if (status === 'approved_warden' && score < 50) {
            toast.error("Trust Score too low. Parent authorization required.");
            return;
        }

        try {
            await axios.put(`/api/warden/${id}/verify`, { status, reason });
            setRequests(prev => prev.filter(req => req.id !== id));
            toast.success(status === 'rejected' ? "Request rejected" : "Request approved");

            // Close modals
            setSelectedRequest(null);
            setSelectedStudentId(null);
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.message || "Action failed");
        }
    };

    const getRiskBadge = (level) => {
        const styles = {
            CRITICAL: 'bg-rose-500 text-white',
            HIGH: 'bg-orange-500 text-white',
            MEDIUM: 'bg-amber-500 text-white',
            LOW: 'bg-emerald-500 text-white'
        };
        return (
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${styles[level] || 'bg-slate-500 text-white'}`}>
                {level || 'calculating...'}
            </span>
        );
    };

    const filteredRequests = requests.filter(req => {
        const matchesSearch = req.student_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            req.room_number?.toString().includes(searchTerm);
        const matchesFilter = filterType === 'all' || req.type === filterType;
        return matchesSearch && matchesFilter;
    });

    if (loading) return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div
                className="flex flex-col items-center gap-4"
            >
                <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin shadow-xl shadow-indigo-600/20"></div>
                <p className="text-slate-500 font-black uppercase tracking-widest text-xs">Initializing Secure Queue...</p>
            </div>
        </div>
    );

    return (
        <div className="space-y-8 pb-20 max-w-7xl mx-auto px-4">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight italic">Verification Queue</h1>
                    <p className="text-slate-500 dark:text-slate-400 font-bold mt-1 uppercase tracking-widest text-[10px]">
                        {requests.length} Requests Pending Secure Audit
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
                        <button
                            onClick={() => setFilterType('all')}
                            className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${filterType === 'all' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500'}`}
                        >
                            ALL
                        </button>
                        <button
                            onClick={() => setFilterType('outpass')}
                            className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${filterType === 'outpass' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500'}`}
                        >
                            OUTPASS
                        </button>
                    </div>
                </div>
            </div>

            {/* Controls Section */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 flex items-center gap-4 bg-white dark:bg-slate-900 p-2 rounded-3xl border-2 border-slate-100 dark:border-slate-800 shadow-sm focus-within:border-indigo-500/50 transition-all">
                    <Search className="w-6 h-6 text-slate-400 ml-4" />
                    <input
                        type="text"
                        placeholder="Search student or room number..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-bold text-slate-900 dark:text-white placeholder-slate-400"
                    />
                </div>
                <button className="px-6 py-4 bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-3xl flex items-center gap-2 font-black text-xs text-slate-600 dark:text-slate-400 hover:border-indigo-500/50 transition-all uppercase tracking-widest">
                    <Filter className="w-4 h-4" />
                    Refine
                </button>
            </div>

            {/* Queue Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {filteredRequests.length === 0 ? (
                    <div
                        className="col-span-full bg-white dark:bg-slate-900 py-24 rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-slate-800 text-center"
                    >
                        <ShieldCheck className="w-16 h-16 text-slate-200 dark:text-slate-800 mx-auto mb-4" />
                        <h3 className="text-xl font-black text-slate-900 dark:text-white italic">Coast is Clear!</h3>
                        <p className="text-sm text-slate-500 font-bold uppercase tracking-[0.2em] mt-2">All verifications completed for now.</p>
                    </div>
                ) : (
                    filteredRequests.map((req, index) => {
                        const risk = risks[req.user_id];
                        const isLowScore = req.trust_score < 50;

                        return (
                            <div
                                key={req.id}
                                className={`group relative overflow-hidden bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border-2 transition-all cursor-pointer hover:shadow-2xl hover:shadow-indigo-500/10 ${isLowScore ? 'border-rose-100 dark:border-rose-900/30 bg-rose-50/10' : 'border-slate-50 dark:border-slate-800 hover:border-indigo-100 dark:hover:border-indigo-500/30'}`}
                                onClick={() => setSelectedRequest(req)}
                            >
                                <div className="flex justify-between items-start gap-6">
                                    <div className="flex items-center gap-5">
                                        <div className="relative">
                                            <div className={`w-20 h-20 rounded-3xl flex items-center justify-center font-black text-2xl shadow-inner relative overflow-hidden ${isLowScore ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/50' : 'bg-slate-50 text-slate-900 dark:bg-slate-800 dark:text-white'}`}>
                                                {req.profile_image ? (
                                                    <img
                                                        src={`/img/student/${req.profile_image}`}
                                                        alt={req.student_name}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    req.trust_score
                                                )}
                                            </div>
                                            <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-lg">
                                                <ShieldCheck className="w-4 h-4" />
                                            </div>
                                        </div>
                                        <div>
                                            <h4 className="text-xl font-black text-slate-900 dark:text-white tracking-tight leading-tight group-hover:text-indigo-600 transition-colors">
                                                {req.student_name}
                                            </h4>
                                            <div className="flex items-center gap-3 mt-1.5">
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg">Room {req.room_number || 'N/A'}</span>
                                                <span className="flex items-center gap-1.5 text-xs font-bold text-slate-500 italic">
                                                    <Clock className="w-3.5 h-3.5" />
                                                    {new Date(req.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                        {getRiskBadge(risk?.riskLevel)}
                                        <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 rounded-xl text-[10px] font-black uppercase tracking-widest">
                                            {req.type}
                                        </span>
                                    </div>
                                </div>

                                <div className="mt-8 grid grid-cols-2 gap-4">
                                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700/50">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Purpose of Visit</label>
                                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300 line-clamp-1 italic">"{req.reason}"</p>
                                    </div>
                                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700/50">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Parent Authorization</label>
                                        <div className="flex items-center gap-2">
                                            <div className={`w-1.5 h-1.5 rounded-full ${isLowScore ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]' : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'}`} />
                                            <p className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                                                {isLowScore ? 'Action Required' : 'Pre-Verified'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Action Reveal */}
                                <div className="mt-6 flex items-center gap-3">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedRequest(req);
                                        }}
                                        className="w-14 h-14 bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-500/50 transition-all shadow-sm group/eye"
                                    >
                                        <Eye className="w-5 h-5 group-hover/eye:scale-110 transition-transform" />
                                    </button>

                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedRequest(req);
                                        }}
                                        className="flex-1 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 text-slate-500 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 dark:hover:bg-rose-900/10"
                                    >
                                        Reject
                                    </button>

                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleVerify(req.id, 'approved_warden', req.trust_score);
                                        }}
                                        disabled={isLowScore}
                                        className={`flex-[2] flex items-center justify-center gap-2 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${isLowScore ? 'bg-slate-100 dark:bg-slate-800 text-slate-300 cursor-not-allowed border-2 border-slate-200 dark:border-slate-700' : 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/30 hover:scale-[1.02] active:scale-95'}`}
                                    >
                                        <Check className="w-4 h-4" />
                                        {isLowScore ? 'Approval Locked' : 'Authorize Outpass'}
                                    </button>
                                </div>

                                {/* Warning Overlay for Critical Scores / Late Behavior */}
                                <div className="absolute top-0 right-0 p-4 flex gap-2">
                                    {req.late_return_count > 2 && (
                                        <div className="text-rose-500 animate-pulse" title="Frequent Late Returns">
                                            <Clock className="w-5 h-5" />
                                        </div>
                                    )}
                                    {isLowScore && (
                                        <div className="animate-bounce">
                                            <ShieldAlert className="w-6 h-6 text-rose-500" />
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {selectedRequest && (
                <StudentDetailView
                    studentId={selectedRequest.user_id}
                    role="warden"
                    request={selectedRequest}
                    onClose={() => setSelectedRequest(null)}
                    onApprove={() => handleVerify(selectedRequest.id, 'approved_warden', selectedRequest.trust_score)}
                    onReject={(reason) => handleVerify(selectedRequest.id, 'rejected', 0, reason)}
                />
            )}

            {/* Custom Scrollbar Styles */}
            <style>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #e2e8f0;
                    border-radius: 10px;
                }
                .dark .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #1e293b;
                }
            `}</style>
        </div >
    );
};

// Add missing History icon from lucide-react (using History icon name from lucide)
const HistoryIcon = ({ className }) => (
    <Clock className={className} />
);

export default WardenVerify;
