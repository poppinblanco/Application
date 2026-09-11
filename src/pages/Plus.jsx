import { Link } from 'react-router-dom';
import TopBar from '../components/TopBar';

const LINKS = [
  { to: '/stats', icon: '📊', label: 'Statistiques', sub: 'Revenus, taux horaire, classement' },
  { to: '/notes', icon: '🗒️', label: 'Pense-bête', sub: 'Notes et tâches à faire' },
  { to: '/calendrier', icon: '📆', label: 'Calendrier', sub: 'Vue mensuelle des rendez-vous' },
  { to: '/import', icon: '⬆️', label: 'Importer des données', sub: 'Reprendre un export JSON existant' },
  { to: '/reglages', icon: '⚙️', label: 'Réglages', sub: 'Entreprise, sauvegarde' }
];

export default function Plus() {
  return (
    <>
      <TopBar title="Plus" />
      <main className="page">
        <div className="card">
          {LINKS.map((l) => (
            <Link key={l.to} to={l.to} className="list-item">
              <div className="avatar">{l.icon}</div>
              <div>
                <div className="item-title">{l.label}</div>
                <div className="item-sub">{l.sub}</div>
              </div>
              <span className="chevron">›</span>
            </Link>
          ))}
        </div>
      </main>
    </>
  );
}
