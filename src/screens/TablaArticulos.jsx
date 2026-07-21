import Totales from "./Totales";

// Secciones cuyos ítems llevan medidas de ancho/alto.
const TIENE_MEDIDAS = ["Mampara", "Puerta", "Vanitory"];

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
  ajusteModo,
  setAjusteModo,
  ajusteValor,
  setAjusteValor,
  ajusteScope,
  setAjusteScope,
  aplicarAjuste,
  ajusteAplicado,
  preciosOriginales,
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
              {presupuestoItems.map((it) => (
                <option key={it.id} value={it.id}>
                  {it.descripcion || it.nombreart || it.id}
                </option>
              ))}
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
                onClick={() => {
                  if (Object.keys(preciosOriginales).length === 0) {
                    alert(
                      "Este ajuste viene de un presupuesto ya guardado: no se puede revertir automáticamente (los precios base no quedaron en memoria). Para deshacerlo, aplicá un ajuste manual inverso.",
                    );
                    return;
                  }
                  revertirAjuste();
                }}
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
              </span>
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
              {lineasActivas.length > 0 ? (
                lineasActivas.map((l) => (
                  <th
                    key={l.linea}
                    style={{
                      padding: "9px 14px",
                      textAlign: "right",
                      fontWeight: 700,
                      width: 130,
                    }}
                  >
                    Línea {l.linea}
                  </th>
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
              <th
                style={{
                  padding: "9px 14px",
                  textAlign: "right",
                  fontWeight: 700,
                  width: 140,
                }}
              >
                Subtotal
              </th>
              <th style={{ padding: "9px 8px", width: 36 }}></th>
            </tr>
          </thead>
          <tbody>
            {(() => {
              const secciones = [
                ...new Set(presupuestoItems.map((p) => grupoDe(p))),
              ];
              let rowIdx = 0;
              return secciones.flatMap((sec) => {
                const items = presupuestoItems.filter(
                  (p) => grupoDe(p) === sec,
                );
                // Subtotal por línea para la sección
                const subtotalesSec =
                  lineasActivas.length > 0
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
                  6 + (lineasActivas.length > 0 ? lineasActivas.length : 1) + 1; // sección+prod+desc+cant+ancho+alto + líneas + subtotal

                return [
                  // Fila de sección
                  <tr key={`sec-${sec}`} style={{ background: "#ddeefa" }}>
                    <td
                      colSpan={totalCols + 1}
                      style={{
                        padding: "6px 14px",
                        fontWeight: 700,
                        color: "#0a3a5c",
                        fontSize: 11,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                      }}
                    >
                      {sec}
                    </td>
                  </tr>,
                  // Filas de ítems
                  ...items.map((item) => {
                    const bg = rowIdx++ % 2 === 0 ? "#fff" : "#f5f9fc";
                    return (
                      <tr key={item.id} style={{ background: bg }}>
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
                          <div>{item.nombreart}</div>
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
                                color: presmv != null ? "#2277bb" : "#c0392b",
                                fontFamily: "monospace",
                              }}
                            >
                              presmv: {presmv ?? "null"}
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
                        {lineasActivas.length > 0 ? (
                          lineasActivas.map((l, li) => {
                            const pr = item.precios?.[li]?.precio ?? item.precio ?? 0;
                            const pctItem = item[`porcentaje${li + 1}`];
                            return (
                              <td
                                key={l.linea}
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
                            padding: "7px 14px",
                            border: "1px solid #e8f0f7",
                            textAlign: "right",
                            fontWeight: 700,
                          }}
                        >
                          $
                          {Number(item.subtotal).toLocaleString("es-AR", {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                        <td
                          style={{
                            padding: "7px 4px",
                            border: "1px solid #e8f0f7",
                            textAlign: "center",
                          }}
                        >
                          {item.seccion === "Mampara" && presmv != null && (
                            <button
                              onClick={async () => {
                                try {
                                  const res = await authFetch(
                                    `${API}/presupuestos-mamparas/${presmv}`,
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
                      colSpan={6}
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
                    {lineasActivas.length > 0
                      ? subtotalesSec.map((st, li) => (
                          <td
                            key={li}
                            style={{
                              padding: "6px 14px",
                              textAlign: "right",
                              fontWeight: 700,
                              color: "#0a5c3a",
                              border: "1px solid #c8dae8",
                            }}
                          >
                            $
                            {st.toLocaleString("es-AR", {
                              minimumFractionDigits: 2,
                            })}
                          </td>
                        ))
                      : null}
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
                    <td style={{ border: "1px solid #c8dae8" }}></td>
                  </tr>,
                ];
              });
            })()}
            {/* TOTAL GENERAL */}
            <Totales
              presupuestoItems={presupuestoItems}
              lineasActivas={lineasActivas}
            />
          </tbody>
        </table>
        </>
      )}
    </div>
  );
}
