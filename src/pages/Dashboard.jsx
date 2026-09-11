import { Link } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import TopBar from '../components/TopBar';
import { fmtEuro, fmtEuroH, fmtDateTime, tauxHoraire } from '../utils/format';

export default function Dashboard() {
  const { clients, appointments, settings, ready } = useData();

  if (!ready) return <div className="empty" style={{ paddingTop: 60 }}>Chargement…</div>;

  const now = new Date();
  const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const doneThisMonth = appointments.filter((a) => a.status === 'termine' && new Date(a.date) >= startMonth);
  const revenueMonth = doneThisMonth.reduce((s, a) => s + (parseFloat(a.prix) || 0), 0);

  const upcoming = appointments
    .filter((a) => a.status === 'planifie' && new Date(a.date) >= now)
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  const doneWithRate = appointments.filter((a) => a.status === 'termine' && tauxHoraire(a, settings.chargesPct) !== null);
  const avgRate = doneWithRate.length
    ? doneWithRate.reduce((s, a) => s + tauxHoraire(a, settings.chargesPct), 0) / doneWithRate.length
    : null;

  const recent = [...appointments]
    .filter((a) => a.status === 'termine')
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5);

  const clientName = (id) => clients.find((c) => c.id === id)?.nom || '(cliente supprimée)';

  return (
    <>
      <TopBar title="Bonjour 👋" sub={fmtDateTime(now.toISOString()).split(' à ')[0]} />
      <main className="page">
        <div className="kpi-grid">
          <div className="kpi-card">
            <div className="kpi-label">Ce mois-ci</div>
            <div className="kpi-value">{fmtEuro(revenueMonth)}</div>
            <div className="kpi-sub">{doneThisMonth.length} prestation(s)</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">À venir</div>
            <div className="kpi-value">{upcoming.length}</div>
            <div className="kpi-sub">rendez-vous planifiés</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">Clientèle</div>
            <div className="kpi-value">{clients.length}</div>
            <div className="kpi-sub">clientes enregistrées</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">Taux horaire moy.</div>
            <div className="kpi-value">{avgRate !== null ? fmtEuroH(avgRate) : '—'}</div>
            <div className="kpi-sub">après charges</div>
          </div>
        </div>

        <div className="row" style={{ margin: '16px 0' }}>
          <Link to="/clients?new=1" className="btn btn-primary" style={{ flex: 1 }}>+ Cliente</Link>
          <Link to="/agenda?new=1" className="btn btn-outline" style={{ flex: 1 }}>+ Rendez-vous</Link>
        </div>

        <div className="card">
          <div className="card-title">
            Prochains rendez-vous
            <Link to="/agenda" className="btn btn-ghost btn-sm">Tout voir</Link>
          </div>
          {upcoming.length === 0 ? (
            <div className="empty"><span className="emoji">📭</span>Aucun rendez-vous à venir.</div>
          ) : (
            upcoming.slice(0, 4).map((a) => (
              <Link to="/agenda" key={a.id} className="list-item">
                <div className="avatar">{clientName(a.clientId).slice(0, 2).toUpperCase()}</div>
                <div>
                  <div className="item-title">{clientName(a.clientId)}</div>
                  <div className="item-sub">{fmtDateTime(a.date)}{a.adresse ? ' · ' + a.adresse : ''}</div>
                </div>
                {a.prix ? <span className="pill pill-price" style={{ marginLeft: 'auto' }}>{fmtEuro(a.prix)}</span> : null}
              </Link>
            ))
          )}
        </div>

        <div className="card">
          <div className="card-title">
            Activité récente
            <Link to="/stats" className="btn btn-ghost btn-sm">Statistiques</Link>
          </div>
          {recent.length === 0 ? (
            <div className="empty"><span className="emoji">✨</span>Rien pour l'instant.</div>
          ) : (
            recent.map((a) => (
              <div key={a.id} className="list-item" style={{ cursor: 'default' }}>
                <div className="avatar">{clientName(a.clientId).slice(0, 2).toUpperCase()}</div>
                <div>
                  <div className="item-title">{clientName(a.clientId)}</div>
                  <div className="item-sub">{fmtDateTime(a.date)}</div>
                </div>
                {a.prix ? <span className="pill pill-price" style={{ marginLeft: 'auto' }}>{fmtEuro(a.prix)}</span> : null}
              </div>
            ))
          )}
        </div>
      </main>
    </>
  );
}
