// Fila "TOTAL GENERAL" de la tabla de presupuesto.
// Se usa como <tbody> extra dentro de la misma <table> del padre
// (recibe presupuestoItems y lineasActivas por props, no tiene estado propio).
export default function Totales({ presupuestoItems, lineasActivas }) {
  return (
    <tr style={{ background: "#0a3a5c" }}>
      <td
        colSpan={6}
        style={{
          padding: "10px 14px",
          textAlign: "right",
          fontWeight: 700,
          color: "#60efff",
          fontSize: 13,
          letterSpacing: "0.06em",
        }}
      >
        TOTAL GENERAL
      </td>
      {lineasActivas.length > 0
        ? lineasActivas.map((l, li) => {
            const total = presupuestoItems.reduce((s, it) => {
              const pr =
                parseFloat(it.precios?.[li]?.precio ?? it.precio ?? 0) || 0;
              return s + pr * (parseFloat(it.cantidad) || 1);
            }, 0);
            return (
              <td
                key={l.linea}
                style={{
                  padding: "10px 14px",
                  textAlign: "right",
                  fontWeight: 700,
                  color: "#fff",
                  fontSize: 14,
                }}
              >
                ${total.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
              </td>
            );
          })
        : null}
      <td
        style={{
          padding: "10px 14px",
          textAlign: "right",
          fontWeight: 700,
          color: lineasActivas.length > 0 ? "#60efff" : "#fff",
          fontSize: 14,
        }}
      >
        $
        {presupuestoItems
          .reduce((s, p) => s + p.subtotal, 0)
          .toLocaleString("es-AR", { minimumFractionDigits: 2 })}
      </td>
      <td style={{ background: "#0a3a5c" }}></td>
    </tr>
  );
}
