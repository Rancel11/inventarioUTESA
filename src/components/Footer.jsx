import React from 'react';
import './Footer.css';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-content">
          <div className="footer-section">
            <div className="footer-logo">
              <span className="material-icons">inventory_2</span>
              <h3>SIGI-MJRD-UTESA</h3>
            </div>
            <p>Sistema de Gestión de Inventario del Ministerio de Juventud y UTESA.</p>
            <div className="social-links">
              <a href="#" aria-label="Facebook">
                <span className="material-icons">facebook</span>
              </a>
              <a href="#" aria-label="Twitter">
                <span className="material-icons">alternate_email</span>
              </a>
              <a href="#" aria-label="LinkedIn">
                <span className="material-icons">business</span>
              </a>
              <a href="#" aria-label="Instagram">
                <span className="material-icons">photo_camera</span>
              </a>
            </div>
          </div>
          
          <div className="footer-section">
            <h4>Enlaces Rápidos</h4>
            <ul>
              <li>
                <a href="/">
                  <span className="material-icons">home</span>
                  Inicio
                </a>
              </li>
              <li>
                <a href="/login">
                  <span className="material-icons">login</span>
                  Iniciar Sesión
                </a>
              </li>
              <li>
                <a href="/register">
                  <span className="material-icons">person_add</span>
                  Registrarse
                </a>
              </li>
            </ul>
          </div>
          
          <div className="footer-section">
            <h4>Contacto</h4>
            <ul className="contact-info">
              <li>
                <span className="material-icons">email</span>
                <span>info@mjrd-utesa.edu.do</span>
              </li>
              <li>
                <span className="material-icons">phone</span>
                <span>+1 (809) 555-0100</span>
              </li>
              <li>
                <span className="material-icons">location_on</span>
                <span>Santo Domingo, RD</span>
              </li>
            </ul>
          </div>
          
          <div className="footer-section">
            <h4>Horario de Atención</h4>
            <ul className="schedule">
              <li>
                <span className="material-icons">schedule</span>
                <div>
                  <strong>Lunes - Viernes</strong>
                  <span>8:00 AM - 6:00 PM</span>
                </div>
              </li>
              <li>
                <span className="material-icons">weekend</span>
                <div>
                  <strong>Fines de Semana</strong>
                  <span>Cerrado</span>
                </div>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="footer-bottom">
          <p>
            <span className="material-icons">copyright</span>
            2026 SIGI-MJRD-UTESA. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;