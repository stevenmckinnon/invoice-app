"use client";
import { useState } from "react";

import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import CaleyLogo from "@/components/CaleyLogo";
import { Button } from "@/components/ui/button";
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { forgetPassword } from "@/lib/auth-client";




const ForgotPasswordPage = () => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await forgetPassword({
        email,
        redirectTo: "/auth/reset-password",
      });

      if (result.error) {
        toast.error("Error", {
          description:
            result.error.message || "Something went wrong. Please try again.",
        });
        setIsLoading(false);
        return;
      }

      setEmailSent(true);
      toast.success("Reset link sent!", {
        description: "Check your email for the password reset link.",
      });
      setIsLoading(false);
    } catch (error) {
      console.error("Forgot password exception:", error);
      toast.error("Error", {
        description: "Something went wrong. Please try again.",
      });
      setIsLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className="flex h-screen w-full items-center justify-center p-6">
        <div className="w-full max-w-md">
          <CardHeader className="mb-4 text-center">
            <div className="mb-4 flex flex-col items-center gap-2">
              <CaleyLogo className="h-24 w-24" />
            </div>
            <CardTitle>
              <h1 className="text-2xl">Check your email</h1>
            </CardTitle>
            <CardDescription>
              We&apos;ve sent a password reset link to <strong>{email}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground text-center text-sm">
              The link will expire in 1 hour. If you don&apos;t see the email,
              check your spam folder.
            </p>
            <div className="text-center text-sm">
              <Link
                href="/auth/signin"
                className="text-primary inline-flex items-center gap-2 hover:underline"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to sign in
              </Link>
            </div>
          </CardContent>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full items-center justify-center p-6">
      <div className="w-full max-w-md">
        <CardHeader className="mb-4 text-center">
          <div className="mb-4 flex flex-col items-center gap-2">
            <CaleyLogo className="h-24 w-24" />
          </div>
          <CardTitle>
            <h1 className="text-2xl">Forgot your password?</h1>
          </CardTitle>
          <CardDescription>
            Enter your email address and we&apos;ll send you a link to reset
            your password.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                "Send reset link"
              )}
            </Button>
          </form>

          <div className="text-center text-sm">
            <Link
              href="/auth/signin"
              className="text-primary inline-flex items-center gap-2 hover:underline"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to sign in
            </Link>
          </div>
        </CardContent>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
