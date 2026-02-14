// ============================================================
// routes/movimientosRoutes.js
// ============================================================
import express from 'express';
import {
  getMovimientos, getMovimientoById,
  createMovimiento, getEstadisticas
} from '../controllers/movimientosController.js';
import { authMiddleware, requirePermission } from '../middleware/authMiddleware.js';

const movimientosRouter = express.Router();
movimientosRouter.use(authMiddleware);

movimientosRouter.get('/',             requirePermission('movimientos:read'),   getMovimientos);
movimientosRouter.get('/estadisticas', requirePermission('movimientos:read'),   getEstadisticas);
movimientosRouter.get('/:id',          requirePermission('movimientos:read'),   getMovimientoById);
movimientosRouter.post('/',            requirePermission('movimientos:create'), createMovimiento);

export { movimientosRouter };
export default movimientosRouter;