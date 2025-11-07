"use client";
import { useState } from "react";

import { TrashIcon } from "lucide-react";

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
import { useDeleteInvoice } from "@/hooks/use-invoices";


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
  const deleteInvoiceMutation = useDeleteInvoice();

  const handleDelete = () => {
    deleteInvoiceMutation.mutate(invoiceId, {
      onSuccess: () => {
        setOpen(false);
        // Call the callback if provided
        if (onDeleted) {
          onDeleted();
        }
      },
    });
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
            disabled={deleteInvoiceMutation.isPending}
          >
            {deleteInvoiceMutation.isPending ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
