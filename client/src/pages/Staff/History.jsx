import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Search, Download, Calendar, ArrowUpRight, ArrowDownLeft } from 'lucide-react';

const StaffHistory = () => {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');

    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        try {
            const res = await axios.get('/api/staff/history');
            setHistory(res.data);
            setLoading(false);
        } catch (err) {
            console.error(err);
        }
    };

    const handleExport = () => {
        // Implement export logic similar to MyStudents
        alert("Exporting history...");
    };

    const filteredHistory = history.filter(h =>
        h.student_name.toLowerCase().includes(filter.toLowerCase()) ||
        h.type.toLowerCase().includes(filter.toLowerCase())
    );

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Approval History</h1>
                    <p className="text-gray-500 dark:text-slate-400">Record of all requests processed by your department</p>
                </div>
                <div className="flex gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search history..."
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            className="pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                        />
                    </div>
                    <button
                        onClick={handleExport}
                        className="px-4 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 rounded-xl font-medium shadow-sm hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-2"
                    >
                        <Download className="w-4 h-4" /> Export
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/20">
                                <th className="p-4 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase">Student</th>
                                <th className="p-4 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase">Type</th>
                                <th className="p-4 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase">Departure</th>
                                <th className="p-4 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase">Status</th>
                                <th className="p-4 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase">Last Updated</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="5" className="p-8 text-center text-gray-500">Loading history...</td></tr>
                            ) : filteredHistory.length === 0 ? (
                                <tr><td colSpan="5" className="p-8 text-center text-gray-500">No records found</td></tr>
                            ) : (
                                filteredHistory.map((item) => (
                                    <tr key={item.id} className="border-b border-gray-50 dark:border-slate-800/50 hover:bg-gray-50 dark:hover:bg-slate-800/20 transition-colors">
                                        <td className="p-4">
                                            <div>
                                                <p className="font-bold text-gray-900 dark:text-white">{item.student_name}</p>
                                                <p className="text-xs text-gray-500 dark:text-slate-500">Year {item.year}</p>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded-lg text-xs font-bold uppercase ${item.type === 'emergency' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'
                                                }`}>
                                                {item.type}
                                            </span>
                                        </td>
                                        <td className="p-4 text-sm text-gray-600 dark:text-slate-300">
                                            {new Date(item.departure_date).toLocaleDateString()}
                                            <span className="block text-xs text-gray-400">{new Date(item.departure_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded-lg text-xs font-bold capitalize ${item.status.includes('approved') ? 'bg-green-100 text-green-700' :
                                                    item.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                                        'bg-yellow-100 text-yellow-700'
                                                }`}>
                                                {item.status.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td className="p-4 text-sm text-gray-500 dark:text-slate-400">
                                            {new Date(item.updated_at).toLocaleString()}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default StaffHistory;
