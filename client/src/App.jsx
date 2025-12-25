import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { SettingsProvider } from './context/SettingsContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';

// Placeholder Pages
import StudentDashboard from './pages/Student/Dashboard';
import StudentWallet from './pages/Student/Wallet';
import StudentHistory from './pages/Student/History';
import StudentProfile from './pages/Student/Profile';
import StaffQueue from './pages/Staff/Queue';
import StaffDashboard from './pages/Staff/Dashboard';
import StaffMyStudents from './pages/Staff/MyStudents';
import StaffAnalytics from './pages/Staff/Analytics';
import StaffHistory from './pages/Staff/History';
import StaffProfile from './pages/Staff/Profile';
import HODDashboard from './pages/HOD/Dashboard';
import HODMedical from './pages/HOD/Medical';
import HODStudents from './pages/HOD/Students';
import HODStaff from './pages/HOD/Staff';
import HODPassManagement from './pages/HOD/PassManagement';
import HODRequests from './pages/HOD/Requests';
import WardenVerify from './pages/Warden/Verify';
import GateDashboard from './pages/Gate/GateDashboard';
import AdminAnalytics from './pages/Admin/Analytics';
import AdminStudents from './pages/Admin/Students';
import WardenDashboard from './pages/Warden/Dashboard';
import WardenStudents from './pages/Warden/Students';
import AdminStaff from './pages/Admin/Staff';
import AdminDepartments from './pages/Admin/Departments';
import AdminHostels from './pages/Admin/Hostels';
import AdminNotifications from './pages/Admin/Notifications';
import WardenHistory from './pages/Warden/History';
import WardenAnalytics from './pages/Warden/Analytics';
import WardenBroadcasts from './pages/Warden/Broadcasts';

import WardenRooms from './pages/Warden/Rooms';
import AdminSystemSettings from './pages/Admin/SystemSettings';
import GatePasses from './pages/Admin/GatePasses';
import GateHistory from './pages/Gate/GateHistory';
import GateLiveMonitor from './pages/Gate/GateLiveMonitor';

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
    const { user, loading } = useAuth();

    if (loading) return <div>Loading...</div>;
    if (!user) return <Navigate to="/" />;
    if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
        return <Navigate to="/" />; // Or unauthorized page
    }

    return <Layout>{children}</Layout>;
};

