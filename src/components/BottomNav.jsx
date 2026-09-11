import { NavLink } from 'react-router-dom';
import { Home, Users, CalendarDays, MapPin, MoreHorizontal } from 'lucide-react';

const ITEMS = [
  { to: '/', icon: Home, label: 'Accueil', end: true },
  { to: '/clients', icon: Users, label: 'Clientes' },
  { to: '/agenda', icon: CalendarDays, label: 'Agenda' },
  { to: '/carte', icon: MapPin, label: 'Carte' },
  { to: '/plus', icon: MoreHorizontal, label: 'Plus' }
];

export default function BottomNav() {
  return (
    <nav className="bottom-nav">
      {ITEMS.map((item) => (
        <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => (isActive ? 'active' : '')}>
          <item.icon strokeWidth={2.3} />
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
