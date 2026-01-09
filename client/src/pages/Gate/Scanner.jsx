import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { Html5QrcodeScanner } from 'html5-qrcode';
import {
    LogOut, LogIn, ArrowLeft, Keyboard,
    CheckCircle, XCircle, Search, User, CreditCard,
    ShieldCheck, AlertTriangle, Zap, History,
    RotateCcw, Volume2, Shield, Clock, MapPin, Phone, Hash, Calendar, QrCode
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
            oscillator.frequency.setValueAtTime(440, ctx.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1);
            gain.gain.setValueAtTime(0.1, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
            oscillator.start();
            oscillator.stop(ctx.currentTime + 0.3);
        } else if (type === 'error') {
            oscillator.type = 'sawtooth';
            oscillator.frequency.setValueAtTime(150, ctx.currentTime);
            oscillator.frequency.linearRampToValueAtTime(100, ctx.currentTime + 0.3);
            gain.gain.setValueAtTime(0.1, ctx.currentTime);
            oscillator.start();
            oscillator.stop(ctx.currentTime + 0.3);
        } else if (type === 'neutral') {
            oscillator.type = 'triangle';
            oscillator.frequency.setValueAtTime(600, ctx.currentTime);
            gain.gain.setValueAtTime(0.05, ctx.currentTime);
            oscillator.start();
            oscillator.stop(ctx.currentTime + 0.05);
        }
    } catch (e) { console.error("Audio error", e); }
};

