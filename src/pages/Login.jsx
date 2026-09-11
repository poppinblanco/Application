import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const { login, firebaseConfigured } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!firebaseConfigured) {
    return (
      <div className="login-wrap">
        <div className="login-card card">
          <div className="login-logo">⚙️</div>
          <div className="login-title">Configuration requise</div>
          <p style={{ color: 'var(--text-muted)', fontSize: 13.5, lineHeight: 1.5 }}>
            L'application n'est pas encore connectée à votre base de données. Copiez <code>.env.example</code> en{' '}
            <code>.env</code> et renseignez vos clés Firebase (voir <code>README.md</code>), puis relancez l'application.
          </p>
        </div>
      </div>
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (err) {
      setError("Connexion impossible. Vérifiez l'email et le mot de passe.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-wrap">
      <form className="login-card card" onSubmit={handleSubmit}>
        <div className="login-logo">💇🏾‍♀️</div>
        <div className="login-title">Raïssa Coiffure</div>
        <div className="login-sub">Connectez-vous pour accéder à votre clientèle</div>
        <div className="field">
          <label>Email</label>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vous@exemple.com" autoComplete="username" />
        </div>
        <div className="field">
          <label>Mot de passe</label>
          <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password" />
        </div>
        {error && <div className="status-msg err">{error}</div>}
        <button className="btn btn-primary btn-block" disabled={loading} type="submit" style={{ marginTop: 6 }}>
          {loading ? 'Connexion...' : 'Se connecter'}
        </button>
      </form>
    </div>
  );
}
