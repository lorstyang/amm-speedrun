import { ReactNode } from 'react';

interface ActionButtonProps {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost';
}

export function ActionButton({ children, onClick, disabled, variant = 'primary' }: ActionButtonProps) {
  return (
    <button className={`btn ${variant}`} type="button" onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}
