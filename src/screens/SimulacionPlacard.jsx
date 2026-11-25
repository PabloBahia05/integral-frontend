// SimulacionPlacard.jsx - Simulación de puertas corredizas de placard, vista en PLANTA, con chequeo de superposiciones y PDF.
// Misma lógica que Placard.ps1 (DOMUS2), todo en el navegador (no usa el backend).
//
//  - Ancho total, profundidad total (60) y de módulos (45): lo que sobra adelante (15) es la zona de los dos rieles.
//  - Puertas: 2, 3 o 4 en dos rieles (atrás / adelante). Ancho de puerta = (ancho total + cruce × cantidad de cruces) / cantidad.
//    Vecinas en rieles distintos se cruzan; vecinas en el mismo riel se tocan.
//  - Módulos de izquierda a derecha: nombre, con o sin cajones, ancho.
//  - Cada puerta se corre con su barra (no pasa a otra de su riel ni sale del placard).
//  - Chequear: un módulo con cajones FUNCIONA si existe una posición de puertas que deje libre todo su ancho (+ luz extra por lado).
//    En cada riel las puertas mantienen su orden: las primeras van a la izquierda del módulo y las demás a la derecha.
//    Avisa además si un cruce de puertas cerradas cae frente a un módulo con cajones y si los módulos no suman el ancho total.
//  - Descargar PDF: hoja A4 apaisada con cliente, habitación, fecha, FUNCIONA / NO FUNCIONA, la planta, los datos y el resultado.
// Usa jspdf (npm i jspdf). Lo último cargado queda en localStorage.

import { useEffect, useMemo, useState } from "react";
import { jsPDF } from "jspdf";

const CLAVE_LS = "integral_simulacion_placard";

const ESQUEMAS = {
  2: [
    { t: "P1 atrás, P2 adelante", r: [0, 1] },
    { t: "P1 adelante, P2 atrás", r: [1, 0] },
  ],
  3: [
    { t: "atrás - adelante - atrás (la del medio adelante)", r: [0, 1, 0] },
    { t: "adelante - atrás - adelante (la del medio atrás)", r: [1, 0, 1] },
  ],
  4: [
    { t: "atrás - adelante - adelante - atrás (las del medio se tocan)", r: [0, 1, 1, 0] },
    { t: "adelante - atrás - atrás - adelante (las del medio se tocan)", r: [1, 0, 0, 1] },
    { t: "alternadas: atrás - adelante - atrás - adelante", r: [0, 1, 0, 1] },
  ],
};

const VERDE = "#1e8c3c";
const ROJO = "#be1e28";
const AZUL = "#0e3458";

const num = (t) => {
  const v = parseFloat(String(t ?? "").trim().replace(",", "."));
  return Number.isFinite(v) ? v : null;
};
const f = (v) => {
  const r = Math.round(v * 100) / 100;
  return String(r);
};
let sigId = 1;
const nuevoModulo = (nombre = "", caj = false, ancho = "") => ({ id: sigId++, nombre, caj, ancho: String(ancho) });

// ---------------------------------------------------------------- cálculos (sin React)
function leerDatos(e) {
  const err = [];
  const W = num(e.ancho);
  const PT = num(e.prof);
  const PM = num(e.profMod);
  const cruce = num(e.cruce);
  const luz = num(e.luz);
  if (W === null || W <= 0) err.push("ancho total");
  if (PT === null || PT <= 0) err.push("profundidad total");
  if (PM === null || PM <= 0) err.push("profundidad de módulos");
  if (cruce === null || cruce < 0) err.push("cruce");
  if (luz === null || luz < 0) err.push("luz extra");
  if (PT !== null && PM !== null && PM >= PT) err.push("la profundidad de módulos tiene que ser menor que la total");
  const modulos = [];
  let x = 0;
  e.modulos.forEach((m, i) => {
    const nom = (m.nombre || "").trim();
    const an = num(m.ancho);
    if (!nom && an === null) return;
    if (an === null || an <= 0) {
      err.push("ancho del módulo " + (nom || "fila " + (i + 1)));
      return;
    }
    modulos.push({ id: m.id, nombre: nom || "M" + (modulos.length + 1), caj: !!m.caj, ancho: an, x0: x, x1: x + an });
    x += an;
  });
  return { err, W, PT, PM, cruce, luz, modulos };
}

function puertasCerradas(W, cruce, rieles) {
  const n = rieles.length;
  let k = 0;
  for (let i = 1; i < n; i++) if (rieles[i] !== rieles[i - 1]) k++;
  const wp = (W + cruce * k) / n;
  const ps = [];
  let x = 0;
  for (let i = 0; i < n; i++) {
    if (i > 0) x += rieles[i] !== rieles[i - 1] ? wp - cruce : wp;
    ps.push({ rail: rieles[i], w: wp, x });
  }
  return ps;
}

