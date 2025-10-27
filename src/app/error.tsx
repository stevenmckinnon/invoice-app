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
    <div className="min-h-[100dvh] flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full border-2">
        <CardContent className="pt-12 pb-12">
          <div className="flex flex-col items-center text-center space-y-8">
            {/* Icon Section */}
            <div className="relative">
              <div className="absolute inset-0 bg-destructive/10 dark:bg-destructive/5 blur-3xl rounded-full" />
              <div className="relative bg-muted/50 dark:bg-muted/20 rounded-full p-8 border-2 border-dashed border-destructive/20">
                <AlertTriangle
                  className="h-24 w-24 text-destructive"
                  strokeWidth={1.5}
                />
              </div>
            </div>

            {/* Error Message */}
            <div className="space-y-4">
              <div className="space-y-2">
                <h1 className="text-4xl font-bold bg-gradient-to-br from-destructive via-destructive/80 to-destructive/60 bg-clip-text text-transparent">
                  Something Went Wrong
                </h1>
                <h2 className="text-xl font-semibold tracking-tight">
                  Unexpected Error
                </h2>
              </div>
              <p className="text-muted-foreground max-w-md mx-auto">
                We encountered an unexpected error while processing your
                request. Don&apos;t worry, our team has been notified and
                we&apos;re working on it!
              </p>
              {error.digest && (
                <p className="text-xs text-muted-foreground/70 font-mono">
                  Error ID: {error.digest}
                </p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
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
