import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    ShieldCheck, Phone, User, Clock, Check, X, AlertTriangle
} from 'lucide-react';

const WardenVerify = () => {
    const [requests, setRequests] = useState([]);
    const [risks, setRisks] = useState({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchRequests();
    }, []);

    const fetchRequests = async () => {
        try {
            const res = await axios.get('/api/warden/verify-queue');
            setRequests(res.data);
            res.data.forEach(req => fetchRisk(req.user_id));
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchRisk = async (studentId) => {
        try {
            const res = await axios.post('/api/ai/predict-risk', { studentId });
            setRisks(prev => ({ ...prev, [studentId]: res.data }));
        } catch (err) {
            console.error("AI Error", err);
        }
    };

    const handleVerify = async (id, score) => {
        if (score < 50) {
            alert("Trust Score below safety threshold. Parent authorization required.");
            return;
        }

        try {
            await axios.put(`/api/warden/${id}/verify`, { status: 'approved_warden' });
            setRequests(prev => prev.filter(req => req.id !== id));
        } catch (err) {
            console.error(err);
            fetchRequests();
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-slate-500 font-medium">Loading...</p>
            </div>
        </div>
    );

    return (
        <div className="space-y-6 pb-20">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Verification Queue</h1>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{requests.length} requests pending approval</p>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                    <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Active</span>
                </div>
            </div>

            {/* Queue */}
            <div className="space-y-4">
                {requests.length === 0 ? (
                    <div className="bg-white dark:bg-slate-800 py-20 rounded-lg border border-slate-200 dark:border-slate-700 text-center">
                        <ShieldCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                        <p className="text-sm text-slate-500">No pending verifications</p>
                    </div>
                ) : (
                    requests.map(req => {
                        const risk = risks[req.user_id];
                        const isLowScore = req.trust_score < 50;

                        return (
                            <div
                                key={req.id}
                                className={`bg-white dark:bg-slate-800 p-6 rounded-lg border-2 transition-all ${isLowScore
                                        ? 'border-rose-300 dark:border-rose-700'
                                        : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700'
                                    }`}
                            >
                                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                                    <div className="flex items-center gap-4 flex-1">
                                        <div className={`w-14 h-14 rounded-lg flex items-center justify-center font-bold text-xl ${isLowScore
                                                ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400'
                                                : 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                                            }`}>
                                            {req.trust_score}
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="text-lg font-semibold text-slate-900 dark:text-white">{req.student_name}</h4>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded text-xs font-medium">
                                                    {req.type}
                                                </span>
                                                <span className="text-sm text-slate-600 dark:text-slate-400">{req.reason}</span>
                                            </div>
                                            {isLowScore && (
                                                <div className="flex items-center gap-2 mt-2 text-rose-600 dark:text-rose-400">
                                                    <AlertTriangle className="w-4 h-4" />
                                                    <span className="text-xs font-medium">Low trust score - Parent contact required</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {isLowScore && (
                                            <button className="px-4 py-2 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-900/30 transition-colors flex items-center gap-2 text-sm font-medium border border-rose-200 dark:border-rose-800">
                                                <Phone className="w-4 h-4" />
                                                Call Parent
                                            </button>
                                        )}
                                        <button
                                            onClick={() => handleVerify(req.id, req.trust_score)}
                                            disabled={isLowScore}
                                            className={`px-6 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${isLowScore
                                                    ? 'bg-slate-100 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
                                                    : 'bg-indigo-600 text-white hover:bg-indigo-700'
                                                }`}
                                        >
                                            <Check className="w-4 h-4" />
                                            {isLowScore ? 'Locked' : 'Approve'}
                                        </button>
                                    </div>
                                </div>

                                {/* AI Risk Assessment */}
                                {risk && (
                                    <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">AI Risk Assessment:</span>
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${risk.riskLevel === 'CRITICAL' || risk.riskLevel === 'HIGH'
                                                    ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400'
                                                    : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                                                }`}>
                                                {risk.riskLevel}
                                            </span>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {risk.factors.slice(0, 3).map((f, i) => (
                                                <span key={i} className="px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 rounded text-xs">
                                                    {f}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default WardenVerify;
