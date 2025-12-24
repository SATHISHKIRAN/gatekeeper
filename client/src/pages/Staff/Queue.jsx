import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Check, X, User, MapPin, Calendar, Clock, AlertCircle, ShieldCheck, Square, CheckSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const StaffQueue = () => {
    const [queue, setQueue] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedIds, setSelectedIds] = useState([]);
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        fetchQueue();
        const interval = setInterval(fetchQueue, 5000); // Polling every 5s
        return () => clearInterval(interval);
    }, []);

    const fetchQueue = async () => {
        try {
            const res = await axios.get('/api/queue');
            setQueue(res.data);
            setLoading(false);
        } catch (err) {
            console.error(err);
        }
    };

    const handleAction = async (id, action) => {
        // Optimistic update
        setQueue(prev => prev.filter(req => req.id !== id));
        try {
            await axios.put(`/api/queue/${id}/status`, {
                status: action === 'approve' ? 'approved_staff' : 'rejected'
            });
        } catch (err) {
            console.error("Action failed", err);
            fetchQueue(); // Revert on failure
        }
    };

    const toggleSelection = (id) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const toggleAll = () => {
        if (selectedIds.length === queue.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(queue.map(req => req.id));
        }
    };

    const handleBulkAction = async (action) => {
        if (selectedIds.length === 0) return;
        setProcessing(true);
        try {
            await axios.post('/api/staff/bulk-approve', {
                requestIds: selectedIds,
                action
            });
            setSelectedIds([]);
            fetchQueue();
        } catch (err) {
            console.error("Bulk action failed", err);
        } finally {
            setProcessing(false);
        }
    };

    if (loading) return <div className="text-center py-10 dark:text-slate-400">Loading Queue...</div>;

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <div className="flex items-center gap-4 mb-1">
                        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Approval Queue</h2>
                    </div>
                    <p className="text-gray-500 dark:text-slate-400 text-sm">Faculty review board • {queue.length} Pending</p>
                </div>

                {selectedIds.length > 0 && (
                    <div className="flex items-center gap-3 bg-white dark:bg-slate-900 p-2 rounded-xl shadow-lg border border-gray-100 dark:border-slate-800 animate-in slide-in-from-top-2">
                        <span className="text-sm font-bold text-gray-700 dark:text-slate-300 px-2">{selectedIds.length} Selected</span>
                        <div className="h-6 w-px bg-gray-200 dark:bg-slate-700"></div>
                        <button
                            onClick={() => handleBulkAction('reject')}
                            disabled={processing}
                            className="px-3 py-1.5 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                        >
                            Reject All
                        </button>
                        <button
                            onClick={() => handleBulkAction('approve')}
                            disabled={processing}
                            className="px-3 py-1.5 text-xs font-bold text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors shadow-sm"
                        >
                            Approve All
                        </button>
                    </div>
                )}

                <div className="hidden md:block">
                    <button
                        onClick={toggleAll}
                        className="text-sm font-medium text-primary-600 hover:text-primary-700 flex items-center gap-2"
                    >
                        {selectedIds.length === queue.length && queue.length > 0 ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                        Select All
                    </button>
                </div>
            </div>

            {queue.length === 0 ? (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm p-16 text-center text-gray-500 border border-gray-100 dark:border-slate-800 flex flex-col items-center"
                >
                    <div className="w-20 h-20 bg-green-50 dark:bg-green-900/20 rounded-2xl flex items-center justify-center mb-6">
                        <ShieldCheck className="w-10 h-10 text-green-500" />
                    </div>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">All caught up!</p>
                    <p className="text-gray-500 dark:text-slate-500 mt-1">No student requests awaiting faculty approval.</p>
                </motion.div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <AnimatePresence mode="popLayout">
                        {queue.map((req) => (
                            <motion.div
                                key={req.id}
                                layout
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                                className={`bg-white dark:bg-slate-900 rounded-2xl shadow-sm overflow-hidden border transition-all duration-300 relative group ${selectedIds.includes(req.id)
                                    ? 'border-primary-500 ring-2 ring-primary-500/20'
                                    : 'border-gray-100 dark:border-slate-800 hover:shadow-xl'
                                    }`}
                            >
                                <div className="absolute top-4 right-4 z-10">
                                    <button
                                        onClick={() => toggleSelection(req.id)}
                                        className="text-gray-400 hover:text-primary-500 transition-colors"
                                    >
                                        {selectedIds.includes(req.id) ? (
                                            <CheckSquare className="w-6 h-6 text-primary-500" />
                                        ) : (
                                            <Square className="w-6 h-6" />
                                        )}
                                    </button>
                                </div>

                                <div className="p-6">
                                    <div className="flex justify-between items-start mb-6 pr-8">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 bg-gray-50 dark:bg-slate-800 rounded-xl flex items-center justify-center text-primary-600 dark:text-sky-400 font-bold border border-gray-100 dark:border-slate-700">
                                                {req.student_name?.charAt(0) || 'S'}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-gray-900 dark:text-slate-100 group-hover:text-primary-600 dark:group-hover:text-sky-400 transition-colors">{req.student_name}</h3>
                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                    <div className={`w-2 h-2 rounded-full ${req.trust_score < 70 ? 'bg-red-500' : 'bg-green-500'}`} />
                                                    <p className="text-[10px] text-gray-500 dark:text-slate-500 font-bold uppercase tracking-wider">TS: {req.trust_score}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className={`inline-block px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-widest mb-4 ${req.type === 'emergency'
                                        ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/30'
                                        : 'bg-primary-50 dark:bg-sky-900/20 text-primary-600 dark:text-sky-400 border border-primary-100 dark:border-sky-900/30'
                                        }`}>
                                        {req.type}
                                    </div>

                                    <div className="space-y-4">
                                        <div className="bg-gray-50 dark:bg-slate-800/50 p-4 rounded-xl border border-gray-100 dark:border-slate-800/50">
                                            <p className="text-xs text-gray-400 dark:text-slate-500 font-bold uppercase mb-2">Reason</p>
                                            <p className="text-sm text-gray-700 dark:text-slate-300 line-clamp-3 leading-relaxed">"{req.reason}"</p>
                                        </div>

                                        <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-slate-400 px-1">
                                            <div className="flex items-center gap-1.5">
                                                <Calendar className="w-3.5 h-3.5" />
                                                <span>{new Date(req.departure_date).toLocaleDateString()}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <Clock className="w-3.5 h-3.5" />
                                                <span>{new Date(req.departure_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex border-t border-gray-100 dark:border-slate-800">
                                    <button
                                        onClick={() => handleAction(req.id, 'reject')}
                                        className="flex-1 py-4 text-gray-500 dark:text-slate-400 font-bold hover:bg-red-50 dark:hover:bg-red-900/10 hover:text-red-600 dark:hover:text-red-400 transition-all flex items-center justify-center gap-2"
                                    >
                                        <X className="w-4 h-4" /> Reject
                                    </button>
                                    <div className="w-px bg-gray-100 dark:bg-slate-800"></div>
                                    <button
                                        onClick={() => handleAction(req.id, 'approve')}
                                        className="flex-1 py-4 text-primary-600 dark:text-sky-400 font-bold hover:bg-primary-50 dark:hover:bg-sky-900/10 transition-all flex items-center justify-center gap-2"
                                    >
                                        <Check className="w-4 h-4" /> Approve
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}
        </div>
    );
};

export default StaffQueue;
