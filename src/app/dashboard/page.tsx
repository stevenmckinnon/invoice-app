"use client";
import { AnimatedCounter } from "@/components/AnimatedCounter";
import { DashboardSkeleton } from "@/components/DashboardSkeleton";
import { InvoiceStatusBadge } from "@/components/InvoiceStatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { useSession } from "@/lib/auth-client";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";

// Helper to format date without timezone shift
const formatDate = (dateStr: Date | string) => {
  const date =
    typeof dateStr === "string" ? new Date(dateStr + "T00:00:00") : dateStr;
  return date.toLocaleDateString("en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

type Invoice = {
  id: string;
  invoiceNumber: string;
  invoiceDate: Date;
  showName: string;
  clientName: string | null;
  totalAmount: number;
  status: string;
  createdAt: Date;
};

export default function Home() {
  const { data: session, isPending } = useSession();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [chartColors, setChartColors] = useState({
    primary: "#3b82f6",
    muted: "#9ca3af",
    grid: "#374151",
    cardBg: "#1f2937",
    border: "#374151",
  });

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

  const fetchInvoices = async () => {
    try {
      const res = await fetch("/api/invoices");
      if (res.ok) {
        const data = await res.json();
        setInvoices(data);
      }
    } catch (error) {
      console.error("Failed to fetch invoices:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (session) {
      fetchInvoices();
    } else if (!isPending) {
      setIsLoading(false);
    }
  }, [session, isPending]);

  // Show landing page for non-authenticated users
  if (isPending) {
    return <DashboardSkeleton />;
  }

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  const sortedInvoices = invoices
    .sort(
      (a, b) =>
        new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime()
    )
    .slice(0, 5); // Show only latest 5 invoices

  const totalRevenue = invoices.reduce(
    (sum, inv) => sum + Number(inv.totalAmount),
    0
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
  const showRevenue = invoices.reduce((acc, inv) => {
    const show = inv.showName || "Unknown";
    acc[show] = (acc[show] || 0) + Number(inv.totalAmount);
    return acc;
  }, {} as Record<string, number>);

  const topShows = Object.entries(showRevenue)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([show, revenue]) => ({ show, revenue }));

  // Average invoice value
  const averageInvoice =
    invoices.length > 0 ? totalRevenue / invoices.length : 0;

  // Revenue trend data (last 6 months)
  const last6Months = Array.from({ length: 6 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (5 - i));
    return {
      month: date.toLocaleDateString("en-GB", { month: "short" }),
      year: date.getFullYear(),
      monthIndex: date.getMonth(),
    };
  });

  const revenueData = last6Months.map((monthData) => {
    const monthRevenue = invoices
      .filter((inv) => {
        const invDate = new Date(inv.invoiceDate);
        return (
          invDate.getMonth() === monthData.monthIndex &&
          invDate.getFullYear() === monthData.year
        );
      })
      .reduce((sum, inv) => sum + Number(inv.totalAmount), 0);

    return {
      month: monthData.month,
      revenue: monthRevenue,
      invoices: invoices.filter((inv) => {
        const invDate = new Date(inv.invoiceDate);
        return (
          invDate.getMonth() === monthData.monthIndex &&
          invDate.getFullYear() === monthData.year
        );
      }).length,
    };
  });

  // Year-over-year comparison
  const currentYearRevenue = invoices
    .filter((inv) => new Date(inv.invoiceDate).getFullYear() === currentYear)
    .reduce((sum, inv) => sum + Number(inv.totalAmount), 0);

  const lastYearRevenue = invoices
    .filter(
      (inv) => new Date(inv.invoiceDate).getFullYear() === currentYear - 1
    )
    .reduce((sum, inv) => sum + Number(inv.totalAmount), 0);

  const yearlyChange =
    lastYearRevenue > 0
      ? ((currentYearRevenue - lastYearRevenue) / lastYearRevenue) * 100
      : currentYearRevenue > 0
      ? 100
      : 0;

  return (
    <div className="w-full max-w-6xl mx-auto p-6 pb-8 grid grid-cols-1 gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Invoice Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create and manage your invoices
          </p>
        </div>
        <Button asChild size="lg">
          <Link href="/invoices/new">
            <PlusIcon className="h-5 w-5" />
            Create Invoice
          </Link>
        </Button>
      </div>

      {/* Revenue Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Revenue
              </CardTitle>
              <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <DollarSign className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <AnimatedCounter
                value={totalRevenue}
                prefix="£"
                duration={1200}
                decimals={2}
              />
            </div>
            <div className="flex items-center gap-1 mt-2">
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
              <p className="text-xs text-muted-foreground">vs last month</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Paid
              </CardTitle>
              <div className="h-8 w-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                <CreditCard className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              <AnimatedCounter
                value={paidRevenue}
                prefix="£"
                duration={1200}
                decimals={2}
                delay={100}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {invoices.filter((inv) => inv.status === "paid").length} paid
              invoices
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Outstanding
              </CardTitle>
              <div className="h-8 w-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <Clock className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              <AnimatedCounter
                value={outstandingRevenue}
                prefix="£"
                duration={1200}
                decimals={2}
                delay={200}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {invoices.filter((inv) => inv.status !== "paid").length} unpaid
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Average Invoice
              </CardTitle>
              <div className="h-8 w-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <FileTextIcon className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <AnimatedCounter
                value={averageInvoice}
                prefix="£"
                duration={1200}
                decimals={2}
                delay={300}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">per invoice</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Status Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Invoice Status</CardTitle>
            <p className="text-sm text-muted-foreground">Breakdown by status</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-gray-500" />
                  <span className="text-sm font-medium">Draft</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {statusCounts.draft}
                  </span>
                  <span className="text-sm font-medium">
                    {invoices.length > 0
                      ? ((statusCounts.draft / invoices.length) * 100).toFixed(
                          0
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
                  <span className="text-sm text-muted-foreground">
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
                  <span className="text-sm text-muted-foreground">
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
                  <span className="text-sm text-muted-foreground">
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
            <p className="text-sm text-muted-foreground">
              Your highest earning projects
            </p>
          </CardHeader>
          <CardContent>
            {topShows.length > 0 ? (
              <div className="space-y-3">
                {topShows.map((item, index) => (
                  <div
                    key={item.show}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-xs font-bold">
                        {index + 1}
                      </div>
                      <span className="text-sm font-medium truncate max-w-[200px]">
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
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
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
              <CardTitle>This Month</CardTitle>
              <p className="text-sm text-muted-foreground">
                {new Date().toLocaleDateString("en-GB", {
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>
            <Calendar className="h-8 w-8 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                Revenue
              </p>
              <p className="text-2xl font-bold">
                <AnimatedCounter
                  value={currentMonthRevenue}
                  prefix="£"
                  duration={1200}
                  decimals={2}
                  delay={100}
                />
              </p>
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
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                Invoices Created
              </p>
              <p className="text-2xl font-bold">
                <AnimatedCounter
                  value={
                    invoices.filter((inv) => {
                      const invDate = new Date(inv.invoiceDate);
                      return (
                        invDate.getMonth() === currentMonth &&
                        invDate.getFullYear() === currentYear
                      );
                    }).length
                  }
                  duration={1000}
                  decimals={0}
                  delay={200}
                />
              </p>
              <p className="text-xs text-muted-foreground">This month</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                Paid This Month
              </p>
              <p className="text-2xl font-bold text-green-600">
                <AnimatedCounter
                  value={
                    invoices.filter((inv) => {
                      const invDate = new Date(inv.invoiceDate);
                      return (
                        inv.status === "paid" &&
                        invDate.getMonth() === currentMonth &&
                        invDate.getFullYear() === currentYear
                      );
                    }).length
                  }
                  duration={1000}
                  decimals={0}
                  delay={300}
                />
              </p>
              <p className="text-xs text-muted-foreground">Invoices paid</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Revenue Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue Trend</CardTitle>
          <p className="text-sm text-muted-foreground">
            Last 6 months performance
          </p>
        </CardHeader>
        <CardContent className="pt-6">
          {invoices.length > 0 ? (
            <div className="w-full h-[320px]">
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
                    tickFormatter={(value) => `£${value}`}
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
                      `£${value.toFixed(2)}`,
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
            <div className="h-[300px] flex items-center justify-center">
              <p className="text-sm text-muted-foreground">
                No data to display. Create your first invoice to see trends.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Year Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Year-to-Date Performance</CardTitle>
            <p className="text-sm text-muted-foreground">
              {currentYear} vs {currentYear - 1}
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">{currentYear}</span>
                  <span className="text-sm font-bold">
                    <AnimatedCounter
                      value={currentYearRevenue}
                      prefix="£"
                      duration={1200}
                      decimals={2}
                      delay={100}
                    />
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full"
                    style={{
                      width: `${Math.min(
                        100,
                        (currentYearRevenue /
                          Math.max(currentYearRevenue, lastYearRevenue, 1)) *
                          100
                      )}%`,
                    }}
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">{currentYear - 1}</span>
                  <span className="text-sm font-bold">
                    <AnimatedCounter
                      value={lastYearRevenue}
                      prefix="£"
                      duration={1200}
                      decimals={2}
                      delay={200}
                    />
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-muted-foreground/50 rounded-full"
                    style={{
                      width: `${Math.min(
                        100,
                        (lastYearRevenue /
                          Math.max(currentYearRevenue, lastYearRevenue, 1)) *
                          100
                      )}%`,
                    }}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 pt-2">
                {yearlyChange >= 0 ? (
                  <TrendingUp className="h-5 w-5 text-green-600" />
                ) : (
                  <TrendingDown className="h-5 w-5 text-red-600" />
                )}
                <span
                  className={`text-sm font-semibold ${
                    yearlyChange >= 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {yearlyChange >= 0 ? "+" : ""}
                  <AnimatedCounter
                    value={Math.abs(yearlyChange)}
                    suffix="% year-over-year"
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
            <CardTitle>Quick Stats</CardTitle>
            <p className="text-sm text-muted-foreground">
              Key metrics at a glance
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b">
                <span className="text-sm font-medium">Total Invoices</span>
                <span className="text-2xl font-bold">
                  <AnimatedCounter
                    value={invoices.length}
                    duration={1000}
                    decimals={0}
                    delay={100}
                  />
                </span>
              </div>
              <div className="flex items-center justify-between pb-3 border-b">
                <span className="text-sm font-medium">Payment Rate</span>
                <span className="text-2xl font-bold text-green-600">
                  <AnimatedCounter
                    value={
                      invoices.length > 0
                        ? (statusCounts.paid / invoices.length) * 100
                        : 0
                    }
                    suffix="%"
                    duration={1000}
                    decimals={0}
                    delay={200}
                  />
                </span>
              </div>
              <div className="flex items-center justify-between pb-3 border-b">
                <span className="text-sm font-medium">Unique Shows</span>
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
                <span className="text-sm font-medium">This Month</span>
                <span className="text-2xl font-bold">
                  <AnimatedCounter
                    value={currentMonthRevenue}
                    prefix="£"
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
              <CardTitle>Recent Invoices</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Your latest 5 invoices
              </p>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/invoices">View All</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-sm text-muted-foreground">Loading...</p>
            </div>
          ) : sortedInvoices.length === 0 ? (
            <div className="text-center py-12">
              <FileTextIcon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No invoices yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
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
                  <TableHead>Project</TableHead>
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
                      £{Number(invoice.totalAmount).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button asChild variant="outline" size="sm">
                            <Link href={`/invoices/${invoice.id}`}>
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
