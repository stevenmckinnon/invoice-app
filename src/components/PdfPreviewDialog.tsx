"use client";
import { useState } from "react";

import { DownloadIcon, FileTextIcon } from "lucide-react";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";

type PdfTemplate = "classic" | "modern" | "minimal";

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
  invoiceDate: Date;
  showName: string;
  fullName: string;
}

export const PdfPreviewDialog = ({
  invoiceId,
  invoiceNumber,
  size = "default",
  variant = "default",
  showText = true,
  invoiceDate,
  showName,
  fullName,
}: PdfPreviewDialogProps) => {
  const [open, setOpen] = useState(false);
  const [template, setTemplate] = useState<PdfTemplate>("classic");
  const [pdfLoading, setPdfLoading] = useState(true);

  const downloadInvoicePdf = async () => {
    const response = await fetch(
      `/api/invoices/${invoiceId}/pdf?template=${template}`,
    );
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const formattedInvoiceDate = new Date(invoiceDate)
      .toISOString()
      .slice(0, 10)
      .replace(/-/g, "");
    a.download = `${formattedInvoiceDate} ${showName} ${fullName} ${invoiceNumber}.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setPdfLoading(true);
      }}
    >
      <DialogTrigger asChild>
        <Button size={size} variant={variant}>
          <FileTextIcon className="h-4 w-4" />
          {showText && "View PDF"}
        </Button>
      </DialogTrigger>
      <DialogContent
        className="flex h-[90dvh] max-h-[90dvh] w-[90dvw] !max-w-[90dvw] flex-col"
        aria-labelledby="pdf-preview-dialog"
      >
        <DialogHeader id="pdf-preview-dialog">
          <div className="flex items-center justify-between pt-4">
            <div>
              <DialogTitle>Invoice {invoiceNumber}</DialogTitle>
              <DialogDescription className="sr-only">
                Preview and download invoice PDF
              </DialogDescription>
            </div>
            <Select
              value={template}
              onValueChange={(value) => {
                setPdfLoading(true);
                setTemplate(value as PdfTemplate);
              }}
            >
              <SelectTrigger className="w-[165px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="classic">Classic Template</SelectItem>
                <SelectItem value="modern">Modern Template</SelectItem>
                <SelectItem value="minimal">Minimal Template</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </DialogHeader>
        <div className="bg-muted/30 relative min-h-0 flex-1 overflow-hidden rounded-md">
          {pdfLoading && (
            <div className="text-muted-foreground absolute inset-0 z-10 flex flex-col items-center justify-center gap-3">
              <Spinner className="size-6" />
              <p className="text-sm font-medium">Generating preview…</p>
            </div>
          )}
          <iframe
            key={template}
            src={`/api/invoices/${invoiceId}/pdf?template=${template}`}
            className="h-full w-full border-0"
            title={`Invoice ${invoiceNumber}`}
            onLoad={() => setPdfLoading(false)}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={downloadInvoicePdf}>
            <DownloadIcon className="h-4 w-4" />
            Download PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
