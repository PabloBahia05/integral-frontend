// pdfConfirmado.js
// Lógica de generación del PDF de la OBRA CONFIRMADA: cada grupo ya tiene
// una línea de precio asignada (elegida en el selector "Línea del grupo..."
// de TablaArticulos.jsx), así que el PDF muestra UNA sola columna de precio
// por grupo, no todas las líneas activas. Para la etapa de presupuesto (con
// todas las líneas disponibles) ver pdfPresupuesto.js.
//
// Lo que es igual entre los dos casos (logo, CSS, helpers de fotos/formato,
// orden de secciones, y el mecanismo de descarga del PDF) vive en
// pdfMotorComun.js y se importa desde ahí. Acá solo queda lo que es propio
// de este caso: armado de la columna de línea elegida por grupo y del total.

import {
  agruparEnFilas,
  filaFotosHTML,
  formatPeso,
  obtenerFotosMamparaPorModelo,
  formatearFecha,
  calcularNro,
  calcularNombreArchivo,
  ordenarSecciones,
  descargarPDF,
} from "./pdfMotorComun.js";

// generarConfirmadoPDF: arma el HTML del presupuesto de obra confirmada
// (UNA sola columna de precio por grupo, con la línea elegida) con los
// datos recibidos y dispara la descarga del PDF.
//
// Parámetros esperados:
//  - querDescripcion: bool, si se incluye item.descripcion en el PDF
//  - fecha, numeroPres, numero, revision: datos del encabezado
//  - cliente, domicilio, localidad, telefono1, telefono2: datos del cliente
//  - observaciones, leyenda: textos libres
//  - lineasActivas: líneas de precio activas (1 a 3)
//  - presupuestoItems: ítems del presupuesto
//  - grupoDe: función (item) => nombre de sección/grupo
//  - ordenGrupos: array con el orden manual de grupos (▲▼ en TablaArticulos),
//    igual al estado que vive en PresupuestoNuevo.jsx. Opcional: si no se
//    pasa, se usa el orden natural de aparición (comportamiento previo).
//  - lineaPorGrupo: objeto { [nombreGrupo]: índice en lineasActivas }, igual
//    al estado que vive en PresupuestoNuevo.jsx (selector "Línea del
//    grupo..." en TablaArticulos.jsx — el <option value={li}> guarda el
//    ÍNDICE dentro de lineasActivas, no el número de línea). Si el grupo no
//    tiene línea elegida, se usa la primera de lineasActivas como default.
//  - mostrarCosto, incluirPrecio, incluirTotal, agregarIVA, incluirTextoColoc: flags de armado
//  - incluirTextoSena: bool, si se agrega el recuadro de seña/condiciones (fondo amarillo)
//  - textoSena: texto libre de ese recuadro, editable desde el Encabezado
//  - imagenesFinal: fotos y PDFs adjuntos
//  - setGenerandoPDF: setter de estado para mostrar "Generando..." en el botón
export async function generarConfirmadoPDF({
  querDescripcion,
  fecha,
  numeroPres,
  numero,
  revision,
  cliente,
  domicilio,
  localidad,
  telefono1,
  telefono2,
  observaciones,
  leyenda,
  lineasActivas,
  presupuestoItems,
  grupoDe,
  ordenGrupos,
  lineaPorGrupo,
  mostrarCosto,
  incluirPrecio,
  incluirTotal,
  agregarIVA,
  incluirTextoColoc,
  incluirTextoSena,
  textoSena,
  imagenesFinal,
  setGenerandoPDF,
  authFetch,
}) {
  const fotosMamparaPorModelo = await obtenerFotosMamparaPorModelo(
    presupuestoItems,
    authFetch,
  );

  const fechaFmt = formatearFecha(fecha);
  const nro = calcularNro({ numeroPres, numero });
  const nombreArchivo = calcularNombreArchivo({ cliente, nro, revision });

  // Cantidad de columnas de la tabla según qué se decida incluir. Si hay
  // líneas cargadas, se muestra la columna de precio con la línea elegida
  // por grupo. Si no hay líneas, se usa la columna única "Precio unit."
  // controlada por incluirPrecio.
  const mostrarLineas = lineasActivas.length > 0;

  const secciones = ordenarSecciones({ presupuestoItems, grupoDe, ordenGrupos });

  // Genera un bloque <table> independiente por sección/grupo, con su propio
  // encabezado "Cant / Detalle / Línea X" y su fila de total — igual que el
  // formato clásico de presupuesto de Daniel Roque S.R.L. (una tabla por
  // sección, sin precio por ítem, solo el total de cada grupo).
  const seccionesHTML = secciones
    .map((sec) => {
      const items = presupuestoItems.filter((p) => grupoDe(p) === sec);
      const subtotalSec = items.reduce((s, it) => s + (it.subtotal || 0), 0);

      // Placard tiene su propia línea de precios fija en la BD (línea 15,
      // ver LINEA_FIJA_PLACARD en useCocinaPlacard.js), independiente de
      // las líneas elegidas en el Encabezado — por eso el mismo importe
      // termina duplicado bajo cada columna "Línea X". Para estos grupos
      // mostramos una sola columna de precio en vez de repetir el monto.
      const esPlacardSec =
        items.length > 0 &&
        items.every((it) => (it.seccion || "").startsWith("Placard / "));
      const mostrarLineasSec = mostrarLineas && !esPlacardSec;
      const usarColumnaUnicaPlacard = mostrarLineas && esPlacardSec;

      // Columna de línea a mostrar para ESTE grupo: una sola, con la línea
      // elegida en el selector "Línea del grupo..." de TablaArticulos.jsx
      // (guardada en lineaPorGrupo[sec] como ÍNDICE dentro de
      // lineasActivas). Si el grupo no tiene línea elegida, se usa la
      // primera de lineasActivas como default. Para el caso presupuesto
      // (todas las líneas activas, una columna por cada una) ver
      // pdfPresupuesto.js.
      const columnasLineaSec = mostrarLineasSec
        ? (() => {
            const idx = lineaPorGrupo?.[sec];
            const li =
              idx != null && idx >= 0 && idx < lineasActivas.length ? idx : 0;
            return [{ idx: li, linea: lineasActivas[li] }];
          })()
        : [];

      const subtotalesPorColumnaSec = columnasLineaSec.map((col) => {
        const subtotal = items.reduce((s, it) => {
          const pr =
            parseFloat(it.precios?.[col.idx]?.precio ?? it.precio ?? 0) || 0;
          return s + pr * (parseFloat(it.cantidad) || 1);
        }, 0);
        return { ...col, subtotal };
      });

      const filasItems = items
        .map((item) => {
          const medida =
            (item.seccion === "Mampara" || item.seccion === "Puerta") &&
            item.ancho &&
            item.alto
              ? ` <span class="medida">(${item.ancho} × ${item.alto} cm)</span>`
              : "";
          // Descripción del ítem (campo `descripcion`, separado del
          // nombre/artículo). Solo se muestra si el usuario dijo que sí en
          // el confirm() de más arriba, y solo si hay algo distinto que
          // mostrar (evita duplicar el mismo texto de nombreart).
          const descripcionHTML =
            querDescripcion && item.descripcion && item.descripcion !== item.nombreart
              ? `<div class="item-desc">${item.descripcion}</div>`
              : "";
          // Foto de la mampara (tabla `articulos`, columna artfoto),
          // buscada por modelo al principio de esta función.
          const fotoMamparaHTML =
            item.seccion === "Mampara" && fotosMamparaPorModelo[item.descripcion]
              ? `<div class="mampara-foto"><img src="${fotosMamparaPorModelo[item.descripcion]}" style="max-width:220px; max-height:220px; display:block; margin-top:6px; border:1px solid #ddd; border-radius:4px;" /></div>`
              : "";
          // Accesorios tildados en el ítem (hasta 3, ya resueltos a nombre
          // en PresupuestoNuevo.jsx — item.accesorios es un array de
          // strings, igual que se muestra en pantalla). Se listan debajo
          // del nombre del artículo, sin depender de querDescripcion (los
          // accesorios no son la "descripción", van siempre que existan).
          const accesoriosHTML =
            Array.isArray(item.accesorios) && item.accesorios.length > 0
              ? `<div class="item-accesorios">Accesorios: ${item.accesorios.join(", ")}</div>`
              : "";
          // Precio por ítem: SOLO se muestra si incluirPrecio está activo.
          // Por defecto queda oculto (igual que el formato clásico), y solo
          // se ven los totales por sección/grupo al final de cada tabla.
          const celdasPrecio = mostrarLineasSec
            ? columnasLineaSec
                .map((col) => {
                  if (!incluirPrecio) return `<td class="right"></td>`;
                  const pr =
                    item.precios?.[col.idx]?.precio ?? item.precio ?? 0;
                  return `<td class="right">${formatPeso(pr)}</td>`;
                })
                .join("")
            : usarColumnaUnicaPlacard
              ? `<td class="right">${incluirPrecio ? formatPeso(item.precio) : ""}</td>`
              : incluirPrecio
                ? `<td class="right">${formatPeso(item.precio)}</td>`
                : "";
          return `
      <tr>
        <td class="cant">${item.cantidad ?? 1}</td>
        <td>${item.nombreart ?? ""}${medida}${descripcionHTML}${accesoriosHTML}${fotoMamparaHTML}</td>
        ${mostrarCosto ? `<td class="right">${item.costo != null ? formatPeso(item.costo) : "—"}</td>` : ""}
        ${celdasPrecio}
      </tr>`;
        })
        .join("");

      const labelColspan = 2 + (mostrarCosto ? 1 : 0);
      const celdasSubtotalLinea = mostrarLineasSec
        ? subtotalesPorColumnaSec
            .map((col) => `<td class="right">${formatPeso(col.subtotal)}</td>`)
            .join("")
        : usarColumnaUnicaPlacard
          ? `<td class="right">${formatPeso(subtotalSec)}</td>`
          : incluirPrecio
            ? `<td class="right">${formatPeso(subtotalSec)}</td>`
            : "";
      // Si no hay ninguna columna de precio/línea visible (caso del formato
      // clásico: solo Cant/Detalle), no queda dónde poner el monto del
      // parcial y se pierde. En ese caso lo mostramos igual, dentro de la
      // misma celda del label "Total XXX:", alineado a la derecha.
      const sinColumnaMonto = !celdasSubtotalLinea;

      // Fotos asignadas manualmente a este grupo — se pegan justo debajo
      // del detalle/tabla del grupo correspondiente. Cada imagen puede
      // tener su propio ancho (im.anchoPct, elegido en el gestor de
      // imágenes de PresupuestoNuevo.jsx) — sigue el mismo principio de
      // siempre (max-width, sin forzar height, para no deformar la
      // imagen), pero el tope ahora es configurable por imagen en vez de
      // fijo en 100%. Sin im.anchoPct definido, se mantiene el 100% de
      // siempre (compatibilidad con presupuestos ya guardados).
      const fotosSec = imagenesFinal.filter(
        (im) => im.tipo === "imagen" && im.grupo === sec,
      );
      const fotosSecHTML = fotosSec.length
        ? `<div class="sec-fotos" style="margin-top:10px;">${agruparEnFilas(
            fotosSec,
          )
            .map(filaFotosHTML)
            .join("")}</div>`
        : "";

      return `
    <div class="tabla-block">
      <div class="sec-title">${sec}:</div>
      <table>
        <thead>
          <tr>
            <th class="cant">Cant</th>
            <th>Detalle</th>
            ${mostrarCosto ? `<th class="right">Costo</th>` : ""}
            ${
              mostrarLineasSec
                ? columnasLineaSec
                    .map(
                      (col) =>
                        `<th class="right">Línea ${col.linea.linea}</th>`,
                    )
                    .join("")
                : usarColumnaUnicaPlacard
                  ? `<th class="right">Precio</th>`
                  : incluirPrecio
                    ? `<th class="right">Precio unit.</th>`
                    : ""
            }
          </tr>
        </thead>
        <tbody>
          ${filasItems}
          <tr class="subtotal-row">
            ${
              sinColumnaMonto
                ? `<td colspan="${labelColspan}">Total:</td>
            <td class="right">${formatPeso(subtotalSec)}</td>`
                : `<td colspan="${labelColspan}">Total:</td>
            ${celdasSubtotalLinea}`
            }
          </tr>
        </tbody>
      </table>
    </div>
    ${fotosSecHTML}`;
    })
    .join("");

  const totalGeneral = presupuestoItems.reduce(
    (s, it) => s + (it.subtotal || 0),
    0,
  );

  // Placard tiene precio único, independiente de la línea (ver esPlacardSec
  // más arriba): para esos ítems SIEMPRE se usa it.precio.
  const esItemPlacard = (it) => (it.seccion || "").startsWith("Placard / ");

  // Obra confirmada: total general usando, para cada grupo, la línea que el
  // usuario eligió ahí (lineaPorGrupo) — un único monto, igual que las
  // columnas que se ven arriba (en vez de un total por cada línea).
  const totalGeneralLineaElegida = mostrarLineas
    ? presupuestoItems.reduce((s, it) => {
        if (esItemPlacard(it)) {
          return s + (parseFloat(it.precio ?? 0) || 0) * (parseFloat(it.cantidad) || 1);
        }
        const sec = grupoDe(it);
        const idx = lineaPorGrupo?.[sec];
        const li = idx != null && idx >= 0 && idx < lineasActivas.length ? idx : 0;
        const pr = parseFloat(it.precios?.[li]?.precio ?? it.precio ?? 0) || 0;
        return s + pr * (parseFloat(it.cantidad) || 1);
      }, 0)
    : 0;

  const pageHTML = `
<div class="page">
<div class="doc-nro-corner">N° ${nro} — Rev. ${revision}</div>
<div class="doc-title">Presupuesto</div>
<div class="info-line">
  <span>Cliente: ${cliente || "Consumidor final"}${domicilio ? ` — ${domicilio}` : ""}</span>
  <span>Fecha: ${fechaFmt}</span>
</div>
<div class="info-line">
  <span>Localidad: ${localidad || "—"}</span>
  <span>Tel: ${telefono1 || telefono2 || "—"}</span>
</div>

<div class="body">
  ${leyenda ? `<div class="leyenda">${leyenda.replace(/\n/g, "<br/>")}</div>` : ""}

  ${seccionesHTML}

  ${
    incluirTotal
      ? `<div class="totals-final">
      ${
        mostrarLineas
          ? `<div class="t-row">TOTAL: ${formatPeso(totalGeneralLineaElegida)}</div>`
          : `<div class="t-row">TOTAL: ${formatPeso(totalGeneral)}</div>`
      }
      ${agregarIVA ? `<div class="iva-note">Precios con IVA incluido, sujetos a reajustes</div>` : ""}
    </div>`
      : ""
  }

  ${
    incluirTextoColoc
      ? `<div class="clausula">La colocación no está incluida en este presupuesto, salvo que se indique lo contrario.</div>`
      : ""
  }

  ${
    observaciones
      ? `<div class="sec-title" style="margin-top:14px;">Observaciones</div><div class="observaciones">${observaciones.replace(/\n/g, "<br/>")}</div>`
      : ""
  }

  ${agruparEnFilas(
    imagenesFinal.filter((im) => im.tipo === "imagen" && !im.grupo),
  )
    .map(filaFotosHTML)
    .join("")}

  ${
    incluirTextoSena && textoSena
      ? `<div class="texto-sena">${textoSena.replace(/\n/g, "<br/>")}</div>`
      : ""
  }
</div>
<div class="footer">
  <div>Daniel Roque S.R.L. — Bahía Blanca</div>
  <div>Presupuesto N° ${nro} — Rev. ${revision}</div>
</div>
</div>`;

  descargarPDF({ pageHTML, nombreArchivo, imagenesFinal, setGenerandoPDF });
}
