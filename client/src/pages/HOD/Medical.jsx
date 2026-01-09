import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    ShieldAlert, Send, AlertTriangle, CheckCircle,
    Eye, Edit2, Trash2, X, Calendar, Clock,
    Search, Filter, ChevronRight, Activity, FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const HODMedical = () => {
    // Form State
    const [email, setEmail] = useState('');
    const [reason, setReason] = useState('');
    const [status, setStatus] = useState(null); // success | error | loading
    const [msg, setMsg] = useState('');

    // Table State
    const [overrides, setOverrides] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState('grid'); // grid | list (for responsive)

    // Modals State
    const [viewData, setViewData] = useState(null);
    const [editData, setEditData] = useState(null);
    const [deleteId, setDeleteId] = useState(null);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;

    useEffect(() => {
        fetchOverrides();
    }, []);

    const fetchOverrides = async () => {
        try {
            const res = await axios.get('/api/hod/medical-overrides');
            setOverrides(res.data);
        } catch (err) {
            console.error('Failed to fetch overrides');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setStatus('loading');
        try {
            await axios.post('/api/hod/medical-override', { studentEmail: email, reason });
            setStatus('success');
            setMsg('Emergency Pass Authorized. SMS Sent.');
            setEmail('');
            setReason('');
            fetchOverrides(); // Refresh table
            setTimeout(() => setStatus(null), 5000);
        } catch (err) {
            setStatus('error');
            setMsg(err.response?.data?.message || 'Authorization Failed');
        }
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        try {
            await axios.put(`/api/hod/medical-override/${editData.id}`, {
                reason: editData.reason,
                departure_date: editData.departure_date,
                return_date: editData.return_date
            });
            setEditData(null);
            fetchOverrides();
        } catch (err) {
            alert('Failed to update request');
        }
    };

    const handleDelete = async () => {
        try {
            await axios.delete(`/api/hod/medical-override/${deleteId}`);
            setDeleteId(null);
            fetchOverrides();
        } catch (err) {
            alert('Failed to delete request');
        }
    };

    // Filter Logic
    const filteredOverrides = overrides.filter(item =>
        item.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.register_number?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Pagination Logic
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredOverrides.slice(indexOfFirstItem, indexOfLastItem);

    return (
        <div className="min-h-screen pb-20 space-y-8 max-w-[1600px] mx-auto">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-1">
                <div className="flex items-center gap-5">
                    <div className="relative group">
                        <div className="absolute inset-0 bg-red-500 blur-xl opacity-20 group-hover:opacity-40 transition-opacity duration-500" />
                        <div className="relative p-4 bg-gradient-to-br from-white to-red-50 dark:from-slate-800 dark:to-red-900/30 rounded-2xl border border-red-100 dark:border-red-900/50 shadow-sm">
                            <ShieldAlert className="w-8 h-8 text-red-600 dark:text-red-400" />
                        </div>
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                            Medical Override
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 font-medium flex items-center gap-2 mt-1">
                            <Activity className="w-4 h-4 text-emerald-500" />
                            Critical Emergency Protocol Node
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
                {/* Authorization Panel - Fixed on Desktop */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="xl:col-span-4 sticky top-6"
                >
                    <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-[2rem] border border-white/20 dark:border-slate-800 shadow-xl overflow-hidden">
                        {/* Status Guard Header */}
                        <div className="p-6 bg-gradient-to-r from-red-50 to-white dark:from-red-900/20 dark:to-slate-900 border-b border-red-100 dark:border-red-900/30 flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                            <span className="text-xs font-bold uppercase tracking-widest text-red-600 dark:text-red-400">
                                Override Protocol Active
                            </span>
                        </div>

                        <div className="p-6 md:p-8 space-y-8">
                            {/* Alert Box */}
                            <div className="bg-red-50 dark:bg-red-950/30 rounded-2xl p-4 border border-red-100 dark:border-red-900/30 flex gap-4">
                                <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-500 shrink-0 mt-0.5" />
                                <div>
                                    <h3 className="font-bold text-red-900 dark:text-red-400 text-sm">Emergency Authorization</h3>
                                    <p className="text-red-700 dark:text-red-500/80 text-xs mt-1 leading-relaxed">
                                        This process bypasses standard warden approvals. An immediate exit pass will be generated. Use with discretion.
                                    </p>
                                </div>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">
                                        Student Identity
                                    </label>
                                    <div className="relative group">
                                        <div className="absolute inset-0 bg-red-500/5 dark:bg-red-500/10 rounded-xl opacity-0 group-focus-within:opacity-100 transition-opacity" />
                                        <input
                                            type="email"
                                            placeholder="student@university.edu"
                                            className="w-full bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3.5 text-sm dark:text-white outline-none focus:border-red-500 dark:focus:border-red-500 transition-colors relative z-10"
                                            required
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">
                                        Medical Context
                                    </label>
                                    <textarea
                                        placeholder="Describe the nature of the emergency..."
                                        className="w-full bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3.5 text-sm dark:text-white outline-none focus:border-red-500 dark:focus:border-red-500 transition-colors min-h-[120px] resize-none"
                                        rows="4"
                                        required
                                        value={reason}
                                        onChange={(e) => setReason(e.target.value)}
                                    />
                                </div>

                                <AnimatePresence mode="wait">
                                    {status && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className={`rounded-xl overflow-hidden`}
                                        >
                                            <div className={`p-4 flex items-center gap-3 text-sm font-bold border-l-4 ${status === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-500' :
                                                status === 'error' ? 'bg-red-50 text-red-700 border-red-500' : 'bg-blue-50 text-blue-700 border-blue-500'
                                                }`}>
                                                {status === 'success' ? <CheckCircle className="w-5 h-5" /> :
                                                    status === 'error' ? <AlertTriangle className="w-5 h-5" /> :
                                                        <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />}
                                                {msg || 'Processing Request...'}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                <button
                                    type="submit"
                                    disabled={status === 'loading'}
                                    className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-red-500/20 hover:shadow-red-500/40 hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2 disabled:opacity-70 disabled:pointer-events-none"
                                >
                                    <ShieldAlert className="w-5 h-5" />
                                    <span>AUTHORIZE IMMEDIATE EXIT</span>
                                </button>
                            </form>
                        </div>
                    </div>
                </motion.div>

                {/* History Log */}
                <div className="xl:col-span-8 space-y-6">
                    {/* Toolbar */}
                    <div className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-md p-2 rounded-2xl border border-white/20 dark:border-slate-800 flex flex-col sm:flex-row gap-4 justify-between items-center sm:pl-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                                <Clock className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                            </div>
                            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                                History Log
                            </span>
                            <span className="bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                {overrides.length}
                            </span>
                        </div>

                        <div className="w-full sm:w-auto flex items-center gap-2">
                            <div className="relative flex-1 sm:flex-none">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search student..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-9 pr-4 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm w-full sm:w-64 focus:ring-2 focus:ring-slate-200 dark:focus:ring-slate-700 outline-none transition-all shadow-sm"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Glass Table */}
                    <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-[2rem] border border-white/20 dark:border-slate-800 shadow-xl overflow-hidden">
                        <div className="overflow-x-auto custom-scrollbar">
                            <table className="w-full text-left text-sm whitespace-nowrap">
                                <thead className="bg-slate-50/80 dark:bg-slate-950/50 backdrop-blur text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                                    <tr>
                                        <th className="px-6 py-5">Student Details</th>
                                        <th className="px-6 py-5">Context</th>
                                        <th className="px-6 py-5">Timestamp</th>
                                        <th className="px-6 py-5">Status</th>
                                        <th className="px-6 py-5 text-right">Controls</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {loading ? (
                                        <tr><td colSpan="5" className="px-6 py-20 text-center text-slate-400 animate-pulse">Syncing Secure Database...</td></tr>
                                    ) : currentItems.length === 0 ? (
                                        <tr><td colSpan="5" className="px-6 py-20 text-center text-slate-400">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800/50 rounded-full flex items-center justify-center">
                                                    <FileText className="w-6 h-6 text-slate-400" />
                                                </div>
                                                <p>No emergency records found</p>
                                            </div>
                                        </td></tr>
                                    ) : (
                                        currentItems.map((item) => (
                                            <tr key={item.id} className="group hover:bg-red-50/50 dark:hover:bg-red-900/10 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-500">
                                                            {item.student_name.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-slate-900 dark:text-white">{item.student_name}</div>
                                                            <div className="text-xs font-mono text-slate-400">{item.register_number}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 max-w-[200px]">
                                                    <p className="truncate text-slate-600 dark:text-slate-300 font-medium">{item.reason}</p>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col">
                                                        <span className="font-semibold text-slate-700 dark:text-slate-200">
                                                            {new Date(item.created_at).toLocaleDateString()}
                                                        </span>
                                                        <span className="text-xs text-slate-400">
                                                            {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${item.status === 'cancelled'
                                                        ? 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                                                        : 'bg-emerald-100/50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800'
                                                        }`}>
                                                        <div className={`w-1.5 h-1.5 rounded-full ${item.status === 'cancelled' ? 'bg-slate-400' : 'bg-emerald-500'}`} />
                                                        {item.status === 'cancelled' ? 'Revoked' : 'Active'}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <button onClick={() => setViewData(item)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors" title="View Details">
                                                            <Eye className="w-4 h-4" />
                                                        </button>
                                                        <button onClick={() => setEditData(item)} className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/30 rounded-lg transition-colors" title="Edit Context">
                                                            <Edit2 className="w-4 h-4" />
                                                        </button>
                                                        <button onClick={() => setDeleteId(item.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors" title="Revoke Pass">
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                        {/* Pagination Controls */}
                        {filteredOverrides.length > itemsPerPage && (
                            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 flex items-center justify-between">
                                <span className="text-xs font-medium text-slate-500">
                                    Showing {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredOverrides.length)} of {filteredOverrides.length}
                                </span>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                        disabled={currentPage === 1}
                                        className="px-3 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        Previous
                                    </button>
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(filteredOverrides.length / itemsPerPage)))}
                                        disabled={currentPage === Math.ceil(filteredOverrides.length / itemsPerPage)}
                                        className="px-3 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* --- Modals with Glass Effect --- */}

            {/* View Modal */}
            <AnimatePresence>
                {viewData && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white dark:bg-slate-900 rounded-[2rem] w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-800 shadow-2xl">
                            <div className="h-32 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 relative">
                                <div className="absolute top-4 right-4">
                                    <button onClick={() => setViewData(null)} className="p-2 bg-black/10 hover:bg-black/20 dark:bg-white/10 dark:hover:bg-white/20 text-slate-600 dark:text-slate-300 rounded-full transition-colors"><X className="w-5 h-5" /></button>
                                </div>
                                <div className="absolute -bottom-8 left-8 flex items-end gap-4">
                                    <div className="w-20 h-20 bg-white dark:bg-slate-900 rounded-3xl p-1 shadow-lg">
                                        <div className="w-full h-full bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-2xl font-bold text-slate-500 dark:text-slate-400">
                                            {viewData.student_name.charAt(0)}
                                        </div>
                                    </div>
                                    <div className="mb-3">
                                        <h3 className="text-xl font-bold text-slate-900 dark:text-white drop-shadow-sm">{viewData.student_name}</h3>
                                        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">{viewData.student_email}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="pt-12 p-8 space-y-6">
                                <div className="bg-red-50 dark:bg-red-950/20 p-5 rounded-2xl border border-red-100 dark:border-red-900/30">
                                    <label className="text-xs font-bold text-red-500 uppercase tracking-wider mb-2 block">Authorization Context</label>
                                    <p className="text-slate-700 dark:text-slate-300 font-medium leading-relaxed">{viewData.reason}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                                        <label className="text-xs font-bold text-slate-400 uppercase">Departure</label>
                                        <div className="flex items-center gap-2 mt-1 text-sm font-bold text-slate-700 dark:text-white">
                                            <Calendar className="w-4 h-4 text-emerald-500" />
                                            {new Date(viewData.departure_date).toLocaleString()}
                                        </div>
                                    </div>
                                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                                        <label className="text-xs font-bold text-slate-400 uppercase">Expected Return</label>
                                        <div className="flex items-center gap-2 mt-1 text-sm font-bold text-slate-700 dark:text-white">
                                            <Clock className="w-4 h-4 text-blue-500" />
                                            {new Date(viewData.return_date).toLocaleString()}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Edit Modal */}
            <AnimatePresence>
                {editData && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white dark:bg-slate-900 rounded-[2rem] w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-800 shadow-2xl">
                            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <Edit2 className="w-5 h-5 text-amber-500" />
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Edit Record</h3>
                                </div>
                                <button onClick={() => setEditData(null)}><X className="w-5 h-5 text-slate-400 hover:text-slate-600" /></button>
                            </div>
                            <form onSubmit={handleUpdate} className="p-8 space-y-6">
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Reason for Override</label>
                                    <textarea
                                        value={editData.reason}
                                        onChange={e => setEditData({ ...editData, reason: e.target.value })}
                                        className="w-full mt-2 p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 outline-none dark:text-white"
                                        rows="3"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Departure Adjust</label>
                                    <input
                                        type="datetime-local"
                                        value={new Date(editData.departure_date).toISOString().slice(0, 16)}
                                        onChange={e => setEditData({ ...editData, departure_date: e.target.value })}
                                        className="w-full mt-2 p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm outline-none dark:text-white"
                                    />
                                </div>
                                <div className="flex gap-3 pt-4">
                                    <button type="button" onClick={() => setEditData(null)} className="flex-1 py-3.5 text-slate-500 font-bold hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl transition-colors">Cancel</button>
                                    <button type="submit" className="flex-1 py-3.5 bg-amber-500 text-white font-bold rounded-xl hover:bg-amber-600 shadow-lg shadow-amber-500/20 transition-all">Save Changes</button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Delete Confirmation Modal */}
            <AnimatePresence>
                {deleteId && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white dark:bg-slate-900 rounded-[2rem] w-full max-w-md overflow-hidden p-8 text-center shadow-2xl border border-white/10">
                            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                                <Trash2 className="w-8 h-8 text-red-600" />
                            </div>
                            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">Revoke Pass?</h3>
                            <p className="text-slate-500 dark:text-slate-400 leading-relaxed mb-8">
                                This action is irreversible. The student's digital exit pass will be cancelled immediately and they will be notified via SMS.
                            </p>
                            <div className="flex gap-4">
                                <button onClick={() => setDeleteId(null)} className="flex-1 py-3.5 text-slate-500 dark:text-slate-300 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors">Abort</button>
                                <button onClick={handleDelete} className="flex-1 py-3.5 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 shadow-xl shadow-red-600/30 transition-all hover:scale-[1.02]">Confirm Revocation</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default HODMedical;
