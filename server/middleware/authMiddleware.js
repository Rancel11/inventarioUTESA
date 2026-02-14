import jwt from 'jsonwebtoken';
import db from '../config/database.js';

// ─────────────────────────────────────────────────
// MAPA DE PERMISOS POR ROL
// ─────────────────────────────────────────────────
export const PERMISSIONS = {
  admin: [
    'articulos:read', 'articulos:create', 'articulos:update', 'articulos:delete',
    'stock:read',
    'movimientos:read', 'movimientos:create',
    'proveedores:read', 'proveedores:create', 'proveedores:update', 'proveedores:delete',
    'compras:read', 'compras:create', 'compras:update', 'compras:delete',
    'usuarios:read', 'usuarios:create', 'usuarios:update', 'usuarios:delete',
    'reportes:read',
    'configuracion:read', 'configuracion:update',
  ],
  encargado: [
    'articulos:read', 'articulos:create', 'articulos:update',
    'stock:read',
    'movimientos:read', 'movimientos:create',
    'proveedores:read',
    'compras:read', 'compras:create', 'compras:update',
    'reportes:read',
  ],
  operador: [
    'articulos:read',
    'stock:read',
    'movimientos:read', 'movimientos:create',
    'proveedores:read',
    'compras:read',
  ],
};

// ─────────────────────────────────────────────────
// HELPER: obtener permisos de un rol
// ─────────────────────────────────────────────────
export const getUserPermissions = (rol) => PERMISSIONS[rol] ?? [];

// ─────────────────────────────────────────────────
// authMiddleware — requiere token válido
// ─────────────────────────────────────────────────
export const authMiddleware = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ message: 'No hay token, autorización denegada' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const [rows] = await db.query(
      'SELECT id, nombre, email, rol, activo FROM usuarios WHERE id = ? AND activo = true',
      [decoded.id]
    );

    if (rows.length === 0) {
      return res.status(401).json({ message: 'Usuario no encontrado o inactivo' });
    }

    req.userId  = rows[0].id;
    req.userRol = rows[0].rol;
    req.user    = rows[0];
    next();

  } catch (error) {
    res.status(401).json({ message: 'Token inválido o expirado' });
  }
};

// ─────────────────────────────────────────────────
// optionalAuth — adjunta usuario si hay token,
// pero NO falla si el token está ausente.
// Útil para el endpoint /register en modo setup inicial.
// ─────────────────────────────────────────────────
export const optionalAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      // Sin token: continuar sin usuario adjunto
      req.userId  = null;
      req.userRol = null;
      req.user    = null;
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const [rows] = await db.query(
      'SELECT id, nombre, email, rol, activo FROM usuarios WHERE id = ? AND activo = true',
      [decoded.id]
    );

    if (rows.length > 0) {
      req.userId  = rows[0].id;
      req.userRol = rows[0].rol;
      req.user    = rows[0];
    }

    next();
  } catch {
    // Token inválido — tratar como sin autenticación
    req.userId  = null;
    req.userRol = null;
    req.user    = null;
    next();
  }
};

// ─────────────────────────────────────────────────
// requirePermission — verifica un permiso específico
// Uso: requirePermission('articulos:delete')
// ─────────────────────────────────────────────────
export const requirePermission = (permission) => (req, res, next) => {
  const rol = req.userRol;

  if (!rol || !PERMISSIONS[rol]) {
    return res.status(403).json({ message: 'Rol no reconocido o sin autenticación' });
  }

  if (!PERMISSIONS[rol].includes(permission)) {
    return res.status(403).json({
      message: `Acceso denegado. Se requiere el permiso: ${permission}`,
      tuRol:   rol,
    });
  }

  next();
};

// ─────────────────────────────────────────────────
// requireAdmin — solo administradores
// ─────────────────────────────────────────────────
export const requireAdmin = (req, res, next) => {
  if (req.userRol !== 'admin') {
    return res.status(403).json({
      message: 'Solo los administradores pueden realizar esta acción',
    });
  }
  next();
};