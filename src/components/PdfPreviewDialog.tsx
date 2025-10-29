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
      <DialogContent className="h-[90dvh] max-h-[90dvh] w-[90dvw] !max-w-[90dvw]">
        <DialogHeader>
          <DialogTitle>Invoice {invoiceNumber}</DialogTitle>
        </DialogHeader>
        <div className="h-full flex-1 overflow-hidden">
          <iframe
            src={`/api/invoices/${invoiceId}/pdf`}
            className="h-full w-full border-0"
            title={`Invoice ${invoiceNumber}`}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};
