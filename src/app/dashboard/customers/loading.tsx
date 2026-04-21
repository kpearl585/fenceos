export default function Loading() {
  return (
    <div className="space-y-4">
      <div className="h-8 w-48 bg-surface-2 rounded-lg animate-pulse" />
      <div className="grid grid-cols-1 gap-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 bg-surface-2 rounded-xl animate-pulse" />
        ))}
      </div>
    </div>
  );
}
