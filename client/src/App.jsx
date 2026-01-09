import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { SettingsProvider } from './context/SettingsContext';
import { SocketProvider } from './context/SocketContext';
import Layout from './components/Layout';
import LoadingSpinner from './components/LoadingSpinner';

// Eager load critical auth pages
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ActionHandler from './components/ActionHandler';

// Lazy load all other pages
const StudentDashboard = lazy(() => import('./pages/Student/Dashboard'));
const StudentHistory = lazy(() => import('./pages/Student/History'));
const StudentProfile = lazy(() => import('./pages/Student/Profile'));

const StaffQueue = lazy(() => import('./pages/Staff/Queue'));
const StaffDashboard = lazy(() => import('./pages/Staff/Dashboard'));
const MedicalOverride = lazy(() => import('./pages/Staff/MedicalOverride'));
const StaffMyStudents = lazy(() => import('./pages/Staff/MyStudents'));
const StaffAnalytics = lazy(() => import('./pages/Staff/Analytics'));
const StaffHistory = lazy(() => import('./pages/Staff/History'));
const StaffProfile = lazy(() => import('./pages/Staff/Profile'));
const StaffReports = lazy(() => import('./pages/Staff/Reports'));


const HODDashboard = lazy(() => import('./pages/HOD/Dashboard'));
const HODMedical = lazy(() => import('./pages/HOD/Medical'));
const HODStudents = lazy(() => import('./pages/HOD/Students'));
const HODStaff = lazy(() => import('./pages/HOD/Staff'));
const HODPassManagement = lazy(() => import('./pages/HOD/PassManagement'));
const HODRequests = lazy(() => import('./pages/HOD/Requests'));
const HODReports = lazy(() => import('./pages/HOD/Reports'));
const HODProfile = lazy(() => import('./pages/HOD/Profile'));

const WardenVerify = lazy(() => import('./pages/Warden/Verify'));
const WardenDashboard = lazy(() => import('./pages/Warden/Dashboard'));
const WardenStudents = lazy(() => import('./pages/Warden/Students'));
const WardenProfile = lazy(() => import('./pages/Warden/Profile'));
const WardenRooms = lazy(() => import('./pages/Warden/Rooms'));
const WardenReports = lazy(() => import('./pages/Warden/Reports'));
const WardenHistory = lazy(() => import('./pages/Warden/History'));
const WardenAnalytics = lazy(() => import('./pages/Warden/Analytics'));


const GateDashboard = lazy(() => import('./pages/Gate/GateDashboard'));
const GateHistory = lazy(() => import('./pages/Gate/GateHistory'));
const GateLiveMonitor = lazy(() => import('./pages/Gate/GateLiveMonitor'));
const VisitorManagement = lazy(() => import('./pages/Gate/VisitorManagement'));
const GateProfile = lazy(() => import('./pages/Gate/GateProfile'));
const GateReports = lazy(() => import('./pages/Gate/GateReports'));
const Calendar = lazy(() => import('./pages/Shared/Calendar'));

const AdminAnalytics = lazy(() => import('./pages/Admin/Analytics'));
const AdminStudents = lazy(() => import('./pages/Admin/Students'));
const AdminStaff = lazy(() => import('./pages/Admin/Staff'));
const AdminDepartments = lazy(() => import('./pages/Admin/Departments'));
const AdminHostels = lazy(() => import('./pages/Admin/Hostels'));
const AdminNotifications = lazy(() => import('./pages/Admin/Notifications'));
const AdminSystemSettings = lazy(() => import('./pages/Admin/SystemControlCenter/SystemControlCenter'));
const AdminReports = lazy(() => import('./pages/Admin/Reports'));
const AdminPolicyManager = lazy(() => import('./pages/Admin/PolicyManager'));
const AdminProfile = lazy(() => import('./pages/Admin/Profile'));
const GatePasses = lazy(() => import('./pages/Admin/GatePasses'));
const AdminBroadcast = lazy(() => import('./pages/Principal/Broadcast'));

const PrincipalDashboard = lazy(() => import('./pages/Principal/Dashboard'));
const PrincipalAnalytics = lazy(() => import('./pages/Principal/Analytics'));
const PrincipalStudents = lazy(() => import('./pages/Principal/PrincipalStudents'));
const PrincipalStaff = lazy(() => import('./pages/Principal/PrincipalStaff'));
const PrincipalBroadcast = lazy(() => import('./pages/Principal/Broadcast'));
const PrincipalProfile = lazy(() => import('./pages/Principal/Profile'));
const PrincipalReports = lazy(() => import('./pages/Principal/Reports'));

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
    const { user, loading } = useAuth();

    if (loading) return <LoadingSpinner />;
    if (!user) return <Navigate to="/" />;
    if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
        return <Navigate to="/" />;
    }

    return <Layout>{children}</Layout>;
};


