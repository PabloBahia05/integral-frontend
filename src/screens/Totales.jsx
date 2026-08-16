// Fila "TOTAL GENERAL" de la tabla de presupuesto.
// Se usa como <tbody> extra dentro de la misma <table> del padre
// (recibe presupuestoItems y lineasActivas por props, no tiene estado propio).
export default function Totales({
  presupuestoItems,
  lineasActivas,
  // Línea de precio elegida por grupo y función para resolver el grupo
  // efectivo de un ítem (ambas vienen de TablaArticulos.jsx / PresupuestoNuevo.jsx).
  // Con esto se arma un total que mezcla, por grupo, solo el valor de la
  // línea que el cliente eligió para ese grupo (en vez de un total por
  // línea "pura" como las columnas de arriba).
  lineaPorGrupo,
  grupoDe,
  // Si TODOS los grupos (salvo Placard) coincidieron en la misma línea, el
  // header de la tabla colapsa a una sola columna "Línea N" — este índice
  // es cuál (mismo cálculo que TablaArticulos.jsx). Con esto, TOTAL GENERAL
  // colapsa también a una sola columna para no desalinearse del resto de
  // la tabla, y la fila "TOTAL SEGÚN LÍNEA ELEGIDA POR GRUPO" (que en ese
  // caso sería un número idéntico al de TOTAL GENERAL) se oculta.
  lineaUnificadaIdx = null,
}) {
  const hayElecciones =
    lineaPorGrupo && Object.keys(lineaPorGrupo).length > 0;

  const totalCombinado =
    lineasActivas.length > 1 && grupoDe && lineaUnificadaIdx == null
      ? presupuestoItems.reduce((s, it) => {
          const esPlacard = (it.seccion || "").startsWith("Placard / ");
          let pr;
          if (esPlacard) {
            // Placard: precio único, no depende de la línea (ver nota en
            // el cálculo de "total" por línea, más abajo).
            pr = parseFloat(it.precio ?? 0) || 0;
          } else {
            const grupo = grupoDe(it);
            const li = lineaPorGrupo?.[grupo];
            pr =
              li != null && it.precios?.[li]
                ? parseFloat(it.precios[li].precio ?? it.precio ?? 0) || 0
                : // Grupo sin línea elegida todavía: se usa la primera
                  // línea activa como default, para que el total combinado
                  // siempre tenga un valor aunque falten elecciones.
                  parseFloat(it.precios?.[0]?.precio ?? it.precio ?? 0) || 0;
          }
          return s + pr * (parseFloat(it.cantidad) || 1);
        }, 0)
      : null;

  // Total de una línea puntual (mismo cálculo que se usaba por columna,
  // reutilizado tanto para las columnas normales como para la columna
  // única cuando hay unificación).
  const totalDeLinea = (li) =>
    presupuestoItems.reduce((s, it) => {
      const esPlacard = (it.seccion || "").startsWith("Placard / ");
      const pr = esPlacard
        ? parseFloat(it.precio ?? 0) || 0
        : parseFloat(it.precios?.[li]?.precio ?? it.precio ?? 0) || 0;
      return s + pr * (parseFloat(it.cantidad) || 1);
    }, 0);

  return (
    <>
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
      {lineasActivas.length > 0 ? (
        lineaUnificadaIdx != null ? (
          <td
            style={{
              padding: "10px 14px",
              textAlign: "right",
              fontWeight: 700,
              color: "#fff",
              fontSize: 14,
            }}
          >
            $
            {totalDeLinea(lineaUnificadaIdx).toLocaleString("es-AR", {
              minimumFractionDigits: 2,
            })}
          </td>
        ) : (
          lineasActivas.map((l, li) => (
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
              ${totalDeLinea(li).toLocaleString("es-AR", { minimumFractionDigits: 2 })}
            </td>
          ))
        )
      ) : null}
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
    {totalCombinado != null && (
      <tr style={{ background: "#7a5c0a" }}>
        <td
          colSpan={6}
          style={{
            padding: "10px 14px",
            textAlign: "right",
            fontWeight: 700,
            color: "#ffe58a",
            fontSize: 13,
            letterSpacing: "0.06em",
          }}
        >
          TOTAL SEGÚN LÍNEA ELEGIDA POR GRUPO
          {!hayElecciones && (
            <span
              style={{
                display: "block",
                fontWeight: 400,
                fontSize: 10,
                color: "#ffe58a",
                textTransform: "none",
                letterSpacing: "normal",
              }}
            >
              (sin elegir línea en ningún grupo todavía — usando{" "}
              {lineasActivas[0]?.linea ? `Línea ${lineasActivas[0].linea}` : "la primera línea"}{" "}
              por defecto)
            </span>
          )}
        </td>
        <td
          colSpan={lineasActivas.length > 0 ? lineasActivas.length : 1}
          style={{
            padding: "10px 14px",
            textAlign: "right",
            fontWeight: 700,
            color: "#fff",
            fontSize: 15,
          }}
        >
          $
          {totalCombinado.toLocaleString("es-AR", {
            minimumFractionDigits: 2,
          })}
        </td>
        <td style={{ background: "#7a5c0a" }}></td>
      </tr>
    )}
    </>
  );
}

