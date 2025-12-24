import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Plus, Search, Filter, Home, Users, Trash2, Edit2, UserPlus, LogOut, Check, X,
    Activity, LayoutGrid, Box, AlertCircle
} from 'lucide-react';
import Modal from '../../components/Modal';

const WardenRooms = () => {
    // --- State Management ---
    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [filterFloor, setFilterFloor] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all'); // 'available', 'occupied', 'maintenance'

    // Modals
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedRoom, setSelectedRoom] = useState(null); // For Details/Edit/Assign
    const [showAssignModal, setShowAssignModal] = useState(false);

    // Data for Modals
    const [unassignedStudents, setUnassignedStudents] = useState([]);

    // Statistics
    const [stats, setStats] = useState({
        totalRooms: 0,
        totalCapacity: 0,
        occupiedBeds: 0,
        occupancyRate: 0,
        availableBeds: 0
    });

    // Form Data
    const [formData, setFormData] = useState({
        room_number: '',
        floor: '',
        type: 'Double',
        status: 'available'
    });

    // --- Effects ---
    useEffect(() => {
        fetchRooms();
    }, []);

    useEffect(() => {
        if (rooms.length > 0) {
            calculateStats();
        } else {
            setStats({ totalRooms: 0, totalCapacity: 0, occupiedBeds: 0, occupancyRate: 0, availableBeds: 0 });
        }
    }, [rooms]);

    // --- Data Fetching ---
    const fetchRooms = async () => {
        setRefreshing(true);
        try {
            const res = await axios.get('/api/warden/rooms');
            if (Array.isArray(res.data)) {
                setRooms(res.data);
            } else {
                console.error("API returned non-array:", res.data);
                setRooms([]);
            }
        } catch (err) {
            console.error("Failed to fetch rooms:", err);
            // alert('Failed to load rooms'); // Optional: silent fail for better UX if retry logic existed
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const fetchUnassignedStudents = async () => {
        try {
            const res = await axios.get('/api/warden/unassigned-block-students');
            if (Array.isArray(res.data)) {
                setUnassignedStudents(res.data);
            } else {
                setUnassignedStudents([]);
            }
        } catch (err) {
            console.error("Failed to fetch students:", err);
            setUnassignedStudents([]);
        }
    };

    const calculateStats = () => {
        let totalRooms = rooms.length;
        let totalCapacity = 0;
        let occupiedBeds = 0;

        rooms.forEach(room => {
            const capacity = room.type === 'Single' ? 1 : room.type === 'Double' ? 2 : room.type === 'Triple' ? 3 : 4;
            // Treat maintenance rooms as 0 capacity for occupancy rate, or handle separately? 
            // For now, let's include them in total capacity potential usually, but maybe exclude if status is maintenance.
            // Let's keep it simple: Capacity is static based on type.
            totalCapacity += capacity;
            occupiedBeds += (room.current_occupants || 0);
        });

        const occupancyRate = totalCapacity > 0 ? Math.round((occupiedBeds / totalCapacity) * 100) : 0;
        const availableBeds = totalCapacity - occupiedBeds;

        setStats({ totalRooms, totalCapacity, occupiedBeds, occupancyRate, availableBeds });
    };

    // --- Actions ---

    // 1. Create Room
    const handleCreateRoom = async (e) => {
        e.preventDefault();
        try {
            await axios.post('/api/warden/rooms', formData);
            fetchRooms();
            setShowCreateModal(false);
            setFormData({ room_number: '', floor: '', type: 'Double', status: 'available' }); // Reset
        } catch (err) {
            console.error(err);
            alert('Failed to create room. ' + (err.response?.data?.message || ''));
        }
    };

    // 2. Update Room (Status/Type)
    const handleUpdateRoom = async (e) => {
        e.preventDefault();
        if (!selectedRoom) return;
        try {
            await axios.put(`/api/warden/rooms/${selectedRoom.id}`, formData);

            await fetchRooms();
            alert('Room updated successfully');
            setSelectedRoom(null); // Close modal on save
        } catch (err) {
            console.error(err);
            alert('Failed to update room: ' + (err.response?.data?.message || err.message));
        }
    };

    // --- Confirmation States ---
    const [confirmDeleteRoom, setConfirmDeleteRoom] = useState(false);
    const [confirmVacateId, setConfirmVacateId] = useState(null);

    // 3. Delete Room
    const handleDeleteRoom = async () => {
        if (!selectedRoom) return;

        // Custom Confirmation Logic
        if (!confirmDeleteRoom) {
            setConfirmDeleteRoom(true);
            setTimeout(() => setConfirmDeleteRoom(false), 5000); // Reset after 5s
            return;
        }

        console.log("Deleting Room ID:", selectedRoom.id);
        try {
            await axios.delete(`/api/warden/rooms/${selectedRoom.id}`);
            await fetchRooms();
            setSelectedRoom(null); // Close modal
            setConfirmDeleteRoom(false);
        } catch (err) {
            console.error("Delete failed:", err);
            alert('Failed to delete room: ' + (err.response?.data?.message || err.message));
        }
    };

    // 4. Assign Student
    const handleAssignStudent = async (studentId) => {
        if (!selectedRoom) return;
        try {
            await axios.post('/api/warden/rooms/assign', {
                student_id: studentId,
                room_id: selectedRoom.id
            });

            // Optimistic / Local Update to keep modal consistent
            // We need to fetch the student details or reloading everything. 
            // Reloading is safer.
            const res = await axios.get('/api/warden/rooms');
            if (Array.isArray(res.data)) {
                setRooms(res.data);
                // Find the currently selected room in the new data to keep modal fresh
                const updatedRoom = res.data.find(r => r.id === selectedRoom.id);
                if (updatedRoom) {
                    setSelectedRoom(updatedRoom);
                    // Also update unassigned list for next assignment
                    fetchUnassignedStudents();
                } else {
                    setSelectedRoom(null); // Room gone?
                }
            }

            // setShowAssignModal(false); // Close the *search* modal
        } catch (err) {
            console.error(err);
            alert('Failed to assign student: ' + (err.response?.data?.message || err.message));
        }
    };

    // 5. Vacate Student
    const handleVacateStudent = async (studentId, e) => {
        if (e) e.stopPropagation();

        // Custom Confirmation Logic
        if (confirmVacateId !== studentId) {
            setConfirmVacateId(studentId);
            setTimeout(() => setConfirmVacateId(null), 5000);
            return;
        }

        console.log("Vacating Student ID:", studentId);
        try {
            await axios.post('/api/warden/rooms/vacate', { student_id: studentId });

            // Optimistic Update: Remove from local view immediately
            setSelectedRoom(prev => ({
                ...prev,
                occupants: prev.occupants.filter(s => s.id !== studentId),
                current_occupants: Math.max(0, (prev.current_occupants || 0) - 1)
            }));
            setConfirmVacateId(null);

            // Sync with backend
            fetchRooms();
        } catch (err) {
            console.error("Vacate request failed:", err);
            alert('Failed to vacate student: ' + (err.response?.data?.message || err.message));
        }
    };

    // --- Helpers ---
    const getRoomCapacity = (type) => {
        switch (type) {
            case 'Single': return 1;
            case 'Triple': return 3;
            case 'Dorm': return 4; // Arbitrary
            default: return 2; // Double
        }
    };

    const getOccupancyColor = (current, capacity) => {
        if (current === 0) return 'bg-emerald-100 text-emerald-600 border-emerald-200';
        if (current < capacity) return 'bg-blue-50 text-blue-600 border-blue-200';
        return 'bg-amber-50 text-amber-600 border-amber-200'; // Full
    };

    const floors = [...new Set(rooms.map(r => r.floor))].sort((a, b) => a - b);

    // --- Filtering ---
    const filteredRooms = rooms.filter(room => {
        const matchesSearch = room.room_number ? room.room_number.toLowerCase().includes(searchTerm.toLowerCase()) : false;
        const matchesFloor = filterFloor === 'all' || (room.floor && room.floor.toString() === filterFloor);
        const matchesStatus = filterStatus === 'all' || room.status === filterStatus;

        // Also filter by computed status? e.g. "Available" means slots open
        if (filterStatus === 'available_slots') {
            const cap = getRoomCapacity(room.type);
            return (room.current_occupants || 0) < cap;
        }

        return matchesSearch && matchesFloor && matchesStatus;
    });

    const openCreateModal = () => {
        setFormData({ room_number: '', floor: '', type: 'Double', status: 'available' });
        setShowCreateModal(true);
    };

    const openRoomDetails = (room) => {
        setSelectedRoom(room);
        setFormData({
            room_number: room.room_number,
            floor: room.floor,
            type: room.type,
            status: room.status
        });
    };

    const openAssignData = () => {
        fetchUnassignedStudents();
        setShowAssignModal(true);
    };

    if (loading && rooms.length === 0) {
        return <div className="p-10 flex justify-center text-slate-500">Loading rooms...</div>;
    }

    return (
        <div className="space-y-8 pb-20">
            {/* Header & Stats */}
            <div className="flex flex-col gap-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Room Management</h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-1">Manage hostel capacity, assignments, and availability.</p>
                    </div>
                    <button
                        type="button"
                        onClick={openCreateModal}
                        className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all shadow-lg shadow-indigo-200 dark:shadow-indigo-900/20 active:scale-95"
                    >
                        <Plus className="w-5 h-5" />
                        <span className="font-medium">Add Room</span>
                    </button>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard
                        icon={<Home className="w-5 h-5" />}
                        label="Total Rooms"
                        value={stats.totalRooms}
                        color="indigo"
                    />
                    <StatCard
                        icon={<Users className="w-5 h-5" />}
                        label="Total Capacity"
                        value={stats.totalCapacity}
                        color="blue"
                    />
                    <StatCard
                        icon={<Activity className="w-5 h-5" />}
                        label="Occupancy Rate"
                        value={`${stats.occupancyRate}%`}
                        color={stats.occupancyRate > 90 ? 'amber' : 'emerald'}
                    />
                    <StatCard
                        icon={<Box className="w-5 h-5" />}
                        label="Available Beds"
                        value={stats.availableBeds}
                        color="violet"
                    />
                </div>
            </div>

            {/* Filters & Actions Bar */}
            <div className="sticky top-20 z-10 bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">

                {/* Search */}
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search by Room Number..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                    />
                </div>

                {/* Filters */}
                <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
                    <select
                        value={filterFloor}
                        onChange={(e) => setFilterFloor(e.target.value)}
                        className="px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 outline-none cursor-pointer"
                    >
                        <option value="all">All Floors</option>
                        {floors.map(f => <option key={f} value={f}>Floor {f}</option>)}
                    </select>

                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 outline-none cursor-pointer"
                    >
                        <option value="all">All Status</option>
                        <option value="available">Available</option>
                        <option value="available_slots">Has Empty Beds</option>
                        <option value="maintenance">Maintenance</option>
                    </select>

                    <button
                        onClick={fetchRooms}
                        className={`p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${refreshing ? 'animate-spin' : ''}`}
                        title="Refresh Data"
                    >
                        <AlertCircle className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Room Grid */}
            {filteredRooms.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                    <LayoutGrid className="w-16 h-16 mb-4 opacity-20" />
                    <p className="text-lg font-medium">No rooms found matching your filters</p>
                    <button onClick={() => { setSearchTerm(''); setFilterFloor('all'); setFilterStatus('all'); }} className="mt-2 text-indigo-500 hover:underline">Clear Filters</button>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredRooms.map(room => {
                        const capacity = getRoomCapacity(room.type);
                        const Occupants = room.occupants || [];
                        const isFull = (room.current_occupants || 0) >= capacity;

                        return (
                            <div
                                key={room.id}
                                onClick={() => openRoomDetails(room)}
                                className="group relative bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer overflow-hidden"
                            >
                                {/* Status Indicator Bar */}
                                <div className={`absolute top-0 left-0 w-full h-1.5 ${isFull ? 'bg-amber-500' : 'bg-emerald-500'}`} />

                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{room.room_number}</h3>
                                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mt-1">Floor {room.floor} • {room.type}</p>
                                    </div>
                                    <div className={`px-2.5 py-1 rounded-full text-xs font-bold ${getOccupancyColor(room.current_occupants || 0, capacity)}`}>
                                        {room.current_occupants || 0} / {capacity}
                                    </div>
                                </div>

                                {/* Occupants Preview */}
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <div className="flex -space-x-2">
                                            {Occupants.map((occ, idx) => (
                                                <div key={idx} className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900 border-2 border-white dark:border-slate-800 flex items-center justify-center text-xs font-bold text-indigo-700 dark:text-indigo-300" title={occ?.name || 'Unknown'}>
                                                    {occ?.name ? occ.name.charAt(0) : '?'}
                                                </div>
                                            ))}
                                            {Array.from({ length: Math.max(0, capacity - (room.current_occupants || 0)) }).map((_, idx) => (
                                                <div key={`empty-${idx}`} className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 border-2 border-white dark:border-slate-800 flex items-center justify-center text-slate-300">
                                                    <UserPlus className="w-3 h-3" />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Hover Action Hint */}
                                <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300">
                                        <Edit2 className="w-4 h-4" />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* --- Modals --- */}

            {/* 1. Create Modal */}
            <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Create New Room">
                <form onSubmit={handleCreateRoom} className="space-y-5 p-2">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Room Number</label>
                            <input
                                className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20"
                                placeholder="e.g. 101"
                                value={formData.room_number}
                                onChange={e => setFormData({ ...formData, room_number: e.target.value })}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Floor</label>
                            <input
                                type="number"
                                className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20"
                                placeholder="e.g. 1"
                                value={formData.floor}
                                onChange={e => setFormData({ ...formData, floor: e.target.value })}
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Room Type</label>
                        <div className="grid grid-cols-3 gap-3">
                            {['Single', 'Double', 'Triple'].map(type => (
                                <button
                                    key={type}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, type })}
                                    className={`p-3 rounded-xl border text-sm font-medium transition-all ${formData.type === type ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'border-slate-200 hover:border-indigo-300'}`}
                                >
                                    {type}
                                </button>
                            ))}
                        </div>
                    </div>

                    <button type="submit" className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 transition-all">
                        Create Room
                    </button>
                </form>
            </Modal>

            {/* 2. Room Details / Edit Modal */}
            <Modal isOpen={!!selectedRoom} onClose={() => setSelectedRoom(null)} title={`Room ${selectedRoom?.room_number}`}>
                {selectedRoom && (
                    <div className="space-y-8">
                        {/* Occupants Section */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Current Occupants</h3>

                            <div className="space-y-3">
                                {selectedRoom.occupants && selectedRoom.occupants.map(s => (
                                    <div key={s.id} className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                                                {s.name ? s.name.charAt(0) : '?'}
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-900 dark:text-white">{s.name}</p>
                                                <p className="text-xs text-slate-500">{s.register_number}</p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={(e) => handleVacateStudent(s.id, e)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${confirmVacateId === s.id ? 'bg-red-600 text-white shadow-lg' : 'bg-red-50 text-red-600 hover:bg-red-100'}`}
                                            title="Remove Student"
                                        >
                                            {confirmVacateId === s.id ? 'Confirm Remove?' : 'Remove'}
                                        </button>
                                    </div>
                                ))}

                                {(!selectedRoom.occupants || selectedRoom.occupants.length < getRoomCapacity(selectedRoom.type)) && (
                                    <button
                                        type="button"
                                        onClick={openAssignData}
                                        className="w-full py-3 border-2 border-dashed border-slate-300 rounded-xl flex items-center justify-center gap-2 text-slate-500 hover:border-indigo-500 hover:text-indigo-600 hover:bg-indigo-50 transition-all group"
                                    >
                                        <Plus className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                        <span>Assign Student</span>
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="h-px bg-slate-200 dark:bg-slate-700" />

                        {/* Room Settings Form */}
                        <form onSubmit={handleUpdateRoom} className="space-y-4">
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Room Settings</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-slate-500">Number</label>
                                    <input className="w-full p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-sm" value={formData.room_number} onChange={e => setFormData({ ...formData, room_number: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-slate-500">Floor</label>
                                    <input className="w-full p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-sm" type="number" value={formData.floor} onChange={e => setFormData({ ...formData, floor: e.target.value })} />
                                </div>
                                <div className="space-y-2 col-span-2">
                                    <label className="text-xs font-semibold text-slate-500">Type & Capacity</label>
                                    <select className="w-full p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-sm" value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })}>
                                        <option value="Single">Single (1 Bed)</option>
                                        <option value="Double">Double (2 Beds)</option>
                                        <option value="Triple">Triple (3 Beds)</option>
                                    </select>
                                </div>
                                <div className="space-y-2 col-span-2">
                                    <label className="text-xs font-semibold text-slate-500">Maintenance Status</label>
                                    <select className="w-full p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-sm" value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}>
                                        <option value="available">Available</option>
                                        <option value="maintenance">Under Maintenance</option>
                                    </select>
                                </div>
                            </div>

                            <div className="pt-2">
                                <button type="submit" className="w-full py-2.5 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-colors">
                                    Save Changes
                                </button>
                            </div>
                        </form>

                        {/* Delete Button (Moved Outside Form) */}
                        <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
                            <button
                                type="button"
                                onClick={handleDeleteRoom}
                                className={`w-full py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${confirmDeleteRoom ? 'bg-red-600 text-white shadow-lg' : 'bg-red-50 text-red-600 hover:bg-red-100'}`}
                            >
                                <Trash2 className="w-4 h-4" />
                                <span>{confirmDeleteRoom ? 'Confirm Delete Room?' : 'Delete Room'}</span>
                            </button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* 3. Assign List Modal */}
            <Modal isOpen={showAssignModal} onClose={() => setShowAssignModal(false)} title="Select Student">
                <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2">
                    <input
                        placeholder="Search student..."
                        className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 mb-4 text-sm"
                    // Add local search logic if list is long
                    />
                    {unassignedStudents.length === 0 ? (
                        <p className="text-center text-slate-500 py-4">No unassigned students found.</p>
                    ) : (
                        unassignedStudents.map(s => (
                            <button
                                key={s.id}
                                type="button"
                                onClick={() => handleAssignStudent(s.id)}
                                className="w-full flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl transition-colors border border-transparent hover:border-slate-200 group"
                            >
                                <div className="text-left">
                                    <p className="font-bold text-slate-900">{s.name}</p>
                                    <p className="text-xs text-slate-500">{s.register_number} • {s.year} Year</p>
                                </div>
                                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                    <Check className="w-4 h-4" />
                                </div>
                            </button>
                        ))
                    )}
                </div>
            </Modal>
        </div>
    );
};

// Sub-component for Stats
// Sub-component for Stats
const StatCard = ({ icon, label, value, color }) => {
    const colorStyles = {
        indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'hover:border-indigo-200', iconBg: 'bg-indigo-50', iconText: 'text-indigo-600' },
        blue: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'hover:border-blue-200', iconBg: 'bg-blue-50', iconText: 'text-blue-600' },
        emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'hover:border-emerald-200', iconBg: 'bg-emerald-50', iconText: 'text-emerald-600' },
        amber: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'hover:border-amber-200', iconBg: 'bg-amber-50', iconText: 'text-amber-600' },
        violet: { bg: 'bg-violet-50', text: 'text-violet-600', border: 'hover:border-violet-200', iconBg: 'bg-violet-50', iconText: 'text-violet-600' },
    };

    const styles = colorStyles[color] || colorStyles.indigo;

    return (
        <div className={`p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex items-start justify-between group ${styles.border} transition-colors`}>
            <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
                <p className="text-2xl font-black text-slate-900 dark:text-white">{value}</p>
            </div>
            <div className={`p-3 rounded-xl ${styles.iconBg} ${styles.iconText} dark:bg-slate-700 dark:text-white group-hover:scale-110 transition-transform`}>
                {icon}
            </div>
        </div>
    );
};

export default WardenRooms;
