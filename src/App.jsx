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

// ─────────────────────────────────────────────────
// Guard: redirige al login si no hay token.
// Si requiredPerm está definido y el usuario no lo tiene,
// redirige al /dashboard (no 403).
// ─────────────────────────────────────────────────
const PrivateRoute = ({ requiredPerm, children }) => {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" replace />;

  if (requiredPerm) {
    const permisos = JSON.parse(localStorage.getItem('user') || '{}').permisos ?? [];
    if (!permisos.includes(requiredPerm)) {
      return <Navigate to="/dashboard" replace />;
    }
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
// Router con future flags para silenciar warnings de v7
// ─────────────────────────────────────────────────
const router = createBrowserRouter(
  [
    // ── Páginas públicas (con header/footer) ────
    {
      element: <PublicLayout />,
      children: [
        { index: true,    element: <Home /> },
        { path: '/login',    element: <Login /> },
        { path: '/register', element: <Register /> },
      ],
    },

    // ── Panel admin (sin header/footer) ─────────
    {
      element: <AdminShell />,
      children: [
        {
          path: '/dashboard',
          element: <PrivateRoute><Dashboard /></PrivateRoute>,
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
      ],
    },

    // ── Catch-all ────────────────────────────────
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