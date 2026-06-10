"use client";
import { useState } from "react";

import { TrashIcon } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
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
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size={size}>
          <TrashIcon className="h-4 w-4" /> Delete
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Invoice</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete invoice{" "}
            {invoiceNumber ? `#${invoiceNumber}` : "this invoice"}? This action
            cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              // Keep the dialog open while the mutation runs
              e.preventDefault();
              handleDelete();
            }}
            disabled={deleteInvoiceMutation.isPending}
            className="bg-destructive text-white hover:bg-destructive/90"
          >
            {deleteInvoiceMutation.isPending ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
