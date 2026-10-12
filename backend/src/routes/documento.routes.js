// Rutas del módulo Documentos (SCRUM-44). Se montan bajo /api/documentos.
import { Router } from 'express';
import { descargarDocumento, consultarPermiso } from '../controllers/documento.controller.js';
import { autenticado } from '../middlewares/auth.middleware.js';

const router = Router();

// `autenticado` solo confirma que hay sesión. Quién puede ver ESTE documento
// lo decide DocumentoProxy dentro del service, no el middleware.
router.get('/:id/descargar', autenticado, descargarDocumento);
router.get('/:id/permiso', autenticado, consultarPermiso);

export default router;
