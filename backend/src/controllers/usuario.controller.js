import * as usuarioService from '../services/usuario.service.js';

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