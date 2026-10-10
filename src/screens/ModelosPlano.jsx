// ModelosPlano.jsx
// Grilla de modelos de presupuestos_mamparas: cuáles llevan plano y cuáles tienen el plano cargado.
import { useEffect, useState } from "react";

const ESTADOS = {
  NO_LLEVA: { texto: "No lleva plano", color: "#9e9e9e" },
  CARGADO: { texto: "Plano cargado", color: "#2e7d32" },
  FALTA_CARGAR: { texto: "Falta cargar plano", color: "#e65100" },
};

const FILTROS = [
  ["TODOS", "Todos"],
  ["LLEVAN", "Llevan plano"],
  ["NO_LLEVA", "No llevan"],
  ["CARGADO", "Cargados"],
  ["FALTA_CARGAR", "Faltan cargar"],
];

export default function ModelosPlano({ authFetch, API }) {
  const [modelos, setModelos] = useState([]);
  const [planos, setPlanos] = useState([]);
  const [filtro, setFiltro] = useState("TODOS");
  const [msg, setMsg] = useState("");

  const cargar = async () => {
    setMsg("");
    try {
      const [rm, rp] = await Promise.all([
        authFetch(`${API}/mamparas-modelo-plano`),
        authFetch(`${API}/mamparas-planos`),
      ]);
      if (!rm.ok || !rp.ok) throw new Error("Error al cargar modelos");
      setModelos(await rm.json());
      setPlanos(await rp.json());
    } catch (e) {
      setMsg(e.message);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  const guardar = async (m, cambios) => {
    const nuevo = { requiere_plano: m.requiere_plano, plano_clave: m.plano_clave, ...cambios };
    setMsg("");
    const r = await authFetch(`${API}/mamparas-modelo-plano/${m.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nuevo),
    });
    if (!r.ok) setMsg("No se pudo guardar el cambio");
    cargar();
  };

  const visibles = modelos.filter((m) => {
    if (filtro === "TODOS") return true;
    if (filtro === "LLEVAN") return m.requiere_plano;
    return m.estado === filtro;
  });

  return (
    <div>
      <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
        {FILTROS.map(([k, label]) => (
          <button key={k} onClick={() => setFiltro(k)} disabled={filtro === k}>
            {label}
          </button>
        ))}
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr>
            {["Modelo", "Cód. proveedor", "Presupuestos", "¿Lleva plano?", "Plano", "Estado"].map((h) => (
              <th key={h} style={{ textAlign: "left", borderBottom: "1px solid #ccc", padding: 4 }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {visibles.map((m) => {
            const est = ESTADOS[m.estado];
            return (
              <tr key={m.id}>
                <td style={{ padding: 4 }}>{m.modelo_nombre}</td>
                <td>{m.codigo_proveedor || "-"}</td>
                <td>{m.presupuestos}</td>
                <td>
                  <input
                    type="checkbox"
                    checked={!!m.requiere_plano}
                    onChange={(e) => guardar(m, { requiere_plano: e.target.checked })}
                  />
                </td>
                <td>
                  {m.requiere_plano ? (
                    <select
                      value={m.plano_clave || ""}
                      onChange={(e) => guardar(m, { plano_clave: e.target.value || null })}
                    >
                      <option value="">— elegir plano —</option>
                      {planos.map((p) => (
                        <option key={p.clave} value={p.clave}>
                          {p.descripcion}
                        </option>
                      ))}
                    </select>
                  ) : (
                    "-"
                  )}
                </td>
                <td>
                  <span style={{ color: est.color, fontWeight: 600 }}>{est.texto}</span>
                </td>
              </tr>
            );
          })}
          {!visibles.length && (
            <tr>
              <td colSpan={6} style={{ padding: 8, color: "#888" }}>
                Sin modelos para este filtro
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {msg && <p>{msg}</p>}
    </div>
  );
}
