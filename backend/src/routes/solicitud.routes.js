// Rutas del módulo Solicitudes (SCRUM-41). Se montan bajo /api/solicitudes.
import { Router } from 'express';
import { listarTipos, listarDocumentos } from '../controllers/solicitud.controller.js';

const router = Router();

// Sin `autenticado` a propósito: ver los requisitos de una beca es lo primero
// que hace un estudiante, antes de tener cuenta. Ver solicitud.controller.js.
router.get('/tipos', listarTipos);
router.get('/tipos/:tipo/documentos', listarDocumentos);

export default router;
