import React, { useState, useEffect } from 'react';
import './Reportes.css';
import axios from 'axios';
import AdminLayout from '../components/AdminLayout';

const Reportes = () => {
  const [loading, setLoading] = useState(false);
  const [tipoReporte, setTipoReporte] = useState('inventario');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [categoria, setCategoria] = useState('todas');
  const [categorias, setCategorias] = useState([]);
  const [datosReporte, setDatosReporte] = useState(null);
  const [estadisticas, setEstadisticas] = useState({
    total_productos: 0,
    valor_inventario: 0,
    movimientos_mes: 0,
    alertas_activas: 0
  });

  const API_URL = 'http://localhost:3000/api';

  useEffect(() => {
    cargarCategorias();
    cargarEstadisticas();
    // Establecer fechas por defecto (último mes)
    const hoy = new Date();
    const hace30dias = new Date(hoy.getTime() - 30 * 24 * 60 * 60 * 1000);
    setFechaFin(hoy.toISOString().split('T')[0]);
    setFechaInicio(hace30dias.toISOString().split('T')[0]);
  }, []);

  const cargarCategorias = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/articulos`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const categoriasUnicas = [...new Set(response.data.map(p => p.categoria))];
      setCategorias(categoriasUnicas);
    } catch (error) {
      console.error('Error al cargar categorías:', error);
    }
  };

  const cargarEstadisticas = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/dashboard/estadisticas`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setEstadisticas(response.data.data);
      }
    } catch (error) {
      console.error('Error al cargar estadísticas:', error);
    }
  };

  const generarReporte = async () => {
    if (!fechaInicio || !fechaFin) {
      alert('Por favor selecciona un rango de fechas');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/reportes/${tipoReporte}`, {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          fecha_inicio: fechaInicio,
          fecha_fin: fechaFin,
          categoria: categoria !== 'todas' ? categoria : undefined
        }
      });
      setDatosReporte(response.data);
    } catch (error) {
      console.error('Error al generar reporte:', error);
      alert('Error al generar el reporte');
    } finally {
      setLoading(false);
    }
  };

  const exportarPDF = async () => {
    if (!datosReporte) {
      alert('Primero genera un reporte');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/reportes/${tipoReporte}/pdf`, {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          fecha_inicio: fechaInicio,
          fecha_fin: fechaFin,
          categoria: categoria !== 'todas' ? categoria : undefined
        },
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `reporte_${tipoReporte}_${new Date().toISOString().split('T')[0]}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error al exportar PDF:', error);
      alert('Error al exportar el reporte');
    }
  };

  const exportarExcel = async () => {
    if (!datosReporte) {
      alert('Primero genera un reporte');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/reportes/${tipoReporte}/excel`, {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          fecha_inicio: fechaInicio,
          fecha_fin: fechaFin,
          categoria: categoria !== 'todas' ? categoria : undefined
        },
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `reporte_${tipoReporte}_${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error al exportar Excel:', error);
      alert('Error al exportar el reporte');
    }
  };

  const renderReporteInventario = () => {
    if (!datosReporte || !datosReporte.productos) return null;

    return (
      <div className="reporte-tabla">
        <table className="data-table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Producto</th>
              <th>Categoría</th>
              <th>Stock Actual</th>
              <th>Stock Mínimo</th>
              <th>Stock Máximo</th>
              <th>Precio Unitario</th>
              <th>Valor Total</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {datosReporte.productos.map(producto => (
              <tr key={producto.id}>
                <td><strong>{producto.codigo}</strong></td>
                <td>{producto.nombre}</td>
                <td><span className="badge">{producto.categoria}</span></td>
                <td style={{ textAlign: 'center' }}>{producto.cantidad}</td>
                <td style={{ textAlign: 'center' }}>{producto.stock_minimo}</td>
                <td style={{ textAlign: 'center' }}>{producto.stock_maximo}</td>
                <td>${producto.precio?.toFixed(2) || '0.00'}</td>
                <td><strong>${((producto.precio || 0) * producto.cantidad).toFixed(2)}</strong></td>
                <td>
                  <span className={`badge ${
                    producto.cantidad === 0 ? 'danger' :
                    producto.cantidad <= producto.stock_minimo ? 'warning' : 'success'
                  }`}>
                    {producto.cantidad === 0 ? 'Sin Stock' :
                     producto.cantidad <= producto.stock_minimo ? 'Bajo' : 'Normal'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderReporteMovimientos = () => {
    if (!datosReporte || !datosReporte.movimientos) return null;

    return (
      <div className="reporte-tabla">
        <table className="data-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Tipo</th>
              <th>Producto</th>
              <th>Cantidad</th>
              <th>Usuario</th>
              <th>Observaciones</th>
            </tr>
          </thead>
          <tbody>
            {datosReporte.movimientos.map(mov => (
              <tr key={mov.id}>
                <td>{new Date(mov.fecha).toLocaleDateString()}</td>
                <td>
                  <span className={`badge ${mov.tipo_movimiento === 'entrada' ? 'success' : 'warning'}`}>
                    {mov.tipo_movimiento === 'entrada' ? 'Entrada' : 'Salida'}
                  </span>
                </td>
                <td>{mov.producto_nombre}</td>
                <td style={{ textAlign: 'center' }}>
                  <strong style={{ color: mov.tipo_movimiento === 'entrada' ? '#27ae60' : '#e74c3c' }}>
                    {mov.tipo_movimiento === 'entrada' ? '+' : '-'}{mov.cantidad}
                  </strong>
                </td>
                <td>{mov.usuario_nombre}</td>
                <td>{mov.observaciones || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderReporteValoracion = () => {
    if (!datosReporte || !datosReporte.valoracion) return null;

    const { total_productos, valor_total, por_categoria } = datosReporte.valoracion;

    return (
      <div className="reporte-valoracion">
        <div className="valoracion-resumen">
          <div className="valoracion-card">
            <h4>Total Productos</h4>
            <p className="valor-numero">{total_productos}</p>
          </div>
          <div className="valoracion-card">
            <h4>Valor Total Inventario</h4>
            <p className="valor-numero">${valor_total?.toFixed(2) || '0.00'}</p>
          </div>
        </div>

        <div className="reporte-tabla">
          <h4>Valoración por Categoría</h4>
          <table className="data-table">
            <thead>
              <tr>
                <th>Categoría</th>
                <th>Cantidad Productos</th>
                <th>Stock Total</th>
                <th>Valor Total</th>
                <th>Porcentaje</th>
              </tr>
            </thead>
            <tbody>
              {por_categoria?.map((cat, index) => (
                <tr key={index}>
                  <td><span className="badge">{cat.categoria}</span></td>
                  <td style={{ textAlign: 'center' }}>{cat.cantidad_productos}</td>
                  <td style={{ textAlign: 'center' }}>{cat.stock_total}</td>
                  <td><strong>${cat.valor_total?.toFixed(2)}</strong></td>
                  <td>
                    <div className="porcentaje-bar">
                      <div 
                        className="porcentaje-fill" 
                        style={{ width: `${cat.porcentaje}%` }}
                      ></div>
                      <span>{cat.porcentaje?.toFixed(1)}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <AdminLayout title="Reportes">
      <div className="reportes-content">
        {/* Stats Row */}
        <div className="stats-row">
          <div className="stat-card blue">
            <div className="stat-header">
              <h3>Total Productos</h3>
              <span className="stat-icon material-icons">inventory_2</span>
            </div>
            <div className="stat-body">
              <p className="stat-number">{estadisticas.total_productos}</p>
            </div>
            <div className="stat-footer">
              <span className="stat-period">En inventario</span>
            </div>
          </div>

          <div className="stat-card green">
            <div className="stat-header">
              <h3>Valor Inventario</h3>
              <span className="stat-icon material-icons">payments</span>
            </div>
            <div className="stat-body">
              <p className="stat-number">${estadisticas.valor_inventario?.toFixed(2) || '0.00'}</p>
            </div>
            <div className="stat-footer">
              <span className="stat-period">Total valorizado</span>
            </div>
          </div>

          <div className="stat-card purple">
            <div className="stat-header">
              <h3>Movimientos</h3>
              <span className="stat-icon material-icons">sync_alt</span>
            </div>
            <div className="stat-body">
              <p className="stat-number">{estadisticas.movimientos_mes}</p>
            </div>
            <div className="stat-footer">
              <span className="stat-period">Último mes</span>
            </div>
          </div>

          <div className="stat-card orange">
            <div className="stat-header">
              <h3>Alertas Activas</h3>
              <span className="stat-icon material-icons">warning</span>
            </div>
            <div className="stat-body">
              <p className="stat-number">{estadisticas.alertas_activas}</p>
            </div>
            <div className="stat-footer">
              <span className="stat-period">Requieren atención</span>
            </div>
          </div>
        </div>

        {/* Filtros y Configuración */}
        <div className="chart-card">
          <div className="card-header">
            <h3>
              <span className="material-icons" style={{ verticalAlign: 'middle', marginRight: '8px' }}>
                tune
              </span>
              Configurar Reporte
            </h3>
          </div>
          <div className="card-body">
            <div className="filtros-grid">
              <div className="filtro-group">
                <label>Tipo de Reporte</label>
                <select 
                  value={tipoReporte} 
                  onChange={(e) => setTipoReporte(e.target.value)}
                  className="filtro-select"
                >
                  <option value="inventario">Inventario General</option>
                  <option value="movimientos">Movimientos</option>
                  <option value="valoracion">Valoración de Inventario</option>
                  <option value="stock-bajo">Productos con Stock Bajo</option>
                </select>
              </div>

              <div className="filtro-group">
                <label>Categoría</label>
                <select 
                  value={categoria} 
                  onChange={(e) => setCategoria(e.target.value)}
                  className="filtro-select"
                >
                  <option value="todas">Todas las categorías</option>
                  {categorias.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="filtro-group">
                <label>Fecha Inicio</label>
                <input
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  className="filtro-input"
                />
              </div>

              <div className="filtro-group">
                <label>Fecha Fin</label>
                <input
                  type="date"
                  value={fechaFin}
                  onChange={(e) => setFechaFin(e.target.value)}
                  className="filtro-input"
                />
              </div>
            </div>

            <div className="acciones-reporte">
              <button 
                className="btn-generar" 
                onClick={generarReporte}
                disabled={loading}
              >
                <span className="material-icons">analytics</span>
                {loading ? 'Generando...' : 'Generar Reporte'}
              </button>

              {datosReporte && (
                <>
                  <button className="btn-exportar pdf" onClick={exportarPDF}>
                    <span className="material-icons">picture_as_pdf</span>
                    Exportar PDF
                  </button>
                  <button className="btn-exportar excel" onClick={exportarExcel}>
                    <span className="material-icons">table_chart</span>
                    Exportar Excel
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Resultados del Reporte */}
        {loading && (
          <div className="chart-card">
            <div className="loading-reporte">
              <div className="spinner"></div>
              <p>Generando reporte...</p>
            </div>
          </div>
        )}

        {!loading && datosReporte && (
          <div className="chart-card">
            <div className="card-header">
              <h3>
                <span className="material-icons" style={{ verticalAlign: 'middle', marginRight: '8px' }}>
                  description
                </span>
                Resultados del Reporte
              </h3>
              <div className="reporte-info">
                <span className="material-icons">date_range</span>
                {new Date(fechaInicio).toLocaleDateString()} - {new Date(fechaFin).toLocaleDateString()}
              </div>
            </div>
            <div className="card-body">
              {tipoReporte === 'inventario' && renderReporteInventario()}
              {tipoReporte === 'movimientos' && renderReporteMovimientos()}
              {tipoReporte === 'valoracion' && renderReporteValoracion()}
              {tipoReporte === 'stock-bajo' && renderReporteInventario()}
            </div>
          </div>
        )}

        {!loading && !datosReporte && (
          <div className="chart-card">
            <div className="empty-state">
              <span className="material-icons">assessment</span>
              <h3>No hay reportes generados</h3>
              <p>Configura los filtros y genera un reporte para ver los resultados</p>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default Reportes;