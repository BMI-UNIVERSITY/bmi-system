// src/components/Navbar.tsx
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useState, useEffect, useRef } from 'react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <img src="/bmi-logo.png" alt="BMI University Logo" style={{ height: '36px' }} /> 
        <span style={{ fontSize: '1.1rem', color: 'var(--navy-light)' }}>Student Portal</span>
      </Link>
      <div className="navbar-links">
        {!user ? (
          <>
            <Link to="/login" className={`navbar-link${location.pathname === '/login' ? ' active' : ''}`}>Login</Link>
            <Link to="/claim" className={`navbar-link${location.pathname === '/claim' ? ' active' : ''}`}>Claim Account</Link>
            <Link to="/register" className="btn btn-gold btn-sm">Apply Now</Link>
          </>
        ) : (
          <>
            {(user.role === 'admin' || user.role === 'staff') ? (
              <Link to="/admin" className={`navbar-link${location.pathname.startsWith('/admin') ? ' active' : ''}`}>Admin</Link>
            ) : user.role === 'student' ? (
              <>
                <Link to="/student/dashboard" className={`navbar-link${location.pathname === '/student/dashboard' ? ' active' : ''}`}>Dashboard</Link>
                <Link to="/student/academics" className={`navbar-link${location.pathname === '/student/academics' ? ' active' : ''}`}>Academics</Link>
                <Link to="/student/finances" className={`navbar-link${location.pathname === '/student/finances' ? ' active' : ''}`}>Finances</Link>
                <Link to="/registration" className={`navbar-link${location.pathname === '/registration' ? ' active' : ''}`}>Registration</Link>
                <Link to="/documents" className={`navbar-link${location.pathname === '/documents' ? ' active' : ''}`}>Documents</Link>
                <Link to="/status" className={`navbar-link${location.pathname === '/status' ? ' active' : ''}`}>My Application</Link>
              </>
            ) : user.role === 'alumni' ? (
              <>
                <Link to="/alumni" className={`navbar-link${location.pathname === '/alumni' ? ' active' : ''}`}>Alumni</Link>
                <Link to="/documents" className={`navbar-link${location.pathname === '/documents' ? ' active' : ''}`}>Documents</Link>
              </>
            ) : (
              <Link to="/status" className={`navbar-link${location.pathname === '/status' ? ' active' : ''}`}>My Application</Link>
            )}
            
            <div className="dropdown" ref={dropdownRef} style={{ position: 'relative' }}>
              <button 
                className="navbar-link btn" 
                style={{ padding: '0.5rem 1rem', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--navy-light)', fontWeight: 500, fontSize: '0.9rem' }}
                onClick={() => setDropdownOpen(!dropdownOpen)}
                aria-haspopup="true"
                aria-expanded={dropdownOpen}
              >
                {user.first_name} ▼
              </button>
              {dropdownOpen && (
                <div 
                  className="dropdown-menu" 
                  role="menu"
                >
                  <Link 
                    to="/settings" 
                    className="dropdown-item" 
                    onClick={() => setDropdownOpen(false)}
                    role="menuitem"
                  >
                    Settings
                  </Link>
                  <button 
                    onClick={() => { handleLogout(); setDropdownOpen(false); }}
                    className="dropdown-item" 
                    role="menuitem"
                  >
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </nav>
  );
}
