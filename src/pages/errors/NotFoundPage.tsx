import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft, Search } from "lucide-react";

export function NotFoundPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        {/* 404 Illustration */}
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-32 h-32 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mb-6 shadow-xl">
            <span className="text-6xl font-bold text-white">404</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Page Not Found
          </h1>
          <p className="text-gray-600">
            Oops! The page you're looking for doesn't exist or has been moved.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            asChild
            size="lg"
            className="gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            <Link to="/dashboard">
              <Home className="h-4 w-4" />
              Go to Dashboard
            </Link>
          </Button>

          <Button
            asChild
            variant="outline"
            size="lg"
            className="gap-2"
            onClick={() => window.history.back()}
          >
            <button>
              <ArrowLeft className="h-4 w-4" />
              Go Back
            </button>
          </Button>
        </div>

        {/* Suggestions */}
        <div className="mt-12 p-6 bg-white rounded-lg border border-gray-200 text-left">
          <div className="flex items-start gap-3">
            <Search className="h-5 w-5 text-gray-400 mt-0.5" />
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">
                Looking for something?
              </h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>
                  <Link
                    to="/dashboard"
                    className="text-blue-600 hover:underline"
                  >
                    Dashboard
                  </Link>
                </li>
                <li>
                  <Link
                    to="/products"
                    className="text-blue-600 hover:underline"
                  >
                    Products
                  </Link>
                </li>
                <li>
                  <Link to="/orders" className="text-blue-600 hover:underline">
                    Orders
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
