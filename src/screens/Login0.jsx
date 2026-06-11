import { useState } from "react";

const API = "https://integral-backend-production.up.railway.app";

export default function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email || !password) { setError("Completá todos los campos."); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Error al iniciar sesión."); return; }
      onLogin(data.usuario);
    } catch {
      setError("No se pudo conectar al servidor.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Syne:wght@700;800&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #cce7f9; min-height: 100vh; font-family: 'Space Mono', monospace; display: flex; align-items: center; justify-content: center; }
        .login-wrap { width: 400px; padding: 48px 40px; background: #e8f5fd; border: 1px solid #a0cce8; border-radius: 4px; }
        .login-title { font-family: 'Syne', sans-serif; font-size: 26px; font-weight: 800; color: #0a3a5c; margin-bottom: 6px; }
        .login-sub { font-size: 11px; color: #6699bb; letter-spacing: 3px; text-transform: uppercase; margin-bottom: 32px; }
        .login-field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px; }
        .login-field label { font-size: 11px; color: #4a6a8c; letter-spacing: 1px; text-transform: uppercase; }
        .login-field input { padding: 10px 14px; border: 1px solid #a0cce8; border-radius: 3px; font-family: 'Space Mono', monospace; font-size: 13px; background: #fff; color: #0a3a5c; outline: none; transition: border-color 0.2s; }
        .login-field input:focus { border-color: #2277bb; }
        .login-error { font-size: 12px; color: #cc3333; margin-bottom: 16px; }
        .login-btn { width: 100%; padding: 13px; background: #0a3a5c; color: white; border: none; border-radius: 3px; font-family: 'Space Mono', monospace; font-size: 13px; cursor: pointer; transition: background 0.2s; margin-top: 8px; }
        .login-btn:hover { background: #2277bb; }
        .login-btn:disabled { opacity: 0.5; cursor: not-allowed; }
      `}</style>
      <div className="login-wrap">
        <h1 className="login-title">Bienvenido</h1>
        <p className="login-sub">Sistema Integral</p>
        <div className="login-field">
          <label>Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@integral.com" />
        </div>
        <div className="login-field">
          <label>Contraseña</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" onKeyDown={e => e.key === "Enter" && handleSubmit()} />
        </div>
        {error && <p className="login-error">{error}</p>}
        <button className="login-btn" onClick={handleSubmit} disabled={loading}>
          {loading ? "Ingresando..." : "Ingresar"}
        </button>
      </div>
    </>
  );
}
