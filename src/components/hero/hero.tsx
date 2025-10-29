import { Button } from "@/components/ui/button";
import Link from "next/link";
import { BackgroundPattern } from "./background-pattern";
import { DemoDashboard } from "@/components/DemoDashboard";

const Hero = () => {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0">
        <BackgroundPattern />
      </div>

      <div className="relative z-10 mx-auto flex max-w-4xl items-center justify-center px-6 pt-12 !pb-0 md:px-12 md:pt-42">
        <div className="text-center">
          <div className="bg-primary/10 dark:bg-primary/20 mb-6 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium">
            <span className="relative flex h-2 w-2">
              <span className="bg-primary absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"></span>
              <span className="bg-primary relative inline-flex h-2 w-2 rounded-full"></span>
            </span>
            Beta release!
          </div>

          <h1 className="mb-6 text-5xl font-bold tracking-tight sm:text-6xl md:text-7xl">
            Professional Invoicing with{" "}
            <span className="text-primary">Caley</span>
          </h1>

          <p className="text-muted-foreground mx-auto mt-6 max-w-2xl text-lg md:text-xl">
            Streamline your billing with an intelligent invoicing system. Track
            overtime, manage expenses, and generate professional PDFs in
            seconds.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button asChild size="lg" className="px-8 text-base">
              <Link href="/auth/signup">Get Started Free</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="px-8 text-base"
            >
              <Link href="/auth/signin">Sign In</Link>
            </Button>
          </div>

          <p className="text-muted-foreground mt-6 text-sm">
            No credit card required • Free forever • Cancel anytime
          </p>

          {/* App Demo Dashboard */}
          <div className="mx-auto mt-16 w-full max-w-6xl">
            <div className="glossy-frame p-0">
              <DemoDashboard />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
