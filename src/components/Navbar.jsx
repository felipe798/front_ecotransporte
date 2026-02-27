import { Link, useNavigate } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

const Navbar = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);
  const adminMenuRef = useRef(null);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Cerrar menú al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (adminMenuRef.current && !adminMenuRef.current.contains(event.target)) {
        setAdminMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isAuthenticated) return null;

  // Determinar la clase del navbar según el rol (comparar como número)
  // Admin (role 1) = navbar verde, User (role 2) = navbar rojo
  const isAdmin = Number(user?.role) === 1;
  const navbarClass = isAdmin ? 'navbar navbar-admin' : 'navbar navbar-user';

  return (
    <nav className={navbarClass}>
      <div className="navbar-left">
        <div className="navbar-brand">
          <Link to="/dashboard">Guías de Remisión</Link>
        </div>
        <div className="navbar-menu">
          <Link to="/dashboard" className="navbar-item">Dashboard</Link>
          <Link to="/viajes-cliente" className="navbar-item">Viajes</Link>
          {/* Todos pueden ver documentos */}
          <Link to="/documents" className="navbar-item">Documentos</Link>
          {/* Solo Administrador (rol 1) puede subir documentos */}
          {isAdmin && (
            <Link to="/upload" className="navbar-item">Subir PDF</Link>
          )}
          {/* Menú de Tarifas e Info - Solo para Admin */}
          {isAdmin && (
            <div className="navbar-dropdown" ref={adminMenuRef}>
              <button 
                className="navbar-item dropdown-toggle"
                onClick={() => setAdminMenuOpen(!adminMenuOpen)}
              >
                Tarifas e Info ▾
              </button>
              {adminMenuOpen && (
                <div className="dropdown-menu">
                  <Link 
                    to="/admin/tarifas" 
                    className="dropdown-item"
                    onClick={() => setAdminMenuOpen(false)}
                  >
                    Tarifas de Clientes
                  </Link>
                  <Link 
                    to="/admin/empresas" 
                    className="dropdown-item"
                    onClick={() => setAdminMenuOpen(false)}
                  >
                    Empresas de Transporte
                  </Link>
                  <Link 
                    to="/admin/unidades" 
                    className="dropdown-item"
                    onClick={() => setAdminMenuOpen(false)}
                  >
                    Unidades (Placas)
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="navbar-end">
        <span className="navbar-user-info">
          {user?.email} ({isAdmin ? 'Admin' : 'Usuario'})
        </span>
        <button onClick={handleLogout} className="btn-logout">
          Cerrar Sesión
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
