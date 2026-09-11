import { useState } from 'react';
import { useMedia } from '../hooks/useMedia';
import { isVideoSrc } from '../lib/storage';

export default function MediaGallery({ mediaKey, editable = true }) {
  const { media, loading, busy, addFiles, removeAt } = useMedia(mediaKey);
  const [lightbox, setLightbox] = useState(null);

  return (
    <div>
      {loading ? (
        <div className="empty" style={{ padding: 14 }}>Chargement...</div>
      ) : media.length === 0 ? (
        <div className="empty" style={{ padding: 14 }}>Aucune photo ou vidéo pour l'instant.</div>
      ) : (
        <div className="photo-grid">
          {media.map((src, i) => (
            <div className="photo-thumb" key={i}>
              {isVideoSrc(src) ? (
                <video src={src} muted onClick={() => setLightbox(src)} />
              ) : (
                <img src={src} alt="" onClick={() => setLightbox(src)} />
              )}
              {editable && <button type="button" className="rm" onClick={() => removeAt(i)}>×</button>}
            </div>
          ))}
        </div>
      )}
      {editable && (
        <input type="file" accept="image/*,video/*" multiple disabled={busy} onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} style={{ marginTop: 8 }} />
      )}
      {busy && <div className="status-msg">Ajout en cours...</div>}
      {lightbox && (
        <div className="lightbox" onClick={() => setLightbox(null)}>
          {isVideoSrc(lightbox) ? <video src={lightbox} controls autoPlay /> : <img src={lightbox} alt="" />}
        </div>
      )}
    </div>
  );
}
