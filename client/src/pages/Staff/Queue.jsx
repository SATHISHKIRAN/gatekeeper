import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useSearchParams } from 'react-router-dom';
import { useSocket } from '../../context/SocketContext';
import {
    Check, User, MapPin, Clock,
    ShieldCheck, CheckSquare, Hash, ArrowUpRight,
    Crown, Loader2, Search, Filter, AlertTriangle,
    Calendar, MoreVertical, X
} from 'lucide-react';
import StudentDetailView from '../../components/StudentDetailView';

// --- Quick Stats Component ---
const QuickStats = ({ requests }) => {
    const stats = useMemo(() => {
        return {
            total: requests.length,
            urgent: requests.filter(r => r.type === 'emergency').length,
            proxy: requests.filter(r => r.isProxyReq).length,
            mentees: requests.filter(r => !r.isProxyReq).length
        };
    }, [requests]);

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
                { label: 'Pending Total', value: stats.total, color: 'blue', icon: Clock },
                { label: 'Urgent Action', value: stats.urgent, color: 'red', icon: AlertTriangle },
                { label: 'Delegated', value: stats.proxy, color: 'indigo', icon: Crown },
                { label: 'My Mentees', value: stats.mentees, color: 'emerald', icon: User },
            ].map((stat) => (
                <div
                    key={stat.label}
                    className={`bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-4 rounded-2xl border border-${stat.color}-100 dark:border-${stat.color}-900/30 shadow-sm relative overflow-hidden group`}
                >
                    <div className={`absolute -right-4 -top-4 w-20 h-20 bg-${stat.color}-500/10 rounded-full blur-2xl group-hover:bg-${stat.color}-500/20 transition-all`} />
                    <div className="flex justify-between items-start relative z-10">
                        <div>
                            <p className="text-[10px] uppercase font-black tracking-widest text-slate-400 mb-1">{stat.label}</p>
                            <h3 className={`text-3xl font-black text-${stat.color}-600 dark:text-${stat.color}-400`}>{stat.value}</h3>
                        </div>
                        <div className={`p-2 rounded-xl bg-${stat.color}-50 dark:bg-${stat.color}-900/20 text-${stat.color}-500`}>
                            <stat.icon className="w-5 h-5" />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

// --- Request Card Component ---
const RequestCard = React.forwardRef(({ req, isSelected, onToggle, onAction, onClick }, ref) => {
    const [showContact, setShowContact] = useState(false);

    // Determine card styling based on type and status
    const isUrgent = req.type === 'emergency';
    const isProxy = req.isProxyReq;
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

    const cardBorderColor = isSelected ? 'border-blue-500' :
        isUrgent ? 'border-rose-200 dark:border-rose-900' :
            isProxy ? 'border-indigo-200 dark:border-indigo-900' :
                'border-slate-200 dark:border-slate-800';

    return (
        <div
            ref={ref}
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
                    onClick={(e) => { e.stopPropagation(); onToggle(req.id); }}
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
                {isProxy && (
                    <span className="px-3 py-1 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg shadow-indigo-500/30 flex items-center gap-1">
                        <Crown className="w-3 h-3" /> HOD Proxy
                    </span>
                )}
                <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${req.student_type === 'Day Scholar'
                    ? 'bg-cyan-50 text-cyan-700 border-cyan-100'
                    : 'bg-indigo-50 text-indigo-700 border-indigo-100'
                    }`}>
                    {req.student_type}
                </span>
            </div>

            <div className="p-5 pt-8 cursor-pointer" onClick={() => onClick(req)}>
                {/* 1. Identity Section */}
                <div className="flex items-start gap-4 mb-5">
                    <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-lg font-black text-slate-400 border border-slate-200 dark:border-slate-700 relative overflow-hidden shrink-0">
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
                        <h3 className="text-lg font-black text-slate-800 dark:text-white leading-tight truncate">{req.student_name}</h3>
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
                    {showContact && (
                        <div
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
                        </div>
                    )}
                </div>
            </div>

            {/* 4. Actions Footer */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-800 flex gap-3">
                <button
                    onClick={(e) => { e.stopPropagation(); onAction(req.id, 'reject'); }}
                    className="flex-1 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-black text-slate-500 uppercase tracking-widest hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-all shadow-sm"
                >
                    Reject
                </button>
                <button
                    onClick={(e) => { e.stopPropagation(); onAction(req.id, 'approve'); }}
                    className={`flex-[2] py-3 rounded-xl text-xs font-black text-white uppercase tracking-widest shadow-lg shadow-blue-500/20 transition-all active:scale-95 flex items-center justify-center gap-2
                        ${isProxy
                            ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400'
                            : 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400'
                        }`}
                >
                    {isProxy ? <Crown className="w-3 h-3" /> : <Check className="w-3 h-3" />}
                    {isProxy ? 'HOD Approve' : 'Approve'}
                </button>
            </div>
        </div>
    );
});

const StaffQueue = () => {
    const [searchParams] = useSearchParams();
    const [requests, setRequests] = useState([]);
    const [studentsOnLeave, setStudentsOnLeave] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isGlobalProxy, setIsGlobalProxy] = useState(false);
    const [selectedIds, setSelectedIds] = useState([]);
    const [filter, setFilter] = useState(searchParams.get('filter') || 'all'); // 'all', 'mentee', 'proxy', 'urgent'
    const [search, setSearch] = useState('');
    const [processing, setProcessing] = useState(false);
    const [showDrawer, setShowDrawer] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState(null);

    const { socket } = useSocket();

    useEffect(() => {
        fetchQueue();

        if (socket) {
            socket.on('request_updated', () => {
                fetchQueue();
            });
        }

        const interval = setInterval(fetchQueue, 60000); // 1 min fallback
        return () => {
            clearInterval(interval);
            if (socket) socket.off('request_updated');
        };
    }, [socket]);

    const fetchQueue = async () => {
        try {
            // Fetch queues + students on leave in parallel
            const [menteeRes, proxyRes, leaveRes] = await Promise.all([
                axios.get('/api/queue').catch(() => ({ data: [] })),
                axios.get('/api/staff/proxy/pending').catch(() => ({ data: { requests: [], isGlobalProxy: false } })),
                axios.get('/api/staff/students-on-leave').catch(() => ({ data: [] }))
            ]);

            setStudentsOnLeave(leaveRes.data || []);
            const menteeData = menteeRes.data.map(r => ({ ...r, isProxyReq: false }));

            // Handle proxy response structure
            let proxyData = [];
            let proxyStatus = false;

            if (proxyRes.data.requests) {
                proxyData = proxyRes.data.requests.map(r => ({ ...r, isProxyReq: true }));
                proxyStatus = proxyRes.data.isGlobalProxy;
            } else if (Array.isArray(proxyRes.data)) {
                // Fallback for old API if needed, mostly handled by catch
                proxyData = proxyRes.data.map(r => ({ ...r, isProxyReq: true }));
            }

            // Merge and deduplicate
            const allRequests = [...menteeData, ...proxyData];
            const uniqueRequests = Array.from(new Map(allRequests.map(item => [item.id, item])).values());

            setRequests(uniqueRequests);
            setIsGlobalProxy(proxyStatus);
            setLoading(false);
        } catch (err) {
            console.error("Queue sync failed", err);
            setLoading(false);
        }
    };

    // Filter Logic
    const filteredRequests = useMemo(() => {
        let data = requests;

        // Tab Filter
        if (filter === 'mentee') data = data.filter(r => !r.isProxyReq);
        if (filter === 'proxy') data = data.filter(r => r.isProxyReq);
        if (filter === 'urgent') data = data.filter(r => r.type === 'emergency');

        // Search
        if (search) {
            const lower = search.toLowerCase();
            data = data.filter(r =>
                r.student_name?.toLowerCase().includes(lower) ||
                r.register_number?.toLowerCase().includes(lower)
            );
        }

        return data;
    }, [requests, filter, search]);

    const handleAction = async (id, action, reason = null) => {
        // Optimistic Update
        setRequests(prev => prev.filter(r => r.id !== id));

        try {
            await axios.post('/api/staff/bulk-approve', {
                requestIds: [id],
                action,
                reason // Pass reason if available
            });
        } catch (err) {
            console.error("Action error", err);
            fetchQueue(); // Revert
        }
    };

    const toggleSelection = (id) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const handleBulk = async (action) => {
        if (!selectedIds.length) return;
        setProcessing(true);
        try {
            await axios.post('/api/staff/bulk-approve', {
                requestIds: selectedIds,
                action
            });
            setSelectedIds([]);
            fetchQueue();
        } catch (err) {
            console.error("Bulk action error");
        } finally {
            setProcessing(false);
        }
    };

    if (loading) return (
        <div className="flex h-[50vh] items-center justify-center flex-col gap-4">
            <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
            <p className="text-xs font-black uppercase text-slate-400 tracking-widest">Loading Requests...</p>
        </div>
    );

    return (
        <div className="space-y-6 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Approval Queue</h1>
                    <p className="text-slate-500 font-medium text-sm flex items-center gap-2 mt-1">
                        Review pending gate passes
                        {isGlobalProxy && (
                            <span className="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-700 text-[10px] font-black uppercase tracking-wider border border-indigo-200">Assistant HOD Active</span>
                        )}
                    </p>
                </div>

                {/* Search & Bulk Actions */}
                <div className="flex items-center gap-3">
                    {selectedIds.length > 0 ? (
                        <div
                            className="flex items-center gap-2 bg-slate-900 text-white p-2 pr-4 rounded-xl shadow-xl"
                        >
                            <span className="px-3 py-1 bg-slate-800 rounded-lg text-xs font-bold">{selectedIds.length}</span>
                            <button onClick={() => handleBulk('reject')} className="p-2 hover:bg-red-500 rounded-lg transition-colors text-xs font-bold uppercase">Reject</button>
                            <button onClick={() => handleBulk('approve')} className="p-2 hover:bg-emerald-500 rounded-lg transition-colors text-xs font-bold uppercase">Approve</button>
                            <button onClick={() => setSelectedIds([])} className="p-1 hover:bg-slate-700 rounded-lg ml-2"><X className="w-4 h-4" /></button>
                        </div>
                    ) : (
                        <div className="relative group">
                            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 group-focus-within:text-blue-500 transition-colors" />
                            <input
                                type="text"
                                placeholder="Search students..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-10 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 w-full md:w-64 shadow-sm"
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Students on Leave Ticker */}
            {studentsOnLeave.length > 0 && (
                <div
                    className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-indigo-100 dark:border-indigo-900/30 shadow-sm flex flex-col md:flex-row items-start md:items-center gap-6 mb-6"
                >
                    <div className="flex items-center gap-3 shrink-0">
                        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/20 text-indigo-600 rounded-xl">
                            <User className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Mentee Status</p>
                            <p className="font-bold text-gray-900 dark:text-white">Active Passes (Leave / OD)</p>
                        </div>
                    </div>
                    <div className="flex-1 flex flex-wrap gap-3">
                        {studentsOnLeave.map((s) => (
                            <div key={s.id} className="group relative flex items-center gap-3 pl-1 pr-4 py-1.5 bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 hover:border-indigo-200 transition-all">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs uppercase shadow-sm overflow-hidden ${s.pass_type === 'On Duty' ? 'bg-sky-100 text-sky-600' :
                                    ['out', 'active'].includes(s.status) ? 'bg-emerald-100 text-emerald-600' :
                                        s.status === 'completed' ? 'bg-gray-100 text-gray-600' :
                                            'bg-amber-100 text-amber-600'
                                    }`}>
                                    {s.profile_image ? (
                                        <img
                                            src={`/img/student/${s.profile_image}`}
                                            alt={s.name}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        s.name.charAt(0)
                                    )}
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-gray-900 dark:text-white">{s.name}</p>
                                    <div className="flex items-center gap-1">
                                        <span className={`text-[9px] font-bold uppercase tracking-wider ${s.pass_type === 'On Duty' ? 'text-sky-600' : 'text-gray-400'
                                            }`}>{s.pass_type} {s.status === 'completed' ? '(Returned)' : ''}</span>
                                        {['out', 'active'].includes(s.status) && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                                        {s.status === 'completed' && <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <QuickStats requests={requests} />

            {/* Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
                {[
                    { id: 'all', label: 'All Requests' },
                    { id: 'mentee', label: 'My Mentees' },
                    { id: 'proxy', label: 'Delegated / HOD', show: isGlobalProxy || requests.some(r => r.isProxyReq) },
                    { id: 'urgent', label: 'Urgent', count: requests.filter(r => r.type === 'emergency').length }
                ].filter(t => t.show !== false).map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setFilter(tab.id)}
                        className={`
                            relative px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest whitespace-nowrap transition-all
                            ${filter === tab.id ? 'text-white shadow-lg shadow-blue-500/30' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}
                        `}
                    >
                        {filter === tab.id && (
                            <div
                                className="absolute inset-0 bg-blue-600 rounded-xl"
                            />
                        )}
                        <span className="relative z-10 flex items-center gap-2">
                            {tab.label}
                            {tab.count > 0 && (
                                <span className={`px-1.5 py-0.5 rounded-md text-[9px] ${filter === tab.id ? 'bg-white/20' : 'bg-red-100 text-red-600'}`}>
                                    {tab.count}
                                </span>
                            )}
                        </span>
                    </button>
                ))}
            </div>

            {/* Grid Content */}
            {filteredRequests.length === 0 ? (
                <div className="text-center py-32 bg-slate-50 dark:bg-slate-900/50 border border-dashed border-slate-200 dark:border-slate-800 rounded-[3rem]">
                    <div className="w-24 h-24 bg-white dark:bg-slate-800 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm">
                        <CheckSquare className="w-10 h-10 text-slate-300" />
                    </div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white">All Caught Up!</h3>
                    <p className="text-slate-500 font-medium max-w-md mx-auto mt-2">No pending requests matching your current filters.</p>
                    {filter !== 'all' && (
                        <button onClick={() => setFilter('all')} className="mt-6 text-blue-600 font-bold text-sm uppercase tracking-wide hover:underline">
                            View All Requests
                        </button>
                    )}
                </div>
            ) : (
                <div
                    className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
                >
                    {filteredRequests.map(req => (
                        <RequestCard
                            key={req.id}
                            req={req}
                            isSelected={selectedIds.includes(req.id)}
                            onToggle={toggleSelection}
                            onAction={handleAction}
                            onClick={() => {
                                setSelectedRequest(req);
                                setShowDrawer(true);
                            }}
                        />
                    ))}
                </div>
            )}

            {/* Student Search/Filter Drawer can go here if needed later */}
            {showDrawer && selectedRequest && (
                <StudentDetailView
                    studentId={selectedRequest.user_id}
                    onClose={() => {
                        setShowDrawer(false);
                        setSelectedRequest(null);
                    }}
                    request={selectedRequest}
                    onApprove={() => handleAction(selectedRequest.id, 'approve')}
                    onReject={(reason) => handleAction(selectedRequest.id, 'reject', reason)}
                />
            )}
        </div>
    );
};


export default StaffQueue;
