"use client";
import {
  Add01Icon,
  AnalyticsDownIcon,
  AnalyticsUpIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { motion, useReducedMotion } from "motion/react";

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
  const reduceMotion = useReducedMotion();

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
      initial={reduceMotion ? false : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reduceMotion ? { duration: 0 } : { duration: 0.5 }}
      className="glossy-frame p-0"
    >
      <div className="zoom bg-background grid w-full grid-cols-1 gap-4 rounded-lg p-4 pb-6 md:gap-6 md:p-12 md:pb-8">
        {/* Header — mirrors the app, where the nav pill already says
            "Dashboard", so the heading carries the greeting instead */}
        {/* Same shape as the app's PageHeader: stacked below md, row above. */}
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
          <div>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
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
          <Button className="w-fit">
            <HugeiconsIcon icon={Add01Icon} />
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
              <div className="text-3xl font-bold tracking-tight tabular-nums md:text-4xl">
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
                    <HugeiconsIcon
                      icon={AnalyticsUpIcon}
                      className="text-success h-4 w-4"
                    />
                  ) : (
                    <HugeiconsIcon
                      icon={AnalyticsDownIcon}
                      className="text-destructive h-4 w-4"
                    />
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

        {/* Supporting stats. Two across on mobile like the real dashboard,
            with the odd third spanning the row so there is no hanging cell. */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
          <Card className="gap-2">
            <CardHeader className="px-3 pb-0 md:px-6">
              <CardTitle className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                Paid
              </CardTitle>
            </CardHeader>
            <CardContent className="mt-auto px-3 md:px-6">
              <div className="text-success text-lg font-bold tracking-tight tabular-nums md:text-3xl">
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
            <CardHeader className="px-3 pb-0 md:px-6">
              <CardTitle className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                Outstanding
              </CardTitle>
            </CardHeader>
            <CardContent className="mt-auto px-3 md:px-6">
              <div className="text-warning text-lg font-bold tracking-tight tabular-nums md:text-3xl">
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

          <Card className="col-span-2 gap-2 md:col-span-1">
            <CardHeader className="pb-0">
              <CardTitle className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                Average invoice
              </CardTitle>
            </CardHeader>
            <CardContent className="mt-auto px-3 md:px-6">
              <div className="text-2xl font-bold tracking-tight tabular-nums md:text-3xl">
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

        {/* The demoted analytics pair. Held back below md: at 301px of frame
            it doubles the mockup's height to 1.5 viewports, and it is the
            least load-bearing part of the dashboard to lose. */}
        <h2 className="text-muted-foreground -mb-2 hidden text-xs font-semibold tracking-wider uppercase md:block">
          Breakdown
        </h2>

        <div className="hidden grid-cols-1 gap-4 md:grid md:grid-cols-2">
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
