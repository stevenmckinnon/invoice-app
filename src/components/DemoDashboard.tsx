import { AnimatedCounter } from "@/components/AnimatedCounter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Clock,
  CreditCard,
  DollarSign,
  FileTextIcon,
  PlusIcon,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

type DemoInvoice = {
  id: string;
  invoiceNumber: string;
  invoiceDate: Date;
  showName: string;
  clientName: string | null;
  totalAmount: number;
  status: string;
  createdAt: Date;
};

// Demo data
const demoInvoices: DemoInvoice[] = [
  {
    id: "1",
    invoiceNumber: "INV-2024-001",
    invoiceDate: new Date("2024-01-15"),
    showName: "The Crown Season 6",
    clientName: "Netflix Studios",
    totalAmount: 2850.0,
    status: "paid",
    createdAt: new Date("2024-01-10"),
  },
  {
    id: "2",
    invoiceNumber: "INV-2024-002",
    invoiceDate: new Date("2024-01-22"),
    showName: "Bridgerton Season 3",
    clientName: "Shondaland",
    totalAmount: 3200.0,
    status: "sent",
    createdAt: new Date("2024-01-20"),
  },
  {
    id: "3",
    invoiceNumber: "INV-2024-003",
    invoiceDate: new Date("2024-02-05"),
    showName: "The Witcher Season 4",
    clientName: "Netflix Studios",
    totalAmount: 2750.0,
    status: "paid",
    createdAt: new Date("2024-02-01"),
  },
  {
    id: "4",
    invoiceNumber: "INV-2024-004",
    invoiceDate: new Date("2024-02-12"),
    showName: "Stranger Things Season 5",
    clientName: "Netflix Studios",
    totalAmount: 3100.0,
    status: "draft",
    createdAt: new Date("2024-02-10"),
  },
  {
    id: "5",
    invoiceNumber: "INV-2024-005",
    invoiceDate: new Date("2024-02-18"),
    showName: "The Last of Us Season 2",
    clientName: "HBO Max",
    totalAmount: 2950.0,
    status: "overdue",
    createdAt: new Date("2024-02-15"),
  },
  {
    id: "6",
    invoiceNumber: "INV-2024-006",
    invoiceDate: new Date("2024-02-25"),
    showName: "House of the Dragon Season 2",
    clientName: "HBO Max",
    totalAmount: 3300.0,
    status: "paid",
    createdAt: new Date("2024-02-22"),
  },
];

