import express from 'express';
import {
  register, login, getProfile,
  getUsuarios, updateUsuario, deleteUsuario,
  cambiarPassword,
} from '../controllers/authController.js';
import {
  authMiddleware,
  requireAdmin,
  requirePermission,
  optionalAuth,
} from '../middleware/authMiddleware.js';

const router = express.Router();

// ── Públicas ──────────────────────────────────────────
router.post('/login', login);

// /register usa optionalAuth para el setup inicial
router.post('/register', optionalAuth, register);

// ── Protegidas ────────────────────────────────────────
router.get('/profile',            authMiddleware, getProfile);
router.put('/cambiar-password',   authMiddleware, cambiarPassword);

// Gestión de usuarios — solo admin
router.get('/usuarios',        authMiddleware, requirePermission('usuarios:read'),   getUsuarios);
router.put('/usuarios/:id',    authMiddleware, requirePermission('usuarios:update'), updateUsuario);
router.delete('/usuarios/:id', authMiddleware, requirePermission('usuarios:delete'), deleteUsuario);

export default router;