function limitesPuerta(ps, i, W) {
  const p = ps[i];
  let min = 0;
  let max = W - p.w;
  for (let j = i - 1; j >= 0; j--) if (ps[j].rail === p.rail) { min = ps[j].x + ps[j].w; break; }
  for (let j = i + 1; j < ps.length; j++) if (ps[j].rail === p.rail) { max = ps[j].x - p.w; break; }
  return [min, max];
}

function puertasQueTapan(ps, a, b) {
  const r = [];
  ps.forEach((p, i) => { if (p.x + p.w > a + 0.001 && p.x < b - 0.001) r.push(i); });
  return r;
}

// Posiciones que dejan libre [a, b]; en cada riel el corte que menos mueve las puertas
function planAbrir(ps, W, a, b) {
  const nuevas = {};
  const motivos = [];
  for (const rail of [0, 1]) {
    const idx = ps.map((p, i) => (p.rail === rail ? i : -1)).filter((i) => i >= 0);
    if (idx.length === 0) continue;
    let mejor = null;
    let mejorMov = Infinity;
    for (let k = 0; k <= idx.length; k++) {
      const sL = idx.slice(0, k).reduce((s, i) => s + ps[i].w, 0);
      const sR = idx.slice(k).reduce((s, i) => s + ps[i].w, 0);
      if (sL > a + 0.001 || sR > W - b + 0.001) continue;
      const pos = {};
      let x = a - sL;
      for (let j = 0; j < k; j++) { pos[idx[j]] = x; x += ps[idx[j]].w; }
      x = b;
      for (let j = k; j < idx.length; j++) { pos[idx[j]] = x; x += ps[idx[j]].w; }
      const mov = Object.keys(pos).reduce((s, q) => s + Math.abs(pos[q] - ps[q].x), 0);
      if (mov < mejorMov) { mejorMov = mov; mejor = pos; }
    }
    if (!mejor) {
      const tot = idx.reduce((s, i) => s + ps[i].w, 0);
      motivos.push(
        "las puertas del riel de " + (rail === 0 ? "atrás" : "adelante") + " (" + idx.map((i) => "P" + (i + 1)).join(", ") + ", " +
          f(tot) + " cm en total) no entran a los costados: hay " + f(a) + " a la izquierda y " + f(W - b) + " a la derecha"
      );
    } else Object.assign(nuevas, mejor);
  }
  return motivos.length ? { ok: false, motivo: motivos.join("; ") } : { ok: true, x: nuevas };
}

function mayorAbertura(ps, W) {
  let mx = null;
  for (const rail of [0, 1]) {
    const tot = ps.filter((p) => p.rail === rail).reduce((s, p) => s + p.w, 0);
    const lib = W - tot;
    if (mx === null || lib < mx) mx = lib;
  }
  return mx ?? W;
}

const tramoCajon = (m, W, luz) => [Math.max(0, m.x0 - luz), Math.min(W, m.x1 + luz)];

function zonasUnion(ps) {
  const z = [];
  for (let i = 1; i < ps.length; i++) {
    const p = ps[i - 1];
    const q = ps[i];
    if (p.rail !== q.rail) z.push({ t: "cruce P" + i + "/P" + (i + 1), a: q.x, b: p.x + p.w });
    else z.push({ t: "unión P" + i + "/P" + (i + 1), a: q.x - 0.1, b: q.x + 0.1 });
  }
  return z;
}

