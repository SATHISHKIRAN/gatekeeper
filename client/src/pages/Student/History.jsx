import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Clock, CheckCircle, XCircle, AlertCircle, FileText, Ban } from 'lucide-react';

const History = () => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchHistory = async () => {
        try {
            const res = await axios.get('/api/requests/my-requests');
            setRequests(res.data);
        } catch (err) {
            console.error('Failed to fetch history');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHistory();
    }, []);

    const handleCancel = async (id) => {
        // if (!confirm('Are you sure you want to cancel this request?')) return;
        try {
            await axios.delete(`/api/requests/${id}`);
            fetchHistory(); // Refresh
            // alert('Pass cancelled successfully'); // Optional: Replace with toast if available
        } catch (err) {
            alert(err.response?.data?.message || 'Cancellation failed');
        }
    };

    const getStatusStyle = (status) => {
        switch (status) {
            case 'approved_warden':
            case 'generated':
            case 'completed': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
            case 'rejected': return 'bg-red-50 text-red-600 border-red-100';
            case 'cancelled': return 'bg-slate-100 text-slate-500 border-slate-200';
            default: return 'bg-amber-50 text-amber-600 border-amber-100';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'approved_warden':
            case 'generated':
            case 'completed': return <CheckCircle className="w-4 h-4" />;
            case 'rejected': return <XCircle className="w-4 h-4" />;
            case 'cancelled': return <Ban className="w-4 h-4" />;
            default: return <Clock className="w-4 h-4" />;
        }
    };

    if (loading) return <div className="p-8 text-center text-slate-500">Loading history...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Request History</h1>
                    <p className="text-slate-500 mt-1">Track and manage your past gate pass applications</p>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-500 font-medium border-b border-slate-200 dark:border-slate-700">
                            <tr>
                                <th className="px-6 py-4">Type</th>
                                <th className="px-6 py-4">Dates</th>
                                <th className="px-6 py-4">Reason</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {requests.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-slate-500">
                                        <div className="flex flex-col items-center justify-center">
                                            <FileText className="w-12 h-12 text-slate-300 mb-3" />
                                            <p>No pass requests found.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                requests.map((req) => (
                                    <tr key={req.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                        <td className="px-6 py-4 font-medium capitalize text-slate-900 dark:text-white">
                                            {req.type}
                                        </td>
                                        <td className="px-6 py-4 text-slate-500">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Out</span>
                                                <span>{new Date(req.departure_date).toLocaleString()}</span>
                                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1">In</span>
                                                <span>{new Date(req.return_date).toLocaleString()}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 dark:text-slate-300 max-w-xs truncate">
                                            {req.reason}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border ${getStatusStyle(req.status)} capitalize`}>
                                                {getStatusIcon(req.status)}
                                                {req.status.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {['pending', 'approved_staff', 'approved_hod', 'approved_warden', 'emergency'].includes(req.status) && (
                                                <button
                                                    onClick={() => handleCancel(req.id)}
                                                    className="text-red-500 hover:text-red-600 font-medium text-xs border border-red-200 hover:border-red-300 bg-red-50 px-3 py-1.5 rounded-lg transition-colors"
                                                >
                                                    Cancel Request
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default History;