function App() {
    return (
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <SettingsProvider>
                <AuthProvider>
                    <SocketProvider>
                        <NotificationProvider>
                            <Suspense fallback={<LoadingSpinner />}>
                                <Routes>
                                    <Route path="/" element={<Login />} />
                                    <Route path="/forgot-password" element={<ForgotPassword />} />
                                    <Route path="/action/:action/:id" element={<ActionHandler />} />
                                    <Route path="/calendar" element={<ProtectedRoute><Calendar /></ProtectedRoute>} />

                                    {/* Student Routes */}
                                    <Route path="/student/dashboard" element={<ProtectedRoute allowedRoles={['student']}><StudentDashboard /></ProtectedRoute>} />
                                    <Route path="/student/history" element={<ProtectedRoute allowedRoles={['student']}><StudentHistory /></ProtectedRoute>} />
                                    <Route path="/student/profile" element={<ProtectedRoute allowedRoles={['student']}><StudentProfile /></ProtectedRoute>} />

                                    {/* Staff Routes */}
                                    <Route path="/staff/queue" element={<ProtectedRoute allowedRoles={['staff']}><StaffQueue /></ProtectedRoute>} />
                                    <Route path="/staff/verify" element={<ProtectedRoute allowedRoles={['staff']}><StaffQueue /></ProtectedRoute>} />
                                    <Route path="/staff/dashboard" element={<ProtectedRoute allowedRoles={['staff']}><StaffDashboard /></ProtectedRoute>} />
                                    <Route path="/staff/my-students" element={<ProtectedRoute allowedRoles={['staff']}><StaffMyStudents /></ProtectedRoute>} />
                                    <Route path="/staff/students" element={<ProtectedRoute allowedRoles={['staff']}><StaffMyStudents /></ProtectedRoute>} />
                                    <Route path="/staff/medical" element={<ProtectedRoute allowedRoles={['staff']}><MedicalOverride /></ProtectedRoute>} />
                                    <Route path="/staff/reports" element={<ProtectedRoute allowedRoles={['staff']}><StaffReports /></ProtectedRoute>} />
                                    <Route path="/staff/profile" element={<ProtectedRoute allowedRoles={['staff']}><StaffProfile /></ProtectedRoute>} />
                                    <Route path="/staff/history" element={<ProtectedRoute allowedRoles={['staff']}><StaffHistory /></ProtectedRoute>} />
                                    <Route path="/staff/gate-passes" element={<ProtectedRoute allowedRoles={['staff']}><GatePasses /></ProtectedRoute>} />

                                    {/* HOD Routes */}
                                    <Route path="/hod/dashboard" element={<ProtectedRoute allowedRoles={['hod']}><HODDashboard /></ProtectedRoute>} />
                                    <Route path="/hod/medical" element={<ProtectedRoute allowedRoles={['hod']}><HODMedical /></ProtectedRoute>} />
                                    <Route path="/hod/students" element={<ProtectedRoute allowedRoles={['hod']}><HODStudents /></ProtectedRoute>} />
                                    <Route path="/hod/staff" element={<ProtectedRoute allowedRoles={['hod']}><HODStaff /></ProtectedRoute>} />
                                    <Route path="/hod/pass-management" element={<ProtectedRoute allowedRoles={['hod']}><HODPassManagement /></ProtectedRoute>} />
                                    <Route path="/hod/requests" element={<ProtectedRoute allowedRoles={['hod']}><HODRequests /></ProtectedRoute>} />
                                    <Route path="/hod/reports" element={<ProtectedRoute allowedRoles={['hod']}><HODReports /></ProtectedRoute>} />
                                    <Route path="/hod/gate-passes" element={<ProtectedRoute allowedRoles={['hod']}><GatePasses /></ProtectedRoute>} />
                                    <Route path="/hod/profile" element={<ProtectedRoute allowedRoles={['hod']}><HODProfile /></ProtectedRoute>} />

                                    {/* Warden Routes */}
                                    <Route path="/warden/verify" element={<ProtectedRoute allowedRoles={['warden']}><WardenVerify /></ProtectedRoute>} />
                                    <Route path="/warden/dashboard" element={<ProtectedRoute allowedRoles={['warden']}><WardenDashboard /></ProtectedRoute>} />
                                    <Route path="/warden/students" element={<ProtectedRoute allowedRoles={['warden']}><WardenStudents /></ProtectedRoute>} />
                                    <Route path="/warden/history" element={<ProtectedRoute allowedRoles={['warden']}><WardenHistory /></ProtectedRoute>} />
                                    <Route path="/warden/analytics" element={<ProtectedRoute allowedRoles={['warden']}><WardenAnalytics /></ProtectedRoute>} />
                                    <Route path="/warden/rooms" element={<ProtectedRoute allowedRoles={['warden']}><WardenRooms /></ProtectedRoute>} />
                                    <Route path="/warden/reports" element={<ProtectedRoute allowedRoles={['warden']}><WardenReports /></ProtectedRoute>} />

                                    <Route path="/warden/profile" element={<ProtectedRoute allowedRoles={['warden']}><WardenProfile /></ProtectedRoute>} />

                                    {/* Gate Routes */}
                                    <Route path="/gate/dashboard" element={<ProtectedRoute allowedRoles={['gatekeeper']}><GateDashboard /></ProtectedRoute>} />
                                    <Route path="/gate/live" element={<ProtectedRoute allowedRoles={['gatekeeper']}><GateLiveMonitor /></ProtectedRoute>} />
                                    <Route path="/gate/history" element={<ProtectedRoute allowedRoles={['gatekeeper']}><GateHistory /></ProtectedRoute>} />
                                    <Route path="/gate/visitors" element={<ProtectedRoute allowedRoles={['gatekeeper', 'admin', 'principal']}><VisitorManagement /></ProtectedRoute>} />
                                    <Route path="/gate/reports" element={<ProtectedRoute allowedRoles={['gatekeeper']}><GateReports /></ProtectedRoute>} />
                                    <Route path="/gate/profile" element={<ProtectedRoute allowedRoles={['gatekeeper']}><GateProfile /></ProtectedRoute>} />

                                    {/* Admin Routes */}
                                    <Route path="/admin/gate-passes" element={<ProtectedRoute allowedRoles={['admin', 'principal']}><GatePasses /></ProtectedRoute>} />
                                    <Route path="/admin/students" element={<ProtectedRoute allowedRoles={['admin', 'principal']}><AdminStudents /></ProtectedRoute>} />
                                    <Route path="/admin/staff" element={<ProtectedRoute allowedRoles={['admin', 'principal']}><AdminStaff /></ProtectedRoute>} />
                                    <Route path="/admin/departments" element={<ProtectedRoute allowedRoles={['admin', 'principal']}><AdminDepartments /></ProtectedRoute>} />
                                    <Route path="/admin/hostels" element={<ProtectedRoute allowedRoles={['admin', 'principal']}><AdminHostels /></ProtectedRoute>} />
                                    <Route path="/admin/stats" element={<ProtectedRoute allowedRoles={['admin']}><AdminAnalytics /></ProtectedRoute>} />
                                    <Route path="/admin/notifications" element={<ProtectedRoute allowedRoles={['admin']}><AdminNotifications /></ProtectedRoute>} />
                                    <Route path="/admin/reports" element={<ProtectedRoute allowedRoles={['admin']}><AdminReports /></ProtectedRoute>} />
                                    <Route path="/admin/system" element={<ProtectedRoute allowedRoles={['admin']}><AdminSystemSettings /></ProtectedRoute>} />
                                    <Route path="/admin/policies" element={<ProtectedRoute allowedRoles={['admin']}><AdminPolicyManager /></ProtectedRoute>} />
                                    <Route path="/admin/profile" element={<ProtectedRoute allowedRoles={['admin']}><AdminProfile /></ProtectedRoute>} />
                                    <Route path="/admin/broadcasts" element={<ProtectedRoute allowedRoles={['admin']}><AdminBroadcast /></ProtectedRoute>} />

                                    {/* Principal Routes */}
                                    <Route path="/principal/dashboard" element={<ProtectedRoute allowedRoles={['principal']}><PrincipalDashboard /></ProtectedRoute>} />
                                    <Route path="/principal/reports" element={<ProtectedRoute allowedRoles={['principal']}><PrincipalReports /></ProtectedRoute>} />
                                    <Route path="/principal/gate-passes" element={<ProtectedRoute allowedRoles={['principal']}><GatePasses /></ProtectedRoute>} />
                                    <Route path="/principal/analytics" element={<ProtectedRoute allowedRoles={['principal']}><PrincipalAnalytics /></ProtectedRoute>} />
                                    <Route path="/principal/students" element={<ProtectedRoute allowedRoles={['principal']}><PrincipalStudents /></ProtectedRoute>} />
                                    <Route path="/principal/staff" element={<ProtectedRoute allowedRoles={['principal']}><PrincipalStaff /></ProtectedRoute>} />
                                    <Route path="/principal/broadcast" element={<ProtectedRoute allowedRoles={['principal']}><PrincipalBroadcast /></ProtectedRoute>} />
                                    <Route path="/principal/profile" element={<ProtectedRoute allowedRoles={['principal']}><PrincipalProfile /></ProtectedRoute>} />


                                </Routes>
                            </Suspense>
                            <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
                        </NotificationProvider>
                    </SocketProvider>
                </AuthProvider>
            </SettingsProvider>
        </Router>
    );
}

export default App;
