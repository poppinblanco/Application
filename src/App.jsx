import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { useData } from './contexts/DataContext';
import BottomNav from './components/BottomNav';
import { emailConfigured, sendReminderEmail, upcomingWithin } from './utils/email';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import ClientDetail from './pages/ClientDetail';
import Agenda from './pages/Agenda';
import Calendrier from './pages/Calendrier';
import MapView from './pages/MapView';
import Stats from './pages/Stats';
import Notes from './pages/Notes';
import Settings from './pages/Settings';
import Plus from './pages/Plus';
import Import from './pages/Import';

const LAST_SENT_KEY = 'raissa_last_email_digest';

export default function App() {
  const { user, loading, firebaseConfigured } = useAuth();
  const { appointments, clients, settings, ready } = useData();

  useEffect(() => {
    if (!ready || !user || !emailConfigured || settings.autoEmailReminder === false) return;
    const today = new Date().toISOString().slice(0, 10);
    if (localStorage.getItem(LAST_SENT_KEY) === today) return;
    const upcoming = upcomingWithin(appointments, 24);
    if (upcoming.length === 0) return;
    sendReminderEmail({ appointments: upcoming, clients })
      .then(() => localStorage.setItem(LAST_SENT_KEY, today))
      .catch(() => {});
  }, [ready, user, settings.autoEmailReminder, appointments, clients]);

  if (firebaseConfigured && loading) {
    return <div className="empty" style={{ paddingTop: 80 }}>Chargement…</div>;
  }
  if (!firebaseConfigured || !user) {
    return <Login />;
  }

  return (
    <div className="app-shell">
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/clients" element={<Clients />} />
        <Route path="/clients/:id" element={<ClientDetail />} />
        <Route path="/agenda" element={<Agenda />} />
        <Route path="/calendrier" element={<Calendrier />} />
        <Route path="/carte" element={<MapView />} />
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
