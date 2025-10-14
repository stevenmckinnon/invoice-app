import { Button } from "@/components/ui/button";
import Link from "next/link";
import WWELogo from "../WWELogo";
import { BackgroundPattern } from "./background-pattern";

const Hero = () => {
  return (
    <section className="flex items-center justify-center p-6 py-12 md:p-12 md:py-24 relative">
      <BackgroundPattern />

      <div className="relative z-10 text-center max-w-3xl">
        <div className="flex justify-center mb-6">
          <WWELogo className="h-24 w-24" />
        </div>
        <h1 className="mt-6 text-4xl sm:text-5xl md:text-6xl md:leading-[1.2] font-semibold tracking-tighter">
          WWE Invoice Management
        </h1>
        <p className="mt-6 md:text-lg">
          Create, manage, and track invoices with ease. Built for WWE
          freelancers.
        </p>
        <div className="mt-12 flex items-center justify-center gap-4">
          <Button asChild size="lg">
            <Link href="/auth/signup">Get Started</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/auth/signin">Sign In</Link>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default Hero;
