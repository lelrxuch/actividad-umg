import jwt from 'jsonwebtoken';

export function autenticar(req, res, next) {
  const cabecera = req.headers.authorization || '';
  const [tipo, token] = cabecera.split(' ');

  if (tipo !== 'Bearer' || !token) {
    return res.status(401).json({ mensaje: 'Token no proporcionado.' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = { id: payload.sub, correo: payload.correo };
    next();
  } catch {
    res.status(401).json({ mensaje: 'Token inválido o expirado.' });
  }
}