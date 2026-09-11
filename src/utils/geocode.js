export async function geocode(address) {
  if (!address || !address.trim() || !navigator.onLine) return null;
  try {
    const url = 'https://nominatim.openstreetmap.org/search?format=json&limit=1&q=' + encodeURIComponent(address);
    const res = await fetch(url, { headers: { 'Accept-Language': 'fr' } });
    const data = await res.json();
    if (data && data[0]) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch (e) { /* offline or rate-limited */ }
  return null;
}

export function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) { reject(new Error('Géolocalisation non supportée')); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
}

export function itineraryUrl(lat, lng, label) {
  const dest = lat && lng ? `${lat},${lng}` : encodeURIComponent(label || '');
  return `https://www.google.com/maps/dir/?api=1&destination=${dest}`;
}
