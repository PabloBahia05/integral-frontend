import { useState, useEffect } from "react";

const API = "https://integral-backend-production.up.railway.app";

const FILA_VACIA = {
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
  grupo: "",
};

export default function TabCocina({
  // estado de items
  cocinaItems,
  setCocinaItems,
  // familia activa (elevada al padre para que el sync con presupuesto funcione)
  cocinaFamilia,
  setCocinaFamilia,
  // líneas activas y precio (del encabezado)
  lineasActivas,
  listaPorcentaje,
  aplicarPorcentaje,
  // navegar a presupuesto
  onVerPresupuesto,
  // popover de precio
  abrirPrecioPopover,
  // authFetch para llamadas autenticadas
  authFetch,
  // grupos ya usados en el presupuesto (autocompletado)
  nombresGruposUsados = [],
}) {
  // ── Estado local del tab ──────────────────────────────────
  const [cocinaEditIdx, setCocinaEditIdx] = useState(null);
  const [cocinaFila, setCocinaFila] = useState({ ...FILA_VACIA });
  const [cocinaSearch, setCocinaSearch] = useState("");
  const [cocinaSearchFocus, setCocinaSearchFocus] = useState(false);
  const [articulosFamilia, setArticulosFamilia] = useState([]);

  // ── Fetch artículos cuando cambia la familia activa ───────
  useEffect(() => {
    if (!cocinaFamilia) {
      setArticulosFamilia([]);
      return;
    }
    const familiaMap = {
      bajomesadas: "Bajomesada",
      alacenas: "Alacena",
    };
    const familiaBD = familiaMap[cocinaFamilia] ?? cocinaFamilia;
    authFetch(
      `${API}/articulos/por-familia?familia=${encodeURIComponent(familiaBD)}`,
    )
      .then((r) => r.json())
      .then((data) => setArticulosFamilia(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [cocinaFamilia]);

  // ── Helpers ───────────────────────────────────────────────
  const normalizar = (s) =>
    String(s ?? "")
      .toLowerCase()
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

  const productosFiltrados = articulosFamilia
    .filter(
      (a) =>
        !cocinaSearch.trim() ||
        normalizar(a.articulo).includes(normalizar(cocinaSearch)),
    )
    .slice(0, 10);

  const resetFila = () => {
    // Conserva el grupo elegido para que el usuario pueda agregar varios
    // artículos seguidos al mismo grupo sin tener que retipearlo.
    setCocinaFila((f) => ({ ...FILA_VACIA, grupo: f.grupo ?? "" }));
    setCocinaSearch("");
  };

  const cocinaAgregarFila = () => {
    if (!cocinaFila.articulo.trim()) return;
    setCocinaItems((prev) => ({
      ...prev,
      [cocinaFamilia]: [...prev[cocinaFamilia], { ...cocinaFila }],
    }));
    resetFila();
  };

  const cocinaEliminarFila = (idx) => {
    setCocinaItems((prev) => ({
      ...prev,
      [cocinaFamilia]: prev[cocinaFamilia].filter((_, i) => i !== idx),
    }));
  };

  const cocinaGuardarEdit = (idx) => {
    setCocinaItems((prev) => ({
      ...prev,
      [cocinaFamilia]: prev[cocinaFamilia].map((r, i) =>
        i === idx ? { ...cocinaFila } : r,
      ),
    }));
    setCocinaEditIdx(null);
    resetFila();
  };

  const cocinaIniciarEdit = (idx) => {
    const fila = cocinaItems[cocinaFamilia][idx];
    setCocinaFila({ ...fila });
    setCocinaSearch(fila.articulo);
    setCocinaEditIdx(idx);
  };

  const cocina_total = (familia) =>
    cocinaItems[familia]?.reduce(
      (s, r) => s + (parseFloat(r.precio) || 0) * (parseFloat(r.cantidad) || 0),
      0,
    ) ?? 0;

  const volverAFamilias = () => {
    setCocinaFamilia(null);
    setCocinaEditIdx(null);
    resetFila();
  };

  // ── Render: selector de familia ───────────────────────────
  if (!cocinaFamilia) {
    return (
      <div>
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
        <div style={{ display: "flex", gap: 16 }}>
          {[
            {
              key: "bajomesadas",
              icon: "🪵",
              label: "Bajomesada",
              count: cocinaItems.bajomesadas.length,
            },
            {
              key: "alacenas",
              icon: "🗄️",
              label: "Alacena",
              count: cocinaItems.alacenas.length,
            },
          ].map(({ key, icon, label, count }) => (
            <button
              key={key}
              onClick={() => {
                setCocinaFamilia(key);
                setCocinaEditIdx(null);
                resetFila();
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
                style={{ fontSize: 13, fontWeight: 700, color: "#0a3a5c" }}
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

        {/* Resumen rápido si hay items */}
        {(cocinaItems.bajomesadas.length > 0 ||
          cocinaItems.alacenas.length > 0) && (
          <div
            style={{
              marginTop: 24,
              fontSize: 12,
              color: "#0a3a5c",
              borderTop: "1px solid #dde6ef",
              paddingTop: 16,
              display: "flex",
              gap: 32,
            }}
          >
            <span>
              Bajomesada:{" "}
              <strong>
                $
                {cocina_total("bajomesadas").toLocaleString("es-AR", {
                  minimumFractionDigits: 2,
                })}
              </strong>
            </span>
            <span>
              Alacena:{" "}
              <strong>
                $
                {cocina_total("alacenas").toLocaleString("es-AR", {
                  minimumFractionDigits: 2,
                })}
              </strong>
            </span>
            <span style={{ color: "#0a5c3a" }}>
              Total cocina:{" "}
              <strong>
                $
                {(
                  cocina_total("bajomesadas") + cocina_total("alacenas")
                ).toLocaleString("es-AR", { minimumFractionDigits: 2 })}
              </strong>
            </span>
          </div>
        )}
      </div>
    );
  }

  // ── Render: detalle de familia ────────────────────────────
  return (
    <div>
      {/* Encabezado familia */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 20,
        }}
      >
        <button
          onClick={volverAFamilias}
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
          {cocinaFamilia === "bajomesadas" ? "🪵 Bajomesada" : "🗄️ Alacena"}
        </span>
        <button
          onClick={onVerPresupuesto}
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

      {/* Tabla de artículos cargados */}
      {cocinaItems[cocinaFamilia].length > 0 && (
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
              {lineasActivas.length > 0 ? (
                lineasActivas.map((l) => (
                  <th
                    key={l.linea}
                    style={{
                      padding: "8px 12px",
                      textAlign: "right",
                      border: "1px solid #c8dae8",
                      fontWeight: 700,
                      width: 120,
                    }}
                  >
                    Línea {l.linea}
                  </th>
                ))
              ) : (
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
              )}
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
            {cocinaItems[cocinaFamilia].map((fila, idx) =>
              cocinaEditIdx === idx ? (
                /* fila en edición inline */
                <tr key={idx} style={{ background: "#fffbe6" }}>
                  <td
                    style={{ padding: "6px 8px", border: "1px solid #c8dae8" }}
                  >
                    <input
                      value={cocinaFila.nombreart ?? ""}
                      onChange={(e) =>
                        setCocinaFila((f) => ({
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
                      value={cocinaSearch}
                      onChange={(e) => {
                        setCocinaSearch(e.target.value);
                        setCocinaFila((f) => ({
                          ...f,
                          articulo: e.target.value,
                          precio: "",
                        }));
                      }}
                      onFocus={() => setCocinaSearchFocus(true)}
                      onBlur={() =>
                        setTimeout(() => setCocinaSearchFocus(false), 150)
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
                    {cocinaSearch.length >= 0 &&
                      productosFiltrados.length > 0 &&
                      cocinaSearchFocus && (
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
                          }}
                        >
                          {productosFiltrados.map((p, pi) => {
                            const base = p.articulo;
                            return (
                              <div
                                key={pi}
                                onClick={() => {
                                  const preciosBase = lineasActivas.map(
                                    (l) => ({
                                      linea: l.linea,
                                      precioBase:
                                        p.precios?.[String(l.linea)] ?? "",
                                    }),
                                  );
                                  const precios = preciosBase.map((pb) => ({
                                    linea: pb.linea,
                                    precioBase: pb.precioBase,
                                    precio: aplicarPorcentaje(pb.precioBase),
                                  }));
                                  const precioBaseUsar =
                                    preciosBase[0]?.precioBase ?? "";
                                  const precioUsar = precios[0]?.precio ?? "";
                                  const nombreart =
                                    p.nombreart ?? p.NOMBREART ?? base;
                                  setCocinaFila((f) => ({
                                    ...f,
                                    articulo: base,
                                    nombreart,
                                    precio: String(precioUsar),
                                    precioBase: String(precioBaseUsar),
                                    precios,
                                    preciosBase,
                                  }));
                                  setCocinaSearch(base);
                                }}
                                style={{
                                  padding: "7px 12px",
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
                  </td>
                  <td
                    style={{ padding: "6px 8px", border: "1px solid #c8dae8" }}
                  >
                    <input
                      type="number"
                      min="1"
                      value={cocinaFila.cantidad}
                      onChange={(e) =>
                        setCocinaFila((f) => ({
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
                  {lineasActivas.length > 0 ? (
                    lineasActivas.map((l, li) => (
                      <td
                        key={l.linea}
                        style={{
                          padding: "6px 8px",
                          border: "1px solid #c8dae8",
                        }}
                      >
                        <input
                          type="number"
                          min="0"
                          value={cocinaFila.precios?.[li]?.precio ?? ""}
                          onChange={(e) =>
                            setCocinaFila((f) => {
                              const precios = [
                                ...(f.precios?.length
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
                    ))
                  ) : (
                    <td
                      style={{
                        padding: "6px 8px",
                        border: "1px solid #c8dae8",
                      }}
                    >
                      <input
                        type="number"
                        min="0"
                        value={cocinaFila.precio}
                        onChange={(e) =>
                          setCocinaFila((f) => ({
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
                  )}
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
                      (parseFloat(cocinaFila.precio) || 0) *
                      (parseFloat(cocinaFila.cantidad) || 0)
                    ).toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                  </td>
                  <td
                    style={{
                      padding: "6px 4px",
                      border: "1px solid #c8dae8",
                      textAlign: "center",
                    }}
                  >
                    <button
                      onClick={() => cocinaGuardarEdit(idx)}
                      title="Guardar"
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
                        setCocinaEditIdx(null);
                        resetFila();
                      }}
                      title="Cancelar"
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
                /* fila normal (vista) */
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
                    style={{ padding: "8px 12px", border: "1px solid #c8dae8" }}
                  >
                    {fila.articulo}
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
                  {lineasActivas.length > 0 ? (
                    lineasActivas.map((l, li) => {
                      const pr =
                        fila.precios?.[li]?.precio ?? fila.precio ?? 0;
                      const pctSlot = [
                        "porcentaje1",
                        "porcentaje2",
                        "porcentaje3",
                      ][li];
                      const pctAplicado = fila[pctSlot] ?? null;
                      return (
                        <td
                          key={l.linea}
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
                                "cocina",
                                cocinaFamilia,
                                idx,
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
                          {pctAplicado != null ? (
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
                                    pctAplicado >= 0 ? "#0a7a3a" : "#c0392b",
                                  background:
                                    pctAplicado >= 0 ? "#e6f5eb" : "#fdecea",
                                  borderRadius: 3,
                                  padding: "1px 4px",
                                }}
                              >
                                {pctAplicado > 0 ? "+" : ""}
                                {pctAplicado}%
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
                      );
                    })
                  ) : (
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
                            "cocina",
                            cocinaFamilia,
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
                            <span style={{ color: "#2277bb", marginRight: 2 }}>
                              +{listaPorcentaje}%
                            </span>
                          )}
                          <span
                            style={{
                              color:
                                fila.porcentaje1 >= 0 ? "#0a7a3a" : "#c0392b",
                              background:
                                fila.porcentaje1 >= 0 ? "#e6f5eb" : "#fdecea",
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
                  )}
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
                    ).toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                  </td>
                  <td
                    style={{
                      padding: "8px 4px",
                      border: "1px solid #c8dae8",
                      textAlign: "center",
                    }}
                  >
                    <button
                      onClick={() => cocinaIniciarEdit(idx)}
                      title="Editar"
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
                      onClick={() => cocinaEliminarFila(idx)}
                      title="Eliminar"
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

            {/* Fila de total */}
            <tr style={{ background: "#e8f4ee" }}>
              <td
                colSpan={3}
                style={{
                  padding: "8px 12px",
                  border: "1px solid #c8dae8",
                  textAlign: "right",
                  fontWeight: 700,
                  color: "#0a3a5c",
                }}
              >
                Total{" "}
                {cocinaFamilia === "bajomesadas" ? "Bajomesada" : "Alacena"}
              </td>
              {lineasActivas.length > 0 ? (
                lineasActivas.map((l, li) => {
                  const subtotal = cocinaItems[cocinaFamilia].reduce(
                    (s, f) => {
                      const pr =
                        parseFloat(
                          f.precios?.[li]?.precio ?? f.precio ?? 0,
                        ) || 0;
                      return s + pr * (parseFloat(f.cantidad) || 1);
                    },
                    0,
                  );
                  return (
                    <td
                      key={l.linea}
                      style={{
                        padding: "8px 12px",
                        border: "1px solid #c8dae8",
                        textAlign: "right",
                        fontWeight: 700,
                        color: "#0a5c3a",
                      }}
                    >
                      $
                      {subtotal.toLocaleString("es-AR", {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                  );
                })
              ) : (
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
                  {cocina_total(cocinaFamilia).toLocaleString("es-AR", {
                    minimumFractionDigits: 2,
                  })}
                </td>
              )}
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
                {cocina_total(cocinaFamilia).toLocaleString("es-AR", {
                  minimumFractionDigits: 2,
                })}
              </td>
              <td style={{ border: "1px solid #c8dae8" }}></td>
            </tr>
          </tbody>
        </table>
      )}

      {/* Formulario nueva fila */}
      {cocinaEditIdx === null && (
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
                list="tc-grupos-existentes"
                value={cocinaFila.grupo ?? ""}
                onChange={(e) =>
                  setCocinaFila((f) => ({ ...f, grupo: e.target.value }))
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
              <datalist id="tc-grupos-existentes">
                {nombresGruposUsados.map((g) => (
                  <option key={g} value={g} />
                ))}
              </datalist>
            </div>

            {/* Artículo con autocomplete */}
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
                value={cocinaSearch}
                onChange={(e) => {
                  setCocinaSearch(e.target.value);
                  setCocinaFila((f) => ({
                    ...f,
                    articulo: e.target.value,
                    precio: "",
                  }));
                }}
                onFocus={() => setCocinaSearchFocus(true)}
                onBlur={() =>
                  setTimeout(() => setCocinaSearchFocus(false), 150)
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
              {cocinaSearchFocus && productosFiltrados.length > 0 && (
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
                          const preciosBase = lineasActivas.map((l) => ({
                            linea: l.linea,
                            precioBase: p.precios?.[String(l.linea)] ?? "",
                          }));
                          const precios = preciosBase.map((pb) => ({
                            linea: pb.linea,
                            precioBase: pb.precioBase,
                            precio: aplicarPorcentaje(pb.precioBase),
                          }));
                          const precioBaseUsar =
                            preciosBase[0]?.precioBase ?? "";
                          const precioUsar = precios[0]?.precio ?? "";
                          const nombreart = p.nombreart ?? p.NOMBREART ?? base;
                          setCocinaFila((f) => ({
                            ...f,
                            articulo: base,
                            nombreart,
                            precio: String(precioUsar),
                            precioBase: String(precioBaseUsar),
                            precios,
                            preciosBase,
                          }));
                          setCocinaSearch(base);
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
                        <span style={{ color: "#0a3a5c", fontWeight: 600 }}>
                          {base}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Producto (nombreart) */}
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
                value={cocinaFila.nombreart ?? ""}
                onChange={(e) =>
                  setCocinaFila((f) => ({ ...f, nombreart: e.target.value }))
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

            {/* Cantidad */}
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
                value={cocinaFila.cantidad}
                onChange={(e) =>
                  setCocinaFila((f) => ({ ...f, cantidad: e.target.value }))
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

            {/* Precios por línea */}
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
                    value={cocinaFila.precios[li]?.precio ?? ""}
                    onChange={(e) =>
                      setCocinaFila((f) => {
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
                  value={cocinaFila.precio}
                  onChange={(e) =>
                    setCocinaFila((f) => ({ ...f, precio: e.target.value }))
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

            {/* Botón agregar */}
            <div style={{ flex: "0 0 auto", paddingTop: 20 }}>
              <button
                onClick={cocinaAgregarFila}
                disabled={!cocinaFila.articulo.trim()}
                style={{
                  padding: "6px 20px",
                  background: cocinaFila.articulo.trim()
                    ? "#0a3a5c"
                    : "#c8dae8",
                  color: "#fff",
                  border: "none",
                  borderRadius: 2,
                  fontFamily: "'Space Mono',monospace",
                  fontSize: 12,
                  cursor: cocinaFila.articulo.trim() ? "pointer" : "default",
                  transition: "background 0.12s",
                }}
              >
                + Agregar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
