import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import RegistrationWizard from './RegistrationWizard';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { api } from '../../lib/api';

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-1', email: 'test@test.com', role: 'student' } }),
}));

vi.mock('../../lib/api', () => ({
  api: {
    registration: {
      getStatus: vi.fn(),
      getModules: vi.fn(),
      saveStep: vi.fn(),
      complete: vi.fn(),
    },
  },
}));

describe('RegistrationWizard Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.registration.getStatus).mockResolvedValue({ current_data: {}, completed_steps: [], next_step: 'personal_details', registration_complete: false });
    vi.mocked(api.registration.getModules).mockResolvedValue([]);
    vi.mocked(api.registration.saveStep).mockResolvedValue({ message: 'saved' });
    vi.mocked(api.registration.complete).mockResolvedValue({ message: 'completed' });
  });

  const renderPage = async () => {
    render(
      <MemoryRouter>
        <RegistrationWizard />
      </MemoryRouter>
    );
    await waitFor(() => {});
  };

  it('renders all step labels', async () => {
    await renderPage();
    expect(screen.getAllByText('Personal Details').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Address').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Programme').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Modules').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Fees').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Confirm').length).toBeGreaterThan(0);
  });

  it('starts at step Personal Details', async () => {
    await renderPage();
    expect(screen.getByText('Student Registration')).toBeInTheDocument();
    expect(screen.getByText('Save & Continue')).toBeInTheDocument();
    expect(screen.getByText('Previous')).toBeDisabled();
  });

  it('advances to next step on save & continue', async () => {
    await renderPage();
    fireEvent.click(screen.getByText('Save & Continue'));

    await waitFor(() => {
      expect(api.registration.saveStep).toHaveBeenCalledWith(
        'personal_details',
        expect.any(Object),
      );
    });
  });

  it('shows "Saving..." while saving step', async () => {
    vi.mocked(api.registration.saveStep).mockImplementation(() => new Promise(() => {}));

    await renderPage();
    fireEvent.click(screen.getByText('Save & Continue'));

    expect(screen.getByText('Saving...')).toBeInTheDocument();
  });

  it('shows "Complete Registration" button on last step', async () => {
    await renderPage();
    const steps = 5;
    for (let i = 0; i < steps; i++) {
      fireEvent.click(screen.getByText('Save & Continue'));
      await waitFor(() => {});
    }

    expect(screen.getByText('Complete Registration')).toBeInTheDocument();
  });

  it('shows error message on fetch failure', async () => {
    vi.mocked(api.registration.saveStep).mockRejectedValue(new Error('Network error'));

    await renderPage();
    fireEvent.click(screen.getByText('Save & Continue'));

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });

  it('shows Previous button and it works', async () => {
    await renderPage();
    fireEvent.click(screen.getByText('Save & Continue'));
    await waitFor(() => {});

    const prevBtn = screen.getByText('Previous');
    expect(prevBtn).not.toBeDisabled();
    fireEvent.click(prevBtn);

    expect(screen.getAllByText('Personal Details').length).toBeGreaterThan(0);
  });

  it('shows first step initially', async () => {
    await renderPage();
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('renders personal details form fields', async () => {
    await renderPage();
    expect(screen.getByText('First Name')).toBeInTheDocument();
    expect(screen.getByText('Last Name')).toBeInTheDocument();
    expect(screen.getByText('Date of Birth')).toBeInTheDocument();
    expect(screen.getByText('Gender')).toBeInTheDocument();
    expect(screen.getByText('Nationality')).toBeInTheDocument();
    expect(screen.getByText('Phone')).toBeInTheDocument();
  });

  it('shows completion page when registration is complete', async () => {
    vi.mocked(api.registration.getStatus).mockResolvedValue({ registration_complete: true, current_data: {} });

    await renderPage();
    await waitFor(() => {
      expect(screen.getByText('Registration Complete!')).toBeInTheDocument();
    });
    expect(screen.getByText('Go to Dashboard')).toBeInTheDocument();
  });

  it('saves each step endpoint correctly', async () => {
    await renderPage();
    const stepKeys = ['personal_details', 'address', 'programme', 'modules', 'fees'];

    for (const key of stepKeys) {
      fireEvent.click(screen.getByText('Save & Continue'));
      await waitFor(() => {
        expect(api.registration.saveStep).toHaveBeenCalledWith(
          key,
          expect.any(Object),
        );
      });
    }
  });

  it('calls complete endpoint on final submission', async () => {
    await renderPage();
    for (let i = 0; i < 5; i++) {
      fireEvent.click(screen.getByText('Save & Continue'));
      await waitFor(() => {});
    }

    fireEvent.click(screen.getByText('Complete Registration'));
    await waitFor(() => {
      expect(api.registration.complete).toHaveBeenCalled();
    });
  });

  it('fetches registration status and modules on mount', async () => {
    await renderPage();
    await waitFor(() => {
      expect(api.registration.getStatus).toHaveBeenCalled();
      expect(api.registration.getModules).toHaveBeenCalled();
    });
  });
});
