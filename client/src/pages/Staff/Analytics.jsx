import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from 'recharts';
import { motion } from 'framer-motion';
import {
    TrendingUp, Users, Clock, ShieldCheck,
    ArrowUpRight, ArrowDownRight, Activity, Calendar, ChevronLeft, ChevronRight
} from 'lucide-react';

const StaffAnalytics = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [moversPage, setMoversPage] = useState(0);

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const fetchAnalytics = async () => {
        try {
            const res = await axios.get('/api/staff/analytics');
            setData(res.data);
            setLoading(false);
        } catch (err) {
            console.error("Failed to fetch analytics", err);
        }
    };

    if (loading) return (
        <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto"></div>
            <p className="mt-4 text-slate-500 dark:text-slate-400">Synchronizing Analytics Engine...</p>
        </div>
    );

    const COLORS = ['#6366f1', '#0ea5e9', '#f59e0b', '#ef4444', '#8b5cf6', '#10b981'];

    const StatCard = ({ title, value, icon: Icon, color, trend }) => (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800"
        >
            <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-2xl ${color} bg-opacity-10 dark:bg-opacity-20`}>
                    <Icon className={`w-6 h-6 ${color.replace('bg-', 'text-')}`} />
                </div>
                {trend && (
                    <span className={`flex items-center text-xs font-bold ${trend > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {trend > 0 ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
                        {Math.abs(trend)}%
                    </span>
                )}
            </div>
            <h3 className="text-slate-500 dark:text-slate-400 text-sm font-medium">{title}</h3>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{value}</p>
        </motion.div>
    );

    const approvalRate = data?.summary?.totalRequests > 0
        ? Math.round((data.summary.approvedRequests / data.summary.totalRequests) * 100)
        : 0;

    return (
        <div className="space-y-8 animate-fade-in pb-12">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Mentee Intelligence</h1>
                    <p className="text-slate-500 dark:text-slate-400 font-medium">Deep-dive into your assigned students' mobility patterns</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={fetchAnalytics} className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition-colors">
                        Refresh
                    </button>
                    <button className="px-4 py-2 bg-indigo-600 rounded-xl text-sm font-bold text-white shadow-lg shadow-indigo-200 dark:shadow-none hover:bg-indigo-700 transition-all">
                        Export Report
                    </button>
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Total Requests"
                    value={data.summary.totalRequests}
                    icon={TrendingUp}
                    color="bg-indigo-500"
                />
                <StatCard
                    title="Approval Rate"
                    value={`${approvalRate}%`}
                    icon={ShieldCheck}
                    color="bg-emerald-500"
                />
                <StatCard
                    title="Currently Outside"
                    value={data.summary.activeOutside}
                    icon={Users}
                    color="bg-amber-500"
                />
                <StatCard
                    title="Avg Trust Score"
                    value={`${Math.round(data.summary.avgTrustScore)}%`}
                    icon={Activity}
                    color="bg-rose-500"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Weekly Volume Chart */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="lg:col-span-2 bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800"
                >
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Movement Volume</h3>
                            <p className="text-sm text-slate-400 font-medium">Total requests recorded over the last 7 days</p>
                        </div>
                        <Calendar className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div className="h-[300px] w-full min-w-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data.weeklyTrends}>
                                <defs>
                                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} opacity={0.3} />
                                <XAxis
                                    dataKey="date"
                                    stroke="#94a3b8"
                                    fontSize={12}
                                    axisLine={false}
                                    tickLine={false}
                                    tickFormatter={str => new Date(str).toLocaleDateString(undefined, { weekday: 'short' })}
                                />
                                <YAxis stroke="#94a3b8" fontSize={12} axisLine={false} tickLine={false} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '16px', color: '#fff', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                                    itemStyle={{ color: '#fff' }}
                                />
                                <Area type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={4} fillOpacity={1} fill="url(#colorCount)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>

                {/* Status Distribution */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800"
                >
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Status Mix</h3>
                    <div className="h-[250px] w-full min-w-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={data.statusDetails}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={70}
                                    outerRadius={95}
                                    paddingAngle={8}
                                    dataKey="count"
                                    stroke="none"
                                >
                                    {data.statusDetails.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '16px', color: '#fff' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="space-y-3 mt-6">
                        {data.statusDetails.map((entry, index) => (
                            <div key={index} className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                                    <span className="text-sm font-bold text-slate-600 dark:text-slate-400 capitalize">{entry.status.replace('_', ' ')}</span>
                                </div>
                                <span className="text-sm font-black text-slate-900 dark:text-white">{entry.count}</span>
                            </div>
                        ))}
                    </div>
                </motion.div>

                {/* Peak Hours Analysis */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800"
                >
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Peak Hours</h3>
                            <p className="text-sm text-slate-400 font-medium">Busiest departure times</p>
                        </div>
                        <Clock className="w-5 h-5 text-amber-400" />
                    </div>
                    <div className="h-[200px] w-full min-w-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data.peakActivity}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} opacity={0.3} />
                                <XAxis
                                    dataKey="hour"
                                    stroke="#94a3b8"
                                    fontSize={10}
                                    axisLine={false}
                                    tickLine={false}
                                    tickFormatter={h => `${h}:00`}
                                />
                                <YAxis stroke="#94a3b8" fontSize={10} axisLine={false} tickLine={false} />
                                <Tooltip
                                    cursor={{ fill: 'rgba(99, 102, 241, 0.05)' }}
                                    contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff' }}
                                />
                                <Bar dataKey="count" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>

                {/* Top Movers Table */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800"
                >
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">Top Movement Seekers</h3>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setMoversPage(p => Math.max(0, p - 1))}
                                disabled={moversPage === 0}
                                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 transition-colors"
                            >
                                <ChevronLeft className="w-5 h-5 text-slate-500" />
                            </button>
                            <button
                                onClick={() => setMoversPage(p => p + 1)}
                                disabled={(moversPage + 1) * 5 >= data.topMovers.length}
                                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 transition-colors"
                            >
                                <ChevronRight className="w-5 h-5 text-slate-500" />
                            </button>
                        </div>
                    </div>
                    <div className="space-y-4">
                        {data.topMovers.slice(moversPage * 5, (moversPage + 1) * 5).map((mover, index) => (
                            <div key={index} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-black text-xs">
                                        {(moversPage * 5) + index + 1}
                                    </div>
                                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{mover.name}</span>
                                </div>
                                <div className="flex flex-col items-end">
                                    <span className="text-sm font-black text-slate-900 dark:text-white">{mover.count}</span>
                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Passes</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>

                {/* Year-wise Distribution */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800"
                >
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Year-wise Activity</h3>
                    <div className="h-[200px] w-full min-w-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data.yearDistribution} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} opacity={0.3} />
                                <XAxis type="number" hide />
                                <YAxis
                                    dataKey="year"
                                    type="category"
                                    stroke="#94a3b8"
                                    fontSize={12}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <Tooltip
                                    cursor={{ fill: 'rgba(99, 102, 241, 0.05)' }}
                                    contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff' }}
                                />
                                <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default StaffAnalytics;
