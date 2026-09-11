import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import TopBar from '../components/TopBar';
import ClientForm from '../components/ClientForm';
import { initials } from '../utils/format';

export default function Clients() {
  const { clients, ready } = useData();
  const [search, setSearch] = useState('');
  const [activeTag, setActiveTag] = useState(null);
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const showNew = params.get('new') === '1';

  const allTags = useMemo(() => {
    const s = new Set();
    clients.forEach((c) => (c.tags || []).forEach((t) => s.add(t)));
    return Array.from(s);
  }, [clients]);

  const filtered = clients
    .filter((c) => c.nom.toLowerCase().includes(search.toLowerCase()) || (c.telephone || '').includes(search) || (c.adresse || '').toLowerCase().includes(search.toLowerCase()))
    .filter((c) => !activeTag || (c.tags || []).includes(activeTag))
    .sort((a, b) => a.nom.localeCompare(b.nom));

  function closeNew() { setParams({}, { replace: true }); }

  if (!ready) return <div className="empty" style={{ paddingTop: 60 }}>Chargement…</div>;

  return (
    <>
      <TopBar
        title={<>Clientes <span className="badge-count">{clients.length}</span></>}
        right={<button className="btn btn-primary btn-sm" onClick={() => setParams({ new: '1' })}>+ Nouvelle</button>}
      />
      <main className="page">
        <div className="search-bar">
          <span className="icon">🔎</span>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher nom, téléphone, adresse..." />
        </div>
        {allTags.length > 0 && (
          <div className="chip-row">
            <button className={`chip ${!activeTag ? 'active' : ''}`} onClick={() => setActiveTag(null)}>Toutes</button>
            {allTags.map((t) => (
              <button key={t} className={`chip ${activeTag === t ? 'active' : ''}`} onClick={() => setActiveTag(t)}>{t}</button>
            ))}
          </div>
        )}
        <div className="card">
          {filtered.length === 0 ? (
            <div className="empty"><span className="emoji">🪮</span>Aucune cliente trouvée.</div>
          ) : (
            filtered.map((c) => (
              <div key={c.id} className="list-item" onClick={() => navigate(`/clients/${c.id}`)}>
                <div className="avatar">{initials(c.nom)}</div>
                <div>
                  <div className="item-title">{c.nom}</div>
                  <div className="item-sub">{c.telephone || '—'}{c.adresse ? ' · ' + c.adresse : ''}</div>
                </div>
                <span className="chevron">›</span>
              </div>
            ))
          )}
        </div>
      </main>
      {showNew && <ClientForm onClose={closeNew} />}
    </>
  );
}
