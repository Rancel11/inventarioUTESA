import React, { useState, useEffect } from 'react';
import './Usuarios.css';
import axios from 'axios';
import AdminLayout from '../components/AdminLayout';

const Usuarios = () => {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [filtroRol, setFiltroRol] = useState('todos');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalEditar, setModalEditar] = useState(false);
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState(null);
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    password: '',
    rol: 'usuario',
    activo: true
  });

  const API_URL = 'http://localhost:3000/api';

  useEffect(() => {
    cargarUsuarios();
  }, []);

  const cargarUsuarios = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/usuarios`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsuarios(response.data);
    } catch (error) {
      console.error('Error al cargar usuarios:', error);
    } finally {
      setLoading(false);
    }
  };

  const usuariosFiltrados = usuarios.filter(usuario => {
    const cumpleBusqueda = usuario.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
                          usuario.email.toLowerCase().includes(busqueda.toLowerCase());
    const cumpleRol = filtroRol === 'todos' || usuario.rol === filtroRol;
    const cumpleEstado = filtroEstado === 'todos' || 
                        (filtroEstado === 'activos' && usuario.activo) ||
                        (filtroEstado === 'inactivos' && !usuario.activo);
    
    return cumpleBusqueda && cumpleRol && cumpleEstado;
  });

  const estadisticas = {
    total: usuarios.length,
    activos: usuarios.filter(u => u.activo).length,
    administradores: usuarios.filter(u => u.rol === 'admin').length,
    usuarios: usuarios.filter(u => u.rol === 'usuario').length
  };

  const abrirModalCrear = () => {
    setFormData({
      nombre: '',
      email: '',
      password: '',
      rol: 'usuario',
      activo: true
    });
    setModalOpen(true);
  };

  const abrirModalEditar = (usuario) => {
    setUsuarioSeleccionado(usuario);
    setFormData({
      nombre: usuario.nombre,
      email: usuario.email,
      password: '',
      rol: usuario.rol,
      activo: usuario.activo
    });
    setModalEditar(true);
  };

  const cerrarModales = () => {
    setModalOpen(false);
    setModalEditar(false);
    setUsuarioSeleccionado(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      
      if (modalEditar) {
        // Editar usuario
        const dataToSend = { ...formData };
        if (!dataToSend.password) {
          delete dataToSend.password;
        }
        
        await axios.put(
          `${API_URL}/usuarios/${usuarioSeleccionado.id}`,
          dataToSend,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        alert('Usuario actualizado exitosamente');
      } else {
        // Crear usuario
        await axios.post(
          `${API_URL}/usuarios`,
          formData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        alert('Usuario creado exitosamente');
      }
      
      cerrarModales();
      cargarUsuarios();
    } catch (error) {
      console.error('Error al guardar usuario:', error);
      alert(error.response?.data?.message || 'Error al guardar usuario');
    }
  };

  const toggleEstadoUsuario = async (usuario) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${API_URL}/usuarios/${usuario.id}`,
        { activo: !usuario.activo },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      cargarUsuarios();
    } catch (error) {
      console.error('Error al cambiar estado:', error);
      alert('Error al cambiar el estado del usuario');
    }
  };

  const eliminarUsuario = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar este usuario?')) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/usuarios/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Usuario eliminado exitosamente');
      cargarUsuarios();
    } catch (error) {
      console.error('Error al eliminar usuario:', error);
      alert('Error al eliminar usuario');
    }
  };

  if (loading) {
    return (
      <AdminLayout title="Gestión de Usuarios">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Cargando usuarios...</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Gestión de Usuarios">
      <div className="usuarios-content">
        {/* Stats Row */}
        <div className="stats-row">
          <div className="stat-card blue">
            <div className="stat-header">
              <h3>Total Usuarios</h3>
              <span className="stat-icon material-icons">people</span>
            </div>
            <div className="stat-body">
              <p className="stat-number">{estadisticas.total}</p>
            </div>
            <div className="stat-footer">
              <span className="stat-period">Registrados</span>
            </div>
          </div>

          <div className="stat-card green">
            <div className="stat-header">
              <h3>Activos</h3>
              <span className="stat-icon material-icons">check_circle</span>
            </div>
            <div className="stat-body">
              <p className="stat-number">{estadisticas.activos}</p>
            </div>
            <div className="stat-footer">
              <span className="stat-period">En sistema</span>
            </div>
          </div>

          <div className="stat-card purple">
            <div className="stat-header">
              <h3>Administradores</h3>
              <span className="stat-icon material-icons">admin_panel_settings</span>
            </div>
            <div className="stat-body">
              <p className="stat-number">{estadisticas.administradores}</p>
            </div>
            <div className="stat-footer">
              <span className="stat-period">Con permisos completos</span>
            </div>
          </div>

          <div className="stat-card orange">
            <div className="stat-header">
              <h3>Usuarios</h3>
              <span className="stat-icon material-icons">person</span>
            </div>
            <div className="stat-body">
              <p className="stat-number">{estadisticas.usuarios}</p>
            </div>
            <div className="stat-footer">
              <span className="stat-period">Permisos limitados</span>
            </div>
          </div>
        </div>

        {/* Tabla de Usuarios */}
        <div className="chart-card">
          <div className="card-header">
            <h3>Listado de Usuarios</h3>
            <div className="header-actions">
              <div className="search-box-usuarios">
                <span className="material-icons">search</span>
                <input
                  type="text"
                  placeholder="Buscar usuario..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                />
              </div>
              <button className="btn-crear" onClick={abrirModalCrear}>
                <span className="material-icons">add</span>
                Nuevo Usuario
              </button>
            </div>
          </div>

          <div className="filtros-usuarios">
            <button 
              className={`btn-filter ${filtroRol === 'todos' ? 'active' : ''}`}
              onClick={() => setFiltroRol('todos')}
            >
              Todos
            </button>
            <button 
              className={`btn-filter ${filtroRol === 'admin' ? 'active' : ''}`}
              onClick={() => setFiltroRol('admin')}
            >
              Administradores
            </button>
            <button 
              className={`btn-filter ${filtroRol === 'usuario' ? 'active' : ''}`}
              onClick={() => setFiltroRol('usuario')}
            >
              Usuarios
            </button>
            <div className="divisor"></div>
            <button 
              className={`btn-filter ${filtroEstado === 'todos' ? 'active' : ''}`}
              onClick={() => setFiltroEstado('todos')}
            >
              Todos los estados
            </button>
            <button 
              className={`btn-filter ${filtroEstado === 'activos' ? 'active' : ''}`}
              onClick={() => setFiltroEstado('activos')}
            >
              Activos
            </button>
            <button 
              className={`btn-filter ${filtroEstado === 'inactivos' ? 'active' : ''}`}
              onClick={() => setFiltroEstado('inactivos')}
            >
              Inactivos
            </button>
          </div>

          <div className="card-body">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Email</th>
                  <th>Rol</th>
                  <th>Estado</th>
                  <th>Fecha Registro</th>
                  <th>Último Acceso</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {usuariosFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: '#6c757d' }}>
                      No hay usuarios que mostrar
                    </td>
                  </tr>
                ) : (
                  usuariosFiltrados.map(usuario => (
                    <tr key={usuario.id}>
                      <td>
                        <div className="usuario-info">
                          <div className="usuario-avatar">
                            {usuario.nombre.charAt(0).toUpperCase()}
                          </div>
                          <strong>{usuario.nombre}</strong>
                        </div>
                      </td>
                      <td>{usuario.email}</td>
                      <td>
                        <span className={`badge ${usuario.rol === 'admin' ? 'admin' : 'user'}`}>
                          {usuario.rol === 'admin' ? 'Administrador' : 'Usuario'}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${usuario.activo ? 'success' : 'danger'}`}>
                          {usuario.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td>{usuario.fecha_registro ? new Date(usuario.fecha_registro).toLocaleDateString() : '-'}</td>
                      <td>{usuario.ultimo_acceso ? new Date(usuario.ultimo_acceso).toLocaleDateString() : 'Nunca'}</td>
                      <td>
                        <div className="acciones-usuario">
                          <button
                            className="btn-icon edit"
                            onClick={() => abrirModalEditar(usuario)}
                            title="Editar"
                          >
                            <span className="material-icons">edit</span>
                          </button>
                          <button
                            className="btn-icon toggle"
                            onClick={() => toggleEstadoUsuario(usuario)}
                            title={usuario.activo ? 'Desactivar' : 'Activar'}
                          >
                            <span className="material-icons">
                              {usuario.activo ? 'toggle_on' : 'toggle_off'}
                            </span>
                          </button>
                          <button
                            className="btn-icon delete"
                            onClick={() => eliminarUsuario(usuario.id)}
                            title="Eliminar"
                          >
                            <span className="material-icons">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal Crear/Editar */}
      {(modalOpen || modalEditar) && (
        <div className="modal-overlay" onClick={cerrarModales}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                <span className="material-icons">
                  {modalEditar ? 'edit' : 'person_add'}
                </span>
                {modalEditar ? 'Editar Usuario' : 'Nuevo Usuario'}
              </h2>
              <button className="modal-close" onClick={cerrarModales}>
                <span className="material-icons">close</span>
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Nombre Completo *</label>
                  <input
                    type="text"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    required
                    placeholder="Ej: Juan Pérez"
                  />
                </div>

                <div className="form-group">
                  <label>Email *</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    placeholder="correo@ejemplo.com"
                  />
                </div>

                <div className="form-group">
                  <label>Contraseña {modalEditar && '(dejar en blanco para no cambiar)'}</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required={!modalEditar}
                    placeholder="********"
                  />
                </div>

                <div className="form-group">
                  <label>Rol *</label>
                  <select
                    value={formData.rol}
                    onChange={(e) => setFormData({ ...formData, rol: e.target.value })}
                    required
                  >
                    <option value="usuario">Usuario</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>

                <div className="form-group-checkbox">
                  <label>
                    <input
                      type="checkbox"
                      checked={formData.activo}
                      onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
                    />
                    <span>Usuario activo</span>
                  </label>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={cerrarModales}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  <span className="material-icons">save</span>
                  {modalEditar ? 'Guardar Cambios' : 'Crear Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default Usuarios;