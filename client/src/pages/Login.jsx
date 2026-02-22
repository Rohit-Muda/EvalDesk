import { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const error = searchParams.get('error');

  useEffect(() => {
    if (!loading && user) {
      const redirect = searchParams.get('redirect') || '/dashboard';
      navigate(redirect, { replace: true });
    }
  }, [user, loading, navigate, searchParams]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="animate-spin w-8 h-8 border-2 border-slate-300 border-t-slate-600 rounded-full" />
      </div>
    );
  }

  const apiBase = import.meta.env.VITE_API_URL || '';
  const eventId = searchParams.get('eventId') || '';
  const qs = eventId ? '?eventId=' + encodeURIComponent(eventId) : '';
  const googleUrl = (apiBase || '') + '/api/auth/google' + qs;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-100">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
        <h1 className="text-2xl font-bold text-slate-800 text-center mb-2">EvalDesk</h1>
        <p className="text-slate-500 text-center text-sm mb-6">
          University event evaluation
        </p>
        {error && (
          <p className="text-amber-600 text-sm text-center mb-4 bg-amber-50 rounded-lg p-3">
            {error === 'domain_not_allowed'
              ? 'Login restricted to configured domains.'
              : 'Authentication failed.'}
          </p>
        )}
        <a
          href={googleUrl}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-800 text-white py-3 px-4 font-medium hover:bg-slate-700 transition"
        >
          Sign in with Google
        </a>
      </div>
    </div>
  );
}