import emailjs from '@emailjs/browser';
import { fmtDateTime } from './format';

const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID;
const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;
const TO_EMAIL = import.meta.env.VITE_REMINDER_EMAIL;

export const emailConfigured = Boolean(SERVICE_ID && TEMPLATE_ID && PUBLIC_KEY && TO_EMAIL);

export function buildDigestText(appointments, clients) {
  const clientName = (id) => clients.find((c) => c.id === id)?.nom || '(cliente supprimée)';
  if (appointments.length === 0) return 'Aucun rendez-vous dans les prochaines 24h.';
  return appointments
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .map((a) => `• ${fmtDateTime(a.date)} — ${clientName(a.clientId)}${a.adresse ? ' — ' + a.adresse : ''}${a.prix ? ' — ' + a.prix + ' €' : ''}`)
    .join('\n');
}

export async function sendReminderEmail({ appointments, clients }) {
  if (!emailConfigured) throw new Error('EmailJS non configuré');
  const message = buildDigestText(appointments, clients);
  return emailjs.send(
    SERVICE_ID,
    TEMPLATE_ID,
    {
      to_email: TO_EMAIL,
      subject: `Rendez-vous à venir (${appointments.length})`,
      message
    },
    { publicKey: PUBLIC_KEY }
  );
}

export function upcomingWithin(appointments, hours) {
  const now = Date.now();
  const limit = now + hours * 3600 * 1000;
  return appointments.filter((a) => {
    if (a.status !== 'planifie') return false;
    const t = new Date(a.date).getTime();
    return t >= now && t <= limit;
  });
}
