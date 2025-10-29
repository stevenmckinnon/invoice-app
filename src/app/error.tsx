"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Home, RefreshCcw, AlertTriangle } from "lucide-react";
import CaleyLogo from "@/components/CaleyLogo";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[100dvh] items-center justify-center p-4">
      <Card className="w-full max-w-2xl border-2">
        <CardContent className="pt-12 pb-12">
          <div className="flex flex-col items-center space-y-8 text-center">
            {/* Icon Section */}
            <div className="relative">
              <div className="bg-destructive/10 dark:bg-destructive/5 absolute inset-0 rounded-full blur-3xl" />
              <div className="bg-muted/50 dark:bg-muted/20 border-destructive/20 relative rounded-full border-2 border-dashed p-8">
                <AlertTriangle
                  className="text-destructive h-24 w-24"
                  strokeWidth={1.5}
                />
              </div>
            </div>

            {/* Error Message */}
            <div className="space-y-4">
              <div className="space-y-2">
                <h1 className="from-destructive via-destructive/80 to-destructive/60 bg-gradient-to-br bg-clip-text text-4xl font-bold text-transparent">
                  Something Went Wrong
                </h1>
                <h2 className="text-xl font-semibold tracking-tight">
                  Unexpected Error
                </h2>
              </div>
              <p className="text-muted-foreground mx-auto max-w-md">
                We encountered an unexpected error while processing your
                request. Don&apos;t worry, our team has been notified and
                we&apos;re working on it!
              </p>
              {error.digest && (
                <p className="text-muted-foreground/70 font-mono text-xs">
                  Error ID: {error.digest}
                </p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <Button onClick={reset} size="lg" className="gap-2">
                <RefreshCcw className="h-4 w-4" />
                Try Again
              </Button>
              <Button asChild variant="outline" size="lg" className="gap-2">
                <Link href="/">
                  <Home className="h-4 w-4" />
                  Back to Home
                </Link>
              </Button>
            </div>

            {/* Decorative Element */}
            <div className="pt-8 opacity-50">
              <CaleyLogo className="h-8" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
