import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Send, Bell, RefreshCw, MessageSquare
} from 'lucide-react';
import Modal from '../../components/Modal';

const WardenBroadcasts = () => {
    const [broadcasts, setBroadcasts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [formData, setFormData] = useState({ title: '', message: '', type: 'info' });

    useEffect(() => {
        fetchBroadcasts();
    }, []);

    const fetchBroadcasts = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/warden/broadcasts');
            setBroadcasts(res.data);
        } catch (err) {
            console.error('Broadcast fetch error', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSend = async (e) => {
        e.preventDefault();
        try {
            await axios.post('/api/warden/broadcast', formData);
            alert('Broadcast sent successfully');
            setIsFormOpen(false);
            setFormData({ title: '', message: '', type: 'info' });
            fetchBroadcasts();
        } catch (err) {
            alert('Failed to send broadcast');
        }
    };

    return (
        <div className="space-y-6 pb-20">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Broadcasts</h1>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Send announcements to students</p>
                </div>
                <button
                    onClick={() => setIsFormOpen(true)}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
                >
                    <Send className="w-4 h-4" />
                    <span className="text-sm font-medium">New Broadcast</span>
                </button>
            </div>

            {/* Broadcast History */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Recent Broadcasts</h3>
                    <button onClick={fetchBroadcasts} className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                        <RefreshCw className="w-4 h-4" />
                    </button>
                </div>

                <div className="space-y-4">
                    {loading ? (
                        [1, 2, 3].map(i => <div key={i} className="h-24 bg-slate-100 dark:bg-slate-700 animate-pulse rounded-lg" />)
                    ) : broadcasts.length === 0 ? (
                        <div className="text-center py-12 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                            <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                            <p className="text-sm text-slate-500">No broadcasts yet</p>
                        </div>
                    ) : (
                        broadcasts.map((b, idx) => (
                            <div
                                key={idx}
                                className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors"
                            >
                                <div className="flex items-start gap-4">
                                    <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                                        <Bell className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-4 mb-2">
                                            <h4 className="font-semibold text-slate-900 dark:text-white">{b.title}</h4>
                                            <span className="text-xs text-slate-500 whitespace-nowrap">
                                                {new Date(b.created_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                                            {b.message}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Broadcast Modal */}
            <Modal
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                title="Send Broadcast"
                maxWidth="max-w-lg"
            >
                <form onSubmit={handleSend} className="space-y-4 p-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Type</label>
                        <div className="grid grid-cols-2 gap-3">
                            {['info', 'urgent'].map(t => (
                                <button
                                    key={t}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, type: t })}
                                    className={`py-2 rounded-lg text-sm font-medium transition-colors ${formData.type === t
                                            ? 'bg-indigo-600 text-white'
                                            : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                                        }`}
                                >
                                    {t.charAt(0).toUpperCase() + t.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Title</label>
                        <input
                            type="text"
                            required
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            placeholder="Enter broadcast title"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Message</label>
                        <textarea
                            required
                            rows={4}
                            value={formData.message}
                            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                            className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                            placeholder="Enter your message"
                        />
                    </div>
                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={() => setIsFormOpen(false)}
                            className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                        >
                            Send Broadcast
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default WardenBroadcasts;
