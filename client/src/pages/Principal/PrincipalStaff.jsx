import React from 'react';
import AdminStaff from '@/pages/Admin/Staff';

const PrincipalStaff = () => {
    return (
        <div className="animate-fade-in-up space-y-4">
            <div className="bg-gradient-to-r from-violet-600 to-indigo-600 p-6 rounded-2xl text-white shadow-lg">
                <h1 className="text-2xl font-black">Staff Performance & Roster</h1>
                <p className="opacity-90">Monitor staff assignments and approval queues.</p>
            </div>
            <AdminStaff />
        </div>
    );
};

export default PrincipalStaff;
