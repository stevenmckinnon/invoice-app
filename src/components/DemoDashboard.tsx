"use client";
import { PlusIcon, TrendingDown, TrendingUp } from "lucide-react";
import { motion } from "motion/react";

import { AnimatedCounter } from "@/components/AnimatedCounter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { INVOICE_STATUSES } from "@/lib/invoice-status";

type DemoInvoice = {
  invoiceNumber: string;
  invoiceDate: Date;
  showName: string;
  totalAmount: number;
  status: string;
};

// Dates are relative to today so the mockup always reads as a live account —
// a hardcoded year would show a stale financial year and a flat trend.
const monthsAgo = (months: number, day: number) => {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - months);
  d.setDate(day);
  return d;
};

const demoInvoices: DemoInvoice[] = [
  {
    invoiceNumber: "INV-2026-001",
    invoiceDate: monthsAgo(1, 8),
    showName: "The Crown Season 6",
    totalAmount: 2850.0,
    status: "paid",
  },
  {
    invoiceNumber: "INV-2026-002",
    invoiceDate: monthsAgo(1, 22),
    showName: "Bridgerton Season 3",
    totalAmount: 3200.0,
    status: "sent",
  },
  {
    invoiceNumber: "INV-2026-003",
    invoiceDate: monthsAgo(1, 27),
    showName: "The Witcher Season 4",
    totalAmount: 2750.0,
    status: "paid",
  },
  {
    invoiceNumber: "INV-2026-004",
    invoiceDate: monthsAgo(0, 3),
    showName: "Stranger Things Season 5",
    totalAmount: 3100.0,
    status: "draft",
  },
  {
    invoiceNumber: "INV-2026-005",
    invoiceDate: monthsAgo(0, 11),
    showName: "The Last of Us Season 2",
    totalAmount: 2950.0,
    status: "overdue",
  },
  {
    invoiceNumber: "INV-2026-006",
    invoiceDate: monthsAgo(0, 18),
    showName: "House of the Dragon Season 2",
    totalAmount: 3300.0,
    status: "paid",
  },
];

// UK financial year runs 6 April – 5 April, identified by the year it starts in
const getFyStart = (date: Date): number => {
  const month = date.getMonth();
  const beforeApril6 = month < 3 || (month === 3 && date.getDate() < 6);
  return beforeApril6 ? date.getFullYear() - 1 : date.getFullYear();
};

const formatFy = (fyStart: number): string =>
  `${fyStart}/${String((fyStart + 1) % 100).padStart(2, "0")}`;

