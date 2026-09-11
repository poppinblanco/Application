import { useState } from 'react';
import { Copy, Check, Phone, Mail, Users } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import TopBar from '../components/TopBar';

const SEGMENTS = [
  { key: 'prospect', label: 'Prospects' },
  { key: 'active', label: 'Clientes actives' },
  { key: 'inactive', label: 'Inactives' }
];

function dedup(list) { return Array.from(new Set(list.filter(Boolean))); }

function CopyButton({ label, values }) {
  const [copied, setCopied] = useState(false);
  async function handleCopy() {
    if (values.length === 0) return;
    try {
      await navigator.clipboard.writeText(values.join(', '));
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch (e) { /* clipboard unavailable */ }
  }
  return (
    <button className="btn btn-outline btn-sm" disabled={values.length === 0} onClick={handleCopy}>
      {copied ? <Check size={14} /> : <Copy size={14} />} {label} ({values.length})
    </button>
  );
}

export default function Contacts() {
  const { clients } = useData();

  const allEmails = dedup(clients.map((c) => c.email));
  const allPhones = dedup(clients.map((c) => c.telephone));

  return (
    <>
      <TopBar title="Contacts" tag="Répertoire" tagClass="m-marketing-bg" sub="Regroupez vos coordonnées pour les coller ailleurs (Gmail, SMS...)" />
      <main className="page">
        <div className="card">
          <div className="card-title"><Users size={18} /> Toutes les clientes</div>
          <div className="row">
            <CopyButton label="Copier tous les emails" values={allEmails} />
            <CopyButton label="Copier tous les téléphones" values={allPhones} />
          </div>
          <div className="item-sub" style={{ marginTop: 8 }}>
            Colle le résultat directement dans le champ « Cci » de Gmail pour un envoi groupé, ou dans un SMS groupé.
          </div>
        </div>

        {SEGMENTS.map((seg) => {
          const group = clients.filter((c) => (c.statut || 'active') === seg.key).sort((a, b) => a.nom.localeCompare(b.nom));
          const emails = dedup(group.map((c) => c.email));
          const phones = dedup(group.map((c) => c.telephone));
          return (
            <div className="card" key={seg.key}>
              <div className="card-title">{seg.label} <span className="badge-count">{group.length}</span></div>
              <div className="row" style={{ marginBottom: 10 }}>
                <CopyButton label="Emails" values={emails} />
                <CopyButton label="Téléphones" values={phones} />
              </div>
              {group.length === 0 ? (
                <div className="empty" style={{ padding: 12 }}>Aucune cliente dans cette liste.</div>
              ) : (
                group.map((c) => (
                  <div key={c.id} className="list-item" style={{ cursor: 'default' }}>
                    <div>
                      <div className="item-title">{c.nom}</div>
                      <div className="item-sub" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                        {c.telephone && <span><Phone size={11} style={{ verticalAlign: -1 }} /> {c.telephone}</span>}
                        {c.email && <span><Mail size={11} style={{ verticalAlign: -1 }} /> {c.email}</span>}
                        {!c.telephone && !c.email && '—'}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          );
        })}
      </main>
    </>
  );
}
