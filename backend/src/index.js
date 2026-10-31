import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { pool } from './config/db.js';
import authRoutes from './routes/auth.routes.js';
import passwordRoutes from './routes/password.routes.js';
import usuarioRoutes from './routes/usuario.routes.js'; // ← MODIFICADA
import convocatoriaRoutes from './routes/convocatoria.routes.js';
import solicitudRoutes from './routes/solicitud.routes.js';
import expedienteRoutes from './routes/expediente.routes.js';
import documentoRoutes from './routes/documento.routes.js';
import notificacionRoutes from './routes/notificacion.routes.js';
import auditoriaRoutes from './routes/auditoria.routes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Sin esto el navegador bloquea toda llamada del frontend (otro puerto = otro
// origen). El origen sale del .env para no dejar una URL escrita en el código.
app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173' }));
app.use(express.json());

app.get('/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ status: 'ok', db: 'connected', timestamp: result.rows[0].now });
  } catch (err) {
    res.status(500).json({ status: 'error', db: 'disconnected', message: err.message });
  }
});

// Ambos routers cuelgan de /api/auth y no chocan: authRoutes expone
// /register, /login y /perfil; passwordRoutes expone /forgot-password y
// /reset-password.
app.use('/api/auth', authRoutes);
app.use('/api/auth', passwordRoutes);
app.use('/api/usuarios', usuarioRoutes); // ← MODIFICADA
app.use('/api/convocatorias', convocatoriaRoutes);
app.use('/api/solicitudes', solicitudRoutes);
app.use('/api/expedientes', expedienteRoutes);
app.use('/api/documentos', documentoRoutes);
app.use('/api/notificaciones', notificacionRoutes);
app.use('/api/auditoria', auditoriaRoutes);

app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});