import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import {
    Search, UserPlus, Edit2, Trash2, Users, Briefcase,
    ShieldCheck, MapPin, Phone, Mail, Zap, Eye, Key, Lock
} from 'lucide-react';
import Modal from '../../components/Modal';

const AdminStaff = () => {
    const { user } = useAuth();
    const [staff, setStaff] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterRole, setFilterRole] = useState('all');
    const [filterDept, setFilterDept] = useState('all');
    const [selectedUser, setSelectedUser] = useState(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [isResetModalOpen, setIsResetModalOpen] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [newUser, setNewUser] = useState({
        name: '', email: '', password: '', role: 'staff', department_id: '', phone: '', register_number: ''
    });
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async (isSilent = false) => {
        if (!isSilent) setLoading(true);
        try {
            const [usersRes, deptsRes] = await Promise.all([
                axios.get('/api/admin/users'),
                axios.get('/api/admin/departments')
            ]);
            const staffList = usersRes.data.filter(u => ['staff', 'hod', 'warden', 'gatekeeper'].includes(u.role));
            setStaff(staffList);
            setDepartments(deptsRes.data);
        } catch (err) {
            console.error('Failed to fetch data', err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddUser = async (e) => {
        e.preventDefault();
        setLoading(true);
        const promise = axios.post('/api/admin/users', newUser);

        toast.promise(promise, {
            loading: 'Adding staff member...',
            success: () => {
                setIsAddModalOpen(false);
                setNewUser({ name: '', email: '', password: '', role: 'staff', department_id: '', phone: '', register_number: '' });
                fetchData(true);
                return 'Staff member added successfully';
            },
            error: (err) => err.response?.data?.message || 'Failed to add user'
        });

        try {
            await promise;
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateUser = async (e) => {
        e.preventDefault();
        setLoading(true);
        const promise = axios.put(`/api/admin/users/${selectedUser.id}`, selectedUser);

        toast.promise(promise, {
            loading: 'Updating staff details...',
            success: () => {
                setIsEditModalOpen(false);
                fetchData(true);
                return 'Staff details updated successfully';
            },
            error: 'Failed to update user'
        });

        try {
            await promise;
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteUser = async (id) => {
        if (user?.role === 'principal') {
            toast.error("Principals cannot delete records. Please mark as Inactive instead.");
            return;
        }
        if (!window.confirm('Delete this staff member?')) return;
        const previousStaff = [...staff];
        setStaff(staff.filter(s => s.id !== id));

        const promise = axios.delete(`/api/admin/users/${id}`);

        toast.promise(promise, {
            loading: 'Deleting staff member...',
            success: 'Staff member deleted',
            error: (err) => {
                setStaff(previousStaff);
                return 'Failed to delete user';
            }
        });

        try {
            await promise;
        } catch (err) {
            // Handled by toast
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        setLoading(true);
        const promise = axios.post(`/api/admin/users/reset-password/${selectedUser.id}`, { newPassword });

        toast.promise(promise, {
            loading: 'Resetting password...',
            success: () => {
                setIsResetModalOpen(false);
                setNewPassword('');
                return 'Password reset successfully';
            },
            error: 'Failed to reset password'
        });

        try {
            await promise;
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const filteredStaff = staff.filter(s =>
        (s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (s.register_number && s.register_number.toLowerCase().includes(searchTerm.toLowerCase()))) &&
        (filterRole === 'all' || s.role === filterRole) &&
        (filterDept === 'all' || s.department_id === parseInt(filterDept))
    );

    // Pagination Logic
    const totalPages = Math.ceil(filteredStaff.length / itemsPerPage);
    const paginatedStaff = filteredStaff.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, filterRole, filterDept]);

    const stats = {
        total: filteredStaff.length,
        hods: filteredStaff.filter(s => s.role === 'hod').length,
        wardens: filteredStaff.filter(s => s.role === 'warden').length,
        gatekeepers: filteredStaff.filter(s => s.role === 'gatekeeper').length
    };

    const getRoleConfig = (role) => {
        switch (role) {
            case 'admin': return { icon: ShieldCheck, color: 'indigo', label: 'Admin' };
            case 'principal': return { icon: Briefcase, color: 'violet', label: 'Principal' };
            case 'hod': return { icon: Briefcase, color: 'orange', label: 'HOD' };
            case 'warden': return { icon: ShieldCheck, color: 'purple', label: 'Warden' };
            case 'staff': return { icon: Users, color: 'blue', label: 'Staff' };
            case 'gatekeeper': return { icon: Zap, color: 'teal', label: 'Gatekeeper' };
            default: return { icon: Users, color: 'gray', label: role };
        }
    };

    return (
        <div className="space-y-6 pb-20">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Staff</h1>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Manage staff members</p>
                </div>
                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
                >
                    <UserPlus className="w-4 h-4" />
                    <span className="text-sm font-medium">Add Staff</span>
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                    { label: 'Total Staff', value: stats.total, icon: Users, color: 'blue' },
                    { label: 'HODs', value: stats.hods, icon: Briefcase, color: 'orange' },
                    { label: 'Wardens', value: stats.wardens, icon: ShieldCheck, color: 'purple' },
                    { label: 'Gatekeepers', value: stats.gatekeepers, icon: Zap, color: 'teal' },
                ].map((item) => {
                    const Icon = item.icon;
                    return (
                        <div key={item.label} className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                            <Icon className={`w-5 h-5 mb-2 text-${item.color}-500`} />
                            <span className="text-2xl font-bold text-slate-900 dark:text-white block">{item.value}</span>
                            <span className="text-xs text-slate-600 dark:text-slate-400">{item.label}</span>
                        </div>
                    );
                })}
            </div>

            {/* Search & Filters */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search by name, ID, or email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                </div>
                <select
                    value={filterRole}
                    onChange={(e) => setFilterRole(e.target.value)}
                    className="px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                    <option value="all">All Roles</option>
                    <option value="hod">HODs</option>
                    <option value="warden">Wardens</option>
                    <option value="staff">Staff</option>
                    <option value="gatekeeper">Gatekeepers</option>
                </select>
                <select
                    value={filterDept}
                    onChange={(e) => setFilterDept(e.target.value)}
                    className="px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                    <option value="all">All Departments</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
            </div>

            {/* Staff Table */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
            ) : filteredStaff.length === 0 ? (
                <div className="py-20 text-center bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                    <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-sm text-slate-500">No staff members found</p>
                </div>
            ) : (

                <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-sm whitespace-nowrap">
                            <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                                <tr>
                                    <th className="px-6 py-4 text-left font-medium text-slate-600 dark:text-slate-400">Name</th>
                                    <th className="px-6 py-4 text-left font-medium text-slate-600 dark:text-slate-400">Role</th>
                                    <th className="px-6 py-4 text-left font-medium text-slate-600 dark:text-slate-400">Department</th>
                                    <th className="px-6 py-4 text-left font-medium text-slate-600 dark:text-slate-400">Contact</th>
                                    <th className="px-6 py-4 text-left font-medium text-slate-600 dark:text-slate-400">Status</th>
                                    <th className="px-6 py-4 text-right font-medium text-slate-600 dark:text-slate-400">Actions</th>
                                </tr >
                            </thead >
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                {paginatedStaff.map((member) => {
                                    const config = getRoleConfig(member.role);
                                    const Icon = config.icon;
                                    return (
                                        <tr key={member.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div>
                                                    <p className="font-medium text-slate-900 dark:text-white">{member.name}</p>
                                                    <p className="text-xs text-slate-500 mt-0.5">{member.register_number || 'No ID'}</p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className={`inline-flex items-center gap-1.5 px-3 py-1 bg-${config.color}-50 dark:bg-${config.color}-900/20 border border-${config.color}-200 dark:border-${config.color}-800 rounded-lg`}>
                                                    <Icon className={`w-3.5 h-3.5 text-${config.color}-600 dark:text-${config.color}-400`} />
                                                    <span className={`text-xs font-medium text-${config.color}-600 dark:text-${config.color}-400`}>
                                                        {config.label}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                                    <span className="text-slate-600 dark:text-slate-400">
                                                        {member.department_name || 'No Department'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <Mail className="w-3 h-3 text-slate-400" />
                                                        <span className="text-xs text-slate-600 dark:text-slate-400">{member.email}</span>
                                                    </div>
                                                    {member.phone && (
                                                        <div className="flex items-center gap-2">
                                                            <Phone className="w-3 h-3 text-slate-400" />
                                                            <span className="text-xs text-slate-600 dark:text-slate-400">{member.phone}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${member.status === 'active'
                                                    ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20'
                                                    : 'bg-red-50 text-red-600 dark:bg-red-900/20'
                                                    }`}>
                                                    <div className={`w-1.5 h-1.5 rounded-full ${member.status === 'active' ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                                                    {member.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <button
                                                        onClick={() => { setSelectedUser(member); setIsViewModalOpen(true); }}
                                                        className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                                                        title="View Details"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => { setSelectedUser(member); setIsEditModalOpen(true); }}
                                                        className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors"
                                                        title="Edit"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => { setSelectedUser(member); setIsResetModalOpen(true); }}
                                                        className="p-2 text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors"
                                                        title="Reset Password"
                                                    >
                                                        <Key className="w-4 h-4" />
                                                    </button>
                                                    <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1"></div>
                                                    <button
                                                        onClick={() => handleDeleteUser(member.id)}
                                                        className={`p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors ${user?.role === 'principal' ? 'hidden' : ''}`}
                                                        title="Delete"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table >
                    </div >

                    {/* Pagination Controls */}
                    {
                        !loading && filteredStaff.length > 0 && (
                            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50">
                                <div className="text-sm text-slate-500">
                                    Showing <span className="font-medium text-slate-900 dark:text-white">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-medium text-slate-900 dark:text-white">{Math.min(currentPage * itemsPerPage, filteredStaff.length)}</span> of <span className="font-medium text-slate-900 dark:text-white">{filteredStaff.length}</span> staff members
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
                        )
                    }
                </div >
            )}

            {/* Add Staff Modal */}
            <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Add Staff Member">
                <form onSubmit={handleAddUser} className="space-y-4 p-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="sm:col-span-2">
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Name</label>
                            <input
                                type="text" required value={newUser.name}
                                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                placeholder="John Doe"
                            />
                        </div>
                        <div className="sm:col-span-2">
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">ID Number</label>
                            <input
                                type="text" required value={newUser.register_number}
                                onChange={(e) => setNewUser({ ...newUser, register_number: e.target.value })}
                                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                placeholder="EMP123456"
                            />
                        </div>
                        <div className="sm:col-span-2">
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Email</label>
                            <input
                                type="email" required value={newUser.email}
                                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                placeholder="john.doe@university.edu"
                            />
                        </div>
                        <div className="sm:col-span-2">
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Password</label>
                            <input
                                type="password" required value={newUser.password}
                                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                placeholder="••••••••"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Role</label>
                            <select
                                value={newUser.role}
                                onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            >
                                <option value="staff">Staff</option>
                                <option value="hod">HOD</option>
                                <option value="warden">Warden</option>
                                <option value="gatekeeper">Gatekeeper</option>

                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Department</label>
                            <select
                                value={newUser.department_id}
                                onChange={(e) => setNewUser({ ...newUser, department_id: e.target.value })}
                                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            >
                                <option value="">No Department</option>
                                {departments.map(d => (
                                    <option key={d.id} value={d.id}>{d.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="sm:col-span-2">
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Phone</label>
                            <input
                                type="tel" value={newUser.phone}
                                onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                placeholder="+1 (555) 000-0000"
                            />
                        </div>
                    </div>
                    <div className="flex gap-3 pt-4">
                        <button
                            type="button" onClick={() => setIsAddModalOpen(false)}
                            className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                        >
                            Add Staff
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Edit Staff Modal */}
            <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Staff Member">
                <form onSubmit={handleUpdateUser} className="space-y-4 p-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="sm:col-span-2">
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">ID Number</label>
                            <input
                                type="text" value={selectedUser?.register_number || ''}
                                onChange={(e) => setSelectedUser({ ...selectedUser, register_number: e.target.value })}
                                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            />
                        </div>
                        <div className="sm:col-span-2">
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Name</label>
                            <input
                                type="text" value={selectedUser?.name || ''}
                                onChange={(e) => setSelectedUser({ ...selectedUser, name: e.target.value })}
                                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            />
                        </div>
                        <div className="sm:col-span-2">
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Email</label>
                            <input
                                type="email" value={selectedUser?.email || ''}
                                onChange={(e) => setSelectedUser({ ...selectedUser, email: e.target.value })}
                                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Role</label>
                            <select
                                value={selectedUser?.role || 'staff'}
                                onChange={(e) => setSelectedUser({ ...selectedUser, role: e.target.value })}
                                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            >
                                <option value="staff">Staff</option>
                                <option value="hod">HOD</option>
                                <option value="warden">Warden</option>
                                <option value="gatekeeper">Gatekeeper</option>

                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Status</label>
                            <select
                                value={selectedUser?.status || 'active'}
                                onChange={(e) => setSelectedUser({ ...selectedUser, status: e.target.value })}
                                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            >
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                                <option value="suspended">Suspended</option>
                            </select>
                        </div>
                        <div className="sm:col-span-2">
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Department</label>
                            <select
                                value={selectedUser?.department_id || ''}
                                onChange={(e) => setSelectedUser({ ...selectedUser, department_id: e.target.value ? parseInt(e.target.value) : null })}
                                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            >
                                <option value="">No Department</option>
                                {departments.map(d => (
                                    <option key={d.id} value={d.id}>{d.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="sm:col-span-2">
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Phone</label>
                            <div className="relative">
                                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="tel" value={selectedUser?.phone || ''} placeholder="+1 (555) 000-0000"
                                    onChange={(e) => setSelectedUser({ ...selectedUser, phone: e.target.value })}
                                    className="w-full pl-12 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                />
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-3 pt-4">
                        <button
                            type="button" onClick={() => setIsEditModalOpen(false)}
                            className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                        >
                            Update
                        </button>
                    </div>
                </form>
            </Modal>

            {/* View Details Modal */}
            <Modal isOpen={isViewModalOpen} onClose={() => setIsViewModalOpen(false)} title="Staff Details">
                <div className="space-y-6 p-4">
                    {selectedUser && (
                        <>
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center text-indigo-600 dark:text-indigo-400 text-2xl font-bold">
                                    {selectedUser.name.charAt(0)}
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">{selectedUser.name}</h3>
                                    <p className="text-slate-500 dark:text-slate-400">{selectedUser.email}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Role</p>
                                    <p className="font-medium text-slate-900 dark:text-white capitalize">{selectedUser.role}</p>
                                </div>
                                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Status</p>
                                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${selectedUser.status === 'active'
                                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                        : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
                                        }`}>
                                        {selectedUser.status}
                                    </span>
                                </div>
                                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Department</p>
                                    <p className="font-medium text-slate-900 dark:text-white">{selectedUser.department_name || 'N/A'}</p>
                                </div>
                                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Employee ID</p>
                                    <p className="font-medium text-slate-900 dark:text-white">{selectedUser.register_number || 'N/A'}</p>
                                </div>
                                <div className="col-span-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Phone</p>
                                    <p className="font-medium text-slate-900 dark:text-white">{selectedUser.phone || 'N/A'}</p>
                                </div>
                            </div>
                        </>
                    )}
                    <div className="flex justify-end pt-2">
                        <button
                            onClick={() => setIsViewModalOpen(false)}
                            className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Reset Password Modal */}
            <Modal isOpen={isResetModalOpen} onClose={() => setIsResetModalOpen(false)} title="Reset Password">
                <form onSubmit={handleResetPassword} className="space-y-4 p-4">
                    <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-lg flex gap-3 text-amber-800 dark:text-amber-200">
                        <Lock className="w-5 h-5 flex-shrink-0" />
                        <p className="text-sm">
                            This will immediately change the password for <strong>{selectedUser?.name}</strong>.
                            They will need to use this new password to log in.
                        </p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">New Password</label>
                        <input
                            type="password"
                            required
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            placeholder="Enter new secure password"
                            minLength={6}
                        />
                    </div>
                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={() => setIsResetModalOpen(false)}
                            className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-4 py-2 text-sm font-medium bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors flex items-center justify-center gap-2"
                        >
                            <Key className="w-4 h-4" />
                            Reset Password
                        </button>
                    </div>
                </form>
            </Modal>
        </div >
    );
};

export default AdminStaff;
