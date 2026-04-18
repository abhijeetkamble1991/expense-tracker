import { Navigate, Outlet, RouteObject } from "react-router-dom";

import { AppShell } from "../components/layout/AppShell";
import { LoginPage } from "../features/auth/LoginPage";
import { ReportHomePage } from "../features/reports/ReportHomePage";
import { getStoredToken } from "../lib/api";

function RequireAuth() {
  if (!getStoredToken()) {
    return <Navigate replace to="/login" />;
  }

  return <Outlet />;
}

export const routerConfig: RouteObject[] = [
  { path: "/login", element: <LoginPage /> },
  {
    path: "/",
    element: <RequireAuth />,
    children: [
      {
        element: <AppShell />,
        children: [
          { index: true, element: <Navigate replace to="/reports" /> },
          { path: "reports", element: <ReportHomePage /> },
        ],
      },
    ],
  },
];
