// Pruebas de src/pages/ConvocatoriasPage.jsx
//
// Se renderiza el componente REAL y se mockea unicamente el service, que es su
// dependencia externa. Lo que se verifica son los criterios de aceptacion de
// SCRUM-35, no detalles de implementacion: nada de buscar nombres de clases ni
// de inspeccionar el estado interno.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ConvocatoriasPage } from '../pages/ConvocatoriasPage';
import { listarConvocatorias } from '../services/convocatoriaService';

vi.mock('../services/convocatoriaService', () => ({
  listarConvocatorias: vi.fn(),
}));

/**
 * Una convocatoria con la forma exacta que devuelve el backend.
 *
 * Las fechas se fijan muy adelante para que las pruebas no caduquen con el
 * tiempo: lo que se prueba aqui es la pantalla, y el calculo de dias ya tiene
 * sus propias pruebas en fechas.test.js, con el momento inyectado.
 */
function convocatoria(extra = {}) {
  return {
    id: 1,
    titulo: 'Beca Universitaria 2027',
    descripcion: 'Apoyo para estudiantes de primer ingreso.',
    fechaApertura: '2099-01-01',
    fechaCierre: '2099-12-31',
    modalidades: ['universitaria'],
    estado: 'Publicada',
    accionesPermitidas: ['cerrar'],
    admiteSolicitudes: true,
    recibeSolicitudes: true,
    ...extra,
  };
}

