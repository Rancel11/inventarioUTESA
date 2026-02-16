import React from 'react';
import './Home.css';

const Home = () => {
  return (
    <div className="home">
      {/* Hero Section */}
      <section className="hero">
        <div className="container">
          <div className="hero-content">
            <div className="logo-partnership">
              <span className="institution">MJRD</span>
              <span className="separator">×</span>
              <span className="institution">UTESA</span>
            </div>
            <h1 className="hero-title">SIGI-MJRD-UTESA</h1>
            <p className="hero-subtitle">
              Sistema de Gestión de Inventario del Ministerio de Juventud y UTESA
            </p>
            <p className="hero-description">
              Plataforma integral para el control y administración de recursos, equipos y materiales institucionales
            </p>
            <div className="hero-buttons">
              <a href="/register" className="btn btn-primary">
                <span className="material-icons">person_add</span>
                Registrarse
              </a>
              <a href="/login" className="btn btn-secondary">
                <span className="material-icons">login</span>
                Iniciar Sesión
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features">
        <div className="container">
          <h2 className="section-title">Funcionalidades del Sistema</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">
                <span className="material-icons">inventory_2</span>
              </div>
              <h3>Gestión de Recursos</h3>
              <p>Control centralizado de equipos, materiales y recursos institucionales del MJRD y UTESA.</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">
                <span className="material-icons">warehouse</span>
              </div>
              <h3>Control de Inventario</h3>
              <p>Monitoreo en tiempo real de las existencias y ubicación de los recursos.</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">
                <span className="material-icons">swap_horiz</span>
              </div>
              <h3>Registro de Movimientos</h3>
              <p>Historial detallado de entradas, salidas y transferencias de materiales.</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">
                <span className="material-icons">admin_panel_settings</span>
              </div>
              <h3>Gestión de Usuarios</h3>
              <p>Control de acceso y permisos para personal autorizado de ambas instituciones.</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">
                <span className="material-icons">assessment</span>
              </div>
              <h3>Reportes Institucionales</h3>
              <p>Generación de informes y estadísticas para la toma de decisiones.</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">
                <span className="material-icons">verified_user</span>
              </div>
              <h3>Seguridad y Trazabilidad</h3>
              <p>Protección de datos y seguimiento completo de todas las operaciones.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="benefits">
        <div className="container">
          <h2 className="section-title">Ventajas del Sistema</h2>
          <div className="benefits-grid">
            <div className="benefit-item">
              <span className="material-icons">school</span>
              <div>
                <h4>Colaboración Institucional</h4>
                <p>Integración entre el Ministerio de Juventud y UTESA</p>
              </div>
            </div>
            
            <div className="benefit-item">
              <span className="material-icons">speed</span>
              <div>
                <h4>Eficiencia Operativa</h4>
                <p>Optimización de procesos administrativos y logísticos</p>
              </div>
            </div>
            
            <div className="benefit-item">
              <span className="material-icons">visibility</span>
              <div>
                <h4>Transparencia</h4>
                <p>Trazabilidad completa de recursos y materiales</p>
              </div>
            </div>
            
            <div className="benefit-item">
              <span className="material-icons">cloud_queue</span>
              <div>
                <h4>Acceso en la Nube</h4>
                <p>Disponible desde cualquier lugar con conexión a internet</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta">
        <div className="container">
          <div className="cta-content">
            <h2>¿Listo para optimizar la gestión de recursos?</h2>
            <p>Sistema desarrollado para el Ministerio de Juventud y UTESA</p>
            <a href="/register" className="btn btn-primary btn-large">
              <span className="material-icons">how_to_reg</span>
              Solicitar Acceso
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;