import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import {
    Users, Clock, CheckCircle, BarChart2, Bell,
    ArrowRight, Activity, Calendar, FileText
} from 'lucide-react';
import { Link } from 'react-router-dom';

const StatCard = ({ title, value, icon: Icon, color, trend }) => (
    <motion.div
        whileHover={{ y: -5 }}
        className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-lg border border-gray-100 dark:border-slate-800 relative overflow-hidden group"
    >
        <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full opacity-10 group-hover:opacity-20 transition-opacity bg-${color}-500 blur-2xl`} />

        <div className="flex justify-between items-start mb-4">
            <div className={`p-3 rounded-xl bg-${color}-50 dark:bg-${color}-900/20 text-${color}-600 dark:text-${color}-400`}>
                <Icon className="w-6 h-6" />
            </div>
            {trend && (
                <span className={`text-xs font-bold px-2 py-1 rounded-lg ${trend > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                    {trend > 0 ? '+' : ''}{trend}%
                </span>
            )}
        </div>

        <h3 className="text-gray-500 dark:text-slate-400 text-sm font-medium mb-1">{title}</h3>
        <p className="text-3xl font-bold text-gray-900 dark:text-white">{value}</p>
    </motion.div>
);

const ActivityItem = ({ action }) => (
    <div className="flex items-start gap-4 p-4 hover:bg-gray-50 dark:hover:bg-slate-800/50 rounded-xl transition-colors">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${action.status === 'approved_staff' ? 'bg-green-100 text-green-600' :
                action.status === 'rejected' ? 'bg-red-100 text-red-600' :
                    'bg-blue-100 text-blue-600'
            }`}>
            {action.status === 'approved_staff' ? <CheckCircle className="w-5 h-5" /> :
                action.status === 'rejected' ? <Bell className="w-5 h-5" /> :
                    <Clock className="w-5 h-5" />}
        </div>
        <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {action.student_name}
            </p>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                Request type: <span className="font-semibold capitalize">{action.type}</span>
            </p>
        </div>
        <span className="text-xs text-gray-400 whitespace-nowrap">
            {new Date(action.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
    </div>
);

const StaffDashboard = () => {
    const [stats, setStats] = useState({
        pendingCount: 0,
        totalStudents: 0,
        todayApprovals: 0,
        avgTrustScore: 0,
        recentActivity: []
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDashboardData();
        const interval = setInterval(fetchDashboardData, 10000); // Poll every 10s
        return () => clearInterval(interval);
    }, []);

    const fetchDashboardData = async () => {
        try {
            const res = await axios.get('/api/staff/dashboard');
            setStats(res.data);
            setLoading(false);
        } catch (err) {
            console.error("Failed to fetch dashboard stats", err);
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Loading Dashboard...</div>;

    const sections = [
        { title: 'Pending Requests', value: stats.pendingCount, icon: Clock, color: 'orange', trend: stats.pendingCount > 0 ? 5 : 0 },
        { title: 'My Students', value: stats.totalStudents, icon: Users, color: 'blue' },
        { title: "Today's Passes", value: stats.todayApprovals, icon: Calendar, color: 'green' },
        { title: 'Avg Trust Score', value: stats.avgTrustScore, icon: Activity, color: 'purple' },
    ];

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Staff Dashboard</h1>
                    <p className="text-gray-500 dark:text-slate-400">Overview of your department's activity</p>
                </div>
                <div className="flex gap-3">
                    <Link
                        to="/staff/queue"
                        className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-medium shadow-lg shadow-primary-600/20 transition-all flex items-center gap-2"
                    >
                        <FileText className="w-4 h-4" /> Review Queue
                    </Link>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {sections.map((stat, idx) => (
                    <StatCard key={idx} {...stat} />
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Recent Activity Feed */}
                <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Recent Activity</h2>
                        <Link to="/staff/history" className="text-primary-600 text-sm font-medium hover:underline flex items-center gap-1">
                            View All <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>

                    <div className="space-y-2">
                        {stats.recentActivity.length > 0 ? (
                            stats.recentActivity.map(action => (
                                <ActivityItem key={action.id} action={action} />
                            ))
                        ) : (
                            <div className="text-center py-10 text-gray-500">No recent activity found.</div>
                        )}
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-gradient-to-br from-slate-900 to-slate-800 dark:from-sky-900 dark:to-slate-900 rounded-2xl shadow-lg p-6 text-white">
                    <h2 className="text-lg font-bold mb-4">Quick Actions</h2>
                    <div className="space-y-3">
                        <Link to="/staff/my-students" className="block w-full p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-colors backdrop-blur-sm flex items-center gap-3">
                            <Users className="w-5 h-5 text-sky-300" />
                            <span className="font-medium">View Student Roster</span>
                        </Link>
                        <Link to="/staff/analytics" className="block w-full p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-colors backdrop-blur-sm flex items-center gap-3">
                            <BarChart2 className="w-5 h-5 text-purple-300" />
                            <span className="font-medium">Department Analytics</span>
                        </Link>
                        <button className="w-full p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-colors backdrop-blur-sm flex items-center gap-3 text-left">
                            <Bell className="w-5 h-5 text-orange-300" />
                            <span className="font-medium">Send Broadcast (Soon)</span>
                        </button>
                    </div>

                    <div className="mt-8 pt-6 border-t border-white/10">
                        <h3 className="text-sm font-semibold text-slate-400 uppercase mb-3">System Status</h3>
                        <div className="flex items-center gap-2 text-sm text-green-400">
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                            All Systems Operational
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StaffDashboard;
