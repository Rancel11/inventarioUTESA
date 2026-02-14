import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import './AdminLayout.css';

const AdminLayout = ({ children, title = 'Dashboard' }) => {
  const navigate  = useNavigate();
  const location  = useLocation();
  const [user,            setUser]            = useState(null);
  const [sidebarCollapsed,setSidebarCollapsed]= useState(false);
  const [dropdownOpen,    setDropdownOpen]    = useState(false);

  useEffect(() => {
    const token    = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (!token || !userData) { navigate('/login'); return; }
    setUser(JSON.parse(userData));
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const isActive  = (path) => location.pathname === path;
  const permisos  = user?.permisos ?? [];
  const can       = (p) => permisos.includes(p);

  const navItems = [
    { path:'/dashboard',   icon:'dashboard',          label:'Dashboard',   perm: null              },
    { path:'/articulos',   icon:'inventory',           label:'Artículos',   perm:'articulos:read'   },
    { path:'/stock',       icon:'assessment',          label:'Stock',       perm:'stock:read'       },
    { path:'/movimientos', icon:'sync_alt',            label:'Movimientos', perm:'movimientos:read' },
    { path:'/proveedores', icon:'store',               label:'Proveedores', perm:'proveedores:read' },
    { path:'/reportes',    icon:'analytics',           label:'Reportes',    perm:'reportes:read'    },
    { path:'/usuarios',    icon:'group',               label:'Usuarios',    perm:'usuarios:read'    },
  ];

  return (
    <div className="admin-container">
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <div className="logo">
            <span className="material-icons logo-icon">inventory_2</span>
            {!sidebarCollapsed && <span className="logo-text">Inventario</span>}
          </div>
          <button className="toggle-btn" onClick={() => setSidebarCollapsed(!sidebarCollapsed)}>
            <span className="material-icons">{sidebarCollapsed ? 'menu' : 'close'}</span>
          </button>
        </div>

        <nav className="sidebar-nav">
          <ul>
            {navItems.map(({ path, icon, label, perm }) => {
              // Mostrar solo si no requiere permiso, o si el usuario tiene el permiso
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
        </nav>
      </aside>

      {/* Main Content */}
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
            <button className="notification-btn">
              <span className="material-icons">notifications</span>
              <span className="badge">3</span>
            </button>
            <div className="user-menu">
              <div className="user-avatar">
                <span>{user?.nombre?.charAt(0).toUpperCase()}</span>
              </div>
              <div className="user-info">
                <span className="user-name">{user?.nombre}</span>
                <span className="user-role">
                  {user?.rol === 'admin'     ? 'Administrador' :
                   user?.rol === 'encargado' ? 'Encargado'     : 'Operador'}
                </span>
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