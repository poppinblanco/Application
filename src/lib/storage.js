const KEYS = {
  clients: 'crm_clients',
  appointments: 'crm_appointments',
  notes: 'crm_notes',
  settings: 'crm_settings',
  services: 'crm_services',
  products: 'crm_products',
  quotes: 'crm_quotes',
  invoices: 'crm_invoices'
};

export function uid() {
  return 'id_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
}

export function loadCollection(name) {
  try { return JSON.parse(localStorage.getItem(KEYS[name]) || '[]'); } catch (e) { return []; }
}
export function saveCollection(name, data) {
  try { localStorage.setItem(KEYS[name], JSON.stringify(data)); } catch (e) {
    alert("Stockage plein sur cet appareil. Pensez à exporter vos données dans Réglages.");
  }
}
export function loadSettings() {
  try { return JSON.parse(localStorage.getItem(KEYS.settings) || '{}'); } catch (e) { return {}; }
}
export function saveSettingsRaw(data) {
  localStorage.setItem(KEYS.settings, JSON.stringify(data));
}

export function nextDocNumber(kind) {
  const settings = loadSettings();
  const field = kind === 'facture' ? 'nextInvoiceNumber' : 'nextQuoteNumber';
  const prefix = kind === 'facture' ? 'F' : 'D';
  const n = settings[field] || 1;
  saveSettingsRaw({ ...settings, [field]: n + 1 });
  const year = new Date().getFullYear();
  return `${prefix}-${year}-${String(n).padStart(4, '0')}`;
}

/* ---------- IndexedDB pour les photos/vidéos ---------- */
let dbPromise = null;
function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open('crm_media_db', 1);
    req.onupgradeneeded = () => { req.result.createObjectStore('media'); };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

export async function getMedia(key) {
  try {
    const db = await openDB();
    return await new Promise((resolve) => {
      const tx = db.transaction('media', 'readonly');
      const req = tx.objectStore('media').get(key);
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
  } catch (e) { return []; }
}
export async function setMedia(key, arr) {
  try {
    const db = await openDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction('media', 'readwrite');
      tx.objectStore('media').put(arr, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) { /* ignore */ }
}
export async function deleteMedia(key) {
  try { const db = await openDB(); const tx = db.transaction('media', 'readwrite'); tx.objectStore('media').delete(key); } catch (e) { /* ignore */ }
}

function compressImage(file, maxWidth, quality) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement('canvas');
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
export async function processMediaFile(file) {
  if (file.type.startsWith('video/')) return fileToDataURL(file);
  return compressImage(file, 900, 0.7);
}
export function isVideoSrc(src) { return typeof src === 'string' && src.startsWith('data:video'); }

export function downloadJson(payload, filename) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}
