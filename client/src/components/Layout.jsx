import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSettings } from '../context/SettingsContext';
import {
    LogOut, LayoutDashboard, QrCode, ClipboardList, Shield, UserCheck,
    Activity, Moon, Sun, Bell, Menu, X, Home, FileText, Lock,
    History, BarChart3, Megaphone, User, ChevronRight, ChevronDown,
    CheckCircle, Info, AlertTriangle, Database, UserPlus, Users,
    CalendarDays, ShieldAlert, Globe, RefreshCw, FileBarChart
} from 'lucide-react';

import InstallPrompt from './InstallPrompt';
import NotificationPrompt from './NotificationPrompt';

const SidebarItem = ({ item, isActive, isOpen, onToggle, navigate, setIsSidebarOpen }) => {
    const Icon = item.icon;
    const hasChildren = item.children && item.children.length > 0;
    const isChildActive = hasChildren && item.children.some(child => window.location.pathname === child.path);

    // Group active if direct path matches or any child path matches
    const isGroupActive = isActive || isChildActive;

    return (
        <div className="space-y-1">
            <button
                onClick={() => {
                    if (hasChildren) {
                        onToggle();
                    } else {
                        navigate(item.path);
                        setIsSidebarOpen(false);
                    }
                }}
                className={`w-full group relative flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-bold transition-all duration-300 ${isGroupActive
                    ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800/50 hover:text-gray-900 dark:hover:text-slate-200'
                    }`}
            >
                {isActive && (
                    <div className="absolute left-0 w-1 h-6 bg-indigo-600 dark:bg-indigo-400 rounded-r-full" />
                )}
                <Icon className={`w-5 h-5 transition-colors ${isGroupActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400 dark:text-slate-500 group-hover:text-gray-600 dark:group-hover:text-slate-300'}`} />
                <span className="flex-1 text-left whitespace-nowrap">{item.label}</span>
                {hasChildren && (
                    <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
                )}
                {!hasChildren && isActive && <ChevronRight className="w-4 h-4 opacity-50" />}
            </button>

            {hasChildren && (
                <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-96 opacity-100 mt-1 mb-2' : 'max-h-0 opacity-0'}`}>
                    <div className="ml-9 space-y-1 border-l border-gray-100 dark:border-slate-800 pl-4 py-1">
                        {item.children.map((child) => {
                            const ChildIcon = child.icon;
                            const isChildItemActive = window.location.pathname === child.path;
                            return (
                                <button
                                    key={child.path}
                                    onClick={() => {
                                        navigate(child.path);
                                        setIsSidebarOpen(false);
                                    }}
                                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${isChildItemActive
                                        ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-500/5'
                                        : 'text-gray-500 dark:text-slate-500 hover:text-gray-900 dark:hover:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800/30'
                                        }`}
                                >
                                    <ChildIcon className={`w-4 h-4 ${isChildItemActive ? 'text-indigo-500' : 'text-gray-400'}`} />
                                    {child.label}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

const Layout = ({ children }) => {
    const { user, logout } = useAuth();
    const { settings } = useSettings();
    const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotification();
    const navigate = useNavigate();
    const location = useLocation();
    const [isDark, setIsDark] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const [expandedGroups, setExpandedGroups] = useState({});

    useEffect(() => {
        if (isDark) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [isDark]);

    // Auto-expand group if current path is a child
    useEffect(() => {
        const currentRoleNavs = navItems[user?.role] || [];
        currentRoleNavs.forEach((item, index) => {
            if (item.children && item.children.some(child => location.pathname === child.path)) {
                setExpandedGroups(prev => ({ ...prev, [index]: true }));
            }
        });
    }, [location.pathname, user?.role]);

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    const toggleGroup = (index) => {
        setExpandedGroups(prev => ({
            ...prev,
            [index]: !prev[index]
        }));
    };

    const navItems = {
        student: [
            { label: 'Home', path: '/student/dashboard', icon: LayoutDashboard },
            { label: 'Calendar', path: '/calendar', icon: CalendarDays },
            { label: 'My Past Records', path: '/student/history', icon: History },
            { label: 'My Profile', path: '/student/profile', icon: User },
        ],
        staff: [
            {
                label: 'Home',
                path: '/staff/dashboard',
                icon: LayoutDashboard
            },
            {
                label: 'Pass Requests',
                icon: ClipboardList,
                children: [
                    { label: 'Waiting for Me', path: '/staff/queue', icon: ClipboardList },
                    { label: 'Check Pass', path: '/staff/verify', icon: CheckCircle },
                    { label: 'Old Records', path: '/staff/history', icon: History },
                ]
            },
            {
                label: 'My Students',
                icon: UserCheck,
                children: [
                    { label: 'My Mentees', path: '/staff/my-students', icon: UserCheck },
                    { label: 'All Students', path: '/staff/students', icon: Users },
                ]
            },
            { label: 'Reports', path: '/staff/reports', icon: FileBarChart },
            { label: 'Gate Status', path: '/staff/gate-passes', icon: Activity },
            { label: 'My Account', path: '/staff/profile', icon: User },
        ],
        hod: [
            { label: 'Home', path: '/hod/dashboard', icon: LayoutDashboard },
            {
                label: 'Manage Passes',
                icon: Lock,
                children: [
                    { label: 'New Requests', path: '/hod/requests', icon: FileText },
                    { label: 'Pass Rules', path: '/hod/pass-management', icon: Lock },
                    { label: 'Health Emergencies', path: '/hod/medical', icon: AlertTriangle },
                ]
            },
            {
                label: 'People',
                icon: Shield,
                children: [
                    { label: 'Students', path: '/hod/students', icon: UserCheck },
                    { label: 'Teachers & Staff', path: '/hod/staff', icon: Shield },
                ]
            },
            { label: 'Reports', path: '/hod/reports', icon: FileBarChart },
            { label: 'Gate Info', path: '/hod/gate-passes', icon: Activity },
            { label: 'Calendar', path: '/calendar', icon: CalendarDays },
            { label: 'My Account', path: '/hod/profile', icon: User },
        ],
        warden: [
            { label: 'Home', path: '/warden/dashboard', icon: LayoutDashboard },
            {
                label: 'Student Entry/Exit',
                icon: Shield,
                children: [
                    { label: 'Check Out Student', path: '/warden/verify', icon: Shield },
                    { label: 'Entry/Exit Logs', path: '/warden/history', icon: History },
                ]
            },
            {
                label: 'Hostel Management',
                icon: Home,
                children: [
                    { label: 'Student List', path: '/warden/students', icon: Users },
                    { label: 'Room List', path: '/warden/rooms', icon: Home },
                ]
            },
            { label: 'Hostel Reports', path: '/warden/reports', icon: FileBarChart },
            { label: 'Calendar', path: '/calendar', icon: CalendarDays },
            { label: 'My Account', path: '/warden/profile', icon: User },
        ],
        gatekeeper: [
            { label: 'Home', path: '/gate/dashboard', icon: LayoutDashboard },
            {
                label: 'Entry & Exit History',
                icon: History,
                children: [
                    { label: 'Log Records', path: '/gate/history', icon: History },
                    { label: 'Live Gate Monitor', path: '/gate/live', icon: Activity },
                ]
            },
            { label: 'Visitor Records', path: '/gate/visitors', icon: Users },
            { label: 'Daily Reports', path: '/gate/reports', icon: FileBarChart },
            { label: 'My Account', path: '/gate/profile', icon: User },
        ],
        admin: [
            { label: 'Home', path: '/admin/stats', icon: BarChart3 },
            {
                label: 'People Management',
                icon: Users,
                children: [
                    { label: 'Students', path: '/admin/students', icon: UserCheck },
                    { label: 'Teachers & Staff', path: '/admin/staff', icon: Shield },
                ]
            },
            {
                label: 'Hospital Setup',
                icon: Home,
                children: [
                    { label: 'Hostels', path: '/admin/hostels', icon: Home },
                    { label: 'Departments', path: '/admin/departments', icon: ClipboardList },
                ]
            },
            {
                label: 'Settings',
                icon: Database,
                children: [
                    { label: 'Security & PIN', path: '/admin/system', icon: Database },
                    { label: 'Outpass Rules', path: '/admin/policies', icon: ShieldAlert },
                    { label: 'System Alerts', path: '/admin/notifications', icon: Bell },
                    { label: 'Send Emergency Message', path: '/admin/broadcasts', icon: Megaphone },
                ]
            },
            { label: 'Full Reports', path: '/admin/reports', icon: FileBarChart },
            { label: 'Gate Terminals', path: '/admin/gate-passes', icon: Activity },
            { label: 'Visitors List', path: '/gate/visitors', icon: Users },
            { label: 'Calendar', path: '/calendar', icon: CalendarDays },
            { label: 'My Account', path: '/admin/profile', icon: User },
        ],
        principal: [
            { label: 'Home', path: '/principal/dashboard', icon: LayoutDashboard },
            {
                label: 'Campus Setup',
                icon: Shield,
                children: [
                    { label: 'All Students', path: '/principal/students', icon: Users },
                    { label: 'All Teachers', path: '/principal/staff', icon: Shield },
                    { label: 'Departments', path: '/admin/departments', icon: ClipboardList },
                    { label: 'Hostels', path: '/admin/hostels', icon: Home },
                ]
            },
            {
                label: 'Analytics & Alerts',
                icon: BarChart3,
                children: [
                    { label: 'Campus Analytics', path: '/principal/analytics', icon: BarChart3 },
                    { label: 'Campus Reports', path: '/principal/reports', icon: FileBarChart },
                    { label: 'Emergency Alerts', path: '/principal/broadcast', icon: Megaphone },
                ]
            },
            {
                label: 'Security & Safety',
                icon: Activity,
                children: [
                    { label: 'Gate Management', path: '/admin/gate-passes', icon: Activity },
                    { label: 'Visitor Records', path: '/gate/visitors', icon: Users },
                ]
            },
            { label: 'Official Calendar', path: '/calendar', icon: CalendarDays },
            { label: 'My Account', path: '/principal/profile', icon: User },
        ]
    };

    const roleNavs = user ? (
        user.role === 'staff' ? [
            ...navItems.staff,
            ...(user.is_proxy_active ? [{ label: 'Medical Override', path: '/staff/medical', icon: AlertTriangle, isSpecial: true }] : [])
        ] : navItems[user.role]
    ) : [];

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex transition-colors duration-200 overflow-hidden font-sans">
            {/* Sidebar */}
            <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-white/80 dark:bg-slate-900/90 border-r border-gray-200/50 dark:border-slate-800/50 backdrop-blur-xl transition-transform duration-300 md:translate-x-0 md:static print:hidden ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
                } flex flex-col shadow-2xl md:shadow-none`}>

                {/* Brand Logo */}
                <div className="h-20 flex items-center justify-between px-8 border-b border-gray-100/50 dark:border-slate-800/50">
                    <div className="flex items-center gap-3">
                        {settings?.app_logo ? (
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
                <div className="flex-1 py-8 px-4 space-y-2 overflow-y-auto custom-scrollbar">
                    <p className="px-4 text-[10px] font-black text-gray-400 dark:text-slate-600 uppercase tracking-[0.2em] mb-4">Navigational Menu</p>
                    {roleNavs.map((item, index) => (
                        <SidebarItem
                            key={index}
                            item={item}
                            isActive={location.pathname === item.path}
                            isOpen={expandedGroups[index]}
                            onToggle={() => toggleGroup(index)}
                            navigate={navigate}
                            setIsSidebarOpen={setIsSidebarOpen}
                        />
                    ))}
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
                                className="flex-1 py-1.5 px-2 rounded-lg bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-700 text-gray-600 dark:text-gray-300 text-[10px] font-black uppercase tracking-wider hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-1.5"
                            >
                                {isDark ? <Sun className="w-3 h-3" /> : <Moon className="w-3 h-3" />}
                                Theme
                            </button>
                            <button
                                onClick={handleLogout}
                                className="flex-1 py-1.5 px-2 rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 text-red-600 dark:text-red-400 text-[10px] font-black uppercase tracking-wider hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors flex items-center justify-center gap-1.5"
                            >
                                <LogOut className="w-3 h-3" />
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            </aside >

            {/* Main Content */}
            < main className="flex-1 flex flex-col min-w-0 overflow-hidden relative" >
                {/* Header */}
                < header className="h-20 flex items-center justify-between px-6 md:px-10 z-30 sticky top-0 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-gray-100/50 dark:border-slate-800/50 print:hidden" >
                    <div className="flex items-center gap-4">
                        <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                            <Menu className="w-6 h-6" />
                        </button>
                        <div className="hidden md:block">
                            <h2 className="text-xl font-bold text-gray-800 dark:text-white border-l-4 border-indigo-600 pl-4 capitalize tracking-tight">
                                {(location.pathname.split('/').pop() || 'Dashboard').replace(/-/g, ' ')}
                            </h2>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 md:gap-4">
                        <InstallPrompt />
                        <NotificationPrompt />
                        <div className="relative">
                            <button
                                onClick={() => setShowNotifications(!showNotifications)}
                                className="w-10 h-10 rounded-xl flex items-center justify-center border border-gray-200 dark:border-slate-800 text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 hover:border-gray-300 dark:hover:border-slate-700 transition-all relative"
                            >
                                <Bell className="w-5 h-5" />
                                {unreadCount > 0 ? (
                                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full shadow-sm animate-pulse">
                                        {unreadCount}
                                    </span>
                                ) : null}
                            </button>

                            {showNotifications && (
                                <>
                                    <div
                                        className="absolute right-0 top-full mt-3 w-[90vw] sm:w-96 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-800 overflow-hidden z-50 origin-top-right scale-up-center"
                                    >
                                        <div className="p-4 border-b border-gray-50 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/30 backdrop-blur-sm flex items-center justify-between">
                                            <h3 className="font-bold text-sm text-gray-800 dark:text-white flex items-center gap-2">
                                                <Bell className="w-4 h-4" /> Notifications
                                            </h3>
                                            {notifications.length > 0 && (
                                                <button onClick={markAllAsRead} className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider hover:underline">
                                                    Mark all read
                                                </button>
                                            )}
                                        </div>

                                        <div className="max-h-[60vh] overflow-y-auto custom-scrollbar">
                                            {notifications.length === 0 ? (
                                                <div className="p-10 text-center flex flex-col items-center">
                                                    <div className="w-12 h-12 bg-gray-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-3">
                                                        <Bell className="w-5 h-5 text-gray-300 dark:text-slate-600" />
                                                    </div>
                                                    <p className="text-sm font-bold text-gray-800 dark:text-white">All caught up!</p>
                                                    <p className="text-xs text-gray-500 dark:text-slate-500 mt-1">No new notifications.</p>
                                                </div>
                                            ) : (
                                                notifications.map((n) => {
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
                                                                setShowNotifications(false);
                                                            }}
                                                            className={`p-4 border-b border-gray-50 dark:border-slate-800 last:border-0 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition cursor-pointer flex gap-3 ${!n.is_read ? 'bg-indigo-50/40 dark:bg-indigo-900/10' : ''}`}
                                                        >
                                                            <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${!n.is_read ? 'bg-indigo-500' : 'bg-transparent'}`} />

                                                            <div className="flex-1">
                                                                <p className={`text-sm ${!n.is_read ? 'font-bold text-gray-900 dark:text-white' : 'font-medium text-gray-600 dark:text-slate-400'}`}>
                                                                    {n.title}
                                                                </p>
                                                                <p className="text-xs text-gray-500 dark:text-slate-500 mt-1 leading-relaxed">
                                                                    {n.message}
                                                                </p>
                                                                <p className="text-[10px] text-gray-400 mt-2 font-mono">
                                                                    {timeAgo(n.created_at)}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>
                                    </div>
                                    <div onClick={() => setShowNotifications(false)} className="fixed inset-0 z-40" />
                                </>
                            )}
                        </div>
                    </div>

                </header >

                <div className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth custom-scrollbar">
                    <div className="max-w-7xl mx-auto w-full">
                        {children}
                    </div>
                </div>
            </main >

            {/* Mobile Sidebar Overlay */}
            {
                isSidebarOpen && (
                    <div
                        onClick={() => setIsSidebarOpen(false)}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden animate-in fade-in duration-300 print:hidden"
                    ></div>
                )
            }
        </div >
    );
};

export default Layout;
