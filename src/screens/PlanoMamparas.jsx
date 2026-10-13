// PlanoMamparas.jsx
// Busca presupuestos de mamparas, permite cargar medidas de producción
// y genera el plano (PDF) con el botón "Hacer plano".
import { useState, useEffect, Fragment } from "react";
import { jsPDF } from "jspdf";
import ModelosPlano from "./ModelosPlano";

const EMPTY = { ancho_prod: "", alto_prod: "", prof_prod: "" };

/* ---------- Dibujo del plano ---------- */
const fmt = (n) => (Number.isInteger(n) ? String(n) : Number(n).toFixed(1));

/* ---------- Mano de la puerta (la manija va siempre del mismo lado que la puerta) ---------- */
// Los agujeros guardados de cada manijón (mamparas-manijon-perf) se asumen cargados para puerta a la DERECHA.
// Si en tu tabla están cargados para la izquierda, cambiá esta constante a "IZQUIERDA".
const LADO_BASE_MANIJON = "DERECHA";

// El "Agujero tirador" del vidrio 8mm viene del plano con la manija a la derecha (x = W - 50).
// Con puerta a la izquierda se espeja: la distancia al lateral izq. pasa a ser la del der. y viceversa.
function aplicarLado(data, lado) {
  const l = lado === "IZQUIERDA" && data.plano?.config !== "CORREDIZA" ? "IZQUIERDA" : "DERECHA";
  if (l === "DERECHA") return orientarBisagras({ ...data, lado: l });
  return orientarBisagras({
    ...data,
    lado: l,
    perforaciones: data.perforaciones.map((pf) =>
      /^agujero tirador$/i.test(String(pf.nombre ?? "").trim()) ? { ...pf, x: pf.dDer, dDer: pf.x } : pf,
    ),
  });
}

// Bisagras (planos paño fijo + batiente como IM4006): van en el canto del batiente OPUESTO al manijón y el paño fijo
// se dibuja del lado de las bisagras. El plano trae las bisagras con el batiente en su canto izquierdo (x desde la
// izquierda) y el fijo en su canto derecho; si el manijón queda a la izquierda se espejan y el fijo pasa a la derecha.
const esBisagra = (pf) => /^bisagra/i.test(String(pf.nombre ?? "").trim());

// Escotadura de la bisagra IM4006 (dibujo del fabricante): abierta al canto del vidrio, 41 de profundidad x 62 de alto,
// con un relieve R9 (Ø18) en cada esquina del fondo. Los 2 agujeros de la bisagra del plano son los centros de esos relieves
// (a 36 del canto, 56 entre sí). Devuelve el contorno desde el canto (arriba) hasta el canto (abajo):
// x = profundidad desde el canto, y = altura relativa al centro de la escotadura (+ arriba).
const ESCOTADURA = { prof: 41, alto: 62 };
function contornoEscotadura(R, cx, sep) {
  const { prof, alto } = ESCOTADURA;
  const h = alto / 2, c = sep / 2, n = 24;
  const pts = [{ x: 0, y: h }];
  const aIni = Math.PI - Math.asin(Math.min(1, (h - c) / R)); // el relieve corta la línea superior
  const aFin = -Math.acos(Math.max(-1, Math.min(1, (prof - cx) / R))); // y la pared del fondo
  for (let i = 0; i <= n; i++) {
    const a = aIni + ((aFin - aIni) * i) / n;
    pts.push({ x: cx + R * Math.cos(a), y: c + R * Math.sin(a) });
  }
  const bIni = -aFin;
  const bFin = -aIni;
  for (let i = 0; i <= n; i++) {
    const a = bIni + ((bFin - bIni) * i) / n;
    pts.push({ x: cx + R * Math.cos(a), y: -c + R * Math.sin(a) });
  }
  pts.push({ x: 0, y: -h });
  return pts;
}
function orientarBisagras(data) {
  if (!data.perforaciones.some(esBisagra)) return data;
  const manijon = data.perforaciones.filter((pf) => pf.pieza === "PUERTA" && /manij|tirador/i.test(String(pf.nombre ?? "")));
  const aLaIzq = manijon.filter((pf) => pf.x <= pf.dDer).length;
  // Sin manijón elegido se toma la mano: derecha = manija a la derecha (bisagras y fijo a la izquierda)
  const manijaIzq = manijon.length ? aLaIzq >= manijon.length - aLaIzq : data.lado === "IZQUIERDA";
  const fijoIzq = !manijaIzq;
  return {
    ...data,
    fijoIzq,
    perforaciones: fijoIzq
      ? data.perforaciones
      : data.perforaciones.map((pf) => (esBisagra(pf) ? { ...pf, x: pf.dDer, dDer: pf.x } : pf)),
  };
}

// Cotas de un agujero: lado de referencia horizontal (el más cercano) y vertical (tope si está a <=200, si no piso)
function cotasDe(pf) {
  const izq = pf.x <= pf.dDer;
  const desdeTope = pf.dTope != null && pf.dTope <= 200;
  return {
    izq,
    dx: izq ? pf.x : pf.dDer,
    desdeTope,
    dy: desdeTope ? pf.dTope : pf.y,
  };
}

// Franjas del vidrio de abajo hacia arriba: [{ cond: "ESMERILADO" | "INCOLORO", medida: mm | null }]
// medida null = hasta arriba (solo la última). Si las franjas no llegan al tope, lo que falta queda "SIN DEFINIR".
function armarFranjas(franjas, alto) {
  const out = [];
  let y0 = 0;
  (franjas || []).forEach((f) => {
    if (y0 >= alto - 0.01) return;
    const resto = alto - y0;
    const h = f.medida == null ? resto : Math.min(f.medida, resto);
    out.push({ cond: f.cond, h, y0 });
    y0 += h;
  });
  if (out.length && y0 < alto - 0.01) out.push({ cond: "SIN DEFINIR", h: alto - y0, y0 });
  return out;
}

