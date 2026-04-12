export default function PartnerLoading() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Nav skeleton */}
      <div className="h-16 w-full border-b border-border bg-background">
        <div className="mx-auto flex h-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="h-6 w-32 animate-pulse rounded bg-muted" />
          <div className="hidden gap-6 md:flex">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-4 w-16 animate-pulse rounded bg-muted" />
            ))}
          </div>
        </div>
      </div>

      {/* Hero skeleton */}
      <div className="flex min-h-[560px] items-center bg-primary/20 px-4 py-24 sm:px-6">
        <div className="mx-auto w-full max-w-4xl text-center">
          <div className="mx-auto mb-4 h-12 w-3/4 animate-pulse rounded bg-primary/30" />
          <div className="mx-auto mb-4 h-8 w-1/2 animate-pulse rounded bg-primary/30" />
          <div className="mx-auto h-6 w-2/3 animate-pulse rounded bg-primary/20" />
        </div>
      </div>

      {/* Features skeleton */}
      <div className="bg-secondary px-4 py-24 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto mb-12 h-10 w-1/2 animate-pulse rounded bg-muted" />
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-40 animate-pulse rounded-xl bg-card" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
