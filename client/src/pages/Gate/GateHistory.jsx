import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    RefreshCcw,
    Search,
    Filter,
    Clock,
    Calendar,
    ArrowUpRight,
    ArrowDownLeft,
    Download,
    ArrowLeft,
    ArrowRight
} from 'lucide-react';
import { motion } from 'framer-motion';

const GateHistory = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('all'); // all, entry, exit
    const [page, setPage] = useState(1);
    const [pages, setPages] = useState(1);
    const [total, setTotal] = useState(0);

    // Stats
    const stats = {
        exits: logs.filter(l => l.action === 'exit').length,
        entries: logs.filter(l => l.action === 'entry').length,
    };

    useEffect(() => {
        fetchLogs(true);
        const interval = setInterval(() => fetchLogs(false), 5000); // 5s Auto-Refresh
        return () => clearInterval(interval);
    }, [page, searchTerm]);

    const fetchLogs = async (showLoading = false) => {
        try {
            if (showLoading) setLoading(true);
            const res = await axios.get(`/api/gate/history?page=${page}&limit=10&search=${searchTerm}`);
            setLogs(res.data.logs);
            setPages(res.data.pages);
            setTotal(res.data.total);
            if (showLoading) setLoading(false);
        } catch (err) {
            console.error(err);
            if (showLoading) setLoading(false);
        }
    };

    const getFilteredLogs = () => {
        return logs.filter(log => {
            const matchesType = filterType === 'all' || log.action === filterType;
            return matchesType;
        });
    };

    const filteredLogs = getFilteredLogs();

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Gate History</h1>
                        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs font-bold animate-pulse">
                            <span className="w-2 h-2 rounded-full bg-red-500"></span>
                            LIVE
                        </span>
                    </div>
                    <p className="text-gray-500 dark:text-slate-400">Total {total} movements logged</p>
                </div>
                <div className="flex gap-3">
                    <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 flex items-center gap-4 shadow-sm">
                        <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center text-amber-600 dark:text-amber-400">
                            <ArrowUpRight className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase">Exits</p>
                            <p className="text-xl font-black text-gray-900 dark:text-white">{stats.exits}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Controls */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by name or register number..."
                        value={searchTerm}
                        onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    />
                </div>
                <div className="flex gap-3">
                    <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        className="px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
                    >
                        <option value="all">All Movements</option>
                        <option value="exit">Exits Only</option>
                        <option value="entry">Entries Only</option>
                    </select>
                    <button
                        onClick={() => fetchLogs(true)}
                        className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                    >
                        <RefreshCcw className={`w-5 h-5 text-gray-600 dark:text-slate-300 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <button className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
                        <Download className="w-5 h-5 text-gray-600 dark:text-slate-300" />
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50/50 dark:bg-slate-800/50 border-b border-gray-100 dark:border-slate-800">
                            <tr>
                                <th className="p-5 font-bold text-gray-500 dark:text-slate-400 uppercase text-xs tracking-wider">Time</th>
                                <th className="p-5 font-bold text-gray-500 dark:text-slate-400 uppercase text-xs tracking-wider">Student</th>
                                <th className="p-5 font-bold text-gray-500 dark:text-slate-400 uppercase text-xs tracking-wider">Type</th>
                                <th className="p-5 font-bold text-gray-500 dark:text-slate-400 uppercase text-xs tracking-wider">Gatekeeper</th>
                                <th className="p-5 font-bold text-gray-500 dark:text-slate-400 uppercase text-xs tracking-wider">Comments</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
                            {loading && logs.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="p-10 text-center">
                                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                                    </td>
                                </tr>
                            ) : filteredLogs.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="p-10 text-center text-gray-400">No logs found matching your criteria.</td>
                                </tr>
                            ) : (
                                filteredLogs.map((log) => (
                                    <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition duration-150">
                                        <td className="p-5 whitespace-nowrap">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-gray-100 dark:bg-slate-800 rounded-lg text-gray-500">
                                                    <Clock className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-gray-900 dark:text-white">
                                                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                    <p className="text-xs text-gray-500">{new Date(log.timestamp).toLocaleDateString()}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-5">
                                            <div>
                                                <p className="font-bold text-gray-900 dark:text-white">{log.student_name}</p>
                                                <p className="text-xs text-indigo-500 font-mono mt-0.5">{log.register_number || 'N/A'}</p>
                                            </div>
                                        </td>
                                        <td className="p-5">
                                            <span className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${log.action === 'exit'
                                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 border border-amber-200 dark:border-amber-900/30'
                                                : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/30'
                                                }`}>
                                                {log.action}
                                            </span>
                                        </td>
                                        <td className="p-5 text-gray-500 dark:text-slate-400">
                                            {log.gatekeeper_name || 'System'}
                                        </td>
                                        <td className="p-5 text-gray-500 dark:text-slate-400 max-w-xs truncate">
                                            {log.comments || '-'}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                {pages > 1 && (
                    <div className="p-5 bg-gray-50/30 dark:bg-slate-800/20 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between">
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">
                            Page {page} of {pages}
                        </p>
                        <div className="flex gap-2">
                            <button
                                disabled={page === 1}
                                onClick={() => setPage(p => p - 1)}
                                className="p-2 rounded-xl border border-gray-200 dark:border-slate-800 disabled:opacity-30 hover:bg-white dark:hover:bg-slate-800 transition-colors"
                            >
                                <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-slate-400" />
                            </button>
                            <button
                                disabled={page === pages}
                                onClick={() => setPage(p => p + 1)}
                                className="p-2 rounded-xl border border-gray-200 dark:border-slate-800 disabled:opacity-30 hover:bg-white dark:hover:bg-slate-800 transition-colors"
                            >
                                <ArrowRight className="w-5 h-5 text-gray-600 dark:text-slate-400" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default GateHistory;
