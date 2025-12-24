import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Clock, CheckCircle, XCircle, Search,
    Filter, ArrowUpRight, Shield, User,
    Calendar, AlertCircle, Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const HODRequests = () => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedIds, setSelectedIds] = useState([]);
    const [filterStatus, setFilterStatus] = useState('all'); // all, pending, approved_staff

    useEffect(() => {
        fetchRequests();
    }, []);

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

    const handleSingleStatus = async (id, status) => {
        try {
            await axios.put(`/api/queue/${id}/status`, { status });
            fetchRequests();
        } catch (err) {
            console.error('Status sync failed');
        }
    };

    const handleBulkApprove = async () => {
        try {
            await axios.post('/api/hod/bulk-approve', { requestIds: selectedIds });
            setSelectedIds([]);
            fetchRequests();
        } catch (err) {
            console.error('Bulk approval failed');
        }
    };

    const toggleSelect = (id) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const filteredRequests = (requests || []).filter(r => {
        const studentName = r.student_name || '';
        const matchesSearch = studentName.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesFilter = filterStatus === 'all' || r.status === filterStatus;
        return matchesSearch && matchesFilter;
    });

    return (
        <div className="space-y-8 pb-12">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="space-y-1">
                    <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight">Pass Approval Hub</h1>
                    <p className="text-gray-500 dark:text-slate-400 text-sm max-w-md font-medium uppercase tracking-tight">
                        Departmental mobility oversight and authorization center.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by student name..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-12 pr-6 py-3.5 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl text-xs font-black outline-none focus:border-blue-500 w-full lg:w-80 shadow-sm"
                        />
                    </div>
                </div>
            </div>

            {/* Bulk Actions Header */}
            <AnimatePresence>
                {selectedIds.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="bg-blue-600 p-4 rounded-3xl flex items-center justify-between text-white shadow-xl shadow-blue-500/30"
                    >
                        <div className="flex items-center gap-4 ml-4">
                            <Shield className="w-5 h-5" />
                            <p className="text-xs font-black uppercase tracking-widest">{selectedIds.length} Requests Selected</p>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setSelectedIds([])}
                                className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-[10px] font-black uppercase transition-all"
                            >
                                Clear
                            </button>
                            <button
                                onClick={handleBulkApprove}
                                className="px-6 py-2 bg-white text-blue-600 rounded-xl text-[10px] font-black uppercase shadow-lg hover:scale-105 transition-all"
                            >
                                Bulk Authorize
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Filter Tabs */}
            <div className="flex gap-2 p-1 bg-gray-100 dark:bg-slate-800/50 rounded-2xl w-fit">
                {['all', 'pending', 'approved_staff'].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setFilterStatus(tab)}
                        className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filterStatus === tab
                            ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-sm'
                            : 'text-gray-400 hover:text-gray-600'
                            }`}
                    >
                        {tab.replace('_', ' ')}
                    </button>
                ))}
            </div>

            {/* Request Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <AnimatePresence mode="popLayout">
                    {loading ? (
                        [1, 2, 3].map(i => (
                            <div key={i} className="h-64 bg-gray-100 dark:bg-slate-800 rounded-[2.5rem] animate-pulse" />
                        ))
                    ) : filteredRequests.length === 0 ? (
                        <motion.div
                            key="empty-state"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="col-span-full py-20 text-center bg-white dark:bg-slate-900 rounded-[2.5rem] border border-dashed border-gray-200 dark:border-slate-800"
                        >
                            <Clock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                            <p className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Queue Fully Synchronized</p>
                        </motion.div>
                    ) : (
                        filteredRequests.map((req) => (
                            <motion.div
                                key={req.id}
                                layout
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className={`group relative bg-white dark:bg-slate-900 rounded-[2.5rem] border transition-all duration-300 overflow-hidden ${selectedIds.includes(req.id)
                                    ? 'border-blue-500 ring-4 ring-blue-500/10'
                                    : 'border-gray-100 dark:border-slate-800 shadow-xl'
                                    }`}
                            >
                                {/* Selection Overlay */}
                                <button
                                    onClick={() => toggleSelect(req.id)}
                                    className="absolute top-6 left-6 z-10 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all"
                                    style={{
                                        borderColor: selectedIds.includes(req.id) ? '#3b82f6' : '#E2E8F0',
                                        backgroundColor: selectedIds.includes(req.id) ? '#3b82f6' : 'transparent'
                                    }}
                                >
                                    {selectedIds.includes(req.id) && <Check className="w-4 h-4 text-white" />}
                                </button>

                                <div className="p-8 pb-6">
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="flex items-center gap-4 ml-8">
                                            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 font-black text-xl">
                                                {req.student_name.charAt(0)}
                                            </div>
                                            <div>
                                                <h4 className="font-black text-gray-900 dark:text-white tracking-tight leading-none mb-1">{req.student_name}</h4>
                                                <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{req.year} STUDENT</p>
                                            </div>
                                        </div>
                                        <div className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${req.status === 'approved_staff' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                                            }`}>
                                            {req.status.replace('_', ' ')}
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="p-4 bg-gray-50 dark:bg-slate-800/50 rounded-2xl">
                                            <div className="flex items-center gap-2 mb-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                                <AlertCircle className="w-3 h-3" /> Mission Reason
                                            </div>
                                            <p className="text-xs font-bold text-gray-600 dark:text-slate-300 line-clamp-2">
                                                {req.reason}
                                            </p>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase">
                                                <Calendar className="w-3 h-3" /> {new Date(req.departure_date).toLocaleDateString()}
                                            </div>
                                            <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase justify-end">
                                                <Shield className="w-3 h-3 text-emerald-500" /> Score: {req.trust_score}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-4 bg-gray-50/50 dark:bg-slate-800/30 border-t border-gray-100 dark:border-slate-800 flex gap-2">
                                    <button
                                        onClick={() => handleSingleStatus(req.id, 'rejected')}
                                        className="flex-1 py-3 bg-white dark:bg-slate-900 text-red-500 border border-red-50 dark:border-red-900/10 rounded-2xl text-[10px] font-black uppercase hover:bg-red-50 transition-all border-none shadow-sm"
                                    >
                                        Reject
                                    </button>
                                    <button
                                        onClick={() => handleSingleStatus(req.id, 'approved_hod')}
                                        className="flex-[2] py-3 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase shadow-lg shadow-blue-500/20 hover:scale-105 transition-all"
                                    >
                                        Authorize Pass
                                    </button>
                                </div>
                            </motion.div>
                        ))
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default HODRequests;
