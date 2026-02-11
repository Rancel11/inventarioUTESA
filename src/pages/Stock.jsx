import React, { useState, useEffect } from 'react';
import './Stock.css';
import axios from 'axios';
import AdminLayout from '../components/AdminLayout'; // Corregido: removí el ;; doble

const Stock = () => {
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('todos');
  const [busqueda, setBusqueda] = useState('');
  const [modalConfig, setModalConfig] = useState(false);
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);
  const [alertas, setAlertas] = useState([]);

  const [niveles, setNiveles] = useState({
    stock_minimo: 10,
    stock_maximo: 100
  });

  const API_URL = 'http://localhost:3000/api';

  useEffect(() => {
    cargarProductos();
    cargarAlertas();
  }, []);

  const cargarProductos = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/articulos`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProductos(response.data);
    } catch (error) {
      console.error('Error al cargar productos:', error);
    } finally {
      setLoading(false);
    }
  };

  const cargarAlertas = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/dashboard/alertas`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setAlertas(response.data.data);
      }
    } catch (error) {
      console.error('Error al cargar alertas:', error);
    }
  };

  const obtenerEstadoStock = (producto) => {
    if (producto.cantidad === 0) return 'sin-stock';
    if (producto.cantidad <= (producto.stock_minimo * 0.25)) return 'critico';
    if (producto.cantidad <= producto.stock_minimo) return 'bajo';
    if (producto.cantidad >= producto.stock_maximo) return 'sobre-stock';
    return 'normal';
  };

  const obtenerPorcentajeStock = (producto) => {
    if (producto.stock_minimo === 0) return 100;
    return Math.round((producto.cantidad / producto.stock_minimo) * 100);
  };

  const productosFiltrados = productos.filter(producto => {
    const estado = obtenerEstadoStock(producto);
    const cumpleFiltro = filtro === 'todos' || 
                        (filtro === 'bajo' && (estado === 'bajo' || estado === 'critico' || estado === 'sin-stock')) ||
                        (filtro === 'critico' && estado === 'critico') ||
                        (filtro === 'normal' && estado === 'normal');

    const cumpleBusqueda = producto.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
                          producto.codigo.toLowerCase().includes(busqueda.toLowerCase());

    return cumpleFiltro && cumpleBusqueda;
  });

  const estadisticas = {
    total: productos.length,
    bajo_stock: productos.filter(p => obtenerEstadoStock(p) === 'bajo').length,
    criticos: productos.filter(p => obtenerEstadoStock(p) === 'critico').length,
    sin_stock: productos.filter(p => obtenerEstadoStock(p) === 'sin-stock').length
  };

  const abrirModalConfig = (producto) => {
    setProductoSeleccionado(producto);
    setNiveles({
      stock_minimo: producto.stock_minimo || 10,
      stock_maximo: producto.stock_maximo || 100
    });
    setModalConfig(true);
  };

  const guardarConfiguracion = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${API_URL}/articulos/${productoSeleccionado.id}`,
        {
          stock_minimo: niveles.stock_minimo,
          stock_maximo: niveles.stock_maximo
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert('Configuración actualizada exitosamente');
      setModalConfig(false);
      cargarProductos();
    } catch (error) {
      console.error('Error al guardar configuración:', error);
      alert('Error al guardar configuración');
    }
  };

  const resolverAlerta = async (alertaId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${API_URL}/dashboard/alertas/${alertaId}/resolver`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      cargarAlertas();
    } catch (error) {
      console.error('Error al resolver alerta:', error);
    }
  };

  if (loading) {
    return (
      <AdminLayout title="Control de Stock">
        <div className="dashboard-loading">
          <div className="spinner"></div>
          <p>Cargando información de stock...</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Control de Stock">
      {/* Dashboard Content */}
      <div className="dashboard-content">
        {/* Stats Row */}
        <div className="stats-row">
          <div className="stat-card blue">
            <div className="stat-header">
              <h3>Total Productos</h3>
              <span className="stat-icon material-icons">inventory_2</span>
            </div>
            <div className="stat-body">
              <p className="stat-number">{estadisticas.total}</p>
            </div>
            <div className="stat-footer">
              <span className="stat-period">En inventario</span>
            </div>
          </div>

          <div className="stat-card orange">
            <div className="stat-header">
              <h3>Stock Bajo</h3>
              <span className="stat-icon material-icons">warning</span>
            </div>
            <div className="stat-body">
              <p className="stat-number">{estadisticas.bajo_stock}</p>
            </div>
            <div className="stat-footer">
              <span className="stat-period">Requieren atención</span>
            </div>
          </div>

          <div className="stat-card red">
            <div className="stat-header">
              <h3>Críticos</h3>
              <span className="stat-icon material-icons">error</span>
            </div>
            <div className="stat-body">
              <p className="stat-number">{estadisticas.criticos}</p>
            </div>
            <div className="stat-footer">
              <span className="stat-period">Reorden urgente</span>
            </div>
          </div>

          <div className="stat-card red">
            <div className="stat-header">
              <h3>Sin Stock</h3>
              <span className="stat-icon material-icons">remove_circle</span>
            </div>
            <div className="stat-body">
              <p className="stat-number">{estadisticas.sin_stock}</p>
            </div>
            <div className="stat-footer">
              <span className="stat-period">Agotados</span>
            </div>
          </div>
        </div>

        {/* Alertas Activas */}
        {alertas.length > 0 && (
          <div className="chart-card" style={{ marginBottom: '24px' }}>
            <div className="card-header">
              <h3>
                <span className="material-icons" style={{ verticalAlign: 'middle', marginRight: '8px' }}>notifications_active</span>
                Alertas Activas ({alertas.length})
              </h3>
            </div>
            <div className="card-body">
              <div className="activity-list">
                {alertas.map(alerta => (
                  <div key={alerta.id} className="activity-item">
                    <div className={`activity-icon ${alerta.tipo_alerta === 'stock_critico' ? 'red' : 'orange'}`}>
                      <span className="material-icons">warning</span>
                    </div>
                    <div className="activity-content">
                      <p><strong>{alerta.producto_nombre}</strong> - {alerta.mensaje}</p>
                      <span>Código: {alerta.codigo} | Stock actual: {alerta.nivel_actual}</span>
                    </div>
                    <button 
                      className="btn-filter active"
                      onClick={() => resolverAlerta(alerta.id)}
                    >
                      Resolver
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tabla de Productos */}
        <div className="chart-card">
          <div className="card-header">
            <h3>Inventario por Estado</h3>
            <div className="card-actions">
              <button 
                className={`btn-filter ${filtro === 'todos' ? 'active' : ''}`}
                onClick={() => setFiltro('todos')}
              >
                Todos
              </button>
              <button 
                className={`btn-filter ${filtro === 'bajo' ? 'active' : ''}`}
                onClick={() => setFiltro('bajo')}
              >
                Bajo
              </button>
              <button 
                className={`btn-filter ${filtro === 'critico' ? 'active' : ''}`}
                onClick={() => setFiltro('critico')}
              >
                Crítico
              </button>
              <button 
                className={`btn-filter ${filtro === 'normal' ? 'active' : ''}`}
                onClick={() => setFiltro('normal')}
              >
                Normal
              </button>
            </div>
          </div>
          
          <div className="card-body">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Producto</th>
                  <th>Categoría</th>
                  <th>Stock</th>
                  <th>Mínimo</th>
                  <th>Máximo</th>
                  <th>Estado</th>
                  <th>Nivel</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {productosFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan="9" style={{ textAlign: 'center', padding: '40px', color: '#6c757d' }}>
                      No hay productos que mostrar
                    </td>
                  </tr>
                ) : (
                  productosFiltrados.map(producto => {
                    const estado = obtenerEstadoStock(producto);
                    const porcentaje = obtenerPorcentajeStock(producto);
                    
                    return (
                      <tr key={producto.id}>
                        <td><strong>{producto.codigo}</strong></td>
                        <td>{producto.nombre}</td>
                        <td>
                          <span className="badge">{producto.categoria}</span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <strong style={{ 
                            color: estado === 'critico' || estado === 'sin-stock' ? '#e74c3c' : 
                                   estado === 'bajo' ? '#f39c12' : '#27ae60',
                            fontSize: '16px'
                          }}>
                            {producto.cantidad}
                          </strong>
                        </td>
                        <td style={{ textAlign: 'center' }}>{producto.stock_minimo || 10}</td>
                        <td style={{ textAlign: 'center' }}>{producto.stock_maximo || 100}</td>
                        <td>
                          <span className={`badge ${
                            estado === 'sin-stock' ? 'danger' :
                            estado === 'critico' ? 'danger' :
                            estado === 'bajo' ? 'warning' : 'success'
                          }`}>
                            {estado === 'sin-stock' ? 'Sin Stock' :
                             estado === 'critico' ? 'Crítico' :
                             estado === 'bajo' ? 'Bajo' :
                             estado === 'sobre-stock' ? 'Sobre Stock' : 'Normal'}
                          </span>
                        </td>
                        <td>
                          <div style={{ 
                            width: '100%', 
                            height: '8px', 
                            background: '#f0f0f0', 
                            borderRadius: '4px',
                            overflow: 'hidden',
                            position: 'relative'
                          }}>
                            <div style={{
                              width: `${Math.min(porcentaje, 100)}%`,
                              height: '100%',
                              background: estado === 'critico' || estado === 'sin-stock' ? '#e74c3c' :
                                        estado === 'bajo' ? '#f39c12' : '#27ae60',
                              transition: 'width 0.3s ease'
                            }}></div>
                          </div>
                          <small style={{ color: '#6c757d' }}>{porcentaje}%</small>
                        </td>
                        <td>
                          <button 
                            onClick={() => abrirModalConfig(producto)}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              padding: '4px'
                            }}
                            title="Configurar niveles"
                          >
                            <span className="material-icons" style={{ color: '#468189' }}>settings</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal */}
      {modalConfig && (
        <div className="stock-modal-overlay" onClick={() => setModalConfig(false)}>
          <div className="stock-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="stock-modal-header">
              <h2>
                <span className="material-icons">settings</span>
                Configurar Niveles de Stock
              </h2>
              <button className="stock-modal-close" onClick={() => setModalConfig(false)}>
                <span className="material-icons">close</span>
              </button>
            </div>

            <div className="stock-modal-body">
              <div className="stock-producto-info">
                <h3>{productoSeleccionado?.nombre}</h3>
                <p>Código: <strong>{productoSeleccionado?.codigo}</strong></p>
                <p>Stock actual: <strong>{productoSeleccionado?.cantidad}</strong> unidades</p>
              </div>

              <div className="stock-form-group">
                <label>Stock Mínimo</label>
                <input
                  type="number"
                  min="0"
                  value={niveles.stock_minimo}
                  onChange={(e) => setNiveles({ ...niveles, stock_minimo: parseInt(e.target.value) || 0 })}
                />
                <small>Alerta cuando el stock llegue a este nivel</small>
              </div>

              <div className="stock-form-group">
                <label>Stock Máximo</label>
                <input
                  type="number"
                  min="0"
                  value={niveles.stock_maximo}
                  onChange={(e) => setNiveles({ ...niveles, stock_maximo: parseInt(e.target.value) || 0 })}
                />
                <small>Nivel máximo recomendado de stock</small>
              </div>

              <div className="stock-alert-info">
                <strong>
                  <span className="material-icons">info</span>
                  Niveles de alerta:
                </strong>
                <ul>
                  <li>🔴 <strong>Crítico:</strong> ≤ 25% del mínimo ({Math.round(niveles.stock_minimo * 0.25)} unidades)</li>
                  <li>⚠️ <strong>Bajo:</strong> ≤ Stock mínimo ({niveles.stock_minimo} unidades)</li>
                  <li>✅ <strong>Normal:</strong> Entre mínimo y máximo</li>
                  <li>📦 <strong>Sobre stock:</strong> ≥ Stock máximo ({niveles.stock_maximo} unidades)</li>
                </ul>
              </div>
            </div>

            <div className="stock-modal-footer">
              <button className="stock-btn-secondary" onClick={() => setModalConfig(false)}>
                Cancelar
              </button>
              <button className="stock-btn-primary" onClick={guardarConfiguracion}>
                <span className="material-icons">save</span>
                Guardar Configuración
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default Stock;