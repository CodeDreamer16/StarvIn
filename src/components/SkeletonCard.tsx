export function SkeletonCard() {
  return (
    <div className="relative rounded-3xl overflow-hidden border border-white/10 bg-[#10121A] shadow-[0_4px_20px_rgba(0,0,0,0.3)] animate-pulse-slow">
      <div className="h-36 w-full bg-gradient-to-r from-[#1a1d29] via-[#1E2230] to-[#1a1d29] animate-skeleton-shimmer" />
      <div className="p-5 space-y-3">
        <div className="h-5 w-2/3 rounded bg-[#1F2432] animate-skeleton-shimmer" />
        <div className="h-3 w-1/2 rounded bg-[#1F2432] animate-skeleton-shimmer" />
        <div className="h-3 w-full rounded bg-[#1F2432] animate-skeleton-shimmer" />
        <div className="h-3 w-5/6 rounded bg-[#1F2432] animate-skeleton-shimmer" />
        <div className="flex gap-2 mt-4">
          <div className="h-10 flex-1 rounded-xl bg-gradient-to-r from-[#00BFFF]/20 to-[#4C6EF5]/20 animate-skeleton-shimmer" />
          <div className="h-10 w-12 rounded-xl bg-[#1F2432] animate-skeleton-shimmer" />
        </div>
      </div>
    </div>
  );
}
