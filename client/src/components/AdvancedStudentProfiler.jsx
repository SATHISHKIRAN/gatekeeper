import React, { useState } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
    User, FileText, Activity, Shield, CheckCircle,
    Clock, AlertTriangle, Briefcase, XCircle
} from 'lucide-react';
import Modal from './Modal';

const AdvancedStudentProfiler = ({ isOpen, onClose, data, onUpdate }) => {
    const [activeTab, setActiveTab] = useState('overview');
    const [localData, setLocalData] = useState(data);

    // Sync local data if prop updates
    React.useEffect(() => {
        setLocalData(data);
    }, [data]);

    const getYearLabel = (year) => {
        const strYear = String(year).trim().toUpperCase();
        if (!year || year === 0 || strYear === '0' || strYear === 'N/A' || strYear === 'UNKNOWN') {
            return '';
        }
        const num = parseInt(strYear);
        if (isNaN(num)) return strYear;
        return `${num}yr`;
    };

    if (!localData) return null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            maxWidth="max-w-4xl"
            showPadding={false}
        >
            <div className="flex flex-col h-[700px]">
                {/* Profile Header */}
                <div className="bg-white dark:bg-slate-900 p-8 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between">
                    <div className="flex items-center gap-6">
                        <div className="w-20 h-20 rounded-2xl bg-indigo-600 text-white flex items-center justify-center text-3xl font-bold shadow-lg shadow-indigo-500/20">
                            {localData.student.name.charAt(0)}
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{localData.student.name}</h2>
                            <div className="flex items-center gap-3 mt-2 text-sm text-slate-500">
                                <span className="font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-700 dark:text-slate-300">
                                    {localData.student.register_number}
                                </span>
                                <span>•</span>
                                <span>{getYearLabel(localData.student.year)}</span>
                                <span>•</span>
                                <span className="lowercase">{localData.student.email}</span>
                            </div>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-sm text-slate-400 uppercase tracking-wider font-semibold mb-1">Trust Score</p>
                        <span className={`text-4xl font-black ${localData.student.trust_score >= 80 ? 'text-emerald-500' :
                            localData.student.trust_score >= 50 ? 'text-indigo-500' : 'text-red-500'
                            }`}>
                            {localData.student.trust_score}
                        </span>
                    </div>
                </div>

                {/* Navigation Tabs */}
                <div className="flex border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 px-8">
                    {[
                        { id: 'overview', label: 'Overview', icon: User },
                        { id: 'history', label: 'History', icon: FileText },
                        { id: 'stats', label: 'Analytics', icon: Activity }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id
                                ? 'border-indigo-600 text-indigo-600'
                                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-200'
                                }`}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Modal Body Content */}
                <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950/50 p-8">

                    {/* TAB: OVERVIEW */}
                    {activeTab === 'overview' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Trust Manager Card */}
                            <div className="md:col-span-2 bg-indigo-50 dark:bg-indigo-900/10 p-6 rounded-xl border border-indigo-100 dark:border-indigo-900/30 flex flex-col md:flex-row items-center gap-6">
                                <div className="flex-1 w-full">
                                    <div className="flex justify-between items-center mb-2">
                                        <h4 className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Trust Index Adjustment</h4>
                                        <span className="text-sm font-black text-indigo-700 dark:text-indigo-300">{localData.student.trust_score}%</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max="100"
                                        value={localData.student.trust_score}
                                        onChange={(e) => setLocalData(prev => ({ ...prev, student: { ...prev.student, trust_score: parseInt(e.target.value) } }))}
                                        className="w-full h-2 bg-indigo-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                    />
                                    <div className="flex justify-between text-[10px] text-gray-400 font-bold mt-1 uppercase tracking-wider">
                                        <span>Risk (0)</span>
                                        <span>Neutral (50)</span>
                                        <span>Trusted (100)</span>
                                    </div>
                                </div>
                                <button
                                    onClick={async () => {
                                        try {
                                            await axios.post('/api/hod/update-trust-score', {
                                                studentId: localData.student.id,
                                                score: localData.student.trust_score
                                            });
                                            if (onUpdate) onUpdate();
                                            alert('Trust score updated successfully.');
                                        } catch (err) {
                                            console.error('Update failed');
                                            alert('Failed to update score.');
                                        }
                                    }}
                                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-500/20 transition-all active:scale-95 whitespace-nowrap"
                                >
                                    Update Score
                                </button>
                            </div>

                            {/* Key Status Card */}
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">Current Status</h4>
                                <div className="flex items-center gap-4 mb-2">
                                    {localData.active_pass ? (
                                        <>
                                            <div className="p-3 bg-amber-50 text-amber-600 rounded-lg animate-pulse">
                                                <Activity className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-900 dark:text-white">Student Outside</p>
                                                <p className="text-sm text-slate-500">
                                                    Pass Active • Departed {new Date(localData.active_pass.departure_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </div>
                                        </>
                                    ) : localData.student.pass_blocked ? (
                                        <>
                                            <div className="p-3 bg-red-50 text-red-600 rounded-lg">
                                                <Shield className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-900 dark:text-white">Gate Access Blocked</p>
                                                <p className="text-sm text-slate-500">Student cannot exit campus.</p>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
                                                <CheckCircle className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-900 dark:text-white">Gate Access Active</p>
                                                <p className="text-sm text-slate-500">Student can apply for passes.</p>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Recent Activity Card */}
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">Last Activity</h4>
                                {localData.stats.last_activity ? (
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
                                            <Clock className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-900 dark:text-white capitalize">
                                                {localData.stats.last_activity.action} Detected
                                            </p>
                                            <p className="text-sm text-slate-500">
                                                {new Date(localData.stats.last_activity.timestamp).toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-slate-500 text-sm">No recent gate logs found.</p>
                                )}
                            </div>

                            {/* Quick Stats Grid */}
                            <div className="col-span-1 md:col-span-2 grid grid-cols-3 gap-4">
                                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
                                    <p className="text-3xl font-bold text-slate-900 dark:text-white">{localData.stats.total_requests}</p>
                                    <p className="text-xs text-slate-400 uppercase mt-1">Total Requests</p>
                                </div>
                                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
                                    <p className="text-3xl font-bold text-emerald-600">{localData.stats.approved}</p>
                                    <p className="text-xs text-slate-400 uppercase mt-1">Approved</p>
                                </div>
                                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
                                    <p className="text-3xl font-bold text-red-600">{localData.stats.rejected}</p>
                                    <p className="text-xs text-slate-400 uppercase mt-1">Rejected</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB: HISTORY */}
                    {activeTab === 'history' && (
                        <div className="space-y-4">
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Past 20 Entries</h4>
                            {localData.history.length === 0 ? (
                                <div className="text-center py-12 text-slate-500">No history found.</div>
                            ) : (
                                localData.history.map((req) => (
                                    <div key={req.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className={`p-2 rounded-lg ${req.type === 'emergency' ? 'bg-red-50 text-red-600' : 'bg-indigo-50 text-indigo-600'
                                                }`}>
                                                {req.type === 'emergency' ? <AlertTriangle className="w-5 h-5" /> : <Briefcase className="w-5 h-5" />}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-slate-900 dark:text-white capitalize">{req.type} Pass</p>
                                                <p className="text-xs text-slate-500">{new Date(req.created_at).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${req.status.includes('approved') || req.status === 'completed'
                                                ? 'bg-emerald-50 text-emerald-600'
                                                : req.status === 'rejected'
                                                    ? 'bg-red-50 text-red-600'
                                                    : 'bg-amber-50 text-amber-600'
                                                }`}>
                                                {req.status.replace('_', ' ')}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {/* TAB: STATS/ANALYTICS */}
                    {activeTab === 'stats' && (
                        <div className="text-center py-12">
                            <Activity className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                            <p className="text-slate-500 font-medium">Advanced visualization analytics coming soon.</p>
                            <p className="text-slate-400 text-sm">Will include dwell time charts and frequent exit heatmap.</p>
                        </div>
                    )}

                </div>

                {/* Modal Footer */}
                <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-slate-900 dark:bg-slate-700 text-white rounded-lg text-sm font-bold hover:bg-slate-800 transition-colors"
                    >
                        Close Profile
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default AdvancedStudentProfiler;
