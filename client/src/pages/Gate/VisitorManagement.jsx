import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Users, UserPlus, LogOut, Search, Filter,
    Calendar, Phone, Building2, Briefcase,
    ShieldCheck, CreditCard, ChevronRight, ChevronLeft,
    Camera, RefreshCw, X, Check, History as HistoryIcon,
    AlertCircle, FileText, UserSquare2, User, Eye, MapPin,
    AtSign, Plus, Clock, MoreVertical
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

const UserCheck = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><polyline points="16 11 18 13 22 9" />
    </svg>
);

const VisitorManagement = () => {
    const [view, setView] = useState('active'); // active, history
    const [activeVisitors, setActiveVisitors] = useState([]);
    const [history, setHistory] = useState([]);
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 10,
        total: 0,
        total_persons: 0,
        totalPages: 1
    });
    const [contractWorkers, setContractWorkers] = useState([]);
    const [isContractModalOpen, setIsContractModalOpen] = useState(false);
    const [contractHistory, setContractHistory] = useState([]);
    const [viewContractHistoryId, setViewContractHistoryId] = useState(null);

    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isIssuing, setIsIssuing] = useState(false);
    const [selectedVisitor, setSelectedVisitor] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeSearch, setActiveSearch] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);
    const [isAdvancedSearch, setIsAdvancedSearch] = useState(false);
    const [advancedFilters, setAdvancedFilters] = useState({
        visitor_type: 'all',
        from: '',
        to: '',
        host_name: '',
        status: 'all'
    });

    // Camera State
    const [showCamera, setShowCamera] = useState(false);
    const [fullScreenImage, setFullScreenImage] = useState(null);
    const videoRef = React.useRef(null);
    const streamRef = React.useRef(null);

    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        visitor_type: 'guest',
        company: '',
        purpose: '',
        host_name: '',
        host_code: '',
        host_department: '',
        id_proof_type: 'Aadhar',
        id_proof_number: '',
        remarks: '',
        image: null,
        group_size: 1,
        group_members: [] // Array of { name, relation }
    });

    // Contract Form State
    const [contractForm, setContractForm] = useState({
        name: '', phone: '', role: 'Contract Worker', company: '', department: '', valid_until: ''
    });

    const fetchData = async () => {
        try {
            setLoading(true);
            const [activeRes, statsRes] = await Promise.all([
                axios.get('/api/visitors/active'),
                axios.get('/api/visitors/today-stats')
            ]);
            setActiveVisitors(activeRes.data);
            setStats(statsRes.data);
        } catch (err) {
            toast.error('Failed to sync visitor data');
        } finally {
            setLoading(false);
        }
    };

    const fetchHistory = async () => {
        try {
            const params = {
                search: searchTerm,
                page: pagination.page,
                limit: 10,
                ...advancedFilters
            };
            const res = await axios.get('/api/visitors/history', { params });
            // Handle both old array format (fallback) and new object format
            if (Array.isArray(res.data)) {
                setHistory(res.data);
                setPagination(prev => ({ ...prev, total: res.data.length, total_persons: res.data.reduce((acc, v) => acc + (v.group_size || 1), 0) }));
            } else {
                setHistory(res.data.data);
                setPagination(prev => ({ ...prev, ...res.data.pagination }));
            }
        } catch (err) {
            toast.error('Failed to load history');
        }
    };

    const fetchContractWorkers = async () => {
        try {
            const res = await axios.get('/api/visitors/contract/all');
            setContractWorkers(res.data);
        } catch (err) {
            toast.error('Failed to load contract workers');
        }
    };

    useEffect(() => {
        fetchData();
        fetchContractWorkers();
    }, []);

    useEffect(() => {
        if (view === 'history') fetchHistory();
        if (view === 'contract') fetchContractWorkers();
    }, [view, searchTerm, advancedFilters, pagination.page]);

    // Debounced Host Verification
    useEffect(() => {
        const verifyHost = async () => {
            if (!formData.host_code || formData.host_code.length < 3) return;

            setIsVerifying(true);
            try {
                const res = await axios.get(`/api/visitors/host-lookup/${formData.host_code}`);
                setFormData(prev => ({
                    ...prev,
                    host_name: res.data.name,
                    host_department: res.data.department_name || 'General'
                }));
            } catch (err) {
                // Silently fail on typing, clear if not found
                setFormData(prev => ({ ...prev, host_name: '', host_department: '' }));
            } finally {
                setIsVerifying(false);
            }
        };

        const timeoutId = setTimeout(verifyHost, 500);
        return () => clearTimeout(timeoutId);
    }, [formData.host_code]);

    // Camera Functions
    const startCamera = async () => {
        try {
            setShowCamera(true);
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (err) {
            console.error("Camera Error:", err);
            toast.error("Could not access camera");
            setShowCamera(false);
        }
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        setShowCamera(false);
    };

    const captureImage = () => {
        if (!videoRef.current) return;
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(videoRef.current, 0, 0);
        const imageSrc = canvas.toDataURL('image/jpeg');
        setFormData(prev => ({ ...prev, image: imageSrc }));
        stopCamera();
        toast.success("Photo Captured");
    };

    const handleIssuePass = async (e) => {
        e.preventDefault();
        try {
            await axios.post('/api/visitors/issue', formData);
            toast.success('Visitor Pass Issued Successfully');
            setIsIssuing(false);
            setFormData({
                name: '', phone: '', visitor_type: 'guest', company: '',
                purpose: '', host_name: '', host_department: '',
                id_proof_type: 'Aadhar', id_proof_number: '', remarks: '', image: null,
                group_size: 1, group_members: []
            });
            fetchData();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to issue pass');
        }
    };

    const handleCheckOut = async (id) => {
        try {
            await axios.post(`/api/visitors/checkout/${id}`);
            toast.success('Visitor Checked Out');
            fetchData();
        } catch (err) {
            toast.error('Check-out failed');
        }
    };

    const statsCards = [
        { label: 'Total Persons Today', value: stats?.today_total || 0, icon: Users, color: 'indigo' },
        { label: 'Currently Inside', value: stats?.currently_inside || 0, icon: UserCheck, color: 'emerald' },
        { label: 'Quest/Others', value: stats?.breakdown?.find(b => b.visitor_type === 'guest')?.count || 0, icon: UserSquare2, color: 'amber' },
        { label: 'Workers/Vendors', value: (stats?.breakdown?.find(b => b.visitor_type === 'worker')?.count || 0) + (stats?.breakdown?.find(b => b.visitor_type === 'vendor')?.count || 0), icon: Briefcase, color: 'blue' },
    ];

    const getVisitorTypeBadge = (type) => {
        const styles = {
            guest: 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
            worker: 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400',
            vendor: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400',
            parent: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
            other: 'bg-gray-100 text-gray-700 dark:bg-slate-500/10 dark:text-slate-400'
        };
        return <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${styles[type] || styles.other}`}>{type}</span>;
    };

    return (
        <div className="space-y-8 pb-20">
            {/* Header with Issuance Trigger */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">Visitor Management</h1>
                    <p className="text-gray-500 dark:text-slate-400 font-medium">Issue and track visitor passes for college entrance.</p>
                </div>
                <button
                    onClick={() => setIsIssuing(true)}
                    className="flex items-center justify-center gap-2 px-6 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl shadow-xl shadow-indigo-600/20 transition-all active:scale-95 group"
                >
                    <UserPlus className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                    ISSUE NEW PASS
                </button>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {statsCards.map((card, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm relative overflow-hidden group"
                    >
                        <div className={`absolute top-0 right-0 w-24 h-24 bg-${card.color}-500/5 rounded-full blur-3xl -mr-8 -mt-8`} />
                        <div className="flex items-center gap-4 relative">
                            <div className={`p-3 bg-${card.color}-100 dark:bg-${card.color}-500/10 rounded-2xl`}>
                                <card.icon className={`w-6 h-6 text-${card.color}-600 dark:text-${card.color}-400`} />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest">{card.label}</p>
                                <p className="text-2xl font-black text-gray-900 dark:text-white">{card.value}</p>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* View Switcher */}
            <div className="flex p-1 bg-gray-100 dark:bg-slate-800 rounded-2xl w-fit">
                <button
                    onClick={() => setView('active')}
                    className={`px-6 py-2.5 rounded-xl text-sm font-black transition-all ${view === 'active' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm' : 'text-gray-500'}`}
                >
                    Active Visitors
                </button>
                <button
                    onClick={() => setView('history')}
                    className={`px-6 py-2.5 rounded-xl text-sm font-black transition-all ${view === 'history' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm' : 'text-gray-500'}`}
                >
                    Log History
                </button>
                <button
                    onClick={() => setView('contract')}
                    className={`px-6 py-2.5 rounded-xl text-sm font-black transition-all ${view === 'contract' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm' : 'text-gray-500'}`}
                >
                    Contract Workers
                </button>
            </div>

            {/* Main Content Area */}
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
                {view === 'active' ? (
                    <div className="space-y-0">
                        {/* Search Active Visitors */}
                        <div className="p-6 border-b border-gray-100 dark:border-slate-800 bg-gray-50/30 dark:bg-slate-800/20">
                            <div className="max-w-md flex items-center gap-3 bg-white dark:bg-slate-900 px-4 py-2.5 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
                                <Search className="w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search currently inside..."
                                    value={activeSearch}
                                    onChange={(e) => setActiveSearch(e.target.value)}
                                    className="bg-transparent border-none focus:ring-0 text-sm font-bold text-gray-900 dark:text-white placeholder-gray-400 w-full"
                                />
                                {activeSearch && (
                                    <button onClick={() => setActiveSearch('')} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg">
                                        <X className="w-3.5 h-3.5 text-gray-400" />
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50/50 dark:bg-slate-800/50 border-b border-gray-100 dark:border-slate-800 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                                    <tr>
                                        <th className="px-8 py-5">Visitor Identity</th>
                                        <th className="px-6 py-5">Type & Source</th>
                                        <th className="px-6 py-5">Host Context</th>
                                        <th className="px-6 py-5">Timing</th>
                                        <th className="px-8 py-5 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50 dark:divide-slate-800/50">
                                    {activeVisitors.filter(v =>
                                        v.name.toLowerCase().includes(activeSearch.toLowerCase()) ||
                                        v.phone.includes(activeSearch) ||
                                        (v.company && v.company.toLowerCase().includes(activeSearch.toLowerCase()))
                                    ).length === 0 ? (
                                        <tr>
                                            <td colSpan="5" className="py-20 text-center">
                                                <div className="flex flex-col items-center gap-4 text-gray-400">
                                                    <Users className="w-12 h-12 opacity-10" />
                                                    <p className="font-bold text-sm">
                                                        {activeSearch ? `No results for "${activeSearch}"` : 'No Active Visitors'}
                                                    </p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        activeVisitors
                                            .filter(v =>
                                                v.name.toLowerCase().includes(activeSearch.toLowerCase()) ||
                                                v.phone.includes(activeSearch) ||
                                                (v.company && v.company.toLowerCase().includes(activeSearch.toLowerCase()))
                                            )
                                            .map((v) => (
                                                <tr key={v.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/30 transition-colors group">
                                                    <td className="px-8 py-6">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-50 dark:from-slate-800 dark:to-slate-900 flex items-center justify-center text-gray-400 group-hover:from-indigo-50 group-hover:to-indigo-100 dark:group-hover:from-indigo-500/10 dark:group-hover:to-indigo-500/5 transition-colors overflow-hidden">
                                                                {v.image_url ? (
                                                                    <img src={v.image_url} alt={v.name} className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <User className="w-6 h-6" />
                                                                )}
                                                            </div>
                                                            <div>
                                                                <div className="flex items-center gap-2">
                                                                    <p className="font-black text-gray-900 dark:text-white leading-tight">{v.name}</p>
                                                                    {v.group_size > 1 && (
                                                                        <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[9px] font-black rounded-md border border-indigo-100 dark:border-indigo-500/20">
                                                                            +{v.group_size - 1} OTHERS
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <p className="text-xs font-mono font-bold text-gray-400 mt-1">{v.phone}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-6">
                                                        <div className="space-y-2">
                                                            {getVisitorTypeBadge(v.visitor_type)}
                                                            {v.company && (
                                                                <p className="text-xs font-bold text-gray-500 flex items-center gap-1.5">
                                                                    <Building2 className="w-3.5 h-3.5" /> {v.company}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-6">
                                                        <div className="space-y-1">
                                                            <p className="text-sm font-bold text-gray-700 dark:text-slate-300">Visiting: {v.host_name || 'N/A'}</p>
                                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{v.host_department || 'General'}</p>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-6">
                                                        <div className="space-y-1">
                                                            <p className="text-sm font-black text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
                                                                <Clock className="w-4 h-4" /> {new Date(v.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </p>
                                                            <p className="text-[10px] font-bold text-gray-400">Arrived Today</p>
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-6 text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <button
                                                                onClick={() => setSelectedVisitor(v)}
                                                                className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-xl transition-all"
                                                                title="View Details"
                                                            >
                                                                <Eye className="w-5 h-5" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleCheckOut(v.id)}
                                                                className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 text-red-600 dark:text-red-400 text-xs font-black rounded-xl hover:bg-red-600 hover:text-white transition-all transform active:scale-95 group/btn"
                                                            >
                                                                <LogOut className="w-3.5 h-3.5 group-hover/btn:-translate-x-1 transition-transform" />
                                                                CHECK OUT
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6 p-6">
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="flex-1 flex items-center gap-4 bg-gray-50 dark:bg-slate-800/50 p-2 rounded-2xl border border-gray-100 dark:border-slate-700">
                                <Search className="w-5 h-5 text-gray-400 ml-4" />
                                <input
                                    type="text"
                                    placeholder="Search Name, Phone or Company..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-bold text-gray-900 dark:text-white placeholder-gray-400"
                                />
                            </div>
                            <button
                                onClick={() => setIsAdvancedSearch(!isAdvancedSearch)}
                                className={`px-6 py-2 rounded-2xl flex items-center gap-2 font-black text-sm transition-all ${isAdvancedSearch ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200'}`}
                            >
                                <Filter className="w-4 h-4" />
                                {isAdvancedSearch ? 'HIDE FILTERS' : 'ADVANCED SEARCH'}
                            </button>
                        </div>

                        <AnimatePresence>
                            {isAdvancedSearch && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden"
                                >
                                    <div className="p-6 bg-gray-50/50 dark:bg-slate-800/30 rounded-3xl border border-gray-100 dark:border-slate-800 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Visitor Type</label>
                                            <select
                                                value={advancedFilters.visitor_type}
                                                onChange={(e) => setAdvancedFilters({ ...advancedFilters, visitor_type: e.target.value })}
                                                className="w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                                            >
                                                <option value="all">All Types</option>
                                                <option value="guest">Guest</option>
                                                <option value="worker">Worker</option>
                                                <option value="vendor">Vendor</option>
                                                <option value="parent">Parent</option>
                                                <option value="other">Other</option>
                                            </select>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">From Date</label>
                                            <input
                                                type="date"
                                                value={advancedFilters.from}
                                                onChange={(e) => setAdvancedFilters({ ...advancedFilters, from: e.target.value })}
                                                className="w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">To Date</label>
                                            <input
                                                type="date"
                                                value={advancedFilters.to}
                                                onChange={(e) => setAdvancedFilters({ ...advancedFilters, to: e.target.value })}
                                                className="w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Host Name</label>
                                            <input
                                                type="text"
                                                placeholder="e.g. Dr. Satish"
                                                value={advancedFilters.host_name}
                                                onChange={(e) => setAdvancedFilters({ ...advancedFilters, host_name: e.target.value })}
                                                className="w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Trip Status</label>
                                            <select
                                                value={advancedFilters.status}
                                                onChange={(e) => setAdvancedFilters({ ...advancedFilters, status: e.target.value })}
                                                className="w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                                            >
                                                <option value="all">All Trips</option>
                                                <option value="active">Currently Inside</option>
                                                <option value="completed">Checked Out</option>
                                            </select>
                                        </div>

                                        <div className="flex flex-col justify-end pb-0.5">
                                            <button
                                                onClick={() => setAdvancedFilters({ from: '', to: '', visitor_type: 'all', host_name: '', status: 'all' })}
                                                className="w-full h-10 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-xl text-[10px] font-black text-red-600 hover:bg-red-600 hover:text-white transition-all tracking-widest"
                                            >
                                                RESET FILTERS
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Results Summary Bar */}
                        <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 bg-indigo-50/50 dark:bg-indigo-500/5 rounded-2xl border border-indigo-100/50 dark:border-indigo-500/10">
                            <div className="flex items-center gap-6">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-indigo-500" />
                                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Entries</p>
                                    <span className="px-2 py-0.5 bg-white dark:bg-slate-900 rounded-lg text-sm font-black text-indigo-600 shadow-sm border border-indigo-100 dark:border-indigo-800">
                                        {pagination.total}
                                    </span>
                                </div>
                                <div className="w-px h-6 bg-gray-200 dark:bg-slate-700" />
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Persons</p>
                                    <span className="px-2 py-0.5 bg-white dark:bg-slate-900 rounded-lg text-sm font-black text-emerald-600 shadow-sm border border-emerald-100 dark:border-emerald-800">
                                        {pagination.total_persons || pagination.total}
                                    </span>
                                </div>
                            </div>
                            <div className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                                Showing page {pagination.page} of {pagination.totalPages}
                            </div>
                        </div>

                        <div className="overflow-x-auto border border-gray-100 dark:border-slate-800 rounded-3xl">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50/50 dark:bg-slate-800/50 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-100 dark:border-slate-800">
                                    <tr>
                                        <th className="px-6 py-4">Visitor</th>
                                        <th className="px-6 py-4">Purpose</th>
                                        <th className="px-6 py-4">Dates & Times</th>
                                        <th className="px-6 py-4">Issued By</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50 dark:divide-slate-800/50">
                                    {history.map(v => (
                                        <tr key={v.id} className="text-sm">
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden">
                                                        {v.image_url ? (
                                                            <img src={v.image_url} alt={v.name} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <User className="w-5 h-5 text-gray-400" />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <p className="font-extrabold text-gray-900 dark:text-white group-hover:text-indigo-600 transition-colors uppercase tracking-tight">{v.name}</p>
                                                            {v.group_size > 1 && (
                                                                <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[9px] font-black rounded-md">
                                                                    GROUP OF {v.group_size}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-[10px] font-bold text-gray-400 mt-0.5">{v.phone}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <p className="text-gray-700 dark:text-slate-400 font-medium">{v.purpose}</p>
                                                <p className="text-[10px] text-gray-400 font-black uppercase tracking-tighter mt-1">{v.visitor_type}</p>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex gap-4">
                                                    <div>
                                                        <p className="text-[10px] uppercase font-black text-emerald-500 italic">IN</p>
                                                        <p className="font-mono text-xs font-bold">{new Date(v.check_in).toLocaleString()}</p>
                                                    </div>
                                                    {v.check_out && (
                                                        <div>
                                                            <p className="text-[10px] uppercase font-black text-red-500 italic">OUT</p>
                                                            <p className="font-mono text-xs font-bold">{new Date(v.check_out).toLocaleString()}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs font-bold text-gray-500 flex items-center gap-1.5">
                                                        <ShieldCheck className="w-3.5 h-3.5" /> {v.issued_by}
                                                    </span>
                                                    <button
                                                        onClick={() => setSelectedVisitor(v)}
                                                        className="p-1.5 text-gray-400 hover:text-indigo-600 transition-colors"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination Controls */}
                        <div className="flex items-center justify-between px-2 pt-4">
                            <button
                                onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                                disabled={pagination.page === 1}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 text-gray-600 dark:text-gray-400 text-xs font-black rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                            >
                                <ChevronLeft className="w-4 h-4" />
                                PREVIOUS
                            </button>
                            <div className="flex items-center gap-2">
                                {[...Array(pagination.totalPages)].map((_, i) => (
                                    <button
                                        key={i + 1}
                                        onClick={() => setPagination(prev => ({ ...prev, page: i + 1 }))}
                                        className={`w-10 h-10 rounded-xl text-xs font-black transition-all ${pagination.page === i + 1
                                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                                                : 'bg-white dark:bg-slate-900 text-gray-600 dark:text-gray-400 border border-gray-100 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800'
                                            }`}
                                    >
                                        {i + 1}
                                    </button>
                                ))}
                            </div>
                            <button
                                onClick={() => setPagination(prev => ({ ...prev, page: Math.min(pagination.totalPages, prev.page + 1) }))}
                                disabled={pagination.page === pagination.totalPages}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 text-gray-600 dark:text-gray-400 text-xs font-black rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                            >
                                NEXT
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                )}
                {view === 'contract' && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-12 gap-8">
                            {/* Create New Pass Card */}
                            <div className="col-span-12 md:col-span-4 lg:col-span-3">
                                <motion.div
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => setIsContractModalOpen(true)}
                                    className="h-full min-h-[200px] bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-3xl p-6 flex flex-col justify-between text-white cursor-pointer shadow-lg shadow-indigo-600/20"
                                >
                                    <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                                        <Plus className="w-6 h-6 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-black mb-2">New Contract Pass</h3>
                                        <p className="text-indigo-100 text-sm font-medium">Issue a recurring pass for long-term workers.</p>
                                    </div>
                                </motion.div>
                            </div>

                            {/* Workers Grid */}
                            <div className="col-span-12 md:col-span-8 lg:col-span-9">
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                    {contractWorkers.map(worker => (
                                        <div key={worker.id} className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-slate-800 p-6 flex flex-col gap-4 shadow-sm group hover:border-indigo-100 dark:hover:border-indigo-500/30 transition-all">
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-lg ${worker.current_state === 'in' ? 'bg-emerald-500 shadow-lg shadow-emerald-500/20' : 'bg-gray-200 dark:bg-slate-700 text-gray-500 dark:text-slate-400'}`}>
                                                        {worker.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-gray-900 dark:text-white leading-tight">{worker.name}</h4>
                                                        <p className="text-xs font-medium text-gray-500">{worker.role} • {worker.company}</p>
                                                    </div>
                                                </div>
                                                <div className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${worker.current_state === 'in' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                                                    {worker.current_state === 'in' ? 'INSIDE' : 'AWAY'}
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between pt-4 border-t border-gray-50 dark:border-slate-800">
                                                <button
                                                    onClick={async () => {
                                                        try {
                                                            const res = await axios.post(`/api/visitors/contract/toggle/${worker.id}`);
                                                            toast.success(res.data.message);
                                                            fetchContractWorkers();
                                                        } catch (err) {
                                                            toast.error('Action Failed');
                                                        }
                                                    }}
                                                    className={`flex-1 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${worker.current_state === 'in' ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}
                                                >
                                                    {worker.current_state === 'in' ? (
                                                        <><LogOut className="w-4 h-4" /> CLOCK OUT</>
                                                    ) : (
                                                        <><UserCheck className="w-4 h-4" /> CLOCK IN</>
                                                    )}
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setViewContractHistoryId(worker.id);
                                                        // We might need to fetch logs here
                                                        axios.get(`/api/visitors/contract/history/${worker.id}`).then(res => setContractHistory(res.data));
                                                    }}
                                                    className="ml-3 p-3 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                                                >
                                                    <HistoryIcon className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Create Modal */}
                        <AnimatePresence>
                            {isContractModalOpen && (
                                <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
                                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsContractModalOpen(false)} />
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl relative z-10 overflow-hidden"
                                    >
                                        <div className="p-6 border-b border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/50">
                                            <h3 className="text-xl font-black text-indigo-900 dark:text-white">New Recurring User</h3>
                                            <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">Create Monthly/Permanent Pass</p>
                                        </div>
                                        <div className="p-6 space-y-4">
                                            <input
                                                placeholder="Full Name"
                                                className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-xl font-bold text-sm outline-none"
                                                value={contractForm.name}
                                                onChange={e => setContractForm({ ...contractForm, name: e.target.value })}
                                            />
                                            <input
                                                placeholder="Phone Number"
                                                className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-xl font-bold text-sm outline-none"
                                                value={contractForm.phone}
                                                onChange={e => setContractForm({ ...contractForm, phone: e.target.value })}
                                            />
                                            <div className="grid grid-cols-2 gap-4">
                                                <input
                                                    placeholder="Role (e.g. Cleaner)"
                                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-xl font-bold text-sm outline-none"
                                                    value={contractForm.role}
                                                    onChange={e => setContractForm({ ...contractForm, role: e.target.value })}
                                                />
                                                <input
                                                    placeholder="Company (Optional)"
                                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-xl font-bold text-sm outline-none"
                                                    value={contractForm.company}
                                                    onChange={e => setContractForm({ ...contractForm, company: e.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Valid Until (Leave empty for infinite)</label>
                                                <input
                                                    type="date"
                                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-xl font-bold text-sm outline-none"
                                                    value={contractForm.valid_until}
                                                    onChange={e => setContractForm({ ...contractForm, valid_until: e.target.value })}
                                                />
                                            </div>
                                            <button
                                                onClick={async () => {
                                                    try {
                                                        await axios.post('/api/visitors/contract/create', contractForm);
                                                        toast.success('Contract Pass Created');
                                                        setIsContractModalOpen(false);
                                                        fetchContractWorkers();
                                                        setContractForm({ name: '', phone: '', role: 'Contract Worker', company: '', department: '', valid_until: '' });
                                                    } catch (err) {
                                                        toast.error('Failed to create pass');
                                                    }
                                                }}
                                                className="w-full py-4 bg-indigo-600 text-white font-black rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/20"
                                            >
                                                CREATE PASS
                                            </button>
                                        </div>
                                    </motion.div>
                                </div>
                            )}
                        </AnimatePresence>

                        {/* History Modal */}
                        <AnimatePresence>
                            {viewContractHistoryId && (
                                <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
                                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setViewContractHistoryId(null)} />
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 20 }}
                                        className="bg-white dark:bg-slate-900 w-full max-w-2xl max-h-[80vh] flex flex-col rounded-3xl shadow-2xl relative z-10"
                                    >
                                        <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center">
                                            <h3 className="text-xl font-black text-gray-900 dark:text-white">Activity Log</h3>
                                            <button onClick={() => setViewContractHistoryId(null)} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
                                        </div>
                                        <div className="flex-1 overflow-y-auto p-0">
                                            <table className="w-full text-left">
                                                <thead className="bg-gray-50 dark:bg-slate-800/50 text-[10px] font-black uppercase text-gray-400">
                                                    <tr>
                                                        <th className="px-6 py-3">Action</th>
                                                        <th className="px-6 py-3">Time</th>
                                                        <th className="px-6 py-3">Gatekeeper</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
                                                    {contractHistory.map(log => (
                                                        <tr key={log.id}>
                                                            <td className="px-6 py-4">
                                                                <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase ${log.action === 'check_in' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                                                                    {log.action === 'check_in' ? 'IN' : 'OUT'}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4 text-sm font-mono font-bold">{new Date(log.timestamp).toLocaleString()}</td>
                                                            <td className="px-6 py-4 text-sm font-medium text-gray-500">{log.gatekeeper_name}</td>
                                                        </tr>
                                                    ))}
                                                    {contractHistory.length === 0 && (
                                                        <tr><td colSpan="3" className="px-6 py-8 text-center text-gray-400 font-medium">No activity recorded yet</td></tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </motion.div>
                                </div>
                            )}
                        </AnimatePresence>
                    </div>
                )}
            </div>

            {/* Issuance Modal */}
            <AnimatePresence>
                {isIssuing && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-end p-4 sm:p-6 pb-24 md:pb-6 overflow-hidden">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsIssuing(false)}
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="bg-white dark:bg-slate-900 w-full max-w-2xl h-full rounded-[2.5rem] shadow-2xl relative z-10 flex flex-col overflow-hidden border-l border-white/20"
                        >
                            {/* Modal Header */}
                            <div className="px-10 py-8 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between bg-gray-50/50 dark:bg-slate-800/30">
                                <div>
                                    <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight italic">Issue Visitor Pass</h2>
                                    <p className="text-xs font-bold text-gray-500 dark:text-slate-500 uppercase tracking-[0.2em] mt-1">Identity & Purpose Verification</p>
                                </div>
                                <button
                                    onClick={() => setIsIssuing(false)}
                                    className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors shadow-sm"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Modal Body (Form) */}
                            <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
                                <form id="visitorForm" onSubmit={handleIssuePass} className="space-y-8">

                                    {/* Visitor Photo Section */}
                                    <div className="flex flex-col items-center gap-4">
                                        <div className="relative group">
                                            <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white dark:border-slate-800 shadow-xl bg-gray-100 dark:bg-slate-800 flex items-center justify-center">
                                                {formData.image ? (
                                                    <img src={formData.image} alt="Visitor" className="w-full h-full object-cover" />
                                                ) : (
                                                    <User className="w-12 h-12 text-gray-300 dark:text-gray-600" />
                                                )}
                                            </div>
                                            <button
                                                type="button"
                                                onClick={startCamera}
                                                className="absolute bottom-0 right-0 p-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg transition-transform active:scale-95"
                                                title="Take Photo"
                                            >
                                                <Camera className="w-5 h-5" />
                                            </button>
                                        </div>
                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                                            {formData.image ? 'Photo Added' : 'Add Visitor Photo'}
                                        </p>
                                    </div>

                                    {/* Camera Modal Overlay */}
                                    <AnimatePresence>
                                        {showCamera && (
                                            <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center">
                                                <div className="relative w-full max-w-lg aspect-square bg-black">
                                                    <video
                                                        ref={videoRef}
                                                        autoPlay
                                                        playsInline
                                                        className="w-full h-full object-cover"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={stopCamera}
                                                        className="absolute top-4 right-4 p-3 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-full text-white"
                                                    >
                                                        <X className="w-6 h-6" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={captureImage}
                                                        className="absolute bottom-8 left-1/2 -translate-x-1/2 w-16 h-16 bg-white rounded-full border-4 border-gray-300 flex items-center justify-center shadow-2xl active:scale-95 transition-transform"
                                                    >
                                                        <div className="w-12 h-12 bg-red-500 rounded-full" />
                                                    </button>
                                                </div>
                                                <p className="text-white font-bold mt-4 animate-pulse">Align face and tap button</p>
                                            </div>
                                        )}
                                    </AnimatePresence>

                                    {/* Visitor Info Section */}
                                    <div className="space-y-6">
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="w-1.5 h-6 bg-indigo-600 rounded-full" />
                                            <h3 className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.2em]">Basic Information</h3>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Full Name</label>
                                                <input
                                                    required
                                                    type="text"
                                                    value={formData.name}
                                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                                    className="w-full px-5 py-4 bg-gray-50 dark:bg-slate-800/50 border-2 border-transparent focus:border-indigo-600 focus:bg-white dark:focus:bg-slate-800 rounded-2xl text-sm font-bold transition-all outline-none"
                                                    placeholder="e.g. John Doe"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Phone Number</label>
                                                <input
                                                    required
                                                    type="tel"
                                                    value={formData.phone}
                                                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                                    className="w-full px-5 py-4 bg-gray-50 dark:bg-slate-800/50 border-2 border-transparent focus:border-indigo-600 focus:bg-white dark:focus:bg-slate-800 rounded-2xl text-sm font-bold transition-all outline-none"
                                                    placeholder="10-digit number"
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Visitor Type</label>
                                                <select
                                                    value={formData.visitor_type}
                                                    onChange={e => setFormData({ ...formData, visitor_type: e.target.value })}
                                                    className="w-full px-5 py-4 bg-gray-50 dark:bg-slate-800/50 border-2 border-transparent focus:border-indigo-600 focus:bg-white dark:focus:bg-slate-800 rounded-2xl text-sm font-bold transition-all outline-none appearance-none cursor-pointer"
                                                >
                                                    <option value="guest">Guest / Visitor</option>
                                                    <option value="worker">Contract Worker</option>
                                                    <option value="vendor">Vendor / Delivery</option>
                                                    <option value="parent">Parent / Guardian</option>
                                                    <option value="other">Other Official</option>
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Company / Organization</label>
                                                <input
                                                    type="text"
                                                    value={formData.company}
                                                    onChange={e => setFormData({ ...formData, company: e.target.value })}
                                                    className="w-full px-5 py-4 bg-gray-50 dark:bg-slate-800/50 border-2 border-transparent focus:border-indigo-600 focus:bg-white dark:focus:bg-slate-800 rounded-2xl text-sm font-bold transition-all outline-none"
                                                    placeholder="Optional"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Meeting Context Section */}
                                    <div className="space-y-6">
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="w-1.5 h-6 bg-emerald-500 rounded-full" />
                                            <h3 className="text-xs font-black text-emerald-500 uppercase tracking-[0.2em]">Visit context</h3>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Purpose of Visit</label>
                                            <textarea
                                                required
                                                rows="3"
                                                value={formData.purpose}
                                                onChange={e => setFormData({ ...formData, purpose: e.target.value })}
                                                className="w-full px-5 py-4 bg-gray-50 dark:bg-slate-800/50 border-2 border-transparent focus:border-indigo-600 focus:bg-white dark:focus:bg-slate-800 rounded-2xl text-sm font-bold transition-all outline-none resize-none"
                                                placeholder="Briefly state the reason for entry..."
                                            ></textarea>

                                            {/* Quick Suggestions */}
                                            <div className="flex flex-wrap gap-2 mt-2">
                                                {(formData.visitor_type === 'guest' ? [
                                                    'Official Meeting', 'Personal Visit', 'Interview', 'Alumni Visit', 'Guest Lecture'
                                                ] : formData.visitor_type === 'worker' ? [
                                                    'Maintenance', 'AC Repair', 'Electrical Work', 'Plumbing', 'Construction'
                                                ] : formData.visitor_type === 'vendor' ? [
                                                    'Food Supply', 'Stationery Delivery', 'Courier', 'Equipment Service'
                                                ] : formData.visitor_type === 'parent' ? [
                                                    'Meeting Student', 'Picking up Student', 'Fees Payment', 'Emergency'
                                                ] : [
                                                    'Official Work', 'Meeting Management', 'General Inquiry'
                                                ]).map((suggestion) => (
                                                    <button
                                                        key={suggestion}
                                                        type="button"
                                                        onClick={() => setFormData({ ...formData, purpose: suggestion })}
                                                        className="px-3 py-1.5 bg-gray-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-500/20 text-[10px] font-bold text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg transition-all border border-gray-200/50 dark:border-slate-700/50"
                                                    >
                                                        + {suggestion}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="space-y-6 bg-gray-50 dark:bg-slate-800/20 p-6 rounded-3xl border border-gray-100 dark:border-slate-800">
                                            <div className="flex items-center gap-2 mb-2">
                                                <div className="w-1.5 h-6 bg-indigo-500 rounded-full" />
                                                <h3 className="text-xs font-black text-indigo-500 uppercase tracking-[0.2em]">Host Details</h3>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Host Name</label>
                                                    <div className="relative">
                                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                                        <input
                                                            type="text"
                                                            value={formData.host_name}
                                                            onChange={e => setFormData({ ...formData, host_name: e.target.value })}
                                                            className="w-full pl-10 pr-5 py-4 bg-white dark:bg-slate-800 border-2 border-transparent focus:border-indigo-600 rounded-2xl text-sm font-bold transition-all outline-none"
                                                            placeholder="Person being visited (Optional)"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Host ID / Emp Code</label>
                                                    <input
                                                        type="text"
                                                        value={formData.host_code || ''}
                                                        onChange={e => setFormData({ ...formData, host_code: e.target.value })}
                                                        className="w-full px-5 py-4 bg-white dark:bg-slate-800 border-2 border-transparent focus:border-indigo-600 rounded-2xl text-sm font-bold transition-all outline-none"
                                                        placeholder="Optional"
                                                    />
                                                </div>
                                                <div className="sm:col-span-2 space-y-2">
                                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Department</label>
                                                    <div className="relative">
                                                        <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                                        <input
                                                            type="text"
                                                            value={formData.host_department}
                                                            onChange={e => setFormData({ ...formData, host_department: e.target.value })}
                                                            className="w-full pl-10 pr-5 py-4 bg-white dark:bg-slate-800 border-2 border-transparent focus:border-indigo-600 rounded-2xl text-sm font-bold transition-all outline-none"
                                                            placeholder="Department or Office (Optional)"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Verification Section */}
                                    <div className="space-y-6">
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="w-1.5 h-6 bg-amber-500 rounded-full" />
                                            <h3 className="text-xs font-black text-amber-500 uppercase tracking-[0.2em]">Dentity Verification</h3>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">ID Proof Type</label>
                                                <select
                                                    value={formData.id_proof_type}
                                                    onChange={e => setFormData({ ...formData, id_proof_type: e.target.value })}
                                                    className="w-full px-5 py-4 bg-gray-50 dark:bg-slate-800/50 border-2 border-transparent focus:border-indigo-600 focus:bg-white dark:focus:bg-slate-800 rounded-2xl text-sm font-bold transition-all outline-none appearance-none cursor-pointer"
                                                >
                                                    <option value="Aadhar">Aadhar Card</option>
                                                    <option value="Driving License">Driving License</option>
                                                    <option value="ID Card">Work/College ID</option>
                                                    <option value="Other">Other Official ID</option>
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">ID Number</label>
                                                <input
                                                    type="text"
                                                    value={formData.id_proof_number}
                                                    onChange={e => setFormData({ ...formData, id_proof_number: e.target.value })}
                                                    className="w-full px-5 py-4 bg-gray-50 dark:bg-slate-800/50 border-2 border-transparent focus:border-indigo-600 focus:bg-white dark:focus:bg-slate-800 rounded-2xl text-sm font-bold transition-all outline-none"
                                                    placeholder="Last 4 digits or Full ID"
                                                />
                                            </div>
                                        </div>

                                        <div className="p-6 bg-indigo-50 dark:bg-indigo-900/10 rounded-3xl border border-indigo-100 dark:border-indigo-900/20 space-y-4">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <Users className="w-5 h-5 text-indigo-600" />
                                                    <h3 className="text-sm font-black text-indigo-900 dark:text-white tracking-tight">Group Entry</h3>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => setFormData(prev => {
                                                            const newSize = Math.max(1, prev.group_size - 1);
                                                            const newMembers = prev.group_members.slice(0, Math.max(0, newSize - 1));
                                                            return { ...prev, group_size: newSize, group_members: newMembers };
                                                        })}
                                                        className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 flex items-center justify-center text-indigo-600 border border-indigo-200 dark:border-indigo-800"
                                                    >-</button>
                                                    <span className="w-8 text-center font-black text-indigo-900 dark:text-white">{formData.group_size}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => setFormData(prev => {
                                                            const newSize = prev.group_size + 1;
                                                            const newMembers = [...prev.group_members, { name: '', relation: '' }];
                                                            return { ...prev, group_size: newSize, group_members: newMembers };
                                                        })}
                                                        className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 flex items-center justify-center text-indigo-600 border border-indigo-200 dark:border-indigo-800"
                                                    >+</button>
                                                </div>
                                            </div>

                                            {formData.group_size > 1 && (
                                                <div className="space-y-4 pt-2">
                                                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Secondary Group Members</p>
                                                    <div className="space-y-3">
                                                        {(formData.group_members || []).map((member, idx) => (
                                                            <div key={idx} className="grid grid-cols-2 gap-3 p-3 bg-white dark:bg-slate-800 rounded-2xl border border-indigo-100 dark:border-slate-700">
                                                                <div className="space-y-1">
                                                                    <label className="text-[9px] font-black text-gray-400 uppercase ml-1">Name</label>
                                                                    <input
                                                                        type="text"
                                                                        value={member.name || ''}
                                                                        onChange={(e) => {
                                                                            const newMembers = [...formData.group_members];
                                                                            newMembers[idx] = { ...newMembers[idx], name: e.target.value };
                                                                            setFormData({ ...formData, group_members: newMembers });
                                                                        }}
                                                                        placeholder="Member Name"
                                                                        className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-900 border-none rounded-xl text-xs font-bold outline-none"
                                                                    />
                                                                </div>
                                                                <div className="space-y-1">
                                                                    <label className="text-[9px] font-black text-gray-400 uppercase ml-1">Relation</label>
                                                                    <select
                                                                        value={member.relation || ''}
                                                                        onChange={(e) => {
                                                                            const newMembers = [...formData.group_members];
                                                                            newMembers[idx] = { ...newMembers[idx], relation: e.target.value };
                                                                            setFormData({ ...formData, group_members: newMembers });
                                                                        }}
                                                                        className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-900 border-none rounded-xl text-xs font-bold outline-none cursor-pointer appearance-none"
                                                                    >
                                                                        <option value="">Select Relation</option>
                                                                        <option value="Spouse">Spouse</option>
                                                                        <option value="Father">Father</option>
                                                                        <option value="Mother">Mother</option>
                                                                        <option value="Son">Son</option>
                                                                        <option value="Daughter">Daughter</option>
                                                                        <option value="Brother">Brother</option>
                                                                        <option value="Sister">Sister</option>
                                                                        <option value="Friend">Friend</option>
                                                                        <option value="Colleague">Colleague</option>
                                                                        <option value="Assistant">Assistant</option>
                                                                        <option value="Other">Other</option>
                                                                    </select>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </form>
                            </div>

                            {/* Modal Footer */}
                            <div className="p-8 border-t border-gray-100 dark:border-slate-800 bg-gray-50/80 dark:bg-slate-800/50 backdrop-blur-sm flex items-center gap-4">
                                <button
                                    onClick={() => setIsIssuing(false)}
                                    className="flex-1 py-4 text-xs font-black text-gray-500 dark:text-slate-400 uppercase tracking-widest hover:text-gray-900 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    form="visitorForm"
                                    type="submit"
                                    className="flex-[2] py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl shadow-xl shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 group active:scale-95"
                                >
                                    <Check className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                    GENERATE DIGITAL PASS
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Details Quick View Modal */}
            <AnimatePresence>
                {selectedVisitor && (
                    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedVisitor(null)}
                            className="absolute inset-0 bg-slate-950/40 backdrop-blur-xl"
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[3rem] shadow-2xl relative z-10 overflow-hidden border border-white/20"
                        >
                            {/* Modal Header */}
                            <div className="p-8 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white dark:from-slate-800/50 dark:to-slate-900/50">
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 rounded-3xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/20 overflow-hidden cursor-pointer group" onClick={() => selectedVisitor.image_url && setFullScreenImage(selectedVisitor.image_url)}>
                                        {selectedVisitor.image_url ? (
                                            <img src={selectedVisitor.image_url} alt={selectedVisitor.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                                        ) : (
                                            <UserSquare2 className="w-8 h-8" />
                                        )}
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight leading-none">{selectedVisitor.name}</h2>
                                        <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mt-2 flex items-center gap-2">
                                            {getVisitorTypeBadge(selectedVisitor.visitor_type)}
                                            • Pass #{selectedVisitor.id}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSelectedVisitor(null)}
                                    className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-slate-800 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            {/* Modal Content */}
                            <div className="p-10 grid grid-cols-1 md:grid-cols-2 gap-10">
                                {/* Left: Context */}
                                <div className="space-y-8">
                                    <section>
                                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Visit Purpose</h3>
                                        <div className="bg-gray-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-gray-100 dark:border-slate-800">
                                            <p className="text-sm font-bold text-gray-700 dark:text-white leading-relaxed">
                                                {selectedVisitor.purpose}
                                            </p>

                                            {selectedVisitor.group_size > 1 && (
                                                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-slate-700">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <Users className="w-3 h-3 text-indigo-500" />
                                                        <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Group Members ({selectedVisitor.group_size - 1} secondary)</span>
                                                    </div>
                                                    <div className="space-y-2 mt-4">
                                                        {selectedVisitor.group_details ? (() => {
                                                            const members = typeof selectedVisitor.group_details === 'string'
                                                                ? JSON.parse(selectedVisitor.group_details)
                                                                : selectedVisitor.group_details;

                                                            return Array.isArray(members) && members.length > 0 ? (
                                                                members.map((m, i) => (
                                                                    <div key={i} className="flex items-center justify-between p-3 bg-white dark:bg-slate-900/50 rounded-xl border border-gray-100 dark:border-slate-700">
                                                                        <span className="text-xs font-black text-gray-700 dark:text-gray-200">{typeof m === 'object' ? m.name : m}</span>
                                                                        {typeof m === 'object' && m.relation && (
                                                                            <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-0.5 rounded-md uppercase">
                                                                                {m.relation}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                ))
                                                            ) : (
                                                                <p className="text-xs font-bold text-gray-400 italic px-2">No structured member data found</p>
                                                            );
                                                        })() : (
                                                            <p className="text-xs font-bold text-gray-400 italic px-2">No secondary members listed</p>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </section>

                                    <section className="space-y-4">
                                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Contact & ID</h3>
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-3 text-sm font-bold">
                                                <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                                                    <Phone className="w-4 h-4" />
                                                </div>
                                                <span className="text-gray-900 dark:text-white font-mono">{selectedVisitor.phone}</span>
                                            </div>
                                            <div className="flex items-center gap-3 text-sm font-bold">
                                                <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-500/10 flex items-center justify-center text-amber-600">
                                                    <CreditCard className="w-4 h-4" />
                                                </div>
                                                <span className="text-gray-900 dark:text-white uppercase">
                                                    {selectedVisitor.id_proof_type}: {selectedVisitor.id_proof_number || 'N/A'}
                                                </span>
                                            </div>
                                        </div>
                                    </section>
                                </div>

                                {/* Right: Hosting & Timing */}
                                <div className="space-y-8">
                                    <section className="space-y-4">
                                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Hosting Details</h3>
                                        <div className="bg-indigo-50/50 dark:bg-indigo-900/10 p-5 rounded-[2rem] border border-indigo-100/50 dark:border-indigo-500/10">
                                            <p className="text-sm font-black text-indigo-900 dark:text-indigo-300 mb-1">{selectedVisitor.host_name || 'General Campus visit'}</p>
                                            <p className="text-xs font-bold text-indigo-600/60 uppercase tracking-widest">{selectedVisitor.host_department || 'No Dept Specified'}</p>
                                            {selectedVisitor.company && (
                                                <div className="mt-4 pt-4 border-t border-indigo-100 dark:border-indigo-500/10">
                                                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-tighter mb-1">Affiliation</p>
                                                    <p className="text-xs font-bold text-indigo-700 dark:text-indigo-400 flex items-center gap-2">
                                                        <Building2 className="w-3.5 h-3.5" /> {selectedVisitor.company}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </section>

                                    <section className="space-y-4">
                                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Activity Log</h3>
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-3 pt-1">
                                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                                <p className="text-xs font-bold text-gray-500">
                                                    Check-in: <span className="text-gray-900 dark:text-white font-mono ml-1">{new Date(selectedVisitor.check_in).toLocaleString()}</span>
                                                </p>
                                            </div>
                                            {selectedVisitor.check_out && (
                                                <div className="flex items-center gap-3 pt-1">
                                                    <div className="w-2 h-2 rounded-full bg-red-500" />
                                                    <p className="text-xs font-bold text-gray-500">
                                                        Check-out: <span className="text-gray-900 dark:text-white font-mono ml-1">{new Date(selectedVisitor.check_out).toLocaleString()}</span>
                                                    </p>
                                                </div>
                                            )}
                                            <div className="flex items-center gap-3 pt-4 border-t border-gray-100 dark:border-slate-800">
                                                <ShieldCheck className="w-4 h-4 text-indigo-500" />
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">
                                                    Issued By <br />
                                                    <span className="text-gray-700 dark:text-slate-300 text-[11px] mt-1 inline-block">{selectedVisitor.issued_by}</span>
                                                </p>
                                            </div>
                                        </div>
                                    </section>
                                </div>
                            </div>

                            {/* Remarks Section */}
                            {selectedVisitor.remarks && (
                                <div className="px-10 pb-10">
                                    <div className="p-4 bg-amber-50 dark:bg-amber-900/10 rounded-2xl border border-amber-100 dark:border-amber-900/30">
                                        <div className="flex items-center gap-2 mb-2">
                                            <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                                            <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Gatekeeper Remarks</span>
                                        </div>
                                        <p className="text-xs font-medium text-amber-800 dark:text-amber-200">{selectedVisitor.remarks}</p>
                                    </div>
                                </div>
                            )}

                            <div className="px-10 pb-10">
                                <button
                                    onClick={() => setSelectedVisitor(null)}
                                    className="w-full py-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-black rounded-2xl hover:scale-[1.02] transition-transform active:scale-95"
                                >
                                    CLOSE VIEW
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Full Screen Image Modal */}
            <AnimatePresence>
                {fullScreenImage && (
                    <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="relative w-full max-w-4xl max-h-[90vh] flex items-center justify-center"
                        >
                            <img
                                src={fullScreenImage}
                                alt="Full Screen"
                                className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
                            />
                            <button
                                onClick={() => setFullScreenImage(null)}
                                className="absolute -top-12 right-0 md:right-0 md:-top-4 p-3 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full text-white transition-all transform hover:rotate-90"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default VisitorManagement;