function App() {
    return (
        <Router>
            <SettingsProvider>
                <AuthProvider>
                    <NotificationProvider>
                        <Routes>
                            <Route path="/" element={<Login />} />
                            <Route path="/forgot-password" element={<ForgotPassword />} />

                            <Route path="/student/dashboard" element={
                                <ProtectedRoute allowedRoles={['student']}>
                                    <StudentDashboard />
                                </ProtectedRoute>
                            } />
                            <Route path="/student/wallet" element={
                                <ProtectedRoute allowedRoles={['student']}>
                                    <StudentWallet />
                                </ProtectedRoute>
                            } />
                            <Route path="/student/history" element={
                                <ProtectedRoute allowedRoles={['student']}>
                                    <StudentHistory />
                                </ProtectedRoute>
                            } />
                            <Route path="/student/profile" element={
                                <ProtectedRoute allowedRoles={['student']}>
                                    <StudentProfile />
                                </ProtectedRoute>
                            } />


                            <Route path="/staff/queue" element={
                                <ProtectedRoute allowedRoles={['staff']}>
                                    <StaffQueue />
                                </ProtectedRoute>
                            } />
                            <Route path="/staff/dashboard" element={
                                <ProtectedRoute allowedRoles={['staff']}>
                                    <StaffDashboard />
                                </ProtectedRoute>
                            } />
                            <Route path="/staff/my-students" element={
                                <ProtectedRoute allowedRoles={['staff']}>
                                    <StaffMyStudents />
                                </ProtectedRoute>
                            } />
                            <Route path="/staff/analytics" element={
                                <ProtectedRoute allowedRoles={['staff']}>
                                    <StaffAnalytics />
                                </ProtectedRoute>
                            } />
                            <Route path="/staff/history" element={
                                <ProtectedRoute allowedRoles={['staff']}>
                                    <StaffHistory />
                                </ProtectedRoute>
                            } />
                            <Route path="/staff/profile" element={
                                <ProtectedRoute allowedRoles={['staff']}>
                                    <StaffProfile />
                                </ProtectedRoute>
                            } />
                            <Route path="/staff/gate-passes" element={
                                <ProtectedRoute allowedRoles={['staff']}>
                                    <GatePasses />
                                </ProtectedRoute>
                            } />

                            <Route path="/hod/dashboard" element={
                                <ProtectedRoute allowedRoles={['hod']}>
                                    <HODDashboard />
                                </ProtectedRoute>
                            } />
                            <Route path="/hod/medical" element={
                                <ProtectedRoute allowedRoles={['hod']}>
                                    <HODMedical />
                                </ProtectedRoute>
                            } />
                            <Route path="/hod/students" element={
                                <ProtectedRoute allowedRoles={['hod']}>
                                    <HODStudents />
                                </ProtectedRoute>
                            } />
                            <Route path="/hod/staff" element={
                                <ProtectedRoute allowedRoles={['hod']}>
                                    <HODStaff />
                                </ProtectedRoute>
                            } />
                            <Route path="/hod/pass-management" element={
                                <ProtectedRoute allowedRoles={['hod']}>
                                    <HODPassManagement />
                                </ProtectedRoute>
                            } />
                            <Route path="/hod/requests" element={
                                <ProtectedRoute allowedRoles={['hod']}>
                                    <HODRequests />
                                </ProtectedRoute>
                            } />
                            <Route path="/hod/gate-passes" element={
                                <ProtectedRoute allowedRoles={['hod']}>
                                    <GatePasses />
                                </ProtectedRoute>
                            } />

                            <Route path="/warden/verify" element={
                                <ProtectedRoute allowedRoles={['warden']}>
                                    <WardenVerify />
                                </ProtectedRoute>
                            } />
                            <Route path="/warden/dashboard" element={
                                <ProtectedRoute allowedRoles={['warden']}>
                                    <WardenDashboard />
                                </ProtectedRoute>
                            } />
                            <Route path="/warden/students" element={
                                <ProtectedRoute allowedRoles={['warden']}>
                                    <WardenStudents />
                                </ProtectedRoute>
                            } />
                            <Route path="/warden/history" element={
                                <ProtectedRoute allowedRoles={['warden']}>
                                    <WardenHistory />
                                </ProtectedRoute>
                            } />
                            <Route path="/warden/analytics" element={
                                <ProtectedRoute allowedRoles={['warden']}>
                                    <WardenAnalytics />
                                </ProtectedRoute>
                            } />
                            <Route path="/warden/broadcasts" element={
                                <ProtectedRoute allowedRoles={['warden']}>
                                    <WardenBroadcasts />
                                </ProtectedRoute>
                            } />
                            <Route path="/warden/rooms" element={
                                <ProtectedRoute allowedRoles={['warden']}>
                                    <WardenRooms />
                                </ProtectedRoute>
                            } />
                            <Route path="/warden/gate-passes" element={
                                <ProtectedRoute allowedRoles={['warden']}>
                                    <GatePasses />
                                </ProtectedRoute>
                            } />

                            <Route path="/gate/dashboard" element={
                                <ProtectedRoute allowedRoles={['gatekeeper']}>
                                    <GateDashboard />
                                </ProtectedRoute>
                            } />
                            <Route path="/gate/monitor" element={
                                <ProtectedRoute allowedRoles={['gatekeeper']}>
                                    <GateLiveMonitor />
                                </ProtectedRoute>
                            } />
                            <Route path="/gate/history" element={
                                <ProtectedRoute allowedRoles={['gatekeeper']}>
                                    <GateHistory />
                                </ProtectedRoute>
                            } />

                            <Route path="/admin/analytics" element={
                                <ProtectedRoute allowedRoles={['admin']}>
                                    <AdminAnalytics />
                                </ProtectedRoute>
                            } />
                            <Route path="/admin/gate-passes" element={
                                <ProtectedRoute allowedRoles={['admin']}>
                                    <GatePasses />
                                </ProtectedRoute>
                            } />
                            <Route path="/admin/students" element={
                                <ProtectedRoute allowedRoles={['admin']}>
                                    <AdminStudents />
                                </ProtectedRoute>
                            } />
                            <Route path="/admin/staff" element={
                                <ProtectedRoute allowedRoles={['admin']}>
                                    <AdminStaff />
                                </ProtectedRoute>
                            } />
                            <Route path="/admin/departments" element={
                                <ProtectedRoute allowedRoles={['admin']}>
                                    <AdminDepartments />
                                </ProtectedRoute>
                            } />
                            <Route path="/admin/hostels" element={
                                <ProtectedRoute allowedRoles={['admin']}>
                                    <AdminHostels />
                                </ProtectedRoute>
                            } />
                            <Route path="/admin/notifications" element={
                                <ProtectedRoute allowedRoles={['admin']}>
                                    <AdminNotifications />
                                </ProtectedRoute>
                            } />
                            <Route path="/admin/settings" element={
                                <ProtectedRoute allowedRoles={['admin']}>
                                    <AdminSystemSettings />
                                </ProtectedRoute>
                            } />
                        </Routes>
                        <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
                    </NotificationProvider>
                </AuthProvider>
            </SettingsProvider>
        </Router>
    );
}

export default App;
