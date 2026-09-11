import { useMemo, useState } from 'react';
import { useData } from '../contexts/DataContext';
import TopBar from '../components/TopBar';
import Modal from '../components/Modal';
import AppointmentForm from '../components/AppointmentForm';
import { capitalize, fmtEuro } from '../utils/format';

export default function Calendrier() {
  const { clients, appointments, ready } = useData();
  const [month, setMonth] = useState(new Date());
  const [dayKey, setDayKey] = useState(null);
  const [creatingFor, setCreatingFor] = useState(null);
  const [editing, setEditing] = useState(null);

  const byDay = useMemo(() => {
    const map = {};
    appointments.forEach((a) => {
      const key = new Date(a.date).toISOString().slice(0, 10);
      (map[key] = map[key] || []).push(a);
    });
    return map;
  }, [appointments]);

  if (!ready) return <div className="empty" style={{ paddingTop: 60 }}>Chargement…</div>;

  const clientName = (cid) => clients.find((c) => c.id === cid)?.nom || '(cliente supprimée)';
  const year = month.getFullYear();
  const m = month.getMonth();
  const firstDay = new Date(year, m, 1);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, m + 1, 0).getDate();
  const todayStr = new Date().toISOString().slice(0, 10);

  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <>
      <TopBar title="Calendrier" tag="Agenda" tagClass="m-agenda-bg" />
      <main className="page">
        <div className="card">
          <div className="cal-nav">
            <button onClick={() => setMonth(new Date(year, m - 1, 1))}>‹</button>
            <h3>{capitalize(month.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }))}</h3>
            <button onClick={() => setMonth(new Date(year, m + 1, 1))}>›</button>
          </div>
          <div className="calendar-grid">
            {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((d) => <div className="dow" key={d}>{d}</div>)}
            {cells.map((d, i) => {
              if (!d) return <div className="cal-day empty-day" key={'e' + i} />;
              const key = new Date(year, m, d).toISOString().slice(0, 10);
              const events = byDay[key] || [];
              const hasPlanifie = events.some((e) => e.status === 'planifie');
              const hasTermine = events.some((e) => e.status === 'termine');
              return (
                <div key={key} className={`cal-day ${key === todayStr ? 'today' : ''}`} onClick={() => setDayKey(key)}>
                  <span>{d}</span>
                  <div className="dots">
                    {hasPlanifie && <span className="dot" style={{ background: 'var(--warning)' }} />}
                    {hasTermine && <span className="dot" style={{ background: 'var(--accent)' }} />}
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 12, display: 'flex', gap: 14 }}>
            <span><span style={{ color: 'var(--warning)' }}>●</span> Prévu</span>
            <span><span style={{ color: 'var(--accent)' }}>●</span> Terminé</span>
          </div>
        </div>
      </main>

      {dayKey && (
        <Modal onClose={() => setDayKey(null)} title={capitalize(new Date(dayKey + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }))}>
          {(byDay[dayKey] || []).length === 0 ? (
            <div className="empty">Aucun rendez-vous ce jour-là.</div>
          ) : (
            [...(byDay[dayKey] || [])].sort((a, b) => new Date(a.date) - new Date(b.date)).map((a) => (
              <div key={a.id} className="divider-item" style={{ cursor: 'pointer' }} onClick={() => { setDayKey(null); setEditing(a); }}>
                <strong>{new Date(a.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</strong> — {clientName(a.clientId)}{' '}
                <span className={`pill ${a.status === 'planifie' ? 'pill-planned' : a.status === 'annule' ? 'pill-cancelled' : 'pill-done'}`}>
                  {a.status === 'planifie' ? 'Prévu' : a.status === 'annule' ? 'Annulé' : 'Terminé'}
                </span>
                {a.prix != null && <span className="pill pill-price" style={{ marginLeft: 6 }}>{fmtEuro(a.prix)}</span>}
              </div>
            ))
          )}
          <button className="btn btn-primary btn-block" style={{ marginTop: 12 }} onClick={() => { const dk = dayKey; setDayKey(null); setCreatingFor(dk); }}>
            + Ajouter un rendez-vous ce jour
          </button>
        </Modal>
      )}

      {creatingFor && <AppointmentForm defaultDate={creatingFor + 'T10:00'} onClose={() => setCreatingFor(null)} />}
      {editing && <AppointmentForm existing={editing} onClose={() => setEditing(null)} />}
    </>
  );
}
