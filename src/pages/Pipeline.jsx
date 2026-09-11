import { useNavigate } from 'react-router-dom';
import { UserPlus, UserCheck, UserX } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import TopBar from '../components/TopBar';
import { fmtEuro, initials, sumPrix } from '../utils/format';

const STAGES = [
  { key: 'prospect', label: 'Prospects', icon: UserPlus, cls: 'm-pipeline-bg', grad: 'grad-pipeline' },
  { key: 'active', label: 'Clientes actives', icon: UserCheck, cls: 'm-clients-bg', grad: 'grad-clients' },
  { key: 'inactive', label: 'Inactives', icon: UserX, cls: 'm-settings-bg', grad: '' }
];

export default function Pipeline() {
  const { clients, appointments, updateClient } = useData();
  const navigate = useNavigate();

  function revenueFor(clientId) {
    return sumPrix(appointments.filter((a) => a.clientId === clientId && a.status === 'termine'));
  }

  return (
    <>
      <TopBar title="Pipeline" tag="Suivi clientèle" tagClass="m-pipeline-bg" sub={`${clients.length} clientes au total`} />
      <main className="page">
        {STAGES.map((stage) => {
          const group = clients.filter((c) => (c.statut || 'active') === stage.key);
          const totalRevenue = group.reduce((s, c) => s + revenueFor(c.id), 0);
          return (
            <div key={stage.key} className="card">
              <div className="card-title">
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div className={`icon-badge icon-badge-sm ${stage.cls}`}><stage.icon /></div>
                  {stage.label}
                  <span className="badge-count">{group.length}</span>
                </span>
                {totalRevenue > 0 && <span className="pill pill-price">{fmtEuro(totalRevenue)}</span>}
              </div>
              {group.length === 0 ? (
                <div className="empty" style={{ padding: 16 }}>Aucune cliente ici.</div>
              ) : (
                group.map((c) => (
                  <div key={c.id} className="list-item" onClick={() => navigate(`/clients/${c.id}`)}>
                    <div className="avatar">{initials(c.nom)}</div>
                    <div>
                      <div className="item-title">{c.nom}</div>
                      <div className="item-sub">{revenueFor(c.id) > 0 ? fmtEuro(revenueFor(c.id)) + ' encaissé' : 'Aucune prestation'}</div>
                    </div>
                    <select
                      value={stage.key}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => updateClient(c.id, { statut: e.target.value })}
                      style={{ width: 'auto', marginLeft: 'auto', fontSize: 12, padding: '6px 8px' }}
                    >
                      <option value="prospect">Prospect</option>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                ))
              )}
            </div>
          );
        })}
      </main>
    </>
  );
}
