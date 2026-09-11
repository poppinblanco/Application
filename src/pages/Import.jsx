import { useState } from 'react';
import TopBar from '../components/TopBar';
import { useData } from '../contexts/DataContext';
import { uid } from '../lib/storage';

export default function Import() {
  const { importData } = useData();
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
      const newClients = oldClients.map((c) => {
        const newId = uid();
        idMap[c.id] = newId;
        return {
          id: newId,
          nom: c.nom || 'Sans nom',
          telephone: c.telephone || '',
          email: c.email || '',
          adresse: c.adresse || '',
          notes: c.notes || '',
          tags: [],
          lat: c.lat ?? null,
          lng: c.lng ?? null,
          createdAt: new Date().toISOString()
        };
      });

      let skipped = 0;
      const newAppointments = oldAppointments
        .map((a) => {
          const newClientId = idMap[a.clientId];
          if (!newClientId) { skipped++; return null; }
          return {
            id: uid(),
            clientId: newClientId,
            date: a.date,
            status: a.status || 'termine',
            adresse: a.adresse || '',
            notes: a.notes || '',
            prix: a.prix ?? null,
            dureeMin: a.dureeMin ?? null,
            trajetMin: a.trajetMin ?? null,
            coutProduits: a.coutProduits ?? null,
            lat: a.lat ?? null,
            lng: a.lng ?? null,
            createdAt: new Date().toISOString()
          };
        })
        .filter(Boolean);

      const newNotes = oldNotes.map((n) => ({
        id: uid(),
        text: n.text || '',
        date: n.date || null,
        done: false,
        createdAt: new Date().toISOString()
      }));

      importData({ clients: newClients, appointments: newAppointments, notes: newNotes });

      setLog([
        `${newClients.length} clientes importées.`,
        `${newAppointments.length} rendez-vous importés.${skipped ? ' ' + skipped + ' ignorés (cliente inconnue).' : ''}`,
        ...(newNotes.length ? [`${newNotes.length} notes importées.`] : [])
      ]);
      setStatus('Import terminé ✅ Les photos ne sont pas reprises : rajoutez-les depuis chaque fiche.');
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
