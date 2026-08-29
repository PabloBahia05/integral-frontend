import { useState, useRef, useEffect, useCallback } from "react";
import DataTable from "../Component/DataTable";
import Modal from "../Component/Modal";
import ActionBar from "../Component/ActionBar";
import ScreenHeader from "../Component/ScreenHeader";
import ConfirmDelete from "../Component/ConfirmDelete";
import FormField from "../Component/FormField";

const makeColumns = (onVer) => [
  {
    key: "__ver__",
    label: "",
    width: 60,
    render: (_, row) => (
      <button
        title="Ver detalle"
        onClick={(e) => {
          e.stopPropagation();
          onVer(row);
        }}
        style={{
          background: "none",
          border: "1px solid #b8cfe0",
          borderRadius: 4,
          cursor: "pointer",
          fontSize: 14,
          padding: "2px 7px",
          color: "#3a7abf",
          lineHeight: 1,
        }}
      >
        Ver
      </button>
    ),
  },
  { key: "codartint", label: "Código Interno", width: 140 },
  { key: "articulo", label: "Artículo", width: 200 },
  { key: "proveedor", label: "Proveedor", width: 150 },
  {
    key: "codartprov",
    label: "Cód. Prov.",
    width: 110,
    render: (v) =>
      v ? (
        <span
          style={{ color: "#5580a0", fontFamily: "monospace", fontSize: 12 }}
        >
          {v}
        </span>
      ) : (
        <span style={{ color: "#bbb" }}>—</span>
      ),
  },
  {
    key: "prod_prov",
    label: "Prod. Proveedor",
    width: 160,
    render: (v) =>
      v ? (
        <span style={{ color: "#0a3a5c", fontSize: 12 }}>{v}</span>
      ) : (
        <span style={{ color: "#bbb" }}>—</span>
      ),
  },
  { key: "rubro", label: "Rubro", width: 110 },
  { key: "familia", label: "Familia", width: 110 },
  { key: "unidad", label: "Unidad", width: 80 },
  {
    key: "valorlista",
    label: "Val. Lista",
    width: 110,
    render: (v) =>
      v != null ? `$${parseFloat(v).toLocaleString("es-AR")}` : "-",
  },
  {
    key: "fecha_precio",
    label: "Fecha Precio",
    width: 110,
    render: (v) => (v ? String(v).slice(0, 10) : "-"),
  },
  {
    key: "costosi",
    label: "Costo s/imp.",
    width: 110,
    render: (v) =>
      v != null ? `$${parseFloat(v).toLocaleString("es-AR")}` : "-",
  },
  {
    key: "costosicf",
    label: "Costo s/imp. c/flete",
    width: 150,
    render: (v) =>
      v != null ? `$${parseFloat(v).toLocaleString("es-AR")}` : "-",
  },
  {
    key: "costocicf",
    label: "Costo c/imp. c/flete",
    width: 150,
    render: (v) =>
      v != null ? `$${parseFloat(v).toLocaleString("es-AR")}` : "-",
  },
  {
    key: "precio",
    label: "Precio",
    width: 100,
    render: (v) =>
      v != null ? `${parseFloat(v).toLocaleString("es-AR")}` : "-",
  },
  {
    key: "precio_un",
    label: "Precio UN",
    width: 100,
    render: (v) =>
      v != null ? `${parseFloat(v).toLocaleString("es-AR")}` : "-",
  },
  {
    key: "descuento",
    label: "Descuento %",
    width: 110,
    render: (v) => (v != null ? `${parseFloat(v)}%` : "-"),
  },
  {
    key: "flete",
    label: "Flete",
    width: 100,
    render: (v) =>
      v != null ? `$${parseFloat(v).toLocaleString("es-AR")}` : "-",
  },
  { key: "cantidad", label: "Cantidad", width: 90 },
  { key: "ancho", label: "Ancho", width: 80 },
  { key: "alto", label: "Alto", width: 80 },
  { key: "prof", label: "Prof.", width: 80 },
  { key: "linea", label: "Línea", width: 90 },
  { key: "color", label: "Color", width: 90 },
  { key: "area", label: "Área", width: 80 },
  { key: "mca", label: "MCA", width: 80 },
];

const EMPTY = {
  codartint: "",
  articulo: "",
  area: "",
  unidad: "",
  artfoto: "",
  precio: "",
  proveedor: "",
  cantidad: "",
  ancho: "",
  alto: "",
  prof: "",
  linea: "",
  aplicacion: "",
  color: "",
  familia: "",
  rubro: "",
  precio_un: "",
  costosi: "",
  costosicf: "",
  costocicf: "",
  costo_placa: "",
  descuento: "",
  flete: "",
  valorlista: "",
  fecha_precio: "",
  mca: "",
  codartprov: "",
  prod_prov: "",
};

const FIELDS_LEFT_TOP = [
  { field: "codartint", label: "Código Interno", placeholder: "Ej: ADR00015" },
  {
    field: "codartprov",
    label: "Código Proveedor",
    placeholder: "Ej: PROV-001",
  },
  {
    field: "prod_prov",
    label: "Prod. Proveedor",
    placeholder: "Descripción según factura del proveedor",
  },
  {
    field: "articulo",
    label: "Artículo *",
    placeholder: "Ej: Mampara corrediza",
  },
];

const FIELDS_LEFT_BOTTOM = [
  { field: "cantidad", label: "Cantidad", placeholder: "Ej: 1" },
  { field: "flete", label: "Flete ($)", placeholder: "Ej: 500" },
];

