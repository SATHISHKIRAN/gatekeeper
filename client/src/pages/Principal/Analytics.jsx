import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell
} from 'recharts';
import { AlertTriangle, Users } from 'lucide-react';

const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

const Analytics = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        axios.get('/api/principal/analytics')
            .then(res => {
                setData(res.data);
                setLoading(false);
            })
            .catch(err => console.error(err));
    }, []);

    if (loading) return <div>Loading Analytics...</div>;

    return (
        <div className="space-y-8 animate-fade-in-up pb-10">
            <h1 className="text-3xl font-black text-slate-900 dark:text-white">Comprehensive Analytics</h1>

            <div className="grid lg:grid-cols-2 gap-8">
                {/* Distribution Chart */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <h3 className="font-bold text-lg mb-6">Pass Distribution (30 Days)</h3>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width={500} height="100%" minWidth={10} minHeight={10} style={{ width: '99%' }}>
                            <PieChart>
                                <Pie
                                    data={data.passDistribution}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="count"
                                >
                                    {data.passDistribution.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Top Reasons */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <h3 className="font-bold text-lg mb-6">Top Exit Reasons</h3>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width={500} height="100%" minWidth={10} minHeight={10} style={{ width: '99%' }}>
                            <BarChart data={data.topReasons} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis type="number" />
                                <YAxis dataKey="category" type="category" width={100} />
                                <Tooltip />
                                <Bar dataKey="count" fill="#4F46E5" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Outlier Detection */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-red-200 dark:border-red-900/50 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-red-100 dark:border-red-900/30 bg-red-50 dark:bg-red-900/10 flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                    <h3 className="font-bold text-lg text-red-900 dark:text-red-200">Outlier Detection: High Frequency Exits (7 Days)</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 dark:bg-slate-900/50 text-xs uppercase font-bold text-slate-500">
                            <tr>
                                <th className="p-4">Student</th>
                                <th className="p-4">Active/Recent Passes</th>
                                <th className="p-4">Trust Score</th>
                                <th className="p-4">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {data.outliers.map((student) => (
                                <tr key={student.email} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                    <td className="p-4">
                                        <div className="font-bold text-slate-800 dark:text-white">{student.name}</div>
                                        <div className="text-xs text-slate-500">{student.email}</div>
                                    </td>
                                    <td className="p-4">
                                        <span className="bg-red-100 text-red-700 font-bold px-2 py-1 rounded-full text-xs">
                                            {student.pass_count} Exits
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-1">
                                            <div className="w-16 h-2 bg-slate-200 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full ${student.trust_score < 50 ? 'bg-red-500' : 'bg-green-500'}`}
                                                    style={{ width: `${student.trust_score}%` }}
                                                />
                                            </div>
                                            <span className="text-xs font-bold">{student.trust_score}</span>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <button className="text-xs font-bold text-indigo-600 hover:underline">View Profile</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Analytics;