export const DemoDashboard = () => {
  const invoices = demoInvoices;
  const now = new Date();

  const sum = (list: DemoInvoice[]) =>
    list.reduce((total, inv) => total + inv.totalAmount, 0);

  const totalRevenue = sum(invoices);
  const paidInvoices = invoices.filter((inv) => inv.status === "paid");
  const unpaidInvoices = invoices.filter((inv) => inv.status !== "paid");
  const paidRevenue = sum(paidInvoices);
  const outstandingRevenue = sum(unpaidInvoices);
  const averageInvoice = totalRevenue / invoices.length;

  const inMonth = (date: Date, offset: number) => {
    const ref = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    return (
      date.getMonth() === ref.getMonth() &&
      date.getFullYear() === ref.getFullYear()
    );
  };

  const currentMonthRevenue = sum(
    invoices.filter((inv) => inMonth(inv.invoiceDate, 0)),
  );
  const lastMonthRevenue = sum(
    invoices.filter((inv) => inMonth(inv.invoiceDate, 1)),
  );
  const monthlyChange =
    ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100;

  const statusRows = INVOICE_STATUSES.map((status) => {
    const count = invoices.filter((inv) => inv.status === status.value).length;
    return {
      ...status,
      count,
      share: Math.round((count / invoices.length) * 100),
    };
  });

  const topShows = Object.entries(
    invoices.reduce<Record<string, number>>((acc, inv) => {
      acc[inv.showName] = (acc[inv.showName] ?? 0) + inv.totalAmount;
      return acc;
    }, {}),
  )
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([show, revenue]) => ({ show, revenue }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="glossy-frame p-0"
    >
      <div className="zoom bg-background grid w-full grid-cols-1 gap-6 rounded-lg p-12 pb-8">
        {/* Header — mirrors the app, where the nav pill already says
            "Dashboard", so the heading carries the greeting instead */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Afternoon, Ellie
            </h1>
            <p
              className="text-muted-foreground mt-1 text-sm"
              suppressHydrationWarning
            >
              {now.toLocaleDateString("en-GB", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
          <Button>
            <PlusIcon />
            Create Invoice
          </Button>
        </div>

        {/* Revenue hero — the one number the page is actually about */}
        <Card className="bg-accent dark:border-accent gap-4 shadow-md">
          <CardHeader className="pb-0">
            <CardTitle className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
              Total revenue · {formatFy(getFyStart(now))}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
              <div className="text-4xl font-bold tracking-tight tabular-nums">
                <AnimatedCounter
                  value={totalRevenue}
                  prefix="£"
                  duration={1200}
                  decimals={2}
                />
              </div>
              {lastMonthRevenue > 0 && (
                <div className="bg-card flex items-center gap-1.5 rounded-full py-1.5 pr-3 pl-2.5 shadow-xs">
                  {monthlyChange >= 0 ? (
                    <TrendingUp className="text-success h-4 w-4" />
                  ) : (
                    <TrendingDown className="text-destructive h-4 w-4" />
                  )}
                  <span
                    className={`text-xs font-semibold tabular-nums ${
                      monthlyChange >= 0 ? "text-success" : "text-destructive"
                    }`}
                  >
                    {monthlyChange >= 0 ? "+" : ""}
                    {monthlyChange.toFixed(1)}%
                  </span>
                  <span className="text-muted-foreground text-xs">
                    vs last month
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Supporting stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="gap-2">
            <CardHeader className="pb-0">
              <CardTitle className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                Paid
              </CardTitle>
            </CardHeader>
            <CardContent className="mt-auto">
              <div className="text-success text-3xl font-bold tracking-tight tabular-nums">
                <AnimatedCounter
                  value={paidRevenue}
                  prefix="£"
                  duration={1200}
                  decimals={2}
                  delay={100}
                />
              </div>
              <p className="text-muted-foreground mt-2 text-xs font-medium">
                {paidInvoices.length} paid invoices
              </p>
            </CardContent>
          </Card>

          <Card className="gap-2">
            <CardHeader className="pb-0">
              <CardTitle className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                Outstanding
              </CardTitle>
            </CardHeader>
            <CardContent className="mt-auto">
              <div className="text-warning text-3xl font-bold tracking-tight tabular-nums">
                <AnimatedCounter
                  value={outstandingRevenue}
                  prefix="£"
                  duration={1200}
                  decimals={2}
                  delay={200}
                />
              </div>
              <p className="text-muted-foreground mt-2 text-xs font-medium">
                {unpaidInvoices.length} unpaid
              </p>
            </CardContent>
          </Card>

          <Card className="gap-2">
            <CardHeader className="pb-0">
              <CardTitle className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                Average invoice
              </CardTitle>
            </CardHeader>
            <CardContent className="mt-auto">
              <div className="text-3xl font-bold tracking-tight tabular-nums">
                <AnimatedCounter
                  value={averageInvoice}
                  prefix="£"
                  duration={1200}
                  decimals={2}
                  delay={300}
                />
              </div>
              <p className="text-muted-foreground mt-2 text-xs font-medium">
                per invoice
              </p>
            </CardContent>
          </Card>
        </div>

        <h2 className="text-muted-foreground -mb-2 text-xs font-semibold tracking-wider uppercase">
          Breakdown
        </h2>

        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Invoice status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {statusRows.map((status) => (
                  <div
                    key={status.value}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={`h-3 w-3 rounded-full ${status.dotClass}`}
                      />
                      <span className="text-sm font-medium">
                        {status.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 tabular-nums">
                      <span className="text-muted-foreground text-sm">
                        {status.count}
                      </span>
                      <span className="w-8 text-right text-sm font-medium">
                        {status.share}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top shows by revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topShows.map((item, index) => (
                  <div
                    key={item.show}
                    className="flex items-center justify-between gap-3"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="bg-muted text-muted-foreground flex h-6 w-6 shrink-0 items-center justify-center rounded-md font-mono text-xs">
                        {index + 1}
                      </div>
                      <span className="truncate text-sm font-medium">
                        {item.show}
                      </span>
                    </div>
                    <span className="text-sm font-bold tabular-nums">
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
    </motion.div>
  );
};
