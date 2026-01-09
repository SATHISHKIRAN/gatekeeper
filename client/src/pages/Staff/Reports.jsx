import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FileBarChart, Download, Filter, Search, Calendar, RefreshCw, Loader2, X, Printer } from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';

const StaffReports = () => {
    const { settings } = useSettings();
    const [reportData, setReportData] = useState([]);
    const [printData, setPrintData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [generatingCSV, setGeneratingCSV] = useState(false);

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
        studentType: ''
    });

    const [showFilters, setShowFilters] = useState(true);

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

            const response = await axios.get(`/api/staff/reports?${queryParams.toString()}`, {
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
            queryParams.append('limit', 10000);

            const response = await axios.get(`/api/staff/reports?${queryParams.toString()}`, {
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
                'Request ID', 'Student Name', 'Register No', 'Year', 'Student Type',
                'Hostel', 'Room', 'Mentor',
                'Type', 'Status', 'Departure Date', 'Return Date', 'Reason', 'Created At'
            ];

            const rows = reportData.map(row => [
                row.id,
                `"${row.student_name}"`,
                row.register_number,
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
            link.setAttribute('download', `mentee_report_${new Date().toISOString().split('T')[0]}.csv`);
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

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <FileBarChart className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                        Mentee Reports
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400">Generate detailed reports for your mentees.</p>
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
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Status</label>
                            <div className="flex flex-wrap gap-2">
                                {['pending', 'approved_staff', 'rejected', 'completed'].map(status => (
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
                                                <th className="p-6 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Year</th>
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
                                                                <div className="text-[10px] font-bold text-slate-500 tracking-tighter mt-0.5">{item.register_number}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="p-6">
                                                        <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                                                            Year {item.year}
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
                                <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-widest">No Logs Found</h3>
                                <p className="text-slate-500 dark:text-slate-400 max-w-sm mt-4 font-medium leading-relaxed">
                                    Configure your filters and click <span className="text-indigo-600 font-bold italic">Generate Report</span> to visualize movement data.
                                </p>
                            </div>
                        )}
                    </div>
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
                                                    <h1 className="text-xl font-black uppercase leading-none mb-1">{settings?.app_name || 'Department Report'}</h1>
                                                    <p className="text-[10px] uppercase font-bold text-slate-600 px-0.5">Faculty Oversight Registry</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-lg font-black uppercase">Mentorship Log</div>
                                                <div className="text-[9px] font-bold text-slate-500">ID: {Math.floor(Date.now() / 1000)}</div>
                                            </div>
                                        </div>
                                        <div className="flex justify-between bg-slate-100 border border-black p-2 rounded text-[10px] mb-2">
                                            <span className="font-bold">PERIOD: <span className="font-black">{filters.startDate || 'START'} - {filters.endDate || 'END'}</span></span>
                                            <span className="font-bold">GENERATED: <span className="font-black">{new Date().toLocaleDateString()}</span></span>
                                            <span className="font-bold">RECORDS: <span className="font-black">{printData.length}</span></span>
                                        </div>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>
                                        <table className="print-data-table">
                                            <thead>
                                                <tr>
                                                    <th style={{ width: '18%' }}>Student / Reg No</th>
                                                    <th style={{ width: '15%' }}>Mentor / Year</th>
                                                    <th style={{ width: '10%' }}>Pass Type</th>
                                                    <th style={{ width: '22%' }}>Scheduled Timing</th>
                                                    <th style={{ width: '10%' }}>Status</th>
                                                    <th style={{ width: '15%' }}>Actual Time</th>
                                                    <th style={{ width: '10%' }}>Log Status</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {printData.map((log) => (
                                                    <tr key={log.id}>
                                                        <td>
                                                            <div className="font-bold underline uppercase text-[10px]">{log.student_name}</div>
                                                            <div className="font-black text-[8px] mt-0.5">{log.register_number}</div>
                                                        </td>
                                                        <td className="text-center font-bold">
                                                            <div className="uppercase text-[9px]">{log.mentor_name || 'N/A'}</div>
                                                            <div className="text-[8px] opacity-70 italic mt-0.5">Year {log.year || 'N/A'}</div>
                                                        </td>
                                                        <td className="text-center font-black uppercase text-[9px]">
                                                            {log.type}
                                                        </td>
                                                        <td className="text-[8px]">
                                                            <div className="flex flex-col gap-0.5">
                                                                <div className="flex justify-between border-b border-slate-100 pb-0.5">
                                                                    <span className="font-black uppercase text-slate-400">OUT:</span>
                                                                    <span className="font-bold uppercase text-red-600">{new Date(log.departure_date).toLocaleString()}</span>
                                                                </div>
                                                                <div className="flex justify-between">
                                                                    <span className="font-black uppercase text-slate-400">IN:</span>
                                                                    <span className="font-bold uppercase text-emerald-600">{new Date(log.return_date).toLocaleString()}</span>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="text-center font-black text-[8px] uppercase">
                                                            {log.status.replace('_', ' ')}
                                                        </td>
                                                        <td className="text-center font-bold">
                                                            <div className="uppercase text-[9px]">{new Date(log.created_at).toLocaleDateString()}</div>
                                                            <div className="font-black text-[9px] mt-0.5 text-indigo-600">{new Date(log.created_at).toLocaleTimeString()}</div>
                                                        </td>
                                                        <td className="text-center">
                                                            <span className={`px-1 py-0.5 rounded border border-black text-[8px] font-bold ${log.status === 'completed' ? 'bg-emerald-50' :
                                                                log.status === 'rejected' ? 'bg-red-50' : 'bg-amber-50'
                                                                }`}>
                                                                {log.status === 'completed' ? 'CLOSED' : log.status === 'rejected' ? 'DENIED' : 'OPEN'}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </td>
                                </tr>
                            </tbody>
                            <tfoot>
                                <tr className="print-footer-row">
                                    <td>
                                        <div className="mt-8 flex justify-between items-end">
                                            <div className="text-center border-t border-black pt-2 w-48 text-[10px] font-bold">MENTOR SIGNATURE</div>
                                            <div className="text-[8px] font-mono text-slate-500 uppercase">
                                                CONFIDENTIAL REPORT • GENERATED BY {settings?.app_name || 'SYSTEM'}
                                            </div>
                                            <div className="text-center border-t border-black pt-2 w-48 text-[10px] font-bold">HOD VERIFICATION</div>
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

export default StaffReports;
