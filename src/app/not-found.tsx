import { HugeiconsIcon } from "@hugeicons/react";
import { Home01Icon } from "@hugeicons/core-free-icons";
import Image from "next/image";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function NotFound() {
  return (
    <div className="flex items-center justify-center p-4 pt-28">
      <Card className="w-full max-w-lg">
        <CardContent className="flex flex-col items-center px-6 py-6 text-center">
          <div className="bg-muted mb-6 flex size-32 items-center justify-center overflow-hidden rounded-full">
            <Image
              src="/lost.gif"
              alt=""
              width={200}
              height={200}
              className="size-full object-cover outline outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10"
            />
          </div>

          <p className="text-muted-foreground font-mono text-sm font-medium">
            404
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">
            Page not found
          </h1>
          <p className="text-muted-foreground mt-2 max-w-sm text-sm text-pretty">
            We couldn&apos;t find that page. It may have moved, or it may never
            have existed.
          </p>

          <div className="mt-7">
            <Button asChild>
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
