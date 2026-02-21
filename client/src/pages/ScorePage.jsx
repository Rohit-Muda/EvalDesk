import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { scores } from '../lib/api';

export default function ScorePage() {
  const { qrToken } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [criteriaScores, setCriteriaScores] = useState([]);
  const [absent, setAbsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login?redirect=' + encodeURIComponent('/score/' + qrToken));
      return;
    }
    if (!user) return;
    scores.get(qrToken).then(res => {
      setData(res);
      if (res.score && res.score.locked) {
        setSubmitted(true);
        setCriteriaScores(res.score.criteriaScores || []);
        setAbsent(res.score.absent || false);
      } else {
        const rubric = res.team.rubric || [];
        setCriteriaScores(res.score && res.score.criteriaScores ? [...res.score.criteriaScores] : rubric.map(() => 0));
        setAbsent(res.score ? res.score.absent : false);
      }
    }).catch(() => setData(null)).finally(() => setLoading(false));
  }, [user, authLoading, qrToken, navigate]);

  const rubric = data && data.team && data.team.rubric ? data.team.rubric : [];
  const updateScore = (index, value) => {
    const max = rubric[index] && rubric[index].maxScore ? rubric[index].maxScore : 10;
    const n = Math.min(Math.max(Number(value), 0), max);
    setCriteriaScores(prev => {
      const next = [...prev];
      next[index] = n;
      return next;
    });
  };

  const submit = async (e) => {
    e.preventDefault();
    if (submitted || submitting) return;
    setSubmitting(true);
    try {
      await scores.submit(qrToken, { criteriaScores: criteriaScores.slice(0, rubric.length), absent });
      setSubmitted(true);
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="animate-spin w-8 h-8 border-2 border-slate-300 border-t-slate-600 rounded-full" />
      </div>
    );
  }
  if (!user) return null;
  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <p className="text-slate-600">Team not found or you are not assigned to evaluate it.</p>
      </div>
    );
  }

  const team = data.team;
  const locked = submitted || (data.score && data.score.locked);

  return (
    <div className="min-h-screen bg-slate-50 p-4 pb-8 max-w-lg mx-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <h1 className="text-lg font-bold text-slate-800">{team.name}</h1>
          <p className="text-slate-600 text-sm mt-0.5">{team.project || '—'}</p>
          <p className="text-slate-500 text-xs">{team.domain || '—'}</p>
        </div>
        <form onSubmit={submit} className="p-4">
          <label className="flex items-center gap-2 mb-4">
            <input type="checkbox" checked={absent} onChange={e => setAbsent(e.target.checked)} disabled={locked} className="rounded border-slate-300" />
            <span className="text-sm font-medium text-slate-700">Mark Absent</span>
          </label>
          {rubric.map((c, i) => {
            const max = c.maxScore || 10;
            const val = criteriaScores[i] != null ? criteriaScores[i] : 0;
            return (
              <div key={i} className="mb-4">
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-slate-700">{c.name}</span>
                  <span className="text-slate-500">Weight {c.weight}% · max {max}</span>
                </div>
                <input type="range" min={0} max={max} step={0.5} value={val} onChange={e => updateScore(i, e.target.value)} disabled={locked} className="w-full h-3 rounded-lg appearance-none bg-slate-200 accent-slate-700" />
                <p className="text-xs text-slate-500 mt-0.5">{val} / {max}</p>
              </div>
            );
          })}
          {locked ? (
            <p className="text-emerald-600 font-medium text-sm mt-4">Submitted. This form is locked.</p>
          ) : (
            <button type="submit" disabled={submitting} className="mt-4 w-full rounded-xl bg-slate-800 text-white py-3 font-medium disabled:opacity-50">Submit</button>
          )}
        </form>
      </div>
    </div>
  );
}
