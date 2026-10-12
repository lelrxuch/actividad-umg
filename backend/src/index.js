import express from 'express';
import dotenv from 'dotenv';
import { pool } from './config/db.js';
import authRoutes from './routes/auth.routes.js';
import passwordRoutes from './routes/password.routes.js';
import usuariosRoutes from './routes/usuarios.js';  // ← NUEVA
import expedienteRoutes from './routes/expediente.routes.js';
import documentoRoutes from './routes/documento.routes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

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
app.use('/api/usuarios', usuariosRoutes);  // ← NUEVA
app.use('/api/expedientes', expedienteRoutes);
app.use('/api/documentos', documentoRoutes);

app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});