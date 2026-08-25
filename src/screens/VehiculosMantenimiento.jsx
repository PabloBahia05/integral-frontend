import React, { useEffect, useState } from 'react';

const API = "https://integral-backend-production.up.railway.app";
const HISTORIAL_URL = `${API}/vehiculos`;
const FLOTA_URL = `${API}/flota`;

const vacioHistorial = { vehiculo: '', chofer: '', fecha: '', taller: '', costo: '' };
const vacioFlota = { patente: '', marca: '', modelo: '', anio: '' };

export default function VehiculosMantenimiento({ token, onBack }) {
  const [vista, setVista] = useState('historial'); // 'historial' | 'vehiculos'

  const authHeaders = (extra = {}) => ({
    Authorization: `Bearer ${token}`,
    ...extra,
  });

  // ---------------- FLOTA (Vehículos) ----------------
  const [flota, setFlota] = useState([]);
  const [cargandoFlota, setCargandoFlota] = useState(true);
  const [errorFlota, setErrorFlota] = useState('');
  const [modalFlotaAbierto, setModalFlotaAbierto] = useState(false);
  const [editandoFlotaId, setEditandoFlotaId] = useState(null);
  const [formFlota, setFormFlota] = useState(vacioFlota);
  const [guardandoFlota, setGuardandoFlota] = useState(false);

  const cargarFlota = async () => {
    setCargandoFlota(true);
    setErrorFlota('');
    try {
      const res = await fetch(FLOTA_URL, { headers: authHeaders() });
      if (!res.ok) throw new Error('No se pudieron cargar los vehículos');
      const data = await res.json();
      setFlota(data);
    } catch (err) {
      console.error(err);
      setErrorFlota('Error al cargar los vehículos');
    } finally {
      setCargandoFlota(false);
    }
  };

  const abrirNuevoFlota = () => {
    setEditandoFlotaId(null);
    setFormFlota(vacioFlota);
    setModalFlotaAbierto(true);
  };

  const abrirEdicionFlota = (registro) => {
    setEditandoFlotaId(registro.id);
    setFormFlota({
      patente: registro.patente,
      marca: registro.marca,
      modelo: registro.modelo,
      anio: registro.anio,
    });
    setModalFlotaAbierto(true);
  };

  const cerrarModalFlota = () => {
    setModalFlotaAbierto(false);
    setFormFlota(vacioFlota);
    setEditandoFlotaId(null);
  };

  const handleChangeFlota = (campo) => (e) => {
    setFormFlota((prev) => ({ ...prev, [campo]: e.target.value }));
  };

  const handleGuardarFlota = async () => {
    if (!formFlota.patente || !formFlota.marca || !formFlota.modelo || !formFlota.anio) {
      alert('Completá todos los campos');
      return;
    }
    setGuardandoFlota(true);
    try {
      const url = editandoFlotaId ? `${FLOTA_URL}/${editandoFlotaId}` : FLOTA_URL;
      const method = editandoFlotaId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ ...formFlota, anio: Number(formFlota.anio) }),
      });
      if (!res.ok) throw new Error('Error al guardar');
      cerrarModalFlota();
      cargarFlota();
    } catch (err) {
      console.error(err);
      alert('No se pudo guardar el vehículo');
    } finally {
      setGuardandoFlota(false);
    }
  };

  const handleEliminarFlota = async (id) => {
    if (!window.confirm('¿Eliminar este vehículo?')) return;
    try {
      const res = await fetch(`${FLOTA_URL}/${id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error('Error al eliminar');
      cargarFlota();
    } catch (err) {
      console.error(err);
      alert('No se pudo eliminar el vehículo');
    }
  };

  // ---------------- HISTORIAL (mantenimiento) ----------------
  const [registros, setRegistros] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [form, setForm] = useState(vacioHistorial);
  const [guardando, setGuardando] = useState(false);

  const cargarRegistros = async () => {
    setCargando(true);
    setError('');
    try {
      const res = await fetch(HISTORIAL_URL, { headers: authHeaders() });
      if (!res.ok) throw new Error('No se pudieron cargar los registros');
      const data = await res.json();
      setRegistros(data);
    } catch (err) {
      console.error(err);
      setError('Error al cargar los registros de vehículos');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    cargarFlota();
    cargarRegistros();
  }, [token]);

  const abrirNuevo = () => {
    setEditandoId(null);
    setForm(vacioHistorial);
    setModalAbierto(true);
  };

  const abrirEdicion = (registro) => {
    setEditandoId(registro.id);
    setForm({
      vehiculo: registro.vehiculo,
      chofer: registro.chofer,
      fecha: registro.fecha?.slice(0, 10) || '',
      taller: registro.taller,
      costo: registro.costo,
    });
    setModalAbierto(true);
  };

  const cerrarModal = () => {
    setModalAbierto(false);
    setForm(vacioHistorial);
    setEditandoId(null);
  };

  const handleChange = (campo) => (e) => {
    setForm((prev) => ({ ...prev, [campo]: e.target.value }));
  };

  const handleGuardar = async () => {
    if (!form.vehiculo || !form.chofer || !form.fecha || !form.taller || form.costo === '') {
      alert('Completá todos los campos');
      return;
    }
    setGuardando(true);
    try {
      const url = editandoId ? `${HISTORIAL_URL}/${editandoId}` : HISTORIAL_URL;
      const method = editandoId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ ...form, costo: Number(form.costo) }),
      });
      if (!res.ok) throw new Error('Error al guardar');
      cerrarModal();
      cargarRegistros();
    } catch (err) {
      console.error(err);
      alert('No se pudo guardar el registro');
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminar = async (id) => {
    if (!window.confirm('¿Eliminar este registro de mantenimiento?')) return;
    try {
      const res = await fetch(`${HISTORIAL_URL}/${id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error('Error al eliminar');
      cargarRegistros();
    } catch (err) {
      console.error(err);
      alert('No se pudo eliminar el registro');
    }
  };

  const formatearCosto = (valor) =>
    Number(valor).toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });

  const formatearFecha = (valor) => {
    if (!valor) return '';
    const [anio, mes, dia] = valor.slice(0, 10).split('-');
    return `${dia}/${mes}/${anio}`;
  };

  const etiquetaVehiculo = (v) => `${v.patente} - ${v.marca} ${v.modelo} (${v.anio})`;

  return (
    <div style={{ padding: '24px', maxWidth: '1100px', margin: '0 auto' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          gap: '12px',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {onBack && (
            <button
              onClick={onBack}
              style={{
                border: '1px solid #a0cce8',
                background: 'transparent',
                borderRadius: '6px',
                padding: '6px 12px',
                cursor: 'pointer',
                fontSize: '13px',
              }}
            >
              ← Volver
            </button>
          )}
          <h2 style={{ margin: 0 }}>Vehículos - Mantenimiento</h2>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => setVista('vehiculos')} style={vista === 'vehiculos' ? btnTabActivo : btnTab}>
            Vehículos
          </button>
          <button onClick={() => setVista('historial')} style={vista === 'historial' ? btnTabActivo : btnTab}>
            Historial
          </button>
        </div>
      </div>

      {vista === 'vehiculos' ? (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
            <button onClick={abrirNuevoFlota} style={btnPrimario}>
              + Nuevo vehículo
            </button>
          </div>

          {errorFlota && <div style={{ color: '#b91c1c', marginBottom: '12px' }}>{errorFlota}</div>}

          {cargandoFlota ? (
            <p>Cargando...</p>
          ) : (
            <div style={{ overflowX: 'auto', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f3f4f6', textAlign: 'left' }}>
                    <th style={th}>Patente</th>
                    <th style={th}>Marca</th>
                    <th style={th}>Modelo</th>
                    <th style={th}>Año</th>
                    <th style={{ ...th, textAlign: 'center' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {flota.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ ...td, textAlign: 'center', color: '#6b7280' }}>
                        No hay vehículos cargados todavía.
                      </td>
                    </tr>
                  ) : (
                    flota.map((v) => (
                      <tr key={v.id} style={{ borderTop: '1px solid #e5e7eb' }}>
                        <td style={td}>{v.patente}</td>
                        <td style={td}>{v.marca}</td>
                        <td style={td}>{v.modelo}</td>
                        <td style={td}>{v.anio}</td>
                        <td style={{ ...td, textAlign: 'center' }}>
                          <button onClick={() => abrirEdicionFlota(v)} style={btnAccion}>
                            Editar
                          </button>
                          <button
                            onClick={() => handleEliminarFlota(v.id)}
                            style={{ ...btnAccion, color: '#b91c1c' }}
                          >
                            Eliminar
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
            <button onClick={abrirNuevo} style={btnPrimario}>
              + Nuevo registro
            </button>
          </div>

          {error && <div style={{ color: '#b91c1c', marginBottom: '12px' }}>{error}</div>}

          {cargando ? (
            <p>Cargando...</p>
          ) : (
            <div style={{ overflowX: 'auto', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f3f4f6', textAlign: 'left' }}>
                    <th style={th}>Vehículo</th>
                    <th style={th}>Chofer</th>
                    <th style={th}>Fecha</th>
                    <th style={th}>Taller</th>
                    <th style={{ ...th, textAlign: 'right' }}>Costo</th>
                    <th style={{ ...th, textAlign: 'center' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {registros.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ ...td, textAlign: 'center', color: '#6b7280' }}>
                        No hay registros cargados todavía.
                      </td>
                    </tr>
                  ) : (
                    registros.map((r) => (
                      <tr key={r.id} style={{ borderTop: '1px solid #e5e7eb' }}>
                        <td style={td}>{r.vehiculo}</td>
                        <td style={td}>{r.chofer}</td>
                        <td style={td}>{formatearFecha(r.fecha)}</td>
                        <td style={td}>{r.taller}</td>
                        <td style={{ ...td, textAlign: 'right' }}>{formatearCosto(r.costo)}</td>
                        <td style={{ ...td, textAlign: 'center' }}>
                          <button onClick={() => abrirEdicion(r)} style={btnAccion}>
                            Editar
                          </button>
                          <button
                            onClick={() => handleEliminar(r.id)}
                            style={{ ...btnAccion, color: '#b91c1c' }}
                          >
                            Eliminar
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Modal Vehículos */}
      {modalFlotaAbierto && (
        <div style={overlay}>
          <div style={modal}>
            <h3 style={{ marginTop: 0 }}>
              {editandoFlotaId ? 'Editar vehículo' : 'Nuevo vehículo'}
            </h3>

            <label style={label}>Patente</label>
            <input
              style={input}
              value={formFlota.patente}
              onChange={handleChangeFlota('patente')}
              placeholder="Ej: AB123CD"
            />

            <label style={label}>Marca</label>
            <input
              style={input}
              value={formFlota.marca}
              onChange={handleChangeFlota('marca')}
              placeholder="Ej: Ford"
            />

            <label style={label}>Modelo</label>
            <input
              style={input}
              value={formFlota.modelo}
              onChange={handleChangeFlota('modelo')}
              placeholder="Ej: Transit"
            />

            <label style={label}>Año</label>
            <input
              type="number"
              style={input}
              value={formFlota.anio}
              onChange={handleChangeFlota('anio')}
              placeholder="Ej: 2020"
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
              <button onClick={cerrarModalFlota} style={btnSecundario} disabled={guardandoFlota}>
                Cancelar
              </button>
              <button onClick={handleGuardarFlota} style={btnPrimario} disabled={guardandoFlota}>
                {guardandoFlota ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Historial */}
      {modalAbierto && (
        <div style={overlay}>
          <div style={modal}>
            <h3 style={{ marginTop: 0 }}>
              {editandoId ? 'Editar registro' : 'Nuevo registro'}
            </h3>

            <label style={label}>Vehículo</label>
            <select style={input} value={form.vehiculo} onChange={handleChange('vehiculo')}>
              <option value="">Seleccioná un vehículo</option>
              {flota.map((v) => (
                <option key={v.id} value={v.patente}>
                  {etiquetaVehiculo(v)}
                </option>
              ))}
            </select>

            <label style={label}>Chofer</label>
            <input
              style={input}
              value={form.chofer}
              onChange={handleChange('chofer')}
              placeholder="Nombre del chofer"
            />

            <label style={label}>Fecha</label>
            <input
              type="date"
              style={input}
              value={form.fecha}
              onChange={handleChange('fecha')}
            />

            <label style={label}>Taller</label>
            <input
              style={input}
              value={form.taller}
              onChange={handleChange('taller')}
              placeholder="Nombre del taller"
            />

            <label style={label}>Costo</label>
            <input
              type="number"
              style={input}
              value={form.costo}
              onChange={handleChange('costo')}
              placeholder="0.00"
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
              <button onClick={cerrarModal} style={btnSecundario} disabled={guardando}>
                Cancelar
              </button>
              <button onClick={handleGuardar} style={btnPrimario} disabled={guardando}>
                {guardando ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const th = { padding: '10px 14px', fontSize: '13px', color: '#374151' };
const td = { padding: '10px 14px', fontSize: '14px' };
const btnAccion = {
  border: 'none',
  background: 'transparent',
  color: '#2563eb',
  cursor: 'pointer',
  marginRight: '10px',
  fontSize: '13px',
};
const btnTab = {
  padding: '8px 16px',
  background: '#f3f4f6',
  color: '#111827',
  border: '1px solid #e5e7eb',
  borderRadius: '6px',
  cursor: 'pointer',
  fontWeight: 600,
};
const btnTabActivo = {
  ...btnTab,
  background: '#2563eb',
  color: '#fff',
  border: '1px solid #2563eb',
};
const overlay = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.4)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
};
const modal = {
  background: '#fff',
  borderRadius: '10px',
  padding: '24px',
  width: '380px',
  maxWidth: '90vw',
};
const label = { display: 'block', fontSize: '13px', color: '#374151', marginTop: '10px', marginBottom: '4px' };
const input = {
  width: '100%',
  padding: '8px 10px',
  border: '1px solid #d1d5db',
  borderRadius: '6px',
  fontSize: '14px',
  boxSizing: 'border-box',
};
const btnPrimario = {
  padding: '8px 16px',
  background: '#2563eb',
  color: '#fff',
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
  fontWeight: 600,
};
const btnSecundario = {
  padding: '8px 16px',
  background: '#f3f4f6',
  color: '#111827',
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
};
