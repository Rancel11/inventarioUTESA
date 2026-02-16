import React, { useState, useEffect } from 'react';
import './Reportes.css';
import api from '../../server/config/api';
import AdminLayout from '../components/AdminLayout';

// ─────────────────────────────────────────────────
// Tipos de reporte disponibles
// ─────────────────────────────────────────────────
const TIPOS = [
  { value: 'inventario',  label: 'Inventario General',       icon: 'inventory_2'   },
  { value: 'movimientos', label: 'Movimientos',               icon: 'sync_alt'      },
  { value: 'stock-bajo',  label: 'Artículos con Stock Bajo',  icon: 'warning'       },
  { value: 'caducidad',   label: 'Artículos por Caducidad',   icon: 'event_busy'    },
  { value: 'proveedores', label: 'Resumen de Proveedores',    icon: 'store'         },
];

const Reportes = () => {
  const [loading,       setLoading]       = useState(false);
  const [tipoReporte,   setTipoReporte]   = useState('inventario');
  const [fechaInicio,   setFechaInicio]   = useState('');
  const [fechaFin,      setFechaFin]      = useState('');
  const [categoria,     setCategoria]     = useState('todas');
  const [categorias,    setCategorias]    = useState([]);
  const [datosReporte,  setDatosReporte]  = useState(null);
  const [estadisticas,  setEstadisticas]  = useState({
    total_articulos: 0,
    total_stock: 0,
    movimientos_mes: 0,
    alertas_activas: 0,
    por_vencer: 0,
  });

  useEffect(() => {
    cargarCategorias();
    cargarEstadisticas();
    const hoy      = new Date();
    const hace30   = new Date(hoy - 30 * 86400000);
    setFechaFin(hoy.toISOString().split('T')[0]);
    setFechaInicio(hace30.toISOString().split('T')[0]);
  }, []);

  // ── Carga inicial ──────────────────────────────
  const cargarCategorias = async () => {
    try {
      const { data } = await api.get('/api/articulos');
      const unicas = [...new Set(data.map(a => a.categoria).filter(Boolean))];
      setCategorias(unicas.sort());
    } catch (e) { console.error('Error al cargar categorías:', e); }
  };

  const cargarEstadisticas = async () => {
    try {
      // Artículos
      const { data: arts } = await api.get('/api/articulos');
      const hoy = new Date();

      let totalStock   = 0;
      let stockBajo    = 0;
      let porVencer    = 0;

      arts.forEach(a => {
        const cant = a.stock_actual || 0;
        totalStock += cant;
        if (cant <= (a.stock_minimo || 0)) stockBajo++;
        if (a.fecha_caducidad) {
          const diff = Math.ceil((new Date(a.fecha_caducidad) - hoy) / 86400000);
          if (diff >= 0 && diff <= 30) porVencer++;
        }
      });

      // Movimientos del mes
      const { data: movs } = await api.get('/api/movimientos?limit=500');
      const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
      const movMes = movs.filter(m => new Date(m.fecha_movimiento) >= inicioMes).length;

      setEstadisticas({
        total_articulos: arts.length,
        total_stock:     totalStock,
        movimientos_mes: movMes,
        alertas_activas: stockBajo,
        por_vencer:      porVencer,
      });
    } catch (e) { console.error('Error estadísticas:', e); }
  };

  // ── Generar reporte ────────────────────────────
  const generarReporte = async () => {
    if (!fechaInicio || !fechaFin) { alert('Selecciona un rango de fechas'); return; }
    setLoading(true);
    setDatosReporte(null);

    try {
      const params = {
        fecha_inicio: fechaInicio,
        fecha_fin:    fechaFin,
        categoria:    categoria !== 'todas' ? categoria : undefined,
      };

      // Construir datos según tipo usando los endpoints existentes
      if (tipoReporte === 'inventario' || tipoReporte === 'stock-bajo') {
        const { data } = await api.get('/api/articulos');
        let lista = data;
        if (categoria !== 'todas')   lista = lista.filter(a => a.categoria === categoria);
        if (tipoReporte === 'stock-bajo')
          lista = lista.filter(a => (a.stock_actual || 0) <= (a.stock_minimo || 0));
        setDatosReporte({ tipo: tipoReporte, articulos: lista });

      } else if (tipoReporte === 'movimientos') {
        const { data } = await api.get('/api/movimientos?limit=1000');
        const fi = new Date(fechaInicio);
        const ff = new Date(fechaFin + 'T23:59:59');
        const lista = data.filter(m => {
          const f = new Date(m.fecha_movimiento);
          return f >= fi && f <= ff;
        });
        setDatosReporte({ tipo: 'movimientos', movimientos: lista });

      } else if (tipoReporte === 'caducidad') {
        const { data } = await api.get('/api/articulos');
        const hoy = new Date();
        const lista = data
          .filter(a => a.fecha_caducidad)
          .map(a => ({
            ...a,
            dias_restantes: Math.ceil((new Date(a.fecha_caducidad) - hoy) / 86400000),
          }))
          .sort((a, b) => a.dias_restantes - b.dias_restantes);
        setDatosReporte({ tipo: 'caducidad', articulos: lista });

      } else if (tipoReporte === 'proveedores') {
        const { data } = await api.get('/api/proveedores');
        setDatosReporte({ tipo: 'proveedores', proveedores: data });
      }

    } catch (e) {
      console.error('Error al generar reporte:', e);
      alert('Error al generar el reporte');
    } finally {
      setLoading(false);
    }
  };

  // ── Exportar CSV (sin depender de backend) ─────
  const exportarCSV = () => {
    if (!datosReporte) { alert('Primero genera un reporte'); return; }

    let rows = [];
    let filename = `reporte_${tipoReporte}_${new Date().toISOString().split('T')[0]}.csv`;

    if (datosReporte.tipo === 'movimientos') {
      rows = [
        ['Fecha','Tipo','Código','Artículo','Cantidad','Usuario','Motivo'],
        ...datosReporte.movimientos.map(m => [
          new Date(m.fecha_movimiento).toLocaleDateString('es-ES'),
          m.tipo_movimiento, m.articulo_codigo, m.articulo_nombre,
          m.cantidad, m.usuario_nombre, m.motivo || '',
        ]),
      ];
    } else if (datosReporte.tipo === 'proveedores') {
      rows = [
        ['Código','Nombre','Contacto','Teléfono','Email','Ciudad','Artículos','Compras'],
        ...datosReporte.proveedores.map(p => [
          p.codigo, p.nombre, p.contacto || '', p.telefono || '',
          p.email || '', p.ciudad || '', p.total_articulos, p.total_compras,
        ]),
      ];
    } else {
      rows = [
        ['Código','Nombre','Categoría','Proveedor','Stock','Stock Mín','Stock Máx','Ubicación','Caducidad','Estado'],
        ...datosReporte.articulos.map(a => {
          const estado = (a.stock_actual || 0) <= 0 ? 'Sin Stock'
            : (a.stock_actual || 0) <= (a.stock_minimo || 0) ? 'Stock Bajo'
            : 'Disponible';
          return [
            a.codigo, a.nombre, a.categoria, a.proveedor_nombre || '',
            a.stock_actual || 0, a.stock_minimo || 0, a.stock_maximo || 0,
            a.ubicacion || '', a.fecha_caducidad
              ? new Date(a.fecha_caducidad).toLocaleDateString('es-ES') : '',
            estado,
          ];
        }),
      ];
    }

    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  // ── Helpers visuales ──────────────────────────
  const fmtDate = (d) => d
    ? new Date(d).toLocaleDateString('es-ES',{ day:'2-digit',month:'2-digit',year:'numeric' })
    : '—';

  const stockBadge = (stock, minimo) => {
    if ((stock || 0) <= 0)            return <span className="badge sin-stock">Sin Stock</span>;
    if ((stock || 0) <= (minimo || 0)) return <span className="badge stock-bajo">Stock Bajo</span>;
    return <span className="badge disponible">Disponible</span>;
  };

  const caducidadBadge = (dias) => {
    if (dias < 0)   return <span className="badge sin-stock">Vencido ({Math.abs(dias)}d)</span>;
    if (dias <= 7)  return <span className="badge sin-stock">Crítico ({dias}d)</span>;
    if (dias <= 30) return <span className="badge stock-bajo">Próximo ({dias}d)</span>;
    return <span className="badge disponible">OK ({dias}d)</span>;
  };

  // ── Renders de tabla por tipo ──────────────────
  const renderTabla = () => {
    if (!datosReporte) return null;

    /* INVENTARIO GENERAL / STOCK BAJO */
    if (datosReporte.tipo === 'inventario' || datosReporte.tipo === 'stock-bajo') {
      const lista = datosReporte.articulos;
      return (
        <div className="reporte-tabla">
          <p className="reporte-meta">
            <span className="material-icons">info</span>
            {lista.length} artículo{lista.length !== 1 ? 's' : ''} encontrado{lista.length !== 1 ? 's' : ''}
          </p>
          <table className="data-table">
            <thead>
              <tr>
                <th>Código</th><th>Nombre</th><th>Categoría</th>
                <th>Proveedor</th><th>Stock</th><th>Mín.</th><th>Máx.</th>
                <th>Ubicación</th><th>Caducidad</th><th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {lista.length === 0
                ? <tr><td colSpan="10" className="td-empty">No hay artículos que mostrar</td></tr>
                : lista.map(a => (
                  <tr key={a.id}>
                    <td><strong>{a.codigo}</strong></td>
                    <td>{a.nombre}</td>
                    <td><span className="categoria-tag">{a.categoria}</span></td>
                    <td>{a.proveedor_nombre
                      ? <span className="proveedor-tag">{a.proveedor_nombre}</span>
                      : <span className="text-muted">—</span>}
                    </td>
                    <td style={{ textAlign:'center' }}><strong>{a.stock_actual || 0}</strong></td>
                    <td style={{ textAlign:'center' }}>{a.stock_minimo || 0}</td>
                    <td style={{ textAlign:'center' }}>{a.stock_maximo || 0}</td>
                    <td>{a.ubicacion || '—'}</td>
                    <td>{fmtDate(a.fecha_caducidad)}</td>
                    <td>{stockBadge(a.stock_actual, a.stock_minimo)}</td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      );
    }

    /* MOVIMIENTOS */
    if (datosReporte.tipo === 'movimientos') {
      const lista = datosReporte.movimientos;
      const entradas = lista.filter(m => m.tipo_movimiento === 'entrada').reduce((s,m) => s + m.cantidad, 0);
      const salidas  = lista.filter(m => m.tipo_movimiento === 'salida' ).reduce((s,m) => s + m.cantidad, 0);
      return (
        <div className="reporte-tabla">
          <div className="movimientos-resumen">
            <div className="mov-stat green">
              <span className="material-icons">arrow_downward</span>
              <div><strong>{entradas}</strong><span>Unidades entrada</span></div>
            </div>
            <div className="mov-stat red">
              <span className="material-icons">arrow_upward</span>
              <div><strong>{salidas}</strong><span>Unidades salida</span></div>
            </div>
            <div className="mov-stat blue">
              <span className="material-icons">receipt_long</span>
              <div><strong>{lista.length}</strong><span>Total movimientos</span></div>
            </div>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Fecha</th><th>Tipo</th><th>Código</th>
                <th>Artículo</th><th>Cantidad</th><th>Usuario</th><th>Motivo</th>
              </tr>
            </thead>
            <tbody>
              {lista.length === 0
                ? <tr><td colSpan="7" className="td-empty">No hay movimientos en este período</td></tr>
                : lista.map(m => (
                  <tr key={m.id}>
                    <td className="fecha-col">{fmtDate(m.fecha_movimiento)}</td>
                    <td>
                      <span className={`tipo-badge ${
                        m.tipo_movimiento === 'entrada' ? 'tipo-entrada' :
                        m.tipo_movimiento === 'salida'  ? 'tipo-salida'  : 'tipo-ajuste'
                      }`}>
                        <span className="material-icons">
                          {m.tipo_movimiento === 'entrada' ? 'add_circle' :
                           m.tipo_movimiento === 'salida'  ? 'remove_circle' : 'tune'}
                        </span>
                        {m.tipo_movimiento}
                      </span>
                    </td>
                    <td><strong>{m.articulo_codigo}</strong></td>
                    <td>{m.articulo_nombre}</td>
                    <td style={{ textAlign:'center' }}>
                      <strong style={{ color: m.tipo_movimiento === 'entrada' ? '#27ae60' : '#e74c3c' }}>
                        {m.tipo_movimiento === 'entrada' ? '+' : '-'}{m.cantidad}
                      </strong>
                    </td>
                    <td>{m.usuario_nombre}</td>
                    <td className="text-muted">{m.motivo || '—'}</td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      );
    }

    /* CADUCIDAD */
    if (datosReporte.tipo === 'caducidad') {
      const lista = datosReporte.articulos;
      const vencidos   = lista.filter(a => a.dias_restantes < 0).length;
      const criticos   = lista.filter(a => a.dias_restantes >= 0 && a.dias_restantes <= 7).length;
      const proximos   = lista.filter(a => a.dias_restantes > 7 && a.dias_restantes <= 30).length;
      return (
        <div className="reporte-tabla">
          <div className="movimientos-resumen">
            <div className="mov-stat red">
              <span className="material-icons">dangerous</span>
              <div><strong>{vencidos}</strong><span>Vencidos</span></div>
            </div>
            <div className="mov-stat orange">
              <span className="material-icons">priority_high</span>
              <div><strong>{criticos}</strong><span>Críticos (≤7d)</span></div>
            </div>
            <div className="mov-stat yellow">
              <span className="material-icons">schedule</span>
              <div><strong>{proximos}</strong><span>Próximos (≤30d)</span></div>
            </div>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Código</th><th>Nombre</th><th>Categoría</th>
                <th>Stock</th><th>Fecha Caducidad</th><th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {lista.length === 0
                ? <tr><td colSpan="6" className="td-empty">No hay artículos con fecha de caducidad registrada</td></tr>
                : lista.map(a => (
                  <tr key={a.id} className={a.dias_restantes < 0 ? 'row-vencido' : a.dias_restantes <= 7 ? 'row-critico' : ''}>
                    <td><strong>{a.codigo}</strong></td>
                    <td>{a.nombre}</td>
                    <td><span className="categoria-tag">{a.categoria}</span></td>
                    <td style={{ textAlign:'center' }}>{a.stock_actual || 0}</td>
                    <td>{fmtDate(a.fecha_caducidad)}</td>
                    <td>{caducidadBadge(a.dias_restantes)}</td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      );
    }

    /* PROVEEDORES */
    if (datosReporte.tipo === 'proveedores') {
      const lista = datosReporte.proveedores;
      return (
        <div className="reporte-tabla">
          <p className="reporte-meta">
            <span className="material-icons">info</span>
            {lista.length} proveedor{lista.length !== 1 ? 'es' : ''} activo{lista.length !== 1 ? 's' : ''}
          </p>
          <table className="data-table">
            <thead>
              <tr>
                <th>Código</th><th>Proveedor</th><th>Contacto</th>
                <th>Teléfono</th><th>Ciudad</th><th>Artículos</th><th>Órdenes</th>
              </tr>
            </thead>
            <tbody>
              {lista.length === 0
                ? <tr><td colSpan="7" className="td-empty">No hay proveedores registrados</td></tr>
                : lista.map(p => (
                  <tr key={p.id}>
                    <td><strong>{p.codigo}</strong></td>
                    <td>
                      <div>
                        <strong>{p.nombre}</strong>
                        {p.email && <br/>}
                        {p.email && <small className="text-muted">{p.email}</small>}
                      </div>
                    </td>
                    <td>{p.contacto || '—'}</td>
                    <td>{p.telefono || '—'}</td>
                    <td>{p.ciudad   || '—'}</td>
                    <td style={{ textAlign:'center' }}>
                      <span className="count-chip">{p.total_articulos || 0}</span>
                    </td>
                    <td style={{ textAlign:'center' }}>
                      <span className="count-chip">{p.total_compras || 0}</span>
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      );
    }

    return null;
  };

  return (
    <AdminLayout title="Reportes">
      <div className="reportes-content">

        {/* ── Estadísticas rápidas ── */}
        <div className="stats-row">
          <div className="stat-card blue">
            <div className="stat-header">
              <h3>Total Artículos</h3>
              <span className="stat-icon material-icons">inventory_2</span>
            </div>
            <div className="stat-body">
              <p className="stat-number">{estadisticas.total_articulos}</p>
            </div>
            <div className="stat-footer"><span className="stat-period">En catálogo</span></div>
          </div>

          <div className="stat-card green">
            <div className="stat-header">
              <h3>Stock Total</h3>
              <span className="stat-icon material-icons">warehouse</span>
            </div>
            <div className="stat-body">
              <p className="stat-number">{estadisticas.total_stock.toLocaleString()}</p>
            </div>
            <div className="stat-footer"><span className="stat-period">Unidades en almacén</span></div>
          </div>

          <div className="stat-card purple">
            <div className="stat-header">
              <h3>Movimientos</h3>
              <span className="stat-icon material-icons">sync_alt</span>
            </div>
            <div className="stat-body">
              <p className="stat-number">{estadisticas.movimientos_mes}</p>
            </div>
            <div className="stat-footer"><span className="stat-period">Este mes</span></div>
          </div>

          <div className="stat-card orange">
            <div className="stat-header">
              <h3>Alertas Stock</h3>
              <span className="stat-icon material-icons">warning</span>
            </div>
            <div className="stat-body">
              <p className="stat-number">{estadisticas.alertas_activas}</p>
            </div>
            <div className="stat-footer"><span className="stat-period">Bajo mínimo</span></div>
          </div>

          <div className="stat-card red">
            <div className="stat-header">
              <h3>Por Vencer</h3>
              <span className="stat-icon material-icons">event_busy</span>
            </div>
            <div className="stat-body">
              <p className="stat-number">{estadisticas.por_vencer}</p>
            </div>
            <div className="stat-footer"><span className="stat-period">Próximos 30 días</span></div>
          </div>
        </div>

        {/* ── Configurar Reporte ── */}
        <div className="chart-card">
          <div className="card-header">
            <h3>
              <span className="material-icons" style={{ verticalAlign:'middle', marginRight:8 }}>tune</span>
              Configurar Reporte
            </h3>
          </div>
          <div className="card-body">

            {/* Selector visual de tipo */}
            <div className="tipo-reporte-grid">
              {TIPOS.map(t => (
                <button
                  key={t.value}
                  className={`tipo-btn ${tipoReporte === t.value ? 'active' : ''}`}
                  onClick={() => { setTipoReporte(t.value); setDatosReporte(null); }}
                >
                  <span className="material-icons">{t.icon}</span>
                  <span>{t.label}</span>
                </button>
              ))}
            </div>

            <div className="filtros-grid">
              {/* Categoría — solo para tipos que la usan */}
              {['inventario','stock-bajo','caducidad'].includes(tipoReporte) && (
                <div className="filtro-group">
                  <label>Categoría</label>
                  <select value={categoria} onChange={(e) => setCategoria(e.target.value)} className="filtro-select">
                    <option value="todas">Todas las categorías</option>
                    {categorias.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              )}

              {/* Fechas — para movimientos */}
              {tipoReporte === 'movimientos' && (
                <>
                  <div className="filtro-group">
                    <label>Fecha Inicio</label>
                    <input type="date" value={fechaInicio}
                      onChange={(e) => setFechaInicio(e.target.value)} className="filtro-input" />
                  </div>
                  <div className="filtro-group">
                    <label>Fecha Fin</label>
                    <input type="date" value={fechaFin}
                      onChange={(e) => setFechaFin(e.target.value)} className="filtro-input" />
                  </div>
                </>
              )}
            </div>

            <div className="acciones-reporte">
              <button className="btn-generar" onClick={generarReporte} disabled={loading}>
                <span className="material-icons">analytics</span>
                {loading ? 'Generando...' : 'Generar Reporte'}
              </button>
              {datosReporte && (
                <button className="btn-exportar excel" onClick={exportarCSV}>
                  <span className="material-icons">download</span>
                  Exportar CSV
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Loading ── */}
        {loading && (
          <div className="chart-card">
            <div className="loading-reporte">
              <div className="spinner"></div>
              <p>Generando reporte...</p>
            </div>
          </div>
        )}

        {/* ── Resultados ── */}
        {!loading && datosReporte && (
          <div className="chart-card">
            <div className="card-header">
              <h3>
                <span className="material-icons" style={{ verticalAlign:'middle', marginRight:8 }}>description</span>
                {TIPOS.find(t => t.value === tipoReporte)?.label}
              </h3>
              {tipoReporte === 'movimientos' && (
                <div className="reporte-info">
                  <span className="material-icons">date_range</span>
                  {fmtDate(fechaInicio)} — {fmtDate(fechaFin)}
                </div>
              )}
            </div>
            <div className="card-body">
              {renderTabla()}
            </div>
          </div>
        )}

        {/* ── Estado vacío ── */}
        {!loading && !datosReporte && (
          <div className="chart-card">
            <div className="empty-state" style={{ padding:'60px 20px', textAlign:'center' }}>
              <span className="material-icons" style={{ fontSize:64, color:'#ccc', display:'block', marginBottom:16 }}>
                assessment
              </span>
              <h3 style={{ color:'#6c757d' }}>Selecciona un tipo de reporte y genera los resultados</h3>
              <p style={{ color:'#adb5bd' }}>Usa los filtros de arriba para configurar el reporte que necesitas</p>
            </div>
          </div>
        )}

      </div>
    </AdminLayout>
  );
};

export default Reportes;