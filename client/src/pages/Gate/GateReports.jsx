import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FileBarChart, Download, Filter, Search, Calendar, RefreshCw, Loader2, X, ArrowRightLeft, Printer } from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';

const GateReports = () => {
    const { settings } = useSettings();
    const [reportData, setReportData] = useState([]);
    const [printData, setPrintData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [generatingCSV, setGeneratingCSV] = useState(false);

    const [logType, setLogType] = useState('students'); // 'students' or 'visitors'
    const [departments, setDepartments] = useState([]);
    const [hostels, setHostels] = useState([]);
    const [summary, setSummary] = useState({ total: 0, exits: 0, entries: 0 });

    // Filters
    const [filters, setFilters] = useState({
        startDate: '',
        endDate: '',
        action: '',
        studentType: '',
        departmentId: '',
        hostelId: '',
        visitorType: '',
        hostName: '',
        company: ''
    });

    const [pagination, setPagination] = useState({
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0
    });

    const [showFilters, setShowFilters] = useState(true);

    useEffect(() => {
        const fetchMetadata = async () => {
            try {
                const [deptRes, hostelRes] = await Promise.all([
                    axios.get('/api/gate/metadata/departments'),
                    axios.get('/api/gate/metadata/hostels')
                ]);
                setDepartments(deptRes.data);
                setHostels(hostelRes.data);
            } catch (error) {
                console.error('Error fetching metadata:', error);
            }
        };
        fetchMetadata();
    }, []);

    useEffect(() => {
        if (logType === 'students') {
            fetchReports(pagination.page);
        } else {
            fetchVisitorReports(pagination.page);
        }
    }, [pagination.page, logType]);

    const fetchReports = async (pageNumber = 1) => {
        setLoading(true);
        try {
            const queryParams = new URLSearchParams();
            if (filters.startDate) queryParams.append('startDate', filters.startDate);
            if (filters.endDate) queryParams.append('endDate', filters.endDate);
            if (filters.action) queryParams.append('action', filters.action);
            if (filters.studentType) queryParams.append('studentType', filters.studentType);
            if (filters.departmentId) queryParams.append('departmentId', filters.departmentId);
            if (filters.hostelId) queryParams.append('hostelId', filters.hostelId);
            queryParams.append('page', pageNumber);
            queryParams.append('limit', pagination.limit);

            const response = await axios.get(`/api/gate/reports?${queryParams.toString()}`, {
                withCredentials: true
            });
            const data = response.data.data;
            setReportData(data);
            setPagination(prev => ({
                ...prev,
                page: response.data.pagination.page,
                total: response.data.pagination.total,
                totalPages: response.data.pagination.totalPages
            }));

            // Calculate student summary from current data
            const entries = data.filter(i => i.action === 'entry').length;
            const exits = data.filter(i => i.action === 'exit').length;
            setSummary({ total: response.data.pagination.total, entries, exits });
        } catch (error) {
            console.error('Error fetching reports:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchVisitorReports = async (pageNumber = 1) => {
        setLoading(true);
        try {
            const queryParams = new URLSearchParams();
            if (filters.startDate) queryParams.append('from', filters.startDate);
            if (filters.endDate) queryParams.append('to', filters.endDate);
            if (filters.visitorType && filters.visitorType !== 'all') queryParams.append('visitor_type', filters.visitorType);
            if (filters.hostName) queryParams.append('host_name', filters.hostName);
            if (filters.company) queryParams.append('company', filters.company);
            if (filters.action) {
                queryParams.append('status', filters.action === 'entry' ? 'active' : 'completed');
            }

            queryParams.append('page', pageNumber);
            queryParams.append('limit', pagination.limit);

            const response = await axios.get(`/api/visitors/history?${queryParams.toString()}`, {
                withCredentials: true
            });
            const data = response.data.data;
            setReportData(data);
            setPagination(prev => ({
                ...prev,
                page: response.data.pagination.page,
                total: response.data.pagination.total,
                totalPages: response.data.pagination.totalPages
            }));

            // Summary for visitors
            const active = data.filter(v => v.status === 'active').length;
            const completed = data.filter(v => v.status === 'completed').length;
            setSummary({ total: response.data.pagination.total, entries: completed, exits: active });
        } catch (error) {
            console.error('Error fetching visitor reports:', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = async () => {
        setLoading(true);
        try {
            const queryParams = new URLSearchParams();
            let endpoint = '';

            if (logType === 'students') {
                endpoint = '/api/gate/reports';
                if (filters.startDate) queryParams.append('startDate', filters.startDate);
                if (filters.endDate) queryParams.append('endDate', filters.endDate);
                if (filters.action) queryParams.append('action', filters.action);
                if (filters.studentType) queryParams.append('studentType', filters.studentType);
                if (filters.departmentId) queryParams.append('departmentId', filters.departmentId);
                if (filters.hostelId) queryParams.append('hostelId', filters.hostelId);
            } else {
                endpoint = '/api/visitors/history';
                if (filters.startDate) queryParams.append('from', filters.startDate);
                if (filters.endDate) queryParams.append('to', filters.endDate);
                if (filters.visitorType) queryParams.append('visitor_type', filters.visitorType);
                if (filters.hostName) queryParams.append('host_name', filters.hostName);
                if (filters.company) queryParams.append('company', filters.company);
            }
            queryParams.append('limit', 10000);

            const response = await axios.get(`${endpoint}?${queryParams.toString()}`, {
                withCredentials: true
            });
            setPrintData(logType === 'students' ? response.data.data : response.data.data);

            setTimeout(() => {
                window.print();
                setPrintData([]);
            }, 500);
        } catch (error) {
            console.error('Print failed:', error);
        } finally {
            setLoading(false);
        }
    };

    const downloadCSV = async () => {
        setGeneratingCSV(true);
        try {
            const queryParams = new URLSearchParams();
            let endpoint = '';

            if (logType === 'students') {
                endpoint = '/api/gate/reports';
                if (filters.startDate) queryParams.append('startDate', filters.startDate);
                if (filters.endDate) queryParams.append('endDate', filters.endDate);
                if (filters.action) queryParams.append('action', filters.action);
                if (filters.studentType) queryParams.append('studentType', filters.studentType);
                if (filters.departmentId) queryParams.append('departmentId', filters.departmentId);
                if (filters.hostelId) queryParams.append('hostelId', filters.hostelId);
            } else {
                endpoint = '/api/visitors/history';
                if (filters.startDate) queryParams.append('from', filters.startDate);
                if (filters.endDate) queryParams.append('to', filters.endDate);
                if (filters.visitorType) queryParams.append('visitor_type', filters.visitorType);
                if (filters.hostName) queryParams.append('host_name', filters.hostName);
                if (filters.company) queryParams.append('company', filters.company);
            }
            queryParams.append('limit', 10000);

            const response = await axios.get(`${endpoint}?${queryParams.toString()}`, {
                withCredentials: true
            });
            const allData = response.data.data;

            if (allData.length === 0) return;

            const headers = logType === 'students'
                ? ['Log ID', 'Student Name', 'Register No', 'Student Type', 'Dept', 'Hostel', 'Action', 'Time', 'Pass Type', 'Comments']
                : ['Log ID', 'Visitor Name', 'Phone', 'Type', 'Company', 'Purpose', 'Host', 'Check In', 'Check Out', 'Status'];

            const rows = allData.map(row => {
                if (logType === 'students') {
                    return [
                        row.id,
                        `"${row.student_name}"`,
                        row.register_number,
                        row.student_type,
                        row.department_name || '-',
                        row.hostel_name || '-',
                        row.action,
                        new Date(row.timestamp).toLocaleString(),
                        row.pass_type || 'N/A',
                        `"${(row.comments || '').replace(/"/g, '""')}"`
                    ];
                } else {
                    return [
                        row.id,
                        `"${row.name}"`,
                        row.phone,
                        row.visitor_type,
                        row.company || '-',
                        `"${row.purpose}"`,
                        `"${row.host_name}"`,
                        new Date(row.check_in).toLocaleString(),
                        row.check_out ? new Date(row.check_out).toLocaleString() : '-',
                        row.status
                    ];
                }
            });

            const csvContent = [
                headers.join(','),
                ...rows.map(r => r.join(','))
            ].join('\n');

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.setAttribute('href', url);
            link.setAttribute('download', `${logType}_logs_${new Date().toISOString().split('T')[0]}.csv`);
            link.click();
        } catch (error) {
            console.error('CSV export failed', error);
        } finally {
            setGeneratingCSV(false);
        }
    };

    return (
        <div className="space-y-6 p-6 max-w-[1600px] mx-auto pb-24 print:p-0">

            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 print:hidden">
                <div className="text-center lg:text-left">
                    <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white flex items-center justify-center lg:justify-start gap-2">
                        <ArrowRightLeft className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                        Movement Logs
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm lg:text-base">View and export entry/exit and visitor logs.</p>
                </div>

                <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-full lg:w-auto">
                    <button
                        onClick={() => {
                            setLogType('students');
                            setReportData([]);
                            setPagination(prev => ({ ...prev, page: 1 }));
                        }}
                        className={`flex-1 lg:flex-none px-4 lg:px-6 py-2 rounded-lg text-sm font-bold transition-all ${logType === 'students' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm' : 'text-slate-500'}`}
                    >
                        Student Logs
                    </button>
                    <button
                        onClick={() => {
                            setLogType('visitors');
                            setReportData([]);
                            setPagination(prev => ({ ...prev, page: 1 }));
                        }}
                        className={`flex-1 lg:flex-none px-4 lg:px-6 py-2 rounded-lg text-sm font-bold transition-all ${logType === 'visitors' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm' : 'text-slate-500'}`}
                    >
                        Visitor Logs
                    </button>
                </div>
            </div>

            {/* Metrics Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
                <div className="bg-white dark:bg-slate-800 p-4 lg:p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm transition-all hover:shadow-md">
                    <div className="flex items-center gap-3 lg:gap-4">
                        <div className="p-2.5 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl">
                            <ArrowRightLeft className="w-5 h-5 lg:w-6 lg:h-6 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div>
                            <div className="text-[10px] lg:text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 pointer-events-none">Total Records</div>
                            <div className="text-xl lg:text-2xl font-black text-slate-900 dark:text-white leading-none">{summary.total}</div>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-4 lg:p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm transition-all hover:shadow-md">
                    <div className="flex items-center gap-3 lg:gap-4">
                        <div className="p-2.5 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl">
                            <ArrowRightLeft className="w-5 h-5 lg:w-6 lg:h-6 text-emerald-600 dark:text-emerald-400 rotate-180" />
                        </div>
                        <div>
                            <div className="text-[10px] lg:text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 pointer-events-none">
                                {logType === 'students' ? 'Entries' : 'Completed Passes'}
                            </div>
                            <div className="text-xl lg:text-2xl font-black text-slate-900 dark:text-white leading-none">
                                {logType === 'students' ? summary.entries : reportData.filter(v => v.status === 'completed').length}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-4 lg:p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm transition-all hover:shadow-md sm:col-span-2 lg:col-span-1">
                    <div className="flex items-center gap-3 lg:gap-4">
                        <div className="p-2.5 bg-amber-50 dark:bg-amber-900/30 rounded-xl">
                            <ArrowRightLeft className="w-5 h-5 lg:w-6 lg:h-6 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div>
                            <div className="text-[10px] lg:text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 pointer-events-none">
                                {logType === 'students' ? 'Exits' : 'Active Visitors'}
                            </div>
                            <div className="text-xl lg:text-2xl font-black text-slate-900 dark:text-white leading-none">
                                {logType === 'students' ? summary.exits : reportData.filter(v => v.status === 'active').length}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex flex-wrap gap-2 lg:gap-3 w-full lg:w-auto">
                <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl transition-all font-bold text-sm ${showFilters ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shadow-sm hover:bg-slate-50'}`}
                >
                    <Filter className="w-4 h-4" />
                    {showFilters ? 'Hide Filters' : 'Show Filters'}
                </button>
                <button
                    onClick={handlePrint}
                    disabled={reportData.length === 0 || loading}
                    className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 dark:bg-slate-700 text-white rounded-xl shadow-lg shadow-slate-900/10 transition-all hover:bg-slate-800 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Printer className="w-4 h-4" />
                    Print
                </button>
                <button
                    onClick={downloadCSV}
                    disabled={reportData.length === 0 || generatingCSV}
                    className="w-full lg:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-lg shadow-emerald-600/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {generatingCSV ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    Export Excel
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Filters Sidebar */}
                {showFilters && (
                    <div className="lg:col-span-1 space-y-6 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm h-fit print:hidden">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Date Range</label>
                            <div className="space-y-3">
                                <div>
                                    <span className="text-xs text-slate-500 uppercase tracking-wider font-bold">From</span>
                                    <input
                                        type="date"
                                        value={filters.startDate}
                                        onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                                        className="w-full mt-1 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                                <div>
                                    <span className="text-xs text-slate-500 uppercase tracking-wider font-bold">To</span>
                                    <input
                                        type="date"
                                        value={filters.endDate}
                                        onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                                        className="w-full mt-1 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Action</label>
                            <select
                                value={filters.action}
                                onChange={(e) => setFilters({ ...filters, action: e.target.value })}
                                className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                            >
                                <option value="">All Actions</option>
                                <option value="entry">Check In (Entry)</option>
                                <option value="exit">Check Out (Exit)</option>
                            </select>
                        </div>

                        {logType === 'students' ? (
                            <>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Student Type</label>
                                    <select
                                        value={filters.studentType}
                                        onChange={(e) => setFilters({ ...filters, studentType: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                    >
                                        <option value="">All Types</option>
                                        <option value="Hostel">Hosteler</option>
                                        <option value="Day Scholar">Day Scholar</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Department</label>
                                    <select
                                        value={filters.departmentId}
                                        onChange={(e) => setFilters({ ...filters, departmentId: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                    >
                                        <option value="">All Departments</option>
                                        {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Hostel</label>
                                    <select
                                        value={filters.hostelId}
                                        onChange={(e) => setFilters({ ...filters, hostelId: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                    >
                                        <option value="">All Hostels</option>
                                        {hostels.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                                    </select>
                                </div>
                            </>
                        ) : (
                            <>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Visitor Type</label>
                                    <select
                                        value={filters.visitorType}
                                        onChange={(e) => setFilters({ ...filters, visitorType: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                    >
                                        <option value="">All Types</option>
                                        <option value="guest">Guest</option>
                                        <option value="worker">Worker</option>
                                        <option value="vendor">Vendor</option>
                                        <option value="parent">Parent</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Host Name</label>
                                    <input
                                        type="text"
                                        placeholder="Search Host..."
                                        value={filters.hostName}
                                        onChange={(e) => setFilters({ ...filters, hostName: e.target.value })}
                                        className="w-full mt-1 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Company</label>
                                    <input
                                        type="text"
                                        placeholder="Search Company..."
                                        value={filters.company}
                                        onChange={(e) => setFilters({ ...filters, company: e.target.value })}
                                        className="w-full mt-1 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                            </>
                        )}

                        <button
                            onClick={() => {
                                setPagination(prev => ({ ...prev, page: 1 }));
                                if (logType === 'students') {
                                    fetchReports(1);
                                } else {
                                    fetchVisitorReports(1);
                                }
                            }}
                            disabled={loading}
                            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium shadow-lg shadow-indigo-600/20 transition-all active:scale-95 disabled:opacity-70 disabled:active:scale-100"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Generate Report'}
                        </button>
                    </div>
                )}

                {/* Data Grid */}
                {/* Data Column */}
                <div className={`${showFilters ? 'lg:col-span-3' : 'lg:col-span-4'} flex flex-col print:hidden`}>
                    {reportData.length > 0 ? (
                        <>
                            {/* Desktop Table View */}
                            <div className="hidden lg:block bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                                                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">{logType === 'students' ? 'Student' : 'Visitor'}</th>
                                                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">{logType === 'students' ? 'Action' : 'Affiliation'}</th>
                                                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">{logType === 'students' ? 'Pass Type' : 'Purpose'}</th>
                                                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">{logType === 'students' ? 'Comments' : 'Host / Department'}</th>
                                                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Time</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                            {reportData.map((item) => (
                                                <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                                    <td className="p-4">
                                                        <div className="font-medium text-slate-900 dark:text-white">{item.student_name || item.name}</div>
                                                        <div className="text-xs text-slate-500 font-mono">{item.register_number || item.phone}</div>
                                                    </td>
                                                    <td className="p-4">
                                                        {logType === 'students' ? (
                                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-tighter ${item.action === 'exit' ? 'bg-amber-100 text-amber-800 shadow-sm shadow-amber-500/10' : 'bg-emerald-100 text-emerald-800 shadow-sm shadow-emerald-500/10'}`}>
                                                                {item.action === 'exit' ? 'Check Out' : 'Check In'}
                                                            </span>
                                                        ) : (
                                                            <div className="space-y-1">
                                                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${item.visitor_type === 'guest' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                                                                    {item.visitor_type}
                                                                </span>
                                                                {item.company && <div className="text-[10px] text-slate-500 font-bold uppercase truncate max-w-[120px]">{item.company}</div>}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="text-sm text-slate-700 dark:text-slate-300 font-medium">{item.pass_type || item.purpose || '-'}</div>
                                                    </td>
                                                    <td className="p-4">
                                                        {logType === 'students' ? (
                                                            <div className="text-sm text-slate-500 italic truncate max-w-[200px]" title={item.comments}>
                                                                {item.comments || '-'}
                                                            </div>
                                                        ) : (
                                                            <div className="space-y-0.5">
                                                                <div className="text-xs font-bold text-slate-700 dark:text-slate-300">{item.host_name || 'N/A'}</div>
                                                                <div className="text-[10px] text-slate-500 uppercase tracking-tight">{item.host_department || 'General'}</div>
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="text-xs text-slate-500 font-medium">
                                                            {new Date(item.timestamp || item.check_in).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                                            {logType === 'visitors' && item.check_out && (
                                                                <div className="text-emerald-500 font-black mt-1 text-[9px] uppercase tracking-tighter">
                                                                    OUT: {new Date(item.check_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Mobile Card View */}
                            <div className="lg:hidden space-y-3">
                                {reportData.map((item) => (
                                    <div key={item.id} className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm active:scale-[0.98] transition-all">
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <div className="font-bold text-slate-900 dark:text-white text-base">{item.student_name || item.name}</div>
                                                <div className="text-xs text-slate-500 font-mono tracking-tight">{item.register_number || item.phone}</div>
                                            </div>
                                            <div className="flex flex-col items-end gap-1">
                                                {logType === 'students' ? (
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-tighter ${item.action === 'exit' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                                                        {item.action === 'exit' ? 'Out' : 'In'}
                                                    </span>
                                                ) : (
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${item.visitor_type === 'guest' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                                                        {item.visitor_type}
                                                    </span>
                                                )}
                                                <div className="text-[10px] font-bold text-slate-400">#{item.id}</div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-50 dark:border-slate-700/50">
                                            <div>
                                                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5 pointer-events-none">
                                                    {logType === 'students' ? 'Pass Type' : 'Purpose'}
                                                </div>
                                                <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                                    {item.pass_type || item.purpose || '-'}
                                                </div>
                                            </div>
                                            <div>
                                                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5 pointer-events-none">Time</div>
                                                <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 leading-tight">
                                                    {new Date(item.timestamp || item.check_in).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-3 pt-3 border-t border-slate-50 dark:border-slate-700/50">
                                            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1 pointer-events-none">
                                                {logType === 'students' ? 'Comments' : 'Host / Department'}
                                            </div>
                                            <div className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed italic">
                                                {logType === 'students' ? (
                                                    item.comments || '-'
                                                ) : (
                                                    <span className="not-italic font-medium">{item.host_name} <span className="text-slate-400 mx-1">/</span> {item.host_department}</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Pagination Controls */}
                            <div className="mt-6 px-4 py-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 print:hidden">
                                <div className="text-xs lg:text-sm text-slate-500 font-medium">
                                    Displaying <span className="font-bold text-slate-900 dark:text-white">{(pagination.page - 1) * pagination.limit + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)}</span> of <span className="font-bold text-slate-900 dark:text-white">{pagination.total}</span>
                                </div>
                                <div className="flex items-center gap-1.5 lg:gap-2">
                                    <button
                                        onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                                        disabled={pagination.page === 1 || loading}
                                        className="h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 shadow-sm"
                                    >
                                        Prev
                                    </button>
                                    <div className="hidden sm:flex items-center gap-1">
                                        {[...Array(pagination.totalPages)].map((_, i) => (
                                            <button
                                                key={i + 1}
                                                onClick={() => setPagination(prev => ({ ...prev, page: i + 1 }))}
                                                className={`w-9 h-9 rounded-xl text-xs font-black transition-all ${pagination.page === i + 1
                                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                                                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent'
                                                    }`}
                                            >
                                                {i + 1}
                                            </button>
                                        )).slice(Math.max(0, pagination.page - 3), Math.min(pagination.totalPages, pagination.page + 2))}
                                    </div>
                                    <span className="sm:hidden w-9 h-9 flex items-center justify-center bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl text-xs font-black">
                                        {pagination.page}
                                    </span>
                                    <button
                                        onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                                        disabled={pagination.page === pagination.totalPages || loading}
                                        className="h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 shadow-sm"
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center p-12 text-center print:hidden">
                            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mb-4">
                                <Search className="w-8 h-8 text-slate-400" />
                            </div>
                            <h3 className="text-lg font-medium text-slate-900 dark:text-white">No Logs Found</h3>
                            <p className="text-slate-500 dark:text-slate-400 max-w-sm mt-2">
                                Adjust filters and click "Generate Report" to view movement logs.
                            </p>
                        </div>
                    )}
                </div>

                {/* Advanced Print Template */}
                {printData.length > 0 && (
                    <div className="hidden print:block bg-white p-4 font-serif text-black print-box">
                        <style>{`
                            @media print {
                                /* Hide everything else */
                                body * {
                                    visibility: hidden;
                                }
                                .print-box, .print-box * {
                                    visibility: visible;
                                }
                                .print-box {
                                    position: absolute;
                                    left: 0;
                                    top: 0;
                                    width: 100%;
                                }

                                @page { 
                                    size: portrait; 
                                    margin: 15mm 15mm 20mm 15mm; 
                                }
                                body { 
                                    background: white; 
                                    -webkit-print-color-adjust: exact; 
                                }
                                
                                .print-layout-table {
                                    width: 100%;
                                    border-collapse: collapse;
                                }

                                .print-layout-header {
                                    display: table-header-group;
                                }

                                .print-layout-footer {
                                    display: table-footer-group;
                                }

                                .print-content-row td {
                                    padding-top: 10px;
                                }

                                .print-data-table { 
                                    width: 100%; 
                                    border: 2px solid #000;
                                    border-collapse: collapse; 
                                    margin: 5px 0; 
                                    font-size: 10px; 
                                }
                                .print-data-table thead { display: table-header-group; }
                                .print-data-table tr { page-break-inside: avoid; }
                                .print-data-table th { 
                                    background: #f1f5f9 !important; 
                                    border: 2px solid #000; 
                                    padding: 8px 4px; 
                                    font-weight: 900; 
                                    text-transform: uppercase; 
                                    font-size: 9px;
                                }
                                .print-data-table td { 
                                    border: 1px solid #000; 
                                    padding: 6px 4px; 
                                    line-height: 1.2; 
                                    vertical-align: middle;
                                }

                                .official-header { border-bottom: 2.5px solid #000; padding-bottom: 10px; margin-bottom: 15px; }
                                .watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 100px; opacity: 0.03; font-weight: 900; z-index: -1; pointer-events: none; }
                                
                                .footer-container {
                                    border-top: 1.5px solid #000;
                                    padding-top: 8px;
                                    margin-top: 20px;
                                }
                                
                                .signature-grid {
                                    display: grid;
                                    grid-template-cols: 1fr 1fr;
                                    gap: 100px;
                                    margin-bottom: 25px;
                                }
                                .sig-box {
                                    border-top: 1px solid #000;
                                    text-align: center;
                                    font-weight: bold;
                                    font-size: 10px;
                                    padding-top: 5px;
                                }
                            }
                        `}</style>

                        <div className="watermark">OFFICIAL REPORT</div>

                        <table className="print-layout-table">
                            <thead className="print-layout-header">
                                <tr>
                                    <td>
                                        {/* Institution Header */}
                                        <div className="official-header flex items-start justify-between">
                                            <div className="flex items-center gap-5">
                                                {settings?.app_logo ? (
                                                    <img src={settings.app_logo} alt="Logo" className="w-14 h-14 object-contain" />
                                                ) : (
                                                    <div className="w-14 h-14 bg-slate-900 rounded-lg flex items-center justify-center text-white font-black text-xl">
                                                        {settings?.app_name?.charAt(0) || 'G'}
                                                    </div>
                                                )}
                                                <div>
                                                    <h1 className="text-xl font-black tracking-tighter uppercase leading-none mb-1">
                                                        {settings?.app_name || 'Gatekeeper Institution'}
                                                    </h1>
                                                    <p className="text-[10px] font-bold text-slate-700 uppercase italic">
                                                        {settings?.app_description || 'Security Management Division'}
                                                    </p>
                                                    <div className="mt-1 text-[8px] font-semibold text-slate-500 uppercase flex gap-2">
                                                        <span>Official Registry</span>
                                                        <span>•</span>
                                                        <span>System Generated Report</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right border-l-2 border-slate-200 pl-4">
                                                <div className="text-lg font-black uppercase mb-0">Movement Log</div>
                                                <div className="text-[9px] font-bold text-slate-500 uppercase">
                                                    ID: GK-{logType.charAt(0).toUpperCase()}-{Math.floor(Date.now() / 1000)}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Report Metadata Context */}
                                        <div className="flex justify-between items-center bg-slate-50 border border-slate-900 p-2 rounded mb-3 text-[10px]">
                                            <div className="flex gap-4">
                                                <span className="font-bold">TYPE: <span className="font-black uppercase">{logType}</span></span>
                                                <span className="font-bold">PERIOD: <span className="font-black uppercase">{filters.startDate || 'START'} - {filters.endDate || 'END'}</span></span>
                                            </div>
                                            <div className="flex gap-4">
                                                <span className="font-bold">COUNT: <span className="font-black">{printData.length}</span></span>
                                                <span className="font-bold">GEN: <span className="font-black uppercase">{new Date().toLocaleDateString()}</span></span>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            </thead>

                            <tbody>
                                <tr className="print-content-row">
                                    <td>
                                        <table className="print-data-table">
                                            <thead>
                                                <tr>
                                                    <th style={{ width: '18%' }}>Student / Reg No</th>
                                                    <th style={{ width: '15%' }}>Dept / Hostel</th>
                                                    <th style={{ width: '10%' }}>Pass Type</th>
                                                    <th style={{ width: '22%' }}>Scheduled Timing</th>
                                                    <th style={{ width: '10%' }}>Log Action</th>
                                                    <th style={{ width: '15%' }}>Actual Time</th>
                                                    <th style={{ width: '10%' }}>Gatekeeper</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {printData.map((log) => (
                                                    <tr key={log.id}>
                                                        <td>
                                                            <div className="font-bold underline uppercase text-[10px]">{log.student_name || log.name}</div>
                                                            <div className="font-black text-[8px] mt-0.5">{log.register_number || log.visitor_type} {log.year ? `(Year ${log.year})` : ''}</div>
                                                        </td>
                                                        <td className="text-center font-bold">
                                                            <div className="uppercase text-[9px]">{log.department_name && log.department_name !== 'N/A' ? log.department_name : (log.company || '--')}</div>
                                                            <div className="text-[8px] opacity-70 italic mt-0.5">{log.hostel_name && log.hostel_name !== 'N/A' ? log.hostel_name : (log.phone || '--')}</div>
                                                        </td>
                                                        <td className="text-center font-black uppercase text-[9px]">
                                                            {log.pass_type || log.purpose || '--'}
                                                        </td>
                                                        <td className="text-[8px]">
                                                            <div className="flex flex-col gap-0.5">
                                                                <div className="flex justify-between border-b border-slate-100 pb-0.5">
                                                                    <span className="font-black uppercase text-slate-400">OUT:</span>
                                                                    <span className="font-bold uppercase text-red-600">
                                                                        {log.departure_date ? new Date(log.departure_date).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : '--'}
                                                                    </span>
                                                                </div>
                                                                <div className="flex justify-between">
                                                                    <span className="font-black uppercase text-slate-400">IN:</span>
                                                                    <span className="font-bold uppercase text-emerald-600">
                                                                        {log.return_date ? new Date(log.return_date).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : '--'}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="text-center font-black">
                                                            <span className={`px-2 py-0.5 rounded border border-black text-[9px] ${log.action === 'Out' || log.check_out ? 'bg-red-50' : 'bg-emerald-50'}`}>
                                                                {(log.action || (log.check_out ? 'EXIT' : 'ENTRY')).toUpperCase()}
                                                            </span>
                                                        </td>
                                                        <td className="text-center font-bold">
                                                            <div className="uppercase text-[9px]">{new Date(log.timestamp || log.check_in).toLocaleDateString()}</div>
                                                            <div className="font-black text-[9px] mt-0.5 text-indigo-600">{new Date(log.timestamp || log.check_in).toLocaleTimeString()}</div>
                                                        </td>
                                                        <td className="text-center font-bold uppercase text-[8px]">
                                                            {log.gatekeeper_name || 'System'}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </td>
                                </tr>
                            </tbody>

                            <tfoot className="print-layout-footer">
                                <tr>
                                    <td>
                                        <div className="footer-container">
                                            <div className="signature-grid">
                                                <div className="sig-box">SECURITY SUPERVISOR</div>
                                                <div className="sig-box">AUTHORIZING OFFICER</div>
                                            </div>
                                            <div className="flex justify-between items-center text-[8px] font-black uppercase text-slate-400 tracking-widest px-2">
                                                <span>GK Management Core System</span>
                                                <span className="text-[10px] text-slate-900 border-x border-slate-200 px-4">
                                                    CONFIDENTIAL DOCUMENT
                                                </span>
                                                <span>Verified Report</span>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                )}

            </div>
        </div >
    );
};

export default GateReports;
