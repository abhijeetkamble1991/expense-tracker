import { NavLink, Outlet } from "react-router-dom";

const links = [
  { to: "/reports", label: "Reports" },
  { to: "/upload", label: "Upload" },
  { to: "/review", label: "Review Queue" },
  { to: "/transactions", label: "Transactions" },
  { to: "/manual-entry", label: "Add Expense" },
  { to: "/categories", label: "Categories" },
];

export function AppShell() {
  return (
    <div className="app-shell">
      <header className="app-shell__header">
        <div>
          <p className="app-shell__eyebrow">Monthly reporting workflow</p>
          <h1>Expense Tracker</h1>
        </div>
        <nav aria-label="Primary" className="app-shell__nav">
          {links.map((link) => (
            <NavLink
              className={({ isActive }) =>
                isActive ? "app-shell__link is-active" : "app-shell__link"
              }
              key={link.to}
              to={link.to}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="app-shell__content">
        <Outlet />
      </main>
    </div>
  );
}
