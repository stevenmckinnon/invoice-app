"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  FileText,
  DollarSign,
  Clock,
  Users,
  TrendingUp,
  CheckCircle,
} from "lucide-react";
import Hero from "./hero/hero";

export const LandingPage = () => {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <Hero />

      {/* Features Section - Bento Grid */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-4">
            Everything You Need
          </h2>
          <p className="text-center text-muted-foreground mb-12 text-lg">
            Powerful features designed for WWE freelancers
          </p>

          {/* Bento Grid Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Large Feature - Professional PDFs */}
            <Card className="md:col-span-2 md:row-span-2 overflow-hidden relative group hover:shadow-xl transition-all duration-300">
              <CardHeader className="relative z-10">
                <div className="p-3 bg-blue-500/10 dark:bg-blue-500/20 rounded-xl w-fit mb-4">
                  <FileText className="h-10 w-10 text-blue-600 dark:text-blue-400" />
                </div>
                <CardTitle className="text-3xl mb-3">
                  Professional PDFs
                </CardTitle>
                <CardDescription className="text-base">
                  Generate beautiful, branded invoices in seconds with our
                  advanced PDF engine. Customize layouts, add your branding, and
                  create professional documents that impress your clients.
                </CardDescription>
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 bg-blue-500/10 dark:bg-blue-500/20 rounded-full text-sm">
                    Custom Branding
                  </span>
                  <span className="px-3 py-1 bg-blue-500/10 dark:bg-blue-500/20 rounded-full text-sm">
                    Instant Download
                  </span>
                  <span className="px-3 py-1 bg-blue-500/10 dark:bg-blue-500/20 rounded-full text-sm">
                    Auto-calculation
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Overtime Tracking */}
            <Card className="hover:shadow-lg transition-all duration-300 group">
              <CardHeader>
                <div className="p-2 bg-purple-500/10 dark:bg-purple-500/20 rounded-lg w-fit mb-3">
                  <Clock className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                </div>
                <CardTitle className="text-xl">Overtime Tracking</CardTitle>
                <CardDescription>
                  Track overtime hours with 1.5x and 2x rates automatically
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Custom Expenses */}
            <Card className="hover:shadow-lg transition-all duration-300 group">
              <CardHeader>
                <div className="p-2 bg-emerald-500/10 dark:bg-emerald-500/20 rounded-lg w-fit mb-3">
                  <DollarSign className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                </div>
                <CardTitle className="text-xl">Custom Expenses</CardTitle>
                <CardDescription>
                  Add travel, meals, and any custom expenses with ease
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Revenue Analytics */}
            <Card className="hover:shadow-lg transition-all duration-300 group">
              <CardHeader>
                <div className="p-2 bg-orange-500/10 dark:bg-orange-500/20 rounded-lg w-fit mb-3">
                  <TrendingUp className="h-8 w-8 text-orange-600 dark:text-orange-400" />
                </div>
                <CardTitle className="text-xl">Revenue Analytics</CardTitle>
                <CardDescription>
                  Track total, paid, and outstanding revenue with real-time
                  insights
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Status Tracking */}
            <Card className="hover:shadow-lg transition-all duration-300 group">
              <CardHeader>
                <div className="p-2 bg-pink-500/10 dark:bg-pink-500/20 rounded-lg w-fit mb-3">
                  <CheckCircle className="h-8 w-8 text-pink-600 dark:text-pink-400" />
                </div>
                <CardTitle className="text-xl">Status Tracking</CardTitle>
                <CardDescription>
                  Monitor invoice status from draft to paid seamlessly
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Client Management */}
            <Card className="hover:shadow-lg transition-all duration-300 group">
              <CardHeader>
                <div className="p-2 bg-cyan-500/10 dark:bg-cyan-500/20 rounded-lg w-fit mb-3">
                  <Users className="h-8 w-8 text-cyan-600 dark:text-cyan-400" />
                </div>
                <CardTitle className="text-xl">Client Management</CardTitle>
                <CardDescription>
                  Store and manage client information with country support
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-lg text-muted-foreground mb-8">
            Join the WWE freelancers who trust our invoice management system.
          </p>
          <Button asChild size="lg">
            <Link href="/auth/signup">Create Free Account</Link>
          </Button>
        </div>
      </section>
    </div>
  );
};
