import { useState, useEffect, useMemo } from "react";

const API = "https://integral-backend-production.up.railway.app";

// ────────────────────────────────────────────────────────────────────────
// ImportarSketchUp
// ────────────────────────────────────────────────────────────────────────
// Carga el .json que genera exportar_integral.rb (SketchUp → Extensiones →
// Integral → Exportar proyecto a JSON) y agrega los muebles al presupuesto,
// en Cocina (Bajomesadas / Alacenas), con el mismo formato de fila que usa el
// buscador de TabCocina — después se edita como cualquier otro ítem.
//
// Cada mueble de SketchUp (ej. "4B30") hay que vincularlo a un artículo de
// Integral. Esa vinculación (y la de COLOR y MANIJA) se elige una vez acá y se
// guarda en sketchup_equivalencias (ver sketchup_routes.js), así que la
// próxima vez viene resuelta sola.
//
// Qué NO se importa todavía: granito, zócalo, mano, ni los componentes sueltos
// (listados en "otros" del JSON). Se muestran como aviso.
//
// Props: authFetch, lineasActivas, aplicarPorcentaje, recalcFila,
//        setCocinaItems, onClose.

const FILA_BASE = {
  articulo: "",
  nombreart: "",
  cantidad: 1,
  precio: "",
  precios: [],
  margen: null,
  valor1: null,
  porcentaje1: null,
  valor2: null,
  porcentaje2: null,
  valor3: null,
  porcentaje3: null,
  area: null,
  accesorios: [],
  grupo: "",
  ancho: null,
  alto: null,
  profundidad: null,
  codartint: null,
};

const FAMILIAS = [
  { clave: "bajomesadas", bd: "Bajomesada", label: "Bajomesada" },
  { clave: "alacenas", bd: "Alacena", label: "Alacena" },
];

