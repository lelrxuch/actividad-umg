import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { registrar } from '../api/auth.api';

const DOMINIO = import.meta.env.VITE_EMAIL_DOMAIN || 'miumg.edu.gt';

export default function RegistroPage() {
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const navigate = useNavigate();

  function validar() {
    if (!correo.trim().toLowerCase().endsWith('@' + DOMINIO)) {
      return `Solo se aceptan correos institucionales @${DOMINIO}.`;
    }
    if (!/^(?=.*[A-Z])(?=.*\d).{8,}$/.test(contrasena)) {
      return 'La contraseña debe tener mínimo 8 caracteres, una mayúscula y un número.';
    }
    return '';
  }

  async function manejarEnvio(e) {
    e.preventDefault();
    const mensaje = validar();
    if (mensaje) {
      setError(mensaje);
      return;
    }
    setError('');
    setCargando(true);
    try {
      const datos = await registrar(correo, contrasena);
      localStorage.setItem('token', datos.token);
      navigate('/', { replace: true }); // redirige a la página principal
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  return (
    <main className="contenedor">
      <form className="tarjeta" onSubmit={manejarEnvio}>
        <h1>Crear cuenta</h1>
        <p className="subtitulo">Regístrate con tu correo institucional @{DOMINIO}</p>
        <label>
          Correo institucional
          <input
            type="email"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            placeholder={`carnet@${DOMINIO}`}
            required
          />
        </label>
        <label>
          Contraseña
          <input
            type="password"
            value={contrasena}
            onChange={(e) => setContrasena(e.target.value)}
            placeholder="Mínimo 8 caracteres, 1 mayúscula y 1 número"
            required
          />
        </label>
        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={cargando}>
          {cargando ? 'Registrando…' : 'Registrarme'}
        </button>
        <p className="enlace">
          ¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link>
        </p>
      </form>
    </main>
  );
}
