"use client";
import { useEffect } from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export const Providers = ({ children }: { children: React.ReactNode }) => {
  useEffect(() => {
    // @ts-expect-error: 'standalone' is a non-standard property used on iOS Safari
    if (window.navigator.standalone === true) {
      import("pulltorefreshjs").then(({ default: PullToRefresh }) => {
        PullToRefresh.init({
          mainElement: "body",
          onRefresh() {
            window.location.reload();
          },
        });
      });
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <TooltipProvider>{children}</TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};
