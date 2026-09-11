import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import TopBar from '../components/TopBar';
import ServiceForm from '../components/ServiceForm';
import { fmtEuro } from '../utils/format';

export default function Catalogue() {
  const { services } = useData();
  const [editing, setEditing] = useState(null);
  const [adding, setAdding] = useState(false);

  const byCategorie = services.reduce((acc, s) => {
    const key = s.categorie || 'Autres';
    (acc[key] = acc[key] || []).push(s);
    return acc;
  }, {});

  return (
    <>
      <TopBar
        title="Prestations"
        tag="Catalogue"
        tagClass="m-catalogue-bg"
        sub={`${services.length} prestation(s) enregistrée(s)`}
        right={<button className="btn btn-primary btn-sm" onClick={() => setAdding(true)}>+ Ajouter</button>}
      />
      <main className="page">
        {services.length === 0 ? (
          <div className="card"><div className="empty"><Sparkles size={32} />Aucune prestation enregistrée.<br />Créez votre catalogue pour gagner du temps à chaque rendez-vous.</div></div>
        ) : (
          Object.entries(byCategorie).map(([cat, list]) => (
            <div className="card" key={cat}>
              <div className="card-title">{cat}</div>
              {list.map((s) => (
                <div key={s.id} className="list-item" onClick={() => setEditing(s)}>
                  <div className="icon-badge icon-badge-sm m-catalogue-bg"><Sparkles /></div>
                  <div>
                    <div className="item-title">{s.nom}</div>
                    <div className="item-sub">{s.dureeMin ? `${s.dureeMin} min` : ''}{s.description ? ' · ' + s.description : ''}</div>
                  </div>
                  {s.prix != null && <span className="pill pill-price" style={{ marginLeft: 'auto' }}>{fmtEuro(s.prix)}</span>}
                </div>
              ))}
            </div>
          ))
        )}
      </main>
      {adding && <ServiceForm onClose={() => setAdding(false)} />}
      {editing && <ServiceForm existing={editing} onClose={() => setEditing(null)} />}
    </>
  );
}
