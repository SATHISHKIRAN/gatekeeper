import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Activity, Clock, CheckCircle, AlertTriangle, Search, Filter,
    Calendar, ArrowRight, ArrowLeft, MoreVertical, MapPin, User
} from 'lucide-react';

const StatCard = ({ title, value, icon: Icon, color, subtext }) => (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="flex items-center justify-between">
            <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
                <h3 className="text-3xl font-bold text-slate-900 dark:text-white mt-2">{value}</h3>
                {subtext && <p className="text-xs text-slate-500 mt-1">{subtext}</p>}
            </div>
            <div className={`p-3 rounded-lg ${color} bg-opacity-10 dark:bg-opacity-20`}>
                <Icon className={`w-6 h-6 ${color.replace('bg-', 'text-')}`} />
            </div>
        </div>
    </div>
);

const GatePasses = () => {
    const [activeTab, setActiveTab] = useState('live');
    const [subTab, setSubTab] = useState('ready'); // ready, out, overdue
    const [loading, setLoading] = useState(true);
    const [liveData, setLiveData] = useState({ ready: [], out: [], overdue: [], stats: {} });
    const [history, setHistory] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchLiveData();
    }, []);

    const fetchLiveData = async () => {
        try {
            const res = await axios.get('/api/gate/live', {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            setLiveData(res.data);
            setLoading(false);
        } catch (err) {
            console.error(err);
            setLoading(false);
        }
    };

    const fetchHistory = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/gate/history', {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            setHistory(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'history') {
            fetchHistory();
        } else {
            fetchLiveData(); // Refresh live data when switching back
            const interval = setInterval(fetchLiveData, 30000); // Poll every 30s
            return () => clearInterval(interval);
        }
    }, [activeTab]);

    const getListBySubTab = () => {
        if (subTab === 'ready') return liveData.ready;
        if (subTab === 'out') return liveData.out;
        if (subTab === 'overdue') return liveData.overdue;
        return [];
    };

    const filteredList = getListBySubTab().filter(item =>
        item.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.register_number.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredHistory = history.filter(item =>
        item.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.register_number.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const formatDate = (date) => new Date(date).toLocaleString('en-US', {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    return (
        <div className="space-y-6 pb-20">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Gate Management</h1>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Real-time monitoring of student movement</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setActiveTab('live')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'live' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'}`}
                    >
                        Live Dashboard
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'history' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'}`}
                    >
                        History Log
                    </button>
                </div>
            </div>

            {/* Live Dashboard Content */}
            {activeTab === 'live' && (
                <>
                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <StatCard
                            title="Ready for Exit"
                            value={liveData.stats.ready_count || 0}
                            icon={CheckCircle}
                            color="bg-emerald-500"
                            subtext="Approved & waiting"
                        />
                        <StatCard
                            title="Currently Out"
                            value={liveData.stats.out_count || 0}
                            icon={Activity}
                            color="bg-amber-500"
                            subtext="Off-campus"
                        />
                        <StatCard
                            title="Overdue Returns"
                            value={liveData.stats.overdue_count || 0}
                            icon={AlertTriangle}
                            color="bg-rose-500"
                            subtext="Late students"
                        />
                    </div>

                    {/* Sub-tabs & Search */}
                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row justify-between gap-4">
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setSubTab('ready')}
                                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${subTab === 'ready' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                                >
                                    Ready ({liveData.stats.ready_count || 0})
                                </button>
                                <button
                                    onClick={() => setSubTab('out')}
                                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${subTab === 'out' ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                                >
                                    Out ({liveData.stats.out_count || 0})
                                </button>
                                <button
                                    onClick={() => setSubTab('overdue')}
                                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${subTab === 'overdue' ? 'bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                                >
                                    Overdue ({liveData.stats.overdue_count || 0})
                                </button>
                            </div>
                            <div className="relative w-full sm:w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search student..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-transparent focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none dark:text-white"
                                />
                            </div>
                        </div>

                        {/* Live List Table */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                                    <tr>
                                        <th className="px-6 py-4 text-left font-medium text-slate-600 dark:text-slate-400">Student</th>
                                        <th className="px-6 py-4 text-left font-medium text-slate-600 dark:text-slate-400">Department</th>
                                        <th className="px-6 py-4 text-left font-medium text-slate-600 dark:text-slate-400">Type</th>
                                        <th className="px-6 py-4 text-left font-medium text-slate-600 dark:text-slate-400">
                                            {subTab === 'ready' ? 'Departure Planned' : 'Expected Return'}
                                        </th>
                                        {subTab === 'overdue' && (
                                            <th className="px-6 py-4 text-left font-medium text-slate-600 dark:text-slate-400">Late By</th>
                                        )}
                                        <th className="px-6 py-4 text-left font-medium text-slate-600 dark:text-slate-400">Contact</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                    {filteredList.length === 0 ? (
                                        <tr>
                                            <td colSpan="6" className="px-6 py-12 text-center text-slate-500">
                                                No students found in this category
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredList.map(item => (
                                            <tr key={item.id} className="group hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div>
                                                        <p className="font-semibold text-slate-900 dark:text-white">{item.student_name}</p>
                                                        <p className="text-xs text-slate-500">{item.register_number}</p>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                                                    {item.department_name}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-1 rounded text-xs font-medium ${item.type === 'Emergency' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'}`}>
                                                        {item.type}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                                                    {subTab === 'ready' ? formatDate(item.departure_date) : formatDate(item.return_date)}
                                                </td>
                                                {subTab === 'overdue' && (
                                                    <td className="px-6 py-4 text-rose-600 font-medium">
                                                        {item.overdue_by_minutes > 60
                                                            ? `${Math.floor(item.overdue_by_minutes / 60)}h ${item.overdue_by_minutes % 60}m`
                                                            : `${item.overdue_by_minutes}m`}
                                                    </td>
                                                )}
                                                <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                                                    {item.phone || 'N/A'}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {/* History Table */}
            {activeTab === 'history' && (
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between gap-4">
                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search history..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-transparent focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none dark:text-white"
                            />
                        </div>
                        {/* Filter placeholders can go here */}
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                                <tr>
                                    <th className="px-6 py-4 text-left font-medium text-slate-600 dark:text-slate-400">Student</th>
                                    <th className="px-6 py-4 text-left font-medium text-slate-600 dark:text-slate-400">Type</th>
                                    <th className="px-6 py-4 text-left font-medium text-slate-600 dark:text-slate-400">Actual Exit</th>
                                    <th className="px-6 py-4 text-left font-medium text-slate-600 dark:text-slate-400">Actual Entry</th>
                                    <th className="px-6 py-4 text-left font-medium text-slate-600 dark:text-slate-400">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                {filteredHistory.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-12 text-center text-slate-500">
                                            No history found
                                        </td>
                                    </tr>
                                ) : (
                                    filteredHistory.map(item => (
                                        <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                                            <td className="px-6 py-4">
                                                <div>
                                                    <p className="font-semibold text-slate-900 dark:text-white">{item.student_name}</p>
                                                    <p className="text-xs text-slate-500">{item.register_number}</p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{item.type}</td>
                                            <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                                                {item.actual_exit ? formatDate(item.actual_exit) : '-'}
                                            </td>
                                            <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                                                {item.actual_entry ? formatDate(item.actual_entry) : '-'}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${item.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                                                    item.status === 'rejected' ? 'bg-rose-100 text-rose-700' :
                                                        'bg-slate-100 text-slate-700'
                                                    }`}>
                                                    {item.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GatePasses;
