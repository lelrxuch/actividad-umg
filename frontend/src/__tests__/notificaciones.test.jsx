// Pruebas del canal de notificaciones en la aplicación:
// notificacionService (se mockea solo el cliente HTTP) y MisNotificacionesPage
// (se mockea solo el service que consume).
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import API from '../services/api';
import { listarMisNotificaciones, marcarNotificacionLeida } from '../services/notificacionService';
import { MisNotificacionesPage } from '../pages/MisNotificacionesPage';
import * as servicio from '../services/notificacionService';

vi.mock('../services/api', () => ({ default: { get: vi.fn(), patch: vi.fn() } }));

const AVISO_NUEVO = {
  id: 2,
  solicitudId: 42,
  mensaje: 'Su solicitud de beca cambió de "Enviada" a "En Evaluación".',
  leidaEn: null,
  creadoEn: '2026-10-30T18:00:00Z',
};
const AVISO_LEIDO = {
  id: 1,
  solicitudId: 42,
  mensaje: 'Su solicitud de beca cambió de "Borrador" a "Enviada".',
  leidaEn: '2026-10-30T17:00:00Z',
  creadoEn: '2026-10-30T16:00:00Z',
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
  localStorage.clear();
  localStorage.setItem('token', 'token-demo');
});

describe('notificacionService', () => {
  it('pide los avisos del usuario en sesión', async () => {
    API.get.mockResolvedValue({ data: { noLeidas: 1, notificaciones: [AVISO_NUEVO] } });

    const datos = await listarMisNotificaciones();

    expect(API.get).toHaveBeenCalledWith('/notificaciones');
    expect(datos).toEqual({ noLeidas: 1, notificaciones: [AVISO_NUEVO] });
  });

  it('devuelve siempre las dos claves, aunque la respuesta venga vacía', async () => {
    API.get.mockResolvedValue({ data: null });

    expect(await listarMisNotificaciones()).toEqual({ noLeidas: 0, notificaciones: [] });
  });

  it('marca como leída con PATCH sobre el aviso', async () => {
    API.patch.mockResolvedValue({ data: { id: 2, leidaEn: '2026-10-30T19:00:00Z' } });

    await marcarNotificacionLeida(2);

    expect(API.patch).toHaveBeenCalledWith('/notificaciones/2/leida');
  });

  it('propaga el mensaje del backend', async () => {
    API.patch.mockRejectedValue({ response: { status: 404, data: { error: 'No existe la notificación 9.' } } });

    await expect(marcarNotificacionLeida(9)).rejects.toThrow('No existe la notificación 9.');
  });
});

function renderPagina() {
  return render(
    <MemoryRouter initialEntries={['/notificaciones']}>
      <Routes>
        <Route path="/notificaciones" element={<MisNotificacionesPage />} />
        <Route path="/login" element={<p>pantalla de login</p>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('MisNotificacionesPage', () => {
  it('muestra los avisos, cuántos faltan por leer y a qué solicitud llevan', async () => {
    vi.spyOn(servicio, 'listarMisNotificaciones').mockResolvedValue({
      noLeidas: 1,
      notificaciones: [AVISO_NUEVO, AVISO_LEIDO],
    });

    renderPagina();

    expect(await screen.findByText(AVISO_NUEVO.mensaje)).toBeInTheDocument();
    expect(screen.getByText(AVISO_LEIDO.mensaje)).toBeInTheDocument();
    expect(screen.getByText('1 sin leer.')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Solicitud #42' })[0]).toHaveAttribute('href', '/solicitudes/42');
  });

  it('solo los avisos sin leer tienen el botón para marcarlos', async () => {
    vi.spyOn(servicio, 'listarMisNotificaciones').mockResolvedValue({
      noLeidas: 1,
      notificaciones: [AVISO_NUEVO, AVISO_LEIDO],
    });

    renderPagina();

    await screen.findByText(AVISO_NUEVO.mensaje);
    expect(screen.getAllByRole('button', { name: 'Marcar como leída' })).toHaveLength(1);
  });

  it('al marcar uno como leído, se actualiza sin recargar', async () => {
    vi.spyOn(servicio, 'listarMisNotificaciones').mockResolvedValue({
      noLeidas: 1,
      notificaciones: [AVISO_NUEVO],
    });
    const marcar = vi
      .spyOn(servicio, 'marcarNotificacionLeida')
      .mockResolvedValue({ id: 2, leidaEn: '2026-10-30T19:00:00Z' });

    renderPagina();

    fireEvent.click(await screen.findByRole('button', { name: 'Marcar como leída' }));

    await waitFor(() => expect(screen.getByText('Todas leídas.')).toBeInTheDocument());
    expect(marcar).toHaveBeenCalledWith(2);
    expect(screen.queryByRole('button', { name: 'Marcar como leída' })).not.toBeInTheDocument();
  });

  it('sin avisos explica qué va a aparecer ahí', async () => {
    vi.spyOn(servicio, 'listarMisNotificaciones').mockResolvedValue({ noLeidas: 0, notificaciones: [] });

    renderPagina();

    expect(await screen.findByText('No tiene notificaciones.')).toBeInTheDocument();
  });

  it('si el backend falla, muestra su mensaje', async () => {
    vi.spyOn(servicio, 'listarMisNotificaciones').mockRejectedValue(new Error('No se pudieron cargar sus notificaciones'));

    renderPagina();

    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudieron cargar sus notificaciones');
  });

  it('sin sesión manda a iniciar sesión', () => {
    localStorage.clear();

    renderPagina();

    expect(screen.getByText('pantalla de login')).toBeInTheDocument();
  });
});
