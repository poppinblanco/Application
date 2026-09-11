export default function Modal({ onClose, title, children }) {
  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">
        <button className="modal-close" onClick={onClose} aria-label="Fermer">×</button>
        {title && <h2>{title}</h2>}
        {children}
      </div>
    </div>
  );
}
