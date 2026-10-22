// Reglas de negocio de Convocatorias (SCRUM-32, SCRUM-33).
//
// Se mockea solo la capa de datos: el service, el patrón State y el Factory se
// ejecutan de verdad.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as convocatoriaRepository from '../repositories/convocatoria.repository.js';
import * as convocatoriaService from '../services/convocatoria.service.js';

vi.mock('../repositories/convocatoria.repository.js', () => ({
  crear: vi.fn(),
  findById: vi.fn(),
  listar: vi.fn(),
  actualizarEstado: vi.fn(),
  actualizarDatos: vi.fn(),
  contarSolicitudes: vi.fn(),
}));

const ADMIN = { id: 1, rol: 'administrador' };
const ESTUDIANTE = { id: 5, rol: 'estudiante' };
const EVALUADOR = { id: 7, rol: 'evaluador' };

/** Fila tal como la devolvería la tabla `convocatorias`. */
function fila(cambios = {}) {
  return {
    id: 10,
    titulo: 'Becas Nacionales 2027',
    descripcion: 'Convocatoria anual',
    fecha_apertura: '2027-01-01',
    fecha_cierre: '2027-12-31',
    modalidades: ['universitaria', 'posgrado'],
    estado: 'Borrador',
    creada_por: 1,
    creado_en: new Date(),
    actualizado_en: new Date(),
    ...cambios,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  convocatoriaRepository.contarSolicitudes.mockResolvedValue(0);
});

describe('crearConvocatoria', () => {
  it('nace en Borrador, y el estado lo fija el patrón State', async () => {
    convocatoriaRepository.crear.mockResolvedValue(fila());

    const creada = await convocatoriaService.crearConvocatoria(
      { titulo: 'Becas Nacionales 2027', modalidades: ['universitaria', 'posgrado'] },
      ADMIN
    );

    expect(convocatoriaRepository.crear).toHaveBeenCalledWith(
      expect.objectContaining({ estado: 'Borrador', creadaPor: 1 })
    );
    expect(creada.estado).toBe('Borrador');
    expect(creada.admiteSolicitudes).toBe(false);
  });

  it('403 a un estudiante y a un evaluador, sin escribir nada', async () => {
    for (const usuario of [ESTUDIANTE, EVALUADOR, undefined]) {
      await expect(
        convocatoriaService.crearConvocatoria({ titulo: 'X' }, usuario)
      ).rejects.toMatchObject({ status: 403 });
    }

    expect(convocatoriaRepository.crear).not.toHaveBeenCalled();
  });

  it('400 sin título, y un título en blanco no cuenta', async () => {
    await expect(convocatoriaService.crearConvocatoria({}, ADMIN)).rejects.toMatchObject({
      status: 400,
    });
    await expect(
      convocatoriaService.crearConvocatoria({ titulo: '   ' }, ADMIN)
    ).rejects.toMatchObject({ status: 400 });
  });

  it('400 con una modalidad que el Factory no conoce', async () => {
    await expect(
      convocatoriaService.crearConvocatoria(
        { titulo: 'X', modalidades: ['beca-inventada'] },
        ADMIN
      )
    ).rejects.toMatchObject({ status: 400 });
  });

  it('el mensaje del 400 dice qué modalidades sí existen', async () => {
    try {
      await convocatoriaService.crearConvocatoria(
        { titulo: 'X', modalidades: ['nivel_medio'] },
        ADMIN
      );
      throw new Error('debió lanzar');
    } catch (error) {
      // Error frecuente: guion bajo en vez de guion.
      expect(error.message).toContain('nivel-medio');
    }
  });

  it('400 si el cierre es anterior a la apertura', async () => {
    await expect(
      convocatoriaService.crearConvocatoria(
        { titulo: 'X', fechaApertura: '2027-06-01', fechaCierre: '2027-01-01' },
        ADMIN
      )
    ).rejects.toMatchObject({ status: 400 });
  });

  it('400 con una fecha que no es fecha', async () => {
    await expect(
      convocatoriaService.crearConvocatoria({ titulo: 'X', fechaApertura: 'el mes que viene' }, ADMIN)
    ).rejects.toMatchObject({ status: 400 });
  });
});

