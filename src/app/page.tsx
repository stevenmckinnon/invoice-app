import {
  Bot,
  Check,
  Clock,
  DollarSign,
  ExternalLink,
  TrendingUp,
  Users,
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

      {/* Walkthrough — one real invoice, start to finish */}
      <section className="border-border/40 border-y py-24">
        <SectionReveal className="mx-auto max-w-7xl px-6">
          <div className="mb-16 max-w-2xl">
            <h2 className="font-heading mb-4 text-4xl font-bold tracking-tight sm:text-5xl">
              Built for how crew actually get paid.
            </h2>
            <p className="text-muted-foreground text-lg">
              Here is the invoice a gaffer sends after a fortnight on a shoot,
              and what it takes to make it in Caley.
            </p>
          </div>

          <div className="grid grid-cols-1 items-start gap-12 lg:grid-cols-2 lg:gap-16">
            {/* Steps */}
            <ol className="space-y-8">
              {[
                {
                  title: "Pick the show and the client",
                  body: "Your address, banking details, and the client's rates are already on file. Nothing gets retyped.",
                },
                {
                  title: "Log the days",
                  body: "Six shoot days and two travel days. Work and travel per diems are held separately, so each day gets the right one.",
                },
                {
                  title: "Add the overtime",
                  body: "Three hours at 1.5× and one at 2×. Enter the hours and the date; Caley prices them.",
                },
                {
                  title: "Send the PDF",
                  body: "Numbered, branded, totalled, with your bank details on it. Download it or email it from the invoice page.",
                },
              ].map((step, i) => (
                <li key={step.title} className="flex gap-5">
                  <span className="border-border text-muted-foreground flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border font-mono text-xs">
                    {i + 1}
                  </span>
                  <div>
                    <h3 className="font-heading mb-1.5 text-lg font-bold">
                      {step.title}
                    </h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {step.body}
                    </p>
                  </div>
                </li>
              ))}
            </ol>

            {/* The resulting invoice */}
            <div className="border-border/60 bg-background overflow-hidden rounded-xl border shadow-sm">
              <div className="border-border/60 bg-muted/30 flex items-center justify-between border-b px-5 py-3.5">
                <div>
                  <p className="font-mono text-xs font-semibold">
                    INV-2025-042
                  </p>
                  <p className="text-muted-foreground text-xs">
                    The Crown Season 6 · Netflix Studios
                  </p>
                </div>
                <span className="border-border bg-background rounded-md border px-2 py-0.5 font-mono text-xs">
                  Net 30
                </span>
              </div>

              <dl className="divide-border/60 divide-y">
                {[
                  ["Shoot days", "6 × £500.00", "£3,000.00"],
                  ["Per diem, work", "6 × £45.00", "£270.00"],
                  ["Per diem, travel", "2 × £30.00", "£60.00"],
                  ["Overtime", "3h at 1.5×", "£236.25"],
                  ["Overtime", "1h at 2×", "£105.00"],
                  ["Expenses", "Train, parking", "£86.40"],
                ].map(([label, detail, amount], i) => (
                  <div
                    key={`${label}-${i}`}
                    className="flex items-baseline justify-between gap-4 px-5 py-3"
                  >
                    <div>
                      <dt className="text-sm font-medium">{label}</dt>
                      <dd className="text-muted-foreground font-mono text-xs">
                        {detail}
                      </dd>
                    </div>
                    <dd className="font-mono text-sm">{amount}</dd>
                  </div>
                ))}
              </dl>

              <div className="border-border/60 bg-muted/30 flex items-baseline justify-between border-t px-5 py-4">
                <span className="font-heading text-sm font-bold tracking-wide uppercase">
                  Total
                </span>
                <span className="text-primary font-mono text-lg font-bold">
                  £3,757.65
                </span>
              </div>
            </div>
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
            <h2 className="font-heading mb-4 text-4xl font-bold tracking-tight sm:text-5xl">
              Everything a shoot throws at an invoice.
            </h2>
            <p className="text-muted-foreground max-w-2xl text-lg">
              Day rates, overtime, per diems, expenses, and the PDF at the end
              of it.
            </p>
          </div>

          {/* Bento Grid */}
          <div className="grid grid-cols-1 gap-5 md:grid-cols-6 lg:grid-rows-2">
            {/* Dark hero card — Professional PDFs */}
            <div className="group relative col-span-1 overflow-hidden rounded-xl bg-neutral-950 p-8 transition-all md:col-span-4 md:row-span-2 lg:p-12">
              {/* Blue ambient glow */}
              <div className="pointer-events-none absolute top-0 right-[-10%] h-[120%] w-[80%] bg-gradient-to-l from-primary/25 to-transparent blur-3xl" />

              <div className="relative z-10 mb-8 max-w-sm">
                <h3 className="font-heading mb-3 text-3xl font-bold text-white">
                  Professional PDFs
                </h3>
                <p className="leading-relaxed text-neutral-400">
                  The last thing a client sees is your invoice. Caley makes it a
                  branded PDF worth paying on time.
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
                      <div className="font-heading text-lg font-bold tracking-tight text-neutral-900 uppercase">
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
            <div className="border-border/50 bg-background hover:border-primary/40 relative overflow-hidden rounded-xl border p-6 transition-all hover:-translate-y-1 md:col-span-2">
              <div className="bg-primary/10 text-primary mb-3 w-fit rounded-lg p-3">
                <Clock className="h-5 w-5" />
              </div>
              <h3 className="font-heading mb-2 text-xl font-bold">Overtime</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Log the hours and the date. Caley applies the 1.5× or 2× rate
                and adds it to the invoice.
              </p>
              <div className="border-border/50 bg-muted/30 mt-5 flex items-center justify-between rounded-lg border p-3">
                <span className="font-mono text-xs">3h at 1.5×</span>
                <span className="text-primary font-mono text-xs font-bold">
                  £236.25
                </span>
              </div>
            </div>

            {/* Revenue Analytics */}
            <div className="border-border/50 bg-background hover:border-primary/40 relative overflow-hidden rounded-xl border p-6 transition-all hover:-translate-y-1 md:col-span-2">
              <div className="bg-primary/10 text-primary mb-3 w-fit rounded-lg p-3">
                <TrendingUp className="h-5 w-5" />
              </div>
              <h3 className="font-heading mb-2 text-xl font-bold">
                What you&apos;re owed
              </h3>
              <p className="text-muted-foreground mb-5 text-sm leading-relaxed">
                Billed, paid, and outstanding across every show, on the
                dashboard.
              </p>
              <dl className="divide-border/50 border-border/50 bg-muted/30 divide-y rounded-lg border">
                {[
                  ["Outstanding", "£4,120.00"],
                  ["Paid this month", "£8,450.00"],
                ].map(([label, amount]) => (
                  <div
                    key={label}
                    className="flex items-center justify-between px-3 py-2"
                  >
                    <dt className="text-muted-foreground font-mono text-xs">
                      {label}
                    </dt>
                    <dd className="font-mono text-xs font-medium">{amount}</dd>
                  </div>
                ))}
              </dl>
            </div>

            {/* Client Management */}
            <div className="border-border/50 bg-background hover:border-primary/40 relative overflow-hidden rounded-xl border p-6 transition-all hover:-translate-y-1 md:col-span-3">
              <div className="bg-primary/10 text-primary mb-3 w-fit rounded-lg p-3">
                <Users className="h-5 w-5" />
              </div>
              <h3 className="font-heading mb-2 text-xl font-bold">
                Clients and rates
              </h3>
              <p className="text-muted-foreground text-sm">
                Save each production company with its own day rate and per
                diems. Bill in GBP, USD, EUR, CAD, or AUD.
              </p>
            </div>

            {/* Custom Expenses */}
            <div className="border-border/50 bg-background hover:border-primary/40 relative overflow-hidden rounded-xl border p-6 transition-all hover:-translate-y-1 md:col-span-3">
              <div className="bg-primary/10 text-primary mb-3 w-fit rounded-lg p-3">
                <DollarSign className="h-5 w-5" />
              </div>
              <h3 className="font-heading mb-2 text-xl font-bold">Expenses</h3>
              <p className="text-muted-foreground text-sm">
                Add travel, kit hire, parking, and anything else you fronted, as
                its own line on the invoice.
              </p>
            </div>
          </div>
        </SectionReveal>
      </section>

      {/* AI Assistant Section */}
      <section className="relative overflow-hidden py-32">
        <div className="bg-primary/5 absolute inset-0 -z-10" />

        <SectionReveal className="mx-auto max-w-7xl px-6">
          <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-2">
            {/* Text */}
            <div>
              <div className="text-primary bg-primary/10 mb-6 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium">
                <Bot className="h-4 w-4" />
                AI-Powered
              </div>
              <h2 className="font-heading mb-6 text-4xl font-bold tracking-tight sm:text-5xl">
                Skip the forms.
              </h2>
              <p className="text-muted-foreground mb-8 text-lg leading-relaxed">
                Tell Caley what you did on the job. It drafts the invoice, runs
                the maths, and hands it back for you to check.
              </p>
              <ul className="space-y-4">
                {[
                  "Create a full invoice from a single sentence",
                  "Ask what you're owed, who's late, and which client bills most",
                  "Update a draft: add overtime, expenses, or notes",
                  "Runs on Claude, from Anthropic",
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
            <div className="border-border/50 bg-background relative overflow-hidden rounded-xl border shadow-2xl">
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
                      Invoice Netflix Studios for The Crown — 5 shoot days plus
                      3 hours overtime
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
                        Drafted for <strong>Netflix Studios</strong>: 5 days at
                        your day rate, plus 3 overtime hours at 1.5×. Have a
                        look before you send it.
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
                              5 shoot days
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
                              £236.25
                            </span>
                          </div>
                          <div className="border-border border-t pt-2">
                            <div className="flex items-center justify-between text-xs font-semibold">
                              <span>Total</span>
                              <span className="text-primary font-mono">
                                £2,736.25
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
                      Add £86.40 for the train and parking.
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
            <h2 className="font-heading mb-4 text-4xl font-bold tracking-tight sm:text-5xl">
              Frequently Asked
            </h2>
            <p className="text-muted-foreground text-lg">
              What people ask before signing up
            </p>
          </div>

          <Accordion type="single" collapsible className="w-full">
            {[
              {
                q: "What can the AI assistant do?",
                a: "It creates invoices, updates drafts, and answers questions about your billing in plain English. Type something like 'Invoice Netflix Studios for 5 days on The Crown' or 'How much am I owed this month?' and it drafts a reply you can check and edit. It runs on Claude, from Anthropic.",
              },
              {
                q: "How do I get started?",
                a: "Sign up, add your personal and banking details once, and create your first invoice. Caley fills those details in on every invoice after that.",
              },
              {
                q: "Can I track overtime hours?",
                a: "Yes. Add overtime entries by date at either 1.5× or 2×, and Caley prices them and adds them to the invoice total.",
              },
              {
                q: "What about per diems and expenses?",
                a: "Work days and travel days carry separate per diem rates, set per client. You can also add one-off expenses — travel, kit hire, meals — as their own lines.",
              },
              {
                q: "What currencies are supported?",
                a: "GBP, USD, EUR, CAD, and AUD. Set your default in your profile and every new invoice uses it.",
              },
              {
                q: "Is my financial data secure?",
                a: "Your data is encrypted in transit and at rest, sign-in is handled by a dedicated auth library rather than rolled by hand, and every query is scoped to your account — no one else can read your invoices or banking details.",
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
          <h2 className="font-heading mb-6 text-5xl font-bold tracking-tight sm:text-6xl md:text-7xl">
            Stop Doing Admin.
          </h2>
          <p className="mx-auto mb-12 max-w-2xl text-xl text-neutral-400">
            Send your next invoice in under a minute. Free while Caley is in
            beta.
          </p>
          <div className="flex justify-center">
            <Button
              asChild
              size="lg"
              className="bg-primary hover:bg-primary/90 h-14 rounded-lg px-10 text-lg shadow-xl"
            >
              <Link href="/auth/signup">Create your first invoice</Link>
            </Button>
          </div>
        </SectionReveal>
      </section>

      {/* Footer */}
      <footer className="border-border/40 bg-background overflow-hidden border-t px-3 py-8 md:px-6">
        <div className="bg-accent mx-auto max-w-7xl rounded-xl p-6 md:p-12">
          <div className="mb-24 flex flex-col justify-between gap-12 md:flex-row">
            <div className="max-w-sm">
              <div className="mb-6 flex items-center gap-2">
                <CaleyLogo className="h-8 w-8" />
                <span className="font-heading text-2xl font-bold">Caley</span>
              </div>
              <p className="text-muted-foreground text-lg font-medium">
                Invoicing for people who bill by the day.
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
