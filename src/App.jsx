import Usuarios from "./screens/Usuarios";
import Clientes from "./screens/Clientes";
import Productos from "./screens/Productos";
import PresupuestoMuebles from "./screens/PresupuestoMuebles";
import PresupuestoMamparas from "./screens/PresupuestoMamparas";
import VerTablas from "./screens/VerTablas";
import Margen from "./screens/Margen";
import Lista from "./screens/Lista";
import PresupuestosMamparasTabla from "./screens/PresupuestosMamparasTabla";
import PresupuestosVanitoryTabla from "./screens/PresupuestosVanitoryTabla";
import PresupuestoAmoblamiento from "./screens/PresupuestoAmoblamiento";
import PresupuestoNuevo from "./screens/PresupuestoNuevo";
import ListaPresupuestos from "./screens/ListaPresupuestos";
import ObrasConfirmadas from "./screens/ObrasConfirmadas";
import Produccion from "./screens/Produccion";
import Chat from "./screens/Chat";
import MuebleEspecial from "./screens/MuebleEspecial";
import Facturas from "./screens/Facturas";
import FacturasVenta from "./screens/FacturasVenta";
import FacturaManual from "./screens/FacturaManual";
import HistorialFacturas from "./screens/HistorialFacturas";
import AfipIVA from "./screens/AfipIVA";
import ActualizarPreciosExcel from "./screens/ActualizarPreciosExcel";
import VehiculosMantenimiento from "./screens/VehiculosMantenimiento";
import CuentaCorriente from "./screens/CuentaCorriente";
import TestFacturacionAFIP from "./screens/TestFacturacionAFIP"; // TEMPORAL: pantalla de prueba AFIP, borrar cuando ya no haga falta
import VisorDWGPage from "./screens/VisorDWGPage";
import ActionButton from "./Component/ActionButton";
import Login from "./screens/Login";
import { useEffect, useState } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";

const API = "https://integral-backend-production.up.railway.app";

const SCREENS = {
  clientes: { label: "CLIENTES", icon: "👥" },
  productos: { label: "PRODUCTOS", icon: "🛒" },
  "presupuesto-muebles": { label: "PRESUPUESTO MUEBLES", icon: "🪵" },
  "presupuesto-mamparas": { label: "PRESUPUESTO MAMPARAS", icon: "🪟" },
  "ver-tablas": { label: "VER TABLAS", icon: "🗃️" },
  "presupuestos-tabla": { label: "PRESUPUESTOS MAMPARAS", icon: "📋" },
  "presupuestos-vanitory-tabla": { label: "PRESUPUESTOS VANITORY", icon: "🛁" },
  "presupuesto-amoblamiento": { label: "PRESUPUESTO AMOBLAMIENTO", icon: "🪑" },
  "presupuesto-nuevo": { label: "PRESUPUESTO NUEVO", icon: "📝" },
  "lista-margenes": { label: "LISTA DE MÁRGENES", icon: "📊" },
  "lista-presupuestos-2": { label: "LISTA PRESUPUESTOS", icon: "⚡" },
  "mueble-especial": { label: "MUEBLE ESPECIAL", icon: "🪚" },
  "obras-confirmadas": { label: "OBRAS CONFIRMADAS", icon: "✅" },
  produccion: { label: "PRODUCCIÓN", icon: "🏭" },
  facturas: { label: "FACTURAS", icon: "🧾" },
  "facturas-venta": { label: "FACTURAS EMITIDAS", icon: "🧮" },
  "factura-manual": { label: "FACTURAR (MANUAL)", icon: "🧾" },
  "historial-facturas": { label: "HISTORIAL FACTURAS", icon: "📋" },
  "afip-iva": { label: "AFIP IVA", icon: "🏦" },
  usuarios: { label: "USUARIOS", icon: "👤" },
  "actualizar-precios": { label: "ACTUALIZAR PRECIOS", icon: "💲" },
  "vehiculos-mantenimiento": { label: "VEHÍCULOS - MANTENIMIENTO", icon: "🚚" },
  "cuenta-corriente": { label: "CLIENTES ACTIVOS", icon: "💰" },
  "test-afip-facturar": { label: "TEST AFIP FACTURAR", icon: "🧪" }, // TEMPORAL
  "visor-dwg": { label: "VISOR 3D MÓDULOS", icon: "📐" },
  chat: { label: "CHAT", icon: "💬" },
};

const buttons = [
  {
    id: 1,
    label: "CLIENTES",
    icon: "👥",
    color: "#eb56d7",
    screen: "clientes",
  },
  {
    id: 2,
    label: "PRODUCTOS",
    icon: "🛒",
    color: "#ff6b6b",
    screen: "productos",
  },
  {
    id: 6,
    label: "PRESUP. NUEVO",
    icon: "📝",
    color: "#ff9a3c",
    screen: "presupuesto-nuevo",
  },
  {
    id: 7,
    label: "VER TABLAS",
    icon: "🗃️",
    color: "#00c9a7",
    screen: "ver-tablas",
  },
  {
    id: 14,
    label: "LISTA PRESUPUESTOS",
    icon: "⚡",
    color: "#7b61ff",
    screen: "lista-presupuestos-2",
  },
  {
    id: 12,
    label: "CLIENTES ACTIVOS",
    icon: "💰",
    color: "#e67e22",
    screen: "cuenta-corriente",
  },
  {
    id: 13,
    label: "OBRAS CONFIRMADAS",
    icon: "✅",
    color: "#00b4d8",
    screen: "obras-confirmadas",
  },
  {
    // TEMPORAL: pantalla de prueba del circuito React -> Node -> Python -> AFIP.
    // Borrar este bloque (y el import de arriba) cuando ya no haga falta.
    id: 16,
    label: "TEST AFIP",
    icon: "🧪",
    color: "#9b59b6",
    screen: "test-afip-facturar",
  },
  {
    id: 15,
    label: "PRODUCCIÓN",
    icon: "🏭",
    color: "#8d6e63",
    screen: "produccion",
  },
  {
    id: 17,
    label: "VISOR 3D MÓDULOS",
    icon: "📐",
    color: "#00838f",
    screen: "visor-dwg",
  },
  {
    id: 18,
    label: "CHAT",
    icon: "💬",
    color: "#25d366",
    screen: "chat",
  },
];

const HOME_SECTIONS = {
  main: "main",
  admin: "admin",
};

export default function Root() {
  return (
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  );
}

function AuthGate() {
  const { usuario } = useAuth();
  if (!usuario) return <Login />;
  return <App />;
}

