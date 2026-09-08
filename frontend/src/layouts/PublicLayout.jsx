// src/layouts/PublicLayout.jsx
import { Outlet, Link } from 'react-router-dom';
import { theme } from '../styles/theme';

export const PublicLayout = () => {
  return (
    <div style={styles.pageWrapper}>
      {/* Encabezado */}
      <header style={styles.navbar}>
        <div style={styles.navContainer}>
          <Link to="/" style={styles.brandGroup}>
            <div style={styles.logoBadge}>MINEDUC</div>
            <div>
              <span style={styles.navTitle}>Gobierno de Guatemala</span>
              <span style={styles.navSubtitle}>Ministerio de Educación</span>
            </div>
          </Link>
          
          <nav style={styles.navLinks}>
            <Link to="/" style={styles.navItem}>Inicio</Link>
            <Link to="/noticias" style={styles.navItem}>Noticias</Link>
            <Link to="/contacto" style={styles.navItem}>Contacto</Link>
            <Link to="/login" style={styles.loginBtn}>Iniciar Sesión</Link>
          </nav>
        </div>
      </header>

      {/* Contenido Central Ajustado */}
      <main style={styles.mainContent}>
        <Outlet />
      </main>

      {/* Pie de Página Compacto */}
      <footer style={styles.footer}>
        <div style={styles.footerContent}>
          <p style={styles.footerText}>© 2026 Ministerio de Educación de Guatemala - Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
};

const styles = {
  // Define exactamente la altura completa de la pantalla y oculta scrolls innecesarios
  pageWrapper: { 
    display: 'flex', 
    flexDirection: 'column', 
    height: '100vh', 
    backgroundColor: theme.colors.background,
    overflow: 'hidden'
  },
  navbar: { 
    backgroundColor: theme.colors.secondary, 
    color: '#ffffff', 
    padding: '0.6rem 1.5rem', 
    boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
    flexShrink: 0
  },
  navContainer: { maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  brandGroup: { display: 'flex', alignItems: 'center', gap: '0.8rem', textDecoration: 'none', color: '#fff' },
  logoBadge: { backgroundColor: theme.colors.primary, color: '#fff', padding: '0.3rem 0.6rem', borderRadius: theme.borderRadius.sm, fontWeight: 'bold', fontSize: '0.85rem' },
  navTitle: { display: 'block', fontSize: '0.88rem', fontWeight: 'bold' },
  navSubtitle: { display: 'block', fontSize: '0.72rem', opacity: 0.8 },
  navLinks: { display: 'flex', gap: '1.2rem', alignItems: 'center' },
  navItem: { color: '#ffffff', textDecoration: 'none', fontSize: '0.85rem', opacity: 0.9 },
  loginBtn: { backgroundColor: theme.colors.primary, color: '#ffffff', padding: '0.35rem 0.9rem', borderRadius: theme.borderRadius.md, textDecoration: 'none', fontSize: '0.82rem', fontWeight: '600' },
  
  // Ocupa el espacio sobrante ajustado al centro
  mainContent: { 
    flex: 1, 
    display: 'flex', 
    flexDirection: 'column', 
    justifyContent: 'center', 
    alignItems: 'center',
    padding: '1rem',
    overflowY: 'auto'
  },
  
  footer: { 
    backgroundColor: theme.colors.secondary, 
    color: '#ffffff', 
    textAlign: 'center', 
    padding: '0.6rem 1rem', 
    borderTop: `3px solid ${theme.colors.primary}`,
    flexShrink: 0
  },
  footerContent: { maxWidth: '1200px', margin: '0 auto' },
  footerText: { margin: 0, fontSize: '0.78rem', opacity: 0.9 }
};