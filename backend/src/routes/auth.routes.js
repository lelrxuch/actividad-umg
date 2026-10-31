// Rutas de autenticación. Se montan bajo /api/auth desde index.js.
//
// Los nombres register y login salen de la colección Postman de SCRUM-27, que
// ya está mergeada y los documenta como los endpoints pendientes, y del
// frontend, que ya apunta ahí.
import { Router } from 'express';
import { registrarUsuario, loginUsuario, perfil } from '../controllers/auth.controller.js';
import { autenticado } from '../middlewares/auth.middleware.js';

const router = Router();

router.post('/register', registrarUsuario);
router.post('/login', loginUsuario);
router.get('/perfil', autenticado, perfil);

export default router;
