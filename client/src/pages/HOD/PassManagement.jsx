import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ShieldAlert, UserMinus, UserCheck, Timer,
    AlertCircle, CheckCircle, Search, Filter,
    ChevronRight, Zap, Shield, Plus, X, Lock, Unlock, ShieldCheck
} from 'lucide-react';
import Modal from '../../components/Modal';
import AdvancedStudentProfiler from '../../components/AdvancedStudentProfiler';

const HODPassManagement = () => {
    const [students, setStudents] = useState([]);
    const [restrictions, setRestrictions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [status, setStatus] = useState(null);
    const [msg, setMsg] = useState('');

    const [showYearModal, setShowYearModal] = useState(false);
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [newRestriction, setNewRestriction] = useState({ year: '', reason: '' });
    const [filters, setFilters] = useState({
        status: 'all',
        year: 'all',
        type: 'all',
        trust: 'all'
    });
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const getYearLabel = (year) => {
        const strYear = String(year).trim().toUpperCase();
        if (!year || year === 0 || strYear === '0' || strYear === 'N/A' || strYear === 'UNKNOWN') {
            return '';
        }

        const num = parseInt(strYear);
        if (isNaN(num)) return strYear;

        return `${num}yr`;
    };

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, filters]);

    const fetchData = async () => {
        try {
            const [stdRes, restRes] = await Promise.all([
                axios.get('/api/hod/users?role=student'),
                axios.get('/api/hod/restrictions')
            ]);
            setStudents(stdRes.data);
            setRestrictions(restRes.data);
        } catch (err) {
            console.error('Failed to sync data');
        } finally {
            setLoading(false);
        }
    };

    const toggleBlock = async (userId, currentStatus) => {
        try {
            await axios.post('/api/hod/toggle-block', { userId, blocked: !currentStatus });
            setStatus('success');
            setMsg(`Student ${!currentStatus ? 'Blocked' : 'Unblocked'} successfully.`);
            fetchData();
        } catch (err) {
            setStatus('error');
            setMsg('Operation failed.');
        }
    };

    const resetCooldown = async (userId) => {
        try {
            await axios.post('/api/hod/reset-cooldown', { userId });
            setStatus('success');
            setMsg('Cool-down restriction removed successfully.');
            fetchData();
        } catch (err) {
            setStatus('error');
            setMsg('Failed to reset cool-down.');
        }
    };

    const fetchStudentProfile = async (id) => {
        try {
            const res = await axios.get(`/api/hod/student-profile/${id}`);
            setSelectedStudent(res.data);
            setShowProfileModal(true);
        } catch (err) {
            setStatus('error');
            setMsg('Failed to load profile intelligence.');
        }
    };

    const manageYear = async (year, action, reason = '') => {
        try {
            await axios.post('/api/hod/manage-year-restriction', { academic_year: year, action, reason });
            setStatus('success');
            setMsg(`Access ${action === 'block' ? 'blocked' : 'restored'} for ${getYearLabel(year)} successfully.`);
            setShowYearModal(false);
            fetchData();
        } catch (err) {
            setStatus('error');
            setMsg('Operation failed.');
        }
    };

    const filteredStudents = students.filter(s => {
        const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.register_number.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = filters.status === 'all' ? true :
            filters.status === 'blocked' ? s.pass_blocked :
                filters.status === 'cool-down' ? s.cooldown_count >= 3 :
                    !s.pass_blocked;

        const matchesYear = filters.year === 'all' ? true :
            String(s.year) === filters.year;

        const matchesType = filters.type === 'all' ? true :
            (s.student_type || 'N/A') === filters.type;

        const matchesTrust = filters.trust === 'all' ? true :
            filters.trust === 'high' ? s.trust_score >= 80 :
                filters.trust === 'low' ? s.trust_score < 50 :
                    true;

        return matchesSearch && matchesStatus && matchesYear && matchesType && matchesTrust;
    });

    const paginatedStudents = filteredStudents.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    return (
        <div className="space-y-8 pb-12">
            {/* Simple & Clean Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-500/20">
                        <Shield className="w-8 h-8 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                            Pass Management
                        </h1>
                        <p className="text-slate-500 font-medium text-sm">
                            Control student access and view activities
                        </p>
                    </div>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={() => setShowYearModal(true)}
                        className="px-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-xs font-bold uppercase tracking-wider hover:scale-105 active:scale-95 transition-all flex items-center gap-2 shadow-xl"
                    >
                        <Plus className="w-4 h-4" />
                        Restrict Year
                    </button>
                </div>
            </div>

            {/* Responsive Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Total Students', value: students.length, icon: UserCheck, color: 'indigo' },
                    { label: 'Blocked', value: students.filter(s => s.pass_blocked).length, icon: Lock, color: 'rose' },
                    { label: 'Violations', value: students.filter(s => s.cooldown_count >= 3).length, icon: AlertCircle, color: 'amber' },
                    { label: 'High Trust', value: students.filter(s => s.trust_score >= 80).length, icon: Zap, color: 'emerald' }
                ].map((stat, i) => (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        key={i}
                        className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm hover:border-indigo-500/50 transition-colors group"
                    >
                        <div className="flex justify-between items-start mb-2">
                            <div className={`p-2.5 rounded-2xl bg-${stat.color}-50 dark:bg-${stat.color}-900/20 text-${stat.color}-600 dark:text-${stat.color}-400 group-hover:scale-110 transition-transform`}>
                                <stat.icon className="w-5 h-5" />
                            </div>
                            <span className={`text-2xl font-black text-slate-900 dark:text-white`}>{stat.value}</span>
                        </div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{stat.label}</p>
                    </motion.div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Active Restrictions Panel */}
                <div className="space-y-6">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="font-black text-slate-900 dark:text-white">Active Restrictions</h3>
                            <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded text-xs font-bold">{restrictions.length}</span>
                        </div>

                        <div className="space-y-3">
                            {restrictions.length === 0 ? (
                                <div className="text-center py-8 text-slate-400">
                                    <ShieldCheck className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                    <p className="text-xs font-bold uppercase tracking-wider">All Years Active</p>
                                </div>
                            ) : (
                                restrictions.map((res) => (
                                    <div key={res.id} className="p-4 bg-red-50 dark:bg-red-900/10 rounded-2xl border border-red-100 dark:border-red-900/20 group">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <ShieldAlert className="w-4 h-4 text-red-500" />
                                                    <span className="font-black text-slate-900 dark:text-white text-sm">{getYearLabel(res.academic_year)}</span>
                                                </div>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 leading-snug">{res.reason}</p>
                                            </div>
                                            <button
                                                onClick={() => manageYear(res.academic_year, 'unblock')}
                                                className="p-1.5 bg-white dark:bg-slate-800 text-slate-400 hover:text-red-500 rounded-lg shadow-sm transition-colors"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Quick Override</p>
                            <div className="grid grid-cols-2 gap-2">
                                {[1, 2, 3, 4].map(year => (
                                    <button
                                        key={year}
                                        onClick={() => manageYear(year, 'unblock')}
                                        className="py-2 px-3 bg-slate-50 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-slate-600 dark:text-slate-400 hover:text-indigo-600 rounded-xl text-xs font-bold transition-colors text-center"
                                    >
                                        {getYearLabel(year)}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Student List */}
                <div className="lg:col-span-3 space-y-6">
                    {/* Controls */}
                    {/* Advanced Search & Filter Bar */}
                    <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 md:space-y-0 md:flex items-center gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search student name or register no..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl outline-none border-transparent focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium text-sm"
                            />
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <select
                                value={filters.status}
                                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                                className="px-3 py-3 bg-slate-50 dark:bg-slate-800 border-transparent rounded-xl text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                            >
                                <option value="all">Check Status</option>
                                <option value="active">Active</option>
                                <option value="blocked">Blocked</option>
                                <option value="cool-down">Cool-down</option>
                            </select>

                            <select
                                value={filters.year}
                                onChange={(e) => setFilters(prev => ({ ...prev, year: e.target.value }))}
                                className="px-3 py-3 bg-slate-50 dark:bg-slate-800 border-transparent rounded-xl text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                            >
                                <option value="all">All Years</option>
                                <option value="1">1st Year</option>
                                <option value="2">2nd Year</option>
                                <option value="3">3rd Year</option>
                                <option value="4">4th Year</option>
                            </select>

                            <select
                                value={filters.type}
                                onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
                                className="px-3 py-3 bg-slate-50 dark:bg-slate-800 border-transparent rounded-xl text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                            >
                                <option value="all">All Types</option>
                                <option value="Day Scholar">Day Scholar</option>
                                <option value="Hostel">Hosteller</option>
                            </select>

                            <select
                                value={filters.trust}
                                onChange={(e) => setFilters(prev => ({ ...prev, trust: e.target.value }))}
                                className="px-3 py-3 bg-slate-50 dark:bg-slate-800 border-transparent rounded-xl text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                            >
                                <option value="all">Trust Score</option>
                                <option value="high">High Trust (80%+)</option>
                                <option value="low">Low Trust (&lt;50%)</option>
                            </select>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden hidden md:block">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                                <tr>
                                    <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider">Student</th>
                                    <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider">Academic Details</th>
                                    <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider text-center">Trust Score</th>
                                    <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {paginatedStudents.map((student) => (
                                    <tr key={student.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div>
                                                <p className="font-bold text-slate-900 dark:text-white">{student.name}</p>
                                                <p className="text-xs text-slate-400 font-mono mt-0.5">{student.register_number}</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1.5">
                                                <span className={`inline-flex w-fit px-2.5 py-1 rounded-lg text-xs font-black border ${student.year === 1 ? 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-900/30' :
                                                    student.year === 2 ? 'bg-violet-50 text-violet-600 border-violet-100 dark:bg-violet-900/20 dark:text-violet-400 dark:border-violet-900/30' :
                                                        student.year === 3 ? 'bg-fuchsia-50 text-fuchsia-600 border-fuchsia-100 dark:bg-fuchsia-900/20 dark:text-fuchsia-400 dark:border-fuchsia-900/30' :
                                                            student.year === 4 ? 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-900/30' :
                                                                'bg-slate-50 text-slate-600 border-slate-100 dark:bg-slate-800 dark:text-slate-400'
                                                    }`}>
                                                    {getYearLabel(student.year)}
                                                </span>
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-0.5">
                                                    {student.student_type || 'N/A'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`font-bold ${student.trust_score > 80 ? 'text-emerald-500' : 'text-slate-600'}`}>
                                                {student.trust_score}%
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {student.pass_blocked ? (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-100 text-red-700 text-xs font-bold">
                                                    <Lock className="w-3 h-3" /> Blocked
                                                </span>
                                            ) : student.cooldown_count >= 3 ? (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-100 text-amber-700 text-xs font-bold">
                                                    <Timer className="w-3 h-3" /> Cool-down
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-700 text-xs font-bold">
                                                    <CheckCircle className="w-3 h-3" /> Active
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {student.cooldown_count >= 3 && (
                                                    <button
                                                        onClick={() => resetCooldown(student.id)}
                                                        className="p-2 text-amber-500 hover:bg-amber-50 rounded-lg transition-colors"
                                                        title="Reset Cooldown"
                                                    >
                                                        <Zap className="w-4 h-4" />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => toggleBlock(student.id, student.pass_blocked)}
                                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${student.pass_blocked
                                                        ? 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                                                        : 'border-slate-200 text-slate-500 hover:border-red-200 hover:text-red-500 mx-2'
                                                        }`}
                                                >
                                                    {student.pass_blocked ? 'Unblock' : 'Block'}
                                                </button>
                                                <button
                                                    onClick={() => fetchStudentProfile(student.id)}
                                                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                >
                                                    <ChevronRight className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {paginatedStudents.length === 0 && (
                            <div className="p-12 text-center text-slate-400">
                                <p>No students found matching filters.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Mobile View (Cards) */}
            <div className="md:hidden p-4 space-y-4">
                {paginatedStudents.map((student) => (
                    <div key={student.id} className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl space-y-6 shadow-sm group">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg border ${student.pass_blocked ? 'bg-red-50 text-red-600 border-red-100' :
                                    'bg-indigo-50 text-indigo-600 border-indigo-100'
                                    }`}>
                                    {student.name.charAt(0)}
                                </div>
                                <div>
                                    <p className="text-sm font-black text-slate-900 dark:text-white leading-none mb-1">{student.name}</p>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">{student.register_number}</p>
                                </div>
                            </div>
                            <div className={`px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border ${student.pass_blocked ? 'bg-red-50 text-red-600 border-red-100' :
                                student.cooldown_count >= 3 ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                    'bg-emerald-50 text-emerald-600 border-emerald-100'
                                }`}>
                                {student.pass_blocked ? 'Blocked' :
                                    student.cooldown_count >= 3 ? 'Cool-down' :
                                        'Active'}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl">
                            <div className="space-y-2">
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">Trust Score</p>
                                <p className="text-xs font-black text-slate-900 dark:text-white leading-none">{student.trust_score}%</p>
                                <div className="h-1 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${student.trust_score}%` }} />
                                </div>
                            </div>
                            <div className="space-y-2 text-right">
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">Year</p>
                                <p className="text-xs font-black text-indigo-600 dark:text-indigo-400 leading-none">{getYearLabel(student.year)}</p>
                            </div>
                        </div>

                        <div className="flex gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                            <button
                                onClick={() => fetchStudentProfile(student.id)}
                                className="flex-1 py-3 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg"
                            >
                                Profile
                            </button>
                            {student.cooldown_count >= 3 && (
                                <button
                                    onClick={() => resetCooldown(student.id)}
                                    className="p-3 bg-amber-50 text-amber-600 rounded-xl border border-amber-100"
                                >
                                    <Zap className="w-4 h-4" />
                                </button>
                            )}
                            <button
                                onClick={() => toggleBlock(student.id, student.pass_blocked)}
                                className={`flex-[1.5] py-3 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-md ${student.pass_blocked ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
                                    }`}
                            >
                                {student.pass_blocked ? 'Unblock' : 'Block'}
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Pagination Footer */}
            {filteredStudents.length > 0 && (
                <div className="p-8 bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">
                            Page {currentPage} of {Math.ceil(filteredStudents.length / itemsPerPage)}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                            className="p-3 bg-white dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700 rounded-2xl hover:bg-slate-50 disabled:opacity-20 disabled:cursor-not-allowed transition-all shadow-sm"
                        >
                            <ChevronRight className="w-5 h-5 rotate-180" />
                        </button>
                        <div className="flex items-center gap-1 bg-white dark:bg-slate-800 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                            {[...Array(Math.ceil(filteredStudents.length / itemsPerPage))].map((_, i) => (
                                <button
                                    key={i}
                                    onClick={() => setCurrentPage(i + 1)}
                                    className={`w-9 h-9 rounded-xl text-[10px] font-black transition-all ${currentPage === i + 1
                                        ? 'bg-slate-900 text-white shadow-xl dark:bg-white dark:text-slate-900'
                                        : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
                                        }`}
                                >
                                    {i + 1}
                                </button>
                            )).filter((_, i) => {
                                const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
                                if (totalPages <= 3) return true;
                                return Math.abs(currentPage - 1 - i) <= 1;
                            })}
                        </div>
                        <button
                            onClick={() => setCurrentPage(prev => Math.min(Math.ceil(filteredStudents.length / itemsPerPage), prev + 1))}
                            disabled={currentPage === Math.ceil(filteredStudents.length / itemsPerPage)}
                            className="p-3 bg-white dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700 rounded-2xl hover:bg-slate-50 disabled:opacity-20 disabled:cursor-not-allowed transition-all shadow-sm"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            )}

            {/* Empty State */}
            {filteredStudents.length === 0 && (
                <div className="p-24 text-center bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                    <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Search className="w-10 h-10 text-slate-200" />
                    </div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-widest">No Students Found</h3>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2 italic">Refine your search parameters or filters</p>
                </div>
            )}

            {/* Restrict Year Level Modal (Redesigned) */}
            <Modal
                isOpen={showYearModal}
                onClose={() => setShowYearModal(false)}
                maxWidth="max-w-md"
                showPadding={false}
            >
                <div className="overflow-hidden rounded-3xl">
                    <div className="p-10 bg-slate-900 text-white relative">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl" />
                        <ShieldAlert className="w-12 h-12 mb-6 text-red-500" />
                        <h3 className="text-3xl font-black tracking-tighter italic">Restrict Year</h3>
                        <p className="text-slate-400 text-[10px] uppercase font-black tracking-[0.3em] mt-1">Block access for a specific year</p>
                    </div>
                    <div className="p-10 bg-white dark:bg-slate-900 space-y-8">
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Select Year</label>
                            <div className="grid grid-cols-2 gap-3">
                                {[1, 2, 3, 4].map(y => (
                                    <button
                                        key={y}
                                        onClick={() => setNewRestriction({ ...newRestriction, year: String(y) })}
                                        className={`py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border ${newRestriction.year === String(y)
                                            ? 'bg-slate-900 text-white border-slate-900 shadow-xl dark:bg-white dark:text-slate-900'
                                            : 'bg-slate-50 dark:bg-slate-800 text-slate-400 border-slate-100 dark:border-slate-700 hover:bg-slate-100'
                                            }`}
                                    >
                                        {getYearLabel(y)}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Reason</label>
                            <textarea
                                rows="3"
                                value={newRestriction.reason}
                                onChange={(e) => setNewRestriction({ ...newRestriction, reason: e.target.value })}
                                className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl p-5 text-sm font-bold outline-none focus:border-red-500 transition-all dark:text-white"
                                placeholder="Why are you restricting access?"
                            />
                        </div>
                        <div className="flex gap-4">
                            <button
                                onClick={() => setShowYearModal(false)}
                                className="flex-1 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-2xl transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => manageYear(newRestriction.year, 'block', newRestriction.reason)}
                                className="flex-[2] py-5 bg-red-600 text-white rounded-2xl text-[10px] font-black shadow-xl shadow-red-500/20 hover:scale-[1.02] active:scale-95 transition-all uppercase tracking-widest border-b-4 border-red-800"
                            >
                                Apply Restriction
                            </button>
                        </div>
                    </div>
                </div>
            </Modal>

            {/* Student Profile Modal (Redesigned) */}
            <AdvancedStudentProfiler
                isOpen={showProfileModal}
                onClose={() => setShowProfileModal(false)}
                data={selectedStudent}
                onUpdate={fetchData}
            />
        </div>
    );
};

export default HODPassManagement;
