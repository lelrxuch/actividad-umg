// Rutas del módulo Documentos (SCRUM-44 descarga, SCRUM-42 subida).
// Se montan bajo /api/documentos.
import { Router } from 'express';
import multer from 'multer';
import {
  descargarDocumento,
  consultarPermiso,
  subirDocumento,
  listarDocumentos,
} from '../controllers/documento.controller.js';
import { autenticado } from '../middlewares/auth.middleware.js';

const router = Router();

// POR QUÉ memoryStorage Y NO diskStorage:
// multer con diskStorage escribe el archivo ANTES de que el service revise
// nada, así que un rechazo (solicitud ajena, tipo que no corresponde, ya
// enviada) dejaría basura en disco. En memoria, el service decide primero y
// config/almacenamiento escribe después, con un nombre que genera él.
//
// El límite de tamaño va acá y no en el service: multer corta la petición
// mientras llega, sin cargar 500 MB en memoria para después rechazarlos.
const subida = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
});

/**
 * Traduce los errores de multer a códigos HTTP del proyecto. Sin esto, un
 * archivo demasiado grande sale como 500 y el estudiante no sabe qué pasó.
 */
function erroresDeSubida(error, req, res, next) {
  if (error && error.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'El archivo supera el límite de 5 MB.' });
  }
  if (error && error.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({ error: 'El archivo debe venir en el campo "archivo".' });
  }
  return next(error);
}

// Subida y listado del expediente de una solicitud.
router.post('/', autenticado, subida.single('archivo'), erroresDeSubida, subirDocumento);
router.get('/solicitud/:solicitudId', autenticado, listarDocumentos);

// `autenticado` solo confirma que hay sesión. Quién puede ver ESTE documento
// lo decide DocumentoProxy dentro del service, no el middleware.
router.get('/:id/descargar', autenticado, descargarDocumento);
router.get('/:id/permiso', autenticado, consultarPermiso);

export default router;
