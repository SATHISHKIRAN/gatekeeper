import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search, User, Mail, Hash, Shield, Award,
    ArrowUpRight, Filter, Download, MoreVertical,
    UserCheck, Clock, AlertTriangle, Zap, CheckCircle,
    AlertCircle, Briefcase, Timer, ChevronRight, X,
    Calendar, MapPin, Activity, FileText
} from 'lucide-react';
import Modal from '../../components/Modal';

const HODStudents = () => {
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filter, setFilter] = useState('all'); // all, blocked, authorized

    const [profilerData, setProfilerData] = useState(null);
    const [isProfilerLoading, setIsProfilerLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('overview'); // overview, history, stats

    useEffect(() => {
        fetchStudents();
    }, []);

    const fetchStudents = async () => {
        try {
            const res = await axios.get('/api/hod/users?role=student');
            setStudents(res.data);
        } catch (err) {
            console.error('Failed to fetch students');
        } finally {
            setLoading(false);
        }
    };

    const fetchProfiler = async (id) => {
        setIsProfilerLoading(true);
        setActiveTab('overview');
        try {
            const res = await axios.get(`/api/hod/student-profile/${id}`);
            setProfilerData(res.data);
        } catch (err) {
            console.error('Failed to sync student intelligence');
        } finally {
            setIsProfilerLoading(false);
        }
    };

    const filteredStudents = students.filter(s => {
        const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.register_number.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesFilter = filter === 'all'
            ? true
            : filter === 'blocked' ? s.pass_blocked
                : !s.pass_blocked;
        return matchesSearch && matchesFilter;
    });

    const getTrustColor = (score) => {
        if (score >= 80) return 'text-emerald-600 bg-emerald-50 border-emerald-100';
        if (score >= 50) return 'text-blue-600 bg-blue-50 border-blue-100';
        return 'text-red-600 bg-red-50 border-red-100';
    };

    return (
        <div className="space-y-6">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Student Roster</h1>
                    <p className="text-slate-500 text-sm mt-1">Manage departmental students and view detailed mobility analytics.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search students..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full md:w-64"
                        />
                    </div>
                </div>
            </div>

            {/* Quick Stats/Filters (Optional - can be tabs) */}
            <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700 pb-1">
                {['all', 'authorized', 'blocked'].map((f) => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors capitalize ${filter === f
                            ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/10'
                            : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                            }`}
                    >
                        {f}
                    </button>
                ))}
            </div>

            {/* Clean Table */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-500 border-b border-slate-200 dark:border-slate-700 font-medium">
                            <tr>
                                <th className="px-6 py-4">Student Name</th>
                                <th className="px-6 py-4">Register No.</th>
                                <th className="px-6 py-4">Trust Score</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {loading ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-slate-500">
                                        Loading roster data...
                                    </td>
                                </tr>
                            ) : filteredStudents.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-slate-500">
                                        No students found matching your criteria.
                                    </td>
                                </tr>
                            ) : (
                                filteredStudents.map((student) => (
                                    <tr
                                        key={student.id}
                                        className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors group cursor-pointer"
                                        onClick={() => fetchProfiler(student.id)}
                                    >
                                        <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                                            {student.name}
                                            <div className="text-xs text-slate-400 font-normal mt-0.5">{student.email}</div>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 dark:text-slate-300 font-mono">
                                            {student.register_number}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${getTrustColor(student.trust_score)}`}>
                                                {student.trust_score}%
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {student.pass_blocked ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                                                    <Shield className="w-3.5 h-3.5" />
                                                    Blocked
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                                                    <CheckCircle className="w-3.5 h-3.5" />
                                                    Active
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                                                title="View Profile"
                                            >
                                                <ArrowUpRight className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Advanced Student Profiler Modal */}
            <Modal
                isOpen={!!profilerData}
                onClose={() => setProfilerData(null)}
                maxWidth="max-w-4xl"
                showPadding={false}
            >
                {profilerData && (
                    <div className="flex flex-col h-[700px]">
                        {/* Profile Header */}
                        <div className="bg-white dark:bg-slate-900 p-8 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between">
                            <div className="flex items-center gap-6">
                                <div className="w-20 h-20 rounded-2xl bg-indigo-600 text-white flex items-center justify-center text-3xl font-bold shadow-lg shadow-indigo-500/20">
                                    {profilerData.student.name.charAt(0)}
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{profilerData.student.name}</h2>
                                    <div className="flex items-center gap-3 mt-2 text-sm text-slate-500">
                                        <span className="font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-700 dark:text-slate-300">
                                            {profilerData.student.register_number}
                                        </span>
                                        <span>•</span>
                                        <span>Year {profilerData.student.year}</span>
                                        <span>•</span>
                                        <span className="lowercase">{profilerData.student.email}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-sm text-slate-400 uppercase tracking-wider font-semibold mb-1">Trust Score</p>
                                <span className={`text-4xl font-black ${profilerData.student.trust_score >= 80 ? 'text-emerald-500' :
                                    profilerData.student.trust_score >= 50 ? 'text-indigo-500' : 'text-red-500'
                                    }`}>
                                    {profilerData.student.trust_score}
                                </span>
                            </div>
                        </div>

                        {/* Navigation Tabs */}
                        <div className="flex border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 px-8">
                            {[
                                { id: 'overview', label: 'Overview', icon: User },
                                { id: 'history', label: 'History', icon: FileText },
                                { id: 'stats', label: 'Analytics', icon: Activity }
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id
                                        ? 'border-indigo-600 text-indigo-600'
                                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-200'
                                        }`}
                                >
                                    <tab.icon className="w-4 h-4" />
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* Modal Body Content */}
                        <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950/50 p-8">

                            {/* TAB: OVERVIEW */}
                            {activeTab === 'overview' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Trust Manager Card (New) */}
                                    <div className="md:col-span-2 bg-indigo-50 dark:bg-indigo-900/10 p-6 rounded-xl border border-indigo-100 dark:border-indigo-900/30 flex flex-col md:flex-row items-center gap-6">
                                        <div className="flex-1 w-full">
                                            <div className="flex justify-between items-center mb-2">
                                                <h4 className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Trust Index Adjustment</h4>
                                                <span className="text-sm font-black text-indigo-700 dark:text-indigo-300">{profilerData.student.trust_score}%</span>
                                            </div>
                                            <input
                                                type="range"
                                                min="0"
                                                max="100"
                                                value={profilerData.student.trust_score}
                                                onChange={(e) => setProfilerData(prev => ({ ...prev, student: { ...prev.student, trust_score: parseInt(e.target.value) } }))}
                                                className="w-full h-2 bg-indigo-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                            />
                                            <div className="flex justify-between text-[10px] text-gray-400 font-bold mt-1 uppercase tracking-wider">
                                                <span>Risk (0)</span>
                                                <span>Neutral (50)</span>
                                                <span>Trusted (100)</span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={async () => {
                                                try {
                                                    await axios.post('/api/hod/update-trust-score', {
                                                        studentId: profilerData.student.id,
                                                        score: profilerData.student.trust_score
                                                    });
                                                    fetchStudents(); // Refresh table
                                                    alert('Trust score updated successfully.');
                                                } catch (err) {
                                                    console.error('Update failed');
                                                    alert('Failed to update score.');
                                                }
                                            }}
                                            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-500/20 transition-all active:scale-95 whitespace-nowrap"
                                        >
                                            Update Score
                                        </button>
                                    </div>

                                    {/* Key Status Card */}
                                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">Current Status</h4>
                                        <div className="flex items-center gap-4 mb-2">
                                            {profilerData.student.pass_blocked ? (
                                                <div className="p-3 bg-red-50 text-red-600 rounded-lg">
                                                    <Shield className="w-6 h-6" />
                                                </div>
                                            ) : (
                                                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
                                                    <CheckCircle className="w-6 h-6" />
                                                </div>
                                            )}
                                            <div>
                                                <p className="font-bold text-slate-900 dark:text-white">
                                                    {profilerData.student.pass_blocked ? 'Gate Access Blocked' : 'Gate Access Active'}
                                                </p>
                                                <p className="text-sm text-slate-500">
                                                    {profilerData.student.pass_blocked ? 'Student cannot exit campus.' : 'Student can apply for passes.'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Recent Activity Card */}
                                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">Last Activity</h4>
                                        {profilerData.stats.last_activity ? (
                                            <div className="flex items-center gap-4">
                                                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
                                                    <Clock className="w-6 h-6" />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-900 dark:text-white capitalize">
                                                        {profilerData.stats.last_activity.action} Detected
                                                    </p>
                                                    <p className="text-sm text-slate-500">
                                                        {new Date(profilerData.stats.last_activity.timestamp).toLocaleString()}
                                                    </p>
                                                </div>
                                            </div>
                                        ) : (
                                            <p className="text-slate-500 text-sm">No recent gate logs found.</p>
                                        )}
                                    </div>

                                    {/* Quick Stats Grid */}
                                    <div className="col-span-1 md:col-span-2 grid grid-cols-3 gap-4">
                                        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
                                            <p className="text-3xl font-bold text-slate-900 dark:text-white">{profilerData.stats.total_requests}</p>
                                            <p className="text-xs text-slate-400 uppercase mt-1">Total Requests</p>
                                        </div>
                                        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
                                            <p className="text-3xl font-bold text-emerald-600">{profilerData.stats.approved}</p>
                                            <p className="text-xs text-slate-400 uppercase mt-1">Approved</p>
                                        </div>
                                        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
                                            <p className="text-3xl font-bold text-red-600">{profilerData.stats.rejected}</p>
                                            <p className="text-xs text-slate-400 uppercase mt-1">Rejected</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* TAB: HISTORY */}
                            {activeTab === 'history' && (
                                <div className="space-y-4">
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Past 20 Entries</h4>
                                    {profilerData.history.length === 0 ? (
                                        <div className="text-center py-12 text-slate-500">No history found.</div>
                                    ) : (
                                        profilerData.history.map((req) => (
                                            <div key={req.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <div className={`p-2 rounded-lg ${req.type === 'emergency' ? 'bg-red-50 text-red-600' : 'bg-indigo-50 text-indigo-600'
                                                        }`}>
                                                        {req.type === 'emergency' ? <AlertTriangle className="w-5 h-5" /> : <Briefcase className="w-5 h-5" />}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-900 dark:text-white capitalize">{req.type} Pass</p>
                                                        <p className="text-xs text-slate-500">{new Date(req.created_at).toLocaleDateString()}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${req.status.includes('approved') || req.status === 'completed'
                                                        ? 'bg-emerald-50 text-emerald-600'
                                                        : req.status === 'rejected'
                                                            ? 'bg-red-50 text-red-600'
                                                            : 'bg-amber-50 text-amber-600'
                                                        }`}>
                                                        {req.status.replace('_', ' ')}
                                                    </span>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}

                            {/* TAB: STATS/ANALYTICS */}
                            {activeTab === 'stats' && (
                                <div className="text-center py-12">
                                    <Activity className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                                    <p className="text-slate-500 font-medium">Advanced visualization analytics coming soon.</p>
                                    <p className="text-slate-400 text-sm">Will include dwell time charts and frequent exit heatmap.</p>
                                </div>
                            )}

                        </div>

                        {/* Modal Footer */}
                        <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-end">
                            <button
                                onClick={() => setProfilerData(null)}
                                className="px-6 py-2 bg-slate-900 dark:bg-slate-700 text-white rounded-lg text-sm font-bold hover:bg-slate-800 transition-colors"
                            >
                                Close Profile
                            </button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Loading Overlay */}
            <AnimatePresence>
                {isProfilerLoading && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/20 backdrop-blur-sm">
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-xl flex flex-col items-center gap-4">
                            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                            <p className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-widest">Loading Profile...</p>
                        </div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default HODStudents;
