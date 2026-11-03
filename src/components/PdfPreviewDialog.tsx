"use client";
import { useState } from "react";

import { Download01Icon, FileAttachmentIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { useUpdateInvoiceStatus } from "@/hooks/use-invoices";

type PdfTemplate = "caley" | "classic" | "modern" | "minimal";

const TEMPLATE_KEY = "caley-pdf-template";

const TEMPLATE_ITEMS: { value: PdfTemplate; label: string }[] = [
  { value: "caley", label: "Caley" },
  { value: "classic", label: "Classic" },
  { value: "modern", label: "Modern" },
  { value: "minimal", label: "Minimal" },
];

interface PdfPreviewDialogProps {
  invoiceId: string;
  invoiceNumber: string;
  size?: "default" | "sm" | "lg" | "icon";
  variant?:
    "default" | "outline" | "ghost" | "destructive" | "secondary" | "link";
  showText?: boolean;
  invoiceDate: Date;
  showName: string;
  fullName: string;
  /** A draft that's downloaded is offered "mark as sent", as sharing one on iOS does */
  status?: string;
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
  status,
}: PdfPreviewDialogProps) => {
  const [open, setOpen] = useState(false);
  // Remembers the last template picked. Read on open rather than at render,
  // so the server and first client render agree.
  const [template, setTemplate] = useState<PdfTemplate>("caley");
  const [pdfLoading, setPdfLoading] = useState(true);
  // Set once a draft has been downloaded: the footer then asks whether it's
  // going to the client, since a draft left behind never counts as owed
  const [askSent, setAskSent] = useState(false);
  const updateStatus = useUpdateInvoiceStatus();

  const downloadInvoicePdf = async () => {
    const response = await fetch(
      `/api/invoices/${invoiceId}/pdf?template=${template}`,
    );
    if (!response.ok) {
      toast.error("Couldn't download the PDF. Please try again.");
      return;
    }
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
    if (status === "draft") setAskSent(true);
  };

  const markSent = () =>
    updateStatus.mutate(
      { id: invoiceId, status: "sent" },
      { onSuccess: () => setOpen(false) },
    );

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setAskSent(false);
          setPdfLoading(true);
          try {
            const saved = localStorage.getItem(TEMPLATE_KEY);
            if (TEMPLATE_ITEMS.some((t) => t.value === saved)) {
              setTemplate(saved as PdfTemplate);
            }
          } catch {
            // Storage can be blocked; Caley is the default
          }
        }
      }}
    >
      <DialogTrigger render={<Button size={size} variant={variant} />}>
        <HugeiconsIcon icon={FileAttachmentIcon} className="h-4 w-4" />
        {showText && "View PDF"}
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
              items={TEMPLATE_ITEMS}
              value={template}
              onValueChange={(value) => {
                setPdfLoading(true);
                setTemplate(value as PdfTemplate);
                try {
                  localStorage.setItem(TEMPLATE_KEY, value as string);
                } catch {
                  // Not remembered this time
                }
              }}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TEMPLATE_ITEMS.map(({ value, label }) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
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
        {askSent ? (
          // Announced, and in place of the buttons that led here, so the
          // question can't be missed and nothing changes without a yes
          <DialogFooter className="items-center sm:justify-between">
            <p role="status" className="text-sm">
              Downloaded. Sending it to the client? Mark it as sent so it
              counts as owed.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Keep as draft
              </Button>
              <Button onClick={markSent} disabled={updateStatus.isPending}>
                {updateStatus.isPending && <Spinner />}
                Mark as sent
              </Button>
            </div>
          </DialogFooter>
        ) : (
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={downloadInvoicePdf}>
              <HugeiconsIcon icon={Download01Icon} className="h-4 w-4" />
              Download PDF
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};
