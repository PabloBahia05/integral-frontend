/**
 * VistaPrevia
 * -----------
 * Dibuja en SVG una lista de "formas" para comparar el archivo original con
 * el rotado. Lo usan RotarBPP.jsx y RotarDXF.jsx (van en la misma carpeta).
 *
 * Coordenadas: las formas vienen en coordenadas de mundo (eje Y hacia
 * arriba, como en CAD / Biesse). Acá se invierte Y para dibujar en pantalla.
 *
 * Formas soportadas:
 *   { t: "rect",   x, y, w, h }
 *   { t: "line",   x1, y1, x2, y2 }
 *   { t: "poly",   pts: [[x,y],...], cerrada }
 *   { t: "circle", cx, cy, r, relleno? }
 *   { t: "arc",    cx, cy, r, a0, a1 }        (grados, antihorario)
 *   { t: "text",   x, y, h, txt, rot }
 *   { t: "cross",  x, y }                     (INSERT / POINT)
 */

function calcularBounds(formas) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const add = (x, y) => {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  };
  for (const f of formas) {
    if (f.t === "rect") { add(f.x, f.y); add(f.x + f.w, f.y + f.h); }
    else if (f.t === "line") { add(f.x1, f.y1); add(f.x2, f.y2); }
    else if (f.t === "poly") f.pts.forEach(([x, y]) => add(x, y));
    else if (f.t === "circle" || f.t === "arc") { add(f.cx - f.r, f.cy - f.r); add(f.cx + f.r, f.cy + f.r); }
    else if (f.t === "text") { add(f.x, f.y); add(f.x + (f.txt?.length || 1) * f.h * 0.6, f.y + f.h); }
    else if (f.t === "cross") add(f.x, f.y);
  }
  if (!Number.isFinite(minX)) return null;
  return { minX, minY, maxX, maxY };
}

const COLOR = "#0a3a5c";

export default function VistaPrevia({ titulo, detalle, formas, origen, colorTitulo = "#0a3a5c" }) {
  const b = formas && formas.length ? calcularBounds(formas) : null;

  let contenido;
  if (!b) {
    contenido = (
      <div style={{ height: 320, display: "flex", alignItems: "center", justifyContent: "center", color: "#999", fontSize: 13 }}>
        Sin vista previa
      </div>
    );
  } else {
    const w = Math.max(b.maxX - b.minX, 1e-6);
    const h = Math.max(b.maxY - b.minY, 1e-6);
    const span = Math.max(w, h);
    const pad = span * 0.06;
    const vb = `${b.minX - pad} ${-(b.maxY + pad)} ${w + pad * 2} ${h + pad * 2}`;
    const cruz = span * 0.012;
    const o = origen || { x: b.minX, y: b.minY };
    const sw = { stroke: COLOR, strokeWidth: 1.3, fill: "none", vectorEffect: "non-scaling-stroke" };

    const dibujar = (f, i) => {
      switch (f.t) {
        case "rect":
          return <rect key={i} x={f.x} y={f.y} width={f.w} height={f.h} {...sw} stroke="#6f8fa8" />;
        case "line":
          return <line key={i} x1={f.x1} y1={f.y1} x2={f.x2} y2={f.y2} {...sw} />;
        case "poly": {
          const d = f.pts.map(([x, y]) => `${x},${y}`).join(" ");
          return f.cerrada
            ? <polygon key={i} points={d} {...sw} />
            : <polyline key={i} points={d} {...sw} />;
        }
        case "circle":
          return <circle key={i} cx={f.cx} cy={f.cy} r={f.r} {...sw} fill={f.relleno ? COLOR : "none"} fillOpacity={f.relleno ? 0.75 : 0} />;
        case "arc": {
          const rad = (g) => (g * Math.PI) / 180;
          const x0 = f.cx + f.r * Math.cos(rad(f.a0));
          const y0 = f.cy + f.r * Math.sin(rad(f.a0));
          const x1 = f.cx + f.r * Math.cos(rad(f.a1));
          const y1 = f.cy + f.r * Math.sin(rad(f.a1));
          const barrido = (((f.a1 - f.a0) % 360) + 360) % 360;
          return <path key={i} d={`M ${x0} ${y0} A ${f.r} ${f.r} 0 ${barrido > 180 ? 1 : 0} 1 ${x1} ${y1}`} {...sw} />;
        }
        case "text":
          return (
            <text
              key={i}
              transform={`translate(${f.x} ${f.y}) scale(1 -1) rotate(${-(f.rot || 0)})`}
              fontSize={f.h}
              fill={COLOR}
              fontFamily="sans-serif"
            >
              {f.txt}
            </text>
          );
        case "cross":
          return (
            <g key={i} {...sw} stroke="#8a5a00">
              <line x1={f.x - cruz} y1={f.y} x2={f.x + cruz} y2={f.y} />
              <line x1={f.x} y1={f.y - cruz} x2={f.x} y2={f.y + cruz} />
            </g>
          );
        default:
          return null;
      }
    };

    contenido = (
      <svg viewBox={vb} preserveAspectRatio="xMidYMid meet" style={{ width: "100%", height: 320, display: "block" }}>
        <g transform="scale(1 -1)">
          {formas.map(dibujar)}
          <circle cx={o.x} cy={o.y} r={cruz * 1.1} fill="#d32f2f" />
        </g>
      </svg>
    );
  }

  return (
    <div style={{ flex: "1 1 380px", minWidth: 280, border: "1.5px solid #b8d6ef", borderRadius: 8, overflow: "hidden", background: "#fff" }}>
      <div style={{ background: colorTitulo, color: "#fff", padding: "8px 12px", fontSize: 13, fontWeight: "bold" }}>
        {titulo}
      </div>
      <div style={{ background: "#fafcfe" }}>{contenido}</div>
      <div style={{ padding: "6px 12px", fontSize: 11.5, color: "#555", borderTop: "1px solid #e3eef8", minHeight: 18 }}>
        {detalle}
        {b && (
          <span style={{ color: "#d32f2f" }}>{detalle ? " · " : ""}● punto rojo = origen (0,0)</span>
        )}
      </div>
    </div>
  );
}
