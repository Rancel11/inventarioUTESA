import db from '../config/database.js';

// Obtener todos los movimientos
export const getMovimientos = async (req, res) => {
  try {
    const { limit = 50, tipo, articulo_id } = req.query;

    let query = `
      SELECT 
        m.id,
        m.tipo_movimiento,
        m.cantidad,
        m.motivo,
        m.observaciones,
        m.fecha_movimiento,
        a.codigo as articulo_codigo,
        a.nombre as articulo_nombre,
        u.nombre as usuario_nombre
      FROM movimientos m
      JOIN articulos a ON m.articulo_id = a.id
      JOIN usuarios u ON m.usuario_id = u.id
      WHERE 1=1
    `;

    const params = [];

    if (tipo) {
      query += ' AND m.tipo_movimiento = ?';
      params.push(tipo);
    }

    if (articulo_id) {
      query += ' AND m.articulo_id = ?';
      params.push(articulo_id);
    }

    query += ' ORDER BY m.fecha_movimiento DESC LIMIT ?';
    params.push(parseInt(limit));

    const [movimientos] = await db.query(query, params);

    res.json(movimientos);

  } catch (error) {
    console.error('Error en getMovimientos:', error);
    res.status(500).json({ message: 'Error al obtener movimientos' });
  }
};

// Obtener movimiento por ID
export const getMovimientoById = async (req, res) => {
  try {
    const { id } = req.params;

    const [movimientos] = await db.query(`
      SELECT 
        m.*,
        a.codigo as articulo_codigo,
        a.nombre as articulo_nombre,
        u.nombre as usuario_nombre
      FROM movimientos m
      JOIN articulos a ON m.articulo_id = a.id
      JOIN usuarios u ON m.usuario_id = u.id
      WHERE m.id = ?
    `, [id]);

    if (movimientos.length === 0) {
      return res.status(404).json({ message: 'Movimiento no encontrado' });
    }

    res.json(movimientos[0]);

  } catch (error) {
    console.error('Error en getMovimientoById:', error);
    res.status(500).json({ message: 'Error al obtener movimiento' });
  }
};

// Crear nuevo movimiento (entrada, salida o ajuste)
export const createMovimiento = async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();

    const { articulo_id, tipo_movimiento, cantidad, motivo, observaciones } = req.body;

    // Validar campos requeridos
    if (!articulo_id || !tipo_movimiento || !cantidad) {
      return res.status(400).json({ message: 'Artículo, tipo de movimiento y cantidad son requeridos' });
    }

    // Validar tipo de movimiento
    if (!['entrada', 'salida', 'ajuste'].includes(tipo_movimiento)) {
      return res.status(400).json({ message: 'Tipo de movimiento inválido' });
    }

    // Validar cantidad
    if (cantidad <= 0) {
      return res.status(400).json({ message: 'La cantidad debe ser mayor a 0' });
    }

    // Verificar que el artículo existe
    const [articulo] = await connection.query('SELECT id FROM articulos WHERE id = ? AND activo = true', [articulo_id]);
    
    if (articulo.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Artículo no encontrado' });
    }

    // Obtener stock actual
    const [stockActual] = await connection.query('SELECT cantidad FROM stock WHERE articulo_id = ?', [articulo_id]);
    
    let cantidadActual = stockActual.length > 0 ? stockActual[0].cantidad : 0;
    let nuevaCantidad = cantidadActual;

    // Calcular nueva cantidad según tipo de movimiento
    switch (tipo_movimiento) {
      case 'entrada':
        nuevaCantidad = cantidadActual + parseInt(cantidad);
        break;
      case 'salida':
        if (cantidadActual < parseInt(cantidad)) {
          await connection.rollback();
          return res.status(400).json({ 
            message: 'Stock insuficiente', 
            stockActual: cantidadActual,
            solicitado: cantidad
          });
        }
        nuevaCantidad = cantidadActual - parseInt(cantidad);
        break;
      case 'ajuste':
        // En ajuste, la cantidad es el valor absoluto nuevo
        nuevaCantidad = parseInt(cantidad);
        break;
    }

    // Crear movimiento
    const [resultMovimiento] = await connection.query(
      'INSERT INTO movimientos (articulo_id, usuario_id, tipo_movimiento, cantidad, motivo, observaciones) VALUES (?, ?, ?, ?, ?, ?)',
      [articulo_id, req.userId, tipo_movimiento, cantidad, motivo || null, observaciones || null]
    );

    // Actualizar stock
    if (stockActual.length > 0) {
      await connection.query(
        'UPDATE stock SET cantidad = ? WHERE articulo_id = ?',
        [nuevaCantidad, articulo_id]
      );
    } else {
      await connection.query(
        'INSERT INTO stock (articulo_id, cantidad) VALUES (?, ?)',
        [articulo_id, nuevaCantidad]
      );
    }

    await connection.commit();

    // Obtener el movimiento creado con información completa
    const [nuevoMovimiento] = await connection.query(`
      SELECT 
        m.*,
        a.codigo as articulo_codigo,
        a.nombre as articulo_nombre,
        u.nombre as usuario_nombre
      FROM movimientos m
      JOIN articulos a ON m.articulo_id = a.id
      JOIN usuarios u ON m.usuario_id = u.id
      WHERE m.id = ?
    `, [resultMovimiento.insertId]);

    res.status(201).json({
      message: 'Movimiento registrado exitosamente',
      movimiento: nuevoMovimiento[0],
      stockNuevo: nuevaCantidad,
      stockAnterior: cantidadActual
    });

  } catch (error) {
    await connection.rollback();
    console.error('Error en createMovimiento:', error);
    res.status(500).json({ message: 'Error al crear movimiento' });
  } finally {
    connection.release();
  }
};

// Obtener estadísticas de movimientos
export const getEstadisticas = async (req, res) => {
  try {
    // Movimientos del día
    const [movimientosHoy] = await db.query(`
      SELECT COUNT(*) as total
      FROM movimientos
      WHERE DATE(fecha_movimiento) = CURDATE()
    `);

    // Movimientos por tipo (última semana)
    const [movimientosPorTipo] = await db.query(`
      SELECT 
        tipo_movimiento,
        COUNT(*) as total,
        SUM(cantidad) as cantidad_total
      FROM movimientos
      WHERE fecha_movimiento >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      GROUP BY tipo_movimiento
    `);

    // Artículos más movidos (último mes)
    const [articulosMasMovidos] = await db.query(`
      SELECT 
        a.codigo,
        a.nombre,
        COUNT(m.id) as total_movimientos,
        SUM(CASE WHEN m.tipo_movimiento = 'entrada' THEN m.cantidad ELSE 0 END) as total_entradas,
        SUM(CASE WHEN m.tipo_movimiento = 'salida' THEN m.cantidad ELSE 0 END) as total_salidas
      FROM articulos a
      JOIN movimientos m ON a.id = m.articulo_id
      WHERE m.fecha_movimiento >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      GROUP BY a.id, a.codigo, a.nombre
      ORDER BY total_movimientos DESC
      LIMIT 10
    `);

    res.json({
      movimientosHoy: movimientosHoy[0].total,
      movimientosPorTipo,
      articulosMasMovidos
    });

  } catch (error) {
    console.error('Error en getEstadisticas:', error);
    res.status(500).json({ message: 'Error al obtener estadísticas' });
  }
};