import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export type Invoice = {
  id: string;
  invoiceNumber: string;
  invoiceDate: Date | string;
  showName: string;
  fullName: string;
  clientName: string | null;
  totalAmount: number;
  status: string;
  createdAt: Date | string;
};

const fetchInvoices = async (): Promise<Invoice[]> => {
  const res = await fetch("/api/invoices");
  if (!res.ok) {
    throw new Error("Failed to fetch invoices");
  }
  return res.json();
};

export const useInvoices = () => {
  return useQuery({
    queryKey: ["invoices"],
    queryFn: fetchInvoices,
  });
};

// Fetch single invoice with relations
export type InvoiceWithRelations = {
  id: string;
  invoiceNumber: string;
  invoiceDate: Date | string;
  showName: string;
  fullName: string;
  email: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string | null;
  postalCode: string;
  country: string;
  clientId: string | null;
  clientName: string | null;
  clientAddress1: string | null;
  clientAddress2: string | null;
  clientCity: string | null;
  clientState: string | null;
  clientPostalCode: string | null;
  clientCountry: string | null;
  attentionTo: string | null;
  iban: string;
  swiftBic: string;
  accountNumber: string | null;
  sortCode: string | null;
  bankAddress: string | null;
  dateOfBirth: Date | string | null;
  currency: string;
  regularHours: number;
  overtimeHours: number;
  regularRate: number;
  overtimeRate: number;
  perDiemDays: number;
  perDiemRate: number;
  travelDays: number;
  travelDayRate: number;
  subtotalLabor: number;
  subtotalPerDiem: number;
  subtotalTravel: number;
  totalAmount: number;
  status: string;
  notes: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  userId: string;
  items: Array<{
    id: string;
    description: string;
    quantity: number;
    unitPrice: number;
    cost: number;
    invoiceId: string;
    createdAt: Date | string;
    updatedAt: Date | string;
  }>;
  overtimeEntries: Array<{
    id: string;
    date: Date | string;
    hours: number;
    rateType: string;
    description: string | null;
    invoiceId: string;
    createdAt: Date | string;
    updatedAt: Date | string;
  }>;
  customExpenseEntries: Array<{
    id: string;
    description: string;
    quantity: number;
    unitPrice: number;
    cost: number;
    invoiceId: string;
    createdAt: Date | string;
    updatedAt: Date | string;
  }>;
};

const fetchInvoice = async (id: string): Promise<InvoiceWithRelations> => {
  const res = await fetch(`/api/invoices/${id}`);
  if (!res.ok) {
    if (res.status === 404) {
      throw new Error("Invoice not found");
    }
    throw new Error("Failed to fetch invoice");
  }
  return res.json();
};

export const useInvoice = (id: string | undefined) => {
  return useQuery({
    queryKey: ["invoice", id],
    queryFn: () => fetchInvoice(id!),
    enabled: !!id,
  });
};

// Types for invoice mutations
export type CreateInvoiceInput = {
  invoiceNumber: string;
  invoiceDate: string;
  showName: string;
  fullName: string;
  email: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
  clientId?: string;
  clientName?: string;
  clientAddress1?: string;
  clientAddress2?: string;
  clientCity?: string;
  clientState?: string;
  clientPostalCode?: string;
  clientCountry?: string;
  attentionTo?: string;
  iban: string;
  swiftBic: string;
  accountNumber?: string;
  sortCode?: string;
  bankAddress?: string;
  dateOfBirth?: string;
  currency?: string;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    cost?: number;
  }>;
  overtimeEntries: Array<{
    id: string;
    date: string;
    hours: number;
    rateType: "1.5x" | "2x";
  }>;
  customExpenseEntries: Array<{
    id: string;
    description: string;
    quantity: number;
    unitPrice: number;
    cost: number;
  }>;
  status?: "draft" | "sent" | "paid" | "overdue";
  notes?: string;
};

export type UpdateInvoiceInput = CreateInvoiceInput;

type CreateInvoiceResponse = {
  id: string;
  invoiceNumber: string;
};

type UpdateInvoiceResponse = CreateInvoiceResponse;

// Create invoice mutation
export const useCreateInvoice = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateInvoiceInput): Promise<CreateInvoiceResponse> => {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Request failed" }));
        throw new Error(err.error ?? "Failed to create invoice");
      }

      return res.json();
    },
    onSuccess: (data) => {
      // Invalidate and refetch invoices after successful creation
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      // Also invalidate the single invoice query if it exists
      queryClient.invalidateQueries({ queryKey: ["invoice", data.id] });
      toast.success("Invoice created successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create invoice");
    },
  });
};

// Update invoice mutation
export const useUpdateInvoice = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: UpdateInvoiceInput;
    }): Promise<UpdateInvoiceResponse> => {
      const res = await fetch(`/api/invoices/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Request failed" }));
        throw new Error(err.error ?? "Failed to update invoice");
      }

      return res.json();
    },
    onSuccess: (_, variables) => {
      // Invalidate and refetch invoices after successful update
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      // Also invalidate the single invoice query
      queryClient.invalidateQueries({ queryKey: ["invoice", variables.id] });
      toast.success("Invoice updated successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update invoice");
    },
  });
};

// Delete invoice mutation
export const useDeleteInvoice = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const res = await fetch(`/api/invoices/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Request failed" }));
        throw new Error(err.error ?? "Failed to delete invoice");
      }
    },
    onSuccess: (_, id) => {
      // Invalidate and refetch invoices after successful deletion
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      // Remove the single invoice query from cache
      queryClient.removeQueries({ queryKey: ["invoice", id] });
      toast.success("Invoice deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete invoice");
    },
  });
};

// Update invoice status mutation
export const useUpdateInvoiceStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string;
      status: "draft" | "sent" | "paid" | "overdue";
    }): Promise<{ id: string; status: string }> => {
      const res = await fetch(`/api/invoices/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Request failed" }));
        throw new Error(err.error ?? "Failed to update invoice status");
      }

      return res.json();
    },
    onSuccess: (_, variables) => {
      // Invalidate and refetch invoices after successful status update
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      // Also invalidate the single invoice query
      queryClient.invalidateQueries({ queryKey: ["invoice", variables.id] });
      toast.success("Invoice status updated");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update invoice status");
    },
  });
};

