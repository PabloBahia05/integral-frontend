// PlanoMamparas.jsx
// Busca presupuestos de mamparas, permite cargar medidas de producción
// y genera el plano (PDF) con el botón "Hacer plano".
import { useState, useEffect } from "react";
import { jsPDF } from "jspdf";
import ModelosPlano from "./ModelosPlano";

const EMPTY = { ancho_prod: "", alto_prod: "", prof_prod: "" };

/* ---------- Dibujo del plano ---------- */
const fmt = (n) => (Number.isInteger(n) ? String(n) : Number(n).toFixed(1));

// Cotas de un agujero: lado de referencia horizontal (el más cercano) y vertical (tope si está a <=100, si no piso)
function cotasDe(pf) {
  const izq = pf.x <= pf.dDer;
  const desdeTope = pf.dTope != null && pf.dTope <= 100;
  return {
    izq,
    dx: izq ? pf.x : pf.dDer,
    desdeTope,
    dy: desdeTope ? pf.dTope : pf.y,
  };
}

function dibujarPlano(d) {
  const { mampara: m, herraje, plano, codigo, dim, piezas, perforaciones } = d;
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pres = [m.numeropres, m.presm].filter(Boolean).join(" / ") || `ID ${m.id}`;

  /* --- Encabezado --- */
  doc.setFont("helvetica", "bold").setFontSize(14);
  doc.text(`PLANO DE CORTE - ${plano.descripcion}`, 10, 12);
  doc.setFont("helvetica", "normal").setFontSize(9);
  doc.text(
    `Presupuesto: ${pres}   Rev: ${m.revision ?? 0}   Cliente: ${m.codcliente || "-"}   Cant.: ${m.cantidad ?? 1}   Plano: ${codigo}`,
    10, 18,
  );
  doc.text(`Modelo: ${m.modelo ?? "-"}`, 10, 23);
  doc.text(
    `Medidas de produccion: ancho ${fmt(dim.dimX)} x alto ${fmt(dim.dimY)}` +
      (dim.prof ? ` x prof ${fmt(dim.prof)}` : "") +
      " mm" +
      (dim.unidadOrigen === "cm" ? "  (cargadas en cm, convertidas a mm)" : ""),
    10, 28,
  );

  /* --- Vista general (izquierda arriba) --- */
  const fijo = piezas.find((p) => p.pieza === "FIJO");
  const puerta = piezas.find((p) => p.pieza === "PUERTA");
  // Recta 2F+2M: fijo-puerta-puerta-fijo. Esquina: cada lado es 1 fijo + 1 puerta (se repite en los 2 lados).
  const secuencia =
    plano.config === "RECTA" && plano.fijos >= 2 ? ["FIJO", "PUERTA", "PUERTA", "FIJO"] : ["FIJO", "PUERTA"];
  const gx = 10, gy = 34, gw = 140, gh = 82;
  const s1 = Math.min((gw - 16) / dim.dimX, (gh - 16) / dim.dimY);
  const tw = dim.dimX * s1, th = dim.dimY * s1;
  const ox = gx + 12 + (gw - 16 - tw) / 2, oy = gy + 2;
  doc.setLineWidth(0.2).setDrawColor(150).rect(ox, oy, tw, th);
  doc.setDrawColor(0).setLineWidth(0.4);
  secuencia.forEach((tipo, i) => {
    const pz = tipo === "FIJO" ? fijo : puerta;
    if (!pz) return;
    const pw = pz.ancho * s1, ph = pz.alto * s1;
    const px = ox + (secuencia.length > 1 ? (i * (dim.dimX - pz.ancho) * s1) / (secuencia.length - 1) : 0);
    const py = oy + th - ph;
    doc.setFillColor(tipo === "FIJO" ? 232 : 205, tipo === "FIJO" ? 240 : 225, 250);
    doc.rect(px, py, pw, ph, "FD");
    doc.setFontSize(8).text(tipo === "FIJO" ? "Paño fijo" : "Puerta", px + pw / 2, py + ph / 2, { align: "center" });
  });
  doc.setLineWidth(0.2).setFontSize(8);
  doc.line(ox, oy + th + 5, ox + tw, oy + th + 5);
  doc.text(`Ancho total ${fmt(dim.dimX)}`, ox + tw / 2, oy + th + 9, { align: "center" });
  doc.line(ox - 5, oy, ox - 5, oy + th);
  doc.text(`Alto total ${fmt(dim.dimY)}`, ox - 7, oy + th / 2, { angle: 90, align: "center" });
  if (plano.config === "ESQUINA") {
    doc.setFontSize(7).text("Esquina: se repite en los 2 lados (ancho total medido de afuera a afuera)", gx, gy + gh - 1);
  }

  /* --- Piezas de corte con agujeros (derecha) --- */
  const ax = 160, aTop = 50, aW = 122, aH = plano.vidrio === "8MM" ? 138 : 128;
  const aDibujar = piezas.filter((p) => p.pieza === "FIJO" || p.pieza === "PUERTA");
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
    cota(bordeX, yl, hx, yl);
    doc.text(fmt(c.dx), (bordeX + hx) / 2, yl - 1.2, { align: "center" });

    // cota vertical: del tope/piso de referencia al centro del agujero (por fuera de la pieza)
    const bordeY = c.desdeTope ? pos.y : pos.y + pos.h;
    const xl = c.izq ? pos.x - 5 : pos.x + pos.w + 5;
    ext(c.izq ? pos.x : pos.x + pos.w, bordeY, xl + (c.izq ? -1 : 1), bordeY);
    ext(hx, hy, xl + (c.izq ? -1 : 1), hy);
    cota(xl, bordeY, xl, hy);
    const ym = (bordeY + hy) / 2 + 0.8;
    doc.text(fmt(c.dy), c.izq ? xl - 1.5 : xl + 1.5, ym, { align: c.izq ? "right" : "left" });

    // diámetro
    doc.setTextColor(200, 0, 0).setFont("helvetica", "bold");
    doc.text(`Ø${fmt(pf.diametro)}`, hx, hy + r + 3.2, { align: "center" });
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
  let y = 124;
  const linea = (txt, bold = false, size = 8) => {
    if (y > 200) { doc.addPage(); y = 15; }
    doc.setFont("helvetica", bold ? "bold" : "normal").setFontSize(size);
    const partes = doc.splitTextToSize(txt, 142);
    doc.text(partes, 10, y);
    y += partes.length * (size * 0.42) + 1.2;
  };

  linea("LISTA DE CORTE", true, 10);
  piezas.forEach((p) => linea(`${p.nombre}: ${p.cant} u.  -  ${fmt(p.ancho)} x ${fmt(p.alto)} mm`));
  y += 2;
  linea("PERFORACIONES (cotas)", true, 10);
  perforaciones.forEach((pf, i) => {
    const c = cotasDe(pf);
    linea(
      `${i + 1}. ${pf.nombre} [${pf.pieza}]  Ø${fmt(pf.diametro)}  -  a ${fmt(c.dx)} del lateral ${c.izq ? "izq." : "der."}` +
        (pf.pieza !== "PERFIL" ? `  -  a ${fmt(c.dy)} del ${c.desdeTope ? "tope" : "piso"}` : ""),
    );
  });
  y += 2;
  linea("HERRAJE", true, 10);
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

  doc.save(`PLANO-${m.presm || m.numeropres || m.id}-REV${m.revision ?? 0}.pdf`);
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
  const [requiere, setRequiere] = useState({}); // modelo -> lleva plano (0/1)

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

  const hacerPlano = async () => {
    if (!sel) return;
    setLoading(true); setMsg("");
    try {
      const r = await authFetch(`${API}/mamparas-plano/${sel.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, unidad }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Error al generar plano");
      if (!data.plano) {
        setMsg(data.aviso || "No se encontró un plano para este modelo");
        buscar();
        return;
      }
      dibujarPlano(data);
      setMsg(`Plano generado (${data.codigo}, medidas en ${data.dim.unidadOrigen})`);
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
            {["Pres.", "Mamp.", "Rev.", "Cliente", "Modelo", "Ancho", "Alto", "Ancho prod", "Alto prod", "Prof prod", "Lleva plano"].map((h) => (
              <th key={h} style={{ textAlign: "left", borderBottom: "1px solid #ccc", padding: "4px 10px", whiteSpace: "nowrap" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.id}
              onClick={() => elegir(r)}
              style={{ cursor: "pointer", background: sel?.id === r.id ? "#e3f2fd" : "transparent" }}
            >
              <td style={{ padding: "4px 10px" }}>{r.numeropres}</td><td style={{ padding: "4px 10px" }}>{r.presm}</td><td style={{ padding: "4px 10px" }}>{r.revision}</td>
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
          <button onClick={hacerPlano} disabled={loading || !requiere[sel.modelo]}>
            {loading ? "Generando..." : "Hacer plano"}
          </button>
        </div>
      )}

      {sel && !requiere[sel.modelo] && <p>Este modelo no lleva plano.</p>}
      {msg && <p>{msg}</p>}
    </div>
  );
}
