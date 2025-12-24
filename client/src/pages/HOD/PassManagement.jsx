import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ShieldAlert, UserMinus, UserCheck, Timer,
    AlertCircle, CheckCircle, Search, Filter,
    ChevronRight, Zap, Shield, Plus, X, Lock, Unlock
} from 'lucide-react';
import Modal from '../../components/Modal';

const HODPassManagement = () => {
    const [students, setStudents] = useState([]);
    const [restrictions, setRestrictions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [status, setStatus] = useState(null);
    const [msg, setMsg] = useState('');

    const [showYearModal, setShowYearModal] = useState(false);
    const [newRestriction, setNewRestriction] = useState({ year: '', reason: '' });

    useEffect(() => {
        fetchData();
    }, []);

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

    const manageYear = async (year, action, reason = '') => {
        try {
            await axios.post('/api/hod/manage-year-restriction', { academic_year: year, action, reason });
            setStatus('success');
            setMsg(`Area restricted for ${year} successfully.`);
            setShowYearModal(false);
            fetchData();
        } catch (err) {
            setStatus('error');
            setMsg('Operation failed.');
        }
    };

    const filteredStudents = students.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.register_number.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-8 pb-12">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-600 rounded-xl shadow-lg shadow-red-500/30">
                            <Lock className="w-6 h-6 text-white" />
                        </div>
                        <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight">Access Control</h1>
                    </div>
                    <p className="text-gray-500 dark:text-slate-400 text-sm max-w-md font-medium">
                        Manage individual and departmental pass application restrictions.
                    </p>
                </div>

                <button
                    onClick={() => setShowYearModal(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl text-xs font-black shadow-lg shadow-indigo-500/30 hover:scale-105 active:scale-95 transition-all uppercase tracking-widest"
                >
                    <Plus className="w-4 h-4" /> Restrict Year Level
                </button>
            </div>

            {/* Notification */}
            <AnimatePresence>
                {status && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className={`p-4 rounded-2xl flex items-center justify-between font-black text-xs uppercase tracking-widest ${status === 'success' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'
                            }`}
                    >
                        <div className="flex items-center gap-3">
                            {status === 'success' ? <CheckCircle className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
                            {msg}
                        </div>
                        <button onClick={() => setStatus(null)}><X className="w-4 h-4" /></button>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                {/* Year Level Restrictions */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-gray-100 dark:border-slate-800 shadow-xl">
                        <h3 className="text-xl font-black text-gray-900 dark:text-white mb-6 tracking-tight">Active Policy Layers</h3>
                        <div className="space-y-4">
                            {restrictions.length === 0 ? (
                                <div className="text-center py-8 grayscale opacity-50">
                                    <Shield className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">No active blocks</p>
                                </div>
                            ) : (
                                restrictions.map((res) => (
                                    <motion.div
                                        key={res.id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className="p-5 bg-red-50 dark:bg-red-900/10 rounded-2xl border border-red-100 dark:border-red-900/20 relative group"
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="px-3 py-1 bg-red-600 text-white text-[10px] font-black rounded-lg uppercase tracking-widest">{res.academic_year}</span>
                                            <button
                                                onClick={() => manageYear(res.academic_year, 'unblock')}
                                                className="p-1 text-red-400 hover:text-red-600 transition-colors"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                        <p className="text-xs font-bold text-red-800 dark:text-red-400 leading-tight">{res.reason}</p>
                                        <p className="text-[10px] text-red-400 mt-2 font-black uppercase tracking-tighter">System Policy Active</p>
                                    </motion.div>
                                ))
                            )}
                        </div>
                    </div>

                    <div className="p-8 bg-indigo-600 rounded-[2.5rem] text-white shadow-xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform" />
                        <ShieldAlert className="w-8 h-8 mb-4" />
                        <h3 className="text-xl font-black tracking-tight mb-2">Individual Block List</h3>
                        <p className="text-indigo-100 text-xs font-medium mb-0 opacity-80 uppercase tracking-widest">
                            {students.filter(s => s.pass_blocked).length} Students Restricted
                        </p>
                    </div>
                </div>

                {/* Individual Control Table */}
                <div className="lg:col-span-8 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-gray-100 dark:border-slate-800 shadow-xl overflow-hidden relative">
                    <div className="p-8 border-b border-gray-50 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h3 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">Granular Enforcement</h3>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Direct Student restrictions</p>
                        </div>
                        <div className="relative group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-red-500 transition-colors" />
                            <input
                                type="text"
                                placeholder="Search by name or reg #"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-12 pr-6 py-3 bg-gray-50 dark:bg-slate-800/50 rounded-xl text-xs font-black outline-none w-full md:w-64 border border-transparent focus:border-red-500 transition-all"
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left min-w-[600px]">
                            <thead className="bg-gray-50/50 dark:bg-slate-800/50">
                                <tr>
                                    <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Student</th>
                                    <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Policy Status</th>
                                    <th className="px-8 py-5 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Enforcement</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 dark:divide-slate-800/50">
                                {filteredStudents.map((student) => (
                                    <tr key={student.id} className="group hover:bg-gray-50/50 dark:hover:bg-red-500/5 transition-all">
                                        <td className="px-8 py-4">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm ${student.pass_blocked ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'}`}>
                                                    {student.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="text-xs font-black text-gray-900 dark:text-white">{student.name}</p>
                                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">{student.register_number}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {student.pass_blocked ? (
                                                <span className="flex items-center gap-1.5 text-red-600 font-black text-[10px] uppercase">
                                                    <Lock className="w-3.5 h-3.5" /> Blocked
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-1.5 text-emerald-600 font-black text-[10px] uppercase">
                                                    <Unlock className="w-3.5 h-3.5" /> Authorized
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-8 py-4 text-right">
                                            <button
                                                onClick={() => toggleBlock(student.id, student.pass_blocked)}
                                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${student.pass_blocked
                                                    ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                                                    : 'bg-red-50 text-red-600 hover:bg-red-100'
                                                    }`}
                                            >
                                                {student.pass_blocked ? 'Re-Authorize' : 'Block Access'}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Restrict Year Level Modal */}
            <Modal
                isOpen={showYearModal}
                onClose={() => setShowYearModal(false)}
                maxWidth="max-w-md"
                showPadding={false}
            >
                <div>
                    <div className="p-8 bg-red-600 text-white">
                        <h3 className="text-2xl font-black tracking-tight">Restrict Year Level</h3>
                        <p className="text-red-100 text-xs mt-1 uppercase tracking-widest font-medium">Batch-wide application block</p>
                    </div>
                    <div className="p-8 space-y-6">
                        <div>
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Academic Batch</label>
                            <select
                                value={newRestriction.year}
                                onChange={(e) => setNewRestriction({ ...newRestriction, year: e.target.value })}
                                className="w-full bg-gray-50 dark:bg-slate-800 border-none rounded-xl p-4 mt-2 font-bold text-sm outline-none focus:ring-2 focus:ring-red-500 transition-all dark:text-white appearance-none"
                            >
                                <option value="">Select Target Batch</option>
                                <option value="1st Year">1st Year</option>
                                <option value="2nd Year">2nd Year</option>
                                <option value="3rd Year">3rd Year</option>
                                <option value="4th Year">4th Year</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Enforcement Reason</label>
                            <textarea
                                rows="3"
                                value={newRestriction.reason}
                                onChange={(e) => setNewRestriction({ ...newRestriction, reason: e.target.value })}
                                className="w-full bg-gray-50 dark:bg-slate-800 border-none rounded-xl p-4 mt-2 font-bold text-sm outline-none focus:ring-2 focus:ring-red-500 transition-all dark:text-white"
                                placeholder="e.g. Model Exams in progress, Disciplinary action..."
                            />
                        </div>
                        <div className="flex flex-col sm:flex-row gap-4">
                            <button
                                onClick={() => setShowYearModal(false)}
                                className="flex-1 py-4 text-xs font-black uppercase tracking-widest text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-2xl transition-all order-2 sm:order-1"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => manageYear(newRestriction.year, 'block', newRestriction.reason)}
                                className="flex-[2] py-4 bg-red-600 text-white rounded-2xl text-xs font-black shadow-lg shadow-red-500/30 hover:scale-105 active:scale-95 transition-all uppercase tracking-widest order-1 sm:order-2"
                            >
                                Enforce Block
                            </button>
                        </div>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default HODPassManagement;
