import express from 'express';
import { actualizarPerfil } from '../controllers/usuario.controller.js';
import { autenticado } from '../middlewares/auth.middleware.js';

const router = express.Router();

// PUT /api/usuarios/:id/perfil
router.put('/:id/perfil', autenticado, actualizarPerfil);

export default router;