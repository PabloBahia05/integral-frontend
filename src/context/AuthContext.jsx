import { createContext, useContext, useState, useCallback } from "react";

const AuthContext = createContext(null);

const TOKEN_KEY = "token";
const USUARIO_KEY = "usuario";

// Lee el usuario guardado en localStorage al iniciar (si hay).
// Si el JSON está corrupto, no rompe la app: devuelve null.
const leerUsuarioGuardado = () => {
  try {
    const raw = localStorage.getItem(USUARIO_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(leerUsuarioGuardado);
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));

  // Login: guarda usuario + token en memoria y en localStorage.
  const login = useCallback((usr, tok) => {
    setUsuario(usr);
    setToken(tok);
    localStorage.setItem(TOKEN_KEY, tok);
    localStorage.setItem(USUARIO_KEY, JSON.stringify(usr));
  }, []);

  // Logout: limpia todo.
  const logout = useCallback(() => {
    setUsuario(null);
    setToken(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USUARIO_KEY);
  }, []);

  // Helper para hacer fetch autenticado sin repetir headers en cada componente.
  // Uso: const { authFetch } = useAuth(); authFetch(url, { method: "POST", body: ... })
  const authFetch = useCallback(
    (url, options = {}) =>
      fetch(url, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...(options.headers ?? {}),
          Authorization: `Bearer ${token}`,
        },
      }),
    [token],
  );

  const value = {
    usuario,
    token,
    isAuthenticated: !!token && !!usuario,
    login,
    logout,
    authFetch,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Hook de consumo. Tira error claro si se usa fuera del Provider
// (mejor eso que un token undefined silencioso en medio de la app).
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth() debe usarse dentro de <AuthProvider>");
  }
  return ctx;
}
