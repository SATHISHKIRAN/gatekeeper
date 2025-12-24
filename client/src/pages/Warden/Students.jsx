import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Search, User, Mail, Phone, Home, Filter, X
} from 'lucide-react';
import Modal from '../../components/Modal';

const WardenStudents = () => {
    const [view, setView] = useState('assigned'); // 'assigned' | 'unassigned'
    const [students, setStudents] = useState([]);
    const [unassignedStudents, setUnassignedStudents] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [studentProfile, setStudentProfile] = useState(null);
    const [profileLoading, setProfileLoading] = useState(false);
    const [filterHostel, setFilterHostel] = useState('all');

    useEffect(() => {
        fetchData();
    }, [view]);

    const fetchData = async () => {
        setLoading(true);
        try {
            if (view === 'assigned') {
                const res = await axios.get('/api/warden/students');
                setStudents(res.data);
            } else {
                const res = await axios.get('/api/warden/unassigned-students');
                setUnassignedStudents(res.data);
            }
        } catch (err) {
            console.error('Failed to fetch students', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchProfile = async (id) => {
        setProfileLoading(true);
        try {
            const res = await axios.get(`/api/warden/students/${id}`);
            setStudentProfile(res.data);
        } catch (err) {
            console.error('Profile fetch error', err);
        } finally {
            setProfileLoading(false);
        }
    };

    const handleAssignStudent = async (studentId) => {
        try {
            await axios.post('/api/warden/assign-student', { student_id: studentId });
            // Refresh list
            fetchData();
        } catch (err) {
            alert('Failed to assign student');
        }
    };

    const [removalCandidate, setRemovalCandidate] = useState(null);

    const handleRemoveClick = (student, e) => {
        if (e) {
            e.stopPropagation();
            e.preventDefault();
        }
        setRemovalCandidate(student);
    };

    const confirmRemoval = async () => {
        console.log("Confirm Removal Clicked. Candidate:", removalCandidate);
        if (!removalCandidate || !removalCandidate.id) {
            alert("Error: Invalid student data selected for removal.");
            return;
        }

        try {
            const response = await axios.post('/api/warden/remove-student', { student_id: removalCandidate.id });
            console.log("Remove Response:", response.data);

            // Refresh
            setRemovalCandidate(null);
            fetchData();
            alert('Student removed successfully!');
        } catch (err) {
            console.error("Remove failed:", err);
            const errMsg = err.response?.data?.message || err.message;
            alert('Failed to remove student: ' + errMsg);
        }
    };

    const handleSelectStudent = (student) => {
        // Prevent opening modal if clicking remove button (handled by stopPropagation, but redundancy helps)
        setSelectedStudent(student);
        fetchProfile(student.id);
    };

    const displayList = view === 'assigned' ? students : unassignedStudents;

    const filteredStudents = displayList.filter(s => {
        const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (s.room_number && s.room_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (s.register_number && s.register_number.toLowerCase().includes(searchTerm.toLowerCase()));

        // Hostel filter only relevant for assigned view if warden manages multiple blocks (uncommon but possible)
        const matchesHostel = view === 'unassigned' || filterHostel === 'all' || s.hostel_name === filterHostel;

        return matchesSearch && matchesHostel;
    });

    const hostels = [...new Set(students.map(s => s.hostel_name).filter(Boolean))];

    return (
        <div className="space-y-6 pb-20">
            {/* Header & Filters ... */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Students</h1>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Manage hostel residents</p>
                </div>
                {/* ... Toggle ... */}
                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
                    <button
                        onClick={() => setView('assigned')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${view === 'assigned'
                            ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                            }`}
                    >
                        My Students
                    </button>
                    <button
                        onClick={() => setView('unassigned')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${view === 'unassigned'
                            ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                            }`}
                    >
                        Unassigned Pool
                    </button>
                </div>
            </div>

            {/* Filter & Search Bar ... */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search by name, reg number..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                    />
                </div>

                {view === 'assigned' && hostels.length > 1 && (
                    <div className="relative min-w-[200px]">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <select
                            value={filterHostel}
                            onChange={(e) => setFilterHostel(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                        >
                            <option value="all">All Hostels</option>
                            {hostels.map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                    </div>
                )}
            </div>

            {/* Students Grid */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="h-48 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-lg" />
                    ))}
                </div>
            ) : filteredStudents.length === 0 ? (
                <div className="bg-white dark:bg-slate-800 py-20 rounded-lg border border-slate-200 dark:border-slate-700 text-center">
                    <User className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-sm text-slate-500">No students found</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredStudents.map((student) => (
                        <div
                            key={student.id}
                            onClick={() => view === 'assigned' && handleSelectStudent(student)} // Only open profile for assigned students for now
                            className={`bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700 transition-all group relative ${view === 'assigned' ? 'cursor-pointer hover:border-indigo-500 hover:shadow-md' : ''}`}
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-semibold text-lg">
                                        {student.name.charAt(0)}
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors">{student.name}</h3>
                                        <div className="flex gap-2 text-xs text-slate-500">
                                            <span>{student.register_number}</span>
                                            {student.year && <span>• Year {student.year}</span>}
                                        </div>
                                    </div>
                                </div>

                                {/* Status/Action Badge */}
                                {view === 'assigned' ? (
                                    <div className="flex flex-col items-end gap-2">
                                        <span className={`px-2 py-1 rounded text-xs font-medium ${student.room_number
                                            ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                                            : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                                            }`}>
                                            {student.room_number || 'Unassigned'}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={(e) => handleRemoveClick(student, e)}
                                            className="relative z-10 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all bg-slate-100 text-slate-500 hover:bg-red-50 hover:text-red-600 dark:bg-slate-700 dark:text-slate-400 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleAssignStudent(student.id); }}
                                        className="px-3 py-1.5 bg-emerald-100 text-emerald-700 hover:bg-emerald-600 hover:text-white rounded-lg text-xs font-bold transition-colors"
                                    >
                                        + Assign
                                    </button>
                                )}
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                                    <Mail className="w-4 h-4" />
                                    <span className="truncate">{student.email}</span>
                                </div>
                                {student.phone && (
                                    <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                                        <Phone className="w-4 h-4" />
                                        <span>{student.phone}</span>
                                    </div>
                                )}

                                {view === 'assigned' && (
                                    <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                                        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                                            <Home className="w-4 h-4" />
                                            <span className="truncate max-w-[120px]">{student.hostel_name}</span>
                                        </div>

                                    </div>
                                )}

                                {view === 'unassigned' && (
                                    <div className="flex items-center gap-2 text-sm text-slate-500 mt-2">
                                        <span className="bg-slate-100 px-2 py-1 rounded text-xs">{student.department_name || 'No Dept'}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Confirmation Modal */}
            <Modal
                isOpen={!!removalCandidate}
                onClose={() => setRemovalCandidate(null)}
                title="Confirm Removal"
                maxWidth="max-w-md"
            >
                <div className="p-6">
                    <p className="text-slate-600 dark:text-slate-400 mb-6">
                        Are you sure you want to remove <strong className="text-slate-900 dark:text-white">{removalCandidate?.name}</strong> from the hostel?
                        This will unassign them from Room {removalCandidate?.room_number}.
                    </p>
                    <div className="flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={() => setRemovalCandidate(null)}
                            className="px-4 py-2 text-slate-600 dark:text-slate-400 font-medium hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={confirmRemoval}
                            className="px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 shadow-lg shadow-red-600/20 transition-all"
                        >
                            Yes, Remove
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Profile Modal */}
            <Modal
                isOpen={!!selectedStudent}
                onClose={() => { setSelectedStudent(null); setStudentProfile(null); }}
                title="Student Profile"
                maxWidth="max-w-3xl"
            >
                {profileLoading ? (
                    <div className="p-12 text-center">
                        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-sm text-slate-500">Loading profile...</p>
                    </div>
                ) : studentProfile && (
                    <div className="p-6 space-y-6">
                        {/* Header */}
                        <div className="flex items-center gap-4 pb-6 border-b border-slate-200 dark:border-slate-700">
                            <div className="w-16 h-16 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 text-2xl font-bold">
                                {studentProfile.student.name.charAt(0)}
                            </div>
                            <div className="flex-1">
                                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{studentProfile.student.name}</h2>
                                <div className="flex items-center gap-3 mt-2">
                                    <span className="text-sm text-slate-600 dark:text-slate-400">{studentProfile.student.email}</span>
                                    {studentProfile.student.department_name && (
                                        <>
                                            <span className="text-slate-300">•</span>
                                            <span className="text-sm text-slate-600 dark:text-slate-400">{studentProfile.student.department_name}</span>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Details Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Personal Information</h3>
                                <div className="space-y-3">
                                    <DetailRow label="Hostel" value={studentProfile.student.hostel_name || 'Not assigned'} />
                                    <DetailRow label="Room Number" value={studentProfile.student.room_number || 'Not assigned'} />
                                    <DetailRow label="Phone" value={studentProfile.student.phone || 'Not provided'} />
                                    <DetailRow label="Reg Number" value={studentProfile.student.register_number} />
                                    <DetailRow label="Year" value={studentProfile.student.year} />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Academic Information</h3>
                                <div className="space-y-3">
                                    <DetailRow label="Department" value={studentProfile.student.department_name || 'Not assigned'} />
                                    <DetailRow label="Trust Score" value={studentProfile.student.trust_score} />
                                    <DetailRow label="Total Movements" value={studentProfile.history.length} />
                                </div>
                            </div>
                        </div>

                        {/* Recent History */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Recent Movement History</h3>
                            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                                {studentProfile.history.length === 0 ? (
                                    <div className="py-8 text-center text-sm text-slate-500">No movement history</div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead className="bg-slate-100 dark:bg-slate-800">
                                                <tr>
                                                    <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400">Type</th>
                                                    <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400">Reason</th>
                                                    <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400">Status</th>
                                                    <th className="px-4 py-3 text-right font-medium text-slate-600 dark:text-slate-400">Date</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                                {studentProfile.history.slice(0, 10).map(log => (
                                                    <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                                        <td className="px-4 py-3">
                                                            <span className="px-2 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded text-xs font-medium">
                                                                {log.type}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400 max-w-xs truncate">{log.reason}</td>
                                                        <td className="px-4 py-3">
                                                            <span className={`px-2 py-1 rounded text-xs font-medium ${log.status === 'completed' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' :
                                                                log.status === 'rejected' ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400' :
                                                                    'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                                                                }`}>
                                                                {log.status}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-400">
                                                            {new Date(log.created_at).toLocaleDateString()}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

const DetailRow = ({ label, value }) => (
    <div className="flex items-center justify-between py-2 border-b border-slate-200 dark:border-slate-700">
        <span className="text-sm text-slate-600 dark:text-slate-400">{label}</span>
        <span className="text-sm font-medium text-slate-900 dark:text-white">{value}</span>
    </div>
);

export default WardenStudents;
