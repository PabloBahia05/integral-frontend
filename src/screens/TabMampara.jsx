import PresupuestoMamparas from "./PresupuestoMamparas";

export default function TabMampara({
  // Datos del encabezado (solo lectura)
  cliente,
  codcliente,
  telefono1,
  wapp,
  numeroPres,
  mamparaAEditar,
  // Setters para actualizar el presupuesto global
  setPresmv,
  setPresupuestoItems,
}) {
  return (
    <div>
      {/* Banner cliente del encabezado */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "#e8f0f7",
          border: "1px solid #c8dae8",
          borderRadius: 3,
          padding: "10px 16px",
          marginBottom: 16,
          fontFamily: "'Space Mono',monospace",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
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
          <span
            style={{ fontSize: 13, fontWeight: 700, color: "#0a3a5c" }}
          >
            {cliente || "Consumidor final"}
            {codcliente && (
              <span
                style={{ fontSize: 11, color: "#666", marginLeft: 6 }}
              >
                (Cód: {codcliente})
              </span>
            )}
          </span>
          {telefono1 && (
            <span style={{ fontSize: 11, color: "#4a6a8c" }}>
              📞 {telefono1}
            </span>
          )}
          {wapp && (
            <span style={{ fontSize: 11, color: "#1a7a3a" }}>
              💬 {wapp}
            </span>
          )}
        </div>
      </div>

      <PresupuestoMamparas
        clienteInicial={cliente}
        codclienteInicial={codcliente}
        numeroPres={numeroPres}
        presupuestoACargar={mamparaAEditar}
        onCargado={() => {}}
        onSelectItem={(item) => console.log("Mampara:", item)}
        onGuardado={(data) => {
          if (!data) return;
          // presm = valor generado por trigger (ej: "M00008") → se asigna a presmv
          const presm = data.presm ?? data.id ?? null;
          if (presm != null) setPresmv(presm);

          const itemId = `mampara-${presm ?? Date.now()}`;
          const nuevoItem = {
            id: itemId,
            seccion: "Mampara",
            descripcion: data.MODELO ?? "Mampara",
            cantidad: Number(data.CANTIDAD ?? 1),
            precio: Number(data.PRECIO ?? 0),
            subtotal: Number(data.PRECIO ?? 0),
            ancho: Number(data.ANCHO ?? 0),
            alto: Number(data.ALTO ?? 0),
            presmv: presm ?? null,
          };

          // Si ya existe un ítem de mampara, actualizarlo; si no, agregarlo
          setPresupuestoItems((prev) => {
            const idx = prev.findIndex((it) => it.seccion === "Mampara");
            if (idx >= 0) {
              const updated = [...prev];
              updated[idx] = {
                ...updated[idx],
                ...nuevoItem,
                id: updated[idx].id,
              };
              return updated;
            }
            return [...prev, nuevoItem];
          });
        }}
      />
    </div>
  );
}
