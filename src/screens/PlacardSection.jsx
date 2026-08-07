import { useState } from "react";

// Codartint reales de los accesorios "autofreno" (puerta y cajonera/correderas).
// Mismo criterio que useCocinaPlacard.js — NO buscar la palabra "autofreno"
// en el nombre, porque el de cajonera se llama "TELESCOPICA SOFT CLOSING...".
const CODARTINT_FRENO = ["EH35C0SCB", "EHCTSC500B"];
const tieneFreno = (accesorios, accesoriosDisponibles) =>
  (accesorios ?? []).some((nombre) => {
    const art = accesoriosDisponibles?.find((a) => a.articulo === nombre);
    return art && CODARTINT_FRENO.includes(String(art.codartint));
  });
// Tab "Placard": selector de familia (Placard/Frente/Auxiliares/Accesorios)
// y la tabla editable de cada familia (agregar, editar inline, buscar
// artículo con precio_un, eliminar).
// Todo el estado sigue viviendo en PresupuestoNuevo.jsx (el padre);
// este componente recibe valores + setters + handlers ya armados por props.
// Nota: se conservan las condiciones "tab === "placard"" tal cual estaban
// en el padre (ahora comparando contra la prop `tab`) para no tocar la lógica.
export default function PlacardSection({
  tab,
  placardFamilia,
  setPlacardFamilia,
  placardItems,
  placardEditIdx,
  setPlacardEditIdx,
  placardFila,
  setPlacardFila,
  placardSearch,
  setPlacardSearch,
  placardSearchFocus,
  setPlacardSearchFocus,
  placardAgregarFila,
  placardEliminarFila,
  placardGuardarEdit,
  placardIniciarEdit,
  placard_total,
  productosFiltrados,
  articulosFamilia = [],
  resolverPrecioBasePlacard,
  aplicarPorcentaje,
  listaPorcentaje,
  abrirPrecioPopover,
  setTab,
  lineasActivas,
  nombresGruposUsados = [],
  // freno: le pega el accesorio autofreno que corresponda (puerta/cajonera)
  aplicarFrenoATodosPlacard,
  setFrenoItemPlacard,
  // accesorios: lista de artículos "extra" (area='accesorio') por ítem
  accesoriosDisponibles,
  accesorioMenu,
  abrirAccesorioMenu,
  cerrarAccesorioMenu,
  toggleAccesorioItem,
  toggleAccesorioEnArray,
  confirmarAccesoriosItem,
  recalcFila,
}) {
  // Para ítems ya guardados sin `area` (guardados antes de que se
  // empezara a persistir esa columna): busca el área del artículo por
  // nombre en articulosFamilia (la lista completa de la familia, sin
  // filtrar por texto de búsqueda — a diferencia de productosFiltrados),
  // para poder calcular el precio del accesorio al toque, sin depender
  // de un guardado/recarga previo.
  const resolverAreaItem = (fila) => {
    if (fila.area != null) return fila.area;
    const match = articulosFamilia.find(
      (a) => a.articulo === fila.articulo || a.nombreart === fila.nombreart,
    );
    return match ? (match.area ?? match.AREA ?? null) : null;
  };

  // ── Freno general (toda la sección Placard) ───────────────
  const hayItemsPlacard =
    (placardItems.placard?.length ?? 0) > 0 ||
    (placardItems.frente?.length ?? 0) > 0 ||
    (placardItems.auxiliares?.length ?? 0) > 0 ||
    (placardItems.accesorios?.length ?? 0) > 0;
  return (
    <>
          {tab === "placard" && !placardFamilia && (
            <div>
              {hayItemsPlacard && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    marginBottom: 20,
                    padding: "12px 16px",
                    background: "#f5f9fc",
                    border: "1px solid #c8dae8",
                    borderRadius: 3,
                  }}
                >
                  <button
                    onClick={() => aplicarFrenoATodosPlacard?.()}
                    title="Le pega el accesorio de freno que corresponda (puerta o cajonera) a cada ítem de Placard/Frente/Auxiliares/Accesorios, según su nombre. No afecta a Cocina."
                    style={{
                      padding: "7px 18px",
                      background: "#0a3a5c",
                      color: "#fff",
                      border: "none",
                      borderRadius: 2,
                      fontFamily: "'Space Mono',monospace",
                      fontSize: 12,
                      cursor: "pointer",
                    }}
                  >
                    🛑 Aplicar freno a todo Placard
                  </button>
                </div>
              )}
              <div
                style={{
                  fontSize: 11,
                  color: "#6699bb",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  marginBottom: 16,
                }}
              >
                Seleccionar familia
              </div>
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                {[
                  {
                    key: "placard",
                    icon: "🚪",
                    label: "Placard",
                    count: placardItems.placard?.length ?? 0,
                  },
                  {
                    key: "frente",
                    icon: "🪟",
                    label: "Frente",
                    count: placardItems.frente?.length ?? 0,
                  },
                  {
                    key: "auxiliares",
                    icon: "🗂️",
                    label: "Auxiliares",
                    count: placardItems.auxiliares?.length ?? 0,
                  },
                  {
                    key: "accesorios",
                    icon: "🔧",
                    label: "Accesorios",
                    count: placardItems.accesorios?.length ?? 0,
                  },
                ].map(({ key, icon, label, count }) => (
                  <button
                    key={key}
                    onClick={() => {
                      setPlacardFamilia(key);
                      setPlacardEditIdx(null);
                      setPlacardFila({
                        articulo: "",
                        cantidad: 1,
                        precio: "",
                        precios: [],
                      });
                      setPlacardSearch("");
                    }}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 8,
                      padding: "28px 40px",
                      background: "#fff",
                      border: "1px solid #b8cfe0",
                      borderRadius: 4,
                      fontFamily: "'Space Mono', monospace",
                      cursor: "pointer",
                      minWidth: 160,
                      transition: "all 0.12s",
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background = "#ddeefa";
                      e.currentTarget.style.borderColor = "#4a90c8";
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background = "#fff";
                      e.currentTarget.style.borderColor = "#b8cfe0";
                    }}
                  >
                    <span style={{ fontSize: 36 }}>{icon}</span>
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: "#0a3a5c",
                      }}
                    >
                      {label}
                    </span>
                    {count > 0 && (
                      <span
                        style={{
                          fontSize: 11,
                          color: "#4a90c8",
                          background: "#e0f0fc",
                          borderRadius: 10,
                          padding: "2px 10px",
                        }}
                      >
                        {count} artículo{count !== 1 ? "s" : ""}
                      </span>
                    )}
                  </button>
                ))}
              </div>
              {(placardItems.placard?.length > 0 ||
                placardItems.frente?.length > 0 ||
                placardItems.auxiliares?.length > 0 ||
                placardItems.accesorios?.length > 0) && (
                <div
                  style={{
                    marginTop: 24,
                    fontSize: 12,
                    color: "#0a3a5c",
                    borderTop: "1px solid #dde6ef",
                    paddingTop: 16,
                    display: "flex",
                    gap: 32,
                    flexWrap: "wrap",
                  }}
                >
                  {placardItems.placard?.length > 0 && (
                    <span style={{ color: "#0a5c3a" }}>
                      Total placard:{" "}
                      <strong>
                        $
                        {placard_total("placard").toLocaleString("es-AR", {
                          minimumFractionDigits: 2,
                        })}
                      </strong>
                    </span>
                  )}
                  {placardItems.frente?.length > 0 && (
                    <span style={{ color: "#0a5c3a" }}>
                      Total frente:{" "}
                      <strong>
                        $
                        {placard_total("frente").toLocaleString("es-AR", {
                          minimumFractionDigits: 2,
                        })}
                      </strong>
                    </span>
                  )}
                  {placardItems.auxiliares?.length > 0 && (
                    <span style={{ color: "#0a5c3a" }}>
                      Total auxiliares:{" "}
                      <strong>
                        $
                        {placard_total("auxiliares").toLocaleString("es-AR", {
                          minimumFractionDigits: 2,
                        })}
                      </strong>
                    </span>
                  )}
                  {placardItems.accesorios?.length > 0 && (
                    <span style={{ color: "#0a5c3a" }}>
                      Total accesorios:{" "}
                      <strong>
                        $
                        {placard_total("accesorios").toLocaleString("es-AR", {
                          minimumFractionDigits: 2,
                        })}
                      </strong>
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {tab === "placard" && placardFamilia && (
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  marginBottom: 20,
                }}
              >
                <button
                  onClick={() => {
                    setPlacardFamilia(null);
                    setPlacardEditIdx(null);
                    setPlacardFila({
                      articulo: "",
                      nombreart: "",
                      cantidad: 1,
                      precio: "",
                      precios: [],
                      precioPlacard: "",
                      margen: null,
                      valor1: null,
                      porcentaje1: null,
                      valor2: null,
                      porcentaje2: null,
                      valor3: null,
                      porcentaje3: null,
                    });
                    setPlacardSearch("");
                  }}
                  style={{
                    padding: "4px 14px",
                    background: "#fff",
                    border: "1px solid #b8cfe0",
                    borderRadius: 2,
                    fontFamily: "'Space Mono',monospace",
                    fontSize: 12,
                    cursor: "pointer",
                    color: "#0a3a5c",
                  }}
                >
                  ← Familias
                </button>
                <span
                  style={{
                    fontFamily: "'Space Mono',monospace",
                    fontWeight: 700,
                    fontSize: 14,
                    color: "#0a3a5c",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  {placardFamilia === "frente"
                    ? "🪟 Frente"
                    : placardFamilia === "auxiliares"
                      ? "🗂️ Auxiliares"
                      : placardFamilia === "accesorios"
                        ? "🔧 Accesorios"
                        : "🚪 Placard"}
                </span>
                <button
                  onClick={() => setTab("presupuesto")}
                  style={{
                    marginLeft: "auto",
                    padding: "5px 16px",
                    background: "#0a5c3a",
                    color: "#fff",
                    border: "none",
                    borderRadius: 2,
                    fontFamily: "'Space Mono',monospace",
                    fontSize: 12,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                  title="Ver presupuesto completo"
                >
                  📋 Ver Presupuesto
                </button>
              </div>

              {placardItems[placardFamilia]?.length > 0 && (
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    marginBottom: 20,
                    fontFamily: "'Space Mono',monospace",
                    fontSize: 12,
                  }}
                >
                  <thead>
                    <tr style={{ background: "#e8f0f7", color: "#0a3a5c" }}>
                      <th
                        style={{
                          padding: "8px 12px",
                          textAlign: "left",
                          border: "1px solid #c8dae8",
                          fontWeight: 700,
                        }}
                      >
                        Producto
                      </th>
                      <th
                        style={{
                          padding: "8px 12px",
                          textAlign: "left",
                          border: "1px solid #c8dae8",
                          fontWeight: 700,
                        }}
                      >
                        Artículo
                      </th>
                      <th
                        style={{
                          padding: "8px 12px",
                          textAlign: "center",
                          border: "1px solid #c8dae8",
                          fontWeight: 700,
                          width: 80,
                        }}
                      >
                        Cant.
                      </th>
                      <th
                        style={{
                          padding: "8px 12px",
                          textAlign: "center",
                          border: "1px solid #c8dae8",
                          fontWeight: 700,
                          width: 90,
                        }}
                      >
                        Accesorios
                      </th>
                      <th
                        style={{
                          padding: "8px 12px",
                          textAlign: "right",
                          border: "1px solid #c8dae8",
                          fontWeight: 700,
                          width: 110,
                        }}
                      >
                        Placard
                      </th>
                      <th
                        style={{
                          padding: "8px 12px",
                          textAlign: "right",
                          border: "1px solid #c8dae8",
                          fontWeight: 700,
                          width: 130,
                        }}
                      >
                        Precio unit.
                      </th>
                      <th
                        style={{
                          padding: "8px 12px",
                          textAlign: "right",
                          border: "1px solid #c8dae8",
                          fontWeight: 700,
                          width: 130,
                        }}
                      >
                        Subtotal
                      </th>
                      <th
                        style={{
                          padding: "8px 6px",
                          border: "1px solid #c8dae8",
                          width: 70,
                        }}
                      ></th>
                    </tr>
                  </thead>
                  <tbody>
                    {placardItems[placardFamilia].map((fila, idx) =>
                      placardEditIdx === idx ? (
                        <tr key={idx} style={{ background: "#fffbe6" }}>
                          <td
                            style={{
                              padding: "6px 8px",
                              border: "1px solid #c8dae8",
                            }}
                          >
                            <input
                              value={placardFila.nombreart ?? ""}
                              onChange={(e) =>
                                setPlacardFila((f) => ({
                                  ...f,
                                  nombreart: e.target.value,
                                }))
                              }
                              style={{
                                width: "100%",
                                fontFamily: "'Space Mono',monospace",
                                fontSize: 12,
                                border: "1px solid #7aaac8",
                                padding: "4px 8px",
                                borderRadius: 2,
                              }}
                            />
                          </td>
                          <td
                            style={{
                              padding: "6px 8px",
                              border: "1px solid #c8dae8",
                              position: "relative",
                            }}
                          >
                            <input
                              value={placardSearch}
                              onChange={(e) => {
                                setPlacardSearch(e.target.value);
                                setPlacardFila((f) => ({
                                  ...f,
                                  articulo: e.target.value,
                                  precio: "",
                                }));
                              }}
                              onFocus={() => setPlacardSearchFocus(true)}
                              onBlur={() =>
                                setTimeout(
                                  () => setPlacardSearchFocus(false),
                                  150,
                                )
                              }
                              style={{
                                width: "100%",
                                fontFamily: "'Space Mono',monospace",
                                fontSize: 12,
                                border: "1px solid #7aaac8",
                                padding: "4px 8px",
                                borderRadius: 2,
                              }}
                            />
                            {placardSearchFocus &&
                              productosFiltrados.length > 0 && (
                                <div
                                  style={{
                                    position: "absolute",
                                    top: "100%",
                                    left: 0,
                                    right: 0,
                                    background: "#fff",
                                    border: "1px solid #b8cfe0",
                                    zIndex: 50,
                                    boxShadow: "0 4px 12px #0002",
                                    minWidth: 480,
                                    maxHeight: 200,
                                    overflowY: "auto",
                                  }}
                                >
                                  {productosFiltrados.map((p, pi) => {
                                    const base = p.articulo;
                                    return (
                                      <div
                                        key={pi}
                                        onClick={() => {
                                          const { preciosBase, precioBaseUsar } =
                                            resolverPrecioBasePlacard(p);
                                          const precios = preciosBase.map(
                                            (pb) => ({
                                              linea: pb.linea,
                                              precioBase: pb.precioBase,
                                              precio: aplicarPorcentaje(
                                                pb.precioBase,
                                              ),
                                            }),
                                          );
                                          const precioPlacard =
                                            p.precio_un ?? p.PRECIO_UN ?? "";
                                          // El precio usado en el presupuesto siempre es precio_un
                                          // (se ignora el cálculo por línea/porcentaje)
                                          const precioUsar = precioPlacard || "";
                                          const nombreart =
                                            p.nombreart ?? p.NOMBREART ?? base;
                                          // Área del artículo (columna AREA
                                          // en la tabla articulos): se usa
                                          // como cantidad (cantacc) del
                                          // accesorio de freno al guardar.
                                          const area = p.area ?? p.AREA ?? null;
                                          setPlacardFila((f) => ({
                                            ...f,
                                            articulo: base,
                                            nombreart,
                                            precio: String(precioUsar),
                                            precioBase: String(precioBaseUsar),
                                            precioPlacard:
                                              String(precioPlacard),
                                            precios,
                                            preciosBase,
                                            area,
                                          }));
                                          setPlacardSearch(base);
                                        }}
                                        style={{
                                          padding: "7px 12px",
                                          cursor: "pointer",
                                          fontSize: 12,
                                          borderBottom: "1px solid #eef2f6",
                                        }}
                                        onMouseOver={(e) =>
                                          (e.currentTarget.style.background =
                                            "#ddeefa")
                                        }
                                        onMouseOut={(e) =>
                                          (e.currentTarget.style.background =
                                            "#fff")
                                        }
                                      >
                                        <span
                                          style={{
                                            color: "#0a3a5c",
                                            fontWeight: 600,
                                          }}
                                        >
                                          {base}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                          </td>
                          <td
                            style={{
                              padding: "6px 8px",
                              border: "1px solid #c8dae8",
                            }}
                          >
                            <input
                              type="number"
                              min="1"
                              value={placardFila.cantidad}
                              onChange={(e) =>
                                setPlacardFila((f) => ({
                                  ...f,
                                  cantidad: e.target.value,
                                }))
                              }
                              style={{
                                width: "100%",
                                textAlign: "center",
                                fontFamily: "'Space Mono',monospace",
                                fontSize: 12,
                                border: "1px solid #7aaac8",
                                padding: "4px 4px",
                                borderRadius: 2,
                              }}
                            />
                          </td>
                          <td
                            style={{
                              padding: "6px 8px",
                              border: "1px solid #c8dae8",
                              textAlign: "center",
                            }}
                          >
                            <button
                              type="button"
                              onClick={(e) =>
                                abrirAccesorioMenu?.(
                                  placardFila.accesorios ?? [],
                                  (nombre) =>
                                    setPlacardFila((f) => ({
                                      ...f,
                                      accesorios: toggleAccesorioEnArray(
                                        f.accesorios,
                                        nombre,
                                      ),
                                    })),
                                  () =>
                                    setPlacardFila((f) =>
                                      recalcFila ? recalcFila(f) : f,
                                    ),
                                  e,
                                )
                              }
                              title="Agregar/quitar accesorios (autofreno, led, etc)"
                              style={{
                                padding: "4px 8px",
                                background: placardFila.accesorios?.length
                                  ? "#0a5c3a"
                                  : "#fff",
                                color: placardFila.accesorios?.length
                                  ? "#fff"
                                  : "#0a3a5c",
                                border: "1px solid #7aaac8",
                                borderRadius: 2,
                                fontFamily: "'Space Mono',monospace",
                                fontSize: 11,
                                cursor: "pointer",
                              }}
                            >
                              🔧 {placardFila.accesorios?.length ?? 0}
                            </button>
                          </td>
                          <td
                            style={{
                              padding: "6px 8px",
                              border: "1px solid #c8dae8",
                            }}
                          >
                            <input
                              type="number"
                              min="0"
                              value={placardFila.precioPlacard ?? ""}
                              onChange={(e) =>
                                setPlacardFila((f) => ({
                                  ...f,
                                  precioPlacard: e.target.value,
                                }))
                              }
                              style={{
                                width: "100%",
                                textAlign: "right",
                                fontFamily: "'Space Mono',monospace",
                                fontSize: 12,
                                border: "1px solid #7aaac8",
                                padding: "4px 8px",
                                borderRadius: 2,
                              }}
                            />
                          </td>
                          <td
                            style={{
                              padding: "6px 8px",
                              border: "1px solid #c8dae8",
                            }}
                          >
                            <input
                              type="number"
                              min="0"
                              value={placardFila.precio}
                              onChange={(e) =>
                                setPlacardFila((f) => ({
                                  ...f,
                                  precio: e.target.value,
                                }))
                              }
                              style={{
                                width: "100%",
                                textAlign: "right",
                                fontFamily: "'Space Mono',monospace",
                                fontSize: 12,
                                border: "1px solid #7aaac8",
                                padding: "4px 8px",
                                borderRadius: 2,
                              }}
                            />
                          </td>
                          <td
                            style={{
                              padding: "6px 8px",
                              border: "1px solid #c8dae8",
                              textAlign: "right",
                              color: "#0a5c3a",
                              fontWeight: 700,
                            }}
                          >
                            $
                            {(
                              (parseFloat(placardFila.precio) || 0) *
                              (parseFloat(placardFila.cantidad) || 0)
                            ).toLocaleString("es-AR", {
                              minimumFractionDigits: 2,
                            })}
                          </td>
                          <td
                            style={{
                              padding: "6px 4px",
                              border: "1px solid #c8dae8",
                              textAlign: "center",
                            }}
                          >
                            <button
                              onClick={() => placardGuardarEdit(idx)}
                              style={{
                                background: "#0a5c3a",
                                color: "#fff",
                                border: "none",
                                borderRadius: 2,
                                padding: "3px 8px",
                                cursor: "pointer",
                                fontSize: 13,
                                marginRight: 2,
                              }}
                            >
                              ✓
                            </button>
                            <button
                              onClick={() => {
                                setPlacardEditIdx(null);
                                setPlacardFila({
                                  articulo: "",
                                  nombreart: "",
                                  cantidad: 1,
                                  precio: "",
                                  precios: [],
                                  precioPlacard: "",
                                  margen: null,
                                  valor1: null,
                                  porcentaje1: null,
                                  valor2: null,
                                  porcentaje2: null,
                                  valor3: null,
                                  porcentaje3: null,
                                });
                                setPlacardSearch("");
                              }}
                              style={{
                                background: "#c0392b",
                                color: "#fff",
                                border: "none",
                                borderRadius: 2,
                                padding: "3px 8px",
                                cursor: "pointer",
                                fontSize: 13,
                              }}
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      ) : (
                        <tr
                          key={idx}
                          style={{
                            background: idx % 2 === 0 ? "#fff" : "#f5f9fc",
                          }}
                        >
                          <td
                            style={{
                              padding: "8px 12px",
                              border: "1px solid #c8dae8",
                              color: "#334155",
                              fontSize: 11,
                            }}
                          >
                            {fila.nombreart}
                            {tieneFreno(fila.accesorios, accesoriosDisponibles) && (
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
                            {fila.grupo && fila.grupo.trim() && (
                              <div
                                style={{
                                  marginTop: 2,
                                  fontSize: 9,
                                  color: "#2277bb",
                                  background: "#e0f0fc",
                                  borderRadius: 3,
                                  padding: "1px 5px",
                                  display: "inline-block",
                                }}
                              >
                                🗂️ {fila.grupo}
                              </div>
                            )}
                          </td>
                          <td
                            style={{
                              padding: "8px 12px",
                              border: "1px solid #c8dae8",
                            }}
                          >
                            {fila.articulo}
                            {fila.accesorios?.length > 0 &&
                              fila.accesorios.map((nombre) => {
                                const art = accesoriosDisponibles.find(
                                  (a) => a.articulo === nombre,
                                );
                                const precioUn = parseFloat(art?.precio) || 0;
                                const areaItem = resolverAreaItem(fila);
                                const area = parseFloat(areaItem) || 1;
                                const total = precioUn * area;
                                return (
                                  <div
                                    key={nombre}
                                    style={{
                                      fontSize: 11,
                                      color: "#6699bb",
                                      marginTop: 2,
                                    }}
                                  >
                                    🔧 {nombre} — cant: {areaItem ?? "-"} · +
                                    {total.toLocaleString("es-AR", {
                                      style: "currency",
                                      currency: "ARS",
                                    })}
                                  </div>
                                );
                              })}
                          </td>
                          <td
                            style={{
                              padding: "8px 12px",
                              border: "1px solid #c8dae8",
                              textAlign: "center",
                            }}
                          >
                            {fila.cantidad}
                          </td>
                          <td
                            style={{
                              padding: "6px 8px",
                              border: "1px solid #c8dae8",
                              textAlign: "center",
                            }}
                          >
                            <button
                              type="button"
                              onClick={(e) =>
                                abrirAccesorioMenu?.(
                                  fila.accesorios ?? [],
                                  (nombre) =>
                                    toggleAccesorioItem?.(
                                      "placard",
                                      placardFamilia,
                                      idx,
                                      nombre,
                                    ),
                                  () =>
                                    confirmarAccesoriosItem?.(
                                      "placard",
                                      placardFamilia,
                                      idx,
                                      resolverAreaItem(fila),
                                    ),
                                  e,
                                )
                              }
                              title="Agregar/quitar accesorios (autofreno, led, etc)"
                              style={{
                                padding: "4px 8px",
                                background: fila.accesorios?.length
                                  ? "#0a5c3a"
                                  : "#fff",
                                color: fila.accesorios?.length
                                  ? "#fff"
                                  : "#0a3a5c",
                                border: "1px solid #c8dae8",
                                borderRadius: 2,
                                fontFamily: "'Space Mono',monospace",
                                fontSize: 11,
                                cursor: "pointer",
                              }}
                            >
                              🔧 {fila.accesorios?.length ?? 0}
                            </button>
                          </td>
                          <td
                            style={{
                              padding: "8px 12px",
                              border: "1px solid #c8dae8",
                              textAlign: "right",
                            }}
                          >
                            $
                            {Number(fila.precioPlacard ?? 0).toLocaleString(
                              "es-AR",
                              { minimumFractionDigits: 2 },
                            )}
                          </td>
                          <td
                            style={{
                              padding: "8px 12px",
                              border: "1px solid #c8dae8",
                              textAlign: "right",
                            }}
                          >
                            <span
                              className="pn-precio-cell"
                              onClick={(e) =>
                                abrirPrecioPopover(
                                  "placard",
                                  placardFamilia,
                                  idx,
                                  "precio",
                                  parseFloat(fila.precio) || 0,
                                  e,
                                )
                              }
                            >
                              $
                              {Number(fila.precio).toLocaleString("es-AR", {
                                minimumFractionDigits: 2,
                              })}
                            </span>
                            {fila.porcentaje1 != null ? (
                              <span
                                style={{
                                  marginLeft: 5,
                                  fontSize: 9,
                                  fontWeight: 700,
                                  verticalAlign: "middle",
                                }}
                              >
                                {listaPorcentaje !== 0 && (
                                  <span
                                    style={{
                                      color: "#2277bb",
                                      marginRight: 2,
                                    }}
                                  >
                                    +{listaPorcentaje}%
                                  </span>
                                )}
                                <span
                                  style={{
                                    color:
                                      fila.porcentaje1 >= 0
                                        ? "#0a7a3a"
                                        : "#c0392b",
                                    background:
                                      fila.porcentaje1 >= 0
                                        ? "#e6f5eb"
                                        : "#fdecea",
                                    borderRadius: 3,
                                    padding: "1px 4px",
                                  }}
                                >
                                  {fila.porcentaje1 > 0 ? "+" : ""}
                                  {fila.porcentaje1}%
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
                                    verticalAlign: "middle",
                                  }}
                                >
                                  +{listaPorcentaje}%
                                </span>
                              )
                            )}
                          </td>
                          <td
                            style={{
                              padding: "8px 12px",
                              border: "1px solid #c8dae8",
                              textAlign: "right",
                              fontWeight: 700,
                            }}
                          >
                            $
                            {(
                              (parseFloat(fila.precio) || 0) *
                              (parseFloat(fila.cantidad) || 0)
                            ).toLocaleString("es-AR", {
                              minimumFractionDigits: 2,
                            })}
                          </td>
                          <td
                            style={{
                              padding: "8px 4px",
                              border: "1px solid #c8dae8",
                              textAlign: "center",
                            }}
                          >
                            <button
                              onClick={() => placardIniciarEdit(idx)}
                              style={{
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                fontSize: 15,
                                marginRight: 4,
                              }}
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => placardEliminarFila(idx)}
                              style={{
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                fontSize: 15,
                              }}
                            >
                              🗑
                            </button>
                          </td>
                        </tr>
                      ),
                    )}
                    <tr style={{ background: "#e8f4ee" }}>
                      <td
                        colSpan={6}
                        style={{
                          padding: "8px 12px",
                          border: "1px solid #c8dae8",
                          textAlign: "right",
                          fontWeight: 700,
                          color: "#0a3a5c",
                        }}
                      >
                        Total Placard
                      </td>
                      <td
                        style={{
                          padding: "8px 12px",
                          border: "1px solid #c8dae8",
                          textAlign: "right",
                          fontWeight: 700,
                          color: "#0a5c3a",
                        }}
                      >
                        $
                        {placard_total(placardFamilia).toLocaleString("es-AR", {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                      <td style={{ border: "1px solid #c8dae8" }}></td>
                    </tr>
                  </tbody>
                </table>
              )}

              {placardEditIdx === null && (
                <div
                  style={{
                    background: "#f5f9fc",
                    border: "1px solid #c8dae8",
                    borderRadius: 3,
                    padding: "16px 20px",
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      color: "#6699bb",
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      marginBottom: 12,
                    }}
                  >
                    Agregar artículo
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: 10,
                      alignItems: "flex-start",
                      flexWrap: "wrap",
                    }}
                  >
                    {/* Grupo (subdivisión manual para el presupuesto/PDF) */}
                    <div style={{ flex: "1 1 160px" }}>
                      <label
                        style={{
                          display: "block",
                          fontSize: 11,
                          color: "#6699bb",
                          marginBottom: 4,
                        }}
                      >
                        Grupo
                      </label>
                      <input
                        list="ps-grupos-existentes"
                        value={placardFila.grupo ?? ""}
                        onChange={(e) =>
                          setPlacardFila((f) => ({
                            ...f,
                            grupo: e.target.value,
                          }))
                        }
                        placeholder="(automático)"
                        title="Los artículos que agregues quedan bajo este grupo en el presupuesto y el PDF. Dejalo vacío para usar el grupo automático."
                        style={{
                          width: "100%",
                          fontFamily: "'Space Mono',monospace",
                          fontSize: 12,
                          border: "1px solid #b8cfe0",
                          padding: "6px 10px",
                          borderRadius: 2,
                        }}
                      />
                      <datalist id="ps-grupos-existentes">
                        {nombresGruposUsados.map((g) => (
                          <option key={g} value={g} />
                        ))}
                      </datalist>
                    </div>
                    <div style={{ position: "relative", flex: "2 1 220px" }}>
                      <label
                        style={{
                          display: "block",
                          fontSize: 11,
                          color: "#6699bb",
                          marginBottom: 4,
                        }}
                      >
                        Artículo
                      </label>
                      <input
                        value={placardSearch}
                        onChange={(e) => {
                          setPlacardSearch(e.target.value);
                          setPlacardFila((f) => ({
                            ...f,
                            articulo: e.target.value,
                            precio: "",
                          }));
                        }}
                        onFocus={() => setPlacardSearchFocus(true)}
                        onBlur={() =>
                          setTimeout(() => setPlacardSearchFocus(false), 150)
                        }
                        placeholder="Buscar en BD..."
                        style={{
                          width: "100%",
                          fontFamily: "'Space Mono',monospace",
                          fontSize: 12,
                          border: "1px solid #b8cfe0",
                          padding: "6px 10px",
                          borderRadius: 2,
                        }}
                      />
                      {placardSearchFocus && productosFiltrados.length > 0 && (
                        <div
                          style={{
                            position: "absolute",
                            top: "100%",
                            left: 0,
                            right: 0,
                            background: "#fff",
                            border: "1px solid #b8cfe0",
                            zIndex: 50,
                            boxShadow: "0 4px 12px #0002",
                            maxHeight: 200,
                            overflowY: "auto",
                          }}
                        >
                          {productosFiltrados.map((p, pi) => {
                            const base = p.articulo;
                            return (
                              <div
                                key={pi}
                                onClick={() => {
                                  const { preciosBase, precioBaseUsar } =
                                    resolverPrecioBasePlacard(p);
                                  const precios = preciosBase.map((pb) => ({
                                    linea: pb.linea,
                                    precioBase: pb.precioBase,
                                    precio: aplicarPorcentaje(pb.precioBase),
                                  }));
                                  const precioPlacard =
                                    p.precio_un ?? p.PRECIO_UN ?? "";
                                  // El precio usado en el presupuesto siempre es precio_un
                                  // (se ignora el cálculo por línea/porcentaje)
                                  const precioUsar = precioPlacard || "";
                                  const nombreart =
                                    p.nombreart ?? p.NOMBREART ?? base;
                                  // Área del artículo (columna AREA en la
                                  // tabla articulos): se usa como cantidad
                                  // (cantacc) del accesorio de freno al
                                  // guardar.
                                  const area = p.area ?? p.AREA ?? null;
                                  setPlacardFila((f) => ({
                                    ...f,
                                    articulo: base,
                                    nombreart,
                                    precio: String(precioUsar),
                                    precioBase: String(precioBaseUsar),
                                    precioPlacard: String(precioPlacard),
                                    precios,
                                    preciosBase,
                                    area,
                                  }));
                                  setPlacardSearch(base);
                                }}
                                style={{
                                  padding: "8px 14px",
                                  cursor: "pointer",
                                  fontSize: 12,
                                  borderBottom: "1px solid #eef2f6",
                                }}
                                onMouseOver={(e) =>
                                  (e.currentTarget.style.background = "#ddeefa")
                                }
                                onMouseOut={(e) =>
                                  (e.currentTarget.style.background = "#fff")
                                }
                              >
                                <span
                                  style={{ color: "#0a3a5c", fontWeight: 600 }}
                                >
                                  {base}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    {/* Producto (nombreart) — editable, pre-rellena con articulo */}
                    <div style={{ flex: "2 1 200px" }}>
                      <label
                        style={{
                          display: "block",
                          fontSize: 11,
                          color: "#6699bb",
                          marginBottom: 4,
                        }}
                      >
                        Producto
                      </label>
                      <input
                        value={placardFila.nombreart ?? ""}
                        onChange={(e) =>
                          setPlacardFila((f) => ({
                            ...f,
                            nombreart: e.target.value,
                          }))
                        }
                        placeholder="Nombre en presupuesto..."
                        style={{
                          width: "100%",
                          fontFamily: "'Space Mono',monospace",
                          fontSize: 12,
                          border: "1px solid #b8cfe0",
                          padding: "6px 10px",
                          borderRadius: 2,
                        }}
                      />
                    </div>
                    <div style={{ flex: "0 0 80px" }}>
                      <label
                        style={{
                          display: "block",
                          fontSize: 11,
                          color: "#6699bb",
                          marginBottom: 4,
                        }}
                      >
                        Cantidad
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={placardFila.cantidad}
                        onChange={(e) =>
                          setPlacardFila((f) => ({
                            ...f,
                            cantidad: e.target.value,
                          }))
                        }
                        style={{
                          width: "100%",
                          textAlign: "center",
                          fontFamily: "'Space Mono',monospace",
                          fontSize: 12,
                          border: "1px solid #b8cfe0",
                          padding: "6px 6px",
                          borderRadius: 2,
                        }}
                      />
                    </div>
                    {/* Columna fija "Placard" — siempre visible, precio_un del artículo */}
                    <div style={{ flex: "1 1 120px" }}>
                      <label
                        style={{
                          display: "block",
                          fontSize: 11,
                          color: "#6699bb",
                          marginBottom: 4,
                        }}
                      >
                        Placard
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={placardFila.precioPlacard ?? ""}
                        onChange={(e) =>
                          setPlacardFila((f) => ({
                            ...f,
                            precioPlacard: e.target.value,
                          }))
                        }
                        placeholder="0.00"
                        style={{
                          width: "100%",
                          textAlign: "right",
                          fontFamily: "'Space Mono',monospace",
                          fontSize: 12,
                          border: "1px solid #b8cfe0",
                          padding: "6px 10px",
                          borderRadius: 2,
                        }}
                      />
                    </div>
                    {lineasActivas.length > 0 ? (
                      lineasActivas.map((l, li) => (
                        <div key={li} style={{ flex: "1 1 120px" }}>
                          <label
                            style={{
                              display: "block",
                              fontSize: 11,
                              color: "#6699bb",
                              marginBottom: 4,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            Línea {l.linea}
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={placardFila.precios[li]?.precio ?? ""}
                            onChange={(e) =>
                              setPlacardFila((f) => {
                                const precios = [
                                  ...(f.precios.length
                                    ? f.precios
                                    : lineasActivas.map((la) => ({
                                        linea: la.linea,
                                        precio: "",
                                      }))),
                                ];
                                precios[li] = {
                                  ...precios[li],
                                  precio: e.target.value,
                                };
                                return {
                                  ...f,
                                  precio: precios[0]?.precio ?? "",
                                  precios,
                                };
                              })
                            }
                            placeholder="0.00"
                            style={{
                              width: "100%",
                              textAlign: "right",
                              fontFamily: "'Space Mono',monospace",
                              fontSize: 12,
                              border: "1px solid #b8cfe0",
                              padding: "6px 10px",
                              borderRadius: 2,
                            }}
                          />
                        </div>
                      ))
                    ) : (
                      <div style={{ flex: "1 1 130px" }}>
                        <label
                          style={{
                            display: "block",
                            fontSize: 11,
                            color: "#6699bb",
                            marginBottom: 4,
                          }}
                        >
                          Precio unit.
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={placardFila.precio}
                          onChange={(e) =>
                            setPlacardFila((f) => ({
                              ...f,
                              precio: e.target.value,
                            }))
                          }
                          placeholder="0.00"
                          style={{
                            width: "100%",
                            textAlign: "right",
                            fontFamily: "'Space Mono',monospace",
                            fontSize: 12,
                            border: "1px solid #b8cfe0",
                            padding: "6px 10px",
                            borderRadius: 2,
                          }}
                        />
                      </div>
                    )}
                    <div style={{ flex: "0 0 auto", paddingTop: 20 }}>
                      <button
                        onClick={placardAgregarFila}
                        disabled={!placardFila.articulo.trim()}
                        style={{
                          padding: "6px 20px",
                          background: placardFila.articulo.trim()
                            ? "#0a3a5c"
                            : "#c8dae8",
                          color: "#fff",
                          border: "none",
                          borderRadius: 2,
                          fontFamily: "'Space Mono',monospace",
                          fontSize: 12,
                          cursor: placardFila.articulo.trim()
                            ? "pointer"
                            : "default",
                        }}
                      >
                        + Agregar
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

    </>
  );
}
