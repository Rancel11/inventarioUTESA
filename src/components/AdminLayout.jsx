import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import api from '../../server/config/api';
import './AdminLayout.css';

const AdminLayout = ({ children, title = 'Dashboard' }) => {
  const navigate  = useNavigate();
  const location  = useLocation();
  const [user,              setUser]              = useState(null);
  const [sidebarCollapsed,  setSidebarCollapsed]  = useState(false);
  const [dropdownOpen,      setDropdownOpen]      = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificaciones,    setNotificaciones]    = useState([]);
  const [cantidadNoLeidas,  setCantidadNoLeidas]  = useState(0);

  useEffect(() => {
    const token    = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (!token || !userData) { navigate('/login'); return; }
    const parsed = JSON.parse(userData);
    setUser(parsed);

    // Redirigir solicitante siempre a /solicitudes si intenta entrar a /dashboard
    if (parsed.rol === 'solicitante' && location.pathname === '/dashboard') {
      navigate('/solicitudes', { replace: true });
    }
  }, [navigate]);

  // Notificaciones: NO cargar para el rol solicitante
  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    if (userData.rol === 'solicitante') return;

    cargarNotificaciones();
    const interval = setInterval(() => {
      cargarNotificaciones();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    if (userData.rol === 'solicitante') return;
    cargarNotificaciones();
  }, [location.pathname]);

  const cargarNotificaciones = async () => {
    try {
      const { data: articulos } = await api.get('/api/articulos');
      const hoy = new Date();
      const nuevasNotificaciones = [];

      articulos.forEach(art => {
        const stock  = art.stock_actual || 0;
        const minimo = art.stock_minimo  || 0;

        if (stock === 0) {
          nuevasNotificaciones.push({
            id: `stock-critico-${art.id}`, tipo: 'critico',
            titulo: 'Stock Agotado',
            mensaje: `${art.nombre} (${art.codigo}) no tiene stock disponible`,
            fecha: new Date().toISOString(), articulo_id: art.id, leida: false,
          });
        } else if (minimo > 0 && stock <= minimo * 0.25 && stock > 0) {
          nuevasNotificaciones.push({
            id: `stock-bajo-${art.id}`, tipo: 'critico',
            titulo: 'Stock Crítico',
            mensaje: `${art.nombre} (${art.codigo}) tiene solo ${stock} unidades (Mín: ${minimo})`,
            fecha: new Date().toISOString(), articulo_id: art.id, leida: false,
          });
        } else if (minimo > 0 && stock <= minimo) {
          nuevasNotificaciones.push({
            id: `stock-minimo-${art.id}`, tipo: 'warning',
            titulo: 'Stock Bajo',
            mensaje: `${art.nombre} (${art.codigo}) está por debajo del mínimo (${stock}/${minimo})`,
            fecha: new Date().toISOString(), articulo_id: art.id, leida: false,
          });
        }

        if (art.fecha_caducidad) {
          const fechaCad      = new Date(art.fecha_caducidad);
          const diasRestantes = Math.ceil((fechaCad - hoy) / 86400000);

          if (diasRestantes < 0) {
            nuevasNotificaciones.push({
              id: `caducidad-vencido-${art.id}`, tipo: 'critico',
              titulo: 'Producto Vencido',
              mensaje: `${art.nombre} (${art.codigo}) venció hace ${Math.abs(diasRestantes)} días`,
              fecha: new Date().toISOString(), articulo_id: art.id, leida: false,
            });
          } else if (diasRestantes <= 7) {
            nuevasNotificaciones.push({
              id: `caducidad-critica-${art.id}`, tipo: 'critico',
              titulo: 'Caducidad Inminente',
              mensaje: `${art.nombre} (${art.codigo}) vence en ${diasRestantes} día${diasRestantes !== 1 ? 's' : ''}`,
              fecha: new Date().toISOString(), articulo_id: art.id, leida: false,
            });
          } else if (diasRestantes <= 30) {
            nuevasNotificaciones.push({
              id: `caducidad-prox-${art.id}`, tipo: 'warning',
              titulo: 'Próximo a Vencer',
              mensaje: `${art.nombre} (${art.codigo}) vence en ${diasRestantes} días`,
              fecha: new Date().toISOString(), articulo_id: art.id, leida: false,
            });
          }
        }
      });

      const leidasGuardadas = JSON.parse(localStorage.getItem('notificaciones_leidas') || '[]');
      const notificacionesActualizadas = nuevasNotificaciones.map(notif => ({
        ...notif,
        leida: leidasGuardadas.includes(notif.id),
      }));

      setNotificaciones(notificacionesActualizadas);
      setCantidadNoLeidas(notificacionesActualizadas.filter(n => !n.leida).length);
    } catch (e) {
      console.error('❌ Error al cargar notificaciones:', e);
    }
  };

  const marcarComoLeida = (notifId) => {
    const leidasGuardadas = JSON.parse(localStorage.getItem('notificaciones_leidas') || '[]');
    if (!leidasGuardadas.includes(notifId)) {
      leidasGuardadas.push(notifId);
      localStorage.setItem('notificaciones_leidas', JSON.stringify(leidasGuardadas));
    }
    setNotificaciones(prev => prev.map(n => n.id === notifId ? { ...n, leida: true } : n));
    setCantidadNoLeidas(prev => Math.max(0, prev - 1));
  };

  const marcarTodasComoLeidas = () => {
    const todasIds = notificaciones.map(n => n.id);
    localStorage.setItem('notificaciones_leidas', JSON.stringify(todasIds));
    setNotificaciones(prev => prev.map(n => ({ ...n, leida: true })));
    setCantidadNoLeidas(0);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;
  const permisos = user?.permisos ?? [];
  const can      = (p) => permisos.includes(p);
  const esSolicitante = user?.rol === 'solicitante';

  // ── Navegación según rol ──
  const navItemsAdmin = [
    { path: '/dashboard',   icon: 'dashboard',   label: 'Dashboard',   perm: null                  },
    { path: '/articulos',   icon: 'inventory',   label: 'Artículos',   perm: 'articulos:read'      },
    { path: '/stock',       icon: 'assessment',  label: 'Stock',       perm: 'stock:read'          },
    { path: '/movimientos', icon: 'sync_alt',    label: 'Movimientos', perm: 'movimientos:read'    },
    { path: '/proveedores', icon: 'store',       label: 'Proveedores', perm: 'proveedores:read'    },
    { path: '/reportes',    icon: 'analytics',   label: 'Reportes',    perm: 'reportes:read'       },
    { path: '/solicitudes', icon: 'assignment',  label: 'Solicitudes', perm: 'solicitudes:read'    },
    { path: '/usuarios',    icon: 'group',       label: 'Usuarios',    perm: 'usuarios:read'       },
  ];

  const navItemsSolicitante = [
    { path: '/solicitudes', icon: 'assignment',  label: 'Mis Solicitudes', perm: 'solicitudes:read' },
    { path: '/articulos',   icon: 'inventory',   label: 'Ver Artículos',   perm: 'articulos:read'   },
  ];

  const navItems = esSolicitante ? navItemsSolicitante : navItemsAdmin;

  const tiempoRelativo = (fecha) => {
    const diff = Math.floor((Date.now() - new Date(fecha)) / 60000);
    if (diff < 1)  return 'Ahora mismo';
    if (diff < 60) return `Hace ${diff}m`;
    const h = Math.floor(diff / 60);
    if (h < 24)    return `Hace ${h}h`;
    return `Hace ${Math.floor(h / 24)}d`;
  };

  const rolLabel = () => {
    const map = { admin: 'Administrador', encargado: 'Encargado', operador: 'Operador', solicitante: 'Solicitante' };
    return map[user?.rol] || user?.rol;
  };

  return (
    <div className="admin-container">
      {/* ── Sidebar ── */}
      <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <div className="logo">
            <span className="material-icons logo-icon">inventory_2</span>
            {!sidebarCollapsed && <span className="logo-text">SIGI-MJRD-UTESA</span>}
          </div>
          <button className="toggle-btn" onClick={() => setSidebarCollapsed(!sidebarCollapsed)}>
            <span className="material-icons">{sidebarCollapsed ? 'menu' : 'close'}</span>
          </button>
        </div>

        <nav className="sidebar-nav">
          <ul>
            {navItems.map(({ path, icon, label, perm }) => {
              if (perm && !can(perm)) return null;
              return (
                <li key={path} className={isActive(path) ? 'active' : ''}>
                  <Link to={path}>
                    <span className="material-icons icon">{icon}</span>
                    {!sidebarCollapsed && <span>{label}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* Configuración solo para no-solicitantes */}
          {!esSolicitante && (
            <div className="sidebar-footer">
              <ul>
                {can('configuracion:read') && (
                  <li className={isActive('/configuracion') ? 'active' : ''}>
                    <Link to="/configuracion">
                      <span className="material-icons icon">settings</span>
                      {!sidebarCollapsed && <span>Configuración</span>}
                    </Link>
                  </li>
                )}
              </ul>
            </div>
          )}
        </nav>
      </aside>

      {/* ── Main Content ── */}
      <div className="main-content">
        <header className="top-navbar">
          <div className="navbar-left">
            <h1 className="page-title">{title}</h1>
          </div>
          <div className="navbar-right">
            <div className="search-box">
              <span className="material-icons search-icon">search</span>
              <input type="text" placeholder="Buscar..." />
            </div>

            {/* Notificaciones: OCULTAS para solicitante */}
            {!esSolicitante && (
              <div className="notification-wrapper">
                <button
                  className="notification-btn"
                  onClick={() => setNotificationsOpen(!notificationsOpen)}
                >
                  <span className="material-icons">notifications</span>
                  {cantidadNoLeidas > 0 && (
                    <span className="badge">{cantidadNoLeidas > 99 ? '99+' : cantidadNoLeidas}</span>
                  )}
                </button>

                {notificationsOpen && (
                  <>
                    <div className="notification-overlay" onClick={() => setNotificationsOpen(false)} />
                    <div className="notification-panel">
                      <div className="notification-header">
                        <h3>Notificaciones</h3>
                        {cantidadNoLeidas > 0 && (
                          <button className="btn-marcar-leidas" onClick={marcarTodasComoLeidas}>
                            Marcar todas como leídas
                          </button>
                        )}
                      </div>
                      <div className="notification-list">
                        {notificaciones.length === 0 ? (
                          <div className="notification-empty">
                            <span className="material-icons">notifications_none</span>
                            <p>No hay notificaciones</p>
                          </div>
                        ) : (
                          notificaciones.map(notif => (
                            <div
                              key={notif.id}
                              className={`notification-item ${notif.tipo} ${notif.leida ? 'leida' : ''}`}
                              onClick={() => marcarComoLeida(notif.id)}
                            >
                              <div className="notif-icon">
                                <span className="material-icons">
                                  {notif.tipo === 'critico' ? 'error' : notif.tipo === 'warning' ? 'warning' : 'info'}
                                </span>
                              </div>
                              <div className="notif-content">
                                <h4>{notif.titulo}</h4>
                                <p>{notif.mensaje}</p>
                                <span className="notif-time">{tiempoRelativo(notif.fecha)}</span>
                              </div>
                              {!notif.leida && <div className="notif-dot"></div>}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            <div className="user-menu">
              <div className="user-avatar">
                <span>{user?.nombre?.charAt(0).toUpperCase()}</span>
              </div>
              <div className="user-info">
                <span className="user-name">{user?.nombre}</span>
                <span className="user-role">{rolLabel()}</span>
              </div>
              <div className="dropdown">
                <button className="dropdown-toggle" onClick={() => setDropdownOpen(!dropdownOpen)}>
                  <span className="material-icons">{dropdownOpen ? 'expand_less' : 'expand_more'}</span>
                </button>
                {dropdownOpen && (
                  <div className="dropdown-menu">
                    <Link to="/perfil" onClick={() => setDropdownOpen(false)}>
                      <span className="material-icons">person</span>Mi Perfil
                    </Link>
                    {can('configuracion:read') && (
                      <Link to="/configuracion" onClick={() => setDropdownOpen(false)}>
                        <span className="material-icons">settings</span>Configuración
                      </Link>
                    )}
                    <a href="#" onClick={handleLogout}>
                      <span className="material-icons">logout</span>Cerrar Sesión
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        <div className="page-content">
          {children}
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;