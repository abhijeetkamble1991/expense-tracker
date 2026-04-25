import { useEffect } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";

import {
  clearStoredSession,
  hasActiveSession,
  refreshStoredSessionActivity,
} from "../../lib/api";

const links = [
  { to: "/reports", label: "Reports", isAvailable: true },
  { to: "/imports/upload", label: "Upload", isAvailable: true },
  { to: "/review-queue", label: "Review Queue", isAvailable: true },
  { to: "/transactions", label: "Transactions", isAvailable: true },
  { to: "/spend-categories", label: "Categories", isAvailable: true },
  { to: "/settings", label: "Settings", isAvailable: true },
];

export function AppShell() {
  const navigate = useNavigate();

  useEffect(() => {
    function handleActivity() {
      if (hasActiveSession()) {
        refreshStoredSessionActivity();
      }
    }

    function enforceSession() {
      if (!hasActiveSession()) {
        navigate("/login", { replace: true });
      }
    }

    const activityEvents: Array<keyof WindowEventMap> = [
      "click",
      "keydown",
      "mousemove",
      "scroll",
      "touchstart",
    ];

    activityEvents.forEach((eventName) =>
      window.addEventListener(eventName, handleActivity, { passive: true }),
    );

    const sessionInterval = window.setInterval(enforceSession, 30_000);
    enforceSession();

    return () => {
      activityEvents.forEach((eventName) =>
        window.removeEventListener(eventName, handleActivity),
      );
      window.clearInterval(sessionInterval);
    };
  }, [navigate]);

  function handleLogout() {
    clearStoredSession();
    navigate("/login", { replace: true });
  }

  return (
    <div className="app-shell">
      <header className="app-shell__header">
        <div>
          <p className="app-shell__eyebrow">Monthly reporting workflow</p>
          <h1>Expense Tracker</h1>
        </div>
        <div className="app-shell__topbar">
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
          <button
            className="button-secondary app-shell__logout"
            onClick={handleLogout}
            type="button"
          >
            Logout
          </button>
        </div>
      </header>
      <main className="app-shell__content">
        <Outlet />
      </main>
    </div>
  );
}
