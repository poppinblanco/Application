import { createContext, useContext, useEffect, useState } from 'react';
import { watchCollection, watchSettings } from '../lib/firestore';
import { useAuth } from './AuthContext';

const DataContext = createContext(null);

export function DataProvider({ children }) {
  const { user, firebaseConfigured } = useAuth();
  const [clients, setClients] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [notes, setNotes] = useState([]);
  const [settings, setSettings] = useState({ chargesPct: 21 });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!firebaseConfigured || !user) { setReady(false); return; }
    let loaded = { c: false, a: false, n: false, s: false };
    const markReady = (k) => { loaded[k] = true; if (Object.values(loaded).every(Boolean)) setReady(true); };

    const unsubs = [
      watchCollection('clients', null, (data) => { setClients(data); markReady('c'); }),
      watchCollection('appointments', null, (data) => { setAppointments(data); markReady('a'); }),
      watchCollection('notes', null, (data) => { setNotes(data); markReady('n'); }),
      watchSettings((data) => { setSettings({ chargesPct: 21, ...data }); markReady('s'); })
    ];
    return () => unsubs.forEach((u) => u());
  }, [user, firebaseConfigured]);

  return (
    <DataContext.Provider value={{ clients, appointments, notes, settings, ready }}>
      {children}
    </DataContext.Provider>
  );
}

export const useData = () => useContext(DataContext);
