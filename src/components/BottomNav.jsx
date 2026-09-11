import { NavLink } from 'react-router-dom';

const ITEMS = [
  { to: '/', icon: '🏠', label: 'Accueil', end: true },
  { to: '/clients', icon: '👥', label: 'Clientes' },
  { to: '/agenda', icon: '📅', label: 'Agenda' },
  { to: '/carte', icon: '📍', label: 'Carte' },
  { to: '/plus', icon: '⋯', label: 'Plus' }
];

export default function BottomNav() {
  return (
    <nav className="bottom-nav">
      {ITEMS.map((item) => (
        <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => (isActive ? 'active' : '')}>
          <span className="icon">{item.icon}</span>
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
