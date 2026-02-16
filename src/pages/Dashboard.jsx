import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../server/config/api';
import AdminLayout from '../components/AdminLayout';
import './Dashboard.css';

const Dashboard = () => {
  const [stats,       setStats]       = useState({ articulos:0, stock:0, movHoy:0, stockBajo:0 });
  const [articulos,   setArticulos]   = useState([]);
  const [movimientos, setMovimientos] = useState([]);
  const [categorias,  setCategorias]  = useState([]);
  const [loading,     setLoading]     = useState(true);

  useEffect(() => { cargarTodo(); }, []);

  const cargarTodo = async () => {
    try {
      const [resArts, resMov, resStock] = await Promise.all([
        api.get('/api/articulos'),
        api.get('/api/movimientos?limit=20'),
        api.get('/api/stock/resumen'),
      ]);

      const arts = resArts.data;
      const movs = resMov.data;
      const resumen = resStock.data;

      // ── Stats ────────────────────────────────
      const hoy = new Date().toISOString().split('T')[0];
      const movHoy = movs.filter(m =>
        m.fecha_movimiento?.split('T')[0] === hoy
      ).length;

      setStats({
        articulos: arts.length,
        stock:     resumen.total_unidades ?? 0,
        movHoy,
        stockBajo: (resumen.bajo_stock ?? 0) + (resumen.criticos ?? 0),
      });

      // ── Últimos 5 artículos ───────────────────
      setArticulos(arts.slice(0, 5));

      // ── Últimos 6 movimientos ─────────────────
      setMovimientos(movs.slice(0, 6));

      // ── Artículos por categoría ───────────────
      const catMap = {};
      arts.forEach(a => {
        catMap[a.categoria] = (catMap[a.categoria] || 0) + 1;
      });
      const total = arts.length || 1;
      const sorted = Object.entries(catMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([cat, count]) => ({
          cat, count,
          pct: Math.round((count / total) * 100),
        }));
      setCategorias(sorted);

    } catch (e) {
      console.error('Error al cargar dashboard:', e);
    } finally {
      setLoading(false);
    }
  };

  // ── Helpers ──────────────────────────────────
  const fmtRelativo = (fecha) => {
    if (!fecha) return '';
    const diff = Math.floor((Date.now() - new Date(fecha)) / 60000);
    if (diff <  1) return 'Ahora mismo';
    if (diff < 60) return `Hace ${diff}m`;
    const h = Math.floor(diff / 60);
    if (h   < 24) return `Hace ${h}h`;
    return `Hace ${Math.floor(h / 24)}d`;
  };

  const stockStatus = (art) => {
    const s = art.stock_actual ?? 0;
    const m = art.stock_minimo ?? 0;
    if (s <= 0)       return { cls:'danger',  label:'Sin Stock'  };
    if (s <= m)       return { cls:'warning', label:'Stock Bajo' };
    return                   { cls:'success', label:'Disponible' };
  };

  const CAT_COLORS = ['#468189','#77ACA2','#9DBEBB','#F4A261','#E76F51','#264653'];

  // Generar segmentos para el donut SVG
  const buildDonut = (cats) => {
    let offset = 0;
    const r = 15.915; // radio para circunferencia 100
    return cats.map((c, i) => {
      const dash = c.pct;
      const seg = { pct: c.pct, dash, offset, color: CAT_COLORS[i] };
      offset += dash;
      return seg;
    });
  };

  if (loading) return (
    <AdminLayout title="Dashboard">
      <div className="dashboard-loading">
        <div className="spinner"></div>
        <p>Cargando datos...</p>
      </div>
    </AdminLayout>
  );

  const donutSegs = buildDonut(categorias);

  return (
    <AdminLayout title="Dashboard Overview">
      <div className="dashboard-content">

        {/* ══ STATS ══════════════════════════════════ */}
        <div className="stats-row">
          {[
            { color:'blue',   icon:'inventory',   label:'Total Artículos',  val: stats.articulos.toLocaleString(), sub:'En catálogo' },
            { color:'green',  icon:'warehouse',   label:'Stock Total',      val: stats.stock.toLocaleString(),     sub:'Unidades en almacén' },
            { color:'orange', icon:'swap_horiz',  label:'Movimientos Hoy',  val: stats.movHoy,                     sub:'Entradas y salidas' },
            { color:'red',    icon:'warning',     label:'Alertas Stock',    val: stats.stockBajo,                  sub:'Bajo mínimo' },
          ].map(({ color, icon, label, val, sub }) => (
            <div key={label} className={`stat-card ${color}`}>
              <div className="stat-header">
                <h3>{label}</h3>
                <span className={`material-icons stat-icon`}>{icon}</span>
              </div>
              <div className="stat-body">
                <h2 className="stat-number">{val}</h2>
              </div>
              <div className="stat-footer">
                <span className="stat-period">{sub}</span>
              </div>
            </div>
          ))}
        </div>

        {/* ══ CHARTS ROW ═════════════════════════════ */}
        <div className="charts-row">

          {/* Actividad Reciente */}
          <div className="chart-card large">
            <div className="card-header">
              <h3>Actividad Reciente</h3>
              <Link to="/movimientos" className="view-all">
                Ver todos <span className="material-icons">arrow_forward</span>
              </Link>
            </div>
            <div className="card-body">
              {movimientos.length === 0 ? (
                <div className="empty-dash">
                  <span className="material-icons">inbox</span>
                  <p>Sin movimientos registrados</p>
                </div>
              ) : (
                <div className="activity-list">
                  {movimientos.map(m => (
                    <div key={m.id} className="activity-item">
                      <div className={`activity-icon ${
                        m.tipo_movimiento === 'entrada' ? 'green' :
                        m.tipo_movimiento === 'salida'  ? 'red'   : 'blue'
                      }`}>
                        <span className="material-icons">
                          {m.tipo_movimiento === 'entrada' ? 'add'    :
                           m.tipo_movimiento === 'salida'  ? 'remove' : 'tune'}
                        </span>
                      </div>
                      <div className="activity-content">
                        <p>
                          <strong style={{ textTransform:'capitalize' }}>
                            {m.tipo_movimiento}
                          </strong>
                          {' · '}
                          <span style={{ color:'#6c757d' }}>{m.articulo_nombre}</span>
                        </p>
                        <span>
                          {m.tipo_movimiento === 'entrada' ? '+' : '-'}{m.cantidad} uds
                          {m.usuario_nombre && ` · ${m.usuario_nombre}`}
                        </span>
                        <span className="time">{fmtRelativo(m.fecha_movimiento)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Artículos por Categoría */}
          <div className="chart-card small">
            <div className="card-header">
              <h3>Por Categoría</h3>
            </div>
            <div className="card-body">
              {categorias.length === 0 ? (
                <div className="empty-dash">
                  <span className="material-icons">category</span>
                  <p>Sin categorías</p>
                </div>
              ) : (
                <>
                  {/* Mini donut SVG */}
                  <div className="donut-wrap">
                    <svg viewBox="0 0 36 36" className="donut-svg">
                      {donutSegs.map((s, i) => (
                        <circle key={i}
                          cx="18" cy="18" r="15.91549430918954"
                          fill="transparent"
                          stroke={s.color}
                          strokeWidth="4"
                          strokeDasharray={`${s.dash} ${100 - s.dash}`}
                          strokeDashoffset={`${25 - s.offset}`}
                        />
                      ))}
                      <text x="18" y="20.5" textAnchor="middle"
                        fontSize="6" fontWeight="bold" fill="#2c3e50">
                        {categorias.length}
                      </text>
                    </svg>
                  </div>

                  <div className="cat-legend">
                    {categorias.map((c, i) => (
                      <div key={c.cat} className="cat-row">
                        <span className="cat-dot" style={{ background: CAT_COLORS[i] }}/>
                        <span className="cat-name">{c.cat}</span>
                        <span className="cat-pct">{c.pct}%</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ══ TABLES ROW ═════════════════════════════ */}
        <div className="tables-row">

          {/* Artículos recientes */}
          <div className="table-card">
            <div className="card-header">
              <h3>Artículos en Inventario</h3>
              <Link to="/articulos" className="view-all">
                Ver todos <span className="material-icons">arrow_forward</span>
              </Link>
            </div>
            <div className="card-body">
              {articulos.length === 0 ? (
                <div className="empty-dash">
                  <span className="material-icons">inventory_2</span>
                  <p>No hay artículos registrados</p>
                </div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Código</th>
                      <th>Nombre</th>
                      <th>Categoría</th>
                      <th>Stock</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {articulos.map(art => {
                      const st = stockStatus(art);
                      return (
                        <tr key={art.id}>
                          <td><strong>{art.codigo}</strong></td>
                          <td>{art.nombre}</td>
                          <td>
                            <span style={{
                              background:'#e8ecfd', color:'#4361ee',
                              padding:'2px 8px', borderRadius:12,
                              fontSize:12, fontWeight:500,
                            }}>{art.categoria}</span>
                          </td>
                          <td style={{ textAlign:'center' }}><strong>{art.stock_actual ?? 0}</strong></td>
                          <td><span className={`badge ${st.cls}`}>{st.label}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Alertas de stock */}
          <div className="table-card">
            <div className="card-header">
              <h3>Alertas de Stock</h3>
              <Link to="/stock" className="view-all">
                Ver stock <span className="material-icons">arrow_forward</span>
              </Link>
            </div>
            <div className="card-body">
              {stats.stockBajo === 0 ? (
                <div className="empty-dash ok">
                  <span className="material-icons">check_circle</span>
                  <p>¡Todo el stock en niveles correctos!</p>
                </div>
              ) : (
                <div className="activity-list">
                  {articulos
                    .filter(a => (a.stock_actual ?? 0) <= (a.stock_minimo ?? 0))
                    .slice(0, 5)
                    .map(art => {
                      const critico = (art.stock_actual ?? 0) === 0 ||
                        (art.stock_actual ?? 0) <= (art.stock_minimo ?? 0) * 0.25;
                      return (
                        <div key={art.id} className="activity-item">
                          <div className={`activity-icon ${critico ? 'red' : 'orange'}`}>
                            <span className="material-icons">
                              {critico ? 'error' : 'warning'}
                            </span>
                          </div>
                          <div className="activity-content">
                            <p><strong>{art.nombre}</strong></p>
                            <span>
                              Stock: {art.stock_actual ?? 0}
                              {art.stock_minimo ? ` / Mín: ${art.stock_minimo}` : ''}
                            </span>
                            <span>{art.categoria}</span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </AdminLayout>
  );
};

export default Dashboard;