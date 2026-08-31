import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";

import { DemoDashboard } from "@/components/DemoDashboard";
import { Button } from "@/components/ui/button";

import { BackgroundPattern } from "./background-pattern";

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

      {/* App Demo Dashboard — the hero's visual anchor, so it is pulled up into
          the first viewport rather than parked below it, and widened to
          `max-w-5xl` so its figures read at a glance. The spacing above is
          tuned so the revenue total and all three stat tiles clear the fold at
          1280x800; what falls below is the Breakdown pair, which the component
          already treats as its most expendable content.

          No bottom fade mask: the viewport edge is already a deliberate crop,
          and masking the mockup dissolved the `glossy-frame` and cut through
          the Breakdown cards mid-row, which read as a rendering fault rather
          than an intentional ending.

          `inert` because it is a picture of the product, not the product: it
          used to put a live "Create Invoice" <button> into the tab order that
          went nowhere, and its own headings into the document outline. Sighted
          users get the mockup; everyone else gets the hero copy above, which
          says the same thing. */}
      <div
        className="rise-in mx-auto mt-10 w-full max-w-5xl [--rise-delay:0.25s] [--rise-distance:40px] [--rise-duration:1s]"
        inert
      >
        <div className="relative">
          <div className="bg-primary/20 absolute -inset-1 rounded-3xl opacity-50 blur-xl" />
          <DemoDashboard />
        </div>
      </div>
    </div>
  </section>
);

export default Hero;
