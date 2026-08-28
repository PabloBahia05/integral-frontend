import { useState, useEffect, useRef } from "react";

const API = "https://integral-backend-production.up.railway.app";

// Normaliza un nombre de artículo para poder matchear "Frente de Placard (2
// Puerta corrediza) Nature 200"" contra lo que devuelve /articulos-por-familia
// aunque difieran en mayúsculas, tildes, comillas, o espacios extra. Antes el
// matching era por string EXACTO (mapaArticulos.get(fila.articulo)), lo que
// hacía que "Actualizar" no encontrara casi ningún ítem con nombre compuesto
// (solo matcheaban los artículos con nombre simple, sin variaciones).
const normalizarArticulo = (s) =>
  String(s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

// Arma un Map keyed por nombre normalizado a partir de una lista de
// artículos de la BD (cada uno con .articulo).
const armarMapaArticulosNormalizado = (lista) =>
  new Map(lista.map((a) => [normalizarArticulo(a.articulo), a]));

// Busca un artículo en un mapa armado con armarMapaArticulosNormalizado,
// normalizando también la clave de búsqueda.
const buscarArticuloNormalizado = (mapa, nombre) =>
  mapa.get(normalizarArticulo(nombre));

// Placard tiene su propia línea de precios fija en la base de datos (línea 15),
// independiente de las líneas que se hayan elegido en el Encabezado (16, 21, etc.).
// Si el artículo no tiene precio cargado para ninguna de las líneas activas,
// se usa la línea 15 como respaldo — sin necesidad de activarla en Encabezado.
const LINEA_FIJA_PLACARD = "15";

// ────────────────────────────────────────────────────────────────────────
// useCocinaPlacard
// ────────────────────────────────────────────────────────────────────────
// Todo el estado y la lógica de las solapas Cocina + Placard, sacados de
// PresupuestoNuevo.jsx para reducir el riesgo de romper otras secciones
// (mampara, especiales, vanitory, PDF, guardado, etc.) al tocar cocina o
// placard, y viceversa.
//
// Cocina y placard se sacaron JUNTOS a propósito, no por separado: comparten
// el mismo mecanismo de ids (`cocina-<familia>-<idx>` / `placard-<familia>-<idx>`),
// el mismo efecto de sincronización con presupuestoItems, y el mismo recálculo
// de precios (lista + % ítem + ajuste general). Separarlos entre sí hubiera
// significado duplicar o partir esa lógica compartida, con más riesgo de que
// "ajustar todos" quede desincronizado entre los dos.
//
// Lo que NO se movió acá (queda en PresupuestoNuevo.jsx a propósito):
//  - cargarPresupuesto: arma cocina/placard/mampara/puerta/vanitory/otros en
//    un solo loop. Partirlo es​ riesgoso para lo poco que se gana; sigue
//    llamando a los setCocinaItems/setPlacardItems que devuelve este hook.
//  - aplicarAjuste/revertirAjuste: el ajuste "todos" toca cocina+placard+otros
//    a la vez, no es una función cocina/placard-específica. Sigue en el
//    padre y usa los setters que devuelve este hook.
//  - El popover de edición inline de la solapa Presupuesto (presItemPopover):
//    edita indistintamente ítems de cocina/placard/otros por id.
//
// Uso en PresupuestoNuevo.jsx:
//   const cp = useCocinaPlacard({
//     authFetch, tab, lineasActivas, listaPrecio, listasDB, aplicarPorcentaje,
//     ajusteAplicado, ajusteScope, ajusteValor, calcularAjuste,
//     cargandoPresupuestoRef, setPresupuestoItems,
//   });
//   const { cocinaItems, setCocinaItems, placardItems, setPlacardItems, ... } = cp;
// (el resto del código de PresupuestoNuevo.jsx sigue usando esos mismos
// nombres sin cambios: cargarPresupuesto, aplicarAjuste, revertirAjuste, el
// render de las solapas, etc.)

export default function useCocinaPlacard({
  authFetch,
  tab,
  lineasActivas,
  listaPrecio,
  listasDB,
  aplicarPorcentaje,
  ajusteAplicado,
  ajusteScope,
  ajusteValor,
  ajusteModo,
  calcularAjuste,
  cargandoPresupuestoRef,
  setPresupuestoItems,
}) {
  const cocinaItemsRef = useRef({});
  const placardItemsRef = useRef({});

  // ids de presupuestoItems (ej. "cocina-bajomesadas-0") cuyo precio cambió
  // en el último click de "Actualizar", para resaltarlos en verde en la
  // tabla de Presupuesto. Se limpia solo, a los pocos segundos.
  const [idsPrecioActualizado, setIdsPrecioActualizado] = useState(new Set());
  const limpiarResaltadoRef = useRef(null);

  // ── Cocina ───────────────────────────────────────────────
  // familiaActiva: null | "bajomesadas" | "alacenas"
  const [cocinaFamilia, setCocinaFamilia] = useState(null);
  // líneas cargadas por familia: { bajomesadas: [...], alacenas: [...] }
  const [cocinaItems, setCocinaItems] = useState({
    bajomesadas: [],
    alacenas: [],
  });

  // ── Placard ──────────────────────────────────────────────
  const [placardFamilia, setPlacardFamilia] = useState(null);
  const [placardItems, setPlacardItems] = useState({
    placard: [],
    frente: [],
    auxiliares: [],
    accesorios: [],
  });

  cocinaItemsRef.current = cocinaItems;
  placardItemsRef.current = placardItems;

  // ── Estado compartido para el buscador de artículos (placard) ───
  const [productosDB, setProductosDB] = useState([]);
  // placard edit state
  const [placardEditIdx, setPlacardEditIdx] = useState(null);
  const PLACARD_FILA_INIT = {
    articulo: "",
    nombreart: "",
    cantidad: 1,
    precio: "",
    precios: [],
    precioPlacard: "",
    margen: null,
    valor1: null,
    porcentaje1: null,
    valor2: null,
    porcentaje2: null,
    valor3: null,
    porcentaje3: null,
    area: null,
    accesorios: [],
    grupo: "",
  };
  const [placardFila, setPlacardFila] = useState({ ...PLACARD_FILA_INIT });
  const [placardSearch, setPlacardSearch] = useState("");
  const [placardSearchFocus, setPlacardSearchFocus] = useState(false);
  // Artículos del endpoint agrupado (por familia activa)
  const [articulosFamilia, setArticulosFamilia] = useState([]);

  // ── Popover de ajuste inline por fila ───────────────────
  // { tipo: "cocina"|"placard", familia, idx, campo: "precio"|linea_idx, anchorRect }
  const [precioPopover, setPrecioPopover] = useState(null);
  const [popoverModo, setPopoverModo] = useState("valor"); // "valor" | "porcentaje"
  const [popoverInput, setPopoverInput] = useState("");

  const abrirPrecioPopover = (tipo, familia, idx, campo, precioActual, e) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();

    // Recuperar el porcentaje ya guardado en esa columna (si existe)
    const items =
      tipo === "cocina"
        ? (cocinaItems[familia] ?? [])
        : (placardItems[familia] ?? []);
    const fila = items[idx];
    const CAMPOS_POR_IDX = [
      { v: "valor1", p: "porcentaje1" },
      { v: "valor2", p: "porcentaje2" },
      { v: "valor3", p: "porcentaje3" },
    ];
    let porcentajeActual = null;
    if (fila) {
      if (campo === "precio") {
        porcentajeActual = fila.porcentaje1 ?? null;
      } else if (CAMPOS_POR_IDX[campo]) {
        porcentajeActual = fila[CAMPOS_POR_IDX[campo].p] ?? null;
      }
    }

    setPrecioPopover({
      tipo,
      familia,
      idx,
      campo,
      precioActual,
      porcentajeActual,
      rect,
    });
    setPopoverModo("valor");
    setPopoverInput(String(precioActual ?? ""));
  };

  const cerrarPopover = () => {
    setPrecioPopover(null);
    setPopoverInput("");
  };

  const confirmarPopover = () => {
    if (!precioPopover) return;
    const val = parseFloat(popoverInput);
    if (isNaN(val)) {
      cerrarPopover();
      return;
    }
    const { tipo, familia, idx, campo } = precioPopover;

    const calcNuevo = (base) => {
      const b = parseFloat(base) || 0;
      if (popoverModo === "valor") return val < 0 ? Math.max(0, b + val) : val;
      return Math.round(b * (1 + val / 100) * 100) / 100;
    };

    // Devuelve { valor: "N", porcentaje: N|null } para guardar en valorN/porcentajeN.
    // En modo "porcentaje" SIEMPRE se calcula sobre basePct (precio de BD,
    // ya con %lista aplicado pero SIN ningún %item previo) — así aplicar
    // 20% y después 35% reemplaza el ajuste anterior en vez de acumularse
    // sobre él (20% y luego 35% deben dar ambos sobre el precio de BD, no
    // 35% sobre el resultado de +20%). En modo "valor" seguimos partiendo
    // de baseActual (el precio mostrado hoy), como antes.
    const calcPersist = (baseActual, basePct) => {
      const base = popoverModo === "porcentaje" ? basePct : baseActual;
      const nuevo = calcNuevo(base);
      return {
        valor: nuevo,
        porcentaje: popoverModo === "porcentaje" ? val : null,
      };
    };

    // Mapeo índice de columna (0,1,2) → campos valor/porcentaje en la fila
    const CAMPOS_POR_IDX = [
      { v: "valor1", p: "porcentaje1" },
      { v: "valor2", p: "porcentaje2" },
      { v: "valor3", p: "porcentaje3" },
    ];

    const actualizarItems = (prev) =>
      prev.map((fila, i) => {
        if (i !== idx) return fila;

        if (campo === "precio") {
          // Sin líneas activas: precio único — guardamos en valor1/porcentaje1.
          // basePct = precio de BD con %lista aplicado (sin %item), fijo,
          // para que el %item siempre parta del mismo punto.
          const basePct =
            fila.precioBase != null && fila.precioBase !== ""
              ? aplicarPorcentaje(fila.precioBase)
              : fila.precio;
          const { valor, porcentaje } = calcPersist(fila.precio, basePct);
          return {
            ...fila,
            precio: String(valor),
            valor1: valor,
            porcentaje1: porcentaje,
          };
        }

        // campo es índice de línea (número)
        const lineaIdx = campo; // 0-based
        const pbLinea = fila.preciosBase?.[lineaIdx]?.precioBase;
        const basePctLinea =
          pbLinea != null && pbLinea !== ""
            ? aplicarPorcentaje(pbLinea)
            : (fila.precios?.[lineaIdx]?.precio ?? fila.precio);

        const precios = (fila.precios ?? []).map((p, li) => {
          if (li !== lineaIdx) return p;
          const { valor } = calcPersist(p.precio, basePctLinea);
          return { ...p, precio: String(valor) };
        });
        const nuevoPrecio = precios[0]?.precio ?? fila.precio;

        // Guardar valor y porcentaje en el slot correspondiente (valorN/porcentajeN)
        const slot = CAMPOS_POR_IDX[lineaIdx];
        const { valor, porcentaje } = calcPersist(
          (fila.precios?.[lineaIdx]?.precio ?? fila.precio) || 0,
          basePctLinea,
        );

        const extra = slot ? { [slot.v]: valor, [slot.p]: porcentaje } : {};

        return { ...fila, precios, precio: String(nuevoPrecio), ...extra };
      });

    if (tipo === "cocina") {
      setCocinaItems((prev) => ({
        ...prev,
        [familia]: actualizarItems(prev[familia] ?? []),
      }));
    } else {
      setPlacardItems((prev) => ({
        ...prev,
        [familia]: actualizarItems(prev[familia] ?? []),
      }));
    }
    cerrarPopover();
  };

  // Recargar artículos cuando cambia la familia activa (placard)
  // Nota: cocina maneja su propia familia internamente en TabCocina
  const familiaActivaActual = tab === "placard" ? placardFamilia : null;
  useEffect(() => {
    if (!familiaActivaActual) {
      setArticulosFamilia([]);
      return;
    }
    // Mapear nombre interno → nombre en BD
    const familiaMap = {
      bajomesadas: "Bajomesada",
      alacenas: "Alacena",
      placard: "PLACARD",
      frente: "FRENTE DE PLACARD",
      auxiliares: "Auxiliares",
      accesorios: "Accesorios",
    };
    const familiaBD = familiaMap[familiaActivaActual] ?? familiaActivaActual;
    authFetch(
      `${API}/articulos/por-familia?familia=${encodeURIComponent(familiaBD)}`,
    )
      .then((r) => r.json())
      .then((data) => setArticulosFamilia(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [familiaActivaActual]);

  // Recalcula una fila aplicando el porcentaje de la lista activa
  // + el porcentaje extra propio del ítem (si lo tiene), compuestos.
  const recalcFila = (fila) => {
    const PCT_POR_IDX = ["porcentaje1", "porcentaje2", "porcentaje3"];
    const conExtra = (precioConLista, pctExtra) => {
      if (pctExtra == null || pctExtra === "") return precioConLista;
      const p = parseFloat(precioConLista) || 0;
      const extra = parseFloat(pctExtra) || 0;
      return String(Math.round(p * (1 + extra / 100) * 100) / 100);
    };
    // Ajuste general (panel "AJUSTE DE PRECIOS"): mismo patrón que %lista y
    // %item — se aplica como un factor más sobre el precio, nunca se
    // "hornea" por separado. Solo cubre el scope "todos": el scope a un
    // ítem puntual se sigue manejando aparte en aplicarAjuste/revertirAjuste
    // porque no hay dónde persistir ese scope en tabla_presupuestos.
    const conAjusteGeneral = (precio) => {
      if (!ajusteAplicado || ajusteScope !== "todos") return precio;
      const val = parseFloat(ajusteValor);
      if (!val || isNaN(val)) return precio;
      return String(calcularAjuste(precio, val));
    };

    // Accesorios: suma el precio de cada artículo "extra" tildado para
    // este ítem (fila.accesorios, nombres de artículos con area =
    // 'accesorio'), multiplicado por el área del ítem Y por la cantidad
    // del ítem (misma cuenta que cantacc al guardar: área × cantidad), al
    // precio del ítem. Se suma después de %lista, %item y ajuste general,
    // igual para todas las líneas. Se recalcula siempre desde cero (no es
    // acumulativo) así que confirmar el popover de accesorios varias veces
    // no duplica el cargo.
    const totalAccesorios = (fila.accesorios ?? []).reduce((acc, nombre) => {
      const art = accesoriosDisponibles.find((a) => a.articulo === nombre);
      const p = parseFloat(art?.precio);
      if (isNaN(p)) return acc;
      const area = parseFloat(fila.area) || 1;
      const cantidad = parseFloat(fila.cantidad) || 1;
      return acc + p * area * cantidad;
    }, 0);
    // TEMP DEBUG — sacar cuando se confirme el fix
    if ((fila.accesorios ?? []).length > 0) {
      console.log("[recalcFila][totalAccesorios]", {
        articulo: fila.articulo,
        accesorios: fila.accesorios,
        "fila.area": fila.area,
        "fila.cantidad": fila.cantidad,
        accesoriosDisponibles_len: accesoriosDisponibles.length,
        totalAccesorios,
      });
    }
    const conAccesorios = (precio) => {
      if (!totalAccesorios) return precio;
      const p = parseFloat(precio) || 0;
      return String(Math.round((p + totalAccesorios) * 100) / 100);
    };

    if (fila.preciosBase && fila.preciosBase.length > 0) {
      const nuevosPrecios = fila.preciosBase.map((pb, li) => {
        const conLista = aplicarPorcentaje(pb.precioBase);
        const pctExtra = fila[PCT_POR_IDX[li]];
        return {
          linea: pb.linea,
          precioBase: pb.precioBase,
          precio: conAccesorios(conAjusteGeneral(conExtra(conLista, pctExtra))),
        };
      });
      const nuevoPrecio =
        nuevosPrecios[0]?.precio ?? fila.precioBase ?? fila.precio;
      return { ...fila, precios: nuevosPrecios, precio: String(nuevoPrecio) };
    }
    if (fila.precioBase != null && fila.precioBase !== "") {
      const conLista = aplicarPorcentaje(fila.precioBase);
      return {
        ...fila,
        precio: conAccesorios(conAjusteGeneral(conExtra(conLista, fila.porcentaje1))),
      };
    }
    // Fallback: fila sin preciosBase ni precioBase (ítems que llegan solo con
    // `precio` ya resuelto, ej. cargados desde un presupuesto guardado antes
    // de que existiera el campo base). Sin esta rama, conAccesorios nunca se
    // llamaba acá y el freno/accesorios quedaba calculado en memoria
    // (totalAccesorios) pero nunca sumado al precio real de la línea.
    if (totalAccesorios) {
      return { ...fila, precio: conAccesorios(fila.precio) };
    }
    return fila;
  };

  // ── Freno ────────────────────────────────────────────────
  // "Aplicar freno" NO es un cargo $/m² aparte: es pegarle a cada ítem el
  // accesorio "autofreno" que le corresponde según su tipo (bisagra si es
  // puerta, corredera si es cajonera), tomado de accesoriosDisponibles por
  // codartint. La cantidad (cantacc) sale del área del ítem (columna AREA
  // de la tabla articulos, ya guardada en fila.area) — se resuelve recién
  // al guardar (handleGuardar en PresupuestoNuevo.jsx arma cantacc = área),
  // acá solo hace falta que el nombre del accesorio quede en
  // fila.accesorios, igual que si se tildara a mano desde el popover 🔧.
  const CODARTINT_FRENO_PUERTA = "EH35C0SCB";
  const CODARTINT_FRENO_CAJONERA = "EHCTSC500B";

  // Determina el codartint de freno que corresponde según el nombre del
  // ítem: "CAJ" (cajonera o correderas) -> freno de cajonera, "PTA"
  // (puerta) -> freno de puerta. null si el nombre no matchea ninguno de
  // los dos (no se le aplica nada a ese ítem).
  const codartintFrenoParaItem = (fila) => {
    const nombre = `${fila.nombreart ?? ""} ${fila.articulo ?? ""}`.toUpperCase();
    if (nombre.includes("CAJ")) return CODARTINT_FRENO_CAJONERA;
    if (nombre.includes("PTA")) return CODARTINT_FRENO_PUERTA;
    return null;
  };

  // Agrega (sin duplicar) el accesorio de freno correspondiente a
  // fila.accesorios. Si el ítem no matchea PTA/CAJONERA, o el codartint no
  // se encuentra en accesoriosDisponibles (todavía no cargó, o no existe
  // en la BD), devuelve la fila sin tocar.
  const conAccesorioFreno = (fila) => {
    const codartint = codartintFrenoParaItem(fila);
    if (!codartint) return fila;
    const art = accesoriosDisponibles.find(
      (a) => String(a.codartint) === String(codartint),
    );
    if (!art) return fila;
    if ((fila.accesorios ?? []).includes(art.articulo)) return fila;
    return { ...fila, accesorios: [...(fila.accesorios ?? []), art.articulo] };
  };

  // "Aplicar freno" recorre TODAS las familias de Cocina/Placard, no solo
  // la familia activa del tab — por eso necesita el mapa combinado
  // (construirMapaArticulosCompleto) para resolver fila.area en ítems
  // sin área persistida, en vez de depender de articulosFamilia (que solo
  // conoce la familia que se está mirando). Sin esto, recalcFila caía en
  // su fallback `area || 1` y el cargo del accesorio de freno quedaba a
  // mitad de precio en cualquier ítem con área > 1 (ej. cajoneras de 2
  // cajones) cuya fila todavía no tenía `area` seteada.
  const aplicarFrenoATodosCocina = () => {
    construirMapaArticulosCompleto().then((mapaArticulos) => {
      setCocinaItems((prev) => {
        const next = {};
        for (const [familia, filas] of Object.entries(prev)) {
          next[familia] = filas.map((f) =>
            recalcFila(conAccesorioFreno(resolverAreaConMapa(f, mapaArticulos))),
          );
        }
        return next;
      });
    });
  };

  const aplicarFrenoATodosPlacard = () => {
    construirMapaArticulosCompleto().then((mapaArticulos) => {
      setPlacardItems((prev) => {
        const next = {};
        for (const [familia, filas] of Object.entries(prev)) {
          next[familia] = filas.map((f) =>
            recalcFila(conAccesorioFreno(resolverAreaConMapa(f, mapaArticulos))),
          );
        }
        return next;
      });
    });
  };

  // Aplica el accesorio de freno a un único ítem (cocina o placard) por
  // índice, misma lógica que "aplicar a todos" pero puntual — mismo
  // motivo para pasar por el mapa combinado (ver comentario arriba).
  const setFrenoItemCocina = (familia, idx) => {
    construirMapaArticulosCompleto().then((mapaArticulos) => {
      setCocinaItems((prev) => ({
        ...prev,
        [familia]: (prev[familia] ?? []).map((f, i) =>
          i === idx
            ? recalcFila(conAccesorioFreno(resolverAreaConMapa(f, mapaArticulos)))
            : f,
        ),
      }));
    });
  };

  const setFrenoItemPlacard = (familia, idx) => {
    construirMapaArticulosCompleto().then((mapaArticulos) => {
      setPlacardItems((prev) => ({
        ...prev,
        [familia]: (prev[familia] ?? []).map((f, i) =>
          i === idx
            ? recalcFila(conAccesorioFreno(resolverAreaConMapa(f, mapaArticulos)))
            : f,
        ),
      }));
    });
  };

  // ── Accesorios ───────────────────────────────────────────
  // Cada ítem de Cocina/Placard puede tener accesorios extra (autofreno,
  // led, etc), tomados de los artículos con area = 'accesorio'. Se guardan
  // en `fila.accesorios` (array de nombres de artículo, ej: ["AUTOFRENO"]).
  // Se suman al precio del ítem (ver conAccesorios en recalcFila) y viajan
  // con el ítem hasta el backend.
  const [accesoriosDisponibles, setAccesoriosDisponibles] = useState([]);
  useEffect(() => {
    authFetch(`${API}/articulos/accesorios`)
      .then((r) => r.json())
      .then((data) => setAccesoriosDisponibles(Array.isArray(data) ? data : []))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Si un presupuesto se cargó ANTES de que terminara este fetch, las filas
  // quedan con `_accesorioCods` (los codartint crudos) pero `accesorios: []`
  // sin resolver. En cuanto accesoriosDisponibles esté listo, se resuelven
  // acá y se recalcula el precio (recalcFila) para que el cargo del
  // accesorio quede sumado.
  useEffect(() => {
    if (accesoriosDisponibles.length === 0) return;
    const resolverPendientes = (itemsObj) => {
      let cambio = false;
      const next = {};
      for (const [familia, filas] of Object.entries(itemsObj)) {
        next[familia] = filas.map((f) => {
          if (!f._accesorioCods?.length || f.accesorios?.length) return f;
          const nombres = f._accesorioCods
            .map(
              (cod) =>
                accesoriosDisponibles.find(
                  (a) => String(a.codartint) === String(cod),
                )?.articulo,
            )
            .filter(Boolean);
          if (!nombres.length) return f;
          cambio = true;
          return recalcFila({ ...f, accesorios: nombres });
        });
      }
      return cambio ? next : itemsObj;
    };
    setCocinaItems((prev) => resolverPendientes(prev));
    setPlacardItems((prev) => resolverPendientes(prev));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accesoriosDisponibles]);

  // Menú desplegable de accesorios: no sabe si el ítem está guardado o es
  // el draft de una fila en edición — solo necesita `actuales` (los
  // accesorios ya tildados, para pintar los checkboxes) y `onToggle`
  // (qué hacer cuando se tilda/destilda uno). Quien abre el menú
  // (TabCocina/PlacardSection) decide si onToggle pega contra
  // cocinaItems/placardItems (ítem ya guardado, fila de vista) o contra
  // cocinaFila/placardFila (draft de la fila en edición). Así se puede
  // editar accesorios tanto desde la fila de vista como desde "editar".
  const [accesorioMenu, setAccesorioMenu] = useState(null);

  const abrirAccesorioMenu = (actuales, onToggle, onConfirm, e) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setAccesorioMenu({ actuales: actuales ?? [], onToggle, onConfirm, rect });
  };

  const cerrarAccesorioMenu = () => setAccesorioMenu(null);

  // Devuelve un array nuevo con el accesorio agregado o quitado — helper
  // puro para armar el onToggle de cocinaItems/placardItems/cocinaFila/etc.
  const toggleAccesorioEnArray = (actuales, nombreAccesorio) => {
    const lista = actuales ?? [];
    return lista.includes(nombreAccesorio)
      ? lista.filter((a) => a !== nombreAccesorio)
      : [...lista, nombreAccesorio];
  };

  // Atajo para el caso más común: togglear el accesorio de un ítem YA
  // guardado en cocinaItems/placardItems por índice (fila de vista).
  // Recalcula el precio en el mismo toque (vía recalcFila) — ya no depende
  // de un paso de confirmación separado, así que un click afuera del
  // popover (que solo cierra el menú, sin llamar a onConfirm) no puede
  // dejar el accesorio tildado sin sumar al precio.
  const toggleAccesorioItem = (tipo, familia, idx, nombreAccesorio, areaResuelta) => {
    const actualizar = (prev) => ({
      ...prev,
      [familia]: (prev[familia] ?? []).map((f, i) => {
        if (i !== idx) return f;
        // Mismo fallback que confirmarAccesoriosItem: si f.area viene null
        // (ítem cargado/agregado antes de persistir esa columna), usamos
        // areaResuelta que debe mandar el llamador (TabCocina/PlacardSection,
        // con resolverAreaItem). Sin esto, recalcFila caía en su default
        // "area || 1" y sumaba el precio de un solo accesorio en vez de la
        // cantidad real (ej. 2 bisagras en una puerta simple).
        const fila = f.area != null ? f : { ...f, area: areaResuelta ?? f.area };
        return recalcFila({
          ...fila,
          accesorios: toggleAccesorioEnArray(fila.accesorios, nombreAccesorio),
        });
      }),
    });
    if (tipo === "cocina") setCocinaItems(actualizar);
    else setPlacardItems(actualizar);
  };

  // Confirma la selección de accesorios de un ítem YA guardado (fila de
  // vista): recalcula el precio desde cero (precioBase + %lista + %item +
  // ajuste + accesorios), para que el total de accesorios elegido
  // quede sumado al valor del ítem. Se llama al pinchar "Ingresar" en el
  // popover.
  const confirmarAccesoriosItem = (tipo, familia, idx, areaResuelta) => {
    const actualizar = (prev) => ({
      ...prev,
      [familia]: (prev[familia] ?? []).map((f, i) => {
        if (i !== idx) return f;
        // f.area puede venir null en ítems guardados antes de persistir
        // esa columna, o agregados por un flujo que todavía no la seteaba.
        // Los llamadores (TabCocina/PlacardSection) ya resuelven el área
        // correcta con resolverAreaItem antes de llamar acá — la usamos
        // como fallback y la dejamos guardada en la fila para que los
        // próximos recalcFila (ej. handleActualizar) no vuelvan a perderla.
        const fila = f.area != null ? f : { ...f, area: areaResuelta ?? f.area };
        return recalcFila(fila);
      }),
    });
    if (tipo === "cocina") setCocinaItems(actualizar);
    else setPlacardItems(actualizar);
  };

  // Actualiza todo el front con los parámetros actuales del encabezado — sin tocar el backend

  // Refresca preciosBase/precioBase de una fila contra el artículo fresco
  // de la BD, SOLO si cambiaron. El endpoint /articulos/por-familia agrupa
  // varias filas físicas (una por Nº de línea, cada una con su propio
  // codartint) bajo un mismo nombre de artículo, así que recorremos cada
  // línea de preciosBase por separado: cada una corresponde a un codartint
  // distinto en la tabla `articulos`, no hay un único codartint por ítem.
  // No toca %item, %lista, ajuste general ni accesorios — eso lo vuelve a
  // aplicar recalcFila después, igual que siempre.
  const refrescarPreciosBaseFila = (fila, mapaArticulos) => {
    const art = buscarArticuloNormalizado(mapaArticulos, fila.nombreart || fila.articulo);
    if (!art) return fila; // artículo ya no existe / cambió de nombre en la BD: no tocar

    let nuevaFila = fila;

    if (fila.preciosBase && fila.preciosBase.length > 0) {
      let cambio = false;
      const preciosBaseNuevos = fila.preciosBase.map((pb) => {
        const fresco = art.precios?.[String(pb.linea)];
        if (fresco == null || fresco === "" || String(fresco) === String(pb.precioBase)) {
          return pb;
        }
        cambio = true;
        return { ...pb, precioBase: fresco };
      });
      if (cambio) nuevaFila = { ...nuevaFila, preciosBase: preciosBaseNuevos };
    }

    // precioBase (singular) es el respaldo que usa recalcFila cuando
    // preciosBase viene vacío (ver resolverPrecioBasePlacard). Mismo
    // criterio acá: línea activa -> si no hay, línea 15 fija.
    if (fila.precioBase != null && fila.precioBase !== "") {
      let frescoBase = art.precios?.[String(fila.preciosBase?.[0]?.linea)];
      if (frescoBase == null || frescoBase === "") {
        frescoBase = art.precios?.[LINEA_FIJA_PLACARD];
      }
      if (
        frescoBase != null &&
        frescoBase !== "" &&
        String(frescoBase) !== String(fila.precioBase)
      ) {
        nuevaFila = { ...nuevaFila, precioBase: frescoBase };
      }
    }

    return nuevaFila;
  };

  // Trae TODAS las familias posibles de una y arma un mapa combinado
  // artículo->registro BD, en vez de derivar la familia BD a partir de la
  // clave interna donde vive cada ítem. Un ítem puede estar guardado bajo
  // la clave interna "placard" pero pertenecer en la BD a la familia
  // "FRENTE DE PLACARD" (el grupo visual "FRENTE DE PLACARD COLOR/BLANCO"
  // es solo la etiqueta `grupo` del ítem, no una familia interna separada
  // — comprobado con logs: placardItems.placard traía los 3 ítems,
  // frente/auxiliares/accesorios vacíos). En vez de adivinar los nombres
  // de familia (frágil: "FRENTE DE PLACARD" podía no ser el string exacto
  // guardado en la BD), pedimos primero la lista REAL de familias
  // existentes y traemos los artículos de todas — así el matcheo por
  // nombre no depende de que adivinemos bien el nombre de la familia.
  // Extraído de handleActualizar para reusarlo también al resolver
  // fila.area en las funciones de freno (ver aplicarFrenoATodosCocina /
  // aplicarFrenoATodosPlacard más abajo), que igual que acá recorren
  // TODAS las familias y no solo la familia activa del tab (por eso no
  // alcanza con articulosFamilia/resolverAreaItem de TabCocina, que solo
  // conoce la familia que estás mirando en ese momento).
  const construirMapaArticulosCompleto = () =>
    authFetch(`${API}/articulos/familias-todas`)
      .then((r) => r.json())
      .then((data) => (Array.isArray(data) ? data : []))
      .catch(() => [])
      .then((familiasBD) =>
        Promise.all(
          familiasBD.map((familiaBD) =>
            authFetch(`${API}/articulos/por-familia?familia=${encodeURIComponent(familiaBD)}`)
              .then((r) => r.json())
              .then((data) => (Array.isArray(data) ? data : []))
              .catch(() => []),
          ),
        ),
      )
      .then((resultados) => {
        const mapaArticulos = new Map();
        for (const lista of resultados) {
          for (const a of lista) mapaArticulos.set(normalizarArticulo(a.articulo), a);
        }
        return mapaArticulos;
      });

  // Resuelve fila.area contra el mapa combinado cuando la fila todavía no
  // la tiene persistida (mismo caso que resolverAreaItem en TabCocina,
  // pero cubriendo TODAS las familias). Devuelve la fila sin tocar si ya
  // tenía área o si no hubo match.
  const resolverAreaConMapa = (fila, mapaArticulos) => {
    if (fila.area != null) return fila;
    const art = buscarArticuloNormalizado(mapaArticulos, fila.nombreart || fila.articulo);
    const area = art ? (art.area ?? art.AREA ?? null) : null;
    return area != null ? { ...fila, area } : fila;
  };

  const handleActualizar = () => {
    const hayCocina = Object.values(cocinaItemsRef.current).some((filas) => filas?.length);
    const hayPlacard = Object.values(placardItemsRef.current).some((filas) => filas?.length);

    // Sin ítems cargados: solo recalcula (comportamiento previo)
    if (!hayCocina && !hayPlacard) {
      setCocinaItems((prev) => {
        const next = {};
        for (const [familia, filas] of Object.entries(prev)) next[familia] = filas.map(recalcFila);
        return next;
      });
      setPlacardItems((prev) => {
        const next = {};
        for (const [familia, filas] of Object.entries(prev)) next[familia] = filas.map(recalcFila);
        return next;
      });
      return;
    }

    construirMapaArticulosCompleto().then((mapaArticulos) => {
        // TEMP DEBUG — sacar cuando se confirme que el fix funciona
        console.log("[Actualizar] mapa combinado de artículos (BD), total:", mapaArticulos.size);

        const normalizarDebug = normalizarArticulo;

        const logMatch = (seccion, familia, f) => {
          // El match real se hace por nombreart (nombre real del catálogo,
          // ej. con rango de ancho "180 a 200"), no por f.articulo (texto
          // compuesto para mostrar en el presupuesto, ej. con ancho literal
          // "200" y cantidad de puertas) — ese texto casi nunca existe tal
          // cual en la tabla articulos.
          const clave = f.nombreart || f.articulo;
          const art = buscarArticuloNormalizado(mapaArticulos, clave);
          if (art) {
            console.log(`[Actualizar][${seccion}/${familia}] "${clave}" -> match EXACTO en BD:`, art);
            return;
          }
          // No hubo match exacto: buscamos candidatos parecidos para ver la diferencia real
          const objetivo = normalizarDebug(clave);
          const candidatos = [...mapaArticulos.keys()]
            .filter((k) => {
              const nk = normalizarDebug(k);
              return nk === objetivo || nk.includes(objetivo) || objetivo.includes(nk);
            })
            .slice(0, 5);
          console.log(
            `[Actualizar][${seccion}/${familia}] "${clave}" -> NO ENCONTRADO (exacto). Candidatos parecidos en BD:`,
            candidatos.length ? candidatos : "(ninguno)",
          );
        };

        const idsCambiados = [];

        setCocinaItems((prev) => {
          const next = {};
          for (const [familia, filas] of Object.entries(prev)) {
            next[familia] = filas.map((f, i) => {
              logMatch("cocina", familia, f);
              const actualizada = recalcFila(refrescarPreciosBaseFila(f, mapaArticulos));
              if (parseFloat(actualizada.precio) !== parseFloat(f.precio)) {
                idsCambiados.push(`cocina-${familia}-${i}`);
              }
              return actualizada;
            });
          }
          return next;
        });
        setPlacardItems((prev) => {
          const next = {};
          for (const [familia, filas] of Object.entries(prev)) {
            next[familia] = filas.map((f, i) => {
              logMatch("placard", familia, f);
              const actualizada = recalcFila(refrescarPreciosBaseFila(f, mapaArticulos));
              if (parseFloat(actualizada.precio) !== parseFloat(f.precio)) {
                idsCambiados.push(`placard-${familia}-${i}`);
              }
              return actualizada;
            });
          }
          return next;
        });

        // Resalta en verde, en la tabla de Presupuesto, los ítems cuyo
        // precio efectivamente cambió — y lo saca solo a los pocos segundos.
        if (limpiarResaltadoRef.current) clearTimeout(limpiarResaltadoRef.current);
        setIdsPrecioActualizado(new Set(idsCambiados));
        limpiarResaltadoRef.current = setTimeout(() => {
          setIdsPrecioActualizado(new Set());
        }, 6000);
      });
  };

  // Recalcular precios cuando cambia la lista de precios o el ajuste general.
  // recalcFila ahora es la única fuente de verdad para el precio final
  // (base × %lista × %item × %ajusteGeneral), así que este efecto puede
  // recalcular sin miedo a perder el ajuste general: si está aplicado
  // (scope "todos"), recalcFila lo vuelve a incluir solo.
  useEffect(() => {
    // No recalcular mientras se está cargando un presupuesto existente: los
    // datos que trae la BD (base1/2/3, porcentaje1/2/3, ajusteValor/Modo)
    // todavía se están restaurando y recalcular a mitad de camino podría
    // usar valores parciales.
    if (cargandoPresupuestoRef.current) return;
    // No recalcular si todavía no se resolvió la lista de precios activa
    // (fetch a /lista en curso, o listaPendienteRef.current sin aplicar
    // todavía). Sin este guard, este efecto puede dispararse con
    // listaPrecio === "" -> listaPorcentaje da 0 -> se pisa el precio bien
    // cargado desde la BD (con %lista y/o %ajuste ya incluidos) con uno
    // recalculado incompleto. Cuando listaPrecio finalmente se setea, el
    // cambio de dependencia vuelve a disparar este mismo efecto, esta vez
    // con datos completos.
    if (!listaPrecio) return;
    // No recalcular si listasDB todavía no llegó del fetch a /lista: si
    // corriéramos acá, listaActiva no encuentra nada (listasDB === []),
    // listaPorcentaje da 0, y ese 0% queda "horneado" en cocinaItems/
    // placardItems. Como listasDB no formaba parte de las dependencias de
    // este efecto, cuando /lista finalmente resolvía no se volvía a
    // disparar el recálculo — el precio quedaba pisado sin el % de lista
    // aunque listaPrecio nunca haya cambiado (bug: se perdía el +21% de
    // Lista 3 al crear una nueva revisión).
    if (listasDB.length === 0) return;
    // Ajuste con scope a un ítem puntual: no está cubierto por
    // conAjusteGeneral (no hay dónde persistir el scope en BD), lo maneja
    // aplicarAjuste/revertirAjuste mutando esa fila directamente. Si
    // recalculáramos acá igual, pisaríamos ese ajuste puntual.
    if (ajusteAplicado && ajusteScope !== "todos") return;
    setCocinaItems((prev) => {
      const next = {};
      for (const [familia, filas] of Object.entries(prev)) {
        next[familia] = filas.map(recalcFila);
      }
      return next;
    });
    setPlacardItems((prev) => {
      const next = {};
      for (const [familia, filas] of Object.entries(prev)) {
        next[familia] = filas.map(recalcFila);
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listaPrecio, listasDB, ajusteAplicado, ajusteValor, ajusteModo, ajusteScope]);

  // Sincronizar cocina y placard con la tabla de presupuesto
  useEffect(() => {
    const toItems = (seccion, itemsObj) =>
      Object.entries(itemsObj).flatMap(([familia, filas]) =>
        filas.map((f, i) => ({
          id: `${seccion}-${familia}-${i}`,
          seccion:
            seccion === "cocina"
              ? `Cocina / ${familia.charAt(0).toUpperCase() + familia.slice(1)}`
              : `Placard / ${familia.charAt(0).toUpperCase() + familia.slice(1)}`,
          descripcion: f.articulo,
          nombreart: f.nombreart ?? "",
          cantidad: parseFloat(f.cantidad) || 1,
          precio: parseFloat(f.precio) || 0,
          subtotal: (parseFloat(f.precio) || 0) * (parseFloat(f.cantidad) || 1),
          precios: f.precios ?? [],
          precioBase: f.precioBase ?? null,
          preciosBase: f.preciosBase ?? [],
          margen: f.margen ?? null,
          valor1: f.valor1 ?? null,
          porcentaje1: f.porcentaje1 ?? null,
          valor2: f.valor2 ?? null,
          porcentaje2: f.porcentaje2 ?? null,
          valor3: f.valor3 ?? null,
          porcentaje3: f.porcentaje3 ?? null,
          area: f.area ?? null,
          accesorios: f.accesorios ?? [],
          grupo: f.grupo && f.grupo.trim() ? f.grupo.trim() : null,
          color: f.color ?? null,
        })),
      );

    const cocinaRows = toItems("cocina", cocinaItems);
    const placardRows = toItems("placard", placardItems);

    setPresupuestoItems((prev) => {
      // Mantener los ítems de mampara/especiales, reemplazar cocina/placard
      const otros = prev.filter(
        (p) => !p.id.startsWith("cocina-") && !p.id.startsWith("placard-"),
      );
      return [...cocinaRows, ...placardRows, ...otros];
    });
  }, [cocinaItems, placardItems]);

  const placard_total = (familia) =>
    placardItems[familia]?.reduce(
      (s, r) => s + (parseFloat(r.precio) || 0) * (parseFloat(r.cantidad) || 0),
      0,
    ) ?? 0;

  // Normaliza un string: minúsculas y sin tildes
  const normalizar = (s) =>
    String(s ?? "")
      .toLowerCase()
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

  // Devuelve la familia del producto desde el campo 'familia'
  const getProductoFamilia = (p) => normalizar(p.familia ?? p.FAMILIA ?? "");

  // Quita el sufijo de número de línea al final
  // Ejemplos: "Bajomesada 100 2 Ptas Nº 14" → "Bajomesada 100 2 Ptas"
  const nombreBase = (nombre) => {
    const s = String(nombre ?? "").trim();
    const result = s.replace(/\s+N.{0,3}\s*\d+\s*$/i, "").trim();
    return result || s;
  };

  // Completar preciosBase/precios de ítems YA cargados cuando se agrega
  // (o se saca) una línea en el Encabezado. Sin esto, un ítem cargado antes
  // de activar "Línea 1" nunca tiene precios[1], y la tabla cae al fallback
  // item.precio (el de la primera línea) para las columnas nuevas.
  const lineasActivasClaveRef = useRef("");
  useEffect(() => {
    if (cargandoPresupuestoRef.current) return;
    const clave = lineasActivas.map((l) => l.linea).join("|");
    if (clave === lineasActivasClaveRef.current) return;
    lineasActivasClaveRef.current = clave;
    if (lineasActivas.length === 0) return;

    const familiaMapCocina = { bajomesadas: "Bajomesada", alacenas: "Alacena" };
    const familiaMapPlacard = {
      bajomesadas: "Bajomesada",
      alacenas: "Alacena",
      placard: "PLACARD",
      frente: "FRENTE DE PLACARD",
      auxiliares: "Auxiliares",
      accesorios: "Accesorios",
    };

    // Alinea preciosBase de una fila con lineasActivas, completando solo
    // las líneas que le falten (no toca las que ya tenía).
    // esPlacard: si el artículo no tiene precio cargado para la línea activa,
    // cae a la línea fija 15 (ver resolverPrecioBasePlacard) en vez de dejar
    // "" — que es lo que producía precio $0 al activar una línea nueva.
    const alinearPreciosBaseConLineas = (fila, mapaArticulos, esPlacard) => {
      const actuales = fila.preciosBase ?? [];
      const tieneTodas = lineasActivas.every((l) =>
        actuales.some((pb) => pb.linea === l.linea),
      );
      if (tieneTodas) return fila;

      const art = buscarArticuloNormalizado(mapaArticulos, fila.nombreart || fila.articulo);
      const combinado = lineasActivas.map((l) => {
        const existente = actuales.find((pb) => pb.linea === l.linea);
        if (existente) return existente;
        let precioBase = art?.precios?.[String(l.linea)] ?? "";
        if (esPlacard && (precioBase == null || precioBase === "")) {
          const p15 = art?.precios?.[LINEA_FIJA_PLACARD];
          precioBase = p15 != null && p15 !== "" ? p15 : "";
        }
        return { linea: l.linea, precioBase };
      });
      return recalcFila({ ...fila, preciosBase: combinado });
    };

    const familiasConItems = (itemsObj, familiaMap) =>
      Object.entries(itemsObj)
        .filter(([, filas]) => filas?.length)
        .map(([familia]) => familiaMap[familia] ?? familia);

    const familiasBDNecesarias = new Set([
      ...familiasConItems(cocinaItemsRef.current, familiaMapCocina),
      ...familiasConItems(placardItemsRef.current, familiaMapPlacard),
    ]);
    if (familiasBDNecesarias.size === 0) return;

    Promise.all(
      [...familiasBDNecesarias].map((familiaBD) =>
        authFetch(`${API}/articulos/por-familia?familia=${encodeURIComponent(familiaBD)}`)
          .then((r) => r.json())
          .then((data) => [familiaBD, Array.isArray(data) ? data : []])
          .catch(() => [familiaBD, []]),
      ),
    ).then((resultados) => {
      const mapaPorFamiliaBD = new Map(resultados);
      const mapaArticulosDe = (familiaInterna, familiaMap) => {
        const familiaBD = familiaMap[familiaInterna] ?? familiaInterna;
        const lista = mapaPorFamiliaBD.get(familiaBD) ?? [];
        return armarMapaArticulosNormalizado(lista);
      };

      setCocinaItems((prev) => {
        const next = {};
        for (const [familia, filas] of Object.entries(prev)) {
          const mapa = mapaArticulosDe(familia, familiaMapCocina);
          next[familia] = filas.map((f) => alinearPreciosBaseConLineas(f, mapa, false));
        }
        return next;
      });
      setPlacardItems((prev) => {
        const next = {};
        for (const [familia, filas] of Object.entries(prev)) {
          const mapa = mapaArticulosDe(familia, familiaMapPlacard);
          next[familia] = filas.map((f) => alinearPreciosBaseConLineas(f, mapa, true));
        }
        return next;
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lineasActivas]);

  // Dado un nombre base, devuelve el precio para una línea específica (usa datos del nuevo endpoint)
  const getPrecioParaLinea = (base, lineaNombre) => {
    const art = articulosFamilia.find((a) => a.articulo === base);
    return art?.precios?.[String(lineaNombre)] ?? null;
  };

  // Placard tiene su propia línea de precios fija en la base de datos (línea 15),
  // independiente de las líneas que se hayan elegido en el Encabezado (16, 21, etc.).
  // Si el artículo no tiene precio cargado para ninguna de las líneas activas,
  // se usa la línea 15 como respaldo — sin necesidad de activarla en Encabezado.
  const resolverPrecioBasePlacard = (articuloBD) => {
    const preciosBase = lineasActivas.map((l) => {
      let precioBase = articuloBD.precios?.[String(l.linea)] ?? "";
      if (precioBase == null || precioBase === "") {
        const p15 = articuloBD.precios?.[LINEA_FIJA_PLACARD];
        precioBase = p15 != null && p15 !== "" ? p15 : "";
      }
      return { linea: l.linea, precioBase };
    });
    let precioBaseUsar = preciosBase[0]?.precioBase;
    if (precioBaseUsar == null || precioBaseUsar === "") {
      const p15 = articuloBD.precios?.[LINEA_FIJA_PLACARD];
      precioBaseUsar = p15 != null && p15 !== "" ? p15 : "";
    }
    return { preciosBase, precioBaseUsar };
  };

  // Filtra artículos por texto de búsqueda — solo para placard (cocina filtra internamente en TabCocina)
  const productosFiltrados = articulosFamilia.filter(
    (a) =>
      !placardSearch.trim() ||
      normalizar(a.articulo).includes(normalizar(placardSearch)),
  );

  // ── Helpers Placard ──────────────────────────────────────
  const placardAgregarFila = () => {
    if (!placardFila.articulo.trim()) return;
    setPlacardItems((prev) => ({
      ...prev,
      [placardFamilia]: [
        ...(prev[placardFamilia] ?? []),
        recalcFila({ ...placardFila }),
      ],
    }));
    // Conserva el grupo elegido para que el usuario pueda agregar varios
    // artículos seguidos al mismo grupo sin tener que retipearlo (igual que
    // en Cocina).
    setPlacardFila((f) => ({ ...PLACARD_FILA_INIT, grupo: f.grupo ?? "" }));
    setPlacardSearch("");
  };

  const placardEliminarFila = (idx) => {
    setPlacardItems((prev) => ({
      ...prev,
      [placardFamilia]: prev[placardFamilia].filter((_, i) => i !== idx),
    }));
  };

  const placardGuardarEdit = (idx) => {
    setPlacardItems((prev) => ({
      ...prev,
      [placardFamilia]: prev[placardFamilia].map((r, i) =>
        i === idx ? recalcFila({ ...placardFila }) : r,
      ),
    }));
    setPlacardEditIdx(null);
    setPlacardFila((f) => ({ ...PLACARD_FILA_INIT, grupo: f.grupo ?? "" }));
    setPlacardSearch("");
  };

  const placardIniciarEdit = (idx) => {
    const fila = placardItems[placardFamilia][idx];
    setPlacardFila({ ...fila });
    setPlacardSearch(fila.articulo);
    setPlacardEditIdx(idx);
  };

  return {
    // refs
    cocinaItemsRef,
    placardItemsRef,
    // cocina
    cocinaFamilia,
    setCocinaFamilia,
    cocinaItems,
    setCocinaItems,
    // placard
    placardFamilia,
    setPlacardFamilia,
    placardItems,
    setPlacardItems,
    productosDB,
    setProductosDB,
    placardEditIdx,
    setPlacardEditIdx,
    placardFila,
    setPlacardFila,
    placardSearch,
    setPlacardSearch,
    placardSearchFocus,
    setPlacardSearchFocus,
    articulosFamilia,
    setArticulosFamilia,
    // popover
    precioPopover,
    popoverModo,
    setPopoverModo,
    popoverInput,
    setPopoverInput,
    abrirPrecioPopover,
    cerrarPopover,
    confirmarPopover,
    // helpers / cálculo
    placard_total,
    normalizar,
    getProductoFamilia,
    nombreBase,
    getPrecioParaLinea,
    resolverPrecioBasePlacard,
    productosFiltrados,
    recalcFila,
    handleActualizar,
    idsPrecioActualizado,
    // CRUD placard
    placardAgregarFila,
    placardEliminarFila,
    placardGuardarEdit,
    placardIniciarEdit,
    // freno
    aplicarFrenoATodosCocina,
    aplicarFrenoATodosPlacard,
    setFrenoItemCocina,
    setFrenoItemPlacard,
    // accesorios
    accesoriosDisponibles,
    accesorioMenu,
    abrirAccesorioMenu,
    cerrarAccesorioMenu,
    toggleAccesorioItem,
    toggleAccesorioEnArray,
    confirmarAccesoriosItem,
  };
}
