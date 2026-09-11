import { useState } from 'react';
import { useData } from '../contexts/DataContext';
import TopBar from '../components/TopBar';
import { downloadJson } from '../lib/storage';

export default function Settings() {
  const { clients, appointments, notes, settings, saveSettings } = useData();
  const [biz, setBiz] = useState({
    nomEntreprise: settings.nomEntreprise || '',
    telephoneEntreprise: settings.telephoneEntreprise || '',
    emailEntreprise: settings.emailEntreprise || ''
  });
  const [saved, setSaved] = useState(false);

  function saveBiz() {
    saveSettings(biz);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  function exportData() {
    const payload = { clients, appointments, notes, settings, exportedAt: new Date().toISOString() };
    downloadJson(payload, 'raissa-crm-export-' + new Date().toISOString().slice(0, 10) + '.json');
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
          <button className="btn btn-primary btn-sm" onClick={saveBiz}>{saved ? '✓ Enregistré' : 'Enregistrer'}</button>
          <div className="item-sub" style={{ marginTop: 8 }}>Ces informations apparaissent sur les reçus PDF.</div>
        </div>

        <div className="card">
          <div className="card-title">Sauvegarde</div>
          <p className="item-sub" style={{ marginBottom: 10 }}>
            Toutes vos données restent uniquement sur cet appareil. Exportez régulièrement une sauvegarde,
            surtout avant de changer de téléphone.
          </p>
          <button className="btn btn-outline btn-block" onClick={exportData}>⬇️ Exporter mes données (JSON)</button>
        </div>
      </main>
    </>
  );
}
