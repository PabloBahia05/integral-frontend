// ImportarModulos.jsx
// Importa los módulos de una obra (archivo .json, ej. PILAR_NEBOT_modulos.json) a las solapas
// Cocina (Bajomesada / Alacena) y Placard. NO pasan directo a presupuesto:
//   1. Se importan como "pendientes" y se ven en la solapa que les toca.
//   2. Ahí se editan y corrigen (nombre, detalle, cantidad, medidas, altura desde el piso, destino).
//   3. "Guardar y pasar a presupuesto" los agrega a la familia de la solapa
//      (cocinaItems / placardItems). Desde ahí se sincronizan con la tabla del presupuesto
//      como cualquier otro ítem de Cocina o Placard.
//
// Clasificación automática (se puede cambiar a mano en cada fila):
//   - Si el nombre o el ambiente dice "placard" o "vestidor"        -> Placard / Vestidor
//   - Si arranca en el piso o a menos de 15 cm del piso (desde_piso) -> Cocina · Bajomesada
//   - El resto                                                       -> Cocina · Alacena
import { useState } from "react";

export const LIMITE_BAJOMESADA_CM = 15;

export const DESTINOS = {
  bajomesadas: { tab: "cocina", label: "Cocina · Bajomesada" },
  alacenas: { tab: "cocina", label: "Cocina · Alacena" },
  placard: { tab: "placard", label: "Placard / Vestidor" },
};

const numOrNull = (v) => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

// El código del módulo va al principio del artículo ("C2 · Bajo mesada 3 cuerpos").
// Con eso se reconoce si un módulo ya se pasó a la solapa.
export const SEP_CODIGO = " · ";
export const codigoDeArticulo = (articulo) => {
  const s = String(articulo ?? "");
  const i = s.indexOf(SEP_CODIGO);
  return i > 0 ? s.slice(0, i) : null;
};

export function destinoDe(m) {
  const txt = `${m.nombre ?? ""} ${m.ambiente ?? ""}`.toLowerCase();
  if (/placard|vestidor/.test(txt)) return "placard";
  const z = numOrNull(m.desde_piso_cm);
  if (z === null) {
    // Sin dato de altura: se adivina por el nombre
    return /a[eé]reo|alacena|suspendid|flotante|colgad/.test(txt) ? "alacenas" : "bajomesadas";
  }
  return z < LIMITE_BAJOMESADA_CM ? "bajomesadas" : "alacenas";
}

// Lo que compone el mueble, para la columna nombreart
const resumen = (m) =>
  [
    m.frente && m.frente !== "-" ? `Frente: ${m.frente}` : null,
    m.interior && m.interior !== "-" ? `Interior: ${m.interior}` : null,
    m.puertas && m.puertas !== "—" ? `Puertas: ${m.puertas}` : null,
    m.cajones && m.cajones !== "—" ? `Cajones: ${m.cajones}` : null,
    m.estantes && m.estantes !== "—" ? `Estantes: ${m.estantes}` : null,
    m.detalle || null,
  ]
    .filter(Boolean)
    .join(" | ");

const aPendiente = (m, obra) => ({
  uid: `${obra}|${m.codigo}`,
  obra,
  codigo: String(m.codigo),
  ambiente: m.ambiente ?? "",
  nombre: m.nombre ?? "",
  detalle: resumen(m),
  cantidad: Number(m.cantidad) || 1,
  ancho: numOrNull(m.ancho_cm),
  alto: numOrNull(m.alto_cm),
  profundidad: numOrNull(m.prof_cm),
  desde_piso: numOrNull(m.desde_piso_cm),
  destino: destinoDe(m),
  destinoManual: false,
  nota: m.fuente_medida ?? "",
});

