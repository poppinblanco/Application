import { useState } from 'react';
import { useData } from '../contexts/DataContext';
import TopBar from '../components/TopBar';
import { fmtDate } from '../utils/format';

export default function Notes() {
  const { notes, addNote, updateNote, deleteNote } = useData();
  const [text, setText] = useState('');
  const [date, setDate] = useState('');

  const sorted = [...notes].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    const da = a.date ? new Date(a.date) : new Date(a.createdAt);
    const db = b.date ? new Date(b.date) : new Date(b.createdAt);
    return da - db;
  });

  function handleAdd(e) {
    e.preventDefault();
    if (!text.trim()) return;
    addNote({ text: text.trim(), date: date || null });
    setText('');
    setDate('');
  }

  return (
    <>
      <TopBar title="Pense-bête" tag="Notes" tagClass="m-notes-bg" />
      <main className="page">
        <form className="card" onSubmit={handleAdd}>
          <div className="field">
            <label>Nouvelle note</label>
            <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Ex : acheter mèches pour Fatima" />
          </div>
          <div className="field">
            <label>Date liée (optionnel)</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <button className="btn btn-primary btn-block" type="submit">+ Ajouter la note</button>
        </form>

        <div className="card">
          {sorted.length === 0 ? (
            <div className="empty"><span className="emoji">🗒️</span>Aucune note pour l'instant.</div>
          ) : (
            sorted.map((n) => (
              <div key={n.id} className="divider-item" style={{ opacity: n.done ? 0.55 : 1 }}>
                {n.date && <div className="item-sub" style={{ color: 'var(--primary)', fontWeight: 700 }}>📅 {fmtDate(n.date, { weekday: 'long', day: 'numeric', month: 'long' })}</div>}
                <div style={{ whiteSpace: 'pre-wrap', textDecoration: n.done ? 'line-through' : 'none', marginTop: 4 }}>{n.text}</div>
                <div className="row" style={{ marginTop: 8 }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => updateNote(n.id, { done: !n.done })}>
                    {n.done ? '↺ Rouvrir' : '✓ Fait'}
                  </button>
                  <button className="btn btn-danger btn-sm" onClick={() => confirm('Supprimer cette note ?') && deleteNote(n.id)}>Supprimer</button>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </>
  );
}
