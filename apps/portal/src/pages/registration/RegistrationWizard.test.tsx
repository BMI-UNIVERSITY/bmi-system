import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RegistrationWizard from './RegistrationWizard';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

describe('RegistrationWizard Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true });
    window.alert = vi.fn();
  });

  const renderPage = () => {
    return render(
      <MemoryRouter>
        <RegistrationWizard />
      </MemoryRouter>
    );
  };

  it('renders all step indicators', () => {
    renderPage();
    expect(screen.getByText('1. Personal Details')).toBeInTheDocument();
    expect(screen.getByText('2. Address')).toBeInTheDocument();
    expect(screen.getByText('3. Programme')).toBeInTheDocument();
    expect(screen.getByText('4. Modules')).toBeInTheDocument();
    expect(screen.getByText('5. Fees')).toBeInTheDocument();
    expect(screen.getByText('6. Confirm')).toBeInTheDocument();
  });

  it('starts at step 1 (Personal Details)', () => {
    renderPage();
    expect(screen.getByText('Personal Details')).toBeInTheDocument();
    expect(screen.getByText('Save & Continue')).toBeInTheDocument();
  });

  it('advances to next step on save & continue', async () => {
    renderPage();
    fireEvent.click(screen.getByText('Save & Continue'));

    await waitFor(() => {
      expect(screen.getByText('Address')).toBeInTheDocument();
    });
    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/registration/personal_details',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('shows "Saving..." while saving step', async () => {
    (globalThis.fetch as any).mockImplementation(() => new Promise(() => {}));

    renderPage();
    fireEvent.click(screen.getByText('Save & Continue'));

    expect(screen.getByText('Saving...')).toBeInTheDocument();
  });

  it('shows Finish Enrollment button on last step', async () => {
    renderPage();
    for (let i = 0; i < 5; i++) {
      fireEvent.click(screen.getByText('Save & Continue'));
      await waitFor(() => {});
    }

    expect(screen.getByText('Finish Enrollment')).toBeInTheDocument();
  });

  it('alerts on fetch error', async () => {
    (globalThis.fetch as any).mockRejectedValue(new Error('Network error'));

    renderPage();
    fireEvent.click(screen.getByText('Save & Continue'));

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('Failed to save step.');
    });
  });

  it('marks current step in blue and others in gray', () => {
    renderPage();
    const step1 = screen.getByText('1. Personal Details');
    const step2 = screen.getByText('2. Address');

    expect(step1.className).toContain('text-blue-600');
    expect(step2.className).toContain('text-gray-400');
  });
});
