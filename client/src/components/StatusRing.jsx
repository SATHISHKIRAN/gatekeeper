import React from 'react';
import { motion } from 'framer-motion';
import { Check, Clock, X, AlertTriangle } from 'lucide-react';

const StatusRing = ({ status }) => {
    const statusConfig = {
        pending: { color: 'text-yellow-500', border: 'border-yellow-500', bg: 'bg-yellow-50', icon: Clock, label: 'Pending Approval' },
        approved_staff: { color: 'text-blue-500', border: 'border-blue-500', bg: 'bg-blue-50', icon: Check, label: 'Staff Approved' },
        approved_hod: { color: 'text-indigo-500', border: 'border-indigo-500', bg: 'bg-indigo-50', icon: Check, label: 'HOD Approved' },
        approved_warden: { color: 'text-purple-500', border: 'border-purple-500', bg: 'bg-purple-50', icon: Check, label: 'Ready for Gate' },
        rejected: { color: 'text-red-500', border: 'border-red-500', bg: 'bg-red-50', icon: X, label: 'Request Rejected' },
        generated: { color: 'text-green-500', border: 'border-green-500', bg: 'bg-green-50', icon: Check, label: 'Pass Generated' },
        active: { color: 'text-blue-600', border: 'border-blue-600', bg: 'bg-blue-50', icon: Check, label: 'Student is Outside' },
        out: { color: 'text-blue-600', border: 'border-blue-600', bg: 'bg-blue-50', icon: Check, label: 'Student is Outside' },
        completed: { color: 'text-gray-500', border: 'border-gray-500', bg: 'bg-gray-50', icon: Check, label: 'Trip Completed' },
    };

    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;

    return (
        <div className="flex flex-col items-center py-8">
            <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5 }}
                className={`w-48 h-48 rounded-full border-8 ${config.border} flex items-center justify-center relative ${config.bg} shadow-lg`}
            >
                <div className="text-center">
                    <Icon className={`w-12 h-12 ${config.color} mx-auto mb-2`} />
                    <span className={`text-xl font-bold ${config.color} capitalize block`}>{config.label}</span>
                </div>
            </motion.div>
        </div>
    );
};

export default StatusRing;
