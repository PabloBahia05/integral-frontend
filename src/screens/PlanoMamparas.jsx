// PlanoMamparas.jsx
// Busca presupuestos de mamparas, permite cargar medidas de producción
// y genera el plano (PDF) con el botón "Hacer plano".
import { useState, useEffect } from "react";
import { jsPDF } from "jspdf";
import ModelosPlano from "./ModelosPlano";

const EMPTY = { ancho_prod: "", alto_prod: "", prof_prod: "" };

/* ---------- Dibujo del plano ---------- */
function dibujarPlano({ mampara: m, herraje }) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const W = 297, H = 210;

  doc.setFont("courier", "bold").setFontSize(14);
  doc.text(`PLANO MAMPARA  P${m.numeropres}-M${m.presm}  REV ${m.revision ?? 0}`, 10, 12);
  doc.setFont("courier", "normal").setFontSize(9);
  doc.text(
    `Cliente: ${m.codcliente ?? "-"}   Modelo: ${m.modelo ?? "-"}   Cant: ${m.cantidad ?? 1}   ` +
      `Vidrio: ${m.vidrio ?? "-"}   Colocacion: ${m.colocacion ?? "-"}`,
    10, 18
  );

  // Área de dibujo (izquierda) — escala para que entre el rectángulo
  const areaX = 25, areaY = 35, areaW = 170, areaH = 130;
  const esc = Math.min(areaW / m.ancho_prod, areaH / m.alto_prod);
  const w = m.ancho_prod * esc, h = m.alto_prod * esc;
  const x0 = areaX + (areaW - w) / 2, y0 = areaY + (areaH - h) / 2;

  doc.setLineWidth(0.6).rect(x0, y0, w, h);

  // TODO modelo paramétrico: acá se dibujan paños/perforaciones evaluando
  // las fórmulas del modelo con dimX = ancho_prod, dimY = alto_prod.
  // Por ahora: guía central de paños si el modelo es de 2 hojas ("(/ dimX 2)").
  doc.setLineDashPattern([2, 2], 0).setLineWidth(0.2);
  doc.line(x0 + w / 2, y0, x0 + w / 2, y0 + h);
  doc.setLineDashPattern([], 0);

  // Cotas
  doc.setFontSize(10).setLineWidth(0.3);
  const cy = y0 + h + 8;
  doc.line(x0, cy, x0 + w, cy);
  doc.text(`${m.ancho_prod} mm`, x0 + w / 2, cy + 5, { align: "center" });
  const cx = x0 - 8;
  doc.line(cx, y0, cx, y0 + h);
  doc.text(`${m.alto_prod} mm`, cx - 2, y0 + h / 2, { angle: 90, align: "center" });
  if (m.prof_prod) {
    doc.setFontSize(9).text(`Prof: ${m.prof_prod} mm`, x0 + w / 2, y0 - 4, { align: "center" });
  }

  // Herraje (derecha)
  const hx = 205;
  doc.setFont("courier", "bold").setFontSize(10).text("HERRAJE", hx, 38);
  doc.setFont("courier", "normal").setFontSize(8);
  let y = 45;
  if (!herraje.length) doc.text("(sin herraje cargado)", hx, y);
  herraje.forEach((hj) => {
    const nombre = doc.splitTextToSize(String(hj.articulo), 60);
    doc.text(nombre, hx, y);
    doc.text(`Valor: ${hj.valor ?? "-"}`, hx, y + nombre.length * 3.5);
    y += nombre.length * 3.5 + 6;
    if (y > H - 15) { doc.addPage(); y = 20; }
  });

  doc.setFontSize(7).text(
    `Medidas presupuesto: ${m.ancho} x ${m.alto}   |   Generado ${new Date().toLocaleDateString("es-AR")}`,
    10, H - 6
  );

  doc.save(`PLANO-P${m.numeropres}-M${m.presm}-REV${m.revision ?? 0}.pdf`);
}

/* ---------- Pantalla ---------- */
export default function PlanoMamparas({ authFetch, API }) {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState([]);
  const [sel, setSel] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState("plano");
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
        body: JSON.stringify(form),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Error al generar plano");
      dibujarPlano(data);
      setMsg("Plano generado");
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
        <h2>Planos de mamparas</h2>
        {tabs}
        <ModelosPlano authFetch={authFetch} API={API} />
      </div>
    );
  }

  return (
    <div style={{ padding: 16 }}>
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
              <th key={h} style={{ textAlign: "left", borderBottom: "1px solid #ccc" }}>{h}</th>
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
              <td>{r.numeropres}</td><td>{r.presm}</td><td>{r.revision}</td>
              <td>{r.codcliente}</td><td>{r.modelo}</td>
              <td>{r.ancho}</td><td>{r.alto}</td>
              <td>{r.ancho_prod ?? "-"}</td><td>{r.alto_prod ?? "-"}</td><td>{r.prof_prod ?? "-"}</td><td>{requiere[r.modelo] ? "Sí" : "No"}</td>
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
