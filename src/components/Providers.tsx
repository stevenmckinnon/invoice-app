"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import PullToRefresh from "pulltorefreshjs";

import { ThemeProvider } from "@/components/theme-provider";

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
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        {children}
      </ThemeProvider>
    </QueryClientProvider>
  );
};
