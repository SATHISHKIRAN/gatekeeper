import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    TrendingUp, PieChart as PieIcon, BarChart3, RefreshCw
} from 'lucide-react';
import {
    AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

const WardenAnalytics = () => {
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const fetchAnalytics = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/warden/analytics');
            setAnalytics(res.data);
        } catch (err) {
            console.error('Analytics fetch error', err);
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

    const COLORS = ['#6366f1', '#f43f5e', '#10b981', '#f59e0b', '#8b5cf6'];

    return (
        <div className="space-y-6 pb-20">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Analytics</h1>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Movement patterns and trends</p>
                </div>
                <button
                    onClick={() => fetchAnalytics()}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
                >
                    <RefreshCw className="w-4 h-4" />
                    <span className="text-sm font-medium">Refresh</span>
                </button>
            </div>

            {/* Analytics Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {/* Peak Hours Chart */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                            <TrendingUp className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Peak Hours</h3>
                            <p className="text-sm text-slate-600 dark:text-slate-400">Movement by hour</p>
                        </div>
                    </div>
                    <div className="h-80 w-full">
                        <ResponsiveContainer width={500} height="100%" minWidth={10} minHeight={10} style={{ width: '99%' }}>
                            <AreaChart data={analytics.peakHours}>
                                <defs>
                                    <linearGradient id="colorPeak" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis
                                    dataKey="hour"
                                    tickFormatter={(val) => `${val}:00`}
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
                                <Area type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorPeak)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Type Distribution */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                            <PieIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Movement Types</h3>
                            <p className="text-sm text-slate-600 dark:text-slate-400">Distribution by type</p>
                        </div>
                    </div>
                    <div className="h-80 w-full">
                        <ResponsiveContainer width={500} height="100%" minWidth={10} minHeight={10} style={{ width: '99%' }}>
                            <PieChart>
                                <Pie
                                    data={analytics.typeDistribution}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    paddingAngle={5}
                                    dataKey="count"
                                    nameKey="type"
                                >
                                    {analytics.typeDistribution.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#fff',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '8px',
                                        fontSize: '12px'
                                    }}
                                />
                                <Legend
                                    verticalAlign="bottom"
                                    height={36}
                                    formatter={(value) => <span className="text-sm text-slate-600">{value}</span>}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Department Stats */}
                <div className="xl:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-rose-100 dark:bg-rose-900/30 rounded-lg">
                            <BarChart3 className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Department Activity</h3>
                            <p className="text-sm text-slate-600 dark:text-slate-400">Movement by department</p>
                        </div>
                    </div>
                    <div className="h-96 w-full">
                        <ResponsiveContainer width={500} height="100%" minWidth={10} minHeight={10} style={{ width: '99%' }}>
                            <BarChart data={analytics.deptStats} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                                <XAxis type="number" stroke="#94a3b8" style={{ fontSize: '12px' }} />
                                <YAxis
                                    dataKey="department"
                                    type="category"
                                    stroke="#94a3b8"
                                    style={{ fontSize: '12px' }}
                                    width={120}
                                />
                                <Tooltip
                                    cursor={{ fill: 'transparent' }}
                                    contentStyle={{
                                        backgroundColor: '#fff',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '8px',
                                        fontSize: '12px'
                                    }}
                                />
                                <Bar dataKey="count" fill="#6366f1" radius={[0, 8, 8, 0]} barSize={24} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WardenAnalytics;
