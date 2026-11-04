import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import type { HoldRank } from "@/lib/holds";

/** A pencil as the API returns it */
export type Hold = {
  id: string;
  showName: string;
  /** yyyy-mm-dd, sorted */
  dates: string[];
  rank: HoldRank;
  invoiceId: string | null;
  client: { id: string; name: string };
  invoice: { id: string; invoiceNumber: string; status: string } | null;
};

export type HoldInput = {
  clientId: string;
  showName: string;
  dates: string[];
  rank: HoldRank;
};

const request = async <T>(url: string, init?: RequestInit): Promise<T> => {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error ?? "Request failed");
  }
  return res.json();
};

export const useHolds = () =>
  useQuery({
    queryKey: ["holds"],
    queryFn: () => request<Hold[]>("/api/holds"),
  });

export const useSaveHold = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: HoldInput & { id?: string }) =>
      id
        ? request<Hold>(`/api/holds/${id}`, {
            method: "PATCH",
            body: JSON.stringify(input),
          })
        : request<Hold>("/api/holds", {
            method: "POST",
            body: JSON.stringify(input),
          }),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["holds"] });
      toast.success(id ? "Pencil updated" : "Pencilled in");
    },
    onError: (error: Error) => toast.error(error.message),
  });
};

/** Releasing a 1st moves the 2nds on its dates up; the toast says who */
export const useReleaseHold = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (hold: Hold) =>
      request<{ promoted: string[] }>(`/api/holds/${hold.id}`, {
        method: "DELETE",
      }),
    onSuccess: ({ promoted }, hold) => {
      const holds = queryClient.getQueryData<Hold[]>(["holds"]) ?? [];
      const names = holds
        .filter((h) => promoted.includes(h.id))
        .map((h) => h.showName);
      queryClient.invalidateQueries({ queryKey: ["holds"] });
      toast.success(
        hold.invoiceId
          ? `${hold.showName} is off the diary. Its invoice stays.`
          : names.length > 0
            ? `${hold.showName} released. ${names.join(" and ")} moved up to 1st.`
            : `${hold.showName} released. Its dates are free again.`,
      );
    },
    onError: (error: Error) => toast.error(error.message),
  });
};
