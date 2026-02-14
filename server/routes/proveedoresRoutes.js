import express from 'express';
import {
  getProveedores, getProveedorById, createProveedor,
  updateProveedor, deleteProveedor, searchProveedores,
  getComprasByProveedor, getAllCompras, createCompra, updateEstadoCompra
} from '../controllers/proveedoresController.js';
import { authMiddleware, requirePermission } from '../middleware/authMiddleware.js';

const proveedoresRouter = express.Router();
proveedoresRouter.use(authMiddleware);

// Proveedores CRUD
proveedoresRouter.get('/',        requirePermission('proveedores:read'),   getProveedores);
proveedoresRouter.get('/search',  requirePermission('proveedores:read'),   searchProveedores);


proveedoresRouter.get('/compras',                requirePermission('compras:read'),   getAllCompras);
proveedoresRouter.post('/compras',               requirePermission('compras:create'), createCompra);
proveedoresRouter.patch('/compras/:id/estado',   requirePermission('compras:update'), updateEstadoCompra);

// Proveedor individual + historial
proveedoresRouter.get('/:id',         requirePermission('proveedores:read'),   getProveedorById);
proveedoresRouter.post('/',           requirePermission('proveedores:create'), createProveedor);
proveedoresRouter.put('/:id',         requirePermission('proveedores:update'), updateProveedor);
proveedoresRouter.delete('/:id',      requirePermission('proveedores:delete'), deleteProveedor);
proveedoresRouter.get('/:id/compras', requirePermission('compras:read'),       getComprasByProveedor);

export { proveedoresRouter };
export default proveedoresRouter;