import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, AlertTriangle } from 'lucide-react';

const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-teal-50 to-emerald-50 px-4 text-center dark:from-gray-900 dark:to-gray-800">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-teal-100 dark:bg-teal-900/30">
        <AlertTriangle className="h-10 w-10 text-teal-600 dark:text-teal-400" />
      </div>

      <h1 className="mb-2 text-7xl font-bold text-teal-600 dark:text-teal-400">
        404
      </h1>

      <h2 className="mb-3 text-2xl font-semibold text-gray-800 dark:text-gray-100">
        Page Not Found
      </h2>

      <p className="mb-8 max-w-md text-gray-500 dark:text-gray-400">
        The page you're looking for doesn't exist or has been moved.
      </p>

      <button
        onClick={() => navigate('/')}
        className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-6 py-3 text-sm font-medium text-white shadow-lg shadow-teal-500/25 transition-all hover:bg-teal-700 hover:shadow-xl hover:shadow-teal-500/30 active:scale-95 dark:bg-teal-500 dark:hover:bg-teal-600"
      >
        <Home className="h-4 w-4" />
        Go back home
      </button>
    </div>
  );
};

export default NotFoundPage;
