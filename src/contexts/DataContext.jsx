import { createContext, useContext, useMemo, useState } from 'react';
import { loadCollection, saveCollection, loadSettings, saveSettingsRaw, uid, deleteMedia, nextDocNumber } from '../lib/storage';

const DataContext = createContext(null);

export function DataProvider({ children }) {
  const [clients, setClients] = useState(() => loadCollection('clients'));
  const [appointments, setAppointments] = useState(() => loadCollection('appointments'));
  const [notes, setNotes] = useState(() => loadCollection('notes'));
  const [services, setServices] = useState(() => loadCollection('services'));
  const [products, setProducts] = useState(() => loadCollection('products'));
  const [quotes, setQuotes] = useState(() => loadCollection('quotes'));
  const [invoices, setInvoices] = useState(() => loadCollection('invoices'));
  const [settings, setSettings] = useState(() => ({ chargesPct: 21, ...loadSettings() }));

  function persist(name, list) {
    saveCollection(name, list);
  }
  function makeCrud(state, setState, name, defaults = {}) {
    return {
      add(data) {
        const item = { id: uid(), createdAt: new Date().toISOString(), ...defaults, ...data };
        setState((prev) => { const next = [...prev, item]; persist(name, next); return next; });
        return item;
      },
      update(id, data) {
        setState((prev) => { const next = prev.map((x) => (x.id === id ? { ...x, ...data } : x)); persist(name, next); return next; });
      },
      remove(id) {
        setState((prev) => { const next = prev.filter((x) => x.id !== id); persist(name, next); return next; });
      }
    };
  }

  const serviceCrud = makeCrud(services, setServices, 'services', { actif: true });
  const productCrud = makeCrud(products, setProducts, 'products', { quantite: 0, seuilAlerte: 2 });
  const quoteCrud = makeCrud(quotes, setQuotes, 'quotes', { statut: 'brouillon', items: [] });
  const invoiceCrud = makeCrud(invoices, setInvoices, 'invoices', { statut: 'impayee', items: [] });

  const api = useMemo(() => ({
    clients, appointments, notes, services, products, quotes, invoices, settings, ready: true,

    addClient(data) {
      const item = { id: uid(), tags: [], photos: [], statut: 'active', createdAt: new Date().toISOString(), ...data };
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
    completeAppointmentAndConsume(id, produitsUtilises) {
      setAppointments((prev) => { const next = prev.map((a) => (a.id === id ? { ...a, status: 'termine', produitsUtilises: produitsUtilises || a.produitsUtilises || [] } : a)); persist('appointments', next); return next; });
      (produitsUtilises || []).forEach(({ productId, quantite }) => {
        setProducts((prev) => { const next = prev.map((p) => (p.id === productId ? { ...p, quantite: Math.max(0, (parseFloat(p.quantite) || 0) - quantite) } : p)); persist('products', next); return next; });
      });
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

    addService: serviceCrud.add, updateService: serviceCrud.update, deleteService: serviceCrud.remove,

    addProduct: productCrud.add, updateProduct: productCrud.update, deleteProduct: productCrud.remove,
    adjustStock(id, delta) {
      setProducts((prev) => { const next = prev.map((p) => (p.id === id ? { ...p, quantite: Math.max(0, (parseFloat(p.quantite) || 0) + delta) } : p)); persist('products', next); return next; });
    },

    addQuote(data) {
      const item = quoteCrud.add({ numero: nextDocNumber('devis'), date: new Date().toISOString(), ...data });
      return item;
    },
    updateQuote: quoteCrud.update, deleteQuote: quoteCrud.remove,
    convertQuoteToInvoice(quote) {
      const item = invoiceCrud.add({
        numero: nextDocNumber('facture'),
        date: new Date().toISOString(),
        clientId: quote.clientId,
        items: quote.items,
        notes: quote.notes,
        statut: 'impayee',
        fromQuoteId: quote.id
      });
      quoteCrud.update(quote.id, { statut: 'converti', invoiceId: item.id });
      return item;
    },

    addInvoice(data) {
      return invoiceCrud.add({ numero: nextDocNumber('facture'), date: new Date().toISOString(), ...data });
    },
    updateInvoice: invoiceCrud.update, deleteInvoice: invoiceCrud.remove,

    saveSettings(data) {
      setSettings((prev) => { const next = { ...prev, ...data }; saveSettingsRaw(next); return next; });
    },

    importData({ clients: newClients = [], appointments: newAppointments = [], notes: newNotes = [] }) {
      setClients((prev) => { const next = [...prev, ...newClients]; persist('clients', next); return next; });
      setAppointments((prev) => { const next = [...prev, ...newAppointments]; persist('appointments', next); return next; });
      setNotes((prev) => { const next = [...prev, ...newNotes]; persist('notes', next); return next; });
    }
  }), [clients, appointments, notes, services, products, quotes, invoices, settings]);

  return <DataContext.Provider value={api}>{children}</DataContext.Provider>;
}

export const useData = () => useContext(DataContext);
