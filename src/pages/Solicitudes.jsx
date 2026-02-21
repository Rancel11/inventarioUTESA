import React, { useState, useEffect } from 'react';
import AdminLayout from '../components/AdminLayout';
import api from '../../server/config/api';
import './Solicitudes.css';

const EMPTY_FORM = { id_departamento: '', items: [] };

// ── Datos de ejemplo como fallback si la API falla o está vacía ──
const ARTICULOS_EJEMPLO = [
  { id: 1,  codigo: 'ART-001', nombre: 'Papel Bond A4 (Resma)',         stock_actual: 50  },
  { id: 2,  codigo: 'ART-002', nombre: 'Bolígrafos Azules (Caja x12)',  stock_actual: 30  },
  { id: 3,  codigo: 'ART-003', nombre: 'Carpetas Manila',               stock_actual: 100 },
  { id: 4,  codigo: 'ART-004', nombre: 'Tóner HP LaserJet',             stock_actual: 8   },
  { id: 5,  codigo: 'ART-005', nombre: 'Grapadora Estándar',            stock_actual: 15  },
  { id: 6,  codigo: 'ART-006', nombre: 'Post-it 3x3 (Pack x5)',         stock_actual: 40  },
  { id: 7,  codigo: 'ART-007', nombre: 'Marcadores Permanentes x4',     stock_actual: 25  },
  { id: 8,  codigo: 'ART-008', nombre: 'Papel Fotográfico A4 (50u)',    stock_actual: 12  },
  { id: 9,  codigo: 'ART-009', nombre: 'Sello Fechador',                stock_actual: 5   },
  { id: 10, codigo: 'ART-010', nombre: 'Archivadores AZ Grandes',       stock_actual: 20  },
];

const DEPARTAMENTOS_EJEMPLO = [
  { id: 1, nombre: 'Administración'   },
  { id: 2, nombre: 'Recursos Humanos' },
  { id: 3, nombre: 'TI'               },
  { id: 4, nombre: 'Almacén'          },
  { id: 5, nombre: 'Compras'          },
];

