import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import axios from 'axios';
import { AlertCircle, Save } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const EditRequestModal = ({ isOpen, onClose, request, onUpdate }) => {
    const { user } = useAuth();
    const [formData, setFormData] = useState({
        type: 'Outing',
        reason: '',
        departure_date: '',
        return_date: ''
    });
    // const [loading, setLoading] = useState(false); // Managed by toast now mostly, but we can keep if we want to disable button properly without toast relying
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (request) {
            setFormData({
                type: request.type,
                reason: request.reason || '',
                departure_date: request.departure_date ? new Date(request.departure_date).toISOString().slice(0, 16) : '',
                return_date: request.return_date ? new Date(request.return_date).toISOString().slice(0, 16) : ''
            });
        }
    }, [request]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        const toastId = toast.loading('Updating request...');
        setError('');

        try {
            await axios.put(`/api/requests/${request.id}`, formData);
            onUpdate(); // Call parent refresh
            onClose();
            toast.success('Updated Successfully', { id: toastId });
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.message || 'Update failed', { id: toastId });
            setError(err.response?.data?.message || 'Failed to update request');
        } finally {
            setLoading(false);
        }
    };

    if (!request) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Edit Request">
            <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                    <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-xl text-xs font-bold flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" /> {error}
                    </div>
                )}
                <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Pass Type</label>
                    <select
                        className="w-full bg-gray-50 dark:bg-slate-800 border-none rounded-xl p-3 mt-1 text-sm dark:text-white outline-none focus:ring-2 focus:ring-primary-500 transition"
                        value={formData.type}
                        onChange={e => setFormData({ ...formData, type: e.target.value })}
                    >
                        {user?.student_type?.toLowerCase().includes('day') ? (
                            <>
                                <option value="Leave">Casual Leave</option>
                                <option value="On Duty">Academic On-Duty (OD)</option>
                            </>
                        ) : (
                            <>
                                <option value="Outing">Standard Outing</option>
                                <option value="Home Visit">Home Visit</option>
                                <option value="Emergency">Medical Emergency</option>
                            </>
                        )}
                    </select>
                </div>
                <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Reason</label>
                    <textarea
                        className="w-full bg-gray-50 dark:bg-slate-800 border-none rounded-xl p-3 mt-1 text-sm dark:text-white outline-none focus:ring-2 focus:ring-primary-500 transition"
                        rows="3"
                        placeholder="Briefly explain..."
                        required
                        value={formData.reason}
                        onChange={e => setFormData({ ...formData, reason: e.target.value })}
                    />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Departure</label>
                        <input
                            type="datetime-local"
                            className="w-full bg-gray-50 dark:bg-slate-800 border-none rounded-xl p-3 mt-1 text-sm dark:text-white outline-none focus:ring-2 focus:ring-primary-500"
                            required
                            value={formData.departure_date}
                            onChange={e => setFormData({ ...formData, departure_date: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Return</label>
                        <input
                            type="datetime-local"
                            className="w-full bg-gray-50 dark:bg-slate-800 border-none rounded-xl p-3 mt-1 text-sm dark:text-white outline-none focus:ring-2 focus:ring-primary-500"
                            required
                            value={formData.return_date}
                            onChange={e => setFormData({ ...formData, return_date: e.target.value })}
                        />
                    </div>
                </div>
                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition flex items-center justify-center gap-2 disabled:opacity-70"
                >
                    {loading ? 'Saving...' : <><Save className="w-4 h-4" /> Save Changes</>}
                </button>
            </form>
        </Modal>
    );
};

export default EditRequestModal;