export const DemoDashboard = () => {
  const invoices = demoInvoices;

  const totalRevenue = invoices.reduce(
    (sum, inv) => sum + Number(inv.totalAmount),
    0,
  );

  const paidRevenue = invoices
    .filter((inv) => inv.status === "paid")
    .reduce((sum, inv) => sum + Number(inv.totalAmount), 0);

  const outstandingRevenue = invoices
    .filter((inv) => inv.status !== "paid")
    .reduce((sum, inv) => sum + Number(inv.totalAmount), 0);

  // Calculate monthly revenue for trend
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const currentMonthRevenue = invoices
    .filter((inv) => {
      const invDate = new Date(inv.invoiceDate);
      return (
        invDate.getMonth() === currentMonth &&
        invDate.getFullYear() === currentYear
      );
    })
    .reduce((sum, inv) => sum + Number(inv.totalAmount), 0);

  const lastMonthRevenue = invoices
    .filter((inv) => {
      const invDate = new Date(inv.invoiceDate);
      const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      return (
        invDate.getMonth() === lastMonth &&
        invDate.getFullYear() === lastMonthYear
      );
    })
    .reduce((sum, inv) => sum + Number(inv.totalAmount), 0);

  const monthlyChange =
    lastMonthRevenue > 0
      ? ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
      : currentMonthRevenue > 0
        ? 100
        : 0;

  // Status breakdown
  const statusCounts = {
    draft: invoices.filter((inv) => inv.status === "draft").length,
    sent: invoices.filter((inv) => inv.status === "sent").length,
    paid: invoices.filter((inv) => inv.status === "paid").length,
    overdue: invoices.filter((inv) => inv.status === "overdue").length,
  };

  // Top shows by revenue
  const showRevenue = invoices.reduce(
    (acc, inv) => {
      const show = inv.showName || "Unknown";
      acc[show] = (acc[show] || 0) + Number(inv.totalAmount);
      return acc;
    },
    {} as Record<string, number>,
  );

  const topShows = Object.entries(showRevenue)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([show, revenue]) => ({ show, revenue }));

  // Average invoice value
  const averageInvoice =
    invoices.length > 0 ? totalRevenue / invoices.length : 0;

  return (
    <div className="zoom bg-background grid w-full grid-cols-1 gap-6 rounded-tl-lg rounded-tr-lg border border-b-0 p-12 pb-8 shadow-lg">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Invoice Dashboard</h1>
          <p className="text-muted-foreground mt-1 text-left text-sm">
            Create and manage your invoices
          </p>
        </div>
        <Button size="lg">
          <PlusIcon className="h-5 w-5" />
          Create Invoice
        </Button>
      </div>

      {/* Revenue Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-muted-foreground text-sm font-medium">
                Total Revenue
              </CardTitle>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10">
                <DollarSign className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-left text-2xl font-bold">
              <AnimatedCounter
                value={totalRevenue}
                prefix="£"
                duration={1200}
                decimals={2}
              />
            </div>
            <div className="mt-2 flex items-center gap-1">
              {monthlyChange >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600" />
              )}
              <p
                className={`text-xs font-medium ${
                  monthlyChange >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {monthlyChange >= 0 ? "+" : ""}
                <AnimatedCounter
                  value={Math.abs(monthlyChange)}
                  suffix="%"
                  duration={1200}
                  decimals={1}
                />
              </p>
              <p className="text-muted-foreground text-xs">vs last month</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-muted-foreground text-sm font-medium">
                Paid
              </CardTitle>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-500/10">
                <CreditCard className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-left text-2xl font-bold text-green-600">
              <AnimatedCounter
                value={paidRevenue}
                prefix="£"
                duration={1200}
                decimals={2}
                delay={100}
              />
            </div>
            <p className="text-muted-foreground mt-2 text-left text-xs">
              {invoices.filter((inv) => inv.status === "paid").length} paid
              invoices
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-muted-foreground text-sm font-medium">
                Outstanding
              </CardTitle>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/10">
                <Clock className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-left text-2xl font-bold text-orange-600">
              <AnimatedCounter
                value={outstandingRevenue}
                prefix="£"
                duration={1200}
                decimals={2}
                delay={200}
              />
            </div>
            <p className="text-muted-foreground mt-2 text-left text-xs">
              {invoices.filter((inv) => inv.status !== "paid").length} unpaid
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-muted-foreground text-sm font-medium">
                Average Invoice
              </CardTitle>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10">
                <FileTextIcon className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-left text-2xl font-bold">
              <AnimatedCounter
                value={averageInvoice}
                prefix="£"
                duration={1200}
                decimals={2}
                delay={300}
              />
            </div>
            <p className="text-muted-foreground mt-2 text-left text-xs">
              per invoice
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-2 gap-4">
        {/* Status Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Invoice Status</CardTitle>
            <p className="text-muted-foreground text-sm">Breakdown by status</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-gray-500" />
                  <span className="text-sm font-medium">Draft</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground text-sm">
                    {statusCounts.draft}
                  </span>
                  <span className="text-sm font-medium">
                    {invoices.length > 0
                      ? ((statusCounts.draft / invoices.length) * 100).toFixed(
                          0,
                        )
                      : 0}
                    %
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-blue-500" />
                  <span className="text-sm font-medium">Sent</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground text-sm">
                    {statusCounts.sent}
                  </span>
                  <span className="text-sm font-medium">
                    {invoices.length > 0
                      ? ((statusCounts.sent / invoices.length) * 100).toFixed(0)
                      : 0}
                    %
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-green-500" />
                  <span className="text-sm font-medium">Paid</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground text-sm">
                    {statusCounts.paid}
                  </span>
                  <span className="text-sm font-medium">
                    {invoices.length > 0
                      ? ((statusCounts.paid / invoices.length) * 100).toFixed(0)
                      : 0}
                    %
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-red-500" />
                  <span className="text-sm font-medium">Overdue</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground text-sm">
                    {statusCounts.overdue}
                  </span>
                  <span className="text-sm font-medium">
                    {invoices.length > 0
                      ? (
                          (statusCounts.overdue / invoices.length) *
                          100
                        ).toFixed(0)
                      : 0}
                    %
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top Shows */}
        <Card>
          <CardHeader>
            <CardTitle>Top Shows by Revenue</CardTitle>
            <p className="text-muted-foreground text-sm">
              Your highest earning projects
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topShows.map((item, index) => (
                <div
                  key={item.show}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold">
                      {index + 1}
                    </div>
                    <span className="max-w-[200px] truncate text-sm font-medium">
                      {item.show}
                    </span>
                  </div>
                  <span className="text-sm font-bold">
                    <AnimatedCounter
                      value={item.revenue}
                      prefix="£"
                      duration={1000}
                      decimals={2}
                      delay={400 + index * 100}
                    />
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
