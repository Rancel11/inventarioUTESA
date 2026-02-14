import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../config/database.js';
import { getUserPermissions } from '../middleware/authMiddleware.js';

// ─────────────────────────────────────────────────
// HELPER: firmar token JWT
// ─────────────────────────────────────────────────
const signToken = (id, rol) =>
  jwt.sign({ id, rol }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '8h',
  });

// ─────────────────────────────────────────────────
// REGISTER
// Modos:
//   • Setup inicial: si no existe ningún usuario en la DB,
//     se permite el registro sin token (crea el primer admin).
//   • Normal: requiere autenticación de admin (manejado por
//     la ruta con requireAdmin antes de llegar aquí).
// ─────────────────────────────────────────────────
export const register = async (req, res) => {
  try {
    const { nombre, email, password, rol = 'operador' } = req.body;

    if (!nombre || !email || !password) {
      return res.status(400).json({ message: 'Nombre, email y contraseña son requeridos' });
    }

    const rolesPermitidos = ['admin', 'encargado', 'operador'];
    if (!rolesPermitidos.includes(rol)) {
      return res.status(400).json({ message: 'Rol inválido. Use: admin, encargado u operador' });
    }

    // Modo setup inicial: verificar si hay usuarios
    const [totalUsuarios] = await db.query('SELECT COUNT(*) as total FROM usuarios');
    const esSetupInicial  = totalUsuarios[0].total === 0;

    // Si NO es setup inicial y el request no viene de un admin → 403
    // (req.userRol lo pone el authMiddleware; si no hay token es undefined)
    if (!esSetupInicial && req.userRol !== 'admin') {
      return res.status(403).json({
        message: 'Solo los administradores pueden registrar nuevos usuarios. ' +
                 'Usa el panel de Usuarios para crear cuentas.',
      });
    }

    // En setup inicial, forzar rol admin
    const rolFinal = esSetupInicial ? 'admin' : rol;

    const [existente] = await db.query('SELECT id FROM usuarios WHERE email = ?', [email]);
    if (existente.length > 0) {
      return res.status(400).json({ message: 'El correo electrónico ya está registrado' });
    }

    const salt           = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const [result] = await db.query(
      'INSERT INTO usuarios (nombre, email, password, rol) VALUES (?, ?, ?, ?)',
      [nombre, email, hashedPassword, rolFinal]
    );

    const token = signToken(result.insertId, rolFinal);

    res.status(201).json({
      message: esSetupInicial
        ? 'Administrador creado exitosamente. ¡Bienvenido!'
        : 'Usuario registrado exitosamente',
      token,
      user: {
        id:       result.insertId,
        nombre,
        email,
        rol:      rolFinal,
        permisos: getUserPermissions(rolFinal),
      },
    });

  } catch (error) {
    console.error('Error en register:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
};

// ─────────────────────────────────────────────────
// LOGIN
// ─────────────────────────────────────────────────
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email y contraseña son requeridos' });
    }

    const [usuarios] = await db.query('SELECT * FROM usuarios WHERE email = ?', [email]);
    if (usuarios.length === 0) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    const usuario = usuarios[0];

    const isMatch = await bcrypt.compare(password, usuario.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    if (!usuario.activo) {
      return res.status(403).json({
        message: 'Tu cuenta está inactiva. Contacta al administrador.',
      });
    }

    const token = signToken(usuario.id, usuario.rol);

    res.json({
      message: 'Login exitoso',
      token,
      user: {
        id:       usuario.id,
        nombre:   usuario.nombre,
        email:    usuario.email,
        rol:      usuario.rol,
        permisos: getUserPermissions(usuario.rol),
      },
    });

  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
};

// ─────────────────────────────────────────────────
// PERFIL
// ─────────────────────────────────────────────────
export const getProfile = async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, nombre, email, rol, fecha_creacion FROM usuarios WHERE id = ?',
      [req.userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    res.json({
      ...rows[0],
      permisos: getUserPermissions(rows[0].rol),
    });

  } catch (error) {
    console.error('Error en getProfile:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
};

// ─────────────────────────────────────────────────
// CRUD USUARIOS (admin)
// ─────────────────────────────────────────────────
export const getUsuarios = async (req, res) => {
  try {
    const [usuarios] = await db.query(
      'SELECT id, nombre, email, rol, activo, fecha_creacion FROM usuarios ORDER BY fecha_creacion DESC'
    );
    res.json(usuarios);
  } catch (error) {
    console.error('Error en getUsuarios:', error);
    res.status(500).json({ message: 'Error al obtener usuarios' });
  }
};

export const updateUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, email, rol, activo } = req.body;

    const rolesPermitidos = ['admin', 'encargado', 'operador'];
    if (rol && !rolesPermitidos.includes(rol)) {
      return res.status(400).json({ message: 'Rol inválido' });
    }

    if (parseInt(id) === req.userId && rol && rol !== 'admin') {
      return res.status(400).json({
        message: 'No puedes cambiar tu propio rol de administrador',
      });
    }

    await db.query(
      `UPDATE usuarios SET
        nombre = COALESCE(?, nombre),
        email  = COALESCE(?, email),
        rol    = COALESCE(?, rol),
        activo = COALESCE(?, activo)
      WHERE id = ?`,
      [nombre ?? null, email ?? null, rol ?? null, activo ?? null, id]
    );

    const [updated] = await db.query(
      'SELECT id, nombre, email, rol, activo FROM usuarios WHERE id = ?',
      [id]
    );

    res.json({ message: 'Usuario actualizado', usuario: updated[0] });

  } catch (error) {
    console.error('Error en updateUsuario:', error);
    res.status(500).json({ message: 'Error al actualizar usuario' });
  }
};

export const deleteUsuario = async (req, res) => {
  try {
    const { id } = req.params;

    if (parseInt(id) === req.userId) {
      return res.status(400).json({ message: 'No puedes eliminar tu propia cuenta' });
    }

    await db.query('UPDATE usuarios SET activo = false WHERE id = ?', [id]);
    res.json({ message: 'Usuario desactivado exitosamente' });

  } catch (error) {
    console.error('Error en deleteUsuario:', error);
    res.status(500).json({ message: 'Error al eliminar usuario' });
  }
};

// ─────────────────────────────────────────────────
// PUT /api/auth/cambiar-password
// Usuario autenticado cambia su propia contraseña
// ─────────────────────────────────────────────────
export const cambiarPassword = async (req, res) => {
  try {
    const { password_actual, password_nueva } = req.body;

    if (!password_actual || !password_nueva) {
      return res.status(400).json({ message: 'Contraseña actual y nueva son requeridas' });
    }

    if (password_nueva.length < 6) {
      return res.status(400).json({ message: 'La nueva contraseña debe tener al menos 6 caracteres' });
    }

    const [rows] = await db.query('SELECT * FROM usuarios WHERE id = ?', [req.userId]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    const isMatch = await bcrypt.compare(password_actual, rows[0].password);
    if (!isMatch) {
      return res.status(400).json({ message: 'La contraseña actual es incorrecta' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(password_nueva, salt);

    await db.query('UPDATE usuarios SET password = ? WHERE id = ?', [hashed, req.userId]);

    res.json({ message: 'Contraseña actualizada correctamente' });

  } catch (error) {
    console.error('Error en cambiarPassword:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
};