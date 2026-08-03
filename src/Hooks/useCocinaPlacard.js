import { useState, useEffect, useRef } from "react";

const API = "https://integral-backend-production.up.railway.app";

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

    // Devuelve { valor: "N", porcentaje: N|null } para guardar en valorN/porcentajeN
    const calcPersist = (base) => {
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
          // Sin líneas activas: precio único — guardamos en valor1/porcentaje1
          const { valor, porcentaje } = calcPersist(fila.precio);
          return {
            ...fila,
            precio: String(valor),
            valor1: valor,
            porcentaje1: porcentaje,
          };
        }

        // campo es índice de línea (número)
        const lineaIdx = campo; // 0-based
        const precios = (fila.precios ?? []).map((p, li) => {
          if (li !== lineaIdx) return p;
          const { valor } = calcPersist(p.precio);
          return { ...p, precio: String(valor) };
        });
        const nuevoPrecio = precios[0]?.precio ?? fila.precio;

        // Guardar valor y porcentaje en el slot correspondiente (valorN/porcentajeN)
        const slot = CAMPOS_POR_IDX[lineaIdx];
        const { valor, porcentaje } = calcPersist(
          (fila.precios?.[lineaIdx]?.precio ?? fila.precio) || 0,
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
    // 'accesorio') al precio del ítem. Se suma después de %lista, %item y
    // ajuste general, igual para todas las líneas. Se recalcula siempre
    // desde cero (no es acumulativo) así que confirmar el popover de
    // accesorios varias veces no duplica el cargo.
    const totalAccesorios = (fila.accesorios ?? []).reduce((acc, nombre) => {
      const art = accesoriosDisponibles.find((a) => a.articulo === nombre);
      const p = parseFloat(art?.precio);
      return acc + (isNaN(p) ? 0 : p);
    }, 0);
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
  // ítem: "CAJONERA" -> freno de cajonera, "PTA" (puerta) -> freno de
  // puerta. null si el nombre no matchea ninguno de los dos (no se le
  // aplica nada a ese ítem).
  const codartintFrenoParaItem = (fila) => {
    const nombre = `${fila.nombreart ?? ""} ${fila.articulo ?? ""}`.toUpperCase();
    if (nombre.includes("CAJONERA")) return CODARTINT_FRENO_CAJONERA;
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

  const aplicarFrenoATodosCocina = () => {
    setCocinaItems((prev) => {
      const next = {};
      for (const [familia, filas] of Object.entries(prev)) {
        next[familia] = filas.map((f) => recalcFila(conAccesorioFreno(f)));
      }
      return next;
    });
  };

  const aplicarFrenoATodosPlacard = () => {
    setPlacardItems((prev) => {
      const next = {};
      for (const [familia, filas] of Object.entries(prev)) {
        next[familia] = filas.map((f) => recalcFila(conAccesorioFreno(f)));
      }
      return next;
    });
  };

  // Aplica el accesorio de freno a un único ítem (cocina o placard) por
  // índice, misma lógica que "aplicar a todos" pero puntual.
  const setFrenoItemCocina = (familia, idx) => {
    setCocinaItems((prev) => ({
      ...prev,
      [familia]: (prev[familia] ?? []).map((f, i) =>
        i === idx ? recalcFila(conAccesorioFreno(f)) : f,
      ),
    }));
  };

  const setFrenoItemPlacard = (familia, idx) => {
    setPlacardItems((prev) => ({
      ...prev,
      [familia]: (prev[familia] ?? []).map((f, i) =>
        i === idx ? recalcFila(conAccesorioFreno(f)) : f,
      ),
    }));
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
  const toggleAccesorioItem = (tipo, familia, idx, nombreAccesorio) => {
    const actualizar = (prev) => ({
      ...prev,
      [familia]: (prev[familia] ?? []).map((f, i) =>
        i === idx
          ? { ...f, accesorios: toggleAccesorioEnArray(f.accesorios, nombreAccesorio) }
          : f,
      ),
    });
    if (tipo === "cocina") setCocinaItems(actualizar);
    else setPlacardItems(actualizar);
  };

  // Confirma la selección de accesorios de un ítem YA guardado (fila de
  // vista): recalcula el precio desde cero (precioBase + %lista + %item +
  // ajuste + accesorios), para que el total de accesorios elegido
  // quede sumado al valor del ítem. Se llama al pinchar "Ingresar" en el
  // popover.
  const confirmarAccesoriosItem = (tipo, familia, idx) => {
    const actualizar = (prev) => ({
      ...prev,
      [familia]: (prev[familia] ?? []).map((f, i) =>
        i === idx ? recalcFila(f) : f,
      ),
    });
    if (tipo === "cocina") setCocinaItems(actualizar);
    else setPlacardItems(actualizar);
  };

  // Actualiza todo el front con los parámetros actuales del encabezado — sin tocar el backend
  const handleActualizar = () => {
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
    const alinearPreciosBaseConLineas = (fila, mapaArticulos) => {
      const actuales = fila.preciosBase ?? [];
      const tieneTodas = lineasActivas.every((l) =>
        actuales.some((pb) => pb.linea === l.linea),
      );
      if (tieneTodas) return fila;

      const art = mapaArticulos.get(fila.articulo);
      const combinado = lineasActivas.map((l) => {
        const existente = actuales.find((pb) => pb.linea === l.linea);
        if (existente) return existente;
        return {
          linea: l.linea,
          precioBase: art?.precios?.[String(l.linea)] ?? "",
        };
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
        return new Map(lista.map((a) => [a.articulo, a]));
      };

      setCocinaItems((prev) => {
        const next = {};
        for (const [familia, filas] of Object.entries(prev)) {
          const mapa = mapaArticulosDe(familia, familiaMapCocina);
          next[familia] = filas.map((f) => alinearPreciosBaseConLineas(f, mapa));
        }
        return next;
      });
      setPlacardItems((prev) => {
        const next = {};
        for (const [familia, filas] of Object.entries(prev)) {
          const mapa = mapaArticulosDe(familia, familiaMapPlacard);
          next[familia] = filas.map((f) => alinearPreciosBaseConLineas(f, mapa));
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
  const LINEA_FIJA_PLACARD = "15";
  const resolverPrecioBasePlacard = (articuloBD) => {
    const preciosBase = lineasActivas.map((l) => ({
      linea: l.linea,
      precioBase: articuloBD.precios?.[String(l.linea)] ?? "",
    }));
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
