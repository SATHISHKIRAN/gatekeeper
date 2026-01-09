import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import {
    Users, Activity, Clock, Shield, TrendingUp, RefreshCw, Home
} from 'lucide-react';

const AdminAnalytics = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
        const interval = setInterval(fetchStats, 60000);
        return () => clearInterval(interval);
    }, []);

    const fetchStats = async () => {
        try {
            const res = await axios.get('/api/admin/analytics');
            setData(res.data);
        } catch (err) {
            console.error('Failed to fetch analytics', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-slate-500 font-medium">Loading analytics...</p>
            </div>
        </div>
    );

    if (!data) return (
        <div className="text-center py-20 bg-red-50 dark:bg-red-900/10 rounded-lg border border-red-200 dark:border-red-800">
            <Activity className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-red-600 dark:text-red-400">Data Unavailable</h3>
            <p className="text-sm text-red-500/60 mt-2">Unable to load analytics. Please check backend services.</p>
        </div>
    );

    const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
    const {
        summary = {},
        department_stats = [],
        weekly_trends = [],
        type_distribution = [],
        hostel_stats = {}
    } = data || {};

    return (
        <div className="space-y-6 pb-20">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Analytics</h1>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Campus mobility and activity insights</p>
                </div>
                <button
                    onClick={fetchStats}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
                >
                    <RefreshCw className="w-4 h-4" />
                    <span className="text-sm font-medium">Refresh</span>
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Total Students', value: summary?.total_students || 0, icon: Users, color: 'indigo' },
                    { label: 'Total Requests', value: summary?.total_requests || 0, icon: Activity, color: 'emerald' },
                    { label: 'Active Passes', value: summary?.active_passes || 0, icon: Clock, color: 'orange' },
                    { label: 'System Health', value: summary?.system_health || 'Unknown', icon: Shield, color: 'blue' },
                ].map((item) => {
                    const Icon = item.icon;
                    return (
                        <div key={item.label} className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700">
                            <div className="flex items-center gap-3 mb-3">
                                <div className={`p-2 bg-${item.color}-100 dark:bg-${item.color}-900/30 rounded-lg`}>
                                    <Icon className={`w-5 h-5 text-${item.color}-600 dark:text-${item.color}-400`} />
                                </div>
                                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">{item.label}</span>
                            </div>
                            <p className="text-3xl font-bold text-slate-900 dark:text-white">{item.value}</p>
                        </div>
                    );
                })}
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Weekly Trends */}
                <div className="lg:col-span-3 bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Weekly Trends</h3>
                            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Last 7 days</p>
                        </div>
                        <TrendingUp className="w-5 h-5 text-slate-400" />
                    </div>
                    <div className="h-80 w-full">
                        <ResponsiveContainer width={500} height="100%" minWidth={10} minHeight={10} style={{ width: '99%' }}>
                            <AreaChart data={weekly_trends}>
                                <defs>
                                    <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis
                                    dataKey="date"
                                    tickFormatter={(val) => new Date(val).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                    stroke="#94a3b8"
                                    style={{ fontSize: '12px' }}
                                />
                                <YAxis stroke="#94a3b8" style={{ fontSize: '12px' }} />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#fff',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '8px',
                                        fontSize: '12px'
                                    }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="count"
                                    stroke="#6366f1"
                                    strokeWidth={2}
                                    fillOpacity={1}
                                    fill="url(#trendGradient)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Bottom Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Department Stats */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">Department Activity</h3>
                    <div className="h-80 w-full">
                        <ResponsiveContainer width={500} height="100%" minWidth={10} minHeight={10} style={{ width: '99%' }}>
                            <BarChart data={department_stats} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                                <XAxis type="number" hide />
                                <YAxis
                                    dataKey="name"
                                    type="category"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                                    width={100}
                                />
                                <Tooltip cursor={{ fill: 'transparent' }} />
                                <Bar dataKey="value" fill="#6366f1" radius={[0, 8, 8, 0]} barSize={20}>
                                    {department_stats.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Hostel Occupancy */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Hostel Occupancy</h3>
                        <Home className="w-5 h-5 text-slate-400" />
                    </div>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width={500} height="100%" minWidth={10} minHeight={10} style={{ width: '99%' }}>
                            <PieChart>
                                <Pie
                                    data={[
                                        { name: 'Occupied', value: hostel_stats?.occupied || 0 },
                                        { name: 'Available', value: hostel_stats?.available || 0 },
                                        { name: 'Maintenance', value: hostel_stats?.maintenance || 0 },
                                    ]}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={50}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    <Cell fill="#6366f1" />
                                    <Cell fill="#10b981" />
                                    <Cell fill="#ef4444" />
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="space-y-3 mt-4">
                        {[
                            { label: 'Occupied', val: hostel_stats?.occupied || 0, color: 'bg-indigo-500' },
                            { label: 'Available', val: hostel_stats?.available || 0, color: 'bg-emerald-500' },
                            { label: 'Maintenance', val: hostel_stats?.maintenance || 0, color: 'bg-red-500' },
                        ].map((item) => (
                            <div key={item.label}>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="text-slate-600 dark:text-slate-400">{item.label}</span>
                                    <span className="font-medium text-slate-900 dark:text-white">{item.val}</span>
                                </div>
                                <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full ${item.color} rounded-full transition-all`}
                                        style={{ width: `${(item.val / ((hostel_stats?.occupied || 0) + (hostel_stats?.available || 0) + (hostel_stats?.maintenance || 0) || 1)) * 100}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminAnalytics;
