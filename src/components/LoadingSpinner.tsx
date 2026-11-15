import { Loading02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  text?: string;
}

export const LoadingSpinner = ({
  className,
  size = "md",
  text = "Loading...",
}: LoadingSpinnerProps) => {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-8 w-8",
    lg: "h-12 w-12",
  };

  return (
    // role="status" announces the text politely; with no text it still says
    // "Loading". Reduced motion slows the spin rather than stopping it, so it
    // still reads as busy.
    <div
      role="status"
      className={cn(
        "flex flex-col items-center justify-center gap-4",
        className,
      )}
    >
      <HugeiconsIcon
        icon={Loading02Icon}
        aria-hidden="true"
        className={cn(
          "text-primary animate-spin motion-reduce:animate-[spin_3s_linear_infinite]",
          sizeClasses[size],
        )}
      />
      {text ? (
        <p className="text-muted-foreground text-sm">{text}</p>
      ) : (
        <span className="sr-only">Loading</span>
      )}
    </div>
  );
};
