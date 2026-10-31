// src/__tests__/EvaluadorPage.test.jsx
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { EvaluadorPage } from '../pages/EvaluadorPage';
import * as solicitudService from '../services/solicitudService';
import * as documentoService from '../services/documentoService';

vi.mock('../services/solicitudService');
vi.mock('../services/documentoService');

const renderConRouter = (componente) => {
  return render(<BrowserRouter>{componente}</BrowserRouter>);
};

describe('EvaluadorPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    localStorage.setItem('token', 'token-demo');
    documentoService.listarDocumentosPorSolicitud.mockResolvedValue([]);
  });

  it('para rol administrador solo muestra la lista y NO muestra botones de accion', async () => {
    localStorage.setItem('user', JSON.stringify({ nombre: 'Admin Test', rol: 'administrador' }));
    solicitudService.listarAsignadas.mockResolvedValue([
      { id: 1, estado: 'Enviada', tipo: 'pregrado', accionesPermitidas: ['evaluar'] },
    ]);

    renderConRouter(<EvaluadorPage />);

    await waitFor(() => {
      expect(screen.getByText('Solicitud #1')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Iniciar Evaluación/i })).not.toBeInTheDocument();
      expect(screen.getByText('Sin acciones pendientes')).toBeInTheDocument();
    });
  });

  it('para rol evaluador si muestra los botones permitidos', async () => {
    localStorage.setItem('user', JSON.stringify({ nombre: 'Evaluador Test', rol: 'evaluador' }));
    solicitudService.listarAsignadas.mockResolvedValue([
      { id: 2, estado: 'Enviada', tipo: 'pregrado', accionesPermitidas: ['evaluar'] },
    ]);

    renderConRouter(<EvaluadorPage />);

    await waitFor(() => {
      expect(screen.getByText('Solicitud #2')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Iniciar Evaluación/i })).toBeInTheDocument();
    });
  });

  it('lista los documentos del expediente de la solicitud', async () => {
    localStorage.setItem('user', JSON.stringify({ nombre: 'Evaluador Test', rol: 'evaluador' }));
    solicitudService.listarAsignadas.mockResolvedValue([
      { id: 3, estado: 'En Evaluación', tipo: 'pregrado', accionesPermitidas: ['dictaminar'] },
    ]);
    documentoService.listarDocumentosPorSolicitud.mockResolvedValue([
      { id: 10, tipo: 'dpi', nombreArchivo: 'dpi.pdf' },
    ]);

    renderConRouter(<EvaluadorPage />);

    await waitFor(() => {
      expect(screen.getByText(/dpi.pdf/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Descargar' })).toBeInTheDocument();
    });
  });

  it('el admin no ve los botones Aprobar ni Rechazar en una solicitud En Evaluación', async () => {
  localStorage.setItem('user', JSON.stringify({ nombre: 'Admin User', rol: 'administrador' }));
  solicitudService.listarAsignadas.mockResolvedValue([
    { id: 99, estado: 'En Evaluación', tipo: 'pregrado', accionesPermitidas: ['dictaminar'] },
  ]);

  renderConRouter(<EvaluadorPage />);

  await waitFor(() => {
    expect(screen.getByText('Solicitud #99')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Aprobar/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Rechazar/i })).not.toBeInTheDocument();
    expect(screen.getByText('Sin acciones pendientes')).toBeInTheDocument();
  });
});
});
describe('EvaluadorPage — autoridad autorizadora', () => {
  const PENDIENTE = {
    id: 7,
    estado: 'Pendiente de Autorización',
    tipo: 'universitaria',
    montoSolicitado: 15000,
    requiereDobleAprobacion: true,
    accionesPermitidas: ['autorizar'],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    localStorage.setItem('token', 'token-demo');
    documentoService.listarDocumentosPorSolicitud.mockResolvedValue([]);
  });

  it('ve su bandeja con el monto y los botones de autorizar', async () => {
    localStorage.setItem('user', JSON.stringify({ nombre: 'Autoridad', rol: 'autorizador' }));
    solicitudService.listarAsignadas.mockResolvedValue([PENDIENTE]);

    renderConRouter(<EvaluadorPage />);

    expect(await screen.findByRole('heading', { name: 'Bandeja de autorización' })).toBeInTheDocument();
    expect(await screen.findByText(/requiere autorización/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Autorizar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'No autorizar' })).toBeInTheDocument();
    expect(screen.queryByText('Sin acciones pendientes')).not.toBeInTheDocument();
  });

  it.each([
    ['Autorizar', true, 'Aprobada'],
    ['No autorizar', false, 'Rechazada'],
  ])('%s manda aprobado=%s y muestra el estado que devolvió el backend', async (boton, aprobado, estado) => {
    localStorage.setItem('user', JSON.stringify({ nombre: 'Autoridad', rol: 'autorizador' }));
    solicitudService.listarAsignadas.mockResolvedValueOnce([PENDIENTE]).mockResolvedValueOnce([]);
    solicitudService.autorizarSolicitud.mockResolvedValue({ ...PENDIENTE, estado, accionesPermitidas: [] });

    renderConRouter(<EvaluadorPage />);
    fireEvent.click(await screen.findByRole('button', { name: boton }));

    await waitFor(() => expect(solicitudService.autorizarSolicitud).toHaveBeenCalledWith(7, aprobado));
    expect(await screen.findByRole('status')).toHaveTextContent(`Solicitud #7: ${estado}.`);
  });

  it('un evaluador no ve los botones de autorizar, aunque la acción venga en la lista', async () => {
    localStorage.setItem('user', JSON.stringify({ nombre: 'Evaluador', rol: 'evaluador' }));
    solicitudService.listarAsignadas.mockResolvedValue([PENDIENTE]);

    renderConRouter(<EvaluadorPage />);

    expect(await screen.findByText('Solicitud #7')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Autorizar' })).not.toBeInTheDocument();
  });

  it('si el evaluador aprueba una de más de Q10,000, el aviso dice que queda pendiente', async () => {
    localStorage.setItem('user', JSON.stringify({ nombre: 'Evaluador', rol: 'evaluador' }));
    solicitudService.listarAsignadas.mockResolvedValue([{ ...PENDIENTE, estado: 'En Evaluación', accionesPermitidas: ['dictaminar'] }]);
    solicitudService.dictaminarSolicitud.mockResolvedValue({ ...PENDIENTE });

    renderConRouter(<EvaluadorPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Aprobar' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Solicitud #7: Pendiente de Autorización.');
  });
});
