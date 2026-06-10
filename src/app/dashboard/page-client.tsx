"use client";
import { useEffect, useState } from "react";

import {
  Calendar,
  Clock,
  CreditCard,
  DollarSign,
  EyeIcon,
  FileTextIcon,
  PlusIcon,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
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

import { AnimatedCounter } from "@/components/AnimatedCounter";
import { DashboardSkeleton } from "@/components/DashboardSkeleton";
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
import { currencySymbol, formatCurrency, formatDate } from "@/lib/utils";

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

// UK financial (tax) year runs 6 April – 5 April. A date's FY is identified
// by the calendar year it starts in (e.g. 1 Feb 2026 → FY 2025/26).
const getFyStart = (date: Date): number => {
  const month = date.getMonth();
  const isBeforeApril6 = month < 3 || (month === 3 && date.getDate() < 6);
  return isBeforeApril6 ? date.getFullYear() - 1 : date.getFullYear();
};

const formatFy = (fyStart: number): string =>
  `${fyStart}/${String((fyStart + 1) % 100).padStart(2, "0")}`;

export default function Home() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const { data: invoices = [], isLoading, error } = useInvoices();
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
      <div className="flex min-h-screen items-center justify-center">
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive">
              Failed to load invoices. Please try again.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Derive available financial years from invoice dates, always include current
  const availableFys =
    invoices.length > 0
      ? Array.from(
          new Set([
            currentFy,
            ...invoices.map((inv) => getFyStart(new Date(inv.invoiceDate))),
          ]),
        ).sort((a, b) => b - a)
      : [currentFy];

  // Filter invoices to the selected financial year
  const fyInvoices = invoices.filter(
    (inv) => getFyStart(new Date(inv.invoiceDate)) === selectedFy,
  );

  const displayCurrency = dominantCurrency(fyInvoices);
  const displaySymbol = currencySymbol(displayCurrency);

  const sortedInvoices = [...invoices]
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
  const currentMonth = new Date().getMonth();

  // "This Month" card: only meaningful when viewing the current financial year
  const isCurrentFy = selectedFy === currentFy;

  const currentMonthRevenue = isCurrentFy
    ? fyInvoices
        .filter((inv) => new Date(inv.invoiceDate).getMonth() === currentMonth)
        .reduce((sum, inv) => sum + Number(inv.totalAmount), 0)
    : 0;

  const lastMonthRevenue = isCurrentFy
    ? invoices
        .filter((inv) => {
          const invDate = new Date(inv.invoiceDate);
          const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
          const lastMonthYear =
            currentMonth === 0
              ? new Date().getFullYear() - 1
              : new Date().getFullYear();
          return (
            invDate.getMonth() === lastMonth &&
            invDate.getFullYear() === lastMonthYear
          );
        })
        .reduce((sum, inv) => sum + Number(inv.totalAmount), 0)
    : 0;

  const monthlyChange =
    lastMonthRevenue > 0
      ? ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
      : currentMonthRevenue > 0
        ? 100
        : 0;

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

  // Revenue chart — financial-year order: April through March
  const months = Array.from({ length: 12 }, (_, i) => {
    const calendarMonth = (i + 3) % 12;
    const calendarYear = calendarMonth < 3 ? selectedFy + 1 : selectedFy;
    return {
      month: new Date(calendarYear, calendarMonth).toLocaleDateString("en-GB", {
        month: "short",
      }),
      monthIndex: calendarMonth,
    };
  });

  const revenueData = months.map(({ month, monthIndex }) => {
    const monthRevenue = fyInvoices
      .filter((inv) => new Date(inv.invoiceDate).getMonth() === monthIndex)
      .reduce((sum, inv) => sum + Number(inv.totalAmount), 0);

    return {
      month,
      revenue: monthRevenue,
      invoices: fyInvoices.filter(
        (inv) => new Date(inv.invoiceDate).getMonth() === monthIndex,
      ).length,
    };
  });

  // Financial year comparison — selected FY vs previous FY
  const selectedFyRevenue = totalRevenue;

  const prevFyRevenue = invoices
    .filter((inv) => getFyStart(new Date(inv.invoiceDate)) === selectedFy - 1)
    .reduce((sum, inv) => sum + Number(inv.totalAmount), 0);

  const fyChange =
    prevFyRevenue > 0
      ? ((selectedFyRevenue - prevFyRevenue) / prevFyRevenue) * 100
      : selectedFyRevenue > 0
        ? 100
        : 0;

  return (
    <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-6 p-6 py-10 md:pb-8">
      <PageHeader
        title="Invoice Dashboard"
        subtitle="Create and manage your invoices"
        actions={
          <>
            <Select
              value={String(selectedFy)}
              onValueChange={(val) => setSelectedFy(Number(val))}
            >
              <SelectTrigger className="w-[110px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableFys.map((fy) => (
                  <SelectItem key={fy} value={String(fy)}>
                    {formatFy(fy)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              asChild
              size="lg"
              className="shadow-md transition-shadow hover:shadow-lg"
            >
              <Link href="/invoices/new">
                <PlusIcon className="h-5 w-5" />
                Create Invoice
              </Link>
            </Button>
          </>
        }
      />

      {/* Revenue Stats */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="group transition-all duration-300 hover:shadow-lg">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                Total Revenue
              </CardTitle>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/10 transition-all duration-300 group-hover:from-blue-500/30 group-hover:to-blue-600/20">
                <DollarSign className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="mt-auto">
            <div className="text-3xl font-bold tracking-tight">
              <AnimatedCounter
                value={totalRevenue}
                prefix={displaySymbol}
                duration={1200}
                decimals={2}
              />
            </div>
            <div className="mt-3 flex items-center gap-1.5">
              {monthlyChange >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-500" />
              )}
              <p
                className={`text-xs font-semibold ${
                  monthlyChange >= 0
                    ? "text-green-600 dark:text-green-500"
                    : "text-red-600 dark:text-red-500"
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
              <p className="text-muted-foreground text-xs font-medium">
                vs last month
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="group transition-all duration-300 hover:shadow-lg">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                Paid
              </CardTitle>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-green-500/20 to-green-600/10 transition-all duration-300 group-hover:from-green-500/30 group-hover:to-green-600/20">
                <CreditCard className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="mt-auto">
            <div className="text-3xl font-bold tracking-tight text-green-600 dark:text-green-500">
              <AnimatedCounter
                value={paidRevenue}
                prefix={displaySymbol}
                duration={1200}
                decimals={2}
                delay={100}
              />
            </div>
            <p className="text-muted-foreground mt-3 text-xs font-medium">
              {fyInvoices.filter((inv) => inv.status === "paid").length} paid
              invoices
            </p>
          </CardContent>
        </Card>

        <Card className="group transition-all duration-300 hover:shadow-lg">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                Outstanding
              </CardTitle>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500/20 to-orange-600/10 transition-all duration-300 group-hover:from-orange-500/30 group-hover:to-orange-600/20">
                <Clock className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="mt-auto">
            <div className="text-3xl font-bold tracking-tight text-orange-600 dark:text-orange-500">
              <AnimatedCounter
                value={outstandingRevenue}
                prefix={displaySymbol}
                duration={1200}
                decimals={2}
                delay={200}
              />
            </div>
            <p className="text-muted-foreground mt-3 text-xs font-medium">
              {fyInvoices.filter((inv) => inv.status !== "paid").length} unpaid
            </p>
          </CardContent>
        </Card>

        <Card className="group transition-all duration-300 hover:shadow-lg">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                Average Invoice
              </CardTitle>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-600/10 transition-all duration-300 group-hover:from-purple-500/30 group-hover:to-purple-600/20">
                <FileTextIcon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="mt-auto">
            <div className="text-3xl font-bold tracking-tight">
              <AnimatedCounter
                value={averageInvoice}
                prefix={displaySymbol}
                duration={1200}
                decimals={2}
                delay={300}
              />
            </div>
            <p className="text-muted-foreground mt-3 text-xs font-medium">
              per invoice
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Status Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Invoice Status</CardTitle>
            <p className="text-muted-foreground text-sm font-medium">
              Breakdown by status
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="border-border/50 bg-muted/20 hover:bg-muted/30 flex items-center justify-between rounded-lg border p-3 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="h-3 w-3 rounded-full bg-gray-500 shadow-sm" />
                  <span className="text-sm font-semibold">Draft</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground text-sm font-medium">
                    {statusCounts.draft}
                  </span>
                  <span className="text-sm font-bold">
                    {fyInvoices.length > 0
                      ? (
                          (statusCounts.draft / fyInvoices.length) *
                          100
                        ).toFixed(0)
                      : 0}
                    %
                  </span>
                </div>
              </div>
              <div className="border-border/50 bg-muted/20 hover:bg-muted/30 flex items-center justify-between rounded-lg border p-3 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="h-3 w-3 rounded-full bg-blue-500 shadow-sm" />
                  <span className="text-sm font-semibold">Sent</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground text-sm font-medium">
                    {statusCounts.sent}
                  </span>
                  <span className="text-sm font-bold">
                    {fyInvoices.length > 0
                      ? ((statusCounts.sent / fyInvoices.length) * 100).toFixed(
                          0,
                        )
                      : 0}
                    %
                  </span>
                </div>
              </div>
              <div className="border-border/50 bg-muted/20 hover:bg-muted/30 flex items-center justify-between rounded-lg border p-3 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="h-3 w-3 rounded-full bg-green-500 shadow-sm" />
                  <span className="text-sm font-semibold">Paid</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground text-sm font-medium">
                    {statusCounts.paid}
                  </span>
                  <span className="text-sm font-bold">
                    {fyInvoices.length > 0
                      ? ((statusCounts.paid / fyInvoices.length) * 100).toFixed(
                          0,
                        )
                      : 0}
                    %
                  </span>
                </div>
              </div>
              <div className="border-border/50 bg-muted/20 hover:bg-muted/30 flex items-center justify-between rounded-lg border p-3 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="h-3 w-3 rounded-full bg-red-500 shadow-sm" />
                  <span className="text-sm font-semibold">Overdue</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground text-sm font-medium">
                    {statusCounts.overdue}
                  </span>
                  <span className="text-sm font-bold">
                    {fyInvoices.length > 0
                      ? (
                          (statusCounts.overdue / fyInvoices.length) *
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
            <CardTitle className="text-xl">
              Top Shows/Projects by Revenue
            </CardTitle>
            <p className="text-muted-foreground text-sm font-medium">
              Your highest earning projects
            </p>
          </CardHeader>
          <CardContent>
            {topShows.length > 0 ? (
              <div className="space-y-2">
                {topShows.map((item, index) => (
                  <div
                    key={item.show}
                    className="border-border/50 bg-muted/20 hover:bg-muted/30 flex items-center justify-between rounded-lg border p-3 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="bg-primary/20 text-primary flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold shadow-sm">
                        {index + 1}
                      </div>
                      <span className="max-w-[200px] truncate text-sm font-semibold">
                        {item.show}
                      </span>
                    </div>
                    <span className="text-sm font-bold tracking-tight">
                      <AnimatedCounter
                        value={item.revenue}
                        prefix={displaySymbol}
                        duration={1000}
                        decimals={2}
                        delay={400 + index * 100}
                      />
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground py-8 text-center text-sm font-medium">
                No shows yet. Create your first invoice to see stats.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Monthly Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              {isCurrentFy ? (
                <>
                  <CardTitle className="text-xl">This Month</CardTitle>
                  <p className="text-muted-foreground text-sm font-medium">
                    {new Date().toLocaleDateString("en-GB", {
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </>
              ) : (
                <>
                  <CardTitle className="text-xl">
                    Best Month {formatFy(selectedFy)}
                  </CardTitle>
                  <p className="text-muted-foreground text-sm font-medium">
                    {bestMonthName} {bestMonthCalendarYear}
                  </p>
                </>
              )}
            </div>
            <Calendar className="text-muted-foreground h-8 w-8" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <p className="text-muted-foreground text-sm font-medium">
                Revenue
              </p>
              <p className="text-2xl font-bold">
                <AnimatedCounter
                  value={isCurrentFy ? currentMonthRevenue : bestMonthRevenue}
                  prefix={displaySymbol}
                  duration={1200}
                  decimals={2}
                  delay={100}
                />
              </p>
              {isCurrentFy && (
                <div className="flex items-center gap-1">
                  {monthlyChange >= 0 ? (
                    <TrendingUp className="h-3 w-3 text-green-600" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-red-600" />
                  )}
                  <p
                    className={`text-xs ${
                      monthlyChange >= 0 ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {monthlyChange >= 0 ? "+" : ""}
                    <AnimatedCounter
                      value={Math.abs(monthlyChange)}
                      suffix="% from last month"
                      duration={1000}
                      decimals={1}
                      delay={100}
                    />
                  </p>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <p className="text-muted-foreground text-sm font-medium">
                Invoices Created
              </p>
              <p className="text-2xl font-bold">
                <AnimatedCounter
                  value={
                    isCurrentFy
                      ? fyInvoices.filter(
                          (inv) =>
                            new Date(inv.invoiceDate).getMonth() ===
                            currentMonth,
                        ).length
                      : bestMonthIndex >= 0
                        ? fyInvoices.filter(
                            (inv) =>
                              new Date(inv.invoiceDate).getMonth() ===
                              bestMonthIndex,
                          ).length
                        : 0
                  }
                  duration={1000}
                  decimals={0}
                  delay={200}
                />
              </p>
              <p className="text-muted-foreground text-xs">
                {isCurrentFy ? "This month" : `In ${bestMonthName}`}
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-muted-foreground text-sm font-medium">
                {isCurrentFy ? "Paid This Month" : "Paid That Month"}
              </p>
              <p className="text-2xl font-bold text-green-600">
                <AnimatedCounter
                  value={
                    isCurrentFy
                      ? fyInvoices.filter(
                          (inv) =>
                            inv.status === "paid" &&
                            new Date(inv.invoiceDate).getMonth() ===
                              currentMonth,
                        ).length
                      : bestMonthIndex >= 0
                        ? fyInvoices.filter(
                            (inv) =>
                              inv.status === "paid" &&
                              new Date(inv.invoiceDate).getMonth() ===
                                bestMonthIndex,
                          ).length
                        : 0
                  }
                  duration={1000}
                  decimals={0}
                  delay={300}
                />
              </p>
              <p className="text-muted-foreground text-xs">Invoices paid</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Revenue Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">
            {formatFy(selectedFy)} Revenue
          </CardTitle>
          <p className="text-muted-foreground text-sm font-medium">
            Monthly breakdown
          </p>
        </CardHeader>
        <CardContent className="px-0 py-6 md:px-4">
          {fyInvoices.length > 0 ? (
            <div className="h-[320px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={revenueData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
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
                        offset="5%"
                        stopColor={chartColors.primary}
                        stopOpacity={0.8}
                      />
                      <stop
                        offset="95%"
                        stopColor={chartColors.primary}
                        stopOpacity={0.1}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="1 3"
                    stroke={chartColors.grid}
                    strokeOpacity={0.3}
                  />
                  <XAxis
                    dataKey="month"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: chartColors.muted }}
                    dy={5}
                  />
                  <YAxis
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: chartColors.muted }}
                    tickFormatter={(value) =>
                      formatCurrency(value, displayCurrency, { decimals: 0 })
                    }
                    dx={-5}
                  />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: chartColors.cardBg,
                      border: `1px solid ${chartColors.border}`,
                      borderRadius: "8px",
                      boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.3)",
                    }}
                    labelStyle={{
                      fontWeight: "600",
                      marginBottom: "4px",
                    }}
                    formatter={(value: number) => [
                      formatCurrency(value, displayCurrency),
                      "Revenue",
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke={chartColors.primary}
                    strokeWidth={2}
                    fill="url(#colorRevenue)"
                    animationDuration={800}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex h-[300px] items-center justify-center">
              <p className="text-muted-foreground text-sm">
                No data to display. Create your first invoice to see trends.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Year Overview */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Year Performance</CardTitle>
            <p className="text-muted-foreground text-sm font-medium">
              {formatFy(selectedFy)} vs {formatFy(selectedFy - 1)}
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {formatFy(selectedFy)}
                  </span>
                  <span className="text-sm font-bold">
                    <AnimatedCounter
                      value={selectedFyRevenue}
                      prefix={displaySymbol}
                      duration={1200}
                      decimals={2}
                      delay={100}
                    />
                  </span>
                </div>
                <div className="bg-muted h-2 overflow-hidden rounded-full">
                  <div
                    className="bg-primary h-full rounded-full"
                    style={{
                      width: `${Math.min(
                        100,
                        (selectedFyRevenue /
                          Math.max(selectedFyRevenue, prevFyRevenue, 1)) *
                          100,
                      )}%`,
                    }}
                  />
                </div>
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {formatFy(selectedFy - 1)}
                  </span>
                  <span className="text-sm font-bold">
                    <AnimatedCounter
                      value={prevFyRevenue}
                      prefix={displaySymbol}
                      duration={1200}
                      decimals={2}
                      delay={200}
                    />
                  </span>
                </div>
                <div className="bg-muted h-2 overflow-hidden rounded-full">
                  <div
                    className="bg-muted-foreground/50 h-full rounded-full"
                    style={{
                      width: `${Math.min(
                        100,
                        (prevFyRevenue /
                          Math.max(selectedFyRevenue, prevFyRevenue, 1)) *
                          100,
                      )}%`,
                    }}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 pt-2">
                {fyChange >= 0 ? (
                  <TrendingUp className="h-5 w-5 text-green-600" />
                ) : (
                  <TrendingDown className="h-5 w-5 text-red-600" />
                )}
                <span
                  className={`text-sm font-semibold ${
                    fyChange >= 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {fyChange >= 0 ? "+" : ""}
                  <AnimatedCounter
                    value={Math.abs(fyChange)}
                    suffix="% vs last financial year"
                    duration={1000}
                    decimals={1}
                    delay={300}
                  />
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Quick Stats</CardTitle>
            <p className="text-muted-foreground text-sm font-medium">
              Key metrics at a glance
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <span className="text-sm font-medium">Total Invoices</span>
                <span className="text-2xl font-bold">
                  <AnimatedCounter
                    value={fyInvoices.length}
                    duration={1000}
                    decimals={0}
                    delay={100}
                  />
                </span>
              </div>
              <div className="flex items-center justify-between border-b pb-3">
                <span className="text-sm font-medium">Payment Rate</span>
                <span className="text-2xl font-bold text-green-600">
                  <AnimatedCounter
                    value={
                      fyInvoices.length > 0
                        ? (statusCounts.paid / fyInvoices.length) * 100
                        : 0
                    }
                    suffix="%"
                    duration={1000}
                    decimals={0}
                    delay={200}
                  />
                </span>
              </div>
              <div className="flex items-center justify-between border-b pb-3">
                <span className="text-sm font-medium">
                  Unique Shows/Projects
                </span>
                <span className="text-2xl font-bold">
                  <AnimatedCounter
                    value={Object.keys(showRevenue).length}
                    duration={800}
                    decimals={0}
                    delay={300}
                  />
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {isCurrentFy ? "This Month" : `Best Month`}
                </span>
                <span className="text-2xl font-bold">
                  <AnimatedCounter
                    value={isCurrentFy ? currentMonthRevenue : bestMonthRevenue}
                    prefix={displaySymbol}
                    duration={1200}
                    decimals={2}
                    delay={400}
                  />
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">Recent Invoices</CardTitle>
              <p className="text-muted-foreground mt-1 text-sm font-medium">
                Your latest 5 invoices
              </p>
            </div>
            <Button
              asChild
              variant="outline"
              size="sm"
              className="shadow-sm transition-shadow hover:shadow-md"
            >
              <Link href="/invoices" transitionTypes={["forward"]}>
                View All
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {sortedInvoices.length === 0 ? (
            <div className="py-12 text-center">
              <FileTextIcon className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
              <h3 className="mb-2 text-lg font-medium">No invoices yet</h3>
              <p className="text-muted-foreground mb-4 text-sm">
                Get started by creating your first invoice
              </p>
              <Button asChild>
                <Link href="/invoices/new">
                  <PlusIcon className="h-4 w-4" />
                  Create Invoice
                </Link>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Show/Project</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedInvoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">
                      {invoice.invoiceNumber}
                    </TableCell>
                    <TableCell>{invoice.clientName || "—"}</TableCell>
                    <TableCell>{invoice.showName}</TableCell>
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
                        <TooltipTrigger asChild>
                          <Button asChild variant="outline" size="sm">
                            <Link
                              href={`/invoices/${invoice.id}`}
                              transitionTypes={["forward"]}
                            >
                              <EyeIcon className="h-4 w-4" />
                            </Link>
                          </Button>
                        </TooltipTrigger>
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
    </div>
  );
}
