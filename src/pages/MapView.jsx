import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useData } from '../contexts/DataContext';
import TopBar from '../components/TopBar';
import { geocode, getCurrentPosition, itineraryUrl } from '../utils/geocode';
import { fmtDate } from '../utils/format';

export default function MapView() {
  const { clients, appointments, ready, updateClient } = useData();
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markersLayer = useRef(null);
  const [locating, setLocating] = useState(false);
  const [status, setStatus] = useState('');

  const missing = clients.filter((c) => c.adresse && (!c.lat || !c.lng));

  useEffect(() => {
    if (!ready || !mapRef.current) return;
    if (!mapInstance.current) {
      mapInstance.current = L.map(mapRef.current);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
      }).addTo(mapInstance.current);
      markersLayer.current = L.layerGroup().addTo(mapInstance.current);
    } else {
      mapInstance.current.invalidateSize();
    }
    markersLayer.current.clearLayers();
    const bounds = [];

    clients.filter((c) => c.lat && c.lng).forEach((c) => {
      const marker = L.circleMarker([c.lat, c.lng], { radius: 9, fillColor: '#4f46e5', color: '#fff', weight: 2, fillOpacity: 0.95 }).addTo(markersLayer.current);
      marker.bindPopup(`<strong>🏠 ${escapeHtml(c.nom)}</strong><br>${escapeHtml(c.adresse || '')}${c.telephone ? '<br>' + escapeHtml(c.telephone) : ''}<br><a href="${itineraryUrl(c.lat, c.lng)}" target="_blank" rel="noreferrer">Itinéraire</a>`);
      bounds.push([c.lat, c.lng]);
    });
    appointments.filter((a) => a.lat && a.lng).forEach((a) => {
      const client = clients.find((c) => c.id === a.clientId);
      const color = a.status === 'planifie' ? '#d97706' : a.status === 'annule' ? '#dc2626' : '#0d9488';
      const marker = L.circleMarker([a.lat, a.lng], { radius: 7, fillColor: color, color: '#fff', weight: 2, fillOpacity: 0.9 }).addTo(markersLayer.current);
      marker.bindPopup(`<strong>${escapeHtml(client?.nom || '(supprimée)')}</strong><br>${fmtDate(a.date)}<br>${escapeHtml(a.adresse || '')}`);
      bounds.push([a.lat, a.lng]);
    });

    if (bounds.length === 0) mapInstance.current.setView([43.2965, 5.3698], 12);
    else mapInstance.current.fitBounds(bounds, { padding: [30, 30], maxZoom: 15 });
  }, [ready, clients, appointments]);

  async function locateMe() {
    try {
      const pos = await getCurrentPosition();
      mapInstance.current.setView([pos.lat, pos.lng], 14);
      L.marker([pos.lat, pos.lng], { title: 'Ma position' }).addTo(markersLayer.current).bindPopup('📍 Vous êtes ici').openPopup();
    } catch (e) {
      setStatus("Impossible d'obtenir votre position.");
    }
  }

  async function locateAllMissing() {
    setLocating(true);
    let done = 0;
    for (const c of missing) {
      setStatus(`Localisation ${++done}/${missing.length}...`);
      const coords = await geocode(c.adresse);
      if (coords) updateClient(c.id, { lat: coords.lat, lng: coords.lng });
      await new Promise((r) => setTimeout(r, 350));
    }
    setStatus('Terminé.');
    setLocating(false);
  }

  if (!ready) return <div className="empty" style={{ paddingTop: 60 }}>Chargement…</div>;

  return (
    <>
      <TopBar title="Carte" right={<button className="btn btn-outline btn-sm" onClick={locateMe}>📍 Ma position</button>} />
      <main className="page">
        {missing.length > 0 && (
          <div className="card" style={{ padding: 12 }}>
            <div style={{ fontSize: 13, marginBottom: 8 }}>{missing.length} cliente(s) avec une adresse pas encore localisée.</div>
            <button className="btn btn-primary btn-sm" disabled={locating} onClick={locateAllMissing}>Localiser ces clientes</button>
            {status && <div className="status-msg">{status}</div>}
          </div>
        )}
        <div className="card">
          <div id="map" ref={mapRef}></div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 10, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            <span><span style={{ color: '#4f46e5' }}>●</span> Domicile cliente</span>
            <span><span style={{ color: '#d97706' }}>●</span> Rendez-vous prévu</span>
            <span><span style={{ color: '#0d9488' }}>●</span> Terminé</span>
          </div>
        </div>
      </main>
    </>
  );
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}
