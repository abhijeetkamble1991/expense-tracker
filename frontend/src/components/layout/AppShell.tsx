import { NavLink, Outlet } from "react-router-dom";

const links = [
  { to: "/reports", label: "Reports", isAvailable: true },
  { label: "Upload", isAvailable: false },
  { label: "Review Queue", isAvailable: false },
  { label: "Transactions", isAvailable: false },
  { label: "Add Expense", isAvailable: false },
  { label: "Categories", isAvailable: false },
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
