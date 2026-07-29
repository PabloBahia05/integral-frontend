import { useState, useMemo } from "react";

const SLOTS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

// Precio "de lista" de un artículo: la tabla productos guarda precios por
// línea en un objeto `precios` (ej. {"1": 123.45, "2": 130}). Tomamos la
// línea 1 como default; si no existe, el primer valor disponible; si no hay
// objeto `precios`, probamos un campo plano `precio`.
const precioDeArticulo = (a) => {
  if (!a) return "";
  if (a.precios && typeof a.precios === "object") {
    const v = a.precios["1"] ?? Object.values(a.precios)[0];
    if (v != null && v !== "") return v;
  }
  return a.precio ?? "";
};

// El precio de cada artículo asociado NO se carga ni se guarda acá: se
// busca después, en Mampara/Presupuesto, en la tabla `articulos` usando el
// código guardado en art${n}. Acá solo se define QUÉ artículo, cantidad,
// margen y (opcional) fórmula corresponde a cada slot.
const EMPTY = () => ({
  codartint: "",
  articulo: "",
  codf: "",
  form: "",
  cod1: "",
  art1: "",
  cant1: 1,
  margen1: "",
  form1: "",
  cod2: "",
  art2: "",
  cant2: 1,
  margen2: "",
  form2: "",
  cod3: "",
  art3: "",
  cant3: 1,
  margen3: "",
  form3: "",
  cod4: "",
  art4: "",
  cant4: 1,
  margen4: "",
  form4: "",
  cod5: "",
  art5: "",
  cant5: 1,
  margen5: "",
  form5: "",
  cod6: "",
  art6: "",
  cant6: 1,
  margen6: "",
  form6: "",
  cod7: "",
  art7: "",
  cant7: 1,
  margen7: "",
  form7: "",
  cod8: "",
  art8: "",
  cant8: 1,
  margen8: "",
  form8: "",
  cod9: "",
  art9: "",
  cant9: 1,
  margen9: "",
  form9: "",
  cod10: "",
  art10: "",
  cant10: 1,
  margen10: "",
  form10: "",
});

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap');

  .ar { font-family:'DM Sans',sans-serif; background:#f0f4f8; min-height:100vh; padding:32px 28px; color:#1a2332; }

  .ar-hdr { display:flex; align-items:flex-end; justify-content:space-between; margin-bottom:28px; }
  .ar-eyebrow { font-size:11px; font-weight:500; letter-spacing:.14em; text-transform:uppercase; color:#7a92b0; }
  .ar-title { font-family:'Syne',sans-serif; font-size:32px; font-weight:800; color:#0f1f35; line-height:1; display:flex; align-items:center; gap:10px; }
  .ar-icon { width:38px; height:38px; background:linear-gradient(135deg,#2563eb,#1e40af); border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:18px; }

  .ar-bar { display:flex; gap:12px; margin-bottom:20px; align-items:center; }
  .ar-sw { position:relative; flex:1; max-width:340px; }
  .ar-si { position:absolute; left:13px; top:50%; transform:translateY(-50%); color:#94a3b8; font-size:15px; pointer-events:none; }
  .ar-s { width:100%; padding:10px 14px 10px 38px; border:1.5px solid #dde4ef; border-radius:10px; background:#fff; font-family:'DM Sans',sans-serif; font-size:14px; color:#1a2332; outline:none; box-sizing:border-box; }
  .ar-s:focus { border-color:#2563eb; box-shadow:0 0 0 3px rgba(37,99,235,.1); }
  .ar-s::placeholder { color:#aab5c8; }
  .ar-count { margin-left:auto; font-size:13px; color:#7a92b0; }

  .btn-add { padding:10px 20px; background:linear-gradient(135deg,#2563eb,#1d4ed8); color:#fff; border:none; border-radius:10px; font-family:'Syne',sans-serif; font-size:14px; font-weight:700; cursor:pointer; display:flex; align-items:center; gap:6px; box-shadow:0 4px 12px rgba(37,99,235,.3); white-space:nowrap; transition:transform .15s,box-shadow .15s; }
  .btn-add:hover { transform:translateY(-1px); }

  .ar-card { background:#fff; border-radius:16px; box-shadow:0 2px 16px rgba(15,31,53,.07); overflow:hidden; border:1px solid #e8edf5; }
  .ar-wrap { overflow-x:auto; }
  .ar-tbl { width:100%; border-collapse:collapse; font-size:13px; }
  .ar-tbl thead tr { background:#f7f9fc; border-bottom:2px solid #e8edf5; }
  .ar-tbl th { padding:11px 14px; text-align:left; font-family:'Syne',sans-serif; font-size:11px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; color:#7a92b0; white-space:nowrap; }
  .ar-tbl th:first-child { padding-left:18px; }
  .ar-tbl th:last-child  { padding-right:18px; text-align:right; }
  .ar-tbl td { padding:10px 14px; vertical-align:top; color:#334155; }
  .ar-tbl td:first-child { padding-left:18px; }
  .ar-tbl td:last-child  { padding-right:18px; text-align:right; }

  .row-normal { border-bottom:1px solid #f0f4f8; cursor:pointer; transition:background .12s; }
  .row-normal:hover { background:#f7f9ff; }
  .row-sel { background:#eff4ff; border-bottom:1px solid #dbeafe; cursor:pointer; }
  .row-edit-hdr { background:#f0f6ff; border-top:2px solid #2563eb; }
  .row-edit-body { background:#f7faff; border-bottom:2px solid #2563eb; }

  .b-id   { display:inline-flex; align-items:center; justify-content:center; width:28px; height:28px; background:#eff4ff; color:#2563eb; border-radius:7px; font-family:'Syne',sans-serif; font-size:12px; font-weight:700; }
  .b-cod  { display:inline-block; padding:2px 7px; background:#f1f5f9; color:#475569; border-radius:5px; font-size:12px; font-family:monospace; }
  .b-rubro { display:inline-block; padding:2px 7px; background:#eff4ff; color:#2563eb; border-radius:5px; font-size:11px; font-weight:600; }
  .b-form { display:inline-block; padding:2px 6px; background:#fef3c7; color:#92400e; border-radius:4px; font-size:11px; font-weight:700; font-family:monospace; margin-top:2px; }
  .b-mg   { display:inline-flex; align-items:center; padding:1px 6px; background:#ecfdf5; color:#059669; border-radius:4px; font-size:11px; font-weight:600; margin-top:2px; }
  .b-pr   { display:inline-flex; align-items:center; padding:1px 6px; background:#eff4ff; color:#2563eb; border-radius:4px; font-size:11px; font-weight:700; margin-top:2px; font-family:'Syne',sans-serif; }
  .sv  { display:flex; flex-direction:column; gap:2px; min-width:90px; }
  .sv-art { font-size:12px; font-weight:500; color:#1a2332; }
  .sv-sub { font-size:11px; color:#94a3b8; font-family:monospace; }
  .sv-mt  { color:#cbd5e1; }

  .ar-acts { display:flex; gap:5px; justify-content:flex-end; }
  .bic { width:30px; height:30px; border:none; border-radius:7px; cursor:pointer; display:flex; align-items:center; justify-content:center; font-size:13px; transition:background .15s,transform .1s; }
  .bic:hover { transform:scale(1.08); }
  .bic-ed { background:#eff4ff; } .bic-ed:hover { background:#dbeafe; }
  .bic-dl { background:#fff1f0; } .bic-dl:hover { background:#fee2e2; }
  .bic-dup { background:#f0fdf4; } .bic-dup:hover { background:#bbf7d0; }
  .bic-ok { background:#dcfce7; } .bic-ok:hover { background:#bbf7d0; }
  .bic-cx { background:#f1f5f9; } .bic-cx:hover { background:#e2e8f0; }

  .ar-empty { display:flex; flex-direction:column; align-items:center; padding:60px 20px; gap:10px; color:#94a3b8; }

  /* panel edición inline */
  .ep { padding:16px 18px 20px; }
  .ep-sec { font-size:10px; font-weight:700; color:#7a92b0; text-transform:uppercase; letter-spacing:.1em; margin-bottom:8px; padding-bottom:6px; border-bottom:1px solid #e0eaf5; }
  .ep-padre { display:grid; grid-template-columns:160px 1fr 130px 130px; gap:10px; margin-bottom:16px; }
  .ep-lbl { font-size:10px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:.06em; margin-bottom:3px; }
  .ep-sel, .ep-inp { width:100%; padding:7px 10px; border:1.5px solid #dde4ef; border-radius:8px; background:#fff; font-family:'DM Sans',sans-serif; font-size:13px; color:#1a2332; outline:none; box-sizing:border-box; transition:border-color .2s; }
  .ep-sel:focus, .ep-inp:focus { border-color:#2563eb; }
  .ep-inp.ro { background:#f7f9fc; color:#64748b; font-family:monospace; font-size:11px; cursor:default; }

  .slots-wrap { display:grid; grid-template-columns:repeat(5,1fr); gap:8px; margin-bottom:16px; }
  @media(max-width:700px) { .slots-wrap{ grid-template-columns:repeat(2,1fr); } .ep-padre{ grid-template-columns:1fr; } }

  .sc { background:#f7f9fc; border:1.5px solid #e8edf5; border-radius:10px; padding:10px; display:flex; flex-direction:column; gap:6px; transition:border-color .2s; }
  .sc:has(select[data-on="true"]) { border-color:#bfdbfe; background:#f0f6ff; }
  .sc-num { font-family:'Syne',sans-serif; font-size:10px; font-weight:700; color:#2563eb; text-transform:uppercase; letter-spacing:.08em; }
  .sc-sel, .sc-inp { width:100%; padding:6px 8px; border:1.5px solid #dde4ef; border-radius:6px; background:#fff; font-family:'DM Sans',sans-serif; font-size:11px; color:#1a2332; outline:none; box-sizing:border-box; transition:border-color .2s; }
  .sc-sel:focus, .sc-inp:focus { border-color:#2563eb; }
  .sc-inp.ro { background:#f7f9fc; color:#64748b; font-family:monospace; font-size:10px; cursor:default; }
  .sc-mg { width:100%; padding:6px 8px; border:1.5px solid #dde4ef; border-radius:6px; background:#fff; font-family:'DM Sans',sans-serif; font-size:11px; color:#059669; font-weight:600; outline:none; box-sizing:border-box; }
  .sc-mg::placeholder { color:#94a3b8; font-weight:400; }
  .sc-mg:focus { border-color:#059669; }
  .sc-cant-row { display:flex; align-items:center; gap:6px; }
  .sc-cant-lbl { font-size:9px; font-weight:700; color:#7a92b0; text-transform:uppercase; letter-spacing:.05em; white-space:nowrap; }
  .sc-cant { width:100%; padding:6px 8px; border:1.5px solid #bfdbfe; border-radius:6px; background:#f0f6ff; font-family:'Syne',sans-serif; font-size:12px; font-weight:700; color:#2563eb; outline:none; box-sizing:border-box; text-align:center; }
  .sc-cant:focus { border-color:#2563eb; }
  .b-cant { display:inline-flex; align-items:center; padding:1px 6px; background:#eff4ff; color:#2563eb; border-radius:4px; font-size:11px; font-weight:700; margin-top:2px; font-family:'Syne',sans-serif; }
  .sc-fl { font-size:9px; font-weight:700; color:#92400e; text-transform:uppercase; letter-spacing:.06em; }
  .sc-fs { width:100%; padding:6px 8px; border:1.5px solid #fde68a; border-radius:6px; background:#fffbeb; font-family:monospace; font-size:10px; color:#92400e; font-weight:700; outline:none; box-sizing:border-box; cursor:pointer; }
  .sc-fs:focus { border-color:#f59e0b; }

  .sc-modo { display:flex; gap:4px; background:#eef2f7; border-radius:6px; padding:3px; }
  .sc-modo-btn { flex:1; border:none; background:transparent; padding:5px 6px; font-family:'Syne',sans-serif; font-size:9px; font-weight:700; letter-spacing:.04em; text-transform:uppercase; color:#7a92b0; border-radius:5px; cursor:pointer; transition:background .15s,color .15s; }
  .sc-modo-btn.on-precio { background:#fff; color:#2563eb; box-shadow:0 1px 3px rgba(15,31,53,.12); }
  .sc-modo-btn.on-formula { background:#fff; color:#92400e; box-shadow:0 1px 3px rgba(15,31,53,.12); }
  .sc-auto { padding:6px 8px; background:#f0f6ff; border:1.5px dashed #bfdbfe; border-radius:6px; font-size:10.5px; color:#3b5a82; }
  .sc-auto strong { color:#2563eb; }

  .sv-auto { color:#94a3b8; font-size:10.5px; font-style:italic; }

  .ep-acts { display:flex; gap:8px; justify-content:flex-end; padding-top:12px; border-top:1px solid #e0eaf5; }
  .ep-save   { padding:8px 20px; background:linear-gradient(135deg,#2563eb,#1d4ed8); border:none; border-radius:8px; font-family:'Syne',sans-serif; font-size:13px; font-weight:700; color:#fff; cursor:pointer; }
  .ep-save:hover { transform:translateY(-1px); }
  .ep-cancel { padding:8px 16px; border:1.5px solid #dde4ef; background:#fff; border-radius:8px; font-family:'DM Sans',sans-serif; font-size:13px; color:#64748b; cursor:pointer; }
  .ep-cancel:hover { background:#f7f9fc; }

  /* modal nuevo */
  .mo { position:fixed; inset:0; background:rgba(10,20,40,.45); backdrop-filter:blur(4px); display:flex; align-items:center; justify-content:center; z-index:1000; padding:20px; }
  .mo-box { background:#fff; border-radius:20px; box-shadow:0 24px 64px rgba(15,31,53,.22); width:100%; max-width:920px; max-height:92vh; overflow-y:auto; padding:32px; box-sizing:border-box; }
  .mo-hdr { display:flex; align-items:center; justify-content:space-between; margin-bottom:20px; }
  .mo-title { font-family:'Syne',sans-serif; font-size:20px; font-weight:800; color:#0f1f35; }
  .mo-close { width:32px; height:32px; border:none; background:#f1f5f9; border-radius:8px; cursor:pointer; font-size:14px; color:#64748b; display:flex; align-items:center; justify-content:center; }
  .mo-close:hover { background:#e2e8f0; }
  .mo-acts { display:flex; gap:10px; justify-content:flex-end; margin-top:20px; padding-top:16px; border-top:1.5px solid #f0f4f8; }
  .mo-save   { padding:10px 26px; background:linear-gradient(135deg,#2563eb,#1d4ed8); border:none; border-radius:10px; font-family:'Syne',sans-serif; font-size:14px; font-weight:700; color:#fff; cursor:pointer; box-shadow:0 4px 12px rgba(37,99,235,.3); }
  .mo-cancel { padding:10px 22px; border:1.5px solid #dde4ef; background:#fff; border-radius:10px; font-family:'DM Sans',sans-serif; font-size:14px; color:#64748b; cursor:pointer; }
`;

// ── Slot en modo edición ──────────────────────────────────────────────────────
function SlotEdit({
  n,
  form,
  setForm,
  listaSlot,
  rubroSlots,
  setRubroSlots,
  rubros,
  formulasList,
  formulasSlot,
}) {
  const [busqueda, setBusqueda] = useState("");
  const [abierto, setAbierto] = useState(false);
  // Estado de UI puro: qué botón está activo. El dato que realmente se
  // guarda sigue siendo solo form${n}: si está vacío, el slot funciona en
  // modo "precio" (Mampara lo resuelve solo contra la tabla `articulos`);
  // si tiene una fórmula elegida, funciona en modo "fórmula" como siempre.
  const [modoUI, setModoUI] = useState(() =>
    form[`form${n}`] ? "formula" : "precio",
  );

  const lista = listaSlot[n] ?? [];
  const artActual = form[`art${n}`] ?? "";
  const formulasFiltradas = formulasSlot?.[n] ?? formulasList;

  const filtrados = busqueda.trim()
    ? lista.filter((a) =>
        a.articulo.toLowerCase().includes(busqueda.toLowerCase()),
      )
    : lista;

  const seleccionar = (a) => {
    setForm((f) => ({
      ...f,
      [`art${n}`]: a.articulo,
      [`cod${n}`]: a.codartint ?? a.codart ?? "",
    }));
    setBusqueda("");
    setAbierto(false);
  };

  const limpiar = () => {
    setForm((f) => ({
      ...f,
      [`art${n}`]: "",
      [`cod${n}`]: "",
    }));
    setBusqueda("");
    setAbierto(false);
  };

  const elegirModo = (nuevo) => {
    setModoUI(nuevo);
    // Excluyentes: si se pasa a "precio" se descarta la fórmula elegida,
    // para que Mampara no dude cuál de las dos usar.
    if (nuevo === "precio") {
      setForm((f) => ({ ...f, [`form${n}`]: "" }));
    }
  };

  return (
    <div className="sc">
      <div className="sc-num">Art {n}</div>
      <select
        className="sc-sel"
        value={rubroSlots[n] ?? ""}
        onChange={(e) => {
          setRubroSlots((p) => ({ ...p, [n]: e.target.value }));
          setForm((f) => ({ ...f, [`art${n}`]: "", [`cod${n}`]: "" }));
          setBusqueda("");
        }}
      >
        <option value="">— Rubro —</option>
        {rubros.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </select>

      {/* Buscador filtrable de material */}
      <div style={{ position: "relative" }}>
        <input
          className="sc-sel"
          style={{ paddingRight: artActual ? 22 : 8 }}
          placeholder={artActual || "Buscar material..."}
          value={busqueda}
          onChange={(e) => {
            setBusqueda(e.target.value);
            setAbierto(true);
          }}
          onFocus={() => setAbierto(true)}
          onBlur={() => setTimeout(() => setAbierto(false), 180)}
        />
        {artActual && (
          <span
            onClick={limpiar}
            style={{
              position: "absolute",
              right: 5,
              top: "50%",
              transform: "translateY(-50%)",
              cursor: "pointer",
              color: "#94a3b8",
              fontSize: 11,
              lineHeight: 1,
            }}
            title="Limpiar"
          >
            ✕
          </span>
        )}
        {abierto && filtrados.length > 0 && (
          <div
            style={{
              position: "absolute",
              zIndex: 999,
              top: "100%",
              left: 0,
              right: 0,
              background: "#fff",
              border: "1.5px solid #bfdbfe",
              borderRadius: 8,
              boxShadow: "0 8px 24px rgba(15,31,53,.13)",
              maxHeight: 200,
              overflowY: "auto",
            }}
          >
            {filtrados.map((a) => (
              <div
                key={a.id}
                onMouseDown={() => seleccionar(a)}
                style={{
                  padding: "6px 10px",
                  cursor: "pointer",
                  fontSize: 11,
                  borderBottom: "1px solid #f0f4f8",
                  color: "#1a2332",
                  background: artActual === a.articulo ? "#eff4ff" : undefined,
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "#f0f6ff")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background =
                    artActual === a.articulo ? "#eff4ff" : "#fff")
                }
              >
                <div style={{ fontWeight: 500 }}>{a.articulo}</div>
                {(a.codartint || a.codart) && (
                  <div
                    style={{
                      fontSize: 10,
                      color: "#94a3b8",
                      fontFamily: "monospace",
                    }}
                  >
                    {a.codartint ?? a.codart}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <input
        className="sc-inp ro"
        value={artActual}
        readOnly
        placeholder="Artículo seleccionado"
        style={{ fontSize: 10 }}
      />
      <input
        className="sc-inp ro"
        value={form[`cod${n}`] ?? ""}
        readOnly
        placeholder="Código"
      />
      <div className="sc-cant-row">
        <span className="sc-cant-lbl">✕ Cant.</span>
        <input
          className="sc-cant"
          type="number"
          min="0"
          step="1"
          value={form[`cant${n}`] ?? 1}
          onChange={(e) =>
            setForm((f) => ({
              ...f,
              [`cant${n}`]: e.target.value === "" ? "" : Number(e.target.value),
            }))
          }
          placeholder="1"
        />
      </div>
      <input
        className="sc-mg"
        value={form[`margen${n}`] ?? ""}
        onChange={(e) =>
          setForm((f) => ({ ...f, [`margen${n}`]: e.target.value }))
        }
        placeholder="Margen %"
      />

      {/* Precio: no se carga nada acá, Mampara lo busca solo en la tabla
          `articulos` por el código de este artículo hijo al armar el
          presupuesto. Fórmula: se seguirá calculando como hasta ahora. */}
      <div className="sc-modo">
        <button
          type="button"
          className={`sc-modo-btn ${modoUI === "precio" ? "on-precio" : ""}`}
          onClick={() => elegirModo("precio")}
        >
          💲 Precio
        </button>
        <button
          type="button"
          className={`sc-modo-btn ${modoUI === "formula" ? "on-formula" : ""}`}
          onClick={() => elegirModo("formula")}
        >
          🧮 Fórmula
        </button>
      </div>

      {modoUI === "precio" ? (
        <div className="sc-auto">
          Precio automático desde <strong>Artículos</strong> (por código)
        </div>
      ) : (
        <select
          className="sc-fs"
          value={form[`form${n}`] ?? ""}
          onChange={(e) =>
            setForm((f) => ({ ...f, [`form${n}`]: e.target.value }))
          }
        >
          <option value="">— Elegir fórmula —</option>
          {formulasFiltradas.map((f) => (
            <option key={f.codform} value={f.codform}>
              {f.codform}
              {f.descripcion ? ` — ${f.descripcion}` : ""}
              {f.codart ? ` (${f.codart})` : ""}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}

// ── Slot en modo vista ────────────────────────────────────────────────────────
function SlotView({ row, n }) {
  const art = row[`art${n}`];
  const cod = row[`cod${n}`];
  const cant = row[`cant${n}`];
  const margen = row[`margen${n}`];
  const form = row[`form${n}`];
  if (!art) return <span className="sv-mt">—</span>;

  return (
    <div className="sv">
      <span className="sv-art">{art}</span>
      {cod && <span className="sv-sub">{cod}</span>}
      {cant != null && Number(cant) !== 1 && (
        <span className="b-cant">✕ {cant}</span>
      )}
      {margen && <span className="b-mg">↑ {margen}%</span>}

      {form ? (
        <span className="b-form">🧮 {form}</span>
      ) : (
        <span className="sv-auto">💲 Precio automático (Artículos)</span>
      )}
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function Asociaciones({
  asociaciones = [],
  productos = [],
  formulas = [],
  selected,
  modal,
  onSave,
  onDelete,
  onSelect,
  onOpenModal,
  onCloseModal,
}) {
  const [search, setSearch] = useState("");
  const [rubroFiltro, setRubroFiltro] = useState("");

  // Normaliza el campo rubro por si el backend lo devuelve con otra
  // capitalización (rubro / RUBRO / Rubro) según el endpoint.
  const articulosList = useMemo(
    () =>
      productos.map((a) => ({
        ...a,
        rubro: a.rubro ?? a.RUBRO ?? a.Rubro ?? "",
      })),
    [productos],
  );

  const rubros = useMemo(
    () => [...new Set(articulosList.map((a) => a.rubro).filter(Boolean))].sort(),
    [articulosList],
  );

  // El rubro no está guardado en la fila de "asociaciones": se resuelve
  // buscando el artículo padre por código o, si no matchea, por nombre.
  const rubroDeArticulo = useMemo(() => {
    const porCodigo = new Map();
    const porNombre = new Map();
    articulosList.forEach((a) => {
      if (a.codartint) porCodigo.set(a.codartint, a.rubro);
      if (a.codart) porCodigo.set(a.codart, a.rubro);
      if (a.articulo) porNombre.set(a.articulo, a.rubro);
    });
    return (row) =>
      porCodigo.get(row.codartint) || porNombre.get(row.articulo) || "";
  }, [articulosList]);

  // Rubro de una fórmula: viene directo del backend (f.rubro). Si por algún
  // motivo no viniera cargado, se intenta inferir por el código del artículo
  // ligado (f.codart) como respaldo, igual que antes.
  const rubroDeFormula = (f) =>
    f.rubro || f.RUBRO || rubroDeArticulo({ codartint: f.codart });

  // Una fórmula "GENERAL" aplica a cualquier rubro (mismo criterio que
  // Formulas.jsx al filtrar por rubro).
  const formulaAplicaARubro = (f, rubroSlot) =>
    rubroDeFormula(f) === rubroSlot ||
    rubroDeFormula(f).toUpperCase() === "GENERAL";

  // El código tampoco está guardado en la fila de "asociaciones" (solo el
  // nombre del artículo padre): se resuelve buscando el artículo padre por
  // nombre en articulosList, igual que rubroDeArticulo.
  const codigoDeArticulo = useMemo(() => {
    const porNombreCod = new Map();
    articulosList.forEach((a) => {
      const cod = a.codartint ?? a.codart ?? "";
      if (a.articulo && cod) porNombreCod.set(a.articulo, cod);
    });
    return (row) =>
      row.codartint || porNombreCod.get(row.articulo) || "";
  }, [articulosList]);

  const formulasList = formulas;

  // edición inline
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [editRubroPadre, setEditRubroPadre] = useState("");
  const [editRubroSlots, setEditRubroSlots] = useState(() =>
    Object.fromEntries(SLOTS.map((n) => [n, ""])),
  );

  // modal nuevo
  const [modalOpen, setModalOpen] = useState(false);
  const [newForm, setNewForm] = useState(EMPTY());
  const [newRubroPadre, setNewRubroPadre] = useState("");
  const [newRubroSlots, setNewRubroSlots] = useState(() =>
    Object.fromEntries(SLOTS.map((n) => [n, ""])),
  );

  const listaPadreEdit = useMemo(
    () =>
      editRubroPadre
        ? articulosList.filter((a) => a.rubro === editRubroPadre)
        : articulosList,
    [articulosList, editRubroPadre],
  );

  const listaPadreNew = useMemo(
    () =>
      newRubroPadre
        ? articulosList.filter((a) => a.rubro === newRubroPadre)
        : articulosList,
    [articulosList, newRubroPadre],
  );

  // Fórmula principal: solo las que están ligadas a un artículo del mismo
  // rubro elegido para el padre (igual criterio que listaPadreEdit/New).
  const formulasPadreEdit = useMemo(
    () =>
      editRubroPadre
        ? formulasList.filter((f) => formulaAplicaARubro(f, editRubroPadre))
        : formulasList,
    [formulasList, editRubroPadre],
  );

  const formulasPadreNew = useMemo(
    () =>
      newRubroPadre
        ? formulasList.filter((f) => formulaAplicaARubro(f, newRubroPadre))
        : formulasList,
    [formulasList, newRubroPadre],
  );

  const PROV_EXCLUIDO = "DANIEL ROQUE SRL";

  const filtrarSlot = (lista, rubroSlot, rubroPadre) => {
    let result = rubroSlot ? lista.filter((a) => a.rubro === rubroSlot) : lista;
    // Si el artículo padre es MUEBLES y el slot también es MUEBLES (o sin rubro), excluir Daniel Roque SRL
    if (
      rubroPadre?.toUpperCase() === "MUEBLES" &&
      (!rubroSlot || rubroSlot.toUpperCase() === "MUEBLES")
    ) {
      result = result.filter(
        (a) => (a.proveedor ?? "").toUpperCase() !== PROV_EXCLUIDO,
      );
    }
    return result;
  };

  const listaSlotEdit = useMemo(
    () =>
      Object.fromEntries(
        SLOTS.map((n) => [
          n,
          filtrarSlot(articulosList, editRubroSlots[n], editRubroPadre),
        ]),
      ),
    [articulosList, editRubroSlots, editRubroPadre],
  );

  const listaSlotNew = useMemo(
    () =>
      Object.fromEntries(
        SLOTS.map((n) => [
          n,
          filtrarSlot(articulosList, newRubroSlots[n], newRubroPadre),
        ]),
      ),
    [articulosList, newRubroSlots, newRubroPadre],
  );

  // Fórmula por slot: solo las ligadas a un artículo del rubro elegido en
  // ese slot. Sin rubro elegido, se muestran todas (igual que listaSlot).
  const filtrarFormulasSlot = (rubroSlot) =>
    rubroSlot
      ? formulasList.filter((f) => formulaAplicaARubro(f, rubroSlot))
      : formulasList;

  const formulasSlotEdit = useMemo(
    () =>
      Object.fromEntries(
        SLOTS.map((n) => [n, filtrarFormulasSlot(editRubroSlots[n])]),
      ),
    [formulasList, editRubroSlots],
  );

  const formulasSlotNew = useMemo(
    () =>
      Object.fromEntries(
        SLOTS.map((n) => [n, filtrarFormulasSlot(newRubroSlots[n])]),
      ),
    [formulasList, newRubroSlots],
  );

  // iniciar edición inline
  const startEdit = (row) => {
    setEditId(row.id);
    setEditForm({ ...EMPTY(), ...row });
    const pf = articulosList.find((a) => a.articulo === row.articulo);
    setEditRubroPadre(pf?.rubro ?? "");
    setEditRubroSlots(
      Object.fromEntries(
        SLOTS.map((n) => {
          const f = articulosList.find((a) => a.articulo === row[`art${n}`]);
          return [n, f?.rubro ?? ""];
        }),
      ),
    );
  };
  const cancelEdit = () => {
    setEditId(null);
    setEditForm(null);
  };
  const saveEdit = () => {
    if (!editForm) return;
    // codartint es solo un campo de uso interno en el front (para mostrar
    // el código en la tabla); la tabla "asociaciones" no tiene esa columna,
    // así que no se manda al backend.
    const { codartint, ...editFormSinCodartint } = editForm;
    onSave?.({ id: editId, ...editFormSinCodartint });
    cancelEdit();
  };

  // modal nuevo
  const openNew = () => {
    setNewForm(EMPTY());
    setNewRubroPadre("");
    setNewRubroSlots(Object.fromEntries(SLOTS.map((n) => [n, ""])));
    setModalOpen(true);
    onOpenModal?.("form");
  };
  const closeNew = () => {
    setModalOpen(false);
    onCloseModal?.();
  };
  const saveNew = () => {
    if (!newForm.codartint && !newForm.articulo) return;
    // mismo motivo que en saveEdit: codartint no es columna real.
    const { codartint, ...newFormSinCodartint } = newForm;
    onSave?.({ ...newFormSinCodartint });
    closeNew();
  };

  // duplicar: precarga el modal "Nuevo" con los slots de una asociación
  // existente, pero sin id y sin artículo padre (para que se elija uno nuevo)
  const openDuplicate = (row) => {
    const { id, ...rest } = row;
    setNewForm({
      ...EMPTY(),
      ...rest,
      codartint: "",
      articulo: "",
    });
    setNewRubroPadre("");
    setNewRubroSlots(
      Object.fromEntries(
        SLOTS.map((n) => {
          const f = articulosList.find((a) => a.articulo === row[`art${n}`]);
          return [n, f?.rubro ?? ""];
        }),
      ),
    );
    setModalOpen(true);
    onOpenModal?.("form");
  };

  const filtered = asociaciones.filter((a) => {
    const matchTexto =
      !search ||
      (a.articulo ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (a.codartint ?? "").toLowerCase().includes(search.toLowerCase());
    const matchRubro = !rubroFiltro || rubroDeArticulo(a) === rubroFiltro;
    return matchTexto && matchRubro;
  });

  const sharedSlotProps = (isEdit) => ({
    rubros,
    formulasList,
    formulasSlot: isEdit ? formulasSlotEdit : formulasSlotNew,
    form: isEdit ? editForm : newForm,
    setForm: isEdit ? setEditForm : setNewForm,
    listaSlot: isEdit ? listaSlotEdit : listaSlotNew,
    rubroSlots: isEdit ? editRubroSlots : newRubroSlots,
    setRubroSlots: isEdit ? setEditRubroSlots : setNewRubroSlots,
  });

  return (
    <>
      <style>{CSS}</style>
      <div className="ar">
        <div className="ar-hdr">
          <div>
            <div className="ar-eyebrow">Gestión de productos</div>
            <div className="ar-title">
              <div className="ar-icon">🔗</div>Asociaciones
            </div>
          </div>
        </div>

        <div className="ar-bar">
          <div className="ar-sw">
            <span className="ar-si">🔍</span>
            <input
              className="ar-s"
              placeholder="Buscar por artículo o código…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="ep-sel"
            style={{ maxWidth: 220 }}
            value={rubroFiltro}
            onChange={(e) => setRubroFiltro(e.target.value)}
          >
            <option value="">— Todos los rubros —</option>
            {rubros.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <button className="btn-add" onClick={openNew}>
            <span>＋</span> Agregar
          </button>
          <span className="ar-count">
            {filtered.length} {filtered.length === 1 ? "registro" : "registros"}
          </span>
        </div>

        <div className="ar-card">
          <div className="ar-wrap">
            <table className="ar-tbl">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Código</th>
                  <th>Rubro</th>
                  <th>Artículo Padre</th>
                  {SLOTS.map((n) => (
                    <th key={n}>Art {n}</th>
                  ))}
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={4 + SLOTS.length + 1}>
                      <div className="ar-empty">
                        <div style={{ fontSize: 36, opacity: 0.4 }}>🔗</div>
                        <div>Sin registros</div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.flatMap((row) => {
                    const isEditing = editId === row.id;
                    const rows = [];

                    // fila de datos
                    rows.push(
                      <tr
                        key={`r-${row.id}`}
                        className={
                          isEditing
                            ? "row-edit-hdr"
                            : selected?.id === row.id
                              ? "row-sel"
                              : "row-normal"
                        }
                        onClick={() => !isEditing && onSelect?.(row)}
                      >
                        <td>
                          <span className="b-id">{row.id}</span>
                        </td>
                        <td>
                          {codigoDeArticulo(row) ? (
                            <span className="b-cod">{codigoDeArticulo(row)}</span>
                          ) : (
                            <span className="sv-mt">—</span>
                          )}
                        </td>
                        <td>
                          {rubroDeArticulo(row) ? (
                            <span className="b-rubro">{rubroDeArticulo(row)}</span>
                          ) : (
                            <span className="sv-mt">—</span>
                          )}
                        </td>
                        <td style={{ fontWeight: 500 }}>{row.articulo}</td>
                        {SLOTS.map((n) => (
                          <td key={n}>
                            {isEditing ? (
                              <span
                                style={{
                                  fontSize: 10,
                                  color: "#2563eb",
                                  fontStyle: "italic",
                                }}
                              >
                                ↓ editando
                              </span>
                            ) : (
                              <SlotView row={row} n={n} />
                            )}
                          </td>
                        ))}
                        <td>
                          <div className="ar-acts">
                            {isEditing ? (
                              <>
                                <button
                                  className="bic bic-ok"
                                  title="Guardar"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    saveEdit();
                                  }}
                                >
                                  💾
                                </button>
                                <button
                                  className="bic bic-cx"
                                  title="Cancelar"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    cancelEdit();
                                  }}
                                >
                                  ✕
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  className="bic bic-ed"
                                  title="Editar"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    startEdit(row);
                                  }}
                                >
                                  ✏️
                                </button>
                                <button
                                  className="bic bic-dup"
                                  title="Duplicar"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openDuplicate(row);
                                  }}
                                >
                                  📋
                                </button>
                                <button
                                  className="bic bic-dl"
                                  title="Eliminar"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (window.confirm("¿Eliminar?"))
                                      onDelete?.(row.id ?? row);
                                  }}
                                >
                                  🗑️
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>,
                    );

                    // fila de edición expandida
                    if (isEditing && editForm) {
                      rows.push(
                        <tr key={`e-${row.id}`} className="row-edit-body">
                          <td
                            colSpan={4 + SLOTS.length + 1}
                            style={{ padding: 0 }}
                          >
                            <div className="ep">
                              {/* padre */}
                              <div className="ep-sec">Artículo Padre</div>
                              <div className="ep-padre">
                                <div>
                                  <div className="ep-lbl">Rubro</div>
                                  <select
                                    className="ep-sel"
                                    value={editRubroPadre}
                                    onChange={(e) => {
                                      setEditRubroPadre(e.target.value);
                                      setEditForm((f) => ({
                                        ...f,
                                        articulo: "",
                                        codartint: "",
                                      }));
                                    }}
                                  >
                                    <option value="">— Todos —</option>
                                    {rubros.map((r) => (
                                      <option key={r} value={r}>
                                        {r}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                <div>
                                  <div className="ep-lbl">Artículo</div>
                                  <select
                                    className="ep-sel"
                                    value={editForm.articulo}
                                    onChange={(e) => {
                                      const found = listaPadreEdit.find(
                                        (a) => a.articulo === e.target.value,
                                      );
                                      setEditForm((f) => ({
                                        ...f,
                                        articulo: e.target.value,
                                        codartint: found?.codartint ?? "",
                                      }));
                                    }}
                                  >
                                    <option value="">— Elegir —</option>
                                    {listaPadreEdit.map((a) => (
                                      <option key={a.id} value={a.articulo}>
                                        {a.articulo}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                <div>
                                  <div className="ep-lbl">Código</div>
                                  <input
                                    className="ep-inp ro"
                                    value={editForm.codartint}
                                    readOnly
                                  />
                                </div>
                                <div>
                                  <div className="ep-lbl">Precio</div>
                                  <input
                                    className="ep-inp ro"
                                    value={(() => {
                                      const p = precioDeArticulo(
                                        listaPadreEdit.find(
                                          (a) => a.articulo === editForm.articulo,
                                        ),
                                      );
                                      return p !== ""
                                        ? Number(p).toLocaleString("es-AR", {
                                            style: "currency",
                                            currency: "ARS",
                                          })
                                        : "—";
                                    })()}
                                    readOnly
                                  />
                                </div>
                              </div>

                              {/* fórmula principal del artículo padre */}
                              <div className="ep-sec">
                                Fórmula Principal (opcional)
                              </div>
                              <div className="ep-padre">
                                <div>
                                  <div className="ep-lbl">Fórmula</div>
                                  <select
                                    className="ep-sel"
                                    value={editForm.codf ?? ""}
                                    onChange={(e) => {
                                      const found = formulasList.find(
                                        (f) => f.codform === e.target.value,
                                      );
                                      setEditForm((f) => ({
                                        ...f,
                                        codf: e.target.value,
                                        form:
                                          found?.formula ??
                                          found?.FORMULA ??
                                          "",
                                      }));
                                    }}
                                  >
                                    <option value="">
                                      — Sin fórmula principal —
                                    </option>
                                    {formulasPadreEdit.map((f) => (
                                      <option key={f.codform} value={f.codform}>
                                        {f.codform}
                                        {f.descripcion
                                          ? ` — ${f.descripcion}`
                                          : ""}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>

                              {/* slots */}
                              <div className="ep-sec">Artículos Asociados</div>
                              <div className="slots-wrap">
                                {SLOTS.map((n) => (
                                  <SlotEdit
                                    key={n}
                                    n={n}
                                    {...sharedSlotProps(true)}
                                  />
                                ))}
                              </div>

                              <div className="ep-acts">
                                <button
                                  className="ep-cancel"
                                  onClick={cancelEdit}
                                >
                                  Cancelar
                                </button>
                                <button className="ep-save" onClick={saveEdit}>
                                  💾 Guardar cambios
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>,
                      );
                    }

                    return rows;
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Nuevo */}
        {(modal === "form" || modalOpen) && (
          <div className="mo" onClick={closeNew}>
            <div className="mo-box" onClick={(e) => e.stopPropagation()}>
              <div className="mo-hdr">
                <div className="mo-title">🔗 Nueva Asociación</div>
                <button className="mo-close" onClick={closeNew}>
                  ✕
                </button>
              </div>

              <div className="ep-sec">Artículo Padre</div>
              <div className="ep-padre">
                <div>
                  <div className="ep-lbl">Rubro</div>
                  <select
                    className="ep-sel"
                    value={newRubroPadre}
                    onChange={(e) => {
                      setNewRubroPadre(e.target.value);
                      setNewForm((f) => ({ ...f, articulo: "", codartint: "" }));
                    }}
                  >
                    <option value="">— Todos —</option>
                    {rubros.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <div className="ep-lbl">Artículo</div>
                  <select
                    className="ep-sel"
                    value={newForm.articulo}
                    onChange={(e) => {
                      const found = listaPadreNew.find(
                        (a) => a.articulo === e.target.value,
                      );
                      setNewForm((f) => ({
                        ...f,
                        articulo: e.target.value,
                        codartint: found?.codartint ?? "",
                      }));
                    }}
                  >
                    <option value="">— Elegir —</option>
                    {listaPadreNew.map((a) => (
                      <option key={a.id} value={a.articulo}>
                        {a.articulo}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <div className="ep-lbl">Código</div>
                  <input
                    className="ep-inp ro"
                    value={newForm.codartint}
                    readOnly
                  />
                </div>
                <div>
                  <div className="ep-lbl">Precio</div>
                  <input
                    className="ep-inp ro"
                    value={(() => {
                      const p = precioDeArticulo(
                        listaPadreNew.find(
                          (a) => a.articulo === newForm.articulo,
                        ),
                      );
                      return p !== ""
                        ? Number(p).toLocaleString("es-AR", {
                            style: "currency",
                            currency: "ARS",
                          })
                        : "—";
                    })()}
                    readOnly
                  />
                </div>
              </div>

              {/* fórmula principal del artículo padre */}
              <div className="ep-sec">Fórmula Principal (opcional)</div>
              <div className="ep-padre">
                <div>
                  <div className="ep-lbl">Fórmula</div>
                  <select
                    className="ep-sel"
                    value={newForm.codf ?? ""}
                    onChange={(e) => {
                      const found = formulasList.find(
                        (f) => f.codform === e.target.value,
                      );
                      setNewForm((f) => ({
                        ...f,
                        codf: e.target.value,
                        form: found?.formula ?? found?.FORMULA ?? "",
                      }));
                    }}
                  >
                    <option value="">— Sin fórmula principal —</option>
                    {formulasPadreNew.map((f) => (
                      <option key={f.codform} value={f.codform}>
                        {f.codform}
                        {f.descripcion ? ` — ${f.descripcion}` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="ep-sec">Artículos Asociados</div>
              <div className="slots-wrap">
                {SLOTS.map((n) => (
                  <SlotEdit key={n} n={n} {...sharedSlotProps(false)} />
                ))}
              </div>

              <div className="mo-acts">
                <button className="mo-cancel" onClick={closeNew}>
                  Cancelar
                </button>
                <button className="mo-save" onClick={saveNew}>
                  Agregar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
