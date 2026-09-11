import { useState } from 'react';
import Modal from './Modal';
import { useData } from '../contexts/DataContext';

export default function ProductForm({ existing, onClose }) {
  const { addProduct, updateProduct, deleteProduct } = useData();
  const [nom, setNom] = useState(existing?.nom || '');
  const [quantite, setQuantite] = useState(existing?.quantite ?? 0);
  const [unite, setUnite] = useState(existing?.unite || 'unité');
  const [seuilAlerte, setSeuilAlerte] = useState(existing?.seuilAlerte ?? 2);
  const [prixAchat, setPrixAchat] = useState(existing?.prixAchat ?? '');

  function handleSave(e) {
    e.preventDefault();
    if (!nom.trim()) return;
    const data = {
      nom: nom.trim(),
      quantite: parseFloat(quantite) || 0,
      unite: unite.trim() || 'unité',
      seuilAlerte: parseFloat(seuilAlerte) || 0,
      prixAchat: prixAchat !== '' ? parseFloat(prixAchat) : null
    };
    if (existing) updateProduct(existing.id, data);
    else addProduct(data);
    onClose();
  }

  function handleDelete() {
    if (!confirm('Supprimer ce produit du stock ?')) return;
    deleteProduct(existing.id);
    onClose();
  }

  return (
    <Modal onClose={onClose} title={existing ? 'Modifier le produit' : 'Nouveau produit'}>
      <form onSubmit={handleSave}>
        <div className="field">
          <label>Nom du produit</label>
          <input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Ex : Mèches châtain 27" autoFocus />
        </div>
        <div className="row">
          <div className="field">
            <label>Quantité en stock</label>
            <input type="number" step="1" min="0" value={quantite} onChange={(e) => setQuantite(e.target.value)} />
          </div>
          <div className="field">
            <label>Unité</label>
            <input value={unite} onChange={(e) => setUnite(e.target.value)} placeholder="paquet, unité..." />
          </div>
        </div>
        <div className="row">
          <div className="field">
            <label>Seuil d'alerte</label>
            <input type="number" step="1" min="0" value={seuilAlerte} onChange={(e) => setSeuilAlerte(e.target.value)} />
          </div>
          <div className="field">
            <label>Prix d'achat (€)</label>
            <input type="number" step="0.5" min="0" value={prixAchat} onChange={(e) => setPrixAchat(e.target.value)} placeholder="8" />
          </div>
        </div>
        <div className="row" style={{ marginTop: 14 }}>
          <button className="btn btn-primary" style={{ flex: 1 }} type="submit">Enregistrer</button>
          {existing && <button type="button" className="btn btn-danger" onClick={handleDelete}>Supprimer</button>}
        </div>
      </form>
    </Modal>
  );
}
