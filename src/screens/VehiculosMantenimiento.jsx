import React, { useEffect, useState } from 'react';
import { authFetch } from '../utils/authFetch'; // ajustar path según donde tengas el helper

const API_URL = `${import.meta.env.VITE_API_URL}/vehiculos`; // ajustar variable de entorno si usás otro nombre

const vacio = { vehiculo: '', chofer: '', fecha: '', taller: '', costo: '' };

export default function VehiculosMantenimiento({ token }) {
  const [registros, setRegistros] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [form, setForm] = useState(vacio);
  const [guardando, setGuardando] = useState(false);

  const cargarRegistros = async () => {
    setCargando(true);
    setError('');
    try {
      const res = await authFetch(API_URL, {}, token);
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
    cargarRegistros();
  }, []);

  const abrirNuevo = () => {
    setEditandoId(null);
    setForm(vacio);
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
    setForm(vacio);
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
      const url = editandoId ? `${API_URL}/${editandoId}` : API_URL;
      const method = editandoId ? 'PUT' : 'POST';
      const res = await authFetch(
        url,
        {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...form, costo: Number(form.costo) }),
        },
        token
      );
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
      const res = await authFetch(`${API_URL}/${id}`, { method: 'DELETE' }, token);
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

  return (
    <div style={{ padding: '24px', maxWidth: '1100px', margin: '0 auto' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
        }}
      >
        <h2 style={{ margin: 0 }}>Vehículos - Mantenimiento</h2>
        <button
          onClick={abrirNuevo}
          style={{
            padding: '8px 16px',
            background: '#2563eb',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          + Nuevo registro
        </button>
      </div>

      {error && (
        <div style={{ color: '#b91c1c', marginBottom: '12px' }}>{error}</div>
      )}

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

      {modalAbierto && (
        <div style={overlay}>
          <div style={modal}>
            <h3 style={{ marginTop: 0 }}>
              {editandoId ? 'Editar registro' : 'Nuevo registro'}
            </h3>

            <label style={label}>Vehículo</label>
            <input
              style={input}
              value={form.vehiculo}
              onChange={handleChange('vehiculo')}
              placeholder="Ej: Ford Transit"
            />

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
