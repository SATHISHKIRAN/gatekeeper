import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
    Activity, Server, Cpu, HardDrive, Clock, Terminal, RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';

const SystemMonitor = () => {
    const [stats, setStats] = useState(null);
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState(new Date());
    const logEndRef = useRef(null);

    const fetchSystemData = async () => {
        try {
            const [statsRes, logsRes] = await Promise.all([
                axios.get('/api/system/stats'),
                axios.get('/api/system/logs')
            ]);
            setStats(statsRes.data);
            setLogs(logsRes.data.logs || []);
            setLastUpdated(new Date());
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSystemData();
        const interval = setInterval(fetchSystemData, 10000); // Poll every 10s
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        // Auto scroll logs
        if (logEndRef.current) {
            logEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [logs]);

    if (loading && !stats) return <div className="p-10 text-center text-slate-400 animate-pulse">Initializing System Monitor...</div>;

    return (
        <div className="space-y-6 animate-fade-in-up">
            <header className="flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-3">
                        <h2 className="text-2xl font-black text-slate-900 dark:text-white">System Monitor</h2>
                        <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-md text-[10px] font-bold uppercase tracking-wide border border-green-200 dark:border-green-800 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span> Live
                        </span>
                    </div>
                    <p className="text-slate-500 text-sm mt-1">Real-time performance metrics and server logs.</p>
                </div>
                <div className="text-right">
                    <p className="text-[10px] font-mono text-slate-400">LAST SYNC</p>
                    <p className="text-xs font-bold font-mono text-slate-600 dark:text-slate-300">{format(lastUpdated, 'HH:mm:ss')}</p>
                </div>
            </header>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden group">
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-2 text-slate-500 dark:text-slate-400">
                            <Clock className="w-4 h-4" />
                            <span className="text-[10px] font-bold uppercase">Uptime</span>
                        </div>
                        <p className="text-xl font-black font-mono text-slate-800 dark:text-slate-100">
                            {(stats?.os?.uptime / 3600).toFixed(1)}h
                        </p>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden group">
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-2 text-indigo-500 dark:text-indigo-400">
                            <Cpu className="w-4 h-4" />
                            <span className="text-[10px] font-bold uppercase">CPU Cores</span>
                        </div>
                        <p className="text-xl font-black font-mono text-slate-800 dark:text-slate-100">
                            {stats?.cpu?.cores} <span className="text-xs text-slate-400 font-normal">Threads</span>
                        </p>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden group">
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-2 text-emerald-500 dark:text-emerald-400">
                            <Activity className="w-4 h-4" />
                            <span className="text-[10px] font-bold uppercase">Memory Usage</span>
                        </div>
                        <p className="text-xl font-black font-mono text-slate-800 dark:text-slate-100">
                            {((stats?.memory?.used / stats?.memory?.total) * 100).toFixed(1)}%
                        </p>
                        <div className="w-full h-1 bg-slate-100 dark:bg-slate-700 mt-2 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-emerald-500 transition-all duration-1000"
                                style={{ width: `${(stats?.memory?.used / stats?.memory?.total) * 100}%` }}
                            />
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden group">
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-2 text-amber-500 dark:text-amber-400">
                            <HardDrive className="w-4 h-4" />
                            <span className="text-[10px] font-bold uppercase">Free RAM</span>
                        </div>
                        <p className="text-xl font-black font-mono text-slate-800 dark:text-slate-100">
                            {stats?.memory?.free} GB
                        </p>
                    </div>
                </div>
            </div>

            {/* Server Logs Console */}
            <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden flex flex-col h-[500px]">
                <div className="bg-slate-950 p-3 border-b border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Terminal className="w-4 h-4 text-slate-400" />
                        <span className="text-xs font-bold text-slate-300 font-mono">gate_error.log (tail -n 100)</span>
                    </div>
                    <button onClick={fetchSystemData} className="p-1 hover:bg-slate-800 rounded transition text-slate-400">
                        <RefreshCw className="w-3 h-3" />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 font-mono text-xs space-y-1">
                    {logs.length === 0 && (
                        <div className="text-slate-600 italic text-center mt-10">-- No logs found or empty log file --</div>
                    )}
                    {logs.map((log, i) => (
                        <div key={i} className="text-slate-300 border-b border-slate-800/50 py-0.5 hover:bg-slate-800/30 whitespace-pre-wrap break-all">
                            <span className="text-slate-600 select-none mr-3">{(i + 1).toString().padStart(3, '0')}</span>
                            {log}
                        </div>
                    ))}
                    <div ref={logEndRef} />
                </div>
            </div>
        </div>
    );
};

export default SystemMonitor;
