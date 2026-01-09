import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSocket } from '../../context/SocketContext';
import {
    Clock, CheckCircle, XCircle, Search,
    Filter, ArrowUpRight, Shield, User,
    Calendar, AlertCircle, Check, MoreHorizontal,
    Activity, Hash, ChevronRight, SlidersHorizontal,
    LayoutGrid, List as ListIcon, AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import StudentDetailView from '../../components/StudentDetailView';

const HODRequests = () => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedIds, setSelectedIds] = useState([]);
    // Tabs: 'all', 'action_required' (approved_staff), 'oversight' (pending)
    const [filterStatus, setFilterStatus] = useState('all');
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [showDrawer, setShowDrawer] = useState(false);
    const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'

    const { socket } = useSocket();

    useEffect(() => {
        fetchRequests();

        if (socket) {
            socket.on('request_updated', () => {
                fetchRequests();
            });
            // Also listen to notifications as 'request_updated' covers it, but redundancy is fine or just rely on 'request_updated'.
        }

        const interval = setInterval(fetchRequests, 60000); // 1 min fallback
        return () => {
            clearInterval(interval);
            if (socket) socket.off('request_updated');
        };
    }, [socket]);

    const fetchRequests = async () => {
        try {
            const res = await axios.get('/api/queue/hod');
            setRequests(res.data);
        } catch (err) {
            console.error('Failed to sync pass queue');
        } finally {
            setLoading(false);
        }
    };

    const handleSingleStatus = async (id, status, reason = null) => {
        try {
            // Optimistic update
            setRequests(prev => prev.filter(r => r.id !== id));
            await axios.put(`/api/queue/${id}/status`, { status, reason });
            fetchRequests();
        } catch (err) {
            console.error('Status sync failed');
            fetchRequests(); // Revert
        }
    };

    const handleBulkApprove = async () => {
        try {
            const count = selectedIds.length;
            if (count === 0) return;

            // Optimistic
            setRequests(prev => prev.filter(r => !selectedIds.includes(r.id)));
            setSelectedIds([]);

            await axios.post('/api/hod/bulk-approve', { requestIds: selectedIds });
            fetchRequests();
        } catch (err) {
            console.error('Bulk approval failed');
            fetchRequests();
        }
    };

    const toggleSelect = (id) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    // Advanced Filtering Logic
    const filteredRequests = (requests || []).filter(r => {
        const studentName = r.student_name || '';
        const regNo = r.register_number || '';

        const matchesSearch = studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            regNo.toLowerCase().includes(searchTerm.toLowerCase());

        let matchesFilter = true;
        if (filterStatus === 'action_required') {
            matchesFilter = r.status === 'approved_staff';
        } else if (filterStatus === 'oversight') {
            matchesFilter = r.status === 'pending';
        }

        return matchesSearch && matchesFilter;
    });

    // Stats Calculation
    const stats = {
        total: requests.length,
        actionRequired: requests.filter(r => r.status === 'approved_staff').length,
        emergency: requests.filter(r => r.type === 'emergency').length,
        pending: requests.filter(r => r.status === 'pending').length
    };

    return (
        <div className="space-y-8 pb-20 min-h-screen bg-slate-50/50 dark:bg-[#0B1120]">

            {/* Professional Dash Header */}
            <div className="flex flex-col gap-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div className="space-y-1">
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Pass Approval Hub</h1>
                        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium flex items-center gap-2">
                            <Shield className="w-4 h-4 text-emerald-500" />
                            Departmental Oversight Console
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="hidden md:flex bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                <LayoutGrid className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                <ListIcon className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="relative group flex-1 lg:flex-none">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search student or ID..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 w-full lg:w-72 shadow-sm transition-all"
                            />
                        </div>
                    </div>
                </div>

                {/* Quick Stats Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard
                        label="Action Required"
                        value={stats.actionRequired}
                        icon={<AlertCircle className="w-4 h-4 text-blue-500" />}
                        active={filterStatus === 'action_required'}
                        onClick={() => setFilterStatus('action_required')}
                        color="blue"
                    />
                    <StatCard
                        label="Oversight (Pending)"
                        value={stats.pending}
                        icon={<Clock className="w-4 h-4 text-amber-500" />}
                        active={filterStatus === 'oversight'}
                        onClick={() => setFilterStatus('oversight')}
                        color="amber"
                    />
                    <StatCard
                        label="Emergency Cases"
                        value={stats.emergency}
                        icon={<AlertTriangle className="w-4 h-4 text-red-500" />}
                        active={false} // Just a stat
                        color="red"
                    />
                    <StatCard
                        label="Total Queue"
                        value={stats.total}
                        icon={<LayoutGrid className="w-4 h-4 text-blue-500" />}
                        active={filterStatus === 'all'}
                        onClick={() => setFilterStatus('all')}
                        color="blue"
                    />
                </div>
            </div>

            {/* Bulk Actions Bar */}
            <AnimatePresence>
                {selectedIds.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white p-2 pl-6 pr-2 rounded-full shadow-2xl flex items-center gap-6 border border-slate-700/50 backdrop-blur-xl"
                    >
                        <span className="text-sm font-bold flex items-center gap-2">
                            <div className="w-5 h-5 bg-white text-slate-900 rounded-full flex items-center justify-center text-xs">
                                {selectedIds.length}
                            </div>
                            Selected
                        </span>
                        <div className="h-6 w-px bg-slate-700" />
                        <div className="flex gap-2">
                            <button
                                onClick={() => setSelectedIds([])}
                                className="px-4 py-2 hover:bg-slate-800 rounded-full text-xs font-bold uppercase tracking-wider transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleBulkApprove}
                                className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full text-xs font-bold uppercase tracking-wider shadow-lg shadow-emerald-500/20 transition-all hover:scale-105"
                            >
                                Approve All
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Request Grid */}
            <div className={`grid ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3' : 'grid-cols-1'} gap-6`}>
                <AnimatePresence mode="popLayout">
                    {loading ? (
                        [1, 2, 3].map(i => <SkeletonCard key={i} />)
                    ) : filteredRequests.length === 0 ? (
                        <EmptyState filter={filterStatus} />
                    ) : (
                        filteredRequests.map((req) => (
                            <RequestCard
                                key={req.id}
                                req={req}
                                isSelected={selectedIds.includes(req.id)}
                                onSelect={() => toggleSelect(req.id)}
                                onApprove={() => handleSingleStatus(req.id, 'approved_hod')}
                                onReject={() => handleSingleStatus(req.id, 'rejected')}
                                onClick={() => {
                                    setSelectedRequest(req);
                                    setShowDrawer(true);
                                }}
                                viewMode={viewMode}
                            />
                        ))
                    )}
                </AnimatePresence>
            </div>

            {/* Student Detail Drawer */}
            <AnimatePresence>
                {showDrawer && selectedRequest && (
                    <StudentDetailView
                        studentId={selectedRequest.user_id}
                        onClose={() => {
                            setShowDrawer(false);
                            setSelectedRequest(null);
                        }}
                        role="hod"
                        request={selectedRequest}
                        onApprove={() => handleSingleStatus(selectedRequest.id, 'approved_hod')}
                        onReject={(reason) => handleSingleStatus(selectedRequest.id, 'rejected', reason)}
                    />
                )}
            </AnimatePresence>

        </div>
    );
};

