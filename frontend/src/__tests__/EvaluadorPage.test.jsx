// src/__tests__/EvaluadorPage.test.jsx
import { render, screen, waitFor } from '@testing-library/react';
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