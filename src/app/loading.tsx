import { HugeiconsIcon } from "@hugeicons/react";
import { Loading02Icon } from "@hugeicons/core-free-icons";

export default function Loading() {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4">
      <HugeiconsIcon icon={Loading02Icon} className="text-primary h-12 w-12 animate-spin" />
      <p className="text-muted-foreground text-sm">Loading...</p>
    </div>
  );
}
