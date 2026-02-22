import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { events, jury } from '../lib/api';

export default function JuryDashboard() {
  const [eventList, setEventList] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [teamError, setTeamError] = useState(null);

  useEffect(() => {
    events.list()
      .then(data => {
        setEventList(data);
        setError(null);
      })
      .catch(err => {
        setError('Failed to load events: ' + err.message);
        setEventList([]);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedEventId) {
      setTeams([]);
      setTeamError(null);
      return;
    }

    jury.myTeams(selectedEventId)
      .then(data => {
        setTeams(data || []);
        setTeamError(null);
      })
      .catch(err => {
        setTeamError('Failed to load teams: ' + err.message);
        setTeams([]);
      });
  }, [selectedEventId]);

  const statusClass = (s) => {
    if (s === 'evaluated') return 'bg-emerald-100 text-emerald-800';
    if (s === 'absent') return 'bg-amber-100 text-amber-800';
    return 'bg-slate-100 text-slate-600';
  };

  const statusLabel = (s) =>
    s === 'evaluated' ? '✓ Evaluated' : s === 'absent' ? '⊘ Absent' : '⏱ Pending';

  if (loading) {
    return (
      <div>
        <h1 className="text-xl font-bold text-slate-800 mb-4">My teams</h1>
        <div className="h-10 w-48 bg-slate-200 rounded-lg animate-pulse mb-4" />
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-slate-800 mb-4">My teams</h1>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
          ⚠️ {error}
        </div>
      )}

      <select
        value={selectedEventId}
        onChange={e => setSelectedEventId(e.target.value)}
        className="rounded-lg border border-slate-300 px-3 py-2 text-sm mb-4 w-full max-w-xs focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
      >
        <option value="">Select event</option>
        {eventList.map(ev => (
          <option key={ev._id} value={ev._id}>
            {ev.name}
          </option>
        ))}
      </select>

      {selectedEventId && (
        <>
          {teamError && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-sm">
              ℹ️ {teamError}
            </div>
          )}

          {teams.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
              <div className="text-5xl mb-3">📭</div>
              <h3 className="text-lg font-semibold text-slate-800 mb-2">No teams assigned</h3>
              <p className="text-slate-600">
                {teamError ? 'Please contact your administrator.' : 'You haven\'t been assigned any teams for this event yet.'}
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {teams.map(t => (
                <li
                  key={t._id}
                  className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-200"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium text-slate-800">{t.name}</p>
                      <p className="text-slate-500 text-sm">
                        {t.project || '—'} · {t.domain || '—'}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={'rounded-full px-2.5 py-0.5 text-xs font-medium ' + statusClass(t.status)}>
                        {statusLabel(t.status)}
                      </span>
                      <Link
                        to={'/score/' + t.qrToken}
                        className="rounded-lg bg-slate-800 text-white px-3 py-1.5 text-sm hover:bg-slate-700 transition active:scale-95"
                      >
                        Score
                      </Link>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}