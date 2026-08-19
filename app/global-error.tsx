'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
          <div className="max-w-md p-8 bg-gray-800 rounded-lg shadow-lg border border-red-500/50">
            <h2 className="text-2xl font-bold text-red-400 mb-4">⚠ Something went wrong</h2>
            <p className="text-gray-300 mb-6">
              A critical error occurred while attempting to process the route.
            </p>
            <button
              onClick={() => reset()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded text-white font-semibold transition-colors"
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
