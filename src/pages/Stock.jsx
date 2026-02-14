import React, { useState, useEffect } from 'react';
import './Stock.css';
import api from '../../server/config/api';
import AdminLayout from '../components/AdminLayout';

const Stock = () => {
  const [productos,           setProductos]           = useState([]);
  const [alertas,             setAlertas]             = useState([]);
  const [resumen,             setResumen]             = useState({
    total_articulos: 0, total_unidades: 0,
    sin_stock: 0, criticos: 0, bajo_stock: 0,
  });
  const [loading,             setLoading]             = useState(true);
  const [filtro,              setFiltro]              = useState('todos');
  const [busqueda,            setBusqueda]            = useState('');
  const [modalConfig,         setModalConfig]         = useState(false);
  const [productoSeleccionado,setProductoSeleccionado]= useState(null);
  const [niveles,             setNiveles]             = useState({
    stock_minimo: 0, stock_maximo: 0, ubicacion: '',
  });
  const [savingNiveles,       setSavingNiveles]       = useState(false);

  useEffect(() => {
    cargarTodo();
  }, []);

  const cargarTodo = async () => {
    setLoading(true);
    await Promise.all([cargarProductos(), cargarAlertas(), cargarResumen()]);
    setLoading(false);
  };

  const cargarProductos = async () => {
    try {
      const { data } = await api.get('/api/stock');
      setProductos(data);
    } catch (e) { console.error('Error al cargar stock:', e); }
  };

  const cargarAlertas = async () => {
    try {
      const { data } = await api.get('/api/stock/alertas');
      setAlertas(data);
    } catch (e) { console.error('Error al cargar alertas:', e); }
  };

  const cargarResumen = async () => {
    try {
      const { data } = await api.get('/api/stock/resumen');
      setResumen(data);
    } catch (e) { console.error('Error al cargar resumen:', e); }
  };

  // ── Helpers de estado ──────────────────────────
  const obtenerEstado = (p) => {
    const s = p.stock_actual ?? 0;
    const min = p.stock_minimo ?? 0;
    const max = p.stock_maximo ?? 0;
    if (s <= 0)                           return 'sin-stock';
    if (min > 0 && s <= min * 0.25)       return 'critico';
    if (min > 0 && s <= min)              return 'bajo';
    if (max > 0 && s >= max)              return 'sobre-stock';
    return 'normal';
  };

  const obtenerPorcentaje = (p) => {
    const s   = p.stock_actual  ?? 0;
    const max = p.stock_maximo  ?? 0;
    const min = p.stock_minimo  ?? 0;
    if (max > 0) return Math.min(Math.round((s / max) * 100), 100);
    if (min > 0) return Math.min(Math.round((s / min) * 100), 100);
    return s > 0 ? 100 : 0;
  };

  const colorEstado = (estado) => ({
    'sin-stock':   '#e74c3c',
    'critico':     '#e74c3c',
    'bajo':        '#f39c12',
    'sobre-stock': '#8e44ad',
    'normal':      '#27ae60',
  }[estado] ?? '#27ae60');

  const labelEstado = (estado) => ({
    'sin-stock':   'Sin Stock',
    'critico':     'Crítico',
    'bajo':        'Bajo',
    'sobre-stock': 'Sobre Stock',
    'normal':      'Normal',
  }[estado] ?? 'Normal');

  const badgeEstado = (estado) => ({
    'sin-stock':   'danger',
    'critico':     'danger',
    'bajo':        'warning',
    'sobre-stock': 'info',
    'normal':      'success',
  }[estado] ?? 'success');

  // ── Filtros ────────────────────────────────────
  const productosFiltrados = productos.filter(p => {
    const estado = obtenerEstado(p);
    const texto  = busqueda.toLowerCase();

    const cumpleFiltro =
      filtro === 'todos'  ? true :
      filtro === 'bajo'   ? ['bajo','critico','sin-stock'].includes(estado) :
      filtro === 'critico'? estado === 'critico' :
      filtro === 'normal' ? estado === 'normal'  : true;

    const cumpleBusqueda = !busqueda ||
      p.nombre?.toLowerCase().includes(texto) ||
      p.codigo?.toLowerCase().includes(texto) ||
      p.categoria?.toLowerCase().includes(texto);

    return cumpleFiltro && cumpleBusqueda;
  });

  // ── Modal config ───────────────────────────────
  const abrirModalConfig = (p) => {
    setProductoSeleccionado(p);
    setNiveles({
      stock_minimo: p.stock_minimo ?? 0,
      stock_maximo: p.stock_maximo ?? 0,
      ubicacion:    p.ubicacion    ?? '',
    });
    setModalConfig(true);
  };

  const guardarConfiguracion = async () => {
    setSavingNiveles(true);
    try {
      await api.put(`/api/stock/${productoSeleccionado.id}`, {
        stock_minimo: parseInt(niveles.stock_minimo) || 0,
        stock_maximo: parseInt(niveles.stock_maximo) || 0,
        ubicacion:    niveles.ubicacion || null,
      });
      setModalConfig(false);
      await cargarTodo();
    } catch (e) {
      alert(e.response?.data?.message || 'Error al guardar configuración');
    } finally {
      setSavingNiveles(false);
    }
  };

  if (loading) return (
    <AdminLayout title="Control de Stock">
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Cargando información de stock...</p>
      </div>
    </AdminLayout>
  );

  return (
    <AdminLayout title="Control de Stock">
      <div className="dashboard-content">

        {/* ── Tarjetas de resumen ── */}
        <div className="stats-row">
          <div className="stat-card blue">
            <div className="stat-header">
              <h3>Total Artículos</h3>
              <span className="stat-icon material-icons">inventory_2</span>
            </div>
            <div className="stat-body">
              <p className="stat-number">{resumen.total_articulos ?? 0}</p>
            </div>
            <div className="stat-footer">
              <span className="stat-period">{(resumen.total_unidades ?? 0).toLocaleString()} unidades totales</span>
            </div>
          </div>

          <div className="stat-card orange">
            <div className="stat-header">
              <h3>Stock Bajo</h3>
              <span className="stat-icon material-icons">warning</span>
            </div>
            <div className="stat-body">
              <p className="stat-number">{resumen.bajo_stock ?? 0}</p>
            </div>
            <div className="stat-footer">
              <span className="stat-period">Bajo mínimo</span>
            </div>
          </div>

          <div className="stat-card red">
            <div className="stat-header">
              <h3>Críticos</h3>
              <span className="stat-icon material-icons">error</span>
            </div>
            <div className="stat-body">
              <p className="stat-number">{resumen.criticos ?? 0}</p>
            </div>
            <div className="stat-footer">
              <span className="stat-period">≤ 25% del mínimo</span>
            </div>
          </div>

          <div className="stat-card red">
            <div className="stat-header">
              <h3>Sin Stock</h3>
              <span className="stat-icon material-icons">remove_circle</span>
            </div>
            <div className="stat-body">
              <p className="stat-number">{resumen.sin_stock ?? 0}</p>
            </div>
            <div className="stat-footer">
              <span className="stat-period">Agotados</span>
            </div>
          </div>
        </div>

        {/* ── Panel de alertas ── */}
        {alertas.length > 0 && (
          <div className="chart-card" style={{ marginBottom: 24 }}>
            <div className="card-header">
              <h3>
                <span className="material-icons" style={{ verticalAlign:'middle', marginRight:8, color:'#f39c12' }}>
                  notifications_active
                </span>
                Alertas de Stock ({alertas.length})
              </h3>
            </div>
            <div className="card-body" style={{ padding:'12px 24px' }}>
              <div className="alertas-grid">
                {alertas.slice(0, 8).map(a => (
                  <div key={a.id} className={`alerta-chip ${a.tipo_alerta}`}>
                    <span className="material-icons">
                      {a.tipo_alerta === 'sin-stock' ? 'remove_circle' :
                       a.tipo_alerta === 'critico'   ? 'error'         : 'warning'}
                    </span>
                    <div>
                      <strong>{a.nombre}</strong>
                      <span>{a.codigo} — Stock: {a.stock_actual} / Mín: {a.stock_minimo}</span>
                    </div>
                  </div>
                ))}
                {alertas.length > 8 && (
                  <div className="alerta-chip mas">
                    <span className="material-icons">more_horiz</span>
                    <span>+{alertas.length - 8} más</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Tabla principal ── */}
        <div className="chart-card">
          <div className="card-header">
            <h3>Inventario por Estado</h3>
            <div className="card-actions" style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
              {/* Búsqueda */}
              <div className="stock-search">
                <span className="material-icons">search</span>
                <input
                  type="text"
                  placeholder="Buscar..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                />
              </div>
              {/* Filtros */}
              {['todos','bajo','critico','normal'].map(f => (
                <button
                  key={f}
                  className={`btn-filter ${filtro === f ? 'active' : ''}`}
                  onClick={() => setFiltro(f)}
                >
                  {f === 'todos' ? 'Todos' : f === 'bajo' ? 'Bajo' : f === 'critico' ? 'Crítico' : 'Normal'}
                </button>
              ))}
            </div>
          </div>

          <div className="card-body">
            <div className="stock-table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Artículo</th>
                    <th>Categoría</th>
                    <th>Ubicación</th>
                    <th style={{ textAlign:'center' }}>Stock</th>
                    <th style={{ textAlign:'center' }}>Mín.</th>
                    <th style={{ textAlign:'center' }}>Máx.</th>
                    <th>Nivel</th>
                    <th>Estado</th>
                    <th>Config.</th>
                  </tr>
                </thead>
                <tbody>
                  {productosFiltrados.length === 0 ? (
                    <tr>
                      <td colSpan="10" style={{ textAlign:'center', padding:40, color:'#adb5bd' }}>
                        No hay artículos que mostrar
                      </td>
                    </tr>
                  ) : productosFiltrados.map(p => {
                    const estado     = obtenerEstado(p);
                    const porcentaje = obtenerPorcentaje(p);
                    const color      = colorEstado(estado);
                    return (
                      <tr key={p.id}>
                        <td><strong>{p.codigo}</strong></td>
                        <td>{p.nombre}</td>
                        <td><span className="categoria-tag">{p.categoria}</span></td>
                        <td className="text-muted">{p.ubicacion || '—'}</td>
                        <td style={{ textAlign:'center' }}>
                          <strong style={{ color, fontSize:16 }}>{p.stock_actual ?? 0}</strong>
                        </td>
                        <td style={{ textAlign:'center', color:'#6c757d' }}>{p.stock_minimo ?? 0}</td>
                        <td style={{ textAlign:'center', color:'#6c757d' }}>{p.stock_maximo ?? 0}</td>
                        <td style={{ minWidth:120 }}>
                          <div className="nivel-bar-wrap">
                            <div className="nivel-bar-track">
                              <div
                                className="nivel-bar-fill"
                                style={{ width:`${porcentaje}%`, background: color }}
                              />
                            </div>
                            <small style={{ color:'#6c757d', fontSize:11 }}>{porcentaje}%</small>
                          </div>
                        </td>
                        <td>
                          <span className={`badge ${badgeEstado(estado)}`}>
                            {labelEstado(estado)}
                          </span>
                        </td>
                        <td>
                          <button
                            className="btn-icon"
                            onClick={() => abrirModalConfig(p)}
                            title="Configurar niveles"
                          >
                            <span className="material-icons">settings</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>

      {/* ════════════════════════════════
          MODAL: Configurar niveles
          ════════════════════════════════ */}
      {modalConfig && productoSeleccionado && (
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
                <h3>{productoSeleccionado.nombre}</h3>
                <p>Código: <strong>{productoSeleccionado.codigo}</strong></p>
                <p>Stock actual: <strong style={{ color: colorEstado(obtenerEstado(productoSeleccionado)) }}>
                  {productoSeleccionado.stock_actual ?? 0} unidades
                </strong></p>
              </div>

              <div className="stock-form-group">
                <label>Stock Mínimo</label>
                <input
                  type="number" min="0"
                  value={niveles.stock_minimo}
                  onChange={(e) => setNiveles({ ...niveles, stock_minimo: e.target.value })}
                />
                <small>Alerta cuando el stock llegue a este nivel</small>
              </div>

              <div className="stock-form-group">
                <label>Stock Máximo</label>
                <input
                  type="number" min="0"
                  value={niveles.stock_maximo}
                  onChange={(e) => setNiveles({ ...niveles, stock_maximo: e.target.value })}
                />
                <small>Nivel máximo recomendado de almacenamiento</small>
              </div>

              <div className="stock-form-group">
                <label>Ubicación en Almacén</label>
                <input
                  type="text" placeholder="Ej: Estante A-3, Pasillo 2..."
                  value={niveles.ubicacion}
                  onChange={(e) => setNiveles({ ...niveles, ubicacion: e.target.value })}
                />
              </div>

              <div className="stock-alert-info">
                <strong>
                  <span className="material-icons">info</span>
                  Niveles de alerta con estos valores:
                </strong>
                <ul>
                  <li>🔴 <strong>Crítico:</strong> ≤ {Math.round((parseInt(niveles.stock_minimo)||0) * 0.25)} uds (25% del mínimo)</li>
                  <li>⚠️ <strong>Bajo:</strong> ≤ {parseInt(niveles.stock_minimo)||0} uds (mínimo)</li>
                  <li>✅ <strong>Normal:</strong> entre {parseInt(niveles.stock_minimo)||0} y {parseInt(niveles.stock_maximo)||0} uds</li>
                  <li>📦 <strong>Sobre stock:</strong> ≥ {parseInt(niveles.stock_maximo)||0} uds</li>
                </ul>
              </div>
            </div>

            <div className="stock-modal-footer">
              <button className="stock-btn-secondary" onClick={() => setModalConfig(false)}>
                Cancelar
              </button>
              <button className="stock-btn-primary" onClick={guardarConfiguracion} disabled={savingNiveles}>
                <span className="material-icons">save</span>
                {savingNiveles ? 'Guardando...' : 'Guardar Configuración'}
              </button>
            </div>
          </div>
        </div>
      )}

    </AdminLayout>
  );
};

export default Stock;