describe('ConvocatoriasPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('avisa que esta cargando antes de que responda el backend', () => {
    listarConvocatorias.mockReturnValue(new Promise(() => {}));

    render(<ConvocatoriasPage />);

    expect(screen.getByText(/cargando convocatorias/i)).toBeInTheDocument();
  });

  describe('criterio de aceptación: si no hay convocatorias, un mensaje y no una tabla vacía', () => {
    it('muestra el mensaje cuando el backend devuelve una lista vacía', async () => {
      listarConvocatorias.mockResolvedValue([]);

      render(<ConvocatoriasPage />);

      expect(await screen.findByText(/no hay convocatorias abiertas/i)).toBeInTheDocument();
    });

    it('y no deja ninguna lista vacía en la página', async () => {
      listarConvocatorias.mockResolvedValue([]);

      const { container } = render(<ConvocatoriasPage />);
      await screen.findByText(/no hay convocatorias abiertas/i);

      // Si alguien sustituye el mensaje por una lista vacia, esta falla.
      // Se consulta el DOM directamente en vez de por rol, porque el rol de
      // `dl`/`dd` varia entre versiones de la libreria y daria falsos
      // positivos: lo que se quiere afirmar es que no hay UL ni LI.
      expect(container.querySelectorAll('ul')).toHaveLength(0);
      expect(container.querySelectorAll('li')).toHaveLength(0);
    });
  });

  describe('criterio de aceptación: muestra los días restantes para el cierre', () => {
    it('informa cuántos días faltan para cerrar', async () => {
      listarConvocatorias.mockResolvedValue([
        convocatoria({ fechaApertura: '2020-01-01', fechaCierre: '2099-12-31' }),
      ]);

      render(<ConvocatoriasPage />);

      expect(await screen.findByText(/cierran en \d+ días/i)).toBeInTheDocument();
    });

    it('cuando la convocatoria aún no abre, dice cuándo abre y no cuándo cierra', async () => {
      listarConvocatorias.mockResolvedValue([
        convocatoria({ fechaApertura: '2099-06-01', fechaCierre: '2099-12-31' }),
      ]);

      render(<ConvocatoriasPage />);

      expect(await screen.findByText(/abre en \d+ días/i)).toBeInTheDocument();
      expect(screen.queryByText(/cierran en/i)).not.toBeInTheDocument();
    });

    it('cuando el plazo ya pasó, lo dice', async () => {
      listarConvocatorias.mockResolvedValue([
        convocatoria({ fechaApertura: '2020-01-01', fechaCierre: '2020-12-31' }),
      ]);

      render(<ConvocatoriasPage />);

      expect(await screen.findByText(/periodo vencido/i)).toBeInTheDocument();
    });
  });

  describe('contenido de cada convocatoria', () => {
    it('muestra título, descripción y fechas legibles', async () => {
      listarConvocatorias.mockResolvedValue([convocatoria()]);

      render(<ConvocatoriasPage />);

      expect(await screen.findByText('Beca Universitaria 2027')).toBeInTheDocument();
      expect(screen.getByText(/apoyo para estudiantes de primer ingreso/i)).toBeInTheDocument();
      expect(screen.getByText('1 de enero de 2099')).toBeInTheDocument();
      expect(screen.getByText('31 de diciembre de 2099')).toBeInTheDocument();
    });

    it('traduce las modalidades a nombres legibles', async () => {
      listarConvocatorias.mockResolvedValue([
        convocatoria({ modalidades: ['nivel-medio', 'posgrado'] }),
      ]);

      render(<ConvocatoriasPage />);

      // 'nivel-medio' no se le muestra al usuario tal cual.
      expect(await screen.findByText('Nivel medio · Posgrado')).toBeInTheDocument();
      expect(screen.queryByText(/nivel-medio/)).not.toBeInTheDocument();
    });

    it('lista una tarjeta por convocatoria', async () => {
      listarConvocatorias.mockResolvedValue([
        convocatoria({ id: 1, titulo: 'Primera' }),
        convocatoria({ id: 2, titulo: 'Segunda' }),
        convocatoria({ id: 3, titulo: 'Tercera' }),
      ]);

      const { container } = render(<ConvocatoriasPage />);
      await screen.findByText('Primera');

      expect(container.querySelectorAll('li')).toHaveLength(3);
      expect(screen.getByText('Segunda')).toBeInTheDocument();
      expect(screen.getByText('Tercera')).toBeInTheDocument();
    });
  });

  describe('quién decide si se puede aplicar', () => {
    it('ofrece iniciar solicitud cuando el backend dice recibeSolicitudes', async () => {
      listarConvocatorias.mockResolvedValue([convocatoria({ recibeSolicitudes: true })]);

      render(<ConvocatoriasPage />);

      expect(await screen.findByRole('button', { name: /iniciar solicitud/i })).toBeInTheDocument();
    });

    it('NO lo ofrece cuando el backend dice que no, aunque el estado sea Publicada', async () => {
      // Este es el caso que motiva que `recibeSolicitudes` venga del backend:
      // la convocatoria esta Publicada y admiteSolicitudes es true, pero su
      // ventana de fechas no esta vigente. Si la pantalla se guiara por
      // `admiteSolicitudes`, ofreceria aplicar y el usuario recibiria un 409.
      listarConvocatorias.mockResolvedValue([
        convocatoria({
          estado: 'Publicada',
          admiteSolicitudes: true,
          recibeSolicitudes: false,
        }),
      ]);

      render(<ConvocatoriasPage />);
      await screen.findByText('Beca Universitaria 2027');

      expect(screen.queryByRole('button', { name: /iniciar solicitud/i })).not.toBeInTheDocument();
      expect(screen.getByText(/no está recibiendo solicitudes/i)).toBeInTheDocument();
    });
  });

  describe('cuando el backend falla', () => {
    it('muestra el mensaje del error y no una lista vacía', async () => {
      listarConvocatorias.mockRejectedValue(new Error('No se pudieron cargar las convocatorias'));

      render(<ConvocatoriasPage />);

      const alerta = await screen.findByRole('alert');
      expect(alerta).toHaveTextContent(/no se pudieron cargar las convocatorias/i);
      expect(document.querySelectorAll('li')).toHaveLength(0);
    });

    it('no muestra el mensaje de "no hay convocatorias" cuando lo que hubo fue un error', async () => {
      // Confundir un fallo con una lista vacia le haria creer al estudiante que
      // no hay becas abiertas cuando en realidad el sistema no respondio.
      listarConvocatorias.mockRejectedValue(new Error('Error de conexión'));

      render(<ConvocatoriasPage />);
      await screen.findByRole('alert');

      expect(screen.queryByText(/no hay convocatorias abiertas/i)).not.toBeInTheDocument();
    });

    it('deja de mostrar "cargando" después de fallar', async () => {
      listarConvocatorias.mockRejectedValue(new Error('Error de conexión'));

      render(<ConvocatoriasPage />);

      await waitFor(() => {
        expect(screen.queryByText(/cargando convocatorias/i)).not.toBeInTheDocument();
      });
    });
  });
});
