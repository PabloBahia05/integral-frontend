import { useState, useMemo } from "react";

export default function SemanasAnio({ semanasAnio = [] }) {
  const anios = useMemo(
    () => [...new Set(semanasAnio.map((s) => s.anio))].sort(),
    [semanasAnio],
  );
  const [anioSel, setAnioSel] = useState(anios[0] ?? null);

  const filas = useMemo(
    () =>
      semanasAnio
        .filter((s) => !anioSel || s.anio === anioSel)
        .sort((a, b) => a.numero_semana - b.numero_semana),
    [semanasAnio, anioSel],
  );

  const totalHoras = filas.reduce(
    (acc, s) => acc + Number(s.horas_esperadas || 0),
    0,
  );
  const semanasConFeriado = filas.filter(
    (s) => Number(s.cantidad_feriados) > 0,
  ).length;

  return (
    <div className="sem-wrap">
      <style>{SS}</style>
      <div className="sem-header">
        <div>
          <h2 className="sem-title">🗓️ Semanas y Horas Esperadas</h2>
          <p className="sem-subtitle">
            Calculado automáticamente a partir de los feriados cargados
            (44hs/semana = 8.8hs por día hábil)
          </p>
        </div>
        {anios.length > 1 && (
          <select
            className="sem-select"
            value={anioSel ?? ""}
            onChange={(e) => setAnioSel(Number(e.target.value))}
          >
            {anios.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        )}
      </div>

      {filas.length === 0 ? (
        <p className="sem-empty">
          Todavía no hay semanas generadas para este año. Corré el script de
          generación con los feriados cargados.
        </p>
      ) : (
        <>
          <div className="sem-stats">
            <div className="sem-stat">
              <span className="sem-stat-num">{filas.length}</span>
              <span className="sem-stat-label">semanas</span>
            </div>
            <div className="sem-stat">
              <span className="sem-stat-num">{semanasConFeriado}</span>
              <span className="sem-stat-label">con feriado</span>
            </div>
            <div className="sem-stat">
              <span className="sem-stat-num">{totalHoras.toFixed(1)}h</span>
              <span className="sem-stat-label">esperadas en el año</span>
            </div>
          </div>

          <div className="sem-table-wrap">
            <table className="sem-table">
              <thead>
                <tr>
                  <th>Semana</th>
                  <th>Desde</th>
                  <th>Hasta</th>
                  <th>Días hábiles</th>
                  <th>Horas esperadas</th>
                  <th>Feriados</th>
                </tr>
              </thead>
              <tbody>
                {filas.map((s) => (
                  <tr
                    key={`${s.anio}-${s.numero_semana}`}
                    className={s.dias_habiles < 5 ? "sem-row-feriado" : ""}
                  >
                    <td>{s.numero_semana}</td>
                    <td>{formatFecha(s.fecha_inicio)}</td>
                    <td>{formatFecha(s.fecha_fin)}</td>
                    <td>{s.dias_habiles}</td>
                    <td>{Number(s.horas_esperadas).toFixed(1)}h</td>
                    <td className="sem-detalle">{s.feriados_detalle || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

// Evita corrimientos de timezone: lee el string de fecha directamente sin pasar por Date
function formatFecha(value) {
  if (!value) return "—";
  const [, m, d] = String(value).slice(0, 10).split("-");
  return `${d}/${m}`;
}

const SS = `
  .sem-wrap { padding: 24px; font-family: 'Space Mono', monospace; }
  .sem-header { display:flex; align-items:flex-start; justify-content:space-between; gap:16px; margin-bottom:16px; flex-wrap:wrap; }
  .sem-title { font-size:20px; font-weight:800; color:#0a3a5c; margin:0 0 4px; }
  .sem-subtitle { font-size:12px; color:#6699bb; margin:0; max-width:480px; }
  .sem-select { padding:7px 12px; border:1px solid #cfe3f2; border-radius:4px; font-family:inherit; font-size:12px; color:#0a3a5c; }
  .sem-select:focus-visible { outline:2px solid #4361ee; outline-offset:2px; }
  .sem-empty { color:#99bbcc; font-size:13px; padding:24px 0; }
  .sem-stats { display:flex; gap:24px; margin-bottom:20px; flex-wrap:wrap; }
  .sem-stat { display:flex; flex-direction:column; }
  .sem-stat-num { font-size:22px; font-weight:800; color:#0a3a5c; }
  .sem-stat-label { font-size:11px; color:#6699bb; text-transform:uppercase; letter-spacing:0.5px; }
  .sem-table-wrap { overflow-x:auto; }
  table.sem-table { border-collapse:collapse; font-size:13px; width:100%; min-width:640px; }
  table.sem-table th { background:#0a3a5c; color:#fff; padding:9px 14px; text-align:left;
    font-size:10px; letter-spacing:1px; text-transform:uppercase; white-space:nowrap; }
  table.sem-table td { padding:8px 14px; border-bottom:1px solid #e0eef8; color:#0a3a5c; }
  table.sem-table tr:hover td { background:#f0f8ff; }
  table.sem-table tr.sem-row-feriado td { background:#fff8e8; }
  table.sem-table tr.sem-row-feriado:hover td { background:#fff0cc; }
  .sem-detalle { font-size:11px; color:#856404; }
`;
