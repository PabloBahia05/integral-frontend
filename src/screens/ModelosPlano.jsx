// ModelosPlano.jsx
// Paso 1: qué modelos de mampara llevan plano.
// Paso 2: vincular cada herraje de mampara (familia HERRAJES MAMPARAS) con su plano.
import { useEffect, useState } from "react";

const ESTADOS = {
  NO_LLEVA: { texto: "No lleva plano", bg: "#eceff1", color: "#546e7a" },
  CARGADO: { texto: "Plano cargado", bg: "#e8f5e9", color: "#2e7d32" },
  FALTA_HERRAJE: { texto: "Falta elegir herraje", bg: "#fff3e0", color: "#e65100" },
  FALTA_CARGAR: { texto: "Falta plano en el herraje", bg: "#fff3e0", color: "#e65100" },
};

const card = {
  background: "#fff",
  color: "#222",
  borderRadius: 10,
  padding: 16,
  marginBottom: 20,
  boxShadow: "0 1px 3px rgba(0,0,0,.12)",
};
const th = { textAlign: "left", borderBottom: "2px solid #ddd", padding: "6px 8px", fontSize: 12, color: "#555" };
const td = { padding: "8px", borderBottom: "1px solid #eee", verticalAlign: "middle" };
const pill = (bg, color) => ({
  display: "inline-block",
  padding: "2px 10px",
  borderRadius: 12,
  background: bg,
  color,
  fontWeight: 600,
  fontSize: 12,
  whiteSpace: "nowrap",
});

