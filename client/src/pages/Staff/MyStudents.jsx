import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, Download, User, Smartphone, Mail, Shield, ChevronRight, Hash } from 'lucide-react';
import StudentDetailView from './StudentDetailView';

const StudentCard = ({ student, onViewProfile }) => (
    <motion.div
        layout
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ y: -4, transition: { duration: 0.2 } }}
        onClick={() => onViewProfile(student.id)}
        className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-slate-800 group cursor-pointer relative overflow-hidden"
    >
        <div className="absolute top-0 right-0 w-24 h-24 bg-primary-50 dark:bg-slate-800 rounded-bl-[100px] -mr-8 -mt-8 opacity-50 group-hover:scale-110 transition-transform duration-500" />

        <div className="flex justify-between items-start mb-4 relative z-10">
            <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-slate-800 flex items-center justify-center text-xl font-bold text-gray-400 dark:text-slate-500 shadow-inner">
                    {student.name.charAt(0)}
                </div>
                <div>
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-sky-400 transition-colors">
                        {student.name}
                    </h3>
                    <p className="text-xs font-medium text-gray-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                        <span className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-slate-800">
                            Year {student.year}
                        </span>
                        <span>•</span>
                        <span className="capitalize">{student.student_type?.replace('_', ' ')}</span>
                    </p>
                </div>
            </div>

            <div className={`px-2.5 py-1 rounded-lg text-xs font-bold shadow-sm ${student.trust_score >= 90 ? 'bg-green-100 text-green-700 border border-green-200' :
                    student.trust_score >= 70 ? 'bg-yellow-100 text-yellow-700 border border-yellow-200' :
                        'bg-red-100 text-red-700 border border-red-200'
                }`}>
                {student.trust_score} TS
            </div>
        </div>

        <div className="space-y-3 mb-6 relative z-10">
            <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-slate-400">
                <Mail className="w-4 h-4 text-gray-400" />
                <span className="truncate">{student.email}</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-slate-400">
                <Smartphone className="w-4 h-4 text-gray-400" />
                <span>{student.phone || 'No phone'}</span>
            </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-gray-50 dark:border-slate-800 relative z-10">
            <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Total Passes</span>
                <span className="text-xl font-bold text-gray-900 dark:text-white">{student.total_requests || 0}</span>
            </div>

            <div className="h-8 w-8 rounded-full bg-gray-50 dark:bg-slate-800 flex items-center justify-center text-gray-400 group-hover:bg-primary-600 group-hover:text-white dark:group-hover:bg-sky-500 transition-all duration-300 shadow-sm">
                <ChevronRight className="w-4 h-4" />
            </div>
        </div>
    </motion.div>
);

const MyStudents = () => {
    const [students, setStudents] = useState([]);
    const [filter, setFilter] = useState('');
    const [loading, setLoading] = useState(true);
    const [showAssignedOnly, setShowAssignedOnly] = useState(false);
    const [selectedStudentId, setSelectedStudentId] = useState(null);

    useEffect(() => {
        fetchStudents();
    }, [showAssignedOnly]);

    const fetchStudents = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`/api/staff/my-students${showAssignedOnly ? '?assigned=true' : ''}`);
            setStudents(res.data);
            setLoading(false);
        } catch (err) {
            console.error(err);
            setLoading(false);
        }
    };

    const handleExport = () => {
        const csvContent = "data:text/csv;charset=utf-8,"
            + "Name,Email,Phone,Year,Type,Trust Score,Total Requests\n"
            + students.map(s => `${s.name},${s.email},${s.phone},${s.year},${s.student_type},${s.trust_score},${s.total_requests}`).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "my_students.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const filteredStudents = students.filter(s =>
        s.name.toLowerCase().includes(filter.toLowerCase()) ||
        s.email.toLowerCase().includes(filter.toLowerCase())
    );

    return (
        <div className="space-y-8 animate-fade-in relative">
            <AnimatePresence>
                {selectedStudentId && (
                    <StudentDetailView
                        studentId={selectedStudentId}
                        onClose={() => setSelectedStudentId(null)}
                    />
                )}
            </AnimatePresence>

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Students</h1>
                    <p className="text-gray-500 dark:text-slate-400">Managing {students.length} students in your department</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => setShowAssignedOnly(!showAssignedOnly)}
                        className={`px-4 py-2 border rounded-xl font-medium shadow-sm transition-colors flex items-center gap-2 ${showAssignedOnly
                            ? 'bg-primary-600 text-white border-primary-600 hover:bg-primary-700'
                            : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700'}`}
                    >
                        <User className="w-4 h-4" />
                        {showAssignedOnly ? 'Showing My Mentees' : 'All Dept Students'}
                    </button>
                    <button
                        onClick={handleExport}
                        className="px-4 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 rounded-xl font-medium shadow-sm hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-2"
                    >
                        <Download className="w-4 h-4" /> Export CSV
                    </button>
                </div>
            </div>

            {/* Search and Filters */}
            <div className="sticky top-20 z-10 bg-gray-50/80 dark:bg-black/20 backdrop-blur-xl p-4 rounded-2xl border border-gray-200 dark:border-slate-800 flex items-center gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search students by name, email..."
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all dark:text-white"
                    />
                </div>
                <button className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
                    <Filter className="w-5 h-5" />
                </button>
            </div>

            {/* Student Grid */}
            {loading ? (
                <div className="text-center py-10 text-gray-500">Loading roster...</div>
            ) : filteredStudents.length === 0 ? (
                <div className="text-center py-20 text-gray-500">
                    <User className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p>No students found matching your search.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <AnimatePresence>
                        {filteredStudents.map(student => (
                            <StudentCard
                                key={student.id}
                                student={student}
                                onViewProfile={setSelectedStudentId}
                            />
                        ))}
                    </AnimatePresence>
                </div>
            )}
        </div>
    );
};

export default MyStudents;
