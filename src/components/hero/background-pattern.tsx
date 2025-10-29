"use client";

import DotPattern from "@/components/ui/dot-pattern";
import Particles from "@/components/ui/particles";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";

export const BackgroundPattern = () => {
  const { resolvedTheme } = useTheme();
  const isLightTheme = resolvedTheme === "light";

  return (
    <>
      <DotPattern
        width={20}
        height={20}
        cx={1}
        cy={1}
        cr={1}
        className={cn(
          "h-full w-full mask-[radial-gradient(ellipse,rgba(0,0,0,0.3)_30%,black_50%)]",
          "dark:fill-slate-700",
        )}
      />
      <Particles
        className="absolute inset-0 h-full w-full"
        quantity={100}
        ease={80}
        color={isLightTheme ? "#000" : "#fff"}
        refresh
      />
    </>
  );
};
