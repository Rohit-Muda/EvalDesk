import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { events } from '../lib/api';

export default function AdminDashboard() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDomains, setNewDomains] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      const data = await events.list();
      setList(data);
      setError(null);
    } catch (err) {
      setError('Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  const createEvent = async (e) => {
    e.preventDefault();
    if (!newName.trim()) {
      alert('Event name is required');
      return;
    }

    const domains = newDomains.split(/[\n,]/).map(d => d.trim()).filter(Boolean);
    try {
      const event = await events.create({ name: newName, allowedDomains: domains });
      setList(prev => [event, ...prev]);
      setShowCreate(false);
      setNewName('');
      setNewDomains('');
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin w-8 h-8 border-2 border-slate-300 border-t-slate-600 rounded-full" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-slate-800">Events</h1>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="rounded-xl bg-slate-800 text-white px-4 py-2 text-sm font-medium hover:bg-slate-700"
        >
          New event
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
          {error}
        </div>
      )}

      {showCreate && (
        <form
          onSubmit={createEvent}
          className="mb-6 p-4 bg-white rounded-xl border border-slate-200 shadow-sm"
        >
          <h2 className="font-semibold text-slate-800 mb-3">Create event</h2>
          <input
            type="text"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="Event name"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 mb-3 text-sm"
          />
          <textarea
            value={newDomains}
            onChange={e => setNewDomains(e.target.value)}
            placeholder="Allowed domains (one per line or comma-separated)"
            rows={3}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 mb-3 text-sm"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              className="rounded-lg bg-slate-800 text-white px-4 py-2 text-sm font-medium"
            >
              Create
            </button>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <ul className="space-y-2">
        {list.map(ev => (
          <li
            key={ev._id}
            className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium text-slate-800">{ev.name}</span>
              <div className="flex flex-wrap gap-2">
                <Link
                  to={'/dashboard/admin/events/' + ev._id + '/teams'}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
                >
                  Teams & QR
                </Link>
                <Link
                  to={'/dashboard/admin/events/' + ev._id + '/jury'}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
                >
                  Jury
                </Link>
                <Link
                  to={'/dashboard/admin/events/' + ev._id + '/tracking'}
                  className="rounded-lg bg-slate-800 text-white px-3 py-1.5 text-sm hover:bg-slate-700"
                >
                  Tracking
                </Link>
              </div>
            </div>
            {ev.allowedDomains && ev.allowedDomains.length > 0 && (
              <p className="text-slate-500 text-xs mt-2">
                Domains: {ev.allowedDomains.join(', ')}
              </p>
            )}
          </li>
        ))}
      </ul>

      {list.length === 0 && !showCreate && (
        <p className="text-slate-500 text-center py-8">
          No events yet. Create one to get started.
        </p>
      )}
    </div>
  );
}