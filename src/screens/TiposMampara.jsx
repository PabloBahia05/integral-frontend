import { useState, useEffect } from "react";
import ScreenHeader from "../Component/ScreenHeader";
import FormMampara from "./FormMampara";

const API = "https://integral-backend-production.up.railway.app";

export default function TiposMampara({ onBack }) {
  const [tipos, setTipos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    fetch(`${API}/productos/mamparas`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((r) => r.json())
      .then((data) => {
        if (!Array.isArray(data)) {
          console.error("Respuesta inesperada de /productos/mamparas:", data);
          setError(data?.error || "Respuesta inesperada del servidor.");
          setLoading(false);
          return;
        }
        setTipos(data);
        setLoading(false);
      })
      .catch(() => {
        setError("No se pudieron cargar los tipos.");
        setLoading(false);
      });
  }, []);

  if (selected) {
    return (
      <FormMampara
        modelo={{
          label: selected.articulo,
          codformv: selected.codformv, // clave para calcular vidrio
          codformh: selected.codformh, // por si se necesita en el futuro
        }}
        onBack={() => setSelected(null)}
      />
    );
  }

  return (
    <>
      <ScreenHeader
        icon="🚿"
        title="Mamparas"
        subtitle="Seleccioná el tipo de mampara"
      />
      <button className="ver-tablas-back" onClick={onBack}>
        ← Volver
      </button>

      {loading && (
        <p style={{ color: "#88aacc", fontSize: "13px" }}>Cargando tipos...</p>
      )}
      {error && <p className="form-error">{error}</p>}
      {!loading && !error && tipos.length === 0 && (
        <p style={{ color: "#88aacc", fontSize: "13px" }}>
          No hay artículos cargados (proveedor Daniel Roque, rubro Mampara).
        </p>
      )}

      <div className="presup-grid">
        {tipos.map((tipo) => (
          <button
            key={tipo.id}
            className="presup-card"
            onClick={() => setSelected(tipo)}
          >
            <span className="presup-icon">🪟</span>
            <span className="presup-label">{tipo.articulo}</span>
          </button>
        ))}
      </div>
    </>
  );
}
