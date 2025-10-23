import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ExternalLink,
  Mail,
  Code,
  Shield,
  Info,
  ArrowLeft,
  Cookie,
} from "lucide-react";

export default function LegalPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-12 space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl md:text-5xl font-bold">Project Details</h1>
        <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
          Information about this project, disclaimers, and legal notices
        </p>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
        {/* Disclaimer Card */}
        <Card className="border-2">
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Info className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <CardTitle className="text-2xl">Disclaimer</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground leading-relaxed">
              This is a <strong>personal project</strong> created to demonstrate
              invoice management functionality for freelance production staff.
            </p>
          </CardContent>
        </Card>

        {/* Creator Card */}
        <Card className="border-2">
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Code className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <CardTitle className="text-2xl">Created By</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground leading-relaxed">
              This application was designed and developed by{" "}
              <strong>Steve McKinnon</strong>, a freelance software developer.
            </p>
            <div className="space-y-2">
              <Button asChild variant="outline" className="w-full">
                <Link
                  href="https://stevenmckinnon.co.uk"
                  target="_blank"
                  className="flex items-center justify-center gap-2"
                >
                  Visit Portfolio
                  <ExternalLink className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link
                  href="mailto:hello@stevenmckinnon.co.uk"
                  className="flex items-center justify-center gap-2"
                >
                  <Mail className="h-4 w-4" />
                  Contact Me
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Technology Stack Card */}
      <Card className="border-2">
        <CardHeader>
          <div className="flex items-center gap-2 mb-2">
            <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <Code className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <CardTitle className="text-2xl">Technology Stack</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <p className="font-semibold text-sm">Frontend</p>
              <ul className="text-sm text-muted-foreground space-y-0.5">
                <li>Next.js 15</li>
                <li>React 19</li>
                <li>TypeScript</li>
                <li>Tailwind CSS</li>
              </ul>
            </div>
            <div className="space-y-1">
              <p className="font-semibold text-sm">UI Components</p>
              <ul className="text-sm text-muted-foreground space-y-0.5">
                <li>shadcn/ui</li>
                <li>Radix UI</li>
                <li>Lucide Icons</li>
                <li>Recharts</li>
              </ul>
            </div>
            <div className="space-y-1">
              <p className="font-semibold text-sm">Backend</p>
              <ul className="text-sm text-muted-foreground space-y-0.5">
                <li>Better Auth</li>
                <li>Prisma ORM</li>
                <li>PostgreSQL</li>
                <li>PDF-Lib</li>
              </ul>
            </div>
            <div className="space-y-1">
              <p className="font-semibold text-sm">Deployment</p>
              <ul className="text-sm text-muted-foreground space-y-0.5">
                <li>Vercel</li>
                <li>Neon DB</li>
                <li>Edge Runtime</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Privacy & Data Card */}
      <Card className="border-2">
        <CardHeader>
          <div className="flex items-center gap-2 mb-2">
            <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <Shield className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-2xl">Privacy & Data</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">Data Collection</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              This application collects only the information you provide during
              registration and invoice creation. Your data is stored securely
              and is never shared with third parties.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-2">Security</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              All passwords are hashed using industry-standard encryption.
              Authentication is handled by Better Auth with secure session
              management. Your data is stored in a PostgreSQL database hosted on
              Neon with automatic backups.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-2">Your Rights</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              You have full control over your data. You can update your profile,
              delete your invoices, and request account deletion at any time by
              contacting the developer.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Use at Own Risk */}
      <Card className="border-2 border-amber-200 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-950/20">
        <CardContent>
          <p className="text-sm text-muted-foreground leading-relaxed text-center">
            <strong className="text-foreground">Note:</strong> This is a demo
            project for portfolio purposes. While functional and secure, it is
            provided &ldquo;as-is&rdquo; without warranty. For production use in
            a business context, please contact the developer for a dedicated
            deployment.
          </p>
        </CardContent>
      </Card>

      {/* Quick Links */}
      <div className="flex justify-center gap-4">
        <Button asChild variant="outline">
          <Link href="/cookies">
            <Cookie className="h-4 w-4" /> Cookie Policy
          </Link>
        </Button>
      </div>

      {/* Back to Home */}
      <div className="text-center pt-4">
        <Button asChild size="lg" variant="outline">
          <Link href="/">
            <ArrowLeft className="h-4 w-4" /> Back to Home
          </Link>
        </Button>
      </div>
    </div>
  );
}
