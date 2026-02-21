import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { events, jury } from '../lib/api';

export default function JuryDashboard() {
  const [eventList, setEventList] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    events.list().then(setEventList).catch(() => setEventList([])).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedEventId) {
      setTeams([]);
      return;
    }
    jury.myTeams(selectedEventId).then(setTeams).catch(() => setTeams([]));
  }, [selectedEventId]);

  const statusClass = (s) => {
    if (s === 'evaluated') return 'bg-emerald-100 text-emerald-800';
    if (s === 'absent') return 'bg-amber-100 text-amber-800';
    return 'bg-slate-100 text-slate-600';
  };
  const statusLabel = (s) => s === 'evaluated' ? 'Evaluated' : s === 'absent' ? 'Absent' : 'Pending';

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-2 border-slate-300 border-t-slate-600 rounded-full" /></div>;

  return (
    <div>
      <h1 className="text-xl font-bold text-slate-800 mb-4">My teams</h1>
      <select value={selectedEventId} onChange={e => setSelectedEventId(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm mb-4 w-full max-w-xs">
        <option value="">Select event</option>
        {eventList.map(ev => <option key={ev._id} value={ev._id}>{ev.name}</option>)}
      </select>

      {selectedEventId && (
        <ul className="space-y-2">
          {teams.length === 0 ? (
            <p className="text-slate-500">No teams assigned for this event.</p>
          ) : (
            teams.map(t => (
              <li key={t._id} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium text-slate-800">{t.name}</p>
                    <p className="text-slate-500 text-sm">{t.project || '—'} · {t.domain || '—'}</p>
                  </div>
                  <span className={"rounded-full px-2.5 py-0.5 text-xs font-medium " + statusClass(t.status)}>{statusLabel(t.status)}</span>
                </div>
                <Link to={'/score/' + t.qrToken} className="inline-block mt-2 text-sm text-slate-600 hover:text-slate-800 font-medium">Open score page →</Link>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
