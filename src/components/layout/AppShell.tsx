import { ReactNode } from 'react';

interface AppShellProps {
  header: ReactNode;
  toolbar?: ReactNode;
  left: ReactNode;
  center: ReactNode;
  right?: ReactNode;
  columns?: 'three' | 'two';
}

export function AppShell({ header, toolbar, left, center, right, columns = 'three' }: AppShellProps) {
  const className = columns === 'two' ? 'main-grid two-column' : 'main-grid';
  return (
    <div className="app-shell">
      {header}
      {toolbar}
      <main className={className}>
        <aside className="left-column">{left}</aside>
        <section className="center-column">{center}</section>
        {columns === 'three' ? <aside className="right-column">{right}</aside> : null}
      </main>
    </div>
  );
}
