"use client";
import { ArrowRight, Sparkles } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";

import { DemoDashboard } from "@/components/DemoDashboard";
import { Button } from "@/components/ui/button";

import { BackgroundPattern } from "./background-pattern";

const Hero = () => {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 z-0">
        <BackgroundPattern />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 mx-auto flex flex-col items-center justify-center px-6 pt-24 pb-12 md:px-12 md:pt-36"
      >
        <div className="mx-auto w-full max-w-4xl text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="mb-8 inline-flex"
          >
            <div className="bg-background/50 border-border/50 hover:bg-muted/50 relative inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-medium shadow-sm backdrop-blur-md transition-colors">
              <span className="flex h-2 w-2">
                <span className="bg-primary absolute inline-flex h-2 w-2 animate-ping rounded-full opacity-75"></span>
                <span className="bg-primary relative inline-flex h-2 w-2 rounded-full"></span>
              </span>
              <span className="text-muted-foreground flex items-center gap-1">
                Beta Release! 🚀
              </span>
            </div>
          </motion.div>

          <h1 className="font-oswald from-foreground to-muted-foreground bg-gradient-to-b bg-clip-text text-5xl leading-tight font-bold tracking-tight text-transparent sm:text-6xl md:text-7xl lg:text-8xl">
            Professional Invoicing <br />
            <span className="text-primary relative inline-block">
              with Caley
              <motion.svg
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.5 }}
                className="text-primary/20 absolute -bottom-2 left-0 w-full"
                viewBox="0 0 100 10"
                preserveAspectRatio="none"
              >
                <motion.path
                  d="M0 5 Q 50 10 100 5"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ delay: 0.5, duration: 0.8, ease: "easeOut" }}
                />
              </motion.svg>
            </span>
          </h1>

          <p className="text-muted-foreground mx-auto mt-8 max-w-2xl text-lg leading-relaxed md:text-xl">
            Streamline your billing with an intelligent invoicing system. Track
            overtime, manage expenses, and generate professional PDFs in
            seconds.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button
              asChild
              size="lg"
              className="bg-primary hover:bg-primary/90 hover:shadow-primary/25 h-12 rounded-full px-8 text-base shadow-lg transition-all hover:scale-105"
            >
              <Link href="/auth/signup">
                Get Started Free
                <Sparkles className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="bg-background/50 hover:bg-muted h-12 rounded-full px-8 text-base backdrop-blur-sm transition-all hover:scale-105"
            >
              <Link href="/auth/signin">Sign In</Link>
            </Button>
          </div>

          <p className="text-muted-foreground mt-8 text-sm font-medium">
            No credit card required • Free forever • Cancel anytime
          </p>
        </div>

        {/* App Demo Dashboard */}
        <motion.div
          initial={{ opacity: 0, y: 40, rotateX: 10 }}
          animate={{ opacity: 1, y: 0, rotateX: 0 }}
          transition={{
            delay: 0.3,
            duration: 1,
            type: "spring",
            stiffness: 80,
          }}
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
