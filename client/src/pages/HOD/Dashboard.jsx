import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Users, FileText, CheckCircle, AlertTriangle,
    ArrowUpRight, Activity, Zap, Shield,
    Layers, TrendingUp, Clock, ArrowRight,
    Search, Bell, UserCheck, XCircle
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
    const [pendingRequests, setPendingRequests] = useState([]);
    const [showDelegationModal, setShowDelegationModal] = useState(false);
    const [delegationForm, setDelegationForm] = useState({ proxyId: '', start: '', end: '' });

    const navigate = useNavigate();

    useEffect(() => {
        fetchData();
        fetchStaff();
        fetchPending();
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

    const fetchPending = async () => {
        try {
            const res = await axios.get('/api/queue/hod'); // Assuming this exists or using a similar route
            setPendingRequests(res.data);
        } catch (err) {
            console.error('Pending queue sync failed');
        }
    };

    const handleDelegation = async () => {
        try {
            await axios.post('/api/hod/set-proxy', {
                proxyId: delegationForm.proxyId,
                startDate: delegationForm.start,
                endDate: delegationForm.end
            });
            setShowDelegationModal(false);
            fetchData();
        } catch (err) {
            console.error('Delegation failed');
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

            {/* Core Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: 'Pending Passes', value: data.pending, icon: Clock, color: 'blue', desc: 'Awaiting Action' },
                    { label: 'Total Approved', value: data.approved, icon: CheckCircle, color: 'emerald', desc: 'Current Semester' },
                    { label: 'Staff Presence', value: `${data.staffStats.on_duty}/${data.staffStats.total}`, icon: UserCheck, color: 'orange', desc: 'On Duty Members' },
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
                        icon: Shield,
                        color: 'violet',
                        desc: 'Assigned Assistant'
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
                        <p className="text-3xl font-black text-gray-900 dark:text-white mt-1 leading-none">{item.value}</p>
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
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
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
                maxWidth="max-w-md"
                showPadding={false}
            >
                <div className="p-8 bg-blue-600 text-white">
                    <h3 className="text-2xl font-black tracking-tight">Authority Delegation</h3>
                    <p className="text-blue-100 text-[10px] mt-1 uppercase tracking-widest font-black">Assign Assistant HOD Proxy</p>
                </div>
                <div className="p-8 space-y-6">
                    <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Assistant HOD Delegate</label>
                        <select
                            value={delegationForm.proxyId}
                            onChange={(e) => setDelegationForm({ ...delegationForm, proxyId: e.target.value })}
                            className="w-full bg-gray-50 dark:bg-slate-800 border-none rounded-xl p-4 mt-2 font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500 appearance-none dark:text-white"
                        >
                            <option value="">Select Faculty Member</option>
                            {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Delegation Start</label>
                            <input type="date" value={delegationForm.start} onChange={(e) => setDelegationForm({ ...delegationForm, start: e.target.value })} className="w-full bg-gray-50 dark:bg-slate-800 border-none rounded-xl p-4 mt-2 font-bold text-xs dark:text-white" />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Delegation End</label>
                            <input type="date" value={delegationForm.end} onChange={(e) => setDelegationForm({ ...delegationForm, end: e.target.value })} className="w-full bg-gray-50 dark:bg-slate-800 border-none rounded-xl p-4 mt-2 font-bold text-xs dark:text-white" />
                        </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-4 pt-4">
                        <button onClick={() => setShowDelegationModal(false)} className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-2xl transition-all order-2 sm:order-1">Cancel</button>
                        <button onClick={handleDelegation} className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl text-[10px] font-black shadow-lg shadow-blue-500/30 hover:scale-105 transition-all uppercase tracking-widest order-1 sm:order-2">Enforce Delegation</button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default HODDashboard;
