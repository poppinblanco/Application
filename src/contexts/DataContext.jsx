import { createContext, useContext, useMemo, useState } from 'react';
import { loadCollection, saveCollection, loadSettings, saveSettingsRaw, uid, deleteMedia } from '../lib/storage';

const DataContext = createContext(null);

export function DataProvider({ children }) {
  const [clients, setClients] = useState(() => loadCollection('clients'));
  const [appointments, setAppointments] = useState(() => loadCollection('appointments'));
  const [notes, setNotes] = useState(() => loadCollection('notes'));
  const [settings, setSettings] = useState(() => ({ chargesPct: 21, ...loadSettings() }));

  function persist(name, list) {
    saveCollection(name, list);
  }

  const api = useMemo(() => ({
    clients, appointments, notes, settings, ready: true,

    addClient(data) {
      const item = { id: uid(), tags: [], photos: [], createdAt: new Date().toISOString(), ...data };
      setClients((prev) => { const next = [...prev, item]; persist('clients', next); return next; });
      return item;
    },
    updateClient(id, data) {
      setClients((prev) => { const next = prev.map((c) => (c.id === id ? { ...c, ...data } : c)); persist('clients', next); return next; });
    },
    deleteClient(id) {
      setClients((prev) => { const next = prev.filter((c) => c.id !== id); persist('clients', next); return next; });
      setAppointments((prev) => {
        const toRemove = prev.filter((a) => a.clientId === id);
        toRemove.forEach((a) => deleteMedia(a.id));
        const next = prev.filter((a) => a.clientId !== id);
        persist('appointments', next);
        return next;
      });
      deleteMedia('client:' + id);
    },

    addAppointment(data) {
      const item = { id: uid(), createdAt: new Date().toISOString(), ...data };
      setAppointments((prev) => { const next = [...prev, item]; persist('appointments', next); return next; });
      return item;
    },
    updateAppointment(id, data) {
      setAppointments((prev) => { const next = prev.map((a) => (a.id === id ? { ...a, ...data } : a)); persist('appointments', next); return next; });
    },
    deleteAppointment(id) {
      setAppointments((prev) => { const next = prev.filter((a) => a.id !== id); persist('appointments', next); return next; });
      deleteMedia(id);
    },

    addNote(data) {
      const item = { id: uid(), done: false, createdAt: new Date().toISOString(), ...data };
      setNotes((prev) => { const next = [...prev, item]; persist('notes', next); return next; });
      return item;
    },
    updateNote(id, data) {
      setNotes((prev) => { const next = prev.map((n) => (n.id === id ? { ...n, ...data } : n)); persist('notes', next); return next; });
    },
    deleteNote(id) {
      setNotes((prev) => { const next = prev.filter((n) => n.id !== id); persist('notes', next); return next; });
    },

    saveSettings(data) {
      setSettings((prev) => { const next = { ...prev, ...data }; saveSettingsRaw(next); return next; });
    },

    importData({ clients: newClients = [], appointments: newAppointments = [], notes: newNotes = [] }) {
      setClients((prev) => { const next = [...prev, ...newClients]; persist('clients', next); return next; });
      setAppointments((prev) => { const next = [...prev, ...newAppointments]; persist('appointments', next); return next; });
      setNotes((prev) => { const next = [...prev, ...newNotes]; persist('notes', next); return next; });
    }
  }), [clients, appointments, notes, settings]);

  return <DataContext.Provider value={api}>{children}</DataContext.Provider>;
}

export const useData = () => useContext(DataContext);
