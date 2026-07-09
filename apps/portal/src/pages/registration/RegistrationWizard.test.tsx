import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import RegistrationWizard from './RegistrationWizard';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-1', email: 'test@test.com', role: 'student' } }),
}));

function createMockResponse(data: any, ok = true) {
  return {
    ok,
    json: () => Promise.resolve(data),
  };
}

describe('RegistrationWizard Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (url === '/api/registration/status') {
        return Promise.resolve(createMockResponse({ success: true, data: { current_data: {}, completed_steps: [], next_step: 'personal_details', registration_complete: false } }));
      }
      if (url === '/api/registration/modules') {
        return Promise.resolve(createMockResponse({ success: true, data: [] }));
      }
      return Promise.resolve(createMockResponse({ success: true }));
    });
  });

  const renderPage = () => {
    return render(
      <MemoryRouter>
        <RegistrationWizard />
      </MemoryRouter>
    );
  };

  it('renders all step labels', () => {
    renderPage();
    expect(screen.getAllByText('Personal Details').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Address').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Programme').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Modules').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Fees').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Confirm').length).toBeGreaterThan(0);
  });

  it('starts at step Personal Details', () => {
    renderPage();
    expect(screen.getByText('Student Registration')).toBeInTheDocument();
    expect(screen.getByText('Save & Continue')).toBeInTheDocument();
    expect(screen.getByText('Previous')).toBeDisabled();
  });

  it('advances to next step on save & continue', async () => {
    renderPage();
    fireEvent.click(screen.getByText('Save & Continue'));

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith(
        '/api/registration/personal_details',
        expect.objectContaining({ method: 'POST' }),
      );
    });
  });

  it('shows "Saving..." while saving step', async () => {
    vi.mocked(globalThis.fetch).mockImplementation(() => new Promise(() => {}));

    renderPage();
    fireEvent.click(screen.getByText('Save & Continue'));

    expect(screen.getByText('Saving...')).toBeInTheDocument();
  });

  it('shows "Complete Registration" button on last step', async () => {
    renderPage();
    const steps = 5;
    for (let i = 0; i < steps; i++) {
      fireEvent.click(screen.getByText('Save & Continue'));
      await waitFor(() => {});
    }

    expect(screen.getByText('Complete Registration')).toBeInTheDocument();
  });

  it('shows error message on fetch failure', async () => {
    vi.mocked(globalThis.fetch).mockRejectedValue(new Error('Network error'));

    renderPage();
    fireEvent.click(screen.getByText('Save & Continue'));

    await waitFor(() => {
      expect(screen.getByText('Network error saving step')).toBeInTheDocument();
    });
  });

  it('shows Previous button and it works', async () => {
    renderPage();
    fireEvent.click(screen.getByText('Save & Continue'));
    await waitFor(() => {});

    const prevBtn = screen.getByText('Previous');
    expect(prevBtn).not.toBeDisabled();
    fireEvent.click(prevBtn);

    expect(screen.getAllByText('Personal Details').length).toBeGreaterThan(0);
  });

  it('shows first step initially', () => {
    renderPage();
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('renders personal details form fields', () => {
    renderPage();
    expect(screen.getByText('First Name')).toBeInTheDocument();
    expect(screen.getByText('Last Name')).toBeInTheDocument();
    expect(screen.getByText('Date of Birth')).toBeInTheDocument();
    expect(screen.getByText('Gender')).toBeInTheDocument();
    expect(screen.getByText('Nationality')).toBeInTheDocument();
    expect(screen.getByText('Phone')).toBeInTheDocument();
  });

  it('shows completion page when registration is complete', async () => {
    vi.mocked(globalThis.fetch).mockImplementation((url: string) => {
      if (url === '/api/registration/status') {
        return Promise.resolve(createMockResponse({ success: true, data: { registration_complete: true, current_data: {} } }));
      }
      return Promise.resolve(createMockResponse({ success: true }));
    });

    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Registration Complete!')).toBeInTheDocument();
    });
    expect(screen.getByText('Go to Dashboard')).toBeInTheDocument();
  });

  it('saves each step endpoint correctly', async () => {
    renderPage();
    const stepKeys = ['personal_details', 'address', 'programme', 'modules', 'fees'];

    for (const key of stepKeys) {
      fireEvent.click(screen.getByText('Save & Continue'));
      await waitFor(() => {
        expect(globalThis.fetch).toHaveBeenCalledWith(
          `/api/registration/${key}`,
          expect.objectContaining({ method: 'POST' }),
        );
      });
    }
  });

  it('calls complete endpoint on final submission', async () => {
    renderPage();
    for (let i = 0; i < 5; i++) {
      fireEvent.click(screen.getByText('Save & Continue'));
      await waitFor(() => {});
    }

    fireEvent.click(screen.getByText('Complete Registration'));
    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith(
        '/api/registration/complete',
        expect.objectContaining({ method: 'POST' }),
      );
    });
  });

  it('fetches registration status and modules on mount', async () => {
    renderPage();
    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith('/api/registration/status');
      expect(globalThis.fetch).toHaveBeenCalledWith('/api/registration/modules');
    });
  });
});
