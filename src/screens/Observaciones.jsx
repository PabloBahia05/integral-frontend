// Bloque de Leyenda + Observaciones del presupuesto.
// El estado (leyenda, observaciones) sigue viviendo en el padre;
// este componente solo recibe valor + setter por props.
export default function Observaciones({
  leyenda,
  setLeyenda,
  observaciones,
  setObservaciones,
}) {
  return (
    <>
      {/* Leyenda */}
      <div className="pn-section-label">Leyenda:</div>
      <textarea
        className="pn-textarea"
        rows={2}
        value={leyenda}
        onChange={(e) => setLeyenda(e.target.value)}
      />

      {/* Observaciones */}
      <div className="pn-section-label" style={{ marginTop: 14 }}>
        Observaciones:
      </div>
      <textarea
        className="pn-textarea"
        rows={10}
        value={observaciones}
        onChange={(e) => setObservaciones(e.target.value)}
      />
    </>
  );
}
