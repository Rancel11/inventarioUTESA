import db from '../config/database.js';

// ─────────────────────────────────────────────────
// PROVEEDORES - CRUD
// ─────────────────────────────────────────────────

export const getProveedores = async (req, res) => {
  try {
    const [proveedores] = await db.query(`
      SELECT 
        p.*,
        COUNT(DISTINCT a.id)  AS total_articulos,
        COUNT(DISTINCT c.id)  AS total_compras
      FROM proveedores p
      LEFT JOIN articulos a ON a.proveedor_id = p.id AND a.activo = true
      LEFT JOIN compras   c ON c.proveedor_id = p.id
      WHERE p.activo = true
      GROUP BY p.id
      ORDER BY p.nombre ASC
    `);
    res.json(proveedores);
  } catch (error) {
    console.error('Error en getProveedores:', error);
    res.status(500).json({ message: 'Error al obtener proveedores' });
  }
};

export const getProveedorById = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await db.query(`
      SELECT 
        p.*,
        COUNT(DISTINCT a.id) AS total_articulos,
        COUNT(DISTINCT c.id) AS total_compras
      FROM proveedores p
      LEFT JOIN articulos a ON a.proveedor_id = p.id AND a.activo = true
      LEFT JOIN compras   c ON c.proveedor_id = p.id
      WHERE p.id = ? AND p.activo = true
      GROUP BY p.id
    `, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Proveedor no encontrado' });
    }

    // Artículos asociados
    const [articulos] = await db.query(`
      SELECT a.id, a.codigo, a.nombre, a.categoria, s.cantidad AS stock_actual
      FROM articulos a
      LEFT JOIN stock s ON s.articulo_id = a.id
      WHERE a.proveedor_id = ? AND a.activo = true
      ORDER BY a.nombre
    `, [id]);

    res.json({ ...rows[0], articulos });

  } catch (error) {
    console.error('Error en getProveedorById:', error);
    res.status(500).json({ message: 'Error al obtener proveedor' });
  }
};

