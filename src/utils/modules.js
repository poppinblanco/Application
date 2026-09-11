import {
  Home, Users, CalendarDays, MapPin, MoreHorizontal, KanbanSquare, Sparkles,
  Package, Receipt, BarChart3, StickyNote, Settings, Upload, CalendarRange
} from 'lucide-react';

export const MODULES = {
  accueil: { label: 'Accueil', icon: Home, key: 'settings' },
  clients: { label: 'Clientes', icon: Users, key: 'clients' },
  pipeline: { label: 'Pipeline', icon: KanbanSquare, key: 'pipeline' },
  agenda: { label: 'Agenda', icon: CalendarDays, key: 'agenda' },
  calendrier: { label: 'Calendrier', icon: CalendarRange, key: 'agenda' },
  carte: { label: 'Carte', icon: MapPin, key: 'carte' },
  catalogue: { label: 'Prestations', icon: Sparkles, key: 'catalogue' },
  stock: { label: 'Stock', icon: Package, key: 'stock' },
  factures: { label: 'Devis & Factures', icon: Receipt, key: 'facturation' },
  stats: { label: 'Statistiques', icon: BarChart3, key: 'stats' },
  notes: { label: 'Pense-bête', icon: StickyNote, key: 'notes' },
  reglages: { label: 'Réglages', icon: Settings, key: 'settings' },
  import: { label: 'Importer', icon: Upload, key: 'settings' },
  plus: { label: 'Plus', icon: MoreHorizontal, key: 'settings' }
};