function dibujarPlano(d) {
  const { mampara: m, herraje, plano, codigo, dim, piezas, perforaciones } = d;
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pres = [m.numeropres, m.presm].filter(Boolean).join(" / ") || `ID ${m.id}`;
  const avisos = [];

  // Franjas del vidrio: las cargadas a mano; si no hay y el modelo es incoloro, todo el vidrio figura como INCOLORO
  const modeloTxt = String(m.modelo ?? "");
  const franjas = d.franjas?.length
    ? d.franjas
    : /incoloro/i.test(modeloTxt) && !/esmerilado/i.test(modeloTxt)
      ? [{ cond: "INCOLORO", medida: null }]
      : [];

  // Bisagras (IM4006): un grupo por pieza y posición sup./inf. Si hay, el DETALLE A (escotadura) va en grande al costado de la hoja 1
  const gruposBisagra = [];
  perforaciones.filter(esBisagra).forEach((pf) => {
    const sup = /sup\./i.test(pf.nombre);
    let g = gruposBisagra.find((x) => x.pieza === pf.pieza && x.sup === sup);
    if (!g) gruposBisagra.push((g = { pieza: pf.pieza, sup, pfs: [] }));
    g.pfs.push(pf);
  });
  const conDetalle = gruposBisagra.length > 0 && gruposBisagra[0].pfs.length >= 2;

  // Dibuja las franjas (esmerilado / incoloro) sobre un vidrio. Devuelve false si no hay franjas cargadas.
  const dibujarFranjas = (px, py, pw, ph, alto, base, conTexto) => {
    const bandas = armarFranjas(franjas, alto);
    if (!bandas.length) return false;
    const k = ph / alto;
    bandas.forEach((b) => {
      const bh = b.h * k;
      const by = py + ph - (b.y0 + b.h) * k;
      const c = b.cond === "ESMERILADO" ? [226, 226, 230] : b.cond === "INCOLORO" ? base : [255, 255, 255];
      doc.setFillColor(c[0], c[1], c[2]).setDrawColor(0).setLineWidth(0.2).rect(px, by, pw, bh, "FD");
      if (!conTexto) return;
      // Vista general ("corto"): solo la condición (INCOLORO / ESMERILADO), si entra en el paño
      if (conTexto === "corto") {
        doc.setFont("helvetica", "bold").setFontSize(6).setTextColor(40);
        const tw = doc.getTextWidth(b.cond);
        if (bh >= 3 && tw <= pw - 1) doc.text(b.cond, px + pw / 2, by + bh / 2 + 0.8, { align: "center" });
        else if (pw >= 3 && bh >= tw + 2) doc.text(b.cond, px + pw / 2 + 0.8, by + bh / 2 + tw / 2, { angle: 90 }); // paño angosto: en vertical, centrado a mano
        doc.setFont("helvetica", "normal").setTextColor(0);
        return;
      }
      doc.setFont("helvetica", "bold").setFontSize(6.5).setTextColor(40);
      if (bh >= 7) {
        doc.text(b.cond, px + pw / 2, by + bh / 2 - 0.3, { align: "center" });
        doc.setFont("helvetica", "normal");
        doc.text(fmt(b.h), px + pw / 2, by + bh / 2 + 3, { align: "center" });
      } else if (bh >= 2.8) {
        doc.text(`${b.cond}  ${fmt(b.h)}`, px + pw / 2, by + bh / 2 + 1, { align: "center" });
      }
      doc.setFont("helvetica", "normal").setTextColor(0);
    });
    doc.setDrawColor(0).setLineWidth(0.4).rect(px, py, pw, ph); // contorno del vidrio
    return true;
  };

  /* --- Encabezado --- */
  doc.setFont("helvetica", "bold").setFontSize(14);
  doc.text(`PLANO DE CORTE - ${plano.descripcion}`, 10, 12);
  doc.setFont("helvetica", "normal").setFontSize(9);
  const recortar = (txt, maxW) => {
    let t = String(txt);
    if (doc.getTextWidth(t) <= maxW) return t;
    while (t.length > 1 && doc.getTextWidth(t + "...") > maxW) t = t.slice(0, -1);
    return t + "...";
  };
  doc.text(
    `Presupuesto: ${pres}   Rev: ${m.revision ?? 0}   Cant.: ${m.cantidad ?? 1}   Plano: ${codigo}`,
    10, 16.5,
  );
  const clienteTxt = m.cliente_nombre || m.codcliente || "-"; // solo el nombre; el código es el último recurso si no hay nombre
  doc.setFont("helvetica", "bold").text(
    recortar(`Cliente: ${clienteTxt}   |   Tel.: ${m.cliente_telefono || "-"}`, 277),
    10, 20.5,
  );
  const etiquetaDir = m.cliente_direccion_tipo === "FISCAL" ? "Dir. fiscal" : "Dir. remito";
  doc.text(recortar(`${etiquetaDir}: ${m.cliente_direccion || "-"}`, 277), 10, 24.5);
  doc.setFont("helvetica", "normal");
  doc.text(
    `Modelo: ${m.modelo ?? "-"}${
      d.lado && plano.config !== "CORREDIZA" ? `   |   Puerta y manija: ${d.lado}` : ""
    }   |   Manijon: ${
      d.manija ? `${d.manija.codartprov ? `${d.manija.codartprov} - ` : ""}${d.manija.articulo}` : "sin manijon"
    }`,
    10, 28.5,
  );
  doc.text(
    `Medidas de produccion: ancho ${fmt(dim.dimX)} x alto ${fmt(dim.dimY)}` +
      (dim.prof ? ` x prof ${fmt(dim.prof)}` : "") +
      " mm" +
      (dim.unidadOrigen === "cm" ? "  (cargadas en cm, convertidas a mm)" : ""),
    10, 32.5,
  );

  /* --- Vista general (izquierda arriba) --- */
  const fijo = piezas.find((p) => p.pieza === "FIJO");
  const puerta = piezas.find((p) => p.pieza === "PUERTA");
  // Recta 2F+2M: fijo-puerta-puerta-fijo. Esquina: cada lado es 1 fijo + 1 puerta (se repite en los 2 lados).
  // La de 2F+2M es simétrica (la mano no la cambia); fijo + puerta se invierte si la puerta va a la izquierda.
  const secuenciaBase =
    plano.config === "RECTA" && plano.fijos >= 2 ? ["FIJO", "PUERTA", "PUERTA", "FIJO"] : ["FIJO", "PUERTA"];
  const secuencia =
    d.fijoIzq != null && secuenciaBase.length === 2
      ? d.fijoIzq ? ["FIJO", "PUERTA"] : ["PUERTA", "FIJO"] // planos con bisagras: el fijo va del lado de las bisagras
      : d.lado === "IZQUIERDA" && secuenciaBase.length === 2 ? [...secuenciaBase].reverse() : secuenciaBase;
  const unaPieza = !fijo && !puerta;
  const panos = piezas.filter((p) => p.pieza !== "PERFIL");
  const gx = 10, gy = 34, gw = conDetalle ? 84 : 140, gh = conDetalle ? 66 : 82;
  const Wm = unaPieza ? Math.max(dim.dimX, ...panos.map((p) => p.ancho)) : dim.dimX;
  const Hm = unaPieza ? Math.max(dim.dimY, ...panos.map((p) => p.alto)) : dim.dimY;
  const s1 = Math.min((gw - 16) / Wm, (gh - 16) / Hm);
  const tw = dim.dimX * s1, th = dim.dimY * s1;
  const ox = gx + 12 + (gw - 16 - tw) / 2, oy = gy + 2 + (unaPieza ? (Hm - dim.dimY) * s1 : 0);
  doc.setLineWidth(0.2).setDrawColor(150).rect(ox, oy, tw, th);
  doc.setDrawColor(0).setLineWidth(0.4);
  if (unaPieza) {
    // Vidrio único: se dibuja centrado sobre el vano, apoyado abajo (sobresale arriba y a los lados)
    panos.forEach((pz) => {
      const pw = pz.ancho * s1, ph = pz.alto * s1;
      const px = ox + (tw - pw) / 2, py = oy + th - ph;
      doc.setFillColor(205, 225, 250).setLineWidth(0.4).rect(px, py, pw, ph, "FD");
      dibujarFranjas(px, py, pw, ph, pz.alto, [205, 225, 250], "corto");
      doc.setFontSize(8).text(`${pz.nombre} ${fmt(pz.ancho)} x ${fmt(pz.alto)}`, px + pw / 2, franjas.length ? py + 5 : py + ph / 2, { align: "center" });
    });
    doc.setLineWidth(0.2).setDrawColor(150).setLineDashPattern([1.2, 1.2], 0).rect(ox, oy, tw, th);
    doc.setLineDashPattern([], 0).setDrawColor(0);
  }
  (unaPieza ? [] : secuencia).forEach((tipo, i) => {
    const pz = tipo === "FIJO" ? fijo : puerta;
    if (!pz) return;
    const pw = pz.ancho * s1, ph = pz.alto * s1;
    const px = ox + (secuencia.length > 1 ? (i * (dim.dimX - pz.ancho) * s1) / (secuencia.length - 1) : 0);
    const py = oy + th - ph;
    doc.setFillColor(tipo === "FIJO" ? 232 : 205, tipo === "FIJO" ? 240 : 225, 250);
    doc.rect(px, py, pw, ph, "FD");
    dibujarFranjas(px, py, pw, ph, pz.alto, tipo === "FIJO" ? [232, 240, 250] : [205, 225, 250], "corto");
    doc.setFontSize(8).text(tipo === "FIJO" ? "Paño fijo" : "Puerta", px + pw / 2, franjas.length ? py + 5 : py + ph / 2, { align: "center" });
  });
  doc.setLineWidth(0.2).setFontSize(8);
  doc.line(ox, oy + th + 5, ox + tw, oy + th + 5);
  doc.text(`${unaPieza ? "Ancho del vano" : "Ancho total"} ${fmt(dim.dimX)}`, ox + tw / 2, oy + th + 9, { align: "center" });
  doc.line(ox - 5, oy, ox - 5, oy + th);
  doc.text(`${unaPieza ? "Alto del vano" : "Alto total"} ${fmt(dim.dimY)}`, ox - 7, oy + th / 2, { angle: 90, align: "center" });
  if (plano.config === "ESQUINA") {
    const tEsq = doc.setFontSize(7).splitTextToSize("Esquina: se repite en los 2 lados (ancho total medido de afuera a afuera)", gw);
    doc.text(tEsq, gx, gy + gh - 1 - (tEsq.length - 1) * 3);
  }

  /* --- Piezas de corte con agujeros (derecha) --- */
  const ax = conDetalle ? 110 : 160, aTop = 50, aW = conDetalle ? 74 : 122, aH = plano.vidrio === "8MM" ? 138 : 128;
  const aDibujar = piezas.filter((p) => p.pieza !== "PERFIL");
  // Con puerta a la izquierda, la puerta se dibuja primero (a la izquierda), igual que en la vista general
  if (d.fijoIzq != null) {
    aDibujar.sort((a, b) => (a.pieza === "FIJO" ? 0 : 1) - (b.pieza === "FIJO" ? 0 : 1)); // fijo primero
    if (!d.fijoIzq) aDibujar.reverse();
  } else if (d.lado === "IZQUIERDA") aDibujar.sort((a, b) => (a.pieza === "PUERTA" ? 0 : 1) - (b.pieza === "PUERTA" ? 0 : 1));
  if (franjas.length && franjas[franjas.length - 1].medida != null) {
    const suma = franjas.reduce((a, f) => a + f.medida, 0);
    [...new Set(aDibujar.map((p) => p.alto))].forEach((alto) => {
      if (suma > alto + 0.5) avisos.push(`Las franjas suman ${fmt(suma)} mm y el vidrio mide ${fmt(alto)} mm: se recortó lo que sobraba.`);
      else if (suma < alto - 0.5) avisos.push(`Las franjas suman ${fmt(suma)} mm y el vidrio mide ${fmt(alto)} mm: lo que falta figura como SIN DEFINIR.`);
    });
  }
  const maxAlto = Math.max(...aDibujar.map((p) => p.alto));
  const gap = 16;
  const sumAncho = aDibujar.reduce((a, p) => a + p.ancho, 0);
  const s2 = Math.min(aH / maxAlto, (aW - gap * (aDibujar.length - 1)) / sumAncho);
  const baseY = aTop + maxAlto * s2;
  doc.setFont("helvetica", "bold").setFontSize(10).text("PIEZAS DE CORTE", ax, 33);
  let cx = ax;
  const posPieza = {};
  aDibujar.forEach((p) => {
    const pw = p.ancho * s2, ph = p.alto * s2, py = baseY - ph;
    posPieza[p.pieza] = { x: cx, y: py, w: pw, h: ph };
    doc.setFillColor(p.pieza === "FIJO" ? 232 : 205, p.pieza === "FIJO" ? 240 : 225, 250);
    doc.setLineWidth(0.4).rect(cx, py, pw, ph, "FD");
    dibujarFranjas(cx, py, pw, ph, p.alto, p.pieza === "FIJO" ? [232, 240, 250] : [205, 225, 250], true);
    doc.setFont("helvetica", "bold").setFontSize(8);
    doc.text(`${p.nombre} x${p.cant}`, cx + pw / 2, py - 11, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.text(`${fmt(p.ancho)} x ${fmt(p.alto)}`, cx + pw / 2, baseY + 4, { align: "center" });
    cx += pw + gap;
  });

  // Agujeros con cotas de posición (lateral y tope/piso) y diámetro
  const cota = (x1, y1, x2, y2) => {
    // línea de cota con marcas en los extremos
    doc.setDrawColor(0, 90, 160).setLineWidth(0.2).line(x1, y1, x2, y2);
    const horiz = Math.abs(y2 - y1) < 0.01;
    if (horiz) {
      doc.line(x1, y1 - 0.9, x1, y1 + 0.9);
      doc.line(x2, y2 - 0.9, x2, y2 + 0.9);
    } else {
      doc.line(x1 - 0.9, y1, x1 + 0.9, y1);
      doc.line(x2 - 0.9, y2, x2 + 0.9, y2);
    }
  };
  const ext = (x1, y1, x2, y2) => {
    doc.setDrawColor(130).setLineWidth(0.1).setLineDashPattern([0.8, 0.8], 0).line(x1, y1, x2, y2);
    doc.setLineDashPattern([], 0);
  };

  // Escotaduras de las bisagras: una por grupo sup./inf. de cada pieza (contorno del corte en el canto del vidrio)
  gruposBisagra.forEach((g) => {
    const pos = posPieza[g.pieza];
    if (!pos || g.pfs.length < 2) return;
    const [a, b] = g.pfs;
    const izq = a.x <= a.dDer;
    const pts = contornoEscotadura(a.diametro / 2, izq ? a.x : a.dDer, Math.abs(a.y - b.y));
    const yc = (a.y + b.y) / 2;
    const sgn = izq ? 1 : -1;
    const edgeX = izq ? pos.x : pos.x + pos.w;
    const P = pts.map((p) => [edgeX + sgn * p.x * s2, pos.y + pos.h - (yc + p.y) * s2]);
    const deltas = P.slice(1).map((p, i) => [p[0] - P[i][0], p[1] - P[i][1]]);
    doc.setFillColor(255, 255, 255).lines(deltas, P[0][0], P[0][1], [1, 1], "F", true);
    doc.setDrawColor(0).setLineWidth(0.3).lines(deltas, P[0][0], P[0][1], [1, 1], "S", false);
    doc.setLineWidth(0.4).line(edgeX, P[0][1], edgeX, P[P.length - 1][1]); // el canto del vidrio sigue de corrido
    // marca "A": remite al detalle ampliado de la escotadura (hoja 2)
    const bx = edgeX + sgn * 12, by = pos.y + pos.h - yc * s2;
    doc.setDrawColor(0).setLineWidth(0.25).circle(bx, by, 2.2, "S");
    doc.setFont("helvetica", "bold").setFontSize(7).setTextColor(0).text("A", bx, by + 0.9, { align: "center" });
  });

  const usadosV = {};
  const horizHechas = new Set();
  perforaciones.forEach((pf, i) => {
    const pos = posPieza[pf.pieza];
    if (!pos || pf.pieza === "PERFIL") return;
    const hx = pos.x + pf.x * s2;
    const hy = pos.y + pos.h - pf.y * s2;
    const r = Math.max((pf.diametro / 2) * s2, 1);
    const c = cotasDe(pf);

    // agujero
    doc.setLineWidth(0.3).setDrawColor(200, 0, 0).setFillColor(255, 255, 255).circle(hx, hy, r, "FD");
    doc.setLineWidth(0.15).line(hx - r - 1, hy, hx + r + 1, hy).line(hx, hy - r - 1, hx, hy + r + 1); // cruz de centro

    doc.setFont("helvetica", "normal").setFontSize(6.5).setTextColor(0, 90, 160);

    // cota horizontal: del lateral de referencia al centro del agujero
    const bordeX = c.izq ? pos.x : pos.x + pos.w;
    let yl;
    if (c.desdeTope) {
      yl = pos.y - 5; // arriba de la pieza
      ext(bordeX, pos.y, bordeX, yl - 1);
      ext(hx, hy, hx, yl - 1);
    } else {
      yl = hy - r - 3.5; // sobre el agujero, dentro de la pieza
      ext(hx, hy - r, hx, yl - 1);
    }
    const claveH = `${pf.pieza}-${c.izq}-${c.desdeTope}-${c.dx}`;
    if (!horizHechas.has(claveH)) {
      horizHechas.add(claveH);
      cota(bordeX, yl, hx, yl);
      doc.text(fmt(c.dx), (bordeX + hx) / 2, yl - 1.2, { align: "center" });
    }

    if (esBisagra(pf)) {
      // Bisagras: una sola cota vertical por bisagra (al centro del par de agujeros), por el lado de afuera de la pieza
      // (el canto de la bisagra mira al otro vidrio, donde no hay lugar). Las 2 bisagras: la de arriba desde el tope, la de abajo desde el piso.
      const sup = /sup\./i.test(pf.nombre);
      const par = perforaciones.filter((o) => o.pieza === pf.pieza && esBisagra(o) && /sup\./i.test(o.nombre) === sup);
      if (par[0] === pf) {
        const yc = par.reduce((a, o) => a + o.y, 0) / par.length;
        const hyc = pos.y + pos.h - yc * s2;
        const bordeYb = sup ? pos.y : pos.y + pos.h;
        const valor = sup ? pos.h / s2 - yc : yc;
        const izqAfuera = !c.izq;
        const claveB = `${pf.pieza}-${izqAfuera}-${sup}`;
        const kb = usadosV[claveB] ?? 0;
        usadosV[claveB] = kb + 1;
        const xb = izqAfuera ? pos.x - 5 - 5 * kb : pos.x + pos.w + 5 + 5 * kb;
        const dir = izqAfuera ? -1 : 1;
        ext(izqAfuera ? pos.x : pos.x + pos.w, bordeYb, xb + dir, bordeYb);
        ext(izqAfuera ? pos.x : pos.x + pos.w, hyc, xb + dir, hyc);
        cota(xb, bordeYb, xb, hyc);
        doc.text(fmt(valor), xb + dir * 1.5, (bordeYb + hyc) / 2 + 0.8, { align: izqAfuera ? "right" : "left" });
      }
    } else {
      // cota vertical: del tope/piso de referencia al centro del agujero (por fuera de la pieza)
      const bordeY = c.desdeTope ? pos.y : pos.y + pos.h;
      const claveV = `${pf.pieza}-${c.izq}-${c.desdeTope}`;
      const k = usadosV[claveV] ?? 0;
      usadosV[claveV] = k + 1;
      const xl = c.izq ? pos.x - 5 - 5 * k : pos.x + pos.w + 5 + 5 * k;
      ext(c.izq ? pos.x : pos.x + pos.w, bordeY, xl + (c.izq ? -1 : 1), bordeY);
      ext(hx, hy, xl + (c.izq ? -1 : 1), hy);
      cota(xl, bordeY, xl, hy);
      const ym = (bordeY + hy) / 2 + 0.8;
      doc.text(fmt(c.dy), c.izq ? xl - 1.5 : xl + 1.5, ym, { align: c.izq ? "right" : "left" });
    }

    // diámetro
    doc.setTextColor(200, 0, 0).setFont("helvetica", "bold");
    // Si hay otro agujero justo debajo (misma vertical, muy cerca en el papel), el Ø va al costado
    const hayDebajo = perforaciones.some(
      (o) => o !== pf && o.pieza === pf.pieza && Math.abs(o.x - pf.x) < 1 && o.y < pf.y && (pf.y - o.y) * s2 < 7,
    );
    if (hayDebajo) {
      doc.text(`Ø${fmt(pf.diametro)}`, hx + (c.izq ? 1 : -1) * (r + 1.2), hy + 1, { align: c.izq ? "left" : "right" });
    } else {
      doc.text(`Ø${fmt(pf.diametro)}`, hx, hy + r + 3.2, { align: "center" });
    }
    doc.setFont("helvetica", "normal").setTextColor(0).setDrawColor(0);
    // número de referencia (coincide con la lista)
    doc.setFontSize(6).setTextColor(200, 0, 0).text(String(i + 1), hx + r + 0.8, hy - r - 0.3).setTextColor(0);
  });

  // Perfil (laminado): tira inferior con sus agujeros
  const perfil = piezas.find((p) => p.pieza === "PERFIL");
  if (perfil) {
    const base = posPieza.PUERTA || { x: ax };
    const pw = perfil.ancho * s2, ph = Math.max(perfil.alto * s2, 3);
    const py = baseY + 12;
    doc.setLineWidth(0.4).setFillColor(240, 240, 240).rect(base.x, py, pw, ph, "FD");
    doc.setFontSize(7).text(`Perfil ${fmt(perfil.ancho)} x ${fmt(perfil.alto)}`, base.x, py + ph + 8);
    posPieza.PERFIL = { x: base.x, y: py, w: pw, h: ph };
    perforaciones.forEach((pf, i) => {
      if (pf.pieza !== "PERFIL") return;
      const cxh = base.x + pf.x * s2, cyh = py + ph / 2;
      doc.setDrawColor(200, 0, 0).setLineWidth(0.3).setFillColor(255, 255, 255).circle(cxh, cyh, 0.9, "FD");
      const izq = pf.x <= pf.dDer;
      const bordeX = izq ? base.x : base.x + pw;
      const yl = py - 3;
      ext(bordeX, py, bordeX, yl - 1);
      ext(cxh, cyh, cxh, yl - 1);
      cota(bordeX, yl, cxh, yl);
      doc.setFont("helvetica", "normal").setFontSize(6.5).setTextColor(0, 90, 160);
      doc.text(fmt(izq ? pf.x : pf.dDer), (bordeX + cxh) / 2, yl - 1.2, { align: "center" });
      doc.setTextColor(200, 0, 0).setFont("helvetica", "bold");
      doc.text(`Ø${fmt(pf.diametro)}`, cxh, py + ph + 3.5, { align: "center" });
      doc.setTextColor(0).setDrawColor(0).setFont("helvetica", "normal");
    });
  }

  /* --- Listas (izquierda abajo) --- */
  let y = gy + gh + 8;
  const linea = (txt, bold = false, size = 8) => {
    if (y > 200) { doc.addPage(); y = 15; }
    doc.setFont("helvetica", bold ? "bold" : "normal").setFontSize(size);
    const partes = doc.splitTextToSize(txt, conDetalle ? 84 : 142);
    doc.text(partes, 10, y);
    y += partes.length * (size * 0.42) + 1.2;
  };

  linea("LISTA DE CORTE", true, 10);
  piezas.forEach((p) => linea(`${p.nombre}: ${p.cant} u.  -  ${fmt(p.ancho)} x ${fmt(p.alto)} mm`));
  if (d.luces) {
    linea(
      `Ancho total ${fmt(dim.dimX)} - ${d.luces.descuento} de luces (${d.luces.pared} pared-vidrio x2 + ${d.luces.vidrio} entre vidrios) ` +
        `= ${fmt(d.luces.anchoUtil)}  ->  paño fijo ${fmt(d.luces.fijo)} + batiente ${fmt(d.luces.puerta)}`,
      false,
      7.5,
    );
  }
  y += 2;
  linea("PERFORACIONES (cotas)", true, 10);
  perforaciones.forEach((pf, i) => {
    const c = cotasDe(pf);
    linea(
      `${i + 1}. ${pf.nombre} [${pf.pieza}]  Ø${fmt(pf.diametro)}  -  a ${fmt(c.dx)} del lateral ${c.izq ? "izq." : "der."}` +
        (pf.pieza !== "PERFIL" ? `  -  a ${fmt(c.dy)} del ${c.desdeTope ? "tope" : "piso"}` : ""),
    );
  });
  if (gruposBisagra.length) linea("A = escotadura de bisagra (41 x 62 con relieves R9): ver DETALLE A a la derecha.", false, 7.5);
  if (franjas.length && aDibujar.length) {
    y += 2;
    linea("FRANJAS DEL VIDRIO (de abajo hacia arriba)", true, 10);
    armarFranjas(franjas, aDibujar[0].alto).forEach((b, i) =>
      linea(`${i + 1}. ${b.cond}  -  ${fmt(b.h)} mm`),
    );
  }
  y += 2;
  linea("HERRAJE", true, 10);
  if (d.manija) linea(`MANIJON: ${d.manija.codartprov ? `${d.manija.codartprov} - ` : ""}${d.manija.articulo}`, true);
  if (!herraje.length) linea("(sin herraje cargado)");
  herraje.forEach((h) => linea(`${h.codartprov ? `${h.codartprov} - ` : ""}${h.articulo}`));
  if (plano.nota) {
    y += 2;
    linea("NOTAS", true, 10);
    linea(plano.nota, false, 7.5);
  }

  doc.setFont("helvetica", "normal").setFontSize(7);
  doc.text(
    `Medidas presupuesto: ${m.ancho ?? "-"} x ${m.alto ?? "-"}   |   Generado ${new Date().toLocaleDateString("es-AR")}`,
    10, 206,
  );

  // DETALLE A: escotadura de la bisagra IM4006 en grande, al costado de la hoja 1 (escala 1,25:1), con las cotas del fabricante
  if (conDetalle) {
    doc.setPage(1); // si las listas pasaron a otra hoja, el detalle igual va en la primera
    const g0 = gruposBisagra[0];
    const [a0, b0] = g0.pfs;
    const R = a0.diametro / 2;
    const sep = Math.abs(a0.y - b0.y);
    const cxd = Math.min(a0.x, a0.dDer);
    const { prof, alto: altoE } = ESCOTADURA;
    const K = 1.25, zx = 202, x0 = 218, yc = 108, vW = 57; // vW: ancho de vidrio (mm) que se muestra
    const azul = () => doc.setTextColor(0, 90, 160).setFont("helvetica", "normal").setFontSize(9);
    doc.setFont("helvetica", "bold").setFontSize(10).setTextColor(0).text("DETALLE A - ESCOTADURA DE BISAGRA IM4006", zx, 33);
    doc.setFont("helvetica", "normal").setFontSize(7.5).text("Cotas en mm, escala 1,25:1", zx, 37.5);
    doc.setFontSize(7).text(
      doc.splitTextToSize("Escotadura abierta al canto del vidrio. Se hace en el batiente y en el paño fijo, en el canto que mira al otro vidrio.", 88),
      zx, 41.5);
    // vidrio y escotadura
    doc.setFillColor(205, 225, 250).setDrawColor(0).setLineWidth(0.4).rect(x0, yc - 42 * K, vW * K, 84 * K, "FD");
    const P = contornoEscotadura(R, cxd, sep).map((p) => [x0 + p.x * K, yc - p.y * K]);
    const deltas = P.slice(1).map((p, i) => [p[0] - P[i][0], p[1] - P[i][1]]);
    doc.setFillColor(255, 255, 255).lines(deltas, P[0][0], P[0][1], [1, 1], "F", true);
    doc.setDrawColor(0).setLineWidth(0.4).lines(deltas, P[0][0], P[0][1], [1, 1], "S", false);
    doc.setLineWidth(0.6).line(x0, yc - 42 * K, x0, P[0][1]).line(x0, P[P.length - 1][1], x0, yc + 42 * K);
    // centros de los relieves
    const yTop = yc - (sep / 2) * K, yBot = yc + (sep / 2) * K, xc = x0 + cxd * K;
    doc.setDrawColor(200, 0, 0).setLineWidth(0.2);
    [yTop, yBot].forEach((yy) => doc.line(xc - 2, yy, xc + 2, yy).line(xc, yy - 2, xc, yy + 2));
    // 36: canto -> centro del relieve
    const yl36 = (yc - 42 * K + (yTop - R * K)) / 2; // entre el borde superior del vidrio y el relieve
    ext(x0, yc - (altoE / 2) * K, x0, yl36 - 1);
    ext(xc, yTop, xc, yl36 - 1);
    cota(x0, yl36, xc, yl36);
    azul(); doc.text(fmt(cxd), (x0 + xc) / 2, yl36 - 1.5, { align: "center" });
    // 41: profundidad
    cota(x0, yc, x0 + prof * K, yc);
    azul(); doc.text(fmt(prof), x0 + (prof * K) / 2, yc - 1.5, { align: "center" });
    // 62: alto de la escotadura
    const xv = x0 - 12;
    ext(x0, yc - (altoE / 2) * K, xv - 1, yc - (altoE / 2) * K);
    ext(x0, yc + (altoE / 2) * K, xv - 1, yc + (altoE / 2) * K);
    cota(xv, yc - (altoE / 2) * K, xv, yc + (altoE / 2) * K);
    azul(); doc.text(fmt(altoE), xv - 2, yc, { angle: 90, align: "center" });
    // 56: entre centros
    const xr = xc + R * K + 9;
    ext(xc, yTop, xr + 1, yTop);
    ext(xc, yBot, xr + 1, yBot);
    cota(xr, yTop, xr, yBot);
    azul(); doc.text(fmt(sep), xr + 3, yc, { angle: 90, align: "center" });
    // R9
    const ex = xc + (R * K + 9) * 0.707, ey = yTop - (R * K + 9) * 0.707;
    doc.setDrawColor(0, 90, 160).setLineWidth(0.2).line(xc, yTop, ex, ey);
    azul(); doc.text(`R${fmt(R)}`, ex + 1.5, ey - 0.5);
    // posición en altura
    const piezaRef = piezas.find((p) => p.pieza === g0.pieza);
    const sup = gruposBisagra.find((g) => g.pieza === g0.pieza && g.sup);
    const inf = gruposBisagra.find((g) => g.pieza === g0.pieza && !g.sup);
    const centro = (g) => (g.pfs[0].y + g.pfs[1].y) / 2;
    doc.setTextColor(0).setFont("helvetica", "bold").setFontSize(9).text("POSICION EN EL VIDRIO", zx, 172);
    doc.setFont("helvetica", "normal").setFontSize(8);
    const posTxt = [];
    if (sup && piezaRef) posTxt.push(`Bisagra superior: centro a ${fmt(piezaRef.alto - centro(sup))} mm del tope.`);
    if (inf) posTxt.push(`Bisagra inferior: centro a ${fmt(centro(inf))} mm del piso.`);
    posTxt.push("Posiciones medidas sobre el dibujo del fabricante: confirmar con el primer corte.");
    doc.text(doc.splitTextToSize(posTxt.join("\n"), 88), zx, 177.5);
  }

  doc.save(`PLANO-${m.presm || m.numeropres || m.id}-REV${m.revision ?? 0}.pdf`);
  return avisos;
}

/* ---------- Pantalla ---------- */
export default function PlanoMamparas({ authFetch, API, onBack }) {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState([]);
  const [sel, setSel] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState("plano");
  const [unidad, setUnidad] = useState("auto"); // unidad en que se cargan las medidas
  // Consulta del manijón antes de generar el plano
  const [pidiendoManija, setPidiendoManija] = useState(false);
  const [manijones, setManijones] = useState([]);
  const [manijaSel, setManijaSel] = useState(""); // codartint ("" = sin manijón)
  const [manijaBusca, setManijaBusca] = useState("");
  const [manijaTodos, setManijaTodos] = useState(false);
  const [manijaMsg, setManijaMsg] = useState("");
  const [manijaPerfs, setManijaPerfs] = useState([]); // agujeros editables del manijón elegido (mm)
  const [manijaPerfsMsg, setManijaPerfsMsg] = useState("");
  const [sobrealtoDef, setSobrealtoDef] = useState(null); // null = el plano no usa sobrealto
  const [sobrealto, setSobrealto] = useState(""); // mm que se suman al alto del vano (editable)
  const [requiere, setRequiere] = useState({}); // modelo -> lleva plano (0/1)
  const [lado, setLado] = useState("DERECHA"); // mano de la puerta; la manija va del mismo lado
  const [franjas, setFranjas] = useState([]); // franjas del vidrio (solo modelos esmerilados), de abajo hacia arriba
  const [franjasMsg, setFranjasMsg] = useState("");
  // Reparto del ancho entre paño fijo y batiente (planos como IM4006): se define uno y el otro es el resto
  const [repartoInfo, setRepartoInfo] = useState(null); // { descuento, luz_pared, luz_vidrio } o null si el plano no lo usa
  const [repPieza, setRepPieza] = useState("PUERTA"); // cuál de los dos se define: "FIJO" | "PUERTA" (batiente)
  const [repAncho, setRepAncho] = useState("");
  const [repMsg, setRepMsg] = useState("");
  const esEsmerilado = /esmerilado/i.test(String(sel?.modelo ?? ""));
  const [planoConfig, setPlanoConfig] = useState(null); // RECTA | ESQUINA | CORREDIZA (la corrediza no usa mano)

  const cargarModelos = async () => {
    try {
      const r = await authFetch(`${API}/mamparas-modelo-plano`);
      if (r.ok) {
        const d = await r.json();
        setRequiere(Object.fromEntries(d.map((m) => [m.modelo_nombre, m.requiere_plano])));
      }
    } catch {
      /* si falla, la grilla igual funciona */
    }
  };
  useEffect(() => {
    cargarModelos();
  }, [tab]);

  const buscar = async () => {
    setMsg("");
    const r = await authFetch(`${API}/mamparas-plano/buscar?q=${encodeURIComponent(q)}`);
    setRows(r.ok ? await r.json() : []);
    if (!r.ok) setMsg("Error al buscar");
  };

  const elegir = (row) => {
    setSel(row);
    // Si ya hay medidas de producción las usa; si no, parte de las del presupuesto
    setForm({
      ancho_prod: row.ancho_prod ?? row.ancho ?? "",
      alto_prod: row.alto_prod ?? row.alto ?? "",
      prof_prod: row.prof_prod ?? "",
    });
  };

  const cargarManijones = async (todos) => {
    setManijaMsg("");
    try {
      const r = await authFetch(`${API}/mamparas-manijones${todos ? "?todos=1" : ""}`);
      if (!r.ok) throw new Error("No se pudo cargar la lista de manijones");
      setManijones(await r.json());
    } catch (e) {
      setManijones([]);
      setManijaMsg(e.message);
    }
  };

  // Al elegir un manijón se cargan sus agujeros guardados como valores iniciales (editables)
  const elegirManija = async (codartint) => {
    setManijaSel(codartint);
    setManijaPerfs([]);
    setManijaPerfsMsg("");
    if (!codartint) return;
    const mj = manijones.find((x) => x.codartint === codartint);
    if (!mj?.codartprov) {
      setManijaPerfsMsg("Este manijón no tiene código de proveedor: cargá los agujeros a mano.");
      return;
    }
    try {
      const r = await authFetch(`${API}/mamparas-manijon-perf/${encodeURIComponent(mj.codartprov)}`);
      if (!r.ok) throw new Error("No se pudieron cargar los agujeros del manijón");
      const rows = await r.json();
      setManijaPerfs(
        rows.map((p) => {
          const base = p.lado === "DER" ? "DER" : "IZQ";
          return {
            diametro: String(Number(p.diametro)),
            dx_borde: String(Number(p.dx_borde)),
            // si la mano elegida no es la de carga, el agujero va en el lateral opuesto
            lado: lado === LADO_BASE_MANIJON ? base : base === "DER" ? "IZQ" : "DER",
            y_piso: String(Number(p.y_piso)),
          };
        }),
      );
      if (!rows.length) setManijaPerfsMsg("Este manijón no tiene agujeros cargados: agregalos a mano.");
    } catch (e) {
      setManijaPerfsMsg(e.message);
    }
  };

  // Cambiar la mano espeja los agujeros que ya están en pantalla (Izq. <-> Der.)
  const cambiarLado = (nuevo) => {
    if (nuevo === lado) return;
    setLado(nuevo);
    setManijaPerfs((ps) => ps.map((p) => ({ ...p, lado: p.lado === "IZQ" ? "DER" : "IZQ" })));
  };

  const editarPerf = (i, campo, valor) =>
    setManijaPerfs((ps) => ps.map((p, j) => (j === i ? { ...p, [campo]: valor } : p)));

  const num = (v) => parseFloat(String(v).replace(",", "."));

  // Vista previa del reparto: mismo criterio de unidad que el backend (auto: alto < 400 se toma como cm)
  const repartoDatos = (() => {
    if (!repartoInfo) return null;
    const factor = unidad === "cm" ? 10 : unidad === "mm" ? 1 : parseFloat(form.alto_prod) < 400 ? 10 : 1;
    const total = parseFloat(form.ancho_prod) * factor;
    if (!(total > 0)) return null;
    const util = Math.round((total - repartoInfo.descuento) * 10) / 10;
    const a = num(repAncho);
    const otro = a > 0 ? Math.round((util - a) * 10) / 10 : null;
    return { total, util, otro };
  })();

  // Valida y manda el plano con los agujeros tal como quedaron en pantalla
  const generarConManija = () => {
    const perfs = manijaPerfs.map((p) => ({
      diametro: num(p.diametro),
      dx_borde: num(p.dx_borde),
      lado: p.lado,
      y_piso: num(p.y_piso),
    }));
    if (manijaSel && perfs.some((p) => !(p.diametro > 0) || !(p.dx_borde >= 0) || !(p.y_piso >= 0))) {
      setManijaPerfsMsg("Revisá los agujeros: diámetro mayor a 0 y medidas válidas");
      return;
    }
    let sobre = null;
    if (sobrealtoDef != null) {
      sobre = num(sobrealto);
      if (!Number.isFinite(sobre)) {
        setManijaMsg("Revisá el sobrealto del vidrio: tiene que ser un número (mm)");
        return;
      }
    }
    let franjasMm = [];
    if (esEsmerilado && franjas.length) {
      franjasMm = franjas.map((f) => ({
        cond: f.cond,
        medida: String(f.medida).trim() === "" ? null : num(f.medida),
      }));
      const mal = franjasMm.some((f, i) =>
        f.medida != null ? !(f.medida > 0) : i !== franjasMm.length - 1,
      );
      if (mal) {
        setFranjasMsg("Revisá las franjas: las medidas deben ser mayores a 0 y solo la última puede quedar vacía (hasta arriba)");
        return;
      }
    }
    setFranjasMsg("");
    let repartoBody = null;
    if (repartoInfo) {
      const a = num(repAncho);
      if (!(a > 0) || (repartoDatos && a >= repartoDatos.util)) {
        setRepMsg(
          repartoDatos
            ? `Ingresá el ancho del ${repPieza === "FIJO" ? "paño fijo" : "batiente"} (mayor a 0 y menor a ${repartoDatos.util} mm)`
            : "Ingresá el ancho del paño fijo o del batiente (mm)",
        );
        return;
      }
      repartoBody = { pieza: repPieza, ancho: a };
    }
    setRepMsg("");
    setPidiendoManija(false);
    hacerPlano(manijaSel, perfs, sobre, franjasMm, repartoBody);
  };

  const abrirConsultaManija = () => {
    if (!sel) return;
    if (!(parseFloat(form.ancho_prod) > 0) || !(parseFloat(form.alto_prod) > 0)) {
      setMsg("Cargá ancho prod y alto prod antes de hacer el plano");
      return;
    }
    setManijaSel("");
    setManijaPerfs([]);
    setManijaPerfsMsg("");
    setLado("DERECHA");
    setSobrealtoDef(null);
    setSobrealto("");
    setPlanoConfig(null);
    setFranjasMsg("");
    setRepartoInfo(null);
    setRepPieza("PUERTA");
    setRepAncho("");
    setRepMsg("");
    // Modelo esmerilado: por defecto todo el vidrio esmerilado (1 franja sin medida = hasta arriba)
    setFranjas(/esmerilado/i.test(String(sel.modelo ?? "")) ? [{ medida: "", cond: "ESMERILADO" }] : []);
    // Si el plano del modelo usa sobrealto (ej. corrediza IM6001), trae el valor inicial para poder editarlo
    authFetch(`${API}/mamparas-plano/${sel.id}/config?tipo=${sel.tipo ?? "mampara"}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((c) => {
        if (c) setPlanoConfig(c.config ?? null);
        if (c?.reparto) setRepartoInfo(c.reparto);
        if (c && c.sobrealto_def != null) {
          setSobrealtoDef(c.sobrealto_def);
          setSobrealto(String(c.sobrealto_def));
        }
      })
      .catch(() => {});
    setManijaBusca("");
    setManijaTodos(false);
    cargarManijones(false);
    setPidiendoManija(true);
  };

  const hacerPlano = async (manija_codartint = "", manija_perfs = null, sobrealtoMm = null, franjasMm = [], repartoBody = null) => {
    if (!sel) return;
    setLoading(true); setMsg("");
    try {
      const r = await authFetch(`${API}/mamparas-plano/${sel.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          unidad,
          tipo: sel.tipo ?? "mampara",
          manija_codartint: manija_codartint || null,
          manija_perfs: manija_codartint && manija_perfs ? manija_perfs : undefined,
          sobrealto: sobrealtoMm ?? undefined,
          reparto: repartoBody ?? undefined,
          lado,
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Error al generar plano");
      if (!data.plano) {
        setMsg(data.aviso || "No se encontró un plano para este modelo");
        buscar();
        return;
      }
      const avisos = dibujarPlano({ ...aplicarLado(data, lado), franjas: franjasMm });
      setMsg(
        `Plano generado (${data.codigo}, medidas en ${data.dim.unidadOrigen})` +
          (avisos?.length ? ` - Atención: ${avisos.join(" ")}` : ""),
      );
      buscar(); // refresca medidas guardadas
    } catch (e) {
      setMsg(e.message);
    } finally {
      setLoading(false);
    }
  };

  const tabs = (
    <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
      <button onClick={() => setTab("plano")} disabled={tab === "plano"}>Hacer plano</button>
      <button onClick={() => setTab("modelos")} disabled={tab === "modelos"}>Modelos y planos</button>
    </div>
  );

  if (tab === "modelos") {
    return (
      <div style={{ padding: 16 }}>
        {onBack && (
          <button
            onClick={onBack}
            style={{ marginBottom: 10, padding: "6px 16px", background: "#0a3a5c", color: "#fff", border: "none", borderRadius: 4, fontFamily: "'Space Mono', monospace", cursor: "pointer", fontSize: 13 }}
          >
            ← Volver
          </button>
        )}
        <h2>Planos de mamparas</h2>
        {tabs}
        <ModelosPlano authFetch={authFetch} API={API} />
      </div>
    );
  }

  return (
    <div style={{ padding: 16 }}>
      {onBack && (
        <button
          onClick={onBack}
          style={{ marginBottom: 10, padding: "6px 16px", background: "#0a3a5c", color: "#fff", border: "none", borderRadius: 4, fontFamily: "'Space Mono', monospace", cursor: "pointer", fontSize: 13 }}
        >
          ← Volver
        </button>
      )}
      <h2>Planos de mamparas</h2>
      {tabs}

      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && buscar()}
          placeholder="N° presupuesto, cliente o modelo"
        />
        <button onClick={buscar}>Buscar</button>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr>
            {["Tipo", "Pres.", "Mamp.", "Rev.", "Cliente", "Modelo", "Ancho", "Alto", "Ancho prod", "Alto prod", "Prof prod", "Lleva plano"].map((h) => (
              <th key={h} style={{ textAlign: "left", borderBottom: "1px solid #ccc", padding: "4px 10px", whiteSpace: "nowrap" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={`${r.tipo}-${r.id}`}
              onClick={() => elegir(r)}
              style={{ cursor: "pointer", background: sel?.id === r.id && sel?.tipo === r.tipo ? "#e3f2fd" : "transparent" }}
            >
              <td style={{ padding: "4px 10px" }}>{r.tipo === "puerta" ? "Puerta" : "Mampara"}</td><td style={{ padding: "4px 10px" }}>{r.numeropres}</td><td style={{ padding: "4px 10px" }}>{r.presm}</td><td style={{ padding: "4px 10px" }}>{r.revision}</td>
              <td style={{ padding: "4px 10px" }}>{r.codcliente}</td><td style={{ padding: "4px 10px" }}>{r.modelo}</td>
              <td style={{ padding: "4px 10px" }}>{r.ancho}</td><td style={{ padding: "4px 10px" }}>{r.alto}</td>
              <td style={{ padding: "4px 10px" }}>{r.ancho_prod ?? "-"}</td><td style={{ padding: "4px 10px" }}>{r.alto_prod ?? "-"}</td><td style={{ padding: "4px 10px" }}>{r.prof_prod ?? "-"}</td><td style={{ padding: "4px 10px" }}>{requiere[r.modelo] ? "Sí" : "No"}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {sel && (
        <div style={{ marginTop: 16, display: "flex", gap: 8, alignItems: "end" }}>
          {[["ancho_prod", "Ancho prod"], ["alto_prod", "Alto prod"], ["prof_prod", "Prof prod"]].map(([k, label]) => (
            <label key={k} style={{ display: "flex", flexDirection: "column", fontSize: 12 }}>
              {label}
              <input
                type="number"
                value={form[k]}
                onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                style={{ width: 100 }}
              />
            </label>
          ))}
          <label style={{ display: "flex", flexDirection: "column", fontSize: 12 }}>
            Medidas en
            <select value={unidad} onChange={(e) => setUnidad(e.target.value)}>
              <option value="auto">Automático</option>
              <option value="cm">Centímetros</option>
              <option value="mm">Milímetros</option>
            </select>
          </label>
          <button onClick={abrirConsultaManija} disabled={loading || !requiere[sel.modelo]}>
            {loading ? "Generando..." : "Hacer plano"}
          </button>
        </div>
      )}

      {pidiendoManija && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}
          onClick={() => setPidiendoManija(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: "#fff", color: "#222", borderRadius: 8, padding: 20, width: 520, maxWidth: "92vw", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 4px 18px rgba(0,0,0,.3)" }}
          >
            <h3 style={{ marginTop: 0 }}>¿Qué manijón querés aplicar?</h3>
            <p style={{ margin: "0 0 10px", fontSize: 13, color: "#555" }}>
              Plano de <b>{sel?.modelo}</b>. Elegí el manijón que va en esta mampara.
            </p>
            {planoConfig !== "CORREDIZA" && (
              <label style={{ fontSize: 13, display: "block", marginBottom: 8 }}>
                <b>Mano de la puerta</b>{" "}
                <select value={lado} onChange={(e) => cambiarLado(e.target.value)}>
                  <option value="DERECHA">Derecha (puerta y manija a la derecha)</option>
                  <option value="IZQUIERDA">Izquierda (puerta y manija a la izquierda)</option>
                </select>
              </label>
            )}
            <input
              value={manijaBusca}
              onChange={(e) => setManijaBusca(e.target.value)}
              placeholder="Filtrar por código o nombre"
              style={{ width: "100%", boxSizing: "border-box", marginBottom: 6 }}
              autoFocus
            />
            <label style={{ fontSize: 12, display: "block", marginBottom: 6 }}>
              <input
                type="checkbox"
                checked={manijaTodos}
                onChange={(e) => {
                  setManijaTodos(e.target.checked);
                  cargarManijones(e.target.checked);
                }}
              />{" "}
              Mostrar todos los herrajes de mampara (no solo los que dicen "manijón")
            </label>
            <select
              size={8}
              value={manijaSel}
              onChange={(e) => elegirManija(e.target.value)}
              style={{ width: "100%", marginBottom: 6 }}
            >
              <option value="">— Sin manijón —</option>
              {manijones
                .filter((mj) =>
                  `${mj.codartprov ?? ""} ${mj.articulo}`.toLowerCase().includes(manijaBusca.trim().toLowerCase()),
                )
                .map((mj) => (
                  <option key={mj.id} value={mj.codartint}>
                    {mj.codartprov ? `${mj.codartprov} - ` : ""}
                    {mj.articulo}
                  </option>
                ))}
            </select>
            {manijaMsg && <p style={{ color: "#b71c1c", fontSize: 12 }}>{manijaMsg}</p>}
            {!manijaMsg && !manijones.length && (
              <p style={{ fontSize: 12, color: "#888" }}>
                No hay artículos para mostrar. Probá tildando "Mostrar todos los herrajes".
              </p>
            )}
            {manijaSel && (
              <div style={{ margin: "8px 0 4px", fontSize: 12 }}>
                <b>Agujeros del manijón</b> (mm, sobre la puerta){" "}
                <span style={{ color: "#777" }}>— editables, valen solo para este plano</span>
                {manijaPerfsMsg && <p style={{ color: "#b71c1c", margin: "4px 0" }}>{manijaPerfsMsg}</p>}
                {manijaPerfs.length > 0 && (
                  <div style={{ display: "grid", gridTemplateColumns: "60px 70px 70px 80px 24px", gap: 4, marginTop: 6, alignItems: "center", color: "#555" }}>
                    <span>Ø</span>
                    <span>Al borde</span>
                    <span>Del lado</span>
                    <span>Desde abajo</span>
                    <span />
                    {manijaPerfs.map((p, i) => (
                      <Fragment key={i}>
                        <input value={p.diametro} onChange={(e) => editarPerf(i, "diametro", e.target.value)} style={{ width: "100%", boxSizing: "border-box" }} />
                        <input value={p.dx_borde} onChange={(e) => editarPerf(i, "dx_borde", e.target.value)} style={{ width: "100%", boxSizing: "border-box" }} />
                        <select value={p.lado} onChange={(e) => editarPerf(i, "lado", e.target.value)}>
                          <option value="IZQ">Izq.</option>
                          <option value="DER">Der.</option>
                        </select>
                        <input value={p.y_piso} onChange={(e) => editarPerf(i, "y_piso", e.target.value)} style={{ width: "100%", boxSizing: "border-box" }} />
                        <button
                          title="Quitar agujero"
                          onClick={() => setManijaPerfs((ps) => ps.filter((_, j) => j !== i))}
                          style={{ padding: 0 }}
                        >
                          ×
                        </button>
                      </Fragment>
                    ))}
                  </div>
                )}
                <button
                  onClick={() =>
                    setManijaPerfs((ps) => [...ps, { diametro: "12", dx_borde: "60", lado: "IZQ", y_piso: "1000" }])
                  }
                  style={{ marginTop: 6 }}
                >
                  + Agregar agujero
                </button>
              </div>
            )}
            {sobrealtoDef != null && (
              <div style={{ margin: "10px 0 4px", fontSize: 13 }}>
                <label>
                  <b>Sobrealto del vidrio (mm)</b>{" "}
                  <input
                    value={sobrealto}
                    onChange={(e) => setSobrealto(e.target.value)}
                    style={{ width: 70 }}
                  />
                </label>
                <span style={{ color: "#777", fontSize: 12 }}>
                  {" "}
                  Alto del vidrio = alto del vano + este valor (por defecto {sobrealtoDef})
                </span>
              </div>
            )}
            {repartoInfo && (
              <div style={{ margin: "12px 0 4px", fontSize: 12 }}>
                <b style={{ fontSize: 13 }}>Reparto del ancho</b>{" "}
                <span style={{ color: "#777" }}>
                  — luces: {repartoInfo.luz_pared} mm entre pared y vidrio (x2) y {repartoInfo.luz_vidrio} mm entre vidrios
                  = {repartoInfo.descuento} mm
                </span>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 6 }}>
                  <span>Definir el ancho del</span>
                  <select value={repPieza} onChange={(e) => setRepPieza(e.target.value)}>
                    <option value="FIJO">Paño fijo</option>
                    <option value="PUERTA">Batiente</option>
                  </select>
                  <input
                    value={repAncho}
                    onChange={(e) => setRepAncho(e.target.value)}
                    placeholder="mm"
                    style={{ width: 80 }}
                  />
                  <span>mm</span>
                </div>
                {repartoDatos && (
                  <p style={{ margin: "4px 0 0", color: "#555" }}>
                    Ancho total {repartoDatos.total} - {repartoInfo.descuento} = <b>{repartoDatos.util} mm</b> entre los dos vidrios
                    {repartoDatos.otro != null && (
                      <>
                        {" "}→ el {repPieza === "FIJO" ? "batiente" : "paño fijo"} mide{" "}
                        <b style={{ color: repartoDatos.otro > 0 ? "#222" : "#b71c1c" }}>{repartoDatos.otro} mm</b>
                      </>
                    )}
                  </p>
                )}
                {repMsg && <p style={{ color: "#b71c1c", margin: "4px 0 0" }}>{repMsg}</p>}
              </div>
            )}
            {esEsmerilado && (
              <div style={{ margin: "12px 0 4px", fontSize: 12 }}>
                <b style={{ fontSize: 13 }}>Franjas del vidrio</b>{" "}
                <span style={{ color: "#777" }}>— de abajo hacia arriba</span>
                <div style={{ display: "grid", gridTemplateColumns: "28px 90px 130px 24px", gap: 4, marginTop: 6, alignItems: "center", color: "#555" }}>
                  <span>N°</span>
                  <span>Medida (mm)</span>
                  <span>Condición</span>
                  <span />
                  {franjas.map((f, i) => (
                    <Fragment key={i}>
                      <span>{i + 1}</span>
                      <input
                        value={f.medida}
                        placeholder={i === franjas.length - 1 ? "hasta arriba" : ""}
                        onChange={(e) => setFranjas((fs) => fs.map((x, j) => (j === i ? { ...x, medida: e.target.value } : x)))}
                        style={{ width: "100%", boxSizing: "border-box" }}
                      />
                      <select
                        value={f.cond}
                        onChange={(e) => setFranjas((fs) => fs.map((x, j) => (j === i ? { ...x, cond: e.target.value } : x)))}
                      >
                        <option value="ESMERILADO">Esmerilado</option>
                        <option value="INCOLORO">Incoloro</option>
                      </select>
                      <button title="Quitar franja" onClick={() => setFranjas((fs) => fs.filter((_, j) => j !== i))} style={{ padding: 0 }}>
                        ×
                      </button>
                    </Fragment>
                  ))}
                </div>
                <button
                  onClick={() =>
                    setFranjas((fs) => {
                      const ult = fs[fs.length - 1];
                      return [...fs, { medida: "", cond: ult?.cond === "ESMERILADO" ? "INCOLORO" : "ESMERILADO" }];
                    })
                  }
                  style={{ marginTop: 6 }}
                >
                  + Agregar franja
                </button>
                <span style={{ color: "#777", marginLeft: 8 }}>
                  Suman {franjas.reduce((a, f) => a + (num(f.medida) || 0), 0)} mm
                </span>
                <p style={{ margin: "4px 0 0", color: "#777" }}>
                  La última franja puede quedar sin medida (llega hasta arriba). Con una sola franja sin medida, el vidrio es todo de esa condición.
                  Sin franjas, el plano se dibuja como siempre.
                </p>
                {franjasMsg && <p style={{ color: "#b71c1c", margin: "4px 0 0" }}>{franjasMsg}</p>}
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
              <button onClick={() => setPidiendoManija(false)}>Cancelar</button>
              <button
                onClick={generarConManija}
                style={{ background: "#0a3a5c", color: "#fff", border: "none", borderRadius: 4, padding: "6px 16px", cursor: "pointer" }}
              >
                Generar plano
              </button>
            </div>
          </div>
        </div>
      )}
      {sel && !requiere[sel.modelo] && <p>Este modelo no lleva plano.</p>}
      {msg && <p>{msg}</p>}
    </div>
  );
}