describe('publicarConvocatoria', () => {
  it('el administrador publica una convocatoria completa', async () => {
    convocatoriaRepository.findById.mockResolvedValue(fila());
    convocatoriaRepository.actualizarEstado.mockResolvedValue(fila({ estado: 'Publicada' }));

    const publicada = await convocatoriaService.publicarConvocatoria(10, ADMIN);

    expect(convocatoriaRepository.actualizarEstado).toHaveBeenCalledWith(10, 'Publicada');
    expect(publicada.estado).toBe('Publicada');
    expect(publicada.admiteSolicitudes).toBe(true);
  });

  it('400 CON la lista de faltantes si está incompleta', async () => {
    convocatoriaRepository.findById.mockResolvedValue(
      fila({ fecha_apertura: null, fecha_cierre: null, modalidades: [] })
    );

    try {
      await convocatoriaService.publicarConvocatoria(10, ADMIN);
      throw new Error('debió lanzar');
    } catch (error) {
      expect(error.status).toBe(400);
      // Lo que importa no es el 400: es que el administrador sepa qué completar.
      expect(error.faltantes).toEqual(['fechaApertura', 'fechaCierre', 'modalidades']);
    }

    expect(convocatoriaRepository.actualizarEstado).not.toHaveBeenCalled();
  });

  it('una convocatoria sin modalidades no se publica', async () => {
    convocatoriaRepository.findById.mockResolvedValue(fila({ modalidades: [] }));

    await expect(
      convocatoriaService.publicarConvocatoria(10, ADMIN)
    ).rejects.toMatchObject({ faltantes: ['modalidades'] });
  });

  it('409 al publicar una ya publicada, y el mensaje viene del State', async () => {
    convocatoriaRepository.findById.mockResolvedValue(fila({ estado: 'Publicada' }));

    await expect(convocatoriaService.publicarConvocatoria(10, ADMIN)).rejects.toMatchObject({
      status: 409,
    });
    expect(convocatoriaRepository.actualizarEstado).not.toHaveBeenCalled();
  });

  it('403 a quien no es administrador', async () => {
    await expect(
      convocatoriaService.publicarConvocatoria(10, ESTUDIANTE)
    ).rejects.toMatchObject({ status: 403 });

    // Ni siquiera llega a cargarla.
    expect(convocatoriaRepository.findById).not.toHaveBeenCalled();
  });

  it('404 si no existe', async () => {
    convocatoriaRepository.findById.mockResolvedValue(null);

    await expect(convocatoriaService.publicarConvocatoria(404, ADMIN)).rejects.toMatchObject({
      status: 404,
    });
  });
});

describe('cerrarConvocatoria', () => {
  it('cierra una publicada', async () => {
    convocatoriaRepository.findById.mockResolvedValue(fila({ estado: 'Publicada' }));
    convocatoriaRepository.actualizarEstado.mockResolvedValue(fila({ estado: 'Cerrada' }));

    const cerrada = await convocatoriaService.cerrarConvocatoria(10, ADMIN);

    expect(cerrada.estado).toBe('Cerrada');
    expect(cerrada.admiteSolicitudes).toBe(false);
  });

  it('409 al cerrar un borrador: primero se publica', async () => {
    convocatoriaRepository.findById.mockResolvedValue(fila());

    await expect(convocatoriaService.cerrarConvocatoria(10, ADMIN)).rejects.toMatchObject({
      status: 409,
    });
  });

  it('403 a quien no es administrador', async () => {
    await expect(convocatoriaService.cerrarConvocatoria(10, EVALUADOR)).rejects.toMatchObject({
      status: 403,
    });
  });
});

describe('editarConvocatoria', () => {
  it('edita un borrador', async () => {
    convocatoriaRepository.findById.mockResolvedValue(fila());
    convocatoriaRepository.actualizarDatos.mockResolvedValue(fila({ titulo: 'Otro título' }));

    const editada = await convocatoriaService.editarConvocatoria(
      10,
      { titulo: 'Otro título' },
      ADMIN
    );

    expect(editada.titulo).toBe('Otro título');
  });

  it('409 al editar una publicada: los estudiantes ya la vieron', async () => {
    convocatoriaRepository.findById.mockResolvedValue(fila({ estado: 'Publicada' }));

    await expect(
      convocatoriaService.editarConvocatoria(10, { titulo: 'Cambiado' }, ADMIN)
    ).rejects.toMatchObject({ status: 409 });

    expect(convocatoriaRepository.actualizarDatos).not.toHaveBeenCalled();
  });

  it('409 al editar una cerrada', async () => {
    convocatoriaRepository.findById.mockResolvedValue(fila({ estado: 'Cerrada' }));

    await expect(
      convocatoriaService.editarConvocatoria(10, { titulo: 'X' }, ADMIN)
    ).rejects.toMatchObject({ status: 409 });
  });

  it('lo que no se manda no se cambia', async () => {
    convocatoriaRepository.findById.mockResolvedValue(fila());
    convocatoriaRepository.actualizarDatos.mockResolvedValue(fila());

    await convocatoriaService.editarConvocatoria(10, { descripcion: 'Nueva' }, ADMIN);

    expect(convocatoriaRepository.actualizarDatos).toHaveBeenCalledWith(10, {
      titulo: 'Becas Nacionales 2027',
      descripcion: 'Nueva',
      fechaApertura: '2027-01-01',
      fechaCierre: '2027-12-31',
      modalidades: ['universitaria', 'posgrado'],
    });
  });

  it('403 a quien no es administrador', async () => {
    await expect(
      convocatoriaService.editarConvocatoria(10, { titulo: 'X' }, ESTUDIANTE)
    ).rejects.toMatchObject({ status: 403 });
  });
});

