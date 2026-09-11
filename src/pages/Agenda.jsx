import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Check, Receipt as ReceiptIcon, Inbox, CalendarX } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import TopBar from '../components/TopBar';
import AppointmentForm from '../components/AppointmentForm';
import MonthCalendar from '../components/MonthCalendar';
import { fmtDateTime, fmtEuro, fmtEuroH, groupByPeriod, sumPrix, tauxHoraire } from '../utils/format';
import { generateReceiptPdf } from '../utils/receipt';

export default function Agenda() {
  const { clients, appointments, services, settings, ready, updateAppointment } = useData();
  const [params, setParams] = useSearchParams();
  const [editing, setEditing] = useState(null);
  const [groupBy, setGroupBy] = useState('jour');
  const [view, setView] = useState('liste');
  const showNew = params.get('new') === '1';

  if (!ready) return <div className="empty" style={{ paddingTop: 60 }}>Chargement…</div>;

  const clientName = (cid) => clients.find((c) => c.id === cid)?.nom || '(cliente supprimée)';
  const sorted = [...appointments].sort((a, b) => new Date(a.date) - new Date(b.date));
  const upcoming = sorted.filter((a) => a.status === 'planifie');
  const done = sorted.filter((a) => a.status === 'termine').reverse();
  const totalAll = sumPrix(done);
  const groups = groupByPeriod(done, groupBy);

  function closeNew() { setParams({}, { replace: true }); }

  function row(a) {
    const rate = tauxHoraire(a, settings.chargesPct, services);
    return (
      <div className="divider-item" key={a.id} style={{ cursor: 'pointer' }} onClick={() => setEditing(a)}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
          <div>
            <Link to={`/clients/${a.clientId}`} onClick={(e) => e.stopPropagation()} className="item-title" style={{ textDecoration: 'underline' }}>
              {clientName(a.clientId)}
            </Link>{' '}
            <span className={`pill ${a.status === 'planifie' ? 'pill-planned' : a.status === 'annule' ? 'pill-cancelled' : 'pill-done'}`}>
              {a.status === 'planifie' ? 'Prévu' : a.status === 'annule' ? 'Annulé' : 'Terminé'}
            </span>
            <div className="item-sub" style={{ marginTop: 4 }}>{fmtDateTime(a.date)}</div>
            {a.adresse && <div className="item-sub">{a.adresse}</div>}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
            {a.prix != null && <span className="pill pill-price">{fmtEuro(a.prix)}</span>}
            {rate !== null && (
              <span className="pill" style={{ background: rate >= 20 ? 'var(--accent-soft)' : 'var(--danger-soft)', color: rate >= 20 ? 'var(--accent)' : 'var(--danger)' }}>
                {fmtEuroH(rate)}
              </span>
            )}
          </div>
        </div>
        <div className="row" style={{ marginTop: 8 }}>
          {a.status === 'planifie' && (
            <button
              className="btn btn-accent btn-sm"
              onClick={(e) => { e.stopPropagation(); updateAppointment(a.id, { status: 'termine' }); }}
            >
              <Check size={14} /> Marquer terminé
            </button>
          )}
          {a.status === 'termine' && a.prix != null && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={(e) => { e.stopPropagation(); generateReceiptPdf({ appointment: a, client: clients.find((c) => c.id === a.clientId), business: settings }); }}
            >
              <ReceiptIcon size={14} /> Reçu PDF
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      <TopBar
        title="Rendez-vous"
        tag="Agenda"
        tagClass="m-agenda-bg"
        right={<button className="btn btn-primary btn-sm" disabled={clients.length === 0} onClick={() => setParams({ new: '1' })}>+ Ajouter</button>}
      />
      <main className="page">
        {clients.length === 0 && <div className="card"><div className="empty">Ajoutez d'abord une cliente.</div></div>}

        <div className="chip-row">
          <button className={`chip ${view === 'liste' ? 'active' : ''}`} onClick={() => setView('liste')}>📋 Liste</button>
          <button className={`chip ${view === 'calendrier' ? 'active' : ''}`} onClick={() => setView('calendrier')}>📅 Calendrier</button>
        </div>

        {view === 'calendrier' ? (
          <MonthCalendar />
        ) : (
          <>
            <div className="card">
              <div className="card-title">À venir</div>
              {upcoming.length === 0 ? <div className="empty"><Inbox size={32} />Aucun rendez-vous prévu.</div> : upcoming.map(row)}
            </div>

            <div className="card">
              <div className="card-title">Historique</div>
              {done.length > 0 && (
                <div style={{ background: 'var(--accent-soft)', color: 'var(--accent)', fontWeight: 800, padding: '8px 12px', borderRadius: 8, fontSize: 13, marginBottom: 12 }}>
                  💰 Total encaissé : {fmtEuro(totalAll)}
                </div>
              )}
              <div className="chip-row">
                {['jour', 'semaine', 'mois'].map((g) => (
                  <button key={g} className={`chip ${groupBy === g ? 'active' : ''}`} onClick={() => setGroupBy(g)}>Par {g}</button>
                ))}
              </div>
              {done.length === 0 ? (
                <div className="empty"><CalendarX size={32} />Aucune intervention enregistrée.</div>
              ) : (
                groups.map((g) => (
                  <div key={g.key}>
                    <div className="section-header"><span>{g.label} ({g.items.length})</span><span>{fmtEuro(sumPrix(g.items))}</span></div>
                    {g.items.map(row)}
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </main>
      {showNew && <AppointmentForm onClose={closeNew} />}
      {editing && <AppointmentForm existing={editing} onClose={() => setEditing(null)} />}
    </>
  );
}
