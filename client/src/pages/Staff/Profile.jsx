import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { User, Shield, Key, Bell, Building } from 'lucide-react';
import { motion } from 'framer-motion';

const StaffProfile = () => {
    const { user } = useAuth();

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Profile & Settings</h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Profile Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="md:col-span-1"
                >
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 p-6 text-center">
                        <div className="w-24 h-24 mx-auto bg-primary-50 dark:bg-slate-800 rounded-full flex items-center justify-center text-3xl font-bold text-primary-600 dark:text-sky-400 mb-4">
                            {user.name?.charAt(0)}
                        </div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">{user.name}</h2>
                        <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">{user.email}</p>
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-full text-xs font-bold uppercase">
                            <Shield className="w-3 h-3" /> {user.role}
                        </div>
                    </div>
                </motion.div>

                {/* Settings */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                    className="md:col-span-2 space-y-6"
                >
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 p-6">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                            <Building className="w-5 h-5 text-gray-400" /> Department Details
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">Department ID</label>
                                <p className="font-medium text-gray-900 dark:text-white">#{user.department_id}</p>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">Status</label>
                                <p className="text-green-600 font-bold flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-green-500" /> Active
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 p-6">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                            <Key className="w-5 h-5 text-gray-400" /> Account Security
                        </h3>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center p-4 bg-gray-50 dark:bg-slate-800/50 rounded-xl">
                                <div>
                                    <p className="font-medium text-gray-900 dark:text-white">Password</p>
                                    <p className="text-sm text-gray-500 dark:text-slate-400">Last changed 3 months ago</p>
                                </div>
                                <button className="px-4 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
                                    Change
                                </button>
                            </div>
                            <div className="flex justify-between items-center p-4 bg-gray-50 dark:bg-slate-800/50 rounded-xl">
                                <div>
                                    <p className="font-medium text-gray-900 dark:text-white">Two-Factor Auth</p>
                                    <p className="text-sm text-gray-500 dark:text-slate-400">Not enabled</p>
                                </div>
                                <button className="px-4 py-2 bg-primary-50 dark:bg-sky-900/20 text-primary-600 dark:text-sky-400 rounded-lg text-sm font-medium hover:bg-primary-100 dark:hover:bg-sky-900/30 transition-colors">
                                    Enable
                                </button>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default StaffProfile;
