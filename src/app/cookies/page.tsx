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
    <div className="max-w-4xl mx-auto px-4 py-12 space-y-8">
      {/* Header */}
      <div className="space-y-4">
        <Button asChild variant="ghost" size="sm" className="mb-4">
          <Link href="/">
            <ArrowLeft className="h-4 w-4" /> Back to Home
          </Link>
        </Button>

        <div className="flex items-center gap-3 mb-4">
          <div className="h-12 w-12 rounded-xl bg-orange-500/10 flex items-center justify-center">
            <Cookie className="h-6 w-6 text-orange-600 dark:text-orange-400" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold">Cookie Policy</h1>
        </div>

        <p className="text-lg text-muted-foreground leading-relaxed">
          This page explains how Caley uses cookies and similar
          technologies to provide you with a better experience.
        </p>

        <p className="text-sm text-muted-foreground">
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
          <div className="flex items-center gap-2 mb-2">
            <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
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
          <div className="flex items-center gap-2 mb-2">
            <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-2xl">Cookies We Use</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Authentication Cookies */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <h4 className="font-semibold">Authentication Cookies</h4>
              <span className="text-xs px-2 py-1 bg-green-500/10 text-green-700 dark:text-green-400 rounded-full">
                Essential
              </span>
            </div>
            <div className="ml-7 space-y-2">
              <p className="text-sm text-muted-foreground">
                <code className="px-2 py-1 bg-muted rounded text-xs">
                  better-auth.session_token
                </code>
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                This cookie keeps you signed in to your account. Without it, you
                would need to sign in every time you visit the site.
              </p>
              <div className="text-xs text-muted-foreground space-y-0.5">
                <p>• Duration: 7 days</p>
                <p>• Purpose: User authentication and session management</p>
                <p>• Required: Yes - the app cannot function without this</p>
              </div>
            </div>
          </div>

          {/* Theme Preference */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-primary" />
              <h4 className="font-semibold">Preference Cookies</h4>
              <span className="text-xs px-2 py-1 bg-blue-500/10 text-blue-700 dark:text-blue-400 rounded-full">
                Functional
              </span>
            </div>
            <div className="ml-7 space-y-2">
              <p className="text-sm text-muted-foreground">
                <code className="px-2 py-1 bg-muted rounded text-xs">
                  theme
                </code>
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Stores your dark/light mode preference so the site looks the way
                you want it every time you visit.
              </p>
              <div className="text-xs text-muted-foreground space-y-0.5">
                <p>• Duration: 1 year</p>
                <p>• Purpose: Remember your theme preference</p>
                <p>• Required: No - but enhances your experience</p>
              </div>
            </div>
          </div>

          {/* CSRF Protection */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <h4 className="font-semibold">Security Cookies</h4>
              <span className="text-xs px-2 py-1 bg-green-500/10 text-green-700 dark:text-green-400 rounded-full">
                Essential
              </span>
            </div>
            <div className="ml-7 space-y-2">
              <p className="text-sm text-muted-foreground">
                <code className="px-2 py-1 bg-muted rounded text-xs">
                  authjs.csrf-token
                </code>
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Protects you from Cross-Site Request Forgery (CSRF) attacks,
                ensuring that actions are only performed by you.
              </p>
              <div className="text-xs text-muted-foreground space-y-0.5">
                <p>• Duration: Session (deleted when you close browser)</p>
                <p>• Purpose: Security and CSRF protection</p>
                <p>• Required: Yes - protects your account</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* What We Don't Use */}
      <Card className="border-2 border-green-200 dark:border-green-900 bg-green-50/50 dark:bg-green-950/20">
        <CardHeader>
          <div className="flex items-center gap-2 mb-2">
            <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <Shield className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-2xl">What We Don&apos;t Use</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            <li className="flex items-start gap-2">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
              <span className="text-muted-foreground">
                <strong className="text-foreground">
                  No advertising cookies
                </strong>{" "}
                - We don&apos;t track you for ads
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
              <span className="text-muted-foreground">
                <strong className="text-foreground">
                  No analytics cookies
                </strong>{" "}
                - We don&apos;t use Google Analytics or similar
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
              <span className="text-muted-foreground">
                <strong className="text-foreground">
                  No third-party cookies
                </strong>{" "}
                - We don&apos;t share your data
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
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
          <div className="flex items-center gap-2 mb-2">
            <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
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
          <ul className="space-y-2 ml-4">
            <li className="text-sm text-muted-foreground">
              • Staying signed in to your account
            </li>
            <li className="text-sm text-muted-foreground">
              • Creating and managing invoices
            </li>
            <li className="text-sm text-muted-foreground">
              • Accessing your profile and settings
            </li>
          </ul>
          <div className="pt-4 border-t">
            <h4 className="font-semibold mb-3">Browser-Specific Guides:</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
              <Link
                href="https://support.google.com/chrome/answer/95647"
                target="_blank"
                className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
              >
                Chrome
                <ExternalLink className="h-3 w-3" />
              </Link>
              <Link
                href="https://support.mozilla.org/en-US/kb/enhanced-tracking-protection-firefox-desktop"
                target="_blank"
                className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
              >
                Firefox
                <ExternalLink className="h-3 w-3" />
              </Link>
              <Link
                href="https://support.apple.com/guide/safari/manage-cookies-sfri11471/mac"
                target="_blank"
                className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
              >
                Safari
                <ExternalLink className="h-3 w-3" />
              </Link>
              <Link
                href="https://support.microsoft.com/en-us/microsoft-edge/delete-cookies-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09"
                target="_blank"
                className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
              >
                Edge
                <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contact */}
      <Card className="border-2 bg-muted/30">
        <CardContent>
          <p className="text-sm text-muted-foreground leading-relaxed text-center">
            Questions about our cookie usage?{" "}
            <Link
              href="mailto:hello@stevenmckinnon.co.uk"
              className="text-primary hover:underline font-medium"
            >
              Contact the developer
            </Link>
          </p>
        </CardContent>
      </Card>

      {/* Back to Legal */}
      <div className="text-center pt-4">
        <Button asChild variant="outline" size="lg">
          <Link href="/legal">
            <ArrowLeft className="h-4 w-4" /> Back to Legal
          </Link>
        </Button>
      </div>
    </div>
  );
}
