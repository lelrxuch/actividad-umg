import express from 'express';
import dotenv from 'dotenv';
import { pool } from './config/db.js';
import passwordRoutes from './routes/password.routes.js';
import usuariosRoutes from './routes/usuarios.js';  // ← NUEVA

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

app.use('/api/auth', passwordRoutes);
app.use('/api/usuarios', usuariosRoutes);  // ← NUEVA

app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});