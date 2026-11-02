"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

/** The two status changes that aren't routine: each takes a deliberate yes */
const COPY = {
  void: {
    title: (number: string) => `Void ${number}?`,
    body: "It stays on record but stops counting towards your totals and exports, and its PDF is no longer available. This can't be undone. To send a replacement, use Issue corrected invoice instead.",
    action: "Void invoice",
  },
  draft: {
    title: (number: string) => `Move ${number} back to draft?`,
    body: "Only do this if it never reached the client. If they have it, issue a corrected invoice instead, so your records match what they were sent.",
    action: "Move to draft",
  },
};

export const ConfirmStatusDialog = ({
  status,
  invoiceNumber,
  onConfirm,
  onCancel,
}: {
  /** The status waiting for a yes; null keeps the dialog closed */
  status: "void" | "draft" | null;
  invoiceNumber: string;
  onConfirm: () => void;
  onCancel: () => void;
}) => {
  // The dialog stays mounted, so copy for its closing frame needs a fallback
  const copy = COPY[status ?? "void"];
  return (
    <AlertDialog
      open={status !== null}
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{copy.title(invoiceNumber)}</AlertDialogTitle>
          <AlertDialogDescription>{copy.body}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive hover:bg-destructive/90 dark:bg-destructive/60 dark:hover:bg-destructive/70 text-white"
          >
            {copy.action}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
