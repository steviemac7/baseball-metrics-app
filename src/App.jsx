import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Layout from './components/Layout';
import AdminDashboard from './pages/AdminDashboard';
import UserProfile from './pages/UserProfile';
import SummaryStats from './pages/SummaryStats';
import BulkMetricEntry from './pages/BulkMetricEntry';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/login" />;

  return children;
};

const Dashboard = () => {
  const { user } = useAuth();
  if (user.role === 'ADMIN') {
    return <AdminDashboard />;
  }
  // Regular user views their own profile (handled by UserProfile checking context/params)
  // We pass no ID so it defaults to current user
  return <UserProfile />;
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route path="/" element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        <Route index element={<Dashboard />} />
        <Route path="user/:id" element={<UserProfile />} />
        <Route path="stats" element={<SummaryStats />} />
        <Route path="admin/bulk-entry" element={<BulkMetricEntry />} />
      </Route>
    </Routes>
  );
};

import ErrorBoundary from './components/ErrorBoundary';

import { useEffect } from 'react';

import { seedAdmin } from './seedAdmin';

function App() {
  useEffect(() => {
    seedAdmin();
  }, []);
  // Warm up GPS on launch
  useEffect(() => {
    let watchId;
    if ('geolocation' in navigator) {
      // We don't do anything with the data here, just keeping the radio active
      watchId = navigator.geolocation.watchPosition(
        () => { },
        (err) => console.debug('GPS Warmup ignored:', err.message),
        { enableHighAccuracy: true, maximumAge: 0 }
      );
    }
    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
