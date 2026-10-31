// Pruebas de la bitácora de auditoría: auditoriaService (se mockea solo el
// cliente HTTP) y AuditoriaPage (se mockea solo el service).
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import API from '../services/api';
import { listarAuditoria } from '../services/auditoriaService';
import * as servicio from '../services/auditoriaService';
import { AuditoriaPage } from '../pages/AuditoriaPage';
import { describirDetalle } from '../utils/auditoria';

vi.mock('../services/api', () => ({ default: { get: vi.fn() } }));

const REGISTROS = [
  {
    id: 3,
    usuarioNombre: 'Autoridad',
    usuarioRol: 'autorizador',
    operacion: 'aprobacion',
    solicitudId: 42,
    detalle: { etapa: 'autorizacion', resultado: 'aprobada' },
    creadoEn: '2026-10-30T20:00:00Z',
  },
  {
    id: 2,
    usuarioNombre: 'Ana López',
    usuarioRol: 'estudiante',
    operacion: 'cambio_monto',
    solicitudId: 42,
    detalle: { campo: 'monto_solicitado', antes: null, despues: 15000 },
    creadoEn: '2026-10-30T19:00:00Z',
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
  localStorage.clear();
  localStorage.setItem('token', 'token-demo');
});

describe('auditoriaService', () => {
  it('sin filtro pide toda la auditoría', async () => {
    API.get.mockResolvedValue({ data: REGISTROS });

    expect(await listarAuditoria()).toEqual(REGISTROS);
    expect(API.get).toHaveBeenCalledWith('/auditoria', undefined);
  });

  it('un filtro vacío no se manda', async () => {
    API.get.mockResolvedValue({ data: [] });

    await listarAuditoria({ solicitudId: undefined });

    expect(API.get).toHaveBeenCalledWith('/auditoria', undefined);
  });

  it('con filtro manda solicitudId como parámetro', async () => {
    API.get.mockResolvedValue({ data: [] });

    await listarAuditoria({ solicitudId: '42' });

    expect(API.get).toHaveBeenCalledWith('/auditoria', { params: { solicitudId: '42' } });
  });

  it('una respuesta que no es lista se trata como vacía', async () => {
    API.get.mockResolvedValue({ data: null });

    expect(await listarAuditoria()).toEqual([]);
  });

  it('propaga el 403 del backend', async () => {
    API.get.mockRejectedValue({ response: { status: 403, data: { error: 'Solo un administrador puede consultar la auditoría.' } } });

    await expect(listarAuditoria()).rejects.toMatchObject({ status: 403 });
  });
});

describe('describirDetalle', () => {
  it.each([
    ['cambio_estado', { antes: 'Enviada', despues: 'En Evaluación' }, 'Enviada → En Evaluación'],
    ['aprobacion', { etapa: 'evaluacion', resultado: 'rechazada' }, 'Evaluación: rechazada'],
    ['cambio_monto', { antes: 5000, despues: 15000 }, 'Q5,000.00 → Q15,000.00'],
    ['cambio_monto', { antes: null, despues: 15000 }, 'sin monto → Q15,000.00'],
    ['asignacion_evaluador', { evaluadorId: 77, evaluadorNombre: 'Eva' }, 'Eva (#77)'],
    ['validacion_identidad', { cui: '*********0101', resultado: 'valida' }, 'CUI *********0101: valida'],
  ])('%s %o → %s', (operacion, detalle, texto) => {
    expect(describirDetalle(operacion, detalle)).toBe(texto);
  });
});

function renderPagina() {
  return render(
    <MemoryRouter initialEntries={['/admin/auditoria']}>
      <Routes>
        <Route path="/admin/auditoria" element={<AuditoriaPage />} />
        <Route path="/login" element={<p>pantalla de login</p>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('AuditoriaPage', () => {
  it('muestra quién, qué operación, sobre qué solicitud y qué cambió', async () => {
    vi.spyOn(servicio, 'listarAuditoria').mockResolvedValue(REGISTROS);

    renderPagina();

    expect(await screen.findByText('Aprobación')).toBeInTheDocument();
    expect(screen.getByText('Autorización: aprobada')).toBeInTheDocument();
    expect(screen.getByText('Cambio de monto')).toBeInTheDocument();
    expect(screen.getByText('sin monto → Q15,000.00')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: '#42' })[0]).toHaveAttribute('href', '/solicitudes/42');
  });

  it('filtra por solicitud', async () => {
    const listar = vi.spyOn(servicio, 'listarAuditoria').mockResolvedValue([]);

    renderPagina();
    await screen.findByText('No hay registros.');
    fireEvent.change(screen.getByLabelText('Solicitud #'), { target: { value: '42' } });
    fireEvent.click(screen.getByRole('button', { name: 'Filtrar' }));

    await waitFor(() => expect(listar).toHaveBeenLastCalledWith({ solicitudId: '42' }));
  });

  it('si no es administrador, muestra el mensaje del backend', async () => {
    vi.spyOn(servicio, 'listarAuditoria').mockRejectedValue(new Error('Solo un administrador puede consultar la auditoría.'));

    renderPagina();

    expect(await screen.findByRole('alert')).toHaveTextContent('Solo un administrador');
    expect(screen.queryByText('No hay registros.')).not.toBeInTheDocument();
  });

  it('sin sesión manda a iniciar sesión', () => {
    localStorage.clear();

    renderPagina();

    expect(screen.getByText('pantalla de login')).toBeInTheDocument();
  });
});
