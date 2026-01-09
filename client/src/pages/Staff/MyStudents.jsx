import React, { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search, Filter, Download, User, Smartphone, Mail,
    ChevronRight, ChevronLeft, ArrowUpDown, MoreHorizontal,
    ExternalLink, MailQuestion, CreditCard, Shield, ShieldCheck,
    CheckCircle2, X
} from 'lucide-react';
import StudentDetailView from '../../components/StudentDetailView';

const MyStudents = () => {
    const [students, setStudents] = useState([]);
    const [filter, setFilter] = useState('');
    const [loading, setLoading] = useState(true);
    const [showAssignedOnly, setShowAssignedOnly] = useState(false);
    const [selectedStudentId, setSelectedStudentId] = useState(null);
    const [showFilterDropdown, setShowFilterDropdown] = useState(false);
    const filterRef = useRef(null);

    // Pagination & Sorting State
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage] = useState(20);
    const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });

    const getYearLabel = (year) => {
        const strYear = String(year).trim().toUpperCase();
        if (!year || year === 0 || strYear === '0' || strYear === 'N/A' || strYear === 'UNKNOWN') {
            return 'Batch N/A';
        }

        const num = parseInt(strYear);
        if (isNaN(num)) return strYear;

        return `${num}yr`;
    };

    // New Filter State
    const [yearFilter, setYearFilter] = useState('All Years');
    const [typeFilter, setTypeFilter] = useState('All Types');

    useEffect(() => {
        fetchStudents();
    }, [showAssignedOnly]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (filterRef.current && !filterRef.current.contains(event.target)) {
                setShowFilterDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchStudents = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`/api/staff/my-students${showAssignedOnly ? '?assigned=true' : ''}`);
            setStudents(res.data);
            setLoading(false);
        } catch (err) {
            console.error(err);
            setLoading(false);
        }
    };

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const sortedStudents = useMemo(() => {
        let items = [...students];

        // Filter by Year
        if (yearFilter !== 'All Years') {
            items = items.filter(s => s.year === parseInt(yearFilter));
        }

        // Filter by Type
        if (typeFilter !== 'All Types') {
            items = items.filter(s => s.student_type?.toLowerCase() === typeFilter.toLowerCase());
        }

        // Search Filter
        if (filter) {
            items = items.filter(s =>
                s.name.toLowerCase().includes(filter.toLowerCase()) ||
                s.email.toLowerCase().includes(filter.toLowerCase()) ||
                s.register_number?.toLowerCase().includes(filter.toLowerCase()) ||
                s.id.toString().includes(filter)
            );
        }

        // Sort
        items.sort((a, b) => {
            const aValue = a[sortConfig.key];
            const bValue = b[sortConfig.key];
            if (aValue === undefined || bValue === undefined) return 0;
            if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });

        return items;
    }, [students, filter, sortConfig, yearFilter, typeFilter]);

    // Pagination Logic
    const totalPages = Math.ceil(sortedStudents.length / rowsPerPage);
    const paginatedStudents = sortedStudents.slice(
        (currentPage - 1) * rowsPerPage,
        currentPage * rowsPerPage
    );

    const handleExport = () => {
        const csvContent = "data:text/csv;charset=utf-8,"
            + "ID,Name,Email,Phone,Year,Type,Trust Score,Total Requests\n"
            + sortedStudents.map(s => `${s.id},${s.name},${s.email},${s.phone},${s.year},${s.student_type},${s.trust_score},${s.total_requests || 0}`).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `mentee_roster_${new Date().toLocaleDateString()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const SortIcon = ({ column }) => {
        if (sortConfig.key !== column) return <ArrowUpDown className="w-3.5 h-3.5 opacity-30" />;
        return <ArrowUpDown className={`w-3.5 h-3.5 ${sortConfig.direction === 'asc' ? 'text-indigo-600' : 'text-rose-600'}`} />;
    };

    return (
        <div className="space-y-8 animate-fade-in relative pb-12">
            <AnimatePresence>
                {selectedStudentId && (
                    <StudentDetailView
                        studentId={selectedStudentId}
                        onClose={() => setSelectedStudentId(null)}
                    />
                )}
            </AnimatePresence>

            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Active Roster</h1>
                    <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">
                        Managing {students.length} mentees in your specialized jurisdiction
                    </p>
                </div>
                <div className="flex flex-wrap gap-3">
                    <div className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-2xl font-bold shadow-sm ring-4 ring-indigo-500/10">
                        <User className="w-4 h-4" />
                        My Mentees
                    </div>
                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm"
                    >
                        <Download className="w-4 h-4" /> Export
                    </button>
                </div>
            </div>

            {/* Advanced Filters */}
            <div className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl p-4 rounded-3xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-center gap-4">
                <div className="relative flex-1 group w-full">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                    <input
                        type="text"
                        placeholder="Search roster by name, email, or SID..."
                        value={filter}
                        onChange={(e) => { setFilter(e.target.value); setCurrentPage(1); }}
                        className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all dark:text-white font-medium"
                    />
                </div>
                <div className="relative flex items-center gap-2 w-full md:w-auto" ref={filterRef}>
                    <div className="h-10 w-px bg-slate-200 dark:bg-slate-800 hidden md:block mx-2" />
                    <button
                        onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                        className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all ${(yearFilter !== 'All Years' || typeFilter !== 'All Types')
                            ? 'bg-indigo-50 text-indigo-600 border border-indigo-200'
                            : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                            }`}
                    >
                        <Filter className="w-4 h-4" />
                        Filters
                        {(yearFilter !== 'All Years' || typeFilter !== 'All Types') && (
                            <span className="w-2 h-2 rounded-full bg-indigo-600" />
                        )}
                    </button>

                    <AnimatePresence>
                        {showFilterDropdown && (
                            <motion.div
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                className="absolute right-0 top-full mt-3 w-72 bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 z-20"
                            >
                                <div className="space-y-6">
                                    <div>
                                        <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-3 block px-1">Academic Year</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {['All Years', '1', '2', '3', '4'].map(year => (
                                                <button
                                                    key={year}
                                                    onClick={() => { setYearFilter(year); setCurrentPage(1); }}
                                                    className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border ${yearFilter === year
                                                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-200 dark:shadow-none'
                                                        : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-100 dark:border-slate-700 hover:bg-slate-100'
                                                        }`}
                                                >
                                                    {year === 'All Years' ? 'All' : `Year ${year}`}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-3 block px-1">Student Type</label>
                                        <div className="space-y-2">
                                            {['All Types', 'Hostel', 'Day_Scholar'].map(type => (
                                                <button
                                                    key={type}
                                                    onClick={() => { setTypeFilter(type); setCurrentPage(1); }}
                                                    className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-bold transition-all border ${typeFilter === type
                                                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-200 dark:shadow-none'
                                                        : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-100 dark:border-slate-700 hover:bg-slate-100'
                                                        }`}
                                                >
                                                    <span>{type.replace('_', ' ')}</span>
                                                    {typeFilter === type && <CheckCircle2 className="w-3.5 h-3.5" />}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    {(yearFilter !== 'All Years' || typeFilter !== 'All Types') && (
                                        <button
                                            onClick={() => { setYearFilter('All Years'); setTypeFilter('All Types'); }}
                                            className="w-full py-2 text-xs font-black text-rose-500 hover:bg-rose-50 rounded-xl transition-all border border-transparent hover:border-rose-100"
                                        >
                                            Reset All Filters
                                        </button>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Advanced Table */}
            <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                                <th onClick={() => handleSort('name')} className="px-6 py-5 cursor-pointer hover:bg-slate-100/50 dark:hover:bg-slate-800 transition-colors group">
                                    <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500">
                                        Student Info <SortIcon column="name" />
                                    </div>
                                </th>
                                <th onClick={() => handleSort('year')} className="px-6 py-5 cursor-pointer hover:bg-slate-100/50 dark:hover:bg-slate-800 transition-colors group">
                                    <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500">
                                        Academics <SortIcon column="year" />
                                    </div>
                                </th>
                                <th onClick={() => handleSort('trust_score')} className="px-6 py-5 cursor-pointer hover:bg-slate-100/50 dark:hover:bg-slate-800 transition-colors group text-center">
                                    <div className="flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500">
                                        Trust <SortIcon column="trust_score" />
                                    </div>
                                </th>
                                <th onClick={() => handleSort('total_requests')} className="px-6 py-5 cursor-pointer hover:bg-slate-100/50 dark:hover:bg-slate-800 transition-colors group text-center">
                                    <div className="flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500">
                                        Passes <SortIcon column="total_requests" />
                                    </div>
                                </th>
                                <th className="px-6 py-5 text-right text-xs font-black uppercase tracking-widest text-slate-500">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                            {loading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan="5" className="px-6 py-6"><div className="h-10 bg-slate-100 dark:bg-slate-800 rounded-xl w-full" /></td>
                                    </tr>
                                ))
                            ) : paginatedStudents.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center">
                                            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-3xl mb-4">
                                                <User className="w-10 h-10 text-slate-300" />
                                            </div>
                                            <p className="text-slate-500 dark:text-slate-400 font-bold">No students matched your criteria</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                paginatedStudents.map((student) => (
                                    <motion.tr
                                        key={student.id}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 font-black text-lg shadow-inner">
                                                    {student.name.charAt(0)}
                                                </div>
                                                <div className="flex flex-col min-w-0">
                                                    <span className="font-bold text-slate-900 dark:text-white truncate">{student.name}</span>
                                                    <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium truncate mt-0.5">
                                                        <span className="font-mono bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-300 uppercase tracking-tight">
                                                            {student.register_number || 'NO ID'}
                                                        </span>
                                                        <span className="text-slate-300 dark:text-slate-600">•</span>
                                                        <span className="truncate opacity-75">{student.email}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-black text-slate-700 dark:text-slate-300">{getYearLabel(student.year)}</span>
                                                <span className="text-[10px] uppercase font-bold text-indigo-500 dark:text-indigo-400 tracking-wider">
                                                    {student.student_type?.replace('_', ' ')}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className={`inline-flex items-center justify-center px-3 py-1.5 rounded-xl text-xs font-black shadow-sm ${student.trust_score >= 90 ? 'bg-emerald-50 text-emerald-600 border border-emerald-100 dark:bg-emerald-500/10 dark:border-emerald-500/20' :
                                                student.trust_score >= 70 ? 'bg-amber-50 text-amber-600 border border-amber-100 dark:bg-amber-500/10 dark:border-amber-500/20' :
                                                    'bg-rose-50 text-rose-600 border border-rose-100 dark:bg-rose-500/10 dark:border-rose-500/20'
                                                }`}>
                                                {student.trust_score}%
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="text-sm font-black text-slate-900 dark:text-white">
                                                {student.total_requests || 0}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => setSelectedStudentId(student.id)}
                                                    className="p-2.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl hover:bg-indigo-100 transition-colors shadow-sm"
                                                    title="View Profile"
                                                >
                                                    <ExternalLink className="w-4 h-4" />
                                                </button>
                                                <button className="p-2.5 bg-slate-50 dark:bg-slate-800 text-slate-400 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                                                    <MoreHorizontal className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </motion.tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Modern Pagination Footer */}
                {!loading && sortedStudents.length > 0 && (
                    <div className="px-8 py-6 bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="text-sm text-slate-500 font-bold italic tracking-tight">
                            Viewing {(currentPage - 1) * rowsPerPage + 1} - {Math.min(currentPage * rowsPerPage, sortedStudents.length)} of {sortedStudents.length} Students
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white dark:hover:bg-slate-800 transition-all text-slate-600 dark:text-slate-400"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>

                            <div className="flex items-center gap-1 shadow-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-1">
                                {[...Array(totalPages)].map((_, i) => {
                                    const page = i + 1;
                                    // Only show first, last, and pages around current
                                    if (page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)) {
                                        return (
                                            <button
                                                key={page}
                                                onClick={() => setCurrentPage(page)}
                                                className={`w-9 h-9 rounded-lg text-sm font-black transition-all ${currentPage === page
                                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 dark:shadow-none'
                                                    : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
                                                    }`}
                                            >
                                                {page}
                                            </button>
                                        );
                                    } else if (page === currentPage - 2 || page === currentPage + 2) {
                                        return <span key={page} className="px-1 text-slate-300">...</span>;
                                    }
                                    return null;
                                })}
                            </div>

                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white dark:hover:bg-slate-800 transition-all text-slate-600 dark:text-slate-400"
                            >
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Quick Insights Cards (Bottom) */}
            {!loading && sortedStudents.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="p-6 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-[2rem] text-white shadow-xl shadow-indigo-200 dark:shadow-none">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md">
                                <CreditCard className="w-6 h-6" />
                            </div>
                        </div>
                        <h4 className="text-white/80 font-bold text-sm uppercase tracking-wider">Top Academic Year</h4>
                        <p className="text-3xl font-black mt-1">Year {Math.max(...students.map(s => s.year), 0)}</p>
                    </div>
                    <div className="p-6 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-3 bg-emerald-500/10 rounded-2xl">
                                <ShieldCheck className="w-6 h-6 text-emerald-500" />
                            </div>
                        </div>
                        <h4 className="text-slate-500 dark:text-slate-400 font-bold text-sm uppercase tracking-wider">Mentee Trust Score</h4>
                        <p className="text-3xl font-black text-slate-900 dark:text-white mt-1">
                            {Math.round(students.reduce((acc, curr) => acc + curr.trust_score, 0) / (students.length || 1))}%
                        </p>
                    </div>
                    <div className="p-6 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-3 bg-amber-500/10 rounded-2xl">
                                <MailQuestion className="w-6 h-6 text-amber-500" />
                            </div>
                        </div>
                        <h4 className="text-slate-500 dark:text-slate-400 font-bold text-sm uppercase tracking-wider">Pass Request Peak</h4>
                        <p className="text-3xl font-black text-slate-900 dark:text-white mt-1">High Vol</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MyStudents;
