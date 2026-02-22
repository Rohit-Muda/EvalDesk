import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Home from './pages/Home';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import EventTeams from './pages/EventTeams';
import JuryAllocation from './pages/JuryAllocation';
import JuryDashboard from './pages/JuryDashboard';
import ScorePage from './pages/ScorePage';
import LiveTracking from './pages/LiveTracking';

function Protected({ children, roles }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="animate-spin w-12 h-12 border-4 border-white border-t-blue-500 rounded-full" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (roles && roles.length > 0 && !roles.includes(user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-3">Access Denied</h1>
          <p className="text-slate-300 mb-2">Your role ({user.role}) doesn't have permission to access this page.</p>
          <p className="text-slate-500 text-sm">Please contact your administrator.</p>
        </div>
      </div>
    );
  }

  return children;
}

export default function App() {
  const { user, loading } = useAuth();

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/score/:qrToken" element={<ScorePage />} />

      {/* Protected Routes */}
      <Route
        path="/dashboard"
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
        <Route
          index
          element={
            <Navigate
              to={
                !loading && user
                  ? user.role === 'admin'
                    ? '/dashboard/admin'
                    : user.role === 'jury'
                    ? '/dashboard/jury'
                    : '/dashboard/jury'
                  : '/login'
              }
              replace
            />
          }
        />
      </Route>

      {/* Catch all unmatched routes */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}