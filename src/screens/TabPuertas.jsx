import PresupuestoPuertas from "./PresupuestoPuertas";

export default function TabPuertas({
  // Datos del encabezado (solo lectura)
  cliente,
  codcliente,
  telefono1,
  wapp,
  numeroPres,
  puertaAEditar,
  // Setters para actualizar el presupuesto global
  setPrespv,
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

      <PresupuestoPuertas
        clienteInicial={cliente}
        codclienteInicial={codcliente}
        numeroPres={numeroPres}
        presupuestoACargar={puertaAEditar}
        onCargado={() => {}}
        onSelectItem={(item) => console.log("Puerta:", item)}
        onGuardado={(data) => {
          if (!data) return;
          // presp = valor generado por trigger (ej: "P00008") → se asigna a prespv
          const presp = data.presp ?? data.id ?? null;
          if (presp != null) setPrespv(presp);

          const itemId = `puerta-${presp ?? Date.now()}`;
          const nuevoItem = {
            id: itemId,
            seccion: "Puerta",
            nombreart: data.CODPUERTA ?? "",
            descripcion: data.MODELO ?? "Puerta",
            cantidad: Number(data.CANTIDAD ?? 1),
            precio: Number(data.PRECIO ?? 0),
            subtotal: Number(data.PRECIO ?? 0),
            ancho: Number(data.ANCHO ?? 0),
            alto: Number(data.ALTO ?? 0),
            presp: presp ?? null,
            codherraje: data.CODHERRAJE ?? null,
            nombreherraje: data.NOMBREHERRAJE ?? null,
          };

          // Actualiza esta puerta puntual si ya existe (mismo id); si no, la agrega
          // como una puerta nueva — permite varias puertas en el mismo presupuesto.
          setPresupuestoItems((prev) => {
            const idx = prev.findIndex((it) => it.id === itemId);
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
