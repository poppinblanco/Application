import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import TopBar from '../components/TopBar';
import ClientForm from '../components/ClientForm';
import AppointmentForm from '../components/AppointmentForm';
import { fmtDateTime, fmtEuro, initials, sumPrix } from '../utils/format';
import { itineraryUrl } from '../utils/geocode';
import { generateReceiptPdf } from '../utils/receipt';
import { getMedia, isVideoSrc } from '../lib/storage';

export default function ClientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { clients, appointments, settings } = useData();
  const [editing, setEditing] = useState(false);
  const [addingRdv, setAddingRdv] = useState(false);
  const [editingRdv, setEditingRdv] = useState(null);
  const [lightbox, setLightbox] = useState(null);
  const [gallery, setGallery] = useState([]);

  const client = clients.find((c) => c.id === id);
  const history = appointments
    .filter((a) => a.clientId === id)
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  useEffect(() => {
    if (!client) return;
    let cancelled = false;
    (async () => {
      const own = await getMedia('client:' + client.id);
      const fromRdv = (await Promise.all(history.map((a) => getMedia(a.id)))).flat();
      if (!cancelled) setGallery([...own, ...fromRdv]);
    })();
    return () => { cancelled = true; };
  }, [client, appointments.length]);

  if (!client) {
    return (
      <>
        <TopBar title="Cliente introuvable" />
        <main className="page"><div className="empty">Cette cliente n'existe plus.</div></main>
      </>
    );
  }

  const totalEarned = sumPrix(history.filter((a) => a.status === 'termine'));

  return (
    <>
      <TopBar
        title={client.nom}
        sub={`${history.length} rendez-vous · ${fmtEuro(totalEarned)} encaissé`}
        right={<button className="btn btn-ghost btn-sm" onClick={() => setEditing(true)}>Modifier</button>}
      />
      <main className="page">
        <div className="card">
          <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 12 }}>
            <div className="avatar" style={{ width: 56, height: 56, fontSize: 19 }}>{initials(client.nom)}</div>
            <div>
              {(client.tags || []).map((t) => <span key={t} className="pill pill-tag" style={{ marginRight: 4 }}>{t}</span>)}
            </div>
          </div>
          <div className="row">
            {client.telephone && (
              <a href={`tel:${client.telephone}`} className="btn btn-outline btn-sm" style={{ flex: 1 }}>📞 Appeler</a>
            )}
            {client.telephone && (
              <a href={`sms:${client.telephone}`} className="btn btn-outline btn-sm" style={{ flex: 1 }}>💬 SMS</a>
            )}
            {client.email && (
              <a href={`mailto:${client.email}`} className="btn btn-outline btn-sm" style={{ flex: 1 }}>✉️ Email</a>
            )}
            {client.adresse && (
              <a href={itineraryUrl(client.lat, client.lng, client.adresse)} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm" style={{ flex: 1 }}>🧭 Itinéraire</a>
            )}
          </div>
          {client.adresse && <div className="item-sub" style={{ marginTop: 10 }}>📍 {client.adresse}</div>}
          {client.notes && <div className="item-sub" style={{ marginTop: 8, whiteSpace: 'pre-wrap' }}>📝 {client.notes}</div>}
        </div>

        {gallery.length > 0 && (
          <div className="card">
            <div className="card-title">Photos</div>
            <div className="photo-grid">
              {gallery.map((src, i) => (
                <div className="photo-thumb" key={i} onClick={() => setLightbox(src)}>
                  {isVideoSrc(src) ? <video src={src} muted /> : <img src={src} alt="" />}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="card">
          <div className="card-title">
            Historique
            <button className="btn btn-primary btn-sm" onClick={() => setAddingRdv(true)}>+ Rendez-vous</button>
          </div>
          {history.length === 0 ? (
            <div className="empty"><span className="emoji">📅</span>Aucun rendez-vous pour l'instant.</div>
          ) : (
            history.map((a) => (
              <div key={a.id} className="divider-item">
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, cursor: 'pointer' }} onClick={() => setEditingRdv(a)}>
                  <div>
                    <span className={`pill ${a.status === 'planifie' ? 'pill-planned' : a.status === 'annule' ? 'pill-cancelled' : 'pill-done'}`}>
                      {a.status === 'planifie' ? 'Prévu' : a.status === 'annule' ? 'Annulé' : 'Terminé'}
                    </span>
                    <div className="item-sub" style={{ marginTop: 4 }}>{fmtDateTime(a.date)}</div>
                    {a.notes && <div className="item-sub" style={{ marginTop: 2 }}>{a.notes}</div>}
                  </div>
                  {a.prix != null && <span className="pill pill-price">{fmtEuro(a.prix)}</span>}
                </div>
                {a.status === 'termine' && a.prix != null && (
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ marginTop: 8 }}
                    onClick={() => generateReceiptPdf({ appointment: a, client, business: settings })}
                  >
                    🧾 Reçu PDF
                  </button>
                )}
              </div>
            ))
          )}
        </div>

        <button className="btn btn-ghost btn-block" onClick={() => navigate('/clients')}>← Retour aux clientes</button>
      </main>

      {editing && <ClientForm existing={client} onClose={() => setEditing(false)} onDeleted={() => navigate('/clients')} />}
      {addingRdv && <AppointmentForm defaultClientId={id} onClose={() => setAddingRdv(false)} />}
      {editingRdv && <AppointmentForm existing={editingRdv} onClose={() => setEditingRdv(null)} />}
      {lightbox && (
        <div className="lightbox" onClick={() => setLightbox(null)}>
          {isVideoSrc(lightbox) ? <video src={lightbox} controls autoPlay /> : <img src={lightbox} alt="" />}
        </div>
      )}
    </>
  );
}
