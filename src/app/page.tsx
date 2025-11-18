import {
  Clock,
  DollarSign,
  ExternalLink,
  FileText,
  Globe,
  Shield,
  Star,
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
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function Home() {
  return (
    <div className="bg-background text-foreground selection:bg-primary/20 min-h-screen">
      {/* Hero Section */}
      <Hero />

      {/* Why Choose Us Section */}
      <section className="border-border/40 relative border-y py-24">
        <SectionReveal className="mx-auto max-w-7xl px-6">
          <div className="mb-20 text-center">
            <h2 className="text-primary mb-4 text-sm font-semibold tracking-widest uppercase">
              Why Choose Caley
            </h2>
            <h3 className="font-oswald mb-6 text-4xl font-bold tracking-tight sm:text-5xl">
              Built for the Modern Freelancer
            </h3>
            <p className="text-muted-foreground mx-auto max-w-2xl text-lg">
              Stop wrestling with spreadsheets. Get a professional invoicing
              system that works as hard as you do.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {[
              {
                icon: Zap,
                title: "Lightning Fast",
                description:
                  "Generate professional invoices in seconds with intelligent auto-fill and smart calculations.",
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
                  "Access your invoices from any device. Cloud-based and always in sync across all your devices.",
              },
            ].map((feature, i) => (
              <SectionReveal
                key={feature.title}
                delay={i * 0.1}
                className="h-full"
              >
                <div className="group border-border/50 bg-background/50 hover:border-primary/50 hover:shadow-primary/5 relative h-full overflow-hidden rounded-3xl border p-8 transition-all hover:shadow-2xl">
                  <div className="bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl transition-colors">
                    <feature.icon className="h-7 w-7" />
                  </div>
                  <h3 className="mb-3 text-xl font-bold">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">
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
        className="bg-muted/20 relative overflow-hidden py-32"
        id="features"
      >
        <div className="bg-primary/5 absolute top-0 right-0 -z-10 h-[600px] w-[600px] rounded-full blur-[100px]" />
        <div className="absolute bottom-0 left-0 -z-10 h-[600px] w-[600px] rounded-full bg-blue-500/5 blur-[100px]" />

        <SectionReveal className="mx-auto max-w-7xl px-6">
          <div className="mb-20 text-center">
            <h2 className="text-primary mb-4 text-sm font-semibold tracking-widest uppercase">
              Everything You Need
            </h2>
            <h3 className="font-oswald mb-6 text-4xl font-bold tracking-tight sm:text-5xl">
              Powerful Features, Simple Interface
            </h3>
            <p className="text-muted-foreground mx-auto max-w-2xl text-lg">
              We&apos;ve packed Caley with everything you need to manage your
              billing without the clutter.
            </p>
          </div>

          {/* Bento Grid Layout */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-6 lg:grid-rows-2">
            {/* Large Feature - Professional PDFs */}
            <div className="group border-border/50 from-background/50 to-muted/20 hover:border-primary/50 relative overflow-hidden rounded-3xl border bg-gradient-to-br p-8 transition-all md:col-span-4 md:row-span-2 lg:p-12">
              <div className="relative z-10 flex h-full flex-col">
                <div className="mb-6 w-fit rounded-xl bg-blue-500/10 p-4 text-blue-600 dark:text-blue-400">
                  <FileText className="h-8 w-8" />
                </div>
                <h3 className="mb-4 text-3xl font-bold">Professional PDFs</h3>
                <p className="text-muted-foreground mb-8 max-w-md text-lg">
                  Generate beautiful, branded invoices in seconds. Customize
                  layouts, add your logo, and impress clients with professional
                  documents.
                </p>
                <div className="mt-auto flex flex-wrap gap-3">
                  {[
                    "Custom Branding",
                    "Instant Download",
                    "Auto-calculation",
                  ].map((tag) => (
                    <span
                      key={tag}
                      className="bg-background border-border rounded-full border px-4 py-1.5 text-sm font-medium shadow-sm"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              {/* Abstract decoration */}
              <div className="absolute top-1/2 right-0 translate-x-1/4 -translate-y-1/2 opacity-10 dark:opacity-5">
                <FileText className="h-96 w-96" />
              </div>
            </div>

            {/* Overtime Tracking */}
            <div className="group border-border/50 bg-background hover:border-primary/50 relative overflow-hidden rounded-3xl border p-8 transition-all md:col-span-2">
              <div className="mb-4 w-fit rounded-xl bg-purple-500/10 p-3 text-purple-600 dark:text-purple-400">
                <Clock className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-xl font-bold">Overtime Tracking</h3>
              <p className="text-muted-foreground text-sm">
                Track overtime with 1.5x and 2x rates automatically calculated.
              </p>
            </div>

            {/* Revenue Analytics */}
            <div className="group border-border/50 bg-background hover:border-primary/50 relative overflow-hidden rounded-3xl border p-8 transition-all md:col-span-2">
              <div className="mb-4 w-fit rounded-xl bg-orange-500/10 p-3 text-orange-600 dark:text-orange-400">
                <TrendingUp className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-xl font-bold">Revenue Analytics</h3>
              <p className="text-muted-foreground text-sm">
                Real-time insights into your earnings, outstanding, and paid
                invoices.
              </p>
            </div>

            {/* Client Management */}
            <div className="group border-border/50 bg-background hover:border-primary/50 relative overflow-hidden rounded-3xl border p-8 transition-all md:col-span-3">
              <div className="mb-4 w-fit rounded-xl bg-cyan-500/10 p-3 text-cyan-600 dark:text-cyan-400">
                <Users className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-xl font-bold">Client Management</h3>
              <p className="text-muted-foreground text-sm">
                Store client details, manage contacts, and handle multi-currency
                billing effortlessly.
              </p>
            </div>

            {/* Custom Expenses */}
            <div className="group border-border/50 bg-background hover:border-primary/50 relative overflow-hidden rounded-3xl border p-8 transition-all md:col-span-3">
              <div className="mb-4 w-fit rounded-xl bg-emerald-500/10 p-3 text-emerald-600 dark:text-emerald-400">
                <DollarSign className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-xl font-bold">Custom Expenses</h3>
              <p className="text-muted-foreground text-sm">
                Easily add travel, equipment, meals, and other reimbursable
                expenses to any invoice.
              </p>
            </div>
          </div>
        </SectionReveal>
      </section>

      {/* Testimonials Section */}
      <section className="py-24">
        <SectionReveal className="mx-auto max-w-7xl px-6">
          <div className="mb-16 text-center">
            <h2 className="text-primary mb-4 text-sm font-semibold tracking-widest uppercase">
              Testimonials
            </h2>
            <h3 className="font-oswald mb-6 text-4xl font-bold tracking-tight sm:text-5xl">
              Loved by Freelancers
            </h3>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {[
              {
                text: "This system completely changed how I manage my invoicing. The overtime tracking and expense management saves me hours every month.",
                author: "Sarah Mitchell",
                role: "Freelance Coordinator",
              },
              {
                text: "Professional PDFs, easy expense tracking, and automatic calculations. Everything I need for billing my freelance work. Highly recommended!",
                author: "Marcus Chen",
                role: "Technical Specialist",
              },
              {
                text: "Clean interface, powerful features, and it just works. The automatic profile pre-fill is a game-changer for creating invoices quickly.",
                author: "Jessica Rodriguez",
                role: "Audio Specialist",
              },
            ].map((testimonial, i) => (
              <SectionReveal key={i} delay={i * 0.1}>
                <Card className="bg-background border-border/50 hover:border-primary/50 h-full transition-all hover:shadow-lg">
                  <CardHeader>
                    <div className="mb-4 flex gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className="fill-primary text-primary h-4 w-4"
                        />
                      ))}
                    </div>
                    <p className="text-muted-foreground text-lg leading-relaxed italic">
                      &ldquo;{testimonial.text}&rdquo;
                    </p>
                  </CardHeader>
                  <CardContent className="mt-auto pt-6">
                    <div className="flex items-center gap-4">
                      <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold">
                        {testimonial.author[0]}
                      </div>
                      <div>
                        <p className="font-semibold">{testimonial.author}</p>
                        <p className="text-muted-foreground text-sm">
                          {testimonial.role}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </SectionReveal>
            ))}
          </div>
        </SectionReveal>
      </section>

      {/* FAQ Section */}
      <section className="bg-muted/20 py-24" id="faq">
        <SectionReveal className="mx-auto max-w-4xl px-6">
          <div className="mb-16 text-center">
            <h2 className="font-oswald mb-6 text-4xl font-bold tracking-tight sm:text-5xl">
              Frequently Asked Questions
            </h2>
            <p className="text-muted-foreground text-lg">
              Everything you need to know about Caley
            </p>
          </div>

          <Accordion type="single" collapsible className="w-full">
            {[
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
                a: "Absolutely. We use industry-standard encryption and secure authentication through NextAuth. Your banking details and invoice data are stored securely in our PostgreSQL database with regular backups.",
              },
              {
                q: "Can I customize my invoices?",
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

      {/* CTA Section */}
      <section className="relative overflow-hidden py-32 text-center">
        <div className="to-muted/50 absolute inset-0 -z-10 bg-gradient-to-b from-transparent" />
        <SectionReveal className="mx-auto max-w-4xl px-6">
          <h2 className="font-oswald mb-8 text-5xl font-bold tracking-tight sm:text-6xl">
            Ready to Simplify Your Invoicing?
          </h2>
          <p className="text-muted-foreground mx-auto mb-12 max-w-2xl text-xl">
            Join freelancers worldwide who trust Caley for their professional
            invoice management.
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
              className="bg-background/50 hover:bg-muted h-14 rounded-full px-10 text-lg backdrop-blur-sm"
            >
              <Link href="/auth/signin">Sign In</Link>
            </Button>
          </div>
          <p className="text-muted-foreground mt-8 text-sm font-medium">
            No credit card required • Free forever
          </p>
        </SectionReveal>
      </section>

      {/* Footer */}
      <footer className="border-border/40 bg-background overflow-hidden border-t pt-24 pb-8">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-24 flex flex-col justify-between gap-12 md:flex-row">
            <div className="max-w-sm">
              <div className="mb-6 flex items-center gap-2">
                <CaleyLogo className="h-8 w-8" />
                <span className="font-oswald text-2xl font-bold">Caley</span>
              </div>
              <p className="text-muted-foreground text-lg font-medium">
                Experience professional invoicing without the gravity of admin
                work.
              </p>
            </div>

            <div className="flex flex-wrap gap-12 sm:gap-24">
              <div>
                <h4 className="mb-6 font-bold">Product</h4>
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
                <h4 className="mb-6 font-bold">Support</h4>
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
                <h4 className="mb-6 font-bold">Legal</h4>
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
