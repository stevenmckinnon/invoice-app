"use client";
import { ArrowRight } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";

import { DemoDashboard } from "@/components/DemoDashboard";
import { Button } from "@/components/ui/button";

import { BackgroundPattern } from "./background-pattern";

const Hero = () => {
  // The entrance is decorative: with reduced motion the hero and the dashboard
  // below it render in place rather than fading and tilting in.
  const reduceMotion = useReducedMotion();

  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 z-0">
        <BackgroundPattern />
      </div>

      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={
          reduceMotion
            ? { duration: 0 }
            : { duration: 0.8, ease: [0.16, 1, 0.3, 1] }
        }
        className="relative z-10 mx-auto flex flex-col items-center justify-center px-6 pt-24 pb-12 md:px-12 md:pt-36"
      >
        <div className="mx-auto w-full max-w-4xl text-center">
          <h1 className="text-5xl leading-[1.05] font-bold tracking-tight sm:text-6xl md:text-7xl">
            Invoicing for <span className="text-primary">film and TV</span>{" "}
            freelancers.
          </h1>

          <p className="text-muted-foreground mx-auto mt-8 max-w-2xl text-lg leading-relaxed md:text-xl">
            Log day rates, overtime, and per diems for every show you work on,
            then send a branded PDF in under a minute.
          </p>

          <div className="mx-auto mt-10 flex w-full max-w-xs flex-col items-stretch justify-center gap-3 sm:max-w-none sm:flex-row sm:items-center sm:gap-4">
            <Button
              asChild
              size="lg"
              className="h-12 rounded-lg px-8 text-base"
            >
              <Link href="/auth/signup">
                Create your first invoice
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="bg-card/70 hover:bg-muted h-12 rounded-lg px-8 text-base backdrop-blur-sm"
            >
              <Link href="/auth/signin">Sign in</Link>
            </Button>
          </div>

          <p className="text-muted-foreground mt-8 text-sm">
            Free while Caley is in beta. No card required.
          </p>
        </div>

        {/* App Demo Dashboard */}
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 40, rotateX: 10 }}
          animate={{ opacity: 1, y: 0, rotateX: 0 }}
          transition={
            reduceMotion
              ? { duration: 0 }
              : { delay: 0.3, duration: 1, type: "spring", stiffness: 80 }
          }
          style={{ perspective: "1000px" }}
          className="mx-auto mt-20 w-full max-w-3xl"
        >
          <div className="relative">
            <div className="bg-primary/20 absolute -inset-1 rounded-3xl opacity-50 blur-xl transition-opacity duration-500 group-hover:opacity-100" />
            <DemoDashboard />
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
};

export default Hero;
