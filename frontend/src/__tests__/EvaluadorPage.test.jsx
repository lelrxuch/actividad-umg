// src/__tests__/EvaluadorPage.test.jsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { EvaluadorPage } from '../pages/EvaluadorPage';
import * as solicitudService from '../services/solicitudService';
import * as sesion from '../utils/sesion';

vi.mock('../services/solicitudService');
vi.mock('../utils/sesion');

describe('EvaluadorPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(sesion, 'haySesion').mockReturnValue(true);
  });

  it('renderiza el título y la lista de solicitudes enviadas', async () => {
    solicitudService.listarMisSolicitudes.mockResolvedValue([
      { id: 1, estado: 'Enviada', tipo: 'pregrado', estudiante_id: 10 },
    ]);

    render(
      <MemoryRouter>
        <EvaluadorPage />
      </MemoryRouter>
    );

    expect(screen.getByText('Bandeja del Evaluador')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('Solicitud #1')).toBeInTheDocument();
      expect(screen.getByText('Iniciar Evaluación')).toBeInTheDocument();
    });
  });

  it('permite pasar una solicitud a "En Evaluación"', async () => {
    solicitudService.listarMisSolicitudes.mockResolvedValue([
      { id: 1, estado: 'Enviada', tipo: 'pregrado', estudiante_id: 10 },
    ]);
    solicitudService.evaluarSolicitud.mockResolvedValue({ id: 1, estado: 'En Evaluación' });

    render(
      <MemoryRouter>
        <EvaluadorPage />
      </MemoryRouter>
    );

    const boton = await screen.findByText('Iniciar Evaluación');
    fireEvent.click(boton);

    await waitFor(() => {
      expect(solicitudService.evaluarSolicitud).toHaveBeenCalledWith(1);
    });
  });

  it('permite dictaminar una solicitud como Aprobada', async () => {
    solicitudService.listarMisSolicitudes.mockResolvedValue([
      { id: 2, estado: 'En Evaluación', tipo: 'pregrado', estudiante_id: 12 },
    ]);
    solicitudService.dictaminarSolicitud.mockResolvedValue({ id: 2, estado: 'Aprobada' });

    render(
      <MemoryRouter>
        <EvaluadorPage />
      </MemoryRouter>
    );

    const botonAprobar = await screen.findByText('Aprobar');
    fireEvent.click(botonAprobar);

    await waitFor(() => {
      expect(solicitudService.dictaminarSolicitud).toHaveBeenCalledWith(2, true);
    });
  });
});