import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Database, Archive, Trash2, Download, RefreshCw, AlertTriangle, Layers } from 'lucide-react';
import toast from 'react-hot-toast';

const DatabaseManager = () => {
    const [stats, setStats] = useState([]);
    const [loading, setLoading] = useState(false);
    const [confirmText, setConfirmText] = useState('');
    const [backupFilters, setBackupFilters] = useState({ startDate: '', endDate: '', category: 'all' });

    // Inspector State
    const [inspectTable, setInspectTable] = useState(null); // Table name being inspected
    const [tableData, setTableData] = useState([]);
    const [pagination, setPagination] = useState({ current: 1, limit: 10, total: 0, pages: 0 });
    const [inspectorLoading, setInspectorLoading] = useState(false);

    const fetchStats = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/admin/database/stats');
            setStats(res.data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, []);

    const handleBackup = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (backupFilters.startDate) params.append('startDate', backupFilters.startDate);
            if (backupFilters.endDate) params.append('endDate', backupFilters.endDate);
            if (backupFilters.category !== 'all') params.append('category', backupFilters.category);

            await toast.promise(
                axios.get(`/api/admin/database/backup?${params.toString()}`, { responseType: 'blob' })
                    .then(response => {
                        const url = window.URL.createObjectURL(new Blob([response.data]));
                        const link = document.createElement('a');
                        link.href = url;
                        link.setAttribute('download', `gate_backup_${new Date().toISOString().split('T')[0]}.xlsx`);
                        document.body.appendChild(link);
                        link.click();
                        link.remove();
                    }),
                { loading: 'Generating Report...', success: 'Download Started!', error: 'Backup Failed.' }
            );
        } catch (err) { console.error(err); } finally { setLoading(false); }
    };

    const handleClearTable = async (tableName) => {
        if (confirmText !== 'CONFIRM') return toast.error('Type CONFIRM to proceed');
        if (!window.confirm(`Permanently wipe ${tableName}? This cannot be undone.`)) return;

        setLoading(true);
        try {
            await axios.post('/api/admin/database/clear-table', { tableName, confirmation: 'CONFIRM' });
            toast.success(`${tableName} cleared`);
            fetchStats();
            setConfirmText('');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed');
        } finally {
            setLoading(false);
        }
    };

    const fetchTableData = async (tableName, page = 1) => {
        setInspectorLoading(true);
        try {
            const res = await axios.get(`/api/admin/database/table/${tableName}?page=${page}&limit=${pagination.limit}`);
            setTableData(res.data.data);
            setPagination(res.data.pagination);
            setInspectTable(tableName);
        } catch (err) {
            toast.error('Failed to load table data');
        } finally {
            setInspectorLoading(false);
        }
    };

    const handleDeleteRow = async (id) => {
        if (!window.confirm('Permanently delete this row?')) return;
        try {
            await axios.delete(`/api/admin/database/table/${inspectTable}/${id}`);
            toast.success('Row deleted');
            fetchTableData(inspectTable, pagination.current); // Refresh
            fetchStats(); // Update global stats
        } catch (err) {
            toast.error(err.response?.data?.message || 'Delete failed');
        }
    };

    // Calculate total size
    const totalSize = stats.reduce((acc, curr) => acc + (curr.size || 0), 0);
    const totalRows = stats.reduce((acc, curr) => acc + (curr.rows || 0), 0);

    return (
        <div className="space-y-8 animate-fade-in-up">
            <header className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white">Database & Storage</h2>
                    <p className="text-slate-500">Manage data retention, backups, and table optimization.</p>
                </div>
                <button onClick={fetchStats} className="p-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm hover:bg-slate-50 transition">
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </header>

            {/* Storage Overview */}
            <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400">
                            <Database className="w-5 h-5" />
                        </div>
                        <h3 className="font-bold text-lg">Storage Metrics</h3>
                    </div>

                    <div className="flex items-end gap-2 mb-2">
                        <span className="text-4xl font-black text-slate-900 dark:text-white">{(totalSize / (1024 * 1024)).toFixed(2)}</span>
                        <span className="text-sm font-bold text-slate-500 mb-1.5">MB Used</span>
                    </div>

                    <div className="w-full h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden flex">
                        {stats.map((table, i) => (
                            <div
                                key={table.name}
                                style={{ width: `${(table.size / totalSize) * 100}%`, backgroundColor: `hsl(${(i * 45) % 360}, 70%, 60%)` }}
                                title={`${table.name}: ${(table.size / 1024).toFixed(1)} KB`}
                            />
                        ))}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-2 text-right">Total Rows: {totalRows.toLocaleString()}</p>
                </div>

                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg text-emerald-600 dark:text-emerald-400">
                            <Archive className="w-5 h-5" />
                        </div>
                        <h3 className="font-bold text-lg">Export Data</h3>
                    </div>

                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">From</label>
                                <input type="date" value={backupFilters.startDate} onChange={e => setBackupFilters({ ...backupFilters, startDate: e.target.value })} className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">To</label>
                                <input type="date" value={backupFilters.endDate} onChange={e => setBackupFilters({ ...backupFilters, endDate: e.target.value })} className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs" />
                            </div>
                        </div>
                        <button
                            onClick={handleBackup}
                            disabled={loading}
                            className="w-full py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-lg active:scale-[0.98]"
                        >
                            <Download className="w-4 h-4" /> Download Report (.xlsx)
                        </button>
                    </div>
                </div>
            </div>

            {/* Table Management */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-indigo-500" />
                    <h3 className="font-bold text-sm">Table Explorer</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-900/50 text-[10px] font-bold uppercase text-slate-400">
                            <tr>
                                <th className="px-6 py-3">Table Name</th>
                                <th className="px-6 py-3 text-center">Row Count</th>
                                <th className="px-6 py-3 text-center">Size</th>
                                <th className="px-6 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {stats.map(table => (
                                <tr key={table.name} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                    <td className="px-6 py-3 font-semibold text-slate-700 dark:text-slate-200">{table.name}</td>
                                    <td className="px-6 py-3 text-center font-mono text-slate-500">{table.rows.toLocaleString()}</td>
                                    <td className="px-6 py-3 text-center font-mono text-slate-500">{(table.size / 1024).toFixed(1)} KB</td>
                                    <td className="px-6 py-3 text-right">
                                        <div className="flex items-center justify-end gap-3">
                                            <button
                                                onClick={() => fetchTableData(table.name)}
                                                className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                                            >
                                                View Data
                                            </button>
                                            {['logs', 'notifications', 'trust_history', 'requests', 'maintenance_requests'].includes(table.name) && (
                                                <div className="flex items-center gap-2 pl-3 border-l border-slate-200 dark:border-slate-700">
                                                    <input
                                                        placeholder="CONFIRM"
                                                        className="w-16 p-1 text-[10px] border border-slate-200 dark:border-slate-700 rounded bg-transparent text-center"
                                                        onChange={(e) => setConfirmText(e.target.value)}
                                                    />
                                                    <button
                                                        onClick={() => handleClearTable(table.name)}
                                                        className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                                                        title="Truncate Table"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
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


            {/* Table Inspector Modal */}
            {
                inspectTable && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
                        <div className="bg-white dark:bg-slate-800 w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 max-h-[90vh] flex flex-col">
                            <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                                <h3 className="font-bold text-xl text-slate-900 dark:text-white flex items-center gap-2">
                                    <Database className="w-5 h-5 text-indigo-500" />
                                    Inspecting: <span className="font-mono text-indigo-600 dark:text-indigo-400">{inspectTable}</span>
                                </h3>
                                <button onClick={() => setInspectTable(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition">
                                    <Layers className="w-5 h-5 text-slate-500" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-auto p-6">
                                {inspectorLoading ? (
                                    <div className="flex justify-center py-20">
                                        <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-xl">
                                        <table className="w-full text-left text-xs">
                                            <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 font-bold uppercase whitespace-nowrap">
                                                <tr>
                                                    <th className="px-4 py-3 border-b border-slate-200 dark:border-slate-700">Actions</th>
                                                    {tableData.length > 0 && Object.keys(tableData[0]).map(key => (
                                                        <th key={key} className="px-4 py-3 border-b border-slate-200 dark:border-slate-700">{key}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700 font-mono">
                                                {tableData.map((row, i) => (
                                                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                                        <td className="px-4 py-3 sticky left-0 bg-white dark:bg-slate-800 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                                            <button
                                                                onClick={() => handleDeleteRow(row.id)}
                                                                className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded opacity-50 hover:opacity-100 transition"
                                                                title="Delete Row"
                                                                disabled={inspectTable === 'users' && row.id === 1}
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </td>
                                                        {Object.values(row).map((val, j) => (
                                                            <td key={j} className="px-4 py-3 max-w-[200px] truncate text-slate-600 dark:text-slate-300" title={typeof val === 'object' ? JSON.stringify(val) : val}>
                                                                {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                                                            </td>
                                                        ))}
                                                    </tr>
                                                ))}
                                                {tableData.length === 0 && (
                                                    <tr>
                                                        <td colSpan="100" className="px-6 py-12 text-center text-slate-400">
                                                            No data found in this table.
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>

                            <div className="p-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50 rounded-b-2xl">
                                <span className="text-sm text-slate-500 font-bold">
                                    Page {pagination.current} of {pagination.pages} ({pagination.total} rows)
                                </span>
                                <div className="flex gap-2">
                                    <button
                                        disabled={pagination.current === 1}
                                        onClick={() => fetchTableData(inspectTable, pagination.current - 1)}
                                        className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold disabled:opacity-50 hover:bg-slate-50 transition"
                                    >
                                        Previous
                                    </button>
                                    <button
                                        disabled={pagination.current >= pagination.pages}
                                        onClick={() => fetchTableData(inspectTable, pagination.current + 1)}
                                        className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold disabled:opacity-50 hover:bg-slate-50 transition"
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default DatabaseManager;
