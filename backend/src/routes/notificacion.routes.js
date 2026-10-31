import express from 'express';
import { listarMias, marcarLeida } from '../controllers/notificacion.controller.js';
import { autenticado } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Las dos rutas son del usuario en sesión: el dueño sale del token.
router.get('/', autenticado, listarMias);
router.patch('/:id/leida', autenticado, marcarLeida);

export default router;
