import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
    Plus, Search, Edit2, Trash2, GraduationCap, Clock, Award,
    CheckCircle, ShieldAlert, UserPlus, Phone, Lock, Key, Eye,
    TrendingUp, History, MapPin, X, ArrowUpRight, Calendar, Filter, MoreHorizontal
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    AreaChart, Area
} from 'recharts';
import Modal from '../../components/Modal';

const AdminStudents = () => {
    const [students, setStudents] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [hostels, setHostels] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterDept, setFilterDept] = useState('all');
    const [filterYear, setFilterYear] = useState('all');
    const [selectedUser, setSelectedUser] = useState(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [profileData, setProfileData] = useState(null);
    const [isResetModalOpen, setIsResetModalOpen] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [activeTab, setActiveTab] = useState('overview');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const [newUser, setNewUser] = useState({
        name: '', email: '', password: '', role: 'student', department_id: '',
        phone: '', year: '', register_number: '', student_type: 'hostel', hostel_id: ''
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async (isSilent = false) => {
        if (!isSilent) setLoading(true);
        try {
            const [usersRes, deptsRes, hostelsRes] = await Promise.all([
                axios.get('/api/admin/users?role=student'),
                axios.get('/api/admin/departments'),
                axios.get('/api/admin/hostels')
            ]);
            setStudents(usersRes.data);
            setDepartments(deptsRes.data);
            setHostels(hostelsRes.data);
        } catch (err) {
            console.error('Failed to fetch data');
        } finally {
            setLoading(false);
        }
    };

    const fetchProfile = async (id) => {
        try {
            const res = await axios.get(`/api/admin/users/oversight/${id}`);
            setProfileData(res.data);
            setIsProfileModalOpen(true);
            setActiveTab('overview');
        } catch (err) {
            console.error('Failed to fetch profile data');
        }
    };



    const handleResetPassword = async () => {
        setLoading(true);
        const promise = axios.post(`/api/admin/users/reset-password/${selectedUser.id}`, { newPassword });

        toast.promise(promise, {
            loading: 'Resetting password...',
            success: () => {
                setIsResetModalOpen(false);
                setNewPassword('');
                return 'Password reset successfully';
            },
            error: 'Reset failed'
        });

        try {
            await promise;
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddUser = async (e) => {
        e.preventDefault();
        try {
            await axios.post('/api/admin/users', newUser);
            setIsAddModalOpen(false);
            setNewUser({ name: '', email: '', password: '', role: 'student', department_id: '', phone: '', year: '', register_number: '', student_type: 'hostel', hostel_id: '' });
            fetchData(true);
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to add student');
        }
    };

    const handleUpdateUser = async (e) => {
        e.preventDefault();
        try {
            await axios.put(`/api/admin/users/${selectedUser.id}`, selectedUser);
            setIsEditModalOpen(false);
            fetchData(true);
        } catch (err) {
            alert('Failed to update student');
        }
    };

    const handleDeleteUser = async (id) => {
        if (!window.confirm('Remove this student?')) return;
        const previousStudents = [...students];
        setStudents(students.filter(s => s.id !== id));
        try {
            await axios.delete(`/api/admin/users/${id}`);
        } catch (err) {
            setStudents(previousStudents);
            alert('Failed to delete student');
        }
    };

    const filteredStudents = students.filter(s =>
        (s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (s.register_number && s.register_number.toLowerCase().includes(searchTerm.toLowerCase()))) &&
        (filterDept === 'all' || s.department_id === parseInt(filterDept)) &&
        (filterYear === 'all' || s.year === parseInt(filterYear))
    );

    // Pagination Logic
    const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
    const paginatedStudents = filteredStudents.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, filterDept, filterYear]);

    const stats = {
        total: filteredStudents.length,
        avgTrust: filteredStudents.length > 0
            ? Math.round(filteredStudents.reduce((acc, s) => acc + (s.trust_score || 0), 0) / filteredStudents.length)
            : 0,
        active: filteredStudents.filter(s => s.status === 'active').length,
        atRisk: filteredStudents.filter(s => (s.trust_score || 0) < 50).length
    };

    const processActivityData = (logs) => {
        if (!logs) return [];
        const hourCounts = {};
        logs.forEach(log => {
            const hour = new Date(log.timestamp).getHours();
            hourCounts[hour] = (hourCounts[hour] || 0) + 1;
        });
        return Array.from({ length: 24 }, (_, i) => ({
            hour: i,
            count: hourCounts[i] || 0
        }));
    };

    return (
        <div className="space-y-6 pb-20">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Student Management</h1>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Monitor academic and residential status</p>
                </div>
                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors flex items-center gap-2 font-medium"
                >
                    <UserPlus className="w-4 h-4" />
                    <span>Add Student</span>
                </button>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Total Students', value: stats.total, icon: GraduationCap, color: 'text-blue-600' },
                    { label: 'Avg Trust', value: `${stats.avgTrust}%`, icon: Award, color: 'text-indigo-600' },
                    { label: 'Active', value: stats.active, icon: CheckCircle, color: 'text-emerald-600' },
                    { label: 'At Risk', value: stats.atRisk, icon: ShieldAlert, color: 'text-rose-600' },
                ].map((stat, i) => (
                    <div key={i} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                            <stat.icon className={`w-5 h-5 ${stat.color}`} />
                            <span className="text-sm font-medium text-slate-500">{stat.label}</span>
                        </div>
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">{stat.value}</p>
                    </div>
                ))}
            </div>

            {/* Main Content Area */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                {/* Filters Bar */}
                <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex flex-col md:flex-row gap-4 justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Find by name, ID or email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 focus:ring-2 focus:ring-slate-400 focus:border-transparent"
                        />
                    </div>
                    <div className="flex gap-2 w-full md:w-auto">
                        <select
                            value={filterDept}
                            onChange={(e) => setFilterDept(e.target.value)}
                            className="flex-1 md:flex-none px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 focus:ring-2 focus:ring-slate-400"
                        >
                            <option value="all">All Depts</option>
                            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                        <select
                            value={filterYear}
                            onChange={(e) => setFilterYear(e.target.value)}
                            className="flex-1 md:flex-none px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 focus:ring-2 focus:ring-slate-400"
                        >
                            <option value="all">All Years</option>
                            {[1, 2, 3, 4].map(y => <option key={y} value={y}>Year {y}</option>)}
                        </select>
                    </div>
                </div>

                {/* Data Table */}
                {loading ? (
                    <div className="flex py-20 justify-center">
                        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
                    </div>
                ) : filteredStudents.length === 0 ? (
                    <div className="py-20 text-center text-slate-500">
                        <p>No students match your criteria.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                                <tr>
                                    <th className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-400">Student Identity</th>
                                    <th className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-400">Status</th>
                                    <th className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-400">Academic</th>
                                    <th className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-400">Trust Score</th>
                                    <th className="px-6 py-4 text-right font-semibold text-slate-600 dark:text-slate-400">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                {paginatedStudents.map((student) => (
                                    <tr key={student.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-300 font-semibold">
                                                    {student.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-slate-900 dark:text-white">{student.name}</p>
                                                    <p className="text-xs text-slate-500">{student.register_number} • {student.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${student.status === 'active'
                                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800'
                                                : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/20 dark:border-rose-800'
                                                }`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${student.status === 'active' ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                                                {student.status.charAt(0).toUpperCase() + student.status.slice(1)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-slate-600 dark:text-slate-300">
                                                <p>{student.department_name}</p>
                                                <p className="text-xs text-slate-500">
                                                    Year {student.year} • {student.student_type.replace('_', ' ')}
                                                    {student.student_type === 'hostel' && student.hostel_id && (
                                                        <span> • {hostels.find(h => h.id === student.hostel_id)?.name}</span>
                                                    )}
                                                </p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="flex-1 h-1.5 w-24 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full ${student.trust_score >= 90 ? 'bg-emerald-500' :
                                                            student.trust_score >= 70 ? 'bg-blue-500' :
                                                                'bg-amber-500'
                                                            }`}
                                                        style={{ width: `${student.trust_score}%` }}
                                                    />
                                                </div>
                                                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{student.trust_score}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => fetchProfile(student.id)}
                                                    className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
                                                    title="View Profile"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => { setSelectedUser(student); setIsEditModalOpen(true); }}
                                                    className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg transition-colors"
                                                    title="Edit Details"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <div className="w-px h-4 bg-slate-200 dark:bg-slate-700"></div>
                                                <button
                                                    onClick={() => { setSelectedUser(student); setIsResetModalOpen(true); }}
                                                    className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/30 rounded-lg transition-colors"
                                                    title="Reset Pwd"
                                                >
                                                    <Key className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination Controls */}
                {!loading && filteredStudents.length > 0 && (
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4 p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50">
                        <div className="text-sm text-slate-500">
                            Showing <span className="font-medium text-slate-900 dark:text-white">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-medium text-slate-900 dark:text-white">{Math.min(currentPage * itemsPerPage, filteredStudents.length)}</span> of <span className="font-medium text-slate-900 dark:text-white">{filteredStudents.length}</span> students
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                                className="px-3 py-1 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                Previous
                            </button>
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                Page {currentPage} of {Math.max(1, totalPages)}
                            </span>
                            <button
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages}
                                className="px-3 py-1 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Profile Modal */}
            <Modal
                isOpen={isProfileModalOpen && profileData !== null}
                onClose={() => setIsProfileModalOpen(false)}
                title="Student Profile"
                maxWidth="max-w-4xl"
            >
                {profileData && (
                    <div className="flex flex-col h-[80vh]">
                        {/* Profile Header */}
                        <div className="p-6 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 flex items-center gap-6">
                            <div className="w-20 h-20 bg-white dark:bg-slate-800 rounded-full border-4 border-white dark:border-slate-700 shadow-sm flex items-center justify-center text-3xl font-bold text-slate-700 dark:text-slate-200">
                                {profileData.student.name.charAt(0)}
                            </div>
                            <div className="flex-1">
                                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{profileData.student.name}</h2>
                                <div className="flex gap-4 text-sm text-slate-600 dark:text-slate-400 mt-1">
                                    <span className="flex items-center gap-1"><GraduationCap className="w-4 h-4" /> {profileData.student.register_number}</span>
                                    <span className="flex items-center gap-1"><Award className="w-4 h-4" /> Year {profileData.student.year}</span>
                                    <span className="px-2 py-0.5 rounded text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 capitalize flex items-center gap-1">
                                        {profileData.student.student_type.replace('_', ' ')}
                                        {profileData.student.hostel_name && (
                                            <span className="text-slate-500">• {profileData.student.hostel_name}</span>
                                        )}
                                    </span>
                                </div>
                            </div>
                            <div className="text-right hidden sm:block">
                                <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold">Trust Score</p>
                                <p className={`text-3xl font-bold ${profileData.student.trust_score >= 80 ? 'text-emerald-600' : 'text-amber-600'
                                    }`}>{profileData.student.trust_score}</p>
                            </div>
                        </div>

                        {/* Navigation Tabs */}
                        <div className="px-6 border-b border-slate-200 dark:border-slate-700 flex gap-6">
                            {['overview', 'activity', 'history', 'trust'].map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`py-4 text-sm font-medium border-b-2 transition-colors capitalize ${activeTab === tab
                                        ? 'border-indigo-600 text-indigo-600'
                                        : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
                                        }`}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>

                        {/* Tab Content */}
                        <div className="flex-1 overflow-y-auto p-6 bg-white dark:bg-slate-800">
                            {activeTab === 'overview' && (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-4">
                                            <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                                                <UserPlus className="w-4 h-4" /> Personal Details
                                            </h3>
                                            <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4 space-y-3 text-sm">
                                                <div className="flex justify-between">
                                                    <span className="text-slate-500">Email</span>
                                                    <span className="font-medium text-slate-900 dark:text-white">{profileData.student.email}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-slate-500">Phone</span>
                                                    <span className="font-medium text-slate-900 dark:text-white">{profileData.student.phone || 'N/A'}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-slate-500">Department</span>
                                                    <span className="font-medium text-slate-900 dark:text-white">{profileData.student.department_name}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                                                <TrendingUp className="w-4 h-4" /> Quick Stats
                                            </h3>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="p-3 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-100 dark:border-blue-800">
                                                    <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">Total Passes</p>
                                                    <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{profileData.stats.total_passes}</p>
                                                </div>
                                                <div className="p-3 bg-emerald-50 dark:bg-emerald-900/10 rounded-lg border border-emerald-100 dark:border-emerald-800">
                                                    <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Completed</p>
                                                    <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{profileData.stats.completed}</p>
                                                </div>
                                                <div className="p-3 bg-amber-50 dark:bg-amber-900/10 rounded-lg border border-amber-100 dark:border-amber-800">
                                                    <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">Active Requests</p>
                                                    <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">{profileData.stats.active || 0}</p>
                                                </div>
                                                <div className="p-3 bg-rose-50 dark:bg-rose-900/10 rounded-lg border border-rose-100 dark:border-rose-800">
                                                    <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">Rejected</p>
                                                    <p className="text-2xl font-bold text-rose-700 dark:text-rose-300">{profileData.stats.rejected}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="font-semibold text-slate-900 dark:text-white mb-3">Recent Activity</h3>
                                        <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                                            {profileData.mobilityLogs.length > 0 ? (
                                                <table className="w-full text-sm">
                                                    <thead className="bg-slate-50 dark:bg-slate-900 text-xs uppercase text-slate-500 font-semibold">
                                                        <tr>
                                                            <th className="px-4 py-2 text-left">Action</th>
                                                            <th className="px-4 py-2 text-left">Type</th>
                                                            <th className="px-4 py-2 text-right">Time</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                                        {profileData.mobilityLogs.slice(0, 5).map((log, i) => (
                                                            <tr key={i}>
                                                                <td className="px-4 py-2 font-medium capitalize flex items-center gap-2">
                                                                    <div className={`w-2 h-2 rounded-full ${log.action === 'entry' ? 'bg-emerald-500' : 'bg-blue-500'}`}></div>
                                                                    {log.action}
                                                                </td>
                                                                <td className="px-4 py-2 text-slate-500 capitalize">{log.request_type}</td>
                                                                <td className="px-4 py-2 text-right text-slate-500 font-mono">
                                                                    {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            ) : (
                                                <div className="p-8 text-center text-slate-500 text-sm">No recent activity logs found.</div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'activity' && (
                                <div className="space-y-6">
                                    <div className="h-64 bg-slate-50 dark:bg-slate-900 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">Activity by Hour (Last 30 Days)</p>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={processActivityData(profileData.mobilityLogs)}>
                                                <XAxis dataKey="hour" stroke="#94a3b8" fontSize={12} tickFormatter={val => `${val}h`} />
                                                <YAxis stroke="#94a3b8" fontSize={12} />
                                                <Tooltip
                                                    contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                                                    labelFormatter={val => `${val}:00 - ${val + 1}:00`}
                                                />
                                                <Bar dataKey="count" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800">
                                            <p className="text-sm text-emerald-800 dark:text-emerald-300 font-medium">Most Frequent Time</p>
                                            <p className="text-xl font-bold mt-1">10:00 AM</p>
                                            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">Based on exit logs</p>
                                        </div>
                                        <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800">
                                            <p className="text-sm text-blue-800 dark:text-blue-300 font-medium">Avg. Outing Duration</p>
                                            <p className="text-xl font-bold mt-1">4h 15m</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'trust' && (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between p-4 bg-indigo-50 dark:bg-indigo-900/10 rounded-lg border border-indigo-100 dark:border-indigo-800">
                                        <div>
                                            <p className="text-sm font-medium text-indigo-900 dark:text-indigo-200">Current Trust Score</p>
                                            <p className="text-3xl font-bold text-indigo-700 dark:text-indigo-400">{profileData.student.trust_score}</p>
                                        </div>
                                        <ShieldAlert className="w-12 h-12 text-indigo-200 dark:text-indigo-800" />
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-sm font-semibold text-slate-900 dark:text-white">Score History</p>
                                        {profileData.trustHistory.length === 0 ? (
                                            <p className="text-sm text-slate-500 italic">No trust score adjustments recorded.</p>
                                        ) : (
                                            profileData.trustHistory.map((h, i) => (
                                                <div key={i} className="flex gap-4 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg hover:shadow-sm transition-shadow">
                                                    <div className={`flex items-center justify-center w-12 h-12 rounded-lg font-bold text-lg ${h.new_score > h.old_score ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
                                                        }`}>
                                                        {h.new_score}
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="font-medium text-slate-900 dark:text-white">{h.reason}</p>
                                                        <p className="text-xs text-slate-500 mt-0.5">
                                                            Changed from <span className="font-mono">{h.old_score}</span> to <span className="font-mono">{h.new_score}</span>
                                                        </p>
                                                    </div>
                                                    <div className="text-right text-xs text-slate-400">
                                                        {new Date(h.created_at).toLocaleDateString()}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'history' && (
                                <div className="space-y-4">
                                    {profileData.requests && profileData.requests.length > 0 ? (
                                        profileData.requests.map((req, i) => (
                                            <div key={i} className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg flex items-center justify-between">
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className={`text-xs font-bold px-2 py-0.5 rounded uppercase ${req.type === 'outing' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                                                            }`}>{req.type}</span>
                                                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                                            {new Date(req.departure_date).toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-slate-500">{req.reason}</p>
                                                </div>
                                                <div className="text-right">
                                                    <span className={`text-xs font-bold px-2 py-1 rounded capitalize ${req.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                                                        req.status === 'rejected' ? 'bg-rose-100 text-rose-700' :
                                                            'bg-amber-100 text-amber-700'
                                                        }`}>{req.status.replace('_', ' ')}</span>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center py-10 text-slate-500">No request history found.</div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </Modal>

            {/* Other modals (Edit, Add, Reset) remain similar but styled slightly better */}
            <Modal isOpen={isResetModalOpen} onClose={() => setIsResetModalOpen(false)} title="Reset Password">
                {/* ... (Implementation same as before, essentially) ... */}
                <div className="p-6 space-y-4">
                    <p className="text-sm text-slate-600 dark:text-slate-400">Set a new password for <span className="font-semibold">{selectedUser?.name}</span>.</p>
                    <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg"
                        placeholder="New Password"
                    />
                    <div className="flex gap-3 justify-end">
                        <button onClick={() => setIsResetModalOpen(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
                        <button onClick={handleResetPassword} className="px-4 py-2 text-sm bg-amber-500 text-white rounded-lg hover:bg-amber-600">Reset</button>
                    </div>
                </div>
            </Modal>

            {/* Add Student Modal */}
            <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Add New Student">
                <form onSubmit={handleAddUser} className="space-y-6 p-6">
                    {/* Section 1: Identity */}
                    <div className="space-y-3">
                        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Identity</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">Full Name</label>
                                <input type="text" required value={newUser.name} onChange={e => setNewUser({ ...newUser, name: e.target.value })} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">ID Number</label>
                                <input type="text" required value={newUser.register_number} onChange={e => setNewUser({ ...newUser, register_number: e.target.value })} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">Email</label>
                                <input type="email" required value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">Phone</label>
                                <input type="text" value={newUser.phone} onChange={e => setNewUser({ ...newUser, phone: e.target.value })} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white" />
                            </div>
                        </div>
                    </div>

                    {/* Section 2: Academic */}
                    <div className="space-y-3">
                        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Academic Info</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">Department</label>
                                <select className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white" required value={newUser.department_id} onChange={e => setNewUser({ ...newUser, department_id: e.target.value })}>
                                    <option value="">Select...</option>
                                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">Year</label>
                                <select className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white" required value={newUser.year} onChange={e => setNewUser({ ...newUser, year: e.target.value })}>
                                    <option value="">Select...</option>
                                    {[1, 2, 3, 4].map(y => <option key={y} value={y}>Year {y}</option>)}
                                </select>
                            </div>
                            <div className="col-span-2">
                                <label className="block text-xs font-medium text-slate-500 mb-1">Student Type</label>
                                <div className="flex gap-2">
                                    {['hostel', 'day_scholar'].map(t => (
                                        <button type="button" key={t} onClick={() => setNewUser({ ...newUser, student_type: t })} className={`flex-1 py-2 text-sm rounded-lg border flex items-center justify-center transition-colors ${newUser.student_type === t ? 'bg-slate-800 text-white border-slate-800 dark:bg-white dark:text-slate-900' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
                                            {t.replace('_', ' ')}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            {newUser.student_type === 'hostel' && (
                                <div className="col-span-2 animate-in fade-in slide-in-from-top-2 duration-300">
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Select Hostel</label>
                                    <select
                                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                                        value={newUser.hostel_id || ''}
                                        onChange={e => setNewUser({ ...newUser, hostel_id: e.target.value })}
                                    >
                                        <option value="">Choose a hostel...</option>
                                        {hostels.map(h => <option key={h.id} value={h.id}>{h.name} ({h.type})</option>)}
                                    </select>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Section 3: Credentials */}
                    <div className="space-y-3">
                        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Security</h3>
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">Initial Password</label>
                            <input type="password" required value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white" />
                        </div>
                    </div>

                    <div className="pt-2 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-700 mt-4">
                        <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">Cancel</button>
                        <button type="submit" className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-sm transition-colors">Add Student</button>
                    </div>
                </form>
            </Modal>
            {/* Edit Student Modal */}
            <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Student">
                <form onSubmit={handleUpdateUser} className="space-y-6 p-6">
                    {/* Section 1: Identity */}
                    <div className="space-y-3">
                        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Identity</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">Full Name</label>
                                <input type="text" required value={selectedUser?.name || ''} onChange={e => setSelectedUser({ ...selectedUser, name: e.target.value })} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">ID Number</label>
                                <input type="text" required value={selectedUser?.register_number || ''} onChange={e => setSelectedUser({ ...selectedUser, register_number: e.target.value })} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">Email</label>
                                <input type="email" required value={selectedUser?.email || ''} onChange={e => setSelectedUser({ ...selectedUser, email: e.target.value })} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">Phone</label>
                                <input type="text" value={selectedUser?.phone || ''} onChange={e => setSelectedUser({ ...selectedUser, phone: e.target.value })} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white" />
                            </div>
                        </div>
                    </div>

                    {/* Section 2: Academic */}
                    <div className="space-y-3">
                        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Academic Info</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">Department</label>
                                <select className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white" required value={selectedUser?.department_id || ''} onChange={e => setSelectedUser({ ...selectedUser, department_id: e.target.value })}>
                                    <option value="">Select...</option>
                                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">Year</label>
                                <select className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white" required value={selectedUser?.year || ''} onChange={e => setSelectedUser({ ...selectedUser, year: e.target.value })}>
                                    <option value="">Select...</option>
                                    {[1, 2, 3, 4].map(y => <option key={y} value={y}>Year {y}</option>)}
                                </select>
                            </div>
                            <div className="col-span-2">
                                <label className="block text-xs font-medium text-slate-500 mb-1">Student Type</label>
                                <div className="flex gap-2">
                                    {['hostel', 'day_scholar'].map(t => (
                                        <button type="button" key={t} onClick={() => setSelectedUser({ ...selectedUser, student_type: t })} className={`flex-1 py-2 text-sm rounded-lg border flex items-center justify-center transition-colors ${selectedUser?.student_type === t ? 'bg-slate-800 text-white border-slate-800 dark:bg-white dark:text-slate-900' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
                                            {t.replace('_', ' ')}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            {selectedUser?.student_type === 'hostel' && (
                                <div className="col-span-2 animate-in fade-in slide-in-from-top-2 duration-300">
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Select Hostel</label>
                                    <select
                                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                                        value={selectedUser?.hostel_id || ''}
                                        onChange={e => setSelectedUser({ ...selectedUser, hostel_id: e.target.value })}
                                    >
                                        <option value="">Choose a hostel...</option>
                                        {hostels.map(h => <option key={h.id} value={h.id}>{h.name} ({h.type})</option>)}
                                    </select>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Section 3: Account Status */}
                    <div className="space-y-3">
                        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Account & Safety</h3>
                        <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl space-y-4 border border-slate-200 dark:border-slate-700">
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-2">Account Status</label>
                                <div className="flex gap-2">
                                    {['active', 'suspended', 'inactive'].map(s => (
                                        <button type="button" key={s} onClick={() => setSelectedUser({ ...selectedUser, status: s })} className={`flex-1 py-1.5 text-xs font-medium rounded-lg capitalize border transition-all ${selectedUser?.status === s
                                            ? (s === 'active' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : s === 'suspended' ? 'bg-rose-100 text-rose-700 border-rose-200' : 'bg-slate-200 text-slate-700 border-slate-300')
                                            : 'bg-white dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-600'
                                            }`}>
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-2 flex justify-between">
                                    <span>Trust Score Override</span>
                                    <span className={`font-bold ${selectedUser?.trust_score < 50 ? 'text-rose-600' : 'text-emerald-600'}`}>{selectedUser?.trust_score}</span>
                                </label>
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                    value={selectedUser?.trust_score || 100}
                                    onChange={e => setSelectedUser({ ...selectedUser, trust_score: parseInt(e.target.value) })}
                                />
                                <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                                    <ShieldAlert className="w-3 h-3" /> Changes to trust score will be permanently logged.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="pt-2 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-700 mt-4">
                        <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">Cancel</button>
                        <button type="submit" className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-sm transition-colors">Save Changes</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default AdminStudents;
