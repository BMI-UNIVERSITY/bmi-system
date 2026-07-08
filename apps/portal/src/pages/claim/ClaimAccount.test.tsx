import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ClaimAccount from './ClaimAccount';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

describe('ClaimAccount Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.fetch = vi.fn();
    window.alert = vi.fn();
  });

  const renderWithRouter = () => {
    return render(
      <MemoryRouter initialEntries={['/claim']}>
        <Routes>
          <Route path="/claim" element={<ClaimAccount />} />
          <Route path="/login" element={<div>Login Page</div>} />
        </Routes>
      </MemoryRouter>
    );
  };

  it('renders the claim form with heading and submit button', () => {
    renderWithRouter();
    expect(screen.getByText('Claim Your Student Account')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Claim Account/i })).toBeInTheDocument();
  });

  it('renders admission code and password input fields', () => {
    renderWithRouter();
    const inputs = screen.getAllByRole('textbox');
    const passwordInput = document.querySelector('input[type="password"]');
    expect(inputs.length).toBeGreaterThanOrEqual(1);
    expect(passwordInput).toBeInTheDocument();
  });

  it('shows "Claiming..." while submitting', async () => {
    (globalThis.fetch as any).mockImplementation(() => new Promise(() => {}));

    renderWithRouter();
    const inputs = screen.getAllByRole('textbox');
    await userEvent.type(inputs[0], 'APP-001');
    const passwordInput = document.querySelector('input[type="password"]')!;
    await userEvent.type(passwordInput, 'Str0ng!Pass');
    fireEvent.click(screen.getByRole('button', { name: /Claim Account/i }));

    expect(screen.getByRole('button', { name: /Claiming.../i })).toBeDisabled();
  });

  it('navigates to login on successful claim', async () => {
    (globalThis.fetch as any).mockResolvedValue({ ok: true });

    renderWithRouter();
    const inputs = screen.getAllByRole('textbox');
    await userEvent.type(inputs[0], 'APP-001');
    const passwordInput = document.querySelector('input[type="password"]')!;
    await userEvent.type(passwordInput, 'Str0ng!Pass');
    fireEvent.click(screen.getByRole('button', { name: /Claim Account/i }));

    await waitFor(() => {
      expect(screen.getByText('Login Page')).toBeInTheDocument();
    });
    expect(window.alert).toHaveBeenCalledWith('Account claimed successfully! Please login.');
  });

  it('shows error alert on failed claim', async () => {
    (globalThis.fetch as any).mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: 'Invalid admission code' }),
    });

    renderWithRouter();
    const inputs = screen.getAllByRole('textbox');
    await userEvent.type(inputs[0], 'BAD-CODE');
    const passwordInput = document.querySelector('input[type="password"]')!;
    await userEvent.type(passwordInput, 'Str0ng!Pass');
    fireEvent.click(screen.getByRole('button', { name: /Claim Account/i }));

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('Invalid admission code');
    });
  });

  it('shows generic alert on network error', async () => {
    (globalThis.fetch as any).mockRejectedValue(new Error('Network error'));

    renderWithRouter();
    const inputs = screen.getAllByRole('textbox');
    await userEvent.type(inputs[0], 'APP-001');
    const passwordInput = document.querySelector('input[type="password"]')!;
    await userEvent.type(passwordInput, 'Str0ng!Pass');
    fireEvent.click(screen.getByRole('button', { name: /Claim Account/i }));

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('An error occurred.');
    });
  });
});
