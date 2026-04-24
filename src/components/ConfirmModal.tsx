/**
 * claudestarter EXAMPLE component - intentionally demonstrates the ANTI-PATTERN.
 *
 * This component is registered so you can see how `npm run registry:duplicates`
 * flags it as a likely duplicate of `Modal`. The suggested fix is to delete this
 * file and use <Modal variant="confirmation" /> instead.
 *
 * Remove this file (and its registry entry) once you've seen the warning in action.
 */
import React from 'react';

export interface ConfirmModalProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({ open, onConfirm, onCancel }: ConfirmModalProps) {
  if (!open) return null;
  return (
    <div role="dialog" aria-modal="true">
      <button type="button" onClick={onConfirm}>OK</button>
      <button type="button" onClick={onCancel}>Cancel</button>
    </div>
  );
}
