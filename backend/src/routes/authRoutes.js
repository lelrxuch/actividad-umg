import { Router } from 'express';
import {
  registrarUsuario,
  loginUsuario,
  perfil,
} from '../controllers/authController.js';
import { autenticar } from '../middlewares/authMiddleware.js';

const router = Router();

router.post('/registro', registrarUsuario);
router.post('/login', loginUsuario);
router.get('/perfil', autenticar, perfil);

export default router;
