import express from 'express';
import { actualizarPerfil, listarEvaluadores } from '../controllers/usuario.controller.js';
import { autenticado } from '../middlewares/auth.middleware.js';

const router = express.Router();

// GET /api/usuarios/evaluadores — solo administrador; lo decide el service.
// Va ANTES de cualquier ruta con '/:id', para que "evaluadores" no se tome
// como un id.
router.get('/evaluadores', autenticado, listarEvaluadores);

// PUT /api/usuarios/:id/perfil
router.put('/:id/perfil', autenticado, actualizarPerfil);

export default router;