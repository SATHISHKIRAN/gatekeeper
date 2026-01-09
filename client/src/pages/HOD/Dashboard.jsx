import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Users, FileText, CheckCircle, AlertTriangle,
    ArrowUpRight, Activity, Zap, Shield,
    Layers, TrendingUp, Clock, ArrowRight,
    Search, Bell, UserCheck, XCircle, ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, BarChart, Bar, Cell
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import Modal from '../../components/Modal';

const HODDashboard = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [staff, setStaff] = useState([]);
    const [requests, setRequests] = useState({ actions: [], registry: [] });
    const [activeTab, setActiveTab] = useState('actions');
    const [showDelegationModal, setShowDelegationModal] = useState(false);
    const [delegationForm, setDelegationForm] = useState({ proxyId: '', start: '', end: '' });
    const [delegationError, setDelegationError] = useState(null);

    // Pagination for Pass Management
    const [passPage, setPassPage] = useState(1);
    const passesPerPage = 5;

    useEffect(() => {
        setPassPage(1);
    }, [activeTab]);

    const navigate = useNavigate();

    useEffect(() => {
        fetchData();
        fetchStaff();
        fetchRequests();

        const interval = setInterval(() => {
            fetchData();
            fetchRequests();
        }, 5000);

        return () => clearInterval(interval);
    }, []);

    const fetchData = async () => {
        try {
            const res = await axios.get('/api/hod/stats');
            setData(res.data);
        } catch (err) {
            console.error('Intelligence sync failed', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchStaff = async () => {
        try {
            const res = await axios.get('/api/hod/users?role=staff');
            setStaff(res.data);
        } catch (err) {
            console.error('Staff sync failed');
        }
    };

    const fetchRequests = async () => {
        try {
            const res = await axios.get('/api/hod/requests');
            setRequests(res.data);
        } catch (err) {
            console.error('Requests sync failed');
        }
    };

    const handleDelegation = async () => {
        setDelegationError(null);
        try {
            await axios.post('/api/hod/set-proxy', {
                proxyId: delegationForm.proxyId,
                startDate: delegationForm.start,
                endDate: delegationForm.end
            });
            setShowDelegationModal(false);
            fetchData();
        } catch (err) {
            console.error('Delegation failed', err);
            setDelegationError(err.response?.data?.message || 'Delegation failed. Please check inputs and try again.');
        }
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
            <Zap className="w-12 h-12 text-blue-500 animate-pulse" />
            <p className="text-sm font-black text-gray-400 uppercase tracking-widest animate-pulse">Syncing Departmental Intelligence...</p>
        </div>
    );

    if (!data) return (
        <div className="text-center py-20 bg-red-50 dark:bg-red-900/10 rounded-[2.5rem] border border-red-100 dark:border-red-900/20">
            <Activity className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-xl font-black text-red-600 dark:text-red-400">Intelligence Offline</h3>
            <p className="text-sm text-red-500/60 mt-2 font-bold uppercase tracking-tighter">Connection to departmental node failed.</p>
        </div>
    );

    return (
        <div className="space-y-8 pb-12">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-600 rounded-xl shadow-lg shadow-blue-500/30">
                            <Layers className="w-6 h-6 text-white" />
                        </div>
                        <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight">HOD Command</h1>
                    </div>
                    <p className="text-gray-500 dark:text-slate-400 text-sm max-w-md font-medium uppercase tracking-tight">
                        {data.department_name} • Operational Intelligence
                    </p>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={() => setShowDelegationModal(true)}
                        className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl text-xs font-black text-gray-600 dark:text-slate-300 shadow-sm hover:scale-105 active:scale-95 transition-all uppercase tracking-widest"
                    >
                        <Shield className="w-3.5 h-3.5 text-blue-500" /> Delegate Authority
                    </button>
                    <button onClick={fetchData} className="px-6 py-3 bg-blue-600 text-white rounded-2xl text-xs font-black shadow-lg shadow-blue-500/30 hover:scale-105 active:scale-95 transition-all uppercase tracking-widest">
                        Refresh Node
                    </button>
                </div>
            </div>

            {/* Operational Alerts Section */}
            {(data.staffStats.details?.length > 0 || (data.proxyStatus?.has_conflict)) && (
                <div className="space-y-4">
                    {/* Critical Proxy Warning */}
                    {data.proxyStatus?.has_conflict && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-red-500 rounded-2xl p-4 flex items-center justify-between shadow-lg shadow-red-500/20"
                        >
                            <div className="flex items-center gap-4 text-white">
                                <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                                    <AlertTriangle className="w-6 h-6 animate-pulse" />
                                </div>
                                <div>
                                    <h3 className="font-black text-lg uppercase tracking-tight">Critical Warning: Proxy Conflict</h3>
                                    <p className="text-xs font-bold text-red-100 uppercase tracking-widest opacity-90">
                                        Active Assigned Proxy is on leave during delegation period. ({data.proxyStatus.conflict_details})
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowDelegationModal(true)}
                                className="px-6 py-2 bg-white text-red-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-red-50 transition-colors"
                            >
                                Reassign Now
                            </button>
                        </motion.div>
                    )}

                    {/* Staff on Leave Ticker */}
                    {data.staffStats.details?.length > 0 && (
                        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-gray-100 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-start md:items-center gap-6">
                            <div className="flex items-center gap-3 shrink-0">
                                <div className="p-2 bg-amber-100 dark:bg-amber-900/20 text-amber-600 rounded-xl">
                                    <Activity className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Faculty Report</p>
                                    <p className="font-bold text-gray-900 dark:text-white">Away Today</p>
                                </div>
                            </div>
                            <div className="flex-1 flex flex-wrap gap-3">
                                {data.staffStats.details.map((staff) => (
                                    <div key={staff.id} className="group relative flex items-center gap-3 pl-1 pr-4 py-1.5 bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 hover:border-indigo-100 hover:bg-indigo-50 dark:hover:bg-indigo-900/10 transition-all cursor-pointer" onClick={() => navigate('/hod/staff')}>
                                        <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs uppercase shadow-sm">
                                            {staff.name.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-gray-900 dark:text-white group-hover:text-indigo-700 transition-colors">{staff.name}</p>
                                            <p className="text-[9px] text-gray-400 font-medium uppercase tracking-wider group-hover:text-indigo-400">On Leave</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Core Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: 'Pending Passes', value: data.pending, icon: Clock, color: 'blue', desc: 'Awaiting Action' },
                    { label: 'Total Approved', value: data.approved, icon: CheckCircle, color: 'emerald', desc: 'Current Semester' },
                    {
                        label: 'Student Mobility',
                        value: (
                            <div className="flex items-baseline gap-1">
                                <span>{data.mobilityStats?.out || 0}</span>
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">OUT</span>
                            </div>
                        ),
                        icon: Users,
                        color: 'indigo',
                        desc: `${data.mobilityStats?.in || 0} In • ${data.mobilityStats?.overdue || 0} Overdue`
                    },
                    {
                        label: 'Active Proxy',
                        value: data.proxyStatus ? (
                            <div className="flex items-center gap-2">
                                {data.proxyStatus.proxy_name}
                                <button
                                    onClick={async () => {
                                        try {
                                            await axios.post('/api/hod/revoke-proxy');
                                            fetchData();
                                        } catch (err) {
                                            console.error('Revocation failed');
                                        }
                                    }}
                                    className="p-1 hover:bg-red-50 text-red-500 rounded-lg transition-colors group/revoke"
                                    title="Revoke Delegation"
                                >
                                    <XCircle className="w-4 h-4" />
                                </button>
                            </div>
                        ) : 'None',
                        icon: data.proxyStatus && data.staffStats.details?.some(s => s.id === data.proxyStatus.proxy_id && s.status === 'on_leave') ? AlertTriangle : Shield,
                        color: data.proxyStatus && data.staffStats.details?.some(s => s.id === data.proxyStatus.proxy_id && s.status === 'on_leave') ? 'red' : 'violet',
                        desc: data.proxyStatus && data.staffStats.details?.some(s => s.id === data.proxyStatus.proxy_id && s.status === 'on_leave') ? 'PROXY ON LEAVE!' : 'Delegated Authority'
                    },
                ].map((item, i) => (
                    <motion.div
                        key={item.label}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-gray-100 dark:border-slate-800 shadow-sm group relative overflow-hidden"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className={`p-3 rounded-2xl bg-${item.color}-50 dark:bg-${item.color}-900/10 text-${item.color}-600 dark:text-${item.color}-400`}>
                                <item.icon className="w-5 h-5" />
                            </div>
                            <div className="flex items-center gap-1 text-[10px] font-black text-gray-400 uppercase tracking-tighter">
                                {item.desc}
                            </div>
                        </div>
                        <p className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-[0.2em]">{item.label}</p>
                        <div className="text-3xl font-black text-gray-900 dark:text-white mt-1 leading-none">{item.value}</div>
                    </motion.div>
                ))}
            </div>

            {/* Analytics & Pulse */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                {/* Year-wise Student Mobility Chart */}
                <div className="lg:col-span-8 bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-gray-100 dark:border-slate-800 shadow-xl">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">Year-wise Mobility Pulse</h3>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Student distribution & Active Outflows</p>
                        </div>
                        <TrendingUp className="w-5 h-5 text-blue-500" />
                    </div>
                    <div className="h-[300px] w-full min-w-0 relative">
                        <ResponsiveContainer width={500} height="100%" minWidth={10} minHeight={10} style={{ width: '99%' }}>
                            <BarChart data={data.yearStats}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" opacity={0.3} />
                                <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 10, fontWeight: 800 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 10, fontWeight: 800 }} />
                                <Tooltip
                                    cursor={{ fill: 'rgba(59, 130, 246, 0.05)' }}
                                    contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', padding: '16px' }}
                                    itemStyle={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase' }}
                                />
                                <Bar dataKey="total" name="Enrolled" fill="#E2E8F0" radius={[10, 10, 0, 0]} />
                                <Bar dataKey="out_count" name="Active Out" fill="#3b82f6" radius={[10, 10, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Faculty Duty Overview */}
                <div className="lg:col-span-4 bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-gray-100 dark:border-slate-800 shadow-xl flex flex-col">
                    <h3 className="text-lg font-black text-gray-900 dark:text-white mb-6 tracking-tight">Faculty Pulse</h3>
                    <div className="flex-1 space-y-4">
                        <div className="flex items-center justify-between p-4 bg-emerald-50 dark:bg-emerald-900/10 rounded-2xl border border-emerald-100 dark:border-emerald-900/20">
                            <div>
                                <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{data.staffStats.on_duty}</p>
                                <p className="text-[10px] font-black uppercase text-emerald-600/60 tracking-widest leading-none">On Duty</p>
                            </div>
                            <UserCheck className="w-8 h-8 text-emerald-500/20" />
                        </div>
                        <div className="flex items-center justify-between p-4 bg-amber-50 dark:bg-amber-900/10 rounded-2xl border border-amber-100 dark:border-amber-900/20">
                            <div>
                                <p className="text-2xl font-black text-amber-600 dark:text-amber-400">{data.staffStats.on_leave}</p>
                                <p className="text-[10px] font-black uppercase text-amber-600/60 tracking-widest leading-none">On Leave</p>
                            </div>
                            <Activity className="w-8 h-8 text-amber-500/20" />
                        </div>
                    </div>

                    <button
                        onClick={() => navigate('/hod/staff')}
                        className="mt-6 w-full py-4 bg-gray-50 dark:bg-slate-800 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-blue-600 transition-all flex items-center justify-center gap-2"
                    >
                        Directory Oversight <ArrowRight className="w-4 h-4" />
                    </button>
                </div>
            </div>


            {/* Delegation Modal */}
            <Modal
                isOpen={showDelegationModal}
                onClose={() => setShowDelegationModal(false)}
                title="Delegate Authority"
            >
                {delegationError && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-xl text-xs font-bold border border-red-100 flex items-center gap-2 mb-4 animate-shake">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        {delegationError}
                    </div>
                )}
                <form onSubmit={(e) => { e.preventDefault(); handleDelegation(); }} className="space-y-4">
                    <div>
                        <label className="text-[10px] uppercase font-bold text-gray-400">Select Assistant HOD (Proxy)</label>
                        <select
                            className="w-full p-3 bg-gray-50 dark:bg-slate-800 rounded-xl border-none outline-none"
                            value={delegationForm.proxyId}
                            onChange={e => setDelegationForm({ ...delegationForm, proxyId: e.target.value })}
                        >
                            <option value="">Select Staff...</option>
                            {staff.map(s => <option key={s.id} value={s.id}>{s.name} ({s.email})</option>)}
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] uppercase font-bold text-gray-400">Start Date</label>
                            <input
                                type="date"
                                className="w-full p-3 bg-gray-50 dark:bg-slate-800 rounded-xl border-none outline-none"
                                value={delegationForm.start}
                                onChange={e => setDelegationForm({ ...delegationForm, start: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="text-[10px] uppercase font-bold text-gray-400">End Date</label>
                            <input
                                type="date"
                                className="w-full p-3 bg-gray-50 dark:bg-slate-800 rounded-xl border-none outline-none"
                                value={delegationForm.end}
                                onChange={e => setDelegationForm({ ...delegationForm, end: e.target.value })}
                            />
                        </div>
                    </div>
                    <button className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors">
                        Confirm Delegation
                    </button>
                </form>
            </Modal>
        </div>
    );
};

export default HODDashboard;
