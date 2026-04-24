/**
 * claudestarter EXAMPLE component.
 *
 * This file exists to show the "variants, not new components" pattern
 * and to make the registry boot with a working example.
 *
 * Feel free to delete it once you have your own components,
 * then run `npm run docs:generate` to refresh the registry listing.
 */
import React from 'react';

export interface ModalProps {
  open: boolean;
  variant?: 'primary' | 'confirmation' | 'form';
  title: string;
  onClose: () => void;
  children?: React.ReactNode;
}

export function Modal({ open, variant = 'primary', title, onClose, children }: ModalProps) {
  if (!open) return null;
  return (
    <div role="dialog" aria-modal="true" data-variant={variant}>
      <header>
        <h2>{title}</h2>
        <button type="button" onClick={onClose} aria-label="Close">×</button>
      </header>
      <div>{children}</div>
    </div>
  );
}
