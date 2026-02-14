// ============================================================
// routes/articulosRoutes.js
// ============================================================
import express from 'express';
import {
  getArticulos, getArticuloById, createArticulo,
  updateArticulo, deleteArticulo, getCategorias, searchArticulos
} from '../controllers/articulosController.js';
import { authMiddleware, requirePermission } from '../middleware/authMiddleware.js';

const articulosRouter = express.Router();
articulosRouter.use(authMiddleware);

articulosRouter.get('/',           requirePermission('articulos:read'),   getArticulos);
articulosRouter.get('/search',     requirePermission('articulos:read'),   searchArticulos);
articulosRouter.get('/categorias', requirePermission('articulos:read'),   getCategorias);
articulosRouter.get('/:id',        requirePermission('articulos:read'),   getArticuloById);
articulosRouter.post('/',          requirePermission('articulos:create'), createArticulo);
articulosRouter.put('/:id',        requirePermission('articulos:update'), updateArticulo);
articulosRouter.delete('/:id',     requirePermission('articulos:delete'), deleteArticulo);

export { articulosRouter };
export default articulosRouter;