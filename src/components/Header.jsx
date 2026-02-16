import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './Header.css';

const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  return (
    <header className="header">
      <div className="container">
        <nav className="navbar">
          <Link to="/" className="logo">
            <span className="material-icons logo-icon">inventory_2</span>
            <h1>Sistema de Inventario</h1>
          </Link>
          
          <button className="mobile-menu-btn" onClick={toggleMobileMenu}>
            <span className="material-icons">
              {mobileMenuOpen ? 'close' : 'menu'}
            </span>
          </button>

          <ul className={`nav-links ${mobileMenuOpen ? 'active' : ''}`}>
            <li>
              <Link to="/" onClick={() => setMobileMenuOpen(false)}>
                <span className="material-icons">home</span>
                Inicio
              </Link>
            </li>
            <li>
              <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                <span className="material-icons">login</span>
                Iniciar Sesión
              </Link>
            </li>
            <li>
              <Link to="/register" className="btn btn-primary" onClick={() => setMobileMenuOpen(false)}>
                <span className="material-icons">person_add</span>
                Registrarse
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
};

export default Header;