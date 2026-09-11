import { useState } from 'react';
import TopBar from '../components/TopBar';
import { addItem } from '../lib/firestore';

export default function Import() {
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState([]);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setLog([]);
    setStatus('Lecture du fichier...');
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const oldClients = data.clients || [];
      const oldAppointments = data.interventions || data.appointments || [];
      const oldNotes = data.notes || [];

      const idMap = {};
      setStatus(`Import de ${oldClients.length} clientes...`);
      for (const c of oldClients) {
        const ref = await addItem('clients', {
          nom: c.nom || 'Sans nom',
          telephone: c.telephone || '',
          email: c.email || '',
          adresse: c.adresse || '',
          notes: c.notes || '',
          tags: [],
          photos: [],
          lat: c.lat ?? null,
          lng: c.lng ?? null
        });
        idMap[c.id] = ref.id;
      }
      setLog((l) => [...l, `${oldClients.length} clientes importées.`]);

      setStatus(`Import de ${oldAppointments.length} rendez-vous...`);
      let skipped = 0;
      for (const a of oldAppointments) {
        const newClientId = idMap[a.clientId];
        if (!newClientId) { skipped++; continue; }
        await addItem('appointments', {
          clientId: newClientId,
          date: a.date,
          status: a.status || 'termine',
          adresse: a.adresse || '',
          notes: a.notes || '',
          prix: a.prix ?? null,
          dureeMin: a.dureeMin ?? null,
          trajetMin: a.trajetMin ?? null,
          coutProduits: a.coutProduits ?? null,
          photos: [],
          lat: a.lat ?? null,
          lng: a.lng ?? null
        });
      }
      setLog((l) => [...l, `${oldAppointments.length - skipped} rendez-vous importés.${skipped ? ' ' + skipped + ' ignorés (cliente inconnue).' : ''}`]);

      if (oldNotes.length) {
        setStatus(`Import de ${oldNotes.length} notes...`);
        for (const n of oldNotes) {
          await addItem('notes', { text: n.text || '', date: n.date || null, done: false });
        }
        setLog((l) => [...l, `${oldNotes.length} notes importées.`]);
      }

      setStatus('Import terminé ✅');
    } catch (err) {
      setStatus("Le fichier n'a pas pu être lu. Vérifiez qu'il s'agit bien d'un export JSON valide.");
    } finally {
      setBusy(false);
      e.target.value = '';
    }
  }

  return (
    <>
      <TopBar title="Importer des données" />
      <main className="page">
        <div className="card">
          <p style={{ fontSize: 13.5, color: 'var(--text-muted)', lineHeight: 1.5 }}>
            Sélectionnez un fichier d'export JSON de l'ancienne application (clientes + rendez-vous). Les photos ne
            sont pas reprises automatiquement — vous pourrez les rajouter sur chaque fiche depuis l'application.
          </p>
          <input type="file" accept="application/json" onChange={handleFile} disabled={busy} />
          {status && <div className="status-msg" style={{ marginTop: 10 }}>{status}</div>}
          {log.length > 0 && (
            <ul style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 8, paddingLeft: 18 }}>
              {log.map((l, i) => <li key={i}>{l}</li>)}
            </ul>
          )}
        </div>
      </main>
    </>
  );
}
