// src/__tests__/AsignacionEvaluadoresPage.test.jsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { AsignacionEvaluadoresPage } from '../pages/AsignacionEvaluadoresPage';
import * as solicitudService from '../services/solicitudService';
import * as usuarioService from '../services/usuarioService';

vi.mock('../services/solicitudService');
vi.mock('../services/usuarioService');

const renderConRouter = (componente) => {
  return render(<BrowserRouter>{componente}</BrowserRouter>);
};

describe('AsignacionEvaluadoresPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    localStorage.setItem('token', 'token-demo');
    localStorage.setItem('user', JSON.stringify({ nombre: 'Admin User', rol: 'administrador' }));
  });

  it('carga y muestra la lista de solicitudes y evaluadores para el administrador', async () => {
    solicitudService.listarAsignadas.mockResolvedValue([
      { id: 101, estado: 'Enviada', tipo: 'pregrado' },
    ]);
    usuarioService.listarEvaluadores.mockResolvedValue([
      { id: 5, nombre: 'Evaluador Juan', email: 'juan@test.com' },
    ]);

    renderConRouter(<AsignacionEvaluadoresPage />);

    expect(screen.getByText('Cargando datos...')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Solicitud #101')).toBeInTheDocument();
      expect(screen.getByText('Evaluador Juan (juan@test.com)')).toBeInTheDocument();
    });
  });

  it('asigna un evaluador con éxito y muestra el mensaje del backend', async () => {
    solicitudService.listarAsignadas.mockResolvedValue([
      { id: 101, estado: 'Enviada', tipo: 'pregrado' },
    ]);
    usuarioService.listarEvaluadores.mockResolvedValue([
      { id: 5, nombre: 'Evaluador Juan', email: 'juan@test.com' },
    ]);
    solicitudService.asignarEvaluador.mockResolvedValue({ id: 101, evaluador_id: 5 });

    renderConRouter(<AsignacionEvaluadoresPage />);

    await waitFor(() => {
      expect(screen.getByText('Solicitud #101')).toBeInTheDocument();
    });

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: '5' } });

    const boton = screen.getByRole('button', { name: 'Asignar' });
    fireEvent.click(boton);

    await waitFor(() => {
      expect(screen.getByText(/Evaluador Evaluador Juan asignado correctamente/i)).toBeInTheDocument();
    });
  });

  it('muestra el mensaje de error cuando la asignación falla', async () => {
    solicitudService.listarAsignadas.mockResolvedValue([
      { id: 102, estado: 'Enviada', tipo: 'pregrado' },
    ]);
    usuarioService.listarEvaluadores.mockResolvedValue([
      { id: 5, nombre: 'Evaluador Juan', email: 'juan@test.com' },
    ]);
    solicitudService.asignarEvaluador.mockRejectedValue({
      message: 'La solicitud ya tiene un evaluador asignado',
    });

    renderConRouter(<AsignacionEvaluadoresPage />);

    await waitFor(() => {
      expect(screen.getByText('Solicitud #102')).toBeInTheDocument();
    });

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: '5' } });

    const boton = screen.getByRole('button', { name: 'Asignar' });
    fireEvent.click(boton);

    await waitFor(() => {
      expect(screen.getByText('La solicitud ya tiene un evaluador asignado')).toBeInTheDocument();
    });
  });
});