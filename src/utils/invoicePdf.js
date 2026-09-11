import { jsPDF } from 'jspdf';
import { fmtDate, fmtEuro } from './format';

export function generateDocumentPdf({ doc: document_, client, business, kind }) {
  const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
  const margin = 48;
  let y = margin;
  const label = kind === 'facture' ? 'FACTURE' : 'DEVIS';

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(20);
  pdf.text(business?.nomEntreprise || 'Raïssa Coiffure', margin, y);
  pdf.setFontSize(13);
  pdf.setTextColor(120);
  pdf.text(label + ' ' + document_.numero, 545 - margin, y, { align: 'right' });
  pdf.setTextColor(0);
  y += 20;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  if (business?.telephoneEntreprise) { pdf.text(business.telephoneEntreprise, margin, y); y += 14; }
  if (business?.emailEntreprise) { pdf.text(business.emailEntreprise, margin, y); y += 14; }

  y += 10;
  pdf.setFontSize(10);
  pdf.text(`Date : ${fmtDate(document_.date, { day: 'numeric', month: 'long', year: 'numeric' })}`, margin, y);
  pdf.text(`Client : ${client?.nom || '—'}`, 545 - margin, y, { align: 'right' });
  y += 26;

  pdf.setDrawColor(210);
  pdf.line(margin, y, 545 - margin, y);
  y += 20;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.text('Description', margin, y);
  pdf.text('Qté', 380, y);
  pdf.text('P.U.', 440, y);
  pdf.text('Total', 545 - margin, y, { align: 'right' });
  y += 10;
  pdf.setDrawColor(230);
  pdf.line(margin, y, 545 - margin, y);
  y += 16;

  pdf.setFont('helvetica', 'normal');
  let total = 0;
  (document_.items || []).forEach((item) => {
    const lineTotal = (parseFloat(item.quantite) || 0) * (parseFloat(item.prixUnitaire) || 0);
    total += lineTotal;
    pdf.text(item.description || '', margin, y, { maxWidth: 300 });
    pdf.text(String(item.quantite || 1), 380, y);
    pdf.text(fmtEuro(item.prixUnitaire || 0), 440, y);
    pdf.text(fmtEuro(lineTotal), 545 - margin, y, { align: 'right' });
    y += 20;
  });

  y += 10;
  pdf.setDrawColor(210);
  pdf.line(350, y, 545 - margin, y);
  y += 20;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(13);
  pdf.text(`Total : ${fmtEuro(total)}`, 545 - margin, y, { align: 'right' });
  y += 34;

  if (document_.notes) {
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.text(document_.notes, margin, y, { maxWidth: 545 - margin * 2 });
    y += 24;
  }

  pdf.setFont('helvetica', 'italic');
  pdf.setFontSize(8.5);
  pdf.setTextColor(140);
  pdf.text(`${label} émis le ${fmtDate(new Date().toISOString(), { day: 'numeric', month: 'long', year: 'numeric' })}`, margin, 790);

  pdf.save(`${kind}-${document_.numero}.pdf`);
}
