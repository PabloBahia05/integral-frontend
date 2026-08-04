import { useRef, useState, useCallback, useEffect } from "react";

const MIN_COL_WIDTH = 40;

export default function DataTable({ columns, rows, selectedId, onSelect }) {
  // Anchos por columna (key -> px). Si una columna no está acá, usa auto.
  const [widths, setWidths] = useState({});
  const tableRef = useRef(null);
  const resizing = useRef(null); // { key, startX, startWidth }

  const onMouseDown = useCallback(
    (e, col) => {
      e.preventDefault();
      e.stopPropagation();

      const th = e.currentTarget.closest("th");
      const startWidth = th ? th.offsetWidth : 100;

      resizing.current = {
        key: col.key,
        startX: e.clientX,
        startWidth,
      };

      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [],
  );

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
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  return (
    <div className="table-wrap">
      <table className="data-table" ref={tableRef} style={{ tableLayout: "fixed" }}>
        <colgroup>
          {columns.map((col) => (
            <col
              key={col.key}
              style={widths[col.key] ? { width: widths[col.key] } : undefined}
            />
          ))}
        </colgroup>
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} style={{ position: "relative" }}>
                {col.label}
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