function chequear(d, ps, rieles) {
  const L = [];
  let prob = 0;
  const sum = d.modulos.reduce((s, m) => s + m.ancho, 0);
  L.push("Placard " + f(d.W) + " x " + f(d.PT) + " cm; módulos de " + f(d.PM) + " de profundidad; zona de rieles " + f(d.PT - d.PM) + " cm.");
  L.push(ps.length + " puertas de " + f(ps[0].w) + " cm (cruce " + f(d.cruce) + "). Lo máximo que se puede abrir de una vez: " + f(mayorAbertura(ps, d.W)) + " cm.");
  if (d.modulos.length === 0) L.push("No hay módulos cargados.");
  else if (Math.abs(sum - d.W) > 0.05) {
    prob++;
    if (sum > d.W) L.push("PROBLEMA: los módulos suman " + f(sum) + " cm, " + f(sum - d.W) + " más que el ancho del placard.");
    else L.push("AVISO: los módulos suman " + f(sum) + " cm; sobran " + f(d.W - sum) + " cm a la derecha.");
  }
  const zonas = zonasUnion(puertasCerradas(d.W, d.cruce, rieles));
  for (const m of d.modulos) {
    if (!m.caj) continue;
    const [a, b] = tramoCajon(m, d.W, d.luz);
    const pl = planAbrir(ps, d.W, a, b);
    if (pl.ok) L.push("OK " + m.nombre + " (cajones, X " + f(m.x0) + " a " + f(m.x1) + "): se puede dejar libre corriendo las puertas.");
    else { prob++; L.push("PROBLEMA " + m.nombre + " (cajones, " + f(b - a) + " cm): ninguna posición de puertas lo deja libre: " + pl.motivo + "."); }
    for (const z of zonas) {
      if (z.b > m.x0 + 0.001 && z.a < m.x1 - 0.001)
        L.push("   aviso: con las puertas cerradas, el " + z.t + " (X " + f(Math.max(z.a, 0)) + " a " + f(z.b) + ") queda frente a " + m.nombre + ".");
    }
  }
  const funciona = prob === 0;
  L.unshift(funciona ? "FUNCIONA: sin superposiciones que impidan abrir cajones." : "NO FUNCIONA: hay " + prob + " problema(s).");
  return { funciona, lineas: L };
}

// ---------------------------------------------------------------- geometría del dibujo (la usan la pantalla y el PDF)
// Devuelve todo en unidades del dibujo: k = escala (unidades por cm), con origen arriba a la izquierda del placard.
function geometria(d, ps, k) {
  const zr = d.PT - d.PM;
  const yRail = [d.PM + zr / 3, d.PM + (2 * zr) / 3];
  const mods = d.modulos.map((m) => {
    let estado = "";
    let tipo = "gris";
    if (m.caj) {
      const [a, b] = tramoCajon(m, d.W, d.luz);
      const tapan = puertasQueTapan(ps, a, b);
      if (tapan.length === 0) { tipo = "verde"; estado = "cajones: abren"; }
      else { tipo = "rojo"; estado = "cajones: tapado por " + tapan.map((i) => "P" + (i + 1)).join(", "); }
    }
    return { ...m, x: m.x0 * k, y: 0, w: m.ancho * k, h: d.PM * k, tipo, estado };
  });
  const cruces = [];
  for (let i = 0; i < ps.length; i++)
    for (let j = i + 1; j < ps.length; j++) {
      const p = ps[i];
      const q = ps[j];
      if (p.rail === q.rail) continue;
      const a = Math.max(p.x, q.x);
      const b = Math.min(p.x + p.w, q.x + q.w);
      if (b > a + 0.001) cruces.push({ x: a * k, y: d.PM * k, w: (b - a) * k, h: zr * k });
    }
  const esp = Math.max(2 * k, 4);
  const puertas = ps.map((p, i) => ({
    x: p.x * k, y: yRail[p.rail] * k - esp / 2, w: p.w * k, h: esp, rail: p.rail, label: "P" + (i + 1) + "  " + f(p.w),
  }));
  const sum = d.modulos.reduce((s, m) => s + m.ancho, 0);
  const sobra = d.modulos.length > 0 && sum < d.W - 0.05 ? { x: sum * k, w: (d.W - sum) * k, h: d.PM * k, val: d.W - sum } : null;
  return { mods, cruces, puertas, rieles: yRail.map((y) => y * k), sobra, ancho: d.W * k, alto: d.PT * k };
}

const COLORES = {
  gris: { fill: "#e1e1e1", stroke: "#696969" },
  verde: { fill: "#c8f0c8", stroke: "#228b22" },
  rojo: { fill: "#facdcd", stroke: "#b22222" },
};
const COLOR_PUERTA = ["#285aa0", "#008c8c"];

