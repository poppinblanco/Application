import { useState } from 'react';
import { Receipt, FileText } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import TopBar from '../components/TopBar';
import DocumentForm from '../components/DocumentForm';
import { fmtDate, fmtEuro } from '../utils/format';
import { generateDocumentPdf } from '../utils/invoicePdf';

const STATUT_LABELS = {
  brouillon: 'Brouillon', envoye: 'Envoyé', accepte: 'Accepté', refuse: 'Refusé', converti: 'Converti',
  impayee: 'Impayée', payee: 'Payée'
};
const STATUT_PILL = {
  brouillon: 'pill-tag', envoye: 'pill-planned', accepte: 'pill-done', refuse: 'pill-cancelled', converti: 'pill-tag',
  impayee: 'pill-cancelled', payee: 'pill-done'
};

function docTotal(doc) {
  return (doc.items || []).reduce((s, it) => s + (parseFloat(it.quantite) || 0) * (parseFloat(it.prixUnitaire) || 0), 0);
}

export default function Factures() {
  const { clients, quotes, invoices, settings, convertQuoteToInvoice, updateInvoice } = useData();
  const [tab, setTab] = useState('factures');
  const [editing, setEditing] = useState(null);
  const [adding, setAdding] = useState(false);

  const clientName = (id) => clients.find((c) => c.id === id)?.nom || '(cliente supprimée)';
  const list = tab === 'factures' ? [...invoices].reverse() : [...quotes].reverse();

  function downloadPdf(doc) {
    generateDocumentPdf({ doc, client: clients.find((c) => c.id === doc.clientId), business: settings, kind: tab === 'factures' ? 'facture' : 'devis' });
  }

  return (
    <>
      <TopBar
        title="Devis & Factures"
        tag="Facturation"
        tagClass="m-facturation-bg"
        right={<button className="btn btn-primary btn-sm" onClick={() => setAdding(true)}>+ Nouveau</button>}
      />
      <main className="page">
        <div className="chip-row">
          <button className={`chip ${tab === 'factures' ? 'active' : ''}`} onClick={() => setTab('factures')}>Factures ({invoices.length})</button>
          <button className={`chip ${tab === 'devis' ? 'active' : ''}`} onClick={() => setTab('devis')}>Devis ({quotes.length})</button>
        </div>
        <div className="card">
          {list.length === 0 ? (
            <div className="empty">{tab === 'factures' ? <Receipt size={32} /> : <FileText size={32} />}{tab === 'factures' ? 'Aucune facture' : 'Aucun devis'} pour l'instant.</div>
          ) : (
            list.map((doc) => (
              <div key={doc.id} className="divider-item">
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, cursor: 'pointer' }} onClick={() => setEditing(doc)}>
                  <div>
                    <div className="item-title">{doc.numero} — {clientName(doc.clientId)}</div>
                    <div className="item-sub">{fmtDate(doc.date)}</div>
                    <span className={`pill ${STATUT_PILL[doc.statut] || 'pill-tag'}`} style={{ marginTop: 6, display: 'inline-flex' }}>{STATUT_LABELS[doc.statut] || doc.statut}</span>
                  </div>
                  <span className="pill pill-price">{fmtEuro(docTotal(doc))}</span>
                </div>
                <div className="row" style={{ marginTop: 10 }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => downloadPdf(doc)}>📄 PDF</button>
                  {tab === 'devis' && doc.statut !== 'converti' && (
                    <button className="btn btn-accent btn-sm" onClick={() => convertQuoteToInvoice(doc)}>→ Facturer</button>
                  )}
                  {tab === 'factures' && doc.statut !== 'payee' && (
                    <button className="btn btn-accent btn-sm" onClick={() => updateInvoice(doc.id, { statut: 'payee' })}>✓ Marquer payée</button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </main>
      {adding && <DocumentForm kind={tab === 'factures' ? 'facture' : 'devis'} onClose={() => setAdding(false)} />}
      {editing && <DocumentForm kind={tab === 'factures' ? 'facture' : 'devis'} existing={editing} onClose={() => setEditing(null)} />}
    </>
  );
}
