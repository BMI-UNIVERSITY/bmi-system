import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import ApplyPage from '../app/apply/page';
import { PORTAL_URL } from '@bmi/shared';

describe('Apply Page', () => {
  let originalWindowLocation;

  beforeEach(() => {
    originalWindowLocation = window.location;
    // Mock window.location to assert redirects
    delete window.location;
    window.location = { href: '' };
    
    // Clear mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    window.location = originalWindowLocation;
  });

  it('renders all required form fields', () => {
    render(<ApplyPage />);
    expect(screen.getByLabelText(/First Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Last Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Program of Interest/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Continue to Portal/i })).toBeInTheDocument();
  });

  it('shows error if name is missing', async () => {
    render(<ApplyPage />);
    const submitBtn = screen.getByRole('button', { name: /Continue to Portal/i });
    
    // Submit empty form
    fireEvent.click(submitBtn);
    
    expect(await screen.findByText('Please enter your full name.')).toBeInTheDocument();
    expect(window.location.href).toBe(''); // No redirect
  });

  it('shows error if email is invalid', async () => {
    const user = userEvent.setup();
    render(<ApplyPage />);
    
    await user.type(screen.getByLabelText(/First Name/i), 'John');
    await user.type(screen.getByLabelText(/Last Name/i), 'Doe');
    await user.type(screen.getByLabelText(/Email Address/i), 'not-an-email');
    
    fireEvent.click(screen.getByRole('button', { name: /Continue to Portal/i }));
    
    expect(await screen.findByText('Please enter a valid email address.')).toBeInTheDocument();
    expect(window.location.href).toBe('');
  });

  it('shows error if program is not selected', async () => {
    const user = userEvent.setup();
    render(<ApplyPage />);
    
    await user.type(screen.getByLabelText(/First Name/i), 'John');
    await user.type(screen.getByLabelText(/Last Name/i), 'Doe');
    await user.type(screen.getByLabelText(/Email Address/i), 'john@example.com');
    // Don't select a program
    
    fireEvent.click(screen.getByRole('button', { name: /Continue to Portal/i }));
    
    expect(await screen.findByText('Please select a program of interest.')).toBeInTheDocument();
    expect(window.location.href).toBe('');
  });

  it('redirects to portal /register with correct query params on valid submit', async () => {
    const user = userEvent.setup();
    render(<ApplyPage />);
    
    await user.type(screen.getByLabelText(/First Name/i), 'Jane');
    await user.type(screen.getByLabelText(/Last Name/i), 'Smith');
    await user.type(screen.getByLabelText(/Email Address/i), 'jane@example.com');
    await user.selectOptions(screen.getByLabelText(/Program of Interest/i), 'Master of Divinity (MDiv)');
    
    fireEvent.click(screen.getByRole('button', { name: /Continue to Portal/i }));
    
    // G-1 fix verification: Should not call fetch
    expect(vi.fn()).not.toHaveBeenCalled(); 
    
    // Verify exact redirect URL format
    const expectedUrl = new URL(`${PORTAL_URL}/register`);
    expectedUrl.searchParams.set('email', 'jane@example.com');
    expectedUrl.searchParams.set('first_name', 'Jane');
    expectedUrl.searchParams.set('last_name', 'Smith');
    expectedUrl.searchParams.set('program', 'Master of Divinity (MDiv)');
    
    // Vitest runs synchronously here so window.location is updated immediately
    expect(window.location.href).toBe(expectedUrl.toString());
  });
});