function App() {
  const { usuario, token, authFetch, logout } = useAuth();
  const [screen, setScreen] = useState(null);
  const [active, setActive] = useState(null);
  const [log, setLog] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [homeSection, setHomeSection] = useState(HOME_SECTIONS.main);

  const [clientes, setClientes] = useState([]);
  const [productos, setProductos] = useState([]);
  const [tiposEscritorio, setTiposEscritorio] = useState([]);
  const [tiposDespensero, setTiposDespensero] = useState([]);
  const [formulas, setFormulas] = useState([]);
  const [margen, setMargen] = useState([]);
  const [listas, setListas] = useState([]);
  const [presupuestosMamparas, setPresupuestosMamparas] = useState([]);
  const [selectedPresupuestoMampara, setSelectedPresupuestoMampara] =
    useState(null);
  const [presupuestosPuertas, setPresupuestosPuertas] = useState([]);
  const [selectedPresupuestoPuerta, setSelectedPresupuestoPuerta] =
    useState(null);
  const [presupuestosVanitory, setPresupuestosVanitory] = useState([]);
  const [selectedPresupuestoVanitory, setSelectedPresupuestoVanitory] =
    useState(null);
  const [asociaciones, setAsociaciones] = useState([]);
  const [selectedAsociacion, setSelectedAsociacion] = useState(null);
  const [asociacionesForm, setAsociacionesForm] = useState([]);
  const [selectedAsociacionForm, setSelectedAsociacionForm] = useState(null);
  const [formStd, setFormStd] = useState([]);
  const [selectedFormStd, setSelectedFormStd] = useState(null);
  const [asocFormStd, setAsocFormStd] = useState([]);
  const [selectedAsocFormStd, setSelectedAsocFormStd] = useState(null);
  const [colocaciones, setColocaciones] = useState([]);
  const [selectedColocacion, setSelectedColocacion] = useState(null);
  const [selectedCliente, setSelectedCliente] = useState(null);
  const [selectedProducto, setSelectedProducto] = useState(null);
  const [selectedTipoEscritorio, setSelectedTipoEscritorio] = useState(null);
  const [selectedTipoDespensero, setSelectedTipoDespensero] = useState(null);
  const [selectedFormula, setSelectedFormula] = useState(null);
  const [selectedMargen, setSelectedMargen] = useState(null);
  const [selectedLista, setSelectedLista] = useState(null);
  const [modal, setModal] = useState(null);

  // ── authFetch ahora viene de useAuth() (ver arriba) ──────

  // ── Permisos del usuario logueado ────────────────────────
  const [permisos, setPermisos] = useState({});

  useEffect(() => {
    if (!token) return;
    fetch(`${API}/permisos`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((rows) => {
        const map = {};
        rows.forEach(({ rol, modulo, accion, permitido }) => {
          map[rol] = map[rol] ?? {};
          map[rol][modulo] = map[rol][modulo] ?? {};
          map[rol][modulo][accion] = !!permitido;
        });
        setPermisos(map);
      })
      .catch(console.error);
  }, [token]);

  // puedo("productos", "crear") → true/false
  const puedo = (modulo, accion) => {
    const rol = usuario?.rol ?? "operario";
    if (rol === "admin") return true;
    return permisos?.[rol]?.[modulo]?.[accion] ?? false;
  };

  // ── Orden del panel principal por rol ────────────────────
  const [ordenPanel, setOrdenPanel] = useState({});

  useEffect(() => {
    if (!token) return;
    fetch(`${API}/orden-panel`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((rows) => {
        // rows: [{ rol, modulo, orden }, ...]
        const map = {};
        rows.forEach(({ rol, modulo, orden }) => {
          map[rol] = map[rol] ?? [];
          map[rol][orden] = modulo;
        });
        const limpio = {};
        Object.keys(map).forEach((rol) => {
          limpio[rol] = map[rol].filter(Boolean);
        });
        setOrdenPanel(limpio);
      })
      .catch(console.error);
  }, [token]);

  // Reordena `buttons` según el orden guardado para el rol del usuario.
  // Los botones que no estén en el orden guardado (screens nuevos, chat,
  // test-afip-facturar, etc.) se agregan al final en su orden original.
  const buttonsOrdenados = (() => {
    const rol = usuario?.rol ?? "operario";
    const orden = ordenPanel[rol];
    if (!orden || orden.length === 0) return buttons;
    const porScreen = new Map(buttons.map((b) => [b.screen, b]));
    const ordenados = orden.map((screenId) => porScreen.get(screenId)).filter(Boolean);
    const yaUsados = new Set(ordenados.map((b) => b.screen));
    const faltantes = buttons.filter((b) => !yaUsados.has(b.screen));
    return [...ordenados, ...faltantes];
  })();

  // ── Proveedores ──────────────────────────────────────────
  const [proveedores, setProveedores] = useState([]);
  const [selectedProveedor, setSelectedProveedor] = useState(null);

  // ── Feriados / Semanas del año ───────────────────────────
  const [feriados, setFeriados] = useState([]);
  const [selectedFeriado, setSelectedFeriado] = useState(null);
  const [semanasAnio, setSemanasAnio] = useState([]); // solo lectura, sin selección

  // ── Navegación interna Amoblamiento ─────────────────────
  const [amoblamientoVista, setAmoblamientoVista] = useState("selector");
  const [presupuestoAbierto, setPresupuestoAbierto] = useState(null);
  // ── Navegación directa a VerTablas ──────────────────────
  const [tablaInicialVerTablas, setTablaInicialVerTablas] = useState(null);

  const addLog = (msg) => setLog((prev) => [msg, ...prev.slice(0, 4)]);

  const fetchClientes = () =>
    authFetch(`${API}/clientes`)
      .then((r) => r.json())
      .then(setClientes)
      .catch(console.error);

  const fetchProductos = () =>
    authFetch(`${API}/productos`)
      .then((r) => r.json())
      .then(setProductos)
      .catch(console.error);

  const fetchTiposEscritorio = () =>
    authFetch(`${API}/escritorio-tipos`)
      .then((r) => r.json())
      .then(setTiposEscritorio)
      .catch(console.error);

  const fetchColocaciones = () =>
    authFetch(`${API}/colocacion`)
      .then((r) => r.json())
      .then(setColocaciones)
      .catch(console.error);

  const fetchTiposDespensero = () =>
    authFetch(`${API}/despensero-tipos`)
      .then((r) => r.json())
      .then(setTiposDespensero)
      .catch(console.error);

  const fetchPresupuestosMamparas = () =>
    authFetch(`${API}/presupuestos-mamparas`)
      .then((r) => r.json())
      .then(setPresupuestosMamparas)
      .catch(console.error);

  const fetchPresupuestosPuertas = () =>
    authFetch(`${API}/presupuestos-puertas`)
      .then((r) => r.json())
      .then(setPresupuestosPuertas)
      .catch(console.error);

  const fetchPresupuestosVanitory = () =>
    authFetch(`${API}/presupuestos-vanitory`)
      .then((r) => r.json())
      .then(setPresupuestosVanitory)
      .catch(console.error);

  const fetchMargen = () =>
    authFetch(`${API}/margen`)
      .then((r) => r.json())
      .then(setMargen)
      .catch(console.error);

  const fetchFormulas = () =>
    authFetch(`${API}/formulas`)
      .then((r) => r.json())
      .then(setFormulas)
      .catch(console.error);

  const fetchAsociaciones = () =>
    authFetch(`${API}/asociaciones`)
      .then((r) => r.json())
      .then(setAsociaciones)
      .catch(console.error);

  const fetchAsociacionesForm = () =>
    authFetch(`${API}/asociaciones-form`)
      .then((r) => r.json())
      .then(setAsociacionesForm)
      .catch(console.error);

  const fetchFormStd = () =>
    authFetch(`${API}/form-std`)
      .then((r) => r.json())
      .then(setFormStd)
      .catch(console.error);

  const fetchAsocFormStd = () =>
    authFetch(`${API}/asoc-form-std`)
      .then((r) => r.json())
      .then(setAsocFormStd)
      .catch(console.error);

  const fetchListas = () =>
    authFetch(`${API}/lista`)
      .then((r) => r.json())
      .then(setListas)
      .catch(console.error);

  // ── NUEVO: fetch proveedores ─────────────────────────────
  const fetchProveedores = () =>
    authFetch(`${API}/proveedores`)
      .then((r) => r.json())
      .then(setProveedores)
      .catch(console.error);

  // ── NUEVO: fetch feriados y semanas del año ──────────────
  const fetchFeriados = () =>
    authFetch(`${API}/feriados`)
      .then((r) => r.json())
      .then(setFeriados)
      .catch(console.error);

  const fetchSemanasAnio = () =>
    authFetch(`${API}/semanas-anio`)
      .then((r) => r.json())
      .then(setSemanasAnio)
      .catch(console.error);

  useEffect(() => {
    // Esperar a que los permisos estén cargados antes de hacer fetches
    const rol = usuario?.rol ?? "operario";
    const puedeVer = (modulo) => {
      if (rol === "admin") return true;
      return permisos?.[rol]?.[modulo]?.["ver"] ?? false;
    };

    if (puedeVer("clientes"))                fetchClientes();
    if (puedeVer("productos"))               fetchProductos();
    if (puedeVer("presupuesto-mamparas"))    fetchColocaciones();
    if (puedeVer("ver-tablas"))              fetchTiposEscritorio();
    if (puedeVer("ver-tablas"))              fetchTiposDespensero();
    if (puedeVer("ver-tablas"))              fetchFormulas();
    if (puedeVer("lista-margenes"))          fetchMargen();
    if (puedeVer("presupuestos-tabla"))      fetchPresupuestosMamparas();
    if (puedeVer("ver-tablas"))              fetchPresupuestosPuertas();
    if (puedeVer("presupuestos-vanitory-tabla")) fetchPresupuestosVanitory();
    if (puedeVer("ver-tablas"))              fetchAsociaciones();
    if (puedeVer("ver-tablas"))              fetchAsociacionesForm();
    if (puedeVer("ver-tablas"))              fetchFormStd();
    if (puedeVer("ver-tablas"))              fetchAsocFormStd();
    if (puedeVer("lista-margenes"))          fetchListas();
    if (puedeVer("ver-tablas"))              fetchProveedores();
    if (puedeVer("ver-tablas"))              fetchFeriados();
    if (puedeVer("ver-tablas"))              fetchSemanasAnio();
  }, [permisos]);

  // ── Selección activa ─────────────────────────────────────
  const currentSelected =
    screen === "clientes"
      ? selectedCliente
      : screen === "productos"
        ? selectedProducto
        : null;

  // ── CRUD con fetch al servidor ───────────────────────────
  const makeCRUD = (endpoint, get, set, selectFn, fetchFn, name) => ({
    onSave: async (item) => {
      const exists = !!item.id;
      if (item._skipPost) {
        await fetchFn();
        setModal(null);
        selectFn(null);
        return;
      }
      try {
        if (exists) {
          const { id, ...body } = item;
          const res = await authFetch(`${API}/${endpoint}/${id}`, {
            method: "PUT",
            body: JSON.stringify(body),
          });
          if (!res.ok) {
            const t = await res.text();
            console.error(`PUT error ${endpoint}:`, t);
            throw new Error(t);
          }
          addLog(
            `✏️ ${name} actualizado: ${item.nombre ?? item.lista ?? item.articulo ?? item.provnombre}`,
          );
        } else {
          const { id, ...body } = item;
          const res = await authFetch(`${API}/${endpoint}`, {
            method: "POST",
            body: JSON.stringify(body),
          });
          if (!res.ok) throw new Error(await res.text());
          addLog(
            `💾 ${name} guardado: ${item.nombre ?? item.lista ?? item.articulo ?? item.provnombre}`,
          );
        }
        await fetchFn();
        setModal(null);
        selectFn(null);
      } catch (err) {
        console.error(`Error guardando ${name}:`, err);
        alert(`Error al guardar: ${err.message}`);
      }
    },

    onDelete: async (id) => {
      try {
        const item = get.find((r) => r.id === id);
        const res = await authFetch(`${API}/${endpoint}/${id}`, {
          method: "DELETE",
        });
        if (!res.ok) throw new Error(await res.text());
        addLog(
          `🗑 ${name} eliminado: ${item?.nombre ?? item?.lista ?? item?.articulo ?? item?.provnombre}`,
        );
        await fetchFn();
        selectFn(null);
        setModal(null);
      } catch (err) {
        console.error(`Error eliminando ${name}:`, err);
        alert(`Error al eliminar: ${err.message}`);
      }
    },

    onAdd: async (item) => {
      try {
        const { id, ...body } = item;
        const res = await authFetch(`${API}/${endpoint}`, {
          method: "POST",
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error(await res.text());
        addLog(
          `💾 ${name} creado: ${item.provnombre ?? item.nombre ?? item.articulo}`,
        );
        await fetchFn();
        setModal(null);
        selectFn(null);
      } catch (err) {
        console.error(`Error creando ${name}:`, err);
        alert(`Error al crear: ${err.message}`);
      }
    },

    onEdit: async (item) => {
      try {
        const { id, ...body } = item;
        const res = await authFetch(`${API}/${endpoint}/${id}`, {
          method: "PUT",
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error(await res.text());
        addLog(
          `✏️ ${name} actualizado: ${item.provnombre ?? item.nombre ?? item.articulo}`,
        );
        await fetchFn();
        setModal(null);
        selectFn(null);
      } catch (err) {
        console.error(`Error editando ${name}:`, err);
        alert(`Error al editar: ${err.message}`);
      }
    },

    onSelect: (row) => selectFn(row?.id === currentSelected?.id ? null : row),
    onOpenModal: setModal,
    onCloseModal: () => setModal(null),
  });

  const clientesCRUD = makeCRUD(
    "clientes",
    clientes,
    setClientes,
    setSelectedCliente,
    fetchClientes,
    "Cliente",
  );

  // Navega a la pantalla Clientes con un cliente puntual ya seleccionado
  // y abre directo su ficha (usado desde PresupuestoNuevo → ClienteSection,
  // botón "👤 Ficha"). Se manda codcliente + nombre + teléfono juntos, y se
  // prueban en ese orden: el backend a veces devuelve columnas en
  // mayúsculas (CODCLIENTE) según la consulta, así que si el match por
  // código falla se cae a nombre, y si tampoco hay nombre (o no matchea) se
  // cae a teléfono — entre los tres, casi siempre hay uno que pega. El
  // nombre (o teléfono si no hay nombre) queda precargado en el buscador de
  // Clientes, para que se vea filtrado aunque no haya match exacto.
  const soloDigitos = (v) => String(v ?? "").replace(/\D/g, "");
  const [abrirFichaCliente, setAbrirFichaCliente] = useState(false);
  const [filtroClienteInicial, setFiltroClienteInicial] = useState("");
  // Campos que le faltan al cliente para poder facturarle (CUIT/DNI según
  // tipofact) — llega desde BotonFacturar cuando el backend devuelve 400
  // con `faltantes`, vía onFaltanDatosCliente → irACliente(..., faltantes).
  // Se muestra como banner en Clientes.jsx dentro del modal de edición.
  const [camposFaltantesCliente, setCamposFaltantesCliente] = useState([]);
  const irACliente = (codclienteBuscado, nombreBuscado, telefonoBuscado, camposFaltantes) => {
    const buscado =
      codclienteBuscado !== null && codclienteBuscado !== undefined
        ? String(codclienteBuscado)
        : null;
    let encontrado = buscado
      ? clientes.find(
          (c) => String(c.codcliente ?? c.CODCLIENTE ?? "") === buscado,
        )
      : null;
    if (!encontrado && nombreBuscado) {
      const nombreNorm = nombreBuscado.trim().toLowerCase();
      encontrado = clientes.find(
        (c) =>
          (c.nombre ?? c.NOMBRE ?? "").trim().toLowerCase() === nombreNorm,
      );
    }
    if (!encontrado && telefonoBuscado) {
      const telNorm = soloDigitos(telefonoBuscado);
      if (telNorm) {
        encontrado = clientes.find((c) => {
          const candidatos = [
            c.telefono1 ?? c.TELEFONO1,
            c.telefono2 ?? c.TELEFONO2,
            c.wapp ?? c.WAPP,
          ];
          return candidatos.some((v) => v && soloDigitos(v) === telNorm);
        });
      }
    }
    setSelectedCliente(encontrado ?? null);
    setAbrirFichaCliente(!!encontrado);
    setFiltroClienteInicial(
      nombreBuscado || encontrado?.nombre || telefonoBuscado || "",
    );
    setCamposFaltantesCliente(camposFaltantes ?? []);
    setScreen("clientes");
  };
  const colocacionesCRUD = makeCRUD(
    "colocacion",
    colocaciones,
    setColocaciones,
    setSelectedColocacion,
    fetchColocaciones,
    "Colocación",
  );
  const productosCRUD = makeCRUD(
    "productos",
    productos,
    setProductos,
    setSelectedProducto,
    fetchProductos,
    "Producto",
  );
  const tiposEscritorioRUD = makeCRUD(
    "escritorio-tipos",
    tiposEscritorio,
    setTiposEscritorio,
    setSelectedTipoEscritorio,
    fetchTiposEscritorio,
    "Tipo de escritorio",
  );
  const tiposDespenseroRUD = makeCRUD(
    "despensero-tipos",
    tiposDespensero,
    setTiposDespensero,
    setSelectedTipoDespensero,
    fetchTiposDespensero,
    "Tipo de despensero",
  );
  const formulasCRUD = makeCRUD(
    "formulas",
    formulas,
    setFormulas,
    setSelectedFormula,
    fetchFormulas,
    "Fórmula",
  );
  const presupuestosMamparasCRUD = makeCRUD(
    "presupuestos-mamparas",
    presupuestosMamparas,
    setPresupuestosMamparas,
    setSelectedPresupuestoMampara,
    fetchPresupuestosMamparas,
    "Presupuesto Mampara",
  );
  const presupuestosPuertasCRUD = makeCRUD(
    "presupuestos-puertas",
    presupuestosPuertas,
    setPresupuestosPuertas,
    setSelectedPresupuestoPuerta,
    fetchPresupuestosPuertas,
    "Presupuesto Puerta",
  );
  const presupuestosVanitoryCRUD = makeCRUD(
    "presupuestos-vanitory",
    presupuestosVanitory,
    setPresupuestosVanitory,
    setSelectedPresupuestoVanitory,
    fetchPresupuestosVanitory,
    "Presupuesto Vanitory",
  );
  const margenCRUD = makeCRUD(
    "margen",
    margen,
    setMargen,
    setSelectedMargen,
    fetchMargen,
    "Margen",
  );
  const asociacionesCRUD = makeCRUD(
    "asociaciones",
    asociaciones,
    setAsociaciones,
    setSelectedAsociacion,
    fetchAsociaciones,
    "Asociación",
  );
  const asociacionesFormCRUD = makeCRUD(
    "asociaciones-form",
    asociacionesForm,
    setAsociacionesForm,
    setSelectedAsociacionForm,
    fetchAsociacionesForm,
    "Asociación de Fórmula",
  );
  const formStdCRUD = makeCRUD(
    "form-std",
    formStd,
    setFormStd,
    setSelectedFormStd,
    fetchFormStd,
    "Fórmula Estándar",
  );
  const asocFormStdCRUD = makeCRUD(
    "asoc-form-std",
    asocFormStd,
    setAsocFormStd,
    setSelectedAsocFormStd,
    fetchAsocFormStd,
    "Asociación de Fórmula Estándar",
  );

  // ── NUEVO: CRUD Proveedores ──────────────────────────────
  const proveedoresCRUD = makeCRUD(
    "proveedores",
    proveedores,
    setProveedores,
    setSelectedProveedor,
    fetchProveedores,
    "Proveedor",
  );

  // ── NUEVO: CRUD Feriados (semanas_anio es de solo lectura, sin CRUD) ──
  const feriadosCRUD = makeCRUD(
    "feriados",
    feriados,
    setFeriados,
    setSelectedFeriado,
    fetchFeriados,
    "Feriado",
  );

  // ── CRUD Lista de Márgenes (definido explícitamente) ─────
  const handleSaveLista = async (item) => {
    const exists = !!item.id;
    try {
      if (exists) {
        const { id, ...body } = item;
        const res = await authFetch(`${API}/lista/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error(await res.text());
        addLog(`✏️ Lista actualizada: ${item.lista}`);
      } else {
        const { id, ...body } = item;
        const res = await authFetch(`${API}/lista`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error(await res.text());
        addLog(`💾 Lista guardada: ${item.lista}`);
      }
      await fetchListas();
      setModal(null);
      setSelectedLista(null);
    } catch (err) {
      console.error("Error guardando lista:", err);
      alert(`Error al guardar: ${err.message}`);
    }
  };

  const handleDeleteLista = async (id) => {
    try {
      const item = listas.find((r) => r.id === id);
      const res = await authFetch(`${API}/lista/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      addLog(`🗑 Lista eliminada: ${item?.lista}`);
      await fetchListas();
      setSelectedLista(null);
      setModal(null);
    } catch (err) {
      console.error("Error eliminando lista:", err);
    }
  };

  // ── Botones del panel ────────────────────────────────────
  const handlePanelButton = (btn) => {
    setActive(btn.id);
    setTimeout(() => setActive(null), 300);

    if (btn.screen) {
      setScreen(btn.screen);
      addLog(`${btn.icon} Abriendo ${btn.label}`);
      if (btn.screen === "presupuestos-tabla") fetchPresupuestosMamparas();
      if (btn.screen === "lista-margenes") fetchListas();
      return;
    }

    if (!screen) {
      addLog("⚠️ Primero seleccioná una pantalla");
      return;
    }

    if (btn.action === "guardar") {
      setModal("nuevo");
      addLog(`${btn.icon} ${btn.label} — ${SCREENS[screen]?.label}`);
    }
    if (btn.action === "editar") {
      currentSelected
        ? setModal("editar")
        : addLog("⚠️ Seleccioná un registro primero");
    }
    if (btn.action === "eliminar") {
      currentSelected
        ? setModal("eliminar")
        : addLog("⚠️ Seleccioná un registro primero");
    }
  };

  const GLOBAL_STYLE = `
    @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Syne:wght@700;800&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #cce7f9; min-height: 100vh; font-family: 'Space Mono', monospace; }
  `;

  // ── PANTALLAS ────────────────────────────────────────────
  if (screen && !puedo(screen, "ver")) {
    return (
      <>
        <style>{GLOBAL_STYLE}</style>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", fontFamily: "'Space Mono', monospace", gap: 16 }}>
          <span style={{ fontSize: 48 }}>🚫</span>
          <p style={{ color: "#0a3a5c", fontWeight: 700, fontSize: 18, letterSpacing: 2 }}>ACCESO DENEGADO</p>
          <p style={{ color: "#6699bb", fontSize: 13 }}>No tenés permiso para ver esta sección.</p>
          <button
            onClick={() => setScreen(null)}
            style={{ marginTop: 12, padding: "8px 20px", background: "#0a3a5c", color: "#fff", border: "none", borderRadius: 4, fontFamily: "'Space Mono', monospace", cursor: "pointer", fontSize: 13 }}
          >
            ← Volver al inicio
          </button>
        </div>
      </>
    );
  }

  if (screen) {
    const crud = screen === "clientes" ? clientesCRUD : productosCRUD;
    const sel = screen === "clientes" ? selectedCliente : selectedProducto;

    return (
      <>
        <style>
          {GLOBAL_STYLE}
          {`
          .screen-layout { display: flex; min-height: 100vh; }
          .screen-sidebar { width: 220px; background: #0a3a5c; color: white; padding: 24px 14px; flex-shrink: 0; display: flex; flex-direction: column; gap: 6px; transition: width 0.25s ease, padding 0.25s ease; overflow: hidden; }
          .screen-sidebar.collapsed { width: 50px; padding: 24px 7px; }
          .screen-sidebar h3 { font-size: 10px; letter-spacing: 3px; color: #60efff; text-transform: uppercase; margin-bottom: 10px; white-space: nowrap; overflow: hidden; transition: opacity 0.2s; }
          .screen-sidebar.collapsed h3 { opacity: 0; height: 0; margin: 0; }
          .side-btn { display: flex; align-items: center; gap: 10px; padding: 10px 11px; border-radius: 3px; background: none; border: 1px solid transparent; color: #a0cce8; font-family: 'Space Mono', monospace; font-size: 12px; cursor: pointer; transition: all 0.2s; text-align: left; width: 100%; white-space: nowrap; overflow: hidden; }
          .side-btn:hover { background: #ffffff15; border-color: #ffffff22; color: white; }
          .side-btn.active { background: #ffffff20; border-color: #60efff44; color: white; }
          .btn-label { transition: opacity 0.15s; overflow: hidden; }
          .screen-sidebar.collapsed .btn-label { opacity: 0; max-width: 0; }
          .side-divider { height: 1px; background: #1a4a6c; margin: 6px 0; flex-shrink: 0; }
          .side-back { margin-top: auto; color: #6699bb; font-size: 11px; }
          .collapse-btn { display: flex; align-items: center; justify-content: center; padding: 7px; border-radius: 3px; background: none; border: 1px solid #1a4a6c; color: #60efff; cursor: pointer; font-size: 13px; margin-bottom: 6px; width: 100%; transition: all 0.2s; }
          .collapse-btn:hover { background: #ffffff15; }
          .screen-main { flex: 1; padding: 40px 36px; overflow: auto; }
          .log-mini { padding: 12px 16px; background: #fff; border: 1px solid #a0cce8; border-radius: 4px; margin-bottom: 24px; }
          .log-mini-title { font-size: 9px; letter-spacing: 2px; text-transform: uppercase; color: #88aacc; margin-bottom: 6px; }
          .log-mini-item { font-size: 11px; color: #99bbcc; }
          .log-mini-item:first-of-type { color: #2277bb; }

          .mobile-menu-btn { display: none; }
          .screen-sidebar-overlay { display: none; }

          @media (max-width: 600px) {
            .screen-layout { flex-direction: column; }
            .mobile-menu-btn {
              display: flex; align-items: center; justify-content: center;
              position: sticky; top: 10px; left: 10px; margin: 10px 0 0 10px;
              width: 40px; height: 40px; z-index: 101;
              background: #0a3a5c; color: #60efff; border: 1px solid #1a4a6c;
              border-radius: 4px; font-size: 18px; cursor: pointer;
            }
            .screen-sidebar-overlay {
              display: block; position: fixed; inset: 0; background: #00000055;
              z-index: 99; opacity: 0; pointer-events: none; transition: opacity 0.2s ease;
            }
            .screen-sidebar-overlay.open { opacity: 1; pointer-events: auto; }
            .screen-sidebar {
              position: fixed; top: 0; left: 0; height: 100vh; width: 240px;
              max-width: 82vw; flex-direction: column; flex-wrap: nowrap;
              overflow-y: auto; overflow-x: hidden; padding: 24px 14px !important;
              transform: translateX(-100%); transition: transform 0.25s ease; z-index: 100;
            }
            .screen-sidebar.mobile-open { transform: translateX(0); }
            .screen-sidebar.collapsed { width: 240px !important; padding: 24px 14px !important; }
            .screen-sidebar.collapsed .btn-label { opacity: 1; max-width: none; }
            .screen-sidebar h3 { display: block; }
            .side-btn { width: 100%; padding: 10px 11px; font-size: 12px; flex-shrink: 0; }
            .collapse-btn { display: none; }
            .side-divider { width: auto; height: 1px; margin: 6px 0; }
            .screen-main { padding: 16px 12px; }
          }
        `}
        </style>

        <div className="screen-layout">
          <div
            className={`screen-sidebar-overlay ${sidebarOpen ? "open" : ""}`}
            onClick={() => setSidebarOpen(false)}
          />
          <button
            className="mobile-menu-btn"
            onClick={() => setSidebarOpen(true)}
            title="Menú"
          >
            ☰
          </button>
          <div
            className={`screen-sidebar${sidebarCollapsed ? " collapsed" : ""}${sidebarOpen ? " mobile-open" : ""}`}
          >
            <button
              className="collapse-btn"
              onClick={() => setSidebarCollapsed((c) => !c)}
              title={sidebarCollapsed ? "Expandir" : "Colapsar"}
            >
              {sidebarCollapsed ? "▶" : "◀"}
            </button>
            <button
              className="side-btn"
              onClick={() => {
                setScreen(null);
                setSidebarOpen(false);
              }}
              title="Inicio"
              style={{
                background: "#ffffff18",
                borderColor: "#60efff44",
                color: "#60efff",
                marginBottom: 4,
              }}
            >
              <span>🏠</span>
              <span className="btn-label">&nbsp;Inicio</span>
            </button>
            <div className="side-divider" />
            <h3>Navegación</h3>
            {[
              "clientes",
              "productos",
              "presupuesto-mamparas",
              "presupuesto-muebles",
              "presupuestos-tabla",
              "presupuestos-vanitory-tabla",
              "presupuesto-amoblamiento",
              "presupuesto-nuevo",
              "lista-presupuestos-2",
              "ver-tablas",
              "lista-margenes",
              "mueble-especial",
              "facturas",
              "historial-facturas",
              "afip-iva",
              "usuarios",
              "actualizar-precios",
              "chat",
            ]
            .filter((s) => puedo(s, "ver"))
            .map((s) => (
              <button
                key={s}
                className={`side-btn ${screen === s ? "active" : ""}`}
                onClick={() => {
                  setScreen(s);
                  if (s === "presupuestos-tabla") fetchPresupuestosMamparas();
                  if (s === "lista-margenes") fetchListas();
                  if (s === "ver-tablas") setTablaInicialVerTablas(null);
                  setSidebarOpen(false);
                }}
                title={SCREENS[s].label}
              >
                <span>{SCREENS[s].icon}</span>
                <span className="btn-label">&nbsp;{SCREENS[s].label}</span>
              </button>
            ))}
            <div className="side-divider" />
            {(puedo(screen, "crear") || puedo(screen, "editar") || puedo(screen, "eliminar")) && (
              <>
                <h3 style={{ marginTop: 8 }}>Acciones rápidas</h3>
                {puedo(screen, "crear") && (
                  <button
                    className="side-btn"
                    onClick={() => {
                      setModal("nuevo");
                      setSidebarOpen(false);
                    }}
                  >
                    <span>＋</span>
                    <span className="btn-label">&nbsp;Nuevo registro</span>
                  </button>
                )}
                {puedo(screen, "editar") && (
                  <button
                    className="side-btn"
                    style={{ opacity: sel ? 1 : 0.4 }}
                    onClick={() => {
                      if (sel) {
                        setModal("editar");
                        setSidebarOpen(false);
                      }
                    }}
                  >
                    <span>✏️</span>
                    <span className="btn-label">&nbsp;Editar seleccionado</span>
                  </button>
                )}
                {puedo(screen, "eliminar") && (
                  <button
                    className="side-btn"
                    style={{
                      opacity: sel ? 1 : 0.4,
                      color: sel ? "#ff9999" : undefined,
                    }}
                    onClick={() => {
                      if (sel) {
                        setModal("eliminar");
                        setSidebarOpen(false);
                      }
                    }}
                  >
                    <span>🗑</span>
                    <span className="btn-label">&nbsp;Eliminar seleccionado</span>
                  </button>
                )}
              </>
            )}
            <div className="side-divider" />
          </div>

          <div className="screen-main">
            {screen === "clientes" && (
              <Clientes
                clientes={clientes}
                selected={sel}
                modal={modal}
                {...crud}
                abrirFicha={abrirFichaCliente}
                onFichaAbierta={() => setAbrirFichaCliente(false)}
                busquedaInicial={filtroClienteInicial}
                authFetch={authFetch}
                camposFaltantes={camposFaltantesCliente}
                onAbrirPresupuesto={(row) => {
                  setPresupuestoAbierto(row);
                  setScreen("presupuesto-nuevo");
                }}
              />
            )}
            {screen === "productos" && (
              <Productos selected={sel} modal={modal} token={token} {...crud} />
            )}
            {screen === "actualizar-precios" && <ActualizarPreciosExcel />}
            {screen === "presupuesto-muebles" && (
              <PresupuestoMuebles
                onSelectItem={(item) => console.log("Mueble:", item)}
              />
            )}
            {screen === "presupuesto-mamparas" && (
              <PresupuestoMamparas
                onSelectItem={(item) => console.log("Mampara:", item)}
                onGuardado={fetchPresupuestosMamparas}
              />
            )}
            {screen === "presupuestos-tabla" && (
              <PresupuestosMamparasTabla
                presupuestos={presupuestosMamparas}
                selected={selectedPresupuestoMampara}
                modal={modal}
                {...presupuestosMamparasCRUD}
                onSelect={(row) =>
                  setSelectedPresupuestoMampara(
                    row?.id === selectedPresupuestoMampara?.id ? null : row,
                  )
                }
              />
            )}
            {screen === "presupuesto-nuevo" && (
              <PresupuestoNuevo
                onVolver={() => {
                  setScreen(null);
                  setPresupuestoAbierto(null);
                }}
                onGuardado={() => {}}
                onVerTabla={(tablaId) => {
                  if (tablaId) {
                    setTablaInicialVerTablas(tablaId);
                    setScreen("ver-tablas");
                  } else {
                    setTablaInicialVerTablas(null);
                    setScreen("lista-presupuestos-2");
                  }
                }}
                presupuestoInicial={presupuestoAbierto}
                tiposDespensero={tiposDespensero}
                tiposDespenseroRUD={tiposDespenseroRUD}
                token={token}
                onIrACliente={irACliente}
              />
            )}
            {screen === "lista-presupuestos-2" && (
              <ListaPresupuestos
                onAbrirPresupuesto={(row) => {
                  setPresupuestoAbierto(row);
                  setScreen("presupuesto-nuevo");
                }}
                onNuevoPresupuesto={() => {
                  setPresupuestoAbierto(null);
                  setScreen("presupuesto-nuevo");
                }}
                authFetch={authFetch}
              />
            )}
            {screen === "obras-confirmadas" && (
              <ObrasConfirmadas
                onAbrirPresupuesto={(row) => {
                  setPresupuestoAbierto(row);
                  setScreen("presupuesto-nuevo");
                }}
                onNuevoPresupuesto={() => {
                  setPresupuestoAbierto(null);
                  setScreen("presupuesto-nuevo");
                }}
                authFetch={authFetch}
                onFaltanDatosCliente={(info) =>
                  irACliente(
                    info.codcliente,
                    info.nombreCliente,
                    null,
                    info.faltantes?.map((f) => f.field),
                  )
                }
              />
            )}
            {screen === "facturas-venta" && (
              <FacturasVenta
                authFetch={authFetch}
                onFacturar={() => setScreen("factura-manual")}
              />
            )}
            {screen === "factura-manual" && (
              <FacturaManual
                clientes={clientes}
                productos={productos}
                authFetch={authFetch}
                onVolver={() => setScreen("facturas-venta")}
                onFaltanDatosCliente={(info) =>
                  irACliente(
                    info.codcliente,
                    info.nombreCliente,
                    null,
                    info.faltantes?.map((f) => f.field),
                  )
                }
              />
            )}
            {screen === "produccion" && (
              <Produccion authFetch={authFetch} token={token} />
            )}
            {screen === "chat" && (
              <Chat authFetch={authFetch} token={token} usuario={usuario} API={API} />
            )}
            {screen === "presupuesto-amoblamiento" &&
              amoblamientoVista === "selector" && (
                <PresupuestoAmoblamiento
                  onBuscar={() => setScreen("lista-presupuestos-2")}
                  onNuevo={() => {
                    setPresupuestoAbierto(null);
                    setScreen("presupuesto-nuevo");
                  }}
                  onVolver={() => setScreen(null)}
                />
              )}

            {screen === "presupuestos-vanitory-tabla" && (
              <PresupuestosVanitoryTabla
                presupuestos={presupuestosVanitory}
                selected={selectedPresupuestoVanitory}
                modal={modal}
                {...presupuestosVanitoryCRUD}
                onSelect={(row) =>
                  setSelectedPresupuestoVanitory(
                    row?.id === selectedPresupuestoVanitory?.id ? null : row,
                  )
                }
              />
            )}
            {screen === "afip-iva" && <AfipIVA onBack={() => setScreen(null)} token={token} />}
            {screen === "usuarios" && (
              <Usuarios onBack={() => setScreen(null)} />
            )}
            {screen === "ver-tablas" && (
              <VerTablas
                key={tablaInicialVerTablas ?? "ver-tablas"}
                clientes={clientes}
                clientesCRUD={clientesCRUD}
                selectedCliente={selectedCliente}
                productos={productos}
                productosCRUD={productosCRUD}
                selectedProducto={selectedProducto}
                colocaciones={colocaciones ?? []}
                colocacionesCRUD={colocacionesCRUD}
                selectedColocacion={selectedColocacion}
                tiposEscritorio={tiposEscritorio}
                tiposEscritorioRUD={tiposEscritorioRUD}
                selectedTipoEscritorio={selectedTipoEscritorio}
                tiposDespensero={tiposDespensero}
                tiposDespenseroRUD={tiposDespenseroRUD}
                selectedTipoDespensero={selectedTipoDespensero}
                formulas={formulas}
                formulasCRUD={formulasCRUD}
                selectedFormula={selectedFormula}
                margen={margen}
                margenCRUD={margenCRUD}
                selectedMargen={selectedMargen}
                presupuestosMamparas={presupuestosMamparas}
                presupuestosMamparasCRUD={presupuestosMamparasCRUD}
                selectedPresupuestoMampara={selectedPresupuestoMampara}
                presupuestosPuertas={presupuestosPuertas}
                presupuestosPuertasCRUD={presupuestosPuertasCRUD}
                selectedPresupuestoPuerta={selectedPresupuestoPuerta}
                asociaciones={asociaciones}
                asociacionesCRUD={asociacionesCRUD}
                selectedAsociacion={selectedAsociacion}
                asociacionesForm={asociacionesForm}
                asociacionesFormCRUD={asociacionesFormCRUD}
                selectedAsociacionForm={selectedAsociacionForm}
                formStd={formStd}
                formStdCRUD={formStdCRUD}
                selectedFormStd={selectedFormStd}
                asocFormStd={asocFormStd}
                asocFormStdCRUD={asocFormStdCRUD}
                selectedAsocFormStd={selectedAsocFormStd}
                listas={listas}
                onSaveLista={handleSaveLista}
                onDeleteLista={handleDeleteLista}
                // ── proveedores ──
                proveedores={proveedores}
                proveedoresCRUD={proveedoresCRUD}
                selectedProveedor={selectedProveedor}
                // ── feriados / semanas del año ──
                feriados={feriados}
                feriadosCRUD={feriadosCRUD}
                selectedFeriado={selectedFeriado}
                semanasAnio={semanasAnio}
                tablaInicial={tablaInicialVerTablas}
                token={token}
                puedo={puedo}
                rol={usuario?.rol ?? "operario"}
              />
            )}

            {/* ── Mueble Especial ── */}
            {screen === "mueble-especial" && <MuebleEspecial />}

            {/* ── Vehículos - Mantenimiento ── */}
            {screen === "vehiculos-mantenimiento" && (
              <VehiculosMantenimiento
                token={token}
                onBack={() => setScreen(null)}
              />
            )}

            {/* ── Clientes Activos (ex Cuenta Corriente) ── */}
            {screen === "cuenta-corriente" && (
              <CuentaCorriente
                clientes={clientes}
                authFetch={authFetch}
                onAbrirPresupuesto={(row) => {
                  setPresupuestoAbierto(row);
                  setScreen("presupuesto-nuevo");
                }}
                onBack={() => setScreen(null)}
              />
            )}

            {/* ── Test Facturación AFIP (TEMPORAL, borrar cuando ya no haga falta) ── */}
            {screen === "test-afip-facturar" && (
              <TestFacturacionAFIP authFetch={authFetch} />
            )}

            {/* ── Visor 3D DWG/DXF ── */}
            {screen === "visor-dwg" && <VisorDWGPage token={token} />}

            {/* ── Facturas ── */}
            {screen === "facturas" && <Facturas proveedores={proveedores} token={token} />}

            {/* ── Historial Facturas ── */}
            {screen === "historial-facturas" && (
              <HistorialFacturas proveedores={proveedores} token={token} />
            )}

            {/* ── Lista de Márgenes ── */}
            {screen === "lista-margenes" && (
              <Lista
                listas={listas}
                selected={selectedLista}
                modal={modal}
                onSave={handleSaveLista}
                onDelete={handleDeleteLista}
                onOpenModal={setModal}
                onCloseModal={() => setModal(null)}
                onSelect={(row) =>
                  setSelectedLista(row?.id === selectedLista?.id ? null : row)
                }
              />
            )}
          </div>
        </div>
      </>
    );
  }

  // ── PANEL PRINCIPAL ──────────────────────────────────────
  return (
    <>
      <style>
        {GLOBAL_STYLE}
        {`
        body { display: flex; align-items: center; justify-content: center; }
        .overlay { display: none; position: fixed; inset: 0; background: #00000055; z-index: 99; }
        .overlay.open { display: block; }
        .sidebar { position: fixed; top: 0; left: 0; height: 100vh; width: 220px; background: #0a3a5c; color: white; padding: 40px 20px; transform: translateX(-100%); transition: transform 0.3s ease; z-index: 100; }
        .sidebar.open { transform: translateX(0); }
        .sidebar h3 { font-size: 11px; letter-spacing: 3px; color: #60efff; text-transform: uppercase; margin-bottom: 24px; }
        .sidebar p { padding: 10px 0; cursor: pointer; color: #a0cce8; font-size: 13px; border-bottom: 1px solid #1a4a6c; transition: color 0.2s; }
        .sidebar p:hover { color: white; }
        .wrapper { width: 480px; padding: 48px 40px; background: #e8f5fd; border: 1px solid #a0cce8; border-radius: 4px; position: relative; overflow: hidden; }
        .wrapper::before { content: \'\'; position: absolute; top: -120px; right: -120px; width: 300px; height: 300px; background: radial-gradient(circle, #4ab0e820 0%, transparent 70%); pointer-events: none; }
        .top-bar { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; }
        .title { font-family: \'Syne\', sans-serif; font-size: 28px; font-weight: 800; color: #0a3a5c; letter-spacing: -0.5px; }
        .subtitle { font-size: 11px; color: #6699bb; letter-spacing: 3px; text-transform: uppercase; margin-top: 6px; }
        .menu-btn { background: none; border: 1px solid #a0cce8; border-radius: 3px; padding: 6px 12px; cursor: pointer; font-size: 18px; color: #0a3a5c; transition: all 0.2s; }
        .menu-btn:hover { background: #0a3a5c; color: white; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 32px; }
        .btn { display: flex; align-items: center; gap: 10px; padding: 16px 20px; background: #ffffff; border: 1px solid #a0cce8; border-radius: 3px; color: #2255aa; font-family: \'Space Mono\', monospace; font-size: 13px; cursor: pointer; transition: all 0.15s ease; position: relative; overflow: hidden; }
        .btn::after { content: \'\'; position: absolute; bottom: 0; left: 0; width: 0; height: 2px; background: var(--accent); transition: width 0.2s ease; }
        .btn:hover { border-color: var(--accent); background: var(--accent); color: #ffffff; transform: translateY(-1px); box-shadow: 0 4px 20px var(--accent)44; }
        .btn:hover::after { width: 100%; }
        .btn:active, .btn.active { transform: scale(0.97); background: var(--accent)22; }
        .log { border-top: 1px solid #a0cce8; padding-top: 20px; }
        .log-title { font-size: 10px; color: #88aacc; letter-spacing: 3px; text-transform: uppercase; margin-bottom: 12px; }
        .log-item { font-size: 12px; color: #99bbcc; padding: 4px 0; animation: fadeIn 0.3s ease; }
        .log-item:first-child { color: #2277bb; }
        .data-summary { display: flex; gap: 8px; margin-bottom: 20px; flex-wrap: wrap; }
        .sum-chip { background: #fff; border: 1px solid #a0cce8; border-radius: 20px; padding: 4px 12px; font-size: 11px; color: #4a6a8c; }
        .sum-chip strong { color: #0a3a5c; }
        .home-section-cards { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-bottom: 24px; }
        .home-section-card { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 18px 10px; background: #fff; border: 1px solid #a0cce8; border-radius: 4px; cursor: pointer; transition: all 0.15s; font-family: \'Space Mono\', monospace; font-size: 11px; color: #0a3a5c; letter-spacing: 1px; text-align: center; }
        .home-section-card:hover { background: #0a3a5c; color: #fff; border-color: #0a3a5c; transform: translateY(-1px); }
        .home-section-card .hs-icon { font-size: 22px; }
        .sub-back { display: flex; align-items: center; gap: 8px; margin-bottom: 20px; background: none; border: 1px solid #a0cce8; border-radius: 3px; padding: 6px 14px; cursor: pointer; font-family: \'Space Mono\', monospace; font-size: 12px; color: #0a3a5c; transition: all 0.15s; }
        .sub-back:hover { background: #0a3a5c; color: #fff; }
        .sub-title { font-family: \'Syne\', sans-serif; font-size: 20px; font-weight: 800; color: #0a3a5c; margin-bottom: 20px; }
        .sub-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 24px; }
        .sub-card { display: flex; flex-direction: column; gap: 6px; padding: 16px 18px; background: #fff; border: 1px solid #a0cce8; border-radius: 3px; cursor: pointer; transition: all 0.15s; font-family: \'Space Mono\', monospace; }
        .sub-card:hover { background: var(--sc-color); border-color: var(--sc-color); color: #fff; transform: translateY(-1px); }
        .sub-card-icon { font-size: 20px; }
        .sub-card-label { font-size: 12px; font-weight: 700; color: #0a3a5c; letter-spacing: 1px; }
        .sub-card:hover .sub-card-label { color: #fff; }
        .sub-card-desc { font-size: 11px; color: #6699bb; }
        .sub-card:hover .sub-card-desc { color: #cce; }
        @keyframes fadeIn { from { opacity: 0; transform: translateX(-8px); } to { opacity: 1; transform: translateX(0); } }

        @media (max-width: 600px) {
          body { align-items: flex-start; }
          .wrapper { width: 100%; max-width: 100vw; padding: 24px 16px; border-radius: 0; border-left: none; border-right: none; box-sizing: border-box; }
          .title { font-size: 20px; }
          .subtitle { font-size: 10px; letter-spacing: 2px; }
          .home-section-cards { grid-template-columns: 1fr 1fr; }
          .grid { grid-template-columns: 1fr; }
          .sub-grid { grid-template-columns: 1fr; }
          .data-summary { gap: 6px; }
          .sum-chip { font-size: 10px; padding: 3px 8px; }
          .top-bar { margin-bottom: 20px; }
        }
      `}
      </style>

      <div
        className={`overlay ${sidebarOpen ? "open" : ""}`}
        onClick={() => setSidebarOpen(false)}
      />
      <div className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <h3>Menú</h3>
        {puedo("clientes", "ver") && <p onClick={() => { setScreen("clientes"); setSidebarOpen(false); }}>👥 Clientes</p>}
        {puedo("cuenta-corriente", "ver") && <p onClick={() => { setScreen("cuenta-corriente"); setSidebarOpen(false); }}>💰 Clientes Activos</p>}
        {puedo("presupuesto-mamparas", "ver") && <p onClick={() => { setScreen("presupuestos-tabla"); setSidebarOpen(false); }}>📋 Presupuestos Mamparas</p>}
        {puedo("productos", "ver") && <p onClick={() => { setScreen("productos"); setSidebarOpen(false); }}>🛒 Productos</p>}
        {puedo("lista-margenes", "ver") && <p onClick={() => { setScreen("lista-margenes"); fetchListas(); setSidebarOpen(false); }}>📊 Lista de Márgenes</p>}
        {puedo("facturas", "ver") && <p onClick={() => { setScreen("facturas"); setSidebarOpen(false); }}>🧾 Facturas Compra</p>}
        {puedo("facturas-venta", "ver") && <p onClick={() => { setScreen("facturas-venta"); setSidebarOpen(false); }}>🧮 Facturas Emitidas</p>}
        {puedo("usuarios", "ver") && <p onClick={() => { setScreen("usuarios"); setSidebarOpen(false); }}>👤 Usuarios</p>}
        {puedo("actualizar-precios", "ver") && <p onClick={() => { setScreen("actualizar-precios"); setSidebarOpen(false); }}>💲 Actualizar Precios</p>}
        {puedo("vehiculos-mantenimiento", "ver") && <p onClick={() => { setScreen("vehiculos-mantenimiento"); setSidebarOpen(false); }}>🚚 Vehículos - Mantenimiento</p>}
        {puedo("visor-dwg", "ver") && <p onClick={() => { setScreen("visor-dwg"); setSidebarOpen(false); }}>📐 Visor 3D Módulos</p>}
        <p onClick={logout} style={{ color: "#cc3333" }}>🚪 Cerrar sesión</p>
      </div>

      <div className="wrapper">
        <div className="top-bar">
          <div>
            <h1 className="title">Panel de Control</h1>
            <p className="subtitle">Sistema integral</p>
          </div>
          <button className="menu-btn" onClick={() => setSidebarOpen(true)}>
            ☰
          </button>
        </div>

        {(puedo("clientes", "ver") || puedo("productos", "ver") || puedo("ver-tablas", "ver")) && (
          <div className="data-summary">
            {puedo("clientes", "ver") && (
              <span className="sum-chip">
                👥 <strong>{clientes.length}</strong> clientes
              </span>
            )}
            {puedo("productos", "ver") && (
              <span className="sum-chip">
                🛒 <strong>{productos.length}</strong> productos
              </span>
            )}
            {puedo("ver-tablas", "ver") && (
              <span className="sum-chip">
                🏭 <strong>{proveedores.length}</strong> proveedores
              </span>
            )}
          </div>
        )}

        {/* ── Sección principal ── */}
        {homeSection === HOME_SECTIONS.main && (
          <>
            <div className="home-section-cards">
              <div
                className="home-section-card"
                onClick={() => setHomeSection(HOME_SECTIONS.admin)}
              >
                <span className="hs-icon">⚙️</span>
                ADMINISTRACIÓN
              </div>
            </div>
            <div className="grid">
              {buttonsOrdenados
                .filter((btn) => puedo(btn.screen, "ver"))
                .map((btn) => (
                <ActionButton
                  key={btn.id}
                  label={btn.label}
                  icon={btn.icon}
                  color={btn.color}
                  isActive={active === btn.id}
                  onClick={() => handlePanelButton(btn)}
                />
              ))}
            </div>
          </>
        )}

        {/* ── Administración ── */}
        {homeSection === HOME_SECTIONS.admin && (
          <>
            <button
              className="sub-back"
              onClick={() => setHomeSection(HOME_SECTIONS.main)}
            >
              ← Volver
            </button>
            <p className="sub-title">⚙️ Administración</p>
            <div className="sub-grid">
              {puedo("facturas", "ver") && (
              <div
                className="sub-card"
                style={{ "--sc-color": "#27ae60" }}
                onClick={() => {
                  setScreen("facturas");
                  setHomeSection(HOME_SECTIONS.main);
                }}
              >
                <span className="sub-card-icon">🧾</span>
                <span className="sub-card-label">FACTURAS COMPRA</span>
                <span className="sub-card-desc">Gestión de comprobantes</span>
              </div>
              )}
              {puedo("facturas-venta", "ver") && (
              <div
                className="sub-card"
                style={{ "--sc-color": "#16a085" }}
                onClick={() => {
                  setScreen("facturas-venta");
                  setHomeSection(HOME_SECTIONS.main);
                }}
              >
                <span className="sub-card-icon">🧮</span>
                <span className="sub-card-label">FACTURAS EMITIDAS</span>
                <span className="sub-card-desc">CAE, QR AFIP y PDF de ventas</span>
              </div>
              )}
              {puedo("ver-tablas", "ver") && (
              <div
                className="sub-card"
                style={{ "--sc-color": "#e67e22" }}
                onClick={() => {
                  setTablaInicialVerTablas("proveedores");
                  setScreen("ver-tablas");
                  setHomeSection(HOME_SECTIONS.main);
                }}
              >
                <span className="sub-card-icon">🏭</span>
                <span className="sub-card-label">PROVEEDORES</span>
                <span className="sub-card-desc">
                  PlacaSur, Aglolam, Cantochap
                </span>
              </div>
              )}
              {puedo("vehiculos-mantenimiento", "ver") && (
              <div
                className="sub-card"
                style={{ "--sc-color": "#8d6e63" }}
                onClick={() => {
                  setScreen("vehiculos-mantenimiento");
                  setHomeSection(HOME_SECTIONS.main);
                }}
              >
                <span className="sub-card-icon">🚚</span>
                <span className="sub-card-label">VEHÍCULOS - MANTENIMIENTO</span>
                <span className="sub-card-desc">
                  Registros de mantenimiento y costos
                </span>
              </div>
              )}
            </div>
          </>
        )}

        {/* ── Facturas ── */}
        <div className="log">
          <p className="log-title">Registro de actividad</p>
          {log.length === 0 ? (
            <p className="log-item">— sin actividad —</p>
          ) : (
            log.map((entry, i) => (
              <p key={i} className="log-item">
                {entry}
              </p>
            ))
          )}
        </div>
      </div>
    </>
  );
}
