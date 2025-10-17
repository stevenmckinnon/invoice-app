import { Button } from "@/components/ui/button";
import Link from "next/link";
import { BackgroundPattern } from "./background-pattern";

const Hero = () => {
  return (
    <section className="flex items-center justify-center p-6 py-16 md:p-12 md:py-32 relative overflow-hidden">
      <BackgroundPattern />

      <div className="relative z-10 text-center max-w-4xl">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 dark:bg-primary/20 text-sm font-medium mb-6">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
          </span>
          Beta release!
        </div>

        <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight mb-6">
          Professional Invoicing for{" "}
          <span className="text-primary">WWE Freelancers</span>
        </h1>

        <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
          Streamline your billing with an intelligent invoicing system. Track
          overtime, manage expenses, and generate professional PDFs in seconds.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button asChild size="lg" className="text-base px-8">
            <Link href="/auth/signup">Get Started Free</Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="lg"
            className="text-base px-8"
          >
            <Link href="/auth/signin">Sign In</Link>
          </Button>
        </div>

        <p className="mt-6 text-sm text-muted-foreground">
          No credit card required • Free forever • Cancel anytime
        </p>
      </div>
    </section>
  );
};

export default Hero;
