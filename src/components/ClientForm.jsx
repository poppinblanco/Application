import { useState } from 'react';
import Modal from './Modal';
import { geocode } from '../utils/geocode';
import { addItem, updateItem, deleteItem, uploadPhoto, deletePhoto } from '../lib/firestore';

const TAG_SUGGESTIONS = ['Enfant', 'Adulte', 'Homme', 'Régulière', 'Nouvelle', 'À domicile'];

export default function ClientForm({ existing, onClose, onDeleted }) {
  const [nom, setNom] = useState(existing?.nom || '');
  const [telephone, setTelephone] = useState(existing?.telephone || '');
  const [email, setEmail] = useState(existing?.email || '');
  const [adresse, setAdresse] = useState(existing?.adresse || '');
  const [notes, setNotes] = useState(existing?.notes || '');
  const [tags, setTags] = useState(existing?.tags || []);
  const [tagInput, setTagInput] = useState('');
  const [photos, setPhotos] = useState(existing?.photos || []);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');

  function addTag(t) {
    const v = t.trim();
    if (v && !tags.includes(v)) setTags([...tags, v]);
    setTagInput('');
  }
  function removeTag(t) { setTags(tags.filter((x) => x !== t)); }

  async function handlePhotoUpload(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setStatus('Ajout des photos...');
    const key = existing?.id || 'temp_' + Date.now();
    const uploaded = [];
    for (const f of files) {
      try { uploaded.push(await uploadPhoto(`clients/${key}`, f)); } catch (err) { /* skip */ }
    }
    setPhotos((p) => [...p, ...uploaded]);
    setStatus('');
  }
  async function removePhoto(idx) {
    const p = photos[idx];
    if (p?.path) await deletePhoto(p.path);
    setPhotos(photos.filter((_, i) => i !== idx));
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!nom.trim()) { setStatus('Le nom est obligatoire.'); return; }
    setSaving(true);
    let lat = existing?.lat ?? null;
    let lng = existing?.lng ?? null;
    if (adresse.trim() && adresse !== existing?.adresse) {
      setStatus('Localisation de l’adresse...');
      const coords = await geocode(adresse);
      if (coords) { lat = coords.lat; lng = coords.lng; }
      else { lat = null; lng = null; }
    } else if (!adresse.trim()) { lat = null; lng = null; }

    const data = { nom: nom.trim(), telephone: telephone.trim(), email: email.trim(), adresse: adresse.trim(), notes: notes.trim(), tags, photos, lat, lng };
    try {
      if (existing) await updateItem('clients', existing.id, data);
      else await addItem('clients', data);
      onClose();
    } catch (err) {
      setStatus("Erreur lors de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Supprimer cette cliente et son historique de rendez-vous ?")) return;
    await deleteItem('clients', existing.id);
    onClose();
    onDeleted?.();
  }

  return (
    <Modal onClose={onClose} title={existing ? 'Modifier la cliente' : 'Nouvelle cliente'}>
      <form onSubmit={handleSave}>
        <div className="field">
          <label>Nom</label>
          <input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Nom de la cliente" autoFocus />
        </div>
        <div className="row">
          <div className="field">
            <label>Téléphone</label>
            <input type="tel" value={telephone} onChange={(e) => setTelephone(e.target.value)} placeholder="06 12 34 56 78" />
          </div>
          <div className="field">
            <label>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@exemple.com" />
          </div>
        </div>
        <div className="field">
          <label>Adresse</label>
          <input value={adresse} onChange={(e) => setAdresse(e.target.value)} placeholder="Adresse, ville" />
        </div>
        <div className="field">
          <label>Tags</label>
          <div className="tag-input-wrap" style={{ marginBottom: 8 }}>
            {tags.map((t) => (
              <span key={t} className="pill pill-tag" style={{ cursor: 'pointer' }} onClick={() => removeTag(t)}>{t} ×</span>
            ))}
          </div>
          <div className="chip-row">
            {TAG_SUGGESTIONS.filter((t) => !tags.includes(t)).map((t) => (
              <button type="button" key={t} className="chip" onClick={() => addTag(t)}>{t}</button>
            ))}
          </div>
          <input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(tagInput); } }}
            placeholder="Ajouter un tag personnalisé..."
            style={{ marginTop: 8 }}
          />
        </div>
        <div className="field">
          <label>Notes (coiffure préférée, allergies...)</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
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
        {status && <div className="status-msg">{status}</div>}
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
