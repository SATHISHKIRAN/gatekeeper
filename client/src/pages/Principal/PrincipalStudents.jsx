import React from 'react';
import AdminStudents from '@/pages/Admin/Students';

// Reuse Admin Student View but we might want to pass a 'readOnly' prop in future
// For now, Principal gets full access as requested ("can do with all same as admin")
const PrincipalStudents = () => {
    return (
        <div className="animate-fade-in-up space-y-4">
            <div className="bg-gradient-to-r from-blue-600 to-cyan-600 p-6 rounded-2xl text-white shadow-lg">
                <h1 className="text-2xl font-black">Student 360°</h1>
                <p className="opacity-90">Complete academic and disciplinary history viewer.</p>
            </div>
            <AdminStudents />
        </div>
    );
};

export default PrincipalStudents;
