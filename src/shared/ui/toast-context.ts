import { createContext } from 'react';

export type ToastTone = 'neutral' | 'positive' | 'warning' | 'danger' | 'info';

export interface ToastInput {
  title: string;
  description?: string;
  tone?: ToastTone;
  /** Duration in ms. 0 = sticky until dismissed. */
  duration?: number;
  action?: { label: string; onClick: () => void };
}

export interface ToastContextValue {
  push: (toast: ToastInput) => number;
  dismiss: (id: number) => void;
}

export const ToastContext = createContext<ToastContextValue | null>(null);
