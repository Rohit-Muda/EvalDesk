import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { events, jury } from '../lib/api';
import { useToast } from '../components/Toast';

export default function JuryDashboard() {
  const [eventList, setEventList] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { addToast } = useToast();

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      const data = await events.list();
      setEventList(data);
      setError(null);
    } catch (err) {
      setError('Failed to load events');
      addToast('Failed to load events', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedEventId) {
      setTeams([]);
      return;
    }

    const loadTeams = async () => {
      try {
        const data = await jury.myTeams(selectedEventId);
        setTeams(data || []);
        setError(null);
      } catch (err) {
        setError('Failed to load teams');
        addToast('Failed to load teams', 'error');
        setTeams([]);
      }
    };

    loadTeams();
  }, [selectedEventId, addToast]);

  const statusClass = (s) => {
    if (s === 'evaluated') return 'badge-success';
    if (s === 'absent') return 'badge-warning';
    return 'badge-info';
  };

  const statusLabel = (s) => s === 'evaluated' ? '✓ Evaluated' : s === 'absent' ? '⊘ Absent' : '⏱ Pending';

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="spinner-lg" />
      </div>
    );
  }

  const evaluatedCount = teams.filter(t => t.status === 'evaluated').length;
  const absentCount = teams.filter(t => t.status === 'absent').length;
  const pendingCount = teams.filter(t => t.status === 'pending').length;

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">My Teams</h1>
        <p className="text-slate-600">Evaluate assigned teams</p>
      </div>

      {/* Event Selector */}
      <div className="mb-8">
        <label className="block text-sm font-semibold text-slate-700 mb-3">
          Select Event
        </label>
        <select
          value={selectedEventId}
          onChange={e => setSelectedEventId(e.target.value)}
          className="select-field max-w-md"
        >
          <option value="">Choose an event...</option>
          {eventList.map(ev => (
            <option key={ev._id} value={ev._id}>
              {ev.name}
            </option>
          ))}
        </select>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
          {error}
        </div>
      )}

      {/* Stats */}
      {selectedEventId && (
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Evaluated', count: evaluatedCount, color: 'emerald' },
            { label: 'Pending', count: pendingCount, color: 'amber' },
            { label: 'Absent', count: absentCount, color: 'red' }
          ].map(stat => (
            <div
              key={stat.label}
              className={`card p-4 border-l-4 border-${stat.color}-500 animate-fade-in`}
            >
              <p className={`text-sm font-semibold text-${stat.color}-700`}>{stat.label}</p>
              <p className="text-3xl font-bold text-slate-900">{stat.count}</p>
            </div>
          ))}
        </div>
      )}

      {/* Teams List */}
      {selectedEventId && (
        <>
          {teams.length === 0 ? (
            <div className="text-center py-12 card">
              <div className="text-5xl mb-4">📭</div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">No teams assigned</h3>
              <p className="text-slate-600">
                You haven't been assigned any teams for this event yet
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {teams.map((t, i) => (
                <div
                  key={t._id}
                  className="card card-hover p-5 animate-fade-in"
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex-1">
                      <h4 className="text-lg font-semibold text-slate-900 mb-1">
                        {t.name}
                      </h4>
                      <p className="text-sm text-slate-600">
                        {t.project || '—'} • {t.domain || '—'}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className={`badge ${statusClass(t.status)}`}>
                        {statusLabel(t.status)}
                      </span>
                      <Link
                        to={'/score/' + t.qrToken}
                        className="btn-primary btn-sm"
                      >
                        Score
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}