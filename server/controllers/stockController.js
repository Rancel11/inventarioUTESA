import db from '../config/database.js';

// ─────────────────────────────────────────────────
// GET /api/stock — Lista completa de stock con info de artículo
// ─────────────────────────────────────────────────
export const getStock = async (req, res) => {
  try {
    const { estado, categoria } = req.query;

    let query = `
      SELECT 
        a.id, a.codigo, a.nombre, a.categoria,
        a.fecha_caducidad,
        p.nombre   AS proveedor_nombre,
        s.cantidad AS stock_actual,
        s.stock_minimo,
        s.stock_maximo,
        s.ubicacion,
        s.fecha_actualizacion
      FROM articulos a
      LEFT JOIN stock       s ON s.articulo_id = a.id
      LEFT JOIN proveedores p ON p.id = a.proveedor_id
      WHERE a.activo = true
    `;

    const params = [];

    if (categoria) {
      query += ' AND a.categoria = ?';
      params.push(categoria);
    }

    // Filtrar por estado de stock en la consulta
    if (estado === 'sin-stock') {
      query += ' AND (s.cantidad IS NULL OR s.cantidad = 0)';
    } else if (estado === 'critico') {
      query += ' AND s.cantidad > 0 AND s.cantidad <= (s.stock_minimo * 0.25)';
    } else if (estado === 'bajo') {
      query += ' AND s.cantidad > 0 AND s.cantidad <= s.stock_minimo';
    } else if (estado === 'normal') {
      query += ' AND s.cantidad > s.stock_minimo AND s.cantidad < s.stock_maximo';
    } else if (estado === 'sobre-stock') {
      query += ' AND s.cantidad >= s.stock_maximo';
    }

    query += ' ORDER BY a.nombre ASC';

    const [rows] = await db.query(query, params);
    res.json(rows);

  } catch (error) {
    console.error('Error en getStock:', error);
    res.status(500).json({ message: 'Error al obtener stock' });
  }
};

// ─────────────────────────────────────────────────
// GET /api/stock/alertas — Artículos bajo su mínimo
// Reemplaza el endpoint /dashboard/alertas que no existe
// ─────────────────────────────────────────────────
export const getAlertas = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        a.id, a.codigo, a.nombre, a.categoria,
        s.cantidad    AS stock_actual,
        s.stock_minimo,
        CASE
          WHEN s.cantidad = 0               THEN 'sin-stock'
          WHEN s.cantidad <= s.stock_minimo * 0.25 THEN 'critico'
          WHEN s.cantidad <= s.stock_minimo        THEN 'bajo'
          ELSE 'normal'
        END AS tipo_alerta
      FROM articulos a
      JOIN stock s ON s.articulo_id = a.id
      WHERE a.activo = true
        AND s.cantidad <= s.stock_minimo
        AND s.stock_minimo > 0
      ORDER BY s.cantidad ASC
      LIMIT 50
    `);

    res.json(rows);
  } catch (error) {
    console.error('Error en getAlertas:', error);
    res.status(500).json({ message: 'Error al obtener alertas' });
  }
};

// ─────────────────────────────────────────────────
// GET /api/stock/resumen — Estadísticas rápidas
// ─────────────────────────────────────────────────
export const getResumen = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        COUNT(*)                                                          AS total_articulos,
        COALESCE(SUM(s.cantidad), 0)                                      AS total_unidades,
        SUM(CASE WHEN s.cantidad = 0 THEN 1 ELSE 0 END)                   AS sin_stock,
        SUM(CASE WHEN s.cantidad > 0
                  AND s.cantidad <= s.stock_minimo * 0.25
                  AND s.stock_minimo > 0 THEN 1 ELSE 0 END)               AS criticos,
        SUM(CASE WHEN s.cantidad > 0
                  AND s.cantidad <= s.stock_minimo
                  AND s.stock_minimo > 0 THEN 1 ELSE 0 END)               AS bajo_stock,
        SUM(CASE WHEN s.cantidad > s.stock_minimo
                  AND s.cantidad < s.stock_maximo
                  AND s.stock_maximo > 0 THEN 1 ELSE 0 END)               AS normal
      FROM articulos a
      LEFT JOIN stock s ON s.articulo_id = a.id
      WHERE a.activo = true
    `);

    res.json(rows[0]);
  } catch (error) {
    console.error('Error en getResumen:', error);
    res.status(500).json({ message: 'Error al obtener resumen' });
  }
};

// ─────────────────────────────────────────────────
// PUT /api/stock/:articuloId — Actualizar niveles mín/máx y ubicación
// ─────────────────────────────────────────────────
export const updateNiveles = async (req, res) => {
  try {
    const { articuloId } = req.params;
    const { stock_minimo, stock_maximo, ubicacion } = req.body;

    // Verificar que el artículo existe
    const [art] = await db.query(
      'SELECT id FROM articulos WHERE id = ? AND activo = true', [articuloId]
    );
    if (art.length === 0) {
      return res.status(404).json({ message: 'Artículo no encontrado' });
    }

    await db.query(
      `UPDATE stock SET
        stock_minimo = COALESCE(?, stock_minimo),
        stock_maximo = COALESCE(?, stock_maximo),
        ubicacion    = COALESCE(?, ubicacion)
      WHERE articulo_id = ?`,
      [stock_minimo ?? null, stock_maximo ?? null, ubicacion ?? null, articuloId]
    );

    const [updated] = await db.query(`
      SELECT s.*, a.nombre, a.codigo
      FROM stock s
      JOIN articulos a ON a.id = s.articulo_id
      WHERE s.articulo_id = ?
    `, [articuloId]);

    res.json({ message: 'Niveles actualizados', stock: updated[0] });

  } catch (error) {
    console.error('Error en updateNiveles:', error);
    res.status(500).json({ message: 'Error al actualizar niveles' });
  }
};