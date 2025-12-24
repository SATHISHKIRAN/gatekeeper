import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, User, Phone, Mail, MapPin, Building, Calendar,
    Shield, Clock, FileText, CheckCircle, XCircle
} from 'lucide-react';

const StudentDetailView = ({ studentId, onClose }) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');

    useEffect(() => {
        if (studentId) fetchProfile();
    }, [studentId]);

    const fetchProfile = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`/api/staff/student/${studentId}`);
            setData(res.data);
            setLoading(false);
        } catch (err) {
            console.error(err);
            setLoading(false);
        }
    };

    if (!studentId) return null;

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            />

            <motion.div
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", damping: 30, stiffness: 300 }}
                className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border-l border-gray-100 dark:border-slate-800 shadow-2xl h-full overflow-y-auto"
            >
                {loading ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : !data ? (
                    <div className="p-8 text-center">
                        <p className="text-red-500">Failed to load profile.</p>
                        <button onClick={onClose} className="mt-4 text-sm text-gray-500 underline">Close</button>
                    </div>
                ) : (
                    <>
                        {/* Header */}
                        <div className="sticky top-0 z-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-gray-100 dark:border-slate-800">
                            <div className="absolute top-4 right-4">
                                <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                                    <X className="w-5 h-5 text-gray-500" />
                                </button>
                            </div>

                            <div className="p-8 pb-0">
                                <div className="flex items-start gap-6 mb-6">
                                    <div className="w-20 h-20 rounded-2xl bg-primary-50 dark:bg-slate-800 flex items-center justify-center text-3xl font-bold text-primary-600 dark:text-sky-400">
                                        {data.student.name.charAt(0)}
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                                            {data.student.name}
                                        </h2>
                                        <p className="text-gray-500 dark:text-slate-400 flex items-center gap-2 text-sm">
                                            <span>{data.student.register_number || 'No Reg No'}</span>
                                            <span className="w-1 h-1 bg-gray-300 rounded-full" />
                                            <span>Year {data.student.year}</span>
                                        </p>

                                        <div className="flex gap-2 mt-3">
                                            <span className={`px-2 py-1 rounded-lg text-xs font-bold ${data.student.trust_score >= 90 ? 'bg-green-100 text-green-700' :
                                                    data.student.trust_score >= 70 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                                                }`}>
                                                TS: {data.student.trust_score}
                                            </span>
                                            <span className="px-2 py-1 bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400 rounded-lg text-xs font-bold uppercase">
                                                {data.student.student_type}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Tabs */}
                                <div className="flex gap-6 border-b border-gray-100 dark:border-slate-800">
                                    {['overview', 'history'].map(tab => (
                                        <button
                                            key={tab}
                                            onClick={() => setActiveTab(tab)}
                                            className={`pb-4 text-sm font-medium capitalize transition-colors relative ${activeTab === tab
                                                    ? 'text-primary-600 dark:text-sky-400'
                                                    : 'text-gray-500 dark:text-slate-500 hover:text-gray-700 dark:hover:text-slate-300'
                                                }`}
                                        >
                                            {tab}
                                            {activeTab === tab && (
                                                <motion.div
                                                    layoutId="activeTab"
                                                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600 dark:bg-sky-400 rounded-full"
                                                />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="p-8">
                            <AnimatePresence mode="wait">
                                {activeTab === 'overview' ? (
                                    <motion.div
                                        key="overview"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        className="space-y-8"
                                    >
                                        {/* Stats Grid */}
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            <div className="p-4 bg-gray-50 dark:bg-slate-800/50 rounded-xl border border-gray-100 dark:border-slate-800">
                                                <p className="text-xs text-gray-500 uppercase mb-1">Total</p>
                                                <p className="text-xl font-bold text-gray-900 dark:text-white">{data.stats.total}</p>
                                            </div>
                                            <div className="p-4 bg-green-50 dark:bg-green-900/10 rounded-xl border border-green-100 dark:border-green-900/20">
                                                <p className="text-xs text-green-600 uppercase mb-1">Approved</p>
                                                <p className="text-xl font-bold text-green-700 dark:text-green-400">{data.stats.approved}</p>
                                            </div>
                                            <div className="p-4 bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-100 dark:border-red-900/20">
                                                <p className="text-xs text-red-600 uppercase mb-1">Rejected</p>
                                                <p className="text-xl font-bold text-red-700 dark:text-red-400">{data.stats.rejected}</p>
                                            </div>
                                            <div className="p-4 bg-orange-50 dark:bg-orange-900/10 rounded-xl border border-orange-100 dark:border-orange-900/20">
                                                <p className="text-xs text-orange-600 uppercase mb-1">Pending</p>
                                                <p className="text-xl font-bold text-orange-700 dark:text-orange-400">{data.stats.pending}</p>
                                            </div>
                                        </div>

                                        {/* Contact Info */}
                                        <div>
                                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Contact Details</h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                                                    <Mail className="w-5 h-5 text-gray-400" />
                                                    <div className="overflow-hidden">
                                                        <p className="text-xs text-gray-500 uppercase">Email</p>
                                                        <p className="text-sm font-medium dark:text-white truncate">{data.student.email}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                                                    <Phone className="w-5 h-5 text-gray-400" />
                                                    <div>
                                                        <p className="text-xs text-gray-500 uppercase">Phone</p>
                                                        <p className="text-sm font-medium dark:text-white">{data.student.phone || 'N/A'}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                                                    <Shield className="w-5 h-5 text-gray-400" />
                                                    <div>
                                                        <p className="text-xs text-gray-500 uppercase">Parent Phone</p>
                                                        <p className="text-sm font-medium dark:text-white">{data.student.parent_phone || 'N/A'}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Accommodation */}
                                        <div>
                                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Accommodation & Mentorship</h3>
                                            <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl divide-y divide-gray-100 dark:divide-slate-800">
                                                <div className="p-4 flex justify-between items-center">
                                                    <div className="flex items-center gap-3">
                                                        <Building className="w-5 h-5 text-gray-400" />
                                                        <span className="text-sm text-gray-600 dark:text-slate-300">Hostel</span>
                                                    </div>
                                                    <span className="font-medium text-gray-900 dark:text-white">{data.student.hostel_name || 'Day Scholar'}</span>
                                                </div>
                                                <div className="p-4 flex justify-between items-center">
                                                    <div className="flex items-center gap-3">
                                                        <MapPin className="w-5 h-5 text-gray-400" />
                                                        <span className="text-sm text-gray-600 dark:text-slate-300">Room Number</span>
                                                    </div>
                                                    <span className="font-medium text-gray-900 dark:text-white">{data.student.room_number || 'N/A'}</span>
                                                </div>
                                                <div className="p-4 flex justify-between items-center">
                                                    <div className="flex items-center gap-3">
                                                        <User className="w-5 h-5 text-gray-400" />
                                                        <span className="text-sm text-gray-600 dark:text-slate-300">Assigned Mentor</span>
                                                    </div>
                                                    <span className="font-medium text-gray-900 dark:text-white">{data.student.mentor_name || 'Not assigned'}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="history"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        className="space-y-4"
                                    >
                                        {data.requests.length === 0 ? (
                                            <div className="text-center py-10 text-gray-500">
                                                <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                                No request history available.
                                            </div>
                                        ) : (
                                            data.requests.map(req => (
                                                <div key={req.id} className="p-4 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl hover:shadow-md transition-all">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <div className="flex items-center gap-2">
                                                            <span className={`px-2 py-0.5 text-[10px] uppercase font-bold rounded ${req.type === 'emergency' ? 'bg-red-100 text-red-700' : 'bg-blue-50 text-blue-700'
                                                                }`}>
                                                                {req.type}
                                                            </span>
                                                            <span className="text-xs text-gray-400">
                                                                {new Date(req.created_at).toLocaleDateString()}
                                                            </span>
                                                        </div>
                                                        {req.status === 'rejected' ? (
                                                            <XCircle className="w-5 h-5 text-red-500" />
                                                        ) : ['completed', 'generated'].includes(req.status) ? (
                                                            <CheckCircle className="w-5 h-5 text-green-500" />
                                                        ) : (
                                                            <Clock className="w-5 h-5 text-orange-400" />
                                                        )}
                                                    </div>
                                                    <p className="text-sm font-medium text-gray-900 dark:text-white mb-2 line-clamp-1">{req.reason}</p>
                                                    <div className="flex items-center gap-4 text-xs text-gray-500">
                                                        <span>Out: {new Date(req.departure_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                        <span>In: {new Date(req.return_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </>
                )}
            </motion.div>
        </div>
    );
};

export default StudentDetailView;