const normalizar = (s) =>
  String(s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const aArray = (d) => (Array.isArray(d) ? d : []);

// Si hay UN solo candidato cuyo nombre coincide (igual o que contenga el
// texto), devuelve su codartint; si hay 0 o varios, "" (que lo elija el
// usuario — no se adivina).
const autoElegir = (lista, texto) => {
  const n = normalizar(texto);
  if (!n) return "";
  const exactos = lista.filter((x) => normalizar(x.articulo) === n);
  if (exactos.length === 1) return String(exactos[0].codartint ?? "");
  const contienen = lista.filter((x) => normalizar(x.articulo).includes(n));
  if (contienen.length === 1) return String(contienen[0].codartint ?? "");
  return "";
};

// ── Identificación automática del mueble por código ─────────────────────
// El nombre del componente en SketchUp (ej. "BAJO80") es el código del
// artículo SIN el prefijo de línea; en Integral cada línea tiene su propio
// codartint ("1BAJO80", "4BAJO80", "14BAJO80"...). Un artículo coincide si
// alguno de sus códigos por línea es [dígitos opcionales] + código.
const codigoNorm = (s) =>
  String(s ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

const codigosDe = (a) =>
  [...Object.values(a?.codartintPorLinea ?? {}), a?.codartint, a?.CODARTINT]
    .filter((c) => c != null && c !== "")
    .map(codigoNorm);

const coincideCodigo = (a, nombre) => {
  const n = codigoNorm(nombre);
  if (!n) return false;
  const re = new RegExp(`^\\d*${n}$`);
  return codigosDe(a).some((c) => re.test(c));
};

const estiloBoton = (principal) => ({
  padding: "7px 18px",
  background: principal ? "#0a3a5c" : "#fff",
  color: principal ? "#fff" : "#0a3a5c",
  border: principal ? "none" : "1px solid #7aaac8",
  borderRadius: 2,
  fontFamily: "'Space Mono',monospace",
  fontSize: 12,
  cursor: "pointer",
});

const estiloInput = {
  width: "100%",
  boxSizing: "border-box",
  fontFamily: "'Space Mono',monospace",
  fontSize: 12,
  border: "1px solid #7aaac8",
  padding: "4px 8px",
  borderRadius: 2,
};

const th = {
  padding: "6px 8px",
  border: "1px solid #c8dae8",
  background: "#0a3a5c",
  color: "#fff",
  fontSize: 11,
  textAlign: "left",
  letterSpacing: "0.05em",
};

const td = {
  padding: "6px 8px",
  border: "1px solid #c8dae8",
  verticalAlign: "top",
  fontSize: 12,
};

// ── Buscador con filtro por palabras ─────────────────────────────────────
// opciones: [{ id, label }]. Se escribe y la lista se filtra (palabras
// sueltas, sin importar orden, mayúsculas ni tildes). Va definido a nivel
// módulo para que el input no pierda el foco en cada tecla.
function Buscador({ etiqueta, opciones, onElegir, placeholder, permitirVacio }) {
  const [texto, setTexto] = useState(null); // null = no se está tipeando
  const [abierto, setAbierto] = useState(false);

  const lista = useMemo(() => {
    const palabras = normalizar(texto ?? "")
      .split(" ")
      .filter(Boolean);
    const filtradas = palabras.length
      ? opciones.filter((o) => {
          const n = normalizar(o.label);
          return palabras.every((p) => n.includes(p));
        })
      : opciones;
    return filtradas.slice(0, 40);
  }, [texto, opciones]);

  return (
    <div style={{ position: "relative" }}>
      <input
        type="text"
        autoComplete="off"
        placeholder={placeholder}
        value={texto ?? etiqueta ?? ""}
        onChange={(e) => {
          setTexto(e.target.value);
          setAbierto(true);
        }}
        onFocus={(e) => {
          e.target.select();
          setAbierto(true);
        }}
        onBlur={() => {
          setAbierto(false);
          setTexto(null);
        }}
        style={estiloInput}
      />
      {abierto && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            minWidth: "100%",
            width: "max-content",
            maxWidth: 460,
            maxHeight: 220,
            overflowY: "auto",
            background: "#fff",
            border: "1px solid #b8cfe0",
            zIndex: 60,
            boxShadow: "0 4px 12px #0002",
          }}
        >
          {permitirVacio && (
            <div
              onMouseDown={(e) => {
                e.preventDefault();
                onElegir("");
                setTexto(null);
                setAbierto(false);
              }}
              style={{ padding: "6px 10px", cursor: "pointer", color: "#8aabb8" }}
            >
              — Sin asignar
            </div>
          )}
          {lista.length === 0 && (
            <div style={{ padding: "6px 10px", color: "#8aabb8" }}>
              Sin coincidencias.
            </div>
          )}
          {lista.map((o) => (
            <div
              key={o.id}
              onMouseDown={(e) => {
                e.preventDefault();
                onElegir(o.id);
                setTexto(null);
                setAbierto(false);
              }}
              onMouseOver={(e) => (e.currentTarget.style.background = "#ddeefa")}
              onMouseOut={(e) => (e.currentTarget.style.background = "#fff")}
              style={{
                padding: "6px 10px",
                cursor: "pointer",
                borderBottom: "1px solid #eef2f6",
                color: "#0a3a5c",
              }}
            >
              {o.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ImportarSketchUp({
  authFetch,
  lineasActivas,
  aplicarPorcentaje,
  recalcFila,
  setCocinaItems,
  onClose,
}) {
  const [listo, setListo] = useState(false);
  const [equivalencias, setEquivalencias] = useState([]);
  const [catalogo, setCatalogo] = useState({ bajomesadas: [], alacenas: [] });
  const [melaminas, setMelaminas] = useState([]);
  const [manijas, setManijas] = useState([]);

  const [proyecto, setProyecto] = useState(null);
  const [filas, setFilas] = useState([]);
  const [error, setError] = useState("");
  const [resultado, setResultado] = useState(null);
  const [importando, setImportando] = useState(false);

  // ── Catálogos y equivalencias guardadas ──
  useEffect(() => {
    let vivo = true;
    const pedir = (url) =>
      authFetch(url)
        .then((r) => r.json())
        .catch(() => []);
    Promise.all([
      pedir(`${API}/sketchup/equivalencias`),
      pedir(`${API}/articulos/por-familia?familia=Bajomesada`),
      pedir(`${API}/articulos/por-familia?familia=Alacena`),
      pedir(`${API}/productos/melaminas`),
      pedir(`${API}/productos/manijas`),
    ]).then(([eq, baj, ala, mel, man]) => {
      if (!vivo) return;
      setEquivalencias(aArray(eq));
      setCatalogo({ bajomesadas: aArray(baj), alacenas: aArray(ala) });
      setMelaminas(aArray(mel));
      setManijas(aArray(man));
      setListo(true);
    });
    return () => {
      vivo = false;
    };
  }, []);

  // ── Opciones de los buscadores ──
  const opcionesArticulo = useMemo(
    () =>
      FAMILIAS.flatMap((f) =>
        catalogo[f.clave].map((a) => ({
          id: `${f.clave}|${a.articulo}`,
          label: `${a.articulo}  ·  ${f.label}`,
        })),
      ),
    [catalogo],
  );
  const opcionesMelamina = useMemo(
    () =>
      melaminas.map((m) => ({
        id: String(m.codartint ?? ""),
        label: m.articulo ?? "",
      })),
    [melaminas],
  );
  const opcionesManija = useMemo(
    () =>
      manijas.map((m) => ({
        id: String(m.codartint ?? ""),
        label: m.articulo ?? "",
      })),
    [manijas],
  );

  const buscarArticulo = (familia, nombre) => {
    const n = normalizar(nombre);
    return catalogo[familia]?.find((a) => normalizar(a.articulo) === n) ?? null;
  };

  // Busca el artículo de Integral que corresponde a un mueble de SketchUp:
  // primero por código (con el prefijo de cada línea), después por nombre
  // exacto del artículo. Si hay 0 o varios candidatos distintos devuelve
  // null (que lo elija el usuario — no se adivina).
  const resolverMueble = (m) => {
    const unico = (hits) => {
      if (hits.length === 1) return hits[0];
      if (hits.length > 1 && new Set(hits.map((h) => h.art.articulo)).size === 1) {
        // El mismo artículo viene en las dos familias: desempata el nombre.
        const quiereAlacena = /^ALA/i.test(String(m.nombre ?? ""));
        const preferida = quiereAlacena ? "alacenas" : "bajomesadas";
        return hits.find((h) => h.familia === preferida) ?? hits[0];
      }
      return null;
    };
    const porCodigo = FAMILIAS.flatMap((f) =>
      catalogo[f.clave]
        .filter((a) => coincideCodigo(a, m.nombre))
        .map((art) => ({ familia: f.clave, art })),
    );
    const r1 = unico(porCodigo);
    if (r1) return r1;
    const n = normalizar(m.nombre);
    if (!n) return null;
    return unico(
      FAMILIAS.flatMap((f) =>
        catalogo[f.clave]
          .filter((a) => normalizar(a.articulo) === n)
          .map((art) => ({ familia: f.clave, art })),
      ),
    );
  };

  // ── Armar las filas de la tabla cuando hay archivo y catálogos ──
  useEffect(() => {
    if (!proyecto || !listo) return;
    const eq = (tipo, clave) =>
      equivalencias.find((e) => e.tipo === tipo && e.clave === clave);

    setFilas(
      proyecto.muebles.map((m, i) => {
        const eqM = eq("mueble", m.nombre);
        const artEq = eqM ? buscarArticulo(eqM.familia, eqM.articulo) : null;
        const sel = artEq
          ? { familia: eqM.familia, art: artEq }
          : resolverMueble(m);

        const colorValor = m.color?.valor ?? "";
        const eqC = colorValor ? eq("color", colorValor) : null;
        const color = eqC
          ? String(eqC.codartint ?? "")
          : autoElegir(melaminas, m.color?.etiqueta || colorValor);

        const manijaValor = m.manija?.valor ?? "";
        const eqMa = manijaValor ? eq("manija", manijaValor) : null;
        const manija = eqMa
          ? String(eqMa.codartint ?? "")
          : autoElegir(
              manijas,
              String(m.manija?.etiqueta ?? "").replace(/manija/i, ""),
            );

        return {
          idx: i,
          m,
          sel,
          color,
          manija,
          recordar: true,
          incluir: true,
        };
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proyecto, listo]);

  const actualizarFila = (idx, cambios) =>
    setFilas((prev) => prev.map((f) => (f.idx === idx ? { ...f, ...cambios } : f)));

  // ── Leer el archivo ──
  const leerArchivo = async (e) => {
    const archivo = e.target.files?.[0];
    if (!archivo) return;
    try {
      const data = JSON.parse(await archivo.text());
      if (!Array.isArray(data.muebles)) {
        throw new Error("el archivo no tiene la lista de muebles");
      }
      setError("");
      setResultado(null);
      setProyecto(data);
    } catch (err) {
      setProyecto(null);
      setFilas([]);
      setError(`No se pudo leer el archivo: ${err.message}`);
    }
  };

  // ── Importar ──
  const lineasOk = (lineasActivas ?? []).length > 0;
  const importables = filas.filter((f) => f.incluir && f.sel);
  const sinArticulo = filas.filter((f) => f.incluir && !f.sel);

  const importar = async () => {
    if (!lineasOk || importables.length === 0) return;
    setImportando(true);

    const nuevas = { bajomesadas: [], alacenas: [] };
    const sinPrecio = [];

    importables.forEach((f) => {
      const { familia, art: p } = f.sel;
      const preciosBase = lineasActivas.map((l) => ({
        linea: l.linea,
        precioBase: p.precios?.[String(l.linea)] ?? "",
      }));
      const precios = preciosBase.map((pb) => ({
        linea: pb.linea,
        precioBase: pb.precioBase,
        precio: aplicarPorcentaje(pb.precioBase),
      }));
      const precioBaseUsar = preciosBase[0]?.precioBase ?? "";
      const precioUsar = precios[0]?.precio ?? "";
      // Código y medidas de la línea del mueble (LINEA de SketchUp) si está
      // entre las activas; si no, la primera activa como en el buscador.
      const lineaMueble = String(f.m.linea?.valor ?? "");
      const lineaActiva = lineasActivas.some(
        (l) => String(l.linea) === lineaMueble,
      )
        ? lineaMueble
        : lineasActivas[0]?.linea;

      if (precioBaseUsar === "" || precioBaseUsar == null) {
        sinPrecio.push(p.articulo);
      }

      const fila = {
        ...FILA_BASE,
        articulo: p.articulo,
        nombreart: p.nombreart ?? p.NOMBREART ?? p.articulo,
        cantidad: f.m.cantidad ?? 1,
        precio: String(precioUsar),
        precioBase: String(precioBaseUsar),
        precios,
        preciosBase,
        area: p.area ?? p.AREA ?? null,
        codartint:
          p.codartintPorLinea?.[String(lineaActiva)] ??
          p.codartint ??
          p.CODARTINT ??
          null,
        ancho:
          p.anchoPorLinea?.[String(lineaActiva)] ?? p.ancho ?? p.ANCHO ?? null,
        alto: p.altoPorLinea?.[String(lineaActiva)] ?? p.alto ?? p.ALTO ?? null,
        profundidad:
          p.profundidadPorLinea?.[String(lineaActiva)] ??
          p.profundidad ??
          p.PROFUNDIDAD ??
          null,
        color: f.color || null,
        manija: f.manija || null,
      };
      nuevas[familia].push(recalcFila ? recalcFila(fila) : fila);
    });

    setCocinaItems((prev) => ({
      ...prev,
      bajomesadas: [...(prev.bajomesadas ?? []), ...nuevas.bajomesadas],
      alacenas: [...(prev.alacenas ?? []), ...nuevas.alacenas],
    }));

    // Recordar las equivalencias elegidas (sin bloquear si falla).
    const aGuardar = [];
    importables
      .filter((f) => f.recordar)
      .forEach((f) => {
        aGuardar.push({
          tipo: "mueble",
          clave: f.m.nombre,
          articulo: f.sel.art.articulo,
          familia: f.sel.familia,
        });
        if (f.m.color?.valor && f.color) {
          aGuardar.push({
            tipo: "color",
            clave: f.m.color.valor,
            codartint: f.color,
          });
        }
        if (f.m.manija?.valor !== "" && f.m.manija?.valor != null && f.manija) {
          aGuardar.push({
            tipo: "manija",
            clave: f.m.manija.valor,
            codartint: f.manija,
          });
        }
      });
    if (aGuardar.length > 0) {
      try {
        await authFetch(`${API}/sketchup/equivalencias`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ equivalencias: aGuardar }),
        });
      } catch {
        /* no bloquea la importación */
      }
    }

    const unidades = importables.reduce(
      (s, f) => s + (parseFloat(f.m.cantidad) || 1),
      0,
    );
    setResultado({
      items: importables.length,
      unidades,
      sinArticulo: sinArticulo.length,
      sinPrecio,
    });
    setImportando(false);
  };

  // ── Avisos ──
  const lineasFueraDeEncabezado = filas.filter(
    (f) =>
      f.incluir &&
      f.m.linea?.valor &&
      lineasOk &&
      !lineasActivas.some((l) => String(l.linea) === String(f.m.linea.valor)),
  );
  const noImportado = proyecto
    ? [
        ...(proyecto.otros?.length
          ? [`${proyecto.otros.length} componente(s) sueltos (bacha, grifo, etc.)`]
          : []),
        ...(proyecto.ocultos_omitidos?.length
          ? [`${proyecto.ocultos_omitidos.length} oculto(s) omitido(s) al exportar`]
          : []),
        "granito, zócalo y mano de cada mueble",
      ]
    : [];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#0a3a5c99",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 4,
          width: "min(1100px, 100%)",
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          fontFamily: "'Space Mono',monospace",
        }}
      >
        <div
          style={{
            padding: "14px 20px",
            borderBottom: "1px solid #c8dae8",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ color: "#0a3a5c", fontWeight: 700, fontSize: 14 }}>
            Importar proyecto de SketchUp
          </div>
          <button onClick={onClose} style={estiloBoton(false)}>
            Cerrar
          </button>
        </div>

        <div style={{ padding: 20, overflow: "auto", paddingBottom: 140 }}>
          {!listo && (
            <div style={{ color: "#6699bb", fontSize: 12 }}>
              Cargando catálogos…
            </div>
          )}

          {listo && !lineasOk && (
            <div
              style={{
                background: "#fff4e0",
                border: "1px solid #e8b860",
                padding: "10px 14px",
                fontSize: 12,
                marginBottom: 14,
              }}
            >
              Antes de importar, elegí al menos una línea de precios en el
              Encabezado: sin línea activa los ítems quedan con precio vacío.
            </div>
          )}

          {listo && (
            <div style={{ marginBottom: 16 }}>
              <input type="file" accept=".json,application/json" onChange={leerArchivo} />
              {error && (
                <div style={{ color: "#b03030", fontSize: 12, marginTop: 8 }}>
                  {error}
                </div>
              )}
            </div>
          )}

          {resultado && (
            <div
              style={{
                background: "#e8f5ec",
                border: "1px solid #7bc08c",
                padding: "12px 16px",
                fontSize: 12,
                lineHeight: 1.6,
              }}
            >
              Se cargaron {resultado.items} ítem(s) ({resultado.unidades} unidades)
              en Cocina. Ya podés revisarlos y editarlos en la solapa Cocina y en
              Presupuesto.
              {resultado.sinArticulo > 0 && (
                <div>
                  {resultado.sinArticulo} mueble(s) quedaron sin artículo y no se
                  cargaron.
                </div>
              )}
              {resultado.sinPrecio.length > 0 && (
                <div>
                  Sin precio para la línea activa: {resultado.sinPrecio.join(", ")}.
                </div>
              )}
            </div>
          )}

          {proyecto && !resultado && (
            <>
              <div style={{ fontSize: 12, color: "#0a3a5c", marginBottom: 10 }}>
                Proyecto <b>{proyecto.proyecto}</b> — exportado el {proyecto.fecha}.
                Asigná el artículo de Integral a cada mueble; el color y la manija
                se completan solos cuando hay una única coincidencia.
              </div>

              <table
                style={{
                  borderCollapse: "collapse",
                  width: "100%",
                  tableLayout: "fixed",
                }}
              >
                <thead>
                  <tr>
                    <th style={{ ...th, width: 34 }}></th>
                    <th style={{ ...th, width: 150 }}>MUEBLE (SKETCHUP)</th>
                    <th style={{ ...th, width: 44 }}>CANT.</th>
                    <th style={{ ...th, width: "31%" }}>ARTÍCULO EN INTEGRAL</th>
                    <th style={{ ...th, width: "20%" }}>COLOR</th>
                    <th style={{ ...th, width: "17%" }}>MANIJA</th>
                    <th style={{ ...th, width: 66 }}>RECORDAR</th>
                  </tr>
                </thead>
                <tbody>
                  {filas.map((f) => (
                    <tr key={f.idx} style={{ opacity: f.incluir ? 1 : 0.45 }}>
                      <td style={td}>
                        <input
                          type="checkbox"
                          checked={f.incluir}
                          onChange={(e) =>
                            actualizarFila(f.idx, { incluir: e.target.checked })
                          }
                        />
                      </td>
                      <td style={td}>
                        <div style={{ fontWeight: 700, color: "#0a3a5c" }}>
                          {f.m.nombre}
                        </div>
                        <div style={{ fontSize: 10, color: "#6699bb" }}>
                          {f.m.linea?.etiqueta || "—"} · {f.m.lenx_cm}×
                          {f.m.leny_cm}×{f.m.lenz_cm} cm
                        </div>
                      </td>
                      <td style={td}>{f.m.cantidad}</td>
                      <td style={td}>
                        <Buscador
                          placeholder="Buscar artículo…"
                          etiqueta={f.sel?.art.articulo ?? ""}
                          opciones={opcionesArticulo}
                          onElegir={(id) => {
                            const [familia, ...resto] = id.split("|");
                            const art = buscarArticulo(familia, resto.join("|"));
                            if (art) actualizarFila(f.idx, { sel: { familia, art } });
                          }}
                        />
                        {f.sel && (
                          <div style={{ fontSize: 10, color: "#6699bb", marginTop: 2 }}>
                            {f.sel.familia === "alacenas" ? "Alacena" : "Bajomesada"}
                          </div>
                        )}
                      </td>
                      <td style={td}>
                        <Buscador
                          placeholder="Color…"
                          permitirVacio
                          etiqueta={
                            opcionesMelamina.find((o) => o.id === f.color)?.label ?? ""
                          }
                          opciones={opcionesMelamina}
                          onElegir={(id) => actualizarFila(f.idx, { color: id })}
                        />
                        <div style={{ fontSize: 10, color: "#6699bb", marginTop: 2 }}>
                          SketchUp: {f.m.color?.etiqueta || "—"}
                        </div>
                      </td>
                      <td style={td}>
                        <Buscador
                          placeholder="Manija…"
                          permitirVacio
                          etiqueta={
                            opcionesManija.find((o) => o.id === f.manija)?.label ?? ""
                          }
                          opciones={opcionesManija}
                          onElegir={(id) => actualizarFila(f.idx, { manija: id })}
                        />
                        <div style={{ fontSize: 10, color: "#6699bb", marginTop: 2 }}>
                          SketchUp: {f.m.manija?.etiqueta || "—"}
                        </div>
                      </td>
                      <td style={{ ...td, textAlign: "center" }}>
                        <input
                          type="checkbox"
                          checked={f.recordar}
                          onChange={(e) =>
                            actualizarFila(f.idx, { recordar: e.target.checked })
                          }
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {lineasFueraDeEncabezado.length > 0 && (
                <div style={{ fontSize: 11, color: "#a06000", marginTop: 12 }}>
                  Atención: {lineasFueraDeEncabezado.map((f) => f.m.nombre).join(", ")}{" "}
                  tienen en SketchUp una LINEA que no está elegida en el Encabezado;
                  el precio sale de las líneas activas del Encabezado.
                </div>
              )}
              <div style={{ fontSize: 11, color: "#6699bb", marginTop: 8 }}>
                No se importa todavía: {noImportado.join("; ")}.
              </div>
            </>
          )}
        </div>

        {proyecto && !resultado && (
          <div
            style={{
              padding: "12px 20px",
              borderTop: "1px solid #c8dae8",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div style={{ fontSize: 12, color: "#0a3a5c" }}>
              {importables.length} mueble(s) listos
              {sinArticulo.length > 0 && ` · ${sinArticulo.length} sin artículo`}
            </div>
            <button
              onClick={importar}
              disabled={!lineasOk || importables.length === 0 || importando}
              style={{
                ...estiloBoton(true),
                opacity: !lineasOk || importables.length === 0 || importando ? 0.5 : 1,
              }}
            >
              {importando ? "Importando…" : "Cargar al presupuesto"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
