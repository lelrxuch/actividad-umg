// src/pages/RegisterPage.jsx
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { registerUser } from '../services/authService';
import { theme } from '../styles/theme';

export const RegisterPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState(''); // <-- Estado para confirmar
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    // 1. Validar dominio institucional (.edu.gt o .gob.gt)
    const dominiosValidos = ['@miumg.edu.gt', '@mineduc.gob.gt', '@usac.edu.gt'];
    const esDominioValido = dominiosValidos.some(dominio => email.toLowerCase().endsWith(dominio));

    if (!esDominioValido) {
      setErrorMessage('Error: Solo se permiten correos institucionales (.edu.gt / .gob.gt).');
      return;
    }

    // 2. Validar complejidad de contraseña: Mínimo 8 caracteres, 1 mayúscula y 1 número
    const passwordRegex = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(password)) {
      setErrorMessage('Error: La contraseña debe contener al menos 8 caracteres, una mayúscula y un número.');
      return;
    }

    // 3. Validar que ambas contraseñas coincidan
    if (password !== confirmPassword) {
      setErrorMessage('Error: Las contraseñas ingresadas no coinciden.');
      return;
    }

    setIsLoading(true);

    try {
      // 4. Petición al servicio/backend
      // await registerUser({ email, password });

      setSuccessMessage('¡Registro exitoso! Redirigiendo al inicio de sesión...');
      
      setTimeout(() => {
        navigate('/login');
      }, 1500);

    } catch (error) {
      setErrorMessage(error.message || 'El correo ya se encuentra registrado.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <h1 style={styles.title}>Plataforma Nacional de Becas</h1>
          <p style={styles.subtitle}>Ministerio de Educación - MINEDUC</p>
        </div>

        <h2>Registro de Usuario</h2>
        
        {errorMessage && <div style={styles.errorAlert}>{errorMessage}</div>}
        {successMessage && <div style={styles.successAlert}>{successMessage}</div>}

        <form onSubmit={handleRegister}>
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
            <small style={styles.hint}>Ejemplo: usuario@miumg.edu.gt o @mineduc.gob.gt</small>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Contraseña:</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={styles.input}
            />
            <small style={styles.hint}>Mínimo 8 caracteres, 1 mayúscula y 1 número.</small>
          </div>

          {/* Nuevo campo de Confirmar Contraseña */}
          <div style={styles.formGroup}>
            <label style={styles.label}>Confirmar Contraseña:</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={styles.input}
            />
          </div>

          <button type="submit" disabled={isLoading} style={styles.button}>
            {isLoading ? 'Registrando...' : 'Registrarse'}
          </button>
        </form>

        <p style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.9rem' }}>
          ¿Ya tienes cuenta? <Link to="/login" style={styles.linkBold}>Inicia sesión aquí</Link>
        </p>
      </div>
    </div>
  );
};

const styles = {
  container: { display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: theme.colors.background, padding: '1rem' },
  card: { backgroundColor: theme.colors.cardBg, padding: '2.5rem', borderRadius: theme.borderRadius.lg, boxShadow: theme.shadows.card, width: '100%', maxWidth: '420px', borderTop: `6px solid ${theme.colors.primary}` },
  header: { textAlign: 'center', marginBottom: '1.5rem', borderBottom: `1px solid ${theme.colors.border}`, paddingBottom: '1rem' },
  title: { fontSize: '1.2rem', color: theme.colors.primary, margin: 0, fontWeight: '700' },
  subtitle: { fontSize: '0.85rem', color: theme.colors.textSecondary, margin: '0.2rem 0 0 0' },
  formGroup: { marginBottom: '1.2rem' },
  label: { display: 'block', fontSize: '0.875rem', fontWeight: '600', color: theme.colors.textPrimary, marginBottom: '0.4rem' },
  input: { width: '100%', padding: '0.75rem', borderRadius: theme.borderRadius.md, border: `1px solid ${theme.colors.border}`, fontSize: '0.95rem', boxSizing: 'border-box' },
  button: { width: '100%', padding: '0.85rem', backgroundColor: theme.colors.primary, color: '#ffffff', border: 'none', borderRadius: theme.borderRadius.md, fontSize: '1rem', fontWeight: '600', cursor: 'pointer', marginTop: '0.5rem' },
  hint: { fontSize: '0.75rem', color: theme.colors.textSecondary, marginTop: '0.25rem', display: 'block' },
  errorAlert: { padding: '0.75rem', backgroundColor: theme.colors.errorBg, color: theme.colors.error, borderRadius: theme.borderRadius.md, fontSize: '0.875rem', marginBottom: '1rem', border: `1px solid ${theme.colors.errorBorder}` },
  successAlert: { padding: '0.75rem', backgroundColor: theme.colors.successBg, color: theme.colors.success, borderRadius: theme.borderRadius.md, fontSize: '0.875rem', marginBottom: '1rem', border: `1px solid ${theme.colors.successBorder}` },
  linkBold: { color: theme.colors.primary, fontWeight: '700', textDecoration: 'none' }
};