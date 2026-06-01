export default function RequestCardSkeleton() {
  return (
    <div className="tyrian-card p-5 animate-pulse">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="h-5 w-24 bg-warm rounded-full" />
        <div className="h-5 w-16 bg-warm rounded-full" />
      </div>
      <div className="h-5 w-4/5 bg-warm rounded mb-2" />
      <div className="h-4 w-full bg-warm rounded mb-2" />
      <div className="h-4 w-2/3 bg-warm rounded mb-4" />
      <div className="pt-4 border-t border-warm flex justify-between">
        <div className="h-3 w-28 bg-warm rounded" />
        <div className="h-8 w-24 bg-warm rounded-lg" />
      </div>
    </div>
  );
}
