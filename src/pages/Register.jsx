import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../server/config/api';
import './Auth.css';

// ─────────────────────────────────────────────────
// NOTA: El registro público está deshabilitado por diseño.
// Solo los administradores pueden crear nuevas cuentas
// desde el panel de Usuarios → Nuevo Usuario.
//
// Esta página existe únicamente como referencia o para
// el setup inicial. Redirige al login tras 5 segundos.
// ─────────────────────────────────────────────────

const Register = () => {
  const navigate  = useNavigate();
  const [formData, setFormData] = useState({
    nombre: '', email: '', password: '', confirmPassword: '',
  });
  const [error,   setError]   = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }
    if (formData.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setLoading(true);
    try {
      // Este endpoint requiere un token de admin en producción.
      // Para el setup inicial (primer admin) el token puede omitirse
      // si el servidor lo permite durante la primera configuración.
      const response = await api.post('/api/auth/register', {
        nombre:   formData.nombre,
        email:    formData.email,
        password: formData.password,
        rol:      'admin', // primer usuario = admin
      });

      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user',  JSON.stringify(response.data.user));

      setSuccess('Cuenta creada exitosamente. Redirigiendo...');
      setTimeout(() => navigate('/dashboard'), 1500);

    } catch (err) {
      const msg = err.response?.data?.message || '';

      // Si el error es 401/403, el registro público está bloqueado
      if (err.response?.status === 401 || err.response?.status === 403) {
        setError(
          'El registro público está deshabilitado. ' +
          'Contacta al administrador del sistema para obtener acceso.'
        );
      } else {
        setError(msg || 'Error al registrarse');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">
            <span className="material-icons" style={{ fontSize: 40, color: 'var(--color-secondary)' }}>
              inventory_2
            </span>
          </div>
          <h2>Configuración Inicial</h2>
          <p>Crea la cuenta de administrador del sistema</p>
        </div>

        {/* Banner informativo */}
        <div className="info-banner">
          <span className="material-icons">info</span>
          <span>
            Este formulario es solo para la configuración inicial.
            Los demás usuarios los crea el administrador desde el panel.
          </span>
        </div>

        {error   && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="nombre">Nombre Completo</label>
            <input
              type="text" id="nombre" name="nombre"
              value={formData.nombre} onChange={handleChange}
              placeholder="Tu nombre completo" required
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Correo Electrónico</label>
            <input
              type="email" id="email" name="email"
              value={formData.email} onChange={handleChange}
              placeholder="tu@email.com" required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Contraseña</label>
            <input
              type="password" id="password" name="password"
              value={formData.password} onChange={handleChange}
              placeholder="Mínimo 6 caracteres" required
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirmar Contraseña</label>
            <input
              type="password" id="confirmPassword" name="confirmPassword"
              value={formData.confirmPassword} onChange={handleChange}
              placeholder="Repite tu contraseña" required
            />
          </div>

          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Creando cuenta...' : 'Crear Cuenta de Administrador'}
          </button>
        </form>

        <div className="auth-footer">
          <p>¿Ya tienes cuenta? <Link to="/login">Inicia sesión aquí</Link></p>
        </div>
      </div>
    </div>
  );
};

export default Register;