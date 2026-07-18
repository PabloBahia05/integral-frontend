import ClienteSection from "./ClienteSection";

// Contenido completo del tab "Encabezado" (menos Observaciones, que quedó aparte).
// Todo el estado sigue viviendo en PresupuestoNuevo.jsx; acá solo recibimos
// valores + setters por props y reenviamos los que necesita ClienteSection.
export default function EncabezadoSection({
  // Número / revisión / fecha
  numero,
  revision,
  setRevision,
  fecha,
  setFecha,
  formatFechaLarga,
  // Cliente (se reenvían a ClienteSection)
  cliente,
  setCliente,
  setCodcliente,
  clienteAutoResuelto,
  setClienteAutoResuelto,
  clientesSugeridos,
  setClientesSugeridos,
  telefono1,
  setTelefono1,
  telefono2,
  setTelefono2,
  wapp,
  setWapp,
  domicilio,
  setDomicilio,
  domicilioFiscal,
  setDomicilioFiscal,
  telefonoSearch,
  setTelefonoSearch,
  telefonosSugeridos,
  setTelefonosSugeridos,
  resolviendoCliente,
  localidad,
  setLocalidad,
  LOCALIDADES,
  authFetch,
  // Líneas
  lineas,
  setLinea,
  lineasBD,
  // Precios
  listaPrecio,
  setListaPrecio,
  listasDB,
  listaPorcentaje,
  mostrarCosto,
  setMostrarCosto,
  incluirPrecio,
  setIncluirPrecio,
  incluirSubtotalItem,
  setIncluirSubtotalItem,
  incluirTotal,
  setIncluirTotal,
  color,
  setColor,
  incluirTextoColoc,
  setIncluirTextoColoc,
  agregarIVA,
  setAgregarIVA,
}) {
  return (
    <>
      {/* Número y revisión */}
      <div className="pn-header-row">
        <span className="pn-numero-label">
          Presupuesto número:&nbsp;
          <span className="pn-numero-val">[{numero}]</span>
        </span>
        <div className="pn-rev-group">
          <span>Revisión:</span>
          <input
            className="pn-rev-input"
            type="number"
            min="1"
            value={revision}
            onChange={(e) => setRevision(Number(e.target.value))}
          />
        </div>
        <div className="pn-fecha-group">
          <span className="pn-fecha-label">Fecha:</span>
          <span className="pn-fecha-text">{formatFechaLarga(fecha)}</span>
          <input
            type="date"
            className="pn-field-select"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            style={{ marginLeft: 4 }}
          />
        </div>
      </div>

      <ClienteSection
        cliente={cliente}
        setCliente={setCliente}
        setCodcliente={setCodcliente}
        clienteAutoResuelto={clienteAutoResuelto}
        setClienteAutoResuelto={setClienteAutoResuelto}
        clientesSugeridos={clientesSugeridos}
        setClientesSugeridos={setClientesSugeridos}
        telefono1={telefono1}
        setTelefono1={setTelefono1}
        telefono2={telefono2}
        setTelefono2={setTelefono2}
        wapp={wapp}
        setWapp={setWapp}
        domicilio={domicilio}
        setDomicilio={setDomicilio}
        domicilioFiscal={domicilioFiscal}
        setDomicilioFiscal={setDomicilioFiscal}
        telefonoSearch={telefonoSearch}
        setTelefonoSearch={setTelefonoSearch}
        telefonosSugeridos={telefonosSugeridos}
        setTelefonosSugeridos={setTelefonosSugeridos}
        resolviendoCliente={resolviendoCliente}
        localidad={localidad}
        setLocalidad={setLocalidad}
        LOCALIDADES={LOCALIDADES}
        authFetch={authFetch}
      />

      {/* Líneas */}
      <div className="pn-section-label">Líneas a presupuestar:</div>
      <div className="pn-lineas-grid">
        {lineas.map((l, idx) => (
          <div key={idx} className="pn-linea-row">
            <select
              className="pn-field-select"
              value={l.linea}
              onChange={(e) => setLinea(idx, "linea", e.target.value)}
              style={{ width: "100%" }}
            >
              <option value="[Sin líneas]">[Sin líneas]</option>
              {lineasBD.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
            <input
              className="pn-field-input"
              style={{ maxWidth: "100%" }}
              value={l.col2}
              onChange={(e) => setLinea(idx, "col2", e.target.value)}
              placeholder=""
              disabled={l.linea === "[Sin líneas]"}
            />
            <input
              className="pn-field-input"
              style={{ maxWidth: "100%" }}
              value={l.col3}
              onChange={(e) => setLinea(idx, "col3", e.target.value)}
              placeholder=""
              disabled={l.linea === "[Sin líneas]"}
            />
          </div>
        ))}
      </div>

      {/* Precios */}
      <div className="pn-section-label" style={{ marginTop: 20 }}>
        Precios
      </div>
      <div className="pn-precios-wrap">
        <div className="pn-lista-group">
          <span style={{ fontSize: 12, color: "#0a3a5c" }}>
            Lista de precios:
          </span>
          <select
            className="pn-field-select"
            value={listaPrecio}
            onChange={(e) => setListaPrecio(e.target.value)}
          >
            {listasDB.length === 0 ? (
              <option value="">Cargando...</option>
            ) : (
              listasDB.map((l) => (
                <option key={l.id} value={l.lista}>
                  {l.lista}
                </option>
              ))
            )}
          </select>
          {listaPorcentaje !== 0 && (
            <span
              style={{
                fontSize: 11,
                fontFamily: "'Space Mono',monospace",
                fontWeight: 700,
                color: "#fff",
                background: "#2277bb",
                borderRadius: 4,
                padding: "3px 10px",
                letterSpacing: "0.04em",
              }}
            >
              +{listaPorcentaje}% sobre precio base
            </span>
          )}
        </div>

        <div className="pn-check-group">
          <label className="pn-check-row">
            <input
              type="checkbox"
              checked={mostrarCosto}
              onChange={(e) => setMostrarCosto(e.target.checked)}
            />{" "}
            Mostrar costo
          </label>
          <label className="pn-check-row">
            <input
              type="checkbox"
              checked={incluirPrecio}
              onChange={(e) => setIncluirPrecio(e.target.checked)}
            />{" "}
            Incluir precio
          </label>
          <label className="pn-check-row">
            <input
              type="checkbox"
              checked={incluirSubtotalItem}
              onChange={(e) => setIncluirSubtotalItem(e.target.checked)}
            />{" "}
            Incluir subtotal por ítem
          </label>
          <label className="pn-check-row">
            <input
              type="checkbox"
              checked={incluirTotal}
              onChange={(e) => setIncluirTotal(e.target.checked)}
            />{" "}
            Incluir total
          </label>
        </div>

        <div className="pn-color-group">
          <span className="pn-color-label">Color:</span>
          <input
            className="pn-color-input"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            placeholder=""
          />
        </div>

        <div className="pn-right-checks">
          <label className="pn-check-row">
            <input
              type="checkbox"
              checked={incluirTextoColoc}
              onChange={(e) => setIncluirTextoColoc(e.target.checked)}
            />{" "}
            Incluir texto de colocación
          </label>
          <label className="pn-check-row">
            <input
              type="checkbox"
              checked={agregarIVA}
              onChange={(e) => setAgregarIVA(e.target.checked)}
            />{" "}
            Agregar IVA al precio de cada módulo
          </label>
        </div>
      </div>
    </>
  );
}
