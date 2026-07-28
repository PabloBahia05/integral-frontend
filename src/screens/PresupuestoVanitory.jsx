import { useState, useEffect, useRef } from "react";

const API = "https://integral-backend-production.up.railway.app";

export default function PresupuestoVanitory({
  modelo: modeloRaw,
  onVolver,
  numeroPres,
  cliente,
  codcliente,
  revision,
  onGuardado,
  token,
}) {
  const authFetch = (url, options = {}) =>
    fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers ?? {}),
        Authorization: `Bearer ${token}`,
      },
    });

  const modelo = modeloRaw
    ? {
        ...modeloRaw,
        codart:
          modeloRaw.codartint ??
          modeloRaw.CODARTINT ??
          modeloRaw.codart ??
          modeloRaw.codtipvan ??
          null,
      }
    : null;
  const [presupuestoId, setPresupuestoId] = useState("");

  const [form, setForm] = useState({
    cliente: "",
    cantidad: 1,
    cajonesVerticales: 2,
    ancho: 60,
    alto: 50,
    profundo: 45,
    colocacion: 0,
    material: "",
    materialPrecio: 0,
    materialBlanco: "",
    materialBlancoPrecio: 0,
    bisagra: "",
    bisagraPrecio: 0,
    bisagraCantidad: 2,
    lateralDer: "COLOR",
    lateralIzq: "COLOR",
    base: "COLOR",
    techo: "COLOR",
    corredera: "",
    correderaPrecio: 0,
    correderaCantidad: 1,
    margen: 0,
  });

  const [result, setResult] = useState({ subtotal: 0 });
  const [calculando, setCalculando] = useState(false);
  const [errorCalc, setErrorCalc] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [guardadoOk, setGuardadoOk] = useState(false);
  const [colocacionBD, setColocacionBD] = useState(null); // { valor, porcentaje }
  const [colocacionModo, setColocacionModo] = useState("valor"); // "valor" | "porcentaje"
  const [colocacionValor, setColocacionValor] = useState(0);
  const [colocacionPct, setColocacionPct] = useState(0);
  const [margenBD, setMargenBD] = useState(null);

  // Listas de materiales (rubro MUEBLES, familia INSUMOS) y correderas (guias de HERRAJES)
  const [insumosMuebles, setInsumosMuebles] = useState([]);
  const [herrajes, setHerrajes] = useState([]);
  const [cargandoInsumos, setCargandoInsumos] = useState(false);

  // Slots de fórmulas asociadas al artículo (de asociaciones_form: codf1..codf10, form1..form10)
  // Cada slot resuelto: { codform, nombre, expresion, resultado }
  const [slotsFormulas, setSlotsFormulas] = useState([]);
  const [totalSlots, setTotalSlots] = useState(0);
  const [cargandoSlots, setCargandoSlots] = useState(false);

  // Cache de precios de BD extraídos de las expresiones (precio_XXXX → valor)
  const preciosBD = useRef({});
  // Estado para búsqueda de material
  const [materialSearch, setMaterialSearch] = useState("");
  const [materialDropdown, setMaterialDropdown] = useState(false);
  const materialRef = useRef(null);
  const [materialBlancoSearch, setMaterialBlancoSearch] = useState("");
  const [materialBlancoDropdown, setMaterialBlancoDropdown] = useState(false);
  const materialBlancoRef = useRef(null);
  const [bisagras, setBisagras] = useState([]);
  // Próximo número de presupuesto
  useEffect(() => {
    authFetch(`${API}/presupuestos-vanitory/proximo-numero`)
      .then((r) => r.json())
      .then((d) => {
        const n = d?.proximo ?? null;
        if (n != null) setPresupuestoId(String(n).padStart(4, "0"));
      })
      .catch(() => setPresupuestoId("0001"));
  }, []);

  // Cargar colocación desde BD cuando hay modelo con codart
  useEffect(() => {
    if (!modelo?.codart) return;
    authFetch(
      `${API}/colocacion/buscar?codart=${encodeURIComponent(modelo.codart)}`,
    )
      .then((r) => r.json())
      .then((d) => {
        const row = Array.isArray(d) ? d[0] : d;
        if (!row) {
          setColocacionBD(null);
          return;
        }
        const val = parseFloat(row.precio ?? row.PRECIO ?? NaN);
        const pct = parseFloat(row.porcentaje ?? row.PORCENTAJE ?? NaN);
        const bd = {
          valor: isNaN(val) ? null : val,
          porcentaje: isNaN(pct) ? null : pct,
        };
        setColocacionBD(bd);
        if (bd.valor !== null) {
          setColocacionModo("valor");
          setColocacionValor(bd.valor);
          setForm((prev) => ({ ...prev, colocacion: bd.valor }));
        } else if (bd.porcentaje !== null) {
          setColocacionModo("porcentaje");
          setColocacionPct(bd.porcentaje);
          setForm((prev) => ({ ...prev, colocacion: 0 }));
        }
      })
      .catch(() => setColocacionBD(null));
  }, [modelo?.codart]);

  // Cargar margen desde BD cuando hay modelo con codart
  useEffect(() => {
    if (!modelo?.codart) return;
    console.log("[Vanitory] Buscando margen para codart:", modelo.codart);

    const parseMargenRow = (row) => {
      if (!row) return null;
      // Primero buscar por CODART exacto, luego por ARTICULO (ambos están en la tabla margen)
      for (const k of Object.keys(row)) {
        if (/margen|margin/i.test(k)) {
          const v = parseFloat(row[k]);
          if (!isNaN(v)) return v;
        }
      }
      return null;
    };

    // Ruta correcta del backend: /margen/por-codart?codart=...
    authFetch(
      `${API}/margen/por-codart?codart=${encodeURIComponent(modelo.codart)}`,
    )
      .then((r) => r.json())
      .then(async (d) => {
        console.log("[Vanitory] Margen BD raw:", d);
        let row = Array.isArray(d) ? d[0] : d;

        if (!row) {
          setMargenBD(null);
          return;
        }
        const raw = parseMargenRow(row);
        console.log(
          "[Vanitory] Margen raw value:",
          raw,
          "| row keys:",
          Object.keys(row),
        );
        if (raw === null) {
          setMargenBD(null);
          return;
        }
        // BD guarda multiplicador: 1.30 = 30%, 1.50 = 50%
        // Si raw <= 10 es multiplicador; si > 10 ya es porcentaje directo
        const margen =
          raw > 10
            ? Math.round(raw * 100) / 100
            : Math.round((raw - 1) * 10000) / 100;
        console.log(
          "[Vanitory] Margen calculado:",
          margen,
          "% (raw BD:",
          raw,
          ")",
        );
        setMargenBD(margen);
        setForm((prev) => ({ ...prev, margen }));
      })
      .catch((err) => {
        console.error("[Vanitory] Error cargando margen:", err);
        setMargenBD(null);
      });
  }, [modelo?.codart]);
  // ── Cargar y evaluar fórmulas al elegir artículo o cambiar dimensiones ──────
  // Flujo: asociaciones_form → codf1..10 + form1..10 (expresiones crudas)
  //        formulas           → nombre/descripcion por cada codform
  //        detectar precio_XXXX en expresiones → buscar en /articulos/:codart
  //        evaluar cada expresion con variables del front + precios de BD
  useEffect(() => {
    if (!modelo?.codart) {
      setSlotsFormulas([]);
      setTotalSlots(0);
      return;
    }
    setCargandoSlots(true);

    const evalExpr = (expr, vars) => {
      if (!expr || !expr.trim()) return null;
      try {
        let e = expr;
        Object.entries(vars).forEach(([k, v]) => {
          e = e.replace(new RegExp(`\\b${k}\\b`, "gi"), v);
        });
        // eslint-disable-next-line no-new-func
        const r = new Function(`"use strict"; return (${e});`)();
        return isNaN(r) || !isFinite(r) ? 0 : Math.round(r * 100) / 100;
      } catch {
        return 0;
      }
    };

    // Variables resueltas por el formulario del front — NO buscar en BD
    const VARS_FORM = new Set([
      "material",
      "base",
      "mano_obra",
      "manoobra",
      "vidrio",
      "techo",
      "lateral",
      "bisagra",
    ]);

    // Extrae todos los codart que aparecen como precio_XXXX en una expresión
    // Excluye las variables que ya están resueltas por el form
    const extraerCodarts = (expr) => {
      if (!expr) return [];
      const matches = [...expr.matchAll(/precio_([A-Z0-9]+)/gi)];
      return matches
        .map((m) => m[1])
        .filter((cod) => !VARS_FORM.has(cod.toLowerCase()));
    };

    Promise.all([
      authFetch(
        `${API}/asociaciones-form?codart=${encodeURIComponent(modelo.codart)}`,
      )
        .then((r) => r.json())
        .catch(() => null),
      authFetch(`${API}/formulas`)
        .then((r) => r.json())
        .catch(() => []),
    ])
      .then(async ([asocData, allFormulas]) => {
        const todos = Array.isArray(asocData)
          ? asocData
          : asocData
            ? [asocData]
            : [];
        const row =
          todos.find(
            (a) =>
              (a.codartint ?? a.CODARTINT ?? a.codart ?? a.CODART ?? "")
                .toUpperCase() === (modelo.codart ?? "").toUpperCase(),
          ) ?? null;
        if (!row) {
          setSlotsFormulas([]);
          setTotalSlots(0);
          return;
        }

        const formulasMap = {};
        (Array.isArray(allFormulas) ? allFormulas : []).forEach((f) => {
          const cod = f.codform ?? f.CODFORM ?? "";
          if (cod) formulasMap[cod.toUpperCase()] = f;
        });

        // Armar slots sin evaluar todavía
        const slotsRaw = [];
        for (let i = 1; i <= 10; i++) {
          const codform = row[`codf${i}`] ?? row[`CODF${i}`] ?? null;
          const expresion = row[`form${i}`] ?? row[`FORM${i}`] ?? null;
          if (!codform && !expresion) continue;

          const fDef = codform ? formulasMap[codform.toUpperCase()] : null;
          const nombre = fDef
            ? (fDef.articulo ??
              fDef.ARTICULO ??
              fDef.nombre ??
              fDef.NOMBRE ??
              fDef.descripcion ??
              codform)
            : (codform ?? `Fórmula ${i}`);

          // Priorizar la expresión guardada en asociaciones_form (form{i}),
          // y usar la fórmula de la tabla formulas solo como fallback si
          // asociaciones_form no tiene expresión propia para ese slot.
          const exprFinal =
            expresion ||
            (fDef
              ? (fDef.formula ?? fDef.FORMULA ?? fDef.expresion ?? "")
              : "") ||
            "";
          slotsRaw.push({ codform, nombre, expresion: exprFinal, slot: i });
        }

        // Recolectar todos los codarts únicos usados como precio_XXXX en las expresiones
        const todasExpresiones = slotsRaw.map((s) => s.expresion).join(" ");
        const codartsBD = [...new Set(extraerCodarts(todasExpresiones))];

        // Buscar precio de cada codart en la tabla articulos
        const nuevosPrecios = {};
        await Promise.all(
          codartsBD.map(async (cod) => {
            try {
              const res = await authFetch(
                `${API}/articulos/${encodeURIComponent(cod)}`,
              );
              const data = await res.json();
              const row = Array.isArray(data) ? data[0] : data;
              // Intentar todos los campos posibles de precio
              let precio = NaN;
              const camposPrecio = [
                "PRECIO1",
                "precio1",
                "PRECIO",
                "precio",
                "PREC1",
                "prec1",
                "P1",
                "p1",
                "COSTO",
                "costo",
                "VALOR",
                "valor",
              ];
              for (const campo of camposPrecio) {
                const v = parseFloat(row?.[campo]);
                if (!isNaN(v) && v > 0) {
                  precio = v;
                  break;
                }
              }
              // Si sigue sin encontrar, escanear TODAS las claves del objeto
              if (isNaN(precio) && row) {
                for (const k of Object.keys(row)) {
                  if (/prec|price|cost|valor/i.test(k)) {
                    const v = parseFloat(row[k]);
                    if (!isNaN(v) && v > 0) {
                      precio = v;
                      break;
                    }
                  }
                }
              }
              if (!isNaN(precio)) nuevosPrecios[`precio_${cod}`] = precio;
            } catch (e) {
              /* artículo no encontrado, se ignora */
            }
          }),
        );
        // Guardar en ref para re-evaluaciones posteriores (cambio de dimensiones)
        preciosBD.current = { ...preciosBD.current, ...nuevosPrecios };

        const vars = {
          ancho: Number(form.ancho),
          alto: Number(form.alto),
          profundo: Number(form.profundo),
          profundidad: Number(form.profundo),
          cantidad: Number(form.cantidad),
          colocacion: Number(form.colocacion),
          precio_material: Number(form.materialPrecio) || 0,
          precio_lateral_der:
            form.lateralDer === "COLOR"
              ? Number(form.materialPrecio) || 0
              : form.lateralDer === "BLANCO"
                ? Number(form.materialBlancoPrecio) || 0
                : 0,
          precio_lateral_izq:
            form.lateralIzq === "COLOR"
              ? Number(form.materialPrecio) || 0
              : form.lateralIzq === "BLANCO"
                ? Number(form.materialBlancoPrecio) || 0
                : 0,
          precio_base:
            form.base === "COLOR"
              ? Number(form.materialPrecio) || 0
              : form.base === "BLANCO"
                ? Number(form.materialBlancoPrecio) || 0
                : 0,
          precio_techo:
            form.techo === "COLOR"
              ? Number(form.materialPrecio) || 0
              : form.techo === "BLANCO"
                ? Number(form.materialBlancoPrecio) || 0
                : 0,
          precio_bisagra: Number(form.bisagraPrecio) || 0,
          cant_bisagras: Number(form.bisagraCantidad) || 0,
          cant_cajones_verticales: Number(form.cajonesVerticales) || 0,
          lateral_der: form.lateralDer,
          lateral_izq: form.lateralIzq,
          base_color: form.base,
          ...preciosBD.current, // ← precios de BD inyectados
        };

        const slots = slotsRaw.map((s) => ({
          ...s,
          resultado: evalExpr(s.expresion, vars),
        }));
        const suma = slots.reduce((a, s) => a + (s.resultado ?? 0), 0);
        setSlotsFormulas(slots);
        setTotalSlots(Math.round(suma * 100) / 100);
      })
      .finally(() => setCargandoSlots(false));

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelo?.codart]);

  // Re-evaluar cuando cambian las dimensiones/vars del front (sin volver a fetchear)
  useEffect(() => {
    if (!slotsFormulas.length || cargandoInsumos) return;

    const vars = {
      ancho: Number(form.ancho),
      alto: Number(form.alto),
      profundo: Number(form.profundo),
      profundidad: Number(form.profundo),
      cantidad: Number(form.cantidad),
      colocacion: Number(form.colocacion),
      precio_material: Number(form.materialPrecio) || 0,
      precio_lateral_der:
        form.lateralDer === "COLOR"
          ? Number(form.materialPrecio) || 0
          : form.lateralDer === "BLANCO"
            ? Number(form.materialBlancoPrecio) || 0
            : 0,
      precio_lateral_izq:
        form.lateralIzq === "COLOR"
          ? Number(form.materialPrecio) || 0
          : form.lateralIzq === "BLANCO"
            ? Number(form.materialBlancoPrecio) || 0
            : 0,
      precio_base:
        form.base === "COLOR"
          ? Number(form.materialPrecio) || 0
          : form.base === "BLANCO"
            ? Number(form.materialBlancoPrecio) || 0
            : 0,
      precio_techo:
        form.techo === "COLOR"
          ? Number(form.materialPrecio) || 0
          : form.techo === "BLANCO"
            ? Number(form.materialBlancoPrecio) || 0
            : 0,
      ...preciosBD.current, // ← precios de BD ya cargados, sin refetchear
    };

    const evalExpr = (expr) => {
      if (!expr || !expr.trim()) return null;
      try {
        let e = expr;
        Object.entries(vars).forEach(([k, v]) => {
          e = e.replace(new RegExp(`\\b${k}\\b`, "gi"), v);
        });
        // eslint-disable-next-line no-new-func
        const r = new Function(`"use strict"; return (${e});`)();
        return isNaN(r) || !isFinite(r) ? 0 : Math.round(r * 100) / 100;
      } catch {
        return 0;
      }
    };

    const actualizados = slotsFormulas.map((s) => ({
      ...s,
      resultado: evalExpr(s.expresion),
    }));
    const suma = actualizados.reduce((a, s) => a + (s.resultado ?? 0), 0);
    setSlotsFormulas(actualizados);
    setTotalSlots(Math.round(suma * 100) / 100);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    slotsFormulas.length,
    form.ancho,
    form.alto,
    form.profundo,
    form.cantidad,
    form.colocacion,
    form.materialPrecio,
    form.materialBlancoPrecio,
    form.lateralDer,
    form.lateralIzq,
    form.base,
    form.techo,
    cargandoInsumos,
  ]);

  useEffect(() => {
    setCargandoInsumos(true);

    // Helper: la tabla articulos ya tiene columnas articulo, codartint y precio directamente
    const normalizar = (p) => ({
      ...p,
      articulo: p.articulo ?? p.ARTICULO ?? "",
      codart: p.codartint ?? p.CODARTINT ?? p.codart ?? "",
      codartint: p.codartint ?? p.CODARTINT ?? p.codart ?? "",
      precio: parseFloat(p.precio ?? p.PRECIO ?? 0) || 0,
      precio_un: parseFloat(p.precio_un ?? p.PRECIO_UN ?? p.precio ?? 0) || 0,
    });

    Promise.all([
      // Placas: articulo LIKE %PLACA% AND proveedor != DANIEL ROQUE SRL
      authFetch(`${API}/productos/placas-vanitory`)
        .then((r) => r.json())
        .then((data) => (Array.isArray(data) ? data : []).map(normalizar))
        .catch(() => []),
      // Guías: articulo LIKE %GUIAS TELESCOPICAS%
      authFetch(`${API}/productos/bisagras-vanitory`)
        .then((r) => r.json())
        .then((d) => (Array.isArray(d) ? d : []))
        .catch(() => []),
      authFetch(`${API}/productos/guias-vanitory`)
        .then((r) => r.json())
        .then((data) => (Array.isArray(data) ? data : []).map(normalizar))
        .catch(() => []),
    ])
      .then(([mats, bis, her]) => {
        setInsumosMuebles(mats);
        setBisagras(bis);
        setHerrajes(her);
        // Precargar material blanco con PMDFBL18
        const blanco = mats.find(
          (p) => (p.codart ?? p.codartint ?? "").toUpperCase() === "PMDFBL18",
        );
        if (blanco) {
          setForm((prev) => ({
            ...prev,
            materialBlanco: blanco.articulo,
            materialBlancoPrecio:
              parseFloat(blanco.precio_un ?? blanco.precio) || 0,
          }));
        }
        // Precargar material color con PMDFCL18
        const color = mats.find(
          (p) => (p.codart ?? p.codartint ?? "").toUpperCase() === "PLMDF18CL",
        );
        if (color) {
          setForm((prev) => ({
            ...prev,
            material: color.articulo,
            materialPrecio: parseFloat(color.precio_un ?? color.precio) || 0,
          }));
        }
        console.log("[Vanitory] Placas:", mats.length, "| Guías:", her.length);
        if (mats.length > 0) console.log("[Vanitory] Ejemplo placa:", mats[0]);
      })
      .finally(() => setCargandoInsumos(false));
  }, []);

  // Calcular
  const calcular = async () => {
    if (!modelo?.codart && !modelo?.custom) return;
    if (modelo?.codart === "") return;
    if (modelo?.custom) {
      setResult({ subtotal: 0 });
      return;
    }
    setErrorCalc("");
    setCalculando(true);

    const { ancho, alto, profundo, cantidad, colocacion, materialPrecio } =
      form;
    const variables = {
      ancho,
      alto,
      profundo,
      profundidad: profundo,
      cantidad,
      colocacion,
      cant_cajones_verticales: Number(form.cajonesVerticales) || 0,
      precio_material: Number(materialPrecio) || 0,
      precio_base: modelo?.PRECIO_BASE ? parseFloat(modelo.PRECIO_BASE) : 0,
    };
    // La fórmula del modelo puede referenciar el resultado de otra fórmula
    // asociada (ej. FORM_FCAJVANA) — se las pasamos como variables ya evaluadas
    // en el front (slotsFormulas), para que el backend pueda resolverlas.
    slotsFormulas.forEach((s) => {
      if (s.codform) {
        variables[`FORM_${s.codform.toUpperCase()}`] = s.resultado ?? 0;
      }
    });

    try {
      const res = await authFetch(`${API}/formulas/calcular`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codart_modelo: modelo.codart, variables }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult({ subtotal: data.resultado });
    } catch (err) {
      setErrorCalc(err.message);
    } finally {
      setCalculando(false);
    }
  };

  // Auto-calcular cuando cambian inputs (incluye slotsFormulas: la fórmula del
  // modelo puede depender del resultado de otras fórmulas asociadas, así que
  // hay que recalcular en cuanto terminan de resolverse — no solo al montar)
  useEffect(() => {
    if (!modelo?.codart) return;
    calcular();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    modelo?.codart,
    form.ancho,
    form.alto,
    form.profundo,
    form.cantidad,
    form.colocacion,
    form.materialPrecio,
    slotsFormulas,
  ]);

  // Totales
  const totalMaterial = Number(form.materialPrecio) || 0;
  const totalCorredera =
    (Number(form.correderaPrecio) || 0) * (Number(form.correderaCantidad) || 1);
  const totalBisagra =
    (Number(form.bisagraPrecio) || 0) * (Number(form.bisagraCantidad) || 0);
  // El margen se aplica a TODOS los ítems (fórmulas + material + correderas + bisagras) ANTES de la colocación
  const baseMargen =
    result.subtotal +
    totalSlots +
    totalMaterial +
    totalCorredera +
    totalBisagra;
  const totalMargen = (baseMargen * (Number(form.margen) || 0)) / 100;
  const subtotal = baseMargen + totalMargen;
  const totalColocacion =
    colocacionModo === "porcentaje"
      ? (subtotal * (Number(colocacionPct) || 0)) / 100
      : Number(colocacionValor) || 0;
  const total = subtotal + totalColocacion;

  const formatPeso = (n) =>
    "$" + Number(n).toLocaleString("es-AR").replace(/,/g, ".");

  // Guardar
  const handleGuardar = async () => {
    setGuardando(true);
    setErrorCalc("");
    setGuardadoOk(false);

    const payload = {
      numeropres: numeroPres ?? null,
      codcliente: codcliente ?? null,
      fecha: (() => {
        const d = new Date();
        const p = (n) => String(n).padStart(2, "0");
        return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
      })(),
      cantidad: Number(form.cantidad),
      vmodelo: modelo?.nombre ?? "Personalizado",
      vancho: Number(form.ancho),
      valto: Number(form.alto),
      vprofundidad: Number(form.profundo),
      vmaterial_cl: form.material || null,
      vmaterial_bl: form.materialBlanco || null,
      vcorrederas: Number(form.correderaPrecio) || 0,
      vbisagra: form.corredera || null,
      vlatder: Number(form.colocacion) || 0,
      vlatizq: 1,
      vbase: 0,
      vprecio: Number(total),
      vrevision: 0,
      // vtabla: se completa con el id asignado por BD al guardar (ver onGuardado)
    };

    try {
      const res = await authFetch(`${API}/presupuestos-vanitory`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al guardar");

      setGuardadoOk(true);
      // Devolver al padre el payload completo + id asignado + vtabla para vinculación
      const vtablaId = data.id ?? data.ID ?? null;
      const presv =
        data.presv ??
        (vtablaId != null ? `V${String(vtablaId).padStart(5, "0")}` : null);
      if (onGuardado)
        onGuardado({ ...payload, id: vtablaId, vtabla: vtablaId, presv });
      authFetch(`${API}/presupuestos-vanitory/proximo-numero`)
        .then((r) => r.json())
        .then((d) => {
          const n = d?.proximo ?? null;
          if (n != null) setPresupuestoId(String(n).padStart(4, "0"));
        })
        .catch(() => {});
      setTimeout(() => setGuardadoOk(false), 3000);
    } catch (err) {
      setErrorCalc(err.message);
    } finally {
      setGuardando(false);
    }
  };

  const handlePDF = () => {
    const fecha = new Date().toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
    const nro = presupuestoId ? presupuestoId.padStart(4, "0") : "----";

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <title>Presupuesto Vanitory N° ${nro}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700&family=Source+Sans+3:wght@300;400;600;700&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Source Sans 3', Arial, sans-serif; background: #fff; color: #1a2a3a; font-size: 13px; }
    .page { width: 794px; min-height: 1123px; margin: 0 auto; display: flex; flex-direction: column; }
    .header { background: #0f2944; color: #fff; padding: 32px 48px 28px; display: flex; justify-content: space-between; align-items: flex-start; }
    .company-name { font-family: 'Rajdhani', sans-serif; font-size: 28px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
    .header-right { text-align: right; }
    .doc-title { font-family: 'Rajdhani', sans-serif; font-size: 24px; font-weight: 700; color: #60b4f0; text-transform: uppercase; letter-spacing: 0.1em; }
    .doc-nro { font-family: 'Rajdhani', sans-serif; font-size: 40px; font-weight: 700; color: #fff; }
    .doc-fecha { font-size: 11px; color: #7ab2d4; margin-top: 6px; }
    .accent-bar { height: 4px; background: linear-gradient(90deg, #2d7fc1, #60b4f0, #2d7fc1); }
    .body { padding: 36px 48px; flex: 1; }
    .info-box { border: 1px solid #d0dde8; border-radius: 6px; padding: 16px 20px; margin-bottom: 24px; }
    .info-box-title { font-family: 'Rajdhani', sans-serif; font-size: 10px; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase; color: #2d7fc1; margin-bottom: 10px; border-bottom: 1px solid #e8f0f7; padding-bottom: 6px; }
    .info-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; }
    .info-label { color: #6a8aa0; }
    .info-value { font-weight: 600; color: #0f2944; }
    .totals-wrap { display: flex; justify-content: flex-end; margin-top: 24px; }
    .totals-box { width: 280px; }
    .totals-row { display: flex; justify-content: space-between; padding: 8px 14px; font-size: 13px; border-bottom: 1px solid #e8f0f7; }
    .totals-total { display: flex; justify-content: space-between; padding: 13px 16px; background: #0f2944; border-radius: 4px; margin-top: 4px; }
    .totals-total .t-label { color: #a8c4d8; font-family: 'Rajdhani', sans-serif; font-size: 13px; font-weight: 700; letter-spacing: 0.14em; }
    .totals-total .t-value { color: #fff; font-family: 'Rajdhani', sans-serif; font-size: 20px; font-weight: 700; }
    .footer { background: #f0f6fb; border-top: 2px solid #d0dde8; padding: 20px 48px; display: flex; justify-content: space-between; align-items: center; margin-top: auto; }
    .footer-brand { font-family: 'Rajdhani', sans-serif; font-size: 14px; font-weight: 700; color: #0f2944; }
  </style>
</head>
<body>
<div class="page">
  <div class="header">
    <div>
      <div class="company-name">🛁 Vanitorys & Muebles</div>
      <div style="font-size:11px; color:#7ab2d4; margin-top:6px;">Bahía Blanca, Buenos Aires · 291-000-0000</div>
    </div>
    <div class="header-right">
      <div class="doc-title">Presupuesto</div>
      <div class="doc-nro">N° ${nro}</div>
      <div class="doc-fecha">Fecha: ${fecha}</div>
    </div>
  </div>
  <div class="accent-bar"></div>
  <div class="body">
    <div class="info-box">
      <div class="info-box-title">Detalle del pedido</div>
      <div class="info-row"><span class="info-label">Cliente</span><span class="info-value">${form.cliente || "—"}</span></div>
      <div class="info-row"><span class="info-label">Modelo</span><span class="info-value">${modelo?.nombre ?? "Personalizado"}</span></div>
      <div class="info-row"><span class="info-label">Cantidad</span><span class="info-value">${form.cantidad} unidad(es)</span></div>
      <div class="info-row"><span class="info-label">Cajones verticales</span><span class="info-value">${form.cajonesVerticales}</span></div>
      <div class="info-row"><span class="info-label">Medidas</span><span class="info-value">${form.ancho} × ${form.alto} × ${form.profundo} cm</span></div>
      ${form.material ? `<div class="info-row"><span class="info-label">Material</span><span class="info-value">${form.material}</span></div>` : ""}
      ${form.corredera ? `<div class="info-row"><span class="info-label">Correderas</span><span class="info-value">${form.corredera} × ${form.correderaCantidad} u.</span></div>` : ""}
    </div>
    <div class="totals-wrap">
      <div class="totals-box">
        <div class="totals-row"><span style="color:#6a8aa0">Subtotal</span><span style="font-weight:600">${formatPeso(result.subtotal)}</span></div>
        ${totalSlots > 0 ? `<div class="totals-row"><span style="color:#6a8aa0">Fórmulas (${slotsFormulas.length} ítems)</span><span style="font-weight:600">${formatPeso(totalSlots)}</span></div>` : ""}
        ${totalColocacion > 0 ? `<div class="totals-row"><span style="color:#6a8aa0">Colocación${colocacionModo === "porcentaje" ? ` (${colocacionPct}%)` : ""}</span><span style="font-weight:600">${formatPeso(totalColocacion)}</span></div>` : ""}

        ${totalCorredera > 0 ? `<div class="totals-row"><span style="color:#6a8aa0">Correderas</span><span style="font-weight:600">${formatPeso(totalCorredera)}</span></div>` : ""}
        ${totalMargen > 0 ? `<div class="totals-row"><span style="color:#6a8aa0">Margen (${form.margen}%)</span><span style="font-weight:600">${formatPeso(totalMargen)}</span></div>` : ""}
        <div class="totals-total">
          <span class="t-label">TOTAL</span>
          <span class="t-value">${formatPeso(total)}</span>
        </div>
      </div>
    </div>
  </div>
  <div class="footer">
    <div><div class="footer-brand">Vanitorys & Muebles</div>Bahía Blanca, Buenos Aires · 291-000-0000</div>
    <div style="text-align:right;font-size:11px;color:#6a8aa0">Presupuesto N° ${nro}<br/>Emitido el ${fecha}</div>
  </div>
</div>
</body>
</html>`;

    const win = window.open("", "_blank");
    if (!win) {
      alert("Habilitá las ventanas emergentes para generar el PDF.");
      return;
    }
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 800);
  };

  // ─── UI ───────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700&family=Source+Sans+3:wght@300;400;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #e8f0f7; font-family: 'Source Sans 3', sans-serif; }
        .pv-layout { min-height: 100vh; background: #e8f0f7; }
        .pv-main { display: flex; align-items: flex-start; justify-content: center; padding: 40px 24px; gap: 24px; flex-wrap: wrap; }
        .pv-form-col { flex: 1; min-width: 320px; max-width: 560px; }
        .pv-card { background: #fff; border-radius: 10px; padding: 32px 36px; width: 100%; box-shadow: 0 2px 16px rgba(15,41,68,0.08); }
        .pv-back { background: none; border: none; cursor: pointer; color: #4a8ab5; font-size: 13px;
          font-family: 'Rajdhani', sans-serif; font-weight: 700; letter-spacing: 0.08em;
          margin-bottom: 20px; display: flex; align-items: center; gap: 6px; padding: 0; }
        .pv-back:hover { color: #0f2944; }
        .field { margin-bottom: 20px; }
        .label-text { display: block; font-family: 'Rajdhani', sans-serif; font-size: 11px; font-weight: 700;
          letter-spacing: 0.14em; color: #4a8ab5; margin-bottom: 6px; }
        .input { width: 100%; border: 1.5px solid #d0dde8; border-radius: 6px; padding: 10px 14px;
          font-size: 15px; color: #0f2944; outline: none; transition: border-color 0.15s;
          font-family: 'Source Sans 3', sans-serif; }
        .input:focus { border-color: #2d7fc1; }
        .row { display: flex; gap: 16px; }
        .row .field { flex: 1; }
        .presup-badge { display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 24px; padding-bottom: 18px; border-bottom: 1.5px solid #e0eaf2; }
        .presup-badge-title { font-family: 'Rajdhani', sans-serif; font-size: 18px; font-weight: 700;
          color: #0f2944; letter-spacing: 0.06em; text-transform: uppercase; }
        .presup-badge-num { font-family: 'Rajdhani', sans-serif; font-size: 22px; font-weight: 700;
          color: #2d7fc1; background: #eaf3fb; border: 1.5px solid #b8d6ef; border-radius: 6px;
          padding: 4px 16px; min-width: 100px; text-align: center; }
        .breakdown { background: #f4f8fb; border-radius: 8px; overflow: hidden; margin-bottom: 24px; }
        .breakdown-row { display: flex; justify-content: space-between; padding: 12px 16px;
          font-size: 14px; color: #4a6a80; border-bottom: 1px solid #e0eaf2; }
        .total-row { display: flex; justify-content: space-between; align-items: center;
          padding: 14px 16px; background: #0f2944; color: #fff; }
        .total-label { font-family: 'Rajdhani', sans-serif; font-size: 13px; font-weight: 700; letter-spacing: 0.14em; }
        .total-value { font-family: 'Rajdhani', sans-serif; font-size: 22px; font-weight: 700; }
        .actions { display: flex; gap: 10px; flex-wrap: wrap; justify-content: flex-end; }
        .btn { padding: 11px 20px; border-radius: 6px; border: none; cursor: pointer;
          font-family: 'Rajdhani', sans-serif; font-size: 14px; font-weight: 700;
          letter-spacing: 0.06em; display: flex; align-items: center; gap: 7px; transition: all 0.15s; }
        .btn-cancel { background: transparent; border: 1.5px solid #d0dde8; color: #4a6a80; }
        .btn-cancel:hover { border-color: #4a8ab5; color: #0f2944; }
        .btn-save { background: #16a34a; color: #fff; }
        .btn-save:hover { background: #15803d; }
        .btn-pdf { background: #dc2626; color: #fff; }
        .btn-pdf:hover { background: #b91c1c; }
        .btn-print { background: #7c3aed; color: #fff; }
        .btn-print:hover { background: #6d28d9; }
        /* Foto panel */
        .foto-panel { background: #fff; border-radius: 10px; box-shadow: 0 2px 16px rgba(15,41,68,0.08);
          padding: 24px; display: flex; flex-direction: column; align-items: center;
          min-width: 220px; max-width: 280px; align-self: flex-start; position: sticky; top: 40px; }
        .foto-panel-title { font-family: 'Rajdhani', sans-serif; font-size: 11px; font-weight: 700;
          letter-spacing: 0.14em; color: #4a8ab5; text-transform: uppercase; margin-bottom: 14px; align-self: flex-start; }
        .foto-panel-img { width: 100%; max-height: 220px; object-fit: contain; border-radius: 8px;
          border: 1px solid #e0eaf2; background: #f7fafd; }
        .foto-panel-empty { width: 100%; height: 180px; border: 2px dashed #d0dde8; border-radius: 8px;
          display: flex; flex-direction: column; align-items: center; justify-content: center; color: #b0c8d8; }
        .foto-info-row { display: flex; justify-content: space-between; padding: 6px 0;
          border-bottom: 1px solid #f0f4f8; font-size: 12px; width: 100%; }
        .foto-info-label { color: #6a8aa0; }
        .foto-info-value { font-weight: 600; color: #0f2944; }
        .asociado-empty { font-size: 12px; color: #8aabb8; font-style: italic; padding: 8px 0; }
      `}</style>

      <div className="pv-layout">
        <main className="pv-main">
          <div className="pv-form-col">
            <div className="pv-card">
              <button className="pv-back" onClick={onVolver}>
                ← Volver a modelos
              </button>

              {/* Header */}
              <div className="presup-badge">
                <span className="presup-badge-title">
                  🛁 Presupuesto Vanitory
                </span>
                <span className="presup-badge-num">
                  {presupuestoId ? `N° ${presupuestoId}` : "N° —"}
                </span>
              </div>

              {/* Material */}
              <div
                className="field"
                style={{ position: "relative" }}
                ref={materialRef}
              >
                <span className="label-text">
                  🪵 MATERIAL
                  {form.material && (
                    <span
                      style={{
                        marginLeft: 8,
                        fontSize: "10px",
                        color: "#2d7fc1",
                        fontWeight: 600,
                      }}
                    >
                      {formatPeso(totalMaterial)}
                    </span>
                  )}
                </span>
                {cargandoInsumos ? (
                  <div
                    style={{
                      fontSize: "12px",
                      color: "#4a8ab5",
                      fontStyle: "italic",
                      padding: "10px 0",
                    }}
                  >
                    ⏳ Cargando...
                  </div>
                ) : (
                  <>
                    <div
                      style={{ display: "flex", gap: 6, alignItems: "center" }}
                    >
                      <input
                        className="input"
                        style={{ flex: 1 }}
                        placeholder="Escribí para buscar material..."
                        value={
                          materialSearch !== "" || materialDropdown
                            ? materialSearch
                            : form.material
                        }
                        onFocus={() => {
                          setMaterialSearch("");
                          setMaterialDropdown(true);
                        }}
                        onChange={(e) => {
                          setMaterialSearch(e.target.value);
                          setMaterialDropdown(true);
                        }}
                        onBlur={() =>
                          setTimeout(() => setMaterialDropdown(false), 150)
                        }
                      />
                      {form.material && (
                        <button
                          type="button"
                          onClick={() => {
                            setForm((prev) => ({
                              ...prev,
                              material: "",
                              materialPrecio: 0,
                            }));
                            setMaterialSearch("");
                          }}
                          style={{
                            padding: "0 10px",
                            height: 38,
                            borderRadius: 4,
                            border: "1px solid #d0dde8",
                            background: "#f5f8fa",
                            color: "#c0392b",
                            cursor: "pointer",
                            fontSize: 14,
                            fontWeight: 700,
                          }}
                          title="Quitar material"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                    {materialDropdown && (
                      <div
                        style={{
                          position: "absolute",
                          zIndex: 999,
                          left: 0,
                          right: 0,
                          background: "#fff",
                          border: "1px solid #b8d6ef",
                          borderRadius: 6,
                          boxShadow: "0 4px 18px rgba(0,40,80,0.13)",
                          maxHeight: 220,
                          overflowY: "auto",
                          marginTop: 2,
                        }}
                      >
                        {/* Opción vaciar */}
                        <div
                          style={{
                            padding: "9px 14px",
                            fontSize: 12,
                            color: "#6a8aa0",
                            cursor: "pointer",
                            borderBottom: "1px solid #e8f0f7",
                          }}
                          onMouseDown={() => {
                            setForm((prev) => ({
                              ...prev,
                              material: "",
                              materialPrecio: 0,
                            }));
                            setMaterialSearch("");
                            setMaterialDropdown(false);
                          }}
                        >
                          — Sin material —
                        </div>
                        {insumosMuebles
                          .filter(
                            (p) =>
                              !materialSearch ||
                              (p.articulo ?? "")
                                .toLowerCase()
                                .includes(materialSearch.toLowerCase()) ||
                              (p.codart ?? "")
                                .toLowerCase()
                                .includes(materialSearch.toLowerCase()),
                          )
                          .slice(0, 60)
                          .map((p, i) => (
                            <div
                              key={p.id ?? p.codart ?? i}
                              style={{
                                padding: "9px 14px",
                                fontSize: 13,
                                cursor: "pointer",
                                background:
                                  form.material === p.articulo
                                    ? "#e8f4fb"
                                    : "transparent",
                                borderBottom: "1px solid #f0f5fa",
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                              }}
                              onMouseDown={() => {
                                const pu = parseFloat(
                                  p.precio_un ?? p.precio ?? 0,
                                );
                                setForm((prev) => ({
                                  ...prev,
                                  material: p.articulo,
                                  materialPrecio: pu,
                                }));
                                setMaterialSearch("");
                                setMaterialDropdown(false);
                              }}
                            >
                              <span>
                                {p.codart ? (
                                  <span
                                    style={{
                                      color: "#4a8ab5",
                                      fontFamily: "monospace",
                                      marginRight: 6,
                                    }}
                                  >
                                    [{p.codart}]
                                  </span>
                                ) : null}
                                {p.articulo}
                              </span>
                              {p.precio != null && (
                                <span
                                  style={{
                                    color: "#2d7fc1",
                                    fontWeight: 700,
                                    fontSize: 12,
                                    marginLeft: 8,
                                  }}
                                >
                                  $
                                  {parseFloat(p.precio).toLocaleString("es-AR")}
                                </span>
                              )}
                            </div>
                          ))}
                        {insumosMuebles.filter(
                          (p) =>
                            !materialSearch ||
                            (p.articulo ?? "")
                              .toLowerCase()
                              .includes(materialSearch.toLowerCase()) ||
                            (p.codart ?? "")
                              .toLowerCase()
                              .includes(materialSearch.toLowerCase()),
                        ).length === 0 && (
                          <div
                            style={{
                              padding: "12px 14px",
                              fontSize: 12,
                              color: "#b0c0d0",
                              fontStyle: "italic",
                            }}
                          >
                            Sin resultados
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Material BLANCO */}
              <div
                className="field"
                style={{ position: "relative" }}
                ref={materialBlancoRef}
              >
                <span className="label-text">
                  🪵 MATERIAL BLANCO
                  {form.materialBlanco && (
                    <span
                      style={{
                        marginLeft: 8,
                        fontSize: "10px",
                        color: "#2d7fc1",
                        fontWeight: 600,
                      }}
                    >
                      {formatPeso(form.materialBlancoPrecio)}
                    </span>
                  )}
                </span>
                {cargandoInsumos ? (
                  <div
                    style={{
                      fontSize: "12px",
                      color: "#4a8ab5",
                      fontStyle: "italic",
                      padding: "10px 0",
                    }}
                  >
                    ⏳ Cargando...
                  </div>
                ) : (
                  <>
                    <div
                      style={{ display: "flex", gap: 6, alignItems: "center" }}
                    >
                      <input
                        className="input"
                        style={{ flex: 1 }}
                        placeholder="Escribí para buscar material blanco..."
                        value={
                          materialBlancoSearch !== "" || materialBlancoDropdown
                            ? materialBlancoSearch
                            : form.materialBlanco
                        }
                        onFocus={() => {
                          setMaterialBlancoSearch("");
                          setMaterialBlancoDropdown(true);
                        }}
                        onChange={(e) => {
                          setMaterialBlancoSearch(e.target.value);
                          setMaterialBlancoDropdown(true);
                        }}
                        onBlur={() =>
                          setTimeout(
                            () => setMaterialBlancoDropdown(false),
                            150,
                          )
                        }
                      />
                      {form.materialBlanco && (
                        <button
                          type="button"
                          onClick={() => {
                            setForm((prev) => ({
                              ...prev,
                              materialBlanco: "",
                              materialBlancoPrecio: 0,
                            }));
                            setMaterialBlancoSearch("");
                          }}
                          style={{
                            padding: "0 10px",
                            height: 38,
                            borderRadius: 4,
                            border: "1px solid #d0dde8",
                            background: "#f5f8fa",
                            color: "#c0392b",
                            cursor: "pointer",
                            fontSize: 14,
                            fontWeight: 700,
                          }}
                          title="Quitar material blanco"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                    {materialBlancoDropdown && (
                      <div
                        style={{
                          position: "absolute",
                          zIndex: 999,
                          left: 0,
                          right: 0,
                          background: "#fff",
                          border: "1px solid #b8d6ef",
                          borderRadius: 6,
                          boxShadow: "0 4px 18px rgba(0,40,80,0.13)",
                          maxHeight: 220,
                          overflowY: "auto",
                          marginTop: 2,
                        }}
                      >
                        <div
                          style={{
                            padding: "9px 14px",
                            fontSize: 12,
                            color: "#6a8aa0",
                            cursor: "pointer",
                            borderBottom: "1px solid #e8f0f7",
                          }}
                          onMouseDown={() => {
                            setForm((prev) => ({
                              ...prev,
                              materialBlanco: "",
                              materialBlancoPrecio: 0,
                            }));
                            setMaterialBlancoSearch("");
                            setMaterialBlancoDropdown(false);
                          }}
                        >
                          — Sin material blanco —
                        </div>
                        {insumosMuebles
                          .filter(
                            (p) =>
                              !materialBlancoSearch ||
                              (p.articulo ?? "")
                                .toLowerCase()
                                .includes(materialBlancoSearch.toLowerCase()) ||
                              (p.codart ?? "")
                                .toLowerCase()
                                .includes(materialBlancoSearch.toLowerCase()),
                          )
                          .slice(0, 60)
                          .map((p, i) => (
                            <div
                              key={p.id ?? p.codart ?? i}
                              style={{
                                padding: "9px 14px",
                                fontSize: 13,
                                cursor: "pointer",
                                background:
                                  form.materialBlanco === p.articulo
                                    ? "#e8f4fb"
                                    : "transparent",
                                borderBottom: "1px solid #f0f5fa",
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                              }}
                              onMouseDown={() => {
                                const pu = parseFloat(
                                  p.precio_un ?? p.precio ?? 0,
                                );
                                setForm((prev) => ({
                                  ...prev,
                                  materialBlanco: p.articulo,
                                  materialBlancoPrecio: pu,
                                }));
                                setMaterialBlancoSearch("");
                                setMaterialBlancoDropdown(false);
                              }}
                            >
                              <span>
                                {p.codart ? (
                                  <span
                                    style={{
                                      color: "#4a8ab5",
                                      fontFamily: "monospace",
                                      marginRight: 6,
                                    }}
                                  >
                                    [{p.codart}]
                                  </span>
                                ) : null}
                                {p.articulo}
                              </span>
                              {p.precio != null && (
                                <span
                                  style={{
                                    color: "#2d7fc1",
                                    fontWeight: 700,
                                    fontSize: 12,
                                    marginLeft: 8,
                                  }}
                                >
                                  $
                                  {parseFloat(p.precio).toLocaleString("es-AR")}
                                </span>
                              )}
                            </div>
                          ))}
                        {insumosMuebles.filter(
                          (p) =>
                            !materialBlancoSearch ||
                            (p.articulo ?? "")
                              .toLowerCase()
                              .includes(materialBlancoSearch.toLowerCase()),
                        ).length === 0 && (
                          <div
                            style={{
                              padding: "12px 14px",
                              fontSize: 12,
                              color: "#b0c0d0",
                              fontStyle: "italic",
                            }}
                          >
                            Sin resultados
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Correderas */}
              <div className="field">
                <span className="label-text">
                  🔩 CORREDERAS
                  {form.corredera && (
                    <span
                      style={{
                        marginLeft: 8,
                        fontSize: "10px",
                        color: "#2d7fc1",
                        fontWeight: 600,
                      }}
                    >
                      {formatPeso(totalCorredera)}
                    </span>
                  )}
                </span>
                {cargandoInsumos ? (
                  <div
                    style={{
                      fontSize: "12px",
                      color: "#4a8ab5",
                      fontStyle: "italic",
                      padding: "10px 0",
                    }}
                  >
                    ⏳ Cargando...
                  </div>
                ) : (
                  <select
                    className="input"
                    style={{ cursor: "pointer" }}
                    value={form.corredera}
                    onChange={(e) => {
                      const sel = herrajes.find(
                        (p) => p.articulo === e.target.value,
                      );
                      setForm((prev) => ({
                        ...prev,
                        corredera: e.target.value,
                        correderaPrecio: sel ? parseFloat(sel.precio) || 0 : 0,
                      }));
                    }}
                  >
                    <option value="">— Sin correderas —</option>
                    {herrajes.map((p, i) => (
                      <option key={p.id ?? p.codart ?? i} value={p.articulo}>
                        {p.articulo}
                        {p.precio != null
                          ? ` — $${parseFloat(p.precio).toLocaleString("es-AR")}`
                          : ""}
                      </option>
                    ))}
                  </select>
                )}
                {form.corredera && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      marginTop: 8,
                    }}
                  >
                    <span className="label-text" style={{ margin: 0 }}>
                      CANTIDAD
                    </span>
                    <input
                      className="input"
                      type="number"
                      min="1"
                      style={{ width: 80, textAlign: "center" }}
                      value={form.correderaCantidad}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          correderaCantidad: Math.max(
                            1,
                            Number(e.target.value),
                          ),
                        }))
                      }
                    />
                    <span style={{ fontSize: "12px", color: "#6a8aa0" }}>
                      × {formatPeso(form.correderaPrecio)} c/u
                    </span>
                  </div>
                )}
              </div>

              {/* Bisagras */}
              <div className="field">
                <span className="label-text">
                  🔧 BISAGRAS
                  {totalBisagra > 0 && (
                    <span
                      style={{
                        marginLeft: 8,
                        fontSize: "10px",
                        color: "#2d7fc1",
                        fontWeight: 600,
                      }}
                    >
                      {formatPeso(totalBisagra)}
                    </span>
                  )}
                </span>
                {cargandoInsumos ? (
                  <div
                    style={{
                      fontSize: "12px",
                      color: "#4a8ab5",
                      fontStyle: "italic",
                      padding: "10px 0",
                    }}
                  >
                    ⏳ Cargando...
                  </div>
                ) : (
                  <select
                    className="input"
                    style={{ cursor: "pointer" }}
                    value={form.bisagra}
                    onChange={(e) => {
                      const sel = bisagras.find(
                        (p) => p.articulo === e.target.value,
                      );
                      setForm((prev) => ({
                        ...prev,
                        bisagra: e.target.value,
                        bisagraPrecio: sel ? parseFloat(sel.precio) || 0 : 0,
                      }));
                    }}
                  >
                    <option value="">— Sin bisagras —</option>
                    {bisagras.map((p, i) => (
                      <option key={p.id ?? p.codart ?? i} value={p.articulo}>
                        {p.articulo}
                        {p.precio != null
                          ? ` — ${parseFloat(p.precio).toLocaleString("es-AR")}`
                          : ""}
                      </option>
                    ))}
                  </select>
                )}
                {form.bisagra && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      marginTop: 8,
                    }}
                  >
                    <span className="label-text" style={{ margin: 0 }}>
                      CANTIDAD
                    </span>
                    <input
                      className="input"
                      type="number"
                      min="1"
                      style={{ width: 80, textAlign: "center" }}
                      value={form.bisagraCantidad}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          bisagraCantidad: Math.max(1, Number(e.target.value)),
                        }))
                      }
                    />
                    <span style={{ fontSize: "12px", color: "#6a8aa0" }}>
                      × {formatPeso(form.bisagraPrecio)} c/u
                    </span>
                  </div>
                )}
              </div>

              {/* Laterales y Base */}
              <div className="field">
                <span className="label-text">🎨 LATERALES Y BASE</span>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                    marginTop: 6,
                  }}
                >
                  {[
                    { label: "LATERAL DERECHO", key: "lateralDer" },
                    { label: "LATERAL IZQUIERDO", key: "lateralIzq" },
                    { label: "BASE", key: "base" },
                    { label: "TECHO", key: "techo" },
                  ].map(({ label, key }) => (
                    <div
                      key={key}
                      style={{ display: "flex", alignItems: "center", gap: 10 }}
                    >
                      <span
                        style={{
                          fontSize: "11px",
                          color: "#6a8aa0",
                          width: 140,
                          flexShrink: 0,
                        }}
                      >
                        {label}
                      </span>
                      <select
                        className="input"
                        style={{ cursor: "pointer", flex: 1 }}
                        value={form[key]}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            [key]: e.target.value,
                          }))
                        }
                      >
                        <option value="COLOR">COLOR</option>
                        <option value="BLANCO">BLANCO</option>
                        <option value="SIN">SIN</option>
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cantidad */}
              <div className="field">
                <span className="label-text">CANTIDAD</span>
                <input
                  className="input"
                  type="number"
                  min="1"
                  value={form.cantidad}
                  onChange={(e) =>
                    setForm({ ...form, cantidad: Number(e.target.value) })
                  }
                />
              </div>

              {/* Cajones verticales */}
              <div className="field">
                <span className="label-text">CANTIDAD DE CAJONES VERTICALES</span>
                <input
                  className="input"
                  type="number"
                  min="0"
                  value={form.cajonesVerticales}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      cajonesVerticales: Math.max(0, Number(e.target.value)),
                    }))
                  }
                />
              </div>

              {/* Dimensiones */}
              <div className="row">
                <div className="field">
                  <span className="label-text">ANCHO (CM)</span>
                  <input
                    className="input"
                    type="number"
                    value={form.ancho}
                    onChange={(e) =>
                      setForm({ ...form, ancho: Number(e.target.value) })
                    }
                  />
                </div>
                <div className="field">
                  <span className="label-text">ALTO (CM)</span>
                  <input
                    className="input"
                    type="number"
                    value={form.alto}
                    onChange={(e) =>
                      setForm({ ...form, alto: Number(e.target.value) })
                    }
                  />
                </div>
                <div className="field">
                  <span className="label-text">PROF. (CM)</span>
                  <input
                    className="input"
                    type="number"
                    value={form.profundo}
                    onChange={(e) =>
                      setForm({ ...form, profundo: Number(e.target.value) })
                    }
                  />
                </div>
              </div>

              {/* ── Fórmulas asociadas al artículo ── */}
              {modelo?.codart && (
                <div
                  style={{
                    background: "#f4f8fb",
                    borderRadius: 10,
                    padding: "14px 16px",
                    marginBottom: 20,
                    border: "1px solid #e0eaf2",
                  }}
                >
                  {/* Header */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      background: "#0f2944",
                      borderRadius: 7,
                      padding: "9px 14px",
                      marginBottom: 12,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "'Rajdhani',sans-serif",
                        fontWeight: 700,
                        fontSize: 13,
                        letterSpacing: "0.12em",
                        textTransform: "uppercase",
                        color: "#fff",
                      }}
                    >
                      🧮 Fórmulas asociadas
                    </span>
                    {cargandoSlots && (
                      <span
                        style={{
                          fontSize: "11px",
                          color: "#7ab2d4",
                          fontStyle: "italic",
                        }}
                      >
                        ⏳ Calculando...
                      </span>
                    )}
                    {!cargandoSlots && slotsFormulas.length > 0 && (
                      <span
                        style={{
                          fontFamily: "'Rajdhani',sans-serif",
                          fontSize: 11,
                          color: "#7ab2d4",
                          letterSpacing: "0.08em",
                        }}
                      >
                        {slotsFormulas.length} ítem
                        {slotsFormulas.length !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>

                  {/* Sin datos */}
                  {!cargandoSlots && slotsFormulas.length === 0 && (
                    <p
                      style={{
                        fontSize: "12px",
                        color: "#8aabb8",
                        fontStyle: "italic",
                        padding: "6px 2px",
                      }}
                    >
                      Sin fórmulas asociadas para este artículo.
                    </p>
                  )}

                  {/* Filas de slots */}
                  {slotsFormulas.map((slot, i) => (
                    <div
                      key={slot.slot ?? i}
                      style={{
                        background: "#fff",
                        borderRadius: 7,
                        border: "1px solid #e0eaf2",
                        marginBottom: 7,
                        padding: "10px 12px",
                      }}
                    >
                      {/* Nombre + resultado */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 8,
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontWeight: 700,
                              fontSize: 13,
                              color: "#0f2944",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {slot.nombre}
                          </div>
                          {slot.codform && (
                            <div
                              style={{
                                fontSize: "10px",
                                color: "#4a8ab5",
                                fontFamily: "monospace",
                                marginTop: 2,
                                letterSpacing: "0.04em",
                              }}
                            >
                              #{slot.codform}
                            </div>
                          )}
                        </div>
                        <div
                          style={{
                            fontFamily: "'Rajdhani',sans-serif",
                            fontWeight: 700,
                            fontSize: 16,
                            color: slot.resultado > 0 ? "#0f2944" : "#b0c8d8",
                            minWidth: 100,
                            textAlign: "right",
                            flexShrink: 0,
                          }}
                        >
                          {slot.resultado != null
                            ? formatPeso(slot.resultado)
                            : "—"}
                        </div>
                      </div>

                      {/* Expresión */}
                      {slot.expresion && (
                        <div
                          style={{
                            marginTop: 7,
                            padding: "4px 8px",
                            background: "#eaf3fb",
                            border: "1px solid #b8d6ef",
                            borderRadius: 5,
                            fontSize: "11px",
                            fontFamily: "monospace",
                            color: "#1a4a70",
                            wordBreak: "break-all",
                            lineHeight: 1.5,
                          }}
                        >
                          <span
                            style={{
                              fontSize: "9px",
                              fontWeight: 700,
                              letterSpacing: "0.1em",
                              color: "#4a8ab5",
                              textTransform: "uppercase",
                              fontFamily: "'Source Sans 3',sans-serif",
                              marginRight: 4,
                            }}
                          >
                            expr ·
                          </span>
                          {slot.expresion}
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Margen + Subtotal — justo debajo de la última fórmula */}
                  {slotsFormulas.length > 0 && (
                    <div
                      style={{
                        marginTop: 8,
                        padding: "10px 14px",
                        background: "#f0f7f0",
                        border: "1px solid #b8dfc8",
                        borderRadius: 7,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: 6,
                        }}
                      >
                        <span
                          style={{
                            fontFamily: "'Rajdhani',sans-serif",
                            fontWeight: 700,
                            fontSize: 11,
                            letterSpacing: "0.14em",
                            color: "#16a34a",
                            textTransform: "uppercase",
                          }}
                        >
                          📈 MARGEN (%)
                        </span>
                        {margenBD !== null && (
                          <span
                            style={{
                              fontSize: "10px",
                              fontWeight: 600,
                              background:
                                Number(form.margen) !== margenBD
                                  ? "#fff3cd"
                                  : "#eaf3fb",
                              color:
                                Number(form.margen) !== margenBD
                                  ? "#856404"
                                  : "#2d7fc1",
                              border: `1px solid ${Number(form.margen) !== margenBD ? "#ffc107" : "#b8d6ef"}`,
                              borderRadius: "4px",
                              padding: "1px 7px",
                              cursor:
                                Number(form.margen) !== margenBD
                                  ? "pointer"
                                  : "default",
                            }}
                            onClick={() =>
                              Number(form.margen) !== margenBD &&
                              setForm((p) => ({ ...p, margen: margenBD }))
                            }
                            title={
                              Number(form.margen) !== margenBD
                                ? `Restaurar BD (${margenBD}%)`
                                : "Valor de BD"
                            }
                          >
                            {Number(form.margen) !== margenBD
                              ? `⚠️ BD: ${margenBD}% — restaurar`
                              : `📊 BD: ${margenBD}%`}
                          </span>
                        )}
                      </div>
                      <input
                        className="input"
                        type="number"
                        min="0"
                        step="0.5"
                        value={form.margen}
                        onChange={(e) =>
                          setForm({ ...form, margen: Number(e.target.value) })
                        }
                        style={{ marginBottom: 10 }}
                      />
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginTop: 4,
                          padding: "8px 12px",
                          background: "linear-gradient(90deg,#1a3a5c,#0f2944)",
                          borderRadius: 5,
                        }}
                      >
                        <span
                          style={{
                            fontFamily: "'Rajdhani',sans-serif",
                            fontWeight: 700,
                            fontSize: 11,
                            letterSpacing: "0.14em",
                            color: "#7ab2d4",
                            textTransform: "uppercase",
                          }}
                        >
                          Subtotal
                        </span>
                        <span
                          style={{
                            fontFamily: "'Rajdhani',sans-serif",
                            fontWeight: 700,
                            fontSize: 20,
                            color: "#60b4f0",
                          }}
                        >
                          {formatPeso(subtotal)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Colocación */}
              <div className="field">
                <span
                  className="label-text"
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span>🚚 COLOCACIÓN</span>
                  {colocacionBD !== null && (
                    <span
                      style={{
                        fontSize: "10px",
                        fontWeight: 600,
                        background: "#eaf3fb",
                        color: "#2d7fc1",
                        border: "1px solid #b8d6ef",
                        borderRadius: "4px",
                        padding: "1px 7px",
                      }}
                    >
                      📊 BD:
                      {colocacionBD.valor != null
                        ? ` $${Number(colocacionBD.valor).toLocaleString("es-AR")}`
                        : ""}
                      {colocacionBD.valor != null &&
                      colocacionBD.porcentaje != null
                        ? " / "
                        : ""}
                      {colocacionBD.porcentaje != null
                        ? ` ${colocacionBD.porcentaje}%`
                        : ""}
                    </span>
                  )}
                </span>

                {/* Selector modo */}
                <div style={{ display: "flex", gap: 8, margin: "8px 0" }}>
                  {[
                    { key: "valor", label: "💲 Valor fijo" },
                    { key: "porcentaje", label: "📊 % del subtotal" },
                  ].map(({ key, label }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setColocacionModo(key)}
                      style={{
                        flex: 1,
                        padding: "7px 0",
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: "pointer",
                        transition: "all 0.15s",
                        border:
                          colocacionModo === key
                            ? "2px solid #2d7fc1"
                            : "1.5px solid #d0dde8",
                        background:
                          colocacionModo === key ? "#eaf3fb" : "#f8fafc",
                        color: colocacionModo === key ? "#2d7fc1" : "#6a8aa0",
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {/* Ambos campos visibles — activo resaltado */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 10,
                  }}
                >
                  {/* Valor fijo */}
                  <div
                    style={{
                      padding: "10px 12px",
                      borderRadius: 8,
                      border: `2px solid ${colocacionModo === "valor" ? "#2d7fc1" : "#e2e8f0"}`,
                      background:
                        colocacionModo === "valor" ? "#eaf3fb" : "#f8fafc",
                      opacity: colocacionModo === "valor" ? 1 : 0.5,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color:
                          colocacionModo === "valor" ? "#2d7fc1" : "#94a3b8",
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                        marginBottom: 5,
                      }}
                    >
                      Valor ($)
                      {colocacionBD?.valor != null && (
                        <span
                          onClick={() => {
                            setColocacionValor(colocacionBD.valor);
                            setColocacionModo("valor");
                          }}
                          style={{
                            marginLeft: 6,
                            cursor: "pointer",
                            color: "#2d7fc1",
                          }}
                          title="Restaurar BD"
                        >
                          ↺ BD
                        </span>
                      )}
                    </div>
                    <input
                      className="input"
                      type="number"
                      min="0"
                      step="100"
                      value={colocacionValor}
                      onChange={(e) => {
                        setColocacionValor(Number(e.target.value));
                        setColocacionModo("valor");
                      }}
                    />
                    <div
                      style={{
                        fontSize: 11,
                        color:
                          colocacionModo === "valor" ? "#2d7fc1" : "#94a3b8",
                        marginTop: 5,
                        fontWeight: 600,
                      }}
                    >
                      = {formatPeso(colocacionValor)}
                    </div>
                  </div>

                  {/* Porcentaje */}
                  <div
                    style={{
                      padding: "10px 12px",
                      borderRadius: 8,
                      border: `2px solid ${colocacionModo === "porcentaje" ? "#7c3aed" : "#e2e8f0"}`,
                      background:
                        colocacionModo === "porcentaje" ? "#f5f3ff" : "#f8fafc",
                      opacity: colocacionModo === "porcentaje" ? 1 : 0.5,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color:
                          colocacionModo === "porcentaje"
                            ? "#7c3aed"
                            : "#94a3b8",
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                        marginBottom: 5,
                      }}
                    >
                      % del subtotal
                      {colocacionBD?.porcentaje != null && (
                        <span
                          onClick={() => {
                            setColocacionPct(colocacionBD.porcentaje);
                            setColocacionModo("porcentaje");
                          }}
                          style={{
                            marginLeft: 6,
                            cursor: "pointer",
                            color: "#7c3aed",
                          }}
                          title="Restaurar BD"
                        >
                          ↺ BD
                        </span>
                      )}
                    </div>
                    <input
                      className="input"
                      type="number"
                      min="0"
                      step="0.5"
                      value={colocacionPct}
                      onChange={(e) => {
                        setColocacionPct(Number(e.target.value));
                        setColocacionModo("porcentaje");
                      }}
                    />
                    <div
                      style={{
                        fontSize: 11,
                        color:
                          colocacionModo === "porcentaje"
                            ? "#7c3aed"
                            : "#94a3b8",
                        marginTop: 5,
                        fontWeight: 600,
                      }}
                    >
                      ={" "}
                      {formatPeso(
                        (subtotal * (Number(colocacionPct) || 0)) / 100,
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Breakdown */}
              <div className="breakdown">
                {calculando && (
                  <div
                    style={{
                      padding: "8px 16px",
                      fontSize: "12px",
                      color: "#4a8ab5",
                      fontStyle: "italic",
                      borderBottom: "1px solid #e0eaf2",
                    }}
                  >
                    ⏳ Recalculando...
                  </div>
                )}
                {totalCorredera > 0 && (
                  <div className="breakdown-row" style={{ color: "#d97706" }}>
                    <span>
                      🔩 {form.corredera} × {form.correderaCantidad}
                    </span>
                    <span>{formatPeso(totalCorredera)}</span>
                  </div>
                )}
                <div className="breakdown-row" style={{ fontWeight: 600 }}>
                  <span>Subtotal</span>
                  <span>{formatPeso(subtotal)}</span>
                </div>
                {totalColocacion > 0 && (
                  <div
                    className="breakdown-row"
                    style={{ borderTop: "1px solid #e0eaf3", paddingTop: 6 }}
                  >
                    <span>
                      Colocación{" "}
                      {colocacionModo === "porcentaje"
                        ? `(${colocacionPct}%)`
                        : ""}
                    </span>
                    <span>{formatPeso(totalColocacion)}</span>
                  </div>
                )}
                <div className="total-row">
                  <span className="total-label">TOTAL</span>
                  <span className="total-value">{formatPeso(total)}</span>
                </div>
              </div>

              {/* Acciones */}
              <div className="actions">
                <button className="btn btn-cancel" onClick={onVolver}>
                  Cancelar
                </button>
                {errorCalc && (
                  <p
                    style={{
                      color: "#dc2626",
                      fontSize: "12px",
                      width: "100%",
                      textAlign: "right",
                      marginBottom: 4,
                    }}
                  >
                    ⚠️ {errorCalc}
                  </p>
                )}
                {guardadoOk && (
                  <p
                    style={{
                      color: "#16a34a",
                      fontSize: "12px",
                      width: "100%",
                      textAlign: "right",
                      marginBottom: 4,
                    }}
                  >
                    ✅ Presupuesto guardado correctamente
                  </p>
                )}
                <button
                  className="btn btn-save"
                  onClick={handleGuardar}
                  disabled={guardando}
                >
                  {guardando ? "⏳ Guardando..." : "💾 Guardar"}
                </button>
                <button className="btn btn-pdf" onClick={handlePDF}>
                  📄 PDF
                </button>
                <button
                  className="btn btn-print"
                  onClick={() => window.print()}
                >
                  🖨️ Imprimir
                </button>
              </div>
            </div>
          </div>

          {/* Panel foto del modelo */}
          <div className="foto-panel">
            <div className="foto-panel-title">🛁 Modelo seleccionado</div>
            {modelo?.foto && modelo.foto !== "null" ? (
              <img
                className="foto-panel-img"
                src={modelo.foto}
                alt={modelo.nombre}
              />
            ) : (
              <div className="foto-panel-empty">
                <span style={{ fontSize: 48 }}>🛁</span>
                <small style={{ marginTop: 8 }}>
                  {modelo?.custom ? "Personalizado" : "Sin imagen"}
                </small>
              </div>
            )}
            {modelo && (
              <div style={{ width: "100%", marginTop: 16 }}>
                <div className="foto-info-row">
                  <span className="foto-info-label">Modelo</span>
                  <span className="foto-info-value">
                    {modelo.nombre ?? "Personalizado"}
                  </span>
                </div>
                {modelo.codtipvan && (
                  <div className="foto-info-row">
                    <span className="foto-info-label">Código</span>
                    <span className="foto-info-value">{modelo.codtipvan}</span>
                  </div>
                )}
                {modelo.descripcion && (
                  <div className="foto-info-row">
                    <span className="foto-info-label">Descripción</span>
                    <span className="foto-info-value" style={{ fontSize: 11 }}>
                      {modelo.descripcion}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  );
}
