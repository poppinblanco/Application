import { Link } from 'react-router-dom';
import { TriangleAlert, Receipt, KanbanSquare, Sparkles } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import TopBar from '../components/TopBar';
import { fmtEuro, fmtEuroH, fmtDateTime, initials, tauxHoraire } from '../utils/format';

export default function Dashboard() {
  const { clients, appointments, products, invoices, services, settings, ready } = useData();

  if (!ready) return <div className="empty" style={{ paddingTop: 60 }}>Chargement…</div>;

  const now = new Date();
  const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const doneThisMonth = appointments.filter((a) => a.status === 'termine' && new Date(a.date) >= startMonth);
  const revenueMonth = doneThisMonth.reduce((s, a) => s + (parseFloat(a.prix) || 0), 0);

  const upcoming = appointments
    .filter((a) => a.status === 'planifie' && new Date(a.date) >= now)
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  const doneWithRate = appointments.filter((a) => a.status === 'termine' && tauxHoraire(a, settings.chargesPct, services) !== null);
  const avgRate = doneWithRate.length
    ? doneWithRate.reduce((s, a) => s + tauxHoraire(a, settings.chargesPct, services), 0) / doneWithRate.length
    : null;
  const doneCount = appointments.filter((a) => a.status === 'termine').length;

  const lowStock = products.filter((p) => p.quantite <= p.seuilAlerte);
  const unpaidInvoices = invoices.filter((i) => i.statut !== 'payee');
  const prospects = clients.filter((c) => (c.statut || 'active') === 'prospect').length;

  const clientName = (id) => clients.find((c) => c.id === id)?.nom || '(cliente supprimée)';

  return (
    <>
      <TopBar title="Bonjour 👋" sub={fmtDateTime(now.toISOString()).split(' à ')[0]} />
      <main className="page">
        <div className="kpi-grid">
          <div className="kpi-card grad-clients">
            <div className="kpi-label">Ce mois-ci</div>
            <div className="kpi-value">{fmtEuro(revenueMonth)}</div>
            <div className="kpi-sub">{doneThisMonth.length} prestation(s)</div>
          </div>
          <div className="kpi-card grad-agenda">
            <div className="kpi-label">À venir</div>
            <div className="kpi-value">{upcoming.length}</div>
            <div className="kpi-sub">rendez-vous planifiés</div>
          </div>
          <div className="kpi-card grad-stats">
            <div className="kpi-label">Taux horaire</div>
            <div className="kpi-value" style={avgRate === null ? { fontSize: 13, fontWeight: 700 } : undefined}>
              {avgRate !== null ? fmtEuroH(avgRate) : (doneCount === 0 ? 'Aucune donnée' : 'Durée manquante')}
            </div>
            <div className="kpi-sub">
              {avgRate !== null ? 'après charges' : (
                <Link to="/stats" style={{ color: 'inherit', textDecoration: 'underline' }}>
                  {doneCount === 0 ? 'Terminez un rendez-vous' : 'Ajoutez une durée →'}
                </Link>
              )}
            </div>
          </div>
          <div className="kpi-card grad-pipeline">
            <div className="kpi-label">Clientèle</div>
            <div className="kpi-value">{clients.length}</div>
            <div className="kpi-sub">{prospects} prospect(s)</div>
          </div>
        </div>

        <div className="row" style={{ margin: '16px 0' }}>
          <Link to="/clients?new=1" className="btn btn-primary" style={{ flex: 1 }}>+ Cliente</Link>
          <Link to="/agenda?new=1" className="btn btn-outline" style={{ flex: 1 }}>+ Rendez-vous</Link>
        </div>

        {(lowStock.length > 0 || unpaidInvoices.length > 0) && (
          <div className="card" style={{ borderColor: 'var(--warning)' }}>
            <div className="card-title" style={{ color: 'var(--warning)' }}><TriangleAlert size={18} /> À surveiller</div>
            {lowStock.length > 0 && (
              <Link to="/stock" className="stat-row">
                <div className="icon-badge icon-badge-sm m-stock-bg"><Sparkles /></div>
                <div>
                  <div className="item-title">{lowStock.length} produit(s) en stock bas</div>
                  <div className="item-sub">{lowStock.map((p) => p.nom).slice(0, 3).join(', ')}</div>
                </div>
              </Link>
            )}
            {unpaidInvoices.length > 0 && (
              <Link to="/factures" className="stat-row">
                <div className="icon-badge icon-badge-sm m-facturation-bg"><Receipt /></div>
                <div>
                  <div className="item-title">{unpaidInvoices.length} facture(s) impayée(s)</div>
                  <div className="item-sub">{fmtEuro(unpaidInvoices.reduce((s, i) => s + (i.items || []).reduce((s2, it) => s2 + (parseFloat(it.quantite) || 0) * (parseFloat(it.prixUnitaire) || 0), 0), 0))} en attente</div>
                </div>
              </Link>
            )}
          </div>
        )}

        <div className="card">
          <div className="card-title">
            Prochains rendez-vous
            <Link to="/agenda" className="btn btn-ghost btn-sm">Tout voir</Link>
          </div>
          {upcoming.length === 0 ? (
            <div className="empty">Aucun rendez-vous à venir.</div>
          ) : (
            upcoming.slice(0, 4).map((a) => (
              <Link to="/agenda" key={a.id} className="list-item">
                <div className="avatar">{initials(clientName(a.clientId))}</div>
                <div>
                  <div className="item-title">{clientName(a.clientId)}</div>
                  <div className="item-sub">{fmtDateTime(a.date)}{a.adresse ? ' · ' + a.adresse : ''}</div>
                </div>
                {a.prix ? <span className="pill pill-price" style={{ marginLeft: 'auto' }}>{fmtEuro(a.prix)}</span> : null}
              </Link>
            ))
          )}
        </div>

        <div className="section-header">Accès rapide</div>
        <div className="drawer-grid">
          <Link to="/pipeline" className="drawer-tile">
            <div className="icon-badge m-pipeline-bg"><KanbanSquare strokeWidth={2.2} /></div>
            <div className="label">Pipeline clientes</div>
          </Link>
          <Link to="/factures" className="drawer-tile">
            <div className="icon-badge m-facturation-bg"><Receipt strokeWidth={2.2} /></div>
            <div className="label">Devis & Factures</div>
          </Link>
        </div>
      </main>
    </>
  );
}
