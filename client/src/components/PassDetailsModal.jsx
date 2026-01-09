import React from 'react';
import Modal from './Modal';
import {
    Clock,
    CheckCircle2,
    XCircle,
    MapPin,
    Calendar,
    ArrowRight,
    ShieldCheck,
    User,
    FileText
} from 'lucide-react';
import StatusRing from './StatusRing';
import axios from 'axios';
import { useState, useEffect } from 'react';

const PassDetailsModal = ({ isOpen, onClose, request }) => {
    const [timeline, setTimeline] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && request) {
            fetchTimeline();
        }
    }, [isOpen, request]);

    const fetchTimeline = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`/api/requests/${request.id}/timeline`);
            setTimeline(res.data);
        } catch (error) {
            console.error("Failed to fetch timeline");
        } finally {
            setLoading(false);
        }
    };

    if (!request) return null;

    // Helper to determine step status
    const getStepStatus = (stepName) => {
        const stage = timeline.find(t => t.stage === stepName);
        if (stage) return 'completed';

        const rejection = timeline.find(t => t.stage === 'rejected');
        if (rejection) {
            let failedRole = rejection.rejectedBy?.toLowerCase();
            // Map backend roles to frontend step names
            if (failedRole === 'staff') failedRole = 'mentor';

            if (stepName === failedRole) return 'error';
        }

        return 'pending';
    };

    const renderTimelineStep = (id, label, icon, date) => {
        const status = getStepStatus(id);
        const isCompleted = status === 'completed';
        const isError = status === 'error';

        let Icon = icon;
        let colorClass = 'text-slate-300 border-slate-200 bg-slate-50';
        let lineClass = 'bg-slate-200';

        if (isCompleted) {
            Icon = CheckCircle2;
            colorClass = 'text-green-600 border-green-200 bg-green-50';
            lineClass = 'bg-green-500';
        } else if (isError) {
            Icon = XCircle;
            colorClass = 'text-red-600 border-red-200 bg-red-50';
            lineClass = 'bg-slate-200';
        } else if (request.status === 'active' && id === 'return') {
            colorClass = 'text-blue-600 border-blue-200 bg-blue-50 animate-pulse';
            Icon = Clock;
        }

        return (
            <div className="flex gap-4 relative">
                {/* Vertical Line */}
                {id !== 'return' && (
                    <div className={`absolute left-5 top-10 bottom-[-20px] w-0.5 ${lineClass} z-0`} />
                )}

                <div className={`w-10 h-10 rounded-full border-2 ${colorClass} flex items-center justify-center shrink-0 z-10 relative`}>
                    <Icon className="w-5 h-5" />
                </div>
                <div className="pb-8">
                    <p className={`font-bold text-sm ${isCompleted ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>{label}</p>
                    {isCompleted && date && (
                        <p className="text-xs text-slate-500 mt-0.5">
                            {new Date(date).toLocaleDateString()} at {new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                    )}
                </div>
            </div>
        );
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Pass Details #${request.id}`}
        >
            <div className="space-y-6">
                {/* Header Info */}
                <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 flex justify-between items-start">
                    <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Type</span>
                        <h3 className="text-lg font-black text-slate-900 dark:text-white capitalize">{request.type}</h3>
                        <div className="flex items-center gap-2 mt-2">
                            <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${request.status === 'active' || request.status === 'out' ? 'bg-blue-100 text-blue-700' :
                                request.status === 'completed' ? 'bg-green-100 text-green-700' :
                                    'bg-slate-200 text-slate-600'
                                }`}>
                                {request.status.replace('_', ' ')}
                            </span>
                        </div>
                    </div>
                    <div className="text-right">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ref ID</span>
                        <p className="font-mono text-lg font-bold text-slate-700 dark:text-slate-300">#{request.id.toString().padStart(4, '0')}</p>
                    </div>
                </div>

                {/* Dates Grid */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-xl">
                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Departure</p>
                        <p className="font-semibold text-slate-900 dark:text-white text-sm">
                            {new Date(request.departure_date).toLocaleDateString()}
                        </p>
                        <p className="text-xs text-slate-500">
                            {new Date(request.departure_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                    </div>
                    <div className="p-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-xl">
                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Return By</p>
                        <p className="font-semibold text-slate-900 dark:text-white text-sm">
                            {new Date(request.return_date).toLocaleDateString()}
                        </p>
                        <p className="text-xs text-slate-500">
                            {new Date(request.return_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                    </div>
                </div>

                {/* Timeline */}
                <div className="border-t border-slate-100 dark:border-slate-700 pt-6">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Approval Timeline</h4>
                    <div className="pl-2">
                        {loading ? (
                            <div className="p-4 text-center text-xs text-slate-400">Loading timeline...</div>
                        ) : (
                            <>
                                {timeline.find(t => t.stage === 'submitted') && renderTimelineStep('submitted', 'Request Submitted', FileText, timeline.find(t => t.stage === 'submitted').timestamp)}
                                {timeline.find(t => t.stage === 'mentor') ?
                                    renderTimelineStep('mentor', 'Mentor Verification', User, timeline.find(t => t.stage === 'mentor').timestamp)
                                    : renderTimelineStep('mentor', 'Mentor Verification', User)
                                }
                                {timeline.find(t => t.stage === 'hod') ?
                                    renderTimelineStep('hod', 'HOD Approval', ShieldCheck, timeline.find(t => t.stage === 'hod').timestamp)
                                    : renderTimelineStep('hod', 'HOD Approval', ShieldCheck)
                                }
                                {timeline.find(t => t.stage === 'warden') ?
                                    renderTimelineStep('warden', 'Warden Authorization', ShieldCheck, timeline.find(t => t.stage === 'warden').timestamp)
                                    : renderTimelineStep('warden', 'Warden Authorization', ShieldCheck)
                                }
                                {timeline.find(t => t.stage === 'exit') ?
                                    renderTimelineStep('exit', 'Gate Exit', ArrowRight, timeline.find(t => t.stage === 'exit').timestamp)
                                    : renderTimelineStep('exit', 'Gate Exit', ArrowRight)
                                }
                                {timeline.find(t => t.stage === 'return') ?
                                    renderTimelineStep('return', 'Gate Return', ArrowRight, timeline.find(t => t.stage === 'return').timestamp)
                                    : renderTimelineStep('return', 'Gate Return', ArrowRight)
                                }
                                {timeline.find(t => t.stage === 'cancelled') && (
                                    <div className="flex gap-4 relative">
                                        <div className={`w-10 h-10 rounded-full border-2 text-slate-500 border-slate-300 bg-slate-100 flex items-center justify-center shrink-0 z-10 relative`}>
                                            <XCircle className="w-5 h-5" />
                                        </div>
                                        <div className="pb-8">
                                            <p className="font-bold text-sm text-slate-500">Request Cancelled</p>
                                            <p className="text-xs text-slate-500 mt-0.5">
                                                {new Date(timeline.find(t => t.stage === 'cancelled').timestamp).toLocaleDateString()} at {new Date(timeline.find(t => t.stage === 'cancelled').timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>

                {/* Reason */}
                <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Reason</p>
                    <p className="text-sm text-slate-700 dark:text-slate-300 italic">"{request.reason}"</p>
                </div>

            </div>
        </Modal>
    );
};

export default PassDetailsModal;
