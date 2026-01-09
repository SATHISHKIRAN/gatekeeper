import React, { useState } from 'react';
import {
    LayoutDashboard, Database, Settings, Activity, ShieldCheck,
    Menu, X, Globe, Lock, RefreshCw
} from 'lucide-react';
import GeneralSettings from './GeneralSettings';
import DatabaseManager from './DatabaseManager';
import SystemMonitor from './SystemMonitor';
import SecuritySettings from './SecuritySettings';
import AdminPasswordPrompt from './AdminPasswordPrompt';

import AcademicOperations from './AcademicOperations';

import { useSearchParams, useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';

const SystemControlCenter = () => {
    const { tab } = useParams();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    // Priority: URL Param > Query Param > Default 'general'
    const initialTab = tab || searchParams.get('tab') || 'general';
    const [activeModule, setActiveModule] = useState(initialTab);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [isVerified, setIsVerified] = useState(false);

    // Sync state with URL changes
    React.useEffect(() => {
        if (tab) setActiveModule(tab);
    }, [tab]);

    const modules = [
        { id: 'general', label: 'General & Branding', icon: Globe, component: GeneralSettings },
        { id: 'security', label: 'Security & Access', icon: Lock, component: SecuritySettings },
        { id: 'academic', label: 'Academic Year', icon: RefreshCw, component: AcademicOperations },
        { id: 'database', label: 'Database & Storage', icon: Database, component: DatabaseManager },
        { id: 'monitor', label: 'System Monitor', icon: Activity, component: SystemMonitor },
    ];

    const ActiveComponent = modules.find(m => m.id === activeModule)?.component || GeneralSettings;

    if (!isVerified) {
        return <AdminPasswordPrompt onVerify={() => setIsVerified(true)} />;
    }

    return (
        <div className="flex h-[calc(100vh-6rem)] bg-gradient-to-br from-slate-50 to-slate-100 dark:from-[#0f172a] dark:to-[#1e293b] rounded-3xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-700/50">
            {/* Sidebar (Desktop) */}
            <aside className={`absolute md:relative z-20 h-full w-72 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-r border-slate-200 dark:border-slate-700/50 transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
                <div className="p-6 h-full flex flex-col">
                    <div className="flex items-center gap-3 mb-8 px-2">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                            <LayoutDashboard className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="font-black text-lg text-slate-900 dark:text-white leading-tight">System</h1>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Control Center</p>
                        </div>
                        <button onClick={() => setSidebarOpen(false)} className="md:hidden ml-auto p-1 text-slate-400">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <nav className="space-y-2 flex-1">
                        {modules.map(module => (
                            <button
                                key={module.id}
                                onClick={() => {
                                    setActiveModule(module.id);
                                    setSidebarOpen(false);
                                }}
                                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl font-bold text-sm transition-all duration-200 group ${activeModule === module.id
                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                                    }`}
                            >
                                <module.icon className={`w-5 h-5 transition-transform group-hover:scale-110 ${activeModule === module.id ? 'text-white' : 'text-slate-400 group-hover:text-indigo-500'}`} />
                                {module.label}
                            </button>
                        ))}
                    </nav>

                    <div className="mt-auto pt-6 border-t border-slate-200 dark:border-slate-800">
                        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50">
                            <div className="flex items-center gap-2 mb-2">
                                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">System Healthy</span>
                            </div>
                            <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                <div className="h-full w-full bg-emerald-500 rounded-full animate-pulse-slow"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </aside>
            {/* Mobile Toggle */}
            <button
                onClick={() => setSidebarOpen(true)}
                className="md:hidden absolute top-4 left-4 z-10 p-2 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700"
            >
                <Menu className="w-6 h-6 text-slate-600 dark:text-slate-300" />
            </button>

            {/* Main Content Area */}
            <main className="flex-1 h-full overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700">
                <div className="p-6 md:p-10 max-w-6xl mx-auto min-h-full">
                    <ActiveComponent />
                </div>
            </main>
        </div>
    );
};

export default SystemControlCenter;