export const createProveedor = async (req, res) => {
  try {
    const { codigo, nombre, contacto, telefono, email, direccion, ciudad, pais, notas } = req.body;

    if (!codigo || !nombre) {
      return res.status(400).json({ message: 'Código y nombre son requeridos' });
    }

    const [existente] = await db.query('SELECT id FROM proveedores WHERE codigo = ?', [codigo]);
    if (existente.length > 0) {
      return res.status(400).json({ message: 'El código del proveedor ya existe' });
    }

    const [result] = await db.query(
      `INSERT INTO proveedores (codigo, nombre, contacto, telefono, email, direccion, ciudad, pais, notas)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [codigo, nombre, contacto || null, telefono || null, email || null,
       direccion || null, ciudad || null, pais || 'Dominican Republic', notas || null]
    );

    const [nuevo] = await db.query('SELECT * FROM proveedores WHERE id = ?', [result.insertId]);
    res.status(201).json({ message: 'Proveedor creado exitosamente', proveedor: nuevo[0] });

  } catch (error) {
    console.error('Error en createProveedor:', error);
    res.status(500).json({ message: 'Error al crear proveedor' });
  }
};

export const updateProveedor = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, contacto, telefono, email, direccion, ciudad, pais, notas } = req.body;

    const [existente] = await db.query('SELECT id FROM proveedores WHERE id = ? AND activo = true', [id]);
    if (existente.length === 0) {
      return res.status(404).json({ message: 'Proveedor no encontrado' });
    }

    await db.query(
      `UPDATE proveedores SET
        nombre    = COALESCE(?, nombre),
        contacto  = ?,
        telefono  = ?,
        email     = ?,
        direccion = ?,
        ciudad    = ?,
        pais      = COALESCE(?, pais),
        notas     = ?
      WHERE id = ?`,
      [nombre, contacto, telefono, email, direccion, ciudad, pais, notas, id]
    );

    const [updated] = await db.query('SELECT * FROM proveedores WHERE id = ?', [id]);
    res.json({ message: 'Proveedor actualizado', proveedor: updated[0] });

  } catch (error) {
    console.error('Error en updateProveedor:', error);
    res.status(500).json({ message: 'Error al actualizar proveedor' });
  }
};

export const deleteProveedor = async (req, res) => {
  try {
    const { id } = req.params;

    const [existente] = await db.query('SELECT id FROM proveedores WHERE id = ? AND activo = true', [id]);
    if (existente.length === 0) {
      return res.status(404).json({ message: 'Proveedor no encontrado' });
    }

    // Soft delete — los artículos quedan con proveedor_id pero el proveedor pasa a inactivo
    await db.query('UPDATE proveedores SET activo = false WHERE id = ?', [id]);
    res.json({ message: 'Proveedor eliminado exitosamente' });

  } catch (error) {
    console.error('Error en deleteProveedor:', error);
    res.status(500).json({ message: 'Error al eliminar proveedor' });
  }
};

export const searchProveedores = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.status(400).json({ message: 'Parámetro de búsqueda requerido' });

    const term = `%${q}%`;
    const [rows] = await db.query(
      `SELECT * FROM proveedores
       WHERE activo = true AND (nombre LIKE ? OR codigo LIKE ? OR contacto LIKE ? OR ciudad LIKE ?)
       ORDER BY nombre`,
      [term, term, term, term]
    );
    res.json(rows);
  } catch (error) {
    console.error('Error en searchProveedores:', error);
    res.status(500).json({ message: 'Error al buscar proveedores' });
  }
};

// ─────────────────────────────────────────────────
// HISTORIAL DE COMPRAS
// ─────────────────────────────────────────────────

export const getComprasByProveedor = async (req, res) => {
  try {
    const { id } = req.params;

    const [compras] = await db.query(`
      SELECT 
        c.id, c.numero_orden, c.estado, c.observaciones,
        c.fecha_orden, c.fecha_recepcion,
        u.nombre AS registrado_por,
        COUNT(cd.id)      AS total_items,
        SUM(cd.cantidad)  AS total_unidades
      FROM compras c
      JOIN usuarios u ON c.usuario_id = u.id
      LEFT JOIN compras_detalle cd ON cd.compra_id = c.id
      WHERE c.proveedor_id = ?
      GROUP BY c.id
      ORDER BY c.fecha_orden DESC
    `, [id]);

    res.json(compras);
  } catch (error) {
    console.error('Error en getComprasByProveedor:', error);
    res.status(500).json({ message: 'Error al obtener historial de compras' });
  }
};

export const getAllCompras = async (req, res) => {
  try {
    const { estado, proveedor_id, limit = 50 } = req.query;

    let query = `
      SELECT 
        c.id, c.numero_orden, c.estado, c.observaciones,
        c.fecha_orden, c.fecha_recepcion,
        p.nombre AS proveedor_nombre,
        p.codigo AS proveedor_codigo,
        u.nombre AS registrado_por,
        COUNT(cd.id)     AS total_items,
        SUM(cd.cantidad) AS total_unidades
      FROM compras c
      JOIN proveedores p ON c.proveedor_id = p.id
      JOIN usuarios    u ON c.usuario_id   = u.id
      LEFT JOIN compras_detalle cd ON cd.compra_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (estado) { query += ' AND c.estado = ?'; params.push(estado); }
    if (proveedor_id) { query += ' AND c.proveedor_id = ?'; params.push(proveedor_id); }

    query += ' GROUP BY c.id ORDER BY c.fecha_orden DESC LIMIT ?';
    params.push(parseInt(limit));

    const [compras] = await db.query(query, params);
    res.json(compras);
  } catch (error) {
    console.error('Error en getAllCompras:', error);
    res.status(500).json({ message: 'Error al obtener compras' });
  }
};

export const createCompra = async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const { proveedor_id, numero_orden, observaciones, items } = req.body;
    // items: [{ articulo_id, cantidad }, ...]

    if (!proveedor_id || !numero_orden || !items || items.length === 0) {
      return res.status(400).json({ message: 'Proveedor, número de orden e ítems son requeridos' });
    }

    const [proveedor] = await connection.query(
      'SELECT id FROM proveedores WHERE id = ? AND activo = true', [proveedor_id]
    );
    if (proveedor.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Proveedor no encontrado' });
    }

    const [dupOrden] = await connection.query(
      'SELECT id FROM compras WHERE numero_orden = ?', [numero_orden]
    );
    if (dupOrden.length > 0) {
      await connection.rollback();
      return res.status(400).json({ message: 'El número de orden ya existe' });
    }

    const [compraResult] = await connection.query(
      `INSERT INTO compras (proveedor_id, usuario_id, numero_orden, observaciones)
       VALUES (?, ?, ?, ?)`,
      [proveedor_id, req.userId, numero_orden, observaciones || null]
    );
    const compraId = compraResult.insertId;

    for (const item of items) {
      if (!item.articulo_id || !item.cantidad || item.cantidad <= 0) continue;
      await connection.query(
        'INSERT INTO compras_detalle (compra_id, articulo_id, cantidad) VALUES (?, ?, ?)',
        [compraId, item.articulo_id, item.cantidad]
      );
    }

    await connection.commit();

    const [nueva] = await connection.query(
      'SELECT c.*, p.nombre AS proveedor_nombre FROM compras c JOIN proveedores p ON c.proveedor_id = p.id WHERE c.id = ?',
      [compraId]
    );
    res.status(201).json({ message: 'Orden de compra creada', compra: nueva[0] });

  } catch (error) {
    await connection.rollback();
    console.error('Error en createCompra:', error);
    res.status(500).json({ message: 'Error al crear orden de compra' });
  } finally {
    connection.release();
  }
};

