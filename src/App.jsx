import React from 'react';
import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
  Outlet,
} from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Articulos from './pages/Articulos';
import Movimientos from './pages/Movimientos';
import Stock from './pages/Stock';
import Reportes from './pages/Reportes';
import Configuracion from './pages/Configuracion';
import Usuarios from './pages/Usuarios';
import Proveedores from './pages/Proveedores';
import Solicitudes from './pages/Solicitudes';

// ─────────────────────────────────────────────────
// Guard: redirige al login si no hay token.
// Si el usuario es solicitante y va a /dashboard → /solicitudes
// Si requiredPerm definido y no lo tiene → /dashboard (o /solicitudes)
// ─────────────────────────────────────────────────
const PrivateRoute = ({ requiredPerm, children }) => {
  const token    = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" replace />;

  const userData = JSON.parse(localStorage.getItem('user') || '{}');
  const permisos = userData.permisos ?? [];
  const esSolicitante = userData.rol === 'solicitante';

  // Solicitante no puede acceder a rutas que no sean las suyas
  if (requiredPerm && !permisos.includes(requiredPerm)) {
    return <Navigate to={esSolicitante ? '/solicitudes' : '/dashboard'} replace />;
  }

  return children;
};

// ─────────────────────────────────────────────────
// Guard especial para /dashboard:
// si es solicitante, redirige directo a /solicitudes
// ─────────────────────────────────────────────────
const DashboardRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" replace />;

  const userData = JSON.parse(localStorage.getItem('user') || '{}');
  if (userData.rol === 'solicitante') {
    return <Navigate to="/solicitudes" replace />;
  }

  return children;
};

// ─────────────────────────────────────────────────
// Layout público — con Header y Footer
// ─────────────────────────────────────────────────
const PublicLayout = () => (
  <>
    <Header />
    <main><Outlet /></main>
    <Footer />
  </>
);

// ─────────────────────────────────────────────────
// Layout admin — sin Header/Footer públicos
// ─────────────────────────────────────────────────
const AdminShell = () => (
  <main><Outlet /></main>
);

// ─────────────────────────────────────────────────
// Router
// ─────────────────────────────────────────────────
const router = createBrowserRouter(
  [
    // ── Páginas públicas ────────────────────────
    {
      element: <PublicLayout />,
      children: [
        { index: true,      element: <Home />     },
        { path: '/login',    element: <Login />    },
        { path: '/register', element: <Register /> },
      ],
    },

    // ── Panel admin / solicitante ────────────────
    {
      element: <AdminShell />,
      children: [
        {
          path: '/dashboard',
          element: <DashboardRoute><Dashboard /></DashboardRoute>,
        },
        {
          path: '/articulos',
          element: <PrivateRoute requiredPerm="articulos:read"><Articulos /></PrivateRoute>,
        },
        {
          path: '/movimientos',
          element: <PrivateRoute requiredPerm="movimientos:read"><Movimientos /></PrivateRoute>,
        },
        {
          path: '/stock',
          element: <PrivateRoute requiredPerm="stock:read"><Stock /></PrivateRoute>,
        },
        {
          path: '/reportes',
          element: <PrivateRoute requiredPerm="reportes:read"><Reportes /></PrivateRoute>,
        },
        {
          path: '/proveedores',
          element: <PrivateRoute requiredPerm="proveedores:read"><Proveedores /></PrivateRoute>,
        },
        {
          path: '/usuarios',
          element: <PrivateRoute requiredPerm="usuarios:read"><Usuarios /></PrivateRoute>,
        },
        {
          path: '/configuracion',
          element: <PrivateRoute requiredPerm="configuracion:read"><Configuracion /></PrivateRoute>,
        },
        {
          path: '/solicitudes',
          element: <PrivateRoute requiredPerm="solicitudes:read"><Solicitudes /></PrivateRoute>,
        },
      ],
    },

    // ── Catch-all ───────────────────────────────
    { path: '*', element: <Navigate to="/" replace /> },
  ],
  {
    future: {
      v7_startTransition:   true,
      v7_relativeSplatPath: true,
    },
  }
);

function App() {
  return <RouterProvider router={router} />;
}

export default App;