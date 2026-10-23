// Pruebas de src/pages/SolicitudPage.jsx — el expediente y el envío.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render as renderBase, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { SolicitudPage } from '../pages/SolicitudPage';
import { obtenerSolicitud, enviarSolicitud } from '../services/solicitudService';
import { listarDocumentos, subirDocumento } from '../services/documentoService';

vi.mock('../services/solicitudService', () => ({
  obtenerSolicitud: vi.fn(),
  enviarSolicitud: vi.fn(),
}));
vi.mock('../services/documentoService', () => ({
  listarDocumentos: vi.fn(),
  subirDocumento: vi.fn(),
}));

function render() {
  return renderBase(
    <MemoryRouter initialEntries={['/solicitudes/42']}>
      <Routes>
        <Route path="/solicitudes/:id" element={<SolicitudPage />} />
        <Route path="/login" element={<p>PANTALLA LOGIN</p>} />
      </Routes>
    </MemoryRouter>
  );
}

function solicitud(extra = {}) {
  return {
    id: 42,
    estado: 'Borrador',
    tipo: 'universitaria',
    documentosRequeridos: ['dni', 'titulo', 'carta'],
    accionesPermitidas: ['enviar'],
    convocatoriaId: 1,
    ...extra,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  localStorage.setItem('token', 't');
});

describe('SolicitudPage', () => {
  it('sin sesión lleva al login', async () => {
    localStorage.clear();
    obtenerSolicitud.mockResolvedValue(solicitud());
    listarDocumentos.mockResolvedValue([]);

    render();

    expect(await screen.findByText('PANTALLA LOGIN')).toBeInTheDocument();
  });

  it('pide la solicitud y sus documentos por el id de la URL', async () => {
    obtenerSolicitud.mockResolvedValue(solicitud());
    listarDocumentos.mockResolvedValue([]);

    render();
    await screen.findByText('Solicitud #42');

    expect(obtenerSolicitud).toHaveBeenCalledWith('42');
    expect(listarDocumentos).toHaveBeenCalledWith('42');
  });

  it('lista los documentos que exige el backend, no una lista propia', async () => {
    // Nivel medio no pide título. Si la pantalla tuviera su propia lista,
    // mostraría un documento que nadie le va a pedir al estudiante.
    obtenerSolicitud.mockResolvedValue(solicitud({ tipo: 'nivel-medio', documentosRequeridos: ['dni', 'carta'] }));
    listarDocumentos.mockResolvedValue([]);

    render();
    await screen.findByText('Solicitud #42');

    expect(screen.getByText(/documento personal de identificación/i)).toBeInTheDocument();
    expect(screen.getByText(/carta de recomendación/i)).toBeInTheDocument();
    expect(screen.queryByText(/título del nivel anterior/i)).not.toBeInTheDocument();
  });

  it('distingue lo subido de lo pendiente', async () => {
    obtenerSolicitud.mockResolvedValue(solicitud());
    listarDocumentos.mockResolvedValue([{ id: 1, tipo: 'dni', nombreArchivo: 'mi-dpi.pdf' }]);

    render();

    expect(await screen.findByText('Subido: mi-dpi.pdf')).toBeInTheDocument();
    expect(screen.getAllByText('Pendiente')).toHaveLength(2);
    // Lo ya subido no ofrece volver a subir.
    expect(screen.queryByLabelText(/subir documento personal/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/subir título/i)).toBeInTheDocument();
  });

  it('sube el archivo elegido con su tipo y refresca el expediente', async () => {
    obtenerSolicitud.mockResolvedValue(solicitud());
    listarDocumentos
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 9, tipo: 'titulo', nombreArchivo: 'titulo.pdf' }]);
    subirDocumento.mockResolvedValue({ id: 9 });

    render();
    const archivo = new File(['%PDF'], 'titulo.pdf', { type: 'application/pdf' });
    fireEvent.change(await screen.findByLabelText(/subir título/i), { target: { files: [archivo] } });

    expect(await screen.findByText('Subido: titulo.pdf')).toBeInTheDocument();
    expect(subirDocumento).toHaveBeenCalledWith('42', 'titulo', archivo);
  });

  it('si el backend rechaza el archivo, muestra su motivo junto al documento', async () => {
    obtenerSolicitud.mockResolvedValue(solicitud());
    listarDocumentos.mockResolvedValue([]);
    subirDocumento.mockRejectedValue(new Error('El archivo supera el límite de 5 MB.'));

    render();
    const archivo = new File(['x'], 'grande.pdf', { type: 'application/pdf' });
    fireEvent.change(await screen.findByLabelText(/subir título/i), { target: { files: [archivo] } });

    expect(await screen.findByText(/supera el límite de 5 mb/i)).toBeInTheDocument();
  });

  it('al enviar incompleto muestra el mensaje y marca los faltantes que dijo el backend', async () => {
    obtenerSolicitud.mockResolvedValue(solicitud());
    listarDocumentos.mockResolvedValue([]);
    const incompleto = new Error('El expediente está incompleto. Falta: titulo, carta.');
    incompleto.faltantes = ['titulo', 'carta'];
    enviarSolicitud.mockRejectedValue(incompleto);

    render();
    fireEvent.click(await screen.findByRole('button', { name: /enviar a evaluación/i }));

    expect(await screen.findByRole('status')).toHaveTextContent(/expediente está incompleto/i);
    expect(enviarSolicitud).toHaveBeenCalledWith('42');
  });

  it('al enviar completo muestra el estado nuevo y deja de ofrecer enviar', async () => {
    obtenerSolicitud.mockResolvedValue(solicitud());
    listarDocumentos.mockResolvedValue([]);
    enviarSolicitud.mockResolvedValue(solicitud({ estado: 'Enviada', accionesPermitidas: ['evaluar'] }));

    render();
    fireEvent.click(await screen.findByRole('button', { name: /enviar a evaluación/i }));

    expect(await screen.findByText('Enviada')).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: /enviar a evaluación/i })).not.toBeInTheDocument()
    );
  });

  it('el botón de enviar lo decide accionesPermitidas, no el nombre del estado', async () => {
    // Un estado que no admite "enviar" no muestra el botón, aunque la pantalla
    // no conozca ese estado.
    obtenerSolicitud.mockResolvedValue(solicitud({ estado: 'En Evaluación', accionesPermitidas: ['dictaminar'] }));
    listarDocumentos.mockResolvedValue([]);

    render();
    await screen.findByText('Solicitud #42');

    expect(screen.queryByRole('button', { name: /enviar a evaluación/i })).not.toBeInTheDocument();
  });

  it('fuera de Borrador el expediente es de solo lectura', async () => {
    obtenerSolicitud.mockResolvedValue(solicitud({ estado: 'Enviada', accionesPermitidas: ['evaluar'] }));
    listarDocumentos.mockResolvedValue([]);

    render();
    await screen.findByText('Solicitud #42');

    expect(screen.queryByLabelText(/subir/i)).not.toBeInTheDocument();
    expect(screen.getByText(/solo lectura/i)).toBeInTheDocument();
  });

  it('una solicitud ajena muestra el 403 del backend', async () => {
    obtenerSolicitud.mockRejectedValue(new Error('No tiene acceso a esta solicitud.'));
    listarDocumentos.mockRejectedValue(new Error('No tiene acceso a esta solicitud.'));

    render();

    expect(await screen.findByRole('alert')).toHaveTextContent(/no tiene acceso/i);
  });
});
