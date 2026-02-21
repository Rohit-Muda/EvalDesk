import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { events, teams } from '../lib/api';

export default function EventTeams() {
  const { eventId } = useParams();
  const [event, setEvent] = useState(null);
  const [teamList, setTeamList] = useState([]);
  const [csv, setCsv] = useState('');
  const [preview, setPreview] = useState(null);
  const [importing, setImporting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    events.get(eventId).then(setEvent).catch(() => setEvent(null));
    teams.list(eventId).then(setTeamList).catch(() => setTeamList([])).finally(() => setLoading(false));
  }, [eventId]);

  const doPreview = () => {
    if (!csv.trim()) return;
    teams.preview(eventId, csv).then(setPreview).catch(e => alert(e.message));
  };

  const doImport = () => {
    if (!csv.trim()) return;
    setImporting(true);
    teams.import(eventId, csv).then(data => {
      setTeamList(prev => [...(data.teams || []), ...prev]);
      setCsv('');
      setPreview(null);
    }).catch(e => alert(e.message)).finally(() => setImporting(false));
  };

  const baseUrl = window.location.origin;
  const scorePath = (token) => baseUrl + '/score/' + token;

  if (loading || !event) return <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-2 border-slate-300 border-t-slate-600 rounded-full" /></div>;

  return (
    <div>
      <div className="mb-4">
        <Link to="/admin" className="text-slate-500 text-sm hover:text-slate-700">← Events</Link>
        <h1 className="text-xl font-bold text-slate-800 mt-1">{event.name} – Teams</h1>
      </div>

      <section className="mb-8 bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
        <h2 className="font-semibold text-slate-800 mb-3">Upload teams (CSV)</h2>
        <p className="text-slate-500 text-xs mb-2">Use columns: name (or team), project (or title), domain (or track).</p>
        <textarea value={csv} onChange={e => setCsv(e.target.value)} placeholder="Paste CSV here..." rows={4} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono" />
        <div className="flex flex-wrap gap-2 mt-2">
          <button type="button" onClick={doPreview} className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50">Preview</button>
          {preview && (
            <button type="button" onClick={doImport} disabled={importing} className="rounded-lg bg-slate-800 text-white px-4 py-2 text-sm font-medium hover:bg-slate-700 disabled:opacity-50">
            {importing ? 'Importing…' : 'Confirm import (' + preview.total + ' teams)'}
          </button>
          )}
        </div>
        {preview && (
          <div className="mt-4 overflow-x-auto max-h-48 overflow-y-auto rounded-lg border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 sticky top-0">
                <tr><th className="text-left p-2">Name</th><th className="text-left p-2">Project</th><th className="text-left p-2">Domain</th></tr>
              </thead>
              <tbody>
                {preview.preview.map((row, i) => (
                  <tr key={i} className="border-t border-slate-100"><td className="p-2">{row.name}</td><td className="p-2">{row.project}</td><td className="p-2">{row.domain}</td></tr>
                ))}
              </tbody>
            </table>
            <p className="text-slate-500 text-xs p-2">Showing up to 50 of {preview.total}</p>
          </div>
        )}
      </section>

      <section>
        <h2 className="font-semibold text-slate-800 mb-3">Teams & QR codes</h2>
        {teamList.length === 0 ? (
          <p className="text-slate-500">No teams yet. Upload a CSV above.</p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {teamList.map(t => (
              <li key={t._id} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex items-start gap-4">
                <div className="flex-shrink-0 bg-white p-2 rounded-lg border border-slate-200">
                  <QRCodeSVG value={scorePath(t.qrToken)} size={80} level="M" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-800 truncate">{t.name}</p>
                  <p className="text-slate-500 text-sm truncate">{t.project || '—'}</p>
                  <p className="text-slate-400 text-xs">{t.domain || '—'}</p>
                  <a href={scorePath(t.qrToken)} target="_blank" rel="noopener noreferrer" className="text-xs text-slate-500 hover:underline mt-1 inline-block">Open score page</a>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
