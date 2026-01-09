import React, { useState } from 'react';
import axios from 'axios';
import { Megaphone, Send, Users, Shield, UserCheck } from 'lucide-react';
import toast from 'react-hot-toast';

const Broadcast = () => {
    const [form, setForm] = useState({
        target_role: 'all',
        title: '',
        message: '',
        priority: 'high'
    });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await axios.post('/api/principal/broadcast', form);
            toast.success('Broadcast sent successfully');
            setForm({ ...form, title: '', message: '' });
        } catch (error) {
            toast.error('Failed to send broadcast');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto animate-fade-in-up">
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden">
                <div className="p-6 bg-gradient-to-r from-red-600 to-orange-600 text-white">
                    <h2 className="text-2xl font-black flex items-center gap-2">
                        <Megaphone className="w-6 h-6" /> Emergency Broadcast Center
                    </h2>
                    <p className="text-white/80 mt-1">Send high-priority alerts to the entire campus instantly.</p>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    <div>
                        <label className="block text-xs font-bold uppercase text-slate-500 mb-2">Target Audience</label>
                        <div className="grid grid-cols-3 gap-4">
                            {[
                                { id: 'all', label: 'Entire Campus', icon: Users },
                                { id: 'student', label: 'All Students', icon: UserCheck },
                                { id: 'staff', label: 'All Staff', icon: Shield },
                            ].map((opt) => (
                                <div
                                    key={opt.id}
                                    onClick={() => setForm({ ...form, target_role: opt.id })}
                                    className={`cursor-pointer p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${form.target_role === opt.id
                                            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600'
                                            : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300'
                                        }`}
                                >
                                    <opt.icon className="w-6 h-6" />
                                    <span className="font-bold text-sm">{opt.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase text-slate-500 mb-2">Alert Title</label>
                        <input
                            type="text"
                            required
                            value={form.title}
                            onChange={e => setForm({ ...form, title: e.target.value })}
                            className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder="e.g. URGENT: Campus Lockdown Drill"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase text-slate-500 mb-2">Message Body</label>
                        <textarea
                            required
                            value={form.message}
                            onChange={e => setForm({ ...form, message: e.target.value })}
                            rows={4}
                            className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder="Type your message here..."
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 bg-slate-900 text-white font-black rounded-xl shadow-lg hover:bg-slate-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        <Send className="w-5 h-5" />
                        {loading ? 'Transmitting...' : 'Transmit Broadcast'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Broadcast;
