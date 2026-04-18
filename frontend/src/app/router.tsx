import { Navigate, Outlet, RouteObject } from "react-router-dom";

import { AppShell } from "../components/layout/AppShell";
import { LoginPage } from "../features/auth/LoginPage";
import { UploadPage } from "../features/imports/UploadPage";
import { ManualEntryPage } from "../features/manual-entry/ManualEntryPage";
import { ReportHomePage } from "../features/reports/ReportHomePage";
import { ReviewQueuePage } from "../features/review/ReviewQueuePage";
import { SpendCategoriesPage } from "../features/spend-categories/SpendCategoriesPage";
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
          { path: "imports/upload", element: <UploadPage /> },
          { path: "review-queue", element: <ReviewQueuePage /> },
          { path: "manual-entry", element: <ManualEntryPage /> },
          { path: "spend-categories", element: <SpendCategoriesPage /> },
        ],
      },
    ],
  },
];
