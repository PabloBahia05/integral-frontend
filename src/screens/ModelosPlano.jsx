// ModelosPlano.jsx
// 1) Modelos de presupuestos_mamparas: cuáles llevan plano y si el plano está cargado.
// 2) Herrajes de mampara (articulos.codartprov) usados en los presupuestos, y el plano vinculado a cada uno.
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

const th = { textAlign: "left", borderBottom: "1px solid #ccc", padding: 4 };

export default function ModelosPlano({ authFetch, API }) {
  const [modelos, setModelos] = useState([]);
  const [herrajes, setHerrajes] = useState([]);
  const [planos, setPlanos] = useState([]);
  const [filtro, setFiltro] = useState("TODOS");
  const [busca, setBusca] = useState("");
  const [soloVinc, setSoloVinc] = useState(false);
  const [msg, setMsg] = useState("");

  const cargar = async () => {
    setMsg("");
    try {
      const [rm, rh, rp] = await Promise.all([
        authFetch(`${API}/mamparas-modelo-plano`),
        authFetch(`${API}/mamparas-herrajes`),
        authFetch(`${API}/mamparas-planos`),
      ]);
      if (!rm.ok || !rh.ok || !rp.ok) throw new Error("Error al cargar datos");
      setModelos(await rm.json());
      setHerrajes(await rh.json());
      setPlanos(await rp.json());
    } catch (e) {
      setMsg(e.message);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  const toggleLleva = async (m, requiere_plano) => {
    const r = await authFetch(`${API}/mamparas-modelo-plano/${m.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requiere_plano }),
    });
    if (!r.ok) setMsg("No se pudo guardar el cambio");
    cargar();
  };

  const vincular = async (h, plano_clave) => {
    const r = await authFetch(`${API}/mamparas-herrajes/${encodeURIComponent(h.codartprov)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plano_clave: plano_clave || null }),
    });
    if (!r.ok) setMsg("No se pudo vincular el plano");
    cargar();
  };

  const modelosVis = modelos.filter((m) => {
    if (filtro === "TODOS") return true;
    if (filtro === "LLEVAN") return m.requiere_plano;
    return m.estado === filtro;
  });

  const b = busca.trim().toLowerCase();
  const herrajesVis = herrajes.filter(
    (h) =>
      (!soloVinc || h.plano_clave) &&
      (!b || `${h.codartprov} ${h.articulo} ${h.modelos}`.toLowerCase().includes(b)),
  );

  return (
    <div>
      {/* ---------- Modelos ---------- */}
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
              <th key={h} style={th}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {modelosVis.map((m) => {
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
                    onChange={(e) => toggleLleva(m, e.target.checked)}
                  />
                </td>
                <td>{m.plano_descripcion || "-"}</td>
                <td>
                  <span style={{ color: est.color, fontWeight: 600 }}>{est.texto}</span>
                </td>
              </tr>
            );
          })}
          {!modelosVis.length && (
            <tr>
              <td colSpan={6} style={{ padding: 8, color: "#888" }}>Sin modelos para este filtro</td>
            </tr>
          )}
        </tbody>
      </table>

      {/* ---------- Herrajes -> plano ---------- */}
      <h3 style={{ marginTop: 28 }}>Herrajes de mampara y su plano</h3>
      <p style={{ fontSize: 12, marginTop: 0 }}>
        Código de proveedor (<code>codartprov</code>) de los herrajes usados en los presupuestos. El plano se
        vincula a ese código; un modelo queda "cargado" cuando alguno de sus herrajes tiene plano.
      </p>

      <div style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}>
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar código, artículo o modelo"
          style={{ width: 280 }}
        />
        <label style={{ fontSize: 13 }}>
          <input type="checkbox" checked={soloVinc} onChange={(e) => setSoloVinc(e.target.checked)} /> Solo con plano
        </label>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr>
            {["Cód. proveedor", "Artículo", "Modelos que lo usan", "Presup.", "Plano vinculado"].map((h) => (
              <th key={h} style={th}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {herrajesVis.map((h) => (
            <tr key={h.codartprov}>
              <td style={{ padding: 4, fontWeight: 600 }}>{h.codartprov}</td>
              <td>{h.articulo}</td>
              <td>{h.modelos}</td>
              <td>{h.presupuestos}</td>
              <td>
                <select value={h.plano_clave || ""} onChange={(e) => vincular(h, e.target.value)}>
                  <option value="">— sin plano —</option>
                  {planos.map((p) => (
                    <option key={p.clave} value={p.clave}>{p.descripcion}</option>
                  ))}
                </select>
              </td>
            </tr>
          ))}
          {!herrajesVis.length && (
            <tr>
              <td colSpan={5} style={{ padding: 8, color: "#888" }}>Sin herrajes para este filtro</td>
            </tr>
          )}
        </tbody>
      </table>

      {msg && <p>{msg}</p>}
    </div>
  );
}
