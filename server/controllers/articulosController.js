import db from '../config/database.js';

// Obtener todos los artículos
export const getArticulos = async (req, res) => {
  try {
    const [articulos] = await db.query(`
      SELECT 
        a.*, 
        s.cantidad as stock_actual, 
        s.stock_minimo, 
        s.stock_maximo, 
        s.ubicacion,
        p.nombre as proveedor_nombre,
        p.codigo as proveedor_codigo
      FROM articulos a
      LEFT JOIN stock s ON a.id = s.articulo_id
      LEFT JOIN proveedores p ON a.proveedor_id = p.id
      WHERE a.activo = true
      ORDER BY a.fecha_creacion DESC
    `);

    res.json(articulos);
  } catch (error) {
    console.error('Error en getArticulos:', error);
    res.status(500).json({ message: 'Error al obtener artículos' });
  }
};

// Obtener un artículo por ID
export const getArticuloById = async (req, res) => {
  try {
    const { id } = req.params;

    const [articulos] = await db.query(`
      SELECT 
        a.*, 
        s.cantidad as stock_actual, 
        s.stock_minimo, 
        s.stock_maximo, 
        s.ubicacion,
        p.nombre as proveedor_nombre,
        p.codigo as proveedor_codigo
      FROM articulos a
      LEFT JOIN stock s ON a.id = s.articulo_id
      LEFT JOIN proveedores p ON a.proveedor_id = p.id
      WHERE a.id = ? AND a.activo = true
    `, [id]);

    if (articulos.length === 0) {
      return res.status(404).json({ message: 'Artículo no encontrado' });
    }

    res.json(articulos[0]);
  } catch (error) {
    console.error('Error en getArticuloById:', error);
    res.status(500).json({ message: 'Error al obtener artículo' });
  }
};

