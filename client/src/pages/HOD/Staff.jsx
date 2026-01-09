import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search, User, Mail, Shield, Award,
    ArrowUpRight, Filter, Download, Briefcase,
    ShieldCheck, Clock, UserMinus, X, Activity, Trash2
} from 'lucide-react';
import Modal from '../../components/Modal';

const HODStaff = () => {
    const [staff, setStaff] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const [profilerData, setProfilerData] = useState(null);
    const [isProfilerLoading, setIsProfilerLoading] = useState(false);

    const [showLeaveModal, setShowLeaveModal] = useState(false);
    const [newLeave, setNewLeave] = useState({ staffId: '', type: 'Casual Leave', reason: '', start: '', end: '' });

    useEffect(() => {
        fetchStaff();
    }, []);

    const fetchStaff = async () => {
        try {
            const res = await axios.get('/api/hod/users?role=staff');
            setStaff(res.data);
        } catch (err) {
            console.error('Failed to fetch staff');
        } finally {
            setLoading(false);
        }
    };

    const fetchProfiler = async (id) => {
        setIsProfilerLoading(true);
        try {
            const res = await axios.get(`/api/hod/staff-profile/${id}`);
            setProfilerData(res.data);
        } catch (err) {
            console.error('Failed to sync workforce intelligence');
        } finally {
            setIsProfilerLoading(false);
        }
    };

    const handleAction = async (leaveId, action) => {
        try {
            await axios.post('/api/hod/manage-leave', { leaveId, action });
            if (profilerData) fetchProfiler(profilerData.member.id);
            fetchStaff();
        } catch (err) {
            console.error('Action synchronization failed');
        }
    };

    const registerLeave = async () => {
        try {
            await axios.post('/api/hod/add-leave', {
                staffId: newLeave.staffId,
                leave_type: newLeave.type,
                reason: newLeave.reason,
                start_date: newLeave.start,
                end_date: newLeave.end
            });
            setShowLeaveModal(false);
            if (profilerData) fetchProfiler(newLeave.staffId);
            fetchStaff();
        } catch (err) {
            console.error('Leave registration failed');
        }
    };

    const filteredStaff = staff.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // State for assignment modal
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [unassignedStudents, setUnassignedStudents] = useState([]);
    const [currentMentees, setCurrentMentees] = useState([]);
    const [selectedStudents, setSelectedStudents] = useState([]);
    const [selectedMentees, setSelectedMentees] = useState([]);
    const [targetStaff, setTargetStaff] = useState(null);

    const openAssignModal = async (staffMember) => {
        setTargetStaff(staffMember);
        try {
            const [unassignedRes, menteesRes] = await Promise.all([
                axios.get('/api/hod/unassigned-students'),
                axios.get(`/api/hod/staff-mentees/${staffMember.id}`)
            ]);
            setUnassignedStudents(unassignedRes.data);
            setCurrentMentees(menteesRes.data);
            setSelectedStudents([]);
            setSelectedMentees([]);
            setShowAssignModal(true);
        } catch (err) {
            console.error('Failed to fetch students');
        }
    };

    const handleAssign = async () => {
        try {
            await axios.post('/api/hod/assign-mentees', {
                staffId: targetStaff.id,
                studentIds: selectedStudents
            });
            openAssignModal(targetStaff); // Refresh
            fetchStaff(); // Refresh counts
        } catch (err) {
            console.error('Assignment failed');
        }
    };

    const handleUnassign = async () => {
        try {
            await axios.post('/api/hod/unassign-mentees', {
                studentIds: selectedMentees
            });
            openAssignModal(targetStaff); // Refresh lists
            fetchStaff(); // Refresh counts
        } catch (err) {
            console.error('Unassignment failed');
        }
    };

    return (
        <div className="space-y-8 pb-12">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="space-y-1">
                    <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight">Staff Directory</h1>
                    <p className="text-gray-500 dark:text-slate-400 text-sm max-w-md font-medium">
                        Workforce oversight for departmental educators and administrative personnel.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-violet-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="Search staff by name..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-12 pr-6 py-3.5 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl text-xs font-black outline-none focus:border-violet-500 dark:focus:border-violet-400 w-full lg:w-80 shadow-sm transition-all"
                        />
                    </div>
                </div>
            </div>

            {/* Staff Table */}
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-gray-100 dark:border-slate-800 shadow-xl overflow-hidden relative">
                <AnimatePresence mode="wait">
                    {loading ? (
                        <div className="p-12 text-center text-gray-400">Loading directory...</div>
                    ) : (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="overflow-x-auto"
                        >
                            <table className="w-full text-left min-w-[800px]">
                                <thead className="bg-gray-50/50 dark:bg-slate-800/50 border-b border-gray-100 dark:border-slate-800">
                                    <tr>
                                        <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Member Identity</th>
                                        <th className="px-6 py-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Mentorship Load</th>
                                        <th className="px-6 py-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Duty Status</th>
                                        <th className="px-8 py-6 text-right text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50 dark:divide-slate-800/50">
                                    {filteredStaff.map((member) => (
                                        <tr key={member.id} className="group hover:bg-gray-50/50 dark:hover:bg-violet-500/5 transition-all duration-300">
                                            <td className="px-8 py-5">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-2xl bg-violet-50 dark:bg-violet-900/20 flex items-center justify-center text-violet-600 font-black text-lg">
                                                        {member.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-black text-gray-900 dark:text-white tracking-tight">{member.name}</p>
                                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-none mt-1">{member.email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-3">
                                                    <div className="px-3 py-1 bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 rounded-lg text-xs font-bold">
                                                        {member.mentees_count || 0} Students
                                                    </div>
                                                    {member.active_mentees < member.mentees_count && (
                                                        <span className="text-[10px] text-red-400 font-bold uppercase tracking-widest">
                                                            {(member.mentees_count - member.active_mentees)} Blocked
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-violet-50 text-violet-600 dark:bg-violet-900/20 rounded-full text-[10px] font-black uppercase tracking-tight">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-violet-500" />
                                                    Active Faculty
                                                </span>
                                            </td>
                                            <td className="px-8 py-5 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        onClick={() => openAssignModal(member)}
                                                        className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider bg-gray-50 dark:bg-slate-800 hover:bg-violet-600 hover:text-white dark:hover:bg-violet-600 transition-colors rounded-xl"
                                                    >
                                                        Manage Mentees
                                                    </button>
                                                    <button
                                                        onClick={() => fetchProfiler(member.id)}
                                                        className="p-2 text-gray-400 hover:text-violet-600 transition-colors"
                                                    >
                                                        <ArrowUpRight className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Management Modal */}
            <Modal isOpen={showAssignModal} onClose={() => setShowAssignModal(false)} maxWidth="max-w-6xl" showPadding={false}>
                <div className="flex flex-col h-[700px]">
                    <div className="p-8 bg-violet-600 text-white shrink-0">
                        <h3 className="text-2xl font-black tracking-tight">Mentorship Management</h3>
                        <p className="text-violet-100 text-[10px] mt-1 uppercase tracking-widest font-black">
                            Managing roster for: <span className="text-white underline decoration-wavy underline-offset-4">{targetStaff?.name}</span>
                        </p>
                    </div>

                    <div className="flex-1 overflow-hidden flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-gray-200 dark:divide-slate-700 bg-gray-50 dark:bg-slate-900">

                        {/* LEFT: Unassigned Pool */}
                        <div className="flex-1 flex flex-col overflow-hidden">
                            <div className="p-4 bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center">
                                <div>
                                    <p className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider">Unassigned Students</p>
                                    <p className="text-[10px] text-gray-500 font-bold">{unassignedStudents.length} available</p>
                                </div>
                                <button
                                    onClick={handleAssign}
                                    disabled={selectedStudents.length === 0}
                                    className="px-4 py-2 bg-violet-600 text-white rounded-lg text-xs font-bold disabled:opacity-50 hover:bg-violet-700"
                                >
                                    Assign Selected ({selectedStudents.length})
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-2">
                                {unassignedStudents.map(student => (
                                    <div
                                        key={student.id}
                                        onClick={() => setSelectedStudents(prev => prev.includes(student.id) ? prev.filter(id => id !== student.id) : [...prev, student.id])}
                                        className={`p-3 rounded-lg border cursor-pointer flex justify-between items-center transition-all ${selectedStudents.includes(student.id)
                                            ? 'bg-violet-50 border-violet-500 dark:bg-violet-900/20'
                                            : 'bg-white border-gray-200 dark:bg-slate-800 dark:border-slate-700 hover:border-violet-300'
                                            }`}
                                    >
                                        <div>
                                            <p className="font-bold text-xs text-gray-800 dark:text-slate-200">{student.name}</p>
                                            <p className="text-[10px] text-gray-400">{student.register_number}</p>
                                        </div>
                                        {selectedStudents.includes(student.id) && <div className="w-3 h-3 bg-violet-500 rounded-full" />}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* RIGHT: Current Mentees */}
                        <div className="flex-1 flex flex-col overflow-hidden">
                            <div className="p-4 bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center">
                                <div>
                                    <p className="text-sm font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Current Mentees</p>
                                    <p className="text-[10px] text-gray-500 font-bold">{currentMentees.length} assigned</p>
                                </div>
                                <button
                                    onClick={handleUnassign}
                                    disabled={selectedMentees.length === 0}
                                    className="px-4 py-2 bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 rounded-lg text-xs font-bold disabled:opacity-50"
                                >
                                    Unassign Selected ({selectedMentees.length})
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-2">
                                {currentMentees.length === 0 ? (
                                    <div className="text-center py-10 text-gray-400 text-xs">No mentees assigned yet.</div>
                                ) : (
                                    currentMentees.map(student => (
                                        <div
                                            key={student.id}
                                            onClick={() => setSelectedMentees(prev => prev.includes(student.id) ? prev.filter(id => id !== student.id) : [...prev, student.id])}
                                            className={`p-3 rounded-lg border cursor-pointer flex justify-between items-center transition-all ${selectedMentees.includes(student.id)
                                                ? 'bg-red-50 border-red-500 dark:bg-red-900/20'
                                                : 'bg-white border-gray-200 dark:bg-slate-800 dark:border-slate-700 hover:border-red-300'
                                                }`}
                                        >
                                            <div>
                                                <p className="font-bold text-xs text-gray-800 dark:text-slate-200">{student.name}</p>
                                                <p className="text-[10px] text-gray-400">{student.register_number}</p>
                                            </div>
                                            {selectedMentees.includes(student.id) && <div className="w-3 h-3 bg-red-500 rounded-full" />}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                    </div>

                    <div className="p-4 border-t border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 flex justify-end">
                        <button onClick={() => setShowAssignModal(false)} className="px-6 py-2 text-xs font-bold text-gray-500 uppercase tracking-widest hover:text-gray-800">Close Manager</button>
                    </div>
                </div>
            </Modal>

            {/* Profiler Modal (Existing) */}
            <Modal
                isOpen={!!profilerData}
                onClose={() => setProfilerData(null)}
                maxWidth="max-w-5xl"
                showPadding={false}
            >
                {/* ... existing modal content ... */}
                {profilerData && (
                    <div className="flex flex-col h-[85vh] lg:h-auto bg-gray-50 dark:bg-slate-900 overflow-hidden">
                        {/* 1. Header Section */}
                        <div className="p-6 lg:p-8 bg-gradient-to-r from-violet-600 to-indigo-600 text-white shrink-0">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                <div className="flex items-center gap-5">
                                    <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white font-black text-2xl shadow-inner">
                                        {profilerData.member.name.charAt(0)}
                                    </div>
                                    <div>
                                        <h2 className="text-2xl md:text-3xl font-black tracking-tight">{profilerData.member.name}</h2>
                                        <p className="text-violet-100 text-xs font-bold uppercase tracking-widest opacity-80 mt-1">{profilerData.member.email}</p>
                                        <div className="mt-3 flex items-center gap-3">
                                            <span className={`inline-flex items-center px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${profilerData.stats.active_duty === 'On Duty' ? 'bg-emerald-400/20 text-emerald-100' : 'bg-amber-400/20 text-amber-100'}`}>
                                                {profilerData.stats.active_duty}
                                            </span>
                                            <span className="inline-flex items-center px-3 py-1 bg-white/10 rounded-lg text-[10px] font-black text-white uppercase tracking-wider">
                                                ID: {profilerData.member.id}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-3 shrink-0">
                                    {profilerData.stats.active_duty === 'On Leave' ? (
                                        <button
                                            onClick={async () => {
                                                const activeLeave = profilerData.leaves.find(l => l.status === 'approved' && new Date() >= new Date(l.start_date) && new Date() <= new Date(l.end_date));
                                                if (activeLeave) {
                                                    await handleAction(activeLeave.id, 'terminate');
                                                }
                                            }}
                                            className="px-5 py-3 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-emerald-500/10 transition-all flex items-center gap-2"
                                        >
                                            <Briefcase className="w-4 h-4" /> Mark "On Duty"
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => {
                                                setNewLeave(prev => ({ ...prev, staffId: profilerData.member.id }));
                                                setShowLeaveModal(true);
                                            }}
                                            className="px-5 py-3 bg-white text-violet-600 hover:bg-violet-50 rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-black/10 transition-all flex items-center gap-2"
                                        >
                                            <Clock className="w-4 h-4" /> Grant Leave
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* 2. Scrollable Body */}
                        <div className="flex-1 overflow-y-auto">
                            <div className="p-6 lg:p-8 space-y-8">

                                {/* Stats Grid */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {[
                                        { label: 'Total Mentees', value: profilerData.stats.total_mentees, icon: User, color: 'blue' },
                                        { label: 'Active Mentees', value: profilerData.stats.active_mentees, icon: ShieldCheck, color: 'emerald' },
                                        { label: 'Leaves Taken', value: profilerData.stats.total_leaves, icon: Clock, color: 'amber' },
                                        { label: 'Actions Logged', value: profilerData.stats.approvals_logged, icon: Activity, color: 'violet' }
                                    ].map((stat, i) => (
                                        <div key={i} className="p-5 bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-all">
                                            <div className="flex justify-between items-start mb-2">
                                                <div className={`p-2 rounded-lg bg-${stat.color}-50 dark:bg-${stat.color}-900/20 text-${stat.color}-600`}>
                                                    <stat.icon className="w-4 h-4" />
                                                </div>
                                            </div>
                                            <p className="text-2xl font-black text-gray-900 dark:text-white">{stat.value}</p>
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mt-1">{stat.label}</p>
                                        </div>
                                    ))}
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    {/* Mentees Roster */}
                                    <div className="bg-white dark:bg-slate-800 rounded-3xl border border-gray-100 dark:border-slate-700 overflow-hidden shadow-sm">
                                        <div className="p-6 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center">
                                            <h3 className="text-lg font-black text-gray-900 dark:text-white tracking-tight">Mentorship Roster</h3>
                                            <span className="text-xs font-bold text-gray-400">{profilerData.mentees?.length || 0} Students</span>
                                        </div>
                                        <div className="max-h-[300px] overflow-y-auto p-4 space-y-3">
                                            {profilerData.mentees?.length > 0 ? (
                                                profilerData.mentees.map(student => (
                                                    <div key={student.id} className="group p-4 rounded-2xl bg-gray-50 dark:bg-slate-900/50 hover:bg-indigo-50 dark:hover:bg-indigo-900/10 transition-colors border border-transparent hover:border-indigo-100 dark:hover:border-indigo-900/30 flex items-center justify-between">
                                                        <div>
                                                            <p className="text-sm font-black text-gray-800 dark:text-slate-200">{student.name}</p>
                                                            <p className="text-[10px] font-bold text-gray-400 uppercase">{student.year} Year • {student.student_type}</p>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="flex items-center justify-end gap-1 mb-1">
                                                                <Shield className={`w-3 h-3 ${student.trust_score < 30 ? 'text-red-500' : 'text-emerald-500'}`} />
                                                                <span className={`text-xs font-black ${student.trust_score < 30 ? 'text-red-600' : 'text-emerald-600'}`}>{student.trust_score}</span>
                                                            </div>
                                                            {student.pass_blocked && <span className="text-[10px] font-black text-red-500 bg-red-50 px-2 py-0.5 rounded-md uppercase">Blocked</span>}
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="text-center py-10 text-gray-400 text-xs font-bold uppercase tracking-wider">No active mentees</div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Action History */}
                                    <div className="bg-white dark:bg-slate-800 rounded-3xl border border-gray-100 dark:border-slate-700 overflow-hidden shadow-sm flex flex-col">
                                        <div className="p-6 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center">
                                            <h3 className="text-lg font-black text-gray-900 dark:text-white tracking-tight">Action History</h3>
                                            <Activity className="w-5 h-5 text-gray-400" />
                                        </div>
                                        <div className="max-h-[300px] overflow-y-auto flex-1">
                                            {profilerData.history?.length > 0 ? (
                                                <div className="divide-y divide-gray-50 dark:divide-slate-700/50">
                                                    {profilerData.history.map((log) => (
                                                        <div key={log.id} className="p-4 flex gap-4 hover:bg-gray-50 dark:hover:bg-slate-700/10 transition-colors">
                                                            <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${log.action_type === 'approve' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                                            <div>
                                                                <p className="text-xs font-bold text-gray-700 dark:text-slate-300">
                                                                    {log.action_type === 'approve' ? 'Approved Request' : 'Rejected Request'}
                                                                </p>
                                                                {log.request_reason && <p className="text-[10px] text-gray-400 mt-0.5 line-clamp-1">"{log.request_reason}"</p>}
                                                                <p className="text-[10px] font-mono text-gray-400 mt-1">{new Date(log.timestamp).toLocaleString()}</p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="text-center py-10 text-gray-400 text-xs font-bold uppercase tracking-wider">No recent actions</div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Leave History (New) */}
                                    <div className="bg-white dark:bg-slate-800 rounded-3xl border border-gray-100 dark:border-slate-700 overflow-hidden shadow-sm flex flex-col md:col-span-2 lg:col-span-1">
                                        <div className="p-6 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center">
                                            <h3 className="text-lg font-black text-gray-900 dark:text-white tracking-tight">Leave Registry</h3>
                                            <Clock className="w-5 h-5 text-gray-400" />
                                        </div>
                                        <div className="max-h-[300px] overflow-y-auto flex-1">
                                            {profilerData.leaves?.length > 0 ? (
                                                <div className="divide-y divide-gray-50 dark:divide-slate-700/50">
                                                    {profilerData.leaves.map((leave) => (
                                                        <div key={leave.id} className="p-4 hover:bg-gray-50 dark:hover:bg-slate-700/10 transition-colors">
                                                            <div className="flex justify-between items-start">
                                                                <div>
                                                                    <p className="text-xs font-bold text-gray-800 dark:text-slate-200 uppercase tracking-wide">{leave.leave_type}</p>
                                                                    <p className="text-[10px] text-gray-400 mt-1">{new Date(leave.start_date).toLocaleDateString()} - {new Date(leave.end_date).toLocaleDateString()}</p>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    {(() => {
                                                                        const isCompleted = leave.status === 'approved' && new Date(leave.end_date) < new Date(new Date().setHours(0, 0, 0, 0));
                                                                        const displayStatus = isCompleted ? 'completed' : leave.status;

                                                                        return (
                                                                            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${displayStatus === 'approved' ? 'bg-emerald-50 text-emerald-600' :
                                                                                    displayStatus === 'completed' ? 'bg-slate-100 text-slate-500' :
                                                                                        displayStatus === 'pending' ? 'bg-amber-50 text-amber-600' :
                                                                                            displayStatus === 'cancelled' ? 'bg-gray-100 text-gray-400 line-through' : 'bg-red-50 text-red-600'
                                                                                }`}>
                                                                                {displayStatus}
                                                                            </span>
                                                                        );
                                                                    })()}
                                                                    {leave.status !== 'rejected' && leave.status !== 'cancelled' && (
                                                                        <button
                                                                            onClick={() => handleAction(leave.id, 'cancelled')}
                                                                            title="Revoke Leave"
                                                                            className="p-1 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-lg transition-colors"
                                                                        >
                                                                            <Trash2 className="w-3 h-3" />
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            {leave.reason && <p className="text-[10px] text-gray-500 mt-2 italic">"{leave.reason}"</p>}
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="text-center py-10 text-gray-400 text-xs font-bold uppercase tracking-wider">No leave history</div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer Actions */}
                        <div className="p-6 border-t border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-end shrink-0">
                            <button
                                onClick={() => setProfilerData(null)}
                                className="px-8 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] shadow-lg hover:scale-105 transition-all"
                            >
                                Close Profile
                            </button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Register Leave Modal (Existing) */}
            <Modal
                isOpen={showLeaveModal}
                onClose={() => setShowLeaveModal(false)}
                maxWidth="max-w-md"
                showPadding={false}
            >
                {/* ... existing leave modal content ... */}
                <div>
                    <div className="p-8 bg-violet-600 text-white">
                        <h3 className="text-2xl font-black tracking-tight">Register Staff Leave</h3>
                    </div>
                    {/* ... form ... */}
                    <div className="p-8 space-y-6">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Leave Type</label>
                                <select
                                    value={newLeave.type}
                                    onChange={(e) => setNewLeave({ ...newLeave, type: e.target.value })}
                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-bold focus:border-violet-500 outline-none transition-colors"
                                >
                                    <option value="Casual Leave">Casual Leave</option>
                                    <option value="Medical Leave">Medical Leave</option>
                                    <option value="Earned Leave">Earned Leave</option>
                                    <option value="On Duty">On Duty</option>
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Start Date</label>
                                    <input
                                        type="date"
                                        value={newLeave.start}
                                        onChange={(e) => setNewLeave({ ...newLeave, start: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-bold focus:border-violet-500 outline-none transition-colors"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">End Date</label>
                                    <input
                                        type="date"
                                        value={newLeave.end}
                                        onChange={(e) => setNewLeave({ ...newLeave, end: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-bold focus:border-violet-500 outline-none transition-colors"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Reason (Optional)</label>
                                <textarea
                                    value={newLeave.reason}
                                    onChange={(e) => setNewLeave({ ...newLeave, reason: e.target.value })}
                                    placeholder="Enter reason for leave..."
                                    rows="3"
                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-bold focus:border-violet-500 outline-none transition-colors resize-none"
                                />
                            </div>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-4">
                            <button onClick={() => setShowLeaveModal(false)} className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-2xl transition-all order-2 sm:order-1">Cancel</button>
                            <button onClick={registerLeave} className="flex-[2] py-4 bg-violet-600 text-white rounded-2xl text-[10px] font-black shadow-lg shadow-violet-500/30 hover:scale-105 active:scale-95 transition-all uppercase tracking-widest order-1 sm:order-2">Enforce Registry</button>
                        </div>
                    </div>
                </div>
            </Modal>
            {/* Profile Loading Overlay */}
            <AnimatePresence>
                {isProfilerLoading && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/40 backdrop-blur-md">
                        <div className="flex flex-col items-center gap-4">
                            <Briefcase className="w-12 h-12 text-white animate-pulse" />
                            <p className="text-xs font-black text-white uppercase tracking-[0.3em]">Synchronizing Workforce Intelligence...</p>
                        </div>
                    </div>
                )}
            </AnimatePresence>
        </div >
    );
};

export default HODStaff;
