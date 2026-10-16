import { useState, useEffect, useMemo, useRef } from "react";

const API = "https://integral-backend-production.up.railway.app";

// ─────────────────────────────────────────────────────────────────────────────
// PresupuestoPuertaVidrio
//
// Mismo mecanismo que PresupuestoMamparas.jsx, pero con DOS artículos base:
//   - Perfil
//   - Vidrio
// De cada uno se toman sus artículos asociados (tabla `asociaciones`, por
// codart) y se calculan con las fórmulas (`/formulas/calcular`) usando
// ancho / alto / cantidad. Los slots sin fórmula son "directos"
// (precio × cantidad del slot × cantidad total). El margen es editable por
// slot y el total es la suma de todos los resultados.
//
// Variables que reciben las fórmulas:
//   ancho, alto, cantidad, precio (del slot), precio_perfil, precio_vidrio
//   y FORM_XXX para fórmulas anidadas.
//
// Dónde busca perfiles y vidrios: en GET /productos (catálogo sin filtrar).
// Perfiles = artículos cuyo rubro/familia (o, si no hay, nombre) contiene
// "perfil"; vidrios = idem con "vidrio". Si no encuentra ninguno, el select
// muestra todo el catálogo para no quedar bloqueado. Para cambiar el criterio
// tocar TOKEN_PERFIL / TOKEN_VIDRIO.
//
// Props:
//   authFetch            – fetch con JWT (el de TabComponentes)
//   agregarAPresupuesto  – función del presupuesto padre
//   onVolver             – vuelve a la vista de familias
// ─────────────────────────────────────────────────────────────────────────────
const TOKEN_PERFIL = "perfil";
const TOKEN_VIDRIO = "vidrio";

