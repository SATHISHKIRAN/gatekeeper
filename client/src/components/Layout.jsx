import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSettings } from '../context/SettingsContext';
import { LogOut, LayoutDashboard, QrCode, ClipboardList, Shield, UserCheck, Activity, Moon, Sun, Bell, Menu, X, Home, FileText, Lock, History, BarChart3, Megaphone, User, ChevronRight, CheckCircle, Info, AlertTriangle, Database } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Layout = ({ children }) => {
    const { user, logout } = useAuth();
    const { settings } = useSettings();
    const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotification();
    const navigate = useNavigate();
    const location = useLocation();
    const [isDark, setIsDark] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const [activeTab, setActiveTab] = useState('all'); // all, request, system

    useEffect(() => {
        if (isDark) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [isDark]);

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    const navItems = {
        student: [
            { label: 'Dashboard', path: '/student/dashboard', icon: LayoutDashboard },
            { label: 'My Wallet', path: '/student/wallet', icon: QrCode },
            { label: 'History', path: '/student/history', icon: History },
            { label: 'Profile', path: '/student/profile', icon: User },
        ],
        staff: [
            { label: 'Dashboard', path: '/staff/dashboard', icon: LayoutDashboard },
            { label: 'My Students', path: '/staff/my-students', icon: UserCheck },
            { label: 'Approval Queue', path: '/staff/queue', icon: ClipboardList },
            { label: 'Analytics', path: '/staff/analytics', icon: BarChart3 },
            { label: 'History', path: '/staff/history', icon: History },
            { label: 'Profile', path: '/staff/profile', icon: User },
            { label: 'Gate Management', path: '/staff/gate-passes', icon: Activity },
        ],
        hod: [
            { label: 'Dashboard', path: '/hod/dashboard', icon: LayoutDashboard },
            { label: 'Students', path: '/hod/students', icon: UserCheck },
            { label: 'Staff', path: '/hod/staff', icon: Shield },
            { label: 'Pass Requests', path: '/hod/requests', icon: FileText },
            { label: 'Access Control', path: '/hod/pass-management', icon: Lock },
            { label: 'Medical Emergency', path: '/hod/medical', icon: FileText },
            { label: 'Gate Management', path: '/hod/gate-passes', icon: Activity },
        ],
        warden: [
            { label: 'Dashboard', path: '/warden/dashboard', icon: LayoutDashboard },
            { label: 'Student Roster', path: '/warden/students', icon: UserCheck },
            { label: 'Verify Requests', path: '/warden/verify', icon: Shield },
            { label: 'Movement History', path: '/warden/history', icon: History },
            { label: 'Intelligence', path: '/warden/analytics', icon: BarChart3 },
            { label: 'Broadcasts', path: '/warden/broadcasts', icon: Megaphone },
            { label: 'Rooms', path: '/warden/rooms', icon: Home },
            { label: 'Gate Management', path: '/warden/gate-passes', icon: Activity },
        ],
        gatekeeper: [
            { label: 'Gate Dashboard', path: '/gate/dashboard', icon: LayoutDashboard },
            { label: 'Live Monitor', path: '/gate/monitor', icon: Activity },
            { label: 'Gate History', path: '/gate/history', icon: History },
        ],
        admin: [
            { label: 'Gate Management', path: '/admin/gate-passes', icon: Activity },
            { label: 'Analytics', path: '/admin/analytics', icon: BarChart3 },
            { label: 'Manage Students', path: '/admin/students', icon: UserCheck },
            { label: 'Manage Staff', path: '/admin/staff', icon: Shield },
            { label: 'Departments', path: '/admin/departments', icon: ClipboardList },
            { label: 'Hostel Hub', path: '/admin/hostels', icon: Home },
            { label: 'Broadcasts', path: '/admin/notifications', icon: Megaphone },
            { label: 'Database Management', path: '/admin/settings', icon: Database },
        ]
    };

    const roleNavs = user ? navItems[user.role] || [] : [];

    const filteredNotifications = notifications.filter(n => {
        if (activeTab === 'all') return true;
        if (activeTab === 'request') return n.category === 'request' || (!n.category && n.link && n.link.includes('request')); // Fallback for old data
        if (activeTab === 'system') return n.category === 'system' || n.category === 'security' || (!n.category && !n.link);
        return true;
    });

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex transition-colors duration-200 overflow-hidden font-sans">
            {/* Sidebar */}
            <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-white/80 dark:bg-slate-900/90 border-r border-gray-200/50 dark:border-slate-800/50 backdrop-blur-xl transition-transform duration-300 md:translate-x-0 md:static ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
                } flex flex-col shadow-2xl md:shadow-none`}>

                {/* Brand Logo */}
                <div className="h-20 flex items-center justify-between px-8 border-b border-gray-100/50 dark:border-slate-800/50">
                    <div className="flex items-center gap-3">
                        {settings?.app_logo && (settings.app_logo.startsWith('http') || settings.app_logo.startsWith('data:')) ? (
                            <img src={settings.app_logo} alt="Logo" className="w-8 h-8 rounded-lg object-contain bg-white" />
                        ) : (
                            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                                <Shield className="w-5 h-5 text-white" />
                            </div>
                        )}
                        <span className="text-xl font-black bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent tracking-tight">
                            {settings?.app_name || 'GateKeeper'}
                        </span>
                    </div>
                    <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Navigation Links */}
                <div className="flex-1 py-8 px-4 space-y-2 overflow-y-auto">
                    <p className="px-4 text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-4">Menu</p>
                    {roleNavs.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path;

                        return (
                            <button
                                key={item.path}
                                onClick={() => {
                                    navigate(item.path);
                                    setIsSidebarOpen(false);
                                }}
                                className={`w-full group relative flex items-center gap-3.5 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all duration-300 ${isActive
                                    ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                    : 'text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800/50 hover:text-gray-900 dark:hover:text-slate-200'
                                    }`}
                            >
                                {isActive && (
                                    <motion.div
                                        layoutId="activeNavIndicator"
                                        className="absolute left-0 w-1 h-8 bg-indigo-600 dark:bg-indigo-400 rounded-r-full"
                                    />
                                )}
                                <Icon className={`w-5 h-5 transition-colors ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400 dark:text-slate-500 group-hover:text-gray-600 dark:group-hover:text-slate-300'}`} />
                                <span className="flex-1 text-left">{item.label}</span>
                                {isActive && <ChevronRight className="w-4 h-4 opacity-50" />}
                            </button>
                        );
                    })}
                </div>

                {/* Profile Card */}
                <div className="p-4 border-t border-gray-100/50 dark:border-slate-800/50">
                    <div className="bg-gray-50 dark:bg-slate-800/50 rounded-2xl p-4 border border-gray-100 dark:border-slate-700/50 shadow-sm relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl -mr-10 -mt-10 transition-all group-hover:bg-indigo-500/10"></div>

                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-700 p-0.5 shadow-sm">
                                <div className="w-full h-full rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                                    {user?.name?.charAt(0) || 'U'}
                                </div>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{user?.name}</p>
                                <p className="text-[10px] font-bold text-indigo-500 dark:text-indigo-400 uppercase tracking-wider">{user?.role}</p>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={() => setIsDark(!isDark)}
                                className="flex-1 py-1.5 px-2 rounded-lg bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-700 text-gray-600 dark:text-gray-300 text-xs font-bold hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-1.5"
                            >
                                {isDark ? <Sun className="w-3 h-3" /> : <Moon className="w-3 h-3" />}
                                Theme
                            </button>
                            <button
                                onClick={handleLogout}
                                className="flex-1 py-1.5 px-2 rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 text-red-600 dark:text-red-400 text-xs font-bold hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors flex items-center justify-center gap-1.5"
                            >
                                <LogOut className="w-3 h-3" />
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
                {/* Header */}
                <header className="h-20 flex items-center justify-between px-6 md:px-10 z-10 sticky top-0 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-gray-100/50 dark:border-slate-800/50">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                            <Menu className="w-6 h-6" />
                        </button>
                        <div className="hidden md:block">
                            <h2 className="text-xl font-bold text-gray-800 dark:text-white capitalize tracking-tight">
                                {location.pathname.split('/').pop()?.replace('-', ' ')}
                            </h2>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setShowNotifications(!showNotifications)}
                            className="w-10 h-10 rounded-xl flex items-center justify-center border border-gray-200 dark:border-slate-800 text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 hover:border-gray-300 dark:hover:border-slate-700 transition-all relative"
                        >
                            <Bell className="w-5 h-5" />
                            {unreadCount > 0 && (
                                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full shadow-sm animate-pulse">
                                    {unreadCount}
                                </span>
                            )}
                        </button>

                        <AnimatePresence>
                            {showNotifications && (
                                <>
                                    <motion.div
                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                        className="absolute right-0 mt-4 w-96 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-800 overflow-hidden z-20 origin-top-right top-16 right-4 sm:right-10"
                                    >
                                        <div className="p-4 border-b border-gray-50 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/30 backdrop-blur-sm">
                                            <div className="flex items-center justify-between mb-4">
                                                <h3 className="font-bold text-sm text-gray-800 dark:text-white flex items-center gap-2">
                                                    <Bell className="w-4 h-4" /> Notifications
                                                </h3>
                                                <button onClick={markAllAsRead} className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider hover:underline">Mark all read</button>
                                            </div>
                                            <div className="flex p-1 bg-gray-100 dark:bg-slate-800 rounded-lg">
                                                {['all', 'request', 'system'].map(tab => (
                                                    <button
                                                        key={tab}
                                                        onClick={() => setActiveTab(tab)}
                                                        className={`flex-1 py-1 text-xs font-bold rounded-md capitalize transition-all ${activeTab === tab
                                                            ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm'
                                                            : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300'}`}
                                                    >
                                                        {tab}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                                            {filteredNotifications.length === 0 ? (
                                                <div className="p-10 text-center flex flex-col items-center">
                                                    <div className="w-16 h-16 bg-gray-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                                                        <Bell className="w-6 h-6 text-gray-300 dark:text-slate-600" />
                                                    </div>
                                                    <p className="text-sm font-bold text-gray-800 dark:text-white">All caught up!</p>
                                                    <p className="text-xs text-gray-500 dark:text-slate-500 mt-1">No new notifications in {activeTab}.</p>
                                                </div>
                                            ) : (
                                                filteredNotifications.map((n) => {
                                                    const getIcon = () => {
                                                        switch (n.type) {
                                                            case 'success': return <CheckCircle className="w-4 h-4 text-emerald-500" />;
                                                            case 'warning': return <AlertTriangle className="w-4 h-4 text-amber-500" />;
                                                            case 'error': return <Shield className="w-4 h-4 text-red-500" />;
                                                            default: return <Info className="w-4 h-4 text-indigo-500" />;
                                                        }
                                                    };

                                                    const timeAgo = (date) => {
                                                        const seconds = Math.floor((new Date() - new Date(date)) / 1000);
                                                        if (seconds < 60) return 'Just now';
                                                        const minutes = Math.floor(seconds / 60);
                                                        if (minutes < 60) return `${minutes}m ago`;
                                                        const hours = Math.floor(minutes / 60);
                                                        if (hours < 24) return `${hours}h ago`;
                                                        return new Date(date).toLocaleDateString();
                                                    };

                                                    return (
                                                        <div
                                                            key={n.id}
                                                            onClick={() => {
                                                                markAsRead(n.id);
                                                                if (n.link) navigate(n.link);
                                                            }}
                                                            className={`p-4 border-b border-gray-50 dark:border-slate-800 last:border-0 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition cursor-pointer flex gap-4 ${!n.is_read ? 'bg-indigo-50/30 dark:bg-indigo-900/10' : ''}`}
                                                        >
                                                            <div className={`mt-1 shrink-0 ${!n.is_read ? 'opacity-100' : 'opacity-50'}`}>
                                                                {getIcon()}
                                                            </div>
                                                            <div className="flex-1">
                                                                <div className="flex justify-between items-start">
                                                                    <p className={`text-sm ${!n.is_read ? 'font-bold text-gray-900 dark:text-white' : 'font-medium text-gray-600 dark:text-slate-400'}`}>
                                                                        {n.title}
                                                                    </p>
                                                                    {!n.is_read && <div className="w-2 h-2 bg-indigo-500 rounded-full shrink-0 mt-1.5" />}
                                                                </div>
                                                                <p className="text-xs text-gray-500 dark:text-slate-500 mt-1 leading-relaxed line-clamp-2">
                                                                    {n.message}
                                                                </p>
                                                                <p className="text-[10px] text-gray-400 mt-2 font-mono flex items-center gap-2">
                                                                    {timeAgo(n.created_at)}
                                                                    {n.link && <span className="text-indigo-500 font-medium hover:underline">View</span>}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>
                                    </motion.div>
                                    <div onClick={() => setShowNotifications(false)} className="fixed inset-0 z-10" />
                                </>
                            )}
                        </AnimatePresence>
                    </div>

                </header>

                <div className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={location.pathname}
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.98 }}
                            transition={{ duration: 0.3 }}
                            className="max-w-7xl mx-auto w-full"
                        >
                            {children}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </main>

            {/* Mobile Sidebar Overlay */}
            {
                isSidebarOpen && (
                    <div
                        onClick={() => setIsSidebarOpen(false)}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden animate-in fade-in duration-300"
                    ></div>
                )
            }
        </div >
    );
};

export default Layout;
