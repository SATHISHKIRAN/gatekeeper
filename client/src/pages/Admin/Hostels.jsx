import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
    Plus, Edit2, Trash2, Home, Search, Users, Activity,
    Building, UserPlus, ChevronRight, UserMinus, ArrowLeft,
    Monitor, LayoutGrid, List, UserCheck, ArrowRight, UserX
} from 'lucide-react';
import Modal from '../../components/Modal';

const AdminHostels = () => {
    // --- State ---
    const [view, setView] = useState('list'); // 'list' | 'details'
    const [mode, setMode] = useState('allocations'); // Default to allocations
    const [selectedHostelId, setSelectedHostelId] = useState(null);

    const [hostels, setHostels] = useState([]);

    const [wardens, setWardens] = useState([]);
    const [loading, setLoading] = useState(true);

    const [unassignedStudents, setUnassignedStudents] = useState([]);
    const [hostelStudents, setHostelStudents] = useState([]);

    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState('All');

    // Allocation Filters
    const [allocFilters, setAllocFilters] = useState({
        unassigned: { search: '', year: 'All' },
        assigned: { search: '', year: 'All' },
    });

    // Modals
    const [modals, setModals] = useState({
        hostel: false,

    });

    // Forms
    const [formData, setFormData] = useState({
        hostel: { name: '', type: 'Boys', description: '', warden_id: '', capacity: 0 },
    });

    const [mobileTab, setMobileTab] = useState('unassigned');

    // Stats
    const [stats, setStats] = useState({
        total_blocks: 0,
        total_capacity: 0,
        available_slots: 0,
        occupied_slots: 0
    });

    // --- Derived State ---
    const selectedHostel = useMemo(() =>
        hostels.find(h => h.id === selectedHostelId),
        [hostels, selectedHostelId]);

    const filteredHostels = useMemo(() => {
        return hostels.filter(h => {
            const matchesSearch = h.name.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesType = filterType === 'All' || h.type === filterType;
            return matchesSearch && matchesType;
        });
    }, [hostels, searchQuery, filterType]);





    // --- Effects ---
    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        if (view === 'list') {
            fetchData();
        }
    }, [view]);

    useEffect(() => {
        if (selectedHostelId) {
            // fetchRooms(selectedHostelId); // Removed
            if (mode === 'allocations') {
                fetchHostelStudents(selectedHostelId);
            }
        }
    }, [selectedHostelId, mode]);

    useEffect(() => {
        if (mode === 'allocations') {
            fetchUnassignedStudents();
        }
    }, [mode]);

    // --- Actions ---
    const fetchData = async () => {
        try {
            const [hostelsRes, statsRes, wardensRes] = await Promise.all([
                axios.get('/api/hostels'),
                axios.get('/api/hostels/stats'),
                axios.get('/api/admin/users?role=warden')
            ]);

            setHostels(hostelsRes.data);
            setStats(statsRes.data);
            setWardens(wardensRes.data || []);
        } catch (err) {
            console.error('Failed to fetch data', err);
        } finally {
            setLoading(false);
        }
    };



    const fetchUnassignedStudents = async () => {
        try {
            const res = await axios.get('/api/hostels/unassigned-students');
            setUnassignedStudents(res.data);
        } catch (err) {
            console.error('Failed to fetch unassigned students');
        }
    };

    const fetchHostelStudents = async (hostelId) => {
        try {
            const res = await axios.get(`/api/hostels/students/${hostelId}`);
            setHostelStudents(res.data);
        } catch (err) {
            console.error('Failed to fetch hostel students');
        }
    };

    const handleAssignHostel = async (studentId) => {
        const promise = axios.post('/api/hostels/assign-student', { student_id: studentId, hostel_id: selectedHostelId });

        toast.promise(promise, {
            loading: 'Assigning student...',
            success: () => {
                fetchUnassignedStudents();
                fetchHostelStudents(selectedHostelId);
                return 'Student assigned successfully';
            },
            error: 'Failed to assign student'
        });

        try {
            await promise;
        } catch (err) {
            console.error(err);
        }
    };

    const handleRemoveHostel = async (studentId) => {
        // if (!window.confirm('Remove student from this hostel?')) return;
        const promise = axios.post('/api/hostels/remove-student', { student_id: studentId });

        toast.promise(promise, {
            loading: 'Removing student...',
            success: () => {
                fetchUnassignedStudents();
                fetchHostelStudents(selectedHostelId);
                return 'Student removed from hostel';
            },
            error: (err) => 'Failed to remove: ' + (err.response?.data?.message || err.message)
        });

        try {
            await promise;
        } catch (err) {
            console.error(err);
        }
    };



    const toggleModal = (key, val) => setModals(p => ({ ...p, [key]: val }));

    const handleCreateHostel = async (e) => {
        e.preventDefault();
        const promise = formData.hostel.id
            ? axios.put(`/api/hostels/${formData.hostel.id}`, { ...formData.hostel, warden_id: formData.hostel.warden_id || null })
            : axios.post('/api/hostels', formData.hostel);

        toast.promise(promise, {
            loading: formData.hostel.id ? 'Updating hostel...' : 'Creating hostel...',
            success: () => {
                toggleModal('hostel', false);
                setFormData(p => ({ ...p, hostel: { name: '', type: 'Boys', description: '', warden_id: '', capacity: 0 } }));
                fetchData();
                return formData.hostel.id ? 'Hostel updated successfully' : 'Hostel created successfully';
            },
            error: 'Failed to save hostel'
        });

        try {
            await promise;
        } catch (err) {
            console.error(err);
        }
    };



    const handleUnassignWarden = async (hostel) => {
        if (!window.confirm(`Remove warden from ${hostel.name}?`)) return;

        const promise = axios.put(`/api/hostels/${hostel.id}`, { ...hostel, warden_id: null });

        toast.promise(promise, {
            loading: 'Removing warden...',
            success: () => {
                fetchData();
                return 'Warden removed successfully';
            },
            error: 'Warden removal failed'
        });

        try {
            await promise;
        } catch (err) {
            console.error(err);
        }
    };

    const handleDeleteHostel = async (id) => {
        const promise = axios.delete(`/api/hostels/${id}`);

        toast.promise(promise, {
            loading: 'Deleting hostel block...',
            success: () => {
                fetchData();
                return 'Hostel deleted & students unassigned';
            },
            error: 'Failed to delete hostel'
        });

        try {
            await promise;
        } catch (error) {
            console.error(error);
        }
    };

    // --- Views ---

    const StatsCard = ({ label, value, icon: Icon, color }) => (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all">
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
                    <h3 className="text-3xl font-bold text-slate-900 dark:text-white mt-2">{value}</h3>
                </div>
                <div className={`p-3 bg-${color}-50 dark:bg-${color}-900/20 rounded-lg`}>
                    <Icon className={`w-6 h-6 text-${color}-600 dark:text-${color}-400`} />
                </div>
            </div>
        </div>
    );

    const HostelCard = ({ hostel }) => (
        <div
            onClick={() => { setSelectedHostelId(hostel.id); setView('details'); }}
            className="group bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden cursor-pointer hover:border-indigo-500 dark:hover:border-indigo-500 transition-all shadow-sm hover:shadow-lg"
        >
            <div className={`h-2 w-full ${hostel.type === 'Boys' ? 'bg-blue-500' : 'bg-pink-500'}`} />
            <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors">
                            {hostel.name}
                        </h3>
                        <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mt-1">
                            {hostel.type} Hostel
                        </p>
                    </div>
                    <div className="flex gap-1">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setFormData(p => ({ ...p, hostel: { ...hostel, warden_id: hostel.warden_id || '', capacity: hostel.capacity || 0 } }));
                                toggleModal('hostel', true);
                            }}
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                            title="Edit Hostel"
                        >
                            <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                if (window.confirm(`Are you sure you want to delete ${hostel.name}? Assigned students will be moved to 'Unassigned'.`)) {
                                    handleDeleteHostel(hostel.id);
                                }
                            }}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            title="Delete Hostel"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <div className="space-y-4">
                    <div>
                        <div className="flex justify-between text-sm mb-1.5">
                            <span className="text-slate-600 dark:text-slate-400">Occupancy</span>
                            <span className="font-medium text-slate-900 dark:text-white">
                                {hostel.active_students} / {hostel.capacity || 'Inf'}
                            </span>
                        </div>
                        <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all duration-500 ${hostel.active_students > (hostel.capacity || 9999) ? 'bg-red-500' : 'bg-indigo-500'
                                    }`}
                                style={{ width: `${Math.min(((hostel.active_students / (hostel.capacity || 1)) * 100), 100)}%` }}
                            />
                        </div>
                    </div>

                    <div className="flex justify-between items-center py-3 border-t border-slate-100 dark:border-slate-700">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                                <Users className="w-4 h-4 text-slate-500" />
                            </div>
                            <div className="text-sm">
                                <p className="text-slate-900 dark:text-white font-medium">{hostel.active_students}</p>
                                <p className="text-xs text-slate-500">Students</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
                                {hostel.warden_name || 'No Warden'}
                            </p>
                            <p className="text-xs text-slate-500">Warden</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );



    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-20">
            {/* --- Header --- */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <div>
                    {view === 'details' && (
                        <button
                            onClick={() => setView('list')}
                            className="flex items-center gap-2 text-sm text-slate-500 hover:text-indigo-600 mb-2 transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
                        </button>
                    )}
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                        {view === 'details' ? selectedHostel?.name : 'Hostel Management'}
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        {view === 'details'
                            ? `Managing ${selectedHostel?.type} Hostel • ${selectedHostel?.warden_name || 'No Warden'}`
                            : 'Overview of campus accommodation and occupancy'
                        }
                    </p>
                </div>

                <div className="flex gap-3">
                    {view === 'list' && (
                        <button
                            onClick={() => {
                                setFormData(p => ({ ...p, hostel: { name: '', type: 'Boys', description: '', warden_id: '', capacity: 0 } }));
                                toggleModal('hostel', true);
                            }}
                            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all shadow-md shadow-indigo-600/20"
                        >
                            <Plus className="w-4 h-4" />
                            <span className="font-medium">Add Hostel</span>
                        </button>
                    )}
                </div>
            </div>



            {/* --- Main Content --- */}
            {
                view === 'list' ? (
                    // Dashboard View
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* Stats Row */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <StatsCard label="Total Capacity" value={stats.total_capacity} icon={Users} color="blue" />
                            <StatsCard label="Occupancy Rate" value={`${Math.round((stats.occupied_slots / stats.total_capacity) * 100) || 0}%`} icon={Activity} color="indigo" />
                            <StatsCard label="Available Beds" value={stats.available_slots} icon={Home} color="emerald" />
                            <StatsCard label="Hostel Blocks" value={hostels.length} icon={Building} color="purple" />
                        </div>

                        {/* Filter Bar */}
                        <div className="flex gap-4">
                            <div className="relative flex-1 max-w-md">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search hostels..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                                />
                            </div>
                            <select
                                value={filterType}
                                onChange={(e) => setFilterType(e.target.value)}
                                className="px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                            >
                                <option value="All">All Types</option>
                                <option value="Boys">Boys</option>
                                <option value="Girls">Girls</option>
                            </select>
                        </div>

                        {/* Hostels Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredHostels.map(h => <HostelCard key={h.id} hostel={h} />)}
                        </div>
                    </div>
                ) : (
                    // Allocations View (Split Screen)
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in slide-in-from-right-4 duration-500">
                        {/* Left: Unassigned Pool */}
                        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 flex flex-col h-[calc(100vh-250px)]">
                            <div className="flex justify-between items-center mb-4">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Unassigned Students</h3>
                                    <p className="text-sm text-slate-500">Hostel students without a block</p>
                                </div>
                                <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-xs font-bold">
                                    {unassignedStudents.length} Pending
                                </span>
                            </div>

                            {/* Filters */}
                            <div className="flex gap-2 mb-4">
                                <input
                                    placeholder="Search students..."
                                    value={allocFilters.unassigned.search}
                                    onChange={e => setAllocFilters(p => ({ ...p, unassigned: { ...p.unassigned, search: e.target.value } }))}
                                    className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-900 border rounded-lg text-sm"
                                />
                                <select
                                    value={allocFilters.unassigned.year}
                                    onChange={e => setAllocFilters(p => ({ ...p, unassigned: { ...p.unassigned, year: e.target.value } }))}
                                    className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border rounded-lg text-sm"
                                >
                                    <option value="All">All Years</option>
                                    <option value="1">1st Year</option>
                                    <option value="2">2nd Year</option>
                                    <option value="3">3rd Year</option>
                                    <option value="4">4th Year</option>
                                </select>
                            </div>

                            {/* List */}
                            <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                                {unassignedStudents
                                    .filter(s =>
                                        (s.name.toLowerCase().includes(allocFilters.unassigned.search.toLowerCase()) ||
                                            s.register_number.includes(allocFilters.unassigned.search)) &&
                                        (allocFilters.unassigned.year === 'All' || s.year.toString() === allocFilters.unassigned.year)
                                    )
                                    .map(student => (
                                        <div key={student.id} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-900 rounded-lg group hover:border-indigo-500 border border-transparent transition-all">
                                            <div>
                                                <p className="font-semibold text-slate-900 dark:text-white">{student.name}</p>
                                                <div className="flex gap-2 text-xs text-slate-500">
                                                    <span>{student.register_number}</span>
                                                    <span>•</span>
                                                    <span>Year {student.year}</span>
                                                </div>
                                            </div>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleAssignHostel(student.id); }}
                                                className="p-2 bg-indigo-100 text-indigo-600 rounded-lg hover:bg-indigo-600 hover:text-white transition-colors"
                                                title="Assign to this Hostel"
                                            >
                                                <ArrowRight className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                {unassignedStudents.length === 0 && (
                                    <div className="text-center py-10 text-slate-400 text-sm">No unassigned students found</div>
                                )}
                            </div>
                        </div>

                        {/* Right: Assigned to Hostel */}
                        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 flex flex-col h-[calc(100vh-250px)]">
                            <div className="flex justify-between items-center mb-4">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Assigned in {selectedHostel?.name}</h3>
                                    <p className="text-sm text-slate-500">Students allocated to this block</p>
                                </div>
                                <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold">
                                    {hostelStudents.length} Assigned
                                </span>
                            </div>

                            {/* Filters */}
                            <div className="flex gap-2 mb-4">
                                <input
                                    placeholder="Search students..."
                                    value={allocFilters.assigned.search}
                                    onChange={e => setAllocFilters(p => ({ ...p, assigned: { ...p.assigned, search: e.target.value } }))}
                                    className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-900 border rounded-lg text-sm"
                                />
                                <select
                                    value={allocFilters.assigned.year}
                                    onChange={e => setAllocFilters(p => ({ ...p, assigned: { ...p.assigned, year: e.target.value } }))}
                                    className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border rounded-lg text-sm"
                                >
                                    <option value="All">All Years</option>
                                    <option value="1">1st Year</option>
                                    <option value="2">2nd Year</option>
                                    <option value="3">3rd Year</option>
                                    <option value="4">4th Year</option>
                                </select>
                            </div>

                            {/* List */}
                            <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                                {hostelStudents
                                    .filter(s =>
                                        (s.name.toLowerCase().includes(allocFilters.assigned.search.toLowerCase()) ||
                                            s.register_number.includes(allocFilters.assigned.search)) &&
                                        (allocFilters.assigned.year === 'All' || s.year.toString() === allocFilters.assigned.year)
                                    )
                                    .map(student => (
                                        <div key={student.id} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-900 rounded-lg group hover:border-red-500 border border-transparent transition-all">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleRemoveHostel(student.id); }}
                                                className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-colors"
                                                title="Remove from Hostel"
                                            >
                                                <UserX className="w-4 h-4" />
                                            </button>
                                            <div className="text-right">
                                                <p className="font-semibold text-slate-900 dark:text-white">{student.name}</p>
                                                <div className="flex gap-2 justify-end text-xs text-slate-500">
                                                    <span>Year {student.year}</span>
                                                    <span>•</span>
                                                    <span>{student.register_number}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                {hostelStudents.length === 0 && (
                                    <div className="text-center py-10 text-slate-400 text-sm">No students assigned to this block</div>
                                )}
                            </div>
                        </div>
                    </div>
                )
            }

            {/* --- Modals --- */}
            <Modal isOpen={modals.hostel} onClose={() => toggleModal('hostel', false)} title={formData.hostel.id ? "Edit Hostel" : "Add New Hostel"}>
                <form onSubmit={handleCreateHostel} className="space-y-4 p-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Hostel Name</label>
                        <input required type="text" placeholder="Block A" value={formData.hostel.name} onChange={e => setFormData(p => ({ ...p, hostel: { ...p.hostel, name: e.target.value } }))} className="w-full px-4 py-2 border rounded-lg bg-slate-50 dark:bg-slate-900 dark:border-slate-700" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Total Capacity (Students)</label>
                        <input required type="number" min="0" placeholder="e.g. 200" value={formData.hostel.capacity} onChange={e => setFormData(p => ({ ...p, hostel: { ...p.hostel, capacity: e.target.value } }))} className="w-full px-4 py-2 border rounded-lg bg-slate-50 dark:bg-slate-900 dark:border-slate-700" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Type</label>
                        <select value={formData.hostel.type} onChange={e => setFormData(p => ({ ...p, hostel: { ...p.hostel, type: e.target.value } }))} className="w-full px-4 py-2 border rounded-lg bg-slate-50 dark:bg-slate-900 dark:border-slate-700">
                            <option value="Boys">Boys</option>
                            <option value="Girls">Girls</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Assign Warden</label>
                        <select value={formData.hostel.warden_id} onChange={e => setFormData(p => ({ ...p, hostel: { ...p.hostel, warden_id: e.target.value } }))} className="w-full px-4 py-2 border rounded-lg bg-slate-50 dark:bg-slate-900 dark:border-slate-700">
                            <option value="">No Warden Assigned</option>
                            {wardens.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                        </select>
                    </div>
                    <button type="submit" className="w-full py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium">{formData.hostel.id ? 'Save Changes' : 'Create Hostel'}</button>
                </form>
            </Modal>


        </div >
    );
};

export default AdminHostels;
