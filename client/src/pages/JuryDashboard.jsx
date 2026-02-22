import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { events, jury } from '../lib/api';

export default function JuryDashboard() {
  const [eventList, setEventList] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null); // FIX #13: Add error state
  const [teamError, setTeamError] = useState(null); // FIX #14: Add team error state

  useEffect(() => {
    events.list()
      .then(setEventList)
      .catch((err) => {
        // FIX #15: Show error feedback instead of silent fail
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

    // FIX #16: Reset error when selecting new event
    setTeamError(null);

    jury.myTeams(selectedEventId)
      .then((data) => {
        setTeams(data || []);
        // FIX #17: Show message if no teams allocated
        if (!data || data.length === 0) {
          setTeamError('No teams assigned for this event');
        }
      })
      .catch((err) => {
        // FIX #18: Show error feedback instead of silent fail
        setTeamError('Failed to load teams: ' + err.message);
        setTeams([]);
      });
  }, [selectedEventId]);

  const statusClass = (s) => {
    if (s === 'evaluated') return 'bg-emerald-100 text-emerald-800';
    if (s === 'absent') return 'bg-amber-100 text-amber-800';
    return 'bg-slate-100 text-slate-600';
  };
  const statusLabel = (s) => s === 'evaluated' ? 'Evaluated' : s === 'absent' ? 'Absent' : 'Pending';

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin w-8 h-8 border-2 border-slate-300 border-t-slate-600 rounded-full" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-slate-800 mb-4">My teams</h1>

      {/* FIX #19: Show error if events failed to load */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          ⚠️ {error}
        </div>
      )}

      <select
        value={selectedEventId}
        onChange={e => setSelectedEventId(e.target.value)}
        className="rounded-lg border border-slate-300 px-3 py-2 text-sm mb-4 w-full max-w-xs"
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
          {/* FIX #20: Show error if teams failed to load */}
          {teamError && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
              ℹ️ {teamError}
            </div>
          )}

          {teams.length === 0 ? (
            <p className="text-slate-500">
              {teamError
                ? 'Please contact your event administrator or try selecting another event.'
                : 'No teams assigned for this event.'}
            </p>
          ) : (
            <ul className="space-y-2">
              {teams.map(t => (
                <li key={t._id} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium text-slate-800">{t.name}</p>
                      <p className="text-slate-500 text-sm">
                        {t.project || '—'} · {t.domain || '—'}
                      </p>
                    </div>
                    <span
                      className={
                        'rounded-full px-2.5 py-0.5 text-xs font-medium ' +
                        statusClass(t.status)
                      }
                    >
                      {statusLabel(t.status)}
                    </span>
                  </div>
                  <Link
                    to={'/score/' + t.qrToken}
                    className="inline-block mt-2 text-sm text-slate-600 hover:text-slate-800 font-medium"
                  >
                    Open score page →
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}