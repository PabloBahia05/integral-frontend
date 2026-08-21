// Bloque de datos del cliente dentro del tab "Encabezado".
// Todo el estado sigue viviendo en PresupuestoNuevo.jsx (el padre);
// este componente solo recibe valores + setters por props.
// Nota: duplicamos la constante API acá (mismo valor que en el padre)
// para no tener que exportarla — si cambia el backend, actualizar en ambos lados.
const API = "https://integral-backend-production.up.railway.app";

export default function ClienteSection({
  cliente,
  setCliente,
  codcliente,
  setCodcliente,
  onIrACliente,
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
  referencia,
  setReferencia,
  telefonoSearch,
  setTelefonoSearch,
  telefonosSugeridos,
  setTelefonosSugeridos,
  resolviendoCliente,
  localidad,
  setLocalidad,
  LOCALIDADES,
  authFetch,
}) {
  // Solo dígitos, para comparar teléfonos sin importar guiones/espacios.
  const soloDigitos = (v) => String(v ?? "").replace(/\D/g, "");

  // Aplica los datos de un cliente ya existente (de BD) a todo el bloque.
  // Se usa tanto al elegir una sugerencia (nombre o teléfono) como al
  // detectar un match exacto de teléfono mientras se tipea — en ambos
  // casos deja el cliente vinculado (codcliente seteado), así nunca
  // termina cargándose como cliente nuevo por accidente.
  const aplicarCliente = (c) => {
    const nombre = c.nombre ?? c.NOMBRE ?? "";
    const tel1 = c.telefono1 ?? c.TELEFONO1 ?? "";
    const tel2 = c.telefono2 ?? c.TELEFONO2 ?? "";
    const wp = c.wapp ?? c.WAPP ?? "";
    setCliente(nombre);
    setCodcliente(c.codcliente ?? c.CODCLIENTE ?? null);
    setTelefono1(tel1);
    setTelefono2(tel2);
    setWapp(wp);
    setDomicilio(c.domrem ?? c.DOMREM ?? "");
    setDomicilioFiscal(
      c.domiciliofiscal ?? c["domicilio fiscal"] ?? c.DOMICILIO_FISCAL ?? "",
    );
    setTelefonoSearch(tel1 || tel2 || wp);
    setClienteAutoResuelto("existente");
  };

  return (
    <>
      {/* Cliente + Teléfono */}
      <div
        className="pn-field-row"
        style={{ alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}
      >
        <span className="pn-field-label" style={{ paddingTop: 7 }}>
          Cliente:
        </span>

        {/* Acceso rápido a la ficha del cliente en Clientes — para
            completar o buscar datos como domicilio, CUIT, etc. Solo
            disponible una vez que el cliente quedó vinculado (codcliente). */}
        <button
          type="button"
          className="pn-tool-btn"
          onClick={() =>
            onIrACliente?.(codcliente, cliente, telefono1 || telefono2 || wapp)
          }
          disabled={!codcliente}
          title={
            codcliente
              ? "Ver / completar ficha del cliente"
              : "Elegí un cliente existente para poder abrir su ficha"
          }
          style={{
            fontSize: 12,
            padding: "6px 10px",
            marginTop: 1,
            opacity: codcliente ? 1 : 0.5,
            cursor: codcliente ? "pointer" : "not-allowed",
          }}
        >
          👤 Ficha
        </button>

        {/* Campo cliente — busca por nombre en BD, o ingresa nuevo */}
        <div
          style={{
            position: "relative",
            flex: "2 1 200px",
            minWidth: 160,
          }}
        >
          <input
            className="pn-field-input"
            value={cliente}
            onChange={(e) => {
              const val = e.target.value;
              setCliente(val);
              setCodcliente(null); // resetear si escribe a mano
              setClienteAutoResuelto(null);
              clearTimeout(window._clienteTimer);
              if (val.length > 1) {
                window._clienteTimer = setTimeout(() => {
                  authFetch(
                    `${API}/clientes/buscar-nombre?q=${encodeURIComponent(val)}`,
                  )
                    .then((r) => r.json())
                    .then((data) =>
                      setClientesSugeridos(Array.isArray(data) ? data : []),
                    )
                    .catch(() => {});
                }, 250);
              } else {
                setClientesSugeridos([]);
              }
            }}
            onBlur={() => setClientesSugeridos([])}
            placeholder="Nombre o nuevo cliente..."
            autoComplete="off"
            style={{ width: "100%" }}
          />
          {clientesSugeridos.length > 0 && (
            <div
              onMouseDown={(e) => e.preventDefault()}
              style={{
                position: "absolute",
                top: "100%",
                left: 0,
                right: 0,
                background: "#fff",
                border: "1px solid #b8cfe0",
                zIndex: 50,
                boxShadow: "0 4px 12px #0002",
                maxHeight: 220,
                overflowY: "auto",
                borderRadius: "0 0 3px 3px",
              }}
            >
              {clientesSugeridos.map((c, i) => {
                const nombre = c.nombre ?? c.NOMBRE ?? "";
                const loc = c.localidad ?? c.LOCALIDAD ?? "";
                const tel1 = c.telefono1 ?? c.TELEFONO1 ?? "";
                const tel2 = c.telefono2 ?? c.TELEFONO2 ?? "";
                const wp = c.wapp ?? c.WAPP ?? "";
                return (
                  <div
                    key={i}
                    onMouseDown={() => {
                      aplicarCliente(c);
                      setClientesSugeridos([]);
                    }}
                    style={{
                      padding: "8px 14px",
                      cursor: "pointer",
                      fontSize: 12,
                      borderBottom: "1px solid #eef2f6",
                      fontFamily: "'Space Mono',monospace",
                    }}
                    onMouseOver={(e) =>
                      (e.currentTarget.style.background = "#ddeefa")
                    }
                    onMouseOut={(e) =>
                      (e.currentTarget.style.background = "#fff")
                    }
                  >
                    <div style={{ fontWeight: 700, color: "#0a3a5c" }}>
                      {nombre}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "#6699bb",
                        marginTop: 2,
                        display: "flex",
                        gap: 10,
                      }}
                    >
                      {tel1 && <span>📞 {tel1}</span>}
                      {tel2 && <span>📞 {tel2}</span>}
                      {wp && <span>💬 {wp}</span>}
                      {loc && <span>📍 {loc}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Campo teléfono — busca en telefono1, telefono2, wapp */}
        <div
          style={{
            position: "relative",
            flex: "1 1 150px",
            minWidth: 140,
          }}
        >
          <input
            className="pn-field-input"
            value={telefonoSearch}
            onChange={(e) => {
              const val = e.target.value;
              setTelefonoSearch(val);
              clearTimeout(window._telTimer);
              if (val.length > 1) {
                window._telTimer = setTimeout(() => {
                  authFetch(
                    `${API}/clientes/buscar-telefono?q=${encodeURIComponent(val)}`,
                  )
                    .then((r) => r.json())
                    .then((data) => {
                      const lista = Array.isArray(data) ? data : [];
                      // Si el número tipeado coincide EXACTO (comparando
                      // solo dígitos) con el teléfono de un cliente
                      // existente, lo cargamos directo — así no queda la
                      // posibilidad de guardar como "cliente nuevo" un
                      // teléfono que ya está en la base.
                      const digitos = soloDigitos(val);
                      const exacto =
                        digitos.length > 0
                          ? lista.find((c) =>
                              [
                                c.telefono1 ?? c.TELEFONO1,
                                c.telefono2 ?? c.TELEFONO2,
                                c.wapp ?? c.WAPP,
                              ].some((t) => t && soloDigitos(t) === digitos),
                            )
                          : null;
                      if (exacto) {
                        aplicarCliente(exacto);
                        setTelefonosSugeridos([]);
                      } else {
                        setTelefonosSugeridos(lista);
                      }
                    })
                    .catch(() => {});
                }, 250);
              } else {
                setTelefonosSugeridos([]);
              }
            }}
            onBlur={() => setTelefonosSugeridos([])}
            placeholder="📞 Teléfono..."
            autoComplete="off"
            style={{ width: "100%" }}
          />
          {telefonosSugeridos.length > 0 && (
            <div
              onMouseDown={(e) => e.preventDefault()}
              style={{
                position: "absolute",
                top: "100%",
                left: 0,
                right: 0,
                background: "#fff",
                border: "1px solid #b8cfe0",
                zIndex: 50,
                boxShadow: "0 4px 12px #0002",
                maxHeight: 220,
                overflowY: "auto",
                borderRadius: "0 0 3px 3px",
              }}
            >
              {telefonosSugeridos.map((c, i) => {
                const nombre = c.nombre ?? c.NOMBRE ?? "";
                const tel1 = c.telefono1 ?? c.TELEFONO1 ?? "";
                const tel2 = c.telefono2 ?? c.TELEFONO2 ?? "";
                const wp = c.wapp ?? c.WAPP ?? "";
                return (
                  <div
                    key={i}
                    onMouseDown={() => {
                      aplicarCliente(c);
                      setTelefonosSugeridos([]);
                    }}
                    style={{
                      padding: "8px 14px",
                      cursor: "pointer",
                      fontSize: 12,
                      borderBottom: "1px solid #eef2f6",
                      fontFamily: "'Space Mono',monospace",
                    }}
                    onMouseOver={(e) =>
                      (e.currentTarget.style.background = "#ddeefa")
                    }
                    onMouseOut={(e) =>
                      (e.currentTarget.style.background = "#fff")
                    }
                  >
                    <div style={{ fontWeight: 700, color: "#0a3a5c" }}>
                      {nombre}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "#6699bb",
                        marginTop: 2,
                        display: "flex",
                        gap: 10,
                      }}
                    >
                      {tel1 && <span>📞 {tel1}</span>}
                      {tel2 && <span>📞 {tel2}</span>}
                      {wp && <span>💬 {wp}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Referencia — punto de referencia de la dirección, libre */}
        <div
          style={{
            flex: "1 1 150px",
            minWidth: 140,
          }}
        >
          <input
            className="pn-field-input"
            value={referencia}
            onChange={(e) => setReferencia(e.target.value)}
            placeholder="📍 Referencia..."
            maxLength={100}
            autoComplete="off"
            style={{ width: "100%" }}
          />
        </div>

        {/* Estado de la resolución automática de cliente */}
        {resolviendoCliente && (
          <span
            style={{
              fontSize: 11,
              color: "#4a8ab5",
              fontFamily: "'Space Mono',monospace",
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            🔎 Verificando cliente...
          </span>
        )}
        {!resolviendoCliente && clienteAutoResuelto === "existente" && (
          <span
            style={{
              fontSize: 11,
              color: "#1b5e20",
              fontFamily: "'Space Mono',monospace",
            }}
          >
            ✅ Cliente existente vinculado
          </span>
        )}
        {!resolviendoCliente && clienteAutoResuelto === "nuevo" && (
          <span
            style={{
              fontSize: 11,
              color: "#856404",
              fontFamily: "'Space Mono',monospace",
            }}
          >
            🆕 Cliente nuevo dado de alta
          </span>
        )}

        {/* Chips de teléfonos del cliente seleccionado */}
        {(telefono1 || telefono2 || wapp) && (
          <div
            style={{
              display: "flex",
              gap: 6,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            {telefono1 && (
              <span
                style={{
                  fontSize: 11,
                  color: "#0a3a5c",
                  background: "#e8f0f7",
                  border: "1px solid #c8dae8",
                  borderRadius: 3,
                  padding: "4px 10px",
                  fontFamily: "'Space Mono',monospace",
                }}
              >
                📞 {telefono1}
              </span>
            )}
            {telefono2 && (
              <span
                style={{
                  fontSize: 11,
                  color: "#0a3a5c",
                  background: "#e8f0f7",
                  border: "1px solid #c8dae8",
                  borderRadius: 3,
                  padding: "4px 10px",
                  fontFamily: "'Space Mono',monospace",
                }}
              >
                📞 {telefono2}
              </span>
            )}
            {wapp && (
              <span
                style={{
                  fontSize: 11,
                  color: "#1a7a3a",
                  background: "#e6f5eb",
                  border: "1px solid #a8d8b0",
                  borderRadius: 3,
                  padding: "4px 10px",
                  fontFamily: "'Space Mono',monospace",
                }}
              >
                💬 {wapp}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Localidad */}
      <div className="pn-field-row">
        <span className="pn-field-label">Localidad:</span>
        <select
          className="pn-field-select"
          value={localidad}
          onChange={(e) => setLocalidad(e.target.value)}
          style={{ minWidth: 200 }}
        >
          {LOCALIDADES.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
      </div>

      {/* Domicilio */}
      {(domicilio || domicilioFiscal) && (
        <div className="pn-field-row" style={{ flexWrap: "wrap", gap: 12 }}>
          {domicilio && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                flex: "1 1 200px",
              }}
            >
              <span className="pn-field-label">Domicilio:</span>
              <input
                className="pn-field-input"
                value={domicilio}
                onChange={(e) => setDomicilio(e.target.value)}
                style={{ flex: 1 }}
              />
            </div>
          )}
          {domicilioFiscal && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                flex: "1 1 200px",
              }}
            >
              <span className="pn-field-label">Dom. Fiscal:</span>
              <input
                className="pn-field-input"
                value={domicilioFiscal}
                onChange={(e) => setDomicilioFiscal(e.target.value)}
                style={{ flex: 1 }}
              />
            </div>
          )}
        </div>
      )}
    </>
  );
}
