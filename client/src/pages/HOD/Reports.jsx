import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    FileBarChart, CheckCircle, XCircle, AlertCircle, Calendar,
    Filter, Download, RefreshCw, LayoutTemplate, Printer
} from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';
import { motion, AnimatePresence } from 'framer-motion';

const AdvancedReports = () => {
    const { settings } = useSettings();
    // Filter State
    const [filters, setFilters] = useState({
        startDate: '',
        endDate: '',
        status: [],
        year: [],
        studentType: ''
    });

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

    // Initial load (optional, maybe wait for user to hit Generate)
    useEffect(() => {
        // Set default date range to current month? Or empty.
        // Let's keep empty and ask user to select.
    }, []);

    const fetchReport = async () => {
        setLoading(true);
        try {
            const queryParams = new URLSearchParams();
            if (filters.startDate) queryParams.append('startDate', filters.startDate);
            if (filters.endDate) queryParams.append('endDate', filters.endDate);
            if (filters.status.length > 0) queryParams.append('status', filters.status.join(','));
            if (filters.year.length > 0) queryParams.append('year', filters.year.join(','));
            if (filters.studentType) queryParams.append('studentType', filters.studentType);

            const res = await axios.get(`/api/hod/reports?${queryParams.toString()}`);
            setReportData(res.data);
            setCurrentPage(1);
        } catch (error) {
            console.error('Report generation failed', error);
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
            if (filters.status.length > 0) queryParams.append('status', filters.status.join(','));
            if (filters.year.length > 0) queryParams.append('year', filters.year.join(','));
            if (filters.studentType) queryParams.append('studentType', filters.studentType);
            queryParams.append('limit', 10000);

            const res = await axios.get(`/api/hod/reports?${queryParams.toString()}`);
            setPrintData(res.data);

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

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({
            ...prev,
            [key]: value
        }));
    };

    const toggleMultiSelect = (key, value) => {
        setFilters(prev => {
            const current = prev[key];
            if (current.includes(value)) {
                return { ...prev, [key]: current.filter(item => item !== value) };
            } else {
                return { ...prev, [key]: [...current, value] };
            }
        });
    };

    const downloadCSV = () => {
        setGeneratingCSV(true);
        try {
            if (reportData.length === 0) return;

            // Define CSV Headers
            const headers = [
                'Request ID', 'Student Name', 'Register No', 'Year', 'Student Type',
                'Hostel', 'Room', 'Mentor',
                'Type', 'Status', 'Departure Date', 'Return Date', 'Reason', 'Created At'
            ];

            // Map Data to CSV Rows
            const rows = reportData.map(row => [
                row.id,
                `"${row.student_name}"`, // Quote strings with spaces
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
                `"${row.reason.replace(/"/g, '""')}"`, // Escape quotes
                new Date(row.created_at).toLocaleString()
            ]);

            // Combine Headers and Rows
            const csvContent = [
                headers.join(','),
                ...rows.map(r => r.join(','))
            ].join('\n');

            // Create Blob and Download
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.setAttribute('href', url);
            link.setAttribute('download', `gatepass_report_${new Date().toISOString().split('T')[0]}.csv`);
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
        <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950/50 p-6 md:p-10 space-y-8">
            {/* Header */}
            {/* Header */}

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 print:hidden">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
                        <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-500/20">
                            <FileBarChart className="w-8 h-8 text-white" />
                        </div>
                        Advanced Reporting
                    </h1>
                    <p className="text-slate-500 font-medium ml-1">Generate deep insights and export granular data.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Filters Sidebar */}
                <div className="lg:col-span-3 space-y-6 print:hidden">
                    <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 shadow-xl border border-slate-100 dark:border-slate-800 sticky top-24">
                        <div className="flex items-center gap-2 mb-6 text-slate-400 font-bold uppercase tracking-wider text-xs">
                            <Filter className="w-4 h-4" /> Filter Configuration
                        </div>

                        <div className="space-y-6">
                            {/* Date Range */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase">Date Range</label>
                                <div className="space-y-2">
                                    <input
                                        type="date"
                                        className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500/20"
                                        value={filters.startDate}
                                        onChange={(e) => handleFilterChange('startDate', e.target.value)}
                                    />
                                    <input
                                        type="date"
                                        className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500/20"
                                        value={filters.endDate}
                                        onChange={(e) => handleFilterChange('endDate', e.target.value)}
                                    />
                                </div>
                            </div>

                            <hr className="border-slate-100 dark:border-slate-800" />

                            {/* Status */}
                            <div className="space-y-3">
                                <label className="text-xs font-bold text-slate-500 uppercase">Status</label>
                                <div className="flex flex-wrap gap-2">
                                    {['approved_hod', 'approved_warden', 'generated', 'completed', 'rejected', 'pending'].map(status => (
                                        <button
                                            key={status}
                                            onClick={() => toggleMultiSelect('status', status)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${filters.status.includes(status)
                                                ? 'bg-indigo-100 border-indigo-200 text-indigo-700 dark:bg-indigo-900/30 dark:border-indigo-800 dark:text-indigo-300'
                                                : 'bg-white border-slate-200 text-slate-500 hover:border-indigo-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400'
                                                }`}
                                        >
                                            {status.replace('_', ' ')}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Year */}
                            <div className="space-y-3">
                                <label className="text-xs font-bold text-slate-500 uppercase">Year</label>
                                <div className="flex gap-2">
                                    {['1', '2', '3', '4'].map(yr => (
                                        <button
                                            key={yr}
                                            onClick={() => toggleMultiSelect('year', yr)}
                                            className={`w-10 h-10 rounded-xl font-bold flex items-center justify-center transition-all ${filters.year.includes(yr)
                                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                                                : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400'
                                                }`}
                                        >
                                            {yr}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Student Type */}
                            <div className="space-y-3">
                                <label className="text-xs font-bold text-slate-500 uppercase">Student Type</label>
                                <select
                                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-200"
                                    value={filters.studentType}
                                    onChange={(e) => handleFilterChange('studentType', e.target.value)}
                                >
                                    <option value="">All Types</option>
                                    <option value="Hosteler">Hosteler</option>
                                    <option value="Day Scholar">Day Scholar</option>
                                </select>
                            </div>

                            <button
                                onClick={fetchReport}
                                disabled={loading}
                                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/30 transition-all active:scale-95 disabled:opacity-70 flex items-center justify-center gap-2"
                            >
                                {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <LayoutTemplate className="w-5 h-5" />}
                                Generate Report
                            </button>
                        </div>
                    </div>
                </div>

                {/* Results Area */}
                <div className="lg:col-span-9 space-y-6 print:w-full">
                    {/* Action Bar */}
                    <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm print:hidden">
                        <div className="flex items-center gap-4 print:hidden">
                            <span className="text-sm font-bold text-slate-500">
                                {reportData.length} records found
                            </span>
                        </div>
                        <div className="flex items-center gap-3 print:hidden">
                            <button
                                onClick={handlePrint}
                                disabled={reportData.length === 0 || loading}
                                className="px-6 py-2 bg-indigo-600 dark:bg-indigo-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Printer className="w-4 h-4" />
                                Print Report
                            </button>
                            <button
                                onClick={downloadCSV}
                                disabled={reportData.length === 0 || generatingCSV}
                                className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Download className="w-4 h-4" />
                                {generatingCSV ? 'Exporting...' : 'Export to CSV'}
                            </button>
                        </div>
                    </div>

                    {/* Data Table */}
                    <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-xl overflow-hidden min-h-[500px] print:hidden">
                        {reportData.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center py-20 text-slate-400 space-y-4">
                                <div className="p-6 bg-slate-50 dark:bg-slate-800 rounded-full">
                                    <FileBarChart className="w-12 h-12 opacity-50" />
                                </div>
                                <p className="font-bold">No report data generated yet.</p>
                                <p className="text-sm">Adjust filters and click "Generate Report"</p>
                            </div>
                        ) : (
                            <>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead className="text-xs text-slate-400 uppercase bg-slate-50 dark:bg-slate-800/50">
                                            <tr>
                                                <th className="px-6 py-4 font-black tracking-wider">Student</th>
                                                <th className="px-6 py-4 font-black tracking-wider">Type</th>
                                                <th className="px-6 py-4 font-black tracking-wider">Status</th>
                                                <th className="px-6 py-4 font-black tracking-wider">Created At</th>
                                                <th className="px-6 py-4 font-black tracking-wider">Departure</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                            {currentItems.map((row) => (
                                                <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                    <td className="px-6 py-4 font-medium">
                                                        <div className="text-slate-900 dark:text-white font-bold">{row.student_name}</div>
                                                        <div className="text-xs text-slate-400">{row.register_number}</div>
                                                    </td>
                                                    <td className="px-6 py-4 font-bold text-slate-600 dark:text-slate-300">
                                                        {row.type}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`px-2 py-1 rounded-md text-[10px] uppercase font-black tracking-wide ${row.status.includes('approved') ? 'bg-emerald-100 text-emerald-600' :
                                                            row.status === 'rejected' ? 'bg-red-100 text-red-600' :
                                                                'bg-amber-100 text-amber-600'
                                                            }`}>
                                                            {row.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-slate-500">
                                                        {new Date(row.created_at).toLocaleDateString()}
                                                    </td>
                                                    <td className="px-6 py-4 text-slate-500">
                                                        {new Date(row.departure_date).toLocaleString()}
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
                        )}
                    </div>
                </div>
                <div className="bg-indigo-600 rounded-[2rem] p-8 text-white relative overflow-hidden group shadow-2xl shadow-indigo-600/30 print:hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32 transition-all group-hover:bg-white/20"></div>
                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div>
                            <h4 className="text-2xl font-black tracking-tight">Need specific data exports?</h4>
                            <p className="text-indigo-100 mt-2 font-medium">Download the full dataset in CSV format for advanced analysis in Excel or Sheets.</p>
                        </div>
                        <button
                            onClick={downloadCSV}
                            disabled={reportData.length === 0}
                            className="px-8 py-4 bg-white text-indigo-600 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl hover:scale-105 transition-all active:scale-95 disabled:opacity-50"
                        >
                            Export Entire Range
                        </button>
                    </div>
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
                                                <p className="text-[10px] uppercase font-bold text-slate-600 px-0.5">Department Head Oversight</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-lg font-black uppercase">Department Registry</div>
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
                                                <th style={{ width: '15%' }}>Dept / Year</th>
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
                                                        <div className="uppercase text-[9px]">{log.department_name || 'N/A'}</div>
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
                                        <div className="text-center border-t border-black pt-2 w-48 text-[10px] font-bold">HEAD OF DEPARTMENT</div>
                                        <div className="text-[8px] font-mono text-slate-500 uppercase">
                                            CONFIDENTIAL REPORT • GENERATED BY {settings?.app_name || 'SYSTEM'}
                                        </div>
                                        <div className="text-center border-t border-black pt-2 w-48 text-[10px] font-bold">PRINCIPAL APPROVAL</div>
                                    </div>
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            )}
        </div>
    );
};

export default AdvancedReports;
