import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useEffect } from 'react';

export default function Home() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  // If logged in, redirect to dashboard
  useEffect(() => {
    if (!loading && user) {
      navigate(user.role === 'admin' ? '/admin' : '/jury', { replace: true });
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="animate-spin w-12 h-12 border-4 border-white border-t-blue-500 rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000" />
      <div className="absolute -bottom-8 left-20 w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000" />

      {/* Navigation */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-4 md:px-12 md:py-6 backdrop-blur-md bg-slate-900/30 border-b border-slate-700/30">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center font-bold text-lg">
            E
          </div>
          <span className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            EvalDesk
          </span>
        </div>
        <Link
          to="/login"
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/50"
        >
          Sign In
        </Link>
      </nav>

      {/* Main Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 py-20 md:py-32">
        {/* Hero Section */}
        <div className="text-center mb-20 animate-fade-in">
          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
            <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Smart Evaluation
            </span>
            <br />
            <span className="text-slate-100">Made Simple</span>
          </h1>
          <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto leading-relaxed">
            EvalDesk streamlines university event evaluations with QR-based scoring, 
            real-time tracking, and intelligent jury allocation.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/login"
              className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 hover:shadow-lg hover:shadow-blue-500/50 text-lg"
            >
              Get Started
            </Link>
            <a
              href="#features"
              className="px-8 py-4 border-2 border-slate-400 hover:border-blue-400 hover:bg-slate-800/50 rounded-lg font-semibold transition-all duration-200"
            >
              Learn More
            </a>
          </div>
        </div>

        {/* Features Section */}
        <div id="features" className="grid md:grid-cols-3 gap-8 mb-20">
          {[
            {
              icon: '📊',
              title: 'Real-Time Tracking',
              description: 'Monitor evaluation progress with live dashboards and per-judge metrics'
            },
            {
              icon: '📱',
              title: 'QR-Based Scoring',
              description: 'Judges score teams via QR codes on mobile devices for seamless evaluation'
            },
            {
              icon: '⚡',
              title: 'Smart Allocation',
              description: 'Automatically assign judges to teams with domain and capacity constraints'
            },
            {
              icon: '🔐',
              title: 'Secure & Private',
              description: 'Google OAuth authentication with role-based access control'
            },
            {
              icon: '📈',
              title: 'Detailed Analytics',
              description: 'Export results and analyze performance by domain and judge'
            },
            {
              icon: '⚙️',
              title: 'Customizable Rubric',
              description: 'Create events with custom evaluation criteria and weights'
            }
          ].map((feature, i) => (
            <div
              key={i}
              className="group p-8 rounded-xl bg-slate-800/40 backdrop-blur border border-slate-700/50 hover:border-blue-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/20 hover:bg-slate-800/60 transform hover:-translate-y-1 animate-fade-in"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <div className="text-4xl mb-4 transition-transform duration-300 group-hover:scale-110">
                {feature.icon}
              </div>
              <h3 className="text-xl font-semibold mb-3 text-slate-100">{feature.title}</h3>
              <p className="text-slate-400">{feature.description}</p>
            </div>
          ))}
        </div>

        {/* How It Works */}
        <div className="mb-20">
          <h2 className="text-4xl font-bold text-center mb-16">How It Works</h2>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              {
                step: '1',
                title: 'Create Event',
                description: 'Set up evaluation event with custom rubric and jury team'
              },
              {
                step: '2',
                title: 'Import Teams',
                description: 'Upload CSV with participant teams and their information'
              },
              {
                step: '3',
                title: 'Allocate Judges',
                description: 'Assign judges with domain filters and team caps'
              },
              {
                step: '4',
                title: 'Start Evaluation',
                description: 'Judges score via QR codes with real-time progress tracking'
              }
            ].map((item, i) => (
              <div
                key={i}
                className="relative animate-fade-in"
                style={{ animationDelay: `${i * 150}ms` }}
              >
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-2xl font-bold mx-auto mb-4 shadow-lg shadow-blue-500/50">
                    {item.step}
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                  <p className="text-slate-400 text-sm">{item.description}</p>
                </div>
                {i < 3 && (
                  <div className="hidden md:block absolute top-8 -right-3 w-6 h-1 bg-gradient-to-r from-blue-500 to-transparent" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 backdrop-blur border border-blue-500/30 rounded-2xl p-12 md:p-16 text-center">
          <h2 className="text-4xl font-bold mb-6">Ready to streamline your evaluations?</h2>
          <p className="text-slate-300 mb-8 text-lg">
            Join universities using EvalDesk for fast, fair, and transparent event evaluations
          </p>
          <Link
            to="/login"
            className="inline-block px-10 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 hover:shadow-lg hover:shadow-blue-500/50 text-lg"
          >
            Sign In with Google
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-700/30 backdrop-blur-md bg-slate-900/30 py-8 mt-20">
        <div className="max-w-7xl mx-auto px-6 md:px-12 text-center text-slate-400">
          <p>&copy; 2026 EvalDesk. Built for modern event evaluation.</p>
        </div>
      </footer>
    </div>
  );
}