import { useRouteError, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Home, RefreshCw } from "lucide-react";

export function ErrorBoundary() {
  const error = useRouteError() as Error | null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
      <div className="max-w-lg w-full text-center">
        <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-red-500 to-orange-600 rounded-full mb-6 shadow-xl">
          <AlertTriangle className="h-12 w-12 text-white" />
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Oops! Something went wrong
        </h1>

        <p className="text-gray-600 mb-2">
          We're sorry, but something unexpected happened.
        </p>

        {error?.message && (
          <p className="text-sm text-gray-500 mb-6">Error: {error.message}</p>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
          <Button
            asChild
            size="lg"
            className="gap-2 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700"
          >
            <Link to="/dashboard">
              <Home className="h-4 w-4" />
              Go to Dashboard
            </Link>
          </Button>

          <Button
            variant="outline"
            size="lg"
            className="gap-2"
            onClick={() => window.location.reload()}
          >
            <RefreshCw className="h-4 w-4" />
            Reload Page
          </Button>
        </div>

        {import.meta.env.VITE_DEV && error?.stack && (
          <div className="mt-8 p-4 bg-gray-900 rounded-lg text-left overflow-auto max-h-64">
            <pre className="text-xs text-red-400 whitespace-pre-wrap">
              {error.stack}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