// Sub-components for cleaner code
const StatCard = ({ label, value, icon, active, onClick, color }) => (
    <div
        onClick={onClick}
        className={`bg-white dark:bg-slate-800 p-4 rounded-2xl border transition-all cursor-pointer hover:shadow-md ${active
            ? `border-${color}-500 ring-1 ring-${color}-500 shadow-sm`
            : 'border-slate-100 dark:border-slate-700 shadow-sm'
            }`}
    >
        <div className="flex justify-between items-start mb-2">
            <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                {icon}
            </div>
            {active && <div className={`w-2 h-2 rounded-full bg-${color}-500`} />}
        </div>
        <div className="text-2xl font-bold text-slate-900 dark:text-white mb-0.5">{value}</div>
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{label}</div>
    </div>
);

// --- Request Card Component ---
const RequestCard = React.forwardRef(({ req, isSelected, onSelect, onViewParam, onApprove, onReject, onClick }, ref) => {
    const [showContact, setShowContact] = useState(false);

    // Determine card styling based on type and status
    const isUrgent = req.type === 'emergency';
    const isHosteler = req.student_type !== 'Day Scholar';
    const isReady = req.status === 'approved_staff';

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

    const cardBorderColor = isSelected ? 'border-blue-500' :
        isUrgent ? 'border-rose-200 dark:border-rose-900' :
            isReady ? 'border-blue-200 dark:border-blue-900' :
                'border-slate-200 dark:border-slate-800';

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
                ${isSelected ? 'ring-4 ring-blue-500/20 z-10' : ''}
            `}
        >
            {/* Header Strip - Type Indicator */}
            <div className={`h-2 w-full ${isUrgent ? 'bg-rose-500' :
                req.type === 'Outing' ? 'bg-sky-500' :
                    req.type === 'Leave' ? 'bg-violet-500' : 'bg-slate-300'
                }`} />

            {/* Selection Checkbox (Absolute Top Left) */}
            <div className="absolute top-4 left-4 z-20">
                <div
                    onClick={(e) => { e.stopPropagation(); onSelect(); }}
                    className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center cursor-pointer transition-all ${isSelected
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : 'bg-white/80 dark:bg-slate-800/80 border-slate-300 dark:border-slate-600 hover:border-blue-400'
                        }`}
                >
                    {isSelected && <Check className="w-3 h-3" />}
                </div>
            </div>

            {/* Top Badge Overlay (Right) */}
            <div className="absolute top-4 right-4 flex flex-col items-end gap-2 z-20 pointer-events-none">
                {isUrgent && (
                    <span className="px-3 py-1 bg-rose-500 text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg shadow-rose-500/30 flex items-center gap-1 animate-pulse">
                        <AlertTriangle className="w-3 h-3" /> Urgent
                    </span>
                )}
                {isReady && (
                    <span className="px-3 py-1 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg shadow-blue-500/30 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Ready for HOD
                    </span>
                )}
                <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${req.student_type === 'Day Scholar'
                    ? 'bg-cyan-50 text-cyan-700 border-cyan-100'
                    : 'bg-indigo-50 text-indigo-700 border-indigo-100'
                    }`}>
                    {req.student_type}
                </span>
            </div>

            <div className="p-5 pt-16 cursor-pointer" onClick={() => onClick(req)}>
                {/* 1. Identity Section */}
                <div className="flex items-start gap-4 mb-5">
                    <div
                        className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-lg font-black text-slate-400 border border-slate-200 dark:border-slate-700 relative overflow-hidden shrink-0 group-hover:bg-slate-200 transition-colors"
                    >
                        {req.profile_image ? (
                            <img
                                src={`/img/student/${req.profile_image}`}
                                alt={req.student_name}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            req.student_name?.charAt(0)
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-black text-slate-800 dark:text-white leading-tight truncate group-hover:text-blue-600 transition-colors">
                            {req.student_name}
                        </h3>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs">
                            <span className="font-bold text-slate-500 uppercase tracking-wider">{req.year} Year</span>
                            <span className="w-1 h-1 bg-slate-300 rounded-full" />
                            <span className="font-mono font-bold text-slate-500">{req.register_number}</span>
                            {isHosteler && req.hostel_name && (
                                <>
                                    <span className="w-1 h-1 bg-slate-300 rounded-full" />
                                    <span className="font-bold text-indigo-600 dark:text-indigo-400 truncate max-w-[120px]">
                                        {req.hostel_name} {req.room_number ? `#${req.room_number}` : ''}
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
                                onClick={(e) => { e.stopPropagation(); setShowContact(!showContact); }}
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
                    onClick={(e) => { e.stopPropagation(); onReject(); }}
                    className="flex-1 py-3 px-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-black text-slate-500 uppercase tracking-widest hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-all shadow-sm"
                >
                    Decline
                </button>
                <button
                    onClick={(e) => { e.stopPropagation(); onApprove(); }}
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

const SkeletonCard = React.forwardRef((props, ref) => (
    <div ref={ref} className="h-64 bg-slate-100 dark:bg-slate-800/50 rounded-3xl animate-pulse" />
));

const EmptyState = React.forwardRef(({ filter }, ref) => (
    <motion.div
        ref={ref}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="col-span-full py-24 text-center"
    >
        <div className="w-24 h-24 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-slate-300" />
        </div>
        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">All Caught Up!</h3>
        <p className="text-slate-500 max-w-xs mx-auto text-sm">
            {filter === 'action_required'
                ? "No requests waiting for your approval."
                : "No pending departmental requests found."}
        </p>
    </motion.div>
));

export default HODRequests;
