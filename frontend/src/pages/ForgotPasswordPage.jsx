// src/pages/ForgotPasswordPage.jsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { requestPasswordReset } from '../services/authService';
import { theme } from '../styles/theme';

export const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleResetRequest = async (e) => {
    e.preventDefault();
    setMessage('');
    setErrorMessage('');

    // Validar correo institucional
    const dominiosValidos = ['@miumg.edu.gt', '@mineduc.gob.gt', '@usac.edu.gt'];
    const esDominioValido = dominiosValidos.some(dominio => email.toLowerCase().endsWith(dominio));

    if (!esDominioValido) {
      setErrorMessage('Error: Ingrese su correo institucional registrado (.edu.gt / .gob.gt).');
      return;
    }

    setIsLoading(true);

    try {
      await requestPasswordReset(email);
      setMessage('Se han enviado las instrucciones de recuperación a su correo electrónico.');
    } catch (error) {
      setErrorMessage(error.message || 'No se pudo procesar la solicitud. Verifique el correo ingresado.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>Recuperar Contraseña</h2>
        <p style={styles.description}>
          Ingrese su correo institucional registrado y le enviaremos un enlace para restablecer su contraseña.
        </p>

        {errorMessage && <div style={styles.errorAlert}>{errorMessage}</div>}
        {message && <div style={styles.successAlert}>{message}</div>}

        <form onSubmit={handleResetRequest}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Correo Institucional:</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="usuario@miumg.edu.gt"
              required
              style={styles.input}
            />
          </div>

          <button type="submit" disabled={isLoading} style={styles.button}>
            {isLoading ? 'Enviando...' : 'Enviar Instrucciones'}
          </button>
        </form>

        <p style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.9rem' }}>
          <Link to="/login" style={styles.link}>Volver al Inicio de Sesión</Link>
        </p>
      </div>
    </div>
  );
};

const styles = {
  container: { display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: theme.colors.background, padding: '1rem' },
  card: { backgroundColor: theme.colors.cardBg, padding: '2.5rem', borderRadius: theme.borderRadius.lg, boxShadow: theme.shadows.card, width: '100%', maxWidth: '420px', borderTop: `6px solid ${theme.colors.primary}` },
  title: { fontSize: '1.25rem', color: theme.colors.secondary, marginBottom: '0.5rem', textAlign: 'center', fontWeight: '700' },
  description: { fontSize: '0.875rem', color: theme.colors.textSecondary, marginBottom: '1.5rem', textAlign: 'center', lineHeight: '1.4' },
  formGroup: { marginBottom: '1.2rem' },
  label: { display: 'block', fontSize: '0.875rem', fontWeight: '600', color: theme.colors.textPrimary, marginBottom: '0.4rem' },
  input: { width: '100%', padding: '0.75rem', borderRadius: theme.borderRadius.md, border: `1px solid ${theme.colors.border}`, fontSize: '0.95rem', boxSizing: 'border-box' },
  button: { width: '100%', padding: '0.85rem', backgroundColor: theme.colors.primary, color: '#ffffff', border: 'none', borderRadius: theme.borderRadius.md, fontSize: '1rem', fontWeight: '600', cursor: 'pointer' },
  errorAlert: { padding: '0.75rem', backgroundColor: theme.colors.errorBg, color: theme.colors.error, borderRadius: theme.borderRadius.md, fontSize: '0.875rem', marginBottom: '1rem', border: `1px solid ${theme.colors.errorBorder}` },
  successAlert: { padding: '0.75rem', backgroundColor: theme.colors.successBg, color: theme.colors.success, borderRadius: theme.borderRadius.md, fontSize: '0.875rem', marginBottom: '1rem', border: `1px solid ${theme.colors.successBorder}` },
  link: { color: theme.colors.primary, fontWeight: '700', textDecoration: 'none' }
};