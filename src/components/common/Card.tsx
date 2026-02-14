import { ReactNode } from 'react';

interface CardProps {
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function Card({ title, children, footer }: CardProps) {
  return (
    <section className="card">
      <header className="card-header">
        <h3>{title}</h3>
      </header>
      <div className="card-content">{children}</div>
      {footer ? <footer className="card-footer">{footer}</footer> : null}
    </section>
  );
}
