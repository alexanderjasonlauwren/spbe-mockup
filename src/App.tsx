import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
} from "react-router-dom";
import { DashboardLayout } from "./layouts/DashboardLayout";
import { LoginPage } from "./pages/auth/LoginPage";
import { DashboardPage } from "./pages/dashboard/DashboardPage";
import { UserListPage } from "./pages/users/UserListPage";
import { ProductListPage } from "./pages/products/ProductListPage";
import { OrderListPage } from "./pages/orders/OrderListPage";
import { ReportsPage } from "./pages/reports/ReportsPage";
import { SettingsPage } from "./pages/settings/SettingsPage";
import { NotFoundPage } from "./pages/errors/NotFoundPage";
import { ErrorBoundary } from "./pages/errors/ErrorBoundary";
import { ProtectedRoute } from "./features/auth/components/ProtectedRoutes";

const router = createBrowserRouter([
  {
    path: "/login",
    element: <LoginPage />,
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <DashboardLayout />
      </ProtectedRoute>
    ),
    errorElement: <ErrorBoundary />,
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />,
      },
      {
        path: "dashboard",
        element: <DashboardPage />,
      },
      {
        path: "users",
        element: <UserListPage />,
      },
      {
        path: "products",
        element: <ProductListPage />,
      },
      {
        path: "orders",
        element: <OrderListPage />,
      },
      {
        path: "reports",
        element: <ReportsPage />,
      },
      {
        path: "settings",
        element: <SettingsPage />,
      },
      {
        path: "*",
        element: <NotFoundPage />,
      },
    ],
  },
  {
    path: "*",
    element: <NotFoundPage />,
  },
]);

function App() {
  return <RouterProvider router={router} />;
}

export default App;
