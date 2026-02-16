import React, { useState, useEffect } from 'react';
import AdminLayout from '../components/AdminLayout';
import api from '../../server/config/api';
import './Movimientos.css';
import '../pages/Dashboard.css';

const Movimientos = () => {
  const [movimientos, setMovimientos] = useState([]);
  const [articulos, setArticulos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filterTipo, setFilterTipo] = useState('');
  const [formData, setFormData] = useState({
    articulo_id: '',
    tipo_movimiento: 'entrada',
    cantidad: '',
    motivo: '',
    observaciones: ''
  });

  useEffect(() => {
    fetchMovimientos();
    fetchArticulos();
  }, []);

  const fetchMovimientos = async (tipo = '') => {
    try {
      const url = tipo ? `/api/movimientos?tipo=${tipo}` : '/api/movimientos';
      const response = await api.get(url);
      setMovimientos(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error al cargar movimientos:', error);
      setLoading(false);
    }
  };

  const fetchArticulos = async () => {
    try {
      const response = await api.get('/api/articulos');
      setArticulos(response.data);
    } catch (error) {
      console.error('Error al cargar artículos:', error);
    }
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      await api.post('/api/movimientos', formData);
      
      setShowModal(false);
      resetForm();
      fetchMovimientos(filterTipo);
      
      alert('Movimiento registrado exitosamente');
    } catch (error) {
      console.error('Error al registrar movimiento:', error);
      alert(error.response?.data?.message || 'Error al registrar movimiento');
    }
  };

  const resetForm = () => {
    setFormData({
      articulo_id: '',
      tipo_movimiento: 'entrada',
      cantidad: '',
      motivo: '',
      observaciones: ''
    });
  };

  const handleFilterChange = (tipo) => {
    setFilterTipo(tipo);
    fetchMovimientos(tipo);
  };

  const getTipoIcon = (tipo) => {
    switch (tipo) {
      case 'entrada':
        return { icon: 'add_circle', class: 'tipo-entrada' };
      case 'salida':
        return { icon: 'remove_circle', class: 'tipo-salida' };
      case 'ajuste':
        return { icon: 'sync', class: 'tipo-ajuste' };
      default:
        return { icon: 'help', class: '' };
    }
  };

  const formatFecha = (fecha) => {
    const date = new Date(fecha);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000); // diferencia en segundos

    if (diff < 60) return 'Hace unos segundos';
    if (diff < 3600) return `Hace ${Math.floor(diff / 60)} minutos`;
    if (diff < 86400) return `Hace ${Math.floor(diff / 3600)} horas`;
    if (diff < 604800) return `Hace ${Math.floor(diff / 86400)} días`;
    
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <AdminLayout title="Movimientos de Inventario">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Cargando movimientos...</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Movimientos de Inventario">
      <div className="movimientos-page">
        <div className="page-header">
          <div>
            <p style={{fontSize: '16px', color: '#6c757d', margin: 0}}>
              Registra y consulta entradas, salidas y ajustes de stock
            </p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <span className="material-icons">add</span>
            Nuevo Movimiento
          </button>
        </div>

        {/* Filtros */}
        <div className="filters-section">
          <div className="filter-buttons">
            <button 
              className={`filter-btn ${filterTipo === '' ? 'active' : ''}`}
              onClick={() => handleFilterChange('')}
            >
              <span className="material-icons">list</span>
              Todos
            </button>
            <button 
              className={`filter-btn ${filterTipo === 'entrada' ? 'active' : ''}`}
              onClick={() => handleFilterChange('entrada')}
            >
              <span className="material-icons">add_circle</span>
              Entradas
            </button>
            <button 
              className={`filter-btn ${filterTipo === 'salida' ? 'active' : ''}`}
              onClick={() => handleFilterChange('salida')}
            >
              <span className="material-icons">remove_circle</span>
              Salidas
            </button>
            <button 
              className={`filter-btn ${filterTipo === 'ajuste' ? 'active' : ''}`}
              onClick={() => handleFilterChange('ajuste')}
            >
              <span className="material-icons">sync</span>
              Ajustes
            </button>
          </div>
        </div>

        {/* Tabla de Movimientos */}
        <div className="movimientos-table-container">
          <table className="movimientos-table">
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Artículo</th>
                <th>Cantidad</th>
                <th>Usuario</th>
                <th>Motivo</th>
                <th>Fecha</th>
              </tr>
            </thead>
            <tbody>
              {movimientos.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center">
                    <div className="empty-state">
                      <span className="material-icons">inventory_2</span>
                      <p>No hay movimientos registrados</p>
                    </div>
                  </td>
                </tr>
              ) : (
                movimientos.map((mov) => {
                  const tipo = getTipoIcon(mov.tipo_movimiento);
                  return (
                    <tr key={mov.id}>
                      <td>
                        <div className={`tipo-badge ${tipo.class}`}>
                          <span className="material-icons">{tipo.icon}</span>
                          <span>{mov.tipo_movimiento}</span>
                        </div>
                      </td>
                      <td>
                        <div className="articulo-info">
                          <strong>{mov.articulo_codigo}</strong>
                          <span>{mov.articulo_nombre}</span>
                        </div>
                      </td>
                      <td>
                        <span className="cantidad-badge">{mov.cantidad}</span>
                      </td>
                      <td>{mov.usuario_nombre}</td>
                      <td>{mov.motivo || '-'}</td>
                      <td className="fecha-col">{formatFecha(mov.fecha_movimiento)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Modal de Nuevo Movimiento */}
        {showModal && (
          <div className="modal-overlay" onClick={() => {
            setShowModal(false);
            resetForm();
          }}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Registrar Movimiento</h2>
                <button className="close-btn" onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}>
                  <span className="material-icons">close</span>
                </button>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="form-grid">
                    <div className="form-group full-width">
                      <label>Artículo *</label>
                      <select
                        name="articulo_id"
                        value={formData.articulo_id}
                        onChange={handleInputChange}
                        required
                      >
                        <option value="">Seleccionar artículo...</option>
                        {articulos.map((art) => (
                          <option key={art.id} value={art.id}>
                            {art.codigo} - {art.nombre} (Stock: {art.stock_actual || 0})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Tipo de Movimiento *</label>
                      <select
                        name="tipo_movimiento"
                        value={formData.tipo_movimiento}
                        onChange={handleInputChange}
                        required
                      >
                        <option value="entrada">Entrada</option>
                        <option value="salida">Salida</option>
                        <option value="ajuste">Ajuste</option>
                      </select>
                      <small className="help-text">
                        {formData.tipo_movimiento === 'entrada' && '➕ Aumenta el stock'}
                        {formData.tipo_movimiento === 'salida' && '➖ Disminuye el stock'}
                        {formData.tipo_movimiento === 'ajuste' && '🔄 Establece cantidad exacta'}
                      </small>
                    </div>

                    <div className="form-group">
                      <label>Cantidad *</label>
                      <input
                        type="number"
                        name="cantidad"
                        value={formData.cantidad}
                        onChange={handleInputChange}
                        min="1"
                        required
                      />
                    </div>

                    <div className="form-group full-width">
                      <label>Motivo</label>
                      <input
                        type="text"
                        name="motivo"
                        value={formData.motivo}
                        onChange={handleInputChange}
                        placeholder="Ej: Compra a proveedor, Venta a cliente, etc."
                      />
                    </div>

                    <div className="form-group full-width">
                      <label>Observaciones</label>
                      <textarea
                        name="observaciones"
                        value={formData.observaciones}
                        onChange={handleInputChange}
                        rows="3"
                        placeholder="Información adicional (opcional)"
                      ></textarea>
                    </div>
                  </div>
                </div>

                <div className="modal-footer">
                  <button 
                    type="button" 
                    className="btn btn-secondary"
                    onClick={() => {
                      setShowModal(false);
                      resetForm();
                    }}
                  >
                    Cancelar
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Registrar Movimiento
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default Movimientos;