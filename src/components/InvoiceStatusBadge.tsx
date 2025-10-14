import { Badge } from "@/components/ui/badge";

type InvoiceStatus = "draft" | "sent" | "paid" | "overdue";

interface InvoiceStatusBadgeProps {
  status: string;
}

export const InvoiceStatusBadge = ({ status }: InvoiceStatusBadgeProps) => {
  const statusConfig: Record<
    InvoiceStatus,
    { label: string; variant: "default" | "secondary" | "outline" | "destructive" }
  > = {
    draft: { label: "Draft", variant: "secondary" },
    sent: { label: "Sent", variant: "default" },
    paid: { label: "Paid", variant: "outline" },
    overdue: { label: "Overdue", variant: "destructive" },
  };

  const config = statusConfig[status as InvoiceStatus] || {
    label: status,
    variant: "secondary" as const,
  };

  return <Badge variant={config.variant}>{config.label}</Badge>;
};