const Solicitudes = () => {
  const [solicitudes,     setSolicitudes]     = useState([]);
  const [articulos,       setArticulos]       = useState([]);
  const [departamentos,   setDepartamentos]   = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [showModal,       setShowModal]       = useState(false);
  const [showDetalle,     setShowDetalle]     = useState(false);
  const [solicitudActual, setSolicitudActual] = useState(null);
  const [loadingDetalle,  setLoadingDetalle]  = useState(false);
  const [formData,        setFormData]        = useState(EMPTY_FORM);
  const [itemActual,      setItemActual]      = useState({ id_producto: '', cantidad: 1 });
  const [submitting,      setSubmitting]      = useState(false);
  const [filtroEstado,    setFiltroEstado]    = useState('todos');

  const user          = JSON.parse(localStorage.getItem('user') || '{}');
  const esSolicitante = user.rol === 'solicitante';
  const esAdmin       = user.rol === 'admin';
  const esOperador    = user.rol === 'operador';

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);

    // Solicitudes
    try {
      const { data } = await api.get('/api/solicitudes');
      setSolicitudes(data || []);
    } catch (e) {
      console.error('Error cargando solicitudes:', e);
      setSolicitudes([]);
    }

    // Artículos — con fallback a datos de ejemplo
    try {
      const { data } = await api.get('/api/articulos');
      setArticulos(Array.isArray(data) && data.length > 0 ? data : ARTICULOS_EJEMPLO);
    } catch (e) {
      console.warn('Artículos no disponibles, usando ejemplos');
      setArticulos(ARTICULOS_EJEMPLO);
    }

    // Departamentos — con fallback
    try {
      const { data } = await api.get('/api/departamentos');
      setDepartamentos(Array.isArray(data) && data.length > 0 ? data : DEPARTAMENTOS_EJEMPLO);
    } catch (e) {
      console.warn('Departamentos no disponibles, usando ejemplos');
      setDepartamentos(DEPARTAMENTOS_EJEMPLO);
    }

    setLoading(false);
  };

  // ── Ver detalle: hace fetch del endpoint /:id para traer detalles completos ──
  const verDetalle = async (s) => {
    setShowDetalle(true);
    setLoadingDetalle(true);
    setSolicitudActual({ ...s, detalles: [] }); // datos básicos inmediatos
    try {
      const { data } = await api.get(`/api/solicitudes/${s.id}`);
      setSolicitudActual(data);
    } catch (e) {
      console.error('Error cargando detalle:', e);
    } finally {
      setLoadingDetalle(false);
    }
  };

  // ── Agregar ítem ──
  const agregarItem = () => {
    if (!itemActual.id_producto || itemActual.cantidad < 1) return;
    const art = articulos.find(a => a.id === parseInt(itemActual.id_producto));
    if (!art) return;

    const existe = formData.items.find(i => i.id_producto === parseInt(itemActual.id_producto));
    if (existe) {
      setFormData(prev => ({
        ...prev,
        items: prev.items.map(i =>
          i.id_producto === parseInt(itemActual.id_producto)
            ? { ...i, cantidad: i.cantidad + parseInt(itemActual.cantidad) }
            : i
        ),
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        items: [...prev.items, {
          id_producto: parseInt(itemActual.id_producto),
          cantidad:    parseInt(itemActual.cantidad),
          nombre:      art.nombre,
          codigo:      art.codigo,
        }],
      }));
    }
    setItemActual({ id_producto: '', cantidad: 1 });
  };

  const quitarItem = (id_producto) =>
    setFormData(prev => ({ ...prev, items: prev.items.filter(i => i.id_producto !== id_producto) }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.id_departamento) { alert('Selecciona un departamento'); return; }
    if (formData.items.length === 0) { alert('Agrega al menos un artículo'); return; }
    setSubmitting(true);
    try {
      await api.post('/api/solicitudes', {
        id_departamento: parseInt(formData.id_departamento),
        items: formData.items.map(i => ({ id_producto: i.id_producto, cantidad: i.cantidad })),
      });
      closeModal();
      fetchAll();
    } catch (error) {
      alert(error.response?.data?.message || 'Error al enviar solicitud');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCambiarEstado = async (id, nuevoEstado) => {
    try {
      await api.put(`/api/solicitudes/${id}/estado`, { estado: nuevoEstado });
      setSolicitudes(prev => prev.map(s => s.id === id ? { ...s, estado: nuevoEstado } : s));
      if (solicitudActual?.id === id)
        setSolicitudActual(prev => ({ ...prev, estado: nuevoEstado }));
    } catch (e) {
      alert('Error al actualizar estado');
      fetchAll();
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setFormData(EMPTY_FORM);
    setItemActual({ id_producto: '', cantidad: 1 });
  };

  const estadoBadge = (estado) => ({
    pendiente:  { label: 'Pendiente',  cls: 'badge-pendiente',  icon: 'hourglass_empty' },
    aprobado:   { label: 'Aprobado',   cls: 'badge-aprobado',   icon: 'check_circle'    },
    rechazado:  { label: 'Rechazado',  cls: 'badge-rechazado',  icon: 'cancel'          },
    completado: { label: 'Completado', cls: 'badge-completado', icon: 'task_alt'        },
  }[estado] || { label: 'Pendiente', cls: 'badge-pendiente', icon: 'hourglass_empty' });

  const solicitudesBase = esSolicitante
    ? solicitudes.filter(s => s.id_usuario === user.id)
    : solicitudes;

  const solicitudesFiltradas = filtroEstado === 'todos'
    ? solicitudesBase
    : solicitudesBase.filter(s => s.estado === filtroEstado);

  const stats = {
    total:      solicitudesBase.length,
    pendiente:  solicitudesBase.filter(s => s.estado === 'pendiente').length,
    aprobado:   solicitudesBase.filter(s => s.estado === 'aprobado').length,
    completado: solicitudesBase.filter(s => s.estado === 'completado').length,
  };

  // Artículo seleccionado en el formulario
  const artSeleccionado = articulos.find(a => a.id === parseInt(itemActual.id_producto));

  if (loading) return (
    <AdminLayout title="Solicitudes">
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Cargando solicitudes...</p>
      </div>
    </AdminLayout>
  );

  return (
    <AdminLayout title="Solicitudes">
      <div className="solicitudes-page">

        {/* ── Header ── */}
        <div className="sol-page-header">
          <p className="sol-subtitle">
            {esSolicitante
              ? 'Gestiona tus solicitudes de materiales'
              : 'Revisa y gestiona todas las solicitudes del sistema'}
          </p>
          {esSolicitante && (
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>
              <span className="material-icons">add_circle</span>
              Nueva Solicitud
            </button>
          )}
        </div>

        {/* ── Stats Cards ── */}
        <div className="sol-stats-grid">
          {[
            { key: 'total',      label: 'Total',       icon: 'description',    cls: 'total'      },
            { key: 'pendiente',  label: 'Pendientes',  icon: 'hourglass_empty',cls: 'pendiente'  },
            { key: 'aprobado',   label: 'Aprobadas',   icon: 'check_circle',   cls: 'aprobado'   },
            { key: 'completado', label: 'Completadas', icon: 'task_alt',       cls: 'completado' },
          ].map(({ key, label, icon, cls }) => (
            <div
              key={key}
              className={`sol-stat-card ${cls} ${filtroEstado === key ? 'active-filter' : ''}`}
              onClick={() => key !== 'total' && setFiltroEstado(filtroEstado === key ? 'todos' : key)}
              style={{ cursor: key !== 'total' ? 'pointer' : 'default' }}
            >
              <span className="material-icons">{icon}</span>
              <div><h3>{stats[key]}</h3><p>{label}</p></div>
            </div>
          ))}
        </div>

        {/* ── Filtro activo ── */}
        {filtroEstado !== 'todos' && (
          <div className="filtro-activo">
            <span className="material-icons">filter_list</span>
            Filtrando por: <strong>{estadoBadge(filtroEstado).label}</strong>
            <button onClick={() => setFiltroEstado('todos')}>
              <span className="material-icons">close</span>
            </button>
          </div>
        )}

        {/* ── Tabla ── */}
        <div className="sol-table-container">
          <table className="sol-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Solicitante</th>
                <th>Departamento</th>
                <th>Estado</th>
                <th>Fecha</th>
                <th>Artículos</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {solicitudesFiltradas.length === 0 ? (
                <tr>
                  <td colSpan="7">
                    <div className="empty-state">
                      <span className="material-icons">inbox</span>
                      <p>
                        {filtroEstado !== 'todos'
                          ? `No hay solicitudes "${estadoBadge(filtroEstado).label}"`
                          : 'No hay solicitudes registradas'}
                      </p>
                      {esSolicitante && filtroEstado === 'todos' && (
                        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                          Crear primera solicitud
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : solicitudesFiltradas.map((s) => {
                const est = estadoBadge(s.estado);
                return (
                  <tr key={s.id} className={`sol-row ${s.estado}`}>
                    <td><span className="sol-id">#{s.id}</span></td>
                    <td>
                      <div className="sol-user-cell">
                        <div className="sol-avatar">{(s.nombre_usuario || 'U').charAt(0).toUpperCase()}</div>
                        <span>{s.nombre_usuario || 'Usuario'}</span>
                      </div>
                    </td>
                    <td>{s.nombre_departamento || '—'}</td>
                    <td>
                      <span className={`sol-badge ${est.cls}`}>
                        <span className="material-icons">{est.icon}</span>
                        {est.label}
                      </span>
                    </td>
                    <td>
                      {new Date(s.fecha_creacion).toLocaleDateString('es-ES', {
                        day: '2-digit', month: '2-digit', year: 'numeric',
                      })}
                    </td>
                    <td>
                      <span className="sol-count-badge">
                        {s.cantidad_articulos || 0} ítem{s.cantidad_articulos !== 1 ? 's' : ''}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button className="btn-icon" onClick={() => verDetalle(s)} title="Ver detalle">
                          <span className="material-icons">visibility</span>
                        </button>
                        {esAdmin && s.estado === 'pendiente' && (
                          <>
                            <button className="btn-icon btn-success" onClick={() => handleCambiarEstado(s.id, 'aprobado')} title="Aprobar">
                              <span className="material-icons">check</span>
                            </button>
                            <button className="btn-icon btn-danger" onClick={() => handleCambiarEstado(s.id, 'rechazado')} title="Rechazar">
                              <span className="material-icons">close</span>
                            </button>
                          </>
                        )}
                        {esOperador && s.estado === 'aprobado' && (
                          <button className="btn-icon btn-completar" onClick={() => handleCambiarEstado(s.id, 'completado')} title="Completar">
                            <span className="material-icons">task_alt</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* ════════════════════════════════
            MODAL: Nueva Solicitud
            ════════════════════════════════ */}
        {showModal && (
          <div className="modal-overlay" onClick={closeModal}>
            <div className="modal-content modal-lg" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h2><span className="material-icons">add_circle</span>Nueva Solicitud</h2>
                <button className="close-btn" onClick={closeModal}>
                  <span className="material-icons">close</span>
                </button>
              </div>

              <div className="modal-body">
                <form onSubmit={handleSubmit} id="solicitudForm">

                  {/* ── Paso 1: Departamento ── */}
                  <div className="sol-form-section">
                    <div className="sol-form-section-title">
                      <span className="sol-step">1</span>
                      Selecciona el Departamento
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <select
                        value={formData.id_departamento}
                        onChange={e => setFormData({ ...formData, id_departamento: e.target.value })}
                        required
                        className="form-select"
                      >
                        <option value="">— Seleccionar departamento —</option>
                        {departamentos.map(d => (
                          <option key={d.id} value={d.id}>{d.nombre}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* ── Paso 2: Agregar artículos ── */}
                  <div className="sol-form-section">
                    <div className="sol-form-section-title">
                      <span className="sol-step">2</span>
                      Agrega los Artículos
                      <span style={{ fontSize: 12, fontWeight: 400, color: '#6c757d', marginLeft: 8 }}>
                        ({articulos.length} disponibles)
                      </span>
                    </div>

                    <div className="sol-item-row">
                      <select
                        value={itemActual.id_producto}
                        onChange={e => setItemActual({ ...itemActual, id_producto: e.target.value })}
                        className="form-select"
                      >
                        <option value="">— Seleccionar artículo —</option>
                        {articulos.map(a => (
                          <option key={a.id} value={a.id} disabled={a.stock_actual === 0}>
                            [{a.codigo}] {a.nombre}
                            {a.stock_actual === 0 ? ' ✗ Sin stock' : ` — Stock: ${a.stock_actual}`}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min="1"
                        max={artSeleccionado?.stock_actual || 9999}
                        value={itemActual.cantidad}
                        onChange={e => setItemActual({ ...itemActual, cantidad: Math.max(1, parseInt(e.target.value) || 1) })}
                        placeholder="Cant."
                        className="input-cantidad"
                      />
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={agregarItem}
                        disabled={!itemActual.id_producto}
                      >
                        <span className="material-icons">add</span>Agregar
                      </button>
                    </div>

                    {/* Info del artículo seleccionado */}
                    {artSeleccionado && (
                      <div className="art-info-preview">
                        <span className="material-icons">info</span>
                        <strong>{artSeleccionado.nombre}</strong> —
                        Código: <code>{artSeleccionado.codigo}</code> —
                        Stock disponible: <strong>{artSeleccionado.stock_actual}</strong>
                      </div>
                    )}
                  </div>

                  {/* ── Lista de ítems ── */}
                  {formData.items.length > 0 ? (
                    <div className="sol-form-section">
                      <div className="sol-form-section-title">
                        <span className="sol-step">✓</span>
                        Artículos en la Solicitud
                        <span className="sol-count-badge" style={{ marginLeft: 8 }}>
                          {formData.items.length}
                        </span>
                      </div>
                      <table className="items-mini-table">
                        <thead>
                          <tr>
                            <th>Código</th>
                            <th>Artículo</th>
                            <th>Cantidad</th>
                            <th></th>
                          </tr>
                        </thead>
                        <tbody>
                          {formData.items.map(item => (
                            <tr key={item.id_producto}>
                              <td><code>{item.codigo}</code></td>
                              <td>{item.nombre}</td>
                              <td><strong>{item.cantidad}</strong></td>
                              <td>
                                <button type="button" className="btn-icon btn-danger" onClick={() => quitarItem(item.id_producto)} title="Quitar">
                                  <span className="material-icons">delete</span>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="sol-items-empty">
                      <span className="material-icons">shopping_cart</span>
                      <p>Aún no has agregado artículos</p>
                    </div>
                  )}

                </form>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancelar</button>
                <button
                  type="submit"
                  form="solicitudForm"
                  className="btn btn-primary"
                  disabled={submitting || formData.items.length === 0 || !formData.id_departamento}
                >
                  {submitting
                    ? <><div className="spinner-sm"></div>Enviando...</>
                    : <><span className="material-icons">send</span>Enviar Solicitud</>
                  }
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════
            MODAL: Ver Detalle
            ════════════════════════════════ */}
        {showDetalle && solicitudActual && (
          <div className="modal-overlay" onClick={() => setShowDetalle(false)}>
            <div className="modal-content modal-lg" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h2>
                  <span className="material-icons">description</span>
                  Solicitud #{solicitudActual.id}
                  <span className={`sol-badge ${estadoBadge(solicitudActual.estado).cls}`} style={{ marginLeft: 12, fontSize: 13 }}>
                    <span className="material-icons">{estadoBadge(solicitudActual.estado).icon}</span>
                    {estadoBadge(solicitudActual.estado).label}
                  </span>
                </h2>
                <button className="close-btn" onClick={() => setShowDetalle(false)}>
                  <span className="material-icons">close</span>
                </button>
              </div>

              <div className="modal-body">
                {/* Info general */}
                <div className="detalle-header-info">
                  <div className="detalle-info-item">
                    <span className="material-icons">person</span>
                    <div>
                      <small>Solicitante</small>
                      <strong>{solicitudActual.nombre_usuario || '—'}</strong>
                    </div>
                  </div>
                  <div className="detalle-info-item">
                    <span className="material-icons">apartment</span>
                    <div>
                      <small>Departamento</small>
                      <strong>{solicitudActual.nombre_departamento || '—'}</strong>
                    </div>
                  </div>
                  <div className="detalle-info-item">
                    <span className="material-icons">calendar_today</span>
                    <div>
                      <small>Fecha</small>
                      <strong>
                        {new Date(solicitudActual.fecha_creacion).toLocaleDateString('es-ES', {
                          day: '2-digit', month: 'long', year: 'numeric',
                        })}
                      </strong>
                    </div>
                  </div>
                  <div className="detalle-info-item">
                    <span className="material-icons">tag</span>
                    <div>
                      <small>ID</small>
                      <strong>#{solicitudActual.id}</strong>
                    </div>
                  </div>
                </div>

                {/* Artículos */}
                <div className="detalle-section-title">
                  <span className="material-icons">inventory</span>
                  Artículos Solicitados
                </div>

                {loadingDetalle ? (
                  <div style={{ textAlign: 'center', padding: '24px', color: '#6c757d' }}>
                    <div className="spinner" style={{ margin: '0 auto 10px' }}></div>
                    <p>Cargando artículos...</p>
                  </div>
                ) : (solicitudActual.detalles || []).length === 0 ? (
                  <div className="sol-items-empty">
                    <span className="material-icons">inventory_2</span>
                    <p>No se encontraron artículos en esta solicitud</p>
                  </div>
                ) : (
                  <table className="items-mini-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Código</th>
                        <th>Artículo</th>
                        <th>Cantidad</th>
                      </tr>
                    </thead>
                    <tbody>
                      {solicitudActual.detalles.map((d, i) => (
                        <tr key={d.id || i}>
                          <td>{i + 1}</td>
                          <td><code>{d.codigo || '—'}</code></td>
                          <td>{d.nombre_producto || `Producto #${d.id_producto}`}</td>
                          <td><strong>{d.cantidad}</strong></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {/* Acciones */}
                {((esAdmin && solicitudActual.estado === 'pendiente') ||
                  (esOperador && solicitudActual.estado === 'aprobado')) && (
                  <div className="detalle-actions">
                    {esAdmin && solicitudActual.estado === 'pendiente' && (
                      <>
                        <button className="btn btn-success" onClick={() => handleCambiarEstado(solicitudActual.id, 'aprobado')}>
                          <span className="material-icons">check_circle</span>Aprobar Solicitud
                        </button>
                        <button className="btn btn-danger" onClick={() => handleCambiarEstado(solicitudActual.id, 'rechazado')}>
                          <span className="material-icons">cancel</span>Rechazar
                        </button>
                      </>
                    )}
                    {esOperador && solicitudActual.estado === 'aprobado' && (
                      <button className="btn btn-completar" onClick={() => handleCambiarEstado(solicitudActual.id, 'completado')}>
                        <span className="material-icons">task_alt</span>Marcar como Completado
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </AdminLayout>
  );
};

export default Solicitudes;