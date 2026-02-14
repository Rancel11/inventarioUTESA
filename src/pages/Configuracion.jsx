import React, { useState, useEffect } from 'react';
import api from '../../server/config/api';
import AdminLayout from '../components/AdminLayout';
import './Configuracion.css';

// Claves en localStorage para persistir sin tabla extra en DB
const LS_STOCK  = 'cfg_stock';
const LS_SISTEMA = 'cfg_sistema';

const DEF_STOCK = {
  stock_minimo_global: 10,
  stock_maximo_global: 100,
  alertas_activas:     true,
  email_alertas:       '',
};

const DEF_SISTEMA = {
  permitir_stock_negativo:             false,
  requiere_autorizacion_movimientos:   false,
  backup_automatico:                   true,
  dias_retencion_logs:                 30,
};

const Configuracion = () => {
  const [tabActiva,   setTabActiva]   = useState('stock');
  const [guardando,   setGuardando]   = useState(false);
  const [guardadoOk,  setGuardadoOk]  = useState(false);

  const [cfgStock,    setCfgStock]    = useState(DEF_STOCK);
  const [cfgSistema,  setCfgSistema]  = useState(DEF_SISTEMA);

  const [usuario, setUsuario] = useState({
    nombre: '', email: '', rol: '',
    password_actual: '', password_nueva: '', password_confirmacion: '',
  });
  const [pwError,  setPwError]  = useState('');
  const [pwOk,     setPwOk]     = useState('');
  const [savingPw, setSavingPw] = useState(false);

  // ── Carga inicial ────────────────────────────
  useEffect(() => {
    // Configuración desde localStorage
    try {
      const s = localStorage.getItem(LS_STOCK);
      if (s) setCfgStock({ ...DEF_STOCK, ...JSON.parse(s) });
      const si = localStorage.getItem(LS_SISTEMA);
      if (si) setCfgSistema({ ...DEF_SISTEMA, ...JSON.parse(si) });
    } catch { /* ignore */ }

    // Datos del usuario desde localStorage
    const ud = localStorage.getItem('user');
    if (ud) {
      const u = JSON.parse(ud);
      setUsuario(prev => ({
        ...prev,
        nombre: u.nombre ?? '',
        email:  u.email  ?? '',
        rol:    u.rol    ?? '',
      }));
    }
  }, []);

  // ── Guardar configuración en localStorage ────
  const guardarConfig = () => {
    setGuardando(true);
    try {
      localStorage.setItem(LS_STOCK,   JSON.stringify(cfgStock));
      localStorage.setItem(LS_SISTEMA, JSON.stringify(cfgSistema));
      setGuardadoOk(true);
      setTimeout(() => setGuardadoOk(false), 3000);
    } catch (e) {
      alert('Error al guardar configuración');
    } finally {
      setGuardando(false);
    }
  };

  // ── Cambiar contraseña ───────────────────────
  const cambiarPassword = async (e) => {
    e.preventDefault();
    setPwError(''); setPwOk('');

    if (usuario.password_nueva !== usuario.password_confirmacion) {
      setPwError('Las contraseñas no coinciden'); return;
    }
    if (usuario.password_nueva.length < 6) {
      setPwError('Mínimo 6 caracteres'); return;
    }

    setSavingPw(true);
    try {
      await api.put('/api/auth/cambiar-password', {
        password_actual: usuario.password_actual,
        password_nueva:  usuario.password_nueva,
      });
      setPwOk('Contraseña actualizada correctamente');
      setUsuario(prev => ({
        ...prev,
        password_actual: '', password_nueva: '', password_confirmacion: '',
      }));
    } catch (err) {
      setPwError(err.response?.data?.message || 'Error al cambiar contraseña');
    } finally {
      setSavingPw(false);
    }
  };

  // ── Exportar datos ───────────────────────────
  const exportarDatos = async () => {
    try {
      const [resArts, resMov, resProv] = await Promise.all([
        api.get('/api/articulos'),
        api.get('/api/movimientos?limit=1000'),
        api.get('/api/proveedores'),
      ]);
      const backup = {
        exportado_el: new Date().toISOString(),
        articulos:    resArts.data,
        movimientos:  resMov.data,
        proveedores:  resProv.data,
      };
      const blob = new Blob([JSON.stringify(backup, null, 2)],
        { type: 'application/json' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url;
      a.download = `backup_inventario_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert('Error al exportar datos');
    }
  };

  // ── Etiqueta de rol ──────────────────────────
  const rolLabel = { admin:'Administrador', encargado:'Encargado', operador:'Operador' };

  // ═══════════════════════════════════════════
  // RENDER TABS
  // ═══════════════════════════════════════════

  const renderStock = () => (
    <div className="tab-content">
      <div className="config-section">
        <h3><span className="material-icons">inventory</span>Niveles de Stock por Defecto</h3>
        <p className="section-description">
          Estos valores se aplican como referencia global al crear nuevos artículos.
          Cada artículo puede tener sus propios niveles desde el módulo de Stock.
        </p>
        <div className="form-grid">
          <div className="form-group">
            <label>Stock Mínimo Global</label>
            <input type="number" min="0"
              value={cfgStock.stock_minimo_global}
              onChange={e => setCfgStock({ ...cfgStock, stock_minimo_global: +e.target.value || 0 })} />
            <small>Alerta de stock bajo por defecto</small>
          </div>
          <div className="form-group">
            <label>Stock Máximo Global</label>
            <input type="number" min="0"
              value={cfgStock.stock_maximo_global}
              onChange={e => setCfgStock({ ...cfgStock, stock_maximo_global: +e.target.value || 0 })} />
            <small>Nivel máximo recomendado por defecto</small>
          </div>
        </div>
      </div>

      <div className="config-section">
        <h3><span className="material-icons">notifications</span>Alertas de Stock</h3>
        <div className="form-group-checkbox">
          <label>
            <input type="checkbox" checked={cfgStock.alertas_activas}
              onChange={e => setCfgStock({ ...cfgStock, alertas_activas: e.target.checked })} />
            <span>Mostrar alertas de stock bajo en el dashboard</span>
          </label>
        </div>
        {cfgStock.alertas_activas && (
          <div className="form-group" style={{ marginTop:16, maxWidth:400 }}>
            <label>Email para Notificaciones (opcional)</label>
            <input type="email" placeholder="alertas@tuempresa.com"
              value={cfgStock.email_alertas}
              onChange={e => setCfgStock({ ...cfgStock, email_alertas: e.target.value })} />
            <small>Referencia para configurar notificaciones externas</small>
          </div>
        )}
      </div>
    </div>
  );

  const renderSistema = () => (
    <div className="tab-content">
      <div className="config-section">
        <h3><span className="material-icons">tune</span>Comportamiento del Sistema</h3>

        {[
          {
            key:   'permitir_stock_negativo',
            label: 'Permitir stock negativo',
            desc:  'Permite registrar salidas aunque no haya suficiente stock',
          },
          {
            key:   'requiere_autorizacion_movimientos',
            label: 'Requiere autorización para movimientos',
            desc:  'Los movimientos de salida deben ser aprobados por un administrador',
          },
          {
            key:   'backup_automatico',
            label: 'Recordatorio de backup automático',
            desc:  'Muestra aviso para exportar datos periódicamente',
          },
        ].map(({ key, label, desc }) => (
          <div className="form-group-checkbox" key={key}>
            <label>
              <input type="checkbox"
                checked={cfgSistema[key]}
                onChange={e => setCfgSistema({ ...cfgSistema, [key]: e.target.checked })} />
              <span>{label}</span>
            </label>
            <small className="help-text">{desc}</small>
          </div>
        ))}

        <div className="form-group" style={{ maxWidth:260, marginTop:8 }}>
          <label>Días de retención de logs</label>
          <input type="number" min="1" max="365"
            value={cfgSistema.dias_retencion_logs}
            onChange={e => setCfgSistema({ ...cfgSistema, dias_retencion_logs: +e.target.value || 30 })} />
          <small>Logs más antiguos se marcarán para purga</small>
        </div>
      </div>

      <div className="config-section">
        <h3><span className="material-icons">backup</span>Respaldo de Datos</h3>
        <p className="section-description">
          Exporta artículos, movimientos y proveedores en formato JSON.
          Guarda el archivo en un lugar seguro como copia de seguridad.
        </p>
        <button className="btn-exportar-datos" onClick={exportarDatos}>
          <span className="material-icons">download</span>
          Exportar backup completo
        </button>
      </div>
    </div>
  );

  const renderPerfil = () => (
    <div className="tab-content">
      <div className="config-section">
        <h3><span className="material-icons">person</span>Tu Cuenta</h3>
        <div className="perfil-info">
          <div className="perfil-avatar-large">
            {usuario.nombre.charAt(0).toUpperCase() || '?'}
          </div>
          <div>
            <h4>{usuario.nombre}</h4>
            <p>{usuario.email}</p>
            <span className={`rol-pill rol-${usuario.rol}`}>
              {rolLabel[usuario.rol] ?? usuario.rol}
            </span>
          </div>
        </div>
      </div>

      <div className="config-section">
        <h3><span className="material-icons">lock</span>Cambiar Contraseña</h3>

        {pwError && <div className="alert-error">{pwError}</div>}
        {pwOk    && <div className="alert-ok">{pwOk}</div>}

        <form onSubmit={cambiarPassword} style={{ maxWidth:420 }}>
          <div className="form-group">
            <label>Contraseña Actual</label>
            <input type="password" required placeholder="••••••••"
              value={usuario.password_actual}
              onChange={e => setUsuario({ ...usuario, password_actual: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Nueva Contraseña</label>
            <input type="password" required placeholder="Mínimo 6 caracteres" minLength={6}
              value={usuario.password_nueva}
              onChange={e => setUsuario({ ...usuario, password_nueva: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Confirmar Nueva Contraseña</label>
            <input type="password" required placeholder="Repite la contraseña"
              value={usuario.password_confirmacion}
              onChange={e => setUsuario({ ...usuario, password_confirmacion: e.target.value })} />
          </div>
          <button type="submit" className="btn-cambiar-password" disabled={savingPw}>
            <span className="material-icons">lock_reset</span>
            {savingPw ? 'Actualizando...' : 'Actualizar Contraseña'}
          </button>
        </form>
      </div>
    </div>
  );

  // ═══════════════════════════════════════════
  return (
    <AdminLayout title="Configuración">
      <div className="configuracion-content">
        <div className="config-container">

          {/* Tabs */}
          <div className="config-tabs">
            {[
              { key:'stock',   icon:'inventory',  label:'Stock'   },
              { key:'sistema', icon:'settings',   label:'Sistema' },
              { key:'perfil',  icon:'person',     label:'Perfil'  },
            ].map(t => (
              <button key={t.key}
                className={`tab-btn ${tabActiva === t.key ? 'active' : ''}`}
                onClick={() => setTabActiva(t.key)}>
                <span className="material-icons">{t.icon}</span>
                <span>{t.label}</span>
              </button>
            ))}
          </div>

          {/* Contenido */}
          <div className="config-content-area">
            {tabActiva === 'stock'   && renderStock()}
            {tabActiva === 'sistema' && renderSistema()}
            {tabActiva === 'perfil'  && renderPerfil()}

            {/* Botón guardar — solo en tabs no-perfil */}
            {tabActiva !== 'perfil' && (
              <div className="config-actions">
                {guardadoOk && (
                  <span className="saved-msg">
                    <span className="material-icons">check_circle</span>
                    Configuración guardada
                  </span>
                )}
                <button className="btn-guardar-config"
                  onClick={guardarConfig} disabled={guardando}>
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