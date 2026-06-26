import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Register from './Register';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api } from '../lib/api';
import React from 'react';

vi.mock('../lib/api', () => ({
  api: {
    auth: {
      register: vi.fn(),
    },
  },
}));

describe('Register Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderWithRouter = (initialRoute = '/register') => {
    return render(
      <MemoryRouter initialEntries={[initialRoute]}>
        <Routes>
          <Route path="/register" element={<Register />} />
          <Route path="/apply" element={<div>Apply Page Redirect</div>} />
        </Routes>
      </MemoryRouter>
    );
  };

  it('renders empty form by default', () => {
    renderWithRouter();
    
    expect(screen.getByLabelText(/First Name/i)).toHaveValue('');
    expect(screen.getByLabelText(/Last Name/i)).toHaveValue('');
    expect(screen.getByLabelText(/Email Address/i)).toHaveValue('');
    expect(screen.queryByText(/Almost there!/i)).not.toBeInTheDocument();
  });

  it('prefills form and shows banner if query params are present (G-1 fix)', () => {
    renderWithRouter('/register?email=test@example.com&first_name=John&last_name=Doe&program=MDiv');
    
    // Check if fields are prefilled
    expect(screen.getByLabelText(/First Name/i)).toHaveValue('John');
    expect(screen.getByLabelText(/Last Name/i)).toHaveValue('Doe');
    expect(screen.getByLabelText(/Email Address/i)).toHaveValue('test@example.com');
    
    // Check if fields are read-only
    expect(screen.getByLabelText(/First Name/i)).toHaveAttribute('readOnly');
    expect(screen.getByLabelText(/Last Name/i)).toHaveAttribute('readOnly');
    expect(screen.getByLabelText(/Email Address/i)).toHaveAttribute('readOnly');
    
    // Welcome banner should be present
    expect(screen.getByText(/Almost there!/i)).toBeInTheDocument();
    expect(screen.getByText(/MDiv/i)).toBeInTheDocument();
  });

  it('validates password constraints on submit', async () => {
    const user = userEvent.setup();
    renderWithRouter();
    
    await user.type(screen.getByLabelText(/First Name/i), 'Jane');
    await user.type(screen.getByLabelText(/Last Name/i), 'Smith');
    await user.type(screen.getByLabelText(/Email Address/i), 'jane@example.com');
    await user.type(screen.getByLabelText(/^Password \*/i), 'weak');
    await user.type(screen.getByLabelText(/Confirm Password \*/i), 'weak');
    
    fireEvent.click(screen.getByRole('button', { name: /Create Account/i }));
    
    expect(await screen.findByText('Password must be at least 8 characters.')).toBeInTheDocument();
    expect(api.auth.register).not.toHaveBeenCalled();
  });

  it('submits successfully and shows success message', async () => {
    (api.auth.register as any).mockResolvedValue({ success: true });
    
    const user = userEvent.setup();
    renderWithRouter();
    
    await user.type(screen.getByLabelText(/First Name/i), 'Jane');
    await user.type(screen.getByLabelText(/Last Name/i), 'Smith');
    await user.type(screen.getByLabelText(/Email Address/i), 'jane@example.com');
    await user.type(screen.getByLabelText(/^Password \*/i), 'StrongPass123!');
    await user.type(screen.getByLabelText(/Confirm Password \*/i), 'StrongPass123!');
    
    fireEvent.click(screen.getByRole('button', { name: /Create Account/i }));
    
    await waitFor(() => {
      expect(api.auth.register).toHaveBeenCalledWith({
        email: 'jane@example.com',
        password: 'StrongPass123!',
        first_name: 'Jane',
        last_name: 'Smith',
        phone: undefined,
      });
    });
    
    expect(await screen.findByText(/Account created!/i)).toBeInTheDocument();
  });

  it('redirects to /apply after successful prefilled submission', async () => {
    (api.auth.register as any).mockResolvedValue({ success: true });
    
    const user = userEvent.setup();
    renderWithRouter('/register?email=test@example.com&first_name=John&last_name=Doe&program=MDiv');
    
    await user.type(screen.getByLabelText(/^Password \*/i), 'StrongPass123!');
    await user.type(screen.getByLabelText(/Confirm Password \*/i), 'StrongPass123!');
    
    fireEvent.click(screen.getByRole('button', { name: /Complete Registration/i }));
    
    expect(await screen.findByText(/Account created!/i)).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.getByText('Apply Page Redirect')).toBeInTheDocument();
    }, { timeout: 3000 });
  });
});
