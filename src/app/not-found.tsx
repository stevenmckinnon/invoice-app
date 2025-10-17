import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Home } from "lucide-react";
import WWELogo from "@/components/WWELogo";
import Image from "next/image";

export default function NotFound() {
  return (
    <div className="min-h-[calc(100dvh-64px)] flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full border-2">
        <CardContent className="pt-12 pb-12">
          <div className="flex flex-col items-center text-center space-y-8">
            {/* Icon/Logo Section */}
            <div className="relative">
              <div className="absolute inset-0 bg-primary/10 dark:bg-primary/5 blur-3xl rounded-full" />
              <div className="relative bg-muted/50 dark:bg-muted/20 rounded-full border-2 border-dashed border-primary/20 overflow-hidden w-40 h-40 flex items-center justify-center">
                <Image
                  src="/lost.gif"
                  alt="Lost"
                  width={200}
                  height={200}
                  className="object-cover w-full h-full max-w-40 max-h-40"
                />
              </div>
            </div>

            {/* Error Message */}
            <div className="space-y-4">
              <div className="space-y-2">
                <h1 className="text-7xl font-bold bg-gradient-to-br from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
                  404
                </h1>
                <h2 className="text-2xl font-semibold tracking-tight">
                  Page Not Found
                </h2>
              </div>
              <p className="text-muted-foreground max-w-md mx-auto">
                Oops! The page you&apos;re looking for seems to have wandered
                off. It might have been moved, deleted, or perhaps it never
                existed.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <Button asChild size="lg" className="gap-2">
                <Link href="/">
                  <Home className="h-4 w-4" />
                  Back to Home
                </Link>
              </Button>
            </div>

            {/* Decorative Element */}
            <div className="pt-8 opacity-50">
              <WWELogo className="h-8" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
