export default function Loading() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-800 rounded w-1/3"></div>
        <div className="h-4 bg-gray-800 rounded w-1/2"></div>
        <div className="h-32 bg-gray-800 rounded mt-8"></div>
        <div className="grid grid-cols-4 gap-4 mt-4">
          <div className="h-24 bg-gray-800 rounded"></div>
          <div className="h-24 bg-gray-800 rounded"></div>
          <div className="h-24 bg-gray-800 rounded"></div>
          <div className="h-24 bg-gray-800 rounded"></div>
        </div>
        <div className="h-64 bg-gray-800 rounded mt-8"></div>
      </div>
    </div>
  );
}
