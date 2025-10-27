import CaleyLogo from "@/components/CaleyLogo";
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

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <Hero />

      {/* Why Choose Us Section */}
      <section className="py-20 px-4 bg-background">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-sm font-semibold text-primary mb-3 uppercase tracking-wider">
              Why Choose Us
            </h2>
            <h3 className="text-4xl md:text-5xl font-bold mb-4">
              Leading Invoicing Solution for Freelancers
            </h3>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              A professional invoicing system built for freelancers and
              businesses worldwide.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="border-2 hover:border-primary/50 transition-all duration-300 group">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <Zap className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-xl">Lightning Fast</CardTitle>
                <CardDescription className="text-base mt-2">
                  Generate professional invoices in seconds with intelligent
                  auto-fill and smart calculations
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 hover:border-primary/50 transition-all duration-300 group">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-xl">Secure & Reliable</CardTitle>
                <CardDescription className="text-base mt-2">
                  Bank-grade security with automatic backups. Your data is
                  always safe and accessible
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 hover:border-primary/50 transition-all duration-300 group">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <Globe className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-xl">Work From Anywhere</CardTitle>
                <CardDescription className="text-base mt-2">
                  Access your invoices from any device, anywhere in the world.
                  Cloud-based and always in sync
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Section - Bento Grid */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-sm font-semibold text-primary mb-3 uppercase tracking-wider">
              Our Features
            </h2>
            <h3 className="text-4xl md:text-5xl font-bold mb-4">
              Everything You Need in One Place
            </h3>
            <p className="text-center text-muted-foreground text-lg max-w-2xl mx-auto">
              Powerful features designed specifically for freelancers and
              businesses
            </p>
          </div>

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

      {/* FAQ Section */}
      <section className="py-20 px-4 bg-background">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-lg text-muted-foreground">
              Find answers to common questions about our invoicing system
            </p>
          </div>

          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1">
              <AccordionTrigger className="text-left text-base font-semibold">
                How do I get started with creating invoices?
              </AccordionTrigger>
              <AccordionContent className="text-base text-muted-foreground">
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
              <AccordionContent className="text-base text-muted-foreground">
                Yes! Our system includes built-in overtime tracking with 1.5x
                and 2x rate calculations. Simply add your overtime entries by
                date and the system automatically calculates the correct amounts
                based on your day rate.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-3">
              <AccordionTrigger className="text-left text-base font-semibold">
                What currencies are supported?
              </AccordionTrigger>
              <AccordionContent className="text-base text-muted-foreground">
                We support GBP, USD, EUR, CAD, and AUD. You can set your
                preferred currency in your profile settings, and all invoices
                will use that currency by default.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-4">
              <AccordionTrigger className="text-left text-base font-semibold">
                Is my financial data secure?
              </AccordionTrigger>
              <AccordionContent className="text-base text-muted-foreground">
                Absolutely. We use industry-standard encryption and secure
                authentication through NextAuth. Your banking details and
                invoice data are stored securely in our PostgreSQL database with
                regular backups.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-5">
              <AccordionTrigger className="text-left text-base font-semibold">
                Can I customize my invoices?
              </AccordionTrigger>
              <AccordionContent className="text-base text-muted-foreground">
                Yes! You can add custom line items, manage per diems for work
                and travel days, include custom expenses, and add notes to each
                invoice. The system automatically calculates totals and
                generates professional PDF exports.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-6">
              <AccordionTrigger className="text-left text-base font-semibold">
                How does the day rate calculation work?
              </AccordionTrigger>
              <AccordionContent className="text-base text-muted-foreground">
                Your day rate covers work, travel, and dark days. The system
                calculates your regular hourly rate as 10% of your day rate
                (based on a 10-hour day). This hourly rate is then used for
                overtime calculations at 1.5x or 2x multipliers.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Loved by Freelancers
            </h2>
            <p className="text-lg text-muted-foreground">
              Their experiences speak louder than words
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="border-2">
              <CardHeader>
                <div className="flex items-start gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <svg
                      key={i}
                      className="w-5 h-5 fill-primary"
                      viewBox="0 0 20 20"
                    >
                      <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                    </svg>
                  ))}
                </div>
                <CardDescription className="text-base leading-relaxed">
                  &ldquo;This system completely changed how I manage my
                  invoicing. The overtime tracking and expense management saves
                  me hours every month.&rdquo;
                </CardDescription>
              </CardHeader>
              <CardContent className="mt-auto">
                <p className="font-semibold">Sarah Mitchell</p>
                <p className="text-sm text-muted-foreground">
                  Freelance Coordinator
                </p>
              </CardContent>
            </Card>

            <Card className="border-2">
              <CardHeader>
                <div className="flex items-start gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <svg
                      key={i}
                      className="w-5 h-5 fill-primary"
                      viewBox="0 0 20 20"
                    >
                      <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                    </svg>
                  ))}
                </div>
                <CardDescription className="text-base leading-relaxed">
                  &ldquo;Professional PDFs, easy expense tracking, and automatic
                  calculations. Everything I need for billing my freelance work.
                  Highly recommended!&rdquo;
                </CardDescription>
              </CardHeader>
              <CardContent className="mt-auto">
                <p className="font-semibold">Marcus Chen</p>
                <p className="text-sm text-muted-foreground">
                  Technical Specialist
                </p>
              </CardContent>
            </Card>

            <Card className="border-2">
              <CardHeader>
                <div className="flex items-start gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <svg
                      key={i}
                      className="w-5 h-5 fill-primary"
                      viewBox="0 0 20 20"
                    >
                      <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                    </svg>
                  ))}
                </div>
                <CardDescription className="text-base leading-relaxed">
                  &ldquo;Clean interface, powerful features, and it just works.
                  The automatic profile pre-fill is a game-changer for creating
                  invoices quickly.&rdquo;
                </CardDescription>
              </CardHeader>
              <CardContent className="mt-auto">
                <p className="font-semibold">Jessica Rodriguez</p>
                <p className="text-sm text-muted-foreground">
                  Audio Specialist
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 text-center bg-background">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Ready to Simplify Your Invoicing?
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
            Join freelancers worldwide who trust our platform for their
            professional invoice management.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button asChild size="lg" className="text-base px-8">
              <Link href="/auth/signup">Get Started Free</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="text-base px-8"
            >
              <Link href="/auth/signin">Sign In</Link>
            </Button>
          </div>
          <p className="mt-6 text-sm text-muted-foreground">
            No credit card required • Free forever
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-muted/50 border-t">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="grid grid-cols-3 md:grid-cols-4 gap-8">
            {/* Brand Column */}
            <div className="space-y-4 col-span-3 md:col-span-1">
              <div className="flex items-center gap-2">
                <CaleyLogo className="h-8 w-8" />
                <span className="font-bold text-xl">Caley</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Professional invoice management built for freelancers and
                businesses worldwide.
              </p>
            </div>

            {/* Product Column */}
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
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
              <h4 className="font-semibold mb-4">Support</h4>
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
              <h4 className="font-semibold mb-4">Legal</h4>
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
          <div className="mt-12 pt-8 border-t flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Caley. All rights reserved.
            </p>
            <Link
              href="https://stevenmckinnon.co.uk"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
              target="_blank"
            >
              <span className="text-xs text-muted-foreground">
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