const GateScanner = ({ onClose }) => {
    const [view, setView] = useState('entry'); // entry, result
    const [status, setStatus] = useState('idle'); // idle, verifying, processing
    const [scanResult, setScanResult] = useState(null);
    const [recentScans, setRecentScans] = useState([]);
    const [manualInput, setManualInput] = useState('');
    const [shake, setShake] = useState(false);
    const [scanMode, setScanMode] = useState(false); // Toggle for Camera
    const inputRef = useRef(null);

    // --- OFFLINE CACHE SYNC ---
    useEffect(() => {
        const syncCache = async () => {
            try {
                const res = await axios.get('/api/gate/sync-cache');
                if (res.data.data) {
                    localStorage.setItem('gate_cache', JSON.stringify(res.data));
                }
            } catch (e) {
                // If offline, silent fail
                console.log('Cache Sync Failed (Offline)');
            }
        };

        syncCache(); // Initial load
        const interval = setInterval(syncCache, 5 * 60 * 1000); // Every 5 mins
        return () => clearInterval(interval);
    }, []);

    // --- HOTKEYS ---
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                if (view === 'result') resetScanner();
                else onClose();
            }
            if (e.key === 'Enter' && view === 'result' && status === 'idle') {
                const primaryAction = scanResult?.allowedActions?.[0];
                if (primaryAction) processAction(primaryAction);
            }
            if (e.key.toLowerCase() === 'm' && document.activeElement !== inputRef.current && view === 'entry') {
                e.preventDefault();
                inputRef.current?.focus();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [view, status, scanResult]);

    useEffect(() => {
        if (view === 'entry' && !scanMode && inputRef.current) {
            inputRef.current.focus();
        }
    }, [view, scanMode]);

    // --- QR SCANNER EFFECT ---
    useEffect(() => {
        if (scanMode && view === 'entry') {
            const scanner = new Html5QrcodeScanner(
                "reader",
                {
                    fps: 10,
                    qrbox: { width: 250, height: 250 },
                    aspectRatio: 1.0,
                    showTorchButtonIfSupported: true
                },
                /* verbose= */ false
            );

            scanner.render(
                (decodedText) => {
                    // Success
                    console.log("Scan Success:", decodedText);
                    scanner.clear();
                    setScanMode(false);
                    setManualInput(decodedText.toUpperCase());

                    // Trigger submission logic manually or via effect?
                    // Let's call the submit handler directly:
                    // Need to mock event or adapt handler
                    verifyPass(decodedText.toUpperCase());
                },
                (errorMessage) => {
                    // Fail (harmless usually)
                }
            );

            return () => {
                try { scanner.clear(); } catch (e) { }
            };
        }
    }, [scanMode, view]);

    // Extracted verify function to reuse
    const verifyPass = async (regNo) => {
        if (!regNo) return;
        setStatus('verifying');
        try {
            const res = await axios.post('/api/gate/verify-pass', { regNo: regNo.trim() });
            setScanResult(res.data);
            setView('result');
            setStatus('idle');
            playSound('success');

            // Add to recent
            setRecentScans(prev => [{
                id: Date.now(),
                name: res.data.student.name,
                regNo: res.data.student.regNo,
                status: res.data.status === 'valid' ? 'READY' : res.data.status === 'out' ? 'OUT' : res.data.status,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }, ...prev].slice(0, 5));
        } catch (err) {
            handleVerifyError(err, regNo);
        }
    };

    const handleVerifyError = (err, regNo) => {
        // --- OFFLINE FALLBACK ---
        if (!err.response || err.code === 'ERR_NETWORK' || err.response.status >= 500) {
            const cacheStr = localStorage.getItem('gate_cache');
            if (cacheStr) {
                try {
                    const cache = JSON.parse(cacheStr);
                    const cleanInput = regNo.trim().toUpperCase();
                    const record = cache.data.find(r => r.regNo === cleanInput);

                    if (record) {
                        setScanResult({
                            success: true,
                            status: record.pass.status === 'active' ? 'valid' : record.pass.status,
                            message: 'OFFLINE VERIFIED (Server Down)',
                            warning: '⚠️ OFFLINE MODE: Data may be slightly stale.',
                            allowedActions: !record.pass.last_action ? ['exit'] : ['entry'],
                            pass: {
                                id: record.pass.id,
                                type: record.pass.type,
                                departure: record.pass.departure,
                                return: record.pass.return
                            },
                            student: {
                                id: 0,
                                name: record.name,
                                regNo: record.regNo,
                                dept: record.dept,
                                year: record.year,
                                type: record.type,
                                trustScore: record.trustScore
                            }
                        });
                        setView('result');
                        setStatus('idle');
                        playSound('success');
                        return;
                    }
                } catch (cacheErr) { console.error("Cache Parse Error", cacheErr); }
            }
            toast.error("OFFLINE: Student not in local cache");
        }

        setStatus('idle');
        playSound('error');
        setShake(true);
        setTimeout(() => setShake(false), 500);

        if (err.response?.data?.student) {
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
    };

    // --- LOGIC ---
    const handleManualSubmit = async (e) => {
        e?.preventDefault();
        if (!manualInput.trim()) return;
        verifyPass(manualInput);
    };

    // --- OFFLINE ACTION SYNC ---
    const syncOfflineQueue = async () => {
        if (!navigator.onLine) return;
        const queueStr = localStorage.getItem('gate_offline_queue');
        if (!queueStr) return;

        let queue = [];
        try {
            queue = JSON.parse(queueStr);
        } catch (e) {
            localStorage.removeItem('gate_offline_queue');
            return;
        }

        if (queue.length === 0) return;

        console.log(`Attempting to sync ${queue.length} offline actions...`);
        const newQueue = [];
        let syncedCount = 0;

        for (const actionItem of queue) {
            try {
                await axios.post('/api/gate/log-action', actionItem);
                syncedCount++;
            } catch (err) {
                // If it's still a network error, keep it in queue. 
                // If it's a 4xx error (logic error), drop it or maybe log it differently? 
                // For now, only retry if network/server error.
                if (!err.response || err.response.status >= 500) {
                    newQueue.push(actionItem);
                } else {
                    console.error("Failed to sync item (permanent error):", actionItem, err);
                    // maybe show a toast warning?
                }
            }
        }

        if (newQueue.length > 0) {
            localStorage.setItem('gate_offline_queue', JSON.stringify(newQueue));
        } else {
            localStorage.removeItem('gate_offline_queue');
        }

        if (syncedCount > 0) {
            toast.success(`Synced ${syncedCount} offline actions`, { icon: '🔄' });
        }
    };

    useEffect(() => {
        syncOfflineQueue(); // On mount
        const interval = setInterval(syncOfflineQueue, 30 * 1000); // Every 30s
        window.addEventListener('online', syncOfflineQueue);
        return () => {
            clearInterval(interval);
            window.removeEventListener('online', syncOfflineQueue);
        };
    }, []);

    const processAction = async (action) => {
        // Fallback: If no pass ID, maybe use student ID or log error?
        // Assuming requestId corresponds to pass.id as per current logic.
        if (!scanResult?.pass?.id) {
            console.error("Missing Pass ID for action");
            toast.error("Cannot process: Missing Pass ID");
            return;
        }

        setStatus('processing');

        const payload = {
            requestId: scanResult.pass.id,
            action: action,
            comments: 'Gate Terminal Log'
        };

        const performOptimisticUpdate = () => {
            // Update status in recent list safely
            setRecentScans(prev => {
                try {
                    return prev.map(s =>
                        s.regNo === scanResult.student.regNo
                            ? { ...s, status: action === 'exit' ? 'EXITED' : 'RETURNED', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
                            : s
                    );
                } catch (e) {
                    return prev;
                }
            });

            // Redirect back to Entry ("Revise Page" / "Previous Page")
            setTimeout(() => {
                resetScanner();
            }, 400); // Reduced delay for snappier feel
        };

        try {
            await axios.post('/api/gate/log-action', payload);
            playSound('success');
            toast.success(`Marked ${action.toUpperCase()}`);
            performOptimisticUpdate();

        } catch (err) {
            console.error("Action Error:", err);

            // --- OFFLINE QUEUE (Optimistic) ---
            if (!err.response || err.code === 'ERR_NETWORK' || err.response.status >= 500) {
                const queueStr = localStorage.getItem('gate_offline_queue');
                let queue = [];
                try { queue = queueStr ? JSON.parse(queueStr) : []; } catch (e) { }

                queue.push(payload);
                localStorage.setItem('gate_offline_queue', JSON.stringify(queue));

                playSound('success');
                toast.success(`OFFLINE: Marked ${action.toUpperCase()}`, { icon: '💾' });
                performOptimisticUpdate();
                return;
            }

            // Real Error (e.g. 400 Validation)
            setStatus('idle');
            toast.error(err.response?.data?.message || "Action Failed");
            playSound('error');
        }
    };

    const resetScanner = () => {
        setScanResult(null);
        setManualInput('');
        setStatus('idle');
        setView('entry');
        setScanMode(false);
    };

    // --- RENDERERS ---

    const renderEntry = () => (
        <div className="flex flex-col items-center justify-center flex-1 w-full h-full p-6 animate-in fade-in duration-300">
            <div className="w-full max-w-2xl space-y-8">
                {/* Branding / Header */}
                <div className="text-center space-y-2 mb-10">
                    <div className="w-16 h-16 bg-slate-900 dark:bg-white rounded-2xl mx-auto flex items-center justify-center mb-6 shadow-2xl">
                        <TerminalIcon className="w-8 h-8 text-white dark:text-slate-900" />
                    </div>
                    <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">Gate Terminal 01</h1>
                    <p className="text-slate-500 font-medium tracking-wide uppercase text-sm">Waiting for Input...</p>
                </div>

                {/* Input Card */}
                <motion.div
                    animate={shake ? { x: [-10, 10, -10, 10, 0] } : {}}
                    className="bg-white dark:bg-slate-800 rounded-3xl p-2 shadow-2xl shadow-indigo-500/10 border border-slate-200 dark:border-slate-700 min-h-[180px] flex flex-col items-center justify-center relative overflow-hidden"
                >
                    {scanMode ? (
                        <div className="w-full">
                            <div id="reader" className="w-full rounded-2xl overflow-hidden"></div>
                            <button
                                onClick={() => setScanMode(false)}
                                className="mt-4 text-sm font-bold text-slate-500 hover:text-slate-700 underline"
                            >
                                Cancel & Return to Manual
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleManualSubmit} className="relative w-full">
                            <input
                                ref={inputRef}
                                type="text"
                                value={manualInput}
                                onChange={(e) => setManualInput(e.target.value.toUpperCase())}
                                className="w-full bg-transparent text-center text-5xl font-black font-mono tracking-wider py-8 text-slate-900 dark:text-white placeholder:text-slate-200 dark:placeholder:text-slate-700 outline-none uppercase"
                                placeholder="REG NO"
                                disabled={status === 'verifying'}
                                spellCheck="false"
                            />
                            {status === 'verifying' && (
                                <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl z-10">
                                    <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                                </div>
                            )}
                        </form>
                    )}
                </motion.div>

                {/* Keyboard Hint */}
                <div className="text-center flex flex-col items-center gap-4">
                    {!scanMode && (
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                            Type Registration Number & Press <span className="text-indigo-500">Enter</span>
                        </p>
                    )}

                    <div className="flex items-center gap-4 px-4 py-2 bg-slate-100 dark:bg-slate-900/50 rounded-full">
                        <span className="text-xs font-bold text-slate-400 uppercase">OR</span>
                    </div>

                    <button
                        onClick={() => setScanMode(!scanMode)}
                        className={`px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 ${scanMode
                            ? 'bg-slate-200 text-slate-600'
                            : 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 hover:scale-105'
                            }`}
                    >
                        {scanMode ? (
                            <>
                                <Keyboard className="w-4 h-4" /> Switch to Manual Input
                            </>
                        ) : (
                            <>
                                <QrCode className="w-4 h-4" /> Scan QR Code
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Recent Feeds at bottom */}
            <div className="mt-auto w-full max-w-4xl pt-10 border-t border-slate-100 dark:border-slate-800">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Recent Activity</p>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {recentScans.map(scan => (
                        <div key={scan.id} className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
                            <div className="flex justify-between items-start mb-1">
                                <span className={`w-2 h-2 rounded-full ${['READY', 'EXITED', 'RETURNED'].includes(scan.status) ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                                <span className="text-[10px] font-mono text-slate-400">{scan.time}</span>
                            </div>
                            <p className="font-bold text-slate-900 dark:text-white text-sm truncate">{scan.name}</p>
                            <p className="text-[10px] font-mono font-bold text-slate-500">{scan.regNo}</p>
                        </div>
                    ))}
                    {[...Array(Math.max(0, 5 - recentScans.length))].map((_, i) => (
                        <div key={i} className="border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-xl p-3 opacity-50"></div>
                    ))}
                </div>
            </div>
        </div>
    );

    const renderResult = (openPreview) => {
        if (!scanResult) return null;
        const { student, pass, status: passStatus, allowedActions } = scanResult;

        const isGood = passStatus === 'valid' || passStatus === 'out' || passStatus === 'early';
        const isWarn = passStatus === 'overdue' || passStatus === 'early' || passStatus === 'expired';
        const isDenied = !isGood && !isWarn;

        // Simplified Status Config for Professional Look
        const statusConfig = {
            color: isGood ? 'emerald' : isWarn ? 'amber' : 'rose',
            icon: isGood ? CheckCircle : isWarn ? AlertTriangle : XCircle,
            label: passStatus === 'valid' ? 'Access Granted' :
                passStatus === 'out' ? 'Return Authorized' :
                    passStatus === 'early' ? 'Early Exit Warning' :
                        passStatus === 'overdue' ? 'Overdue Return' :
                            passStatus === 'expired' ? 'Pass Expired' : 'Access Denied'
        };

        const StatusIcon = statusConfig.icon;
        const themeColor = `text-${statusConfig.color}-600`;
        const bgColor = `bg-${statusConfig.color}-50`;
        const borderColor = `border-${statusConfig.color}-200`;

        return (
            <div className="fixed inset-0 z-50 bg-gray-50 dark:bg-slate-950 flex items-center justify-center p-6">
                <div className="w-full max-w-7xl h-full max-h-[90vh] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-slate-200 dark:border-slate-800">

                    {/* 1. Top Bar: Pure Status & Time */}
                    <div className={`px-8 py-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900`}>
                        <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-full ${bgColor} dark:bg-slate-800`}>
                                <StatusIcon className={`w-8 h-8 ${themeColor}`} />
                            </div>
                            <div>
                                <h1 className={`text-2xl font-bold ${themeColor} uppercase tracking-tight`}>{statusConfig.label}</h1>
                                <p className="text-slate-400 font-medium text-sm">Gate Pass Verification System</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="font-mono text-3xl font-bold text-slate-800 dark:text-slate-200 tracking-tight">
                                {new Date().toLocaleTimeString([], { hour12: true })}
                            </p>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{new Date().toLocaleDateString()}</p>
                        </div>
                    </div>

                    {/* 2. Main Content Grid */}
                    <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12">

                        {/* LEFT: Student Profile (Clean & Professional) - 4 Cols */}
                        <div className="lg:col-span-4 bg-slate-50/50 dark:bg-slate-900/50 border-r border-slate-100 dark:border-slate-800 p-8 overflow-y-auto">
                            <div className="flex flex-col h-full gap-8">
                                <div className="flex items-center gap-6 mb-2">
                                    <div className="h-24 w-24 rounded-2xl bg-slate-200 dark:bg-slate-700 overflow-hidden border-2 border-slate-300 dark:border-slate-600 shadow-lg cursor-pointer hover:ring-2 hover:ring-indigo-500 transition-all"
                                        onClick={() => student?.photo && openPreview && openPreview(`/img/student/${student.photo}`)}>
                                        {student?.photo ? (
                                            <img
                                                src={`/img/student/${student.photo}`}
                                                alt={student.name}
                                                className="w-full h-full object-cover transform hover:scale-110 transition-transform duration-500"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-slate-400">
                                                <User className="w-10 h-10" />
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-1">{student?.name}</h2>
                                        <p className="text-xl font-mono text-slate-500 font-medium">{student?.regNo}</p>
                                    </div>
                                </div>
                                <div className="mb-6"></div>

                                <div className="flex flex-wrap gap-2 mb-8">
                                    <Badge>{student?.dept || 'N/A'}</Badge>
                                    <Badge>Year {student?.year || 'N/A'}</Badge>
                                    <Badge>{student?.type || 'Student'}</Badge>
                                    <div className={`px-3 py-1 rounded-full text-xs font-bold border ${student?.trustScore >= 90 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                                        {student?.trustScore || 100}% Trust
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <DetailRow label="Accommodation" value={student?.hostel_name || 'Day Scholar'} />
                                    {!student?.type?.toLowerCase().includes('day') && (
                                        <DetailRow label="Room Number" value={student?.room_id || 'N/A'} />
                                    )}
                                    <DetailRow label="Parent Contact" value={student?.parent_phone || 'N/A'} isPhone />
                                </div>

                                <div className="mt-auto pt-8 border-t border-slate-200 dark:border-slate-800">
                                    <h3 className="text-xs font-bold uppercase text-slate-400 mb-4 tracking-wider">Emergency Contacts</h3>
                                    <div className="space-y-3">
                                        <AuthorityRow role="Mentor" name={student?.mentor?.name} phone={student?.mentor?.phone} />
                                        <AuthorityRow role="HOD" name={student?.hod?.name} phone={student?.hod?.phone} />
                                        {(student?.type?.toLowerCase().includes('hostel') || student?.hostel_name) && (
                                            <AuthorityRow role="Warden" name={student?.warden?.name} phone={student?.warden?.phone} />
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* RIGHT: Pass Context (Focus on Status) - 8 Cols */}
                        <div className="lg:col-span-8 p-8 overflow-y-auto bg-white dark:bg-slate-900 relative">
                            <div className="max-w-3xl mx-auto space-y-10">

                                {/* A. Status / Reason Block (Friendly Decline) */}
                                <div className={`p-8 rounded-3xl border-2 ${borderColor} ${bgColor} relative overflow-hidden transition-all duration-300`}>
                                    <div className="relative z-10">
                                        <h3 className={`text-sm font-black uppercase tracking-widest mb-3 ${themeColor} opacity-70`}>Verification Status</h3>

                                        <div className="flex flex-col gap-2">
                                            <span className={`text-4xl md:text-5xl font-bold ${themeColor} leading-tight`}>
                                                {scanResult.warning || scanResult.message}
                                            </span>
                                            {/* Context for Decline */}
                                            {scanResult.warning && (
                                                <p className="text-lg text-slate-600 dark:text-slate-300 mt-2 max-w-xl">
                                                    Please verify with the student or contact their authority if this is an error.
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* B. Active Pass Details */}
                                {pass && (
                                    <div className="space-y-6">
                                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Pass Details</h3>
                                            <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-bold uppercase tracking-wider">{pass.type}</span>
                                        </div>

                                        <div className="grid grid-cols-2 gap-12">
                                            <div>
                                                <p className="text-sm text-slate-400 font-medium mb-1">Departure</p>
                                                <p className="text-2xl font-mono font-bold text-slate-900 dark:text-white">
                                                    {new Date(pass.departure).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                                <p className="text-sm font-medium text-slate-500">{new Date(pass.departure).toLocaleDateString()}</p>
                                            </div>
                                            {pass.return && pass.type !== 'Permission' && (
                                                <div>
                                                    <p className="text-sm text-emerald-600/70 font-medium mb-1">Expected Return</p>
                                                    <p className="text-2xl font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                                        {new Date(pass.return).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                    <p className="text-sm font-medium text-emerald-600/60">{new Date(pass.return).toLocaleDateString()}</p>
                                                </div>
                                            )}
                                        </div>

                                        <div className="pt-6">
                                            <p className="text-sm text-slate-400 font-medium mb-2">Reason</p>
                                            <p className="text-lg font-medium text-slate-700 dark:text-slate-300 border-l-4 border-slate-200 pl-4 py-1 italic">
                                                "{pass.reason}"
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* C. Timeline (Simplified) */}
                                {pass?.timeline && (
                                    <div className="pt-8 border-t border-slate-100 dark:border-slate-800">
                                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-6">Activity Log</h3>
                                        <div className="space-y-6 relative pl-3">
                                            <div className="absolute left-[7px] top-2 bottom-4 w-px bg-slate-200 dark:bg-slate-800"></div>
                                            {pass.timeline.slice(-3).map((log, i) => (
                                                <div key={i} className="relative pl-8">
                                                    <div className={`absolute left-0 top-1.5 w-3.5 h-3.5 rounded-full border-4 border-white dark:border-slate-900 ${log.action?.includes('reject') ? 'bg-red-500' : 'bg-slate-300 dark:bg-slate-600'
                                                        }`}></div>
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <p className="text-sm font-bold text-slate-900 dark:text-white capitalize">
                                                                {log.action?.replace(/_/g, ' ')}
                                                            </p>
                                                            <p className="text-xs text-slate-500">
                                                                {log.actor_name || 'System'} <span className="opacity-50">({log.actor_role})</span>
                                                            </p>
                                                        </div>
                                                        <p className="text-xs font-mono font-medium text-slate-400">
                                                            {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                            </div>
                        </div>
                    </div>

                    {/* 3. Footer: Massive Actions */}
                    <div className="p-6 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-end gap-4">
                        <button
                            onClick={resetScanner}
                            className="px-8 py-4 rounded-xl font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                        >
                            Cancel (ESC)
                        </button>

                        {allowedActions?.map(action => (
                            <button
                                key={action}
                                onClick={() => processAction(action)}
                                className={`px-10 py-4 rounded-xl font-bold text-xl text-white shadow-lg shadow-${statusConfig.color}-500/20 flex items-center gap-3 hover:-translate-y-1 transition-all bg-${statusConfig.color}-600 hover:bg-${statusConfig.color}-700`}
                            >
                                {action === 'exit' ? 'Authorize Departure (F4)' : 'Authorize Arrival (F2)'}
                            </button>
                        ))}
                    </div>

                </div>
            </div >
        );
    };

    const Badge = ({ children }) => (
        <span className="px-2.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-sm font-semibold border border-slate-200 dark:border-slate-700">
            {children}
        </span>
    );

    const AuthorityRow = ({ role, name, phone }) => (
        <div className="flex justify-between items-center py-2 border-b border-slate-50 dark:border-slate-700 last:border-0 last:pb-0">
            <div>
                <p className="text-[10px] font-bold uppercase text-slate-400">{role}</p>
                <p className="text-sm font-bold text-slate-900 dark:text-white truncate max-w-[150px]">{name || 'Not Assigned'}</p>
            </div>
            {phone && <p className="text-xs font-mono font-medium text-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 px-2 py-1 rounded">{phone}</p>}
        </div>
    );

    const DetailRow = ({ label, value, isPhone }) => (
        <div>
            <p className="text-xs uppercase font-bold text-slate-400 tracking-wider mb-0.5">{label}</p>
            <p className={`font-medium text-slate-900 dark:text-white ${isPhone ? 'font-mono' : ''}`}>{value}</p>
        </div>
    );

    const [previewImage, setPreviewImage] = useState(null);

    // ... (keep existing effects)

    // Add helper to open preview
    const openImagePreview = (src) => {
        if (src) setPreviewImage(src);
    };

    return (
        <div className="fixed inset-0 z-[100] bg-slate-50 dark:bg-slate-950 font-sans flex flex-col">
            {/* Image Preview Modal */}
            <AnimatePresence>
                {previewImage && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm"
                        onClick={() => setPreviewImage(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="relative max-w-4xl max-h-[90vh] w-full h-full flex flex-col items-center justify-center"
                            onClick={(e) => e.stopPropagation()} // Prevent closing when clicking content
                        >
                            <button
                                onClick={() => setPreviewImage(null)}
                                className="absolute top-4 right-4 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-md transition-colors z-50"
                            >
                                <XCircle className="w-8 h-8" />
                            </button>
                            <img
                                src={previewImage}
                                alt="Full Preview"
                                className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl border-2 border-white/20"
                            />
                            <p className="mt-4 text-white/50 text-sm font-medium uppercase tracking-widest">Click anywhere outside to close</p>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Top Bar (Only visible in Entry, hidden in full-screen Result for immersion) */}
            {view === 'entry' && (
                <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-10">
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors">
                        <ArrowLeft className="w-6 h-6 text-slate-500" />
                    </button>
                    <div className="flex items-center gap-2 px-3 py-1 bg-white dark:bg-slate-900 rounded-full shadow-sm border border-slate-200 dark:border-slate-800">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">System Online</span>
                    </div>
                </div>
            )}

            <main className="flex-1 overflow-hidden relative">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={view}
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.02 }}
                        transition={{ duration: 0.2 }}
                        className="h-full w-full"
                    >
                        {view === 'entry' ? renderEntry() : renderResult(openImagePreview)}
                    </motion.div>
                </AnimatePresence>
            </main>
        </div>
    );
};

// Helper Component for Info Grid
const InfoCard = ({ icon: Icon, label, value, sub }) => (
    <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
        <div className="flex items-center gap-2 mb-2">
            <Icon className="w-4 h-4 text-slate-400" />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</span>
        </div>
        <p className="text-lg font-bold text-slate-900 dark:text-white truncate">{value}</p>
        <p className="text-[10px] text-slate-400 font-medium">{sub}</p>
    </div>
);

// Helper Icon for branding
const TerminalIcon = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="4 17 10 11 4 5" />
        <line x1="12" y1="19" x2="20" y2="19" />
    </svg>
);

export default GateScanner;