const norm = (s) =>
  (s ?? "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const aNumero = (v) => parseFloat(String(v ?? "").replace(",", "."));

const formatPeso = (n) =>
  "$" +
  Number(n || 0)
    .toLocaleString("es-AR", { minimumFractionDigits: 0 })
    .replace(/,/g, ".");

const ORDEN_ORIGEN = { perfil: 0, vidrio: 1 };
const ETIQUETA_ORIGEN = { perfil: "Perfil", vidrio: "Vidrio" };

export default function PresupuestoPuertaVidrio({
  authFetch,
  agregarAPresupuesto,
  onVolver,
}) {
  // authFetch del padre se recrea en cada render: se guarda en un ref para
  // que los efectos siempre usen el último sin depender de su identidad.
  const fetchRef = useRef(authFetch);
  fetchRef.current = authFetch;
  const api = (path, options) => fetchRef.current(`${API}${path}`, options);

  // ── Catálogo y selección ────────────────────────────────────────────────
  const [catalogo, setCatalogo] = useState([]);
  const [cargandoCat, setCargandoCat] = useState(true);
  const [errorCat, setErrorCat] = useState("");
  const [perfil, setPerfil] = useState(null);
  const [vidrio, setVidrio] = useState(null);

  // ── Datos base para asociaciones (se traen una sola vez) ────────────────
  const [base, setBase] = useState({ asoc: [], margenes: {} });
  const [baseLista, setBaseLista] = useState(false);

  // ── Artículos asociados (de perfil y de vidrio, juntos) ─────────────────
  // Cada slot: { key, origen, slot, art, cod, precio, cant, codform, directo,
  //              margen, margenBD, resultadoBase, resultado, parciales, error }
  const [asociados, setAsociados] = useState([]);
  const [sinAsociaciones, setSinAsociaciones] = useState({
    perfil: false,
    vidrio: false,
  });
  const [cargandoAsoc, setCargandoAsoc] = useState(false);
  const [calculando, setCalculando] = useState(false);
  const [errorCalc, setErrorCalc] = useState("");
  const [parcialesExpandidos, setParcialesExpandidos] = useState({});
  const [agregado, setAgregado] = useState(false);

  const [form, setForm] = useState({ cantidad: 1, ancho: 80, alto: 200 });

  const reqRef = useRef({ perfil: 0, vidrio: 0 });
  const calcRef = useRef(0);

  // ── Cargar catálogo (sin filtrar) ───────────────────────────────────────
  useEffect(() => {
    api("/productos")
      .then((r) => r.json())
      .then((data) => {
        if (!Array.isArray(data)) {
          setErrorCat("Respuesta inesperada del servidor.");
          return;
        }
        setCatalogo(
          data.map((a) => ({ ...a, codart: a.codart ?? a.codartint ?? "" })),
        );
      })
      .catch(() => setErrorCat("No se pudo cargar el catálogo."))
      .finally(() => setCargandoCat(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Cargar asociaciones + tabla MARGEN (una vez) ────────────────────────
  useEffect(() => {
    Promise.all([
      api("/asociaciones")
        .then((r) => r.json())
        .catch(() => []),
      api("/margen")
        .then((r) => r.json())
        .catch(() => []),
    ]).then(([dataAsoc, dataMargen]) => {
      const margenes = {};
      if (Array.isArray(dataMargen)) {
        dataMargen.forEach((m) => {
          const key = (m.CODART ?? m.codart ?? "").toLowerCase().trim();
          if (key) margenes[key] = aNumero(m.MARGEN ?? m.margen) || 1;
        });
      }
      setBase({ asoc: Array.isArray(dataAsoc) ? dataAsoc : [], margenes });
      setBaseLista(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Listas de perfiles y vidrios ────────────────────────────────────────
  const filtrarPor = (token) => {
    const porRubro = catalogo.filter((a) =>
      norm(`${a.rubro ?? ""} ${a.familia ?? ""}`).includes(token),
    );
    const lista = porRubro.length
      ? porRubro
      : catalogo.filter((a) => norm(a.articulo).includes(token));
    const final = lista.length ? lista : catalogo;
    return [...final].sort((a, b) =>
      (a.articulo ?? "").localeCompare(b.articulo ?? ""),
    );
  };
  const perfiles = useMemo(() => filtrarPor(TOKEN_PERFIL), [catalogo]);
  const vidrios = useMemo(() => filtrarPor(TOKEN_VIDRIO), [catalogo]);
  // eslint-disable-next-line react-hooks/exhaustive-deps

  const idDe = (a) => String(a.id ?? a.codart);

  // ── Armar los slots asociados de un artículo (perfil o vidrio) ──────────
  const armarSlots = async (origen, articulo) => {
    const reqId = ++reqRef.current[origen];
    const sacarOrigen = (prev) => prev.filter((s) => s.origen !== origen);

    if (!articulo?.codart) {
      setAsociados((prev) => sacarOrigen(prev));
      setSinAsociaciones((p) => ({ ...p, [origen]: false }));
      return;
    }

    setCargandoAsoc(true);
    try {
      const codartLower = articulo.codart.toLowerCase().trim();
      const artLower = (articulo.articulo ?? "").toLowerCase().trim();
      const fila = base.asoc.find(
        (a) =>
          (a.codart ?? "").toLowerCase().trim() === codartLower ||
          (a.articulo ?? "").toLowerCase().trim() === artLower,
      );

      if (!fila) {
        if (reqId !== reqRef.current[origen]) return;
        setAsociados((prev) => sacarOrigen(prev));
        setSinAsociaciones((p) => ({ ...p, [origen]: true }));
        return;
      }

      const slotsCrudos = [];
      for (let n = 1; n <= 10; n++) {
        const art = fila[`art${n}`];
        const cod = fila[`cod${n}`];
        const codform = fila[`form${n}`] ?? null;
        if (!art && !cod) continue;
        slotsCrudos.push({ n, art, cod, codform });
      }

      // Precio real de cada hijo desde `articulos` (se usa en los directos)
      const datosPorSlot = {};
      await Promise.all(
        slotsCrudos
          .filter((s) => s.cod)
          .map((s) =>
            api(`/articulos/${encodeURIComponent(s.cod)}`)
              .then((r) => (r.ok ? r.json() : null))
              .then((data) => {
                if (data) datosPorSlot[s.n] = data;
              })
              .catch(() => {}),
          ),
      );

      const slots = slotsCrudos.map(({ n, art, cod, codform }) => {
        const datos = datosPorSlot[n];
        const precioAsoc = codform ? 0 : parseFloat(datos?.precio) || 0;
        const cantSlot = aNumero(fila[`cant${n}`]) || 1;
        const margenTabla = base.margenes[(cod ?? "").toLowerCase().trim()];
        const margenAsoc = aNumero(fila[`margen${n}`]) || null;
        const margen = margenTabla ?? margenAsoc ?? 1;
        return {
          key: `${origen}_${n}`,
          origen,
          slot: n,
          art: art ?? cod,
          cod,
          precio: precioAsoc,
          cant: cantSlot,
          codform: codform || null,
          directo: !codform,
          margen,
          margenBD: margen,
          resultadoBase: 0,
          resultado: 0,
          parciales: {},
          error:
            codform || precioAsoc > 0 ? "" : "Sin fórmula ni precio en Artículos",
        };
      });

      if (reqId !== reqRef.current[origen]) return;
      setAsociados((prev) =>
        [...sacarOrigen(prev), ...slots].sort(
          (a, b) =>
            ORDEN_ORIGEN[a.origen] - ORDEN_ORIGEN[b.origen] || a.slot - b.slot,
        ),
      );
      setSinAsociaciones((p) => ({ ...p, [origen]: false }));
    } catch {
      /* se ignora: queda sin asociados */
    } finally {
      if (reqId === reqRef.current[origen]) setCargandoAsoc(false);
    }
  };

  useEffect(() => {
    if (!baseLista) return;
    armarSlots("perfil", perfil);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perfil?.codart, baseLista]);

  useEffect(() => {
    if (!baseLista) return;
    armarSlots("vidrio", vidrio);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vidrio?.codart, baseLista]);

  // Precios de referencia de los dos artículos base (disponibles en fórmulas)
  const precioDe = (a) => aNumero(a?.precio_un) || aNumero(a?.precio) || 0;
  const precioPerfil = precioDe(perfil);
  const precioVidrio = precioDe(vidrio);

  // ── Calcular: fórmulas vía backend + directos locales ───────────────────
  const calcular = async () => {
    const slots = asociados;
    const conFormula = slots.filter((a) => a.codform);
    const directos = slots.filter((a) => !a.codform && (a.art || a.cod));
    if (conFormula.length === 0 && directos.length === 0) return;

    const calcId = ++calcRef.current;
    setErrorCalc("");
    setCalculando(true);

    try {
      let nuevos = slots.map((a) => ({ ...a }));

      // Directos: precio × cantidad del slot × cantidad total
      nuevos = nuevos.map((a) => {
        if (a.codform || !(a.art || a.cod)) return a;
        const cantSlot = aNumero(a.cant) || 1;
        const cantTotal = Number(form.cantidad) || 1;
        const baseVal = (Number(a.precio) || 0) * cantSlot * cantTotal;
        const mg = aNumero(a.margen) || 1;
        return {
          ...a,
          directo: true,
          resultadoBase: baseVal,
          resultado: Math.round(baseVal * mg),
          parciales: {},
          error: baseVal > 0 ? "" : "Sin fórmula ni precio",
        };
      });

      if (conFormula.length > 0) {
        const resFormulas = await api("/formulas")
          .then((r) => r.json())
          .catch(() => []);
        const formulasTexto = {};
        if (Array.isArray(resFormulas))
          resFormulas.forEach((f) => {
            formulasTexto[f.codform] = f.formula ?? "";
          });

        const getDeps = (cf) =>
          (formulasTexto[cf] ?? "")
            .match(/FORM_([A-Z0-9]+)/g)
            ?.map((m) => m.replace("FORM_", "")) ?? [];

        // Orden topológico por dependencias FORM_XXX
        const codformsList = [...new Set(conFormula.map((a) => a.codform))];
        const ordenados = [];
        const visitados = new Set();
        const visitar = (cf) => {
          if (visitados.has(cf)) return;
          visitados.add(cf);
          getDeps(cf).forEach((dep) => {
            if (codformsList.includes(dep)) visitar(dep);
          });
          ordenados.push(cf);
        };
        codformsList.forEach((cf) => visitar(cf));

        const resultadosMap = {};

        for (const codform of ordenados) {
          const idxs = nuevos.reduce((acc, a, i) => {
            if (a.codform === codform) acc.push(i);
            return acc;
          }, []);

          for (const idx of idxs) {
            const asoc = nuevos[idx];
            const variables = {
              ancho: Number(form.ancho),
              alto: Number(form.alto),
              cantidad: Number(form.cantidad),
              precio: asoc.precio,
              precio_perfil: precioPerfil,
              precio_vidrio: precioVidrio,
              ...Object.fromEntries(
                Object.entries(resultadosMap).map(([cf, v]) => [
                  `FORM_${cf}`,
                  v,
                ]),
              ),
            };

            const res = await api("/formulas/calcular", {
              method: "POST",
              body: JSON.stringify({
                codform,
                codart_modelo: asoc.cod,
                variables,
              }),
            })
              .then((r) => r.json())
              .catch((err) => ({ error: err.message }));

            if (res.error) {
              nuevos[idx] = {
                ...asoc,
                resultadoBase: 0,
                resultado: 0,
                parciales: {},
                error: res.error,
              };
            } else {
              const baseVal = res.resultado ?? 0;
              const mg = aNumero(asoc.margen) || 1;
              resultadosMap[codform] = baseVal;
              nuevos[idx] = {
                ...asoc,
                resultadoBase: baseVal,
                resultado: Math.round(baseVal * mg),
                parciales: res.parciales ?? {},
                error: "",
              };
            }
          }
        }
      }

      // Si mientras tanto se lanzó otro cálculo, este resultado ya es viejo
      if (calcId !== calcRef.current) return;

      // Se conserva el margen que tenga el slot AHORA (por si se editó
      // mientras calculaba) y se recalcula el resultado con ese margen.
      setAsociados((prev) =>
        prev.map((p) => {
          const n = nuevos.find((x) => x.key === p.key);
          if (!n) return p;
          const mg = aNumero(p.margen) || 1;
          return {
            ...n,
            margen: p.margen,
            margenBD: p.margenBD,
            resultado: Math.round(n.resultadoBase * mg),
          };
        }),
      );
    } catch (err) {
      setErrorCalc(err.message);
    } finally {
      if (calcId === calcRef.current) setCalculando(false);
    }
  };

  // Recalcular al cambiar medidas, cantidad o los slots (no el margen)
  const slotsKey = asociados
    .map((a) => `${a.key}:${a.cod ?? ""}:${a.codform ?? ""}:${a.precio}`)
    .join("|");
  useEffect(() => {
    if (asociados.length === 0) return;
    if (!asociados.some((a) => a.codform || a.directo)) return;
    calcular();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    slotsKey,
    form.ancho,
    form.alto,
    form.cantidad,
    precioPerfil,
    precioVidrio,
  ]);

  // Margen reactivo: resultado = resultadoBase × margen, sin fetch
  const margenesKey = asociados.map((a) => `${a.key}:${a.margen}`).join("|");
  useEffect(() => {
    if (asociados.length === 0) return;
    setAsociados((prev) =>
      prev.map((a) => {
        if (!a.resultadoBase) return a;
        const final = Math.round(a.resultadoBase * (aNumero(a.margen) || 1));
        return final !== a.resultado ? { ...a, resultado: final } : a;
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [margenesKey]);

  // ── Totales ─────────────────────────────────────────────────────────────
  const total = asociados.reduce((acc, a) => acc + (a.resultado ?? 0), 0);
  const cantidadNum = Number(form.cantidad) || 0;
  const puedeAgregar =
    !!perfil &&
    !!vidrio &&
    cantidadNum > 0 &&
    Number(form.ancho) > 0 &&
    Number(form.alto) > 0 &&
    total > 0 &&
    !calculando &&
    !cargandoAsoc;

  const toggleParcial = (k) =>
    setParcialesExpandidos((prev) => ({ ...prev, [k]: !prev[k] }));

  const handleAgregar = () => {
    if (!puedeAgregar) return;
    agregarAPresupuesto?.({
      id: `puerta-vidrio-${Date.now()}`,
      seccion: "Componentes",
      descripcion: `Puerta de vidrio ${form.ancho} x ${form.alto} cm`,
      nombreart: `Puerta de vidrio — ${perfil.articulo} / ${vidrio.articulo}`,
      cantidad: cantidadNum,
      // precio = unitario; subtotal = total real (el total ya incluye la cantidad)
      precio: Math.round((total / cantidadNum) * 100) / 100,
      subtotal: total,
      ancho: Number(form.ancho),
      alto: Number(form.alto),
      foto:
        [vidrio?.artfoto, perfil?.artfoto].find((f) => f && f !== "null") ??
        null,
      codart: perfil.codart ?? null,
    });
    setAgregado(true);
    setTimeout(() => setAgregado(false), 3000);
  };

  const parcialesJSX = (a, claseFila) =>
    Object.entries(a.parciales).map(([nombre, valor]) => (
      <div key={nombre} className={claseFila}>
        <span className="pv-mono pv-azul">{nombre}</span>
        <span className="pv-mono pv-bold">
          {typeof valor === "number"
            ? formatPeso(Math.round(valor))
            : String(valor)}
        </span>
      </div>
    ));

  const selectSlot = (etiqueta, lista, valor, onChange, origenSinAsoc) => (
    <div className="pv-field">
      <span className="pv-label">{etiqueta}</span>
      <select
        className="pv-input"
        value={valor ? idDe(valor) : ""}
        onChange={(e) => {
          const elegido = lista.find((a) => idDe(a) === e.target.value);
          onChange(elegido ?? null);
        }}
        disabled={cargandoCat || lista.length === 0}
        style={{ cursor: "pointer" }}
      >
        <option value="">
          {cargandoCat ? "Cargando catálogo…" : `— Seleccioná ${etiqueta.toLowerCase()} —`}
        </option>
        {lista.map((a) => (
          <option key={idDe(a)} value={idDe(a)}>
            {a.articulo}
            {a.codart ? ` (${a.codart})` : ""}
          </option>
        ))}
      </select>
      {origenSinAsoc && (
        <div className="pv-aviso">
          Este artículo no tiene artículos asociados cargados en Asociaciones.
        </div>
      )}
    </div>
  );

  return (
    <>
      <style>{`
        .pv-wrap { font-family: 'Space Mono', monospace; max-width: 640px; }
        .pv-head { display: flex; align-items: center; justify-content: space-between; background: #e8f0f7; border: 1px solid #c8dae8; border-radius: 3px; padding: 12px 18px; margin-bottom: 18px; }
        .pv-head-title { font-weight: 700; font-size: 14px; color: #0a3a5c; text-transform: uppercase; letter-spacing: .06em; }
        .pv-volver { padding: 5px 14px; background: #fff; border: 1px solid #b8cfe0; border-radius: 2px; font-family: 'Space Mono', monospace; font-size: 12px; cursor: pointer; color: #0a3a5c; }
        .pv-card { background: #f5f9fc; border: 1px solid #c8dae8; border-radius: 4px; padding: 20px 22px; }
        .pv-field { margin-bottom: 16px; }
        .pv-label { display: block; font-size: 10px; color: #6699bb; letter-spacing: .1em; text-transform: uppercase; margin-bottom: 5px; }
        .pv-input { width: 100%; font-family: 'Space Mono', monospace; font-size: 13px; border: 1px solid #b8cfe0; padding: 8px 12px; border-radius: 3px; box-sizing: border-box; background: #fff; color: #0a3a5c; outline: none; }
        .pv-input:focus { border-color: #2d7fc1; }
        .pv-row { display: flex; gap: 14px; flex-wrap: wrap; }
        .pv-row .pv-field { flex: 1 1 120px; }
        .pv-aviso { margin-top: 5px; font-size: 11px; color: #92400e; background: #fffbea; border: 1px solid #f0d99b; border-radius: 3px; padding: 4px 8px; }
        .pv-sec { margin: 6px 0 16px; border: 1.5px solid #d0dde8; border-radius: 8px; overflow: hidden; background: #fff; }
        .pv-sec-head { background: #0f2944; padding: 10px 16px; display: flex; align-items: center; justify-content: space-between; gap: 8px; }
        .pv-sec-title { font-size: 11px; font-weight: 700; letter-spacing: .14em; color: #a8c4d8; text-transform: uppercase; }
        .pv-sec-estado { font-size: 10px; color: #7ab2d4; font-style: italic; }
        .pv-empty { padding: 14px 16px; text-align: center; color: #9ab0c0; font-size: 12px; font-style: italic; }
        .pv-slot { display: grid; grid-template-columns: 1fr 110px 100px; gap: 8px; align-items: start; padding: 10px 14px; border-bottom: 1px solid #e8f0f7; font-size: 13px; }
        .pv-slot > * { min-width: 0; }
        .pv-slot:nth-child(even) { background: #f7fafd; }
        .pv-slot-nombre { color: #0f2944; font-weight: 600; overflow-wrap: anywhere; }
        .pv-slot-cod { color: #6a8aa0; font-size: 11px; }
        .pv-chip { margin-left: 6px; border-radius: 3px; padding: 1px 5px; font-size: 10px; font-weight: 700; }
        .pv-chip-form { background: #fef3c7; color: #92400e; }
        .pv-chip-dir { background: #eff4ff; color: #2563eb; }
        .pv-chip-err { background: #fdf0f0; color: #c0392b; font-weight: 400; }
        .pv-chip-origen { background: #e8f0f7; color: #0a3a5c; margin-left: 0; margin-right: 6px; }
        .pv-sub { font-size: 10px; color: #6a8aa0; margin-top: 2px; }
        .pv-error { font-size: 11px; color: #c0392b; font-style: italic; margin-top: 2px; }
        .pv-resultado { font-size: 15px; font-weight: 700; color: #2d7fc1; text-align: right; white-space: nowrap; }
        .pv-margen-lbl { font-size: 9px; font-weight: 700; color: #6a8aa0; text-transform: uppercase; letter-spacing: .06em; }
        .pv-margen-in { width: 60px; padding: 4px 6px; border: 1.5px solid #d0dde8; border-radius: 5px; font-family: monospace; font-size: 12px; color: #059669; font-weight: 700; outline: none; background: #fff; }
        .pv-margen-in.mod { background: #fffbea; border-color: #f59e0b; }
        .pv-restaurar { font-size: 10px; cursor: pointer; color: #856404; background: #fff3cd; border: 1px solid #ffc107; border-radius: 3px; padding: 1px 5px; }
        .pv-parcial { display: flex; justify-content: space-between; padding: 3px 0; border-bottom: 1px solid #d8ecf7; font-size: 11px; color: #2a4a60; }
        .pv-parciales { background: #eaf3fb; border-top: 1px solid #d8ecf7; padding: 6px 14px 8px 24px; }
        .pv-mono { font-family: monospace; }
        .pv-bold { font-weight: 600; }
        .pv-azul { color: #4a8ab5; }
        .pv-flecha { margin-right: 5px; color: #2d7fc1; font-size: 11px; }
        .pv-break { background: #f4f8fb; border-radius: 8px; overflow: hidden; margin-bottom: 18px; border: 1px solid #e0eaf2; }
        .pv-break-row { display: flex; justify-content: space-between; gap: 10px; padding: 11px 16px; font-size: 13px; color: #4a6a80; border-bottom: 1px solid #e0eaf2; }
        .pv-break-parcial { display: flex; justify-content: space-between; padding: 5px 16px 5px 28px; font-size: 12px; background: #eaf3fb; border-bottom: 1px solid #d8ecf7; color: #2a4a60; }
        .pv-total { display: flex; justify-content: space-between; align-items: center; padding: 14px 16px; background: #0f2944; color: #fff; }
        .pv-total-lbl { font-size: 13px; font-weight: 700; letter-spacing: .14em; }
        .pv-total-val { font-size: 22px; font-weight: 700; letter-spacing: .04em; }
        .pv-actions { display: flex; gap: 10px; justify-content: flex-end; flex-wrap: wrap; }
        .pv-btn-agregar { padding: 9px 26px; border: none; border-radius: 2px; font-family: 'Space Mono', monospace; font-size: 13px; font-weight: 700; letter-spacing: .04em; color: #fff; background: #16a34a; cursor: pointer; }
        .pv-btn-agregar:disabled { background: #c8dae8; cursor: default; }
        .pv-ok { margin-bottom: 10px; background: #eafaf3; border: 1px solid #2ec4b6; color: #0a5c47; border-radius: 3px; padding: 10px 16px; font-size: 12px; }
        .pv-err-calc { color: #dc2626; font-size: 12px; width: 100%; text-align: right; margin-bottom: 4px; }
        @media (max-width: 560px) { .pv-slot { grid-template-columns: 1fr; } .pv-resultado { text-align: left; } }
      `}</style>

      <div className="pv-wrap">
        <div className="pv-head">
          <span className="pv-head-title">🚪 Puerta de vidrio</span>
          <button className="pv-volver" onClick={onVolver}>
            ← Volver a familias
          </button>
        </div>

        <div className="pv-card">
          {errorCat && <div className="pv-aviso">{errorCat}</div>}

          {selectSlot(
            "Perfil",
            perfiles,
            perfil,
            setPerfil,
            !!perfil && sinAsociaciones.perfil,
          )}
          {selectSlot(
            "Vidrio",
            vidrios,
            vidrio,
            setVidrio,
            !!vidrio && sinAsociaciones.vidrio,
          )}

          <div className="pv-row">
            <div className="pv-field">
              <span className="pv-label">Cantidad</span>
              <input
                className="pv-input"
                type="number"
                min="1"
                value={form.cantidad}
                onChange={(e) =>
                  setForm({ ...form, cantidad: Number(e.target.value) })
                }
              />
            </div>
            <div className="pv-field">
              <span className="pv-label">Ancho (cm)</span>
              <input
                className="pv-input"
                type="number"
                min="0"
                value={form.ancho}
                onChange={(e) =>
                  setForm({ ...form, ancho: Number(e.target.value) })
                }
              />
            </div>
            <div className="pv-field">
              <span className="pv-label">Alto (cm)</span>
              <input
                className="pv-input"
                type="number"
                min="0"
                value={form.alto}
                onChange={(e) =>
                  setForm({ ...form, alto: Number(e.target.value) })
                }
              />
            </div>
          </div>

          {/* Artículos asociados: fórmulas, margen y parciales */}
          {(perfil || vidrio) && (
            <div className="pv-sec">
              <div className="pv-sec-head">
                <span className="pv-sec-title">🔗 Artículos asociados</span>
                {cargandoAsoc && (
                  <span className="pv-sec-estado">⏳ cargando...</span>
                )}
                {calculando && !cargandoAsoc && (
                  <span className="pv-sec-estado">⏳ calculando...</span>
                )}
              </div>

              {!cargandoAsoc && asociados.length === 0 && (
                <div className="pv-empty">
                  Sin artículos asociados para la selección
                </div>
              )}

              {asociados.map((a, i) => {
                const tieneParciales =
                  a.parciales && Object.keys(a.parciales).length > 0;
                const expandido = parcialesExpandidos[a.key];
                const mg = aNumero(a.margen) || 1;
                const modificado = String(a.margen) !== String(a.margenBD);
                return (
                  <div key={a.key}>
                    <div className="pv-slot">
                      <div
                        style={{ cursor: tieneParciales ? "pointer" : "default" }}
                        onClick={() => tieneParciales && toggleParcial(a.key)}
                      >
                        <div className="pv-slot-nombre">
                          {tieneParciales && (
                            <span className="pv-flecha">
                              {expandido ? "▾" : "▸"}
                            </span>
                          )}
                          <span className="pv-chip pv-chip-origen">
                            {ETIQUETA_ORIGEN[a.origen]}
                          </span>
                          {a.art}
                        </div>
                        <div className="pv-slot-cod pv-mono">
                          {a.cod}
                          {a.codform ? (
                            <span className="pv-chip pv-chip-form">
                              {a.codform}
                            </span>
                          ) : a.precio > 0 ? (
                            <span
                              className="pv-chip pv-chip-dir"
                              title="Sin fórmula: se calcula como precio × cantidad"
                            >
                              directo × {a.cant ?? 1}
                            </span>
                          ) : (
                            <span className="pv-chip pv-chip-err">
                              sin fórmula ni precio
                            </span>
                          )}
                        </div>
                        {a.precio > 0 && (
                          <div className="pv-sub">
                            Precio BD: {formatPeso(a.precio)}
                          </div>
                        )}
                        {a.resultadoBase > 0 && mg !== 1 && (
                          <div className="pv-sub pv-mono">
                            Base: {formatPeso(a.resultadoBase)} × {mg} ={" "}
                            <strong style={{ color: "#2d7fc1" }}>
                              {formatPeso(a.resultado)}
                            </strong>
                          </div>
                        )}
                        {a.error && a.error !== "Sin fórmula" && (
                          <div className="pv-error">⚠️ {a.error}</div>
                        )}
                      </div>

                      <div>
                        <span className="pv-margen-lbl">Margen %</span>
                        <div
                          style={{ display: "flex", alignItems: "center", gap: 4 }}
                        >
                          <input
                            className={`pv-margen-in${modificado ? " mod" : ""}`}
                            type="number"
                            min="0"
                            max="999"
                            step="0.1"
                            value={a.margen}
                            onChange={(e) =>
                              setAsociados((prev) =>
                                prev.map((x) =>
                                  x.key === a.key
                                    ? { ...x, margen: e.target.value }
                                    : x,
                                ),
                              )
                            }
                          />
                          {modificado && (
                            <span
                              className="pv-restaurar"
                              title={`Restaurar BD: ${a.margenBD}%`}
                              onClick={() =>
                                setAsociados((prev) =>
                                  prev.map((x) =>
                                    x.key === a.key
                                      ? { ...x, margen: x.margenBD }
                                      : x,
                                  ),
                                )
                              }
                            >
                              ↩ BD
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="pv-resultado">
                        {a.resultado > 0 ? formatPeso(a.resultado) : "—"}
                      </div>
                    </div>

                    {tieneParciales && expandido && (
                      <div className="pv-parciales">
                        {parcialesJSX(a, "pv-parcial")}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Desglose y total */}
          <div className="pv-break">
            {calculando && (
              <div
                className="pv-break-row"
                style={{ fontStyle: "italic", color: "#4a8ab5" }}
              >
                ⏳ Recalculando...
              </div>
            )}

            {asociados
              .filter((a) => a.resultado > 0)
              .map((a) => {
                const tieneParciales =
                  a.parciales && Object.keys(a.parciales).length > 0;
                const k = `bd_${a.key}`;
                const expandido = parcialesExpandidos[k];
                return (
                  <div key={a.key}>
                    <div
                      className="pv-break-row"
                      style={{ cursor: tieneParciales ? "pointer" : "default" }}
                      onClick={() => tieneParciales && toggleParcial(k)}
                    >
                      <span>
                        {tieneParciales && (
                          <span className="pv-flecha">
                            {expandido ? "▾" : "▸"}
                          </span>
                        )}
                        🔩 {a.art}
                        {a.codform && (
                          <span
                            className="pv-mono"
                            style={{
                              marginLeft: 6,
                              fontSize: 11,
                              color: "#92400e",
                            }}
                          >
                            ({a.codform})
                          </span>
                        )}
                      </span>
                      <span>{formatPeso(a.resultado)}</span>
                    </div>
                    {tieneParciales &&
                      expandido &&
                      parcialesJSX(a, "pv-break-parcial")}
                  </div>
                );
              })}

            {asociados
              .filter((a) => a.error)
              .map((a) => (
                <div
                  key={`err_${a.key}`}
                  className="pv-break-row"
                  style={{ color: "#c0392b" }}
                >
                  <span>⚠️ {a.art}</span>
                  <span style={{ fontSize: 11 }}>{a.error}</span>
                </div>
              ))}

            <div className="pv-total">
              <span className="pv-total-lbl">TOTAL</span>
              <span className="pv-total-val">{formatPeso(total)}</span>
            </div>
          </div>

          {agregado && (
            <div className="pv-ok">✓ Agregado al presupuesto.</div>
          )}

          <div className="pv-actions">
            {errorCalc && <p className="pv-err-calc">⚠️ {errorCalc}</p>}
            <button className="pv-volver" onClick={onVolver}>
              Cancelar
            </button>
            <button
              className="pv-btn-agregar"
              onClick={handleAgregar}
              disabled={!puedeAgregar}
            >
              ➕ Agregar al presupuesto
            </button>
          </div>
          {!puedeAgregar && (
            <div
              style={{
                marginTop: 8,
                textAlign: "right",
                fontSize: 10,
                color: "#c0392b",
              }}
            >
              * Elegí perfil y vidrio, y cargá cantidad, ancho y alto
            </div>
          )}
        </div>
      </div>
    </>
  );
}
