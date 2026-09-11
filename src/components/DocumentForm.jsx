import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import Modal from './Modal';
import { useData } from '../contexts/DataContext';
import { fmtEuro } from '../utils/format';

const emptyItem = () => ({ description: '', quantite: 1, prixUnitaire: '' });

export default function DocumentForm({ kind, existing, defaultClientId, onClose }) {
  const { clients, services, addQuote, updateQuote, deleteQuote, addInvoice, updateInvoice, deleteInvoice } = useData();
  const [clientId, setClientId] = useState(existing?.clientId || defaultClientId || clients[0]?.id || '');
  const [items, setItems] = useState(existing?.items?.length ? existing.items : [emptyItem()]);
  const [notes, setNotes] = useState(existing?.notes || '');
  const [statut, setStatut] = useState(existing?.statut || (kind === 'facture' ? 'impayee' : 'brouillon'));

  const total = items.reduce((s, it) => s + (parseFloat(it.quantite) || 0) * (parseFloat(it.prixUnitaire) || 0), 0);

  function updateItem(i, patch) {
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  }
  function addItem() { setItems((prev) => [...prev, emptyItem()]); }
  function removeItem(i) { setItems((prev) => prev.filter((_, idx) => idx !== i)); }
  function pickService(i, serviceId) {
    const s = services.find((x) => x.id === serviceId);
    if (s) updateItem(i, { description: s.nom, prixUnitaire: s.prix ?? '' });
  }

  function handleSave(e) {
    e.preventDefault();
    if (!clientId) return;
    const cleanItems = items.filter((it) => it.description.trim());
    const data = { clientId, items: cleanItems, notes: notes.trim(), statut };
    if (kind === 'facture') {
      if (existing) updateInvoice(existing.id, data); else addInvoice(data);
    } else {
      if (existing) updateQuote(existing.id, data); else addQuote(data);
    }
    onClose();
  }

  function handleDelete() {
    if (!confirm('Supprimer ce document ?')) return;
    if (kind === 'facture') deleteInvoice(existing.id); else deleteQuote(existing.id);
    onClose();
  }

  return (
    <Modal onClose={onClose} title={existing ? `Modifier ${existing.numero}` : `Nouveau ${kind}`}>
      <form onSubmit={handleSave}>
        <div className="field">
          <label>Cliente</label>
          <select value={clientId} onChange={(e) => setClientId(e.target.value)}>
            <option value="" disabled>Choisir...</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Statut</label>
          <select value={statut} onChange={(e) => setStatut(e.target.value)}>
            {kind === 'facture' ? (
              <>
                <option value="impayee">Impayée</option>
                <option value="payee">Payée</option>
              </>
            ) : (
              <>
                <option value="brouillon">Brouillon</option>
                <option value="envoye">Envoyé</option>
                <option value="accepte">Accepté</option>
                <option value="refuse">Refusé</option>
              </>
            )}
          </select>
        </div>
        <div className="field">
          <label>Lignes</label>
          {items.map((it, i) => (
            <div key={i} className="card" style={{ padding: 12, marginBottom: 8, background: 'var(--surface-alt)', boxShadow: 'none' }}>
              {services.length > 0 && (
                <select style={{ marginBottom: 8 }} value="" onChange={(e) => pickService(i, e.target.value)}>
                  <option value="">+ Depuis le catalogue...</option>
                  {services.map((s) => <option key={s.id} value={s.id}>{s.nom}</option>)}
                </select>
              )}
              <input placeholder="Description" value={it.description} onChange={(e) => updateItem(i, { description: e.target.value })} style={{ marginBottom: 8 }} />
              <div className="row" style={{ alignItems: 'center' }}>
                <input type="number" min="1" placeholder="Qté" value={it.quantite} onChange={(e) => updateItem(i, { quantite: e.target.value })} style={{ flex: 1 }} />
                <input type="number" step="0.5" placeholder="Prix unitaire" value={it.prixUnitaire} onChange={(e) => updateItem(i, { prixUnitaire: e.target.value })} style={{ flex: 2 }} />
                <button type="button" className="btn-icon" onClick={() => removeItem(i)}><Trash2 size={15} /></button>
              </div>
            </div>
          ))}
          <button type="button" className="btn btn-ghost btn-sm" onClick={addItem}><Plus size={15} /> Ajouter une ligne</button>
        </div>
        <div className="field">
          <label>Notes / conditions</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <div style={{ textAlign: 'right', fontWeight: 900, fontSize: 18, margin: '10px 0' }}>Total : {fmtEuro(total)}</div>
        <div className="row" style={{ marginTop: 6 }}>
          <button className="btn btn-primary" style={{ flex: 1 }} type="submit">Enregistrer</button>
          {existing && <button type="button" className="btn btn-danger" onClick={handleDelete}>Supprimer</button>}
        </div>
      </form>
    </Modal>
  );
}
