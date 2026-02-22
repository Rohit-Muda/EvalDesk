import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-10 bg-white border-b border-slate-200 px-4 py-3 safe-area-top">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <NavLink to="/dashboard" className="text-lg font-semibold text-slate-800">
            EvalDesk
          </NavLink>
          <nav className="flex items-center gap-2">
            {user?.role === 'admin' && (
              <NavLink
                to="/dashboard/admin"
                end
                className={({ isActive }) =>
                  'px-3 py-1.5 rounded-lg text-sm font-medium ' +
                  (isActive
                    ? 'bg-slate-200 text-slate-900'
                    : 'text-slate-600 hover:bg-slate-100')
                }
              >
                Admin
              </NavLink>
            )}
            {(user?.role === 'jury' || user?.role === 'admin') && (
              <NavLink
                to="/dashboard/jury"
                className={({ isActive }) =>
                  'px-3 py-1.5 rounded-lg text-sm font-medium ' +
                  (isActive
                    ? 'bg-slate-200 text-slate-900'
                    : 'text-slate-600 hover:bg-slate-100')
                }
              >
                Jury
              </NavLink>
            )}
            <span className="text-slate-500 text-sm hidden sm:inline">{user?.email}</span>
            <button
              type="button"
              onClick={handleLogout}
              className="text-sm text-slate-500 hover:text-slate-700"
            >
              Logout
            </button>
          </nav>
        </div>
      </header>
      <main className="flex-1 p-4 pb-8 max-w-4xl mx-auto w-full">
        <Outlet />
      </main>
    </div>
  );
}