"use client";
import PullToRefresh from "pulltorefreshjs";

import { ThemeProvider } from "@/components/theme-provider";

export const Providers = ({ children }: { children: React.ReactNode }) => {
  // if we're on iOS in standalone mode, add support for pull to refresh
  const isInWebAppiOS =
    typeof window !== "undefined" &&
    // @ts-expect-error: 'standalone' is a non-standard property used on iOS Safari
    window.navigator.standalone === true;
  if (isInWebAppiOS) {
    PullToRefresh.init({
      mainElement: "body",
      onRefresh() {
        window.location.reload();
      },
    });
  }

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </ThemeProvider>
  );
};
