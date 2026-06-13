"use client";

import * as React from "react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useInstantPending } from "@/lib/use-instant-pending";

interface ActionButtonProps extends ButtonProps {
  loading?: boolean;
  loadingText?: React.ReactNode;
  /** When false, spinner shows only once `loading` is true (default). */
  instantFeedback?: boolean;
}

export const ActionButton = React.forwardRef<HTMLButtonElement, ActionButtonProps>(
  (
    {
      loading = false,
      loadingText,
      instantFeedback = false,
      disabled,
      onClick,
      children,
      ...props
    },
    ref
  ) => {
    const { pending: instantPending, run } = useInstantPending(loading);
    const showLoading = loading || (instantFeedback && instantPending);

    return (
      <Button
        ref={ref}
        disabled={disabled || showLoading}
        aria-busy={showLoading}
        onClick={(event) => {
          if (disabled || showLoading) return;
          if (instantFeedback) {
            run(() => onClick?.(event));
          } else {
            onClick?.(event);
          }
        }}
        {...props}
      >
        {showLoading ? (
          <>
            <Spinner size="sm" className="gap-0" />
            {loadingText ?? children}
          </>
        ) : (
          children
        )}
      </Button>
    );
  }
);
ActionButton.displayName = "ActionButton";
