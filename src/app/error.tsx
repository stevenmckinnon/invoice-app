"use client";

import { useEffect } from "react";

import { Alert01Icon, Home01Icon, Refresh01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // No error reporting service is wired up yet — this only reaches the
    // browser console, which is why the copy below doesn't promise otherwise.
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="flex items-center justify-center p-4 pt-28">
      <Card className="w-full max-w-lg">
        <CardContent className="flex flex-col items-center px-6 py-6 text-center">
          <div
            className="bg-destructive/10 text-destructive mb-6 flex size-16 items-center justify-center rounded-2xl"
            aria-hidden="true"
          >
            <HugeiconsIcon icon={Alert01Icon} className="size-7" />
          </div>

          <h1 className="text-2xl font-bold tracking-tight">
            Something went wrong
          </h1>
          <p className="text-muted-foreground mt-2 max-w-sm text-sm text-pretty">
            This page didn&apos;t load. Trying again usually sorts it.
          </p>

          {error.digest && (
            <p className="text-muted-foreground mt-4 font-mono text-xs">
              Error ID: {error.digest}
            </p>
          )}

          <div className="mt-7 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <Button onClick={reset}>
              <HugeiconsIcon icon={Refresh01Icon} />
              Try again
            </Button>
            <Button asChild variant="outline">
              <Link href="/">
                <HugeiconsIcon icon={Home01Icon} />
                Back to home
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
