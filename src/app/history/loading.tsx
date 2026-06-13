import { ListCardsSkeleton } from "@/components/loading-states";

export default function HistoryLoading() {
  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 space-y-2">
        <div className="h-10 w-48 animate-pulse rounded-md bg-muted" />
        <div className="h-4 w-72 animate-pulse rounded-md bg-muted" />
      </div>
      <ListCardsSkeleton count={4} />
    </div>
  );
}
