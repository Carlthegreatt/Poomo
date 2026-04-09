export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-xl bg-muted border border-border/20 ${className}`}
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="border-2 border-border bg-white rounded-2xl shadow-[3px_3px_0_black] overflow-hidden">
      <div className="h-1.5 bg-muted animate-pulse" />
      <div className="p-4 space-y-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  );
}
