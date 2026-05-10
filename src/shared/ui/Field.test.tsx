import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Input, Textarea } from './Field';

describe('Input', () => {
  it('associates label and input by id', () => {
    render(<Input label="Name" defaultValue="Kirken" />);
    const input = screen.getByLabelText(/name/i);
    expect(input).toHaveValue('Kirken');
  });

  it('marks aria-invalid + describes by error id when error is set', () => {
    render(<Input label="Email" error="Invalid email" />);
    const input = screen.getByLabelText(/email/i);
    expect(input).toHaveAttribute('aria-invalid', 'true');

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent(/invalid email/i);
    expect(input.getAttribute('aria-describedby')).toContain(alert.id);
  });

  it('renders an Optional badge when optional is true', () => {
    render(<Input label="Notes" optional />);
    expect(screen.getByText(/optional/i)).toBeInTheDocument();
  });

  it('renders hint when no error', () => {
    render(<Input label="Phone" hint="E.164 format" />);
    expect(screen.getByText(/E\.164 format/i)).toBeInTheDocument();
  });
});

describe('Textarea', () => {
  it('renders with the configured row count', () => {
    render(<Textarea label="Notes" rows={6} />);
    expect(screen.getByLabelText(/notes/i)).toHaveAttribute('rows', '6');
  });
});
