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
});