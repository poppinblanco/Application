export function fmtEuro(n) {
  const v = Number(n) || 0;
  return v.toLocaleString('fr-FR', { minimumFractionDigits: v % 1 === 0 ? 0 : 2, maximumFractionDigits: 2 }) + ' €';
}
export const fmtEuroH = (n) => fmtEuro(n) + '/h';

export function fmtDate(iso, opts) {
  return capitalize(new Date(iso).toLocaleDateString('fr-FR', opts || { day: '2-digit', month: 'short', year: 'numeric' }));
}
export function fmtDateTime(iso) {
  const d = new Date(iso);
  return fmtDate(iso) + ' à ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}
export function capitalize(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }

export function initials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase();
}

export function sumPrix(list) {
  return list.reduce((s, i) => s + (parseFloat(i.prix) || 0), 0);
}
export function dureeTotaleH(i) {
  return ((parseFloat(i.dureeMin) || 0) + (parseFloat(i.trajetMin) || 0)) / 60;
}
export function netApresCharges(i, chargesPct) {
  const net = (parseFloat(i.prix) || 0) - (parseFloat(i.coutProduits) || 0);
  return net * (1 - (chargesPct || 0) / 100);
}
export function tauxHoraire(i, chargesPct) {
  const h = dureeTotaleH(i);
  if (h <= 0) return null;
  return netApresCharges(i, chargesPct) / h;
}

export function groupByPeriod(list, granularity) {
  const map = new Map();
  list.forEach((i) => {
    const d = new Date(i.date);
    let key, label;
    if (granularity === 'semaine') {
      const dow = (d.getDay() + 6) % 7;
      const monday = new Date(d); monday.setDate(d.getDate() - dow); monday.setHours(0, 0, 0, 0);
      const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6);
      key = monday.toISOString().slice(0, 10);
      label = `Semaine du ${monday.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} au ${sunday.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}`;
    } else if (granularity === 'mois') {
      key = d.getFullYear() + '-' + d.getMonth();
      label = capitalize(d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }));
    } else {
      key = d.toISOString().slice(0, 10);
      label = fmtDate(i.date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    }
    if (!map.has(key)) map.set(key, { key, label, items: [] });
    map.get(key).items.push(i);
  });
  return Array.from(map.values());
}
