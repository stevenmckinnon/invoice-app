"use client";

import * as React from "react";

import { type MotionProps, motion } from "motion/react";

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
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, amount: 0.2 }}
      transition={{ duration, ease: "easeOut", delay }}
      className={className}
      {...rest}
    >
      {children}
    </motion.div>
  );
};

export { SectionReveal };
