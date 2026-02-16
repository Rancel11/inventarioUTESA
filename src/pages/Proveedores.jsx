import React, { useState, useEffect } from 'react';
import AdminLayout from '../components/AdminLayout';
import api from '../../server/config/api';
import './Proveedores.css';

const EMPTY_FORM = {
  codigo:'', nombre:'', contacto:'', telefono:'',
  email:'', direccion:'', ciudad:'', pais:'Dominican Republic', notas:'',
};

const EMPTY_COMPRA = { proveedor_id:'', numero_orden:'', observaciones:'', items:[] };

const Proveedores = () => {
  const [proveedores,   setProveedores]   = useState([]);
  const [articulos,     setArticulos]     = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [searchTerm,    setSearchTerm]    = useState('');

  // Modales
  const [showFormModal,    setShowFormModal]    = useState(false);
  const [showHistorial,    setShowHistorial]    = useState(false);
  const [showCompraModal,  setShowCompraModal]  = useState(false);

  const [editingProveedor, setEditingProveedor] = useState(null);
  const [selectedProveedor,setSelectedProveedor]= useState(null);
  const [historial,        setHistorial]        = useState([]);
  const [formData,         setFormData]         = useState(EMPTY_FORM);
  const [compraData,       setCompraData]       = useState(EMPTY_COMPRA);
  const [compraItems,      setCompraItems]      = useState([{ articulo_id:'', cantidad:'' }]);

  const permisos = JSON.parse(localStorage.getItem('user') || '{}').permisos ?? [];
  const can = (p) => permisos.includes(p);

  useEffect(() => { fetchProveedores(); fetchArticulos(); }, []);

  const fetchProveedores = async () => {
    try {
      const { data } = await api.get('/api/proveedores');
      setProveedores(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const fetchArticulos = async () => {
    try {
      const { data } = await api.get('/api/articulos');
      setArticulos(data);
    } catch (e) { console.error(e); }
  };

  const handleSearch = async (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    if (!value.trim()) { fetchProveedores(); return; }
    try {
      const { data } = await api.get(`/api/proveedores/search?q=${value}`);
      setProveedores(data);
    } catch (e) { console.error(e); }
  };

  const handleInputChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      editingProveedor
        ? await api.put(`/api/proveedores/${editingProveedor.id}`, formData)
        : await api.post('/api/proveedores', formData);
      closeFormModal();
      fetchProveedores();
    } catch (error) {
      alert(error.response?.data?.message || 'Error al guardar proveedor');
    }
  };

  const handleEdit = (prov) => {
    setEditingProveedor(prov);
    setFormData({
      codigo:    prov.codigo,
      nombre:    prov.nombre,
      contacto:  prov.contacto  || '',
      telefono:  prov.telefono  || '',
      email:     prov.email     || '',
      direccion: prov.direccion || '',
      ciudad:    prov.ciudad    || '',
      pais:      prov.pais      || 'Dominican Republic',
      notas:     prov.notas     || '',
    });
    setShowFormModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar este proveedor?')) return;
    try {
      await api.delete(`/api/proveedores/${id}`);
      fetchProveedores();
    } catch (e) { alert('Error al eliminar proveedor'); }
  };

  const closeFormModal = () => {
    setShowFormModal(false);
    setEditingProveedor(null);
    setFormData(EMPTY_FORM);
  };

  // ── Historial ──────────────────────────────────────
  const openHistorial = async (prov) => {
    setSelectedProveedor(prov);
    try {
      const { data } = await api.get(`/api/proveedores/${prov.id}/compras`);
      setHistorial(data);
    } catch (e) { console.error(e); }
    setShowHistorial(true);
  };

  const handleUpdateEstado = async (compraId, estado) => {
    try {
      await api.patch(`/api/proveedores/compras/${compraId}/estado`, { estado });
      const { data } = await api.get(`/api/proveedores/${selectedProveedor.id}/compras`);
      setHistorial(data);
      fetchProveedores();
    } catch (e) {
      alert(e.response?.data?.message || 'Error al actualizar estado');
    }
  };

  // ── Nueva Compra ───────────────────────────────────
  const openCompraModal = (prov) => {
    setSelectedProveedor(prov);
    setCompraData({ ...EMPTY_COMPRA, proveedor_id: prov.id });
    setCompraItems([{ articulo_id:'', cantidad:'' }]);
    setShowCompraModal(true);
  };

  const handleItemChange = (idx, field, value) => {
    const updated = [...compraItems];
    updated[idx] = { ...updated[idx], [field]: value };
    setCompraItems(updated);
  };

  const addItem    = () => setCompraItems([...compraItems, { articulo_id:'', cantidad:'' }]);
  const removeItem = (idx) => setCompraItems(compraItems.filter((_, i) => i !== idx));

  const handleCompraSubmit = async (e) => {
    e.preventDefault();
    const items = compraItems.filter(i => i.articulo_id && i.cantidad > 0);
    if (items.length === 0) { alert('Agrega al menos un artículo con cantidad válida'); return; }
    try {
      await api.post('/api/proveedores/compras', {
        ...compraData, items,
      });
      setShowCompraModal(false);
      if (showHistorial) {
        const { data } = await api.get(`/api/proveedores/${selectedProveedor.id}/compras`);
        setHistorial(data);
      }
      fetchProveedores();
    } catch (error) {
      alert(error.response?.data?.message || 'Error al crear orden de compra');
    }
  };

  const fmtDate = (d) => d
    ? new Date(d).toLocaleDateString('es-ES',{ day:'2-digit',month:'2-digit',year:'numeric' })
    : '—';

  const estadoBadge = (e) => {
    const map = { pendiente:['badge-pendiente','Pendiente'], recibida:['badge-recibida','Recibida'], cancelada:['badge-cancelada','Cancelada'] };
    const [cls, label] = map[e] ?? ['',''];
    return <span className={`badge-estado ${cls}`}>{label}</span>;
  };

  if (loading) return (
    <div className="loading-container">
      <div className="spinner"></div><p>Cargando proveedores...</p>
    </div>
  );

  return (
    <AdminLayout title="Gestión de Proveedores">
      <div className="proveedores-page">

        {/* ── Encabezado ── */}
        <div className="page-header">
          <p style={{ fontSize:16, color:'#6c757d', margin:0 }}>
            Registra y administra los proveedores de tu almacén
          </p>
          {can('proveedores:create') && (
            <button className="btn btn-primary" onClick={() => setShowFormModal(true)}>
              <span className="material-icons">add</span>Nuevo Proveedor
            </button>
          )}
        </div>

        {/* ── Búsqueda ── */}
        <div className="filters-section">
          <div className="search-box-large">
            <span className="material-icons">search</span>
            <input type="text" placeholder="Buscar por nombre, código o ciudad..."
              value={searchTerm} onChange={handleSearch} />
          </div>
        </div>

        {/* ── Tabla ── */}
        <div className="proveedores-table-container">
          <table className="proveedores-table">
            <thead>
              <tr>
                <th>Código</th><th>Nombre</th><th>Contacto</th>
                <th>Teléfono</th><th>Ciudad</th>
                <th>Artículos</th><th>Compras</th><th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {proveedores.length === 0 ? (
                <tr><td colSpan="8">
                  <div className="empty-state">
                    <span className="material-icons">store</span>
                    <p>No hay proveedores registrados</p>
                  </div>
                </td></tr>
              ) : proveedores.map((prov) => (
                <tr key={prov.id}>
                  <td><strong>{prov.codigo}</strong></td>
                  <td>
                    <div className="proveedor-nombre-cell">
                      <span>{prov.nombre}</span>
                      {prov.email && <small className="text-muted">{prov.email}</small>}
                    </div>
                  </td>
                  <td>{prov.contacto || '—'}</td>
                  <td>{prov.telefono || '—'}</td>
                  <td>{prov.ciudad   || '—'}</td>
                  <td>
                    <span className="count-badge blue">{prov.total_articulos || 0}</span>
                  </td>
                  <td>
                    <button className="btn-link" onClick={() => openHistorial(prov)}>
                      {prov.total_compras || 0} órdenes
                    </button>
                  </td>
                  <td>
                    <div className="action-buttons">
                      {can('compras:create') && (
                        <button className="btn-icon btn-success" onClick={() => openCompraModal(prov)} title="Nueva Compra">
                          <span className="material-icons">shopping_cart</span>
                        </button>
                      )}
                      {can('proveedores:update') && (
                        <button className="btn-icon" onClick={() => handleEdit(prov)} title="Editar">
                          <span className="material-icons">edit</span>
                        </button>
                      )}
                      {can('proveedores:delete') && (
                        <button className="btn-icon btn-danger" onClick={() => handleDelete(prov.id)} title="Eliminar">
                          <span className="material-icons">delete</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ════════════════════════════════════
            MODAL: Crear / Editar Proveedor
            ════════════════════════════════════ */}
        {showFormModal && (
          <div className="modal-overlay" onClick={closeFormModal}>
            <div className="modal-content modal-lg" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>{editingProveedor ? 'Editar Proveedor' : 'Nuevo Proveedor'}</h2>
                <button className="close-btn" onClick={closeFormModal}>
                  <span className="material-icons">close</span>
                </button>
              </div>
              <div className="modal-body">
                <form onSubmit={handleSubmit} id="proveedorForm">
                  <div className="form-grid">
                    <div className="form-group">
                      <label>Código *</label>
                      <input type="text" name="codigo" value={formData.codigo}
                        onChange={handleInputChange} required disabled={!!editingProveedor} />
                    </div>
                    <div className="form-group">
                      <label>Nombre *</label>
                      <input type="text" name="nombre" value={formData.nombre}
                        onChange={handleInputChange} required />
                    </div>
                    <div className="form-group">
                      <label>Persona de Contacto</label>
                      <input type="text" name="contacto" value={formData.contacto}
                        onChange={handleInputChange} />
                    </div>
                    <div className="form-group">
                      <label>Teléfono</label>
                      <input type="text" name="telefono" value={formData.telefono}
                        onChange={handleInputChange} />
                    </div>
                    <div className="form-group">
                      <label>Email</label>
                      <input type="email" name="email" value={formData.email}
                        onChange={handleInputChange} />
                    </div>
                    <div className="form-group">
                      <label>Ciudad</label>
                      <input type="text" name="ciudad" value={formData.ciudad}
                        onChange={handleInputChange} />
                    </div>
                    <div className="form-group full-width">
                      <label>Dirección</label>
                      <input type="text" name="direccion" value={formData.direccion}
                        onChange={handleInputChange} />
                    </div>
                    <div className="form-group full-width">
                      <label>Notas</label>
                      <textarea name="notas" value={formData.notas}
                        onChange={handleInputChange} rows="3" />
                    </div>
                  </div>
                </form>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeFormModal}>Cancelar</button>
                <button type="submit" form="proveedorForm" className="btn btn-primary">
                  {editingProveedor ? 'Actualizar' : 'Crear'} Proveedor
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════
            MODAL: Historial de Compras
            ════════════════════════════════════ */}
        {showHistorial && selectedProveedor && (
          <div className="modal-overlay" onClick={() => setShowHistorial(false)}>
            <div className="modal-content modal-xl" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div>
                  <h2>Historial de Compras</h2>
                  <small style={{ color:'rgba(255,255,255,0.8)' }}>{selectedProveedor.nombre}</small>
                </div>
                <div style={{ display:'flex', gap:10 }}>
                  {can('compras:create') && (
                    <button className="btn btn-secondary-light" onClick={() => openCompraModal(selectedProveedor)}>
                      <span className="material-icons">add</span>Nueva Orden
                    </button>
                  )}
                  <button className="close-btn" onClick={() => setShowHistorial(false)}>
                    <span className="material-icons">close</span>
                  </button>
                </div>
              </div>
              <div className="modal-body">
                {historial.length === 0 ? (
                  <div className="empty-state">
                    <span className="material-icons">receipt_long</span>
                    <p>No hay órdenes de compra registradas</p>
                  </div>
                ) : (
                  <table className="historial-table">
                    <thead>
                      <tr>
                        <th># Orden</th><th>Estado</th><th>Items</th>
                        <th>Unidades</th><th>Fecha Orden</th>
                        <th>Fecha Recepción</th><th>Registrado por</th>
                        {can('compras:update') && <th>Acciones</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {historial.map((c) => (
                        <tr key={c.id}>
                          <td><strong>{c.numero_orden}</strong></td>
                          <td>{estadoBadge(c.estado)}</td>
                          <td>{c.total_items   || 0}</td>
                          <td>{c.total_unidades|| 0}</td>
                          <td>{fmtDate(c.fecha_orden)}</td>
                          <td>{fmtDate(c.fecha_recepcion)}</td>
                          <td>{c.registrado_por}</td>
                          {can('compras:update') && (
                            <td>
                              {c.estado === 'pendiente' && (
                                <div className="action-buttons">
                                  <button className="btn btn-sm btn-success"
                                    onClick={() => handleUpdateEstado(c.id, 'recibida')}>
                                    <span className="material-icons" style={{fontSize:16}}>check</span> Recibida
                                  </button>
                                  <button className="btn btn-sm btn-danger"
                                    onClick={() => handleUpdateEstado(c.id, 'cancelada')}>
                                    Cancelar
                                  </button>
                                </div>
                              )}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════
            MODAL: Nueva Orden de Compra
            ════════════════════════════════════ */}
        {showCompraModal && (
          <div className="modal-overlay" style={{ zIndex:3000 }} onClick={() => setShowCompraModal(false)}>
            <div className="modal-content modal-lg" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Nueva Orden de Compra</h2>
                <button className="close-btn" onClick={() => setShowCompraModal(false)}>
                  <span className="material-icons">close</span>
                </button>
              </div>
              <div className="modal-body">
                <form onSubmit={handleCompraSubmit} id="compraForm">
                  <div className="form-grid">
                    <div className="form-group">
                      <label>Proveedor</label>
                      <input type="text" value={selectedProveedor?.nombre} disabled />
                    </div>
                    <div className="form-group">
                      <label># Orden *</label>
                      <input type="text" value={compraData.numero_orden}
                        onChange={(e) => setCompraData({ ...compraData, numero_orden: e.target.value })}
                        placeholder="OC-2024-001" required />
                    </div>
                    <div className="form-group full-width">
                      <label>Observaciones</label>
                      <textarea value={compraData.observaciones} rows="2"
                        onChange={(e) => setCompraData({ ...compraData, observaciones: e.target.value })} />
                    </div>
                  </div>

                  <div className="items-section">
                    <div className="items-header">
                      <h3>Artículos</h3>
                      <button type="button" className="btn btn-sm btn-secondary" onClick={addItem}>
                        <span className="material-icons">add</span>Agregar Artículo
                      </button>
                    </div>
                    {compraItems.map((item, idx) => (
                      <div className="item-row" key={idx}>
                        <select className="form-select" value={item.articulo_id}
                          onChange={(e) => handleItemChange(idx, 'articulo_id', e.target.value)}>
                          <option value="">— Selecciona artículo —</option>
                          {articulos.map((a) => (
                            <option key={a.id} value={a.id}>{a.nombre} ({a.codigo})</option>
                          ))}
                        </select>
                        <input type="number" placeholder="Cantidad" min="1" value={item.cantidad}
                          onChange={(e) => handleItemChange(idx, 'cantidad', e.target.value)} />
                        {compraItems.length > 1 && (
                          <button type="button" className="btn-icon btn-danger" onClick={() => removeItem(idx)}>
                            <span className="material-icons">remove_circle</span>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </form>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCompraModal(false)}>
                  Cancelar
                </button>
                <button type="submit" form="compraForm" className="btn btn-primary">
                  Crear Orden de Compra
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </AdminLayout>
  );
};

export default Proveedores;