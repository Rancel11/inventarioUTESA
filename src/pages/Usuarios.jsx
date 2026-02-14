import React, { useState, useEffect } from 'react';
import AdminLayout from '../components/AdminLayout';
import api from '../../server/config/api';
import './Usuarios.css';

const ROLES = [
  { value: 'admin',     label: 'Administrador', color: 'rol-admin',     desc: 'Acceso total al sistema' },
  { value: 'encargado', label: 'Encargado',      color: 'rol-encargado', desc: 'Gestión de inventario y proveedores' },
  { value: 'operador',  label: 'Operador',       color: 'rol-operador',  desc: 'Solo lectura y movimientos' },
];

const EMPTY_FORM = { nombre:'', email:'', password:'', rol:'operador' };

const PERMISOS_POR_ROL = {
  admin:     ['Artículos (completo)', 'Stock', 'Movimientos (completo)', 'Proveedores (completo)', 'Compras (completo)', 'Usuarios (completo)', 'Reportes', 'Configuración'],
  encargado: ['Artículos (sin eliminar)', 'Stock', 'Movimientos', 'Ver Proveedores', 'Compras (crear/actualizar)', 'Reportes'],
  operador:  ['Ver Artículos', 'Ver Stock', 'Registrar Movimientos', 'Ver Proveedores', 'Ver Compras'],
};

