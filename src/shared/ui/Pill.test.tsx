import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Pill, OrderStatusPill, PaymentStatusPill } from './Pill';

describe('Pill', () => {
  it('renders children', () => {
    render(<Pill tone="positive">Paid</Pill>);
    expect(screen.getByText(/paid/i)).toBeInTheDocument();
  });
});

describe('Status pills', () => {
  it('OrderStatusPill maps status name to label text', () => {
    render(<OrderStatusPill status="Delivered" />);
    expect(screen.getByText(/delivered/i)).toBeInTheDocument();
  });

  it('PaymentStatusPill renders Partial', () => {
    render(<PaymentStatusPill status="Partial" />);
    expect(screen.getByText(/partial/i)).toBeInTheDocument();
  });
});
