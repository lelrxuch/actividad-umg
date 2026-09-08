// src/pages/LoginPage.jsx
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { loginUser } from '../services/authService';
import { theme } from '../styles/theme';

export const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    const dominiosValidos = ['@miumg.edu.gt', '@mineduc.gob.gt', '@usac.edu.gt'];
    const esDominioValido = dominiosValidos.some(dominio => email.toLowerCase().endsWith(dominio));

    if (!esDominioValido) {
      setErrorMessage('Error: Debe ingresar un correo institucional (.edu.gt / .gob.gt).');
      return;
    }

    setIsLoading(true);

    try {
      const data = await loginUser({ email, password });
      if (data.token) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.usuario));
      }
      navigate('/dashboard');
    } catch (error) {
      setErrorMessage(error.message || 'Credenciales inválidas. Verifique su correo y contraseña.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={styles.pageWrapper}>
      {/* Navbar Institucional Superior */}
      <header style={styles.navbar}>
        <div style={styles.navContainer}>
          <div style={styles.brandGroup}>
            <div style={styles.logoBadge}>MINEDUC</div>
            <div>
              <span style={styles.navTitle}>Gobierno de Guatemala</span>
              <span style={styles.navSubtitle}>Ministerio de Educación</span>
            </div>
          </div>
          <span style={styles.systemBadge}>Sistema Integral de Becas v1.0</span>
        </div>
      </header>

      {/* Contenido Principal con Layout Dividido */}
      <main style={styles.mainContent}>
        <div style={styles.splitCard}>
          
          {/* Panel Izquierdo: Información del Programa */}
          <div style={styles.infoPanel}>
            <div style={styles.infoContent}>
              <h1 style={styles.heroTitle}>Plataforma Nacional para la Gestión de Becas</h1>
              <p style={styles.heroText}>
                Accede al portal oficial para la recepción, evaluación y seguimiento de expedientes de becas académicas a nivel nacional.
              </p>
              <div style={styles.bulletList}>
                <div style={styles.bulletItem}>✓ Proceso 100% digital y transparente</div>
                <div style={styles.bulletItem}>✓ Validación automática con RENAP y Universidades</div>
                <div style={styles.bulletItem}>✓ Notificaciones en tiempo real sobre tu solicitud</div>
              </div>
            </div>
          </div>

          {/* Panel Derecho: Formulario de Iniciar Sesión */}
          <div style={styles.formPanel}>
            <h2 style={styles.formTitle}>Iniciar Sesión</h2>
            <p style={styles.formSubtitle}>Ingresa tus credenciales institucionales</p>

            {errorMessage && <div style={styles.errorAlert}>{errorMessage}</div>}

            <form onSubmit={handleLogin}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Correo Institucional</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="usuario@miumg.edu.gt"
                  required
                  style={styles.input}
                />
              </div>

              <div style={styles.formGroup}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={styles.label}>Contraseña</label>
                  <Link to="/forgot-password" style={styles.linkSmall}>¿Olvidaste tu contraseña?</Link>
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  style={styles.input}
                />
              </div>

              <button type="submit" disabled={isLoading} style={styles.button}>
                {isLoading ? 'Ingresando...' : 'Acceder al Sistema'}
              </button>
            </form>

            <div style={styles.footerLinks}>
              ¿Aún no tienes cuenta registrada?{' '}
              <Link to="/registro" style={styles.linkBold}>Crear una cuenta aquí</Link>
            </div>
          </div>

        </div>
      </main>

      {/* Pie de Página Institucional */}
      <footer style={styles.footer}>
        © 2026 Ministerio de Educación de Guatemala - Todos los derechos reservados.
      </footer>
    </div>
  );
};

const styles = {
  pageWrapper: { display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: theme.colors.background },
  navbar: { backgroundColor: theme.colors.secondary, color: '#ffffff', padding: '0.8rem 1.5rem', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' },
  navContainer: { maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  brandGroup: { display: 'flex', alignItems: 'center', gap: '0.8rem' },
  logoBadge: { backgroundColor: theme.colors.primary, color: '#fff', padding: '0.3rem 0.6rem', borderRadius: theme.borderRadius.sm, fontWeight: 'bold', fontSize: '0.85rem' },
  navTitle: { display: 'block', fontSize: '0.9rem', fontWeight: 'bold' },
  navSubtitle: { display: 'block', fontSize: '0.75rem', opacity: 0.8 },
  systemBadge: { fontSize: '0.8rem', backgroundColor: 'rgba(255,255,255,0.1)', padding: '0.2rem 0.6rem', borderRadius: '12px' },
  mainContent: { flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '2rem 1rem' },
  splitCard: { display: 'flex', maxWidth: '900px', width: '100%', backgroundColor: theme.colors.cardBg, borderRadius: theme.borderRadius.lg, boxShadow: theme.shadows.card, overflow: 'hidden', borderTop: `6px solid ${theme.colors.primary}` },
  infoPanel: { flex: 1, backgroundColor: '#003663', color: '#ffffff', padding: '2.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' },
  heroTitle: { fontSize: '1.4rem', fontWeight: 'bold', marginBottom: '1rem', lineHeight: '1.3' },
  heroText: { fontSize: '0.9rem', opacity: 0.9, lineHeight: '1.5', marginBottom: '1.5rem' },
  bulletList: { display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.85rem' },
  bulletItem: { backgroundColor: 'rgba(255,255,255,0.08)', padding: '0.5rem 0.8rem', borderRadius: theme.borderRadius.sm },
  formPanel: { flex: 1, padding: '2.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' },
  formTitle: { fontSize: '1.4rem', color: theme.colors.secondary, fontWeight: 'bold', margin: 0 },
  formSubtitle: { fontSize: '0.85rem', color: theme.colors.textSecondary, marginBottom: '1.5rem' },
  formGroup: { marginBottom: '1.2rem' },
  label: { display: 'block', fontSize: '0.85rem', fontWeight: '600', color: theme.colors.textPrimary, marginBottom: '0.3rem' },
  input: { width: '100%', padding: '0.75rem', borderRadius: theme.borderRadius.md, border: `1px solid ${theme.colors.border}`, fontSize: '0.95rem', boxSizing: 'border-box' },
  button: { width: '100%', padding: '0.85rem', backgroundColor: theme.colors.primary, color: '#ffffff', border: 'none', borderRadius: theme.borderRadius.md, fontSize: '0.95rem', fontWeight: '600', cursor: 'pointer', marginTop: '0.5rem' },
  errorAlert: { padding: '0.75rem', backgroundColor: theme.colors.errorBg, color: theme.colors.error, borderRadius: theme.borderRadius.md, fontSize: '0.85rem', marginBottom: '1rem', border: `1px solid ${theme.colors.errorBorder}` },
  linkSmall: { fontSize: '0.78rem', color: theme.colors.accent, textDecoration: 'none' },
  linkBold: { color: theme.colors.primary, fontWeight: '700', textDecoration: 'none' },
  footerLinks: { marginTop: '1.5rem', textAlign: 'center', fontSize: '0.85rem', color: theme.colors.textSecondary },
  footer: { backgroundColor: theme.colors.secondary, color: '#ffffff', textAlign: 'center', padding: '0.8rem', fontSize: '0.75rem', opacity: 0.9 }
};