const FIELDS_RIGHT = [
  { field: "ancho", label: "Ancho (cm)", placeholder: "Ej: 80" },
  { field: "alto", label: "Alto (cm)", placeholder: "Ej: 200" },
  { field: "prof", label: "Prof. (cm)", placeholder: "Ej: 45" },
  { field: "linea", label: "Línea", placeholder: "Ej: Living" },
  { field: "color", label: "Color", placeholder: "Ej: 1" },
  { field: "area", label: "Área", placeholder: "Ej: 01" },
  { field: "mca", label: "MCA", placeholder: "Ej: MCA-001" },
];

// Recalcula costosi -> costosicf -> costocicf -> precio (y precio_un) a
// partir de valorlista, descuento y margen. Función pura para poder
// reutilizarla tanto al tipear en el formulario como al abrir "Editar"
// (para que lo mostrado nunca quede desincronizado del costo/margen
// guardado).
// `precio` = costocicf, el precio de costo TAL CUAL, sin margen aplicado.
// El margen se aplica sobre `precio_un` = precio * (1 + margen%).
const recalcularCostosYPrecio = (valorlista, descuento, margen) => {
  const r2 = (v) => Math.round(v * 100) / 100;
  const vl = parseFloat(valorlista) || 0;
  const dto = parseFloat(descuento) || 0;
  const mg = parseFloat(margen) || 0;
  if (!vl)
    return { costosi: "", costosicf: "", costocicf: "", precio: "", precio_un: "" };
  const costosi = r2(vl * (1 - dto / 100));
  const costosicf = r2(costosi * 1.1);
  const costocicf = r2(costosicf * 1.21);
  const precio = costocicf;
  const precio_un = r2(precio * (1 + mg / 100));
  return {
    costosi: String(costosi),
    costosicf: String(costosicf),
    costocicf: String(costocicf),
    precio: String(precio),
    precio_un: String(precio_un),
  };
};

const toDecimal = (v) =>
  v !== "" && v !== null && v !== undefined ? parseFloat(v) || null : null;
const toInt = (v) =>
  v !== "" && v !== null && v !== undefined ? parseInt(v) || null : null;
const fmt = (v) =>
  v != null ? `$${parseFloat(v).toLocaleString("es-AR")}` : "-";

async function uploadImageToCloud(file, token) {
  const formData = new FormData();
  formData.append("imagen", file);
  const res = await fetch(
    "https://integral-backend-production.up.railway.app/api/upload-imagen",
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    },
  );
  if (!res.ok) throw new Error("Error al subir imagen");
  return (await res.json()).url;
}

