// Rutas del módulo Expedientes (SCRUM-43). Se montan bajo /api/expedientes.
import { Router } from 'express';
import { armarExpediente, revisarExpediente } from '../controllers/expediente.controller.js';
import { autenticado } from '../middlewares/auth.middleware.js';

const router = Router();

// Ambas exigen sesión: el expediente contiene datos del solicitante.
router.post('/revision', autenticado, revisarExpediente);
router.post('/', autenticado, armarExpediente);

export default router;
