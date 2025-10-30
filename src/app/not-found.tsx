import { Home } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="flex flex-col items-center space-y-8 text-center">
          {/* Icon/Logo Section */}
          <div className="relative">
            <div className="bg-primary/10 dark:bg-primary/5 absolute inset-0 rounded-full blur-3xl" />
            <div className="bg-muted/50 dark:bg-muted/20 border-primary/20 relative flex h-40 w-40 items-center justify-center overflow-hidden rounded-full border-2 border-dashed">
              <Image
                src="/lost.gif"
                alt="Lost"
                width={200}
                height={200}
                className="h-full max-h-40 w-full max-w-40 object-cover"
              />
            </div>
          </div>

          {/* Error Message */}
          <div className="space-y-4">
            <div className="space-y-2">
              <h1 className="from-primary via-primary/80 to-primary/60 bg-gradient-to-br bg-clip-text text-7xl font-bold text-transparent">
                404
              </h1>
              <h2 className="text-2xl font-semibold tracking-tight">
                Page Not Found
              </h2>
            </div>
            <p className="text-muted-foreground mx-auto max-w-md">
              Oops! The page you&apos;re looking for seems to have wandered off.
              It might have been moved, deleted, or perhaps it never existed.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <Button asChild size="lg" className="gap-2">
              <Link href="/">
                <Home className="h-4 w-4" />
                Back to Home
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
