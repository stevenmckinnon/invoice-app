"use client";
import { useEffect, useState } from "react";

import CaleyLogo from "@/components/CaleyLogo";
import { useSession } from "@/lib/auth-client";

interface SignInSuccessAnimationProps {
  onComplete: () => void;
}

export function SignInSuccessAnimation({
  onComplete,
}: SignInSuccessAnimationProps) {
  const [isVisible, setIsVisible] = useState(false);
  const { data: session } = useSession();
  const userName = session?.user?.name?.split(" ")?.[0];

  useEffect(() => {
    // Trigger animation
    setTimeout(() => setIsVisible(true), 50);

    // Complete after animation duration (wait for all animations to finish + a brief pause)
    // Last animation starts at 600ms delay and has 500ms duration, so completes at 1100ms
    // Add 400ms pause to let user see the completed animation
    const timer = setTimeout(() => {
      onComplete();
    }, 1500);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="bg-background fixed inset-0 z-50 flex items-center justify-center">
      <div
        className={`flex flex-col items-center justify-center gap-6 transition-all duration-700 ${
          isVisible ? "scale-100 opacity-100" : "scale-95 opacity-0"
        }`}
      >
        {/* Logo with checkmark animation */}
        <div className="relative">
          <div
            className={`transition-all duration-500 ${
              isVisible ? "scale-100 opacity-100" : "scale-90 opacity-0"
            }`}
          >
            <CaleyLogo className="h-32 w-32" />
          </div>
        </div>

        {/* Success message */}
        <div
          className={`text-center transition-all duration-500 ${
            isVisible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
          }`}
          style={{
            transitionDelay: isVisible ? "600ms" : "0ms",
          }}
        >
          <h2 className="text-2xl font-bold">Welcome back, {userName}!</h2>
          <p className="text-muted-foreground mt-2 text-sm">
            Taking you to your dashboard...
          </p>
        </div>
      </div>
    </div>
  );
}
