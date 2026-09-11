import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import Modal from './Modal';
import MediaGallery from './MediaGallery';
import { geocode } from '../utils/geocode';
import { useData } from '../contexts/DataContext';
import { fmtEuro } from '../utils/format';

function toLocalInput(iso) {
  const d = iso ? new Date(iso) : new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export default function AppointmentForm({ existing, defaultClientId, defaultDate, onClose }) {
  const { clients, services, products, addAppointment, updateAppointment, deleteAppointment, completeAppointmentAndConsume } = useData();
  const [clientId, setClientId] = useState(existing?.clientId || defaultClientId || clients[0]?.id || '');
  const [serviceId, setServiceId] = useState(existing?.serviceId || '');
  const [date, setDate] = useState(toLocalInput(existing?.date || defaultDate));
  const [status, setStatus] = useState(existing?.status || 'planifie');
  const [prix, setPrix] = useState(existing?.prix ?? '');
  const [adresse, setAdresse] = useState(existing?.adresse || '');
  const [dureeMin, setDureeMin] = useState(existing?.dureeMin ?? '');
  const [trajetMin, setTrajetMin] = useState(existing?.trajetMin ?? '');
  const [coutProduits, setCoutProduits] = useState(existing?.coutProduits ?? '');
  const [notes, setNotes] = useState(existing?.notes || '');
  const [produitsUtilises, setProduitsUtilises] = useState(existing?.produitsUtilises || []);
  const [pickProduct, setPickProduct] = useState('');
  const [pickQty, setPickQty] = useState(1);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  function handleServiceChange(id) {
    setServiceId(id);
    const s = services.find((x) => x.id === id);
    if (s) {
      if (s.prix != null) setPrix(s.prix);
      if (s.dureeMin != null) setDureeMin(s.dureeMin);
    }
  }

  function addProduitUtilise() {
    if (!pickProduct || pickQty <= 0) return;
    setProduitsUtilises((prev) => {
      const existingIdx = prev.findIndex((p) => p.productId === pickProduct);
      if (existingIdx >= 0) {
        const copy = [...prev];
        copy[existingIdx] = { ...copy[existingIdx], quantite: copy[existingIdx].quantite + Number(pickQty) };
        return copy;
      }
      return [...prev, { productId: pickProduct, quantite: Number(pickQty) }];
    });
    setPickProduct('');
    setPickQty(1);
  }
  function removeProduitUtilise(productId) {
    setProduitsUtilises((prev) => prev.filter((p) => p.productId !== productId));
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!clientId) { setMsg('Choisissez une cliente.'); return; }
    setSaving(true);
    const client = clients.find((c) => c.id === clientId);
    let finalAdresse = adresse.trim() || client?.adresse || '';
    let lat = existing?.lat ?? null;
    let lng = existing?.lng ?? null;
    if (finalAdresse && finalAdresse !== existing?.adresse) {
      setMsg(navigator.onLine ? 'Localisation...' : 'Hors ligne : localisation impossible pour le moment.');
      const coords = await geocode(finalAdresse);
      if (coords) { lat = coords.lat; lng = coords.lng; } else { lat = null; lng = null; }
    }
    const data = {
      clientId,
      serviceId: serviceId || null,
      date: new Date(date).toISOString(),
      status,
      adresse: finalAdresse,
      notes: notes.trim(),
      prix: prix !== '' ? parseFloat(prix) : null,
      dureeMin: dureeMin !== '' ? parseFloat(dureeMin) : null,
      trajetMin: trajetMin !== '' ? parseFloat(trajetMin) : null,
      coutProduits: coutProduits !== '' ? parseFloat(coutProduits) : null,
      produitsUtilises,
      lat, lng
    };
    const justCompleted = status === 'termine' && existing?.status !== 'termine';
    if (existing) {
      updateAppointment(existing.id, data);
      if (justCompleted && produitsUtilises.length) completeAppointmentAndConsume(existing.id, produitsUtilises);
    } else {
      const item = addAppointment(data);
      if (justCompleted && produitsUtilises.length) completeAppointmentAndConsume(item.id, produitsUtilises);
    }
    setSaving(false);
    onClose();
  }

  function handleDelete() {
    if (!confirm('Supprimer ce rendez-vous ?')) return;
    deleteAppointment(existing.id);
    onClose();
  }

  const productName = (id) => products.find((p) => p.id === id)?.nom || '?';

  return (
    <Modal onClose={onClose} title={existing ? 'Modifier le rendez-vous' : 'Nouveau rendez-vous'}>
      <form onSubmit={handleSave}>
        <div className="field">
          <label>Cliente</label>
          <select value={clientId} onChange={(e) => setClientId(e.target.value)}>
            <option value="" disabled>Choisir...</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
          </select>
        </div>
        {services.length > 0 && (
          <div className="field">
            <label>Prestation (catalogue, optionnel)</label>
            <select value={serviceId} onChange={(e) => handleServiceChange(e.target.value)}>
              <option value="">Aucune / personnalisé</option>
              {services.map((s) => <option key={s.id} value={s.id}>{s.nom}{s.prix != null ? ` — ${fmtEuro(s.prix)}` : ''}</option>)}
            </select>
          </div>
        )}
        <div className="row">
          <div className="field">
            <label>Date &amp; heure</label>
            <input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="field">
            <label>Statut</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="planifie">Prévu</option>
              <option value="termine">Terminé</option>
              <option value="annule">Annulé</option>
            </select>
          </div>
        </div>
        <div className="row">
          <div className="field">
            <label>Tarif (€)</label>
            <input type="number" step="0.5" min="0" value={prix} onChange={(e) => setPrix(e.target.value)} placeholder="35" />
          </div>
          <div className="field">
            <label>Adresse</label>
            <input value={adresse} onChange={(e) => setAdresse(e.target.value)} placeholder="Laisser vide = adresse de la cliente" />
          </div>
        </div>
        <div className="row">
          <div className="field">
            <label>Durée (min)</label>
            <input type="number" step="5" min="0" value={dureeMin} onChange={(e) => setDureeMin(e.target.value)} placeholder="180" />
          </div>
          <div className="field">
            <label>Trajet A/R (min)</label>
            <input type="number" step="5" min="0" value={trajetMin} onChange={(e) => setTrajetMin(e.target.value)} placeholder="30" />
          </div>
          <div className="field">
            <label>Coût produits (€)</label>
            <input type="number" step="0.5" min="0" value={coutProduits} onChange={(e) => setCoutProduits(e.target.value)} placeholder="15" />
          </div>
        </div>
        {products.length > 0 && (
          <div className="field">
            <label>Produits utilisés (stock)</label>
            {produitsUtilises.length > 0 && (
              <div style={{ marginBottom: 8 }}>
                {produitsUtilises.map((p) => (
                  <span key={p.productId} className="pill pill-tag" style={{ marginRight: 6, marginBottom: 6, display: 'inline-flex', gap: 4 }}>
                    {productName(p.productId)} × {p.quantite}
                    <X size={12} style={{ cursor: 'pointer' }} onClick={() => removeProduitUtilise(p.productId)} />
                  </span>
                ))}
              </div>
            )}
            <div className="row">
              <select style={{ flex: 2 }} value={pickProduct} onChange={(e) => setPickProduct(e.target.value)}>
                <option value="">Choisir un produit...</option>
                {products.map((p) => <option key={p.id} value={p.id}>{p.nom} ({p.quantite} en stock)</option>)}
              </select>
              <input type="number" min="1" style={{ flex: 1 }} value={pickQty} onChange={(e) => setPickQty(e.target.value)} />
              <button type="button" className="btn btn-ghost btn-sm" onClick={addProduitUtilise}><Plus size={16} /></button>
            </div>
          </div>
        )}
        <div className="field">
          <label>Notes</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Prestation, remarques..." />
        </div>
        {existing && (
          <div className="field">
            <label>Photos / vidéos de la prestation</label>
            <MediaGallery mediaKey={existing.id} />
          </div>
        )}
        {msg && <div className="status-msg">{msg}</div>}
        <div className="row" style={{ marginTop: 14 }}>
          <button className="btn btn-primary" style={{ flex: 1 }} disabled={saving} type="submit">
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
          {existing && <button type="button" className="btn btn-danger" onClick={handleDelete}>Supprimer</button>}
        </div>
      </form>
    </Modal>
  );
}