// ───────────────────────── estilos ─────────────────────────
const th = { textAlign: "left", borderBottom: "2px solid #ddd", padding: "4px 6px", whiteSpace: "nowrap", fontSize: 12 };
const td = { padding: "3px 4px", verticalAlign: "top", borderBottom: "1px solid #eee" };
const inp = { width: "100%", boxSizing: "border-box", fontSize: 12, padding: "2px 4px" };
const inpNum = { ...inp, width: 62, textAlign: "right" };
const btn = (fondo, activo = true) => ({
  padding: "6px 14px",
  background: activo ? fondo : "#90a4ae",
  color: "#fff",
  border: "none",
  borderRadius: 6,
  cursor: activo ? "pointer" : "default",
  fontSize: 13,
});

// ───────────────────────── modal de importación ─────────────────────────
function ModalImportar({ onCerrar, onCargar, pendientes, yaPasados }) {
  const [datos, setDatos] = useState(null); // { obra, filas }
  const [error, setError] = useState("");

  const leerArchivo = (file) => {
    setError("");
    setDatos(null);
    if (!file) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const d = JSON.parse(String(r.result));
        const items = Array.isArray(d?.items) ? d.items : [];
        if (!items.length) throw new Error('El archivo no tiene módulos (falta la lista "items").');
        const malos = items.filter((m) => !m.codigo || !m.nombre);
        if (malos.length) throw new Error(`${malos.length} módulo(s) sin código o sin nombre.`);
        if (d.unidad && d.unidad !== "cm") throw new Error(`Las medidas tienen que venir en cm (el archivo dice "${d.unidad}").`);
        const obra = d.obra ?? file.name.replace(/\.json$/i, "");
        setDatos({ obra, filas: items.map((m) => ({ ...aPendiente(m, obra), incluir: true })) });
      } catch (e) {
        setError(`No se pudo leer el archivo: ${e.message}`);
      }
    };
    r.onerror = () => setError("No se pudo leer el archivo.");
    r.readAsText(file, "utf-8");
  };

  const cambiar = (uid, campo, valor) =>
    setDatos((d) => ({
      ...d,
      filas: d.filas.map((f) => (f.uid === uid ? { ...f, [campo]: valor, ...(campo === "destino" ? { destinoManual: true } : {}) } : f)),
    }));

  const elegidas = datos ? datos.filas.filter((f) => f.incluir) : [];
  const cuenta = (dest) => elegidas.filter((f) => f.destino === dest).length;
  const estaPendiente = (f) => pendientes.some((p) => p.uid === f.uid);

  return (
    <div
      onClick={onCerrar}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: "#fff", color: "#222", borderRadius: 10, padding: 20, width: 1050, maxWidth: "96vw", maxHeight: "90vh", overflowY: "auto" }}
      >
        <h3 style={{ marginTop: 0 }}>Importar módulos de obra</h3>
        <p style={{ fontSize: 13, color: "#555", margin: "0 0 10px" }}>
          Los que dicen <b>placard</b> o <b>vestidor</b> van a <b>Placard / Vestidor</b>. Los que arrancan en el piso o a menos de{" "}
          {LIMITE_BAJOMESADA_CM} cm van a <b>Bajomesada</b>. El resto va a <b>Alacena</b>. Quedan <b>pendientes</b> en cada solapa para que
          los revises; al presupuesto pasan cuando tocás <b>Guardar y pasar a presupuesto</b>.
        </p>
        <input type="file" accept=".json,application/json" onChange={(e) => leerArchivo(e.target.files?.[0])} />
        {error && <p style={{ color: "#b71c1c", fontSize: 13 }}>{error}</p>}

        {datos && (
          <>
            <p style={{ fontSize: 13, margin: "12px 0 6px" }}>
              <b>{datos.obra}</b>: {datos.filas.length} módulos · Bajomesada {cuenta("bajomesadas")} · Alacena {cuenta("alacenas")} · Placard /
              Vestidor {cuenta("placard")}{" "}
              <button onClick={() => setDatos((d) => ({ ...d, filas: d.filas.map((f) => ({ ...f, incluir: true })) }))}>Todos</button>{" "}
              <button onClick={() => setDatos((d) => ({ ...d, filas: d.filas.map((f) => ({ ...f, incluir: false })) }))}>Ninguno</button>
            </p>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr>
                  {["", "Ambiente", "Código", "Mueble", "Cant.", "Ancho", "Alto", "Prof.", "Desde piso", "Va a"].map((h) => (
                    <th key={h} style={th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {datos.filas.map((f) => (
                  <tr key={f.uid} style={{ background: estaPendiente(f) || yaPasados.has(f.codigo) ? "#fff8e1" : undefined }}>
                    <td style={td}>
                      <input type="checkbox" checked={f.incluir} onChange={(e) => cambiar(f.uid, "incluir", e.target.checked)} />
                    </td>
                    <td style={td}>{f.ambiente}</td>
                    <td style={{ ...td, fontWeight: 600 }}>{f.codigo}</td>
                    <td style={td}>
                      {f.nombre}
                      {yaPasados.has(f.codigo) && <span style={{ color: "#e65100" }}> (ya está en la solapa: se reemplaza al pasarlo)</span>}
                      {!yaPasados.has(f.codigo) && estaPendiente(f) && <span style={{ color: "#e65100" }}> (ya está pendiente: se reemplaza)</span>}
                    </td>
                    <td style={td}>{f.cantidad}</td>
                    <td style={td}>{f.ancho ?? "-"}</td>
                    <td style={td}>{f.alto ?? "-"}</td>
                    <td style={td}>{f.profundidad ?? "-"}</td>
                    <td style={td}>{f.desde_piso ?? "?"}</td>
                    <td style={td}>
                      <select value={f.destino} onChange={(e) => cambiar(f.uid, "destino", e.target.value)} style={{ fontSize: 12 }}>
                        {Object.entries(DESTINOS).map(([k, d]) => (
                          <option key={k} value={k}>{d.label}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
          <button onClick={onCerrar}>Cancelar</button>
          <button
            disabled={!elegidas.length}
            style={btn("#0a3a5c", elegidas.length > 0)}
            onClick={() => {
              onCargar(elegidas.map(({ incluir, ...f }) => f));
              onCerrar();
            }}
          >
            Cargar {elegidas.length} módulo(s) a las solapas
          </button>
        </div>
      </div>
    </div>
  );
}

// ───────────────────────── tabla de pendientes de una familia ─────────────────────────
function TablaPendientes({ titulo, filas, seleccion, setSeleccion, cambiar, yaPasados }) {
  if (!filas.length) return null;
  const todas = filas.every((f) => seleccion[f.uid]);
  return (
    <>
      <h4 style={{ margin: "10px 0 4px" }}>
        {titulo} <span style={{ fontWeight: 400, color: "#777" }}>({filas.length})</span>
      </h4>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, background: "#fff" }}>
          <thead>
            <tr>
              <th style={th}>
                <input
                  type="checkbox"
                  checked={todas}
                  onChange={(e) => setSeleccion((s) => ({ ...s, ...Object.fromEntries(filas.map((f) => [f.uid, e.target.checked])) }))}
                />
              </th>
              {["Ambiente", "Cód.", "Mueble", "Detalle (puertas, cajones, frente…)", "Cant.", "Ancho", "Alto", "Prof.", "Desde piso", "Va a"].map((h) => (
                <th key={h} style={th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => (
              <tr key={f.uid} style={{ background: yaPasados.has(f.codigo) ? "#fff8e1" : undefined }}>
                <td style={td}>
                  <input type="checkbox" checked={!!seleccion[f.uid]} onChange={(e) => setSeleccion((s) => ({ ...s, [f.uid]: e.target.checked }))} />
                </td>
                <td style={{ ...td, width: 120 }}>
                  <input style={inp} value={f.ambiente} onChange={(e) => cambiar(f.uid, { ambiente: e.target.value })} />
                </td>
                <td style={{ ...td, width: 52 }}>
                  <input style={{ ...inp, fontWeight: 600 }} value={f.codigo} onChange={(e) => cambiar(f.uid, { codigo: e.target.value })} />
                </td>
                <td style={{ ...td, width: 190 }}>
                  <input style={inp} value={f.nombre} onChange={(e) => cambiar(f.uid, { nombre: e.target.value })} />
                  {yaPasados.has(f.codigo) && <div style={{ color: "#e65100", fontSize: 11 }}>Ya está en la solapa: al pasarlo se reemplaza</div>}
                  {f.nota && <div style={{ color: "#888", fontSize: 11 }} title={f.nota}>{f.nota}</div>}
                </td>
                <td style={{ ...td, minWidth: 260 }}>
                  <textarea style={{ ...inp, minHeight: 44, resize: "vertical" }} value={f.detalle} onChange={(e) => cambiar(f.uid, { detalle: e.target.value })} />
                </td>
                {["cantidad", "ancho", "alto", "profundidad", "desde_piso"].map((campo) => (
                  <td key={campo} style={td}>
                    <input
                      style={inpNum}
                      inputMode="decimal"
                      value={f[campo] ?? ""}
                      onChange={(e) => {
                        const v = e.target.value.replace(",", ".");
                        const cambio = { [campo]: v === "" ? null : v };
                        // Si el destino no se tocó a mano, cambiar la altura lo reclasifica
                        if (campo === "desde_piso" && !f.destinoManual)
                          cambio.destino = destinoDe({ nombre: f.nombre, ambiente: f.ambiente, desde_piso_cm: cambio.desde_piso });
                        cambiar(f.uid, cambio);
                      }}
                    />
                  </td>
                ))}
                <td style={td}>
                  <select value={f.destino} onChange={(e) => cambiar(f.uid, { destino: e.target.value, destinoManual: true })} style={{ fontSize: 12 }}>
                    {Object.entries(DESTINOS).map(([k, d]) => (
                      <option key={k} value={k}>{d.label}</option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ───────────────────────── panel que va arriba de Cocina y de Placard ─────────────────────────
// props:
//   tab            "cocina" | "placard"
//   pendientes     filas importadas sin pasar (de todas las solapas)
//   setPendientes  setter
//   yaPasados      Set con los códigos que ya están en cocinaItems / placardItems
//   onPasar(filas) agrega las filas a su familia (lo resuelve PresupuestoNuevo)
export default function PanelImportados({ tab, pendientes, setPendientes, yaPasados, onPasar }) {
  const [modal, setModal] = useState(false);
  const [seleccion, setSeleccion] = useState({});
  const [aviso, setAviso] = useState("");

  const deEstaSolapa = pendientes.filter((f) => DESTINOS[f.destino]?.tab === tab);
  const otraSolapa = pendientes.length - deEstaSolapa.length;
  const elegidas = deEstaSolapa.filter((f) => seleccion[f.uid]);

  const cambiar = (uid, cambio) => setPendientes((prev) => prev.map((f) => (f.uid === uid ? { ...f, ...cambio } : f)));

  const cargar = (nuevas) => {
    setPendientes((prev) => {
      const uids = new Set(nuevas.map((f) => f.uid));
      return [...prev.filter((p) => !uids.has(p.uid)), ...nuevas];
    });
    const n = (t) => nuevas.filter((f) => DESTINOS[f.destino].tab === t).length;
    setAviso(`Se cargaron ${nuevas.length} módulo(s) como pendientes: ${n("cocina")} en Cocina y ${n("placard")} en Placard. Revisalos y pasalos al presupuesto.`);
  };

  const validar = (filas) => {
    const errores = [];
    filas.forEach((f) => {
      if (!String(f.codigo).trim()) errores.push(`Una fila de ${f.ambiente || "sin ambiente"} no tiene código.`);
      if (!String(f.nombre).trim()) errores.push(`${f.codigo}: falta el nombre.`);
      if (!(Number(f.cantidad) > 0)) errores.push(`${f.codigo}: la cantidad tiene que ser mayor que 0.`);
      ["ancho", "alto", "profundidad", "desde_piso"].forEach((c) => {
        if (f[c] !== null && f[c] !== "" && !Number.isFinite(Number(f[c]))) errores.push(`${f.codigo}: "${c}" no es un número.`);
      });
    });
    const cods = filas.map((f) => String(f.codigo).trim());
    cods.filter((c, i) => c && cods.indexOf(c) !== i).forEach((c) => errores.push(`El código ${c} está repetido en lo que querés pasar.`));
    return errores;
  };

  const pasar = (filas) => {
    const errores = validar(filas);
    if (errores.length) {
      setAviso(`No se pasó nada. Corregí esto: ${errores.join(" · ")}`);
      return;
    }
    const limpias = filas.map((f) => ({
      ...f,
      codigo: String(f.codigo).trim(),
      cantidad: Number(f.cantidad),
      ancho: numOrNull(f.ancho),
      alto: numOrNull(f.alto),
      profundidad: numOrNull(f.profundidad),
      desde_piso: numOrNull(f.desde_piso),
    }));
    onPasar(limpias);
    const uids = new Set(limpias.map((f) => f.uid));
    setPendientes((prev) => prev.filter((p) => !uids.has(p.uid)));
    setSeleccion({});
    setAviso(`${limpias.length} módulo(s) guardados en la solapa y pasados a presupuesto, con precio 0. Ponéles precio desde la lista de abajo o desde Presupuesto.`);
  };

  const quitar = (filas) => {
    if (!window.confirm(`¿Quitar ${filas.length} módulo(s) pendientes? No se pasan al presupuesto.`)) return;
    const uids = new Set(filas.map((f) => f.uid));
    setPendientes((prev) => prev.filter((p) => !uids.has(p.uid)));
    setSeleccion({});
  };

  const familias = tab === "cocina" ? ["bajomesadas", "alacenas"] : ["placard"];

  return (
    <div style={{ marginBottom: 14, padding: deEstaSolapa.length ? 10 : 0, border: deEstaSolapa.length ? "1px solid #ffcc80" : "none", borderRadius: 8, background: deEstaSolapa.length ? "#fffaf2" : undefined }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <button style={btn("#0a3a5c")} onClick={() => setModal(true)}>
          ⬆ Importar módulos de obra
        </button>
        {deEstaSolapa.length > 0 && (
          <>
            <b style={{ fontSize: 13 }}>{deEstaSolapa.length} módulo(s) importados pendientes de revisar</b>
            <button style={btn("#2e7d32", elegidas.length > 0)} disabled={!elegidas.length} onClick={() => pasar(elegidas)}>
              Guardar y pasar a presupuesto ({elegidas.length})
            </button>
            <button style={btn("#546e7a")} onClick={() => setSeleccion(Object.fromEntries(deEstaSolapa.map((f) => [f.uid, true])))}>
              Seleccionar todos
            </button>
            <button style={btn("#b71c1c", elegidas.length > 0)} disabled={!elegidas.length} onClick={() => quitar(elegidas)}>
              Quitar
            </button>
          </>
        )}
        {otraSolapa > 0 && (
          <span style={{ fontSize: 12, color: "#777" }}>
            Hay {otraSolapa} pendiente(s) más en la solapa {tab === "cocina" ? "Placard" : "Cocina"}.
          </span>
        )}
      </div>

      {aviso && (
        <p style={{ fontSize: 13, margin: "8px 0 0", color: aviso.startsWith("No se pasó") ? "#b71c1c" : "#2e7d32" }}>
          {aviso} <button onClick={() => setAviso("")} style={{ fontSize: 11 }}>✕</button>
        </p>
      )}

      {familias.map((fam) => (
        <TablaPendientes
          key={fam}
          titulo={DESTINOS[fam].label}
          filas={deEstaSolapa.filter((f) => f.destino === fam)}
          seleccion={seleccion}
          setSeleccion={setSeleccion}
          cambiar={cambiar}
          yaPasados={yaPasados}
        />
      ))}

      {modal && <ModalImportar onCerrar={() => setModal(false)} onCargar={cargar} pendientes={pendientes} yaPasados={yaPasados} />}
    </div>
  );
}
