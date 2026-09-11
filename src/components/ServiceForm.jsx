import { useState } from 'react';
import Modal from './Modal';
import { useData } from '../contexts/DataContext';

export default function ServiceForm({ existing, onClose }) {
  const { addService, updateService, deleteService } = useData();
  const [nom, setNom] = useState(existing?.nom || '');
  const [prix, setPrix] = useState(existing?.prix ?? '');
  const [dureeMin, setDureeMin] = useState(existing?.dureeMin ?? '');
  const [categorie, setCategorie] = useState(existing?.categorie || '');
  const [description, setDescription] = useState(existing?.description || '');

  function handleSave(e) {
    e.preventDefault();
    if (!nom.trim()) return;
    const data = {
      nom: nom.trim(),
      prix: prix !== '' ? parseFloat(prix) : null,
      dureeMin: dureeMin !== '' ? parseFloat(dureeMin) : null,
      categorie: categorie.trim(),
      description: description.trim()
    };
    if (existing) updateService(existing.id, data);
    else addService(data);
    onClose();
  }

  function handleDelete() {
    if (!confirm('Supprimer cette prestation du catalogue ?')) return;
    deleteService(existing.id);
    onClose();
  }

  return (
    <Modal onClose={onClose} title={existing ? 'Modifier la prestation' : 'Nouvelle prestation'}>
      <form onSubmit={handleSave}>
        <div className="field">
          <label>Nom de la prestation</label>
          <input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Ex : Braids mi-long" autoFocus />
        </div>
        <div className="row">
          <div className="field">
            <label>Prix (€)</label>
            <input type="number" step="0.5" min="0" value={prix} onChange={(e) => setPrix(e.target.value)} placeholder="50" />
          </div>
          <div className="field">
            <label>Durée (min)</label>
            <input type="number" step="5" min="0" value={dureeMin} onChange={(e) => setDureeMin(e.target.value)} placeholder="120" />
          </div>
        </div>
        <div className="field">
          <label>Catégorie</label>
          <input value={categorie} onChange={(e) => setCategorie(e.target.value)} placeholder="Ex : Tresses, Coupe, Coloration..." />
        </div>
        <div className="field">
          <label>Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Détails, options..." />
        </div>
        <div className="row" style={{ marginTop: 14 }}>
          <button className="btn btn-primary" style={{ flex: 1 }} type="submit">Enregistrer</button>
          {existing && <button type="button" className="btn btn-danger" onClick={handleDelete}>Supprimer</button>}
        </div>
      </form>
    </Modal>
  );
}
