import React, { useState, useEffect } from 'react';
import './Configuracion.css';
import axios from 'axios';
import AdminLayout from '../components/AdminLayout';

const Configuracion = () => {
  const [loading, setLoading] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [tabActiva, setTabActiva] = useState('general');
  
  const [configGeneral, setConfigGeneral] = useState({
    nombre_empresa: '',
    email_empresa: '',
    telefono: '',
    direccion: '',
    moneda: 'USD'
  });

  const [configStock, setConfigStock] = useState({
    stock_minimo_global: 10,
    stock_maximo_global: 100,
    alertas_activas: true,
    email_alertas: ''
  });

  const [configSistema, setConfigSistema] = useState({
    permitir_stock_negativo: false,
    requiere_autorizacion_movimientos: false,
    backup_automatico: true,
    dias_retencion_logs: 30
  });

  const [usuario, setUsuario] = useState({
    nombre: '',
    email: '',
    password_actual: '',
    password_nueva: '',
    password_confirmacion: ''
  });

  const API_URL = 'http://localhost:3000/api';

  useEffect(() => {
    cargarConfiguracion();
    cargarDatosUsuario();
  }, []);

  const cargarConfiguracion = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/configuracion`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        const config = response.data.data;
        setConfigGeneral(config.general || configGeneral);
        setConfigStock(config.stock || configStock);
        setConfigSistema(config.sistema || configSistema);
      }
    } catch (error) {
      console.error('Error al cargar configuración:', error);
    } finally {
      setLoading(false);
    }
  };

  const cargarDatosUsuario = () => {
    const userData = localStorage.getItem('user');
    if (userData) {
      const user = JSON.parse(userData);
      setUsuario(prev => ({
        ...prev,
        nombre: user.nombre || '',
        email: user.email || ''
      }));
    }
  };

  const guardarConfiguracion = async () => {
    setGuardando(true);
    try {
      const token = localStorage.getItem('token');
      const dataToSave = {
        general: configGeneral,
        stock: configStock,
        sistema: configSistema
      };

      await axios.put(
        `${API_URL}/configuracion`,
        dataToSave,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      alert('Configuración guardada exitosamente');
    } catch (error) {
      console.error('Error al guardar configuración:', error);
      alert('Error al guardar la configuración');
    } finally {
      setGuardando(false);
    }
  };

  const cambiarPassword = async (e) => {
    e.preventDefault();
    
    if (usuario.password_nueva !== usuario.password_confirmacion) {
      alert('Las contraseñas no coinciden');
      return;
    }

    if (usuario.password_nueva.length < 6) {
      alert('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${API_URL}/usuarios/cambiar-password`,
        {
          password_actual: usuario.password_actual,
          password_nueva: usuario.password_nueva
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert('Contraseña actualizada exitosamente');
      setUsuario(prev => ({
        ...prev,
        password_actual: '',
        password_nueva: '',
        password_confirmacion: ''
      }));
    } catch (error) {
      console.error('Error al cambiar contraseña:', error);
      alert(error.response?.data?.message || 'Error al cambiar la contraseña');
    }
  };

  const exportarDatos = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/configuracion/exportar`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `backup_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error al exportar datos:', error);
      alert('Error al exportar los datos');
    }
  };

  const renderTabGeneral = () => (
    <div className="tab-content">
      <div className="config-section">
        <h3>
          <span className="material-icons">business</span>
          Información de la Empresa
        </h3>
        <div className="form-grid">
          <div className="form-group">
            <label>Nombre de la Empresa</label>
            <input
              type="text"
              value={configGeneral.nombre_empresa}
              onChange={(e) => setConfigGeneral({ ...configGeneral, nombre_empresa: e.target.value })}
              placeholder="Mi Empresa S.A."
            />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={configGeneral.email_empresa}
              onChange={(e) => setConfigGeneral({ ...configGeneral, email_empresa: e.target.value })}
              placeholder="contacto@empresa.com"
            />
          </div>
          <div className="form-group">
            <label>Teléfono</label>
            <input
              type="tel"
              value={configGeneral.telefono}
              onChange={(e) => setConfigGeneral({ ...configGeneral, telefono: e.target.value })}
              placeholder="+1 234 567 8900"
            />
          </div>
          <div className="form-group">
            <label>Moneda</label>
            <select
              value={configGeneral.moneda}
              onChange={(e) => setConfigGeneral({ ...configGeneral, moneda: e.target.value })}
            >
              <option value="USD">USD - Dólar</option>
              <option value="EUR">EUR - Euro</option>
              <option value="MXN">MXN - Peso Mexicano</option>
              <option value="COP">COP - Peso Colombiano</option>
              <option value="ARS">ARS - Peso Argentino</option>
            </select>
          </div>
        </div>
        <div className="form-group full-width">
          <label>Dirección</label>
          <textarea
            value={configGeneral.direccion}
            onChange={(e) => setConfigGeneral({ ...configGeneral, direccion: e.target.value })}
            placeholder="Calle Principal #123, Ciudad, País"
            rows="3"
          ></textarea>
        </div>
      </div>
    </div>
  );

  const renderTabStock = () => (
    <div className="tab-content">
      <div className="config-section">
        <h3>
          <span className="material-icons">inventory</span>
          Niveles de Stock
        </h3>
        <div className="form-grid">
          <div className="form-group">
            <label>Stock Mínimo Global</label>
            <input
              type="number"
              value={configStock.stock_minimo_global}
              onChange={(e) => setConfigStock({ ...configStock, stock_minimo_global: parseInt(e.target.value) || 0 })}
              min="0"
            />
            <small>Valor por defecto para nuevos productos</small>
          </div>
          <div className="form-group">
            <label>Stock Máximo Global</label>
            <input
              type="number"
              value={configStock.stock_maximo_global}
              onChange={(e) => setConfigStock({ ...configStock, stock_maximo_global: parseInt(e.target.value) || 0 })}
              min="0"
            />
            <small>Valor por defecto para nuevos productos</small>
          </div>
        </div>
      </div>

      <div className="config-section">
        <h3>
          <span className="material-icons">notifications</span>
          Alertas de Stock
        </h3>
        <div className="form-group-checkbox">
          <label>
            <input
              type="checkbox"
              checked={configStock.alertas_activas}
              onChange={(e) => setConfigStock({ ...configStock, alertas_activas: e.target.checked })}
            />
            <span>Activar alertas de stock bajo</span>
          </label>
        </div>
        {configStock.alertas_activas && (
          <div className="form-group">
            <label>Email para Alertas</label>
            <input
              type="email"
              value={configStock.email_alertas}
              onChange={(e) => setConfigStock({ ...configStock, email_alertas: e.target.value })}
              placeholder="alertas@empresa.com"
            />
            <small>Las alertas se enviarán a este correo</small>
          </div>
        )}
      </div>
    </div>
  );

  const renderTabSistema = () => (
    <div className="tab-content">
      <div className="config-section">
        <h3>
          <span className="material-icons">settings</span>
          Configuración del Sistema
        </h3>
        <div className="form-group-checkbox">
          <label>
            <input
              type="checkbox"
              checked={configSistema.permitir_stock_negativo}
              onChange={(e) => setConfigSistema({ ...configSistema, permitir_stock_negativo: e.target.checked })}
            />
            <span>Permitir stock negativo</span>
          </label>
          <small className="help-text">Permite registrar salidas aunque no haya stock suficiente</small>
        </div>

        <div className="form-group-checkbox">
          <label>
            <input
              type="checkbox"
              checked={configSistema.requiere_autorizacion_movimientos}
              onChange={(e) => setConfigSistema({ ...configSistema, requiere_autorizacion_movimientos: e.target.checked })}
            />
            <span>Requiere autorización para movimientos</span>
          </label>
          <small className="help-text">Los movimientos deben ser autorizados por un administrador</small>
        </div>

        <div className="form-group-checkbox">
          <label>
            <input
              type="checkbox"
              checked={configSistema.backup_automatico}
              onChange={(e) => setConfigSistema({ ...configSistema, backup_automatico: e.target.checked })}
            />
            <span>Backup automático</span>
          </label>
          <small className="help-text">Genera copias de seguridad automáticamente</small>
        </div>

        <div className="form-group">
          <label>Días de retención de logs</label>
          <input
            type="number"
            value={configSistema.dias_retencion_logs}
            onChange={(e) => setConfigSistema({ ...configSistema, dias_retencion_logs: parseInt(e.target.value) || 0 })}
            min="1"
            max="365"
          />
          <small>Los logs más antiguos se eliminarán automáticamente</small>
        </div>
      </div>

      <div className="config-section">
        <h3>
          <span className="material-icons">backup</span>
          Respaldo de Datos
        </h3>
        <p className="section-description">
          Exporta todos los datos del sistema en formato JSON para crear una copia de seguridad.
        </p>
        <button className="btn-exportar-datos" onClick={exportarDatos}>
          <span className="material-icons">download</span>
          Exportar Datos del Sistema
        </button>
      </div>
    </div>
  );

  const renderTabPerfil = () => (
    <div className="tab-content">
      <div className="config-section">
        <h3>
          <span className="material-icons">person</span>
          Información Personal
        </h3>
        <div className="perfil-info">
          <div className="perfil-avatar-large">
            {usuario.nombre.charAt(0).toUpperCase()}
          </div>
          <div>
            <h4>{usuario.nombre}</h4>
            <p>{usuario.email}</p>
          </div>
        </div>
      </div>

      <div className="config-section">
        <h3>
          <span className="material-icons">lock</span>
          Cambiar Contraseña
        </h3>
        <form onSubmit={cambiarPassword}>
          <div className="form-group">
            <label>Contraseña Actual</label>
            <input
              type="password"
              value={usuario.password_actual}
              onChange={(e) => setUsuario({ ...usuario, password_actual: e.target.value })}
              required
              placeholder="********"
            />
          </div>
          <div className="form-group">
            <label>Nueva Contraseña</label>
            <input
              type="password"
              value={usuario.password_nueva}
              onChange={(e) => setUsuario({ ...usuario, password_nueva: e.target.value })}
              required
              placeholder="********"
              minLength="6"
            />
            <small>Mínimo 6 caracteres</small>
          </div>
          <div className="form-group">
            <label>Confirmar Nueva Contraseña</label>
            <input
              type="password"
              value={usuario.password_confirmacion}
              onChange={(e) => setUsuario({ ...usuario, password_confirmacion: e.target.value })}
              required
              placeholder="********"
            />
          </div>
          <button type="submit" className="btn-cambiar-password">
            <span className="material-icons">save</span>
            Actualizar Contraseña
          </button>
        </form>
      </div>
    </div>
  );

  if (loading) {
    return (
      <AdminLayout title="Configuración">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Cargando configuración...</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Configuración">
      <div className="configuracion-content">
        <div className="config-container">
          {/* Tabs Navigation */}
          <div className="config-tabs">
            <button
              className={`tab-btn ${tabActiva === 'general' ? 'active' : ''}`}
              onClick={() => setTabActiva('general')}
            >
              <span className="material-icons">business</span>
              <span>General</span>
            </button>
            <button
              className={`tab-btn ${tabActiva === 'stock' ? 'active' : ''}`}
              onClick={() => setTabActiva('stock')}
            >
              <span className="material-icons">inventory</span>
              <span>Stock</span>
            </button>
            <button
              className={`tab-btn ${tabActiva === 'sistema' ? 'active' : ''}`}
              onClick={() => setTabActiva('sistema')}
            >
              <span className="material-icons">settings</span>
              <span>Sistema</span>
            </button>
            <button
              className={`tab-btn ${tabActiva === 'perfil' ? 'active' : ''}`}
              onClick={() => setTabActiva('perfil')}
            >
              <span className="material-icons">person</span>
              <span>Mi Perfil</span>
            </button>
          </div>

          {/* Tabs Content */}
          <div className="config-content-area">
            {tabActiva === 'general' && renderTabGeneral()}
            {tabActiva === 'stock' && renderTabStock()}
            {tabActiva === 'sistema' && renderTabSistema()}
            {tabActiva === 'perfil' && renderTabPerfil()}

            {/* Botón Guardar (excepto en perfil) */}
            {tabActiva !== 'perfil' && (
              <div className="config-actions">
                <button
                  className="btn-guardar-config"
                  onClick={guardarConfiguracion}
                  disabled={guardando}
                >
                  <span className="material-icons">save</span>
                  {guardando ? 'Guardando...' : 'Guardar Configuración'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default Configuracion;