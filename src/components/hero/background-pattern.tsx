import DotPattern from "@/components/ui/dot-pattern";
import { cn } from "@/lib/utils";

/**
 * One texture, not two. This used to layer an animated <Particles> canvas over
 * the dot grid; the particles carried no mask, so they drifted across the hero
 * headline and subtext and cost a rAF loop on mobile for the privilege.
 *
 * The mask clears the middle of the ellipse entirely, so the copy and the CTAs
 * sit on flat canvas and the grid only frames them.
 */
export const BackgroundPattern = () => (
  <DotPattern
    width={20}
    height={20}
    cx={1}
    cy={1}
    cr={1}
    className={cn(
      "h-full w-full mask-[radial-gradient(ellipse_at_center,transparent_35%,black_78%)]",
      "dark:fill-slate-700",
    )}
  />
);
