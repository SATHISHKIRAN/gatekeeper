import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import {
    Clock, AlertTriangle, CheckCircle, Search, RefreshCcw, User, Phone, MapPin,
    Calendar, Filter, LogIn, LogOut, CheckSquare, Square, Download, X, History,
    Shield, MoreVertical, Flag
} from 'lucide-react';

const GateLiveMonitor = () => {
    const [activeTab, setActiveTab] = useState('out'); // out, overdue, ready
    const [data, setData] = useState({ out: [], overdue: [], ready: [], stats: {} });
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDepartment, setSelectedDepartment] = useState('All');

    // Advanced Features State
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [isBulkProcessing, setIsBulkProcessing] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState(null); // For Modal
    const [processingId, setProcessingId] = useState(null); // Single action loading

    useEffect(() => {
        fetchLiveData(true);
        const interval = setInterval(() => fetchLiveData(false), 10000);
        return () => clearInterval(interval);
    }, []);

    const fetchLiveData = async (showLoading = false) => {
        try {
            if (showLoading) setLoading(true);
            const res = await axios.get('/api/gate/live');
            setData(res.data);
            if (showLoading) setLoading(false);
        } catch (err) {
            console.error("Error fetching live data", err);
            if (showLoading) setLoading(false);
        }
    };

    // --- BULK ACTIONS ---
    const toggleSelect = (id) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };

    const toggleSelectAll = () => {
        const list = filteredList.map(i => i.id);
        if (list.length > 0 && list.every(id => selectedIds.has(id))) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(list));
        }
    };

    const handleBulkAction = async (action) => {
        if (!window.confirm(`Mark ${action.toUpperCase()} for ${selectedIds.size} students?`)) return;

        setIsBulkProcessing(true);
        let successCount = 0;

        try {
            const promises = Array.from(selectedIds).map(id =>
                axios.post('/api/gate/log-action', {
                    requestId: id,
                    action: action,
                    comments: `Bulk ${action} via Monitor`
                }).then(() => successCount++)
                    .catch(e => console.error(e))
            );

            await Promise.all(promises);

            toast.success(`Successfully processed ${successCount} students`);
            setSelectedIds(new Set());
            fetchLiveData(false);
        } catch (err) {
            toast.error("Bulk action finished with errors");
        } finally {
            setIsBulkProcessing(false);
        }
    };

    const handleSingleAction = async (e, student, action) => {
        e.stopPropagation(); // Prevent modal open
        if (!window.confirm(`Mark ${action.toUpperCase()} for ${student.student_name}?`)) return;

        try {
            setProcessingId(student.id);
            await axios.post('/api/gate/log-action', {
                requestId: student.id,
                action: action,
                comments: `Quick Action via Monitor`
            });
            toast.success(`Marked ${action}`);
            fetchLiveData(false);
        } catch (err) {
            toast.error("Failed to process action");
        } finally {
            setProcessingId(null);
        }
    };

    const handleExport = () => {
        const list = getCurrentList();
        if (list.length === 0) return toast.error("No data to export");

        const csvContent = "data:text/csv;charset=utf-8,"
            + "Name,Register Number,Department,Hostel,Phone,Status,Departure Time,Expected Return\n"
            + list.map(e => `${e.student_name},${e.register_number},${e.department_name},${e.hostel_name || 'Day Scholar'},${e.phone},${activeTab},${new Date(e.departure_date).toLocaleString()},${new Date(e.return_date).toLocaleString()}`).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `gate_monitor_${activeTab}_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // --- HELPERS ---
    const getCurrentList = () => {
        switch (activeTab) {
            case 'out': return data.out || [];
            case 'overdue': return data.overdue || [];
            case 'ready': return data.ready || [];
            default: return [];
        }
    };

    const getDepartments = () => {
        const list = getCurrentList();
        const depts = new Set(list.map(i => i.department_name));
        return ['All', ...Array.from(depts).filter(Boolean)];
    };

    const filteredList = getCurrentList().filter(item => {
        const matchesSearch = item.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.register_number.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesDept = selectedDepartment === 'All' || item.department_name === selectedDepartment;
        return matchesSearch && matchesDept;
    });

    const calculateTimeDisplay = (item) => {
        if (activeTab === 'ready') return `Since ${new Date(item.departure_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        const returnDate = new Date(item.return_date);
        const now = new Date();
        const diffMins = Math.floor((returnDate - now) / 60000);
        if (diffMins < 0) {
            const absMins = Math.abs(diffMins);
            return `Late ${Math.floor(absMins / 60)}h ${absMins % 60}m`;
        }
        return `In ${Math.floor(diffMins / 60)}h ${diffMins % 60}m`;
    };

    const TabButton = ({ id, label, count, icon: Icon, color }) => (
        <button
            onClick={() => { setActiveTab(id); setSelectedDepartment('All'); setSelectedIds(new Set()); }}
            className={`flex-1 flex items-center justify-center gap-2 py-4 border-b-[3px] transition-all ${activeTab === id
                ? `border-${color}-500 text-${color}-600 bg-${color}-50 dark:bg-${color}-900/10`
                : 'border-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-50 dark:hover:bg-slate-800'
                }`}
        >
            <Icon className="w-5 h-5" />
            <span className="font-bold text-sm hidden md:inline">{label}</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${activeTab === id ? `bg-${color}-200 text-${color}-800` : 'bg-gray-200 text-gray-600'
                }`}>
                {count || 0}
            </span>
        </button>
    );

    return (
        <div className="space-y-6 relative pb-20">
            {/* HEADER */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                        Gate Monitor
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    </h1>
                    <p className="text-sm text-gray-500">Live Traffic Control Center</p>
                </div>
                <div className="flex gap-2">
                    <div className="relative group">
                        <select
                            value={selectedDepartment}
                            onChange={(e) => setSelectedDepartment(e.target.value)}
                            className="appearance-none pl-3 pr-8 py-2.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
                        >
                            {getDepartments().map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                        <Filter className="w-4 h-4 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                    <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl hover:bg-gray-50 font-bold text-gray-600 text-sm transition">
                        <Download className="w-4 h-4" /> Export
                    </button>
                    <button onClick={() => fetchLiveData(true)} className="p-2.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl hover:bg-gray-50 transition">
                        <RefreshCcw className={`w-5 h-5 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* TABS */}
            <div className="bg-white dark:bg-slate-900 rounded-t-2xl border border-gray-200 dark:border-slate-800 flex overflow-hidden shadow-sm">
                <TabButton id="out" label="Outside Campus" count={data.stats?.out_count} icon={LogOut} color="amber" />
                <TabButton id="overdue" label="Overdue Alert" count={data.stats?.overdue_count} icon={AlertTriangle} color="red" />
                <TabButton id="ready" label="Ready to Leave" count={data.stats?.ready_count} icon={CheckCircle} color="emerald" />
            </div>

            {/* TABLE */}
            <div className="bg-white dark:bg-slate-900 rounded-b-2xl border-x border-b border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden min-h-[500px]">
                {/* Search */}
                <div className="p-4 border-b border-gray-100 dark:border-slate-800 bg-gray-50/50">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Filter by name, reg no, or status..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 rounded-xl bg-white dark:bg-slate-800 border-none ring-1 ring-gray-200 dark:ring-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm font-medium"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50 dark:bg-slate-800/50 border-b border-gray-100 dark:border-slate-800">
                            <tr>
                                <th className="p-4 w-14 text-center">
                                    <button onClick={toggleSelectAll} className="p-1 hover:bg-gray-200 dark:hover:bg-slate-700 rounded transition">
                                        {filteredList.length > 0 && filteredList.every(i => selectedIds.has(i.id)) ?
                                            <CheckSquare className="w-5 h-5 text-indigo-600" /> : <Square className="w-5 h-5 text-gray-400" />}
                                    </button>
                                </th>
                                <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Student</th>
                                <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider hidden md:table-cell">Contact</th>
                                <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Time Status</th>
                                <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
                            {loading && filteredList.length === 0 ? (
                                <tr><td colSpan="5" className="p-12 text-center"><div className="inline-block animate-spin w-8 h-8 border-2 border-indigo-600 rounded-full border-t-transparent"></div></td></tr>
                            ) : filteredList.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="p-16 text-center text-gray-400">
                                        <div className="flex flex-col items-center gap-2">
                                            <Search className="w-10 h-10 opacity-20" />
                                            <p className="font-medium">No records matching your filters</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredList.map(item => (
                                    <tr
                                        key={item.id}
                                        onClick={() => setSelectedStudent(item)}
                                        className={`group cursor-pointer border-b border-gray-50 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition ${selectedIds.has(item.id) ? 'bg-indigo-50 dark:bg-indigo-900/10' : ''}`}
                                    >
                                        <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                                            <button onClick={() => toggleSelect(item.id)} className="p-1 hover:bg-gray-200 dark:hover:bg-slate-700 rounded transition">
                                                {selectedIds.has(item.id) ?
                                                    <CheckSquare className="w-5 h-5 text-indigo-600" /> : <Square className="w-5 h-5 text-gray-300 group-hover:text-gray-400" />}
                                            </button>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${activeTab === 'overdue' ? 'bg-red-100 text-red-600' :
                                                    activeTab === 'out' ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'
                                                    }`}>
                                                    {item.student_name.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-gray-900 dark:text-white text-sm group-hover:text-indigo-600 transition-colors">{item.student_name}</p>
                                                    <p className="text-xs text-gray-500 font-mono">{item.register_number}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4 hidden md:table-cell">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-xs text-gray-600 dark:text-slate-400 flex items-center gap-1.5">
                                                    <MapPin className="w-3 h-3 text-gray-400" /> {item.hostel_name || 'Day Scholar'}
                                                </span>
                                                <span className="text-xs text-gray-500 flex items-center gap-1.5">
                                                    <Phone className="w-3 h-3 text-gray-400" /> {item.phone}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex flex-col items-start gap-1">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border ${activeTab === 'overdue' ? 'bg-red-50 text-red-600 border-red-100' :
                                                    activeTab === 'out' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                                        'bg-emerald-50 text-emerald-600 border-emerald-100'
                                                    }`}>
                                                    {calculateTimeDisplay(item)}
                                                </span>
                                                <span className="text-xs text-gray-400">
                                                    {activeTab === 'ready' ? 'Approved' : `Exp: ${new Date(item.return_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="p-4 text-right">
                                            {activeTab === 'ready' ? (
                                                <button
                                                    onClick={(e) => handleSingleAction(e, item, 'exit')}
                                                    disabled={processingId === item.id}
                                                    className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-600 text-gray-600 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ml-auto shadow-sm"
                                                >
                                                    {processingId === item.id ? '...' : <><LogOut className="w-3 h-3" /> Mark Exit</>}
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={(e) => handleSingleAction(e, item, 'entry')}
                                                    disabled={processingId === item.id}
                                                    className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:border-indigo-500 hover:bg-indigo-50 hover:text-indigo-600 text-gray-600 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ml-auto shadow-sm"
                                                >
                                                    {processingId === item.id ? '...' : <><LogIn className="w-3 h-3" /> Mark Return</>}
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* BULK ACTION BAR (Floating) */}
            <AnimatePresence>
                {selectedIds.size > 0 && (
                    <motion.div
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 100, opacity: 0 }}
                        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-6 py-4 rounded-full shadow-2xl flex items-center gap-6"
                    >
                        <span className="font-bold text-sm whitespace-nowrap">{selectedIds.size} Selected</span>
                        <div className="h-4 w-px bg-white/20 dark:bg-gray-200"></div>
                        <div className="flex gap-2">
                            {activeTab === 'ready' ? (
                                <button onClick={() => handleBulkAction('exit')} disabled={isBulkProcessing} className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full font-bold text-sm transition shadow-lg shadow-emerald-500/30 disabled:opacity-50 active:scale-95">
                                    {isBulkProcessing ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
                                    Mark DEPARTURE
                                </button>
                            ) : (
                                <button onClick={() => handleBulkAction('entry')} disabled={isBulkProcessing} className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full font-bold text-sm transition shadow-lg shadow-indigo-500/30 disabled:opacity-50 active:scale-95">
                                    {isBulkProcessing ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
                                    Mark RETURN
                                </button>
                            )}
                        </div>
                        <button onClick={() => setSelectedIds(new Set())} className="p-2 hover:bg-white/10 dark:hover:bg-gray-100 rounded-full transition"><X className="w-5 h-5" /></button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* PROFILE MODAL */}
            <AnimatePresence>
                {selectedStudent && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setSelectedStudent(null)}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="relative bg-white dark:bg-slate-900 rounded-3xl p-0 max-w-lg w-full shadow-2xl z-10 overflow-hidden"
                        >
                            {/* Modal Header */}
                            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-6 text-white text-center relative">
                                <button onClick={() => setSelectedStudent(null)} className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition text-white">
                                    <X className="w-5 h-5" />
                                </button>
                                <div className="w-24 h-24 bg-white rounded-full mx-auto mb-4 border-4 border-white/30 flex items-center justify-center text-3xl font-black text-indigo-600 shadow-xl">
                                    {selectedStudent.student_name.charAt(0)}
                                </div>
                                <h2 className="text-2xl font-black">{selectedStudent.student_name}</h2>
                                <p className="opacity-90 font-mono tracking-widest text-sm">{selectedStudent.register_number}</p>
                            </div>

                            {/* Modal Content */}
                            <div className="p-8 space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 bg-gray-50 dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700">
                                        <p className="text-xs text-gray-400 uppercase font-bold mb-1">Department</p>
                                        <p className="font-bold text-gray-900 dark:text-white">{selectedStudent.department_name}</p>
                                    </div>
                                    <div className="p-4 bg-gray-50 dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700">
                                        <p className="text-xs text-gray-400 uppercase font-bold mb-1">Hostel</p>
                                        <p className="font-bold text-gray-900 dark:text-white">{selectedStudent.hostel_name || 'Day Scholar'}</p>
                                    </div>
                                    <div className="p-4 bg-gray-50 dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700">
                                        <p className="text-xs text-gray-400 uppercase font-bold mb-1">Pass Type</p>
                                        <p className="font-bold text-gray-900 dark:text-white capitalize">{selectedStudent.type}</p>
                                    </div>
                                    <div className="p-4 bg-gray-50 dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700">
                                        <p className="text-xs text-gray-400 uppercase font-bold mb-1">Phone</p>
                                        <p className="font-bold text-gray-900 dark:text-white">{selectedStudent.phone}</p>
                                    </div>
                                </div>

                                <div className="bg-amber-50 dark:bg-amber-900/10 p-4 rounded-xl border border-amber-100 dark:border-amber-900/30 flex items-start gap-3">
                                    <Flag className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                                    <div>
                                        <h4 className="font-bold text-amber-800 dark:text-amber-400 text-sm">Gate Pass Timeline</h4>
                                        <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">
                                            Departed: {new Date(selectedStudent.departure_date).toLocaleString()}<br />
                                            Expected Return: {new Date(selectedStudent.return_date).toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                            </div>

                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};
export default GateLiveMonitor;
