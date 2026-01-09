import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import {
    Plus, Search, Edit2, Trash2, GraduationCap, Clock, Award,
    CheckCircle, ShieldAlert, UserPlus, Phone, Lock, Key, Eye, Mail,
    TrendingUp, History, MapPin, X, ArrowUpRight, Calendar, Filter, MoreHorizontal
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    AreaChart, Area, Cell, PieChart, Pie
} from 'recharts';
import Modal from '../../components/Modal';

const AdminStudents = () => {
    const { user } = useAuth();
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

    const getYearLabel = (year) => {
        const strYear = String(year).trim().toUpperCase();
        if (!year || year === 0 || strYear === '0' || strYear === 'N/A' || strYear === 'UNKNOWN') {
            return '';
        }

        const num = parseInt(strYear);
        if (isNaN(num)) return strYear;

        return `${num}yr`;
    };

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
        console.log(`[DEBUG] Attempting to fetch profile for ID: ${id}`);
        try {
            const res = await axios.get(`/api/admin/users/oversight/${id}`);
            setProfileData(res.data);
            setIsProfileModalOpen(true);
            setActiveTab('overview');
        } catch (err) {
            console.error('Failed to fetch profile data', err);
            toast.error(err.response?.data?.message || 'Failed to load student profile');
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

    const [selectedImage, setSelectedImage] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [removeImage, setRemoveImage] = useState(false);

    const handleImageChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setSelectedImage(file);
            setPreviewUrl(URL.createObjectURL(file));
            setRemoveImage(false);
        }
    };

    // Cleanup preview URL on unmount or when modal closes
    useEffect(() => {
        return () => {
            if (previewUrl && previewUrl.startsWith('blob:')) {
                URL.revokeObjectURL(previewUrl);
            }
        };
    }, [previewUrl]);

    const handleAddUser = async (e) => {
        e.preventDefault();
        try {
            const formData = new FormData();
            Object.keys(newUser).forEach(key => formData.append(key, newUser[key]));
            if (selectedImage) formData.append('profileImage', selectedImage);

            await axios.post('/api/admin/users', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setIsAddModalOpen(false);
            setNewUser({ name: '', email: '', password: '', role: 'student', department_id: '', phone: '', year: '', register_number: '', student_type: 'hostel', hostel_id: '' });
            setSelectedImage(null);
            setPreviewUrl(null);
            fetchData(true);
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to add student');
        }
    };

    const handleUpdateUser = async (e) => {
        e.preventDefault();
        try {
            const formData = new FormData();
            // selectedUser contains many fields not needed/handled by update API if sent as JSON but OK as FormData ignore extra
            // Better to explicitly append allowed fields
            const allowedFields = ['name', 'role', 'department_id', 'trust_score', 'status', 'phone', 'year', 'register_number', 'email', 'student_type', 'hostel_id'];
            allowedFields.forEach(key => {
                if (selectedUser[key] !== null && selectedUser[key] !== undefined) {
                    formData.append(key, selectedUser[key]);
                }
            });

            if (selectedImage) formData.append('profileImage', selectedImage);
            if (removeImage) formData.append('remove_profile_image', 'true');

            await axios.put(`/api/admin/users/${selectedUser.id}`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setIsEditModalOpen(false);
            setSelectedImage(null);
            setPreviewUrl(null);
            setRemoveImage(false);
            fetchData(true);
        } catch (err) {
            alert('Failed to update student');
        }
    };

    const handleDeleteUser = async (id) => {
        if (user?.role === 'principal') {
            toast.error("Principals cannot delete records. Please mark as Inactive instead.");
            return;
        }
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
                                    <th className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-400">Student Information</th>
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
                                                <div className="w-10 h-10 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-300 font-semibold overflow-hidden">
                                                    {student.profile_image ? (
                                                        <img src={`/img/student/${student.profile_image}`} alt={student.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        student.name.charAt(0)
                                                    )}
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
                                                    {getYearLabel(student.year)} • {student.student_type.replace('_', ' ')}
                                                    {student.student_type?.toLowerCase() === 'hostel' && student.hostel_id && (
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
                                            <div className="flex items-center justify-end gap-2 text-slate-500">
                                                <button
                                                    onClick={() => fetchProfile(student.id)}
                                                    className="p-1.5 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
                                                    title="View Profile"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => { setSelectedUser(student); setIsEditModalOpen(true); }}
                                                    className="p-1.5 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg transition-colors"
                                                    title="Edit Details"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <div className="w-px h-4 bg-slate-200 dark:bg-slate-700"></div>
                                                <button
                                                    onClick={() => { setSelectedUser(student); setIsResetModalOpen(true); }}
                                                    className="p-1.5 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/30 rounded-lg transition-colors"
                                                    title="Reset Pwd"
                                                >
                                                    <Key className="w-4 h-4" />
                                                </button>
                                                {user?.role !== 'principal' && (
                                                    <>
                                                        <div className="w-px h-4 bg-slate-200 dark:bg-slate-700"></div>
                                                        <button
                                                            onClick={() => handleDeleteUser(student.id)}
                                                            className="p-1.5 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-colors"
                                                            title="Delete"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </>
                                                )}
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

            {/* Premium Profile Modal */}
            <Modal
                isOpen={isProfileModalOpen && profileData !== null}
                onClose={() => setIsProfileModalOpen(false)}
                title={null} // Custom Header
                maxWidth="max-w-5xl"
            >
                {profileData && (
                    <div className="flex flex-col md:flex-row h-auto md:h-full md:overflow-hidden bg-white dark:bg-slate-900">
                        {/* Sidebar: Profile Summary */}
                        <div className="w-full md:w-80 bg-slate-50 dark:bg-slate-900/50 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800 flex flex-col p-6 backdrop-blur-xl">
                            <div className="relative group self-center mb-6">
                                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-1 shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform duration-500">
                                    <div className="w-full h-full bg-white dark:bg-slate-900 rounded-[calc(1rem-0.25rem)] flex items-center justify-center text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-br from-indigo-500 to-purple-600 overflow-hidden">
                                        {profileData.student?.profile_image ? (
                                            <img src={`/img/student/${profileData.student.profile_image}`} alt="Profile" className="w-full h-full object-cover" />
                                        ) : (
                                            profileData.student?.name?.charAt(0) || '?'
                                        )}
                                    </div>
                                </div>
                                <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-lg border-2 border-white dark:border-slate-900 flex items-center justify-center shadow-sm ${profileData.student?.status === 'active' ? 'bg-emerald-500' : 'bg-rose-500'
                                    }`}>
                                    <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                                </div>
                            </div>

                            <div className="text-center mb-8">
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">{profileData.student?.name}</h2>
                                <p className="text-sm text-slate-500 mt-1 font-mono tracking-tighter">{profileData.student?.register_number}</p>
                            </div>

                            {/* Trust Meter (Visual Gauge) */}
                            <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm mb-6">
                                <div className="flex justify-between items-end mb-2">
                                    <span className="text-xs font-semibold text-slate-500 uppercase">Trust Index</span>
                                    <span className={`text-lg font-bold ${profileData.student?.trust_score >= 80 ? 'text-emerald-500' : 'text-amber-500'}`}>
                                        {profileData.student?.trust_score}%
                                    </span>
                                </div>
                                <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full transition-all duration-1000 ease-out ${profileData.student?.trust_score >= 80 ? 'bg-gradient-to-r from-emerald-400 to-emerald-600' :
                                            profileData.student?.trust_score >= 60 ? 'bg-gradient-to-r from-amber-400 to-amber-600' :
                                                'bg-gradient-to-r from-rose-400 to-rose-600'
                                            }`}
                                        style={{ width: `${profileData.student?.trust_score}%` }}
                                    />
                                </div>
                            </div>

                            <nav className="space-y-1">
                                {[
                                    { id: 'overview', icon: Eye, label: 'Overview' },
                                    { id: 'activity', icon: TrendingUp, label: 'Mobility Logs' },
                                    { id: 'history', icon: History, label: 'Pass History' },
                                    { id: 'trust', icon: ShieldAlert, label: 'Trust Audit' }
                                ].map(tab => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 ${activeTab === tab.id
                                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                                            }`}
                                    >
                                        <tab.icon className="w-4 h-4" />
                                        {tab.label}
                                    </button>
                                ))}
                            </nav>

                            <div className="mt-auto pt-6">
                                <button
                                    onClick={() => setIsProfileModalOpen(false)}
                                    className="w-full py-2.5 text-xs font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white uppercase tracking-widest border border-slate-200 dark:border-slate-800 rounded-xl transition-colors"
                                >
                                    Close Window
                                </button>
                            </div>
                        </div>

                        {/* Main Content Area */}
                        <div className="flex-1 overflow-y-auto p-8 bg-white dark:bg-slate-900 scroll-smooth">
                            {activeTab === 'overview' && (
                                <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                                    {/* Info Grid */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {[
                                            { label: 'Student Type', value: profileData.student?.student_type?.replace('_', ' '), icon: GraduationCap, color: 'indigo' },
                                            { label: 'Department', value: profileData.student?.department_name || 'N/A', icon: MapPin, color: 'purple' },
                                            { label: 'Academic Year', value: getYearLabel(profileData.student?.year), icon: Calendar, color: 'blue' },
                                            { label: 'Residence', value: profileData.student?.hostel_name || 'Day Scholar', icon: History, color: 'emerald' },
                                            { label: 'Primary Contact', value: profileData.student?.phone || 'N/A', icon: Phone, color: 'amber' },
                                            { label: 'Email Node', value: profileData.student?.email, icon: Mail, color: 'pink' }
                                        ].map((item, i) => (
                                            <div key={i} className="group p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 hover:border-indigo-500/30 transition-all duration-300">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <div className={`p-2 rounded-lg bg-${item.color}-100 dark:bg-${item.color}-900/30 text-${item.color}-600 dark:text-${item.color}-400 group-hover:scale-110 transition-transform`}>
                                                        <item.icon className="w-4 h-4" />
                                                    </div>
                                                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{item.label}</span>
                                                </div>
                                                <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{item.value}</p>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Pass Performance */}
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                        <div className="space-y-4">
                                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Pass Analytics</h3>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="p-6 rounded-3xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white shadow-lg shadow-indigo-500/20">
                                                    <p className="text-indigo-100 text-xs font-bold uppercase tracking-widest mb-1">Total Issued</p>
                                                    <p className="text-4xl font-black">{profileData.stats.total_passes}</p>
                                                </div>
                                                <div className="p-6 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                                                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Rejection Rate</p>
                                                    <p className="text-4xl font-black text-rose-500">
                                                        {profileData.stats.total_passes > 0 ? Math.round((profileData.stats.rejected / profileData.stats.total_passes) * 100) : 0}%
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-slate-50 dark:bg-slate-800/30 rounded-3xl p-6 border border-slate-100 dark:border-slate-800">
                                            <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-4">Live Status Tracking</h4>
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-800 shadow-sm">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600">
                                                            <CheckCircle className="w-5 h-5" />
                                                        </div>
                                                        <span className="text-sm font-medium">Completed Outings</span>
                                                    </div>
                                                    <span className="font-bold text-emerald-600">{profileData.stats.completed}</span>
                                                </div>
                                                <div className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-800 shadow-sm">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 font-mono italic">
                                                            <Clock className="w-5 h-5" />
                                                        </div>
                                                        <span className="text-sm font-medium">Active Requests</span>
                                                    </div>
                                                    <span className="font-bold text-amber-600">{profileData.stats.active || 0}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'activity' && (
                                <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                                    <div className="p-6 bg-slate-50 dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
                                        <div className="flex justify-between items-center mb-6">
                                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Movement Intensity</h3>
                                            <span className="text-[10px] font-bold uppercase tracking-widest bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 px-3 py-1 rounded-full">30 Day Pulse</span>
                                        </div>
                                        <div className="h-[280px] w-full">
                                            <ResponsiveContainer width={500} height="100%" minWidth={10} minHeight={10} style={{ width: '99%' }}>
                                                <AreaChart data={processActivityData(profileData.mobilityLogs)}>
                                                    <defs>
                                                        <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                                        </linearGradient>
                                                    </defs>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                                    <XAxis dataKey="hour" stroke="#94a3b8" fontSize={11} tickFormatter={v => `${v}h`} axisLine={false} tickLine={false} />
                                                    <YAxis stroke="#94a3b8" fontSize={11} axisLine={false} tickLine={false} />
                                                    <Tooltip
                                                        contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', fontSize: '12px', color: '#fff' }}
                                                        itemStyle={{ color: '#fff' }}
                                                        labelFormatter={v => `${v}:00 Activity`}
                                                    />
                                                    <Area type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" />
                                                </AreaChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Recent Logs</h3>
                                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
                                            {profileData.mobilityLogs.length > 0 ? (
                                                <table className="w-full text-sm">
                                                    <thead className="bg-slate-50 dark:bg-slate-800/50 text-[10px] uppercase font-bold text-slate-400 tracking-widest">
                                                        <tr>
                                                            <th className="px-6 py-4 text-left">Event</th>
                                                            <th className="px-6 py-4 text-left">Category</th>
                                                            <th className="px-6 py-4 text-right">Timestamp</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                                        {profileData.mobilityLogs.slice(0, 10).map((log, i) => (
                                                            <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                                                <td className="px-6 py-4">
                                                                    <div className="flex items-center gap-3 font-semibold text-slate-900 dark:text-white">
                                                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${log.action === 'entry' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'
                                                                            }`}>
                                                                            {log.action === 'entry' ? <ArrowUpRight className="w-4 h-4 rotate-180" /> : <ArrowUpRight className="w-4 h-4" />}
                                                                        </div>
                                                                        <span className="capitalize text-xs">{log.action}</span>
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-4">
                                                                    <span className="text-[10px] font-bold px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 uppercase tracking-widest">{log.request_type}</span>
                                                                </td>
                                                                <td className="px-6 py-4 text-right text-xs text-slate-500 font-mono">
                                                                    {new Date(log.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            ) : (
                                                <div className="p-12 text-center text-slate-400 italic">Zero mobility events recorded recently.</div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'history' && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Pass Ledger</h3>
                                        <div className="flex gap-2">
                                            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 bg-slate-50 dark:bg-slate-800 px-3 py-1 rounded-lg">
                                                <div className="w-2 h-2 rounded-full bg-emerald-500" /> COMPLETED
                                            </div>
                                            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 bg-slate-50 dark:bg-slate-800 px-3 py-1 rounded-lg">
                                                <div className="w-2 h-2 rounded-full bg-amber-500" /> PENDING/ACTIVE
                                            </div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 gap-4">
                                        {profileData.requests.map((req, i) => (
                                            <div key={i} className="group p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl hover:border-indigo-500/50 hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-300 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-xs ${req.type === 'vacation' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'
                                                        }`}>
                                                        {req.type.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-0.5">
                                                            <span className="font-bold text-slate-900 dark:text-white capitalize">{req.type}</span>
                                                            <span className="text-xs text-slate-400 font-medium">• {new Date(req.created_at).toLocaleDateString()}</span>
                                                        </div>
                                                        <p className="text-xs text-slate-500 line-clamp-1">{req.reason}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-6">
                                                    <div className="text-right hidden sm:block">
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Timeline</p>
                                                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                                            {new Date(req.departure_date).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                                            <span className="mx-1">→</span>
                                                            {new Date(req.return_date).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                                        </p>
                                                    </div>
                                                    <span className={`px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest ${req.status === 'completed' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                                                        req.status === 'rejected' ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                                                            'bg-amber-50 text-amber-600 border border-amber-100'
                                                        }`}>
                                                        {req.status.replace('_', ' ')}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'trust' && (
                                <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                                    <div className="p-8 rounded-[40px] bg-indigo-600 text-white shadow-2xl shadow-indigo-500/30 flex flex-col sm:flex-row items-center justify-between gap-6 relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                                        <div className="relative z-10">
                                            <p className="text-indigo-100 text-sm font-bold uppercase tracking-[0.2em] mb-2">Behavioral Integrity Score</p>
                                            <h3 className="text-6xl font-black">{profileData.student.trust_score}</h3>
                                            <p className="mt-4 text-xs font-bold text-indigo-200 inline-flex items-center gap-2 bg-indigo-500/50 px-4 py-2 rounded-full">
                                                <ShieldAlert className="w-3 h-3" /> SECURITY RATING: {profileData.student.trust_score >= 80 ? 'SUPREME' : 'MONITORED'}
                                            </p>
                                        </div>
                                        <Award className="w-32 h-32 text-white/10 relative z-10" />
                                    </div>

                                    <div className="space-y-6">
                                        <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">Audit Trail</h4>
                                        <div className="relative space-y-6 before:absolute before:left-6 before:top-2 before:bottom-2 before:w-px before:bg-slate-200 dark:before:bg-slate-800">
                                            {profileData.trustHistory.length > 0 ? (
                                                profileData.trustHistory.map((h, i) => (
                                                    <div key={i} className="relative pl-14">
                                                        <div className={`absolute left-0 w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-sm shadow-sm ${h.new_score > h.old_score ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
                                                            }`}>
                                                            {h.new_score}
                                                        </div>
                                                        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl group hover:border-indigo-500/50 transition-colors duration-300">
                                                            <div className="flex justify-between items-start mb-1">
                                                                <p className="text-sm font-bold text-slate-900 dark:text-white">{h.reason}</p>
                                                                <span className="text-[10px] font-medium text-slate-400">{new Date(h.created_at).toLocaleDateString()}</span>
                                                            </div>
                                                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
                                                                System Adjustment: {h.old_score} → {h.new_score}
                                                            </p>
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="pl-14 text-slate-400 text-sm italic py-4">No security adjustments logged for this profile.</div>
                                            )}
                                        </div>
                                    </div>
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
                        autoComplete="new-password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-400 transition-all"
                        placeholder="New Secure Password"
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
                            <div className="col-span-2">
                                <label className="block text-xs font-medium text-slate-500 mb-2">Profile Image</label>
                                <div className="flex items-center gap-4">
                                    <div className="relative w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden border border-slate-200 dark:border-slate-600 flex-shrink-0">
                                        {previewUrl ? (
                                            <div className="relative w-full h-full group">
                                                <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                                                <button
                                                    type="button"
                                                    onClick={() => { setSelectedImage(null); setPreviewUrl(null); }}
                                                    className="absolute inset-0 bg-black/40 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <Trash2 className="w-6 h-6" />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-slate-400">
                                                <UserPlus className="w-6 h-6" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <input type="file" accept="image/*" onChange={handleImageChange} className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 dark:file:bg-indigo-900/30 dark:file:text-indigo-300 transition-colors cursor-pointer" />
                                        <p className="text-[10px] text-slate-400 mt-1">Supported: JPG, PNG, WEBP (Max 5MB)</p>
                                    </div>
                                </div>
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
                                    {['Hostel', 'Day Scholar'].map(t => (
                                        <button type="button" key={t} onClick={() => setNewUser({ ...newUser, student_type: t })} className={`flex-1 py-2 text-sm rounded-lg border flex items-center justify-center transition-colors ${newUser.student_type === t ? 'bg-slate-800 text-white border-slate-800 dark:bg-white dark:text-slate-900' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
                                            {t}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            {newUser.student_type?.toLowerCase() === 'hostel' && (
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
                            <input
                                type="password"
                                autoComplete="new-password"
                                required
                                value={newUser.password}
                                onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                            />
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
                            <div className="col-span-2">
                                <label className="block text-xs font-medium text-slate-500 mb-2">Update Profile Image</label>
                                <div className="flex items-center gap-4">
                                    <div className="relative w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden border border-slate-200 dark:border-slate-600 flex-shrink-0">
                                        <div className="relative w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden border border-slate-200 dark:border-slate-600 flex-shrink-0">
                                            {previewUrl ? (
                                                <div className="relative w-full h-full group">
                                                    <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                                                    <button
                                                        type="button"
                                                        onClick={() => { setSelectedImage(null); setPreviewUrl(null); }}
                                                        className="absolute inset-0 bg-black/40 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        <Trash2 className="w-6 h-6" />
                                                    </button>
                                                </div>
                                            ) : (selectedUser?.profile_image && !removeImage) ? (
                                                <div className="relative w-full h-full group">
                                                    <img src={`/img/student/${selectedUser.profile_image}`} alt="Current" className="w-full h-full object-cover" />
                                                    <button
                                                        type="button"
                                                        onClick={() => setRemoveImage(true)}
                                                        className="absolute inset-0 bg-black/40 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        <Trash2 className="w-6 h-6" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold text-xl">
                                                    {selectedUser?.name?.charAt(0) || '?'}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex-1">
                                        <input type="file" accept="image/*" onChange={handleImageChange} className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 dark:file:bg-indigo-900/30 dark:file:text-indigo-300 transition-colors cursor-pointer" />
                                        <p className="text-[10px] text-slate-400 mt-1">Upload new to replace current image</p>
                                    </div>
                                </div>
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
                                    {['Hostel', 'Day Scholar'].map(t => (
                                        <button type="button" key={t} onClick={() => setSelectedUser({ ...selectedUser, student_type: t })} className={`flex-1 py-2 text-sm rounded-lg border flex items-center justify-center transition-colors ${selectedUser?.student_type === t ? 'bg-slate-800 text-white border-slate-800 dark:bg-white dark:text-slate-900' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
                                            {t}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            {selectedUser?.student_type?.toLowerCase() === 'hostel' && (
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
