// Rutas del módulo Convocatorias (SCRUM-32, SCRUM-33).
// Se montan bajo /api/convocatorias.
import { Router } from 'express';
import {
  listar,
  obtener,
  crear,
  editar,
  publicar,
  cerrar,
} from '../controllers/convocatoria.controller.js';
import { autenticado } from '../middlewares/auth.middleware.js';

const router = Router();

// Públicas: un estudiante tiene que poder ver qué convocatorias están abiertas
// antes de tener cuenta, igual que el catálogo de modalidades de SCRUM-41. Sin
// sesión de administrador el service devuelve solo las publicadas.
router.get('/', listar);
router.get('/:id', obtener);

// De administrador. `autenticado` solo confirma que hay sesión; que sea
// administrador lo exige convocatoria.service.
router.post('/', autenticado, crear);
router.patch('/:id', autenticado, editar);
router.post('/:id/publicar', autenticado, publicar);
router.post('/:id/cerrar', autenticado, cerrar);

export default router;
