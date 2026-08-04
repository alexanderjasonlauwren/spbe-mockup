import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";
import { DashboardLayout } from "./layouts/DashboardLayout";
import { LoginPage } from "./pages/auth/LoginPage";
import { DashboardPage } from "./pages/dashboard/DashboardPage";
import { OrderListPage } from "./pages/orders/OrderListPage";
import { SAManagementPage } from "./pages/sa/SAManagementPage";
import { DistributionPage } from "./pages/distribution/DistributionPage";
import { MonitoringPage } from "./pages/monitoring/MonitoringPage";
import { OcrPage } from "./pages/ocr/OcrPage";
import { PaymentPage } from "./pages/payments/PaymentPage";
import { ReportsPage } from "./pages/reports/ReportsPage";
import { TransactionListPage } from "./pages/transactions/TransactionListPage";
import { PangkalanListPage } from "./pages/pangkalan/PangkalanListPage";
import { PangkalanFormPage } from "./pages/pangkalan/PangkalanFormPage";
import { PangkalanDetailPage } from "./pages/pangkalan/PangkalanDetailPage";
import { DriverPage } from "./pages/drivers/DriverPage";
import { DriverDetailPage } from "./pages/drivers/DriverDetailPage";
import { ProductListPage } from "./pages/products/ProductListPage";
import { ProductFormPage } from "./pages/products/ProductFormPage";
import { UserListPage } from "./pages/users/UserListPage";
import { NotificationPage } from "./pages/notifications/NotificationPage";
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
      { index: true, element: <Navigate to="/dashboard" replace /> },

      // Operasi harian — intake through to the road.
      { path: "dashboard", element: <DashboardPage /> },
      { path: "orders", element: <OrderListPage /> },
      { path: "sa", element: <SAManagementPage /> },
      { path: "distribution", element: <DistributionPage /> },
      { path: "monitoring", element: <MonitoringPage /> },

      // Keuangan — what the day is worth.
      { path: "ocr", element: <OcrPage /> },
      { path: "payments", element: <PaymentPage /> },
      { path: "reports", element: <ReportsPage /> },
      { path: "transactions", element: <TransactionListPage /> },

      // Data induk.
      { path: "pangkalan", element: <PangkalanListPage /> },
      { path: "pangkalan/new", element: <PangkalanFormPage /> },
      { path: "pangkalan/:id", element: <PangkalanDetailPage /> },
      { path: "pangkalan/:id/edit", element: <PangkalanFormPage /> },
      { path: "drivers", element: <DriverPage /> },
      { path: "drivers/:id", element: <DriverDetailPage /> },
      { path: "products", element: <ProductListPage /> },
      { path: "products/new", element: <ProductFormPage /> },
      { path: "products/:id/edit", element: <ProductFormPage /> },
      { path: "users", element: <UserListPage /> },

      { path: "notifications", element: <NotificationPage /> },
      { path: "settings", element: <SettingsPage /> },

      { path: "*", element: <NotFoundPage /> },
    ],
  },
  { path: "*", element: <NotFoundPage /> },
]);

function App() {
  return <RouterProvider router={router} />;
}

export default App;
