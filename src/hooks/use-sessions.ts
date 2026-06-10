import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export type AuthSession = {
  id: string;
  createdAt: string;
  expiresAt: string;
  ipAddress: string | null;
  userAgent: string | null;
  token: string;
};

export const fetchSessions = async (): Promise<AuthSession[]> => {
  const res = await fetch("/api/sessions");
  if (!res.ok) {
    throw new Error("Failed to fetch sessions");
  }
  return res.json();
};

export const useSessions = () => {
  return useQuery({
    queryKey: ["sessions"],
    queryFn: fetchSessions,
  });
};

export const useRevokeSession = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sessionId: string): Promise<void> => {
      const res = await fetch("/api/sessions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Request failed" }));
        throw new Error(err.error ?? "Failed to revoke session");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      toast.success("Session revoked successfully");
    },
    onError: (error: Error) => {
      toast.error("Failed to revoke session", {
        description: error.message,
      });
    },
  });
};
