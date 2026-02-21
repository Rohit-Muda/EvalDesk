import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { events, tracking } from '../lib/api';

const POLL_MS = 4000;

export default function LiveTracking() {
  const { eventId } = useParams();
  const [event, setEvent] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    events.get(eventId).then(setEvent).catch(function() { setEvent(null); });
  }, [eventId]);

  useEffect(() => {
    if (!eventId) return;
    const fetchStats = function() {
      tracking.stats(eventId).then(setStats).catch(function() { setStats(null); });
    };
    fetchStats();
    setLoading(false);
    const t = setInterval(fetchStats, POLL_MS);
    return function() { clearInterval(t); };
  }, [eventId]);

  const doExport = async () => {
    setExporting(true);
    try {
      const res = await tracking.exportCsv(eventId);
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'evaldesk-export-' + eventId + '.csv';
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      alert('Export failed');
    } finally {
      setExporting(false);
    }
  };

  if (!event) return <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-2 border-slate-300 border-t-slate-600 rounded-full" /></div>;

  return (
    <div>
      <div className="mb-4">
        <Link to="/admin" className="text-slate-500 text-sm hover:text-slate-700">Back to events</Link>
        <div className="flex flex-wrap items-center justify-between gap-2 mt-1">
          <h1 className="text-xl font-bold text-slate-800">Live tracking – {event.name}</h1>
          <button type="button" onClick={doExport} disabled={exporting} className="rounded-lg bg-slate-800 text-white px-4 py-2 text-sm font-medium disabled:opacity-50">Export CSV</button>
        </div>
      </div>

      {loading && !stats ? (
        <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-2 border-slate-300 border-t-slate-600 rounded-full" /></div>
      ) : stats ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <p className="text-slate-500 text-xs uppercase tracking-wide">Total</p>
              <p className="text-2xl font-bold text-slate-800">{stats.total}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <p className="text-slate-500 text-xs uppercase tracking-wide">Evaluated</p>
              <p className="text-2xl font-bold text-emerald-600">{stats.evaluated}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <p className="text-slate-500 text-xs uppercase tracking-wide">Pending</p>
              <p className="text-2xl font-bold text-slate-600">{stats.pending}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <p className="text-slate-500 text-xs uppercase tracking-wide">Absent</p>
              <p className="text-2xl font-bold text-amber-600">{stats.absent}</p>
            </div>
          </div>
          <section className="mb-6">
            <h2 className="font-semibold text-slate-800 mb-3">Per judge</h2>
            <ul className="space-y-2">
              {stats.perJudge && stats.perJudge.map(function(j) {
                return (
                  <li key={j.judgeId} className="bg-white rounded-xl border border-slate-200 p-3 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-medium text-slate-700">{j.email || j.judgeId}</span>
                    <span className="text-slate-500 text-sm">{j.done}/{j.total} · {j.percent}%</span>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-slate-700 rounded-full" style={{ width: j.percent + '%' }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
          <section>
            <h2 className="font-semibold text-slate-800 mb-3">By domain</h2>
            <ul className="space-y-2">
              {stats.domainProgress && stats.domainProgress.map(function(d) {
                return (
                  <li key={d.domain} className="bg-white rounded-xl border border-slate-200 p-3">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-slate-700">{d.domain}</span>
                      <span className="text-slate-500">{d.evaluated + d.absent}/{d.total} · {d.percent}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-slate-700 rounded-full" style={{ width: d.percent + '%' }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        </>
      ) : (
        <p className="text-slate-500">No data yet.</p>
      )}
    </div>
  );
}
