import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { Save, Clock, ShieldAlert, DoorOpen, Plus, Trash2, X, Info } from 'lucide-react';
import toast from 'react-hot-toast';

const AdminPolicyManager = () => {
    const [policies, setPolicies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({});

    const [isAddMode, setIsAddMode] = useState(false);
    const [newPolicy, setNewPolicy] = useState({
        student_type: 'Hostel',
        pass_type: '',
        working_start: '09:00',
        working_end: '17:00',
        holiday_behavior: 'block',
        holiday_start: '',
        holiday_end: '',
        gate_action: 'scan_exit',
        max_duration_hours: ''
    });

    useEffect(() => {
        fetchPolicies();
    }, []);

    const fetchPolicies = async () => {
        try {
            const res = await axios.get('/api/policies');
            setPolicies(res.data);
            setLoading(false);
        } catch (error) {
            toast.error('Failed to load policies');
            setLoading(false);
        }
    };

    const handleEdit = (policy) => {
        setEditingId(policy.id);
        setEditForm({ ...policy });
    };

    const handleSave = async () => {
        try {
            await axios.put(`/api/policies/${editingId}`, editForm);
            toast.success('Policy updated successfully');
            setEditingId(null);
            fetchPolicies();
        } catch (error) {
            toast.error('Failed to update policy');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this policy? This might break application logic if still in use.')) return;
        try {
            await axios.delete(`/api/policies/${id}`);
            toast.success('Policy deleted successfully');
            fetchPolicies();
        } catch (error) {
            toast.error('Failed to delete policy');
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            await axios.post('/api/policies', newPolicy);
            toast.success('New Pass Type Created Successfully');
            setIsAddMode(false);
            fetchPolicies();
            setNewPolicy({
                student_type: 'Hostel', pass_type: '',
                working_start: '09:00', working_end: '17:00',
                holiday_behavior: 'block', holiday_start: '', holiday_end: '',
                gate_action: 'scan_exit', max_duration_hours: ''
            });
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to create policy');
        }
    };

    // Helper to format time input (HH:MM:SS -> HH:MM for input)
    const formatTimeForInput = (timeStr) => {
        if (!timeStr) return '';
        return timeStr.substring(0, 5);
    };

    const handleChange = (field, value) => {
        setEditForm(prev => ({ ...prev, [field]: value }));
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                        <ShieldAlert className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                        Advanced Pass Policy Engine
                    </h1>
                    <p className="text-gray-500 dark:text-slate-400">
                        Create and configure pass types dynamically.
                    </p>
                </div>
                <button
                    onClick={() => setIsAddMode(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 transition"
                >
                    <Plus className="w-4 h-4" /> Add New Pass Type
                </button>
            </div>

            {/* Add Policy Modal */}
            <AnimatePresence>
                {isAddMode && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-2xl shadow-2xl relative"
                        >
                            <button onClick={() => setIsAddMode(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X /></button>
                            <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Create New Pass Policy</h3>

                            <form onSubmit={handleCreate} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Student Type</label>
                                        <select
                                            className="w-full p-2 rounded-lg border dark:bg-slate-800 dark:border-slate-700"
                                            value={newPolicy.student_type}
                                            onChange={e => setNewPolicy({ ...newPolicy, student_type: e.target.value })}
                                        >
                                            <option value="Hostel">Hostel</option>
                                            <option value="Day Scholar">Day Scholar</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Pass Name</label>
                                        <input
                                            type="text" required placeholder="e.g. Library, Gym, Internship"
                                            className="w-full p-2 rounded-lg border dark:bg-slate-800 dark:border-slate-700"
                                            value={newPolicy.pass_type}
                                            onChange={e => setNewPolicy({ ...newPolicy, pass_type: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="p-4 bg-gray-50 dark:bg-slate-800/50 rounded-xl space-y-4">
                                    <h4 className="font-bold text-sm text-gray-700 dark:text-slate-300">Working Day Rules</h4>
                                    <div className="flex gap-4 items-center">
                                        <input type="time" className="p-2 rounded border dark:bg-slate-900" value={newPolicy.working_start} onChange={e => setNewPolicy({ ...newPolicy, working_start: e.target.value })} />
                                        <span>to</span>
                                        <input type="time" className="p-2 rounded border dark:bg-slate-900" value={newPolicy.working_end} onChange={e => setNewPolicy({ ...newPolicy, working_end: e.target.value })} />
                                    </div>
                                </div>

                                <div className="p-4 bg-gray-50 dark:bg-slate-800/50 rounded-xl space-y-4">
                                    <h4 className="font-bold text-sm text-gray-700 dark:text-slate-300">Holiday Rules</h4>
                                    <select
                                        className="w-full p-2 rounded border dark:bg-slate-900 mb-2"
                                        value={newPolicy.holiday_behavior}
                                        onChange={e => setNewPolicy({ ...newPolicy, holiday_behavior: e.target.value })}
                                    >
                                        <option value="block">Block (No Access)</option>
                                        <option value="allow">Allow (Anytime)</option>
                                        <option value="custom_time">Custom Time Window</option>
                                    </select>
                                    {newPolicy.holiday_behavior === 'custom_time' && (
                                        <div className="flex gap-4 items-center">
                                            <input type="time" className="p-2 rounded border dark:bg-slate-900" value={newPolicy.holiday_start} onChange={e => setNewPolicy({ ...newPolicy, holiday_start: e.target.value })} />
                                            <span>to</span>
                                            <input type="time" className="p-2 rounded border dark:bg-slate-900" value={newPolicy.holiday_end} onChange={e => setNewPolicy({ ...newPolicy, holiday_end: e.target.value })} />
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Gate Action</label>
                                    <select
                                        className="w-full p-2 rounded-lg border dark:bg-slate-800 dark:border-slate-700"
                                        value={newPolicy.gate_action}
                                        onChange={e => setNewPolicy({ ...newPolicy, gate_action: e.target.value })}
                                    >
                                        <option value="scan_exit">Scan Exit Only (One Way)</option>
                                        <option value="scan_both">Scan Both (Entry & Exit)</option>
                                        <option value="no_scan">No Scan Required</option>
                                        <option value="no_exit">No Exit (Internal Only)</option>
                                    </select>
                                </div>

                                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl text-xs space-y-2 border border-blue-100 dark:border-blue-800">
                                    <h5 className="font-bold text-blue-700 dark:text-blue-300 flex items-center gap-2">
                                        <Info className="w-4 h-4" /> Policy Rules & Guide
                                    </h5>
                                    <ul className="list-disc pl-4 space-y-1 text-blue-600 dark:text-blue-400">
                                        <li><strong>Scan Exit Only:</strong> Best for 'Leave' or 'Permission' where student goes home and doesn't return immediately. Status becomes 'Completed' on exit.</li>
                                        <li><strong>Scan Both:</strong> Essential for 'Outings'. Tracks both Exit and Entry time to calculate duration.</li>
                                        <li><strong>No Exit:</strong> specific for 'Internal' passes (e.g. Hostel to Library). Gate scanner will REJECT exit.</li>
                                        <li><strong>Holiday Rules:</strong> 'Block' prevents any request on holidays. 'Custom Time' allows specific windows (e.g. Sunday Outing 6am-8pm).</li>
                                    </ul>
                                </div>

                                <button type="submit" className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition">
                                    Create Policy
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 dark:bg-slate-800 text-xs uppercase font-bold text-gray-500 dark:text-slate-400">
                            <tr>
                                <th className="px-6 py-4">Student Type</th>
                                <th className="px-6 py-4">Pass Type</th>
                                <th className="px-6 py-4">Working Days</th>
                                <th className="px-6 py-4">Holiday Rules</th>
                                <th className="px-6 py-4">Gate Action</th>
                                <th className="px-6 py-4">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                            {policies.map(policy => (
                                <tr key={policy.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/50 transition">
                                    <td className="px-6 py-4 font-bold text-gray-800 dark:text-white">
                                        {policy.student_type}
                                    </td>
                                    <td className="px-6 py-4 font-medium text-indigo-600 dark:text-indigo-400">
                                        {policy.pass_type}
                                    </td>

                                    {/* Edit Mode vs View Mode */}
                                    {editingId === policy.id ? (
                                        <>
                                            <td className="px-6 py-4">
                                                <div className="flex gap-2 items-center">
                                                    <input
                                                        type="time"
                                                        value={formatTimeForInput(editForm.working_start)}
                                                        onChange={(e) => handleChange('working_start', e.target.value)}
                                                        className="w-20 p-1 rounded border dark:bg-slate-800"
                                                    />
                                                    <span>-</span>
                                                    <input
                                                        type="time"
                                                        value={formatTimeForInput(editForm.working_end)}
                                                        onChange={(e) => handleChange('working_end', e.target.value)}
                                                        className="w-20 p-1 rounded border dark:bg-slate-800"
                                                    />
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="space-y-2">
                                                    <select
                                                        value={editForm.holiday_behavior}
                                                        onChange={(e) => handleChange('holiday_behavior', e.target.value)}
                                                        className="p-1 rounded border dark:bg-slate-800 w-full text-xs"
                                                    >
                                                        <option value="block">Block</option>
                                                        <option value="allow">Allow</option>
                                                        <option value="custom_time">Custom</option>
                                                    </select>
                                                    {editForm.holiday_behavior === 'custom_time' && (
                                                        <div className="flex gap-1 items-center">
                                                            <input
                                                                type="time"
                                                                value={formatTimeForInput(editForm.holiday_start)}
                                                                onChange={(e) => handleChange('holiday_start', e.target.value)}
                                                                className="w-16 p-1 rounded border dark:bg-slate-800 text-xs"
                                                            />
                                                            <span>-</span>
                                                            <input
                                                                type="time"
                                                                value={formatTimeForInput(editForm.holiday_end)}
                                                                onChange={(e) => handleChange('holiday_end', e.target.value)}
                                                                className="w-16 p-1 rounded border dark:bg-slate-800 text-xs"
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <select
                                                    value={editForm.gate_action}
                                                    onChange={(e) => handleChange('gate_action', e.target.value)}
                                                    className="p-1 rounded border dark:bg-slate-800 w-full text-xs"
                                                >
                                                    <option value="scan_both">Scan Both</option>
                                                    <option value="scan_exit">Scan Exit Only</option>
                                                    <option value="no_scan">No Scan</option>
                                                    <option value="no_exit">No Exit</option>
                                                </select>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex gap-2">
                                                    <button onClick={handleSave} className="text-green-600 hover:text-green-700 font-bold text-xs"><Save className="w-4 h-4" /></button>
                                                    <button onClick={() => setEditingId(null)} className="text-red-500 hover:text-red-700 text-xs">Cancel</button>
                                                </div>
                                            </td>
                                        </>
                                    ) : (
                                        <>
                                            <td className="px-6 py-4 text-gray-600 dark:text-slate-300">
                                                {policy.working_start ? `${formatTimeForInput(policy.working_start)} - ${formatTimeForInput(policy.working_end)}` : 'Anytime'}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-1">
                                                    <span className={`w-fit px-2 py-1 rounded text-xs font-bold ${policy.holiday_behavior === 'block' ? 'bg-red-100 text-red-600' :
                                                        policy.holiday_behavior === 'allow' ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-700'
                                                        }`}>
                                                        {policy.holiday_behavior.toUpperCase()}
                                                    </span>
                                                    {policy.holiday_behavior === 'custom_time' && (
                                                        <span className="text-xs text-gray-500">
                                                            {formatTimeForInput(policy.holiday_start)} - {formatTimeForInput(policy.holiday_end)}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded text-xs font-bold ${policy.gate_action === 'no_exit' ? 'bg-red-100 text-red-600' :
                                                    policy.gate_action === 'no_scan' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'
                                                    }`}>
                                                    {policy.gate_action.replace('_', ' ').toUpperCase()}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex gap-3">
                                                    <button
                                                        onClick={() => handleEdit(policy)}
                                                        className="font-bold text-indigo-600 hover:text-indigo-700 text-xs"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(policy.id)}
                                                        className="font-bold text-red-400 hover:text-red-600 text-xs"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AdminPolicyManager;
