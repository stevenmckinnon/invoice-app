import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import type { Client } from "@/components/ClientSelector";

const fetchClients = async (): Promise<Client[]> => {
  const res = await fetch("/api/clients");
  if (!res.ok) {
    throw new Error("Failed to fetch clients");
  }
  return res.json();
};

export const useClients = () => {
  return useQuery({
    queryKey: ["clients"],
    queryFn: fetchClients,
  });
};

const deleteClient = async (id: string): Promise<void> => {
  const res = await fetch(`/api/clients/${id}`, {
    method: "DELETE",
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error ?? "Failed to delete client");
  }
};

export const useDeleteClient = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteClient,
    onSuccess: () => {
      // Invalidate and refetch clients after successful deletion
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Client deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete client");
    },
  });
};

export const useCreateClient = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (clientData: Omit<Client, "id" | "createdAt" | "updatedAt">) => {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(clientData),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Request failed" }));
        throw new Error(err.error ?? "Failed to create client");
      }

      return res.json() as Promise<Client>;
    },
    onSuccess: () => {
      // Invalidate and refetch clients after successful creation
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Client created successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create client");
    },
  });
};

