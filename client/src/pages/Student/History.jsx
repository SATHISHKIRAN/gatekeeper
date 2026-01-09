import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Clock, CheckCircle, XCircle, AlertCircle, FileText, Ban,
    ArrowLeft, ArrowRight, Search, Filter, Calendar, MapPin, ChevronDown, Eye
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import PassDetailsModal from '../../components/PassDetailsModal';

const History = () => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [pages, setPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [showModal, setShowModal] = useState(false);

    // Advanced Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [typeFilter, setTypeFilter] = useState('all');

    const fetchHistory = async () => {
        setLoading(true);
        try {
            // Fetching a bit more to allow client-side filtering on recent items effectively
            // Ideally backend should handle search/filter, but for "History" client-side on 20-50 items is snappy.
            const res = await axios.get(`/api/requests/my-requests?page=${page}&limit=10`);
            setRequests(res.data.requests || []);
            setPages(res.data.pages || 1);
            setTotal(res.data.total || 0);
        } catch (err) {
            console.error('Failed to fetch history');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHistory();
    }, [page]);

    const handleCancel = async (id) => {
        if (!window.confirm("Are you sure you want to cancel this request?")) return;
        try {
            await axios.delete(`/api/requests/${id}`);
            fetchHistory(); // Refresh
        } catch (err) {
            alert(err.response?.data?.message || 'Cancellation failed');
        }
    };

    // --- LOGIC: Client-Side Filter ---
    const filteredRequests = requests.filter(req => {
        const matchesSearch =
            req.reason.toLowerCase().includes(searchTerm.toLowerCase()) ||
            req.id.toString().includes(searchTerm);

        const matchesStatus = statusFilter === 'all' ? true :
            statusFilter === 'approved' ? ['approved_warden', 'approved_hod', 'approved_staff', 'generated'].includes(req.status) :
                statusFilter === 'rejected' ? req.status === 'rejected' :
                    statusFilter === 'pending' ? req.status === 'pending' :
                        statusFilter === 'completed' ? req.status === 'completed' :
                            req.status === statusFilter; // fallback

        const matchesType = typeFilter === 'all' ? true :
            req.type === typeFilter;

        return matchesSearch && matchesStatus && matchesType;
    }).sort((a, b) => {
        // Sort Priority: Active/Out > Approved > Pending > Others
        const priority = {
            'out': 4,
            'active': 4,
            'approved_warden': 3,
            'approved_hod': 3,
            'approved_staff': 3,
            'pending': 2,
            'generated': 1,
            'completed': 0,
            'rejected': 0,
            'cancelled': 0
        };
        const pA = priority[a.status] || 0;
        const pB = priority[b.status] || 0;
        if (pA !== pB) return pB - pA;
        return new Date(b.created_at) - new Date(a.created_at);
    });

    const getStatusStyle = (status) => {
        switch (status) {
            case 'approved_warden':
            case 'generated':
            case 'completed': return 'bg-emerald-50 text-emerald-600 border-emerald-100 ring-emerald-500/20';
            case 'rejected': return 'bg-red-50 text-red-600 border-red-100 ring-red-500/20';
            case 'cancelled': return 'bg-slate-100 text-slate-500 border-slate-200 ring-slate-500/20';
            case 'pending': return 'bg-amber-50 text-amber-600 border-amber-100 ring-amber-500/20';
            default: return 'bg-indigo-50 text-indigo-600 border-indigo-100 ring-indigo-500/20';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'approved_warden':
            case 'generated':
            case 'completed': return <CheckCircle className="w-3.5 h-3.5" />;
            case 'rejected': return <XCircle className="w-3.5 h-3.5" />;
            case 'cancelled': return <Ban className="w-3.5 h-3.5" />;
            default: return <Clock className="w-3.5 h-3.5" />;
        }
    };

    return (
        <div className="space-y-8 pb-12 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Request History</h1>
                    <p className="text-slate-500 font-medium mt-2">Track and manage your past applications.</p>
                </div>

                {/* Stats Summary (Optional Micro-dashboard) */}
                <div className="flex gap-4">
                    <div className="px-5 py-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total</p>
                        <p className="text-xl font-black text-slate-900 dark:text-white">{total}</p>
                    </div>
                </div>
            </div>

            {/* Advanced Toolbar */}
            <div className="bg-white dark:bg-slate-800 p-4 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4 md:space-y-0 md:flex items-center gap-4">
                {/* Search */}
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search by Reason or Ref ID..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-900 rounded-xl outline-none border-transparent focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium text-sm placeholder:text-slate-400 text-slate-900 dark:text-white"
                    />
                </div>

                {/* Filters */}
                <div className="flex overflow-x-auto pb-2 md:pb-0 gap-3 no-scrollbar">
                    <div className="relative min-w-[140px]">
                        <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="w-full pl-10 pr-8 py-3 bg-slate-50 dark:bg-slate-900 border-none rounded-xl text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 focus:ring-2 focus:ring-indigo-500 cursor-pointer appearance-none"
                        >
                            <option value="all">All Status</option>
                            <option value="pending">Pending</option>
                            <option value="approved">Approved</option>
                            <option value="rejected">Rejected</option>
                            <option value="completed">Completed</option>
                        </select>
                        <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                    </div>

                    <div className="relative min-w-[140px]">
                        <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
                        <select
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}
                            className="w-full pl-10 pr-8 py-3 bg-slate-50 dark:bg-slate-900 border-none rounded-xl text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 focus:ring-2 focus:ring-indigo-500 cursor-pointer appearance-none"
                        >
                            <option value="all">All Types</option>
                            <option value="Outing">Outing</option>
                            <option value="Home Visit">Home Visit</option>
                            <option value="Emergency">Emergency</option>
                            <option value="Permission">Permission</option>
                        </select>
                        <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden min-h-[400px]">
                {loading ? (
                    <div className="p-12 space-y-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-20 bg-slate-50 dark:bg-slate-700/30 rounded-2xl animate-pulse" />
                        ))}
                    </div>
                ) : filteredRequests.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 text-center px-6">
                        <div className="w-20 h-20 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center mb-6">
                            <FileText className="w-8 h-8 text-slate-300" />
                        </div>
                        <h3 className="text-xl font-black text-slate-900 dark:text-white">No Requests Found</h3>
                        <p className="text-slate-400 mt-2 max-w-sm mx-auto">
                            No records match your current search or filters. Try adjusting them.
                        </p>
                        <button
                            onClick={() => { setSearchTerm(''); setStatusFilter('all'); setTypeFilter('all'); }}
                            className="mt-6 px-6 py-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-slate-200 transition-colors"
                        >
                            Clear Filters
                        </button>
                    </div>
                ) : (
                    <>
                        {/* Desktop Table View */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50/50 dark:bg-slate-900/50 text-slate-400 font-bold uppercase tracking-widest text-[10px] border-b border-slate-100 dark:border-slate-700">
                                    <tr>
                                        <th className="px-8 py-5">Pass Type</th>
                                        <th className="px-6 py-5">Timeline (Out &rarr; In)</th>
                                        <th className="px-6 py-5">Status</th>
                                        <th className="px-6 py-5">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                    {filteredRequests.map((req) => (
                                        <tr key={req.id} className="group hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                                            <td className="px-8 py-5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs">
                                                        {req.type.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-900 dark:text-white text-sm">{req.type}</p>
                                                        <p className="text-[10px] font-mono text-slate-400">#{req.id.toString().padStart(4, '0')}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex flex-col gap-1.5">
                                                    <div className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                        {new Date(req.departure_date).toLocaleDateString()}
                                                        <span className="text-slate-400">{new Date(req.departure_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                    </div>
                                                    <div className="h-3 w-[1px] bg-slate-200 dark:bg-slate-700 ml-0.5" />
                                                    <div className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                                        {new Date(req.return_date).toLocaleDateString()}
                                                        <span className="text-slate-400">{new Date(req.return_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border ring-1 ${getStatusStyle(req.status)}`}>
                                                    {getStatusIcon(req.status)}
                                                    {req.status.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td className="px-6 py-5">
                                                <button
                                                    onClick={() => { setSelectedRequest(req); setShowModal(true); }}
                                                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                    title="View Details"
                                                >
                                                    <Eye className="w-5 h-5" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Card View */}
                        <div className="md:hidden p-4 space-y-4 bg-slate-50/50 dark:bg-slate-900/50">
                            {filteredRequests.map((req) => (
                                <div key={req.id} className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2.5 bg-slate-50 dark:bg-slate-700 rounded-xl">
                                                <FileText className="w-5 h-5 text-indigo-500" />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-slate-900 dark:text-white">{req.type}</h4>
                                                <p className="text-[10px] font-mono text-slate-400">REF #{req.id.toString().padStart(4, '0')}</p>
                                            </div>
                                        </div>
                                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${getStatusStyle(req.status)}`}>
                                            {req.status.replace('_', ' ')}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 mb-4">
                                        <div className="p-3 bg-slate-50 dark:bg-slate-700/30 rounded-xl">
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Out</p>
                                            <p className="font-bold text-slate-700 dark:text-slate-300 text-xs">
                                                {new Date(req.departure_date).toLocaleDateString()}
                                            </p>
                                            <p className="text-[10px] text-slate-500">{new Date(req.departure_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                        </div>
                                        <div className="p-3 bg-slate-50 dark:bg-slate-700/30 rounded-xl">
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">In</p>
                                            <p className="font-bold text-slate-700 dark:text-slate-300 text-xs">
                                                {new Date(req.return_date).toLocaleDateString()}
                                            </p>
                                            <p className="text-[10px] text-slate-500">{new Date(req.return_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>

            {/* Pagination */}
            {!loading && pages > 1 && (
                <div className="flex items-center justify-between p-2">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                        Page {page} of {pages}
                    </p>
                    <div className="flex gap-2">
                        <button
                            disabled={page === 1}
                            onClick={() => setPage(p => p - 1)}
                            className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50"
                        >
                            <ArrowLeft className="w-4 h-4 text-slate-600" />
                        </button>
                        <button
                            disabled={page === pages}
                            onClick={() => setPage(p => p + 1)}
                            className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50"
                        >
                            <ArrowRight className="w-4 h-4 text-slate-600" />
                        </button>
                    </div>
                </div>
            )}


            <PassDetailsModal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                request={selectedRequest}
            />
        </div>
    );
};

export default History;
