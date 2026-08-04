import React, { useState } from "react";
import ScreenHeader from "../Component/ScreenHeader";
import { useAuth } from "../context/AuthContext";

export default function ActualizarPreciosExcel() {
  const { authFetch } = useAuth();
  const [archivo, setArchivo] = useState(null);
  const [hoja, setHoja] = useState("Resultado");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [resultado, setResultado] = useState(null);

  const handleActualizar = async () => {
    setError("");
    setResultado(null);

    if (!archivo) {
      setError("Elegí un archivo Excel (.xlsx).");
      return;
    }
    if (!hoja.trim()) {
      setError("Completá el nombre de la hoja.");
      return;
    }

    setCargando(true);
    try {
      const formData = new FormData();
      formData.append("archivo", archivo);
      formData.append("hoja", hoja.trim());

      const res = await authFetch(
        "https://integral-backend-production.up.railway.app/articulos/actualizar-precios-excel",
        {
          method: "POST",
          body: formData,
        },
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Error al actualizar los precios.");
        return;
      }
      setResultado(data);
    } catch {
      setError("Error de conexión con el servidor.");
    } finally {
      setCargando(false);
    }
  };

  return (
    <>
      <ScreenHeader
        icon="💲"
        title="Actualizar precios"
        subtitle="Actualización masiva de precios de artículos desde Excel"
      />

      <div
        style={{
          background: "#fff",
          border: "1px solid #d0dde8",
          borderRadius: 8,
          padding: "24px 28px",
          maxWidth: 560,
          marginTop: 16,
        }}
      >
        <div style={{ marginBottom: 18 }}>
          <label style={labelStyle}>Archivo Excel</label>
          <input
            style={inputStyle}
            type="file"
            accept=".xlsx,.xls"
            onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
          />
          {archivo && (
            <div style={{ fontSize: 12, color: "#5a7488", marginTop: 6 }}>
              Seleccionado: {archivo.name}
            </div>
          )}
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={labelStyle}>Nombre de la hoja</label>
          <input
            style={inputStyle}
            type="text"
            placeholder="Ej: Resultado"
            value={hoja}
            onChange={(e) => setHoja(e.target.value)}
          />
        </div>

        {error && (
          <div
            style={{
              background: "#fdecec",
              color: "#a12525",
              border: "1px solid #f0b8b8",
              borderRadius: 6,
              padding: "10px 14px",
              fontSize: 13,
              marginBottom: 16,
            }}
          >
            {error}
          </div>
        )}

        <button
          onClick={handleActualizar}
          disabled={cargando}
          style={{
            background: cargando ? "#8fb3cc" : "#0f2944",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            padding: "11px 22px",
            fontSize: 14,
            fontWeight: 600,
            cursor: cargando ? "default" : "pointer",
          }}
        >
          {cargando ? "Actualizando..." : "Actualizar precios"}
        </button>

        {resultado && (
          <div
            style={{
              marginTop: 22,
              paddingTop: 18,
              borderTop: "1px solid #e8f0f7",
            }}
          >
            <div style={{ fontSize: 13, color: "#0f2944", marginBottom: 8 }}>
              <strong>{resultado.actualizados}</strong> de{" "}
              <strong>{resultado.totalFilas}</strong> artículos actualizados.
            </div>

            {resultado.noEncontrados?.length > 0 && (
              <DetalleFallos
                titulo={`${resultado.noEncontrados.length} código(s) no encontrado(s) en la base`}
                color="#a1662a"
                bg="#fbf4e8"
                items={resultado.noEncontrados}
              />
            )}

            {resultado.invalidos?.length > 0 && (
              <DetalleFallos
                titulo={`${resultado.invalidos.length} fila(s) con datos inválidos`}
                color="#a12525"
                bg="#fdecec"
                items={resultado.invalidos}
              />
            )}
          </div>
        )}
      </div>
    </>
  );
}

function DetalleFallos({ titulo, color, bg, items }) {
  // Soporta tanto el formato viejo (array de strings, solo código) como el
  // nuevo (array de objetos con fila, bloque, codigo, precio y motivo).
  const esObjeto = items.length > 0 && typeof items[0] === "object";

  return (
    <div style={{ fontSize: 13, color, marginBottom: 14 }}>
      <strong>{titulo}:</strong>

      {esObjeto ? (
        <div
          style={{
            marginTop: 6,
            maxHeight: 220,
            overflowY: "auto",
            border: `1px solid ${color}33`,
            borderRadius: 4,
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 12,
              fontFamily: "monospace",
            }}
          >
            <thead>
              <tr style={{ background: bg }}>
                <th style={thStyle}>Fila</th>
                <th style={thStyle}>Bloque</th>
                <th style={thStyle}>Código</th>
                <th style={thStyle}>Precio</th>
                <th style={thStyle}>Motivo</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, i) => (
                <tr key={i} style={{ background: i % 2 ? bg : "transparent" }}>
                  <td style={tdStyle}>{it.fila ?? "-"}</td>
                  <td style={tdStyle}>{it.bloque ?? "-"}</td>
                  <td style={tdStyle}>{it.codigo ?? "-"}</td>
                  <td style={tdStyle}>{String(it.precio ?? "-")}</td>
                  <td style={{ ...tdStyle, fontFamily: "inherit" }}>
                    {it.motivo ?? "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div
          style={{
            fontFamily: "monospace",
            fontSize: 12,
            marginTop: 4,
            maxHeight: 100,
            overflowY: "auto",
            background: bg,
            padding: "6px 10px",
            borderRadius: 4,
          }}
        >
          {items.join(", ")}
        </div>
      )}
    </div>
  );
}

const thStyle = {
  textAlign: "left",
  padding: "5px 8px",
  borderBottom: "1px solid #d0dde8",
  position: "sticky",
  top: 0,
};

const tdStyle = {
  padding: "5px 8px",
  borderBottom: "1px solid #eef3f8",
  whiteSpace: "nowrap",
};

const labelStyle = {
  display: "block",
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: "0.06em",
  color: "#2d7fc1",
  marginBottom: 6,
  textTransform: "uppercase",
};

const inputStyle = {
  width: "100%",
  border: "1.5px solid #d0dde8",
  borderRadius: 6,
  padding: "10px 14px",
  fontSize: 14,
  color: "#0f2944",
  outline: "none",
  fontFamily: "inherit",
  boxSizing: "border-box",
};
