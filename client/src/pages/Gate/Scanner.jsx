import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
    LogOut, LogIn, ArrowLeft, Keyboard,
    CheckCircle, XCircle, Search, User, CreditCard,
    ShieldCheck, AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

const playSound = (type) => {
    if (typeof window === 'undefined') return;
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();
        oscillator.connect(gain);
        gain.connect(ctx.destination);

        if (type === 'success') {
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(500, ctx.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(1000, ctx.currentTime + 0.1);
            gain.gain.setValueAtTime(0.1, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
            oscillator.start();
            oscillator.stop(ctx.currentTime + 0.5);
        } else if (type === 'error') {
            oscillator.type = 'sawtooth';
            oscillator.frequency.setValueAtTime(200, ctx.currentTime);
            oscillator.frequency.linearRampToValueAtTime(100, ctx.currentTime + 0.3);
            gain.gain.setValueAtTime(0.1, ctx.currentTime);
            oscillator.start();
            oscillator.stop(ctx.currentTime + 0.3);
        }
    } catch (e) { console.error("Audio error", e); }
};

const SmartScanner = ({ onClose }) => {
    const [view, setView] = useState('entry'); // entry, result
    const [status, setStatus] = useState('idle'); // idle, verifying, processing
    const [scanResult, setScanResult] = useState(null);
    const [manualInput, setManualInput] = useState('');
    const inputRef = useRef(null);

    useEffect(() => {
        if (view === 'entry' && inputRef.current) {
            inputRef.current.focus();
        }
    }, [view]);

    // --- LOGIC ---
    const handleManualSubmit = async (e) => {
        e.preventDefault();
        if (!manualInput.trim()) return;

        setStatus('verifying');
        try {
            const res = await axios.post('/api/gate/verify-pass', { regNo: manualInput.trim() });
            setScanResult(res.data);
            setView('result');
            setStatus('idle');
            playSound('success');
        } catch (err) {
            setStatus('idle');
            playSound('error');

            // Handle specific cases
            if (err.response?.data?.student) {
                // Student found but pass invalid/missing
                setScanResult({
                    success: false,
                    status: 'invalid',
                    message: err.response.data.message || 'No Active Pass',
                    student: err.response.data.student
                });
                setView('result');
            } else {
                toast.error(err.response?.data?.message || 'Student not found');
            }
        }
    };

    const processAction = async (action) => {
        if (!scanResult?.pass?.id) return;
        setStatus('processing');
        try {
            await axios.post('/api/gate/log-action', {
                requestId: scanResult.pass.id,
                action: action
            });
            playSound('success');
            toast.success(`Successfully Marked ${action.toUpperCase()}`);

            // Reset after short delay
            setTimeout(() => {
                resetScanner();
            }, 1500);
        } catch (err) {
            setStatus('idle');
            toast.error("Action Failed");
            playSound('error');
        }
    };

    const resetScanner = () => {
        setScanResult(null);
        setManualInput('');
        setStatus('idle');
        setView('entry');
    };

    // --- RENDERERS ---

    const renderEntry = () => (
        <div className="flex flex-col items-center justify-center flex-1 w-full max-w-lg mx-auto p-6 animate-in fade-in duration-500">
            <div className="w-full bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-xl border border-gray-100 dark:border-slate-700">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl flex items-center justify-center mx-auto mb-4 text-indigo-600 dark:text-indigo-400">
                        <Keyboard className="w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-black text-gray-900 dark:text-white">Gate Terminal</h2>
                    <p className="text-gray-500 dark:text-slate-400">Enter Student Registration Number</p>
                </div>

                <form onSubmit={handleManualSubmit} className="space-y-6">
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                            ref={inputRef}
                            type="text"
                            value={manualInput}
                            onChange={(e) => setManualInput(e.target.value.toUpperCase())}
                            className="block w-full pl-11 pr-4 py-4 bg-gray-50 dark:bg-slate-900 border-2 border-gray-200 dark:border-slate-700 rounded-xl text-xl font-mono font-bold text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all uppercase tracking-wider"
                            placeholder="REG NUMBER"
                            disabled={status === 'verifying'}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={!manualInput.trim() || status === 'verifying'}
                        className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {status === 'verifying' ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Verifying...
                            </>
                        ) : (
                            <>
                                Verify Status <ArrowLeft className="w-5 h-5 rotate-180" />
                            </>
                        )}
                    </button>
                </form>
            </div>

            <p className="mt-8 text-center text-xs text-gray-400 uppercase font-bold tracking-widest">
                Secure Gate Management System
            </p>
        </div>
    );

    const renderResult = () => {
        if (!scanResult) return null;
        const { student, pass, status: passStatus, allowedActions, message, warning } = scanResult;
        const isActionProcessing = status === 'processing';

        return (
            <div className="flex flex-col items-center justify-center flex-1 w-full max-w-2xl mx-auto p-4 animate-in slide-in-from-bottom-5 fade-in duration-300">

                {/* Status Header */}
                <div className={`w-full rounded-t-3xl p-6 text-center ${passStatus === 'valid' || passStatus === 'out' ? 'bg-emerald-500' :
                        passStatus === 'overdue' ? 'bg-amber-500' : 'bg-red-500'
                    }`}>
                    <div className="bg-white/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 backdrop-blur-md shadow-lg">
                        {passStatus === 'valid' || passStatus === 'out' ? <CheckCircle className="w-8 h-8 text-white" /> :
                            passStatus === 'overdue' ? <AlertTriangle className="w-8 h-8 text-white" /> : <XCircle className="w-8 h-8 text-white" />}
                    </div>
                    <h2 className="text-2xl font-black text-white leading-tight">{message}</h2>
                    {warning && <div className="mt-2 inline-block px-3 py-1 bg-white/20 rounded-lg text-white text-xs font-bold backdrop-blur-sm">{warning}</div>}
                </div>

                {/* Details Card */}
                <div className="w-full bg-white dark:bg-slate-800 rounded-b-3xl shadow-xl border-x border-b border-gray-100 dark:border-slate-700 p-8 space-y-8">

                    {/* Student Info */}
                    <div className="flex items-start gap-6">
                        <div className="w-20 h-20 bg-gray-100 dark:bg-slate-700 rounded-2xl flex items-center justify-center text-2xl font-bold text-gray-500 dark:text-gray-400 shrink-0">
                            {student?.name?.charAt(0)}
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">{student?.name}</h3>
                            <p className="font-mono text-gray-500 dark:text-slate-400 text-lg">{student?.regNo}</p>
                            <div className="flex gap-2 mt-2">
                                <span className="px-2 py-1 bg-gray-100 dark:bg-slate-700 rounded text-xs font-bold text-gray-600 dark:text-gray-300">{student?.dept}</span>
                                <span className="px-2 py-1 bg-gray-100 dark:bg-slate-700 rounded text-xs font-bold text-gray-600 dark:text-gray-300">Year {student?.year}</span>
                            </div>
                        </div>
                    </div>

                    {/* Pass Info */}
                    {pass && (
                        <div className="grid grid-cols-2 gap-4 pt-6 border-t border-gray-100 dark:border-slate-700">
                            <div className="bg-gray-50 dark:bg-slate-900/50 p-3 rounded-xl">
                                <p className="text-xs text-gray-400 uppercase font-bold mb-1">Pass Type</p>
                                <p className="font-bold text-gray-900 dark:text-white">{pass.type}</p>
                            </div>
                            <div className="bg-gray-50 dark:bg-slate-900/50 p-3 rounded-xl">
                                <p className="text-xs text-gray-400 uppercase font-bold mb-1">Return By</p>
                                <p className="font-bold text-gray-900 dark:text-white">{new Date(pass.return).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="space-y-3 pt-4">
                        {allowedActions?.includes('exit') && (
                            <button
                                onClick={() => processAction('exit')}
                                disabled={isActionProcessing}
                                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-3 transition-transform active:scale-95"
                            >
                                {isActionProcessing ? 'Processing...' : <><LogOut className="w-5 h-5" /> CONFIRM EXIT</>}
                            </button>
                        )}
                        {allowedActions?.includes('entry') && (
                            <button
                                onClick={() => processAction('entry')}
                                disabled={isActionProcessing}
                                className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-3 transition-transform active:scale-95"
                            >
                                {isActionProcessing ? 'Processing...' : <><LogIn className="w-5 h-5" /> CONFIRM RETURN</>}
                            </button>
                        )}

                        {(!allowedActions || allowedActions.length === 0) && (
                            <button disabled className="w-full py-4 bg-gray-100 dark:bg-slate-700 text-gray-400 font-bold rounded-xl cursor-not-allowed">
                                No Actions Available
                            </button>
                        )}

                        <button
                            onClick={resetScanner}
                            disabled={isActionProcessing}
                            className="w-full py-3 text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-white font-bold transition-colors"
                        >
                            Cancel / Verify Another
                        </button>
                    </div>

                </div>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 z-50 bg-gray-100 dark:bg-gray-900 flex flex-col">
            {/* Simple Header */}
            <div className="bg-white dark:bg-black p-4 flex items-center justify-between shadow-sm z-10">
                <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 transition">
                    <ArrowLeft className="w-6 h-6 text-gray-900 dark:text-white" />
                </button>
                <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-indigo-500" />
                    <h1 className="text-lg font-bold text-gray-900 dark:text-white">Gate Control</h1>
                </div>
                <div className="w-10"></div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto relative flex flex-col items-center justify-center">
                <div className="absolute inset-0 opacity-5 dark:opacity-20 pattern-grid-lg pointer-events-none"></div>
                {view === 'entry' ? renderEntry() : renderResult()}
            </div>
        </div>
    );
};

export default SmartScanner;
