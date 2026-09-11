import { Routes, Route, Navigate } from 'react-router-dom';
import BottomNav from './components/BottomNav';
import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import ClientDetail from './pages/ClientDetail';
import Agenda from './pages/Agenda';
import MapView from './pages/MapView';
import Stats from './pages/Stats';
import Notes from './pages/Notes';
import Settings from './pages/Settings';
import Plus from './pages/Plus';
import Import from './pages/Import';
import Pipeline from './pages/Pipeline';
import Catalogue from './pages/Catalogue';
import Stock from './pages/Stock';
import Factures from './pages/Factures';
import Marketing from './pages/Marketing';

export default function App() {
  return (
    <div className="app-shell">
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/clients" element={<Clients />} />
        <Route path="/clients/:id" element={<ClientDetail />} />
        <Route path="/agenda" element={<Agenda />} />
        <Route path="/carte" element={<MapView />} />
        <Route path="/pipeline" element={<Pipeline />} />
        <Route path="/catalogue" element={<Catalogue />} />
        <Route path="/stock" element={<Stock />} />
        <Route path="/factures" element={<Factures />} />
        <Route path="/marketing" element={<Marketing />} />
        <Route path="/stats" element={<Stats />} />
        <Route path="/notes" element={<Notes />} />
        <Route path="/reglages" element={<Settings />} />
        <Route path="/import" element={<Import />} />
        <Route path="/plus" element={<Plus />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <BottomNav />
    </div>
  );
}
