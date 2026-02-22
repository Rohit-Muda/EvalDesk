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
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-slate-300 border-t-slate-600 rounded-full" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/score/:qrToken" element={<ScorePage />} />

      {/* Protected Dashboard Routes */}
      <Route path="/dashboard" element={<Protected><Layout /></Protected>}>
        <Route index element={<Navigate to="/dashboard/admin" replace />} />
        
        {/* Admin Routes */}
        <Route path="admin" element={<Protected roles={['admin']}><AdminDashboard /></Protected>} />
        <Route path="admin/events/:eventId/teams" element={<Protected roles={['admin']}><EventTeams /></Protected>} />
        <Route path="admin/events/:eventId/jury" element={<Protected roles={['admin']}><JuryAllocation /></Protected>} />
        <Route path="admin/events/:eventId/tracking" element={<Protected roles={['admin']}><LiveTracking /></Protected>} />

        {/* Jury Routes */}
        <Route path="jury" element={<Protected roles={['jury', 'admin']}><JuryDashboard /></Protected>} />
      </Route>

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}