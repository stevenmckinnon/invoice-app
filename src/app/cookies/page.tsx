import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Cookie,
  Shield,
  Settings,
  CheckCircle,
  ExternalLink,
} from "lucide-react";

export default function CookiesPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-12">
      {/* Header */}
      <div className="space-y-4">
        <Button asChild variant="ghost" size="sm" className="mb-4">
          <Link href="/">
            <ArrowLeft className="h-4 w-4" /> Back to Home
          </Link>
        </Button>

        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-500/10">
            <Cookie className="h-6 w-6 text-orange-600 dark:text-orange-400" />
          </div>
          <h1 className="text-4xl font-bold md:text-5xl">Cookie Policy</h1>
        </div>

        <p className="text-muted-foreground text-lg leading-relaxed">
          This page explains how Caley uses cookies and similar technologies to
          provide you with a better experience.
        </p>

        <p className="text-muted-foreground text-sm">
          Last updated:{" "}
          {new Date().toLocaleDateString("en-GB", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      {/* What Are Cookies */}
      <Card className="border-2">
        <CardHeader>
          <div className="mb-2 flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
              <Cookie className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <CardTitle className="text-2xl">What Are Cookies?</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground leading-relaxed">
            Cookies are small text files that are placed on your device when you
            visit our website. They help us provide you with a better experience
            by remembering your preferences and keeping you signed in.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            We use cookies only for essential functionality - we do{" "}
            <strong>not use tracking or advertising cookies</strong>.
          </p>
        </CardContent>
      </Card>

      {/* Cookies We Use */}
      <Card className="border-2">
        <CardHeader>
          <div className="mb-2 flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-2xl">Cookies We Use</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Authentication Cookies */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Shield className="text-primary h-5 w-5" />
              <h4 className="font-semibold">Authentication Cookies</h4>
              <span className="rounded-full bg-green-500/10 px-2 py-1 text-xs text-green-700 dark:text-green-400">
                Essential
              </span>
            </div>
            <div className="ml-7 space-y-2">
              <p className="text-muted-foreground text-sm">
                <code className="bg-muted rounded px-2 py-1 text-xs">
                  better-auth.session_token
                </code>
              </p>
              <p className="text-muted-foreground text-sm leading-relaxed">
                This cookie keeps you signed in to your account. Without it, you
                would need to sign in every time you visit the site.
              </p>
              <div className="text-muted-foreground space-y-0.5 text-xs">
                <p>• Duration: 7 days</p>
                <p>• Purpose: User authentication and session management</p>
                <p>• Required: Yes - the app cannot function without this</p>
              </div>
            </div>
          </div>

          {/* Theme Preference */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Settings className="text-primary h-5 w-5" />
              <h4 className="font-semibold">Preference Cookies</h4>
              <span className="rounded-full bg-blue-500/10 px-2 py-1 text-xs text-blue-700 dark:text-blue-400">
                Functional
              </span>
            </div>
            <div className="ml-7 space-y-2">
              <p className="text-muted-foreground text-sm">
                <code className="bg-muted rounded px-2 py-1 text-xs">
                  theme
                </code>
              </p>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Stores your dark/light mode preference so the site looks the way
                you want it every time you visit.
              </p>
              <div className="text-muted-foreground space-y-0.5 text-xs">
                <p>• Duration: 1 year</p>
                <p>• Purpose: Remember your theme preference</p>
                <p>• Required: No - but enhances your experience</p>
              </div>
            </div>
          </div>

          {/* CSRF Protection */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Shield className="text-primary h-5 w-5" />
              <h4 className="font-semibold">Security Cookies</h4>
              <span className="rounded-full bg-green-500/10 px-2 py-1 text-xs text-green-700 dark:text-green-400">
                Essential
              </span>
            </div>
            <div className="ml-7 space-y-2">
              <p className="text-muted-foreground text-sm">
                <code className="bg-muted rounded px-2 py-1 text-xs">
                  authjs.csrf-token
                </code>
              </p>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Protects you from Cross-Site Request Forgery (CSRF) attacks,
                ensuring that actions are only performed by you.
              </p>
              <div className="text-muted-foreground space-y-0.5 text-xs">
                <p>• Duration: Session (deleted when you close browser)</p>
                <p>• Purpose: Security and CSRF protection</p>
                <p>• Required: Yes - protects your account</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* What We Don't Use */}
      <Card className="border-2 border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/20">
        <CardHeader>
          <div className="mb-2 flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
              <Shield className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-2xl">What We Don&apos;t Use</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            <li className="flex items-start gap-2">
              <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600" />
              <span className="text-muted-foreground">
                <strong className="text-foreground">
                  No advertising cookies
                </strong>{" "}
                - We don&apos;t track you for ads
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600" />
              <span className="text-muted-foreground">
                <strong className="text-foreground">
                  No analytics cookies
                </strong>{" "}
                - We don&apos;t use Google Analytics or similar
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600" />
              <span className="text-muted-foreground">
                <strong className="text-foreground">
                  No third-party cookies
                </strong>{" "}
                - We don&apos;t share your data
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600" />
              <span className="text-muted-foreground">
                <strong className="text-foreground">
                  No social media cookies
                </strong>{" "}
                - We don&apos;t integrate with social platforms
              </span>
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Managing Cookies */}
      <Card className="border-2">
        <CardHeader>
          <div className="mb-2 flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10">
              <Settings className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <CardTitle className="text-2xl">Managing Cookies</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground leading-relaxed">
            You can control and manage cookies in your browser settings.
            However, please note that disabling essential cookies will prevent
            you from using key features of the application, including:
          </p>
          <ul className="ml-4 space-y-2">
            <li className="text-muted-foreground text-sm">
              • Staying signed in to your account
            </li>
            <li className="text-muted-foreground text-sm">
              • Creating and managing invoices
            </li>
            <li className="text-muted-foreground text-sm">
              • Accessing your profile and settings
            </li>
          </ul>
          <div className="border-t pt-4">
            <h4 className="mb-3 font-semibold">Browser-Specific Guides:</h4>
            <div className="grid grid-cols-2 gap-2 text-sm md:grid-cols-4">
              <Link
                href="https://support.google.com/chrome/answer/95647"
                target="_blank"
                className="text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
              >
                Chrome
                <ExternalLink className="h-3 w-3" />
              </Link>
              <Link
                href="https://support.mozilla.org/en-US/kb/enhanced-tracking-protection-firefox-desktop"
                target="_blank"
                className="text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
              >
                Firefox
                <ExternalLink className="h-3 w-3" />
              </Link>
              <Link
                href="https://support.apple.com/guide/safari/manage-cookies-sfri11471/mac"
                target="_blank"
                className="text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
              >
                Safari
                <ExternalLink className="h-3 w-3" />
              </Link>
              <Link
                href="https://support.microsoft.com/en-us/microsoft-edge/delete-cookies-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09"
                target="_blank"
                className="text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
              >
                Edge
                <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contact */}
      <Card className="bg-muted/30 border-2">
        <CardContent>
          <p className="text-muted-foreground text-center text-sm leading-relaxed">
            Questions about our cookie usage?{" "}
            <Link
              href="mailto:hello@stevenmckinnon.co.uk"
              className="text-primary font-medium hover:underline"
            >
              Contact the developer
            </Link>
          </p>
        </CardContent>
      </Card>

      {/* Back to Legal */}
      <div className="pt-4 text-center">
        <Button asChild variant="outline" size="lg">
          <Link href="/legal">
            <ArrowLeft className="h-4 w-4" /> Back to Legal
          </Link>
        </Button>
      </div>
    </div>
  );
}
