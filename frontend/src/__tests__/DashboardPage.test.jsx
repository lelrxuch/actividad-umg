// src/__tests__/DashboardPage.test.jsx
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, beforeEach } from 'vitest';
import { DashboardPage } from '../pages/DashboardPage';

const renderConRouter = (componente) => {
  return render(<BrowserRouter>{componente}</BrowserRouter>);
};

describe('DashboardPage', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('token', 'token-demo');
  });

  it('muestra "Asignar evaluadores" solo para el rol administrador', () => {
    localStorage.setItem('user', JSON.stringify({ nombre: 'Admin', rol: 'administrador' }));
    renderConRouter(<DashboardPage />);

    expect(screen.getByRole('link', { name: /Asignar evaluadores/i })).toBeInTheDocument();
  });

  it('NO muestra "Asignar evaluadores" para el rol evaluador o estudiante', () => {
    localStorage.setItem('user', JSON.stringify({ nombre: 'Evaluador', rol: 'evaluador' }));
    renderConRouter(<DashboardPage />);

    expect(screen.queryByRole('link', { name: /Asignar evaluadores/i })).not.toBeInTheDocument();
  });

  it('la autoridad autorizadora ve "Solicitudes por autorizar"; los demás no', () => {
    localStorage.setItem('user', JSON.stringify({ nombre: 'Autoridad', rol: 'autorizador' }));
    const { unmount } = renderConRouter(<DashboardPage />);
    expect(screen.getByRole('link', { name: 'Solicitudes por autorizar' })).toHaveAttribute('href', '/evaluador');
    unmount();

    localStorage.setItem('user', JSON.stringify({ nombre: 'Evaluador', rol: 'evaluador' }));
    renderConRouter(<DashboardPage />);
    expect(screen.queryByRole('link', { name: 'Solicitudes por autorizar' })).not.toBeInTheDocument();
  });

  it('el enlace a la auditoría es solo para el administrador', () => {
    localStorage.setItem('user', JSON.stringify({ nombre: 'Admin', rol: 'administrador' }));
    const { unmount } = renderConRouter(<DashboardPage />);
    expect(screen.getByRole('link', { name: 'Auditoría' })).toHaveAttribute('href', '/admin/auditoria');
    unmount();

    localStorage.setItem('user', JSON.stringify({ nombre: 'Autoridad', rol: 'autorizador' }));
    renderConRouter(<DashboardPage />);
    expect(screen.queryByRole('link', { name: 'Auditoría' })).not.toBeInTheDocument();
  });
});
