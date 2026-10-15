"use client";
import { useEffect, useState } from "react";

import { Add01Icon, AnalyticsDownIcon, AnalyticsUpIcon, FileAttachmentIcon, ViewIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";

import { DashboardSkeleton } from "@/components/DashboardSkeleton";
import { EmptyState } from "@/components/EmptyState";
import { InvoiceStatusBadge } from "@/components/InvoiceStatusBadge";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useInvoices } from "@/hooks/use-invoices";
import { useSession } from "@/lib/auth-client";
import { INVOICE_STATUSES } from "@/lib/invoice-status";
import { formatFy, getFyMonthIndex, getFyStart } from "@/lib/tax-year";
import { cn, formatCurrency, formatDate, getGreeting } from "@/lib/utils";

// Aggregated stats need a single display currency — use the most common one
const dominantCurrency = (invoices: { currency: string }[]): string => {
  const counts = new Map<string, number>();
  let best = "GBP";
  let max = 0;
  for (const inv of invoices) {
    const n = (counts.get(inv.currency) ?? 0) + 1;
    counts.set(inv.currency, n);
    if (n > max) {
      max = n;
      best = inv.currency;
    }
  }
  return best;
};


export default function Home() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const { data: allInvoices = [], isLoading, error } = useInvoices();
  // null = follow the most common currency until the user picks one
  const [selectedCurrency, setSelectedCurrency] = useState<string | null>(
    null,
  );
  const [chartColors, setChartColors] = useState({
    primary: "#3b82f6",
    muted: "#9ca3af",
    grid: "#374151",
    cardBg: "#1f2937",
    border: "#374151",
  });

  const currentFy = getFyStart(new Date());
  const [selectedFy, setSelectedFy] = useState(currentFy);

  // Get theme colors from CSS variables
  useEffect(() => {
    const updateColors = () => {
      // Create a temporary element to get computed colors
      const temp = document.createElement("div");
      document.body.appendChild(temp);

      // Apply Tailwind classes and read computed RGB colors
      temp.className = "text-primary";
      const primaryColor = getComputedStyle(temp).color;

      temp.className = "text-muted-foreground";
      const mutedColor = getComputedStyle(temp).color;

      temp.className = "border-border";
      const borderColor = getComputedStyle(temp).borderColor;

      temp.className = "bg-card";
      const cardBg = getComputedStyle(temp).backgroundColor;

      document.body.removeChild(temp);

      setChartColors({
        primary: primaryColor || "#3b82f6",
        muted: mutedColor || "#9ca3af",
        grid: borderColor || "#374151",
        cardBg: cardBg || "#1f2937",
        border: borderColor || "#374151",
      });
    };

    updateColors();

    // Listen for theme changes
    const observer = new MutationObserver(updateColors);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!session && !isPending) {
      // Redirect to sign in if not authenticated
      router.push("/auth/signin");
    }
  }, [session, isPending, router]);

  // Show loading while fetching data — auth is enforced server-side by the
  // proxy, so don't block rendering on the client session roundtrip
  if (isLoading) {
    return <DashboardSkeleton />;
  }

  // Show error state if fetch failed
  if (error) {
    return (
      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-6 p-6 py-10 md:pb-8">
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive text-sm">
              Failed to load invoices. Please try again.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Derive available financial years from invoice dates, always include current
  const availableFys =
    allInvoices.length > 0
      ? Array.from(
          new Set([
            currentFy,
            ...allInvoices.map((inv) => getFyStart(new Date(inv.invoiceDate))),
          ]),
        ).sort((a, b) => b - a)
      : [currentFy];

  // Every figure on this page is in one currency. Adding £ and $ together as
  // if they were the same unit gives a total that means nothing, and
  // converting needs a rate for each invoice's date, which we don't hold.
  const currencies = [...new Set(allInvoices.map((inv) => inv.currency))];
  const displayCurrency =
    selectedCurrency && currencies.includes(selectedCurrency)
      ? selectedCurrency
      : dominantCurrency(allInvoices);
  const invoices = allInvoices.filter(
    (inv) => inv.currency === displayCurrency,
  );

  // Filter invoices to the selected financial year
  const fyInvoices = invoices.filter(
    (inv) => getFyStart(new Date(inv.invoiceDate)) === selectedFy,
  );

  // The recent list shows each invoice in its own currency, so it uses all
  const sortedInvoices = [...allInvoices]
    .sort(
      (a, b) =>
        new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime(),
    )
    .slice(0, 5); // Show only latest 5 invoices

  const totalRevenue = fyInvoices.reduce(
    (sum, inv) => sum + Number(inv.totalAmount),
    0,
  );

  const paidRevenue = fyInvoices
    .filter((inv) => inv.status === "paid")
    .reduce((sum, inv) => sum + Number(inv.totalAmount), 0);

  const outstandingRevenue = fyInvoices
    .filter((inv) => inv.status !== "paid")
    .reduce((sum, inv) => sum + Number(inv.totalAmount), 0);

  // Calculate monthly revenue for trend
  const now = new Date();
  const currentMonth = now.getMonth();

  // "This Month" card: only meaningful when viewing the current financial year
  const isCurrentFy = selectedFy === currentFy;

  const sumAmounts = (list: typeof invoices) =>
    list.reduce((sum, inv) => sum + Number(inv.totalAmount), 0);

  const currentMonthRevenue = isCurrentFy
    ? sumAmounts(
        fyInvoices.filter(
          (inv) => new Date(inv.invoiceDate).getMonth() === currentMonth,
        ),
      )
    : 0;

  // Month-to-date against the same day last month. Comparing a part-month to
  // a whole one reads as a slump every month until about the 25th.
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const daysInLastMonth = new Date(
    now.getFullYear(),
    now.getMonth(),
    0,
  ).getDate();
  const sameDayLastMonth = new Date(
    lastMonthStart.getFullYear(),
    lastMonthStart.getMonth(),
    Math.min(now.getDate(), daysInLastMonth),
    23,
    59,
    59,
    999,
  );
  const revenueBetween = (from: Date, to: Date) =>
    sumAmounts(
      invoices.filter((inv) => {
        const date = new Date(inv.invoiceDate);
        return date >= from && date <= to;
      }),
    );
  const monthToDateRevenue = revenueBetween(monthStart, now);
  const lastMonthToDateRevenue = revenueBetween(
    lastMonthStart,
    sameDayLastMonth,
  );

  // null when last month had nothing by this point: any percentage against
  // zero is made up, so the chip is hidden instead
  const monthlyChange =
    isCurrentFy && lastMonthToDateRevenue > 0
      ? ((monthToDateRevenue - lastMonthToDateRevenue) /
          lastMonthToDateRevenue) *
        100
      : null;

  // Best month revenue for past years
  const bestMonthRevenue = !isCurrentFy
    ? Math.max(
        0,
        ...Array.from({ length: 12 }, (_, i) =>
          fyInvoices
            .filter((inv) => new Date(inv.invoiceDate).getMonth() === i)
            .reduce((sum, inv) => sum + Number(inv.totalAmount), 0),
        ),
      )
    : 0;

  const bestMonthIndex = !isCurrentFy
    ? Array.from({ length: 12 }, (_, i) =>
        fyInvoices
          .filter((inv) => new Date(inv.invoiceDate).getMonth() === i)
          .reduce((sum, inv) => sum + Number(inv.totalAmount), 0),
      ).indexOf(bestMonthRevenue)
    : -1;

  const bestMonthCalendarYear =
    bestMonthIndex >= 0 && bestMonthIndex < 3 ? selectedFy + 1 : selectedFy;

  const bestMonthName =
    bestMonthIndex >= 0
      ? new Date(bestMonthCalendarYear, bestMonthIndex).toLocaleDateString(
          "en-GB",
          { month: "long" },
        )
      : "";

  // Status breakdown — scoped to selected year
  const statusCounts = {
    draft: fyInvoices.filter((inv) => inv.status === "draft").length,
    sent: fyInvoices.filter((inv) => inv.status === "sent").length,
    paid: fyInvoices.filter((inv) => inv.status === "paid").length,
    overdue: fyInvoices.filter((inv) => inv.status === "overdue").length,
  };

  // Top shows by revenue — scoped to selected year
  const showRevenue = fyInvoices.reduce(
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

  // Average invoice value — scoped to selected year
  const averageInvoice =
    fyInvoices.length > 0 ? totalRevenue / fyInvoices.length : 0;

  // Revenue chart — financial-year order: April through March, with the
  // previous year drawn behind it as a like-for-like reference
  const monthlyTotals = (fyStart: number) => {
    const totals = { revenue: Array<number>(12).fill(0), count: Array<number>(12).fill(0) };
    for (const inv of invoices) {
      const date = new Date(inv.invoiceDate);
      if (getFyStart(date) !== fyStart) continue;
      const i = getFyMonthIndex(date);
      totals.revenue[i] += Number(inv.totalAmount);
      totals.count[i] += 1;
    }
    return totals;
  };

  const selectedTotals = monthlyTotals(selectedFy);
  const previousTotals = monthlyTotals(selectedFy - 1);
  const hasPreviousFy = previousTotals.count.some((n) => n > 0);

  // In the current year, months that haven't happened yet have no value
  // rather than £0 — otherwise the line falls to the floor and reads as a
  // collapse in income
  const lastElapsedMonth = isCurrentFy ? getFyMonthIndex(now) : 11;

  const revenueData = Array.from({ length: 12 }, (_, i) => {
    const calendarMonth = (i + 3) % 12;
    const calendarYear = calendarMonth < 3 ? selectedFy + 1 : selectedFy;
    return {
      month: new Date(calendarYear, calendarMonth).toLocaleDateString("en-GB", {
        month: "short",
      }),
      revenue: i <= lastElapsedMonth ? selectedTotals.revenue[i] : null,
      invoices: selectedTotals.count[i],
      previous: hasPreviousFy ? previousTotals.revenue[i] : null,
    };
  });

  // Year-to-date against the same point last year. Comparing a part-year to
  // a whole one always looks like a decline, so the current year is cut at
  // today and last year at today's date a year ago.
  const sameDayLastYear = new Date(now);
  sameDayLastYear.setFullYear(now.getFullYear() - 1);
  // Used by both the chart chip and the Year Performance card, so the two
  // can never disagree about how this year is doing.
  const revenueUpTo = (fyStart: number, cutoff: Date | null) =>
    sumAmounts(
      invoices.filter((inv) => {
        const date = new Date(inv.invoiceDate);
        return getFyStart(date) === fyStart && (!cutoff || date <= cutoff);
      }),
    );
  const toDateRevenue = revenueUpTo(selectedFy, isCurrentFy ? now : null);
  const previousToDateRevenue = revenueUpTo(
    selectedFy - 1,
    isCurrentFy ? sameDayLastYear : null,
  );
  const toDateChange =
    previousToDateRevenue > 0
      ? ((toDateRevenue - previousToDateRevenue) / previousToDateRevenue) * 100
      : null;
  const toDateLabel = now.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });

  return (
    <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-6 p-6 py-10 md:pb-8">
      {/* The nav pill already labels this page "Dashboard", so the heading
          carries the greeting instead of repeating it */}
      <PageHeader
        title={
          <span suppressHydrationWarning>
            {getGreeting(session?.user.name?.split(" ")[0])}
          </span>
        }
        subtitle={
          <span suppressHydrationWarning>
            {new Date().toLocaleDateString("en-GB", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </span>
        }
        actions={
          <>
            <Select
              value={String(selectedFy)}
              onValueChange={(val) => setSelectedFy(Number(val))}
            >
              <SelectTrigger className="w-[110px]">
                <SelectValue>
                  {(value: string) => formatFy(Number(value))}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {availableFys.map((fy) => (
                  <SelectItem key={fy} value={String(fy)}>
                    {formatFy(fy)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {/* Only when there's a choice to make — most users bill in one */}
            {currencies.length > 1 && (
              <Select
                value={displayCurrency}
                onValueChange={(val) => val && setSelectedCurrency(val)}
              >
                <SelectTrigger className="w-[90px]" aria-label="Currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {currencies.map((code) => (
                    <SelectItem key={code} value={code}>
                      {code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button
              nativeButton={false}
              render={
                <Link href="/invoices/new">
                  <HugeiconsIcon icon={Add01Icon} />
                  Create Invoice
                </Link>
              }
            />
          </>
        }
      />

      {/* Revenue hero — the one number the page is actually about */}
      <Card className="bg-accent dark:border-accent gap-4 shadow-md">
        <CardHeader className="pb-0">
          <CardTitle className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
            Total revenue · {formatFy(selectedFy)}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
            <div className="min-w-0 break-words text-4xl font-bold tracking-tight tabular-nums sm:text-5xl">
              {formatCurrency(totalRevenue, displayCurrency)}
            </div>
            {monthlyChange !== null ? (
              <div className="bg-card flex items-center gap-1.5 rounded-full py-1.5 pr-3 pl-2.5 shadow-xs">
                {monthlyChange >= 0 ? (
                  <HugeiconsIcon icon={AnalyticsUpIcon} className="text-success h-4 w-4" />
                ) : (
                  <HugeiconsIcon icon={AnalyticsDownIcon} className="text-destructive h-4 w-4" />
                )}
                <span
                  className={`text-xs font-semibold ${
                    monthlyChange >= 0 ? "text-success" : "text-destructive"
                  }`}
                >
                  {monthlyChange >= 0 ? "+" : "−"}
                  {Math.abs(monthlyChange).toFixed(1)}%
                </span>
                <span className="text-muted-foreground text-xs font-medium">
                  this month, vs this point last month
                </span>
              </div>
            ) : (
              <span className="text-muted-foreground text-sm font-medium">
                {fyInvoices.length} invoice{fyInvoices.length !== 1 ? "s" : ""}{" "}
                this year
              </span>
            )}
          </div>

          {totalRevenue > 0 && (
            <div className="space-y-2">
              <div className="bg-card flex h-2 overflow-hidden rounded-full">
                <div
                  className="bg-success h-full"
                  style={{ width: `${(paidRevenue / totalRevenue) * 100}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs font-medium">
                <span className="text-success">
                  {formatCurrency(paidRevenue, displayCurrency)} paid
                </span>
                <span className="text-muted-foreground">
                  {formatCurrency(outstandingRevenue, displayCurrency)}{" "}
                  outstanding
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Supporting stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <Card className="gap-2">
          <CardHeader className="pb-0">
            <CardTitle className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
              Paid
            </CardTitle>
          </CardHeader>
          <CardContent className="mt-auto">
            <div className="text-success break-words text-xl font-bold tracking-tight tabular-nums sm:text-3xl">
              {formatCurrency(paidRevenue, displayCurrency)}
            </div>
            <p className="text-muted-foreground mt-2 text-xs font-medium">
              {fyInvoices.filter((inv) => inv.status === "paid").length} paid
              invoices
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
            <div className="text-warning break-words text-xl font-bold tracking-tight tabular-nums sm:text-3xl">
              {formatCurrency(outstandingRevenue, displayCurrency)}
            </div>
            <p className="text-muted-foreground mt-2 text-xs font-medium">
              {fyInvoices.filter((inv) => inv.status !== "paid").length} unpaid
            </p>
          </CardContent>
        </Card>

        <Card className="col-span-2 gap-2 lg:col-span-1">
          <CardHeader className="pb-0">
            <CardTitle className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
              Average Invoice
            </CardTitle>
          </CardHeader>
          <CardContent className="mt-auto">
            <div className="break-words text-xl font-bold tracking-tight tabular-nums sm:text-3xl">
              {formatCurrency(averageInvoice, displayCurrency)}
            </div>
            <p className="text-muted-foreground mt-2 text-xs font-medium">
              per invoice
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue by month — the hero already carries the total, so this
          card's headline is the like-for-like comparison */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
            <div className="space-y-2">
              <CardTitle className="text-xl">Revenue by month</CardTitle>
              {toDateChange !== null && (
                <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 font-semibold tabular-nums",
                      toDateChange >= 0
                        ? "bg-success/12 text-success"
                        : "bg-destructive/10 text-destructive",
                    )}
                  >
                    {toDateChange >= 0 ? "+" : "−"}
                    {Math.abs(toDateChange).toFixed(1)}%
                  </span>
                  <span className="text-muted-foreground">
                    {isCurrentFy
                      ? "vs this point last year"
                      : `vs ${formatFy(selectedFy - 1)}`}
                  </span>
                </div>
              )}
            </div>
            {hasPreviousFy && fyInvoices.length > 0 && (
              <ul className="text-muted-foreground flex items-center gap-4 text-xs font-medium">
                <li className="flex items-center gap-1.5">
                  <span className="bg-primary h-0.5 w-3 rounded-full" />
                  {formatFy(selectedFy)}
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="border-muted-foreground h-0 w-3 border-t-2 border-dashed" />
                  {formatFy(selectedFy - 1)}
                </li>
              </ul>
            )}
          </div>
        </CardHeader>
        <CardContent className="px-0 pb-2 md:px-4">
          {fyInvoices.length > 0 ? (
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={revenueData}
                  margin={{ top: 8, right: 24, left: 8, bottom: 8 }}
                >
                  <defs>
                    <linearGradient
                      id="colorRevenue"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor={chartColors.primary}
                        stopOpacity={0.28}
                      />
                      <stop
                        offset="100%"
                        stopColor={chartColors.primary}
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    vertical={false}
                    stroke={chartColors.grid}
                    strokeOpacity={0.6}
                  />
                  <XAxis
                    dataKey="month"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: chartColors.muted }}
                    dy={8}
                  />
                  <YAxis
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: chartColors.muted }}
                    tickFormatter={(value) =>
                      formatCurrency(value, displayCurrency, { decimals: 0 })
                    }
                    width={64}
                  />
                  <RechartsTooltip
                    cursor={{ stroke: chartColors.muted, strokeOpacity: 0.4 }}
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      const point = payload[0].payload as (typeof revenueData)[number];
                      return (
                        <div className="bg-popover text-popover-foreground dark:border-border min-w-40 rounded-xl px-3 py-2.5 text-xs shadow-lg dark:border">
                          <p className="mb-1.5 font-semibold">{label}</p>
                          {point.revenue !== null && (
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-muted-foreground">
                                {formatFy(selectedFy)}
                              </span>
                              <span className="font-semibold tabular-nums">
                                {formatCurrency(point.revenue, displayCurrency)}
                              </span>
                            </div>
                          )}
                          {point.previous !== null && (
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-muted-foreground">
                                {formatFy(selectedFy - 1)}
                              </span>
                              <span className="text-muted-foreground tabular-nums">
                                {formatCurrency(point.previous, displayCurrency)}
                              </span>
                            </div>
                          )}
                          {point.revenue !== null && point.invoices > 0 && (
                            <p className="text-muted-foreground mt-1.5">
                              {point.invoices} invoice
                              {point.invoices !== 1 ? "s" : ""}
                            </p>
                          )}
                        </div>
                      );
                    }}
                  />
                  {hasPreviousFy && (
                    <Area
                      type="monotone"
                      dataKey="previous"
                      stroke={chartColors.muted}
                      strokeOpacity={0.7}
                      strokeWidth={1.5}
                      strokeDasharray="4 4"
                      fill="none"
                      dot={false}
                      activeDot={false}
                      animationDuration={600}
                    />
                  )}
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke={chartColors.primary}
                    strokeWidth={2}
                    fill="url(#colorRevenue)"
                    dot={false}
                    activeDot={{
                      r: 4,
                      fill: chartColors.primary,
                      stroke: chartColors.cardBg,
                      strokeWidth: 2,
                    }}
                    animationDuration={800}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex h-[300px] items-center justify-center">
              <EmptyState
                title="No revenue to chart"
                description="Monthly trends appear once you create an invoice."
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">Recent Invoices</CardTitle>
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={
                <Link href="/invoices" transitionTypes={["forward"]}>
                  View All
                </Link>
              }
            />
          </div>
        </CardHeader>
        <CardContent>
          {sortedInvoices.length === 0 ? (
            <EmptyState
              icon={FileAttachmentIcon}
              title="No invoices yet"
              description="Get started by creating your first invoice."
              action={
                <Button
                  nativeButton={false}
                  render={
                    <Link href="/invoices/new">
                      <HugeiconsIcon icon={Add01Icon} />
                      Create Invoice
                    </Link>
                  }
                />
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Show/Project</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedInvoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-mono text-[0.8125rem] font-medium tracking-tight">
                      {invoice.invoiceNumber}
                    </TableCell>
                    <TableCell>{invoice.showName}</TableCell>
                    <TableCell>{invoice.clientName || "—"}</TableCell>
                    <TableCell>{formatDate(invoice.invoiceDate)}</TableCell>
                    <TableCell>
                      <InvoiceStatusBadge status={invoice.status} />
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(
                        Number(invoice.totalAmount),
                        invoice.currency,
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <Button
                              variant="outline"
                              size="sm"
                              nativeButton={false}
                              render={
                                <Link
                                  href={`/invoices/${invoice.id}`}
                                  transitionTypes={["forward"]}
                                >
                                  <HugeiconsIcon icon={ViewIcon} className="h-4 w-4" />
                                </Link>
                              }
                            />
                          }
                        />
                        <TooltipContent>View invoice</TooltipContent>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Secondary analytics, grouped and demoted: the page should read
          hero → trend → actionable list → breakdown, not ten equal cards */}
      <h2 className="text-muted-foreground mt-2 text-xs font-semibold tracking-wider uppercase">
        Breakdown
      </h2>
      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Status Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Invoice Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {INVOICE_STATUSES.map(({ value, label, dotClass }) => (
                <div
                  key={value}
                  className="bg-muted/60 flex items-center justify-between rounded-xl px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <div className={`h-2.5 w-2.5 rounded-full ${dotClass}`} />
                    <span className="text-sm font-semibold">{label}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground text-sm font-medium tabular-nums">
                      {statusCounts[value]}
                    </span>
                    <span className="w-9 text-right text-sm font-bold tabular-nums">
                      {fyInvoices.length > 0
                        ? (
                            (statusCounts[value] / fyInvoices.length) *
                            100
                          ).toFixed(0)
                        : 0}
                      %
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Shows */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Shows & Projects</CardTitle>
          </CardHeader>
          <CardContent>
            {topShows.length > 0 ? (
              <div className="space-y-2">
                {topShows.map((item, index) => (
                  <div
                    key={item.show}
                    className="bg-muted/60 hover:bg-muted flex items-center justify-between gap-3 rounded-xl px-4 py-3 transition-colors"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="bg-card text-muted-foreground flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold">
                        {index + 1}
                      </div>
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                        {item.show}
                      </span>
                    </div>
                    <span className="shrink-0 text-sm font-bold tracking-tight tabular-nums">
                      {formatCurrency(item.revenue, displayCurrency)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No shows yet"
                description="Revenue by show appears once you create an invoice."
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Monthly + year overview */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            {isCurrentFy ? (
              <>
                <CardTitle className="text-base">This Month</CardTitle>
                <p className="text-muted-foreground text-sm font-medium">
                  {new Date().toLocaleDateString("en-GB", {
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </>
            ) : (
              <>
                <CardTitle className="text-base">
                  Best Month {formatFy(selectedFy)}
                </CardTitle>
                <p className="text-muted-foreground text-sm font-medium">
                  {bestMonthName} {bestMonthCalendarYear}
                </p>
              </>
            )}
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <p className="text-muted-foreground text-sm font-medium">
                  Revenue
                </p>
                <p className="text-2xl font-bold tabular-nums">
                  {formatCurrency(
                    isCurrentFy ? currentMonthRevenue : bestMonthRevenue,
                    displayCurrency,
                  )}
                </p>
                {monthlyChange !== null && (
                  <div className="flex items-center gap-1">
                    {monthlyChange >= 0 ? (
                      <HugeiconsIcon icon={AnalyticsUpIcon} className="text-success h-3 w-3" />
                    ) : (
                      <HugeiconsIcon icon={AnalyticsDownIcon} className="text-destructive h-3 w-3" />
                    )}
                    <p
                      className={`text-xs ${
                        monthlyChange >= 0 ? "text-success" : "text-destructive"
                      }`}
                    >
                      {monthlyChange >= 0 ? "+" : "−"}
                      {Math.abs(monthlyChange).toFixed(1)}% vs this point last
                      month
                    </p>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <p className="text-muted-foreground text-sm font-medium">
                  Invoices Created
                </p>
                <p className="text-2xl font-bold tabular-nums">
                  {isCurrentFy
                    ? fyInvoices.filter(
                        (inv) =>
                          new Date(inv.invoiceDate).getMonth() === currentMonth,
                      ).length
                    : bestMonthIndex >= 0
                      ? fyInvoices.filter(
                          (inv) =>
                            new Date(inv.invoiceDate).getMonth() ===
                            bestMonthIndex,
                        ).length
                      : 0}
                </p>
                <p className="text-muted-foreground text-xs">
                  {isCurrentFy ? "This month" : `In ${bestMonthName}`}
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-muted-foreground text-sm font-medium">
                  {isCurrentFy ? "Paid This Month" : "Paid That Month"}
                </p>
                <p className="text-success text-2xl font-bold tabular-nums">
                  {isCurrentFy
                    ? fyInvoices.filter(
                        (inv) =>
                          inv.status === "paid" &&
                          new Date(inv.invoiceDate).getMonth() === currentMonth,
                      ).length
                    : bestMonthIndex >= 0
                      ? fyInvoices.filter(
                          (inv) =>
                            inv.status === "paid" &&
                            new Date(inv.invoiceDate).getMonth() ===
                              bestMonthIndex,
                        ).length
                      : 0}
                </p>
                <p className="text-muted-foreground text-xs">Invoices paid</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Year Performance</CardTitle>
            <p className="text-muted-foreground text-sm font-medium">
              {isCurrentFy
                ? `To ${toDateLabel}, vs the same point in ${formatFy(selectedFy - 1)}`
                : `${formatFy(selectedFy)} vs ${formatFy(selectedFy - 1)}`}
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                {
                  fy: selectedFy,
                  revenue: toDateRevenue,
                  barClass: "bg-primary",
                },
                {
                  fy: selectedFy - 1,
                  revenue: previousToDateRevenue,
                  barClass: "bg-muted-foreground/50",
                },
              ].map(({ fy, revenue, barClass }) => (
                <div key={fy}>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-medium">{formatFy(fy)}</span>
                    <span className="text-sm font-bold tabular-nums">
                      {formatCurrency(revenue, displayCurrency)}
                    </span>
                  </div>
                  <div className="bg-muted h-2 overflow-hidden rounded-full">
                    <div
                      className={cn("h-full rounded-full", barClass)}
                      style={{
                        width: `${
                          (revenue /
                            Math.max(toDateRevenue, previousToDateRevenue, 1)) *
                          100
                        }%`,
                      }}
                    />
                  </div>
                </div>
              ))}
              {toDateChange !== null ? (
                <div className="flex items-center gap-2 pt-2">
                  {toDateChange >= 0 ? (
                    <HugeiconsIcon icon={AnalyticsUpIcon} className="text-success h-5 w-5" />
                  ) : (
                    <HugeiconsIcon icon={AnalyticsDownIcon} className="text-destructive h-5 w-5" />
                  )}
                  <span
                    className={`text-sm font-semibold ${
                      toDateChange >= 0 ? "text-success" : "text-destructive"
                    }`}
                  >
                    {toDateChange >= 0 ? "+" : "−"}
                    {Math.abs(toDateChange).toFixed(1)}%{" "}
                    {isCurrentFy
                      ? "vs this point last year"
                      : "vs last financial year"}
                  </span>
                </div>
              ) : (
                <p className="text-muted-foreground pt-2 text-sm font-medium">
                  {isCurrentFy
                    ? `Nothing invoiced by this point in ${formatFy(selectedFy - 1)} to compare against`
                    : `No invoices in ${formatFy(selectedFy - 1)} to compare against`}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
