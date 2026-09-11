import { useState } from 'react';
import { Package, TriangleAlert, Plus, Minus } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import TopBar from '../components/TopBar';
import ProductForm from '../components/ProductForm';
import { fmtEuro } from '../utils/format';

export default function Stock() {
  const { products, adjustStock } = useData();
  const [editing, setEditing] = useState(null);
  const [adding, setAdding] = useState(false);

  const sorted = [...products].sort((a, b) => a.nom.localeCompare(b.nom));
  const lowStock = sorted.filter((p) => p.quantite <= p.seuilAlerte);

  return (
    <>
      <TopBar
        title="Stock"
        tag="Produits & mèches"
        tagClass="m-stock-bg"
        sub={`${products.length} produit(s)`}
        right={<button className="btn btn-primary btn-sm" onClick={() => setAdding(true)}>+ Ajouter</button>}
      />
      <main className="page">
        {lowStock.length > 0 && (
          <div className="card" style={{ borderColor: 'var(--warning)' }}>
            <div className="card-title" style={{ color: 'var(--warning)' }}><TriangleAlert size={18} /> Stock bas</div>
            {lowStock.map((p) => (
              <div key={p.id} className="item-sub" style={{ marginBottom: 4 }}>{p.nom} — {p.quantite} {p.unite} restant(s)</div>
            ))}
          </div>
        )}
        <div className="card">
          {sorted.length === 0 ? (
            <div className="empty"><Package size={32} />Aucun produit enregistré.<br />Ajoutez vos mèches et produits pour suivre votre stock.</div>
          ) : (
            sorted.map((p) => {
              const low = p.quantite <= p.seuilAlerte;
              return (
                <div key={p.id} className="list-item" onClick={() => setEditing(p)}>
                  <div className={`icon-badge icon-badge-sm ${low ? '' : 'm-stock-bg'}`} style={low ? { background: 'var(--danger-soft)', color: 'var(--danger)' } : undefined}>
                    <Package />
                  </div>
                  <div>
                    <div className="item-title">{p.nom}</div>
                    <div className="item-sub">{p.quantite} {p.unite}{p.prixAchat != null ? ' · ' + fmtEuro(p.prixAchat) + ' achat' : ''}</div>
                  </div>
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                    <button className="btn-icon" onClick={(e) => { e.stopPropagation(); adjustStock(p.id, -1); }}><Minus size={14} /></button>
                    <button className="btn-icon" onClick={(e) => { e.stopPropagation(); adjustStock(p.id, 1); }}><Plus size={14} /></button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>
      {adding && <ProductForm onClose={() => setAdding(false)} />}
      {editing && <ProductForm existing={editing} onClose={() => setEditing(null)} />}
    </>
  );
}
