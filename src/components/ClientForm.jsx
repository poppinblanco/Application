import { useState } from 'react';
import Modal from './Modal';
import MediaGallery from './MediaGallery';
import { geocode } from '../utils/geocode';
import { useData } from '../contexts/DataContext';

const TAG_SUGGESTIONS = ['Enfant', 'Adulte', 'Homme', 'Régulière', 'Nouvelle', 'À domicile'];

export default function ClientForm({ existing, onClose, onDeleted }) {
  const { addClient, updateClient, deleteClient } = useData();
  const [nom, setNom] = useState(existing?.nom || '');
  const [telephone, setTelephone] = useState(existing?.telephone || '');
  const [email, setEmail] = useState(existing?.email || '');
  const [adresse, setAdresse] = useState(existing?.adresse || '');
  const [notes, setNotes] = useState(existing?.notes || '');
  const [tags, setTags] = useState(existing?.tags || []);
  const [tagInput, setTagInput] = useState('');
  const [statut, setStatut] = useState(existing?.statut || 'active');
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');

  function addTag(t) {
    const v = t.trim();
    if (v && !tags.includes(v)) setTags([...tags, v]);
    setTagInput('');
  }
  function removeTag(t) { setTags(tags.filter((x) => x !== t)); }

  async function handleSave(e) {
    e.preventDefault();
    if (!nom.trim()) { setStatus('Le nom est obligatoire.'); return; }
    setSaving(true);
    let lat = existing?.lat ?? null;
    let lng = existing?.lng ?? null;
    if (adresse.trim() && adresse !== existing?.adresse) {
      setStatus(navigator.onLine ? 'Localisation de l’adresse...' : 'Hors ligne : localisation impossible pour le moment.');
      const coords = await geocode(adresse);
      if (coords) { lat = coords.lat; lng = coords.lng; }
      else { lat = null; lng = null; }
    } else if (!adresse.trim()) { lat = null; lng = null; }

    const data = { nom: nom.trim(), telephone: telephone.trim(), email: email.trim(), adresse: adresse.trim(), notes: notes.trim(), tags, statut, lat, lng };
    if (existing) updateClient(existing.id, data);
    else addClient(data);
    setSaving(false);
    onClose();
  }

  function handleDelete() {
    if (!confirm("Supprimer cette cliente et son historique de rendez-vous ?")) return;
    deleteClient(existing.id);
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
          <label>Statut (pipeline)</label>
          <select value={statut} onChange={(e) => setStatut(e.target.value)}>
            <option value="prospect">Prospect</option>
            <option value="active">Cliente active</option>
            <option value="inactive">Inactive</option>
          </select>
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
        {existing && (
          <div className="field">
            <label>Photos / vidéos</label>
            <MediaGallery mediaKey={'client:' + existing.id} />
          </div>
        )}
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
