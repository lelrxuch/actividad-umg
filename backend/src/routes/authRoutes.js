const { Router } = require('express');
const authController = require('../controllers/auth.controller');
const autenticar = require('../middlewares/auth.middleware');

const router = Router();

router.post('/registro', authController.registrar);
router.post('/login', authController.login);
router.get('/perfil', autenticar, authController.perfil);

module.exports = router;
