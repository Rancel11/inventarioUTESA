import React, { useState, useEffect } from 'react';
import AdminLayout from '../components/AdminLayout';
import api from '../../server/config/api';
import './Articulos.css';

const CATEGORIAS = [
  'Alimentos y Bebidas','Artículos de Limpieza','Artículos de Oficina',
  'Electrónica','Ferretería y Herramientas','Farmacéuticos',
  'Indumentaria y Textiles','Insumos Médicos','Lubricantes y Químicos',
  'Maquinaria y Repuestos','Materiales de Construcción','Materias Primas',
  'Papelería','Productos de Higiene','Utensilios y Menaje','Otro',
];

const EMPTY_FORM = {
  codigo:'', nombre:'', descripcion:'', categoria:'',
  proveedor_id:'', fecha_caducidad:'',
  stock_inicial:'', stock_minimo:'', stock_maximo:'', ubicacion:'',
};

const Articulos = () => {
  const [articulos,   setArticulos]   = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [searchTerm,  setSearchTerm]  = useState('');
  const [showModal,   setShowModal]   = useState(false);
  const [editingArticulo, setEditingArticulo] = useState(null);
  const [formData,    setFormData]    = useState(EMPTY_FORM);

  const permisos = JSON.parse(localStorage.getItem('user') || '{}').permisos ?? [];
  const can = (p) => permisos.includes(p);

  useEffect(() => {
    fetchArticulos();
    fetchProveedores();
  }, []);

  const fetchArticulos = async () => {
    try {
      const { data } = await api.get('/api/articulos');
      setArticulos(data);
    } catch (e) { 
      console.error('Error al cargar artículos:', e); 
      alert('Error al cargar artículos');
    }
    finally { setLoading(false); }
  };

  const fetchProveedores = async () => {
    try {
      const { data } = await api.get('/api/proveedores');
      setProveedores(data);
    } catch (e) { 
      console.error('Error al cargar proveedores:', e); 
    }
  };

  const handleSearch = async (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    if (!value.trim()) { fetchArticulos(); return; }
    try {
      const { data } = await api.get(`/api/articulos/search?q=${value}`);
      setArticulos(data);
    } catch (e) { console.error(e); }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Preparar datos para enviar
    const dataToSend = {
      codigo: formData.codigo.trim(),
      nombre: formData.nombre.trim(),
      categoria: formData.categoria,
    };
    
    // Campos opcionales de texto
    if (formData.descripcion && formData.descripcion.trim()) {
      dataToSend.descripcion = formData.descripcion.trim();
    }
    
    if (formData.ubicacion && formData.ubicacion.trim()) {
      dataToSend.ubicacion = formData.ubicacion.trim();
    }
    
    // Proveedor
    if (formData.proveedor_id && formData.proveedor_id !== '') {
      dataToSend.proveedor_id = parseInt(formData.proveedor_id);
    }
    
    // Fecha de caducidad
    if (formData.fecha_caducidad && formData.fecha_caducidad.trim()) {
      dataToSend.fecha_caducidad = formData.fecha_caducidad;
    }
    
    // Stock inicial (solo para nuevos artículos)
    if (!editingArticulo && formData.stock_inicial && formData.stock_inicial !== '') {
      dataToSend.stock_inicial = parseInt(formData.stock_inicial);
    }
    
    // Stock mínimo
    if (formData.stock_minimo && formData.stock_minimo !== '') {
      dataToSend.stock_minimo = parseInt(formData.stock_minimo);
    }
    
    // Stock máximo
    if (formData.stock_maximo && formData.stock_maximo !== '') {
      dataToSend.stock_maximo = parseInt(formData.stock_maximo);
    }

    console.log('📤 Datos a enviar:', dataToSend);

    try {
      if (editingArticulo) {
        await api.put(`/api/articulos/${editingArticulo.id}`, dataToSend);
        alert('Artículo actualizado exitosamente');
      } else {
        await api.post('/api/articulos', dataToSend);
        alert('Artículo creado exitosamente');
      }
      closeModal();
      fetchArticulos();
    } catch (error) {
      console.error('❌ Error al guardar artículo:', error);
      console.error('❌ Respuesta del servidor:', error.response?.data);
      alert(error.response?.data?.message || error.response?.data?.error || 'Error al guardar artículo. Verifica la consola para más detalles.');
    }
  };

  const handleEdit = (art) => {
    setEditingArticulo(art);
    setFormData({
      codigo:         art.codigo,
      nombre:         art.nombre,
      descripcion:    art.descripcion    || '',
      categoria:      art.categoria,
      proveedor_id:   art.proveedor_id   || '',
      fecha_caducidad: art.fecha_caducidad
        ? art.fecha_caducidad.substring(0, 10) : '',
      stock_minimo:   art.stock_minimo   || '',
      stock_maximo:   art.stock_maximo   || '',
      ubicacion:      art.ubicacion      || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar este artículo?')) return;
    try {
      await api.delete(`/api/articulos/${id}`);
      alert('Artículo eliminado exitosamente');
      fetchArticulos();
    } catch (e) { 
      console.error('Error al eliminar:', e);
      alert('Error al eliminar artículo'); 
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingArticulo(null);
    setFormData(EMPTY_FORM);
  };

  const getStockStatus = (stock, minimo) => {
    if (stock <= 0)       return { cls: 'sin-stock',  text: 'Sin Stock'  };
    if (stock <= minimo)  return { cls: 'stock-bajo', text: 'Stock Bajo' };
    return                       { cls: 'disponible', text: 'Disponible' };
  };

  const getCaducidadStatus = (fecha) => {
    if (!fecha) return null;
    const diff = Math.ceil((new Date(fecha) - new Date()) / 86400000);
    if (diff <  0)  return { cls: 'caducado',   label: 'Vencido'           };
    if (diff <= 30) return { cls: 'por-vencer', label: `Vence en ${diff}d` };
    return null;
  };

  const fmt = (f) => f
    ? new Date(f).toLocaleDateString('es-ES',{ day:'2-digit',month:'2-digit',year:'numeric' })
    : '—';

  if (loading) return (
    <AdminLayout title="Gestión de Artículos">
      <div className="loading-container">
        <div className="spinner"></div><p>Cargando artículos...</p>
      </div>
    </AdminLayout>
  );

  return (
    <AdminLayout title="Gestión de Artículos">
      <div className="articulos-page">

        <div className="page-header">
          <p style={{ fontSize:16, color:'#6c757d', margin:0 }}>
            Administra el catálogo de productos del inventario
          </p>
          {can('articulos:create') && (
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>
              <span className="material-icons">add</span>Nuevo Artículo
            </button>
          )}
        </div>

        <div className="filters-section">
          <div className="search-box-large">
            <span className="material-icons">search</span>
            <input type="text" placeholder="Buscar por código, nombre o categoría..."
              value={searchTerm} onChange={handleSearch} />
          </div>
        </div>

        <div className="articulos-table-container">
          <table className="articulos-table">
            <thead>
              <tr>
                <th>Código</th><th>Nombre</th><th>Categoría</th>
                <th>Proveedor</th><th>Stock</th>
                <th>Fecha Caducidad</th><th>Estado</th><th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {articulos.length === 0 ? (
                <tr><td colSpan="8">
                  <div className="empty-state">
                    <span className="material-icons">inventory_2</span>
                    <p>No hay artículos registrados</p>
                  </div>
                </td></tr>
              ) : articulos.map((art) => {
                const st  = getStockStatus(art.stock_actual, art.stock_minimo);
                const cad = getCaducidadStatus(art.fecha_caducidad);
                return (
                  <tr key={art.id}>
                    <td><strong>{art.codigo}</strong></td>
                    <td>{art.nombre}</td>
                    <td><span className="categoria-tag">{art.categoria}</span></td>
                    <td>
                      {art.proveedor_nombre
                        ? <span className="proveedor-tag">{art.proveedor_nombre}</span>
                        : <span className="text-muted">—</span>}
                    </td>
                    <td><span className="stock-badge">{art.stock_actual || 0}</span></td>
                    <td>
                      <div className="caducidad-cell">
                        <span>{fmt(art.fecha_caducidad)}</span>
                        {cad && (
                          <span className={`badge caducidad-badge ${cad.cls}`}>{cad.label}</span>
                        )}
                      </div>
                    </td>
                    <td><span className={`badge ${st.cls}`}>{st.text}</span></td>
                    <td>
                      <div className="action-buttons">
                        {can('articulos:update') && (
                          <button className="btn-icon" onClick={() => handleEdit(art)} title="Editar">
                            <span className="material-icons">edit</span>
                          </button>
                        )}
                        {can('articulos:delete') && (
                          <button className="btn-icon btn-danger" onClick={() => handleDelete(art.id)} title="Eliminar">
                            <span className="material-icons">delete</span>
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

        {/* ── Modal ── */}
        {showModal && (
          <div className="modal-overlay" onClick={closeModal}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>{editingArticulo ? 'Editar Artículo' : 'Nuevo Artículo'}</h2>
                <button className="close-btn" onClick={closeModal}>
                  <span className="material-icons">close</span>
                </button>
              </div>

              <div className="modal-body">
                <form onSubmit={handleSubmit} id="articuloForm">
                  <div className="form-grid">

                    <div className="form-group">
                      <label>Código *</label>
                      <input type="text" name="codigo" value={formData.codigo}
                        onChange={handleInputChange} required disabled={!!editingArticulo} />
                    </div>

                    <div className="form-group">
                      <label>Nombre *</label>
                      <input type="text" name="nombre" value={formData.nombre}
                        onChange={handleInputChange} required />
                    </div>

                    <div className="form-group full-width">
                      <label>Descripción</label>
                      <textarea name="descripcion" value={formData.descripcion}
                        onChange={handleInputChange} rows="3" />
                    </div>

                    <div className="form-group">
                      <label>Categoría *</label>
                      <select name="categoria" value={formData.categoria}
                        onChange={handleInputChange} required className="form-select">
                        <option value="">— Selecciona una categoría —</option>
                        {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Proveedor</label>
                      <select name="proveedor_id" value={formData.proveedor_id}
                        onChange={handleInputChange} className="form-select">
                        <option value="">— Sin proveedor —</option>
                        {proveedores.map((p) => (
                          <option key={p.id} value={p.id}>{p.nombre} ({p.codigo})</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Fecha de Caducidad</label>
                      <input type="date" name="fecha_caducidad" value={formData.fecha_caducidad}
                        onChange={handleInputChange} />
                    </div>

                    <div className="form-group">
                      <label>Ubicación</label>
                      <input type="text" name="ubicacion" value={formData.ubicacion}
                        onChange={handleInputChange} placeholder="Ej: Estante A-3" />
                    </div>

                    {!editingArticulo && (
                      <div className="form-group">
                        <label>Stock Inicial</label>
                        <input type="number" name="stock_inicial" value={formData.stock_inicial}
                          onChange={handleInputChange} min="0" placeholder="0" />
                      </div>
                    )}

                    <div className="form-group">
                      <label>Stock Mínimo</label>
                      <input type="number" name="stock_minimo" value={formData.stock_minimo}
                        onChange={handleInputChange} min="0" placeholder="0" />
                    </div>

                    <div className="form-group">
                      <label>Stock Máximo</label>
                      <input type="number" name="stock_maximo" value={formData.stock_maximo}
                        onChange={handleInputChange} min="0" placeholder="0" />
                    </div>

                  </div>
                </form>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeModal}>
                  Cancelar
                </button>
                <button type="submit" form="articuloForm" className="btn btn-primary">
                  {editingArticulo ? 'Actualizar' : 'Crear'} Artículo
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </AdminLayout>
  );
};

export default Articulos;