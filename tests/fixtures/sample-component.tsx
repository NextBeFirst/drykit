import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/utils/cn';

interface ModalProps {
  open: boolean;
  variant: 'primary' | 'confirmation' | 'form';
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

export function Modal({ open, variant = 'primary', title, onClose, children }: ModalProps) {
  if (!open) return null;
  return <div className={cn('modal', variant)}>{children}</div>;
}
