import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * `--muted` sits within 0.003 L of both `--accent` and the `bg-muted/60` inset
 * tiles, so a default `bg-muted` skeleton disappears on those surfaces. Use
 * this for anything placed on the hero card or inside a tile.
 */
const Bar = ({ className }: { className?: string }) => (
  <Skeleton className={cn("bg-foreground/10", className)} />
);

/** One of the three supporting stat cards under the revenue hero. */
const StatCardSkeleton = ({ className }: { className?: string }) => (
  <Card className={cn("gap-2", className)}>
    <CardHeader className="pb-0">
      <Skeleton className="h-4 w-20" />
    </CardHeader>
    <CardContent className="mt-auto">
      <Skeleton className="h-7 w-24 sm:h-9 sm:w-32" />
      <Skeleton className="mt-3 h-3 w-24" />
    </CardContent>
  </Card>
);

/** A `bg-muted/60` inset row, as used by Invoice Status and Top Shows. */
const TileRowSkeleton = ({ leading }: { leading: "dot" | "rank" }) => (
  <div className="bg-muted/60 flex items-center justify-between rounded-xl px-4 py-3">
    <div className="flex items-center gap-3">
      {leading === "dot" ? (
        <Bar className="size-2.5 rounded-full" />
      ) : (
        <Skeleton className="bg-card size-7 rounded-full" />
      )}
      <Bar className="h-4 w-28" />
    </div>
    <Bar className="h-4 w-16" />
  </div>
);

/**
 * Mirrors the dashboard's reading order — hero → supporting stats → revenue
 * chart → Recent Invoices → Breakdown — so nothing shifts when data lands.
 */
export const DashboardSkeleton = () => {
  return (
    <div
      role="status"
      aria-label="Loading dashboard"
      className="animate-in fade-in mx-auto grid w-full max-w-6xl grid-cols-1 gap-6 p-6 py-10 duration-300 md:pb-8"
    >
      {/* PageHeader: greeting + date, with the year picker and Create Invoice */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <Skeleton className="h-9 w-56 sm:h-10 sm:w-72" />
          <Skeleton className="mt-2.5 h-4 w-52" />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Skeleton className="h-9 w-[110px]" />
          <Skeleton className="h-9 w-36" />
        </div>
      </div>

      {/* Revenue hero */}
      <Card className="bg-accent dark:border-accent gap-4 shadow-md">
        <CardHeader className="pb-0">
          <Bar className="h-4 w-44" />
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
            <Bar className="h-10 w-56 sm:h-12 sm:w-72" />
            <Skeleton className="bg-card h-7 w-44 rounded-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="bg-card h-2 w-full rounded-full" />
            <div className="flex items-center justify-between">
              <Bar className="h-4 w-24" />
              <Bar className="h-4 w-32" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Supporting stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton className="col-span-2 lg:col-span-1" />
      </div>

      {/* Revenue trend chart */}
      <Card>
        <CardHeader>
          <Skeleton className="h-7 w-40" />
        </CardHeader>
        <CardContent className="px-0 py-6 md:px-4">
          <div className="flex h-[320px] gap-3 px-4">
            <div className="flex flex-col justify-between py-1">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-3 w-10" />
              ))}
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-3">
              <Skeleton className="flex-1 rounded-xl" />
              <div className="flex justify-between">
                {[...Array(12)].map((_, i) => (
                  <Skeleton key={i} className="h-3 w-4" />
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Invoices */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <Skeleton className="h-7 w-44" />
            <Skeleton className="h-8 w-20" />
          </div>
        </CardHeader>
        <CardContent>
          {/* Column order matches the table: # / Show / Client / Date /
              Status / Amount / Actions — the last three collapse on mobile
              rather than overflowing, since there is nothing to scroll yet */}
          <div className="border-border/50 flex items-center gap-4 border-b pb-3">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-20" />
            <Skeleton className="hidden h-3 w-16 md:block" />
            <Skeleton className="hidden h-3 w-12 md:block" />
            <Skeleton className="h-3 w-12" />
            <Skeleton className="ml-auto h-3 w-14" />
            <Skeleton className="hidden h-3 w-12 md:block" />
          </div>
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="border-border/50 flex items-center gap-4 border-b py-3.5 last:border-0"
            >
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-36" />
              <Skeleton className="hidden h-4 w-24 md:block" />
              <Skeleton className="hidden h-4 w-20 md:block" />
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="ml-auto h-4 w-20" />
              <Skeleton className="hidden size-8 md:block" />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Breakdown heading */}
      <Skeleton className="mt-2 h-4 w-24" />

      {/* Invoice Status + Top Shows */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent className="space-y-2">
            {[...Array(4)].map((_, i) => (
              <TileRowSkeleton key={i} leading="dot" />
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-44" />
          </CardHeader>
          <CardContent className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <TileRowSkeleton key={i} leading="rank" />
            ))}
          </CardContent>
        </Card>
      </div>

      {/* This Month + Year Performance */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-28" />
            <Skeleton className="h-4 w-36" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-20" />
                  <Skeleton className="h-3 w-28" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-36" />
            <Skeleton className="h-4 w-32" />
          </CardHeader>
          <CardContent className="space-y-4">
            {[...Array(2)].map((_, i) => (
              <div key={i}>
                <div className="mb-2 flex items-center justify-between">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <Skeleton className="h-2 w-full rounded-full" />
              </div>
            ))}
            <Skeleton className="h-4 w-56" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
