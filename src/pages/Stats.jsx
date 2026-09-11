import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useData } from '../contexts/DataContext';
import TopBar from '../components/TopBar';
import { fmtEuro, fmtEuroH, sumPrix, tauxHoraire, capitalize } from '../utils/format';

export default function Stats() {
  const { clients, appointments, settings, ready, saveSettings } = useData();
  const [chargesInput, setChargesInput] = useState(settings.chargesPct ?? 21);

  const done = useMemo(() => appointments.filter((a) => a.status === 'termine'), [appointments]);

  const monthly = useMemo(() => {
    const map = new Map();
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.getFullYear() + '-' + d.getMonth();
      map.set(key, { key, label: capitalize(d.toLocaleDateString('fr-FR', { month: 'short' })), total: 0 });
    }
    done.forEach((a) => {
      const d = new Date(a.date);
      const key = d.getFullYear() + '-' + d.getMonth();
      if (map.has(key)) map.get(key).total += parseFloat(a.prix) || 0;
    });
    return Array.from(map.values());
  }, [done]);

  const perClient = useMemo(() => {
    return clients
      .map((c) => {
        const list = appointments.filter((a) => a.clientId === c.id && a.prix != null);
        const totalEarned = sumPrix(list.filter((a) => a.status === 'termine'));
        const totalPrevu = sumPrix(list.filter((a) => a.status === 'planifie'));
        const withRate = list.filter((a) => a.status === 'termine' && tauxHoraire(a, settings.chargesPct) !== null);
        const avgRate = withRate.length ? withRate.reduce((s, a) => s + tauxHoraire(a, settings.chargesPct), 0) / withRate.length : null;
        return { client: c, list, totalEarned, totalPrevu, avgRate };
      })
      .filter((x) => x.list.length > 0)
      .sort((a, b) => b.totalEarned - a.totalEarned);
  }, [clients, appointments, settings.chargesPct]);

  const grandTotal = perClient.reduce((s, x) => s + x.totalEarned, 0);
  const doneWithRate = done.filter((a) => tauxHoraire(a, settings.chargesPct) !== null);
  const globalAvgRate = doneWithRate.length ? doneWithRate.reduce((s, a) => s + tauxHoraire(a, settings.chargesPct), 0) / doneWithRate.length : null;
  const bestRate = doneWithRate.length ? doneWithRate.reduce((a, b) => (tauxHoraire(b, settings.chargesPct) > tauxHoraire(a, settings.chargesPct) ? b : a)) : null;
  const worstRate = doneWithRate.length ? doneWithRate.reduce((a, b) => (tauxHoraire(b, settings.chargesPct) < tauxHoraire(a, settings.chargesPct) ? b : a)) : null;
  const clientNameOf = (id) => clients.find((c) => c.id === id)?.nom || '(cliente supprimée)';

  function handleChargesBlur() {
    const v = parseFloat(chargesInput);
    saveSettings({ chargesPct: isNaN(v) ? 0 : v });
  }

  if (!ready) return <div className="empty" style={{ paddingTop: 60 }}>Chargement…</div>;

  return (
    <>
      <TopBar title="Statistiques" />
      <main className="page">
        <div style={{ background: 'var(--accent-soft)', color: 'var(--accent)', fontWeight: 800, padding: '10px 14px', borderRadius: 10, fontSize: 13.5, marginBottom: 14 }}>
          💰 Total encaissé : {fmtEuro(grandTotal)}
        </div>

        <div className="card">
          <div className="card-title">Revenu mensuel (12 derniers mois)</div>
          <div style={{ width: '100%', height: 200 }}>
            <ResponsiveContainer>
              <BarChart data={monthly} margin={{ left: 0, right: 4, top: 4, bottom: 0 }}>
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} width={52} tickFormatter={(v) => v >= 1000 ? (v / 1000) + 'k' : v} />
                <Tooltip formatter={(v) => fmtEuro(v)} contentStyle={{ borderRadius: 10, border: '1px solid var(--border)', fontSize: 12.5 }} />
                <Bar dataKey="total" fill="#4f46e5" radius={[6, 6, 0, 0]} maxBarSize={22} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="card-title">Rentabilité horaire</div>
          <div className="field">
            <label>Charges sociales à déduire (%)</label>
            <input type="number" step="0.5" min="0" value={chargesInput} onChange={(e) => setChargesInput(e.target.value)} onBlur={handleChargesBlur} />
          </div>
          {globalAvgRate === null ? (
            <div className="empty">Renseignez la durée des rendez-vous pour voir votre taux horaire réel.</div>
          ) : (
            <div className="row">
              <div className="kpi-card" style={{ flex: 1, textAlign: 'center' }}>
                <div className="kpi-label">Moyen</div>
                <div className="kpi-value" style={{ fontSize: 17 }}>{fmtEuroH(globalAvgRate)}</div>
              </div>
              {bestRate && (
                <div className="kpi-card" style={{ flex: 1, textAlign: 'center' }}>
                  <div className="kpi-label" style={{ color: 'var(--accent)' }}>Meilleure</div>
                  <div className="kpi-value" style={{ fontSize: 17 }}>{fmtEuroH(tauxHoraire(bestRate, settings.chargesPct))}</div>
                  <div className="kpi-sub">{clientNameOf(bestRate.clientId)}</div>
                </div>
              )}
              {worstRate && (
                <div className="kpi-card" style={{ flex: 1, textAlign: 'center' }}>
                  <div className="kpi-label" style={{ color: 'var(--danger)' }}>À revoir</div>
                  <div className="kpi-value" style={{ fontSize: 17 }}>{fmtEuroH(tauxHoraire(worstRate, settings.chargesPct))}</div>
                  <div className="kpi-sub">{clientNameOf(worstRate.clientId)}</div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-title">Classement clientes</div>
          {perClient.length === 0 ? (
            <div className="empty">Aucun tarif enregistré pour l'instant.</div>
          ) : (
            perClient.map((x, idx) => (
              <div key={x.client.id} className="divider-item" style={{ borderLeftColor: idx === 0 ? 'var(--primary)' : 'var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Link to={`/clients/${x.client.id}`} className="item-title">{idx === 0 ? '🏆 ' : ''}{x.client.nom}</Link>
                  <span className="pill pill-price">{fmtEuro(x.totalEarned)}</span>
                </div>
                {x.avgRate !== null && <div className="item-sub" style={{ marginTop: 2 }}>⏱ {fmtEuroH(x.avgRate)} en moyenne</div>}
                {x.totalPrevu > 0 && <div className="item-sub">+ {fmtEuro(x.totalPrevu)} prévu(s)</div>}
              </div>
            ))
          )}
        </div>
      </main>
    </>
  );
}
