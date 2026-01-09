import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
    Plus, Edit2, Trash2, Building2, Search, Users, Shield, Lock, Unlock, X
} from 'lucide-react';
import Modal from '../../components/Modal';

const AdminDepartments = () => {
    const [departments, setDepartments] = useState([]);
    const [restrictions, setRestrictions] = useState([]);
    const [hods, setHods] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [restrictionSearch, setRestrictionSearch] = useState('');
    const [activeTab, setActiveTab] = useState('departments');

    const [modals, setModals] = useState({
        dept: false,
        hod: false,
        restriction: false
    });
    const [editingRestrictionId, setEditingRestrictionId] = useState(null);

    const [formData, setFormData] = useState({
        dept: { name: '', code: '', description: '', hod_id: '' },
        restriction: { department_id: '', academic_year: '', reason: '' }
    });

    const [selectedId, setSelectedId] = useState(null);
    const [isEditing, setIsEditing] = useState(false);

    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: null,
        loading: false
    });

    useEffect(() => {
        fetchData();
        fetchHods();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [deptRes, restRes] = await Promise.all([
                axios.get('/api/admin/departments'),
                axios.get('/api/admin/departments/restrictions')
            ]);
            setDepartments(deptRes.data);
            setRestrictions(restRes.data);
        } catch (err) {
            console.error('Failed to fetch data');
            toast.error('Failed to load departments');
        } finally {
            setLoading(false);
        }
    };

    const fetchHods = async () => {
        try {
            const res = await axios.get('/api/admin/users?role=hod');
            setHods(res.data);
        } catch (err) {
            console.error('Failed to fetch HODs');
        }
    };

    const handleSubmitDept = async (e) => {
        e.preventDefault();
        setLoading(true);
        const promise = isEditing
            ? axios.put(`/api/admin/departments/${selectedId}`, formData.dept)
            : axios.post('/api/admin/departments', formData.dept);

        toast.promise(promise, {
            loading: isEditing ? 'Updating department...' : 'Creating department...',
            success: () => {
                setModals(m => ({ ...m, dept: false }));
                setFormData({ ...formData, dept: { name: '', code: '', description: '', hod_id: '' } });
                fetchData();
                return isEditing ? 'Department updated successfully' : 'Department created successfully';
            },
            error: err => err.response?.data?.message || 'Failed to save department'
        });

        try {
            await promise;
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteDept = (id) => {
        setConfirmModal({
            isOpen: true,
            title: 'Delete Department',
            message: 'Are you sure you want to delete this department? This action cannot be undone.',
            onConfirm: async () => {
                const toastId = toast.loading('Deleting department...');
                try {
                    await axios.delete(`/api/admin/departments/${id}`);
                    toast.success('Department deleted successfully', { id: toastId });
                    fetchData();
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                } catch (err) {
                    console.error(err);
                    toast.error(err.response?.data?.message || 'Failed to delete department', { id: toastId });
                }
            }
        });
    };

    const handleAssignHOD = async (e) => {
        e.preventDefault();
        const promise = axios.put(`/api/admin/departments/${selectedId}/hod`, { hod_id: formData.dept.hod_id });

        toast.promise(promise, {
            loading: 'Assigning HOD...',
            success: () => {
                setModals(m => ({ ...m, hod: false }));
                fetchData();
                return 'HOD assigned successfully';
            },
            error: err => err.response?.data?.message || 'Failed to assign HOD'
        });

        try {
            await promise;
        } catch (err) {
            console.error(err);
        }
    };

    const handleRemoveHOD = (id) => {
        setConfirmModal({
            isOpen: true,
            title: 'Remove HOD',
            message: 'Are you sure you want to remove the HOD from this department?',
            onConfirm: async () => {
                const toastId = toast.loading('Removing HOD...');
                try {
                    await axios.delete(`/api/admin/departments/${id}/hod`);
                    toast.success('HOD removed successfully', { id: toastId });
                    fetchData();
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                } catch (err) {
                    console.error(err);
                    toast.error(err.response?.data?.message || 'Failed to remove HOD', { id: toastId });
                }
            }
        });
    };

    const handleSubmitRestriction = async (e) => {
        e.preventDefault();

        const promise = editingRestrictionId
            ? axios.put(`/api/admin/departments/restrictions/${editingRestrictionId}`, formData.restriction)
            : axios.post('/api/admin/departments/restrictions', formData.restriction);

        toast.promise(promise, {
            loading: editingRestrictionId ? 'Updating restriction...' : 'Adding restriction...',
            success: () => {
                setModals(m => ({ ...m, restriction: false }));
                setFormData({ ...formData, restriction: { department_id: '', academic_year: '', reason: '' } });
                setEditingRestrictionId(null);
                fetchData();
                return editingRestrictionId ? 'Restriction updated successfully' : 'Restriction added successfully';
            },
            error: err => err.response?.data?.message || 'Failed to save restriction'
        });

        try {
            await promise;
        } catch (err) {
            console.error(err);
        }
    };

    const handleRemoveRestriction = (id) => {
        setConfirmModal({
            isOpen: true,
            title: 'Remove Restriction',
            message: 'Are you sure you want to remove this restriction?',
            onConfirm: async () => {
                const toastId = toast.loading('Removing restriction...');
                try {
                    await axios.delete(`/api/admin/departments/restrictions/${id}`);
                    toast.success('Restriction removed successfully', { id: toastId });
                    fetchData();
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                } catch (err) {
                    console.error(err);
                    toast.error(err.response?.data?.message || 'Failed to remove restriction', { id: toastId });
                }
            }
        });
    };

    const filteredDepartments = departments.filter(d =>
        d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.code.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredRestrictions = restrictions.filter(r =>
        r.department_name.toLowerCase().includes(restrictionSearch.toLowerCase()) ||
        r.reason.toLowerCase().includes(restrictionSearch.toLowerCase()) ||
        r.academic_year.includes(restrictionSearch)
    );

    return (
        <div className="space-y-6 pb-20">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Departments</h1>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Manage academic departments</p>
                </div>
                <button
                    onClick={() => {
                        setIsEditing(false);
                        setFormData({ ...formData, dept: { name: '', code: '', description: '', hod_id: '' } });
                        setModals(m => ({ ...m, dept: true }));
                    }}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" />
                    <span className="text-sm font-medium">Add Department</span>
                </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700">
                <button
                    onClick={() => setActiveTab('departments')}
                    className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${activeTab === 'departments'
                        ? 'border-indigo-600 text-indigo-600'
                        : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                >
                    Departments
                </button>
                <button
                    onClick={() => setActiveTab('restrictions')}
                    className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${activeTab === 'restrictions'
                        ? 'border-indigo-600 text-indigo-600'
                        : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                >
                    Restrictions
                </button>
            </div>

            {/* Search */}
            {activeTab === 'departments' ? (
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search departments..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                </div>
            ) : (
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search restrictions by department, year or reason..."
                        value={restrictionSearch}
                        onChange={(e) => setRestrictionSearch(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                </div>
            )}

            {/* Content */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
            ) : activeTab === 'departments' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredDepartments.map(dept => (
                        <div key={dept.id} className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                                        <Building2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-slate-900 dark:text-white">{dept.name}</h3>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => {
                                            setSelectedId(dept.id);
                                            setIsEditing(true);
                                            setFormData({ ...formData, dept: { name: dept.name, code: '', description: dept.description || '', hod_id: dept.hod_id || '' } });
                                            setModals(m => ({ ...m, dept: true }));
                                        }}
                                        className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDeleteDept(dept.id)}
                                        className="p-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            {dept.description && (
                                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">{dept.description}</p>
                            )}

                            <div className="pt-4 border-t border-slate-200 dark:border-slate-700 space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-slate-600 dark:text-slate-400">HOD</span>
                                    {dept.hod_name ? (
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-medium text-slate-900 dark:text-white">{dept.hod_name}</span>
                                            <button
                                                onClick={() => handleRemoveHOD(dept.id)}
                                                className="p-1 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded transition-colors"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => {
                                                setSelectedId(dept.id);
                                                setFormData({ ...formData, dept: { ...formData.dept, hod_id: '' } });
                                                setModals(m => ({ ...m, hod: true }));
                                            }}
                                            className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                                        >
                                            Assign
                                        </button>
                                    )}
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-slate-600 dark:text-slate-400">Students</span>
                                    <span className="text-sm font-medium text-slate-900 dark:text-white">{dept.student_count || 0}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="flex justify-end">
                        <button
                            onClick={() => {
                                setEditingRestrictionId(null);
                                setFormData(prev => ({ ...prev, restriction: { department_id: '', academic_year: '', reason: '' } }));
                                setModals(m => ({ ...m, restriction: true }));
                            }}
                            className="px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors flex items-center gap-2"
                        >
                            <Shield className="w-4 h-4" />
                            <span className="text-sm font-medium">Add Restriction</span>
                        </button>
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                                <tr>
                                    <th className="px-6 py-4 text-left font-medium text-slate-600 dark:text-slate-400">Department</th>
                                    <th className="px-6 py-4 text-left font-medium text-slate-600 dark:text-slate-400">Academic Year</th>
                                    <th className="px-6 py-4 text-left font-medium text-slate-600 dark:text-slate-400">Reason</th>
                                    <th className="px-6 py-4 text-right font-medium text-slate-600 dark:text-slate-400">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                {filteredRestrictions.length === 0 ? (
                                    <tr>
                                        <td colSpan="4" className="px-6 py-12 text-center text-sm text-slate-500">
                                            No restrictions found
                                        </td>
                                    </tr>
                                ) : (
                                    filteredRestrictions.map(rest => (
                                        <tr key={rest.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                                            <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">{rest.department_name}</td>
                                            <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{rest.academic_year}</td>
                                            <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{rest.reason}</td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => {
                                                            setEditingRestrictionId(rest.id);
                                                            setFormData({
                                                                ...formData,
                                                                restriction: {
                                                                    department_id: rest.department_id,
                                                                    academic_year: rest.academic_year,
                                                                    reason: rest.reason
                                                                }
                                                            });
                                                            setModals(m => ({ ...m, restriction: true }));
                                                        }}
                                                        className="p-1 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded transition-colors"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleRemoveRestriction(rest.id)}
                                                        className="p-1 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded transition-colors"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Department Modal */}
            <Modal
                isOpen={modals.dept}
                onClose={() => setModals(m => ({ ...m, dept: false }))}
                title={isEditing ? 'Edit Department' : 'Add Department'}
            >
                <form onSubmit={handleSubmitDept} className="space-y-4 p-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Name</label>
                        <input
                            type="text"
                            required
                            value={formData.dept.name}
                            onChange={(e) => setFormData({ ...formData, dept: { ...formData.dept, name: e.target.value } })}
                            className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Description</label>
                        <textarea
                            rows={3}
                            value={formData.dept.description}
                            onChange={(e) => setFormData({ ...formData, dept: { ...formData.dept, description: e.target.value } })}
                            className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                        />
                    </div>
                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={() => setModals(m => ({ ...m, dept: false }))}
                            className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                        >
                            {isEditing ? 'Update' : 'Create'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* HOD Assignment Modal */}
            <Modal
                isOpen={modals.hod}
                onClose={() => setModals(m => ({ ...m, hod: false }))}
                title="Assign HOD"
            >
                <form onSubmit={handleAssignHOD} className="space-y-4 p-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Select HOD</label>
                        <select
                            required
                            value={formData.dept.hod_id}
                            onChange={(e) => setFormData({ ...formData, dept: { ...formData.dept, hod_id: e.target.value } })}
                            className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        >
                            <option value="">Select HOD</option>
                            {hods.map(hod => (
                                <option key={hod.id} value={hod.id}>{hod.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={() => setModals(m => ({ ...m, hod: false }))}
                            className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                        >
                            Assign
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Restriction Modal */}
            <Modal
                isOpen={modals.restriction}
                onClose={() => {
                    setModals(m => ({ ...m, restriction: false }));
                    setEditingRestrictionId(null);
                    setFormData(prev => ({ ...prev, restriction: { department_id: '', academic_year: '', reason: '' } }));
                }}
                title={editingRestrictionId ? "Edit Restriction" : "Add Restriction"}
            >
                <form onSubmit={handleSubmitRestriction} className="space-y-4 p-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Department</label>
                        <select
                            required
                            value={formData.restriction.department_id}
                            onChange={(e) => setFormData({ ...formData, restriction: { ...formData.restriction, department_id: e.target.value } })}
                            className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        >
                            <option value="">Select Department</option>
                            {departments.map(dept => (
                                <option key={dept.id} value={dept.id}>{dept.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Academic Year</label>
                        <input
                            type="text"
                            required
                            placeholder="e.g., 2024-2025"
                            value={formData.restriction.academic_year}
                            onChange={(e) => setFormData({ ...formData, restriction: { ...formData.restriction, academic_year: e.target.value } })}
                            className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Reason</label>
                        <textarea
                            required
                            rows={3}
                            value={formData.restriction.reason}
                            onChange={(e) => setFormData({ ...formData, restriction: { ...formData.restriction, reason: e.target.value } })}
                            className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                        />
                    </div>
                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={() => {
                                setModals(m => ({ ...m, restriction: false }));
                                setEditingRestrictionId(null);
                            }}
                            className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-4 py-2 text-sm font-medium bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors"
                        >
                            {editingRestrictionId ? 'Update Restriction' : 'Add Restriction'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Confirmation Modal */}
            <Modal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                title={confirmModal.title}
            >
                <div className="p-4 space-y-4">
                    <p className="text-slate-600 dark:text-slate-400">{confirmModal.message}</p>
                    <div className="flex gap-3 pt-2">
                        <button
                            onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                            className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={confirmModal.onConfirm}
                            className="flex-1 px-4 py-2 text-sm font-medium bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors"
                        >
                            Confirm
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default AdminDepartments;
