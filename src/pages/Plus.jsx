import { Link } from 'react-router-dom';
import {
  KanbanSquare, Sparkles, Package, Receipt, BarChart3, StickyNote,
  CalendarRange, Settings, Upload
} from 'lucide-react';
import TopBar from '../components/TopBar';

const GROUPS = [
  {
    title: 'Clientèle',
    tiles: [
      { to: '/pipeline', icon: KanbanSquare, label: 'Pipeline', cls: 'm-pipeline-bg' },
      { to: '/calendrier', icon: CalendarRange, label: 'Calendrier', cls: 'm-agenda-bg' }
    ]
  },
  {
    title: 'Facturation',
    tiles: [
      { to: '/catalogue', icon: Sparkles, label: 'Prestations', cls: 'm-catalogue-bg' },
      { to: '/stock', icon: Package, label: 'Stock', cls: 'm-stock-bg' },
      { to: '/factures', icon: Receipt, label: 'Devis & Factures', cls: 'm-facturation-bg' }
    ]
  },
  {
    title: 'Suivi',
    tiles: [
      { to: '/stats', icon: BarChart3, label: 'Statistiques', cls: 'm-stats-bg' },
      { to: '/notes', icon: StickyNote, label: 'Pense-bête', cls: 'm-notes-bg' }
    ]
  },
  {
    title: 'Application',
    tiles: [
      { to: '/import', icon: Upload, label: 'Importer', cls: 'm-settings-bg' },
      { to: '/reglages', icon: Settings, label: 'Réglages', cls: 'm-settings-bg' }
    ]
  }
];

export default function Plus() {
  return (
    <>
      <TopBar title="Plus" sub="Tous les outils de votre activité" />
      <main className="page">
        {GROUPS.map((g) => (
          <div key={g.title}>
            <div className="section-header">{g.title}</div>
            <div className="drawer-grid">
              {g.tiles.map((t) => (
                <Link key={t.to} to={t.to} className="drawer-tile">
                  <div className={`icon-badge ${t.cls}`}><t.icon strokeWidth={2.2} /></div>
                  <div className="label">{t.label}</div>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </main>
    </>
  );
}
