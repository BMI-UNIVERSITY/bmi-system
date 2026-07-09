import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Apply from './Apply';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as useAuthModule from '../hooks/useAuth';
import React from 'react';

// Mock API and Auth
vi.mock('../hooks/useAuth');
vi.mock('../lib/api', () => ({
  api: {
    applications: {
      submit: vi.fn(),
    },
  },
}));

import { api } from '../lib/api';

describe('Apply Page (Portal)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  const renderWithRouter = () => {
    return render(
      <MemoryRouter>
        <Apply />
      </MemoryRouter>
    );
  };

  it('renders application form if user is authenticated', () => {
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      user: { id: '1', email: 'applicant@test.com', first_name: 'Test', last_name: 'User', role: 'applicant', is_verified: 1 },
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
      refresh: vi.fn(),
      refreshSession: vi.fn(),
      setUser: vi.fn(),
      expiresAt: null,
    });

    renderWithRouter();
    
    // Check for form elements
    expect(screen.getByText('Your Application')).toBeInTheDocument();
    expect(screen.getByText('Choose Your Program')).toBeInTheDocument();
  });

  it('submits application successfully', async () => {
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      user: { id: '1', email: 'applicant@test.com', first_name: 'Test', last_name: 'User', role: 'applicant', is_verified: 1 },
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
      refresh: vi.fn(),
      refreshSession: vi.fn(),
      setUser: vi.fn(),
      expiresAt: null,
    });

    (api.applications.submit as any).mockResolvedValue({ success: true, data: { id: 'app-123' } });

    const user = userEvent.setup();
    renderWithRouter();
    
    // Select a program
    fireEvent.click(screen.getByText('BA in Biblical Studies'));
    
    // Continue to step 2
    fireEvent.click(screen.getByRole('button', { name: /Continue/i }));
    await waitFor(() => {});
    
    // We are on Personal Info. Continue to step 3
    fireEvent.click(screen.getByRole('button', { name: /Continue/i }));
    await waitFor(() => {});
    
    // We are on Background. Add text to prior education
    const bgInput = screen.getByLabelText(/Prior Education & Academic History \*/i);
    await user.type(bgInput, 'I attended high school and got my diploma in 2020.');
    
    // Continue to step 4
    fireEvent.click(screen.getByRole('button', { name: /Continue/i }));
    await waitFor(() => {});
    
    // Add text to personal statement
    const statementInput = screen.getByLabelText(/Personal Statement \*/i);
    await user.type(statementInput, 'This is my personal statement. It must be at least one hundred characters long to pass the validation check in the Apply form. Here is some additional text to ensure the length requirement is satisfied.');
    
    // Continue to step 5
    fireEvent.click(screen.getByRole('button', { name: /Continue/i }));
    await waitFor(() => {});
    
    // Submit
    fireEvent.click(screen.getByRole('button', { name: /Submit Application/i }));
    
    await waitFor(() => {
      expect(api.applications.submit).toHaveBeenCalled();
    });
    
    // Note: The actual Apply component might redirect or show a success message.
    // The test confirms the API was called correctly.
  }, 15000);
});