function Segmentado({ opciones, valor, onChange }) {
  return (
    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
      {opciones.map(([k, label]) => (
        <button
          key={k}
          onClick={() => onChange(k)}
          style={{
            padding: "4px 12px",
            borderRadius: 14,
            border: "1px solid #90a4ae",
            background: valor === k ? "#1565c0" : "#fff",
            color: valor === k ? "#fff" : "#37474f",
            cursor: "pointer",
            fontSize: 13,
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

// Selector con filtro: se escribe para filtrar y se elige el herraje de la lista
function HerrajePicker({ valor, herrajes, onChange }) {
  const etiqueta = (h) => `${h.codartprov} — ${h.articulo}`;
  const actual = herrajes.find((h) => h.codartprov === valor);
  const [texto, setTexto] = useState(actual ? etiqueta(actual) : "");

  useEffect(() => {
    setTexto(actual ? etiqueta(actual) : "");
  }, [valor, herrajes.length]);

  const cambiar = (v) => {
    setTexto(v);
    const h = herrajes.find((x) => x.codartprov && etiqueta(x) === v);
    if (h) onChange(h.codartprov);
  };

  return (
    <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
      <input
        list="lista-herrajes-mampara"
        value={texto}
        onChange={(e) => cambiar(e.target.value)}
        placeholder="Escribí para filtrar y elegí el herraje…"
        style={{ width: 320, maxWidth: "100%" }}
      />
      {valor && (
        <button title="Quitar herraje" onClick={() => onChange(null)} style={{ cursor: "pointer" }}>
          ×
        </button>
      )}
    </div>
  );
}

export default function ModelosPlano({ authFetch, API }) {
  const [modelos, setModelos] = useState([]);
  const [herrajes, setHerrajes] = useState([]);
  const [planos, setPlanos] = useState([]);
  const [errores, setErrores] = useState([]);

  const [filtroModelo, setFiltroModelo] = useState("TODOS");
  const [filtroHerraje, setFiltroHerraje] = useState("TODOS");
  const [articulo, setArticulo] = useState(""); // menú filtro: un artículo puntual
  const [busca, setBusca] = useState("");

  const pedir = async (ruta) => {
    const r = await authFetch(`${API}${ruta}`);
    if (!r.ok) {
      let detalle = r.status;
      try {
        detalle = (await r.json()).error || r.status;
      } catch {
        /* sin cuerpo JSON */
      }
      throw new Error(`${ruta}: ${detalle}`);
    }
    return r.json();
  };

  const cargar = async () => {
    const [rm, rh, rp] = await Promise.allSettled([
      pedir("/mamparas-modelo-plano"),
      pedir("/mamparas-herrajes"),
      pedir("/mamparas-planos"),
    ]);
    const errs = [];
    if (rm.status === "fulfilled") setModelos(rm.value);
    else errs.push(rm.reason.message);
    if (rh.status === "fulfilled") setHerrajes(rh.value);
    else errs.push(rh.reason.message);
    if (rp.status === "fulfilled") setPlanos(rp.value);
    else errs.push(rp.reason.message);
    setErrores(errs);
  };

  useEffect(() => {
    cargar();
  }, []);

  const guardar = async (ruta, body) => {
    const r = await authFetch(`${API}${ruta}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!r.ok) setErrores([`No se pudo guardar (${ruta})`]);
    else await cargar();
  };

  /* ---------- Paso 1: modelos ---------- */
  const coincide = (m, f) =>
    f === "TODOS"
      ? true
      : f === "LLEVAN"
        ? m.requiere_plano
        : f === "FALTA"
          ? m.estado === "FALTA_HERRAJE" || m.estado === "FALTA_CARGAR"
          : m.estado === f;
  const cuenta = (f) => modelos.filter((m) => coincide(m, f)).length;
  const modelosVis = modelos.filter((m) => coincide(m, filtroModelo));
  const herrajesConCodigo = herrajes.filter((h) => h.codartprov);

  /* ---------- Paso 2: herrajes ---------- */
  const b = busca.trim().toLowerCase();
  const herrajesVis = herrajes.filter(
    (h) =>
      (!articulo || String(h.id) === articulo) &&
      (filtroHerraje === "TODOS" || (filtroHerraje === "CON" ? h.plano_clave : !h.plano_clave)) &&
      (!b || `${h.codartprov} ${h.articulo} ${h.codartint}`.toLowerCase().includes(b)),
  );

  return (
    <div>
      {/* Explicación corta */}
      <div style={{ ...card, background: "#e3f2fd", boxShadow: "none" }}>
        <b>Cómo funciona</b>
        <ol style={{ margin: "6px 0 0", paddingLeft: 20, fontSize: 14, lineHeight: 1.6 }}>
          <li>Marcá qué <b>modelos</b> de mampara llevan plano y elegí su <b>herraje</b> (podés filtrar escribiendo).</li>
          <li>En el paso 2, vinculá cada <b>herraje de mampara</b> con el plano que le corresponde.</li>
          <li>Al hacer el plano de un presupuesto, se usa el plano del herraje de su modelo.</li>
        </ol>
      </div>

      {errores.length > 0 && (
        <div style={{ ...card, background: "#ffebee", color: "#b71c1c" }}>
          <b>No se pudo cargar todo:</b>
          <ul style={{ margin: "4px 0" }}>
            {errores.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
          <button onClick={cargar}>Reintentar</button>
        </div>
      )}

      <datalist id="lista-herrajes-mampara">
        {herrajesConCodigo.map((h) => (
          <option key={h.id} value={`${h.codartprov} — ${h.articulo}`} />
        ))}
      </datalist>

      {/* ---------- Paso 1 ---------- */}
      <div style={card}>
        <h3 style={{ marginTop: 0 }}>1. Modelos de mampara</h3>
        <div style={{ marginBottom: 10 }}>
          <Segmentado
            valor={filtroModelo}
            onChange={setFiltroModelo}
            opciones={[
              ["TODOS", `Todos (${cuenta("TODOS")})`],
              ["LLEVAN", `Llevan plano (${cuenta("LLEVAN")})`],
              ["NO_LLEVA", `No llevan (${cuenta("NO_LLEVA")})`],
              ["CARGADO", `Con plano cargado (${cuenta("CARGADO")})`],
              ["FALTA", `Falta completar (${cuenta("FALTA")})`],
            ]}
          />
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr>
                <th style={th}>Modelo</th>
                <th style={th}>Presupuestos</th>
                <th style={th}>¿Lleva plano?</th>
                <th style={th}>Herraje / plano</th>
                <th style={th}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {modelosVis.map((m) => {
                const est = ESTADOS[m.estado];
                return (
                  <tr key={m.id}>
                    <td style={td}>{m.modelo_nombre}</td>
                    <td style={td}>{m.presupuestos}</td>
                    <td style={td}>
                      <label style={{ cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={!!m.requiere_plano}
                          onChange={(e) =>
                            guardar(`/mamparas-modelo-plano/${m.id}`, { requiere_plano: e.target.checked })
                          }
                        />{" "}
                        {m.requiere_plano ? "Sí" : "No"}
                      </label>
                    </td>
                    <td style={td}>
                      {m.requiere_plano ? (
                        <>
                          <HerrajePicker
                            valor={m.herraje_codartprov}
                            herrajes={herrajesConCodigo}
                            onChange={(cod) => guardar(`/mamparas-modelo-plano/${m.id}`, { herraje_codartprov: cod })}
                          />
                          {m.herraje_codartprov && (
                            <div style={{ fontSize: 12, marginTop: 3, color: m.plano_descripcion ? "#2e7d32" : "#e65100" }}>
                              {m.plano_descripcion
                                ? `Plano: ${m.plano_descripcion}`
                                : "Este herraje no tiene plano: vinculalo en el paso 2"}
                            </div>
                          )}
                        </>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td style={td}>
                      <span style={pill(est.bg, est.color)}>{est.texto}</span>
                    </td>
                  </tr>
                );
              })}
              {!modelosVis.length && (
                <tr>
                  <td colSpan={5} style={{ ...td, color: "#888" }}>
                    Sin modelos para este filtro
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ---------- Paso 2 ---------- */}
      <div style={card}>
        <h3 style={{ marginTop: 0 }}>2. Herrajes de mampara y su plano</h3>
        <p style={{ margin: "0 0 10px", fontSize: 13, color: "#555" }}>
          Artículos de la familia <b>HERRAJES MAMPARAS</b>. Elegí en cada uno el plano que le corresponde.
        </p>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 10 }}>
          <select value={articulo} onChange={(e) => setArticulo(e.target.value)} style={{ maxWidth: 320 }}>
            <option value="">Todos los artículos ({herrajes.length})</option>
            {herrajes.map((h) => (
              <option key={h.id} value={h.id}>
                {h.codartprov ? `${h.codartprov} — ` : ""}
                {h.articulo}
              </option>
            ))}
          </select>
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por código o nombre"
            style={{ width: 220 }}
          />
          <Segmentado
            valor={filtroHerraje}
            onChange={setFiltroHerraje}
            opciones={[
              ["TODOS", "Todos"],
              ["CON", "Con plano"],
              ["SIN", "Sin plano"],
            ]}
          />
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr>
                <th style={th}>Cód. proveedor</th>
                <th style={th}>Artículo</th>
                <th style={th}>Plano vinculado</th>
                <th style={th}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {herrajesVis.map((h) => (
                <tr key={h.id}>
                  <td style={{ ...td, fontWeight: 600 }}>{h.codartprov || "-"}</td>
                  <td style={td}>{h.articulo}</td>
                  <td style={td}>
                    {h.codartprov ? (
                      <select
                        value={h.plano_clave || ""}
                        onChange={(e) =>
                          guardar(`/mamparas-herrajes/${encodeURIComponent(h.codartprov)}`, {
                            plano_clave: e.target.value || null,
                          })
                        }
                      >
                        <option value="">— sin plano —</option>
                        {planos.map((p) => (
                          <option key={p.clave} value={p.clave}>
                            {p.descripcion}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span style={{ color: "#888", fontSize: 12 }}>Sin código de proveedor: no se puede vincular</span>
                    )}
                  </td>
                  <td style={td}>
                    {h.plano_clave ? (
                      <span style={pill("#e8f5e9", "#2e7d32")}>Vinculado</span>
                    ) : (
                      <span style={pill("#eceff1", "#546e7a")}>Sin plano</span>
                    )}
                  </td>
                </tr>
              ))}
              {!herrajesVis.length && (
                <tr>
                  <td colSpan={4} style={{ ...td, color: "#888" }}>
                    {herrajes.length
                      ? "Sin herrajes para este filtro"
                      : "No hay artículos con familia HERRAJES MAMPARAS"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
