import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { Loader } from 'lucide-react';

const ActionHandler = () => {
    const { action, id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { showToast } = useNotification();
    const [processing, setProcessing] = useState(true);

    useEffect(() => {
        if (!user) return; // Wait for auth

        const handleAction = async () => {
            try {
                // 1. Fetch Request to know current status
                // We need an endpoint to get single request regardless of role restrictions (or just use correct one)
                // Staff uses /api/queue, HOD uses /api/queue/hod. 
                // Let's assume we can fetch it via a common endpoint or reuse queue endpoint.
                // Actually queueController doesn't have a single-get public endpoint easily accessible.
                // But updateStatus DOES fetch it internally.

                // If we blindly try to update, we need to know the TARGET status.
                // If action is 'reject', target is 'rejected'. Easy.

                if (action === 'reject') {
                    await axios.put(`/api/queue/${id}/status`, { status: 'rejected' });
                    showToast('Request Rejected', 'The pass request has been rejected.', 'success');
                }
                else if (action === 'approve') {
                    // We need to know current status to decide next status
                    // Trick: Try to fetch it from queue list logic? No, too heavy.
                    // Better: Create a dedicated 'resolve' endpoint or logic on backend.
                    // OR: Just fetch the request details first. 
                    // Users have permission to view profiles/requests usually.

                    // Let's try to infer from role.
                    if (user.role === 'staff') {
                        // Staff always approves to approved_staff (Step 1)
                        await axios.put(`/api/queue/${id}/status`, { status: 'approved_staff' });
                    } else if (user.role === 'hod') {
                        // HOD is tricky. Could be Step 1 (Mentor) or Step 2 (HOD).
                        // We made HOD view flexible in queueController.
                        // We should probably fetch the request.
                        // Let's assume we can get it via /api/student/requests/:id or similar? No.
                        // Let's try a backend 'smart-approve' later?
                        // For now, let's just try to fetch the request status using a specific GET.
                        // Note: We don't have a generic GET /api/requests/:id for staff/hod implemented exposed nicely.

                        // workaround: GET /api/queue should have it if it's pending.
                        const res = await axios.get('/api/queue');
                        const req = res.data.find(r => r.id === parseInt(id));

                        if (req) {
                            let nextStatus = 'approved_staff';
                            if (req.status === 'approved_staff') nextStatus = 'approved_hod';

                            await axios.put(`/api/queue/${id}/status`, { status: nextStatus });
                        } else {
                            // Not found in queue? Maybe already approved?
                            // Try HOD queue?
                            const res2 = await axios.get('/api/queue/hod');
                            const req2 = res2.data.find(r => r.id === parseInt(id));
                            if (req2) {
                                await axios.put(`/api/queue/${id}/status`, { status: 'approved_hod' });
                            } else {
                                // Fallback: Just try 'approved_staff' if pending, else 'approved_hod'
                                // Worst case it fails. 
                                throw new Error('Request not found or already processed');
                            }
                        }
                    } else if (user.role === 'warden') {
                        // Warden approves to 'approved_warden'
                        await axios.put(`/api/queue/${id}/status`, { status: 'approved_warden' });
                    }

                    showToast('Request Approved', 'Action completed successfully.', 'success');
                }

                // Redirect
                if (user.role === 'student') navigate('/student/dashboard');
                else if (user.role === 'staff') navigate('/staff/queue');
                else if (user.role === 'hod') navigate('/hod/requests');
                else if (user.role === 'warden') navigate('/warden/verify');
                else navigate('/');

            } catch (err) {
                console.error(err);
                showToast('Action Failed', err.response?.data?.message || 'Could not complete action', 'error');
                navigate('/');
            } finally {
                setProcessing(false);
            }
        };

        handleAction();
    }, [user, action, id, navigate]);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900">
            <Loader className="w-10 h-10 text-primary-600 animate-spin mb-4" />
            <h2 className="text-lg font-bold text-slate-700 dark:text-white">Processing Action...</h2>
        </div>
    );
};

export default ActionHandler;
