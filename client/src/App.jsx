import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import EventTeams from './pages/EventTeams';
import JuryAllocation from './pages/JuryAllocation';
import JuryDashboard from './pages/JuryDashboard';
import ScorePage from './pages/ScorePage';
import LiveTracking from './pages/LiveTracking';

function Protected({ children, roles }) {
  const { user, loading } = useAuth();
  
  // FIX #1: While loading, render nothing (let AuthProvider handle it)
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-slate-300 border-t-slate-600 rounded-full" />
      </div>
    );
  }

  // FIX #2: Not authenticated - redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // FIX #3: Role check - redirect only if roles specified AND user doesn't have role
  if (roles && roles.length > 0 && !roles.includes(user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Access Denied</h1>
          <p className="text-slate-600 mb-4">Your role ({user.role}) doesn't have permission to access this page.</p>
          <p className="text-slate-500 text-sm">Please contact your administrator.</p>
        </div>
      </div>
    );
  }

  return children;
}

export default function App() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/score/:qrToken" element={<ScorePage />} />

      {/* Protected Routes */}
      <Route
        path="/"
        element={
          <Protected>
            <Layout />
          </Protected>
        }
      >
        {/* Admin Routes */}
        <Route
          path="admin"
          element={
            <Protected roles={['admin']}>
              <AdminDashboard />
            </Protected>
          }
        />
        <Route
          path="admin/events/:eventId/teams"
          element={
            <Protected roles={['admin']}>
              <EventTeams />
            </Protected>
          }
        />
        <Route
          path="admin/events/:eventId/jury"
          element={
            <Protected roles={['admin']}>
              <JuryAllocation />
            </Protected>
          }
        />
        <Route
          path="admin/events/:eventId/tracking"
          element={
            <Protected roles={['admin']}>
              <LiveTracking />
            </Protected>
          }
        />

        {/* Jury Routes */}
        <Route
          path="jury"
          element={
            <Protected roles={['jury', 'admin']}>
              <JuryDashboard />
            </Protected>
          }
        />

        {/* Catch-all */}
        <Route index element={<Navigate to="/admin" replace />} />
      </Route>

      {/* Catch all unmatched routes */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}