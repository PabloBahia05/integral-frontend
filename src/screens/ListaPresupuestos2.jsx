import { useState, useEffect } from "react";
import "./PresupuestoNuevo.css";

const API = "https://integral-backend-production.up.railway.app";

// Pantalla "LISTA PRESUPUESTOS 2": versión rápida del listado, lee directo
// de presupuesto_info (1 fila por presupuesto) en vez de agrupar/agregar
// tabla_presupuestos ítem por ítem. Por eso NO muestra totales ($) — solo
// cabecera: número, cliente, última revisión y fecha.
//
// onAbrir(numeropres, revision) — se llama al hacer click en una fila, para
// que el componente padre (App.jsx) abra ese presupuesto en PresupuestoNuevo,
// igual que hace la lista vieja.
export default function ListaPresupuestos2({ onAbrir, token }) {
  const [items, setItems] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [busqueda, setBusqueda] = useState("");

  const authFetch = (url, options = {}) =>
    fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers ?? {}),
        Authorization: `Bearer ${token}`,
      },
    });

  useEffect(() => {
    setCargando(true);
    authFetch(`${API}/presupuesto-info/lista-presupuestos`)
      .then((r) => r.json())
      .then((data) => {
        setItems(Array.isArray(data) ? data : []);
        setError("");
      })
      .catch((err) => {
        console.error("Error cargando Lista Presupuestos 2:", err);
        setError("No se pudo cargar el listado.");
      })
      .finally(() => setCargando(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const itemsFiltrados = items.filter((it) => {
    if (!busqueda.trim()) return true;
    const q = busqueda.trim().toLowerCase();
    return (
      String(it.numeropres).includes(q) ||
      (it.nombre ?? "").toLowerCase().includes(q) ||
      (it.telefono1 ?? "").toLowerCase().includes(q)
    );
  });

  const formatFecha = (f) => {
    if (!f) return "—";
    const d = new Date(f);
    if (isNaN(d)) return "—";
    return d.toLocaleDateString("es-AR") + " " + d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div style={{ padding: 20, maxWidth: 1100, margin: "0 auto" }}>
      <h2 style={{ marginBottom: 14 }}>📋 Lista Presupuestos 2</h2>

      <input
        type="text"
        placeholder="Buscar por número, cliente o teléfono..."
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        style={{
          width: "100%",
          padding: "8px 10px",
          marginBottom: 14,
          borderRadius: 6,
          border: "1px solid #ccc",
          fontSize: 14,
        }}
      />

      {cargando && <p>Cargando...</p>}
      {error && <p style={{ color: "#c0392b" }}>{error}</p>}

      {!cargando && !error && (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f0f0f0", textAlign: "left" }}>
              <th style={{ padding: "8px 10px" }}>N°</th>
              <th style={{ padding: "8px 10px" }}>Rev.</th>
              <th style={{ padding: "8px 10px" }}>Cliente</th>
              <th style={{ padding: "8px 10px" }}>Teléfono</th>
              <th style={{ padding: "8px 10px" }}>Última modificación</th>
              <th style={{ padding: "8px 10px" }}></th>
            </tr>
          </thead>
          <tbody>
            {itemsFiltrados.map((it) => (
              <tr
                key={it.numeropres}
                style={{ borderBottom: "1px solid #eee", cursor: "pointer" }}
                onClick={() => onAbrir?.(it.numeropres, it.revision)}
              >
                <td style={{ padding: "8px 10px" }}>{it.numeropres}</td>
                <td style={{ padding: "8px 10px" }}>{it.revision ?? "—"}</td>
                <td style={{ padding: "8px 10px" }}>{it.nombre ?? "(sin cliente)"}</td>
                <td style={{ padding: "8px 10px" }}>{it.telefono1 || it.telefono2 || "—"}</td>
                <td style={{ padding: "8px 10px" }}>
                  {formatFecha(it.actualizado_en)}
                  {it.actualizado_por ? ` — ${it.actualizado_por}` : ""}
                </td>
                <td style={{ padding: "8px 10px", color: "#2e6da4" }}>Abrir →</td>
              </tr>
            ))}
            {itemsFiltrados.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: 20, textAlign: "center", color: "#888" }}>
                  No hay presupuestos que coincidan.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
