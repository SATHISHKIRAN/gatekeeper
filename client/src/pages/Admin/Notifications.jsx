import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Send, Bell, Users, Shield, Briefcase, Info, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

const AdminNotifications = () => {
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        role: '',
        department_id: '',
        type: 'info',
        title: '',
        message: '',
        link: '',
        category: 'system'
    });

    useEffect(() => {
        fetchDepartments();
    }, []);

    const fetchDepartments = async () => {
        try {
            const res = await axios.get('/api/admin/departments');
            setDepartments(res.data);
        } catch (err) {
            console.error('Failed to fetch departments');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        setLoading(true);
        const promise = axios.post('/api/notifications/broadcast', formData);

        toast.promise(promise, {
            loading: 'Sending broadcast...',
            success: () => {
                setFormData({
                    role: '',
                    department_id: '',
                    type: 'info',
                    title: '',
                    message: '',
                    link: '',
                    category: 'system'
                });
                return 'Broadcast sent successfully!';
            },
            error: 'Failed to send broadcast'
        });

        try {
            await promise;
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const getTypeIcon = (type) => {
        switch (type) {
            case 'success': return <CheckCircle className="w-5 h-5 text-emerald-500" />;
            case 'warning': return <AlertTriangle className="w-5 h-5 text-amber-500" />;
            case 'error': return <XCircle className="w-5 h-5 text-red-500" />;
            default: return <Info className="w-5 h-5 text-indigo-500" />;
        }
    };

    return (
        <div className="space-y-6 pb-20">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Broadcast Center</h1>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Send notifications to users across the campus</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Compose Card */}
                <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Target Role</label>
                                <select
                                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    value={formData.role}
                                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                >
                                    <option value="">All Users (Campus Wide)</option>
                                    <option value="student">Students</option>
                                    <option value="staff">Staff</option>
                                    <option value="warden">Wardens</option>
                                    <option value="hod">HODs</option>
                                    <option value="gatekeeper">Gatekeepers</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Department (Optional)</label>
                                <select
                                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    value={formData.department_id}
                                    onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
                                    disabled={['warden', 'gatekeeper'].includes(formData.role)}
                                >
                                    <option value="">All Departments</option>
                                    {departments.map(d => (
                                        <option key={d.id} value={d.id}>{d.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Category</label>
                                <select
                                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    value={formData.category}
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                >
                                    <option value="system">System Update</option>
                                    <option value="security">Security Alert</option>
                                    <option value="academic">Academic / Event</option>
                                    <option value="request">General Request Info</option>
                                </select>
                            </div>
                        </div>

                        <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Notification Type</label>
                                    <div className="grid grid-cols-4 gap-2">
                                        {['info', 'success', 'warning', 'error'].map(type => (
                                            <button
                                                key={type}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, type })}
                                                className={`p-2 rounded-lg border flex items-center justify-center transition-all ${formData.type === type
                                                    ? 'bg-indigo-50 border-indigo-500 ring-1 ring-indigo-500 dark:bg-indigo-900/20'
                                                    : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                                                    }`}
                                            >
                                                {getTypeIcon(type)}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Subject / Title</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                        placeholder="e.g. Campus Maintenance Update"
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Message Content</label>
                                    <textarea
                                        required
                                        rows="4"
                                        className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                                        placeholder="Enter your message here..."
                                        value={formData.message}
                                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Action Link (Optional)</label>
                                    <input
                                        type="text"
                                        className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                        placeholder="e.g. /student/profile or https://..."
                                        value={formData.link}
                                        onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 flex justify-end">
                            <button
                                type="submit"
                                disabled={loading}
                                className="px-6 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-500/20 transition-all flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                <Send className="w-4 h-4" />
                                {loading ? 'Sending...' : 'Send Broadcast'}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Preview Card */}
                <div className="space-y-6">
                    <div className="bg-gradient-to-br from-indigo-600 to-violet-600 rounded-2xl p-6 text-white shadow-xl">
                        <h3 className="text-lg font-bold mb-2">Pro Tips</h3>
                        <ul className="space-y-3 text-sm text-indigo-100">
                            <li className="flex gap-2">
                                <Users className="w-4 h-4 shrink-0 mt-0.5" />
                                <span>Target specific roles to avoid spamming the entire campus.</span>
                            </li>
                            <li className="flex gap-2">
                                <Briefcase className="w-4 h-4 shrink-0 mt-0.5" />
                                <span>Department filtering works best for academic announcements.</span>
                            </li>
                            <li className="flex gap-2">
                                <Shield className="w-4 h-4 shrink-0 mt-0.5" />
                                <span>Use 'Warning' or 'Error' types for urgent security or maintenance alerts.</span>
                            </li>
                        </ul>
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Live Preview</h4>
                        <div className={`p-4 rounded-lg flex gap-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm ${!formData.title && !formData.message ? 'opacity-50' : ''}`}>
                            <div className="mt-1 shrink-0">
                                {getTypeIcon(formData.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start">
                                    <p className="font-bold text-slate-900 dark:text-white truncate">
                                        {formData.title || 'Notification Title'}
                                    </p>
                                    <div className="w-2 h-2 bg-indigo-500 rounded-full shrink-0 mt-1.5" />
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed line-clamp-3">
                                    {formData.message || 'Notification message content will appear here...'}
                                </p>
                                <p className="text-[10px] text-slate-400 mt-2 font-mono">
                                    Just now
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminNotifications;
