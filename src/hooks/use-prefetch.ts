import { useQueryClient } from "@tanstack/react-query";

import { fetchClients } from "@/hooks/use-clients";
import { fetchInvoices } from "@/hooks/use-invoices";

/**
 * Warm the React Query cache before navigation (hover/touch on nav links)
 * so list pages render with data instead of skeletons. prefetchQuery is a
 * no-op when cached data is still fresh.
 */
export const usePrefetchAppData = () => {
  const queryClient = useQueryClient();

  const prefetchInvoices = () =>
    queryClient.prefetchQuery({
      queryKey: ["invoices"],
      queryFn: fetchInvoices,
    });

  const prefetchClients = () =>
    queryClient.prefetchQuery({
      queryKey: ["clients"],
      queryFn: fetchClients,
    });

  return { prefetchInvoices, prefetchClients };
};