// ---------------------------------------------------------------- dibujo en pantalla (SVG)
function Planta({ d, ps, funciona }) {
  const VBW = 1000;
  const m = 40;
  const k = (VBW - 2 * m) / d.W;
  const g = geometria(d, ps, k);
  const VBH = g.alto + 2 * m + 50;
  const fs = 13;
  return (
    <svg viewBox={`0 0 ${VBW} ${VBH}`} style={{ width: "100%", background: "#fff", border: "1px solid #ccc", borderRadius: 6 }}>
      <g transform={`translate(${m},${m})`}>
        <text x={0} y={-12} fontSize={11} fill="#888">PARED</text>
        <line x1={-3} y1={-3} x2={g.ancho + 3} y2={-3} stroke="#5a4632" strokeWidth={6} />
        <line x1={-3} y1={-3} x2={-3} y2={g.alto} stroke="#5a4632" strokeWidth={6} />
        <line x1={g.ancho + 3} y1={-3} x2={g.ancho + 3} y2={g.alto} stroke="#5a4632" strokeWidth={6} />
        {g.mods.map((md) => (
          <g key={md.id}>
            <rect x={md.x} y={md.y} width={md.w} height={md.h} fill={COLORES[md.tipo].fill} stroke={COLORES[md.tipo].stroke} strokeWidth={2} />
            {md.caj && [0.15, 0.85].map((t) => (
              <line key={t} x1={md.x + 4} x2={md.x + md.w - 4} y1={md.h * t} y2={md.h * t} stroke={COLORES[md.tipo].stroke} strokeOpacity={0.5} />
            ))}
            <text x={md.x + md.w / 2} y={md.h / 2 - (md.estado ? fs : fs / 2)} fontSize={fs} fontWeight="bold" textAnchor="middle">{md.nombre}</text>
            <text x={md.x + md.w / 2} y={md.h / 2 + (md.estado ? 2 : fs / 2 + 2)} fontSize={fs} fontWeight="bold" textAnchor="middle">{f(md.ancho)} cm</text>
            {md.estado && <text x={md.x + md.w / 2} y={md.h / 2 + fs + 4} fontSize={fs - 2} textAnchor="middle">{md.estado}</text>}
          </g>
        ))}
        {g.sobra && (
          <g>
            <rect x={g.sobra.x} y={0} width={g.sobra.w} height={g.sobra.h} fill="#f3f3f3" stroke="#bbb" strokeDasharray="4 3" />
            <text x={g.sobra.x + g.sobra.w / 2} y={g.sobra.h / 2} fontSize={11} textAnchor="middle">sobra {f(g.sobra.val)}</text>
          </g>
        )}
        {g.rieles.map((y, i) => (
          <line key={i} x1={0} x2={g.ancho} y1={y} y2={y} stroke="#999" strokeDasharray="6 4" />
        ))}
        {g.cruces.map((c, i) => (
          <rect key={i} x={c.x} y={c.y} width={c.w} height={c.h} fill="rgba(255,210,0,0.45)" />
        ))}
        {g.puertas.map((p, i) => (
          <g key={i}>
            <rect x={p.x} y={p.y} width={p.w} height={p.h} fill={COLOR_PUERTA[p.rail]} />
            <text x={p.x + p.w / 2} y={p.rail === 0 ? p.y - 4 : p.y + p.h + 12} fontSize={11} textAnchor="middle">{p.label}</text>
          </g>
        ))}
        <text x={0} y={g.alto + 14} fontSize={11} fill="#888">FRENTE</text>
        <line x1={0} x2={g.ancho} y1={g.alto + 26} y2={g.alto + 26} stroke="#000" />
        <line x1={0} x2={0} y1={g.alto + 21} y2={g.alto + 31} stroke="#000" />
        <line x1={g.ancho} x2={g.ancho} y1={g.alto + 21} y2={g.alto + 31} stroke="#000" />
        <text x={g.ancho / 2} y={g.alto + 44} fontSize={12} textAnchor="middle">
          ancho {f(d.W)} cm (módulos {f(d.PM)} + rieles {f(d.PT - d.PM)} = {f(d.PT)} de profundidad)
        </text>
        {funciona !== null && (
          <g>
            <rect x={g.ancho - 180} y={g.alto + 30} width={180} height={34} fill={funciona ? VERDE : ROJO} rx={4} />
            <text x={g.ancho - 90} y={g.alto + 53} fontSize={16} fontWeight="bold" fill="#fff" textAnchor="middle">
              {funciona ? "FUNCIONA" : "NO FUNCIONA"}
            </text>
          </g>
        )}
      </g>
    </svg>
  );
}

// ---------------------------------------------------------------- PDF (jsPDF, A4 apaisada, en mm)
function hexRgb(h) {
  const s = h.replace("#", "");
  return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
}

