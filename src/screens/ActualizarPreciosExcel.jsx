import React, { useState } from "react";
import ScreenHeader from "../Component/ScreenHeader";
import { useAuth } from "../context/AuthContext";

export default function ActualizarPreciosExcel() {
  const { authFetch } = useAuth();
  const [ubicacion, setUbicacion] = useState("");
  const [archivo, setArchivo] = useState("");
  const [hoja, setHoja] = useState("Resultado");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [resultado, setResultado] = useState(null);

  const handleActualizar = async () => {
    setError("");
    setResultado(null);

    if (!ubicacion.trim() || !archivo.trim() || !hoja.trim()) {
      setError("Completá ubicación, nombre de archivo y hoja.");
      return;
    }

    setCargando(true);
    try {
      const res = await authFetch(
        "https://integral-backend-production.up.railway.app/articulos/actualizar-precios-excel",
        {
          method: "POST",
          body: JSON.stringify({
            ubicacion: ubicacion.trim(),
            archivo: archivo.trim(),
            hoja: hoja.trim(),
          }),
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
          <label style={labelStyle}>Ubicación del archivo</label>
          <input
            style={inputStyle}
            type="text"
            placeholder="Ej: C:\Archivos\Precios o /home/precios"
            value={ubicacion}
            onChange={(e) => setUbicacion(e.target.value)}
          />
        </div>

        <div style={{ marginBottom: 18 }}>
          <label style={labelStyle}>Nombre del archivo</label>
          <input
            style={inputStyle}
            type="text"
            placeholder="Ej: listado_precios.xlsx"
            value={archivo}
            onChange={(e) => setArchivo(e.target.value)}
          />
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
              <div style={{ fontSize: 13, color: "#a1662a", marginBottom: 8 }}>
                <strong>{resultado.noEncontrados.length}</strong> código(s) no
                encontrado(s) en la base:
                <div
                  style={{
                    fontFamily: "monospace",
                    fontSize: 12,
                    marginTop: 4,
                    maxHeight: 100,
                    overflowY: "auto",
                    background: "#fbf4e8",
                    padding: "6px 10px",
                    borderRadius: 4,
                  }}
                >
                  {resultado.noEncontrados.join(", ")}
                </div>
              </div>
            )}

            {resultado.invalidos?.length > 0 && (
              <div style={{ fontSize: 13, color: "#a12525" }}>
                <strong>{resultado.invalidos.length}</strong> fila(s) con datos
                inválidos (código o precio vacío/mal formado).
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

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
