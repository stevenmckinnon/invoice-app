"use client";
import { useState } from "react";

import { TrashIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";


interface DeleteInvoiceButtonProps {
  invoiceId: string;
  invoiceNumber?: string;
  onDeleted?: () => void;
  size?: "default" | "sm" | "lg" | "icon";
}

export const DeleteInvoiceButton = ({
  invoiceId,
  invoiceNumber,
  onDeleted,
  size = "default",
}: DeleteInvoiceButtonProps) => {
  const [open, setOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/invoices/${invoiceId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.error || "Failed to delete invoice");
      }

      setOpen(false);
      toast.success("Invoice deleted successfully", {
        description: invoiceNumber
          ? `Invoice #${invoiceNumber} has been deleted.`
          : "The invoice has been removed.",
      });

      // Call the callback to refetch invoices
      if (onDeleted) {
        onDeleted();
      }
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Failed to delete invoice", {
        description:
          error instanceof Error ? error.message : "Please try again later.",
      });
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive-outline" size={size}>
          <TrashIcon className="h-4 w-4" /> Delete
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Invoice</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete invoice{" "}
            {invoiceNumber ? `#${invoiceNumber}` : "this invoice"}? This action
            cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
