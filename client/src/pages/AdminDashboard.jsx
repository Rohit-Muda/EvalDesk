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
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      const data = await events.list();
      setList(data);
      setError(null);
    } catch (err) {
      setError('Failed to load events: ' + err.message);
      setList([]);
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

    setCreating(true);
    try {
      const domains = newDomains.split(/[\n,]/).map(d => d.trim()).filter(Boolean);
      const event = await events.create({ name: newName, allowedDomains: domains });
      setList(prev => [event, ...prev]);
      setShowCreate(false);
      setNewName('');
      setNewDomains('');
      setError(null);
    } catch (err) {
      setError('Failed to create event: ' + err.message);
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-slate-800">Events</h1>
          <div className="h-10 w-24 bg-slate-200 rounded-lg animate-pulse" />
        </div>
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
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-slate-800">Events</h1>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="rounded-lg bg-slate-800 text-white px-4 py-2 text-sm font-medium hover:bg-slate-700 transition active:scale-95 disabled:opacity-50"
          disabled={showCreate}
        >
          + New event
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
          ⚠️ {error}
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
            className="w-full rounded-lg border border-slate-300 px-3 py-2 mb-3 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
            autoFocus
            disabled={creating}
          />
          <textarea
            value={newDomains}
            onChange={e => setNewDomains(e.target.value)}
            placeholder="Allowed domains (one per line or comma-separated)"
            rows={3}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 mb-3 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
            disabled={creating}
          />
          <div className="flex gap-2">
            <button
              type="submit"
              className="rounded-lg bg-slate-800 text-white px-4 py-2 text-sm font-medium hover:bg-slate-700 transition active:scale-95 disabled:opacity-50"
              disabled={creating}
            >
              {creating ? 'Creating...' : 'Create'}
            </button>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50 transition disabled:opacity-50"
              disabled={creating}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {list.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
          <div className="text-5xl mb-3">📋</div>
          <h3 className="text-lg font-semibold text-slate-800 mb-2">No events yet</h3>
          <p className="text-slate-600 mb-4">Create your first event to get started</p>
          <button
            onClick={() => setShowCreate(true)}
            className="rounded-lg bg-slate-800 text-white px-4 py-2 text-sm font-medium hover:bg-slate-700 transition"
          >
            Create event
          </button>
        </div>
      ) : (
        <ul className="space-y-2">
          {list.map(ev => (
            <li
              key={ev._id}
              className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-200"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex-1">
                  <p className="font-medium text-slate-800 mb-1">{ev.name}</p>
                  {ev.allowedDomains && ev.allowedDomains.length > 0 && (
                    <p className="text-xs text-slate-600">
                      🔒 Domains: {ev.allowedDomains.join(', ')}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    to={'/dashboard/admin/events/' + ev._id + '/teams'}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50 transition active:scale-95"
                  >
                    Teams & QR
                  </Link>
                  <Link
                    to={'/dashboard/admin/events/' + ev._id + '/jury'}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50 transition active:scale-95"
                  >
                    Jury
                  </Link>
                  <Link
                    to={'/dashboard/admin/events/' + ev._id + '/tracking'}
                    className="rounded-lg bg-slate-800 text-white px-3 py-1.5 text-sm hover:bg-slate-700 transition active:scale-95"
                  >
                    Tracking
                  </Link>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}