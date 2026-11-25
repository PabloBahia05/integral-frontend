import { useState, useEffect } from "react";
import Modal from "./Modal";

// ── Fotos del presupuesto (solo lectura) ─────────────────────────────────
//
// Muestra las fotos que se cargaron en el editor (PresupuestoNuevo.jsx) para
// UNA revisión puntual. Se leen de la tabla presupuesto_imagenes vía
//   GET /presupuesto-imagenes/:numeropres/:rev
// que devuelve [{ id, grupo, imagenes: [{ url, anchoPct, juntarSiguiente }] }]
// (una fila por grupo; grupo = null → fotos "sin grupo").
//
// Es distinto de la galería "Imágenes" de Obras (tabla obra_archivos, subida
// a mano por obra): esto no sube ni borra nada, solo muestra lo que ya está
// ligado a la revisión confirmada del presupuesto.
//
// Props:
//   numeropres, revision → revisión confirmada a mostrar
//   nombre               → cliente (solo para el título)
//   authFetch, api       → mismos que usan las pantallas
//   onClose

export default function FotosPresupuestoModal({
  numeropres,
  revision,
  nombre,
  authFetch,
  api,
  onClose,
}) {
  const [grupos, setGrupos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelado = false;
    setLoading(true);
    setError("");
    authFetch(
      `${api}/presupuesto-imagenes/${encodeURIComponent(numeropres)}/${encodeURIComponent(revision ?? 0)}`,
    )
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((filas) => {
        if (cancelado) return;
        const lista = Array.isArray(filas) ? filas : [];
        const normalizados = lista
          .map((fila) => {
            const grupo = fila.grupo ?? fila.GRUPO ?? null;
            const fotos = (fila.imagenes ?? [])
              .filter(Boolean)
              // El backend devuelve objetos { url, ... }; se contempla un
              // string suelto por compatibilidad con datos viejos.
              .map((it) => (it && typeof it === "object" ? it.url : it))
              .filter(Boolean);
            return { id: fila.id ?? `${grupo ?? "sin-grupo"}`, grupo, fotos };
          })
          .filter((g) => g.fotos.length > 0);
        setGrupos(normalizados);
      })
      .catch((e) => {
        if (cancelado) return;
        console.error("Error cargando fotos del presupuesto:", e);
        setError("No se pudieron cargar las fotos del presupuesto.");
        setGrupos([]);
      })
      .finally(() => !cancelado && setLoading(false));
    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [numeropres, revision]);

  const total = grupos.reduce((s, g) => s + g.fotos.length, 0);

  return (
    <Modal
      title={`Fotos del presupuesto${nombre ? " — " + nombre : ""}`}
      onClose={onClose}
    >
      <p
        style={{
          margin: "0 0 12px",
          color: "#4a8ab5",
          fontFamily: "'Space Mono',monospace",
          fontSize: 12,
        }}
      >
        Presupuesto N° {String(numeropres).padStart(4, "0")} · Rev.{" "}
        {revision ?? 0} (revisión confirmada)
        {!loading && !error ? ` · ${total} foto${total === 1 ? "" : "s"}` : ""}
      </p>

      {loading ? (
        <p style={{ color: "#4a8ab5" }}>⏳ Cargando...</p>
      ) : error ? (
        <p style={{ color: "#c0392b" }}>⚠ {error}</p>
      ) : grupos.length === 0 ? (
        <p style={{ color: "#888" }}>
          Esta revisión confirmada no tiene fotos cargadas.
        </p>
      ) : (
        grupos.map((g) => (
          <div key={g.id} style={{ marginBottom: 18 }}>
            <div
              style={{
                fontWeight: 700,
                fontSize: 13,
                color: "#0a3a5c",
                marginBottom: 6,
                fontFamily: "'Space Mono',monospace",
              }}
            >
              {g.grupo ?? "Sin grupo"}
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
                gap: 10,
              }}
            >
              {g.fotos.map((url, i) => (
                <a
                  key={`${g.id}-${i}`}
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  title="Abrir en tamaño completo"
                  style={{
                    border: "1px solid #e0e8f0",
                    borderRadius: 6,
                    overflow: "hidden",
                    display: "block",
                  }}
                >
                  <img
                    src={url}
                    alt={`${g.grupo ?? "Foto"} ${i + 1}`}
                    loading="lazy"
                    style={{
                      width: "100%",
                      height: 130,
                      objectFit: "cover",
                      display: "block",
                    }}
                  />
                </a>
              ))}
            </div>
          </div>
        ))
      )}
    </Modal>
  );
}
