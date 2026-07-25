import { useState, useEffect } from "react";

const API = "https://integral-backend-production.up.railway.app";

export default function TiposVanitory({ onArmar, onVolver, token }) {
  const authFetch = (url, options = {}) => {
    const headers = { ...(options.headers || {}) };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    return fetch(url, { ...options, headers });
  };

  // ── Catálogo en vivo ──────────────────
  // Las tarjetas salen directo de `articulos` filtrando
  // proveedor = DANIEL ROQUE SRL, rubro = MUEBLES, familia = VANITORY.
  const [catalogoVanitory, setCatalogoVanitory] = useState([]);
  const [cargandoCatalogo, setCargandoCatalogo] = useState(false);
  const [errorCatalogo, setErrorCatalogo] = useState("");

  useEffect(() => {
    setCargandoCatalogo(true);
    setErrorCatalogo("");
    authFetch(`${API}/productos/vanitory-tipos-catalogo`)
      .then((r) => r.json())
      .then((data) => {
        if (!Array.isArray(data)) {
          setErrorCatalogo("Respuesta inesperada del servidor.");
          setCatalogoVanitory([]);
          return;
        }
        const normalizado = data.map((a) => ({
          id: a.id ?? a.codartint ?? a.codart,
          nombre: a.articulo ?? "",
          descripcion: a.descripcion ?? "",
          codtipvan: a.codartint ?? a.codart ?? "",
          foto: a.artfoto ?? "",
          PRECIO_BASE: parseFloat(a.precio ?? a.PRECIO ?? 0) || 0,
        }));
        setCatalogoVanitory(normalizado);
      })
      .catch(() => {
        setErrorCatalogo("No se pudo cargar el catálogo de Vanitory.");
        setCatalogoVanitory([]);
      })
      .finally(() => setCargandoCatalogo(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      {onVolver && (
        <button
          onClick={onVolver}
          style={{
            background: "none",
            border: "none",
            color: "#2563eb",
            cursor: "pointer",
            fontSize: 13,
            marginBottom: 16,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          ← Volver a muebles
        </button>
      )}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 6,
        }}
      >
        <span style={{ fontSize: 28 }}>🛁</span>
        <div>
          <div
            style={{
              fontFamily: "Syne, sans-serif",
              fontSize: 26,
              fontWeight: 800,
              color: "#0a3a5c",
              textTransform: "uppercase",
            }}
          >
            Vanitory
          </div>
          <div style={{ fontSize: 12, color: "#6699bb", letterSpacing: 2 }}>
            Elegí un modelo o armá uno personalizado
          </div>
        </div>
      </div>
      {cargandoCatalogo && (
        <p style={{ color: "#88aacc", fontSize: 13 }}>Cargando catálogo…</p>
      )}
      {errorCatalogo && <p className="form-error">{errorCatalogo}</p>}
      {!cargandoCatalogo && !errorCatalogo && catalogoVanitory.length === 0 && (
        <p style={{ color: "#88aacc", fontSize: 13 }}>
          No hay artículos cargados (proveedor Daniel Roque, rubro
          Muebles, familia Vanitory).
        </p>
      )}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 20, marginTop: 24 }}>
        {catalogoVanitory.map((tipo) => (
          <div
            key={tipo.id}
            onClick={() => onArmar?.(tipo)}
            style={{
              width: 240,
              borderRadius: 12,
              overflow: "hidden",
              border: "1.5px solid #d0dde8",
              background: "#fff",
              cursor: "pointer",
              transition: "all 0.15s",
              boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,0,0,0.13)";
              e.currentTarget.style.transform = "translateY(-2px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.06)";
              e.currentTarget.style.transform = "none";
            }}
          >
            {tipo.foto ? (
              <img
                src={tipo.foto}
                alt={tipo.nombre}
                style={{ width: "100%", height: 160, objectFit: "cover" }}
              />
            ) : (
              <div
                style={{
                  width: "100%",
                  height: 160,
                  background: "#e8f0f7",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 40,
                }}
              >
                🛁
              </div>
            )}
            <div style={{ padding: "14px 16px" }}>
              <div
                style={{
                  fontFamily: "Rajdhani, sans-serif",
                  fontWeight: 700,
                  fontSize: 15,
                  color: "#0a3a5c",
                  textTransform: "uppercase",
                }}
              >
                {tipo.nombre}
              </div>
              {tipo.descripcion && (
                <div style={{ fontSize: 12, color: "#6699bb", marginTop: 2 }}>
                  {tipo.descripcion}
                </div>
              )}
              {tipo.codtipvan && (
                <div
                  style={{
                    marginTop: 8,
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                  }}
                >
                  <span style={{ color: "#e63946", fontSize: 13 }}>🔨</span>
                  <span
                    style={{
                      fontFamily: "Space Mono, monospace",
                      fontSize: 12,
                      color: "#e63946",
                      fontWeight: 600,
                    }}
                  >
                    {tipo.codtipvan}
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
        {/* Tarjeta Armar personalizado */}
        <div
          onClick={() => onArmar?.(null)}
          style={{
            width: 240,
            height: 220,
            borderRadius: 12,
            background: "#0f2944",
            cursor: "pointer",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            transition: "all 0.15s",
            boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,0,0,0.2)";
            e.currentTarget.style.transform = "translateY(-2px)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.06)";
            e.currentTarget.style.transform = "none";
          }}
        >
          <span style={{ fontSize: 36, color: "#fff" }}>🔧</span>
          <div
            style={{
              fontFamily: "Rajdhani, sans-serif",
              fontWeight: 800,
              fontSize: 18,
              color: "#fff",
              textTransform: "uppercase",
              letterSpacing: 2,
            }}
          >
            Armar
          </div>
          <div style={{ fontSize: 12, color: "#7aaac8" }}>
            Modelo personalizado
          </div>
        </div>
      </div>
    </div>
  );
}