function FotoUpload({ value, onChange, token }) {
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  const processFile = async (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    setLoading(true);
    setError("");
    try {
      onChange(await uploadImageToCloud(file, token));
    } catch {
      setError("No se pudo subir la imagen.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-field">
      <label className="form-label">Foto del artículo</label>
      <div
        className={`foto-dropzone${dragging ? " foto-dropzone--active" : ""}`}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          processFile(e.dataTransfer.files[0]);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onClick={() => !loading && inputRef.current.click()}
      >
        {loading ? (
          <div className="foto-placeholder">
            <span className="foto-hint">⏳ Subiendo...</span>
          </div>
        ) : value ? (
          <img src={value} alt="Preview" className="foto-preview" />
        ) : (
          <div className="foto-placeholder">
            <span className="foto-icon">🖼️</span>
            <span className="foto-hint">
              {dragging ? "Soltá aquí" : "Arrastrá o hacé clic"}
            </span>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={(e) => processFile(e.target.files[0])}
        />
      </div>
      {error && (
        <p style={{ color: "red", fontSize: "0.8rem", marginTop: 4 }}>
          {error}
        </p>
      )}
      <input
        type="text"
        className="form-input"
        style={{ marginTop: "6px" }}
        placeholder="O pegá una URL: https://..."
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
      />
      {value && (
        <button
          type="button"
          className="btn-cancel"
          style={{ marginTop: "6px", fontSize: "0.8rem", padding: "4px 10px" }}
          onClick={() => onChange("")}
        >
          Quitar imagen
        </button>
      )}
    </div>
  );
}

function DetalleArticulo({ producto }) {
  if (!producto)
    return (
      <div className="detalle-panel detalle-panel--vacio">
        <span className="detalle-hint">
          Seleccioná un artículo para ver el detalle
        </span>
      </div>
    );
  return (
    <div className="detalle-panel">
      <div className="detalle-foto">
        {producto.artfoto && producto.artfoto !== "null" ? (
          <img
            src={producto.artfoto}
            alt={producto.articulo}
            className="detalle-img"
          />
        ) : (
          <div className="detalle-sin-foto">
            <span>🖼️</span>
            <small>Sin imagen</small>
          </div>
        )}
      </div>
      <h3 className="detalle-nombre">{producto.articulo}</h3>
      {producto.codartint && (
        <p className="detalle-codigo">
          Código Interno: <strong>{producto.codartint}</strong>
        </p>
      )}
      {producto.codartprov && (
        <p className="detalle-codigo">
          Código Proveedor: <strong>{producto.codartprov}</strong>
        </p>
      )}
      {producto.rubro && (
        <p className="detalle-codigo">
          Rubro: <strong>{producto.rubro}</strong>
        </p>
      )}
      {producto.area && (
        <p className="detalle-codigo">
          Área: <strong>{producto.area}</strong>
        </p>
      )}
      {producto.unidad && (
        <p className="detalle-codigo">
          Unidad: <strong>{producto.unidad}</strong>
        </p>
      )}
      {producto.proveedor && (
        <p className="detalle-codigo">
          Proveedor: <strong>{producto.proveedor}</strong>
        </p>
      )}
      {producto.color && (
        <p className="detalle-codigo">
          Color: <strong>{producto.color}</strong>
        </p>
      )}
      {producto.linea && (
        <p className="detalle-codigo">
          Línea: <strong>{producto.linea}</strong>
        </p>
      )}
      {producto.familia && (
        <p className="detalle-codigo">
          Familia: <strong>{producto.familia}</strong>
        </p>
      )}
      {producto.mca != null && producto.mca !== "" && (
        <p className="detalle-codigo">
          MCA: <strong>{producto.mca}</strong>
        </p>
      )}
      <div className="detalle-precios">
        <div className="detalle-precio-row">
          <span>Val. lista proveedor</span>
          <strong>{fmt(producto.valorlista)}</strong>
        </div>
        <div className="detalle-precio-row">
          <span>Fecha precio</span>
          <strong>
            {producto.fecha_precio
              ? String(producto.fecha_precio).slice(0, 10)
              : "-"}
          </strong>
        </div>
        <div className="detalle-precio-row">
          <span>Costo s/imp.</span>
          <strong>{fmt(producto.costosi)}</strong>
        </div>
        <div className="detalle-precio-row">
          <span>Costo s/imp. c/flete</span>
          <strong>{fmt(producto.costosicf)}</strong>
        </div>
        <div className="detalle-precio-row">
          <span>Costo c/imp. c/flete</span>
          <strong>{fmt(producto.costocicf)}</strong>
        </div>
        <div className="detalle-precio-row">
          <span>Precio</span>
          <strong>{fmt(producto.precio)}</strong>
        </div>
        {producto.descuento != null && (
          <div className="detalle-precio-row">
            <span>Descuento</span>
            <strong>{producto.descuento}%</strong>
          </div>
        )}
        {producto.flete != null && (
          <div className="detalle-precio-row">
            <span>Flete</span>
            <strong>{fmt(producto.flete)}</strong>
          </div>
        )}
        <div className="detalle-precio-row">
          <span>Cantidad</span>
          <strong>{producto.cantidad ?? "-"}</strong>
        </div>
        {(producto.ancho || producto.alto || producto.prof) && (
          <div className="detalle-precio-row">
            <span>Medidas</span>
            <strong>
              {producto.ancho ?? "?"} × {producto.alto ?? "?"} ×{" "}
              {producto.prof ?? "?"} cm
            </strong>
          </div>
        )}
      </div>
    </div>
  );
}

const API = "https://integral-backend-production.up.railway.app";
const PAGE = 80;

export default function Productos({
  onSave,
  onDelete,
  selected,
  onSelect,
  modal,
  onOpenModal,
  onCloseModal,
  token,
}) {
  // ── Helper autenticado: agrega el JWT a todas las requests ──
  const authFetch = (url, options = {}) =>
    fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers ?? {}),
        Authorization: `Bearer ${token}`,
      },
    });

  const [form, setForm] = useState(EMPTY);
  // Guarda el margen que había al entrar al campo, para poder revertir si
  // el usuario confirma que NO quiso poner un margen > 100% (ver onBlur
  // del input de margen más abajo — evita errores de tipeo tipo "400" en
  // vez de "40").
  const margenAlEnfocarRef = useRef(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [detalleModal, setDetalleModal] = useState(null);
  const [familias, setFamilias] = useState([]);
  const [rubros, setRubros] = useState([]);
  const [aplicaciones, setAplicaciones] = useState(["CAJ", "PTA"]);
  const [aplicacionEsNueva, setAplicacionEsNueva] = useState(false);
  const [nuevaAplicacion, setNuevaAplicacion] = useState("");
  const [filtroFamilia, setFiltroFamilia] = useState("");
  const [filtroRubro, setFiltroRubro] = useState("");
  const [filtroProveedor, setFiltroProveedor] = useState("");
  const [rubrosDelFiltro, setRubrosDelFiltro] = useState([]);
  const [familiaEsNueva, setFamiliaEsNueva] = useState(false);
  const [rubroEsNuevo, setRubroEsNuevo] = useState(false);
  const [nuevoRubro, setNuevoRubro] = useState("");

  // Proveedores
  const [proveedores, setProveedores] = useState([]);
  const [provSearch, setProvSearch] = useState("");
  const [provFocus, setProvFocus] = useState(false);

  useEffect(() => {
    authFetch(`${API}/proveedores`)
      .then((r) => r.json())
      .then((data) => setProveedores(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  const proveedoresFiltrados =
    provSearch.trim().length > 0
      ? proveedores
          .filter(
            (p) =>
              (p.provnombre ?? "")
                .toLowerCase()
                .includes(provSearch.toLowerCase()) ||
              (p.fantasia ?? "")
                .toLowerCase()
                .includes(provSearch.toLowerCase()),
          )
          .slice(0, 8)
      : proveedores.slice(0, 8);

  // Cargar familias únicas
  useEffect(() => {
    authFetch(`${API}/articulos/familias-todas`)
      .then((r) => r.json())
      .then((data) => setFamilias(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  // Cargar rubros únicos (para el filtro y el form)
  const cargarRubros = () => {
    authFetch(`${API}/articulos/rubros`)
      .then((r) => r.json())
      .then((data) => setRubros(Array.isArray(data) ? data : []))
      .catch(() => {});
  };
  useEffect(() => {
    cargarRubros();
  }, []);

  // Cargar aplicaciones únicas (CAJ/PTA + lo que se haya agregado con
  // "+ Agregar" en otra sesión). Se mezclan con los defaults en vez de
  // reemplazarlos, para que CAJ/PTA sigan estando aunque la base todavía
  // no tenga ningún artículo con esos valores cargados.
  useEffect(() => {
    authFetch(`${API}/articulos/aplicaciones`)
      .then((r) => r.json())
      .then((data) => {
        const desdeDb = Array.isArray(data) ? data : [];
        setAplicaciones((prev) =>
          Array.from(new Set([...prev, ...desdeDb])).sort(),
        );
      })
      .catch(() => {});
  }, []);

  // Familias del filtro — se filtran por rubro si hay uno elegido
  useEffect(() => {
    if (filtroRubro) {
      authFetch(
        `${API}/articulos/familias-por-rubro?rubro=${encodeURIComponent(filtroRubro)}`,
      )
        .then((r) => r.json())
        .then((data) => {
          setRubrosDelFiltro(Array.isArray(data) ? data : []);
          setFiltroFamilia("");
          setPage(1);
        })
        .catch(() => {});
    } else {
      authFetch(`${API}/articulos/familias-todas`)
        .then((r) => r.json())
        .then((data) => {
          setRubrosDelFiltro(Array.isArray(data) ? data : []);
        })
        .catch(() => {});
    }
  }, [filtroRubro]);

  // Debounce search
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: PAGE });
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (filtroFamilia) params.set("familia", filtroFamilia);
      if (filtroRubro) params.set("rubro", filtroRubro);
      if (filtroProveedor) params.set("proveedor", filtroProveedor);
      const countParams = new URLSearchParams();
      if (debouncedSearch) countParams.set("search", debouncedSearch);
      if (filtroFamilia) countParams.set("familia", filtroFamilia);
      if (filtroRubro) countParams.set("rubro", filtroRubro);
      if (filtroProveedor) countParams.set("proveedor", filtroProveedor);
      const countQ = countParams.toString() ? `?${countParams}` : "";
      const [dataRes, countRes] = await Promise.all([
        authFetch(`${API}/productos?${params}`),
        authFetch(`${API}/productos/count${countQ}`),
      ]);
      const data = await dataRes.json();
      const count = await countRes.json();
      setRows(Array.isArray(data) ? data : []);
      setTotal(count.total ?? 0);
    } catch (e) {
      console.error("Error cargando productos:", e);
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, filtroFamilia, filtroRubro, filtroProveedor]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  const totalPages = Math.ceil(total / PAGE);
  // Filtrado client-side como fallback por si el backend no soporta familia/rubro aún
  const filtered = rows.filter((r) => {
    if (
      filtroFamilia &&
      (r.familia ?? "").toLowerCase() !== filtroFamilia.toLowerCase()
    )
      return false;
    if (
      filtroRubro &&
      (r.rubro ?? "").toLowerCase() !== filtroRubro.toLowerCase()
    )
      return false;
    if (
      filtroProveedor &&
      (r.proveedor ?? "").toLowerCase() !== filtroProveedor.toLowerCase()
    )
      return false;
    return true;
  });

  const openNew = () => {
    setForm(EMPTY);
    setError("");
    setFamiliaEsNueva(false);
    setRubroEsNuevo(false);
    setNuevoRubro("");
    setAplicacionEsNueva(false);
    setNuevaAplicacion("");
    setProvSearch("");
    setProvFocus(false);
    onOpenModal("nuevo");
  };

  const openEdit = async () => {
    if (!selected) return;
    const s = (v) => (v != null && v !== "null" ? String(v) : "");

    // Traer el dato fresco de la BD por id, en vez de confiar en "selected"
    // (que puede haber quedado desactualizado tras un guardado previo, ej:
    // no reflejaba la "familia" recién asignada). Si el fetch falla, se usa
    // "selected" como respaldo para no romper el flujo.
    let art = selected;
    try {
      const res = await authFetch(`${API}/productos/${selected.id}`);
      if (res.ok) art = await res.json();
    } catch (e) {
      console.error("[openEdit] no se pudo refrescar el artículo, uso selected:", e);
    }

    // Recalcular costos/precio con la fórmula vigente al abrir el modal,
    // en vez de confiar en lo que haya guardado la base (puede haber
    // quedado desincronizado: cambios de margen sin resave, cargas por
    // Excel que solo tocaron `precio`, etc). Usa el descuento del
    // proveedor como fallback si el artículo no tiene uno propio guardado.
    const provDelArticulo = proveedores.find(
      (p) => (p.fantasia || p.provnombre) === art.proveedor || p.provnombre === art.proveedor,
    );
    const descuentoEfectivo =
      art.descuento != null && art.descuento !== ""
        ? art.descuento
        : provDelArticulo?.descuento ?? "";
    const recalculado = recalcularCostosYPrecio(
      art.valorlista,
      descuentoEfectivo,
      art.margen,
    );

    setForm({
      codartint: s(art.codartint),
      articulo: s(art.articulo),
      area: s(art.area),
      unidad: s(art.unidad),
      artfoto:
        art.artfoto && art.artfoto !== "null" ? art.artfoto : "",
      precio: recalculado.precio || s(art.precio),
      proveedor: s(art.proveedor),
      cantidad: s(art.cantidad),
      ancho: s(art.ancho),
      alto: s(art.alto),
      prof: s(art.prof),
      linea: s(art.linea),
      aplicacion: s(art.aplicacion),
      color: s(art.color),
      familia: s(art.familia),
      rubro: s(art.rubro),
      costosi: recalculado.costosi || s(art.costosi),
      costosicf: recalculado.costosicf || s(art.costosicf),
      costocicf: recalculado.costocicf || s(art.costocicf),
      costo_placa: s(art.costo_placa),
      descuento: s(art.descuento),
      flete: s(art.flete),
      valorlista: s(art.valorlista),
      fecha_precio: art.fecha_precio
        ? String(art.fecha_precio).slice(0, 10)
        : "",
      margen: s(art.margen),
      codartprov: s(art.codartprov),
      prod_prov: s(art.prod_prov),
      mca: s(art.mca),
      precio_un: recalculado.precio_un || s(art.precio_un),
    });
    setError("");
    setFamiliaEsNueva(false);
    setRubroEsNuevo(false);
    setNuevoRubro("");
    setAplicacionEsNueva(false);
    setNuevaAplicacion("");
    setProvSearch(s(art.proveedor));
    setProvFocus(false);
    onOpenModal("editar");
  };

  const handleAgregarRubro = () => {
    const r = nuevoRubro.trim().toUpperCase();
    if (!r) return;
    if (!rubros.includes(r)) setRubros((prev) => [...prev, r].sort());
    setForm((f) => ({ ...f, rubro: r }));
    setNuevoRubro("");
    setRubroEsNuevo(false);
  };

  const handleAgregarAplicacion = () => {
    const a = nuevaAplicacion.trim().toUpperCase();
    if (!a) return;
    if (!aplicaciones.includes(a))
      setAplicaciones((prev) => [...prev, a].sort());
    setForm((f) => ({ ...f, aplicacion: a }));
    setNuevaAplicacion("");
    setAplicacionEsNueva(false);
  };

  const handleSubmit = () => {
    if (!form.articulo.trim()) {
      setError("El artículo es obligatorio.");
      return;
    }
    const data = {
      codartint: form.codartint || null,
      articulo: form.articulo,
      area: form.area || null,
      unidad: form.unidad || null,
      artfoto: form.artfoto || null,
      precio: toDecimal(form.precio),
      proveedor: form.proveedor || null,
      cantidad: toInt(form.cantidad),
      ancho: toDecimal(form.ancho),
      alto: toDecimal(form.alto),
      prof: toDecimal(form.prof),
      linea: form.linea || null,
      aplicacion: form.aplicacion || null,
      color: form.color || null,
      familia: form.familia || null,
      rubro: form.rubro || null,
      costosi: toDecimal(form.costosi),
      costosicf: toDecimal(form.costosicf),
      costocicf: toDecimal(form.costocicf),
      costo_placa: toDecimal(form.costo_placa),
      descuento: toDecimal(form.descuento),
      valorlista: toDecimal(form.valorlista),
      fecha_precio: form.fecha_precio || null,
      margen: toDecimal(form.margen),
      codartprov: form.codartprov || null,
      prod_prov: form.prod_prov || null,
      // mca es NOT NULL en la BD: si está vacío, mandar 0 en vez de null
      mca:
        form.mca !== "" && form.mca != null
          ? parseInt(form.mca, 10) || 0
          : 0,
    };
    const payload = modal === "nuevo" ? data : { ...data, id: selected.id };
    onSave(payload);
    onCloseModal();
    setForm(EMPTY);
    setTimeout(() => {
      fetchRows();
      cargarRubros();
    }, 500);
  };

  const columns = makeColumns((row) => setDetalleModal(row));

  return (
    <>
      <ScreenHeader
        icon="🛒"
        title="Productos"
        subtitle={loading ? "Cargando..." : `${total} artículos encontrados`}
      />

      <ActionBar
        selected={selected}
        onNew={openNew}
        onEdit={openEdit}
        onDelete={() => selected && onOpenModal("eliminar")}
        search={search}
        onSearch={setSearch}
      />

      {/* Filtros Rubro / Familia + Buscador */}
      <div
        style={{
          display: "flex",
          gap: 10,
          margin: "8px 0",
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <input
          className="form-input"
          style={{
            maxWidth: 260,
            marginBottom: 0,
            paddingLeft: 32,
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%236699bb' stroke-width='2'%3E%3Ccircle cx='11' cy='11' r='8'/%3E%3Cpath d='m21 21-4.35-4.35'/%3E%3C/svg%3E\")",
            backgroundRepeat: "no-repeat",
            backgroundPosition: "10px center",
          }}
          placeholder="Buscar artículo, código..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="form-input"
          style={{ maxWidth: 220, marginBottom: 0, cursor: "pointer" }}
          value={filtroRubro}
          onChange={(e) => {
            setFiltroRubro(e.target.value);
            setFiltroFamilia("");
            setPage(1);
          }}
        >
          <option value="">— Todos los rubros —</option>
          {rubros.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <select
          className="form-input"
          style={{ maxWidth: 220, marginBottom: 0, cursor: "pointer" }}
          value={filtroFamilia}
          onChange={(e) => {
            setFiltroFamilia(e.target.value);
            setPage(1);
          }}
          disabled={!filtroRubro && rubrosDelFiltro.length === 0}
        >
          <option value="">— Todas las familias —</option>
          {(filtroRubro ? rubrosDelFiltro : familias).map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
        <select
          className="form-input"
          style={{ maxWidth: 220, marginBottom: 0, cursor: "pointer" }}
          value={filtroProveedor}
          onChange={(e) => {
            setFiltroProveedor(e.target.value);
            setPage(1);
          }}
        >
          <option value="">— Todos los proveedores —</option>
          {proveedores.map((p) => {
            const nombre = p.fantasia || p.provnombre || p.nombre || p;
            return (
              <option key={nombre} value={nombre}>
                {nombre}
              </option>
            );
          })}
        </select>
        {(filtroRubro || filtroFamilia || filtroProveedor) && (
          <button
            className="btn-cancel"
            style={{ padding: "6px 14px", fontSize: 12, whiteSpace: "nowrap" }}
            onClick={() => {
              setFiltroRubro("");
              setFiltroFamilia("");
              setFiltroProveedor("");
              setPage(1);
            }}
          >
            ✕ Limpiar filtros
          </button>
        )}
      </div>

      {totalPages > 1 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            margin: "8px 0",
            fontSize: 12,
            fontFamily: "monospace",
            color: "#4a6a80",
          }}
        >
          <button
            className="btn-action"
            style={{ padding: "3px 10px" }}
            disabled={page === 1}
            onClick={() => setPage(1)}
          >
            «
          </button>
          <button
            className="btn-action"
            style={{ padding: "3px 10px" }}
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
          >
            ‹
          </button>
          <span>
            Página <strong>{page}</strong> de <strong>{totalPages}</strong>
          </span>
          <button
            className="btn-action"
            style={{ padding: "3px 10px" }}
            disabled={page === totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            ›
          </button>
          <button
            className="btn-action"
            style={{ padding: "3px 10px" }}
            disabled={page === totalPages}
            onClick={() => setPage(totalPages)}
          >
            »
          </button>
        </div>
      )}

      <div className="tabla-detalle-layout">
        <div className="tabla-detalle-tabla">
          <DataTable
            columns={columns}
            rows={filtered}
            selectedId={selected?.id}
            onSelect={onSelect}
          />
        </div>
        <div className="tabla-detalle-panel">
          <DetalleArticulo producto={selected} />
        </div>
      </div>

      {(modal === "nuevo" || modal === "editar") && (
        <Modal
          title={modal === "nuevo" ? "Nuevo producto" : "Editar producto"}
          onClose={onCloseModal}
        >
          {error && <p className="form-error">{error}</p>}
          <div className="form-grid">
            <div>
              {FIELDS_LEFT_TOP.map((f) => (
                <FormField key={f.field} {...f} form={form} setForm={setForm} />
              ))}

              {/* Rubro — debajo de Artículo */}
              <div className="form-group">
                <label className="form-label">Rubro</label>
                {!rubroEsNuevo ? (
                  <select
                    className="form-input"
                    value={form.rubro ?? ""}
                    onChange={(e) => {
                      if (e.target.value === "__nuevo__") {
                        setRubroEsNuevo(true);
                        setForm((p) => ({ ...p, rubro: "" }));
                      } else {
                        setForm((p) => ({ ...p, rubro: e.target.value }));
                      }
                    }}
                    style={{ cursor: "pointer" }}
                  >
                    <option value="">— Sin rubro —</option>
                    {rubros.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                    <option value="__nuevo__">
                      ✏️ Escribir nuevo rubro...
                    </option>
                  </select>
                ) : (
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      className="form-input"
                      style={{ flex: 1, marginBottom: 0 }}
                      placeholder="Nombre del nuevo rubro"
                      value={nuevoRubro}
                      onChange={(e) => setNuevoRubro(e.target.value)}
                      onKeyDown={(e) =>
                        e.key === "Enter" && handleAgregarRubro()
                      }
                      autoFocus
                    />
                    <button
                      type="button"
                      className="btn-save"
                      style={{ padding: "8px 12px" }}
                      onClick={handleAgregarRubro}
                    >
                      ✓
                    </button>
                    <button
                      type="button"
                      className="btn-cancel"
                      style={{ padding: "8px 12px" }}
                      onClick={() => {
                        setRubroEsNuevo(false);
                        setNuevoRubro("");
                      }}
                    >
                      ← Volver
                    </button>
                  </div>
                )}
              </div>

              {/* Familia — debajo de Rubro */}
              <div className="form-group">
                <label className="form-label">Familia</label>
                {!familiaEsNueva ? (
                  <select
                    className="form-input"
                    value={form.familia ?? ""}
                    onChange={(e) => {
                      if (e.target.value === "__nueva__") {
                        setFamiliaEsNueva(true);
                        setForm((p) => ({ ...p, familia: "" }));
                      } else {
                        setForm((p) => ({ ...p, familia: e.target.value }));
                      }
                    }}
                    style={{ cursor: "pointer" }}
                  >
                    <option value="">— Sin familia —</option>
                    {familias.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                    <option value="__nueva__">
                      ✏️ Escribir nueva familia...
                    </option>
                  </select>
                ) : (
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      className="form-input"
                      style={{ flex: 1, marginBottom: 0 }}
                      placeholder="Nombre de la nueva familia"
                      value={form.familia}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, familia: e.target.value }))
                      }
                      autoFocus
                    />
                    <button
                      type="button"
                      className="btn-cancel"
                      style={{ padding: "8px 12px", whiteSpace: "nowrap" }}
                      onClick={() => {
                        setFamiliaEsNueva(false);
                        setForm((p) => ({ ...p, familia: "" }));
                      }}
                    >
                      ← Volver
                    </button>
                  </div>
                )}
              </div>

              {/* Proveedor — ligado a tabla proveedor */}
              <div className="form-group" style={{ position: "relative" }}>
                <label className="form-label">Proveedor</label>
                <input
                  className="form-input"
                  placeholder="Buscar proveedor..."
                  value={provSearch}
                  autoComplete="off"
                  onChange={(e) => {
                    setProvSearch(e.target.value);
                    setForm((p) => ({ ...p, proveedor: e.target.value }));
                    setProvFocus(true);
                  }}
                  onFocus={() => setProvFocus(true)}
                  onBlur={() => setTimeout(() => setProvFocus(false), 180)}
                />
                {provFocus && proveedoresFiltrados.length > 0 && (
                  <div
                    style={{
                      position: "absolute",
                      zIndex: 999,
                      background: "#fff",
                      border: "1px solid #b8cfe0",
                      borderRadius: 3,
                      width: "100%",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
                      maxHeight: 220,
                      overflowY: "auto",
                    }}
                  >
                    {proveedoresFiltrados.map((p) => (
                      <div
                        key={p.id}
                        style={{
                          padding: "8px 12px",
                          cursor: "pointer",
                          fontSize: 13,
                          borderBottom: "1px solid #f0f4f8",
                        }}
                        onMouseDown={() => {
                          const nombre = p.fantasia || p.provnombre;
                          setForm((f) => ({ ...f, proveedor: nombre }));
                          setProvSearch(nombre);
                          setProvFocus(false);
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.background = "#ddeefa")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.background = "#fff")
                        }
                      >
                        <strong>{p.provnombre}</strong>
                        {p.fantasia && p.fantasia !== p.provnombre && (
                          <span
                            style={{
                              color: "#6699bb",
                              marginLeft: 6,
                              fontSize: 11,
                            }}
                          >
                            ({p.fantasia})
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ── Unidad de medida ── */}
              <div className="form-field" style={{ marginBottom: 12 }}>
                <label
                  style={{
                    display: "block",
                    fontWeight: 600,
                    marginBottom: 4,
                    fontSize: 13,
                  }}
                >
                  Unidad
                </label>
                <select
                  value={form.unidad || ""}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, unidad: e.target.value }))
                  }
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: 6,
                    border: "1px solid #ccc",
                    fontSize: 14,
                    background: "#fff",
                  }}
                >
                  <option value="">-- Seleccionar --</option>
                  <option value="UN">UN — Unidad</option>
                  <option value="M2">M2 — Metro cuadrado</option>
                </select>
              </div>
              {FIELDS_LEFT_BOTTOM.map((f) => (
                <FormField key={f.field} {...f} form={form} setForm={setForm} />
              ))}

              {/* ── Costos con auto-cálculo ── */}
              {(() => {
                const recalcular = recalcularCostosYPrecio;

                // Descuento del proveedor seleccionado
                const provSeleccionado = proveedores.find(
                  (p) =>
                    (p.fantasia || p.provnombre) === form.proveedor ||
                    p.provnombre === form.proveedor,
                );
                const descuentoProv = provSeleccionado?.descuento ?? "";

                const inputStyle = { width: "100%", boxSizing: "border-box" };
                const readonlyStyle = {
                  ...inputStyle,
                  background: "#f0f6fb",
                  color: "#4a6a80",
                  cursor: "not-allowed",
                };

                return (
                  <>
                    {/* Descuento — muestra el del proveedor, editable si se quiere */}
                    <div className="form-group">
                      <label className="form-label">
                        Descuento proveedor (%)
                      </label>
                      <input
                        className="form-input"
                        style={inputStyle}
                        type="number"
                        placeholder="Ej: 30"
                        value={
                          form.descuento !== "" ? form.descuento : descuentoProv
                        }
                        onChange={(e) => {
                          const d = e.target.value;
                          const calc = recalcular(
                            form.valorlista,
                            d,
                            form.margen,
                          );
                          setForm((p) => ({ ...p, descuento: d, ...calc }));
                        }}
                      />
                      {descuentoProv !== "" && form.descuento === "" && (
                        <small style={{ color: "#6699bb", fontSize: 11 }}>
                          Tomado del proveedor: {descuentoProv}%
                        </small>
                      )}
                    </div>

                    {/* Valor lista proveedor */}
                    <div className="form-group">
                      <label className="form-label">
                        Valor lista proveedor ($)
                      </label>
                      <input
                        className="form-input"
                        style={inputStyle}
                        type="number"
                        placeholder="Ej: 48000"
                        value={form.valorlista}
                        onChange={(e) => {
                          const vl = e.target.value;
                          const dto =
                            form.descuento !== ""
                              ? form.descuento
                              : descuentoProv;
                          const calc = recalcular(vl, dto, form.margen);
                          setForm((p) => ({ ...p, valorlista: vl, ...calc }));
                        }}
                      />
                    </div>

                    {/* Fecha del precio — editable manualmente */}
                    <div className="form-group">
                      <label className="form-label">Fecha precio</label>
                      <input
                        className="form-input"
                        style={inputStyle}
                        type="date"
                        value={form.fecha_precio}
                        onChange={(e) =>
                          setForm((p) => ({
                            ...p,
                            fecha_precio: e.target.value,
                          }))
                        }
                      />
                    </div>

                    {/* Costo sin impuestos — calculado */}
                    <div className="form-group">
                      <label className="form-label">
                        Costo sin imp.{" "}
                        <small style={{ color: "#6699bb" }}>
                          (lista × (1 - dto%))
                        </small>
                      </label>
                      <input
                        className="form-input"
                        style={readonlyStyle}
                        readOnly
                        value={form.costosi}
                        placeholder="—"
                      />
                    </div>

                    {/* Costo sin imp. con flete — calculado */}
                    <div className="form-group">
                      <label className="form-label">
                        Costo sin imp. con flete{" "}
                        <small style={{ color: "#6699bb" }}>(× 1.10)</small>
                      </label>
                      <input
                        className="form-input"
                        style={readonlyStyle}
                        readOnly
                        value={form.costosicf}
                        placeholder="—"
                      />
                    </div>

                    {/* Costo con imp. con flete — calculado */}
                    <div className="form-group">
                      <label className="form-label">
                        Costo con imp. con flete{" "}
                        <small style={{ color: "#6699bb" }}>(× 1.21)</small>
                      </label>
                      <input
                        className="form-input"
                        style={readonlyStyle}
                        readOnly
                        value={form.costocicf}
                        placeholder="—"
                      />
                    </div>

                    {/* Margen — editable */}
                    <div className="form-group">
                      <label className="form-label">Margen (%)</label>
                      <input
                        className="form-input"
                        style={inputStyle}
                        type="number"
                        placeholder="Ej: 40"
                        value={form.margen}
                        onFocus={() => {
                          margenAlEnfocarRef.current = form.margen;
                        }}
                        onChange={(e) => {
                          const mg = e.target.value;
                          const dto =
                            form.descuento !== ""
                              ? form.descuento
                              : descuentoProv;
                          const calc = recalcular(form.valorlista, dto, mg);
                          setForm((p) => ({ ...p, margen: mg, ...calc }));
                        }}
                        onBlur={(e) => {
                          const mg = parseFloat(e.target.value);
                          if (!isNaN(mg) && mg > 100) {
                            const confirmado = window.confirm(
                              `Margen de ${mg}% — es un valor alto, ¿confirmás que no es un error de tipeo?`,
                            );
                            if (!confirmado) {
                              const previo = margenAlEnfocarRef.current ?? "";
                              const dto =
                                form.descuento !== ""
                                  ? form.descuento
                                  : descuentoProv;
                              const calc = recalcular(form.valorlista, dto, previo);
                              setForm((p) => ({ ...p, margen: previo, ...calc }));
                            }
                          }
                        }}
                      />
                    </div>

                    {/* Precio — calculado: precio de costo, SIN margen aplicado */}
                    <div className="form-group">
                      <label className="form-label">
                        Precio ($){" "}
                        <small style={{ color: "#6699bb" }}>
                          (costo c/imp. c/flete, sin margen)
                        </small>
                      </label>
                      <input
                        className="form-input"
                        style={readonlyStyle}
                        readOnly
                        value={form.precio}
                        placeholder="—"
                      />
                    </div>

                    {/* Precio UN — con el margen aplicado sobre el precio de costo */}
                    <div className="form-group">
                      <label className="form-label">
                        Precio UN ($){" "}
                        <small style={{ color: "#6699bb" }}>
                          (precio × (1 + margen%))
                        </small>
                      </label>
                      <input
                        className="form-input"
                        style={readonlyStyle}
                        readOnly
                        value={form.precio_un ?? ""}
                        placeholder="—"
                      />
                    </div>
                  </>
                );
              })()}

              {form.area === "2" && (
                <FormField
                  field="costo_placa"
                  label="Costo placa"
                  placeholder="Ej: 38000"
                  form={form}
                  setForm={setForm}
                />
              )}

              {/* Aplicación: solo tiene sentido en accesorios (area=
                  'accesorio', ej. bisagras/guías telescópicas). Determina
                  en qué tipo de ítem puede tildarse el accesorio en el
                  presupuesto — 'CAJ' para cajones/correderas, 'PTA' para
                  puertas. Ver popover de accesorios en
                  PresupuestoNuevo.jsx. */}
              {String(form.area).trim().toLowerCase() === "accesorio" && (
                <div className="form-field" style={{ marginBottom: 12 }}>
                  <label
                    style={{
                      display: "block",
                      fontWeight: 600,
                      marginBottom: 4,
                      fontSize: 13,
                    }}
                  >
                    Aplicación
                  </label>
                  {!aplicacionEsNueva ? (
                    <select
                      value={form.aplicacion || ""}
                      onChange={(e) => {
                        if (e.target.value === "__nuevo__") {
                          setAplicacionEsNueva(true);
                          setForm((f) => ({ ...f, aplicacion: "" }));
                        } else {
                          setForm((f) => ({
                            ...f,
                            aplicacion: e.target.value,
                          }));
                        }
                      }}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        borderRadius: 6,
                        border: "1px solid #ccc",
                        fontSize: 14,
                        background: "#fff",
                        cursor: "pointer",
                      }}
                    >
                      <option value="">-- Sin restricción --</option>
                      {aplicaciones.map((a) => (
                        <option key={a} value={a}>
                          {a}
                        </option>
                      ))}
                      <option value="__nuevo__">
                        ✏️ Escribir nueva aplicación...
                      </option>
                    </select>
                  ) : (
                    <div style={{ display: "flex", gap: 8 }}>
                      <input
                        className="form-input"
                        style={{ flex: 1, marginBottom: 0 }}
                        placeholder="Ej: EST"
                        value={nuevaAplicacion}
                        onChange={(e) => setNuevaAplicacion(e.target.value)}
                        onKeyDown={(e) =>
                          e.key === "Enter" && handleAgregarAplicacion()
                        }
                        autoFocus
                      />
                      <button
                        type="button"
                        className="btn-save"
                        style={{ padding: "8px 12px" }}
                        onClick={handleAgregarAplicacion}
                      >
                        ✓
                      </button>
                      <button
                        type="button"
                        className="btn-cancel"
                        style={{ padding: "8px 12px" }}
                        onClick={() => {
                          setAplicacionEsNueva(false);
                          setNuevaAplicacion("");
                        }}
                      >
                        ← Volver
                      </button>
                    </div>
                  )}
                </div>
              )}

              <FotoUpload
                value={form.artfoto}
                onChange={(val) => setForm((p) => ({ ...p, artfoto: val }))}
                token={token}
              />
            </div>
            <div>
              {FIELDS_RIGHT.map((f) => (
                <FormField key={f.field} {...f} form={form} setForm={setForm} />
              ))}
            </div>
          </div>
          <div className="form-actions">
            <button className="btn-cancel" onClick={onCloseModal}>
              Cancelar
            </button>
            <button className="btn-save" onClick={handleSubmit}>
              {modal === "nuevo" ? "Guardar" : "Actualizar"}
            </button>
          </div>
        </Modal>
      )}

      {modal === "eliminar" && (
        <ConfirmDelete
          item={selected}
          onConfirm={onDelete}
          onClose={onCloseModal}
        />
      )}

      {detalleModal && (
        <Modal
          title="Detalle del artículo"
          onClose={() => setDetalleModal(null)}
        >
          <DetalleArticulo producto={detalleModal} />
        </Modal>
      )}
    </>
  );
}
