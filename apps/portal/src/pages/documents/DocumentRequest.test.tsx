import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DocumentRequest from './DocumentRequest';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

describe('DocumentRequest Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.fetch = vi.fn();
    window.alert = vi.fn();
  });

  const renderPage = () => {
    return render(
      <MemoryRouter>
        <DocumentRequest />
      </MemoryRouter>
    );
  };

  it('renders the document request form', () => {
    renderPage();
    expect(screen.getByText('Self-Service Documents')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Request Document/i })).toBeInTheDocument();
  });

  it('shows all document type options', () => {
    renderPage();
    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();

    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(3);
    expect(options[0]).toHaveTextContent('Official Transcript ($15)');
    expect(options[1]).toHaveTextContent('Degree Certificate ($25)');
    expect(options[2]).toHaveTextContent('Enrollment Letter (Free)');
  });

  it('calls payment create-intent on submit', async () => {
    (globalThis.fetch as any).mockResolvedValue({
      json: () => Promise.resolve({ clientSecret: 'secret_123' }),
    });

    const user = userEvent.setup();
    renderPage();
    await user.selectOptions(screen.getByRole('combobox'), 'transcript');
    fireEvent.click(screen.getByRole('button', { name: /Request Document/i }));

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith(
        '/api/payment/create-intent',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ amount: 15, reason: 'Document Request: transcript' }),
        }),
      );
    });
    expect(window.alert).toHaveBeenCalledWith(
      'Payment required. Redirecting to Stripe checkout... (Mocked)',
    );
  });

  it('shows processing state while submitting', async () => {
    (globalThis.fetch as any).mockImplementation(() => new Promise(() => {}));

    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /Request Document/i }));

    expect(screen.getByRole('button', { name: /Processing.../i })).toBeDisabled();
  });

  it('shows alert on fetch error', async () => {
    (globalThis.fetch as any).mockRejectedValue(new Error('Network error'));

    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /Request Document/i }));

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('An error occurred.');
    });
  });

  it('sends correct reason based on selected document type', async () => {
    (globalThis.fetch as any).mockResolvedValue({
      json: () => Promise.resolve({ clientSecret: 'secret' }),
    });

    renderPage();

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'certificate' } });
    expect((select as unknown as HTMLSelectElement).value).toBe('certificate');

    fireEvent.click(screen.getByRole('button', { name: /Request Document/i }));

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith(
        '/api/payment/create-intent',
        expect.objectContaining({
          body: expect.stringContaining('Document Request: certificate'),
        }),
      );
    });
  });
});
