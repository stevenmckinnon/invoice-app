"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FileTextIcon } from "lucide-react";

interface PdfPreviewDialogProps {
  invoiceId: string;
  invoiceNumber: string;
  size?: "default" | "sm" | "lg" | "icon";
  variant?:
    | "default"
    | "outline"
    | "ghost"
    | "destructive"
    | "secondary"
    | "link";
  showText?: boolean;
}

export const PdfPreviewDialog = ({
  invoiceId,
  invoiceNumber,
  size = "default",
  variant = "default",
  showText = true,
}: PdfPreviewDialogProps) => {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size={size} variant={variant}>
          <FileTextIcon className="h-4 w-4" />
          {showText && "View PDF"}
        </Button>
      </DialogTrigger>
      <DialogContent className="!max-w-[90dvw] max-h-[90dvh] h-[90dvh] w-[90dvw]">
        <DialogHeader>
          <DialogTitle>Invoice {invoiceNumber}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-hidden h-full">
          <iframe
            src={`/api/invoices/${invoiceId}/pdf`}
            className="w-full h-full border-0"
            title={`Invoice ${invoiceNumber}`}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};