function generarPdf({ d, ps, rieles, esquemaTexto, cliente, habitacion, res }) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const PW = 297;
  const PH = 210;
  const M = 12;
  const ancho = PW - 2 * M;

  // encabezado
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(...hexRgb(AZUL));
  doc.text("Simulación de placard - puertas corredizas (planta)", M, M + 5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  const hoy = new Date();
  const fecha = String(hoy.getDate()).padStart(2, "0") + "/" + String(hoy.getMonth() + 1).padStart(2, "0") + "/" + hoy.getFullYear();
  doc.text("Cliente: " + (cliente.trim() || "-") + "      Habitación: " + (habitacion.trim() || "-") + "      Fecha: " + fecha, M, M + 12);
  doc.setFillColor(...hexRgb(res.funciona ? VERDE : ROJO));
  doc.rect(PW - M - 60, M - 1, 60, 14, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(255, 255, 255);
  doc.text(res.funciona ? "FUNCIONA" : "NO FUNCIONA", PW - M - 30, M + 8, { align: "center" });
  doc.setDrawColor(150, 150, 150);
  doc.line(M, M + 16, PW - M, M + 16);

  // planta
  const yP = M + 26;
  const hMax = 85;
  const k = Math.min((ancho - 10) / d.W, hMax / d.PT);
  const g = geometria(d, ps, k);
  const ox = M + (ancho - g.ancho) / 2;
  const oy = yP;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(130, 130, 130);
  doc.text("PARED", ox, oy - 3);
  doc.text("FRENTE", ox, oy + g.alto + 4);
  doc.setDrawColor(90, 70, 50);
  doc.setLineWidth(1.2);
  doc.line(ox - 0.6, oy - 0.6, ox + g.ancho + 0.6, oy - 0.6);
  doc.line(ox - 0.6, oy - 0.6, ox - 0.6, oy + g.alto);
  doc.line(ox + g.ancho + 0.6, oy - 0.6, ox + g.ancho + 0.6, oy + g.alto);
  doc.setLineWidth(0.3);
  for (const md of g.mods) {
    doc.setFillColor(...hexRgb(COLORES[md.tipo].fill));
    doc.setDrawColor(...hexRgb(COLORES[md.tipo].stroke));
    doc.rect(ox + md.x, oy, md.w, md.h, "FD");
    if (md.caj) for (const t of [0.15, 0.85]) doc.line(ox + md.x + 1, oy + md.h * t, ox + md.x + md.w - 1, oy + md.h * t);
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    const cx = ox + md.x + md.w / 2;
    const cy = oy + md.h / 2;
    doc.text(md.nombre, cx, cy - 3, { align: "center", maxWidth: md.w - 2 });
    doc.text(f(md.ancho) + " cm", cx, cy + 1, { align: "center" });
    if (md.estado) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.text(md.estado, cx, cy + 5, { align: "center", maxWidth: md.w - 2 });
    }
  }
  if (g.sobra) {
    doc.setDrawColor(180, 180, 180);
    doc.setFillColor(243, 243, 243);
    doc.rect(ox + g.sobra.x, oy, g.sobra.w, g.sobra.h, "FD");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.text("sobra " + f(g.sobra.val), ox + g.sobra.x + g.sobra.w / 2, oy + g.sobra.h / 2, { align: "center" });
  }
  doc.setDrawColor(150, 150, 150);
  doc.setLineDashPattern([1.5, 1], 0);
  for (const y of g.rieles) doc.line(ox, oy + y, ox + g.ancho, oy + y);
  doc.setLineDashPattern([], 0);
  doc.setFillColor(255, 225, 120);
  for (const c of g.cruces) doc.rect(ox + c.x, oy + c.y, c.w, c.h, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  for (const p of g.puertas) {
    doc.setFillColor(...hexRgb(COLOR_PUERTA[p.rail]));
    doc.rect(ox + p.x, oy + p.y, p.w, p.h, "F");
    doc.setTextColor(0, 0, 0);
    doc.text(p.label, ox + p.x + p.w / 2, p.rail === 0 ? oy + p.y - 1 : oy + p.y + p.h + 2.5, { align: "center" });
  }
  const yCot = oy + g.alto + 8;
  doc.setDrawColor(0, 0, 0);
  doc.line(ox, yCot, ox + g.ancho, yCot);
  doc.line(ox, yCot - 1.5, ox, yCot + 1.5);
  doc.line(ox + g.ancho, yCot - 1.5, ox + g.ancho, yCot + 1.5);
  doc.setFontSize(8);
  doc.text("ancho " + f(d.W) + " cm (módulos " + f(d.PM) + " + rieles " + f(d.PT - d.PM) + " = " + f(d.PT) + " de profundidad)", ox + g.ancho / 2, yCot + 4, { align: "center" });

  // datos (izquierda) y resultado (derecha)
  const datos = [];
  datos.push("Placard: ancho " + f(d.W) + " cm, profundidad " + f(d.PT) + " cm (módulos " + f(d.PM) + " + rieles " + f(d.PT - d.PM) + ")");
  datos.push("Puertas: " + ps.length + " de " + f(ps[0].w) + " cm, cruce " + f(d.cruce) + " cm; rieles: " + esquemaTexto);
  if (d.luz > 0) datos.push("Luz extra por lado para cajones: " + f(d.luz) + " cm");
  datos.push("");
  datos.push("Módulos (de izquierda a derecha):");
  for (const m of d.modulos) datos.push("   " + m.nombre + ": " + f(m.ancho) + " cm, " + (m.caj ? "con cajones" : "sin cajones") + "  (X " + f(m.x0) + " a " + f(m.x1) + ")");
  datos.push("");
  datos.push("Posición de las puertas en el dibujo (desde la izquierda):");
  ps.forEach((p, i) => datos.push("   P" + (i + 1) + " (" + (p.rail === 0 ? "atrás" : "adelante") + "): X " + f(p.x) + " a " + f(p.x + p.w)));

  const yT = yCot + 12;
  const wCol = (ancho - 8) / 2;
  const xR = M + wCol + 8;
  const lh = 3.6;
  const escribirColumna = (titulo, lineas, x, color) => {
    let y = yT;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...hexRgb(color));
    doc.text(titulo, x, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    const partidas = lineas.flatMap((l) => (l === "" ? [""] : doc.splitTextToSize(l, wCol)));
    return { y, partidas };
  };
  const izq = escribirColumna("Datos", datos, M, AZUL);
  const der = escribirColumna("Resultado del chequeo de superposiciones", res.lineas, xR, res.funciona ? VERDE : ROJO);
  // la columna izquierda entra siempre; la derecha sigue en otra hoja si hace falta
  let y = izq.y;
  for (const l of izq.partidas) { if (y > PH - M) break; doc.text(l, M, y); y += lh; }
  y = der.y;
  let xCol = xR;
  for (const l of der.partidas) {
    if (y > PH - M) {
      xCol = M;
      doc.addPage();
      y = M + 5;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(...hexRgb(res.funciona ? VERDE : ROJO));
      doc.text("Resultado del chequeo (continuación)", M, y);
      y += 5;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(0, 0, 0);
    }
    doc.text(l, xCol, y);
    y += lh;
  }

  const limpio = (t) => t.trim().replace(/[\\/:*?"<>|]/g, "_");
  let nombre = "Placard";
  if (cliente.trim()) nombre += " " + limpio(cliente);
  if (habitacion.trim()) nombre += " - " + limpio(habitacion);
  doc.save(nombre + ".pdf");
}

// ---------------------------------------------------------------- pantalla
const estiloInput = { width: 90, padding: "4px 6px", border: "1px solid #b8c4d0", borderRadius: 4, textAlign: "right" };
const estiloBoton = (bg) => ({
  background: bg, color: "#fff", border: "none", borderRadius: 4, padding: "8px 12px", fontWeight: 600, cursor: "pointer",
});

function cargarGuardado() {
  try {
    const o = JSON.parse(localStorage.getItem(CLAVE_LS) || "null");
    if (o && Array.isArray(o.modulos)) return { ...o, modulos: o.modulos.map((m) => nuevoModulo(m.nombre, m.caj, m.ancho)) };
  } catch { /* nada */ }
  return null;
}

export default function SimulacionPlacard() {
  const guardado = useMemo(cargarGuardado, []);
  const [cliente, setCliente] = useState(guardado?.cliente ?? "");
  const [habitacion, setHabitacion] = useState(guardado?.habitacion ?? "");
  const [ancho, setAncho] = useState(guardado?.ancho ?? "240");
  const [prof, setProf] = useState(guardado?.prof ?? "60");
  const [profMod, setProfMod] = useState(guardado?.profMod ?? "45");
  const [nPuertas, setNPuertas] = useState(guardado?.nPuertas ?? 3);
  const [esquemaIdx, setEsquemaIdx] = useState(guardado?.esquemaIdx ?? 0);
  const [cruce, setCruce] = useState(guardado?.cruce ?? "3");
  const [luz, setLuz] = useState(guardado?.luz ?? "0");
  const [modulos, setModulos] = useState(
    guardado?.modulos ?? [nuevoModulo("Colgar", false, 90), nuevoModulo("Cajonera", true, 60), nuevoModulo("Estantes", false, 90)]
  );
  const [xs, setXs] = useState([]);
  const [res, setRes] = useState(null);
  const [aviso, setAviso] = useState("");

  const rieles = (ESQUEMAS[nPuertas][esquemaIdx] ?? ESQUEMAS[nPuertas][0]).r;
  const esquemaTexto = (ESQUEMAS[nPuertas][esquemaIdx] ?? ESQUEMAS[nPuertas][0]).t;
  const d = useMemo(() => leerDatos({ ancho, prof, profMod, cruce, luz, modulos }), [ancho, prof, profMod, cruce, luz, modulos]);
  const valido = d.err.length === 0;
  const cerradas = useMemo(() => (valido ? puertasCerradas(d.W, d.cruce, rieles) : []), [valido, d.W, d.cruce, rieles]);
  const ps = cerradas.map((p, i) => ({ ...p, x: xs[i] ?? p.x }));

  // al cambiar medidas o puertas: puertas cerradas y sin resultado (hay que volver a chequear)
  const firmaGeo = valido ? [d.W, d.cruce, rieles.join("")].join("|") : "";
  useEffect(() => { setXs([]); }, [firmaGeo]);
  useEffect(() => { setRes(null); }, [ancho, prof, profMod, cruce, luz, modulos, nPuertas, esquemaIdx]);

  useEffect(() => {
    try {
      localStorage.setItem(CLAVE_LS, JSON.stringify({
        cliente, habitacion, ancho, prof, profMod, nPuertas, esquemaIdx, cruce, luz,
        modulos: modulos.map((m) => ({ nombre: m.nombre, caj: m.caj, ancho: m.ancho })),
      }));
    } catch { /* nada */ }
  }, [cliente, habitacion, ancho, prof, profMod, nPuertas, esquemaIdx, cruce, luz, modulos]);

  const moverPuerta = (i, x) => {
    const lim = limitesPuerta(ps, i, d.W);
    const nx = Math.min(lim[1], Math.max(lim[0], x));
    setXs(ps.map((p, j) => (j === i ? nx : p.x)));
  };

  const hacerChequeo = () => {
    if (!valido) return null;
    const r = chequear(d, ps, rieles);
    setRes(r);
    return r;
  };

  const abrirModulo = (id) => {
    const m = d.modulos.find((q) => q.id === id);
    if (!m) return;
    const [a, b] = tramoCajon(m, d.W, d.luz);
    const pl = planAbrir(ps, d.W, a, b);
    if (!pl.ok) { setAviso("No se puede dejar libre " + m.nombre + ": " + pl.motivo + "."); return; }
    setXs(ps.map((p, i) => (pl.x[i] !== undefined ? pl.x[i] : p.x)));
    setAviso(m.nombre + " libre de X " + f(a) + " a " + f(b) + ".");
  };

  const descargarPdf = () => {
    const r = hacerChequeo();
    if (!r) return;
    generarPdf({ d, ps, rieles, esquemaTexto, cliente, habitacion, res: r });
  };

  const cambiarModulo = (id, campo, valor) => setModulos((ms) => ms.map((m) => (m.id === id ? { ...m, [campo]: valor } : m)));
  const moverFila = (i, dir) =>
    setModulos((ms) => {
      const j = i + dir;
      if (j < 0 || j >= ms.length) return ms;
      const c = [...ms];
      [c[i], c[j]] = [c[j], c[i]];
      return c;
    });

  const campo = (titulo, valor, set) => (
    <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 6 }}>
      <span>{titulo}</span>
      <input style={estiloInput} value={valor} onChange={(e) => set(e.target.value)} />
    </label>
  );

  return (
    <div style={{ display: "flex", gap: 16, padding: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
      <div style={{ width: 390, flexShrink: 0, background: "#e8f1f9", padding: 12, borderRadius: 8 }}>
        <h3 style={{ margin: "0 0 10px", color: AZUL }}>Simulación de placard</h3>
        <label style={{ display: "block", marginBottom: 6 }}>
          Cliente
          <input style={{ ...estiloInput, width: "100%", textAlign: "left" }} value={cliente} onChange={(e) => setCliente(e.target.value)} />
        </label>
        <label style={{ display: "block", marginBottom: 10 }}>
          Habitación
          <input style={{ ...estiloInput, width: "100%", textAlign: "left" }} value={habitacion} onChange={(e) => setHabitacion(e.target.value)} />
        </label>
        {campo("Ancho total (cm)", ancho, setAncho)}
        {campo("Profundidad total (cm)", prof, setProf)}
        {campo("Profundidad de módulos (cm)", profMod, setProfMod)}
        <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <span>Puertas</span>
          <select style={{ ...estiloInput, textAlign: "left" }} value={nPuertas} onChange={(e) => { setNPuertas(Number(e.target.value)); setEsquemaIdx(0); }}>
            {[2, 3, 4].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
        <label style={{ display: "block", marginBottom: 6 }}>
          Rieles
          <select style={{ ...estiloInput, width: "100%", textAlign: "left" }} value={esquemaIdx} onChange={(e) => setEsquemaIdx(Number(e.target.value))}>
            {ESQUEMAS[nPuertas].map((e, i) => <option key={i} value={i}>{e.t}</option>)}
          </select>
        </label>
        {campo("Cruce entre puertas (cm)", cruce, setCruce)}
        {campo("Luz extra por lado para cajones (cm)", luz, setLuz)}

        <h4 style={{ margin: "12px 0 6px", color: AZUL }}>Módulos (de izquierda a derecha)</h4>
        <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "#d5e3f0" }}>
              <th style={{ textAlign: "left", padding: 4 }}>Nombre</th>
              <th style={{ padding: 4 }}>Cajones</th>
              <th style={{ padding: 4 }}>Ancho</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {modulos.map((m, i) => (
              <tr key={m.id} style={{ borderTop: "1px solid #e3e3e3" }}>
                <td style={{ padding: 3 }}>
                  <input style={{ ...estiloInput, width: 110, textAlign: "left" }} value={m.nombre} onChange={(e) => cambiarModulo(m.id, "nombre", e.target.value)} />
                </td>
                <td style={{ textAlign: "center" }}>
                  <input type="checkbox" checked={m.caj} onChange={(e) => cambiarModulo(m.id, "caj", e.target.checked)} />
                </td>
                <td style={{ padding: 3 }}>
                  <input style={{ ...estiloInput, width: 60 }} value={m.ancho} onChange={(e) => cambiarModulo(m.id, "ancho", e.target.value)} />
                </td>
                <td style={{ whiteSpace: "nowrap" }}>
                  <button title="Subir" onClick={() => moverFila(i, -1)} style={{ border: "none", background: "none", cursor: "pointer" }}>▲</button>
                  <button title="Bajar" onClick={() => moverFila(i, 1)} style={{ border: "none", background: "none", cursor: "pointer" }}>▼</button>
                  {m.caj && valido && (
                    <button title="Correr las puertas para dejarlo libre" onClick={() => abrirModulo(m.id)} style={{ border: "none", background: "none", cursor: "pointer" }}>🚪</button>
                  )}
                  <button title="Quitar" onClick={() => setModulos((ms) => ms.filter((q) => q.id !== m.id))} style={{ border: "none", background: "none", cursor: "pointer", color: ROJO }}>✕</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button style={{ ...estiloBoton("#5a7a96"), marginTop: 6, padding: "4px 10px" }} onClick={() => setModulos((ms) => [...ms, nuevoModulo()])}>+ Módulo</button>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 12 }}>
          <button style={{ ...estiloBoton("#ff8c00"), gridColumn: "1 / 3" }} onClick={hacerChequeo} disabled={!valido}>Chequear superposiciones</button>
          <button style={estiloBoton(AZUL)} onClick={() => { setXs([]); setAviso(""); }}>Cerrar puertas</button>
          <button style={estiloBoton("#963c28")} onClick={descargarPdf} disabled={!valido}>Descargar PDF</button>
        </div>

        {!valido && <div style={{ marginTop: 10, color: ROJO }}>Revisá: {d.err.join(", ")}.</div>}
        {aviso && <div style={{ marginTop: 10, fontSize: 13 }}>{aviso}</div>}
        {res && (
          <div style={{ marginTop: 10, padding: 8, borderRadius: 6, background: res.funciona ? "#c8f0c8" : "#facdcd", fontSize: 13, whiteSpace: "pre-wrap" }}>
            <div style={{ fontWeight: 700, color: res.funciona ? VERDE : ROJO, marginBottom: 4 }}>{res.funciona ? "FUNCIONA" : "NO FUNCIONA"}</div>
            {res.lineas.slice(1).join("\n")}
          </div>
        )}
      </div>

      <div style={{ flex: 1, minWidth: 480 }}>
        <div style={{ fontSize: 12, color: "#666", marginBottom: 6 }}>
          Verde = cajones libres para abrir · Rojo = cajones tapados por una puerta · Amarillo = puertas cruzadas · Azul = riel de atrás · Verde agua = riel de adelante
        </div>
        {valido && ps.length > 0 && <Planta d={d} ps={ps} funciona={res ? res.funciona : null} />}
        {valido && ps.map((p, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
            <span style={{ width: 210, fontSize: 13 }}>
              P{i + 1} ({p.rail === 0 ? "riel de atrás" : "riel de adelante"}, {f(p.w)} cm)
            </span>
            <input type="range" min={0} max={Math.max(0.1, d.W - p.w)} step={0.1} value={p.x}
              onChange={(e) => moverPuerta(i, Number(e.target.value))} style={{ flex: 1 }} />
            <span style={{ width: 70, fontSize: 12, textAlign: "right" }}>X {f(p.x)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
