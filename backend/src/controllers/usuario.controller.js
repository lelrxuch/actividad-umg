import * as usuarioService from '../services/usuario.service.js';

/**
 * GET /api/usuarios/evaluadores
 * Solo administrador: la lista para asignar evaluadores a solicitudes.
 *
 * El JWT guarda el identificador en `sub`; la autorización espera `id`, igual
 * que en solicitud.controller. Un error sin `status` es inesperado y su mensaje
 * no sale al cliente.
 */
export async function listarEvaluadores(req, res) {
  try {
    const token = req.usuario || {};
    res.json(await usuarioService.listarEvaluadores({ id: token.sub ?? token.id, rol: token.rol }));
  } catch (error) {
    if (!error.status) {
      return res.status(500).json({ error: 'Error interno del servidor.' });
    }
    res.status(error.status).json({ error: error.message });
  }
}

export async function actualizarPerfil(req, res) {
  try {
    const { id } = req.params;
    const { nombre, telefono, correoAlterno } = req.body;

    // Validaciones
    if (nombre && nombre.trim().length < 2) {
      return res.status(400).json({ error: 'Nombre muy corto' });
    }

    if (telefono && !/^\d{8}$/.test(telefono)) {
      return res.status(400).json({ error: 'Teléfono debe tener 8 dígitos' });
    }

    if (correoAlterno && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correoAlterno)) {
      return res.status(400).json({ error: 'Correo inválido' });
    }

    // Llamar al servicio
    const usuarioActualizado = await usuarioService.actualizarPerfil(id, {
      nombre,
      telefono,
      correoAlterno
    });

    if (!usuarioActualizado) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json({
      mensaje: 'Perfil actualizado exitosamente',
      usuario: usuarioActualizado
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}