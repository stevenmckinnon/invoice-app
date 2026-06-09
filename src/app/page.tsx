import {
  Bot,
  Check,
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

export default function Home() {
  return (
    <div className="bg-background text-foreground selection:bg-primary/20 min-h-screen">
      {/* Hero Section */}
      <Hero />

      {/* Why Choose Us Section */}
      <section className="border-border/40 border-y py-24">
        <SectionReveal className="mx-auto max-w-7xl px-6">
          <div className="mb-16 text-center">
            <p className="text-primary mb-3 font-mono text-xs font-semibold tracking-widest uppercase">
              Why Choose Caley
            </p>
            <h3 className="font-oswald mb-5 text-4xl font-bold tracking-tight sm:text-5xl">
              Built for the Modern Freelancer
            </h3>
            <p className="text-muted-foreground mx-auto max-w-2xl text-lg">
              Stop wrestling with spreadsheets. Get a professional invoicing
              system that works as hard as you do.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: Zap,
                title: "Frictionless Entry",
                description:
                  "No bloat. Create a professional invoice in seconds with intelligent auto-fill and smart calculations.",
              },
              {
                icon: Shield,
                title: "Secure & Reliable",
                description:
                  "Bank-grade security with automatic backups. Your data is always safe and accessible.",
              },
              {
                icon: Globe,
                title: "Work From Anywhere",
                description:
                  "Cloud-based and always in sync. Access your invoices from any device, anywhere in the world.",
              },
              {
                icon: Bot,
                title: "AI Co-pilot",
                description:
                  "Create invoices, check your revenue, and manage billing with a simple chat — no manual work required.",
              },
            ].map((feature, i) => (
              <SectionReveal
                key={feature.title}
                delay={i * 0.1}
                className="h-full"
              >
                <div className="group border-border/50 bg-background hover:border-primary/40 relative h-full overflow-hidden rounded-xl border p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
                  <div className="bg-muted text-foreground group-hover:bg-primary group-hover:text-primary-foreground mb-5 inline-flex h-12 w-12 items-center justify-center rounded-lg transition-colors duration-300">
                    <feature.icon className="h-6 w-6" />
                  </div>
                  <h3 className="font-oswald mb-2 text-xl font-bold">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </SectionReveal>
            ))}
          </div>
        </SectionReveal>
      </section>

      {/* Features Section - Bento Grid */}
      <section
        className="bg-muted/10 relative overflow-hidden py-32"
        id="features"
      >
        <SectionReveal className="mx-auto max-w-7xl px-6">
          <div className="mb-16">
            <h3 className="font-oswald mb-4 text-4xl font-bold tracking-tight sm:text-5xl">
              Engineer your cash flow.
            </h3>
            <p className="text-muted-foreground max-w-2xl text-lg">
              A comprehensive toolkit disguised as a minimal interface.
              Everything a specialised freelancer needs, nothing they
              don&apos;t.
            </p>
          </div>

          {/* Bento Grid */}
          <div className="grid grid-cols-1 gap-5 md:grid-cols-6 lg:grid-rows-2">
            {/* Dark hero card — Professional PDFs */}
            <div className="group relative col-span-1 overflow-hidden rounded-2xl bg-neutral-950 p-8 transition-all md:col-span-4 md:row-span-2 lg:p-12">
              {/* Blue ambient glow */}
              <div className="pointer-events-none absolute top-0 right-[-10%] h-[120%] w-[80%] bg-gradient-to-l from-primary/25 to-transparent blur-3xl" />

              <div className="relative z-10 mb-8 max-w-sm">
                <span className="mb-4 inline-block rounded border border-white/10 bg-white/10 px-3 py-1 font-mono text-xs font-semibold text-white/80">
                  01 / CORE FEATURE
                </span>
                <h3 className="font-oswald mb-3 text-3xl font-bold text-white">
                  Professional PDFs
                </h3>
                <p className="text-neutral-400 leading-relaxed">
                  Your invoice is your brand&apos;s final touchpoint. Generate
                  beautiful, branded PDF documents that demand respect — and
                  prompt payment.
                </p>
                <div className="mt-6 flex flex-wrap gap-2">
                  {["Custom Branding", "Instant Download", "Auto-calculation"].map(
                    (tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white/70"
                      >
                        {tag}
                      </span>
                    ),
                  )}
                </div>
              </div>

              {/* Floating PDF mockup */}
              <div className="relative z-10 w-full max-w-sm transform transition-transform duration-500 group-hover:-translate-y-2">
                <div className="rounded-t-lg border border-white/10 bg-white p-5 shadow-[0_-20px_40px_rgba(0,0,0,0.4)]">
                  <div className="mb-4 flex items-start justify-between border-b border-neutral-100 pb-3">
                    <div className="h-10 w-10 rounded bg-neutral-950" />
                    <div className="text-right">
                      <div className="font-oswald text-lg font-bold tracking-tight text-neutral-900 uppercase">
                        Invoice
                      </div>
                      <div className="font-mono text-xs text-neutral-500">
                        INV-2025-042
                      </div>
                    </div>
                  </div>
                  <div className="mb-5 space-y-1.5">
                    <div className="h-3 w-3/4 rounded bg-neutral-100" />
                    <div className="h-3 w-1/2 rounded bg-neutral-100" />
                  </div>
                  <div className="flex items-center justify-between border-b border-neutral-900 py-1.5">
                    <div className="h-2.5 w-1/3 rounded bg-neutral-200" />
                    <div className="font-mono text-sm font-bold text-neutral-900">
                      £2,500.00
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Overtime Tracking */}
            <div className="border-border/50 bg-background hover:border-primary/40 relative overflow-hidden rounded-2xl border p-6 transition-all hover:-translate-y-1 md:col-span-2">
              <div className="mb-3 w-fit rounded-xl bg-purple-500/10 p-3 text-purple-600 dark:text-purple-400">
                <Clock className="h-5 w-5" />
              </div>
              <h3 className="font-oswald mb-2 text-xl font-bold">
                Overtime Tracking
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Track overtime with 1.5x and 2x rates automatically calculated.
              </p>
              <div className="border-border/50 mt-5 flex items-center justify-between rounded-lg border bg-muted/30 p-3">
                <span className="font-mono text-xs font-medium">Dev Work</span>
                <span className="text-primary font-mono text-xs font-bold">
                  04:22:15
                </span>
              </div>
            </div>

            {/* Revenue Analytics */}
            <div className="border-border/50 bg-background hover:border-primary/40 relative overflow-hidden rounded-2xl border p-6 transition-all hover:-translate-y-1 md:col-span-2">
              <div className="mb-3 w-fit rounded-xl bg-orange-500/10 p-3 text-orange-600 dark:text-orange-400">
                <TrendingUp className="h-5 w-5" />
              </div>
              <h3 className="font-oswald mb-2 text-xl font-bold">
                Revenue Analytics
              </h3>
              <p className="text-muted-foreground mb-5 text-sm leading-relaxed">
                Real-time insights into your earnings, outstanding, and paid
                invoices.
              </p>
              {/* Mini bar chart */}
              <div className="flex h-12 items-end gap-1.5 opacity-60">
                {[40, 65, 45, 80, 55, 100, 75].map((h, i) => (
                  <div
                    key={i}
                    className={`flex-1 rounded-t ${i === 5 ? "bg-primary" : "bg-muted"}`}
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
            </div>

            {/* Client Management */}
            <div className="border-border/50 bg-background hover:border-primary/40 relative overflow-hidden rounded-2xl border p-6 transition-all hover:-translate-y-1 md:col-span-3">
              <div className="mb-3 w-fit rounded-xl bg-cyan-500/10 p-3 text-cyan-600 dark:text-cyan-400">
                <Users className="h-5 w-5" />
              </div>
              <h3 className="font-oswald mb-2 text-xl font-bold">
                Client Management
              </h3>
              <p className="text-muted-foreground text-sm">
                Store client details, manage contacts, and handle multi-currency
                billing effortlessly.
              </p>
            </div>

            {/* Custom Expenses */}
            <div className="border-border/50 bg-background hover:border-primary/40 relative overflow-hidden rounded-2xl border p-6 transition-all hover:-translate-y-1 md:col-span-3">
              <div className="mb-3 w-fit rounded-xl bg-emerald-500/10 p-3 text-emerald-600 dark:text-emerald-400">
                <DollarSign className="h-5 w-5" />
              </div>
              <h3 className="font-oswald mb-2 text-xl font-bold">
                Custom Expenses
              </h3>
              <p className="text-muted-foreground text-sm">
                Easily add travel, equipment, meals, and other reimbursable
                expenses to any invoice.
              </p>
            </div>
          </div>
        </SectionReveal>
      </section>

      {/* AI Assistant Section */}
      <section className="relative overflow-hidden py-32">
        <div className="bg-primary/5 absolute inset-0 -z-10" />
        <div className="bg-primary/10 absolute top-1/2 left-1/2 -z-10 h-[700px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[120px]" />

        <SectionReveal className="mx-auto max-w-7xl px-6">
          <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-2">
            {/* Text */}
            <div>
              <div className="text-primary bg-primary/10 mb-6 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium">
                <Bot className="h-4 w-4" />
                AI-Powered
              </div>
              <h3 className="font-oswald mb-6 text-4xl font-bold tracking-tight sm:text-5xl">
                Meet Your Invoicing
                <br />
                Co-pilot
              </h3>
              <p className="text-muted-foreground mb-8 text-lg leading-relaxed">
                Hate clicking through forms? Just tell Caley what you did.
                Natural language turns simple text into structured,
                mathematically perfect invoices — instantly.
              </p>
              <ul className="space-y-4">
                {[
                  "Create full invoices from a single sentence",
                  "Ask about revenue, outstanding invoices, and top clients",
                  "Update drafts — add overtime, expenses, and notes",
                  "Powered by Claude, Anthropic's state-of-the-art AI",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <div className="bg-primary/10 text-primary mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full">
                      <Check className="h-3 w-3" />
                    </div>
                    <span className="text-muted-foreground">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Chat mockup */}
            <div className="border-border/50 bg-background relative overflow-hidden rounded-2xl border shadow-2xl">
              {/* Header */}
              <div className="border-border/50 flex items-center gap-3 border-b px-5 py-3.5">
                <div className="bg-primary/10 flex h-8 w-8 items-center justify-center rounded-full">
                  <Bot className="text-primary h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Caley Assistant</p>
                  <p className="text-muted-foreground text-xs">
                    Powered by Claude
                  </p>
                </div>
              </div>

              {/* Messages */}
              <div className="space-y-5 p-5">
                {/* User message */}
                <div
                  className="chat-bubble"
                  style={{ animationDelay: "0.3s" }}
                >
                  <div className="flex justify-end">
                    <div className="bg-primary text-primary-foreground max-w-[80%] rounded-2xl rounded-br-sm px-4 py-2.5 text-sm">
                      Create an invoice for Acme Corp — 5 days work + 3 hours
                      overtime
                    </div>
                  </div>
                </div>

                {/* AI response with nested invoice card */}
                <div
                  className="chat-bubble"
                  style={{ animationDelay: "1.6s" }}
                >
                  <div className="flex gap-3">
                    <div className="bg-primary/10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full">
                      <Bot className="text-primary h-3.5 w-3.5" />
                    </div>
                    <div className="bg-muted/50 max-w-[85%] rounded-2xl rounded-bl-sm px-4 py-3 text-sm">
                      <p className="mb-3">
                        Done. I&apos;ve drafted an invoice for{" "}
                        <strong>Acme Corp</strong> — 5 days at your day rate
                        plus 3 overtime hours at 1.5×.
                      </p>

                      {/* Nested invoice card */}
                      <div className="border-border overflow-hidden rounded-xl border">
                        <div className="bg-muted/50 border-border flex items-center justify-between border-b px-3 py-2">
                          <span className="font-mono text-xs font-semibold">
                            INV-2025-043 · Draft
                          </span>
                          <span className="border-border bg-background rounded-full border px-2 py-0.5 text-xs">
                            Net 30
                          </span>
                        </div>
                        <div className="bg-background space-y-2 p-3">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">
                              5 days labour
                            </span>
                            <span className="font-mono font-medium">
                              £2,500.00
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">
                              3h overtime (1.5×)
                            </span>
                            <span className="font-mono font-medium">
                              £187.50
                            </span>
                          </div>
                          <div className="border-border border-t pt-2">
                            <div className="flex items-center justify-between text-xs font-semibold">
                              <span>Total</span>
                              <span className="text-primary font-mono">
                                £2,687.50
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Second user message */}
                <div
                  className="chat-bubble"
                  style={{ animationDelay: "3.2s" }}
                >
                  <div className="flex justify-end">
                    <div className="bg-primary text-primary-foreground max-w-[80%] rounded-2xl rounded-br-sm px-4 py-2.5 text-sm">
                      Perfect. Add £200 for train travel expenses.
                    </div>
                  </div>
                </div>
              </div>

              {/* Input */}
              <div className="border-border/50 flex items-center gap-3 border-t px-4 py-3">
                <div className="bg-muted/50 text-muted-foreground flex-1 rounded-xl px-4 py-2 text-sm">
                  Ask me anything about your invoices...
                </div>
                <div className="bg-primary text-primary-foreground flex h-8 w-8 items-center justify-center rounded-xl text-sm font-bold">
                  ↑
                </div>
              </div>
            </div>
          </div>
        </SectionReveal>
      </section>

      {/* FAQ Section */}
      <section className="bg-muted/20 py-24" id="faq">
        <SectionReveal className="mx-auto max-w-4xl px-6">
          <div className="mb-16 text-center">
            <h2 className="font-oswald mb-4 text-4xl font-bold tracking-tight sm:text-5xl">
              Frequently Asked
            </h2>
            <p className="text-muted-foreground text-lg">
              Everything you need to know about Caley
            </p>
          </div>

          <Accordion type="single" collapsible className="w-full">
            {[
              {
                q: "What can the AI assistant do?",
                a: "Caley's built-in AI assistant lets you create invoices, update drafts, and query your billing data using plain English. Just type something like 'Create an invoice for Acme Corp for 5 days work' or 'How much revenue did I earn this month?' — the assistant handles the rest, powered by Claude from Anthropic.",
              },
              {
                q: "How do I get started with creating invoices?",
                a: "Simply sign up for a free account, complete your profile with your personal and banking details, and you're ready to create your first invoice. The system will auto-fill your information for all future invoices.",
              },
              {
                q: "Can I track overtime hours?",
                a: "Yes! Our system includes built-in overtime tracking with 1.5x and 2x rate calculations. Simply add your overtime entries by date and the system automatically calculates the correct amounts based on your day rate.",
              },
              {
                q: "What currencies are supported?",
                a: "We support GBP, USD, EUR, CAD, and AUD. You can set your preferred currency in your profile settings, and all invoices will use that currency by default.",
              },
              {
                q: "Is my financial data secure?",
                a: "Absolutely. We use industry-standard encryption and secure authentication. Your banking details and invoice data are stored securely in our PostgreSQL database with regular backups.",
              },
              {
                q: "Can I customise my invoices?",
                a: "Yes! You can add custom line items, manage per diems for work and travel days, include custom expenses, and add notes to each invoice. The system automatically calculates totals and generates professional PDF exports.",
              },
            ].map((faq, i) => (
              <AccordionItem key={i} value={`item-${i}`} className="mb-4">
                <AccordionTrigger className="text-left text-lg font-medium hover:no-underline">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-6 text-base leading-relaxed">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </SectionReveal>
      </section>

      {/* CTA Section — Dark */}
      <section className="relative overflow-hidden bg-neutral-950 py-32 text-center text-white">
        {/* Radial blue glow */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(74,143,231,0.18)_0,transparent_70%)]" />
        {/* Subtle structural line */}
        <div className="absolute top-1/2 left-1/2 h-px w-[600px] -translate-x-1/2 -translate-y-1/2 rotate-12 border-t border-dashed border-white/10" />

        <SectionReveal className="mx-auto max-w-4xl px-6">
          <h2 className="font-oswald mb-6 text-5xl font-bold tracking-tight sm:text-6xl md:text-7xl">
            Stop Doing Admin.
          </h2>
          <p className="mx-auto mb-12 max-w-2xl text-xl text-neutral-400">
            Join freelancers who use Caley to send polished invoices in seconds
            and spend more time on the work that matters.
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button
              asChild
              size="lg"
              className="bg-primary hover:bg-primary/90 h-14 rounded-full px-10 text-lg shadow-xl transition-all hover:scale-105"
            >
              <Link href="/auth/signup">Get Started Free</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="h-14 rounded-full border-white/20 bg-white/10 px-10 text-lg text-white backdrop-blur-sm hover:bg-white/20 hover:text-white"
            >
              <Link href="/auth/signin">Sign In</Link>
            </Button>
          </div>
          <p className="mt-8 font-mono text-xs tracking-widest text-neutral-500 uppercase">
            No credit card required · Free forever
          </p>
        </SectionReveal>
      </section>

      {/* Footer */}
      <footer className="border-border/40 bg-background overflow-hidden border-t px-3 py-8 md:px-6">
        <div className="bg-accent mx-auto max-w-7xl rounded-3xl p-6 md:p-12">
          <div className="mb-24 flex flex-col justify-between gap-12 md:flex-row">
            <div className="max-w-sm">
              <div className="mb-6 flex items-center gap-2">
                <CaleyLogo className="h-8 w-8" />
                <span className="font-oswald text-2xl font-bold">Caley</span>
              </div>
              <p className="text-muted-foreground text-lg font-medium">
                Invoicing that works as hard as you do.
              </p>
            </div>

            <div className="flex flex-wrap gap-12 sm:gap-24">
              <div>
                <h4 className="mb-6 font-mono text-xs font-semibold tracking-widest uppercase">
                  Product
                </h4>
                <ul className="space-y-4 text-sm">
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

              <div>
                <h4 className="mb-6 font-mono text-xs font-semibold tracking-widest uppercase">
                  Support
                </h4>
                <ul className="space-y-4 text-sm">
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

              <div>
                <h4 className="mb-6 font-mono text-xs font-semibold tracking-widest uppercase">
                  Legal
                </h4>
                <ul className="space-y-4 text-sm">
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
          </div>

          <div className="border-border/40 text-muted-foreground mt-16 flex flex-col items-center justify-between gap-4 border-t pt-8 text-sm md:flex-row">
            <p>© {new Date().getFullYear()} Caley, made in Scotland 🏴󠁧󠁢󠁳󠁣󠁴󠁿</p>
            <Link
              href="https://stevemckinnon.co.uk"
              className="hover:text-foreground flex items-center gap-1 transition-colors"
              target="_blank"
            >
              <span>Built by Steve McKinnon</span>
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
