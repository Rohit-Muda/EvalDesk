import { useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
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

  const errorMessages = {
    auth_failed: '❌ Authentication failed. Please try again.',
    no_email: '❌ Could not retrieve email from Google. Please try again.',
    domain_not_allowed: '⚠️ Your email domain is not allowed for this event.'
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-100">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
        <h1 className="text-2xl font-bold text-slate-800 text-center mb-2">EvalDesk</h1>
        <p className="text-slate-500 text-center text-sm mb-6">University event evaluation</p>
        
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
            {errorMessages[error] || 'An error occurred. Please try again.'}
          </div>
        )}

        <a
          href={googleUrl}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-800 text-white py-3 px-4 font-medium hover:bg-slate-700 transition active:scale-95"
        >
          Sign in with Google
        </a>

        <div className="mt-6 pt-6 border-t border-slate-200 text-center text-xs text-slate-600">
          <p>By signing in, you agree to our Terms & Conditions</p>
        </div>

        <div className="mt-4 text-center">
          <Link to="/" className="text-slate-500 hover:text-slate-700 text-sm font-medium">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}