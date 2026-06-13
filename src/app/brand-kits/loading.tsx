import { ListCardsSkeleton } from "@/components/loading-states";

export default function BrandKitsLoading() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-8 space-y-2">
        <div className="h-10 w-44 animate-pulse rounded-md bg-muted" />
        <div className="h-4 w-96 animate-pulse rounded-md bg-muted" />
      </div>
      <ListCardsSkeleton count={3} />
    </div>
  );
}
