'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="p-6 bg-red-900/20 border border-red-800 rounded-lg">
        <h2 className="text-lg font-semibold text-red-400 mb-2">
          Something went wrong!
        </h2>
        <p className="text-gray-300 mb-4">{error.message}</p>
        <button
          onClick={() => reset()}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
