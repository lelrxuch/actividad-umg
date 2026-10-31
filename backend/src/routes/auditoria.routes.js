import express from 'express';
import { consultar } from '../controllers/auditoria.controller.js';
import { autenticado } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Quién puede consultar (solo administrador) lo decide el service.
router.get('/', autenticado, consultar);

export default router;
