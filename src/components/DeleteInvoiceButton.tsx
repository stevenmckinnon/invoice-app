"use client";
import { useState } from "react";

import { Delete01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

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
  /**
   * Control the confirmation from outside, e.g. a "Delete" item in an
   * overflow menu. With these set, no trigger button is rendered.
   */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const DeleteInvoiceButton = ({
  invoiceId,
  invoiceNumber,
  onDeleted,
  size = "default",
  open: controlledOpen,
  onOpenChange,
}: DeleteInvoiceButtonProps) => {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const controlled = controlledOpen !== undefined;
  const open = controlled ? controlledOpen : uncontrolledOpen;
  const setOpen = (next: boolean) =>
    controlled ? onOpenChange?.(next) : setUncontrolledOpen(next);
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
      {!controlled && (
        <AlertDialogTrigger render={<Button variant="outline" size={size} />}>
          <HugeiconsIcon icon={Delete01Icon} className="h-4 w-4" /> Delete
        </AlertDialogTrigger>
      )}
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
            className="bg-destructive hover:bg-destructive/90 dark:bg-destructive/60 dark:hover:bg-destructive/70 text-white"
          >
            {deleteInvoiceMutation.isPending ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
