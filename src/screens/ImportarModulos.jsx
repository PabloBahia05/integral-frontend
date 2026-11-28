// ImportarModulos.jsx
// Carga en el presupuesto abierto los módulos de una obra a partir de un archivo .json
// (ej. PILAR_NEBOT_modulos.json, generado desde los planos de detalle).
// No graba nada en la base: agrega los ítems a la tabla del presupuesto (pestaña Presupuesto)
// y se guardan recién cuando se toca "Guardar" como siempre.
//
// Formato del archivo:
// { obra, unidad: "cm", items: [ { codigo, ambiente, nombre, cantidad, ancho_cm, alto_cm, prof_cm,
//   frente, interior, cuerpos, puertas, cajones, estantes, detalle, fuente_medida } ] }
import { useState } from "react";

const SECCION = "Especiales";

// Texto que queda en el ítem (columna nombreart): lo que lo compone, para cotizar y para producción
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

const num = (v) => (v === null || v === undefined || v === "" ? null : Number(v));

export default function ImportarModulos({ onImportar, existentes = [] }) {
  const [abierto, setAbierto] = useState(false);
  const [datos, setDatos] = useState(null); // { obra, items }
  const [elegidos, setElegidos] = useState({}); // codigo -> bool
  const [error, setError] = useState("");
  const [hecho, setHecho] = useState("");

  const idDe = (m) => `import-${String(m.codigo)}`;
  const yaEsta = (m) => existentes.some((it) => it.id === idDe(m));

  const leerArchivo = (file) => {
    setError("");
    setHecho("");
    setDatos(null);
    if (!file) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const d = JSON.parse(String(r.result));
        const items = Array.isArray(d?.items) ? d.items : [];
        if (!items.length) throw new Error("El archivo no tiene módulos (falta la lista \"items\").");
        const malos = items.filter((m) => !m.codigo || !m.nombre);
        if (malos.length) throw new Error(`${malos.length} módulo(s) sin código o sin nombre.`);
        if (d.unidad && d.unidad !== "cm") throw new Error(`Las medidas tienen que venir en cm (el archivo dice "${d.unidad}").`);
        setDatos({ obra: d.obra ?? "", items });
        setElegidos(Object.fromEntries(items.map((m) => [m.codigo, true])));
      } catch (e) {
        setError(`No se pudo leer el archivo: ${e.message}`);
      }
    };
    r.onerror = () => setError("No se pudo leer el archivo.");
    r.readAsText(file, "utf-8");
  };

  const importar = () => {
    if (!datos) return;
    const sel = datos.items.filter((m) => elegidos[m.codigo]);
    const nuevos = sel.map((m) => {
      const cant = Number(m.cantidad) || 1;
      return {
        id: idDe(m),
        seccion: SECCION,
        // el grupo es el ambiente: así la tabla y el PDF quedan ordenados por ambiente
        grupo: m.ambiente || null,
        descripcion: `${m.codigo} · ${m.nombre}`,
        nombreart: resumen(m),
        cantidad: cant,
        // Sin precio: se cotiza en la pestaña Presupuesto (clic en el precio de cada fila)
        precio: 0,
        precios: [],
        subtotal: 0,
        ancho: num(m.ancho_cm),
        alto: num(m.alto_cm),
        profundidad: num(m.prof_cm),
        codartint: null,
      };
    });
    onImportar(nuevos);
    const repetidos = sel.filter(yaEsta).length;
    setHecho(
      `${nuevos.length} módulo(s) cargados en la pestaña Presupuesto` +
        (repetidos ? ` (${repetidos} ya estaban y se reemplazaron)` : "") +
        ". Falta ponerles precio y tocar Guardar.",
    );
  };

  const n = datos ? datos.items.filter((m) => elegidos[m.codigo]).length : 0;
  const ambientes = datos ? [...new Set(datos.items.map((m) => m.ambiente))] : [];

  return (
    <>
      <button
        onClick={() => setAbierto(true)}
        style={{ marginBottom: 10, padding: "6px 14px", background: "#0a3a5c", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13 }}
      >
        ⬆ Importar módulos de obra
      </button>

      {abierto && (
        <div
          onClick={() => setAbierto(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: "#fff", color: "#222", borderRadius: 10, padding: 20, width: 1000, maxWidth: "95vw", maxHeight: "90vh", overflowY: "auto" }}
          >
            <h3 style={{ marginTop: 0 }}>Importar módulos de obra</h3>
            <p style={{ fontSize: 13, color: "#555", margin: "0 0 10px" }}>
              Elegí el archivo <b>.json</b> de la obra. Se agregan como ítems de <b>{SECCION}</b>, agrupados por ambiente, con
              medidas y lo que los compone. No se graba nada hasta que toques <b>Guardar</b> en el presupuesto.
            </p>
            <input type="file" accept=".json,application/json" onChange={(e) => leerArchivo(e.target.files?.[0])} />
            {error && <p style={{ color: "#b71c1c", fontSize: 13 }}>{error}</p>}

            {datos && (
              <>
                <p style={{ fontSize: 13, margin: "12px 0 6px" }}>
                  <b>{datos.obra || "Obra"}</b>: {datos.items.length} módulos en {ambientes.length} ambientes.{" "}
                  <button onClick={() => setElegidos(Object.fromEntries(datos.items.map((m) => [m.codigo, true])))}>Todos</button>{" "}
                  <button onClick={() => setElegidos({})}>Ninguno</button>
                </p>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr>
                      {["", "Ambiente", "Código", "Mueble", "Cant.", "Ancho", "Alto", "Prof.", "Puertas / cajones"].map((h) => (
                        <th key={h} style={{ textAlign: "left", borderBottom: "2px solid #ddd", padding: "4px 6px" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {datos.items.map((m) => (
                      <tr key={m.codigo} style={{ borderBottom: "1px solid #eee", background: yaEsta(m) ? "#fff8e1" : undefined }}>
                        <td style={{ padding: "4px 6px" }}>
                          <input
                            type="checkbox"
                            checked={!!elegidos[m.codigo]}
                            onChange={(e) => setElegidos((p) => ({ ...p, [m.codigo]: e.target.checked }))}
                          />
                        </td>
                        <td style={{ padding: "4px 6px" }}>{m.ambiente}</td>
                        <td style={{ padding: "4px 6px", fontWeight: 600 }}>{m.codigo}</td>
                        <td style={{ padding: "4px 6px" }}>
                          {m.nombre}
                          {yaEsta(m) && <span style={{ color: "#e65100" }}> (ya está: se reemplaza)</span>}
                        </td>
                        <td style={{ padding: "4px 6px" }}>{m.cantidad ?? 1}</td>
                        <td style={{ padding: "4px 6px" }}>{m.ancho_cm ?? "-"}</td>
                        <td style={{ padding: "4px 6px" }}>{m.alto_cm ?? "-"}</td>
                        <td style={{ padding: "4px 6px" }}>{m.prof_cm ?? "-"}</td>
                        <td style={{ padding: "4px 6px", color: "#555" }}>
                          {[m.puertas, m.cajones].filter((x) => x && x !== "—").join(" · ") || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}

            {hecho && <p style={{ color: "#2e7d32", fontSize: 13 }}>{hecho}</p>}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
              <button onClick={() => setAbierto(false)}>Cerrar</button>
              <button
                disabled={!n}
                onClick={importar}
                style={{ background: n ? "#0a3a5c" : "#90a4ae", color: "#fff", border: "none", borderRadius: 4, padding: "6px 16px", cursor: n ? "pointer" : "default" }}
              >
                Agregar {n} módulo(s) al presupuesto
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
