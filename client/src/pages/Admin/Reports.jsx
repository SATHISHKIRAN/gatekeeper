import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FileBarChart, Download, Filter, Search, Calendar, RefreshCw, Loader2, X, Printer } from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';

const AdminReports = () => {
    const { settings } = useSettings();
    const [reportData, setReportData] = useState([]);
    const [printData, setPrintData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [generatingCSV, setGeneratingCSV] = useState(false);
    const [departments, setDepartments] = useState([]);
    const [hostels, setHostels] = useState([]);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = reportData.slice(indexOfFirstItem, indexOfLastItem);

    const paginate = (pageNumber) => setCurrentPage(pageNumber);

    // Filters
    const [filters, setFilters] = useState({
        startDate: '',
        endDate: '',
        status: [],
        year: [],
        studentType: '',
        departmentId: '',
        hostelId: ''
    });

    const [showFilters, setShowFilters] = useState(true);

    useEffect(() => {
        fetchMetadata();
    }, []);

    const fetchMetadata = async () => {
        try {
            const [deptRes, hostelRes] = await Promise.all([
                axios.get('/api/admin/departments', { withCredentials: true }),
                axios.get('/api/admin/hostels', { withCredentials: true })
            ]);
            setDepartments(deptRes.data);
            setHostels(hostelRes.data);
        } catch (error) {
            console.error('Error fetching metadata', error);
        }
    };

    const toggleFilter = (type, value) => {
        setFilters(prev => {
            const current = prev[type];
            const updated = current.includes(value)
                ? current.filter(item => item !== value)
                : [...current, value];
            return { ...prev, [type]: updated };
        });
    };

    const fetchReports = async () => {
        setLoading(true);
        try {
            const queryParams = new URLSearchParams();
            if (filters.startDate) queryParams.append('startDate', filters.startDate);
            if (filters.endDate) queryParams.append('endDate', filters.endDate);
            if (filters.status.length) queryParams.append('status', filters.status.join(','));
            if (filters.year.length) queryParams.append('year', filters.year.join(','));
            if (filters.studentType) queryParams.append('studentType', filters.studentType);
            if (filters.departmentId) queryParams.append('departmentId', filters.departmentId);
            if (filters.hostelId) queryParams.append('hostelId', filters.hostelId);

            const response = await axios.get(`/api/admin/reports?${queryParams.toString()}`, {
                withCredentials: true
            });
            setReportData(response.data);
            setCurrentPage(1);
        } catch (error) {
            console.error('Error fetching reports:', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = async () => {
        setLoading(true);
        try {
            const queryParams = new URLSearchParams();
            if (filters.startDate) queryParams.append('startDate', filters.startDate);
            if (filters.endDate) queryParams.append('endDate', filters.endDate);
            if (filters.status.length) queryParams.append('status', filters.status.join(','));
            if (filters.year.length) queryParams.append('year', filters.year.join(','));
            if (filters.studentType) queryParams.append('studentType', filters.studentType);
            if (filters.departmentId) queryParams.append('departmentId', filters.departmentId);
            if (filters.hostelId) queryParams.append('hostelId', filters.hostelId);
            queryParams.append('limit', 10000); // Fetch all for printing

            const response = await axios.get(`/api/admin/reports?${queryParams.toString()}`, {
                withCredentials: true
            });
            setPrintData(response.data);

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

    const downloadCSV = () => {
        setGeneratingCSV(true);
        try {
            if (reportData.length === 0) return;

            const headers = [
                'Request ID', 'Student Name', 'Register No', 'Department', 'Year', 'Student Type',
                'Hostel', 'Room', 'Mentor',
                'Type', 'Status', 'Departure Date', 'Return Date', 'Reason', 'Created At'
            ];

            const rows = reportData.map(row => [
                row.id,
                `"${row.student_name}"`,
                row.register_number,
                `"${row.department_name}"`,
                row.year,
                row.student_type,
                `"${row.hostel_name || 'N/A'}"`,
                row.room_number || 'N/A',
                `"${row.mentor_name || 'N/A'}"`,
                row.type,
                row.status,
                new Date(row.departure_date).toLocaleString(),
                new Date(row.return_date).toLocaleString(),
                `"${row.reason.replace(/"/g, '""')}"`,
                new Date(row.created_at).toLocaleString()
            ]);

            const csvContent = [
                headers.join(','),
                ...rows.map(r => r.join(','))
            ].join('\n');

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.setAttribute('href', url);
            link.setAttribute('download', `admin_report_${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

        } catch (error) {
            console.error('CSV export failed', error);
        } finally {
            setGeneratingCSV(false);
        }
    };

    return (
        <div className="space-y-6 p-6 max-w-[1600px] mx-auto pb-24">
            {/* Header Section */}

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <FileBarChart className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                        System Reports
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400">Generate comprehensive reports for the entire institution.</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${showFilters ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'}`}
                    >
                        <Filter className="w-4 h-4" />
                        Filters
                    </button>
                    <button
                        onClick={handlePrint}
                        disabled={reportData.length === 0 || loading}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 dark:bg-indigo-500 text-white rounded-xl shadow-lg shadow-indigo-600/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Printer className="w-4 h-4" />
                        Print
                    </button>
                    <button
                        onClick={downloadCSV}
                        disabled={reportData.length === 0 || generatingCSV}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-lg shadow-emerald-600/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {generatingCSV ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                        Export CSV
                    </button>
                </div>
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
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Department</label>
                            <select
                                value={filters.departmentId}
                                onChange={(e) => setFilters({ ...filters, departmentId: e.target.value })}
                                className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                            >
                                <option value="">All Departments</option>
                                {departments.map(d => (
                                    <option key={d.id} value={d.id}>{d.name}</option>
                                ))}
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
                                {hostels.map(h => (
                                    <option key={h.id} value={h.id}>{h.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Status</label>
                            <div className="flex flex-wrap gap-2">
                                {['pending', 'approved_staff', 'approved_hod', 'approved_warden', 'rejected', 'completed'].map(status => (
                                    <button
                                        key={status}
                                        onClick={() => toggleFilter('status', status)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filters.status.includes(status)
                                            ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/30 dark:text-indigo-300 ring-1 ring-indigo-500'
                                            : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
                                            }`}
                                    >
                                        {status.replace('_', ' ').toUpperCase()}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Year</label>
                            <div className="flex flex-wrap gap-2">
                                {['1', '2', '3', '4'].map(year => (
                                    <button
                                        key={year}
                                        onClick={() => toggleFilter('year', year)}
                                        className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${filters.year.includes(year)
                                            ? 'bg-indigo-600 text-white'
                                            : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
                                            }`}
                                    >
                                        {year}
                                    </button>
                                ))}
                            </div>
                        </div>

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

                        <button
                            onClick={fetchReports}
                            disabled={loading}
                            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium shadow-lg shadow-indigo-600/20 transition-all active:scale-95 disabled:opacity-70 disabled:active:scale-100"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Generate Report'}
                        </button>
                    </div>
                )}

                {/* Data Grid */}
                <div className={`${showFilters ? 'lg:col-span-3' : 'lg:col-span-4'} bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col print:hidden`}>
                    {reportData.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                                        <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Student</th>
                                        <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Department</th>
                                        <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Type / Year</th>
                                        <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Pass Type</th>
                                        <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                                        <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Dates</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                    {reportData.map((item) => (
                                        <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                            <td className="p-4">
                                                <div className="font-medium text-slate-900 dark:text-white">{item.student_name}</div>
                                                <div className="text-xs text-slate-500">{item.register_number}</div>
                                            </td>
                                            <td className="p-4">
                                                <div className="text-sm font-medium text-slate-700 dark:text-slate-300">{item.department_name}</div>
                                            </td>
                                            <td className="p-4">
                                                <div className="text-sm text-slate-700 dark:text-slate-300">{item.student_type}</div>
                                                <div className="text-xs text-slate-500">Year {item.year}</div>
                                            </td>
                                            <td className="p-4">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${item.type === 'Emergency' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>
                                                    {item.type}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <div className="text-sm font-medium capitalize text-slate-700 dark:text-slate-300">
                                                    {item.status.replace('_', ' ')}
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div className="text-xs text-slate-500">
                                                    <div>Out: {new Date(item.departure_date).toLocaleDateString()}</div>
                                                    <div>In: {new Date(item.return_date).toLocaleDateString()}</div>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center p-12 text-center">
                            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mb-4">
                                <Search className="w-8 h-8 text-slate-400" />
                            </div>
                            <h3 className="text-lg font-medium text-slate-900 dark:text-white">No Reports Generated</h3>
                            <p className="text-slate-500 dark:text-slate-400 max-w-sm mt-2">
                                Adjust filters and click "Generate Report" to view data.
                            </p>
                        </div>
                    )}
                </div>

                {/* Advanced Print Template */}
                {printData.length > 0 && (
                    <div className="hidden print:block bg-white p-4 font-serif text-black print-box">
                        <style>{`
                            @media print {
                                body * { visibility: hidden; }
                                .print-box, .print-box * { visibility: visible; }
                                .print-box { position: absolute; left: 0; top: 0; width: 100%; }
                                @page { size: portrait; margin: 15mm; }
                                .print-table { width: 100%; border-collapse: collapse; display: table; }
                                .print-table thead { display: table-header-group; }
                                .print-table tfoot { display: table-footer-group; }
                                .print-table tbody { display: table-row-group; }
                                .print-table tr { page-break-inside: avoid; }
                                .print-header-row th { border-bottom: 2px solid #000; padding-bottom: 10px; }
                                .print-footer-row td { border-top: 1px solid #ccc; padding-top: 10px; }
                                .print-data-table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 8px; }
                                .print-data-table th { background: #f1f5f9; border: 1px solid #000; padding: 4px; text-transform: uppercase; font-weight: 900; }
                                .print-data-table td { border: 1px solid #000; padding: 4px; vertical-align: middle; }
                            }
                        `}</style>
                        <table className="print-table">
                            <thead>
                                <tr className="print-header-row">
                                    <th>
                                        <div className="flex items-center justify-between mb-4 w-full">
                                            <div className="flex items-center gap-4">
                                                {settings?.app_logo && <img src={settings.app_logo} className="w-16 h-16 object-contain grayscale" alt="" />}
                                                <div className="text-left">
                                                    <h1 className="text-xl font-black uppercase leading-none mb-1">{settings?.app_name || 'System Report'}</h1>
                                                    <p className="text-[10px] uppercase font-bold text-slate-600 px-0.5">Administrative Report Log</p>
                                                </div>
                                                <div className={`${showFilters ? 'lg:col-span-3' : 'lg:col-span-4'} flex flex-col gap-6 print:w-full`}>
                                                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] shadow-sm overflow-hidden min-h-[500px] flex flex-col print:hidden">
                                                        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50 backdrop-blur-sm">
                                                            <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-widest text-sm flex items-center gap-3">
                                                                <FileBarChart className="w-5 h-5 text-indigo-500" />
                                                                Movement Logs Table
                                                            </h3>
                                                            <span className="px-4 py-1.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-full text-[10px] font-black uppercase tracking-widest">
                                                                {reportData.length} records found
                                                            </span>
                                                        </div>

                                                        {reportData.length > 0 ? (
                                                            <>
                                                                <div className="overflow-x-auto flex-1">
                                                                    <table className="w-full text-left border-collapse">
                                                                        <thead>
                                                                            <tr className="bg-slate-50/30 dark:bg-slate-800/20 border-b border-slate-100 dark:border-slate-800">
                                                                                <th className="p-6 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Student Information</th>
                                                                                <th className="p-6 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Department</th>
                                                                                <th className="p-6 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Pass Type</th>
                                                                                <th className="p-6 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Status</th>
                                                                                <th className="p-6 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Timeline</th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                                                                            {currentItems.map((item) => (
                                                                                <tr key={item.id} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-all">
                                                                                    <td className="p-6">
                                                                                        <div className="flex items-center gap-3">
                                                                                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white font-black text-sm shadow-lg shadow-indigo-500/20">
                                                                                                {item.student_name.charAt(0)}
                                                                                            </div>
                                                                                            <div>
                                                                                                <div className="font-black text-slate-900 dark:text-white text-sm group-hover:text-indigo-600 transition-colors">{item.student_name}</div>
                                                                                                <div className="text-[10px] font-bold text-slate-500 tracking-tighter mt-0.5">{item.register_number} (Yr {item.year})</div>
                                                                                            </div>
                                                                                        </div>
                                                                                    </td>
                                                                                    <td className="p-6">
                                                                                        <div className="flex flex-col gap-1">
                                                                                            <div className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                                                                                                {item.department_name}
                                                                                            </div>
                                                                                            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                                                                                                {item.hostel_name || 'No Hostel'}
                                                                                            </div>
                                                                                        </div>
                                                                                    </td>
                                                                                    <td className="p-6">
                                                                                        <span className={`px-3 py-1 rounded-lg text-[10px] font-black tracking-widest uppercase ${item.type === 'Emergency'
                                                                                            ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400'
                                                                                            : 'bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400'
                                                                                            }`}>
                                                                                            {item.type}
                                                                                        </span>
                                                                                    </td>
                                                                                    <td className="p-6">
                                                                                        <div className="flex items-center gap-2">
                                                                                            <div className={`w-2 h-2 rounded-full ${item.status === 'completed' ? 'bg-emerald-500' :
                                                                                                item.status === 'rejected' ? 'bg-rose-500' :
                                                                                                    item.status === 'pending' ? 'bg-amber-500 animate-pulse' : 'bg-indigo-500'
                                                                                                }`} />
                                                                                            <span className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">
                                                                                                {item.status.replace('_', ' ')}
                                                                                            </span>
                                                                                        </div>
                                                                                    </td>
                                                                                    <td className="p-6">
                                                                                        <div className="flex flex-col gap-1.5">
                                                                                            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-600 dark:text-slate-400 border-l-2 border-slate-200 dark:border-slate-800 pl-3">
                                                                                                <span className="text-slate-400 uppercase tracking-tighter">OUT</span>
                                                                                                {new Date(item.departure_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                                                                            </div>
                                                                                            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-600 dark:text-slate-400 border-l-2 border-indigo-500 pl-3">
                                                                                                <span className="text-indigo-400 uppercase tracking-tighter">RET</span>
                                                                                                {new Date(item.return_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                                                                            </div>
                                                                                        </div>
                                                                                    </td>
                                                                                </tr>
                                                                            ))}
                                                                        </tbody>
                                                                    </table>
                                                                </div>

                                                                {/* Pagination Controls */}
                                                                <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                                                                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                                                        Showing <span className="text-slate-900 dark:text-white">{indexOfFirstItem + 1}</span> - <span className="text-slate-900 dark:text-white">{Math.min(indexOfLastItem, reportData.length)}</span> of <span className="text-slate-900 dark:text-white">{reportData.length}</span>
                                                                    </div>
                                                                    <div className="flex items-center gap-2">
                                                                        <button
                                                                            onClick={() => paginate(currentPage - 1)}
                                                                            disabled={currentPage === 1}
                                                                            className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                                                        >
                                                                            Previous
                                                                        </button>
                                                                        <div className="hidden sm:flex items-center gap-1">
                                                                            {[...Array(Math.ceil(reportData.length / itemsPerPage))].map((_, i) => (
                                                                                <button
                                                                                    key={i + 1}
                                                                                    onClick={() => paginate(i + 1)}
                                                                                    className={`w-8 h-8 rounded-lg text-xs font-black transition-all ${currentPage === i + 1
                                                                                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                                                                                        : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                                                                                        }`}
                                                                                >
                                                                                    {i + 1}
                                                                                </button>
                                                                            )).slice(Math.max(0, currentPage - 3), Math.min(Math.ceil(reportData.length / itemsPerPage), currentPage + 2))}
                                                                        </div>
                                                                        <button
                                                                            onClick={() => paginate(currentPage + 1)}
                                                                            disabled={currentPage === Math.ceil(reportData.length / itemsPerPage)}
                                                                            className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                                                        >
                                                                            Next
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </>
                                                        ) : (
                                                            <div className="flex-1 flex flex-col items-center justify-center p-20 text-center">
                                                                <div className="w-24 h-24 bg-slate-50 dark:bg-slate-800/50 rounded-full flex items-center justify-center mb-6 border-4 border-white dark:border-slate-800 shadow-inner">
                                                                    <Search className="w-10 h-10 text-slate-300 dark:text-slate-600" />
                                                                </div>
                                                            </div>
                                        </div>
                                                </th>
                                            </tr>
                                        </thead>
                                        <tfoot className="print-footer-row">
                                            <tr>
                                                <td>
                                                    <div className="flex justify-between items-end mt-12 px-8 pb-4">
                                                        <div className="text-center">
                                                            <div className="h-12 w-32 border-b-2 border-slate-300 mb-2"></div>
                                                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Class In-charge</p>
                                                        </div>
                                                        <div className="text-center">
                                                            <div className="h-12 w-32 border-b-2 border-slate-300 mb-2"></div>
                                                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">HOD Signature</p>
                                                        </div>
                                                        <div className="text-center">
                                                            <div className="h-12 w-32 border-b-2 border-slate-300 mb-2"></div>
                                                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Principal / CTO</p>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                )}
                            </div>
                    </div>
                );
};

                export default AdminReports;