// Crear nuevo artículo
export const createArticulo = async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();

    const {
      codigo, nombre, descripcion, categoria,
      proveedor_id,
      fecha_caducidad,
      stock_inicial, stock_minimo, stock_maximo, ubicacion
    } = req.body;

    // Validar campos requeridos
    if (!codigo || !nombre || !categoria) {
      await connection.rollback();
      return res.status(400).json({ message: 'Código, nombre y categoría son requeridos' });
    }

    // Verificar si el código ya existe
    const [existing] = await connection.query('SELECT id FROM articulos WHERE codigo = ?', [codigo]);
    
    if (existing.length > 0) {
      await connection.rollback();
      return res.status(400).json({ message: 'El código del artículo ya existe' });
    }

    // Validar proveedor si se proporciona
    if (proveedor_id) {
      const [proveedorExists] = await connection.query(
        'SELECT id FROM proveedores WHERE id = ? AND activo = true',
        [proveedor_id]
      );
      
      if (proveedorExists.length === 0) {
        await connection.rollback();
        return res.status(400).json({ message: 'Proveedor no encontrado o inactivo' });
      }
    }

    // Insertar artículo (CON proveedor_id y fecha_caducidad)
    const [resultArticulo] = await connection.query(
      `INSERT INTO articulos 
       (codigo, nombre, descripcion, categoria, proveedor_id, fecha_caducidad) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        codigo, 
        nombre, 
        descripcion || null, 
        categoria, 
        proveedor_id || null, 
        fecha_caducidad || null
      ]
    );

    const articuloId = resultArticulo.insertId;

    // Insertar stock inicial
    const stockInicialValue = stock_inicial || 0;
    await connection.query(
      'INSERT INTO stock (articulo_id, cantidad, stock_minimo, stock_maximo, ubicacion) VALUES (?, ?, ?, ?, ?)',
      [articuloId, stockInicialValue, stock_minimo || 0, stock_maximo || 0, ubicacion || null]
    );

    // Si hay stock inicial, crear movimiento de entrada
    if (stockInicialValue > 0) {
      await connection.query(
        'INSERT INTO movimientos (articulo_id, usuario_id, tipo_movimiento, cantidad, motivo) VALUES (?, ?, ?, ?, ?)',
        [articuloId, req.userId, 'entrada', stockInicialValue, 'Stock inicial']
      );
    }

    await connection.commit();

    // Obtener el artículo completo creado
    const [nuevoArticulo] = await connection.query(`
      SELECT 
        a.*, 
        s.cantidad as stock_actual, 
        s.stock_minimo, 
        s.stock_maximo, 
        s.ubicacion,
        p.nombre as proveedor_nombre,
        p.codigo as proveedor_codigo
      FROM articulos a
      LEFT JOIN stock s ON a.id = s.articulo_id
      LEFT JOIN proveedores p ON a.proveedor_id = p.id
      WHERE a.id = ?
    `, [articuloId]);

    res.status(201).json({
      message: 'Artículo creado exitosamente',
      articulo: nuevoArticulo[0]
    });

  } catch (error) {
    await connection.rollback();
    console.error('Error en createArticulo:', error);
    res.status(500).json({ message: 'Error al crear artículo' });
  } finally {
    connection.release();
  }
};

// Actualizar artículo
export const updateArticulo = async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { id } = req.params;
    const {
      codigo, nombre, descripcion, categoria,
      proveedor_id,
      fecha_caducidad,
      stock_minimo, stock_maximo, ubicacion
    } = req.body;

    // Verificar si el artículo existe
    const [existing] = await connection.query('SELECT id FROM articulos WHERE id = ? AND activo = true', [id]);
    
    if (existing.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Artículo no encontrado' });
    }

    // Verificar si el código ya existe en otro artículo
    if (codigo) {
      const [duplicado] = await connection.query('SELECT id FROM articulos WHERE codigo = ? AND id != ?', [codigo, id]);
      
      if (duplicado.length > 0) {
        await connection.rollback();
        return res.status(400).json({ message: 'El código del artículo ya existe' });
      }
    }

    // Validar proveedor si se proporciona
    if (proveedor_id !== undefined && proveedor_id !== null && proveedor_id !== '') {
      const [proveedorExists] = await connection.query(
        'SELECT id FROM proveedores WHERE id = ? AND activo = true',
        [proveedor_id]
      );
      
      if (proveedorExists.length === 0) {
        await connection.rollback();
        return res.status(400).json({ message: 'Proveedor no encontrado o inactivo' });
      }
    }

    // Actualizar artículo (CON proveedor_id y fecha_caducidad)
    // Si proveedor_id viene como string vacío, lo convertimos a null
    const proveedorValue = (proveedor_id === '' || proveedor_id === undefined) ? null : proveedor_id;
    
    await connection.query(
      `UPDATE articulos SET 
        codigo = COALESCE(?, codigo),
        nombre = COALESCE(?, nombre),
        descripcion = ?,
        categoria = COALESCE(?, categoria),
        proveedor_id = ?,
        fecha_caducidad = ?
      WHERE id = ?`,
      [codigo, nombre, descripcion, categoria, proveedorValue, fecha_caducidad || null, id]
    );

    // Actualizar stock si se proporcionaron valores
    if (stock_minimo !== undefined || stock_maximo !== undefined || ubicacion !== undefined) {
      // Construir la query dinámicamente solo con los campos que se proporcionan
      const updates = [];
      const values = [];
      
      if (stock_minimo !== undefined) {
        updates.push('stock_minimo = ?');
        values.push(stock_minimo);
      }
      
      if (stock_maximo !== undefined) {
        updates.push('stock_maximo = ?');
        values.push(stock_maximo);
      }
      
      if (ubicacion !== undefined) {
        updates.push('ubicacion = ?');
        values.push(ubicacion);
      }
      
      if (updates.length > 0) {
        values.push(id); // agregar el ID al final
        await connection.query(
          `UPDATE stock SET ${updates.join(', ')} WHERE articulo_id = ?`,
          values
        );
      }
    }

    await connection.commit();

    // Obtener el artículo actualizado
    const [articuloActualizado] = await connection.query(`
      SELECT 
        a.*, 
        s.cantidad as stock_actual, 
        s.stock_minimo, 
        s.stock_maximo, 
        s.ubicacion,
        p.nombre as proveedor_nombre,
        p.codigo as proveedor_codigo
      FROM articulos a
      LEFT JOIN stock s ON a.id = s.articulo_id
      LEFT JOIN proveedores p ON a.proveedor_id = p.id
      WHERE a.id = ?
    `, [id]);

    res.json({
      message: 'Artículo actualizado exitosamente',
      articulo: articuloActualizado[0]
    });

  } catch (error) {
    await connection.rollback();
    console.error('Error en updateArticulo:', error);
    res.status(500).json({ message: 'Error al actualizar artículo' });
  } finally {
    connection.release();
  }
};

// Eliminar artículo (soft delete)
export const deleteArticulo = async (req, res) => {
  try {
    const { id } = req.params;

    const [existing] = await db.query('SELECT id FROM articulos WHERE id = ? AND activo = true', [id]);
    
    if (existing.length === 0) {
      return res.status(404).json({ message: 'Artículo no encontrado' });
    }

    await db.query('UPDATE articulos SET activo = false WHERE id = ?', [id]);

    res.json({ message: 'Artículo eliminado exitosamente' });

  } catch (error) {
    console.error('Error en deleteArticulo:', error);
    res.status(500).json({ message: 'Error al eliminar artículo' });
  }
};

// Obtener categorías únicas
export const getCategorias = async (req, res) => {
  try {
    const [categorias] = await db.query(`
      SELECT DISTINCT categoria 
      FROM articulos 
      WHERE activo = true AND categoria IS NOT NULL
      ORDER BY categoria
    `);

    res.json(categorias.map(c => c.categoria));

  } catch (error) {
    console.error('Error en getCategorias:', error);
    res.status(500).json({ message: 'Error al obtener categorías' });
  }
};

// Buscar artículos
export const searchArticulos = async (req, res) => {
  try {
    const { q } = req.query;

    if (!q) {
      return res.status(400).json({ message: 'Parámetro de búsqueda requerido' });
    }

    const searchTerm = `%${q}%`;

    const [articulos] = await db.query(`
      SELECT 
        a.*, 
        s.cantidad as stock_actual, 
        s.stock_minimo, 
        s.stock_maximo, 
        s.ubicacion,
        p.nombre as proveedor_nombre,
        p.codigo as proveedor_codigo
      FROM articulos a
      LEFT JOIN stock s ON a.id = s.articulo_id
      LEFT JOIN proveedores p ON a.proveedor_id = p.id
      WHERE a.activo = true 
        AND (a.codigo LIKE ? OR a.nombre LIKE ? OR a.categoria LIKE ?)
      ORDER BY a.nombre
    `, [searchTerm, searchTerm, searchTerm]);

    res.json(articulos);

  } catch (error) {
    console.error('Error en searchArticulos:', error);
    res.status(500).json({ message: 'Error al buscar artículos' });
  }
};