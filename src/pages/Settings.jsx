import { useState } from 'react';
import { useData } from '../contexts/DataContext';
import TopBar from '../components/TopBar';
import { saveSettings } from '../lib/firestore';
import { emailConfigured, sendReminderEmail, upcomingWithin } from '../utils/email';

export default function Settings() {
  const { clients, appointments, settings, ready } = useData();
  const [biz, setBiz] = useState({
    nomEntreprise: settings.nomEntreprise || '',
    telephoneEntreprise: settings.telephoneEntreprise || '',
    emailEntreprise: settings.emailEntreprise || ''
  });
  const [autoReminder, setAutoReminder] = useState(settings.autoEmailReminder ?? true);
  const [emailStatus, setEmailStatus] = useState('');
  const [sending, setSending] = useState(false);

  if (!ready) return <div className="empty" style={{ paddingTop: 60 }}>Chargement…</div>;

  function saveBiz() { saveSettings(biz); }
  function toggleAutoReminder() {
    const v = !autoReminder;
    setAutoReminder(v);
    saveSettings({ autoEmailReminder: v });
  }

  async function handleSendNow() {
    setSending(true);
    setEmailStatus('');
    try {
      const upcoming = upcomingWithin(appointments, 24);
      await sendReminderEmail({ appointments: upcoming, clients });
      setEmailStatus(`Email envoyé (${upcoming.length} rendez-vous dans les 24h).`);
    } catch (e) {
      setEmailStatus("Échec de l'envoi. Vérifiez la configuration EmailJS dans .env.");
    } finally {
      setSending(false);
    }
  }

  function exportData() {
    const payload = { clients, appointments, notes: [], settings, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'raissa-crm-export-' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <TopBar title="Réglages" />
      <main className="page">
        <div className="card">
          <div className="card-title">Mon entreprise</div>
          <div className="field">
            <label>Nom</label>
            <input value={biz.nomEntreprise} onChange={(e) => setBiz({ ...biz, nomEntreprise: e.target.value })} placeholder="Raïssa Coiffure" />
          </div>
          <div className="row">
            <div className="field">
              <label>Téléphone</label>
              <input value={biz.telephoneEntreprise} onChange={(e) => setBiz({ ...biz, telephoneEntreprise: e.target.value })} />
            </div>
            <div className="field">
              <label>Email</label>
              <input value={biz.emailEntreprise} onChange={(e) => setBiz({ ...biz, emailEntreprise: e.target.value })} />
            </div>
          </div>
          <button className="btn btn-primary btn-sm" onClick={saveBiz}>Enregistrer</button>
        </div>

        <div className="card">
          <div className="card-title">Rappels par email</div>
          {!emailConfigured ? (
            <div className="empty">
              Non configuré. Ajoutez vos clés EmailJS dans <code>.env</code> (voir README) pour activer les rappels par email.
            </div>
          ) : (
            <>
              <div className="list-item" style={{ cursor: 'default' }}>
                <div>
                  <div className="item-title">Envoi automatique à l'ouverture</div>
                  <div className="item-sub">Récapitulatif des rendez-vous des prochaines 24h</div>
                </div>
                <input type="checkbox" checked={autoReminder} onChange={toggleAutoReminder} style={{ width: 20, height: 20 }} />
              </div>
              <button className="btn btn-outline btn-block" disabled={sending} onClick={handleSendNow} style={{ marginTop: 10 }}>
                {sending ? 'Envoi...' : '📧 Envoyer le récapitulatif maintenant'}
              </button>
              {emailStatus && <div className="status-msg">{emailStatus}</div>}
            </>
          )}
        </div>

        <div className="card">
          <div className="card-title">Sauvegarde</div>
          <button className="btn btn-outline btn-block" onClick={exportData}>⬇️ Exporter mes données (JSON)</button>
        </div>
      </main>
    </>
  );
}
