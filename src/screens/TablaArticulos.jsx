import { useState, useEffect } from "react";
import Totales from "./Totales";

// Secciones cuyos ítems llevan medidas de ancho/alto.
const TIENE_MEDIDAS = ["Mampara", "Puerta", "Vanitory"];

// Codartint reales de los accesorios "autofreno" (puerta y cajonera/correderas).
// Mismo criterio que useCocinaPlacard.js / TabCocina.jsx / PlacardSection.jsx —
// NO buscar la palabra "autofreno" en el nombre, porque el de cajonera se
// llama "TELESCOPICA SOFT CLOSING...".
const CODARTINT_FRENO = ["EH35C0SCB", "EHCTSC500B"];
const tieneFreno = (accesorios, accesoriosDisponibles) =>
  (accesorios ?? []).some((nombre) => {
    const art = accesoriosDisponibles?.find(
      (a) => a.articulo === String(nombre),
    );
    return art && CODARTINT_FRENO.includes(String(art.codartint));
  });

// Accesorios "normales" (no autofreno): se listan como texto chico con el
// nombre del artículo, porque el badge "c/freno" de arriba solo cubre
// bisagra/corredera autofreno y para el resto (estantes, herrajes varios,
// etc.) hoy no había ninguna pista visual en esta pestaña.
const nombresAccesoriosNoFreno = (accesorios, accesoriosDisponibles) =>
  (accesorios ?? []).filter((nombre) => {
    const art = accesoriosDisponibles?.find(
      (a) => a.articulo === String(nombre),
    );
    return !(art && CODARTINT_FRENO.includes(String(art.codartint)));
  });

