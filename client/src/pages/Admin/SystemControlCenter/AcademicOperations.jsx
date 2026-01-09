import React, { useState } from 'react';
import axios from 'axios';
import { GraduationCap, Users, AlertTriangle, ArrowRight, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const AcademicOperations = () => {
    const [loading, setLoading] = useState(false);
    const [wizardStep, setWizardStep] = useState(0);
    const [confirmText, setConfirmText] = useState('');
    const [selectedYear, setSelectedYear] = useState(4);

    const handleGraduate = async () => {
        if (!window.confirm(`Are you sure you want to graduate Year ${selectedYear}? This will delete their accounts.`)) return;
        setLoading(true);
        toast.promise(axios.post('/api/admin/academic/graduate', { year: selectedYear, action: 'delete' }), {
            loading: 'Processing Graduation...', success: 'Batch Graduated & Removed', error: 'Failed'
        }).then(() => {
            setWizardStep(2);
        }).catch(err => console.error(err)).finally(() => setLoading(false));
    };

    const handlePromote = async () => {
        if (confirmText !== 'CONFIRM') return toast.error('Type CONFIRM');
        setLoading(true);
        toast.promise(axios.post('/api/admin/academic/promote', { confirmation: 'CONFIRM' }), {
            loading: 'Promoting Students...', success: 'All Students Promoted (+1 Year)', error: 'Failed'
        }).then(() => {
            setWizardStep(3);
            setConfirmText('');
        }).catch(err => console.error(err)).finally(() => setLoading(false));
    };

    const handleReset = async () => {
        if (confirmText !== 'CONFIRM') return toast.error('Type CONFIRM');
        setLoading(true);
        toast.promise(axios.post('/api/admin/database/reset', { mode: 'operational', confirmation: 'CONFIRM' }), {
            loading: 'Resetting Semester...', success: 'Semester Reset Complete', error: 'Failed'
        }).then(() => {
            toast.success('Ready for new semester!');
        }).finally(() => setLoading(false));
    };

    return (
        <div className="space-y-8 animate-fade-in-up">
            <header>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white">Academic Operations</h2>
                <p className="text-slate-500">Manage batch progression, graduations, and semester resets.</p>
            </header>

            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden">
                <div className="p-8 bg-gradient-to-br from-indigo-600 to-purple-700 text-white">
                    <h3 className="text-xl font-bold mb-2">Academic Year Transition Wizard</h3>
                    <p className="text-indigo-100 text-sm">Follow these steps to safely transition the college to the next academic year.</p>
                </div>

                <div className="p-8 space-y-10">
                    {/* Step 1: Graduate */}
                    <div className={`relative pl-8 border-l-2 transition-all ${wizardStep > 0 ? 'border-green-500' : 'border-indigo-500'}`}>
                        <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full ${wizardStep > 0 ? 'bg-green-500' : 'bg-indigo-500'} ring-4 ring-white dark:ring-slate-800`} />
                        <div className={`space-y-4 ${wizardStep > 0 ? 'opacity-50 pointer-events-none' : ''}`}>
                            <div className="flex items-center gap-3">
                                <span className="font-mono text-xs font-bold text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded">STEP 1</span>
                                <h4 className="font-bold text-lg dark:text-white">Graduate Senior Batch</h4>
                            </div>
                            <p className="text-sm text-slate-500">
                                Select the outgoing year (usually Year 4). This will <strong>permanently delete</strong> their student accounts and data.
                            </p>
                            <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                                <GraduationCap className="w-5 h-5 text-slate-400" />
                                <select
                                    value={selectedYear}
                                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                                    className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                    <option value="4">Year 4 (Final Year)</option>
                                    <option value="3">Year 3</option>
                                    <option value="2">Year 2</option>
                                    <option value="1">Year 1</option>
                                </select>
                                <button
                                    onClick={handleGraduate}
                                    disabled={loading}
                                    className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-sm rounded-lg hover:opacity-90 transition"
                                >
                                    Graduate & Remove
                                </button>
                                <button onClick={() => setWizardStep(2)} className="text-xs font-bold text-slate-400 hover:text-indigo-500 underline decoration-dashed">
                                    Skip this step
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Step 2: Promote */}
                    <div className={`relative pl-8 border-l-2 transition-all ${wizardStep < 2 ? 'border-slate-200 dark:border-slate-700' : wizardStep > 2 ? 'border-green-500' : 'border-indigo-500'}`}>
                        <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full ${wizardStep < 2 ? 'bg-slate-300 dark:bg-slate-700' : wizardStep > 2 ? 'bg-green-500' : 'bg-indigo-500'} ring-4 ring-white dark:ring-slate-800`} />
                        <div className={`space-y-4 ${wizardStep !== 2 ? 'opacity-50 pointer-events-none' : ''}`}>
                            <div className="flex items-center gap-3">
                                <span className="font-mono text-xs font-bold text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded">STEP 2</span>
                                <h4 className="font-bold text-lg dark:text-white">Promote Remaining Students</h4>
                            </div>
                            <p className="text-sm text-slate-500">
                                Increment the current Year level of all remaining students by 1 (e.g. Year 1 → Year 2).
                            </p>
                            <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                                <Users className="w-5 h-5 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Type CONFIRM"
                                    value={confirmText}
                                    onChange={(e) => setConfirmText(e.target.value)}
                                    className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 font-bold text-sm w-32 outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                                <button
                                    onClick={handlePromote}
                                    disabled={loading}
                                    className="px-4 py-2 bg-indigo-600 text-white font-bold text-sm rounded-lg hover:bg-indigo-700 transition flex items-center gap-2"
                                >
                                    Promote All <ArrowRight className="w-4 h-4" />
                                </button>
                                <button onClick={() => setWizardStep(3)} className="text-xs font-bold text-slate-400 hover:text-indigo-500 underline decoration-dashed">
                                    Skip
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Step 3: Operational Reset */}
                    <div className={`relative pl-8 border-l-2 border-transparent`}>
                        <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full ${wizardStep < 3 ? 'bg-slate-300 dark:bg-slate-700' : 'bg-indigo-500'} ring-4 ring-white dark:ring-slate-800`} />
                        <div className={`space-y-4 ${wizardStep !== 3 ? 'opacity-50 pointer-events-none' : ''}`}>
                            <div className="flex items-center gap-3">
                                <span className="font-mono text-xs font-bold text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded">STEP 3</span>
                                <h4 className="font-bold text-lg dark:text-white">Reset Semester Operations</h4>
                            </div>
                            <p className="text-sm text-slate-500">
                                Clear all active logs, requests, hostel assignments, and reset Trust Scores to 100%.
                            </p>
                            <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                                <AlertTriangle className="w-5 h-5 text-amber-500" />
                                <input
                                    type="text"
                                    placeholder="Type CONFIRM"
                                    value={confirmText}
                                    onChange={(e) => setConfirmText(e.target.value)}
                                    className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 font-bold text-sm w-32 outline-none focus:ring-2 focus:ring-amber-500"
                                />
                                <button
                                    onClick={handleReset}
                                    disabled={loading}
                                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm rounded-lg transition"
                                >
                                    Reset Operations
                                </button>
                            </div>
                        </div>
                    </div>

                    {wizardStep > 3 && (
                        <div className="p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-xl flex items-center gap-3 text-green-700 dark:text-green-400">
                            <CheckCircle className="w-6 h-6" />
                            <span className="font-bold">Academic Transition Complete!</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AcademicOperations;
