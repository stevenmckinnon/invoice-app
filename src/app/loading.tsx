import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4">
      <Loader2 className="text-primary h-12 w-12 animate-spin" />
      <p className="text-muted-foreground text-sm">Loading...</p>
    </div>
  );
}
