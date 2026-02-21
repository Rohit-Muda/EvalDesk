import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { events, jury } from '../lib/api';

export default function JuryAllocation() {
  const { eventId } = useParams();
  const [event, setEvent] = useState(null);
  const [allocations, setAllocations] = useState([]);
  const [judgeEmail, setJudgeEmail] = useState('');
  const [domains, setDomains] = useState('');
  const [maxTeams, setMaxTeams] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    events.get(eventId).then(setEvent).catch(() => setEvent(null));
    jury.allocations(eventId).then(setAllocations).catch(() => setAllocations([])).finally(() => setLoading(false));
  }, [eventId]);

  const addAllocation = async (e) => {
    e.preventDefault();
    const domainList = domains.split(/[\n,]/).map((d) => d.trim()).filter(Boolean);
    try {
      const a = await jury.addAllocation(eventId, {
        judgeEmail: judgeEmail.trim(),
        domains: domainList,
        maxTeams: parseInt(maxTeams, 10) || 0,
      });
      setAllocations((prev) => [...prev.filter((x) => x._id !== a._id), a]);
      setJudgeEmail('');
      setDomains('');
      setMaxTeams('');
    } catch (err) {
      alert(err.message);
    }
  };

  const remove = async (id) => {
    try {
      await jury.removeAllocation(eventId, id);
      setAllocations((prev) => prev.filter((x) => x._id !== id));
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading || !event) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin w-8 h-8 border-2 border-slate-300 border-t-slate-600 rounded-full" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <Link to="/admin" className="text-slate-500 text-sm hover:text-slate-700">
          Back to events
        </Link>
        <h1 className="text-xl font-bold text-slate-800 mt-1">
          Jury allocation – {event.name}
        </h1>
      </div>
      <form onSubmit={addAllocation} className="mb-8 bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
        <h2 className="font-semibold text-slate-800 mb-3">Add judge</h2>
        <input
          type="email"
          value={judgeEmail}
          onChange={(e) => setJudgeEmail(e.target.value)}
          placeholder="Judge email"
          required
          className="w-full rounded-lg border border-slate-300 px-3 py-2 mb-3 text-sm"
        />
        <textarea
          value={domains}
          onChange={(e) => setDomains(e.target.value)}
          placeholder="Domains (optional, one per line – empty = all)"
          rows={2}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 mb-3 text-sm"
        />
        <input
          type="number"
          min="0"
          value={maxTeams}
          onChange={(e) => setMaxTeams(e.target.value)}
          placeholder="Max teams per judge (0 = no cap)"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 mb-3 text-sm"
        />
        <button type="submit" className="rounded-lg bg-slate-800 text-white px-4 py-2 text-sm font-medium">
          Add
        </button>
      </form>
      <ul className="space-y-2">
        {allocations.map((a) => (
          <li
            key={a._id}
            className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-2"
          >
            <div>
              <p className="font-medium text-slate-800">{a.judgeEmail}</p>
              <p className="text-slate-500 text-sm">
                Domains: {a.domains && a.domains.length ? a.domains.join(', ') : 'all'} · Max teams: {a.maxTeams || '—'}
              </p>
            </div>
            <button type="button" onClick={() => remove(a._id)} className="text-red-600 text-sm hover:underline">
              Remove
            </button>
          </li>
        ))}
      </ul>
      {allocations.length === 0 && <p className="text-slate-500">No jury allocations yet.</p>}
    </div>
  );
}
