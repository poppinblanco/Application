import { jsPDF } from 'jspdf';
import { fmtDate, fmtEuro } from './format';

export function generateReceiptPdf({ appointment, client, business }) {
  const doc = new jsPDF({ unit: 'pt', format: 'a5' });
  const margin = 40;
  let y = margin;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(business?.nomEntreprise || 'Reçu de prestation', margin, y);
  y += 22;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  if (business?.telephoneEntreprise) { doc.text(business.telephoneEntreprise, margin, y); y += 14; }
  if (business?.emailEntreprise) { doc.text(business.emailEntreprise, margin, y); y += 14; }

  y += 14;
  doc.setDrawColor(200);
  doc.line(margin, y, 420 - margin, y);
  y += 24;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Reçu', margin, y);
  y += 20;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  const lines = [
    `Cliente : ${client?.nom || '—'}`,
    `Date de la prestation : ${fmtDate(appointment.date, { day: 'numeric', month: 'long', year: 'numeric' })}`,
    appointment.adresse ? `Adresse : ${appointment.adresse}` : null,
    appointment.notes ? `Prestation : ${appointment.notes}` : null
  ].filter(Boolean);
  lines.forEach((l) => { doc.text(l, margin, y, { maxWidth: 420 - margin * 2 }); y += 18; });

  y += 14;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(`Total payé : ${fmtEuro(appointment.prix)}`, margin, y);
  y += 30;

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(9);
  doc.text(`Émis le ${fmtDate(new Date().toISOString(), { day: 'numeric', month: 'long', year: 'numeric' })}`, margin, y);

  doc.save(`recu-${(client?.nom || 'cliente').replace(/\s+/g, '-').toLowerCase()}-${appointment.date.slice(0, 10)}.pdf`);
}
