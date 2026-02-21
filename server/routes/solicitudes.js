// routes/solicitudes.js
import express from 'express';
import db from '../config/database.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Todos los endpoints requieren autenticación
router.use(protect);

// ─── GET /api/solicitudes ───────────────────────
// Admin/encargado/operador → todas
// Solicitante              → solo las suyas
router.get('/', async (req, res) => {
  try {
    let query = `
      SELECT
        s.id,
        s.estado,
        s.fecha_creacion,
        s.id_usuario,
        s.id_departamento,
        u.nombre        AS nombre_usuario,
        d.nombre        AS nombre_departamento,
        COUNT(ds.id)    AS cantidad_articulos
      FROM solicitudes s
      LEFT JOIN usuarios     u  ON u.id  = s.id_usuario
      LEFT JOIN departamentos d  ON d.id  = s.id_departamento
      LEFT JOIN detalle_solicitudes ds ON ds.id_solicitud = s.id
    `;

    const params = [];
    if (req.userRol === 'solicitante') {
      query += ' WHERE s.id_usuario = ?';
      params.push(req.userId);
    }

    query += ' GROUP BY s.id ORDER BY s.fecha_creacion DESC';

    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Error al obtener solicitudes' });
  }
});

// ─── GET /api/solicitudes/:id ──────────────────
// Retorna solicitud + detalles
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [solRows] = await db.query(`
      SELECT
        s.*,
        u.nombre        AS nombre_usuario,
        d.nombre        AS nombre_departamento
      FROM solicitudes s
      LEFT JOIN usuarios     u ON u.id = s.id_usuario
      LEFT JOIN departamentos d ON d.id = s.id_departamento
      WHERE s.id = ?
    `, [id]);

    if (solRows.length === 0)
      return res.status(404).json({ message: 'Solicitud no encontrada' });

    // Verificar acceso para solicitante
    if (req.userRol === 'solicitante' && solRows[0].id_usuario !== req.userId)
      return res.status(403).json({ message: 'Acceso denegado' });

    const [detalles] = await db.query(`
      SELECT
        ds.*,
        a.nombre AS nombre_producto,
        a.codigo
      FROM detalle_solicitudes ds
      LEFT JOIN articulos a ON a.id = ds.id_producto
      WHERE ds.id_solicitud = ?
    `, [id]);

    res.json({ ...solRows[0], detalles });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Error al obtener solicitud' });
  }
});

// ─── POST /api/solicitudes ─────────────────────
// Solo solicitantes crean solicitudes
router.post('/', async (req, res) => {
  if (!['solicitante', 'admin'].includes(req.userRol))
    return res.status(403).json({ message: 'Solo los solicitantes pueden crear solicitudes' });

  try {
    const { id_departamento, items } = req.body;

    if (!items || items.length === 0)
      return res.status(400).json({ message: 'Debes incluir al menos un artículo' });

    const [result] = await db.query(
      'INSERT INTO solicitudes (id_usuario, id_departamento) VALUES (?, ?)',
      [req.userId, id_departamento || null]
    );

    const solicitudId = result.insertId;

    // Insertar detalles
    const detalleValues = items.map(i => [solicitudId, i.id_producto, i.cantidad]);
    await db.query(
      'INSERT INTO detalle_solicitudes (id_solicitud, id_producto, cantidad) VALUES ?',
      [detalleValues]
    );

    res.status(201).json({ message: 'Solicitud creada exitosamente', id: solicitudId });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Error al crear solicitud' });
  }
});

// ─── PUT /api/solicitudes/:id/estado ──────────
// Admin → puede aprobar/rechazar
// Operador → puede marcar completado (solo si está aprobado)
router.put('/:id/estado', async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    const estadosValidos = ['pendiente', 'aprobado', 'rechazado', 'completado'];
    if (!estadosValidos.includes(estado))
      return res.status(400).json({ message: 'Estado inválido' });

    // Control de permisos
    const [rows] = await db.query('SELECT * FROM solicitudes WHERE id = ?', [id]);
    if (rows.length === 0)
      return res.status(404).json({ message: 'Solicitud no encontrada' });

    const sol = rows[0];

    if (req.userRol === 'operador') {
      if (estado !== 'completado')
        return res.status(403).json({ message: 'El operador solo puede marcar como completado' });
      if (sol.estado !== 'aprobado')
        return res.status(400).json({ message: 'Solo se pueden completar solicitudes aprobadas' });
    } else if (req.userRol !== 'admin' && req.userRol !== 'encargado') {
      return res.status(403).json({ message: 'No tienes permiso para cambiar el estado' });
    }

    await db.query('UPDATE solicitudes SET estado = ? WHERE id = ?', [estado, id]);
    res.json({ message: 'Estado actualizado', estado });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Error al actualizar estado' });
  }
});

export default router;