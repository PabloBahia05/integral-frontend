// Remito en Excel (.xlsx) — se genera en el navegador con exceljs.
//
// Columnas: Cant. · Código · Producto · Material · Medidas
// Los ítems se separan por GRUPO y, dentro de cada grupo, por LÍNEA (campo `tipo`).
// `material` es el nombre del color/material del ítem (lo resuelve
// Confirmados.jsx contra el catálogo de melaminas).
//
// Requiere:  npm install exceljs
// exceljs se importa dinámicamente para no sumarlo al bundle principal.

const AZUL = "FF0A3A5C";
const AZUL_CLARO = "FFE3EEF8";
const BORDE = { style: "thin", color: { argb: "FFB8D6EF" } };
const BORDES = { top: BORDE, left: BORDE, bottom: BORDE, right: BORDE };

// "2026-03-01..." → "01/03/2026" sin pasar por Date (evita corrimiento por zona horaria)
const fmtFecha = (v) => {
  if (!v) return "";
  const m = String(v).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : String(v);
};

const fmtNumPres = (n) =>
  n != null && n !== "" ? String(n).padStart(4, "0") : "";

export async function generarRemitoExcel({
  numeroRemito = null,
  numeropres,
  revision,
  fecha,
  cliente,
  domicilio,
  telefono1,
  telefono2,
  observaciones = "",
  items = [],
}) {
  const mod = await import("exceljs");
  const ExcelJS = mod.default ?? mod;

  const wb = new ExcelJS.Workbook();
  wb.creator = "Integral";
  wb.created = new Date();

  const ws = wb.addWorksheet("Remito", {
    pageSetup: {
      paperSize: 9, // A4
      orientation: "portrait",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
    },
  });

  ws.columns = [
    { key: "cant", width: 9 },
    { key: "codigo", width: 18 },
    { key: "desc", width: 42 },
    { key: "material", width: 34 },
    { key: "medidas", width: 20 },
  ];

  // ── Título ────────────────────────────────────────────────────────────
  ws.mergeCells("A1:E1");
  const titulo = ws.getCell("A1");
  titulo.value = numeroRemito ? `REMITO N° ${numeroRemito}` : "REMITO";
  titulo.font = { bold: true, size: 16, color: { argb: "FFFFFFFF" } };
  titulo.alignment = { horizontal: "center", vertical: "middle" };
  titulo.fill = { type: "pattern", pattern: "solid", fgColor: { argb: AZUL } };
  ws.getRow(1).height = 28;

  // ── Datos de cabecera ─────────────────────────────────────────────────
  const telefonos = [telefono1, telefono2]
    .filter((t) => t != null && String(t).trim() !== "")
    .join(" / ");

  const cabecera = [
    ["Fecha", fmtFecha(fecha)],
    ["Cliente", cliente || ""],
    ["Domicilio", domicilio || ""],
    ["Teléfono", telefonos],
    [
      "Presupuesto",
      numeropres != null && numeropres !== ""
        ? `N° ${fmtNumPres(numeropres)}${revision != null && revision !== "" ? ` · Rev. ${revision}` : ""}`
        : "",
    ],
  ];

  let fila = 2;
  for (const [etiqueta, valor] of cabecera) {
    ws.mergeCells(`B${fila}:E${fila}`);
    const a = ws.getCell(`A${fila}`);
    a.value = etiqueta;
    a.font = { bold: true, color: { argb: AZUL } };
    a.alignment = { vertical: "middle" };
    const b = ws.getCell(`B${fila}`);
    b.value = valor;
    b.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
    fila += 1;
  }

  // ── Tabla de ítems ────────────────────────────────────────────────────
  fila += 1; // fila en blanco
  const filaHeader = fila;
  ["Cant.", "Código", "Producto", "Material", "Medidas"].forEach((t, i) => {
    const c = ws.getCell(filaHeader, i + 1);
    c.value = t;
    c.font = { bold: true, color: { argb: "FFFFFFFF" } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: AZUL } };
    c.alignment = { horizontal: i === 0 ? "right" : "left", vertical: "middle" };
    c.border = BORDES;
  });
  ws.getRow(filaHeader).height = 20;
  fila += 1;

  // Agrupa por grupo y, dentro de cada grupo, por línea (`tipo`), respetando
  // el orden en que aparecen en la obra.
  const limpio = (v) => String(v ?? "").trim();
  const grupos = new Map();
  for (const it of items) {
    const g = limpio(it.grupo) || "Sin grupo";
    const l = limpio(it.tipo);
    if (!grupos.has(g)) grupos.set(g, new Map());
    const lineas = grupos.get(g);
    if (!lineas.has(l)) lineas.set(l, []);
    lineas.get(l).push(it);
  }

  const banda = (texto, argb, fontArgb, bold, size) => {
    ws.mergeCells(`A${fila}:E${fila}`);
    const c = ws.getCell(`A${fila}`);
    c.value = texto;
    c.font = { bold, size, color: { argb: fontArgb } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb } };
    c.alignment = { vertical: "middle", horizontal: "left" };
    c.border = BORDES;
    ws.getRow(fila).height = 20;
    fila += 1;
  };

  let total = 0;
  for (const [grupo, lineas] of grupos) {
    banda(`GRUPO: ${grupo}`, "FFB8D6EF", AZUL, true, 12);

    for (const [linea, lista] of lineas) {
      if (linea) banda(`Línea: ${linea}`, AZUL_CLARO, AZUL, true, 11);

      lista.forEach((it) => {
        const cantidad = Number(it.cantidad) || 0;
        total += cantidad;

        const valores = [
          cantidad,
          it.codigo ?? "",
          it.nombreart ?? it.descripcion ?? "",
          it.material ?? "",
          it.medidas ?? "",
        ];
        valores.forEach((v, i) => {
          const c = ws.getCell(fila, i + 1);
          c.value = v;
          c.border = BORDES;
          c.alignment = {
            vertical: "top",
            horizontal: i === 0 ? "right" : "left",
            wrapText: true,
          };
          if (i === 0) c.numFmt = "0.##";
        });
        fila += 1;
      });
    }
  }

  // ── Total de unidades ────────────────────────────────────────────────
  ws.mergeCells(`B${fila}:E${fila}`);
  const cTotal = ws.getCell(`A${fila}`);
  cTotal.value = total;
  cTotal.numFmt = "0.##";
  cTotal.font = { bold: true };
  cTotal.alignment = { horizontal: "right" };
  const cTotalTxt = ws.getCell(`B${fila}`);
  cTotalTxt.value = "unidades en total";
  cTotalTxt.font = { bold: true };
  fila += 2;

  // ── Observaciones ────────────────────────────────────────────────────
  if (observaciones && String(observaciones).trim()) {
    ws.getCell(`A${fila}`).value = "Observaciones";
    ws.getCell(`A${fila}`).font = { bold: true, color: { argb: AZUL } };
    fila += 1;
    ws.mergeCells(`A${fila}:E${fila}`);
    const o = ws.getCell(`A${fila}`);
    o.value = String(observaciones).trim();
    o.alignment = { vertical: "top", wrapText: true };
    const lineas = String(observaciones).split("\n").length;
    ws.getRow(fila).height = Math.max(30, lineas * 15);
  }

  // ── Descarga ─────────────────────────────────────────────────────────
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const partes = ["Remito"];
  if (numeroRemito) partes.push(String(numeroRemito));
  if (numeropres != null && numeropres !== "") partes.push(`Pres-${fmtNumPres(numeropres)}`);
  if (revision != null && revision !== "") partes.push(`Rev-${revision}`);
  if (fecha) partes.push(String(fecha).slice(0, 10));
  const nombreArchivo = partes.join("_").replace(/[\\/:*?"<>|]/g, "-") + ".xlsx";

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombreArchivo;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
