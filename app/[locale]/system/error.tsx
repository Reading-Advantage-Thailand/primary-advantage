"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function SystemError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="space-y-3">
          <h1 className="text-4xl font-bold tracking-tighter">
            Something went wrong
          </h1>
          <p className="text-muted-foreground">
            An error occurred while loading this page. Please try again.
          </p>
        </div>
        <Button onClick={reset} variant="default">
          Try again
        </Button>
      </div>
    </div>
  );
}
