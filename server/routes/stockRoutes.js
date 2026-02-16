import express from 'express';
import {
  getStock,
  getAlertas,
  getResumen,
  updateNiveles,
} from '../controllers/stockController.js';
import { authMiddleware, requirePermission } from '../middleware/authMiddleware.js';

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// ── Rutas de stock ────────────────────────────────
// IMPORTANTE: rutas específicas ANTES de /:param
router.get('/alertas', requirePermission('stock:read'), getAlertas);
router.get('/resumen', requirePermission('stock:read'), getResumen);
router.get('/',        requirePermission('stock:read'), getStock);

// Actualizar niveles min/max de un artículo
router.put('/:articuloId', requirePermission('articulos:update'), updateNiveles);

export default router;