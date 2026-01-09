import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { User, Lock, Mail, Hash, BookOpen, MapPin, Building, ShieldCheck, Phone, Bus, UserCheck, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import StatusRing from '../../components/StatusRing';

const Profile = () => {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
    const [isImageModalOpen, setIsImageModalOpen] = useState(false);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = await axios.get('/api/student/profile');
                setProfile(res.data);
            } catch (err) {
                console.error('Failed to load profile', err);
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, []);

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        if (passwords.new !== passwords.confirm) {
            alert('New passwords do not match');
            return;
        }
        try {
            await axios.post('/api/student/change-password', {
                currentPassword: passwords.current,
                newPassword: passwords.new
            });
            alert('Password changed successfully');
            setPasswords({ current: '', new: '', confirm: '' });
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to change password');
        }
    };

    if (loading) return <div className="p-8 text-center text-slate-500">Loading profile...</div>;
    if (!profile) return <div className="p-8 text-center text-red-500">Failed to load profile</div>;

    const isHostel = profile.student_type?.toLowerCase() === 'hostel';

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">My Profile</h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* 1. Main Identity Card */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-r from-indigo-500 to-purple-600 opacity-20" />

                        <div className="relative flex flex-col md:flex-row items-center md:items-end gap-6 pt-8 px-4">


                            <div
                                className="w-28 h-28 bg-white dark:bg-slate-800 rounded-2xl p-1 shadow-lg -mt-12 md:mt-0 cursor-pointer transition-transform hover:scale-105 active:scale-95 group"
                                onClick={() => profile.profile_image && setIsImageModalOpen(true)}
                            >
                                <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white text-4xl font-bold shadow-inner border-2 border-white dark:border-slate-700 overflow-hidden relative">
                                    {profile.profile_image ? (
                                        <>
                                            <img
                                                src={`/img/student/${profile.profile_image}`}
                                                alt={profile.name}
                                                className="w-full h-full object-cover"
                                            />
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                                                {/* Hover overlay hint could go here if desired */}
                                            </div>
                                        </>
                                    ) : (
                                        profile.name.charAt(0)
                                    )}
                                </div>
                            </div>

                            <div className="flex-1 text-center md:text-left mb-2">
                                <div className="flex flex-col md:flex-row md:items-center gap-2 mb-1">
                                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{profile.name}</h2>
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border ${isHostel
                                        ? 'bg-orange-50 text-orange-600 border-orange-200 dark:bg-orange-900/20 dark:border-orange-900'
                                        : 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-900'
                                        }`}>
                                        {isHostel ? 'Hosteler' : 'Day Scholar'}
                                    </span>
                                </div>
                                <p className="text-slate-500 dark:text-slate-400 font-medium">{profile.register_number} • Year {profile.year}</p>
                            </div>

                            <div className="flex flex-col items-center p-3 bg-slate-50 dark:bg-slate-700/50 rounded-2xl min-w-[100px] border border-slate-100 dark:border-slate-700">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Trust Score</span>
                                <div className="flex items-center gap-2">
                                    <ShieldCheck className={`w-5 h-5 ${profile.trust_score >= 90 ? 'text-emerald-500' :
                                        profile.trust_score >= 70 ? 'text-amber-500' : 'text-red-500'
                                        }`} />
                                    <span className="text-2xl font-black text-slate-900 dark:text-white">{profile.trust_score}</span>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8 pt-8 border-t border-slate-100 dark:border-slate-700">
                            <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-lg">
                                    <Mail className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="text-xs text-slate-400">Email Address</p>
                                    <p className="font-medium text-slate-900 dark:text-white text-sm">{profile.email}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                <div className="p-2 bg-purple-50 dark:bg-purple-900/20 text-purple-600 rounded-lg">
                                    <Phone className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="text-xs text-slate-400">Phone</p>
                                    <p className="font-medium text-slate-900 dark:text-white text-sm">{profile.phone || 'Not provided'}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                <div className="p-2 bg-pink-50 dark:bg-pink-900/20 text-pink-600 rounded-lg">
                                    <Hash className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="text-xs text-slate-400">Department</p>
                                    <p className="font-medium text-slate-900 dark:text-white text-sm">
                                        ID: {profile.department_id} (CSE)
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                <div className="p-2 bg-amber-50 dark:bg-amber-900/20 text-amber-600 rounded-lg">
                                    <BookOpen className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="text-xs text-slate-400">Academic Status</p>
                                    <p className={`font-medium text-sm ${profile.status === 'Suspended' ? 'text-red-500 font-bold' :
                                        profile.status === 'Inactive' ? 'text-slate-500' :
                                            'text-emerald-600 dark:text-emerald-400'
                                        }`}>
                                        {profile.status || 'Active'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 2. Mentor Information (New) */}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
                        <h3 className="font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2 text-lg">
                            <UserCheck className="w-5 h-5 text-indigo-500" />
                            Mentor Information
                        </h3>

                        {profile.mentor_name ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="p-4 bg-indigo-50 dark:bg-indigo-900/10 rounded-2xl border border-indigo-100 dark:border-indigo-900/20">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-300 font-bold text-xs">
                                            {profile.mentor_name.charAt(0)}
                                        </div>
                                        <div>
                                            <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider block">Faculty Name</span>
                                            <span className="text-sm font-bold text-indigo-900 dark:text-indigo-100">{profile.mentor_name}</span>
                                        </div>
                                    </div>
                                    <div className="mt-2 space-y-1">
                                        <p className="text-xs text-indigo-700 dark:text-indigo-300 flex items-center gap-2">
                                            <span className="opacity-70">Staff ID:</span> {profile.mentor_register_number}
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-700/30">
                                        <div className="p-2 bg-white dark:bg-slate-700 rounded-lg text-slate-400">
                                            <Mail className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-400">Email Address</p>
                                            <p className="font-medium text-slate-900 dark:text-white text-sm">{profile.mentor_email || 'N/A'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-700/30">
                                        <div className="p-2 bg-white dark:bg-slate-700 rounded-lg text-slate-400">
                                            <Phone className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-400">Contact Number</p>
                                            <p className="font-medium text-slate-900 dark:text-white text-sm">{profile.mentor_phone || 'N/A'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="p-6 text-center text-slate-400 italic bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                                No mentor assigned yet. Please contact your HOD.
                            </div>
                        )}
                    </div>

                    {/* 2. Hostel & Warden Details (Hostel Only) */}
                    {isHostel && (
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
                            <h3 className="font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2 text-lg">
                                <Building className="w-5 h-5 text-indigo-500" />
                                Hostel & Warden Details
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                <div className="p-4 bg-slate-50 dark:bg-slate-700/30 rounded-2xl border border-slate-100 dark:border-slate-700">
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Hostel Block</span>
                                    <span className="text-lg font-bold text-slate-900 dark:text-white">{profile.hostel_details?.hostel_name || 'N/A'}</span>
                                </div>
                                <div className="p-4 bg-slate-50 dark:bg-slate-700/30 rounded-2xl border border-slate-100 dark:border-slate-700">
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Room Number</span>
                                    <span className="text-lg font-bold text-slate-900 dark:text-white">{profile.hostel_details?.room_number || 'N/A'}</span>
                                </div>
                            </div>

                            <div className="border-t border-slate-100 dark:border-slate-700 pt-6">
                                <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Warden Contact info</h4>

                                {profile.hostel_details?.warden_name && profile.hostel_details.warden_name !== 'N/A' ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="p-4 bg-purple-50 dark:bg-purple-900/10 rounded-2xl border border-purple-100 dark:border-purple-900/20">
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-800 flex items-center justify-center text-purple-600 dark:text-purple-300 font-bold text-sm">
                                                    {profile.hostel_details.warden_name.charAt(0)}
                                                </div>
                                                <div>
                                                    <span className="text-xs font-bold text-purple-400 uppercase tracking-wider block">Warden Name</span>
                                                    <span className="text-base font-bold text-purple-900 dark:text-purple-100">{profile.hostel_details.warden_name}</span>
                                                </div>
                                            </div>
                                            <div className="mt-2 text-xs text-purple-700 dark:text-purple-300">
                                                <span className="opacity-70">Staff ID:</span> {profile.hostel_details.warden_register_number || 'N/A'}
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-700/30">
                                                <div className="p-2 bg-white dark:bg-slate-700 rounded-lg text-slate-400">
                                                    <Mail className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <p className="text-xs text-slate-400">Email Address</p>
                                                    <p className="font-medium text-slate-900 dark:text-white text-sm">{profile.hostel_details.warden_email || 'N/A'}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-700/30">
                                                <div className="p-2 bg-white dark:bg-slate-700 rounded-lg text-slate-400">
                                                    <Phone className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <p className="text-xs text-slate-400">Contact Number</p>
                                                    <p className="font-medium text-slate-900 dark:text-white text-sm">{profile.hostel_details.warden_phone || 'N/A'}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center text-slate-400 italic">No warden details available.</div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* 3. Security Section */}
                <div className="space-y-6">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                            <Lock className="w-5 h-5 text-indigo-500" />
                            Security
                        </h3>

                        <form onSubmit={handlePasswordChange} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Current Password</label>
                                <input
                                    type="password"
                                    required
                                    value={passwords.current}
                                    onChange={e => setPasswords({ ...passwords, current: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
                                    placeholder="••••••••"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">New Password</label>
                                <input
                                    type="password"
                                    required
                                    minLength={6}
                                    value={passwords.new}
                                    onChange={e => setPasswords({ ...passwords, new: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
                                    placeholder="Min 6 chars"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Confirm Password</label>
                                <input
                                    type="password"
                                    required
                                    minLength={6}
                                    value={passwords.confirm}
                                    onChange={e => setPasswords({ ...passwords, confirm: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
                                    placeholder="Retype password"
                                />
                            </div>

                            <button
                                type="submit"
                                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/20 transition-all active:scale-95 mt-4"
                            >
                                Update Password
                            </button>
                        </form>
                    </div>

                    <div className="p-4 bg-amber-50 dark:bg-amber-900/10 rounded-2xl border border-amber-100 dark:border-amber-900/20 text-amber-800 dark:text-amber-200 text-xs leading-relaxed">
                        <p className="font-bold mb-1 flex items-center gap-1"><Lock className="w-3 h-3" /> Note:</p>
                        Personal details like Name, Register Number, and Department are managed by the administration. Please contact your HOD or Admin office for any corrections.
                    </div>
                </div>
            </div>
            {/* Full Screen Image Modal */}
            {/* Full Screen Image Modal */}
            <AnimatePresence>
                {isImageModalOpen && profile.profile_image && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm"
                        onClick={() => setIsImageModalOpen(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="relative max-w-4xl max-h-[90vh] w-full h-full flex flex-col items-center justify-center"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button
                                onClick={() => setIsImageModalOpen(false)}
                                className="absolute top-4 right-4 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-md transition-colors z-50"
                            >
                                <XCircle className="w-8 h-8" />
                            </button>
                            <img
                                src={`/img/student/${profile.profile_image}`}
                                alt={profile.name}
                                className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl border-2 border-white/20"
                            />
                            <p className="mt-4 text-white/50 text-sm font-medium uppercase tracking-widest">Click anywhere outside to close</p>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Profile;