describe('listarConvocatorias', () => {
  it('sin sesión solo devuelve las publicadas', async () => {
    convocatoriaRepository.listar.mockResolvedValue([fila({ estado: 'Publicada' })]);

    await convocatoriaService.listarConvocatorias(null);

    expect(convocatoriaRepository.listar).toHaveBeenCalledWith({ estado: 'Publicada' });
  });

  it('un estudiante tampoco ve borradores', async () => {
    convocatoriaRepository.listar.mockResolvedValue([]);

    // Pide expresamente los borradores y aun así recibe solo publicadas.
    await convocatoriaService.listarConvocatorias(ESTUDIANTE, { estado: 'Borrador' });

    expect(convocatoriaRepository.listar).toHaveBeenCalledWith({ estado: 'Publicada' });
  });

  it('el administrador ve todas, y puede filtrar', async () => {
    convocatoriaRepository.listar.mockResolvedValue([fila()]);

    await convocatoriaService.listarConvocatorias(ADMIN);
    expect(convocatoriaRepository.listar).toHaveBeenCalledWith({ estado: undefined });

    await convocatoriaService.listarConvocatorias(ADMIN, { estado: 'Borrador' });
    expect(convocatoriaRepository.listar).toHaveBeenCalledWith({ estado: 'Borrador' });
  });
});

describe('exigirConvocatoriaAbierta — el enganche con las solicitudes', () => {
  it('pasa con una publicada, en ventana y que admite la modalidad', async () => {
    const hoy = new Date().toISOString().slice(0, 10);
    convocatoriaRepository.findById.mockResolvedValue(
      fila({ estado: 'Publicada', fecha_apertura: hoy, fecha_cierre: hoy })
    );

    await expect(
      convocatoriaService.exigirConvocatoriaAbierta(10, 'universitaria')
    ).resolves.toBeUndefined();
  });

  it('409 si todavía es borrador', async () => {
    convocatoriaRepository.findById.mockResolvedValue(fila());

    await expect(
      convocatoriaService.exigirConvocatoriaAbierta(10, 'universitaria')
    ).rejects.toMatchObject({ status: 409 });
  });

  it('409 si ya está cerrada', async () => {
    convocatoriaRepository.findById.mockResolvedValue(fila({ estado: 'Cerrada' }));

    await expect(
      convocatoriaService.exigirConvocatoriaAbierta(10, 'universitaria')
    ).rejects.toMatchObject({ status: 409 });
  });

  it('409 si está publicada pero fuera de su periodo', async () => {
    convocatoriaRepository.findById.mockResolvedValue(
      fila({ estado: 'Publicada', fecha_apertura: '2020-01-01', fecha_cierre: '2020-12-31' })
    );

    await expect(
      convocatoriaService.exigirConvocatoriaAbierta(10, 'universitaria')
    ).rejects.toMatchObject({ status: 409 });
  });

  it('400 si no admite esa modalidad, diciendo cuáles sí', async () => {
    const hoy = new Date().toISOString().slice(0, 10);
    convocatoriaRepository.findById.mockResolvedValue(
      fila({ estado: 'Publicada', fecha_apertura: hoy, fecha_cierre: hoy })
    );

    try {
      await convocatoriaService.exigirConvocatoriaAbierta(10, 'nivel-medio');
      throw new Error('debió lanzar');
    } catch (error) {
      expect(error.status).toBe(400);
      expect(error.message).toContain('universitaria');
    }
  });

  it('404 si la convocatoria no existe', async () => {
    convocatoriaRepository.findById.mockResolvedValue(null);

    await expect(
      convocatoriaService.exigirConvocatoriaAbierta(404, 'universitaria')
    ).rejects.toMatchObject({ status: 404 });
  });
});