export const updateEstadoCompra = async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const { id } = req.params;
    const { estado } = req.body;

    if (!['pendiente', 'recibida', 'cancelada'].includes(estado)) {
      return res.status(400).json({ message: 'Estado inválido' });
    }

    const [compra] = await connection.query('SELECT * FROM compras WHERE id = ?', [id]);
    if (compra.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Compra no encontrada' });
    }

    if (compra[0].estado === 'recibida') {
      await connection.rollback();
      return res.status(400).json({ message: 'No se puede modificar una compra ya recibida' });
    }

    // Si se marca como recibida → actualizar stock automáticamente
    if (estado === 'recibida') {
      const [detalles] = await connection.query(
        'SELECT * FROM compras_detalle WHERE compra_id = ?', [id]
      );

      for (const det of detalles) {
        // Crear movimiento de entrada
        await connection.query(
          `INSERT INTO movimientos (articulo_id, usuario_id, tipo_movimiento, cantidad, motivo)
           VALUES (?, ?, 'entrada', ?, ?)`,
          [det.articulo_id, req.userId, det.cantidad, `Recepción orden #${compra[0].numero_orden}`]
        );

        // Actualizar stock
        const [stockRows] = await connection.query(
          'SELECT id, cantidad FROM stock WHERE articulo_id = ?', [det.articulo_id]
        );
        if (stockRows.length > 0) {
          await connection.query(
            'UPDATE stock SET cantidad = cantidad + ? WHERE articulo_id = ?',
            [det.cantidad, det.articulo_id]
          );
        } else {
          await connection.query(
            'INSERT INTO stock (articulo_id, cantidad) VALUES (?, ?)',
            [det.articulo_id, det.cantidad]
          );
        }
      }

      await connection.query(
        `UPDATE compras SET estado = 'recibida', fecha_recepcion = NOW() WHERE id = ?`, [id]
      );
    } else {
      await connection.query('UPDATE compras SET estado = ? WHERE id = ?', [estado, id]);
    }

    await connection.commit();
    res.json({ message: `Compra marcada como ${estado}` });

  } catch (error) {
    await connection.rollback();
    console.error('Error en updateEstadoCompra:', error);
    res.status(500).json({ message: 'Error al actualizar estado' });
  } finally {
    connection.release();
  }
};