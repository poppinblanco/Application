import { useMemo, useState } from 'react';
import { Mail, Copy, Send, Check } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import TopBar from '../components/TopBar';
import { fmtDate } from '../utils/format';

const SEGMENTS = [
  { key: 'prospect', label: 'Prospects' },
  { key: 'active', label: 'Clientes actives' },
  { key: 'inactive', label: 'Inactives' }
];

const PRESETS = [
  { label: 'Promo', subject: 'Offre spéciale chez nous', body: "Bonjour,\n\nProfitez d'une offre spéciale ce mois-ci !\n\nÀ très vite,\n" },
  { label: 'Nouveauté', subject: 'Une nouveauté à découvrir', body: 'Bonjour,\n\nJe vous annonce une nouveauté...\n\nÀ bientôt,\n' },
  { label: 'Rappel', subject: 'Ça fait longtemps !', body: "Bonjour,\n\nCela fait un moment qu'on ne s'est pas vues, n'hésitez pas à reprendre rendez-vous !\n\n" }
];

function parseManualEmails(text) {
  return text
    .split(/[\n,;]+/)
    .map((s) => s.trim())
    .filter((s) => s.includes('@'));
}

export default function Marketing() {
  const { clients, campaigns, addCampaign } = useData();
  const [selectedSegments, setSelectedSegments] = useState(['prospect', 'active', 'inactive']);
  const [manualEmails, setManualEmails] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [copied, setCopied] = useState(false);

  function toggleSegment(key) {
    setSelectedSegments((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  }

  const segmentEmails = useMemo(() => {
    return clients
      .filter((c) => selectedSegments.includes(c.statut || 'active'))
      .map((c) => c.email)
      .filter(Boolean);
  }, [clients, selectedSegments]);

  const manualList = useMemo(() => parseManualEmails(manualEmails), [manualEmails]);

  const allRecipients = useMemo(() => Array.from(new Set([...segmentEmails, ...manualList])), [segmentEmails, manualList]);

  const segmentCounts = SEGMENTS.map((s) => ({
    ...s,
    total: clients.filter((c) => (c.statut || 'active') === s.key).length,
    withEmail: clients.filter((c) => (c.statut || 'active') === s.key && c.email).length
  }));

  function logCampaign() {
    addCampaign({ subject, recipientCount: allRecipients.length, date: new Date().toISOString() });
  }

  function openMailClient() {
    if (allRecipients.length === 0) return;
    const url = `mailto:?bcc=${encodeURIComponent(allRecipients.join(','))}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = url;
    logCampaign();
  }

  async function copyEmails() {
    if (allRecipients.length === 0) return;
    try {
      await navigator.clipboard.writeText(allRecipients.join(', '));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) { /* clipboard unavailable */ }
  }

  return (
    <>
      <TopBar title="Email groupé" tag="Marketing" tagClass="m-marketing-bg" sub="Contactez vos clientes et prospects par email" />
      <main className="page">
        <div className="card" style={{ background: 'var(--m-marketing-soft)', borderColor: 'transparent' }}>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text)', lineHeight: 1.5 }}>
            L'application n'envoie pas les emails elle-même (elle reste 100% hors ligne). En appuyant sur
            « Ouvrir dans mon application email », votre appli mail habituelle s'ouvre avec le message déjà prêt
            et tous les destinataires en copie cachée (Cci) — c'est vous qui appuyez sur Envoyer depuis votre
            propre adresse.
          </p>
        </div>

        <div className="card">
          <div className="card-title">Destinataires</div>
          {segmentCounts.map((s) => (
            <label key={s.key} className="list-item" style={{ cursor: 'pointer' }}>
              <input type="checkbox" checked={selectedSegments.includes(s.key)} onChange={() => toggleSegment(s.key)} style={{ width: 20, height: 20 }} />
              <div>
                <div className="item-title">{s.label}</div>
                <div className="item-sub">{s.withEmail} / {s.total} avec un email enregistré</div>
              </div>
            </label>
          ))}
          <div className="field" style={{ marginTop: 10 }}>
            <label>Autres destinataires (particuliers, prospects hors fichier)</label>
            <textarea
              value={manualEmails}
              onChange={(e) => setManualEmails(e.target.value)}
              placeholder="une adresse par ligne, ou séparées par des virgules"
            />
          </div>
          <div className="status-msg ok" style={{ fontWeight: 700 }}>
            {allRecipients.length} destinataire(s) au total
          </div>
        </div>

        <div className="card">
          <div className="card-title">Message</div>
          <div className="chip-row">
            {PRESETS.map((p) => (
              <button key={p.label} className="chip" onClick={() => { setSubject(p.subject); setBody(p.body); }}>{p.label}</button>
            ))}
          </div>
          <div className="field">
            <label>Objet</label>
            <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Objet de l'email" />
          </div>
          <div className="field">
            <label>Message</label>
            <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Votre message..." style={{ minHeight: 140 }} />
          </div>
          <div className="row">
            <button className="btn btn-primary" style={{ flex: 1 }} disabled={allRecipients.length === 0 || !subject.trim()} onClick={openMailClient}>
              <Send size={16} /> Ouvrir dans mon application email
            </button>
            <button className="btn btn-outline" onClick={copyEmails} disabled={allRecipients.length === 0}>
              {copied ? <Check size={16} /> : <Copy size={16} />}
            </button>
          </div>
          <div className="item-sub" style={{ marginTop: 8 }}>
            Si vous avez beaucoup de destinataires et que l'application email ne s'ouvre pas correctement,
            utilisez le bouton copier pour coller les adresses manuellement dans le champ Cci de votre appli mail.
          </div>
        </div>

        {campaigns.length > 0 && (
          <div className="card">
            <div className="card-title"><Mail size={18} /> Historique des envois</div>
            {[...campaigns].reverse().map((c) => (
              <div key={c.id} className="list-item" style={{ cursor: 'default' }}>
                <div>
                  <div className="item-title">{c.subject}</div>
                  <div className="item-sub">{fmtDate(c.date)} · {c.recipientCount} destinataire(s)</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
