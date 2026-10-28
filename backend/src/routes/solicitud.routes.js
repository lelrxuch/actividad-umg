// Rutas del módulo Solicitudes (SCRUM-41 y SCRUM-35). Se montan bajo /api/solicitudes.
import { Router } from 'express';
import {
  listarTipos,
  listarDocumentos,
  crear,
  listarMisSolicitudes,
  listarAsignadas,
  obtenerPorId,
  enviar,
  evaluar,
  dictaminar,
} from '../controllers/solicitud.controller.js';
import { autenticado } from '../middlewares/auth.middleware.js';

const router = Router();

// Rutas Públicas (SCRUM-41)
router.get('/tipos', listarTipos);
router.get('/tipos/:tipo/documentos', listarDocumentos);

// Rutas Autenticadas (SCRUM-35: Ciclo de vida de Solicitudes)
router.post('/', autenticado, crear);
router.get('/', autenticado, listarMisSolicitudes);
// Tiene que ir ANTES de '/:id': si no, Express toma "asignadas" como un id.
router.get('/asignadas', autenticado, listarAsignadas);
router.get('/:id', autenticado, obtenerPorId);
router.post('/:id/enviar', autenticado, enviar);
router.post('/:id/evaluar', autenticado, evaluar);
router.post('/:id/dictamen', autenticado, dictaminar);

export default router;
