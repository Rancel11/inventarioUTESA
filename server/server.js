import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import authRoutes        from './routes/authRoutes.js';
import articulosRoutes   from './routes/articulosRoutes.js';
import movimientosRoutes from './routes/movimientosRoutes.js';
import stockRoutes       from './routes/stockRoutes.js';
import proveedoresRoutes from './routes/proveedoresRoutes.js';

dotenv.config();

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middlewares ───────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Rutas ─────────────────────────────────────────
app.use('/api/auth',        authRoutes);
app.use('/api/articulos',   articulosRoutes);
app.use('/api/movimientos', movimientosRoutes);
app.use('/api/stock',       stockRoutes);
app.use('/api/proveedores', proveedoresRoutes);

// ── Health check ──────────────────────────────────
app.get('/api/health', (_req, res) =>
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
);

// ── 404 ───────────────────────────────────────────
app.use((req, res) =>
  res.status(404).json({ message: `Ruta no encontrada: ${req.method} ${req.path}` })
);

// ── Error handler ─────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('Error no capturado:', err);
  res.status(500).json({ message: 'Error interno del servidor' });
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
  console.log(`URL: http://localhost:${PORT}`);
});

export default app;