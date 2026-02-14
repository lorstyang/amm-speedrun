import { ReactNode } from 'react';

interface AppShellProps {
  header: ReactNode;
  left: ReactNode;
  center: ReactNode;
  right: ReactNode;
}

export function AppShell({ header, left, center, right }: AppShellProps) {
  return (
    <div className="app-shell">
      {header}
      <main className="main-grid">
        <aside className="left-column">{left}</aside>
        <section className="center-column">{center}</section>
        <aside className="right-column">{right}</aside>
      </main>
    </div>
  );
}
