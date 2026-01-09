import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { User, Shield, Key, Bell, Server, Database, Activity, Mail, Phone, Settings } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useNotification } from '../../context/NotificationContext';
import ChangePasswordModal from '../../components/ChangePasswordModal';

const AdminProfile = () => {
    const { user } = useAuth();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const { requestPermission, permissionStatus, pushLoading } = useNotification();
    const [isPasswordModalOpen, setPasswordModalOpen] = useState(false);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const response = await axios.get('/api/admin/profile', {
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                });
                setProfile(response.data);
            } catch (error) {
                console.error('Failed to fetch profile', error);
                toast.error('Failed to load profile data');
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, []);

    if (loading) return (
        <div className="flex justify-center items-center h-screen">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
    );

    if (!profile) return <div>Error loading profile</div>;

    const { user: userData, stats } = profile;

    return (
        <div className="max-w-5xl mx-auto space-y-8 animate-fade-in p-6">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400 bg-clip-text text-transparent">
                System Administrator
            </h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Identity Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="lg:col-span-1"
                >
                    <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-3xl shadow-xl border border-white/20 dark:border-slate-800 p-8 text-center relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-br from-slate-500/5 to-gray-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                        <div className="relative z-10">
                            <div className="w-32 h-32 mx-auto bg-gradient-to-br from-slate-100 to-gray-100 dark:from-slate-800 dark:to-slate-800 rounded-full flex items-center justify-center text-4xl font-bold text-slate-600 dark:text-slate-400 mb-6 shadow-inner ring-4 ring-white dark:ring-slate-800">
                                {userData.name?.charAt(0)}
                            </div>
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">{userData.name}</h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mb-4">ROOT PRIVILEGES</p>

                            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-slate-50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 rounded-full text-xs font-bold uppercase tracking-wide border border-slate-200 dark:border-slate-700">
                                <Shield className="w-3 h-3" /> System Admin
                            </div>
                        </div>

                        {/* Quick Stats Row */}
                        <div className="mt-8 grid grid-cols-2 gap-4 border-t border-slate-100 dark:border-slate-800 pt-6">
                            <div className="text-center">
                                <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.total_users}</p>
                                <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Total Users</p>
                            </div>
                            <div className="text-center">
                                <p className="text-2xl font-bold text-emerald-500">{stats.system_status}</p>
                                <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">System</p>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Details & Settings */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1, duration: 0.3 }}
                    className="lg:col-span-2 space-y-6"
                >
                    {/* System Overview */}
                    <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-3xl shadow-xl border border-white/20 dark:border-slate-800 p-8">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                            <Server className="w-5 h-5 text-slate-500" /> Platform Status
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wide flex items-center gap-2">
                                    <Activity className="w-3 h-3" /> Total Requests Processed
                                </label>
                                <p className="font-medium text-slate-900 dark:text-white truncate">{stats.total_requests}</p>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wide flex items-center gap-2">
                                    <Activity className="w-3 h-3" /> Active Pending Issues
                                </label>
                                <p className="font-medium text-amber-500">{stats.active_issues}</p>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wide flex items-center gap-2">
                                    <Mail className="w-3 h-3" /> Admin Email
                                </label>
                                <p className="font-medium text-slate-900 dark:text-white truncate">{userData.email}</p>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wide flex items-center gap-2">
                                    <Phone className="w-3 h-3" /> Admin Phone
                                </label>
                                <p className="font-medium text-slate-900 dark:text-white">{userData.phone || 'N/A'}</p>
                            </div>
                        </div>
                    </div>

                    {/* Notification Preferences */}
                    <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-3xl shadow-xl border border-white/20 dark:border-slate-800 p-8">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                            <Bell className="w-5 h-5 text-amber-500" /> Notifications
                        </h3>
                        <div className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700/50">
                            <div>
                                <p className="font-semibold text-slate-900 dark:text-white text-sm">System Alerts</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Receive pass updates even when minimized.</p>
                                {permissionStatus === 'denied' && (
                                    <p className="text-[10px] font-bold text-rose-500 mt-1.5 flex items-center gap-1 animate-pulse">
                                        <Shield className="w-3 h-3" /> Browser blocked permissions. Click the lock icon in URL bar to reset.
                                    </p>
                                )}
                            </div>
                            <button
                                onClick={permissionStatus === 'denied' ? () => alert('Please click the Lock/Tune icon next to the URL to reset permissions.') : requestPermission}
                                disabled={permissionStatus === 'granted' || pushLoading}
                                className={`px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm ${permissionStatus === 'granted'
                                    ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800 cursor-default'
                                    : permissionStatus === 'denied'
                                        ? 'bg-rose-50 text-rose-600 border border-rose-200 cursor-help'
                                        : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200 dark:shadow-none'
                                    }`}
                            >
                                {pushLoading ? 'Enabling...' : permissionStatus === 'granted' ? 'Active' : permissionStatus === 'denied' ? 'Blocked' : 'Enable'}
                            </button>
                        </div>
                    </div>

                    {/* Account Security */}
                    <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-3xl shadow-xl border border-white/20 dark:border-slate-800 p-8">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                            <Key className="w-5 h-5 text-slate-500" /> Security
                        </h3>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700/50">
                                <div>
                                    <p className="font-semibold text-slate-900 dark:text-white text-sm">Change Password</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Update your login credentials securely.</p>
                                </div>
                                <button
                                    onClick={() => setPasswordModalOpen(true)}
                                    className="px-5 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors shadow-sm"
                                >
                                    Update
                                </button>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
            <ChangePasswordModal isOpen={isPasswordModalOpen} onClose={() => setPasswordModalOpen(false)} />
        </div>
    );
};

export default AdminProfile;
