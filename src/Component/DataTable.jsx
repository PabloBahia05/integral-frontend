import { useRef, useState, useCallback, useEffect } from "react";

const MIN_COL_WIDTH = 40;
const DEFAULT_COL_WIDTH = 120;
const STORAGE_PREFIX = "datatable-widths:";

// Lee anchos guardados para esta tabla (si storageKey viene definido).
// Si no hay nada guardado, o el JSON está corrupto, devuelve {}.
function leerAnchosGuardados(storageKey) {
  if (!storageKey) return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + storageKey);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function guardarAnchos(storageKey, widths) {
  if (!storageKey) return;
  try {
    window.localStorage.setItem(
      STORAGE_PREFIX + storageKey,
      JSON.stringify(widths),
    );
  } catch {
    // localStorage lleno o deshabilitado — no rompe la tabla, solo no persiste
  }
}

export default function DataTable({
  columns,
  rows,
  selectedId,
  onSelect,
  storageKey,
}) {
  // Anchos por columna (key -> px). Arranca con el ancho guardado en
  // localStorage (si hay storageKey y hay algo guardado para esa columna),
  // si no con col.width si viene definido en la columna, o DEFAULT_COL_WIDTH.
  // A partir de ahí, cada drag actualiza el valor puntual de esa columna
  // y lo persiste.
  const [widths, setWidths] = useState(() => {
    const guardados = leerAnchosGuardados(storageKey);
    const initial = {};
    columns.forEach((col) => {
      initial[col.key] = guardados[col.key] ?? col.width ?? DEFAULT_COL_WIDTH;
    });
    return initial;
  });

  // Si cambia el set de columnas (nuevas keys), les asigna ancho guardado o
  // default, sin pisar los anchos ya ajustados manualmente en esta sesión.
  useEffect(() => {
    setWidths((prev) => {
      let changed = false;
      const guardados = leerAnchosGuardados(storageKey);
      const next = { ...prev };
      columns.forEach((col) => {
        if (next[col.key] === undefined) {
          next[col.key] = guardados[col.key] ?? col.width ?? DEFAULT_COL_WIDTH;
          changed = true;
        }
      });
      return changed ? next : prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columns.map((c) => c.key).join("|")]);

  const tableRef = useRef(null);
  const resizing = useRef(null); // { key, startX, startWidth }

  const onMouseDown = useCallback((e, col) => {
    e.preventDefault();
    e.stopPropagation();

    const th = e.currentTarget.closest("th");
    const startWidth = th ? th.offsetWidth : DEFAULT_COL_WIDTH;

    resizing.current = {
      key: col.key,
      startX: e.clientX,
      startWidth,
    };

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, []);

  useEffect(() => {
    const onMouseMove = (e) => {
      if (!resizing.current) return;
      const { key, startX, startWidth } = resizing.current;
      const delta = e.clientX - startX;
      const newWidth = Math.max(MIN_COL_WIDTH, startWidth + delta);
      setWidths((prev) => ({ ...prev, [key]: newWidth }));
    };

    const onMouseUp = () => {
      if (!resizing.current) return;
      resizing.current = null;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      // Recién al soltar guardamos — evita escribir en localStorage en
      // cada pixel de movimiento del mouse.
      setWidths((current) => {
        guardarAnchos(storageKey, current);
        return current;
      });
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [storageKey]);

  return (
    <div className="table-wrap">
      <table
        className="data-table"
        ref={tableRef}
        style={{ tableLayout: "fixed" }}
      >
        <colgroup>
          {columns.map((col) => (
            <col
              key={col.key}
              style={{ width: widths[col.key] ?? col.width ?? DEFAULT_COL_WIDTH }}
            />
          ))}
        </colgroup>
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} style={{ position: "relative" }}>
                <span
                  title={typeof col.label === "string" ? col.label : undefined}
                  style={{
                    display: "block",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    paddingRight: 8,
                  }}
                >
                  {col.label}
                </span>
                <span
                  onMouseDown={(e) => onMouseDown(e, col)}
                  style={{
                    position: "absolute",
                    top: 0,
                    right: 0,
                    height: "100%",
                    width: 6,
                    cursor: "col-resize",
                    userSelect: "none",
                    touchAction: "none",
                    zIndex: 1,
                  }}
                />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="empty-msg">
                — Sin registros —
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr
                key={row.id}
                className={selectedId === row.id ? "selected" : ""}
                onClick={() => onSelect(row)}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    style={{
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {col.render ? col.render(row[col.key], row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
