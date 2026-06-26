import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import Contact from '../app/contact/page';

describe('Contact Page', () => {
  it('renders the contact form and information', () => {
    render(<Contact />);
    
    // Check for headers
    expect(screen.getByRole('heading', { name: /Contact Us/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Get in Touch/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Send a Message/i })).toBeInTheDocument();

    // Check for some contact info
    expect(screen.getByText('admin@bmiuniversity.org')).toBeInTheDocument();
  });

  it('updates form fields when typed into', async () => {
    render(<Contact />);
    const user = userEvent.setup();

    const nameInput = screen.getByLabelText(/Full Name/i);
    const emailInput = screen.getByLabelText(/Email Address/i);
    const subjectInput = screen.getByLabelText(/Subject/i);
    const messageInput = screen.getByLabelText(/Message/i);

    await user.type(nameInput, 'John Doe');
    await user.type(emailInput, 'john@example.com');
    await user.type(subjectInput, 'Test Inquiry');
    await user.type(messageInput, 'This is a test message.');

    expect(nameInput.value).toBe('John Doe');
    expect(emailInput.value).toBe('john@example.com');
    expect(subjectInput.value).toBe('Test Inquiry');
    expect(messageInput.value).toBe('This is a test message.');
  });

  it('shows success message after form submission', async () => {
    render(<Contact />);
    const user = userEvent.setup();

    // Fill form
    await user.type(screen.getByLabelText(/Full Name/i), 'John Doe');
    await user.type(screen.getByLabelText(/Email Address/i), 'john@example.com');
    await user.type(screen.getByLabelText(/Subject/i), 'Inquiry');
    await user.type(screen.getByLabelText(/Message/i), 'Test message');

    // Submit form
    const submitBtn = screen.getByRole('button', { name: /Send Message/i });
    fireEvent.click(submitBtn); // or user.click

    // Verify success message
    expect(screen.getByRole('heading', { name: /Message Sent!/i })).toBeInTheDocument();
    expect(screen.getByText(/We will get back to you within 1–2 business days/i)).toBeInTheDocument();
    
    // Ensure the original form is gone
    expect(screen.queryByRole('heading', { name: /Send a Message/i })).not.toBeInTheDocument();
  });
});
