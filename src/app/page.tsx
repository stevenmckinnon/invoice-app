import {
  CheckCircle,
  Clock,
  DollarSign,
  ExternalLink,
  FileText,
  Globe,
  Shield,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import Link from "next/link";

import CaleyLogo from "@/components/CaleyLogo";
import { SectionReveal } from "@/components/cross-platform/SectionReveal";
import Hero from "@/components/hero/hero";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <Hero />

      {/* Why Choose Us Section */}
      <section className="bg-background px-4 py-20">
        <SectionReveal className="mx-auto max-w-6xl">
          <div className="mb-16 text-center">
            <h2 className="text-primary mb-3 text-sm font-semibold tracking-wider uppercase">
              Why Choose Us
            </h2>
            <h3 className="font-oswald mb-4 text-4xl font-bold md:text-5xl">
              Leading Invoicing Solution for Freelancers
            </h3>
            <p className="text-muted-foreground mx-auto max-w-2xl text-lg">
              A professional invoicing system built for freelancers and
              businesses worldwide.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            <SectionReveal>
              <Card className="hover:border-primary/50 group border-2 transition-all duration-300">
                <CardHeader>
                  <div className="bg-primary/10 group-hover:bg-primary/20 mb-4 flex h-12 w-12 items-center justify-center rounded-lg transition-colors">
                    <Zap className="text-primary h-6 w-6" />
                  </div>
                  <CardTitle className="text-xl">Lightning Fast</CardTitle>
                  <CardDescription className="mt-2 text-base">
                    Generate professional invoices in seconds with intelligent
                    auto-fill and smart calculations
                  </CardDescription>
                </CardHeader>
              </Card>
            </SectionReveal>

            <SectionReveal delay={0.05}>
              <Card className="hover:border-primary/50 group border-2 transition-all duration-300">
                <CardHeader>
                  <div className="bg-primary/10 group-hover:bg-primary/20 mb-4 flex h-12 w-12 items-center justify-center rounded-lg transition-colors">
                    <Shield className="text-primary h-6 w-6" />
                  </div>
                  <CardTitle className="text-xl">Secure & Reliable</CardTitle>
                  <CardDescription className="mt-2 text-base">
                    Bank-grade security with automatic backups. Your data is
                    always safe and accessible
                  </CardDescription>
                </CardHeader>
              </Card>
            </SectionReveal>

            <SectionReveal delay={0.1}>
              <Card className="hover:border-primary/50 group border-2 transition-all duration-300">
                <CardHeader>
                  <div className="bg-primary/10 group-hover:bg-primary/20 mb-4 flex h-12 w-12 items-center justify-center rounded-lg transition-colors">
                    <Globe className="text-primary h-6 w-6" />
                  </div>
                  <CardTitle className="text-xl">Work From Anywhere</CardTitle>
                  <CardDescription className="mt-2 text-base">
                    Access your invoices from any device, anywhere in the world.
                    Cloud-based and always in sync
                  </CardDescription>
                </CardHeader>
              </Card>
            </SectionReveal>
          </div>
        </SectionReveal>
      </section>

      {/* Features Section - Bento Grid */}
      <section className="bg-muted/30 px-6 py-20">
        <SectionReveal className="mx-auto max-w-6xl">
          <div className="mb-16 text-center">
            <h2 className="text-primary mb-3 text-sm font-semibold tracking-wider uppercase">
              Our Features
            </h2>
            <h3 className="font-oswald mb-4 text-4xl font-bold md:text-5xl">
              Everything You Need in One Place
            </h3>
            <p className="text-muted-foreground mx-auto max-w-2xl text-center text-lg">
              Powerful features designed specifically for freelancers and
              businesses
            </p>
          </div>
        </SectionReveal>

        {/* Bento Grid Layout */}
        <SectionReveal className="mx-auto grid max-w-6xl grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Large Feature - Professional PDFs */}
          <Card className="group relative overflow-hidden transition-all duration-300 hover:shadow-xl md:col-span-2 md:row-span-2">
            <CardHeader className="relative z-10">
              <div className="mb-4 w-fit rounded-xl bg-blue-500/10 p-3 dark:bg-blue-500/20">
                <FileText className="h-10 w-10 text-blue-600 dark:text-blue-400" />
              </div>
              <CardTitle className="mb-3 text-3xl">Professional PDFs</CardTitle>
              <CardDescription className="text-base">
                Generate beautiful, branded invoices in seconds with our
                advanced PDF engine. Customize layouts, add your branding, and
                create professional documents that impress your clients.
              </CardDescription>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-blue-500/10 px-3 py-1 text-sm dark:bg-blue-500/20">
                  Custom Branding
                </span>
                <span className="rounded-full bg-blue-500/10 px-3 py-1 text-sm dark:bg-blue-500/20">
                  Instant Download
                </span>
                <span className="rounded-full bg-blue-500/10 px-3 py-1 text-sm dark:bg-blue-500/20">
                  Auto-calculation
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Overtime Tracking */}
          <Card className="group transition-all duration-300 hover:shadow-lg">
            <CardHeader>
              <div className="mb-3 w-fit rounded-lg bg-purple-500/10 p-2 dark:bg-purple-500/20">
                <Clock className="h-8 w-8 text-purple-600 dark:text-purple-400" />
              </div>
              <CardTitle className="text-xl">Overtime Tracking</CardTitle>
              <CardDescription>
                Track overtime hours with 1.5x and 2x rates automatically
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Custom Expenses */}
          <Card className="group transition-all duration-300 hover:shadow-lg">
            <CardHeader>
              <div className="mb-3 w-fit rounded-lg bg-emerald-500/10 p-2 dark:bg-emerald-500/20">
                <DollarSign className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
              </div>
              <CardTitle className="text-xl">Custom Expenses</CardTitle>
              <CardDescription>
                Add travel, meals, and any custom expenses with ease
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Revenue Analytics */}
          <Card className="group transition-all duration-300 hover:shadow-lg">
            <CardHeader>
              <div className="mb-3 w-fit rounded-lg bg-orange-500/10 p-2 dark:bg-orange-500/20">
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
          <Card className="group transition-all duration-300 hover:shadow-lg">
            <CardHeader>
              <div className="mb-3 w-fit rounded-lg bg-pink-500/10 p-2 dark:bg-pink-500/20">
                <CheckCircle className="h-8 w-8 text-pink-600 dark:text-pink-400" />
              </div>
              <CardTitle className="text-xl">Status Tracking</CardTitle>
              <CardDescription>
                Monitor invoice status from draft to paid seamlessly
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Client Management */}
          <Card className="group transition-all duration-300 hover:shadow-lg">
            <CardHeader>
              <div className="mb-3 w-fit rounded-lg bg-cyan-500/10 p-2 dark:bg-cyan-500/20">
                <Users className="h-8 w-8 text-cyan-600 dark:text-cyan-400" />
              </div>
              <CardTitle className="text-xl">Client Management</CardTitle>
              <CardDescription>
                Store and manage client information with country support
              </CardDescription>
            </CardHeader>
          </Card>
        </SectionReveal>
      </section>

      {/* FAQ Section */}
      <section className="bg-background px-4 py-20">
        <SectionReveal className="mx-auto max-w-3xl">
          <div className="mb-12 text-center">
            <h2 className="font-oswald mb-4 text-4xl font-bold md:text-5xl">
              Frequently Asked Questions
            </h2>
            <p className="text-muted-foreground text-lg">
              Find answers to common questions about our invoicing system
            </p>
          </div>

          <SectionReveal delay={0.05}>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1">
                <AccordionTrigger className="text-left text-base font-semibold">
                  How do I get started with creating invoices?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground text-base">
                  Simply sign up for a free account, complete your profile with
                  your personal and banking details, and you&apos;re ready to
                  create your first invoice. The system will auto-fill your
                  information for all future invoices.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-2">
                <AccordionTrigger className="text-left text-base font-semibold">
                  Can I track overtime hours?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground text-base">
                  Yes! Our system includes built-in overtime tracking with 1.5x
                  and 2x rate calculations. Simply add your overtime entries by
                  date and the system automatically calculates the correct
                  amounts based on your day rate.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-3">
                <AccordionTrigger className="text-left text-base font-semibold">
                  What currencies are supported?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground text-base">
                  We support GBP, USD, EUR, CAD, and AUD. You can set your
                  preferred currency in your profile settings, and all invoices
                  will use that currency by default.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-4">
                <AccordionTrigger className="text-left text-base font-semibold">
                  Is my financial data secure?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground text-base">
                  Absolutely. We use industry-standard encryption and secure
                  authentication through NextAuth. Your banking details and
                  invoice data are stored securely in our PostgreSQL database
                  with regular backups.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-5">
                <AccordionTrigger className="text-left text-base font-semibold">
                  Can I customize my invoices?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground text-base">
                  Yes! You can add custom line items, manage per diems for work
                  and travel days, include custom expenses, and add notes to
                  each invoice. The system automatically calculates totals and
                  generates professional PDF exports.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-6">
                <AccordionTrigger className="text-left text-base font-semibold">
                  How does the day rate calculation work?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground text-base">
                  Your day rate covers work, travel, and dark days. The system
                  calculates your regular hourly rate as 10% of your day rate
                  (based on a 10-hour day). This hourly rate is then used for
                  overtime calculations at 1.5x or 2x multipliers.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </SectionReveal>
        </SectionReveal>
      </section>

      {/* Testimonials Section */}
      <section className="bg-muted/30 px-4 py-20">
        <SectionReveal className="mx-auto max-w-6xl">
          <div className="mb-16 text-center">
            <h2 className="font-oswald mb-4 text-4xl font-bold md:text-5xl">
              Loved by Freelancers
            </h2>
            <p className="text-muted-foreground text-lg">
              Their experiences speak louder than words
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            <SectionReveal>
              <Card className="border-2">
                <CardHeader>
                  <div className="mb-4 flex items-start gap-1">
                    {[...Array(5)].map((_, i) => (
                      <svg
                        key={i}
                        className="fill-primary h-5 w-5"
                        viewBox="0 0 20 20"
                      >
                        <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                      </svg>
                    ))}
                  </div>
                  <CardDescription className="text-base leading-relaxed">
                    &ldquo;This system completely changed how I manage my
                    invoicing. The overtime tracking and expense management
                    saves me hours every month.&rdquo;
                  </CardDescription>
                </CardHeader>
                <CardContent className="mt-auto">
                  <p className="font-semibold">Sarah Mitchell</p>
                  <p className="text-muted-foreground text-sm">
                    Freelance Coordinator
                  </p>
                </CardContent>
              </Card>
            </SectionReveal>

            <SectionReveal delay={0.05}>
              <Card className="border-2">
                <CardHeader>
                  <div className="mb-4 flex items-start gap-1">
                    {[...Array(5)].map((_, i) => (
                      <svg
                        key={i}
                        className="fill-primary h-5 w-5"
                        viewBox="0 0 20 20"
                      >
                        <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                      </svg>
                    ))}
                  </div>
                  <CardDescription className="text-base leading-relaxed">
                    &ldquo;Professional PDFs, easy expense tracking, and
                    automatic calculations. Everything I need for billing my
                    freelance work. Highly recommended!&rdquo;
                  </CardDescription>
                </CardHeader>
                <CardContent className="mt-auto">
                  <p className="font-semibold">Marcus Chen</p>
                  <p className="text-muted-foreground text-sm">
                    Technical Specialist
                  </p>
                </CardContent>
              </Card>
            </SectionReveal>

            <SectionReveal delay={0.1}>
              <Card className="h-full border-2">
                <CardHeader>
                  <div className="mb-4 flex items-start gap-1">
                    {[...Array(5)].map((_, i) => (
                      <svg
                        key={i}
                        className="fill-primary h-5 w-5"
                        viewBox="0 0 20 20"
                      >
                        <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                      </svg>
                    ))}
                  </div>
                  <CardDescription className="text-base leading-relaxed">
                    &ldquo;Clean interface, powerful features, and it just
                    works. The automatic profile pre-fill is a game-changer for
                    creating invoices quickly.&rdquo;
                  </CardDescription>
                </CardHeader>
                <CardContent className="mt-auto">
                  <p className="font-semibold">Jessica Rodriguez</p>
                  <p className="text-muted-foreground text-sm">
                    Audio Specialist
                  </p>
                </CardContent>
              </Card>
            </SectionReveal>
          </div>
        </SectionReveal>
      </section>

      {/* CTA Section */}
      <section className="bg-background px-4 py-24 text-center">
        <SectionReveal className="mx-auto max-w-3xl">
          <h2 className="font-oswald mb-6 text-4xl font-bold md:text-5xl">
            Ready to Simplify Your Invoicing?
          </h2>
          <p className="text-muted-foreground mx-auto mb-10 max-w-2xl text-lg md:text-xl">
            Join freelancers worldwide who trust our platform for their
            professional invoice management.
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button asChild size="lg" className="px-8 text-base">
              <Link href="/auth/signup">Get Started Free</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="px-8 text-base"
            >
              <Link href="/auth/signin">Sign In</Link>
            </Button>
          </div>
          <p className="text-muted-foreground mt-6 text-sm">
            No credit card required • Free forever
          </p>
        </SectionReveal>
      </section>

      {/* Footer */}
      <footer className="bg-muted/50 border-t">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <div className="grid grid-cols-3 gap-8 md:grid-cols-4">
            {/* Brand Column */}
            <div className="col-span-3 space-y-4 md:col-span-1">
              <div className="flex items-center gap-2">
                <CaleyLogo className="h-8 w-8" />
                <span className="font-oswald text-xl font-bold">Caley</span>
              </div>
              <p className="text-muted-foreground text-sm">
                Professional invoice management built for freelancers and
                businesses worldwide.
              </p>
            </div>

            {/* Product Column */}
            <div>
              <h4 className="mb-4 font-semibold">Product</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link
                    href="/auth/signup"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Get Started
                  </Link>
                </li>
                <li>
                  <Link
                    href="/auth/signin"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Sign In
                  </Link>
                </li>
                <li>
                  <Link
                    href="/#features"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Features
                  </Link>
                </li>
              </ul>
            </div>

            {/* Support Column */}
            <div>
              <h4 className="mb-4 font-semibold">Support</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link
                    href="mailto:hello@stevenmckinnon.co.uk"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Contact Us
                  </Link>
                </li>
                <li>
                  <Link
                    href="/#faq"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    FAQ
                  </Link>
                </li>
              </ul>
            </div>

            {/* Legal Column */}
            <div>
              <h4 className="mb-4 font-semibold">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link
                    href="/legal"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Project Details
                  </Link>
                </li>
                <li>
                  <Link
                    href="/cookies"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Cookie Policy
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t pt-8 md:flex-row">
            <p className="text-muted-foreground text-sm">
              © {new Date().getFullYear()} Caley, made in Scotland 🏴󠁧󠁢󠁳󠁣󠁴󠁿
            </p>
            <Link
              href="https://stevemckinnon.co.uk"
              className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs transition-colors"
              target="_blank"
            >
              <span className="text-muted-foreground text-xs">
                Built by Steve McKinnon
              </span>
              <ExternalLink className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
