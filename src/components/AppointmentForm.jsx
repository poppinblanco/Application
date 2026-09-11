import { useState } from 'react';
import Modal from './Modal';
import { geocode } from '../utils/geocode';
import { addItem, updateItem, deleteItem, uploadPhoto, deletePhoto } from '../lib/firestore';
import { useData } from '../contexts/DataContext';

function toLocalInput(iso) {
  const d = iso ? new Date(iso) : new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export default function AppointmentForm({ existing, defaultClientId, defaultDate, onClose }) {
  const { clients } = useData();
  const [clientId, setClientId] = useState(existing?.clientId || defaultClientId || clients[0]?.id || '');
  const [date, setDate] = useState(toLocalInput(existing?.date || defaultDate));
  const [status, setStatus] = useState(existing?.status || 'planifie');
  const [prix, setPrix] = useState(existing?.prix ?? '');
  const [adresse, setAdresse] = useState(existing?.adresse || '');
  const [dureeMin, setDureeMin] = useState(existing?.dureeMin ?? '');
  const [trajetMin, setTrajetMin] = useState(existing?.trajetMin ?? '');
  const [coutProduits, setCoutProduits] = useState(existing?.coutProduits ?? '');
  const [notes, setNotes] = useState(existing?.notes || '');
  const [photos, setPhotos] = useState(existing?.photos || []);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  async function handlePhotoUpload(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setMsg('Ajout des photos...');
    const key = existing?.id || 'temp_' + Date.now();
    const uploaded = [];
    for (const f of files) {
      try { uploaded.push(await uploadPhoto(`appointments/${key}`, f)); } catch (err) { /* skip */ }
    }
    setPhotos((p) => [...p, ...uploaded]);
    setMsg('');
  }
  async function removePhoto(idx) {
    const p = photos[idx];
    if (p?.path) await deletePhoto(p.path);
    setPhotos(photos.filter((_, i) => i !== idx));
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
      setMsg('Localisation...');
      const coords = await geocode(finalAdresse);
      if (coords) { lat = coords.lat; lng = coords.lng; } else { lat = null; lng = null; }
    }
    const data = {
      clientId,
      date: new Date(date).toISOString(),
      status,
      adresse: finalAdresse,
      notes: notes.trim(),
      prix: prix !== '' ? parseFloat(prix) : null,
      dureeMin: dureeMin !== '' ? parseFloat(dureeMin) : null,
      trajetMin: trajetMin !== '' ? parseFloat(trajetMin) : null,
      coutProduits: coutProduits !== '' ? parseFloat(coutProduits) : null,
      photos,
      lat, lng
    };
    try {
      if (existing) await updateItem('appointments', existing.id, data);
      else await addItem('appointments', data);
      onClose();
    } catch (err) {
      setMsg('Erreur lors de l’enregistrement.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm('Supprimer ce rendez-vous ?')) return;
    await deleteItem('appointments', existing.id);
    onClose();
  }

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
        <div className="field">
          <label>Notes</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Prestation, remarques..." />
        </div>
        <div className="field">
          <label>Photos</label>
          <div className="photo-grid">
            {photos.map((p, i) => (
              <div className="photo-thumb" key={p.path || i}>
                <img src={p.url} alt="" />
                <button type="button" className="rm" onClick={() => removePhoto(i)}>×</button>
              </div>
            ))}
          </div>
          <input type="file" accept="image/*" multiple onChange={handlePhotoUpload} style={{ marginTop: 8 }} />
        </div>
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
