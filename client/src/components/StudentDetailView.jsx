import React, { useState, useEffect } from 'react';
import axios from 'axios';

import {
    X, User, Phone, Mail, MapPin, Building, Calendar,
    Shield, Clock, FileText, CheckCircle, XCircle, AlertTriangle, Check, ArrowRight
} from 'lucide-react';
import toast from 'react-hot-toast';

const StudentDetailView = React.forwardRef(({ studentId, onClose, role = 'staff', request, onApprove, onReject }, ref) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [rejectReason, setRejectReason] = useState('');
    const [showRejectInput, setShowRejectInput] = useState(false);

    useEffect(() => {
        if (studentId) fetchProfile();
    }, [studentId]);

    const fetchProfile = async () => {
        setLoading(true);
        try {
            const endpoint = (role === 'warden')
                ? `/api/warden/students/${studentId}`
                : (role === 'hod')
                    ? `/api/hod/student/${studentId}`
                    : `/api/staff/student/${studentId}`;
            const res = await axios.get(endpoint);
            setData(res.data);
            setLoading(false);
        } catch (err) {
            console.error(err);
            setLoading(false);
        }
    };

    const handleApprove = async () => {
        if (!onApprove) return;
        setActionLoading(true);
        try {
            await onApprove();
            onClose();
        } catch (error) {
            console.error(error);
        } finally {
            setActionLoading(false);
        }
    };

    const handleReject = async () => {
        if (!onReject) return;
        if (!rejectReason.trim()) {
            toast.error("Please provide a reason for rejection");
            return;
        }
        setActionLoading(true);
        try {
            await onReject(rejectReason);
            onClose();
        } catch (error) {
            console.error(error);
        } finally {
            setActionLoading(false);
        }
    };

    if (!studentId) return null;

    return (
        <div
            ref={ref}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
            <div
                onClick={onClose}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            <div
                className="relative w-full max-w-5xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[90vh]"
            >
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-10 p-2 bg-white/10 hover:bg-black/10 dark:hover:bg-white/10 rounded-full transition-colors backdrop-blur-md"
                >
                    <X className="w-6 h-6 text-slate-500 dark:text-slate-400" />
                </button>

                {loading ? (
                    <div className="w-full h-96 flex item-center justify-center items-center">
                        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : !data ? (
                    <div className="w-full p-10 text-center text-red-500">Failed to load profile</div>
                ) : (
                    <>
                        {/* LEFT PANEL: Student Profile */}
                        <div className="w-full md:w-5/12 bg-slate-50 dark:bg-slate-800/50 p-6 md:p-8 flex flex-col border-r border-slate-100 dark:border-slate-800 overflow-y-auto">
                            {/* Profile Image */}
                            <div className="relative aspect-[3/4] w-full rounded-2xl overflow-hidden shadow-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 mb-6 group">
                                {data.user?.profile_image || data.student?.profile_image || request?.profile_image ? (
                                    <img
                                        src={`/img/student/${data.user?.profile_image || data.student?.profile_image || request?.profile_image}`}
                                        alt={data.student.name}
                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                    />
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 dark:text-slate-600">
                                        <User className="w-24 h-24 mb-4" />
                                        <span className="text-xl font-bold uppercase tracking-widest">No Image</span>
                                    </div>
                                )}
                                <div className="absolute top-4 right-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
                                    <span className={`text-sm font-black ${data.student.trust_score >= 90 ? 'text-emerald-600' : data.student.trust_score < 70 ? 'text-rose-600' : 'text-amber-600'}`}>
                                        TS: {data.student.trust_score}
                                    </span>
                                </div>
                            </div>

                            {/* Core Info */}
                            <div className="space-y-4">
                                <div>
                                    <h2 className="text-2xl font-black text-slate-900 dark:text-white leading-tight">{data.student.name}</h2>
                                    <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
                                        <span>{data.student.register_number}</span>
                                        <span className="w-1 h-1 rounded-full bg-slate-300" />
                                        <span>{data.student.year} Year</span>
                                        <span className="w-1 h-1 rounded-full bg-slate-300" />
                                        <span>{data.student.department_name || 'Dept'}</span>
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
                                        <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Hostel</p>
                                        <p className="font-bold text-slate-700 dark:text-slate-200 text-sm truncate">{data.student.hostel_name || 'Day Scholar'}</p>
                                    </div>
                                    <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
                                        <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Room</p>
                                        <p className="font-bold text-slate-700 dark:text-slate-200 text-sm">{data.student.room_number || 'N/A'}</p>
                                    </div>
                                </div>

                                <div className="space-y-2 pt-2">
                                    <div className="flex items-center gap-3 p-2 hover:bg-white dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer group">
                                        <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg text-indigo-600 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/40 transition-colors">
                                            <Phone className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase">Student Phone</p>
                                            <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{data.student.phone || 'N/A'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 p-2 hover:bg-white dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer group">
                                        <div className="p-2 bg-rose-50 dark:bg-rose-900/20 rounded-lg text-rose-600 group-hover:bg-rose-100 dark:group-hover:bg-rose-900/40 transition-colors">
                                            <Shield className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase">Parent Phone</p>
                                            <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{data.student.parent_phone || 'N/A'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* RIGHT PANEL: Request Details & Actions */}
                        <div className="w-full md:w-7/12 bg-white dark:bg-slate-900 p-6 md:p-8 flex flex-col overflow-y-auto">
                            {request ? (
                                <div className="flex-1 flex flex-col h-full">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${request.type === 'emergency' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                                            {request.type} Pass
                                        </div>
                                        <div className="text-slate-400 text-xs font-bold">
                                            Requested {new Date(request.created_at).toLocaleDateString()}
                                        </div>
                                    </div>

                                    {/* Ticket View */}
                                    <div className="bg-slate-50 dark:bg-slate-800/30 rounded-3xl border-2 border-slate-100 dark:border-slate-800 p-6 relative overflow-hidden mb-6">
                                        <div className="absolute top-0 right-0 p-4 opacity-10">
                                            <FileText className="w-32 h-32" />
                                        </div>

                                        <div className="relative z-10 grid grid-cols-2 gap-8 mb-8">
                                            <div>
                                                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Departure</p>
                                                <div className="flex items-baseline gap-1">
                                                    <span className="text-2xl font-black text-slate-900 dark:text-white">
                                                        {new Date(request.departure_date).getDate()}
                                                    </span>
                                                    <span className="text-sm font-bold text-slate-500 uppercase">
                                                        {new Date(request.departure_date).toLocaleString('default', { month: 'short' })}
                                                    </span>
                                                </div>
                                                <p className="text-lg font-bold text-indigo-600">
                                                    {new Date(request.departure_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Return</p>
                                                <div className="flex items-baseline gap-1 justify-end">
                                                    <span className="text-2xl font-black text-slate-900 dark:text-white">
                                                        {new Date(request.return_date).getDate()}
                                                    </span>
                                                    <span className="text-sm font-bold text-slate-500 uppercase">
                                                        {new Date(request.return_date).toLocaleString('default', { month: 'short' })}
                                                    </span>
                                                </div>
                                                <p className="text-lg font-bold text-indigo-600">
                                                    {new Date(request.return_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="relative z-10 pt-6 border-t border-slate-200 dark:border-slate-700 border-dashed">
                                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Reason for Leave</p>
                                            <p className="text-lg font-medium text-slate-700 dark:text-slate-200 leading-relaxed">
                                                "{request.reason}"
                                            </p>
                                        </div>
                                    </div>

                                    {/* Past History Summary */}
                                    <div className="mb-8 hidden md:block">
                                        <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider mb-4">Recent History</h3>
                                        <div className="flex gap-2 overflow-x-auto pb-2">
                                            {data.requests?.slice(0, 3).map(r => (
                                                <div key={r.id} className="min-w-[140px] p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                                                    <div className="flex justify-between mb-1">
                                                        <span className={`text-[10px] font-bold uppercase ${r.status === 'rejected' ? 'text-red-500' : 'text-emerald-500'}`}>{r.status}</span>
                                                        <span className="text-[10px] text-slate-400">{new Date(r.created_at).toLocaleDateString()}</span>
                                                    </div>
                                                    <p className="text-xs font-medium truncate text-slate-600 dark:text-slate-300">{r.type}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* ACTION BAR */}
                                    <div className="mt-auto pt-6 border-t border-slate-100 dark:border-slate-800">
                                        {!showRejectInput ? (
                                            <div className="grid grid-cols-2 gap-4">
                                                <button
                                                    onClick={() => setShowRejectInput(true)}
                                                    className="py-4 rounded-2xl border-2 border-slate-200 dark:border-slate-700 font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                                >
                                                    Reject Request
                                                </button>
                                                <button
                                                    onClick={handleApprove}
                                                    disabled={actionLoading}
                                                    className="py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-lg shadow-lg shadow-indigo-200 dark:shadow-none transition-all flex items-center justify-center gap-2"
                                                >
                                                    {actionLoading ? 'Processing...' : (
                                                        <>
                                                            Approve Pass <ArrowRight className="w-5 h-5" />
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                <div>
                                                    <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Reason for Rejection</label>
                                                    <textarea
                                                        value={rejectReason}
                                                        onChange={(e) => setRejectReason(e.target.value)}
                                                        placeholder="Enter reason for rejection..."
                                                        className="w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500 font-medium resize-none h-24"
                                                    />
                                                </div>
                                                <div className="flex gap-3">
                                                    <button
                                                        onClick={() => setShowRejectInput(false)}
                                                        className="flex-1 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-50 transition-colors"
                                                    >
                                                        Cancel
                                                    </button>
                                                    <button
                                                        onClick={handleReject}
                                                        disabled={actionLoading}
                                                        className="flex-1 py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-lg shadow-rose-200 dark:shadow-none transition-all"
                                                    >
                                                        {actionLoading ? 'Rejecting...' : 'Confirm Rejection'}
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                // READ ONLY MODE (No Request)
                                <div className="space-y-6">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-5 rounded-2xl bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-900/20">
                                            <p className="text-xs font-black text-indigo-400 uppercase tracking-widest mb-1">Total Requests</p>
                                            <p className="text-3xl font-black text-indigo-900 dark:text-indigo-100">{data.stats.total}</p>
                                        </div>
                                        <div className="p-5 rounded-2xl bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/20">
                                            <p className="text-xs font-black text-rose-400 uppercase tracking-widest mb-1">Late Returns</p>
                                            <p className="text-3xl font-black text-rose-900 dark:text-rose-100">{data.stats.lateEntries || 0}</p>
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                                            <Clock className="w-5 h-5 text-slate-400" />
                                            Request History
                                        </h3>
                                        <div className="space-y-3">
                                            {data.requests.map(req => (
                                                <div key={req.id} className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 flex justify-between items-center group hover:bg-white dark:hover:bg-slate-800 transition-colors">
                                                    <div>
                                                        <p className="font-bold text-slate-700 dark:text-slate-200">{req.reason}</p>
                                                        <p className="text-xs text-slate-400">{new Date(req.created_at).toLocaleDateString()}</p>
                                                    </div>
                                                    <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${req.status === 'rejected' ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                                        {req.status}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
});

export default StudentDetailView;
