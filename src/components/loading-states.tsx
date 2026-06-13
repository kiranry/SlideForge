import { Skeleton } from "@/components/ui/skeleton";

export function ListCardsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <ul className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <li key={i}>
          <div className="rounded-lg border border-border p-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-5 w-2/3 max-w-xs" />
                <div className="flex gap-2">
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-5 w-14" />
                </div>
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-9 w-24" />
                <Skeleton className="h-9 w-24" />
                <Skeleton className="h-9 w-9" />
              </div>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function TemplateGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-lg border border-border p-6">
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-2">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-14" />
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
            <div className="flex gap-1.5 pt-1">
              <Skeleton className="h-5 w-14" />
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-5 w-12" />
            </div>
            <Skeleton className="h-8 w-28" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function DeckPreviewSkeleton() {
  return (
    <div className="flex h-full min-h-[480px] w-full flex-col xl:flex-row">
      <aside className="hidden shrink-0 border-b border-border bg-muted/20 xl:flex xl:w-[200px] xl:flex-col xl:border-b-0 xl:border-r">
        <Skeleton className="mx-3 mt-2 h-3 w-12" />
        <div className="space-y-2 px-2.5 py-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="aspect-video w-full rounded-md" />
          ))}
        </div>
      </aside>

      <section className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="flex shrink-0 items-center gap-2 border-b border-border px-3 py-2 sm:px-4">
          <Skeleton className="h-8 w-8 shrink-0" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <Skeleton className="h-4 w-48 max-w-full" />
            <Skeleton className="h-3 w-32" />
          </div>
          <div className="flex gap-1">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-8" />
            ))}
          </div>
        </div>

        <div className="flex min-h-0 flex-1 items-center justify-center bg-muted/10 p-4">
          <Skeleton className="aspect-video w-full max-w-3xl rounded-lg" />
        </div>

        <div className="border-t border-border px-3 py-2 xl:hidden">
          <div className="flex gap-2 overflow-hidden">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-24 shrink-0 rounded-md" />
            ))}
          </div>
        </div>
      </section>

      <aside className="hidden w-[320px] shrink-0 border-l border-border bg-muted/10 xl:block">
        <div className="space-y-4 p-4">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-32 w-full" />
        </div>
      </aside>
    </div>
  );
}

export function ExportPanelSkeleton() {
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <div>
        <Skeleton className="mb-4 h-9 w-36" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="aspect-video w-full rounded-md" />
          ))}
        </div>
      </div>
      <div className="space-y-5">
        <div className="rounded-lg border border-border p-6">
          <div className="space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-11 w-full" />
            <Skeleton className="mx-auto h-9 w-40" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function DataPreviewSkeleton() {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border p-6">
        <div className="space-y-4">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-3 w-48" />
          <div className="flex flex-wrap gap-1.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-6 w-20" />
            ))}
          </div>
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    </div>
  );
}

export function CommentsSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-16 w-full rounded-md" />
      <Skeleton className="h-16 w-full rounded-md" />
    </div>
  );
}
