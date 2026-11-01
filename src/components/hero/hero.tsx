import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

import { BackgroundPattern } from "./background-pattern";
import { CaleyDemo } from "./caley-demo";

// The entrance is decorative and lives in CSS (`rise-in`, globals.css), so the
// headline and CTAs are painted by the server HTML rather than waiting on
// hydration. `prefers-reduced-motion` is honoured by the utility itself.
const Hero = () => (
  <section className="relative overflow-hidden">
    <div className="absolute inset-0 z-0">
      <BackgroundPattern />
    </div>

    <div className="rise-in relative z-10 mx-auto flex flex-col items-center justify-center px-6 pt-20 pb-12 md:px-12 md:pt-28">
      <div className="mx-auto w-full max-w-4xl text-center">
        <h1 className="text-5xl leading-[1.05] font-bold tracking-tight text-balance sm:text-6xl md:text-7xl">
          Invoicing for{" "}
          <span className="text-primary whitespace-nowrap">film and TV</span>{" "}
          freelancers.
        </h1>

        <p className="text-muted-foreground mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-pretty md:text-xl">
          Log day rates, overtime, and per diems for every show you work on,
          then send a branded PDF in under a minute.
        </p>

        <div className="mx-auto mt-8 flex w-full max-w-xs flex-col items-stretch justify-center gap-3 sm:max-w-none sm:flex-row sm:items-center sm:gap-4">
          <Button
            size="lg"
            className="h-12 rounded-lg px-8 text-base"
            nativeButton={false}
            render={
              <Link href="/auth/signup">
                Create your first invoice
                <HugeiconsIcon icon={ArrowRight01Icon} className="h-4 w-4" />
              </Link>
            }
          />
          <Button
            variant="outline"
            size="lg"
            className="bg-card/70 hover:bg-muted h-12 rounded-lg px-8 text-base backdrop-blur-sm"
            nativeButton={false}
            render={<Link href="/auth/signin">Sign in</Link>}
          />
        </div>

        <p className="text-muted-foreground mt-6 text-sm">
          Free while Caley is in beta. No card required.
        </p>
      </div>

      {/* The hero's visual anchor: Caley's editor painting a job, animated
          (Stageshow). `inert` because it is a picture of the product, not the
          product; everyone else gets the hero copy above, which says the same
          thing. The page is its ground, so there is no plate behind it. */}
      <div
        className="rise-in mx-auto mt-10 w-full max-w-5xl [--rise-delay:0.25s] [--rise-distance:40px] [--rise-duration:1s]"
        inert
      >
        <CaleyDemo />
      </div>
    </div>
  </section>
);

export default Hero;