const Usuarios = () => {
  const [usuarios,   setUsuarios]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [showModal,  setShowModal]  = useState(false);
  const [showPerms,  setShowPerms]  = useState(false);
  const [editingUser,setEditingUser]= useState(null);
  const [formData,   setFormData]   = useState(EMPTY_FORM);
  const [selectedRol,setSelectedRol]= useState(null);

  const meUser = JSON.parse(localStorage.getItem('user') || '{}');
  const permisos = meUser.permisos ?? [];
  const can = (p) => permisos.includes(p);

  useEffect(() => { fetchUsuarios(); }, []);

  const fetchUsuarios = async () => {
    try {
      const { data } = await api.get('/api/auth/usuarios');
      setUsuarios(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleInputChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingUser) {
        const { password, ...rest } = formData;
        await api.put(`/api/auth/usuarios/${editingUser.id}`, rest);
      } else {
        await api.post('/api/auth/register', formData);
      }
      closeModal();
      fetchUsuarios();
    } catch (error) {
      alert(error.response?.data?.message || 'Error al guardar usuario');
    }
  };

  const handleEdit = (u) => {
    setEditingUser(u);
    setFormData({ nombre: u.nombre, email: u.email, password:'', rol: u.rol });
    setShowModal(true);
  };

  const handleToggleActivo = async (id, activo) => {
    try {
      await api.put(`/api/auth/usuarios/${id}`, { activo: !activo });
      fetchUsuarios();
    } catch (e) { alert('Error al actualizar estado'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Desactivar este usuario?')) return;
    try {
      await api.delete(`/api/auth/usuarios/${id}`);
      fetchUsuarios();
    } catch (e) { alert('Error al eliminar usuario'); }
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingUser(null);
    setFormData(EMPTY_FORM);
  };

  const rolInfo = (val) => ROLES.find(r => r.value === val) || ROLES[2];

  if (loading) return (
    <div className="loading-container">
      <div className="spinner"></div><p>Cargando usuarios...</p>
    </div>
  );

  return (
    <AdminLayout title="Gestión de Usuarios">
      <div className="usuarios-page">

        <div className="page-header">
          <p style={{ fontSize:16, color:'#6c757d', margin:0 }}>
            Administra cuentas y roles de acceso al sistema
          </p>
          <div style={{ display:'flex', gap:10 }}>
            <button className="btn btn-secondary" onClick={() => setShowPerms(true)}>
              <span className="material-icons">security</span>Ver Permisos
            </button>
            {can('usuarios:create') && (
              <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                <span className="material-icons">person_add</span>Nuevo Usuario
              </button>
            )}
          </div>
        </div>

        {/* ── Resumen de roles ── */}
        <div className="roles-cards">
          {ROLES.map((r) => {
            const count = usuarios.filter(u => u.rol === r.value && u.activo).length;
            return (
              <div className={`rol-card ${r.color}`} key={r.value}>
                <span className="material-icons rol-icon">
                  {r.value === 'admin' ? 'admin_panel_settings' : r.value === 'encargado' ? 'manage_accounts' : 'person'}
                </span>
                <div>
                  <h3>{count}</h3>
                  <p>{r.label}{count !== 1 ? 'es' : ''}</p>
                  <small>{r.desc}</small>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Tabla ── */}
        <div className="usuarios-table-container">
          <table className="usuarios-table">
            <thead>
              <tr>
                <th>Nombre</th><th>Email</th><th>Rol</th>
                <th>Estado</th><th>Fecha Registro</th><th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.length === 0 ? (
                <tr><td colSpan="6">
                  <div className="empty-state">
                    <span className="material-icons">group</span>
                    <p>No hay usuarios registrados</p>
                  </div>
                </td></tr>
              ) : usuarios.map((u) => {
                const info = rolInfo(u.rol);
                const isMe = u.id === meUser.id;
                return (
                  <tr key={u.id} className={!u.activo ? 'row-inactivo' : ''}>
                    <td>
                      <div className="usuario-cell">
                        <div className={`avatar-mini ${info.color}`}>
                          {u.nombre.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <strong>{u.nombre}</strong>
                          {isMe && <span className="badge-yo">Tú</span>}
                        </div>
                      </div>
                    </td>
                    <td>{u.email}</td>
                    <td>
                      <span className={`rol-badge ${info.color}`}>{info.label}</span>
                    </td>
                    <td>
                      {can('usuarios:update') && !isMe ? (
                        <button
                          className={`toggle-btn-status ${u.activo ? 'activo' : 'inactivo'}`}
                          onClick={() => handleToggleActivo(u.id, u.activo)}
                        >
                          <span className="material-icons">
                            {u.activo ? 'toggle_on' : 'toggle_off'}
                          </span>
                          {u.activo ? 'Activo' : 'Inactivo'}
                        </button>
                      ) : (
                        <span className={`badge ${u.activo ? 'disponible' : 'sin-stock'}`}>
                          {u.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      )}
                    </td>
                    <td>
                      {new Date(u.fecha_creacion).toLocaleDateString('es-ES',{
                        day:'2-digit', month:'2-digit', year:'numeric'
                      })}
                    </td>
                    <td>
                      <div className="action-buttons">
                        {can('usuarios:update') && (
                          <button className="btn-icon" onClick={() => handleEdit(u)} title="Editar">
                            <span className="material-icons">edit</span>
                          </button>
                        )}
                        {can('usuarios:delete') && !isMe && (
                          <button className="btn-icon btn-danger" onClick={() => handleDelete(u.id)} title="Desactivar">
                            <span className="material-icons">person_off</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* ════════════════════════════════════
            MODAL: Crear / Editar Usuario
            ════════════════════════════════════ */}
        {showModal && (
          <div className="modal-overlay" onClick={closeModal}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>{editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}</h2>
                <button className="close-btn" onClick={closeModal}>
                  <span className="material-icons">close</span>
                </button>
              </div>
              <div className="modal-body">
                <form onSubmit={handleSubmit} id="usuarioForm">
                  <div className="form-grid">
                    <div className="form-group">
                      <label>Nombre *</label>
                      <input type="text" name="nombre" value={formData.nombre}
                        onChange={handleInputChange} required />
                    </div>
                    <div className="form-group">
                      <label>Email *</label>
                      <input type="email" name="email" value={formData.email}
                        onChange={handleInputChange} required />
                    </div>
                    {!editingUser && (
                      <div className="form-group">
                        <label>Contraseña *</label>
                        <input type="password" name="password" value={formData.password}
                          onChange={handleInputChange} required={!editingUser} />
                      </div>
                    )}
                    <div className="form-group">
                      <label>Rol *</label>
                      <select name="rol" value={formData.rol}
                        onChange={handleInputChange} className="form-select">
                        {ROLES.map((r) => (
                          <option key={r.value} value={r.value}>{r.label} — {r.desc}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Preview de permisos del rol seleccionado */}
                  <div className="perms-preview">
                    <p className="perms-title">
                      <span className="material-icons">check_circle</span>
                      Permisos del rol seleccionado:
                    </p>
                    <div className="perms-list">
                      {(PERMISOS_POR_ROL[formData.rol] || []).map((p) => (
                        <span key={p} className="perm-chip">{p}</span>
                      ))}
                    </div>
                  </div>
                </form>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancelar</button>
                <button type="submit" form="usuarioForm" className="btn btn-primary">
                  {editingUser ? 'Actualizar' : 'Crear'} Usuario
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════
            MODAL: Tabla de Permisos por Rol
            ════════════════════════════════════ */}
        {showPerms && (
          <div className="modal-overlay" onClick={() => setShowPerms(false)}>
            <div className="modal-content modal-lg" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Tabla de Permisos por Rol</h2>
                <button className="close-btn" onClick={() => setShowPerms(false)}>
                  <span className="material-icons">close</span>
                </button>
              </div>
              <div className="modal-body">
                <table className="perms-table">
                  <thead>
                    <tr>
                      <th>Módulo / Acción</th>
                      <th className="col-admin">Administrador</th>
                      <th className="col-encargado">Encargado</th>
                      <th className="col-operador">Operador</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ['Ver Artículos',         true,  true,  true ],
                      ['Crear Artículos',        true,  true,  false],
                      ['Editar Artículos',       true,  true,  false],
                      ['Eliminar Artículos',     true,  false, false],
                      ['Ver Stock',              true,  true,  true ],
                      ['Ver Movimientos',        true,  true,  true ],
                      ['Registrar Movimientos',  true,  true,  true ],
                      ['Ver Proveedores',        true,  true,  true ],
                      ['Crear/Editar Proveedores',true, false, false],
                      ['Eliminar Proveedores',   true,  false, false],
                      ['Ver Compras',            true,  true,  true ],
                      ['Crear Órdenes de Compra',true,  true,  false],
                      ['Recibir/Cancelar Compras',true, true,  false],
                      ['Ver Reportes',           true,  true,  false],
                      ['Gestionar Usuarios',     true,  false, false],
                      ['Configuración',          true,  false, false],
                    ].map(([mod, a, e, o]) => (
                      <tr key={mod}>
                        <td>{mod}</td>
                        <td className="center">{a ? '✅' : '❌'}</td>
                        <td className="center">{e ? '✅' : '❌'}</td>
                        <td className="center">{o ? '✅' : '❌'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </div>
    </AdminLayout>
  );
};

export default Usuarios;