// Contenido completo del tab "Presupuesto": resumen de cliente, panel de
// ajuste de precios, y la tabla de ítems agrupados por sección con
// subtotales y el total general.
// Todo el estado sigue viviendo en PresupuestoNuevo.jsx (el padre).
export default function TablaArticulos({
  // Resumen cliente
  cliente,
  telefono1,
  telefono2,
  wapp,
  listaPrecio,
  numero,
  revision,
  // Panel de ajuste
  presupuestoItems,
  // ids ("cocina-familia-idx" / "placard-familia-idx") de los ítems cuyo
  // precio cambió en el último click de "Actualizar" — se resaltan en verde.
  idsPrecioActualizado,
  ajusteModo,
  setAjusteModo,
  ajusteValor,
  setAjusteValor,
  ajusteScope,
  setAjusteScope,
  aplicarAjuste,
  ajusteAplicado,
  revertirAjuste,
  // Tabla
  lineasActivas,
  listaPorcentaje,
  presmv,
  prespv,
  abrirPresItemPopover,
  quitarDePresupuesto,
  authFetch,
  API,
  setMamparaAEditar,
  setPuertaAEditar,
  setTab,
  // Grupos personalizados (subdivisión manual dentro de una misma sección)
  gruposCustom,
  setGruposCustom,
  nombresGruposUsados,
  // Orden manual de grupos (▲▼ del encabezado de cada sección)
  ordenGrupos,
  setOrdenGrupos,
  // accesorios: lista de artículos "extra" (area='accesorio'), para poder
  // saber si un accesorio pegado a un ítem es "de freno" por su codartint
  accesoriosDisponibles,
  // Línea de precio elegida por grupo (ver estado en PresupuestoNuevo.jsx)
  lineaPorGrupo,
  setLineaPorGrupo,
  // Color (melamina): lista de opciones + setter para actualizar el ítem
  // local en presupuestoItems cuando se elige un color en la grilla.
  melaminas,
  // Manija: lista de opciones (mismo shape que melaminas), mismo mecanismo.
  manijas,
  setPresupuestoItems,
  // Confirmado: si la revisión actual ya fue confirmada (ver PresupuestoNuevo.jsx).
  // Determina el valor predeterminado de mostrarColor/mostrarManija.
  confirmado,
}) {
  // Grupo efectivo de un ítem: el personalizado si el usuario le asignó uno,
  // si no la sección automática de siempre.
  const grupoDe = (it) => {
    const gManual = gruposCustom?.[it.id];
    if (gManual && gManual.trim()) return gManual.trim();
    if (it.grupo && it.grupo.trim()) return it.grupo.trim();
    return it.seccion;
  };

  const asignarGrupo = (itemId, valor) => {
    setGruposCustom((prev) => {
      const next = { ...prev };
      if (!valor || !valor.trim()) {
        delete next[itemId];
      } else {
        next[itemId] = valor;
      }
      return next;
    });
  };

  // Orden efectivo de los grupos: primero los que están en ordenGrupos (en
  // ese orden), después los que falten en su orden natural de aparición.
  // Así un grupo nuevo que se agrega después siempre aparece al final hasta
  // que el usuario lo reordene a mano.
  const seccionesNaturales = [
    ...new Set(presupuestoItems.map((p) => grupoDe(p))),
  ];
  const secciones = [
    ...(ordenGrupos ?? []).filter((s) => seccionesNaturales.includes(s)),
    ...seccionesNaturales.filter((s) => !(ordenGrupos ?? []).includes(s)),
  ];

  // Mueve un grupo un lugar hacia arriba (-1) o abajo (+1) en "secciones".
  const moverGrupo = (sec, delta) => {
    const idx = secciones.indexOf(sec);
    const nuevoIdx = idx + delta;
    if (idx === -1 || nuevoIdx < 0 || nuevoIdx >= secciones.length) return;
    const next = [...secciones];
    [next[idx], next[nuevoIdx]] = [next[nuevoIdx], next[idx]];
    setOrdenGrupos(next);
  };

  // ── Color por grupo: selección local (grupo + melamina elegidos en el
  // panel) y función que aplica ese color a TODOS los ítems del grupo. ──
  const [grupoColorSel, setGrupoColorSel] = useState("");
  // Sentinel distinto de "" (que significa "todavía no elegí nada" y deja
  // el botón deshabilitado) para poder elegir explícitamente "Sin color" y
  // así quitar el color ya asignado a los ítems del grupo.
  const SIN_COLOR = "__SIN_COLOR__";
  const [colorGrupoValor, setColorGrupoValor] = useState("");

  const aplicarColorAGrupo = () => {
    if (!grupoColorSel || !colorGrupoValor) return;
    const valor = colorGrupoValor === SIN_COLOR ? "" : colorGrupoValor;
    setPresupuestoItems((prev) =>
      prev.map((p) =>
        grupoDe(p) === grupoColorSel ? { ...p, color: valor } : p,
      ),
    );
  };

  // ── Manija por grupo: mismo mecanismo que Color por grupo. ──────────────
  const [grupoManijaSel, setGrupoManijaSel] = useState("");
  const SIN_MANIJA = "__SIN_MANIJA__";
  const [manijaGrupoValor, setManijaGrupoValor] = useState("");

  const aplicarManijaAGrupo = () => {
    if (!grupoManijaSel || !manijaGrupoValor) return;
    const valor = manijaGrupoValor === SIN_MANIJA ? "" : manijaGrupoValor;
    setPresupuestoItems((prev) =>
      prev.map((p) =>
        grupoDe(p) === grupoManijaSel ? { ...p, manija: valor } : p,
      ),
    );
  };

  // ── Visibilidad de las columnas Color / Manija: ocultas por defecto,
  // salvo que el presupuesto ya esté confirmado (ahí arrancan visibles).
  // En ambos casos el usuario puede activarlas/desactivarlas a mano con los
  // botones de abajo. El default se vuelve a calcular cuando cambia el
  // presupuesto/revisión cargado o su estado de confirmación, sin pisar un
  // toggle manual hecho mientras se sigue trabajando sobre el mismo.
  const [mostrarColor, setMostrarColor] = useState(!!confirmado);
  const [mostrarManija, setMostrarManija] = useState(!!confirmado);
  useEffect(() => {
    setMostrarColor(!!confirmado);
    setMostrarManija(!!confirmado);
  }, [numero, revision, confirmado]);

  // Cantidad de columnas fijas antes de las columnas de línea de precio:
  // Grupo, Producto, Descripción, Cant., Ancho, Alto (+ Color / Manija si
  // están activadas). Se usa para los colSpan de las filas de sección y
  // subtotal.
  const colSpanBase = 6 + (mostrarColor ? 1 : 0) + (mostrarManija ? 1 : 0);

  return (
    <div>
      {/* Encabezado cliente */}
      <div
        style={{
          background: "#e8f0f7",
          border: "1px solid #c8dae8",
          borderRadius: 3,
          padding: "10px 16px",
          marginBottom: 20,
          fontFamily: "'Space Mono',monospace",
          display: "flex",
          alignItems: "center",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <span
          style={{
            fontSize: 11,
            color: "#6699bb",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          Cliente:
        </span>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#0a3a5c" }}>
          {cliente || "Consumidor final"}
        </span>
        {telefono1 && (
          <span style={{ fontSize: 11, color: "#4a6a8c" }}>
            📞 {telefono1}
          </span>
        )}
        {telefono2 && (
          <span style={{ fontSize: 11, color: "#4a6a8c" }}>
            📞 {telefono2}
          </span>
        )}
        {wapp && (
          <span style={{ fontSize: 11, color: "#1a7a3a" }}>💬 {wapp}</span>
        )}
        <span
          style={{
            fontSize: 11,
            color: "#0a3a5c",
            background: "#eaf2fa",
            border: "1px solid #c8dae8",
            borderRadius: 2,
            padding: "2px 8px",
            fontWeight: 700,
          }}
        >
          Lista vigente: {listaPrecio || "—"}
        </span>
        <span style={{ marginLeft: "auto", fontSize: 11, color: "#6699bb" }}>
          N° {numero} — Rev. {revision}
        </span>
      </div>

      {/* ── Panel de ajuste de precios ── */}
      {presupuestoItems.length > 0 && (
        <div
          style={{
            background: "#f5f8fb",
            border: "1px solid #c8dae8",
            borderRadius: 4,
            padding: "12px 16px",
            marginBottom: 16,
            fontFamily: "'Space Mono',monospace",
            fontSize: 12,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            {/* Etiqueta */}
            <span
              style={{
                fontWeight: 700,
                color: "#0a3a5c",
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                whiteSpace: "nowrap",
              }}
            >
              ✏️ Ajuste de precios
            </span>

            {/* Modo */}
            <div
              style={{
                display: "flex",
                border: "1px solid #b8cfe0",
                borderRadius: 2,
                overflow: "hidden",
              }}
            >
              {[
                ["porcentaje", "% Porcentaje"],
                ["monto", "$ Monto"],
              ].map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => {
                    setAjusteModo(val);
                    setAjusteValor("");
                  }}
                  style={{
                    padding: "5px 12px",
                    border: "none",
                    cursor: "pointer",
                    fontFamily: "'Space Mono',monospace",
                    fontSize: 11,
                    background: ajusteModo === val ? "#0a3a5c" : "#fff",
                    color: ajusteModo === val ? "#fff" : "#0a3a5c",
                    borderRight:
                      val === "porcentaje" ? "1px solid #b8cfe0" : "none",
                    transition: "all 0.12s",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Valor */}
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ color: "#6699bb", fontSize: 13 }}>
                {ajusteModo === "porcentaje" ? "%" : "$"}
              </span>
              <input
                type="number"
                value={ajusteValor}
                onChange={(e) => setAjusteValor(e.target.value)}
                placeholder={ajusteModo === "porcentaje" ? "ej: 10" : "ej: 500"}
                style={{
                  width: 90,
                  padding: "5px 8px",
                  border: "1px solid #b8cfe0",
                  borderRadius: 2,
                  fontFamily: "'Space Mono',monospace",
                  fontSize: 12,
                  outline: "none",
                  color: "#0a3a5c",
                }}
                onKeyDown={(e) => e.key === "Enter" && aplicarAjuste()}
              />
            </div>

            {/* Scope */}
            <select
              value={ajusteScope}
              onChange={(e) => setAjusteScope(e.target.value)}
              style={{
                padding: "5px 8px",
                border: "1px solid #b8cfe0",
                borderRadius: 2,
                fontFamily: "'Space Mono',monospace",
                fontSize: 11,
                color: "#0a3a5c",
                background: "#fff",
                maxWidth: 200,
              }}
            >
              <option value="todos">Todos los ítems</option>
              {(nombresGruposUsados ?? []).length > 0 && (
                <optgroup label="Por grupo">
                  {nombresGruposUsados.map((g) => (
                    <option key={`grupo:${g}`} value={`grupo:${g}`}>
                      {g}
                    </option>
                  ))}
                </optgroup>
              )}
              <optgroup label="Por artículo">
                {presupuestoItems.map((it) => (
                  <option key={it.id} value={it.id}>
                    {it.descripcion || it.nombreart || it.id}
                  </option>
                ))}
              </optgroup>
            </select>

            {/* Botón aplicar */}
            <button
              onClick={aplicarAjuste}
              disabled={!ajusteValor}
              style={{
                padding: "5px 14px",
                background: ajusteValor ? "#0a3a5c" : "#c8dae8",
                color: ajusteValor ? "#fff" : "#99aabb",
                border: "none",
                borderRadius: 2,
                fontFamily: "'Space Mono',monospace",
                fontSize: 11,
                cursor: ajusteValor ? "pointer" : "default",
                fontWeight: 700,
                transition: "all 0.12s",
              }}
            >
              Aplicar
            </button>

            {/* Botón revertir */}
            {ajusteAplicado && (
              <button
                onClick={revertirAjuste}
                style={{
                  padding: "5px 14px",
                  background: "#fff",
                  color: "#c0392b",
                  border: "1px solid #e0b0b0",
                  borderRadius: 2,
                  fontFamily: "'Space Mono',monospace",
                  fontSize: 11,
                  cursor: "pointer",
                  transition: "all 0.12s",
                }}
              >
                ↩ Revertir
              </button>
            )}

            {/* Indicador activo */}
            {ajusteAplicado && (
              <span
                style={{
                  fontSize: 10,
                  color: "#1a7a3a",
                  background: "#e8f4ee",
                  border: "1px solid #b0d8bc",
                  borderRadius: 2,
                  padding: "2px 8px",
                  fontWeight: 700,
                }}
              >
                AJUSTE ACTIVO: {ajusteValor}
                {ajusteModo === "porcentaje" ? "%" : "$"}
                {ajusteScope !== "todos" && (
                  <>
                    {" "}
                    (
                    {ajusteScope.startsWith("grupo:")
                      ? `grupo: ${ajusteScope.slice(6)}`
                      : "1 ítem"}
                    )
                  </>
                )}
              </span>
            )}

            {/* Separador */}
            <span
              style={{
                width: 1,
                alignSelf: "stretch",
                background: "#c8dae8",
                margin: "0 2px",
              }}
            />

            {/* Botón mostrar/ocultar columna Color */}
            <button
              onClick={() => setMostrarColor((v) => !v)}
              title={
                mostrarColor
                  ? "Ocultar columna Color"
                  : "Mostrar columna Color"
              }
              style={{
                padding: "5px 14px",
                background: mostrarColor ? "#0a3a5c" : "#fff",
                color: mostrarColor ? "#fff" : "#0a3a5c",
                border: "1px solid #b8cfe0",
                borderRadius: 2,
                fontFamily: "'Space Mono',monospace",
                fontSize: 11,
                cursor: "pointer",
                fontWeight: 700,
                whiteSpace: "nowrap",
                transition: "all 0.12s",
              }}
            >
              🎨 Color {mostrarColor ? "ON" : "OFF"}
            </button>

            {mostrarColor && (
              <>
                {/* Etiqueta color por grupo */}
                <span
                  style={{
                    fontWeight: 700,
                    color: "#0a3a5c",
                    fontSize: 11,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    whiteSpace: "nowrap",
                  }}
                >
                  Color por grupo
                </span>

                {/* Selector de grupo */}
                <select
                  value={grupoColorSel}
                  onChange={(e) => setGrupoColorSel(e.target.value)}
                  style={{
                    padding: "5px 8px",
                    border: "1px solid #b8cfe0",
                    borderRadius: 2,
                    fontFamily: "'Space Mono',monospace",
                    fontSize: 11,
                    color: "#0a3a5c",
                    background: "#fff",
                    maxWidth: 180,
                  }}
                >
                  <option value="">Grupo...</option>
                  {secciones.map((sec) => (
                    <option key={sec} value={sec}>
                      {sec}
                    </option>
                  ))}
                </select>

                {/* Selector de color (melamina) */}
                <select
                  value={colorGrupoValor}
                  onChange={(e) => setColorGrupoValor(e.target.value)}
                  style={{
                    padding: "5px 8px",
                    border: "1px solid #b8cfe0",
                    borderRadius: 2,
                    fontFamily: "'Space Mono',monospace",
                    fontSize: 11,
                    color: "#0a3a5c",
                    background: "#fff",
                    maxWidth: 180,
                  }}
                >
                  <option value="">Color...</option>
                  <option value={SIN_COLOR}>— Sin color —</option>
                  {(melaminas ?? []).map((m) => (
                    <option key={m.codartint} value={m.codartint}>
                      {m.articulo}
                    </option>
                  ))}
                </select>

                {/* Botón aplicar color a grupo */}
                <button
                  onClick={aplicarColorAGrupo}
                  disabled={!grupoColorSel || !colorGrupoValor}
                  title="Aplica este color a todos los ítems del grupo elegido"
                  style={{
                    padding: "5px 14px",
                    background:
                      grupoColorSel && colorGrupoValor ? "#0a3a5c" : "#c8dae8",
                    color:
                      grupoColorSel && colorGrupoValor ? "#fff" : "#99aabb",
                    border: "none",
                    borderRadius: 2,
                    fontFamily: "'Space Mono',monospace",
                    fontSize: 11,
                    cursor:
                      grupoColorSel && colorGrupoValor ? "pointer" : "default",
                    fontWeight: 700,
                    transition: "all 0.12s",
                  }}
                >
                  Aplicar
                </button>
              </>
            )}

            {/* Separador */}
            <span
              style={{
                width: 1,
                alignSelf: "stretch",
                background: "#c8dae8",
                margin: "0 2px",
              }}
            />

            {/* Botón mostrar/ocultar columna Manija */}
            <button
              onClick={() => setMostrarManija((v) => !v)}
              title={
                mostrarManija
                  ? "Ocultar columna Manija"
                  : "Mostrar columna Manija"
              }
              style={{
                padding: "5px 14px",
                background: mostrarManija ? "#0a3a5c" : "#fff",
                color: mostrarManija ? "#fff" : "#0a3a5c",
                border: "1px solid #b8cfe0",
                borderRadius: 2,
                fontFamily: "'Space Mono',monospace",
                fontSize: 11,
                cursor: "pointer",
                fontWeight: 700,
                whiteSpace: "nowrap",
                transition: "all 0.12s",
              }}
            >
              🔧 Manija {mostrarManija ? "ON" : "OFF"}
            </button>

            {mostrarManija && (
              <>
                {/* Etiqueta manija por grupo */}
                <span
                  style={{
                    fontWeight: 700,
                    color: "#0a3a5c",
                    fontSize: 11,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    whiteSpace: "nowrap",
                  }}
                >
                  Manija por grupo
                </span>

                {/* Selector de grupo */}
                <select
                  value={grupoManijaSel}
                  onChange={(e) => setGrupoManijaSel(e.target.value)}
                  style={{
                    padding: "5px 8px",
                    border: "1px solid #b8cfe0",
                    borderRadius: 2,
                    fontFamily: "'Space Mono',monospace",
                    fontSize: 11,
                    color: "#0a3a5c",
                    background: "#fff",
                    maxWidth: 180,
                  }}
                >
                  <option value="">Grupo...</option>
                  {secciones.map((sec) => (
                    <option key={sec} value={sec}>
                      {sec}
                    </option>
                  ))}
                </select>

                {/* Selector de manija */}
                <select
                  value={manijaGrupoValor}
                  onChange={(e) => setManijaGrupoValor(e.target.value)}
                  style={{
                    padding: "5px 8px",
                    border: "1px solid #b8cfe0",
                    borderRadius: 2,
                    fontFamily: "'Space Mono',monospace",
                    fontSize: 11,
                    color: "#0a3a5c",
                    background: "#fff",
                    maxWidth: 180,
                  }}
                >
                  <option value="">Manija...</option>
                  <option value={SIN_MANIJA}>— Sin manija —</option>
                  {(manijas ?? []).map((m) => (
                    <option key={m.codartint} value={m.codartint}>
                      {m.articulo}
                    </option>
                  ))}
                </select>

                {/* Botón aplicar manija a grupo */}
                <button
                  onClick={aplicarManijaAGrupo}
                  disabled={!grupoManijaSel || !manijaGrupoValor}
                  title="Aplica esta manija a todos los ítems del grupo elegido"
                  style={{
                    padding: "5px 14px",
                    background:
                      grupoManijaSel && manijaGrupoValor
                        ? "#0a3a5c"
                        : "#c8dae8",
                    color:
                      grupoManijaSel && manijaGrupoValor
                        ? "#fff"
                        : "#99aabb",
                    border: "none",
                    borderRadius: 2,
                    fontFamily: "'Space Mono',monospace",
                    fontSize: 11,
                    cursor:
                      grupoManijaSel && manijaGrupoValor
                        ? "pointer"
                        : "default",
                    fontWeight: 700,
                    transition: "all 0.12s",
                  }}
                >
                  Aplicar
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {presupuestoItems.length === 0 ? (
        <div className="pn-modulos-empty">
          <span style={{ fontSize: 36 }}>📋</span>
          <span style={{ fontSize: 13, color: "#6699bb" }}>
            Aún no hay ítems cargados
          </span>
          <span style={{ fontSize: 11, color: "#99bbcc" }}>
            Cargá artículos en Cocina, Placard, Mampara o Especiales
          </span>
        </div>
      ) : (
        <>
          <datalist id="pn-grupos-existentes">
            {(nombresGruposUsados ?? []).map((g) => (
              <option key={g} value={g} />
            ))}
          </datalist>
          <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontFamily: "'Space Mono',monospace",
            fontSize: 12,
          }}
        >
          <thead>
            <tr style={{ background: "#0a3a5c", color: "#fff" }}>
              <th
                style={{
                  padding: "9px 14px",
                  textAlign: "left",
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  width: 150,
                }}
              >
                Grupo
              </th>
              <th
                style={{ padding: "9px 14px", textAlign: "left", fontWeight: 700 }}
              >
                Producto
              </th>
              <th
                style={{ padding: "9px 14px", textAlign: "left", fontWeight: 700 }}
              >
                Descripción
              </th>
              <th
                style={{
                  padding: "9px 10px",
                  textAlign: "center",
                  fontWeight: 700,
                  width: 70,
                }}
              >
                Cant.
              </th>
              <th
                style={{
                  padding: "9px 10px",
                  textAlign: "center",
                  fontWeight: 700,
                  width: 70,
                }}
              >
                Ancho
              </th>
              <th
                style={{
                  padding: "9px 10px",
                  textAlign: "center",
                  fontWeight: 700,
                  width: 70,
                }}
              >
                Alto
              </th>
              {mostrarColor && (
                <th
                  style={{
                    padding: "9px 10px",
                    textAlign: "center",
                    fontWeight: 700,
                    width: 110,
                  }}
                >
                  Color
                </th>
              )}
              {mostrarManija && (
                <th
                  style={{
                    padding: "9px 10px",
                    textAlign: "center",
                    fontWeight: 700,
                    width: 110,
                  }}
                >
                  Manija
                </th>
              )}
              {lineasActivas.length > 0 ? (
                lineasActivas.map((l, li) => (
                  <th
                    key={l.linea}
                    style={{
                      padding: "9px 14px",
                      textAlign: "right",
                      fontWeight: 700,
                      width: 130,
                    }}
                  ></th>
                ))
              ) : (
                <th
                  style={{
                    padding: "9px 14px",
                    textAlign: "right",
                    fontWeight: 700,
                    width: 130,
                  }}
                >
                  Precio unit.
                </th>
              )}
              <th style={{ padding: "9px 8px", width: 36 }}></th>
            </tr>
          </thead>
          <tbody>
            {(() => {
              let rowIdx = 0;
              return secciones.flatMap((sec) => {
                const items = presupuestoItems.filter(
                  (p) => grupoDe(p) === sec,
                );
                // Placard tiene su propia línea de precios fija en la BD
                // (línea 15, ver LINEA_FIJA_PLACARD en useCocinaPlacard.js),
                // independiente de las líneas elegidas en el Encabezado —
                // por eso el mismo importe queda duplicado bajo cada columna
                // "Línea X". Para estos grupos mostramos el precio en una
                // sola columna (fusionando las columnas de línea con
                // colSpan) en vez de repetir el mismo monto en cada una.
                const esPlacardSec =
                  items.length > 0 &&
                  items.every((it) => (it.seccion || "").startsWith("Placard / "));
                // Línea elegida para este grupo (selector "Línea del grupo...").
                // Cuando hay una elegida, igual que con Placard, fusionamos las
                // columnas de línea en una sola (colSpan) mostrando solo el
                // precio de esa línea — así se ve "confirmado" y no repetido
                // en cada columna.
                const lineaElegidaSec = lineaPorGrupo?.[sec];
                const usarColMerged =
                  esPlacardSec || (lineasActivas.length > 1 && lineaElegidaSec != null);
                const liMerged = esPlacardSec ? 0 : lineaElegidaSec;
                // Subtotal por línea para la sección
                const subtotalesSec =
                  lineasActivas.length > 0 && !esPlacardSec
                    ? lineasActivas.map((l, li) =>
                        items.reduce((s, it) => {
                          const pr =
                            parseFloat(
                              it.precios?.[li]?.precio ?? it.precio ?? 0,
                            ) || 0;
                          return s + pr * (parseFloat(it.cantidad) || 1);
                        }, 0),
                      )
                    : null;
                const subtotalSecSimple = items.reduce(
                  (s, it) => s + it.subtotal,
                  0,
                );
                const totalCols =
                  colSpanBase +
                  (lineasActivas.length > 0 ? lineasActivas.length : 1); // sección+prod+desc+cant+ancho+alto(+color)(+manija) + líneas

                return [
                  // Fila de sección
                  <tr key={`sec-${sec}`} style={{ background: "#ddeefa" }}>
                    <td
                      colSpan={colSpanBase}
                      style={{
                        padding: "6px 14px",
                        fontWeight: 700,
                        color: "#0a3a5c",
                        fontSize: 11,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <span
                        style={{ display: "inline-flex", gap: 2 }}
                        // No forma parte del texto de la sección: son los
                        // controles para reordenar grupos (ordenGrupos).
                      >
                        <button
                          type="button"
                          onClick={() => moverGrupo(sec, -1)}
                          disabled={secciones.indexOf(sec) === 0}
                          title="Subir grupo"
                          style={{
                            border: "none",
                            background: "transparent",
                            cursor:
                              secciones.indexOf(sec) === 0
                                ? "default"
                                : "pointer",
                            opacity: secciones.indexOf(sec) === 0 ? 0.3 : 1,
                            fontSize: 11,
                            padding: "0 2px",
                            color: "#0a3a5c",
                          }}
                        >
                          ▲
                        </button>
                        <button
                          type="button"
                          onClick={() => moverGrupo(sec, 1)}
                          disabled={secciones.indexOf(sec) === secciones.length - 1}
                          title="Bajar grupo"
                          style={{
                            border: "none",
                            background: "transparent",
                            cursor:
                              secciones.indexOf(sec) === secciones.length - 1
                                ? "default"
                                : "pointer",
                            opacity:
                              secciones.indexOf(sec) === secciones.length - 1
                                ? 0.3
                                : 1,
                            fontSize: 11,
                            padding: "0 2px",
                            color: "#0a3a5c",
                          }}
                        >
                          ▼
                        </button>
                      </span>
                      {sec}
                      {/* Línea de precio elegida para este grupo, usada en
                          el TOTAL COMBINADO al pie de la tabla (Totales.jsx).
                          No aplica a Placard: esos grupos tienen precio único
                          fijo (LINEA_FIJA_PLACARD), independiente de la línea
                          elegida en el Encabezado. */}
                      {lineasActivas.length > 1 && !esPlacardSec && (
                        <select
                          value={lineaPorGrupo?.[sec] ?? ""}
                          onChange={(e) =>
                            setLineaPorGrupo?.((prev) => {
                              const next = { ...prev };
                              if (e.target.value === "") delete next[sec];
                              else next[sec] = Number(e.target.value);
                              return next;
                            })
                          }
                          onClick={(e) => e.stopPropagation()}
                          title="Línea de precio para este grupo (se usa en el total combinado)"
                          style={{
                            marginLeft: 4,
                            fontSize: 10,
                            fontWeight: 400,
                            textTransform: "none",
                            letterSpacing: "normal",
                            fontFamily: "'Space Mono',monospace",
                            border: "1px solid #7aaac8",
                            borderRadius: 2,
                            padding: "1px 3px",
                            background: lineaPorGrupo?.[sec] != null ? "#ffe58a" : "#fff",
                            color: "#0a3a5c",
                            cursor: "pointer",
                          }}
                        >
                          <option value="">Línea del grupo...</option>
                          {lineasActivas.map((l, li) => (
                            <option key={l.linea} value={li}>
                              Línea {l.linea}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                    {/* Mini-header de línea, alineado con las columnas de
                        precio de más abajo: si el grupo ya eligió una
                        línea, muestra solo esa (fusionada, igual que las
                        celdas de precio); si no, repite el nombre de cada
                        línea activa — mismo criterio que el header general,
                        pero acá "por grupo". */}
                    {lineasActivas.length > 0 &&
                      (usarColMerged ? (
                        <td
                          colSpan={lineasActivas.length}
                          style={{
                            padding: "6px 14px",
                            textAlign: "right",
                            fontWeight: 700,
                            color: "#0a3a5c",
                            fontSize: 10,
                            letterSpacing: "0.06em",
                            textTransform: "uppercase",
                            background: "#c8dae8",
                          }}
                        >
                          Línea {lineasActivas[liMerged]?.linea}
                        </td>
                      ) : (
                        lineasActivas.map((l) => (
                          <td
                            key={l.linea}
                            style={{
                              padding: "6px 14px",
                              textAlign: "right",
                              fontWeight: 700,
                              color: "#0a3a5c",
                              fontSize: 10,
                              letterSpacing: "0.06em",
                              textTransform: "uppercase",
                            }}
                          >
                            Línea {l.linea}
                          </td>
                        ))
                      ))}
                    {lineasActivas.length === 0 && <td></td>}
                    <td></td>
                  </tr>,
                  // Filas de ítems
                  ...items.map((item) => {
                    const zebra = rowIdx++ % 2 === 0 ? "#fff" : "#f5f9fc";
                    const actualizado = idsPrecioActualizado?.has(item.id);
                    const bg = actualizado ? "#bdf3cd" : zebra;
                    return (
                      <tr
                        key={item.id}
                        style={{
                          background: bg,
                          transition: "background-color 1.5s ease",
                        }}
                      >
                        <td
                          style={{
                            padding: "4px 6px",
                            border: "1px solid #e8f0f7",
                          }}
                        >
                          <input
                            type="text"
                            list="pn-grupos-existentes"
                            placeholder={
                              item.grupo && item.grupo.trim()
                                ? item.grupo
                                : item.seccion
                            }
                            value={gruposCustom?.[item.id] ?? ""}
                            onChange={(e) =>
                              asignarGrupo(item.id, e.target.value)
                            }
                            title="Grupo personalizado para el PDF (vacío = automático por sección)"
                            style={{
                              width: "100%",
                              padding: "4px 6px",
                              fontFamily: "'Space Mono',monospace",
                              fontSize: 10,
                              border: "1px solid #d0dde8",
                              borderRadius: 2,
                              color: "#0a3a5c",
                              outline: "none",
                            }}
                          />
                        </td>
                        <td
                          style={{
                            padding: "7px 14px",
                            border: "1px solid #e8f0f7",
                            color: "#334155",
                            fontSize: 11,
                          }}
                        >
                          <div>
                            {item.nombreart}
                            {tieneFreno(item.accesorios, accesoriosDisponibles) && (
                              <span
                                style={{
                                  marginLeft: 6,
                                  fontSize: 10,
                                  fontWeight: 700,
                                  color: "#0a5c3a",
                                }}
                              >
                                c/freno
                              </span>
                            )}
                          </div>
                          {(() => {
                            const otros = nombresAccesoriosNoFreno(
                              item.accesorios,
                              accesoriosDisponibles,
                            );
                            if (otros.length === 0) return null;
                            return (
                              <div
                                title={otros.join(", ")}
                                style={{
                                  fontSize: 10,
                                  color: "#6699bb",
                                  marginTop: 2,
                                  whiteSpace: "nowrap",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  maxWidth: 220,
                                }}
                              >
                                🔧 {otros.join(", ")}
                              </div>
                            );
                          })()}
                          {item.seccion === "Puerta" && item.codherraje && (
                            <div
                              style={{
                                fontSize: 13,
                                fontWeight: 700,
                                color: "#0a7a3a",
                                marginTop: 2,
                              }}
                              title={item.nombreherraje ?? ""}
                            >
                              {item.codherraje}
                            </div>
                          )}
                        </td>
                        <td
                          style={{
                            padding: "7px 14px",
                            border: "1px solid #e8f0f7",
                            color: "#0a3a5c",
                          }}
                        >
                          {item.descripcion}
                          {item.seccion === "Mampara" && (
                            <span
                              style={{
                                marginLeft: 8,
                                fontSize: 10,
                                color: item.presmv != null ? "#2277bb" : "#c0392b",
                                fontFamily: "monospace",
                              }}
                            >
                              presmv: {item.presmv ?? "null"}
                            </span>
                          )}
                          {item.seccion === "Puerta" && (
                            <span
                              style={{
                                marginLeft: 8,
                                fontSize: 10,
                                color:
                                  (item.presp ?? prespv) != null
                                    ? "#2277bb"
                                    : "#c0392b",
                                fontFamily: "monospace",
                              }}
                            >
                              presp: {item.presp ?? prespv ?? "null"}
                            </span>
                          )}
                        </td>
                        <td
                          style={{
                            padding: "7px 10px",
                            border: "1px solid #e8f0f7",
                            textAlign: "center",
                          }}
                        >
                          {item.cantidad}
                        </td>
                        <td
                          style={{
                            padding: "7px 10px",
                            border: "1px solid #e8f0f7",
                            textAlign: "center",
                            color: TIENE_MEDIDAS.includes(item.seccion)
                              ? "#0a3a5c"
                              : "#aaa",
                          }}
                        >
                          {TIENE_MEDIDAS.includes(item.seccion)
                            ? (item.ancho ?? "—")
                            : "—"}
                        </td>
                        <td
                          style={{
                            padding: "7px 10px",
                            border: "1px solid #e8f0f7",
                            textAlign: "center",
                            color: TIENE_MEDIDAS.includes(item.seccion)
                              ? "#0a3a5c"
                              : "#aaa",
                          }}
                        >
                          {TIENE_MEDIDAS.includes(item.seccion)
                            ? (item.alto ?? "—")
                            : "—"}
                        </td>
                        {mostrarColor && (
                          <td
                            style={{
                              padding: "4px 6px",
                              border: "1px solid #e8f0f7",
                              textAlign: "center",
                            }}
                          >
                            <select
                              value={item.color ?? ""}
                              onChange={(e) => {
                                const valor = e.target.value || null;
                                setPresupuestoItems((prev) =>
                                  prev.map((p) =>
                                    p.id === item.id
                                      ? { ...p, color: valor }
                                      : p,
                                  ),
                                );
                              }}
                              style={{
                                width: "100%",
                                fontSize: 11,
                                fontFamily: "'Space Mono',monospace",
                                border: "1px solid #c8dae8",
                                borderRadius: 2,
                                padding: "3px 2px",
                                background: "#fff",
                                color: "#0a3a5c",
                              }}
                            >
                              <option value="">—</option>
                              {(melaminas ?? []).map((m) => (
                                <option key={m.codartint} value={m.codartint}>
                                  {m.articulo}
                                </option>
                              ))}
                            </select>
                          </td>
                        )}
                        {mostrarManija && (
                          <td
                            style={{
                              padding: "4px 6px",
                              border: "1px solid #e8f0f7",
                              textAlign: "center",
                            }}
                          >
                            <select
                              value={item.manija ?? ""}
                              onChange={(e) => {
                                const valor = e.target.value || null;
                                setPresupuestoItems((prev) =>
                                  prev.map((p) =>
                                    p.id === item.id
                                      ? { ...p, manija: valor }
                                      : p,
                                  ),
                                );
                              }}
                              style={{
                                width: "100%",
                                fontSize: 11,
                                fontFamily: "'Space Mono',monospace",
                                border: "1px solid #c8dae8",
                                borderRadius: 2,
                                padding: "3px 2px",
                                background: "#fff",
                                color: "#0a3a5c",
                              }}
                            >
                              <option value="">—</option>
                              {(manijas ?? []).map((m) => (
                                <option key={m.codartint} value={m.codartint}>
                                  {m.articulo}
                                </option>
                              ))}
                            </select>
                          </td>
                        )}
                        {lineasActivas.length > 0 ? (
                          usarColMerged ? (
                            (() => {
                              const li = liMerged;
                              const pr = item.precios?.[li]?.precio ?? item.precio ?? 0;
                              const pctItem = item[`porcentaje${li + 1}`];
                              return (
                                <td
                                  colSpan={lineasActivas.length}
                                  style={{
                                    padding: "7px 14px",
                                    border: "1px solid #e8f0f7",
                                    textAlign: "right",
                                  }}
                                >
                                  {!esPlacardSec && lineasActivas[li] && (
                                    <span
                                      style={{
                                        display: "inline-block",
                                        fontSize: 9,
                                        fontWeight: 700,
                                        color: "#8a6d00",
                                        background: "#ffe58a",
                                        borderRadius: 3,
                                        padding: "1px 5px",
                                        marginRight: 6,
                                        verticalAlign: "middle",
                                      }}
                                    >
                                      Línea {lineasActivas[li].linea}
                                    </span>
                                  )}
                                  <span
                                    className="pn-precio-cell"
                                    onClick={(e) =>
                                      abrirPresItemPopover(
                                        item.id,
                                        li,
                                        parseFloat(pr) || 0,
                                        e,
                                      )
                                    }
                                  >
                                    $
                                    {Number(pr).toLocaleString("es-AR", {
                                      minimumFractionDigits: 2,
                                    })}
                                  </span>
                                  {pctItem != null ? (
                                    <span
                                      style={{
                                        marginLeft: 5,
                                        fontSize: 9,
                                        fontWeight: 700,
                                      }}
                                    >
                                      {listaPorcentaje !== 0 && (
                                        <span
                                          style={{ color: "#2277bb", marginRight: 2 }}
                                        >
                                          +{listaPorcentaje}%
                                        </span>
                                      )}
                                      <span
                                        style={{
                                          color:
                                            pctItem >= 0
                                              ? "#0a7a3a"
                                              : "#c0392b",
                                          background:
                                            pctItem >= 0
                                              ? "#e6f5eb"
                                              : "#fdecea",
                                          borderRadius: 3,
                                          padding: "1px 4px",
                                        }}
                                      >
                                        {pctItem > 0 ? "+" : ""}
                                        {pctItem}%
                                      </span>
                                    </span>
                                  ) : (
                                    listaPorcentaje !== 0 && (
                                      <span
                                        style={{
                                          marginLeft: 5,
                                          fontSize: 9,
                                          color: "#2277bb",
                                          fontWeight: 700,
                                        }}
                                      >
                                        +{listaPorcentaje}%
                                      </span>
                                    )
                                  )}
                                </td>
                              );
                            })()
                          ) : (
                            lineasActivas.map((l, li) => {
                            const pr = item.precios?.[li]?.precio ?? item.precio ?? 0;
                            const pctItem = item[`porcentaje${li + 1}`];
                            const esElegida = lineaPorGrupo?.[sec] === li;
                            return (
                              <td
                                key={l.linea}
                                style={{
                                  padding: "7px 14px",
                                  border: "1px solid #e8f0f7",
                                  textAlign: "right",
                                  background: esElegida ? "#fff6da" : undefined,
                                }}
                              >
                                <span
                                  className="pn-precio-cell"
                                  onClick={(e) =>
                                    abrirPresItemPopover(
                                      item.id,
                                      li,
                                      parseFloat(pr) || 0,
                                      e,
                                    )
                                  }
                                >
                                  $
                                  {Number(pr).toLocaleString("es-AR", {
                                    minimumFractionDigits: 2,
                                  })}
                                </span>
                                {pctItem != null ? (
                                  <span
                                    style={{
                                      marginLeft: 5,
                                      fontSize: 9,
                                      fontWeight: 700,
                                    }}
                                  >
                                    {listaPorcentaje !== 0 && (
                                      <span
                                        style={{ color: "#2277bb", marginRight: 2 }}
                                      >
                                        +{listaPorcentaje}%
                                      </span>
                                    )}
                                    <span
                                      style={{
                                        color:
                                          pctItem >= 0
                                            ? "#0a7a3a"
                                            : "#c0392b",
                                        background:
                                          pctItem >= 0
                                            ? "#e6f5eb"
                                            : "#fdecea",
                                        borderRadius: 3,
                                        padding: "1px 4px",
                                      }}
                                    >
                                      {pctItem > 0 ? "+" : ""}
                                      {pctItem}%
                                    </span>
                                  </span>
                                ) : (
                                  listaPorcentaje !== 0 && (
                                    <span
                                      style={{
                                        marginLeft: 5,
                                        fontSize: 9,
                                        color: "#2277bb",
                                        fontWeight: 700,
                                      }}
                                    >
                                      +{listaPorcentaje}%
                                    </span>
                                  )
                                )}
                              </td>
                            );
                            })
                          )
                        ) : (
                          <td
                            style={{
                              padding: "7px 14px",
                              border: "1px solid #e8f0f7",
                              textAlign: "right",
                            }}
                          >
                            <span
                              className="pn-precio-cell"
                              onClick={(e) =>
                                abrirPresItemPopover(
                                  item.id,
                                  null,
                                  parseFloat(item.precio) || 0,
                                  e,
                                )
                              }
                            >
                              $
                              {Number(item.precio).toLocaleString("es-AR", {
                                minimumFractionDigits: 2,
                              })}
                            </span>
                            {item.porcentaje1 != null ? (
                              <span
                                style={{ marginLeft: 5, fontSize: 9, fontWeight: 700 }}
                              >
                                {listaPorcentaje !== 0 && (
                                  <span style={{ color: "#2277bb", marginRight: 2 }}>
                                    +{listaPorcentaje}%
                                  </span>
                                )}
                                <span
                                  style={{
                                    color:
                                      item.porcentaje1 >= 0 ? "#0a7a3a" : "#c0392b",
                                    background:
                                      item.porcentaje1 >= 0 ? "#e6f5eb" : "#fdecea",
                                    borderRadius: 3,
                                    padding: "1px 4px",
                                  }}
                                >
                                  {item.porcentaje1 > 0 ? "+" : ""}
                                  {item.porcentaje1}%
                                </span>
                              </span>
                            ) : (
                              listaPorcentaje !== 0 && (
                                <span
                                  style={{
                                    marginLeft: 5,
                                    fontSize: 9,
                                    color: "#2277bb",
                                    fontWeight: 700,
                                  }}
                                >
                                  +{listaPorcentaje}%
                                </span>
                              )
                            )}
                          </td>
                        )}
                        <td
                          style={{
                            padding: "7px 4px",
                            border: "1px solid #e8f0f7",
                            textAlign: "center",
                          }}
                        >
                          {item.seccion === "Mampara" && item.presmv != null && (
                            <button
                              onClick={async () => {
                                try {
                                  const res = await authFetch(
                                    `${API}/presupuestos-mamparas/${item.presmv}`,
                                  );
                                  const data = await res.json();
                                  setMamparaAEditar(data);
                                  setTab("mampara");
                                } catch {
                                  alert("No se pudo cargar la mampara");
                                }
                              }}
                              title="Editar mampara"
                              style={{
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                fontSize: 14,
                                color: "#2277bb",
                                marginRight: 4,
                              }}
                            >
                              ✏️
                            </button>
                          )}
                          {item.seccion === "Puerta" &&
                            (item.presp ?? prespv) != null && (
                              <button
                                onClick={async () => {
                                  try {
                                    const res = await authFetch(
                                      `${API}/presupuestos-puertas/${item.presp ?? prespv}`,
                                    );
                                    const data = await res.json();
                                    setPuertaAEditar(data);
                                    setTab("puertas");
                                  } catch {
                                    alert("No se pudo cargar la puerta");
                                  }
                                }}
                                title="Editar puerta"
                                style={{
                                  background: "none",
                                  border: "none",
                                  cursor: "pointer",
                                  fontSize: 14,
                                  color: "#2277bb",
                                  marginRight: 4,
                                }}
                              >
                                ✏️
                              </button>
                            )}
                          <button
                            onClick={() => quitarDePresupuesto(item.id)}
                            title="Quitar"
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              fontSize: 14,
                              color: "#c0392b",
                            }}
                          >
                            🗑
                          </button>
                        </td>
                      </tr>
                    );
                  }),
                  // Subtotal de sección
                  <tr key={`sub-${sec}`} style={{ background: "#e8f4ee" }}>
                    <td
                      colSpan={colSpanBase}
                      style={{
                        padding: "6px 14px",
                        textAlign: "right",
                        fontWeight: 700,
                        color: "#0a3a5c",
                        fontSize: 11,
                        border: "1px solid #c8dae8",
                      }}
                    >
                      Subtotal {sec}
                    </td>
                    {lineasActivas.length > 0 ? (
                      usarColMerged ? (
                        <td
                          colSpan={lineasActivas.length}
                          style={{
                            padding: "6px 14px",
                            textAlign: "right",
                            fontWeight: 700,
                            color: "#0a5c3a",
                            border: "1px solid #c8dae8",
                          }}
                        >
                          {!esPlacardSec && lineasActivas[liMerged] && (
                            <span
                              style={{
                                display: "inline-block",
                                fontSize: 9,
                                fontWeight: 700,
                                color: "#8a6d00",
                                background: "#ffe58a",
                                borderRadius: 3,
                                padding: "1px 5px",
                                marginRight: 6,
                                verticalAlign: "middle",
                              }}
                            >
                              Línea {lineasActivas[liMerged].linea}
                            </span>
                          )}
                          $
                          {(esPlacardSec
                            ? subtotalSecSimple
                            : subtotalesSec[liMerged]
                          ).toLocaleString("es-AR", {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                      ) : (
                        subtotalesSec.map((st, li) => (
                          <td
                            key={li}
                            style={{
                              padding: "6px 14px",
                              textAlign: "right",
                              fontWeight: 700,
                              color: "#0a5c3a",
                              border: "1px solid #c8dae8",
                              background:
                                lineaPorGrupo?.[sec] === li ? "#ffe58a" : undefined,
                            }}
                          >
                            $
                            {st.toLocaleString("es-AR", {
                              minimumFractionDigits: 2,
                            })}
                          </td>
                        ))
                      )
                    ) : (
                      <td
                        style={{
                          padding: "6px 14px",
                          textAlign: "right",
                          fontWeight: 700,
                          color: "#0a5c3a",
                          border: "1px solid #c8dae8",
                        }}
                      >
                        $
                        {subtotalSecSimple.toLocaleString("es-AR", {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                    )}
                    <td style={{ border: "1px solid #c8dae8" }}></td>
                  </tr>,
                ];
              });
            })()}
            {/* TOTAL GENERAL (+ TOTAL COMBINADO si hay líneas por grupo elegidas) */}
            <Totales
              presupuestoItems={presupuestoItems}
              lineasActivas={lineasActivas}
              lineaPorGrupo={lineaPorGrupo}
              grupoDe={grupoDe}
            />
          </tbody>
        </table>
        </>
      )}
    </div>
  );
}
