/* eslint-disable */
/* eslint-disable */
/**
 * Dashboard — smoke tests
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

// ── Store mocks ───────────────────────────────────────────────────────────────
vi.mock('../stores/authStore', () => ({
  useAuthStore: vi.fn((selector: any) =>
    selector({ user: { name: 'Test User', role: 'admin' } }),
  ),
}));

vi.mock('../stores/dataStore', () => ({
  useDataStore: vi.fn((selector: any) =>
    selector({
      addStudent: vi.fn(),
      addTransaction: vi.fn(),
    }),
  ),
}));

vi.mock('../hooks/useEntityQueries', () => ({
  useStudentsQuery: vi.fn(() => ({ data: { data: [] }, isLoading: false })),
  useTransactionsQuery: vi.fn(() => ({ data: { data: [] }, isLoading: false })),
}));

import Dashboard from './Dashboard';
import { checkA11y } from '../test/axe';

describe('Dashboard', () => {
  it('renders the Executive Dashboard heading', () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>,
    );
    expect(screen.getByText(/executive dashboard/i)).toBeInTheDocument();
  });

  it('renders the four stat cards', () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>,
    );
    expect(screen.getByText(/total students/i)).toBeInTheDocument();
    expect(screen.getByText(/ytd revenue/i)).toBeInTheDocument();
    expect(screen.getByText(/new admissions/i)).toBeInTheDocument();
    expect(screen.getByText(/upcoming events/i)).toBeInTheDocument();
  });

  it('shows the logged-in user name', () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>,
    );
    expect(screen.getByText(/test user/i)).toBeInTheDocument();
  });

  it('has no critical or serious accessibility violations', async () => {
    const { container } = render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>,
    );
    await checkA11y(container);
  });
});









