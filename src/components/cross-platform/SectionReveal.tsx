"use client";

import * as React from "react";

import { type MotionProps, motion, useReducedMotion } from "motion/react";

type SectionRevealProps = React.ComponentProps<"div"> & {
  delay?: number;
  y?: number;
  duration?: number;
  once?: boolean;
} & MotionProps;

const SectionReveal: React.FC<SectionRevealProps> = ({
  children,
  className,
  delay = 0,
  y = 20,
  duration = 0.4,
  once = true,
  ...rest
}) => {
  // Reveals are decorative: with reduced motion, show the content outright
  // rather than sliding or staggering it in.
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, amount: 0.2 }}
      transition={
        reduceMotion
          ? { duration: 0 }
          : { duration, ease: "easeOut", delay }
      }
      className={className}
      {...rest}
    >
      {children}
    </motion.div>
  );
};

export { SectionReveal };
