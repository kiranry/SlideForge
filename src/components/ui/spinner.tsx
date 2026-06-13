import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const sizeClasses = {
  sm: "h-3.5 w-3.5",
  md: "h-4 w-4",
  lg: "h-8 w-8",
} as const;

type SpinnerSize = keyof typeof sizeClasses;

interface SpinnerProps {
  className?: string;
  size?: SpinnerSize;
  label?: string;
}

export function Spinner({ className, size = "md", label }: SpinnerProps) {
  return (
    <span
      role="status"
      className={cn("inline-flex items-center gap-2", className)}
    >
      <Loader2
        className={cn("animate-spin text-muted-foreground", sizeClasses[size])}
        aria-hidden
      />
      {label ? (
        <span className="text-sm text-muted-foreground">{label}</span>
      ) : null}
      <span className="sr-only">{label ?? "Loading"}</span>
    </span>
  );
}

interface PageLoadingProps {
  label?: string;
  className?: string;
}

export function PageLoading({
  label = "Loading…",
  className,
}: PageLoadingProps) {
  return (
    <div
      className={cn(
        "flex min-h-[40vh] flex-col items-center justify-center gap-3 p-10",
        className
      )}
    >
      <Spinner size="lg" />
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

interface LoadingOverlayProps {
  open: boolean;
  label?: string;
}

export function LoadingOverlay({
  open,
  label = "Working…",
}: LoadingOverlayProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-background/92 backdrop-blur-[1px]"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex flex-col items-center gap-3 px-6 text-center">
        <Spinner size="lg" className="gap-0 [&_svg]:text-primary" />
        <p className="max-w-xs text-sm text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}
