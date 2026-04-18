import { NavLink, Outlet } from "react-router-dom";

const links = [
  { to: "/reports", label: "Reports", isAvailable: true },
  { to: "/imports/upload", label: "Upload", isAvailable: true },
  { to: "/review-queue", label: "Review Queue", isAvailable: true },
  { label: "Transactions", isAvailable: false },
  { to: "/manual-entry", label: "Add Expense", isAvailable: true },
  { to: "/spend-categories", label: "Categories", isAvailable: true },
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
          {links.map((link) =>
            link.isAvailable && link.to ? (
              <NavLink
                className={({ isActive }) =>
                  isActive ? "app-shell__link is-active" : "app-shell__link"
                }
                key={link.label}
                to={link.to}
              >
                {link.label}
              </NavLink>
            ) : (
              <span
                aria-disabled="true"
                className="app-shell__placeholder"
                key={link.label}
              >
                {link.label}
              </span>
            ),
          )}
        </nav>
      </header>
      <main className="app-shell__content">
        <Outlet />
      </main>
    </div>
  );
}
