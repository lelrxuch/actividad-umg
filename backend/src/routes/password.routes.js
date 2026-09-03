// [EN PROGRESO]
// Rutas de recuperación de contraseña
import { Router } from 'express';
import { forgotPassword, resetPassword } from '../controllers/password.controller.js';

const router = Router();

router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

export default router;